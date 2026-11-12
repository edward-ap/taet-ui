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
  assert.equal(await field.getAttribute('title'), null);
  assert.equal(await field.evaluate(input => document.getElementById(input.getAttribute('aria-describedby'))?.textContent), 'Short');
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
  await checkMaskedKeyboardConsumer(page);
  await checkSlotsKeyboardConsumer(page);
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
  assert.equal(await number.getAttribute('title'), null);
  assert.equal(await number.evaluate(input => document.getElementById(input.getAttribute('aria-describedby'))?.textContent), 'Quantity required');
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

// Keyboard edits exercise the installed public control, never private edit methods.
async function checkMaskedKeyboardConsumer(page) {
  const field = page.locator('#root input');
  const snapshot = () => page.evaluate(() => {
    const field = document.querySelector('#root input');
    return { value: maskConsumer.value.get(), display: field.value,
      selection: [field.selectionStart, field.selectionEnd] };
  });
  await page.evaluate(async () => {
    const { TextInput } = await import('taet-ui/inputs');
    const { required } = await import('taet-ui');
    window.maskConsumer = new TextInput('#root', { mask: '00:00', validators: [required('Required')] });
  });
  await field.pressSequentially('abc:');
  assert.deepEqual(await snapshot(), { value: '', display: '', selection: [0, 0] });
  assert.equal(await page.evaluate(() => maskConsumer.validate().ok), false);
  await field.pressSequentially('1234');
  assert.deepEqual(await snapshot(), { value: '12:34', display: '12:34', selection: [5, 5] });
  await field.press('Home');
  await field.press('Shift+ArrowRight');
  await field.press('Shift+ArrowRight');
  await field.pressSequentially('09');
  assert.deepEqual(await snapshot(), { value: '09:34', display: '09:34', selection: [3, 3] });
  await field.press('ControlOrMeta+z');
  assert.equal((await snapshot()).display, '03:4');
  await field.press('ControlOrMeta+z');
  assert.deepEqual(await snapshot(), { value: '12:34', display: '12:34', selection: [0, 2] });
  await page.evaluate(() => maskConsumer.value.clear({ silent: true }));
  await field.pressSequentially('12');
  const beforeSeparator = await snapshot();
  await field.pressSequentially('3');
  assert.equal((await snapshot()).display, '12:3');
  await field.press('ControlOrMeta+z');
  assert.deepEqual(await snapshot(), beforeSeparator);
  await field.press('ControlOrMeta+Shift+z');
  assert.equal((await snapshot()).display, '12:3');
  for (const action of ['api', 'silent', 'reset']) {
    await page.evaluate(action => {
      if (action === 'reset') maskConsumer.value.reset();
      else maskConsumer.value.set('45:67', { silent: action === 'silent' });
    }, action);
    const boundary = await snapshot();
    await field.press('ControlOrMeta+z');
    assert.deepEqual(await snapshot(), boundary, action + ' clears masked history');
    await field.press('End');
    await field.press('Backspace');
  }
  await page.evaluate(() => {
    maskConsumer.value.set('12:34');
    maskConsumer.events.on('beforeChange', event => { if (event.newValue === '99:34') event.cancel = true; });
  });
  await field.press('Home');
  await field.press('Shift+ArrowRight');
  await field.pressSequentially('8');
  const accepted = await snapshot();
  await field.press('Home');
  await field.press('Shift+ArrowRight');
  await field.press('Shift+ArrowRight');
  // insertText is one browser edit; it does not read or alter the OS clipboard.
  await page.keyboard.insertText('99');
  assert.equal((await snapshot()).display, accepted.display);
  assert.deepEqual((await snapshot()).selection, [0, 2]);
  await field.press('ControlOrMeta+z');
  assert.equal((await snapshot()).display, '12:34', 'Veto leaves accepted undo history intact');
  await page.evaluate(async () => {
    maskConsumer.destroy();
    const { TextInput } = await import('taet-ui/inputs');
    window.maskConsumer = new TextInput('#root', { mask: 'AA-00', value: 'AB12' });
  });
  await field.press('Home');
  await field.press('Shift+ArrowRight');
  const mixed = await snapshot();
  await field.press('Delete');
  assert.deepEqual(await snapshot(), mixed, 'Incompatible token compaction rejects with selection retained');
  await page.evaluate(() => maskConsumer.destroy());
  console.log('Installed mask keyboard OK: partial replacement/caret, literal rejection, required, separator undo/redo and API history boundaries');
}

async function checkSlotsKeyboardConsumer(page) {
  const field = page.locator('#root input');
  for (const unmaskValue of [false, true]) {
    await page.evaluate(async unmaskValue => {
      const { createSlotsInput } = await import('/output/input-consumer.js');
      const { required } = await import('taet-ui');
      window.slotsConsumer = createSlotsInput(document.querySelector('#root'), unmaskValue);
      slotsConsumer.addValidator(required('Required'));
    }, unmaskValue);
    await field.press('Home');
    await field.press('Shift+ArrowRight');
    await field.press('Shift+ArrowRight');
    await field.press('Backspace');
    assert.equal(await field.inputValue(), '__-1234');
    assert.deepEqual(await page.evaluate(() => ({ value: slotsConsumer.value.get(), raw: slotsConsumer.getRawValue(),
      valid: slotsConsumer.validate().ok })), { value: unmaskValue ? '__1234' : '__-1234', raw: '__1234', valid: true });
    const saved = await page.evaluate(() => JSON.stringify({ value: slotsConsumer.value.get() }));
    await page.evaluate(saved => {
      slotsConsumer.value.clear({ silent: true });
      slotsConsumer.value.set(JSON.parse(saved).value, { silent: true });
      slotsConsumer.addValidator(() => slotsConsumer.getRawValue().includes('_') ?
        { code: 'complete-mask', message: 'Complete the mask' } : null);
    }, saved);
    assert.equal(await field.inputValue(), '__-1234', 'JSON/API roundtrip preserves holes');
    assert.deepEqual(await page.evaluate(() => slotsConsumer.validate().errors.map(error => error.code)), ['complete-mask']);
    await field.press('Home');
    await field.pressSequentially('X');
    assert.equal(await field.inputValue(), 'X_-1234');
    await field.pressSequentially('Y');
    assert.equal(await field.inputValue(), 'XY-1234');
    assert.deepEqual(await page.evaluate(() => ({ raw: slotsConsumer.getRawValue(), valid: slotsConsumer.validate().ok })),
      { raw: 'XY1234', valid: true });
    await field.press('ControlOrMeta+a');
    await field.press('Backspace');
    assert.deepEqual(await page.evaluate(() => ({ value: slotsConsumer.value.get(), raw: slotsConsumer.getRawValue(),
      display: slotsConsumer.getDisplayValue(), valid: slotsConsumer.validate().ok })),
      { value: '', raw: '', display: '', valid: false });
    await page.evaluate(() => slotsConsumer.destroy());
  }
  console.log('Installed slots keyboard OK: positional deletion/refill, formatted/raw values, JSON/API roundtrip, required versus completeness and empty collapse');
}
