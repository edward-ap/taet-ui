import { test, expect } from '@playwright/test';

const cases = [
  ['TextInput', {}, 'textbox'],
  ['TextArea', {}, 'textbox'],
  ['NumberInput', {}, 'spinbutton'],
  ['DateInput', {}, 'textbox'],
  ['TimeInput', {}, 'textbox'],
  ['DateTimeInput', {}, 'textbox'],
  ['TextInput', { mask: '00-00' }, 'textbox'],
  ['TextInput', { mask: '00-00', maskMode: 'slots' }, 'textbox'],
  ['TextInput', { password: true }, null]
];

test.beforeEach(async ({ page }) => {
  page.on('pageerror', error => { throw error; });
  await page.goto('/browser-tests/recipes.html');
});

for (const [kind, options, role] of cases) {
  const title = `${kind} ${JSON.stringify(options)}`;
  test(`${title} caption is the exact accessible name throughout lifecycle`, async ({ page }) => {
    await page.evaluate(async ({ kind, options }) => {
      const ui = await import('/src/ui/inputs.js');
      window.field = new ui[kind]({ ...options, name: 'modelKey', label: 'Original', validators: [() => 'Invalid field'] });
      field.setLabel('Expiration', { silent: true });
      field.mount('#root');
    }, { kind, options });
    const input = page.locator('#root input, #root textarea').first();
    await expect(input).toHaveAccessibleName('Expiration');
    if (role) await expect(page.getByRole(role, { name: 'Expiration', exact: true })).toHaveCount(1);
    await page.evaluate(() => {
      field.validate(); field.disable(); field.enable(); field.setReadOnly(true); field.setReadOnly(false);
      field.setLabelPosition('top'); field.setLabelWidth(100); field.refresh();
    });
    await expect(input).toHaveAccessibleName('Expiration');
    await expect(input).toHaveAccessibleDescription('Invalid field');
    await page.evaluate(() => field.setLabel('Renewal'));
    await expect(input).toHaveAccessibleName('Renewal');
    await page.evaluate(() => { field.setLabel(''); field.refresh(); });
    await expect(input).toHaveAccessibleName('');
    await expect(input).toHaveAccessibleDescription('Invalid field');
    await page.evaluate(() => { field.setLabel('Restored'); field.validation.clear(); });
    await expect(input).toHaveAccessibleName('Restored');
    await expect(input).toHaveAccessibleDescription('');
    await page.evaluate(() => field.destroy());
    await expect(page.locator('#root input, #root textarea')).toHaveCount(0);
  });

  test(`${title} duplicate model names have independent label and error references`, async ({ page }) => {
    await page.evaluate(async ({ kind, options }) => {
      const ui = await import('/src/ui/inputs.js');
      window.fields = ['Customer', 'Vendor'].map(label => new ui[kind]('#root', {
        ...options, name: 'same', label, validators: [() => `${label} error`]
      }));
      fields.forEach(f => f.validate());
    }, { kind, options });
    const inputs = page.locator('#root input, #root textarea');
    await expect(inputs.nth(0)).toHaveAccessibleName('Customer');
    await expect(inputs.nth(1)).toHaveAccessibleName('Vendor');
    await expect(inputs.nth(0)).toHaveAccessibleDescription('Customer error');
    await expect(inputs.nth(1)).toHaveAccessibleDescription('Vendor error');
    expect(await inputs.evaluateAll(els => new Set(els.map(el => el.getAttribute('aria-labelledby'))).size)).toBe(2);
    expect(await inputs.evaluateAll(els => els.every(el => document.getElementById(el.getAttribute('aria-labelledby'))))).toBe(true);
    await page.evaluate(() => { fields[0].destroy(); fields[1].setLabel('Remaining'); });
    await expect(inputs).toHaveCount(1);
    await expect(inputs).toHaveAccessibleName('Remaining');
    await page.evaluate(() => fields[1].destroy());
  });
}

test('temporal auxiliary controls keep their own names, separate from caption', async ({ page }) => {
  await page.evaluate(async () => {
    const {DateInput, TimeInput, DateTimeInput} = await import('/src/ui/experimental.js');
    window.fields = [new DateInput('#root', {label: 'Date'}), new TimeInput('#root', {label: 'Time'}), new DateTimeInput('#root', {label: 'Date and time'})];
  });
  for (const name of ['Date', 'Time', 'Date and time']) await expect(page.getByRole('textbox', {name, exact: true})).toHaveCount(1);
  for (const name of ['Open calendar', 'Focus time', 'Increase time', 'Decrease time', 'Open date and time picker']) await expect(page.getByRole('button', {name, exact: true})).toHaveCount(1);
  await page.evaluate(() => fields.forEach(f => f.destroy()));
});

test('password reveal does not replace caption with action name', async ({page}) => {
  await page.evaluate(async () => {
    const {TextInput} = await import('/src/ui/inputs.js');
    window.field = new TextInput('#root', {password: true, label: 'Secret'});
  });
  await page.getByRole('button', {name: 'Show password', exact: true}).click();
  await expect(page.getByRole('textbox', {name: 'Secret', exact: true})).toHaveCount(1);
  await page.evaluate(() => field.setLabel(''));
  await expect(page.locator('#root input')).toHaveAccessibleName('');
  await expect(page.getByRole('button', {name: 'Hide password', exact: true})).toHaveCount(1);
  await page.evaluate(() => field.destroy());
});
