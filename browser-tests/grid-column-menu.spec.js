import { test, expect } from '@playwright/test';

for (const kind of ['Grid', 'TreeGrid']) {
  test(`${kind} Columns supports repeated toggles, keyboard and dismissal`, async ({ page }) => {
    page.on('pageerror', error => { throw error; });
    await page.goto('/browser-tests/recipes.html');
    await page.evaluate(async kind => {
      const ui = await import('/src/ui/experimental.js');
      window.grid = new ui[kind]('#root', {
        columns: ['name', 'size', 'date'].map(id => ({ id, title: id, width: 140 })), height: 300
      });
      grid.data.parse([{ id: 1, name: 'File', size: 12, date: 'Today' }]);
    }, kind);
    const open = async () => {
      await page.getByRole('button', { name: '\u041d\u0430\u0441\u0442\u0440\u043e\u0439\u043a\u0438 \u0442\u0430\u0431\u043b\u0438\u0446\u044b', exact: true }).click();
      await page.getByRole('menuitem', { name: 'Columns', exact: true }).hover();
    };
    await open();
    const name = page.getByRole('menuitemcheckbox', { name: 'name', exact: true });
    const size = page.getByRole('menuitemcheckbox', { name: 'size', exact: true });
    const date = page.getByRole('menuitemcheckbox', { name: 'date', exact: true });
    // Hide the originating header itself, then another column without reopening.
    await name.click();
    await expect(name).toHaveAttribute('aria-checked', 'false');
    await size.click();
    await expect(size).toHaveAttribute('aria-checked', 'false');
    await expect(date).toBeDisabled();
    expect(await page.evaluate(() => grid.columns.filter(c => !c.hidden).map(c => c.id))).toEqual(['date']);
    await size.press('Space');
    await expect(size).toHaveAttribute('aria-checked', 'true');
    await expect(size).toBeFocused();
    await expect(date).toBeEnabled();
    await size.press('Enter');
    await expect(size).toHaveAttribute('aria-checked', 'false');
    await name.click();
    await expect(name).toHaveAttribute('aria-checked', 'true');
    await name.press('Escape');
    await expect(page.getByRole('menu')).toHaveCount(0);
    await open();
    await expect(size).toHaveAttribute('aria-checked', 'false');
    await page.mouse.click(1200, 800);
    await expect(page.getByRole('menu')).toHaveCount(0);
    await page.getByRole('button', { name: 'Column menu for name', exact: true }).click();
    await page.getByRole('menuitem', { name: 'Best fit', exact: true }).click();
    await expect(page.getByRole('menu')).toHaveCount(0);
    await page.evaluate(() => grid.destroy());
  });
}
