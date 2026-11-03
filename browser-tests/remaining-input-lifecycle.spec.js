import { test, expect } from '@playwright/test';

test('TextArea insertion and Tab stop after value listener teardown', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/browser-tests/recipes.html');
  for (const method of ['insert', 'tab']) for (const phase of ['beforeChange', 'change', 'afterChange']) {
    await page.evaluate(async phase => {
      const { TextArea } = await import('/src/ui/inputs.js');
      window.field = new TextArea('#root', { value: 'AB', acceptsTab: true });
      field.setSelection(1);
      window.tabs = 0; field.events.on('tabInsert', () => tabs++);
      field.events.on(phase, () => field.destroy());
    }, phase);
    if (method === 'tab') await page.locator('textarea').press('Tab');
    else expect(await page.evaluate(() => field.insertText('X'))).toBe(phase !== 'beforeChange');
    await expect(page.locator('textarea')).toHaveCount(0);
    expect(await page.evaluate(() => tabs)).toBe(0);
    expect(await page.evaluate(() => field.value.get())).toBe(phase === 'beforeChange' ? 'AB' : method === 'tab' ? 'A\tB' : 'AXB');
  }
  expect(errors).toEqual([]);
});

test('TextArea emits tabInsert only for an applied Tab write', async ({ page }) => {
  await page.goto('/browser-tests/recipes.html');
  await page.evaluate(async () => {
    const { TextArea } = await import('/src/ui/inputs.js');
    window.field = new TextArea('#root', { value: 'AB', acceptsTab: true });
    window.tabs = 0; window.veto = true;
    field.events.on('beforeChange', event => { event.cancel = veto; });
    field.events.on('tabInsert', () => tabs++);
  });
  await page.locator('textarea').press('Tab');
  expect(await page.evaluate(() => tabs)).toBe(0);
  await page.evaluate(() => { veto = false; field.setReadOnly(true); });
  await page.locator('textarea').press('Tab');
  expect(await page.evaluate(() => tabs)).toBe(0);
  await page.evaluate(() => field.setReadOnly(false));
  await page.locator('textarea').press('Tab');
  expect(await page.evaluate(() => tabs)).toBe(1);
  await page.evaluate(() => field.destroy());
});

for (const closeOnSelect of [false, true]) test(`MultiSelect selection teardown with closeOnSelect=${closeOnSelect}`, async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/browser-tests/recipes.html');
  for (const phase of ['beforeChange', 'change', 'afterChange']) {
    await page.evaluate(async ({ phase, closeOnSelect }) => {
      const { MultiSelectDropDown } = await import('/src/ui/inputs.js');
      window.field = new MultiSelectDropDown('#root', { value: ['a'], closeOnSelect });
      field.data.parse([{ id: 'a', text: 'A' }, { id: 'b', text: 'B' }]);
      field.events.on(phase, () => field.destroy());
    }, { phase, closeOnSelect });
    await page.getByRole('combobox').click();
    await page.getByRole('option', { name: 'B', exact: true }).click();
    await expect(page.locator('#root .dui-control, .dui-dropdown-list__popup')).toHaveCount(0);
    expect(await page.evaluate(() => field.value.get())).toEqual(phase === 'beforeChange' ? ['a'] : ['a', 'b']);
  }
  expect(errors).toEqual([]);
});

test('MultiSelect token removal distinguishes string and numeric IDs', async ({ page }) => {
  await page.goto('/browser-tests/recipes.html');
  await page.evaluate(async () => {
    const { MultiSelectDropDown } = await import('/src/ui/inputs.js');
    window.field = new MultiSelectDropDown('#root', { value: [1, '1'] });
    field.data.parse([{ id: 1, text: 'Numeric' }, { id: '1', text: 'String' }]);
  });
  await page.getByRole('button', { name: 'Remove String', exact: true }).click();
  expect(await page.evaluate(() => field.value.get())).toEqual([1]);
  await expect(page.getByRole('button', { name: 'Remove Numeric', exact: true })).toBeVisible();
  await page.evaluate(() => field.destroy());
});
