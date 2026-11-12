import { test, expect } from '@playwright/test';

const kinds = ['TextInput', 'TextArea', 'NumberInput', 'DateInput', 'TimeInput', 'DateTimeInput',
  'SelectInput', 'DropDownList', 'MultiSelectDropDown', 'CheckBox', 'CheckLetter', 'CheckButton',
  'ToggleIconButton', 'Switch', 'RadioGroup', 'TrackBar', 'CircularSlider', 'FilePicker',
  'ProgressBar', 'ColorPicker', 'RGBColorPicker', 'CMYKColorPicker'];
for (const kind of kinds) {
  test(`${kind} independent accessible name survives caption removal and external association`, async ({ page }) => {
    await page.goto('/browser-tests/recipes.html');
    await page.evaluate(async kind => {
      const ui = await import('/src/ui/all.js');
      const heading = document.createElement('h2'); heading.id = 'shared-heading'; heading.textContent = 'Shared heading';
      document.querySelector('#root').append(heading);
      window.field = new ui[kind]({ ariaLabel: 'Independent name', label: '', validators: [() => 'Invalid sample'] });
      field.mount('#root');
      field._input.dataset.nameTestTarget = 'yes';
    }, kind);
    const target = page.locator('[data-name-test-target]');
    await expect(target).toHaveAccessibleName('Independent name');
    await expect(target).not.toHaveAttribute('aria-labelledby', /.+/);
    await page.evaluate(() => { field.setLabel('Visible caption'); field.refresh(); field.setLabel(''); field.validate(); });
    await expect(target).toHaveAccessibleName('Independent name');
    await page.evaluate(() => field.setAriaLabelledBy('shared-heading'));
    await expect(target).toHaveAccessibleName('Shared heading');
    await page.evaluate(() => { field.setAriaLabel('Secondary'); field.refresh(); });
    await expect(target).toHaveAccessibleName('Shared heading');
    await page.evaluate(() => field.setAriaLabelledBy(''));
    await expect(target).toHaveAccessibleName('Secondary');
    await page.evaluate(() => { field.setLabel('Restored'); field.setAriaLabel(''); field.refresh(); });
    await expect(target).toHaveAccessibleName('Restored');
    await page.evaluate(() => { field.setLabel(''); field.refresh(); });
    await expect(target).not.toHaveAttribute('aria-labelledby', /.+/);
    // Validation messages belong to description, never to an unlabeled field name.
    await expect(target).not.toHaveAccessibleName(/Invalid sample/);
    await page.evaluate(() => field.destroy());
  });
}

test('checkbox, switch and check button retain independent content labels', async ({ page }) => {
  await page.goto('/browser-tests/recipes.html');
  for (const kind of ['CheckBox', 'Switch', 'CheckButton']) {
    await page.evaluate(async kind => { const ui = await import('/src/ui/all.js'); window.field = new ui[kind]('#root', { label: 'Category', text: 'Choice' }); }, kind);
    const target = page.locator('#root input, #root button').first();
    await expect(target).toHaveAccessibleName('Category Choice');
    await page.evaluate(() => field.setLabel(''));
    await expect(target).toHaveAccessibleName('Choice');
    await page.evaluate(() => field.setText('Changed'));
    await expect(target).toHaveAccessibleName('Changed');
    await page.evaluate(() => field.destroy());
  }
});

for (const kind of ['TextInput', 'TextArea', 'DateInput', 'TimeInput', 'DateTimeInput', 'SelectInput']) {
  test(`${kind} visible caption still forwards native focus after label-less mode`, async ({ page }) => {
    await page.goto('/browser-tests/recipes.html');
    await page.evaluate(async kind => { const ui = await import('/src/ui/all.js'); window.field = new ui[kind]('#root', { label: '' }); field.setLabel('Focus target'); }, kind);
    await page.locator('#root label').first().click();
    expect(await page.evaluate(() => document.activeElement === field._input)).toBe(true);
    await page.evaluate(() => field.destroy());
  });
}

