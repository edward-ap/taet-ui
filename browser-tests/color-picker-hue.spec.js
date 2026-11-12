import { test, expect } from '@playwright/test';

async function mount(page, value) {
  await page.goto('/browser-tests/recipes.html');
  await page.evaluate(async value => {
    const { ColorPicker } = await import('/src/ui/inputs.js');
    window.field = new ColorPicker('#root', { label: 'Accent', value });
    window.changes = [];
    field.events.on('change', event => changes.push(event.newValue));
  }, value);
  await page.getByRole('button', { name: 'Accent', exact: true }).click();
}

for (const value of ['', '#000000', '#ffffff', '#808080']) {
  test(`ColorPicker hue can be chosen before the plane from ${value || 'empty'}`, async ({ page }) => {
    await mount(page, value);
    const hue = page.getByRole('slider', { name: 'Hue', exact: true });
    const bounds = await hue.boundingBox();
    await hue.click({ position: { x: bounds.width * 0.65, y: bounds.height / 2 } });
    const selected = Number(await hue.inputValue());
    expect(selected).toBeGreaterThan(180);
    expect(selected).toBeLessThan(300);
    await expect(page.getByRole('textbox', { name: 'Hex color' })).toHaveValue(value || '#000000');
    await expect(page.locator('.dui-color-picker__plane')).toHaveCSS('--dui-color-picker-hue', `hsl(${selected} 100% 50%)`);
    const plane = page.getByRole('slider', { name: 'Saturation and brightness', exact: true });
    const box = await plane.boundingBox();
    await plane.click({ position: { x: box.width * 0.8, y: box.height * 0.2 } });
    expect(Number(await hue.inputValue())).toBe(selected);
    const rgb = await page.evaluate(() => field.getRgb());
    expect(rgb.blue).toBeGreaterThan(rgb.red);
    await page.evaluate(() => field.destroy());
  });
}

test('ColorPicker preserves hue across keyboard input, refresh and reopen', async ({ page }) => {
  await mount(page, '#808080');
  const hue = page.getByRole('slider', { name: 'Hue', exact: true });
  await hue.press('End');
  await expect(hue).toHaveValue('360');
  await hue.press('ArrowLeft');
  await expect(hue).toHaveValue('359');
  expect(await page.evaluate(() => changes)).toEqual([]);
  await page.evaluate(() => { field.refresh(); field.value.set('#808080'); });
  await expect(hue).toHaveValue('359');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Accent', exact: true }).click();
  await expect(hue).toHaveValue('359');
  await page.evaluate(() => field.destroy());
});

test('ColorPicker retains black saturation and rounded color coordinates', async ({ page }) => {
  await mount(page, '#000000');
  const hue = page.getByRole('slider', { name: 'Hue', exact: true });
  await hue.press('End');
  await hue.press('ArrowLeft');
  const plane = page.getByRole('slider', { name: 'Saturation and brightness', exact: true });
  await plane.press('ArrowRight');
  await plane.press('ArrowRight');
  const marker = page.locator('.dui-color-picker__plane-marker');
  // With brightness zero, saturation changes must survive an unchanged RGB value.
  expect(await marker.evaluate(el => el.style.left)).toBe('2%');
  await plane.press('ArrowUp');
  expect(await marker.evaluate(el => el.style.left)).toBe('2%');
  await expect(hue).toHaveValue('359');
  await page.evaluate(() => field.destroy());
});

test('ColorPicker reconciles API replacements, vetoed changes and clear', async ({ page }) => {
  await mount(page, '#000000');
  const hue = page.getByRole('slider', { name: 'Hue', exact: true });
  await hue.press('End');
  await page.evaluate(() => field.setRgb(0, 0, 255, { silent: true }));
  await expect(hue).toHaveValue('240');
  await page.evaluate(() => field.events.on('beforeChange', event => { if (event.newValue) event.cancel = true; }));
  await hue.press('Home');
  await expect(hue).toHaveValue('240');
  await expect(page.getByRole('textbox', { name: 'Hex color' })).toHaveValue('#0000ff');
  await page.getByRole('button', { name: 'Clear', exact: true }).click();
  await expect(hue).toHaveValue('0');
  await expect(page.getByRole('textbox', { name: 'Hex color' })).toHaveValue('');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Accent', exact: true }).click();
  await expect(hue).toHaveValue('0');
  await page.evaluate(() => field.destroy());
});

test('ColorPicker accepts red at the full hue endpoint without wrapping its handle', async ({ page }) => {
  await mount(page, '#00ff00');
  const hue = page.getByRole('slider', { name: 'Hue', exact: true });
  await hue.press('End');
  await expect(hue).toHaveValue('360');
  await expect(page.getByRole('textbox', { name: 'Hex color' })).toHaveValue('#ff0000');
  expect(await page.evaluate(() => changes)).toEqual(['#ff0000']);
  await page.evaluate(() => field.destroy());
});
