const { chromium } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const os = require('node:os');

// Start npm run dev. Pass an output directory outside test-results to keep
// measurements across browser test runs. An optional third argument selects
// comma-separated modes. Run 0 includes CPU profiling; exclude it from timings.
const out = process.argv[2] ?? 'test-results/grid-workloads';
const modes = process.argv[3] ? process.argv[3].split(',') : ['plain', 'snapshots', 'complex', 'complex-batch'];
fs.mkdirSync(out, { recursive: true });
(async () => {
  const browser = await chromium.launch();
  const results = [], memory = [];
  try {
    for (let run = 0; run < 3; run++) for (const type of ['Grid', 'TreeGrid']) {
      for (const mode of modes) {
        const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
        const errors = []; page.on('pageerror', error => errors.push(error.message));
        await page.goto('http://127.0.0.1:5173/browser-tests/recipes.html');
        await page.evaluate(async ({ type, mode }) => {
          const complex = mode.startsWith('complex');
          const api = await import('/src/ui/grid-api.js');
          const rows = Array.from({ length: 10000 }, (_, i) => ({ id: `r${i}`,
            parentId: i % 100 ? `r${i - i % 100}` : null,
            name: `Record ${i}`, amount: i, category: `Group ${i % 12}`, status: i % 3,
            ...Object.fromEntries(Array.from({ length: 96 }, (_, c) => [`c${c}`, `Value ${i}/${c}`])) }));
          const columns = [
            { id: 'name', width: 180, frozen: 'left', editor: api.gridEditors.text() },
            { id: 'amount', width: 100, dataType: 'number', summary: type === 'Grid' && complex ? 'total' : null },
            { id: 'category', width: 120 }, { id: 'status', width: 100 },
            ...Array.from({ length: 96 }, (_, c) => ({ id: `c${c}`, width: 120 }))
          ];
          if (complex) columns[2].render = value => {
            const badge = document.createElement('strong'); badge.textContent = value; return badge;
          };
          const grid = new api[type]({ width: 1000, height: 480, rowHeight: 24, columns,
            treeColumnId: 'name', expandedIds: Array.from({ length: 100 }, (_, i) => `r${i * 100}`)
          }).mount(document.querySelector('#root'));
          grid.data.parse(rows);
          if (complex) {
            grid.setFilter(item => item.status !== 2);
            if (type === 'Grid') {
              grid.view.setSort((a, b) => a.amount - b.amount);
              grid.setGroups([{ columnId: 'category', summaries: [{ columnId: 'amount', kind: 'total' }] }]);
            } else grid.treeView.setSort((a, b) => a.amount - b.amount);
          }
          let checksum = 0;
          if (mode === 'snapshots') (grid.treeView ?? grid.view).events.on('change', event => {
            const before = event.oldEntries ?? event.oldItems, after = event.entries ?? event.items;
            checksum += before.length + after.length + event.oldIds.length + event.ids.length;
          });
          const frames = async (n = 2) => { for (let i = 0; i < n; i++) await new Promise(requestAnimationFrame); };
          await frames();
          const renderTimes = [], originalRender = grid._renderRows.bind(grid);
          grid._renderRows = () => { const start = performance.now(); originalRender(); renderTimes.push(performance.now() - start); };
          window.workload = async () => {
            const updateTimes = [], frameGaps = []; let previous = performance.now();
            for (let tick = 0; tick < 60; tick++) {
              await new Promise(requestAnimationFrame);
              const now = performance.now(); frameGaps.push(now - previous); previous = now;
              const start = performance.now();
              const update = () => {
                for (let i = 0; i < 20; i++) grid.data.update(`r${(tick * 137 + i) % 10000}`, { amount: tick * 20 + i });
              };
              if (mode === 'complex-batch') grid.data.batch(update, { history: false });
              else update();
              updateTimes.push(performance.now() - start);
              grid._body.scrollTop = tick * 96;
              grid._body.scrollLeft = (tick % 20) * 120;
              grid._body.dispatchEvent(new Event('scroll'));
            }
            await frames();
            const edits = []; let cancelledEdits = 0;
            for (let i = 0; i < 10; i++) {
              const item = (grid.treeView ?? grid.view).all()[5];
              const start = performance.now();
              if (!grid.startEdit(item.id, 'name')) throw new Error('Editor did not start');
              const input = grid._editing.cell.querySelector('input'); input.value = `Draft ${i}`;
              input.dispatchEvent(new Event('input', { bubbles: true }));
              for (let j = 0; j < 20; j++) grid.data.update(`r${9000 + j}`, { c0: `Background ${i}` });
              await frames();
              if (!grid._editing) cancelledEdits++;
              else {
                if (grid._editing.cell.querySelector('input') !== input || input.value !== `Draft ${i}`) throw new Error('Draft changed during unrelated updates');
                grid.commitEdit();
                if (grid.data.get(item.id).name !== `Draft ${i}`) throw new Error('Draft not committed');
              }
              edits.push(performance.now() - start);
            }
            await frames();
            const cells = grid._body.querySelectorAll('.dui-grid__cell').length;
            grid.destroy(); await frames();
            return { updateTimes, renderTimes, frameGaps, edits, cancelledEdits, cells, checksum };
          };
        }, { type, mode });
        const cdp = await page.context().newCDPSession(page);
        if (run === 0) { await cdp.send('Profiler.enable'); await cdp.send('Profiler.start'); }
        const result = await page.evaluate(() => workload());
        if (run === 0) {
          const { profile } = await cdp.send('Profiler.stop');
          fs.writeFileSync(path.join(out, `${type}-${mode}.cpuprofile`), JSON.stringify(profile));
        }
        if (errors.length) throw new Error(errors.join('\n'));
        results.push({ run, profiled: run === 0, type, mode, ...result });
        console.log(JSON.stringify({ run, type, mode, updateMean: result.updateTimes.reduce((a,b)=>a+b,0)/60 }));
        await page.close();
      }
    }
    for (const type of ['Grid', 'TreeGrid']) {
      const page = await browser.newPage();
      await page.goto('http://127.0.0.1:5173/browser-tests/recipes.html');
      const cdp = await page.context().newCDPSession(page);
      await page.evaluate(async type => {
        const api = await import('/src/ui/grid-api.js');
        window.cycle = async () => {
          const grid = new api[type]({ width: 900, height: 400, treeColumnId: 'name',
            columns: [{ id: 'name', width: 180, editor: api.gridEditors.text() }], expandedIds: ['r0']
          }).mount(document.querySelector('#root'));
          grid.data.parse(Array.from({ length: 1000 }, (_, i) => ({ id: `r${i}`, parentId: i ? 'r0' : null, name: `Row ${i}` })));
          await new Promise(requestAnimationFrame);
          grid.startEdit('r5', 'name'); grid.data.update('r8', { name: 'Updated' });
          grid.destroy(); await new Promise(requestAnimationFrame);
        };
      }, type);
      for (let batch = 0; batch < 5; batch++) {
        await page.evaluate(async () => { for (let i = 0; i < 10; i++) await cycle(); });
        await cdp.send('HeapProfiler.collectGarbage');
        memory.push({ type, cycles: (batch + 1) * 10, ...await cdp.send('Runtime.getHeapUsage'),
          ...await cdp.send('Memory.getDOMCounters') });
      }
      await page.close();
    }
    fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify({ browser: browser.version(),
      revision: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
      trackedChanges: Boolean(execFileSync('git', ['diff', 'HEAD', '--name-only'], { encoding: 'utf8' }).trim()),
      environment: { platform: process.platform, arch: process.arch, node: process.version, cpu: os.cpus()[0]?.model },
      rows: 10000,
      columns: 100, ticks: 60, updatesPerTick: 20, results, memory }, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
