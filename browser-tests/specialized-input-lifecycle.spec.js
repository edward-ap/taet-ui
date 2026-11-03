import { test, expect } from '@playwright/test';

for (const multiple of [false, true]) test(`FilePicker multiple=${multiple} preserves handles on veto and clears them on accepted writes`, async ({ page }) => {
  await page.goto('/browser-tests/recipes.html');
  await page.evaluate(async multiple => {
    const { FilePicker } = await import('/src/ui/inputs.js');
    window.field = new FilePicker('#root', { multiple });
    window.veto = false; window.changes = [];
    field.events.on('beforeChange', event => { event.cancel = veto; });
    field.events.on('change', () => changes.push(field.getFiles().map(file => file.name)));
  }, multiple);
  const input = page.locator('input[type=file]');
  const first = { name: 'first.txt', mimeType: 'text/plain', buffer: Buffer.from('first') };
  await input.setInputFiles(first);
  expect(await page.evaluate(() => changes)).toEqual([['first.txt']]);
  await page.evaluate(() => { field.setCleanValue(); veto = true; });
  await input.setInputFiles({ name: 'rejected.txt', mimeType: 'text/plain', buffer: Buffer.from('rejected') });
  expect(await page.evaluate(() => field.getFiles().map(file => file.name))).toEqual(['first.txt']);
  expect(await page.evaluate(() => field.isDirty())).toBe(false);
  expect(await page.evaluate(() => field.clearFiles())).toBe(false);
  expect(await page.evaluate(() => field.getFiles().map(file => file.name))).toEqual(['first.txt']);
  await page.evaluate(() => { veto = false; field.value.clear({ silent: true }); });
  expect(await page.evaluate(() => field.getFiles())).toEqual([]);
  expect(await input.evaluate(input => input.files.length)).toBe(0);
  await page.evaluate(() => field.value.reset());
  expect(await page.evaluate(() => [field.isDirty(), field.getFiles().length])).toEqual([false, 0]);
  await input.setInputFiles(first);
  await page.evaluate(() => field.setReadOnly(true));
  expect(await page.evaluate(() => field.clearFiles({ origin: 'user', userAction: true }))).toBe(false);
  expect(await page.evaluate(() => field.getFiles().map(file => file.name))).toEqual(['first.txt']);
  expect(await input.evaluate(input => input.files.length)).toBe(1);
  await page.evaluate(() => field.destroy());
});

test('FilePicker rechecks state after beforeOpen and survives value phase teardown', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/browser-tests/recipes.html');
  for (const action of ['destroy', 'disable', 'readonly']) {
    expect(await page.evaluate(async action => {
      const { FilePicker } = await import('/src/ui/inputs.js');
      const field = new FilePicker('#root'); let clicks = 0;
      field._fileInput.click = () => clicks++;
      field.events.on('beforeOpen', () => action === 'readonly' ? field.setReadOnly(true) : field[action]());
      const result = [field.openPicker(), clicks]; if (!field.destroyed) field.destroy(); return result;
    }, action)).toEqual([false, 0]);
  }
  for (const phase of ['beforeChange', 'change', 'afterChange']) {
    await page.evaluate(async phase => {
      const { FilePicker } = await import('/src/ui/inputs.js');
      window.field = new FilePicker('#root'); field.events.on(phase, () => field.destroy());
    }, phase);
    await page.locator('input[type=file]').setInputFiles({ name: 'one.txt', mimeType: 'text/plain', buffer: Buffer.from('1') });
    await expect(page.locator('#root .dui-control')).toHaveCount(0);
    expect(await page.evaluate(() => field.getFiles())).toEqual([]);
  }
  expect(errors).toEqual([]);
});

test('ColorPicker ignores EyeDropper completion after destruction', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/browser-tests/recipes.html');
  await page.evaluate(async () => {
    globalThis.EyeDropper = class { open() { return new Promise(resolve => { window.resolveColor = resolve; }); } };
    const { ColorPicker } = await import('/src/ui/inputs.js');
    window.field = new ColorPicker('#root', { value: '#112233' });
    field.openPopup();
  });
  await page.getByRole('button', { name: 'Pick color from screen' }).click();
  await page.evaluate(async () => { field.destroy(); resolveColor({ sRGBHex: '#ffffff' }); await Promise.resolve(); });
  expect(await page.evaluate(() => field.value.get())).toBe('#112233');
  await expect(page.locator('.dui-color-picker__popup')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('ColorPicker can be destroyed by its open callback before deferred popup focus', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/browser-tests/recipes.html');
  await page.evaluate(async () => {
    const { ColorPicker } = await import('/src/ui/inputs.js');
    new ColorPicker('#root', { onOpen: event => event.source.destroy() }).openPopup();
    await Promise.resolve();
  });
  await expect(page.locator('#root .dui-control, .dui-color-picker__popup')).toHaveCount(0);
  expect(errors).toEqual([]);
});
