const { chromium } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
// Start the local dev server first. Optional DHTMLX install stays outside the repo.
// node scripts/benchmark-grid.cjs [dhtmlx-install-or--] [output-directory] [Grid|TreeGrid]
const commercial = process.argv[2] && process.argv[2] !== '-' ? process.argv[2] : null;
const out = process.argv[3] ?? path.join(process.cwd(), 'test-results/grid-benchmark');
const kind = process.argv[4] ?? 'Grid';
if (!['Grid', 'TreeGrid'].includes(kind)) throw new Error('Expected Grid or TreeGrid');
fs.mkdirSync(out, { recursive: true });
(async () => {
  const browser = await chromium.launch({ headless: true });
  const results = [];
  try {
    for (const cols of [8, 100]) for (let iteration = 0; iteration < 5; iteration++) for (const toolkit of !commercial ? ['dense'] : iteration % 2 ? ['dhtmlx', 'dense'] : ['dense', 'dhtmlx']) {
      const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto('http://127.0.0.1:5173/browser-tests/recipes.html');
      await page.evaluate(toolkit => {
        document.body.className = toolkit === 'dense' ? 'dui-theme-light-blue dui-profile-compact' : '';
        document.body.style.margin = '8px';
        document.body.innerHTML = '<div id="root" style="width:1000px;height:480px"></div>';
        if (toolkit === 'dhtmlx') document.querySelector('link[rel=stylesheet]').remove();
      }, toolkit);
      if (toolkit === 'dhtmlx') {
        await page.addStyleTag({ path: path.join(commercial, 'codebase/suite.min.css') });
        await page.addScriptTag({ path: path.join(commercial, 'codebase/suite.min.js') });
      } else {
        await page.evaluate(async kind => { window.DenseGrid = (await import('/src/ui/grid-api.js'))[kind]; }, kind);
      }
      const metrics = await page.evaluate(async ({ cols, toolkit, kind }) => {
        const host = document.querySelector('#root');
        const frames = async () => { for (let i = 0; i < 3; i++) await new Promise(requestAnimationFrame); };
        const rows = Array.from({ length: 10000 }, (_, r) => Object.fromEntries([['id', `r${r}`], ...Array.from({ length: cols }, (_, c) => [`c${c}`, `R${r} C${c}`])]));
        if (kind === 'TreeGrid') rows.forEach((item, r) => { if (r % 100) item.parent = `r${r - r % 100}`; });
        const start = performance.now();
        const grid = toolkit === 'dense'
          ? new DenseGrid({ width: 1000, height: 480, rowHeight: 24, virtualRows: true, columnMenu: false, columnReorder: false, rangeSelection: false, clipboard: false,
              ...(kind === 'TreeGrid' ? { parentField: 'parent', treeColumnId: 'c0', expandedIds: Array.from({ length: 100 }, (_, i) => `r${i * 100}`) } : {}),
              columns: Array.from({ length: cols }, (_, c) => ({ id: `c${c}`, title: `Column ${c}`, width: 120 })) }).mount(host)
          : new dhx[kind](host, { width: 1000, height: 480, rowHeight: 24, headerRowHeight: 24, sortable: false, resizable: false,
              columns: Array.from({ length: cols }, (_, c) => ({ id: `c${c}`, header: [{ text: `Column ${c}` }], width: 120 })) });
        grid.data.parse(rows);
        const loadSyncMs = performance.now() - start;
        await frames();
        const loadSettledMs = performance.now() - start;
        const body = host.querySelector(toolkit === 'dense' ? '.dui-grid__body' : '.dhx_grid_data');
        const cellSelector = toolkit === 'dense' ? '.dui-grid__cell' : '.dhx_grid-cell';
        const cells = host.querySelectorAll(cellSelector).length;
        const nodes = host.querySelectorAll('*').length;
        const attributes = { role: host.firstElementChild?.getAttribute('role'), ariaCells: host.querySelectorAll('[role=gridcell]').length };
        async function measure(operation) {
          let added = 0, removed = 0, textChanges = 0;
          const observer = new MutationObserver(records => { for (const r of records) {
            added += r.addedNodes.length; removed += r.removedNodes.length; if (r.type === 'characterData') textChanges++;
          } });
          observer.observe(body ?? host, { subtree: true, childList: true, characterData: true });
          const begin = performance.now(); operation(); const syncMs = performance.now() - begin;
          await frames(); observer.disconnect();
          return { syncMs, settledMs: performance.now() - begin, added, removed, textChanges };
        }
        const updateOne = await measure(() => grid.data.update('r5', { c0: 'ONE-UPDATED' }));
        if (!host.textContent.includes('ONE-UPDATED')) throw new Error('Single update was not displayed');
        const update20 = await measure(() => { for (let i = 0; i < 20; i++) grid.data.update(`r${i}`, { c0: `BURST-${i}` }); });
        if (!host.textContent.includes('BURST-5')) throw new Error('Burst update was not displayed');
        const batched20 = toolkit === 'dense' ? await measure(() => grid.data.batch(() => {
          for (let i = 0; i < 20; i++) grid.data.update(`r${i}`, { c0: `BATCH-${i}` });
        }, { history: false })) : null;
        const scroll = await measure(() => {
          if (toolkit === 'dense') { const scroller = host.querySelector('.dui-grid__body'); scroller.scrollTop = 24000; scroller.dispatchEvent(new Event('scroll')); }
          else grid.scroll(0, 24000);
        });
        if (!host.textContent.includes('R1000 C1')) throw new Error('Scroll target not displayed');
        const branchRoundTrip = kind === 'TreeGrid' ? await measure(() => { grid.collapse('r0'); grid.expand('r0'); }) : null;
        const destroyStart = performance.now();
        if (toolkit === 'dense') grid.destroy(); else grid.destructor();
        await frames();
        return { loadSyncMs, loadSettledMs, cells, nodes, attributes, updateOne, update20, batched20, scroll, branchRoundTrip, destroySettledMs: performance.now() - destroyStart, remainingNodes: host.querySelectorAll('*').length };
      }, { cols, toolkit, kind });
      results.push({ toolkit, cols, iteration, ...metrics, errors });
      console.log(JSON.stringify({ toolkit, cols, iteration, cells: metrics.cells, load: metrics.loadSyncMs, update: metrics.update20.syncMs }));
      await page.close();
      fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify({ kind, chromium: browser.version(), rows: 10000, width: 1000, height: 480, rowHeight: 24, results }, null, 2));
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
