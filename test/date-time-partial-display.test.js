import test from 'node:test';
import assert from 'node:assert/strict';
import { TimeInput, DateTimeInput } from '../src/ui/DateTimeInput.js';
import { required } from '../src/core/validators.js';

// These snapshots exercise the same synchronization boundary as blur/refresh.
// Mounted focus, blur and owner validation are covered separately in browsers.
function editor(Type, options = {}) {
  const control = new Type(options);
  control._input = { value: control._toInputValue(control.value.get()) };
  return control;
}
function type(control, text) {
  control._input.value = text;
  return control._handleInput({ inputType: 'insertText' });
}
function sync(control) { control._syncInput(control.value.get()); }
function expectText(control, value, display = value) {
  assert.equal(control.value.get(), value, 'stored value');
  assert.equal(control._input.value, display, 'visible text');
}
const partials = ['1:', '1:3', '12:', '12:3', ':30', '1:3 PM', '1:30 P'];
const malformed = ['noon', '99:', '12:345', '12:34:56', '12:34 PM extra'];

for (const hourMode of ['0-23', '1-24', '12']) {
  test(`TimeInput ${hourMode}: partial and malformed text stays honest on initial/API/refresh/reset sync`, () => {
    for (const text of [...partials, ...malformed]) {
      const c = editor(TimeInput, { hourMode, value: text });
      expectText(c, text);
      const changes = [];
      c.events.on('change', e => changes.push(e.newValue));
      c.refresh();
      expectText(c, text);
      assert.equal(c.value.set(text, { silent: true }), false);
      expectText(c, text);
      c.value.set('09:15', { silent: true });
      c.value.reset({ silent: true });
      expectText(c, text);
      assert.deepEqual(changes, []);
      c.destroy();
      assert.equal(c.value.get(), text, 'destroy must not complete text');
    }
  });

  test(`TimeInput ${hourMode}: native partials stay live through repeated blur-style sync`, () => {
    const c = editor(TimeInput, { hourMode });
    const changes = [];
    c.events.on('change', e => changes.push([e.newValue, e.origin, e.userAction]));
    for (const text of partials) {
      type(c, text);
      expectText(c, text);
      const count = changes.length;
      sync(c);
      sync(c);
      assert.equal(c.validate().value, text);
      expectText(c, text);
      assert.equal(changes.length, count, 'formatting/validation must not emit value changes');
    }
    assert.deepEqual(changes, partials.map(text => [text, 'user', true]));
    c.destroy();
  });

  test(`TimeInput ${hourMode}: accepted shorthand and valid normalization are unchanged`, () => {
    const cases = [
      ['1', '01:00'], ['1 PM', '13:00'], ['12 AM', '00:00'],
      ['1:30', '01:30'], ['1:30 pm', '13:30'], ['00:00', '00:00'],
      ['23:59', '23:59'], ['24:00', '23:00'], ['99:99', '23:59']
    ];
    for (const [text, value] of cases) {
      const c = editor(TimeInput, { hourMode, value: text });
      const hour = Number(value.slice(0, 2));
      const minutes = value.slice(3);
      const display = hourMode === '12'
        ? `${String(hour % 12 || 12).padStart(2, '0')}:${minutes} ${hour >= 12 ? 'PM' : 'AM'}`
        : hourMode === '1-24' && hour === 0 ? `24:${minutes}` : value;
      expectText(c, value, display);
      c.refresh();
      expectText(c, value, display);
      c.destroy();
    }
    const c = editor(TimeInput, { hourMode });
    type(c, '24:00');
    assert.equal(c.value.get(), hourMode === '1-24' ? '00:00' : '23:00');
    c.destroy();
  });
}

test('TimeInput: presentation mode refresh never completes a partial value', () => {
  const c = editor(TimeInput, { value: '1:3' });
  const changes = [];
  c.events.on('change', e => changes.push(e.newValue));
  for (const hourMode of ['12', '1-24', '0-23', '12']) {
    c.hourMode = hourMode;
    c.hour12 = hourMode === '12';
    c.refresh();
    expectText(c, '1:3');
  }
  assert.deepEqual(changes, []);
  c.destroy();
});

for (const [Type, text] of [
  [TimeInput, '1:'], [TimeInput, '1:3'], [TimeInput, '1:3 PM'],
  [DateTimeInput, '2026-11-09T1:'], [DateTimeInput, '2026-11-09T12:3']
]) {
  test(`${Type.name}: display-only 24 mode does not invent missing parts in ${text}`, () => {
    const c = editor(Type, { value: text });
    const display = text.replace('T', ' ');
    c._pendingValue = text;
    let changes = 0;
    c.events.on('change', () => changes++);
    for (const mode of ['24', '24']) {
      c._setPickerMode(mode);
      expectText(c, text, display);
      assert.equal(c._getPickerValue(), text, 'staged value');
      assert.equal(c.hourMode, mode === '24' ? '1-24' : '12');
    }
    assert.equal(changes, 0);
    c._confirmPicker();
    expectText(c, text, display);
    assert.equal(changes, 0, 'confirming unchanged partial text must not complete it');
    c.destroy();
  });
}

for (const [Type, value, pm] of [
  [TimeInput, '01:30', '13:30'],
  [DateTimeInput, '2026-11-09T01:30', '2026-11-09T13:30']
]) {
  test(`${Type.name}: complete picker values still convert AM/PM`, () => {
    const c = editor(Type, { value });
    c._pendingValue = value;
    c._setPickerMode('PM');
    assert.equal(c._getPickerValue(), pm);
    assert.equal(c.value.get(), value, 'picker changes remain staged');
    c._setPickerMode('AM');
    assert.equal(c._getPickerValue(), value);
    c._setPickerMode('24');
    assert.equal(c._getPickerValue(), value);
    c.destroy();
  });
}

test('TimeInput: existing validator API checks completeness without committing or changing required', () => {
  const c = editor(TimeInput, { hourMode: '12', required: true, validators: [required()] });
  type(c, '1:');
  assert.equal(c.validate().ok, true, 'required keeps its nonempty contract');
  const completeTime = value => value === '' || /^(?:[01][0-9]|2[0-3]):[0-5][0-9]$/.test(value)
    ? true : { ok: false, code: 'timeComplete', message: 'Enter a complete time' };
  c.addValidator(completeTime);
  const before = c._input.value;
  const result = c.validate();
  assert.equal(result.ok, false);
  assert.equal(result.value, '1:');
  assert.equal(result.errors[0].code, 'timeComplete');
  assert.equal(c.isValid(), false);
  expectText(c, '1:', before);
  assert.equal(c.validation.getErrors()[0].code, 'timeComplete');
  c.validation.clear({ silent: true });
  assert.deepEqual(c.getErrors(), []);
  expectText(c, '1:', before);
  c.value.set('13:30');
  assert.equal(c.validate().ok, true);
  expectText(c, '13:30', '01:30 PM');
  c.value.clear();
  assert.equal(c.validate().ok, false, 'explicit required still rejects empty');
  c.setValidators([completeTime]);
  assert.equal(c.validate().ok, true, 'optional empty value remains optional');
  c.destroy();
});

function pickerSnapshot(control) {
  const wheel = () => ({ items: [], replaceChildren(...items) { this.items = items; } });
  control._picker = { hidden: true, remove() {} };
  control._hourWheel = wheel();
  control._minuteWheel = wheel();
  control._modeColumn = wheel();
  control._createPickerButton = (text, active, onClick) => ({ text, active, onClick });
  control._hidePickerOverlay = () => { control._picker.hidden = true; };
  control._restorePickerFocus = () => {};
  if (control instanceof DateTimeInput) control._renderPicker = () => control._renderTimePicker();
}

for (const hourMode of ['0-23', '1-24', '12']) {
  for (const [Type, partial, selected] of [
    [TimeInput, '1:3', '13:03'],
    [DateTimeInput, '2026-11-09T12:3', '2026-11-09T12:00']
  ]) {
    test(`${Type.name} ${hourMode}: partial picker has no fabricated selection; period choice stays explicit`, () => {
      const c = editor(Type, { hourMode, value: partial, stepMinutes: 1 });
      pickerSnapshot(c);
      if (Type === DateTimeInput) c._viewDate = new Date(2026, 10, 9);
      c._pendingValue = partial;
      c._renderPicker();
      assert.deepEqual(c._hourWheel.items.filter(item => item.active), [], 'no selected hour');
      assert.deepEqual(c._minuteWheel.items.filter(item => item.active), [], 'no selected minute');
      assert.deepEqual(c._modeColumn.items.filter(item => item.active).map(item => item.text),
        hourMode === '12' ? [] : ['24'], '24 denotes presentation, not time completion');
      const changes = [];
      c.events.on('change', e => changes.push([e.newValue, e.origin, e.userAction]));
      c._setPickerMode('24');
      expectText(c, partial, partial.replace('T', ' '));
      assert.equal(c._getPickerValue(), partial);
      c._confirmPicker();
      expectText(c, partial, partial.replace('T', ' '));
      assert.deepEqual(changes, [], 'OK without a value choice keeps partial');
      c._pendingValue = partial;
      c._modeColumn.items.find(item => item.text === 'PM').onClick();
      assert.equal(c._getPickerValue(), selected, 'explicit PM retains existing completion defaults');
      assert.equal(c.value.get(), partial, 'period selection remains staged');
      assert.deepEqual(c._modeColumn.items.filter(item => item.active).map(item => item.text), ['PM']);
      assert.equal(c._hourWheel.items.filter(item => item.active).length, 1);
      assert.equal(c._minuteWheel.items.filter(item => item.active).length, 1);
      c._cancelPicker();
      expectText(c, partial, partial.replace('T', ' '));
      assert.deepEqual(changes, []);
      c._pendingValue = partial;
      c._setPickerMode('PM');
      c._confirmPicker();
      assert.equal(c.value.get(), selected);
      assert.deepEqual(changes, [[selected, 'user', true]]);
      c.destroy();
    });
  }
}

test('TimeInput: explicit step may complete a partial time with established defaults', () => {
  const c = editor(TimeInput, { hourMode: '12', value: '1:' });
  c._stepTime(1);
  expectText(c, '01:15', '01:15 AM');
  c.destroy();
});
