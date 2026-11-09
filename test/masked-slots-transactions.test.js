import test from 'node:test';
import assert from 'node:assert/strict';
import { TextInput } from '../src/ui/TextInput.js';
import { TextField } from '../src/ui/TextField.js';
import { TextArea } from '../src/ui/TextArea.js';
import { NumberInput } from '../src/ui/NumberInput.js';
import { SelectInput } from '../src/ui/SelectInput.js';
import { required } from '../src/core/validators.js';

function editor(options = {}) {
  const c = new TextInput({ maskMode: 'slots', mask: 'AA-0000', value: 'AB1234', ...options });
  c._input = { value: c.getDisplayValue(), selectionStart: 0, selectionEnd: 0, selectionDirection: 'none',
    setSelectionRange(start, end, direction = 'none') { Object.assign(this, { selectionStart: start, selectionEnd: end, selectionDirection: direction }); } };
  return c;
}
function select(c, start, end = start) { c._input.setSelectionRange(start, end); }
function edit(c, data = '', inputType = 'insertText') {
  let prevented = false;
  c._beforeMaskInput({ data, inputType, cancelable: true, preventDefault() { prevented = true; } });
  assert.equal(prevented, true);
}
function snapshot(c) { return [c.value.get(), c.getRawValue(), c.getDisplayValue(), c._input.value, c._input.selectionStart, c._input.selectionEnd]; }

for (const raw of [false, true]) {
  test(`slots mixed deletion and sequential replacement round trip raw=${raw}`, () => {
    const c = editor({ unmaskValue: raw }); select(c, 0, 2); edit(c, '', 'deleteContentForward');
    assert.equal(c.value.get(), raw ? '__1234' : '__-1234');
    assert.equal(c.getRawValue(), '__1234'); assert.equal(c._input.value, '__-1234');
    edit(c, 'X'); assert.equal(c._input.value, 'X_-1234');
    edit(c, 'Y'); assert.equal(c._input.value, 'XY-1234'); assert.equal(c._input.selectionStart, 3);
    c._moveMaskHistory(false); assert.equal(c._input.value, 'X_-1234');
    c._moveMaskHistory(false); assert.equal(c._input.value, '__-1234');
    c._moveMaskHistory(false); assert.equal(c._input.value, 'AB-1234');
    assert.deepEqual([c._input.selectionStart, c._input.selectionEnd], [0, 2]);
    c._moveMaskHistory(true); assert.equal(c._input.value, '__-1234');
    const saved = JSON.parse(JSON.stringify(c.value.get())); c.value.set(saved, { silent: true });
    assert.equal(c.value.get(), saved); assert.equal(c._maskUndo.length, 0);
    const copy = editor({ unmaskValue: raw, value: saved }); assert.equal(copy._input.value, '__-1234');
    c.destroy(); copy.destroy();
  });
  test(`slots short selection replacement does not shift suffix raw=${raw}`, () => {
    const c = editor({ unmaskValue: raw }); select(c, 0, 2); edit(c, 'X');
    assert.equal(c._input.value, 'X_-1234'); assert.equal(c._input.selectionStart, 1);
    edit(c, 'Y'); assert.equal(c._input.value, 'XY-1234'); c.destroy();
  });
  test(`slots empty canonical value and explicit completeness raw=${raw}`, () => {
    const c = editor({ unmaskValue: raw, value: '', validators: [required(), value => !value.includes('_') || 'Incomplete'] });
    assert.equal(c.placeholder, '__-____'); assert.equal(c.getDisplayValue(), ''); assert.equal(c.validate().ok, false);
    edit(c, 'X'); assert.equal(c.value.get(), raw ? 'X_____' : 'X_-____'); assert.equal(c.validate().ok, false);
    select(c, 0, c._input.value.length); edit(c, '', 'deleteContentForward');
    assert.equal(c.value.get(), ''); assert.equal(c.getRawValue(), ''); assert.equal(c._input.value, ''); c.destroy();
  });
}

test('slots formatted/raw sparse and legacy compact API inputs round trip', () => {
  for (const [mask, input, display, raw] of [
    ['AA-0000', 'X_-1234', 'X_-1234', 'X_1234'], ['AA-0000', 'X_1234', 'X_-1234', 'X_1234'],
    ['AA-0000', 'AB12', 'AB-12__', 'AB12__'], ['AA-0000', '__-____', '', ''],
    ['ID-000', '12', 'ID-12_', 'ID12_'], ['ID-000', 'ID_2_', 'ID-_2_', 'ID_2_'],
    ['+7 (000)', '7_2_', '+7 (_2_)', '7_2_'], ['9a*', '1B', '1B_', '1B_']
  ]) for (const unmaskValue of [false, true]) {
    const c = editor({ mask, value: input, unmaskValue });
    assert.equal(c.getDisplayValue(), display); assert.equal(c.getRawValue(), raw);
    const value = c.value.get(); assert.equal(value, unmaskValue ? raw : display);
    c.value.set(value); assert.equal(c.value.get(), value); c.destroy();
  }
});

test('slots placeholder configuration is unambiguous and explicit placeholder stays separate', () => {
  const c = editor({ placeholderChar: '#', value: 'X', placeholder: 'Code' });
  assert.equal(c.placeholder, 'Code'); assert.equal(c._input.value, 'X#-####'); c.destroy();
  for (const placeholderChar of ['', 'ab', 'A', '0', ' ', '\n', '😀', '-'])
    assert.throws(() => editor({ placeholderChar }), /placeholderChar/);
  assert.throws(() => editor({ mask: '__000' }), /placeholderChar/);
  assert.throws(() => editor({ mask: null }), /mask/);
  assert.throws(() => editor({ mask: 'ID-' }), /token/);
  assert.throws(() => editor({ maskMode: 'unknown' }), /maskMode/);
  assert.throws(() => editor({ inputType: 'number' }), /input/);
  for (const Control of [TextArea, NumberInput, SelectInput]) assert.throws(() => new Control({ maskMode: 'slots', mask: '00' }), /slots/);
  const direct = new TextField({ maskMode: 'slots', mask: '00', value: '1' }); assert.equal(direct.value.get(), '1_'); direct.destroy();
});

test('slots invalid sparse API data rejects atomically while compact default remains unchanged', () => {
  const c = editor(); const before = snapshot(c);
  for (const value of ['X_-12', 'X_-12_34', 'X_-ABCD']) assert.throws(() => c.value.set(value), /slot/i);
  assert.deepEqual(snapshot(c), before); c.destroy();
  const compact = new TextInput({ mask: 'AA-0000', value: 'X_-1234', placeholderChar: '-' });
  assert.equal(compact.value.get(), 'X'); assert.equal(compact.placeholder, 'AA-0000'); compact.destroy();
});

test('slots deletion crosses literals without shifting and repeated deletion reaches empty', () => {
  const c = editor(); select(c, 3); edit(c, '', 'deleteContentBackward');
  assert.equal(c._input.value, 'A_-1234'); assert.equal(c._input.selectionStart, 1);
  c.value.set('AB1234'); select(c, 2); edit(c, '', 'deleteContentForward'); assert.equal(c._input.value, 'AB-_234');
  select(c, 7); for(let i=0;i<7;i++) edit(c, '', 'deleteContentBackward');
  assert.equal(c.value.get(), ''); c.destroy();
});

test('slots paste and overwrite retain positions; selection overflow is rejected', () => {
  const c = editor(); select(c, 3, 7); edit(c, '56', 'insertFromPaste'); assert.equal(c._input.value, 'AB-56__');
  select(c, 0, 2); edit(c, 'XY', 'insertFromPaste'); assert.equal(c._input.value, 'XY-56__');
  select(c, 3); edit(c, '98', 'insertFromPaste'); assert.equal(c._input.value, 'XY-98__');
  select(c, 0, 1); const before = snapshot(c); edit(c, 'PQ', 'insertFromPaste'); assert.deepEqual(snapshot(c), before);
  select(c, 0, 7); edit(c, '__-1234', 'insertFromPaste'); assert.equal(c._input.value, '__-1234');
  select(c, 3, 7); const beforeOverflow = snapshot(c); edit(c, '12345', 'insertFromPaste'); assert.deepEqual(snapshot(c), beforeOverflow);
  c.destroy();
});

test('slots focused empty scaffold is not a public value and preserves late-slot undo', () => {
  const c = editor({ value: '', required: true }); c._slotFocused = true; c._syncInput(c._value);
  assert.equal(c._input.value, '__-____'); assert.equal(c.getDisplayValue(), ''); assert.equal(c.getRawValue(), '');
  select(c, 3); edit(c, '1'); assert.equal(c.value.get(), '__-1___');
  c._moveMaskHistory(false); assert.equal(c.value.get(), ''); assert.equal(c._input.value, '__-____');
  assert.equal(c._input.selectionStart, 3); c.value.set('', { silent: true }); assert.equal(c._input.value, '__-____');
  c._slotFocused = false; c._syncInput(c._value); assert.equal(c._input.value, ''); c.destroy();
});

test('slots focused native required guard respects external custom errors', () => {
  const c = editor({ value: '', required: true });
  Object.assign(c._input, { willValidate: true, validationMessage: '', validity: { customError: false },
    setCustomValidity(message) { this.validationMessage = message; this.validity.customError = message !== ''; } });
  c._slotFocused = true; c._syncInput(c._value); assert.equal(c._input.validity.customError, true);
  c._slotFocused = false; c._syncInput(c._value); assert.equal(c._input.validity.customError, false);
  c._input.setCustomValidity('Application error'); c._slotFocused = true; c._syncInput(c._value);
  assert.equal(c._input.validationMessage, 'Application error'); c.value.set('AB1234');
  assert.equal(c._input.validationMessage, 'Application error'); c.destroy();
});

for (const raw of [false, true]) {
  test(`slots API boundaries and veto preserve history raw=${raw}`, () => {
    const c = editor({ unmaskValue: raw }); select(c, 0, 2); edit(c, 'X');
    const veto = c.events.on('beforeChange', e => { e.cancel = true; });
    const before = snapshot(c); edit(c, 'Y'); assert.deepEqual(snapshot(c), before);
    c.value.set('ZZ9999'); assert.equal(c._maskUndo.length, 1);
    c._moveMaskHistory(false); assert.deepEqual(snapshot(c), before); veto.off();
    c._moveMaskHistory(false); assert.equal(c._input.value, 'AB-1234');
    for (const action of ['same', 'silent', 'clear', 'reset']) {
      select(c, 0, 2); edit(c, 'X');
      if (action === 'same') c.value.set(c.value.get());
      if (action === 'silent') c.value.set('ZZ9999', { silent: true });
      if (action === 'clear') c.value.clear();
      if (action === 'reset') c.value.reset();
      const value = c.value.get(); c._moveMaskHistory(false); assert.equal(c.value.get(), value);
      assert.equal(c._maskUndo.length, 0); assert.equal(c._maskRedo.length, 0);
    }
    c.destroy();
  });
  test(`slots synthetic composition retains live values and original selected range raw=${raw}`, () => {
    const c = editor({ unmaskValue: raw }); select(c, 0, 2);
    c._maskComposition = c._maskSnapshot(); c._maskComposing = true;
    const values = []; c.events.on('change', e => values.push(e.newValue));
    c._input.value = 'B-1234'; select(c, 1);
    c._handleInput({ isComposing: true, inputType: 'insertCompositionText' });
    assert.equal(c.value.get(), raw ? 'B_1234' : 'B_-1234'); assert.equal(c._input.value, 'B-1234');
    c._endMaskComposition(); assert.equal(c._input.value, 'B_-1234'); assert.equal(values.length, 1);
    c._moveMaskHistory(false); assert.equal(c._input.value, 'AB-1234');
    assert.deepEqual([c._input.selectionStart, c._input.selectionEnd], [0, 2]); c.destroy();
  });
  test(`slots noncancelable input restores fixed selection and rejects invalid data raw=${raw}`, () => {
    const c = editor({ unmaskValue: raw }); select(c, 0, 2);
    c._beforeMaskInput({ data: 'B', inputType: 'insertText', cancelable: false });
    c._input.value = 'B-1234'; select(c, 1); c._handleInput({ inputType: 'insertText', data: 'B' });
    assert.equal(c._input.value, 'B_-1234');
    select(c, 0, 2); c._beforeMaskInput({ data: '9', inputType: 'insertText', cancelable: false });
    c._input.value = '9-1234'; select(c, 1); c._handleInput({ inputType: 'insertText', data: '9' });
    assert.equal(c._input.value, 'B_-1234'); assert.deepEqual([c._input.selectionStart, c._input.selectionEnd], [0, 2]); c.destroy();
  });
}

for (const phase of ['beforeChange', 'change', 'afterChange']) {
  test(`slots nested API and ${phase} teardown preserve mutation boundaries`, () => {
    const c = editor(); select(c, 0, 2);
    c.events.on(phase, e => { if(e.newValue === 'X_-1234') { c.value.set('YZ9999', { silent: true }); if(phase === 'beforeChange') e.cancel = true; } });
    edit(c, 'X'); assert.equal(c.value.get(), 'YZ-9999'); assert.equal(c._input.value, 'YZ-9999');
    assert.equal(c._maskUndo.length, 0); c.destroy();
    const dying = editor(); select(dying, 0, 2); dying.events.on(phase, () => dying.destroy()); edit(dying, 'X');
    assert.equal(dying.destroyed, true); assert.equal(dying._input, null); assert.equal(dying._maskUndo.length, 0);
  });
}

test('slots disabled/readonly and bounded history retain ordinary field safeguards', () => {
  const c = editor(); select(c, 0, 2); c.disabled = true; const before = snapshot(c); edit(c, 'X'); assert.deepEqual(snapshot(c), before);
  c.disabled = false; c.setReadOnly(true); edit(c, 'X'); assert.deepEqual(snapshot(c), before); c.setReadOnly(false);
  for(let i=0;i<105;i++) { select(c, 0, 1); edit(c, i % 2 ? 'X' : 'Y'); }
  assert.equal(c._maskUndo.length, 100); c._moveMaskHistory(false); assert.equal(c._maskRedo.length, 1);
  select(c, 0, 1); edit(c, 'Z'); assert.equal(c._maskRedo.length, 0); c.destroy();
});

test('slots native required ownership survives application replacement and barred validation', () => {
  const c = editor({ value: '', required: true }); let message = '';
  Object.assign(c._input, { willValidate: true, validity: { customError: false },
    setCustomValidity(value) { message = value; this.validity.customError = value !== ''; } });
  Object.defineProperty(c._input, 'validationMessage', { get() { return this.willValidate ? message : ''; } });
  c._slotFocused = true; c._syncInput(c._value); assert.equal(message, 'Please fill out this field.');
  c._input.willValidate = false; c._input.setCustomValidity('Application replacement');
  c.value.set('AB1234', { silent: true }); assert.equal(message, 'Application replacement');
  c._input.willValidate = true; c._syncInput(c._value); assert.equal(message, 'Application replacement');
  c._input.setCustomValidity(''); c.value.clear({ silent: true }); assert.equal(message, 'Please fill out this field.');
  c._input.willValidate = false; c.value.set('AB1234', { silent: true }); assert.equal(message, 'Please fill out this field.');
  c._input.willValidate = true; c._syncInput(c._value); assert.equal(message, ''); c.destroy();
});

test('slots sparse serialization is lossless for every empty/filled pattern and literal form', () => {
  const tokens = { '0': '3', '9': '7', A: 'B', a: 'x', '*': '9' };
  for (const mask of ['AA-0000', 'ID-000', '+7 (000)', 'A0A0', '😀-00', '00___00', '*9aA']) {
    const placeholderChar = mask.includes('_') ? '?' : '_';
    const count = [...mask].filter(char => tokens[char]).length;
    for (let bits = 0; bits < 2 ** count; bits++) {
      let index = 0;
      const formatted = [...mask].map(char => tokens[char] ? bits & (1 << index++) ? tokens[char] : placeholderChar : char).join('');
      const expected = bits ? formatted : '';
      for (const unmaskValue of [false, true]) {
        const c = new TextInput({ mask, maskMode: 'slots', placeholderChar, unmaskValue, value: formatted });
        assert.equal(c.getDisplayValue(), expected); const saved = c.value.get();
        c.value.set(saved); assert.equal(c.getDisplayValue(), expected); assert.equal(c.value.get(), saved);
        const copy = new TextInput({ mask, maskMode: 'slots', placeholderChar, unmaskValue: !unmaskValue, value: saved });
        assert.equal(copy.getDisplayValue(), expected); c.destroy(); copy.destroy();
      }
    }
  }
});
