import { expect, test } from '@playwright/test';

for (const kind of ['Grid', 'TreeGrid']) {
  async function setup(page) {
    await page.goto('/browser-tests/recipes.html');
    await page.evaluate(async kind => {
      const { Grid, TreeGrid, gridEditors } = await import('/src/ui/grid-api.js');
      window.grid = new ({ Grid, TreeGrid }[kind])('#root', {
        height: 260, columns: [{ id: 'name', sortable: true, width: 180, editor: gridEditors.text() }]
      });
      grid.data.parse([{ id: 1, parentId: null, name: 'A' }, { id: 2, parentId: null, name: 'B' }]);
      window.view = grid.view ?? grid.treeView;
      window.cancelEvents = [];
      grid.events.on('editCancel', ({ origin, userAction, reason }) => cancelEvents.push({ origin, userAction, reason }));
    }, kind);
  }

  test(`${kind} removes stale sort indicators even when external sorting keeps row order`, async ({ page }) => {
    await setup(page);
    await page.evaluate(() => grid.sortBy('name', 'asc'));
    await expect(page.locator('[aria-sort="ascending"]')).toHaveCount(1);
    await page.evaluate(() => view.setSort((a, b) => a.name.localeCompare(b.name), { silent: true }));
    await expect(page.locator('[aria-sort="ascending"], [aria-sort="descending"]')).toHaveCount(0);
    await expect(page.locator('[aria-sort="ascending"]')).toHaveCount(0);
    await page.locator('.dui-grid__header-title').click();
    await expect(page.locator('[aria-sort="ascending"]')).toHaveCount(1);
    await page.evaluate(() => view.setSort((a, b) => b.name.localeCompare(a.name)));
    await expect(page.locator('.dui-grid__row .dui-grid__cell').first()).toContainText('B');
    await expect(page.locator('[aria-sort="ascending"], [aria-sort="descending"]')).toHaveCount(0);
    await page.getByTitle('Column menu', { exact: true }).click();
    await expect(page.getByRole('menuitem', { name: 'Clear sorting', exact: true })).toBeDisabled();
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: /\u041d\u0430\u0441\u0442\u0440\u043e\u0439\u043a\u0438 \u0442\u0430\u0431\u043b\u0438\u0446\u044b/, exact: true }).click();
    await page.getByRole('menuitem', { name: 'Clear sorting', exact: true }).click();
    expect(await page.evaluate(() => view.getSort())).toBeNull();
    await page.evaluate(() => grid.destroy());
  });

  test(`${kind} cancellation describes the closing action and preserves silent projection cleanup`, async ({ page }) => {
    await setup(page);
    async function open() {
      expect(await page.evaluate(() => grid.startEdit(1, 'name', { origin: 'user', userAction: true }))).toBe(true);
      await page.locator('.dui-grid__editor-host input').fill('Draft');
    }
    await open();
    await page.evaluate(() => grid.cancelEdit({ origin: 'system', userAction: false, reason: 'screen-reset' }));
    await open();
    await page.evaluate(() => grid.cancelEdit());
    await open();
    await page.locator('.dui-grid__editor-host input').press('Escape');
    expect(await page.evaluate(() => cancelEvents)).toEqual([
      { origin: 'system', userAction: false, reason: 'screen-reset' },
      { origin: 'api', userAction: false, reason: undefined },
      { origin: 'user', userAction: true, reason: undefined }
    ]);
    await open();
    await page.evaluate(() => view.setFilter(item => item.id !== 1, { silent: true, origin: 'import' }));
    await expect(page.locator('.dui-grid__editor-host')).toHaveCount(0);
    expect(await page.evaluate(() => cancelEvents.length)).toBe(3);
    await page.evaluate(() => view.setFilter(null, { silent: true }));
    await open();
    await page.evaluate(() => view.setFilter(item => item.id !== 1, { origin: 'import', reason: 'load', userAction: false }));
    await expect(page.locator('.dui-grid__editor-host')).toHaveCount(0);
    expect(await page.evaluate(() => cancelEvents.at(-1))).toEqual({ origin: 'import', userAction: false, reason: 'load' });
    expect(await page.evaluate(() => grid.data.get(1).name)).toBe('A');
    await page.evaluate(() => grid.destroy());
  });
}
