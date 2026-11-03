import { test, expect } from '@playwright/test';
const settle = page => page.evaluate(async () => { for (let i = 0; i < 4; i++) await new Promise(requestAnimationFrame); });
async function setup(page, kind, flexible = false) {
  await page.goto('/browser-tests/recipes.html');
  await page.evaluate(async ({ kind, flexible }) => {
    const { Grid, TreeGrid } = await import('/src/ui/grid-api.js');
    window.fixedColumns = Array.from({ length: 20 }, (_, i) => ({ id: `c${i}`, title: `Column ${i}`, width: 120,
      frozen: i === 0 ? 'left' : i === 19 ? 'right' : null, summary: i === 3 ? 'count' : null }));
    const columns = flexible ? [120, '20%', '1fr', 'minmax(80px, 2fr)'].map((width, i) => ({ id: `c${i}`, title: `Column ${i}`, width, summary: 'count' })) : fixedColumns;
    window.grid = new (kind === 'Grid' ? Grid : TreeGrid)({ width: 800, height: 400, columns,
      treeColumnId: 'c0', expandedIds: ['r0'], rowHeight: 24, columnMenu: false, columnReorder: false });
    grid.data.parse(Array.from({ length: 80 }, (_, r) => ({ id: `r${r}`, parentId: r ? 'r0' : null,
      ...Object.fromEntries(Array.from({ length: 20 }, (_, c) => [`c${c}`, `R${r} C${c}`])) })));
    grid.mount(document.querySelector('#root'));
  }, { kind, flexible });
  await settle(page);
}
async function alignment(page, checkTracks = true) {
  const geometry = await page.evaluate(() => {
    const row = grid._body.querySelector('.dui-grid__row');
    return { minWidth: getComputedStyle(row).minWidth, rowWidth: row.getBoundingClientRect().width,
      totalWidth: grid._windowRenderer.columns().totalWidth,
      cells: [...row.querySelectorAll('.dui-grid__cell')].map(cell => {
        const id = cell.dataset.duiGridColumnId, header = grid._header.querySelector(`[data-dui-grid-column-id="${id}"]`), footer = grid._footer?.querySelector(`[data-dui-grid-column-id="${id}"]`);
        const box = node => { const b = node.getBoundingClientRect(); return { x: b.x, width: b.width }; };
        return { cell: box(cell), header: box(header), footer: footer ? box(footer) : null };
      }) };
  });
  expect(Math.abs(geometry.rowWidth - geometry.totalWidth)).toBeLessThan(1);
  for (const { cell, header, footer } of checkTracks ? geometry.cells : []) {
    expect(Math.abs(cell.width - header.width)).toBeLessThan(1);
    expect(Math.abs(cell.x - header.x)).toBeLessThan(2);
    if (footer) { expect(Math.abs(cell.width - footer.width)).toBeLessThan(1); expect(Math.abs(cell.x - footer.x)).toBeLessThan(2); }
  }
  return geometry;
}
for (const kind of ['Grid', 'TreeGrid']) {
  test(`${kind}: measured row widths preserve frozen/header/footer alignment through scrolling and resize`, async ({ page }) => {
    await setup(page, kind);
    expect((await alignment(page)).minWidth).toBe('0px');
    for (const left of [605, 725, 600, 0]) {
      await page.evaluate(left => { grid._body.scrollLeft = left; }, left); await settle(page);
      const state = await alignment(page);
      expect(state.cells.length).toBeLessThan(20);
      await expect(page.locator('.dui-grid__body [data-dui-grid-row-id="string:r0"] [data-dui-grid-column-id="c0"]')).toHaveText('R0 C0');
    }
    await page.evaluate(() => grid.setSize({ width: 960 })); await settle(page); await alignment(page);
  });
  test(`${kind}: percentage, fraction and minmax tracks stay aligned after resize`, async ({ page }) => {
    await setup(page, kind, true);
    const before = await alignment(page); expect(before.minWidth).toBe('0px'); expect(before.cells).toHaveLength(4);
    await page.evaluate(() => grid.setSize({ width: 1100 })); await settle(page);
    const after = await alignment(page);
    expect(after.cells[0].cell.width).toBe(before.cells[0].cell.width);
    expect(after.cells[1].cell.width).toBeGreaterThan(before.cells[1].cell.width);
    expect(after.cells[2].cell.width).toBeGreaterThan(before.cells[2].cell.width);
  });
  test(`${kind}: retained rows restore intrinsic/full-column sizing when layout mode changes`, async ({ page }) => {
    await setup(page, kind);
    for (const width of ['auto', 'min-content', 'max-content']) {
      await page.evaluate(width => grid.setColumns(fixedColumns.map((c, i) => ({ ...c, width: i === 1 ? width : c.width }))), width);
      await settle(page);
      const full = await alignment(page, false); expect(full.minWidth).toBe('max-content'); expect(full.cells).toHaveLength(20);
      await page.evaluate(() => grid.setColumns(fixedColumns)); await settle(page);
      const virtual = await alignment(page); expect(virtual.minWidth).toBe('0px'); expect(virtual.cells.length).toBeLessThan(20);
    }
    await page.evaluate(() => { grid.virtualColumns = false; grid.refresh(); }); await settle(page);
    const full = await alignment(page); expect(full.minWidth).toBe('max-content'); expect(full.cells).toHaveLength(20);
    await page.evaluate(() => { grid.virtualColumns = true; grid.refresh(); }); await settle(page);
    expect((await alignment(page)).minWidth).toBe('0px');
  });
}
