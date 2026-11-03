import { test, expect } from '@playwright/test';

for (const alias of ['search', 'filter']) {
  test(`SelectInput ${alias} enables a searchable popup`, async ({ page }) => {
    await page.goto('/browser-tests/recipes.html');
    await page.evaluate(async alias => {
      const { SelectInput } = await import('/src/ui/inputs.js');
      window.select = new SelectInput('#root', { [alias]: true });
      select.data.parse([{ id: 1, text: 'One' }, { id: 2, text: 'Two' }]);
    }, alias);
    await page.getByRole('combobox').click();
    await page.locator('.dui-dropdown-list__search').fill('two');
    await expect(page.getByRole('option')).toHaveCount(1);
    await page.getByRole('option', { name: 'Two' }).click();
    expect(await page.evaluate(() => select.value.get())).toBe(2);
    await page.evaluate(() => select.destroy());
  });
}

for (const mode of ['native', 'popup']) {
  test(`SelectInput ${mode} selection tolerates teardown in each value phase`, async ({ page }) => {
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.goto('/browser-tests/recipes.html');
    for (const phase of ['beforeChange', 'change', 'afterChange']) {
      await page.evaluate(async ({ mode, phase }) => {
        const { SelectInput } = await import('/src/ui/inputs.js');
        window.select = new SelectInput('#root', { value: 1, searchable: mode === 'popup' });
        select.data.parse([{ id: 1, text: 'One' }, { id: 2, text: 'Two' }]);
        window.phases = [];
        for (const name of ['beforeChange', 'change', 'afterChange', 'dirtyChange']) {
          select.events.on(name, event => { phases.push(name); if (name === phase) event.source.destroy(); });
        }
      }, { mode, phase });
      if (mode === 'native') await page.locator('select').selectOption({ label: 'Two' });
      else {
        await page.getByRole('combobox').click();
        await page.getByRole('option', { name: 'Two', exact: true }).click();
      }
      await expect(page.locator('#root .dui-select-input')).toHaveCount(0);
      await expect(page.locator('.dui-dropdown-list__popup')).toHaveCount(0);
      expect(await page.evaluate(() => select.value.get())).toBe(phase === 'beforeChange' ? 1 : 2);
      expect(await page.evaluate(() => phases)).toEqual(['beforeChange', 'change', 'afterChange'].slice(0,
        ['beforeChange', 'change', 'afterChange'].indexOf(phase) + 1));
    }
    expect(errors).toEqual([]);
  });
}

test('SelectInput keyboard opening stops when open listener destroys the control', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/browser-tests/recipes.html');
  await page.evaluate(async () => {
    const { SelectInput } = await import('/src/ui/inputs.js');
    const select = new SelectInput('#root', { searchable: true });
    select.data.parse([{ id: 1, text: 'One' }]);
    select.events.on('open', () => select.destroy());
  });
  await page.getByRole('combobox').press('ArrowDown');
  await expect(page.locator('#root .dui-select-input')).toHaveCount(0);
  await expect(page.locator('.dui-dropdown-list__popup')).toHaveCount(0);
  expect(errors).toEqual([]);
});
