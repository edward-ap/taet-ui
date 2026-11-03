import assert from 'node:assert/strict';

export async function checkChoiceInputBrowserConsumer(page, url) {
  await page.goto(url);
  await page.evaluate(async () => {
    const recipe = await import('/output/choice-input-consumer.js');
    const { OverlayManager } = await import('/node_modules/taet-ui/src/core/OverlayManager.js');
    window.choiceManager = new OverlayManager();
    window.choices = recipe.createChoices(document.querySelector('#root'), choiceManager);
  });
  const display = page.getByRole('combobox');
  assert.equal(await display.textContent(), 'Canada');
  await page.locator('.dui-dropdown-list__button').click();
  await page.locator('.dui-dropdown-list__search').fill(' EUROPE ');
  assert.equal(await page.getByRole('option').count(), 1);
  assert.equal(await page.getByRole('option').textContent(), 'fr: France');
  await page.getByRole('option').click();
  assert.equal(await display.textContent(), 'France');
  assert.deepEqual(await page.evaluate(() => choices.changes), [['ca', 'fr']]);
  await page.evaluate(() => choices.select.openPopup());
  await page.evaluate(() => choices.data.update('fr', { label: 'Updated' }, { silent: true }));
  assert.equal(await display.textContent(), 'Updated');
  assert.equal(await page.getByRole('option').textContent(), 'fr: Updated');
  await page.evaluate(() => choices.data.remove('fr', { silent: true }));
  assert.equal(await display.textContent(), '');
  assert.deepEqual(await page.evaluate(() => [choices.select.value.get(), choices.changes.length]), ['', 1]);
  assert.deepEqual(await page.evaluate(() => {
    choices.select.destroy();
    const root = choiceManager.getRoot();
    choices.data.update('ca', { label: 'Alive' });
    return [choices.data.get('ca').label, choiceManager.all().length, root.isConnected];
  }), ['Alive', 0, true]);
  // The same borrowed manager must still support a new mounted control.
  await page.evaluate(async () => {
    const { SelectInput } = await import('taet-ui/inputs');
    const next = new SelectInput('#root', { data: choices.data, searchable: true, overlayManager: choiceManager });
    next.openPopup();
    if (!choiceManager.has(next)) throw new Error('Borrowed manager was not reusable');
    next.destroy();
  });

  const group = page.getByRole('radiogroup');
  const radioInputs = page.locator('.dui-radio-group__input');
  assert.equal(await radioInputs.nth(0).isChecked(), true);
  assert.equal(await radioInputs.nth(1).isDisabled(), true);
  assert.deepEqual(await page.locator('.dui-radio-letter__marker').allTextContents(), ['1', '2', '3']);
  await group.press('ArrowRight');
  assert.equal(await radioInputs.nth(2).isChecked(), true);
  assert.deepEqual(await page.evaluate(() => [choices.radio.value.get(), choices.radio.getSelectedItem().raw.label]), [3, 'Three']);
  await page.evaluate(() => choices.radio.setReadOnly(true));
  assert.equal(await radioInputs.nth(2).isDisabled(), true);
  await group.press('Home');
  assert.equal(await radioInputs.nth(2).isChecked(), true);
  await page.evaluate(() => {
    choices.radio.setReadOnly(false);
    choices.radio.setItems([{ id: 4, label: 'Four' }, { id: 5, label: 'Five' }], { silent: true });
    choices.radio.setLayout('column').setColumns(null);
  });
  assert.equal(await radioInputs.count(), 2);
  assert.equal(await page.locator('.dui-radio-group--column').count(), 1);
  assert.equal(await radioInputs.nth(0).isChecked(), false);
  await group.press('End');
  assert.equal(await radioInputs.nth(1).isChecked(), true);
  await page.evaluate(() => { choices.radio.destroy(); choices.data.destroy(); choiceManager.destroy(); });

  await page.evaluate(async () => {
    const recipe = await import('/output/choice-input-consumer.js');
    window.nativeChoice = recipe.createNativeSelect(document.querySelector('#root'));
  });
  await page.locator('select').selectOption({ label: 'Two' });
  assert.deepEqual(await page.evaluate(() => nativeChoice.changes), [[2, 'Two', 'user', true]]);
  await page.evaluate(() => nativeChoice.select.value.set(1, { silent: true }));
  assert.equal(await page.locator('select').inputValue(), 'number:1');
  await page.evaluate(() => nativeChoice.select.destroy());
  assert.equal(await page.locator('#root .dui-control').count(), 0);
  console.log('Installed choice inputs browser OK: typed popup/native recipes, filters, records, shared ownership, radio keyboard/readonly and normalization');
}
