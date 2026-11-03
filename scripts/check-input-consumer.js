import assert from 'node:assert/strict';

export async function checkInputBrowserConsumer(page, url) {
  await page.goto(url);
  await page.evaluate(async () => {
    const recipe = await import('/output/input-consumer.js');
    window.inputRecipe = recipe.createInput();
    inputRecipe.input.mount('#root');
  });
  const field = page.locator('#root input');
  await field.fill('X');
  const validation = await page.evaluate(() => {
    const { input, phases } = inputRecipe;
    const result = input.validate({ minimum: 3 });
    return { ok: result.ok, errors: result.errors.map(error => [error.severity, error.code]), phases };
  });
  assert.equal(validation.ok, true);
  assert.deepEqual(validation.errors, [['warning', 'length']]);
  assert.ok(validation.phases.includes('dirtyChange'));
  assert.equal(await field.getAttribute('aria-invalid'), 'false');
  assert.equal(await field.getAttribute('title'), 'Short');
  await page.evaluate(() => inputRecipe.input.value.set('Silent', { silent: true }));
  assert.equal(await field.inputValue(), 'Silent');
  assert.equal(await field.getAttribute('title'), null);
  await page.evaluate(() => inputRecipe.input.value.reset());
  assert.equal(await field.inputValue(), 'Initial');
  await page.evaluate(() => inputRecipe.input.setReadOnly(true));
  assert.equal(await field.getAttribute('readonly'), '');
  await page.evaluate(() => inputRecipe.input.destroy());
  assert.equal(await page.locator('#root input').count(), 0);

  const masks = await page.evaluate(async () => {
    const { TextInput } = await import('taet-ui/inputs');
    const input = new TextInput('#root', { mask: '99-99', value: '1234', unmaskValue: true });
    const result = [input.value.get(), input.getRawValue(), input.getDisplayValue()];
    input.destroy(); return result;
  });
  assert.deepEqual(masks, ['1234', '1234', '12-34']);
  await page.evaluate(async () => {
    const { TextInput } = await import('taet-ui/inputs');
    window.password = new TextInput('#root', { value: 'secret', password: true });
  });
  assert.equal(await field.getAttribute('type'), 'password');
  await page.locator('.dui-text-field__reveal').click();
  assert.equal(await field.getAttribute('type'), 'text');
  await page.evaluate(() => password.destroy());

  for (const phase of ['beforeChange', 'change', 'afterChange']) {
    await page.evaluate(async phase => {
      const { TextInput } = await import('taet-ui/inputs');
      window.closingInput = new TextInput('#root', { value: 'Old' });
      closingInput.events.on(phase, event => event.source.destroy());
    }, phase);
    await field.fill('New');
    assert.equal(await page.locator('#root input').count(), 0);
    assert.equal(await page.evaluate(() => closingInput.value.get()), phase === 'beforeChange' ? 'Old' : 'New');
  }
  console.log('Installed inputs browser OK: typed recipe, native writes, silent DOM, validation, mask/password and teardown');
  await page.evaluate(async () => {
    const recipe = await import('/output/number-boolean-consumer.js');
    window.fields = recipe.createFields(document.querySelector('#root'));
    document.body.append(recipe.indicator());
  });
  const number = page.locator('#root .dui-number-input input');
  const checkbox = page.locator('#root .dui-checkbox input');
  const toggle = page.locator('#root .dui-switch input');
  await number.press('ArrowUp');
  assert.equal(await number.inputValue(), '3');
  await number.fill('');
  const numericValidation = await page.evaluate(() => ({ value: fields.number.value.get(), ok: fields.number.validate().ok }));
  assert.deepEqual(numericValidation, { value: null, ok: false });
  assert.equal(await number.getAttribute('title'), 'Quantity required');
  await page.evaluate(() => fields.number.value.set(6, { silent: true }));
  assert.equal(await number.inputValue(), '6');
  await number.dispatchEvent('wheel', { deltaY: -100 });
  assert.equal(await number.inputValue(), '8');
  await checkbox.check();
  await page.locator('.dui-switch__visual').first().click();
  assert.equal(await toggle.isChecked(), true);
  assert.equal(await page.locator('.dui-switch__state').textContent(), 'Enabled');
  await page.evaluate(() => {
    fields.toggle.setStateText('Yes', 'No');
    fields.checkbox.value.clear({ silent: true });
    fields.checkbox.setReadOnly(true); fields.toggle.setReadOnly(true);
  });
  assert.equal(await page.locator('.dui-switch__state').textContent(), 'Yes');
  assert.equal(await toggle.isDisabled(), true);
  await checkbox.click();
  assert.equal(await checkbox.isChecked(), false);
  const state = await page.evaluate(() => ({ accepted: fields.checkbox.value.get(), notify: fields.toggle.value.get(),
    changes: fields.changes }));
  assert.deepEqual(state.changes, [['number', 3, 'user', true], ['number', null, 'user', true],
    ['number', 8, 'user', true], ['checkbox', true, 'user', true], ['switch', true, 'user', true]]);
  assert.equal(state.accepted, false); assert.equal(state.notify, true);
  await page.evaluate(() => fields.destroy());
  assert.equal(await page.locator('#root input').count(), 0);
  assert.equal(await page.locator('.status[role="img"]').getAttribute('aria-label'), 'Ready');
  await page.evaluate(async () => {
    const recipe = await import('/output/number-boolean-consumer.js');
    window.directNumber = recipe.mountedNumber('#root');
  });
  await number.press('ArrowUp');
  assert.equal(await number.inputValue(), '2');
  await page.evaluate(() => directNumber.destroy());
  console.log('Installed numeric/boolean browser OK: spin/wheel, nullable validation, silent writes, clicks, readonly and indicator');
}
