import { test, expect } from '@playwright/test';

const fields = [
  ['FilePicker', 'textbox', 'report.pdf'],
  ['TrackBar', 'slider', 25],
  ['CircularSlider', 'slider', 25],
  ['ProgressBar', 'progressbar', 25],
  ['ColorPicker', 'button', '#123456'],
  ['RGBColorPicker', 'button', '#123456'],
  ['CMYKColorPicker', 'button', '#123456']
];
test.beforeEach(async ({ page }) => {
  page.on('pageerror', error => { throw error; });
  await page.goto('/browser-tests/recipes.html');
});
test.afterEach(async ({ page }) => { await page.evaluate(() => { window.field?.destroy(); window.owner?.destroy(); }); });

for (const [kind, role, value] of fields) {
  test(`${kind} caption names its semantic field through mutation and validation`, async ({ page }) => {
    await page.evaluate(async ({ kind, value }) => {
      const ui = await import('/src/ui/inputs.js');
      window.field = new ui[kind]({ label: 'Initial', value, scale: 'range', showValue: true,
        validators: [() => 'Invalid sample'] });
      field.setLabel('Before mount');
      field.mount('#root');
    }, { kind, value });
    const input = page.getByRole(role, { name: 'Before mount', exact: true });
    await expect(input).toHaveCount(1);
    await expect(input).toHaveAccessibleName('Before mount');
    await page.evaluate(() => { field.setLabel('Renamed'); field.validate(); field.setLabelPosition('top'); field.setLabelWidth(100); field.refresh(); });
    const renamed = page.getByRole(role, { name: 'Renamed', exact: true });
    await expect(renamed).toHaveCount(1);
    await expect(renamed).toHaveAccessibleName('Renamed');
    await expect(renamed).toHaveAccessibleDescription('Invalid sample');
    await page.evaluate(() => { field.disable(); field.enable(); field.setReadOnly(true); field.setReadOnly(false); field.validation.clear(); });
    await expect(renamed).toHaveAccessibleName('Renamed');
    await expect(renamed).toHaveAccessibleDescription('');
    await page.evaluate(() => field.setLabel(''));
    const emptyName = kind.includes('ColorPicker') ? 'Choose color' : kind === 'CircularSlider' ? 'Value' : '';
    const cleared = page.locator('#root').getByRole(role, { name: emptyName, exact: true });
    await expect(cleared).toHaveCount(1);
    await expect(cleared).toHaveAccessibleName(emptyName);
    await page.evaluate(() => field.setLabel('Restored'));
    await expect(page.getByRole(role, { name: 'Restored', exact: true })).toHaveCount(1);
    await page.evaluate(() => field.destroy());
    await expect(page.locator('#root').getByRole(role)).toHaveCount(0);
  });

  test(`${kind} same model names in separate owners do not cross-label`, async ({ page }) => {
    await page.evaluate(async ({ kind, value }) => {
      const ui = await import('/src/ui/all.js');
      window.owner = new ui.Panel('#root');
      const a = new ui.Form(), b = new ui.Form();
      a.row(new ui[kind]({ name: 'same', label: 'Left', value }));
      b.row(new ui[kind]({ name: 'same', label: 'Right', value }));
      owner.add(a, b);
    }, { kind, value });
    await expect(page.getByRole(role, { name: 'Left', exact: true })).toHaveCount(1);
    await expect(page.getByRole(role, { name: 'Right', exact: true })).toHaveCount(1);
    const refs = await page.locator('#root [aria-labelledby]').evaluateAll(nodes => nodes.map(el => el.getAttribute('aria-labelledby')));
    expect(new Set(refs).size).toBe(refs.length);
  });
}

test('CircularSlider retains its named fallback when the visible caption is cleared', async ({ page }) => {
  await page.evaluate(async () => { const { CircularSlider } = await import('/src/ui/inputs.js'); window.field = new CircularSlider('#root', { name: 'volume', label: 'Volume' }); field.setLabel(''); field.refresh(); });
  await expect(page.getByRole('slider', { name: 'volume', exact: true })).toHaveCount(1);
});

test('TrackBar accessible name excludes changing value, scale and validation text', async ({ page }) => {
  await page.evaluate(async () => { const { TrackBar } = await import('/src/ui/inputs.js'); window.field = new TrackBar('#root', { label: 'Gain', scale: 'ticks', showValue: true, showTickLabels: true, min: -15, max: 15, value: 0 }); });
  const input = page.getByRole('slider', { name: 'Gain', exact: true });
  await expect(input).toHaveValue('0');
  await input.press('ArrowRight');
  await expect(input).toHaveValue('1');
  await page.evaluate(() => { field.value.set(12); field.setRange(-20, 20); });
  await expect(input).toHaveValue('12');
  await expect(input).toHaveAccessibleName('Gain');
});

for (const [kind, names] of [ ['RGBColorPicker', ['Red', 'Green', 'Blue']], ['CMYKColorPicker', ['Cyan', 'Magenta', 'Yellow', 'Black']] ]) {
  test(`${kind} popup channel sliders keep their channel names`, async ({ page }) => {
    await page.evaluate(async kind => { const ui = await import('/src/ui/inputs.js'); window.field = new ui[kind]('#root', { label: 'Accent', value: '#123456' }); }, kind);
    await page.getByRole('button', { name: 'Accent', exact: true }).click();
    for (const name of names) await expect(page.getByRole('slider', { name, exact: true })).toHaveCount(1);
    await expect(page.getByRole('textbox', { name: 'Hex color', exact: true })).toHaveCount(1);
    await page.evaluate(() => { field.setLabel('Accent changed'); field.closePopup(); field.openPopup(); });
    for (const name of names) await expect(page.getByRole('slider', { name, exact: true })).toHaveCount(1);
  });
}

test('ColorPicker popup fields retain explicit functional names', async ({ page }) => {
  await page.evaluate(async () => { const { ColorPicker } = await import('/src/ui/inputs.js'); window.field = new ColorPicker('#root', { label: 'Accent', value: '#123456' }); field.openPopup(); });
  await expect(page.getByRole('slider', { name: 'Saturation and brightness', exact: true })).toHaveCount(1);
  await expect(page.getByRole('slider', { name: 'Hue', exact: true })).toHaveCount(1);
  await expect(page.getByRole('textbox', { name: 'Hex color', exact: true })).toHaveCount(1);
  for (const name of ['R channel', 'G channel', 'B channel']) await expect(page.getByRole('spinbutton', { name, exact: true })).toHaveCount(1);
});

test('StepProgressBar labels its steps after refresh and item replacement', async ({ page }) => {
  await page.evaluate(async () => { const { StepProgressBar } = await import('/src/ui/inputs.js'); window.field = new StepProgressBar('#root', { items: [{ caption: 'Upload', description: 'Choose files' }, { caption: 'Review' }], allowUserInteraction: true }); });
  await expect(page.getByRole('button', { name: 'Step 1: Upload: Choose files', exact: true })).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Step 2: Review', exact: true })).toHaveCount(1);
  await page.evaluate(() => { field.refresh(); field.setItems([{ caption: 'Inspect' }, {}]); });
  await expect(page.getByRole('button', { name: 'Step 1: Inspect', exact: true })).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Step 2', exact: true })).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Step 2: Review', exact: true })).toHaveCount(0);
});

test('FilePicker empty caption keeps placeholder fallback, never selected filenames or validation', async ({ page }) => {
  await page.evaluate(async () => { const { FilePicker } = await import('/src/ui/inputs.js'); window.field = new FilePicker('#root', { label: 'Attachment', placeholder: 'Choose attachment', value: 'private-report.pdf', validators: [() => 'Rejected attachment'] }); field.setLabel(''); field.validate(); field.refresh(); });
  const input = page.getByRole('textbox', { name: 'Choose attachment', exact: true });
  await expect(input).toHaveCount(1);
  await expect(input).toHaveValue('private-report.pdf');
  await expect(input).toHaveAccessibleDescription('Rejected attachment');
  await expect(input).not.toHaveAttribute('aria-labelledby');
});


test('TrackBar empty caption permits consumer aria-label without value or error pollution', async ({ page }) => {
  await page.evaluate(async () => {
    const { TrackBar } = await import('/src/ui/inputs.js');
    window.field = new TrackBar({ value: 25, scale: 'range', showValue: true, validators: [() => 'Invalid sample'] });
    field.mount('#root');
    field.element.querySelector('input').setAttribute('aria-label', 'Consumer slider');
  });
  const slider = page.getByRole('slider', { name: 'Consumer slider', exact: true });
  await expect(slider).toHaveCount(1);
  await page.evaluate(() => { field.validate(); field.refresh(); });
  await expect(slider).toHaveAccessibleName('Consumer slider');
  await page.evaluate(() => field.setLabel('Caption'));
  await expect(page.getByRole('slider')).toHaveAccessibleName('Consumer slider');
  await slider.evaluate(el => { window.forwardedClicks = 0; el.addEventListener('click', () => window.forwardedClicks++); });
  await page.locator('#root .dui-trackbar__label').click();
  expect(await page.evaluate(() => window.forwardedClicks)).toBe(1);
  // WebKit forwards the native label click without focusing a range input.
  await slider.focus();
  await expect(slider).toBeFocused();
  await slider.press('ArrowRight');
  await expect(slider).toHaveValue('26');
  await page.evaluate(() => { field.setLabel(''); field.refresh(); });
  await expect(slider).toHaveAccessibleName('Consumer slider');
  await slider.evaluate(el => el.removeAttribute('aria-label'));
  await expect(page.getByRole('slider')).toHaveAccessibleName('');
});

test('Theme Editor label-free sliders retain their explicit accessible names', async ({ page }) => {
  await page.goto('/examples/theme-editor/');
  await expect(page.locator('body')).toHaveAttribute('data-ready', 'true');
  for (const name of ['Base hue', 'Lightness', 'Saturation']) {
    const slider = page.getByRole('slider', { name, exact: true });
    await expect(slider).toHaveCount(1);
    await slider.fill('50');
    await expect(slider).toHaveAccessibleName(name);
  }
});
