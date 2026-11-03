const { chromium } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
// Start npm run dev; optional output directory is the only argument.
const out = process.argv[2] ?? 'test-results/grid-followup';
fs.mkdirSync(out, { recursive: true });
(async () => {
  const browser = await chromium.launch();
  const results = [];
  try {
    for (const columns of [8, 100]) for (let run = 0; run < 5; run++) for (const type of run % 2 ? ['TreeGrid', 'Grid'] : ['Grid', 'TreeGrid']) {
      const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
      await page.goto('http://127.0.0.1:5173/browser-tests/recipes.html');
      const result = await page.evaluate(async ({ type, columns }) => {
        const api = await import('/src/ui/grid-api.js');
        const rows = Array.from({ length: 10000 }, (_, r) => Object.fromEntries([
          ['id', `r${r}`], ['parentId', r % 100 ? `r${r - r % 100}` : null],
          ...Array.from({ length: columns }, (_, c) => [`c${c}`, `R${r} C${c}`])
        ]));
        const frames = async () => { for (let i = 0; i < 3; i++) await new Promise(requestAnimationFrame); };
        const start = performance.now();
        const grid = new api[type]({ width: 1000, height: 480, rowHeight: 24, treeColumnId: 'c0',
          columnMenu: false, columnReorder: false, rangeSelection: false, clipboard: false,
          expandedIds: Array.from({ length: 100 }, (_, i) => `r${i * 100}`),
          columns: Array.from({ length: columns }, (_, c) => ({ id: `c${c}`, title: `Column ${c}`, width: 120 }))
        }).mount(document.querySelector('#root'));
        grid.data.parse(rows);
        const loadSync = performance.now() - start;
        await frames();
        const loadSettled = performance.now() - start;
        const body = grid.element.querySelector('.dui-grid__body');
        const cells = body.querySelectorAll('.dui-grid__cell').length;
        const measure = async fn => {
          const begin = performance.now(); fn(); const sync = performance.now() - begin;
          await frames(); return { sync, settled: performance.now() - begin };
        };
        const update20 = await measure(() => { for (let i = 0; i < 20; i++) grid.data.update(`r${i}`, { c1: `U${i}` }); });
        if (!body.textContent.includes('U5')) throw new Error('Update not displayed');
        const scroll = await measure(() => { body.scrollLeft = columns > 8 ? 6000 : 0; body.scrollTop = 24000; body.dispatchEvent(new Event('scroll')); });
        const branch = type === 'TreeGrid' ? await measure(() => { grid.collapse('r0'); grid.expand('r0'); }) : null;
        grid.destroy();
        return { loadSync, loadSettled, cells, update20, scroll, branch };
      }, { type, columns });
      results.push({ type, columns, run, ...result });
      console.log(JSON.stringify(results.at(-1)));
      await page.close();
    }
    fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify({ browser: browser.version(), rows: 10000, results }, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
