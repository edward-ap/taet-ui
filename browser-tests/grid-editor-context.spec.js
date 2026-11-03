import { expect, test } from '@playwright/test';

const pageErrors = new WeakMap();
test.beforeEach(({ page }) => {
  const errors = []; pageErrors.set(page, errors);
  page.on('pageerror', error => errors.push(error.message));
});
test.afterEach(({ page }) => { expect(pageErrors.get(page)).toEqual([]); });

async function setup(page, kind, { tree = false, count = 0, builtIn = false, details = false } = {}) {
  await page.goto('/browser-tests/recipes.html');
  await page.evaluate(async ({ kind, tree, count, builtIn, details }) => {
    const { Grid, TreeGrid, gridEditors, TextInput } = await import('/src/ui/all.js');
    window.contexts = []; window.validations = [];
    const capture = context => {
      contexts.push(context);
      return { placeholder: `Position ${context.rowIndex}`, validators: [(value, validation) => {
        validations.push({ rowIndex: validation.rowIndex, id: validation.id }); return null;
      }] };
    };
    // The same factory and value callback work with either component.
    const editor = builtIn ? gridEditors.text(capture) : gridEditors.custom(context => {
      window.lastControl = new TextInput({ ...capture(context), value: context.value });
      return lastControl;
    });
    const columns = [{ id: 'label', width: 220, value: (item, index) => `${item.label} / ${index}`, editor },
      { id: 'rank', width: 120, sortable: true }];
    window.grid = new (kind === 'Grid' ? Grid : TreeGrid)({ name: 'contextGrid', width: 500, height: 240,
      rowHeight: 24, columns, treeColumnId: 'label', expandedIds: tree ? ['a', 'b'] : [],
      rowDetail: details ? item => `Details: ${item.label}` : null,
      columnMenu: false, columnReorder: false });
    const rows = count ? Array.from({ length: count }, (_, i) => ({ id: i, parentId: null, label: `Item ${i}`, rank: i })) : tree ? [
      { id: 'a2', parentId: 'a', label: 'A child 2', rank: 20 },
      { id: 'b', parentId: null, label: 'B root', rank: 30 },
      { id: 'a', parentId: null, label: 'A root', rank: 10 },
      { id: 'b1', parentId: 'b', label: 'B child', rank: 40 },
      { id: 'a1', parentId: 'a', label: 'A child 1', rank: 5 }
    ] : [
      { id: 'a', parentId: null, label: 'Alpha', rank: 40 },
      { id: 7, parentId: null, label: 'Numeric', rank: 10 },
      { id: '7', parentId: null, label: 'String', rank: 30 },
      { id: 0, parentId: null, label: 'Zero', rank: 20 },
      { id: 'b', parentId: null, label: 'Beta', rank: 50 }
    ];
    grid.data.parse(rows); grid.mount(document.querySelector('#root'));
  }, { kind, tree, count, builtIn, details });
}

async function open(page, id, rowIndex) {
  const result = await page.evaluate(id => {
    const started = grid.startEdit(id, 'label');
    const c = contexts.at(-1);
    return { started, id: c?.id, rowIndex: c?.rowIndex, value: c?.value, source: c?.source === grid,
      grid: c?.grid === grid, column: c?.column === grid.getColumn('label'), columnId: c?.columnId,
      item: c?.item === grid.data.get(id), label: grid.data.get(id)?.label };
  }, id);
  expect(result).toEqual({ started: true, id, rowIndex, value: `${result.label} / ${rowIndex}`,
    source: true, grid: true, column: true, columnId: 'label', item: true, label: result.label });
  await expect(page.locator('.dui-grid__editor-host input')).toHaveValue(result.value);
  await expect(page.locator('.dui-grid__editor-host input')).toHaveAttribute('placeholder', `Position ${rowIndex}`);
}

for (const kind of ['Grid', 'TreeGrid']) {
  test(`${kind}: custom editor context follows sorting/filtering and preserves typed IDs`, async ({ page }) => {
    await setup(page, kind);
    for (const [id, index] of [[7, 1], ['7', 2], [0, 3]]) {
      await open(page, id, index); await page.evaluate(() => grid.cancelEdit());
    }
    await page.evaluate(() => grid.sortBy('rank', 'asc'));
    await open(page, 'a', 3); await page.evaluate(() => grid.cancelEdit());
    await page.evaluate(() => grid.setFilter(item => item.rank >= 20));
    await open(page, 'a', 2);
    await page.evaluate(() => { lastControl.value.set('Saved'); grid.commitEdit(); });
    expect(await page.evaluate(() => ({ value: grid.data.get('a').label, validation: validations.at(-1), destroyed: lastControl.destroyed })))
      .toEqual({ value: 'Saved', validation: { id: 'a', rowIndex: 2 }, destroyed: true });
    expect(await page.evaluate(() => { const before = contexts.length; return { started: grid.startEdit(7, 'label'), created: contexts.length - before }; }))
      .toEqual({ started: false, created: 0 });
    await page.evaluate(() => grid.destroy());
  });

  test(`${kind}: built-in options receive logical index for an offscreen target`, async ({ page }) => {
    await setup(page, kind, { count: 1000, builtIn: true });
    await open(page, 850, 850);
    // Pending native scroll from bringing the target into view must not cancel it.
    await page.evaluate(async () => { for (let i = 0; i < 4; i++) await new Promise(requestAnimationFrame); });
    await expect(page.locator('.dui-grid__editor-host input')).toHaveValue('Item 850 / 850');
    await page.locator('.dui-grid__editor-host input').press('Escape');
    await expect(page.locator('.dui-grid__editor-host')).toHaveCount(0);
    expect(await page.evaluate(() => grid.data.get(850).label)).toBe('Item 850');
    await page.evaluate(() => grid.destroy());
  });
}

test('TreeGrid: index counts flattened visible entries, including filter-retained ancestors', async ({ page }) => {
  await setup(page, 'TreeGrid', { tree: true });
  // Source order is a2,b,a,b1,a1; expanded tree order is b,b1,a,a2,a1.
  await open(page, 'a2', 3); await page.evaluate(() => grid.cancelEdit());
  await page.evaluate(() => grid.sortBy('rank', 'asc'));
  // Sibling sorting yields a,a1,a2,b,b1.
  await open(page, 'a2', 2); await page.evaluate(() => grid.cancelEdit());
  await page.evaluate(() => grid.collapse('a'));
  expect(await page.evaluate(() => grid.startEdit('a2', 'label'))).toBe(false);
  await open(page, 'b1', 2); await page.evaluate(() => grid.cancelEdit());
  await page.evaluate(() => grid.setFilter(item => item.id === 'a2'));
  // Filtering retains and exposes the ancestor a, even though it was collapsed.
  await open(page, 'a2', 1); await page.evaluate(() => grid.cancelEdit());
  await page.evaluate(() => { grid.clearFilter(); grid.expand('a'); });
  await open(page, 'a2', 2);
  await page.evaluate(() => grid.destroy());
  expect(await page.evaluate(() => lastControl.destroyed)).toBe(true);
});

test('Grid: row index is relative to the current data page', async ({ page }) => {
  await setup(page, 'Grid', { count: 100 });
  await page.evaluate(() => { grid.view.setPageSize(10); grid.view.setPage(3); });
  await open(page, 24, 4); await page.evaluate(() => grid.cancelEdit());
  await page.evaluate(() => grid.view.setPage(4));
  await open(page, 34, 4); await page.evaluate(() => grid.destroy());
});

test('Grid: group headers and detail rows do not change the editor data-view index', async ({ page }) => {
  await setup(page, 'Grid', { details: true });
  await page.evaluate(() => { grid.setGroups(['rank']); grid.expandDetail('a'); grid.refresh(); });
  await expect(page.locator('.dui-grid__group-row').first()).toBeVisible();
  await expect(page.locator('.dui-grid__detail-row')).toHaveCount(1);
  await open(page, '7', 2);
  await page.evaluate(() => grid.destroy());
});

test('TreeGrid: retained editor keeps its creation context when another branch collapses', async ({ page }) => {
  await setup(page, 'TreeGrid', { tree: true });
  await page.evaluate(() => grid.sortBy('rank', 'asc'));
  await open(page, 'b1', 4);
  await page.evaluate(async () => {
    window.creationContext = contexts.at(-1);
    lastControl.value.set('Preserved draft'); grid.collapse('a');
    for (let i = 0; i < 4; i++) await new Promise(requestAnimationFrame);
  });
  await expect(page.locator('.dui-grid__editor-host input')).toHaveValue('Preserved draft');
  expect(await page.evaluate(() => ({ currentIndex: grid.treeView.all().findIndex(item => item.id === 'b1'),
    contextIndex: creationContext.rowIndex, created: contexts.length })))
    .toEqual({ currentIndex: 2, contextIndex: 4, created: 1 });
  await page.evaluate(() => grid.cancelEdit());
  await open(page, 'b1', 2); await page.evaluate(() => grid.destroy());
});
