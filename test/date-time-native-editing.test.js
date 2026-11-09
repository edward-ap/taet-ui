import test from 'node:test';
import assert from 'node:assert/strict';
import { DateInput, TimeInput, DateTimeInput } from '../src/ui/DateTimeInput.js';

// Unit snapshots cover the live-model/sync boundary. Real browser typing,
// selection, composition and owner routing have separate Playwright coverage.
function editor(Type = TimeInput, options = {}) {
  const control = new Type(options);
  control._input = { value: control._toInputValue(control.value.get()) };
  return control;
}
function type(control, text) {
  control._input.value = text;
  return control._handleInput();
}
function formatted(control) { control._syncInput(control.value.get()); }

for (const hourMode of ['0-23', '1-24', '12']) {
  test(`TimeInput ${hourMode}: native prefixes survive while normalized values remain live`, () => {
    const c = editor(TimeInput, { hourMode });
    const changes = [];
    c.events.on('change', e => changes.push([e.newValue, e.origin, e.userAction]));
    for (const [text, value] of [['1', '01:00'], ['12', '12:00'], ['12:', '12:'], ['12:3', '12:3'], ['12:34', '12:34']]) {
      type(c, text);
      assert.equal(c._input.value, text);
      assert.equal(c.value.get(), value);
      assert.equal(c.validate().value, value);
      assert.equal(c._input.value, text, 'reads and validation must not format');
    }
    assert.deepEqual(changes.map(e => e[0]), ['01:00', '12:00', '12:', '12:3', '12:34']);
    assert.ok(changes.every(e => e[1] === 'user' && e[2] === true));
    formatted(c);
    assert.equal(c._input.value, hourMode === '12' ? '12:34 PM' : '12:34');
    c.destroy();
  });
}

test('equal normalized prefixes keep native text without duplicate events', () => {
  const c = editor();
  let changes = 0;
  c.events.on('change', () => changes++);
  type(c, '1');
  assert.equal(type(c, '01'), false);
  assert.equal(c._input.value, '01');
  assert.equal(changes, 1);
  assert.equal(c.value.set('01:00'), false);
  assert.equal(c._input.value, '01:00');
  c.destroy();
});

for (const action of ['set', 'silent', 'same', 'clear', 'reset', 'refresh', 'step']) {
  test(`explicit ${action} replaces native temporal text`, () => {
    const c = editor(TimeInput, { value: '08:00' });
    type(c, '1');
    let count = 0;
    c.events.on('change', () => count++);
    if (action === 'set') c.value.set('09:15');
    if (action === 'silent') c.value.set('09:15', { silent: true });
    if (action === 'same') c.value.set('01:00');
    if (action === 'clear') c.value.clear();
    if (action === 'reset') c.value.reset();
    if (action === 'refresh') c.refresh();
    if (action === 'step') c._stepTime(1);
    const expected = { set: '09:15', silent: '09:15', same: '01:00', clear: '', reset: '08:00', refresh: '01:00', step: '01:15' }[action];
    assert.equal(c.value.get(), expected);
    assert.equal(c._input.value, expected);
    if (['silent', 'same', 'refresh'].includes(action)) assert.equal(count, 0);
    c.destroy();
  });
}

test('veto rejects native text and restores the authoritative old value', () => {
  const c = editor(TimeInput, { value: '08:00', onBeforeChange: e => { e.cancel = true; } });
  assert.equal(type(c, '1'), false);
  assert.equal(c.value.get(), '08:00');
  assert.equal(c._input.value, '08:00');
  assert.equal(c._nativeInputSync, null);
  c.destroy();
});

for (const state of ['disabled', 'readOnly']) {
  test(`${state} refuses synthetic native edits`, () => {
    const c = editor(TimeInput, { value: '08:00', [state]: true });
    assert.equal(type(c, '1'), false);
    assert.equal(c.value.get(), '08:00');
    assert.equal(c._input.value, '08:00');
    c.destroy();
  });
}

for (const phase of ['beforeChange', 'change', 'afterChange']) {
  test(`${phase} callback API writes do not inherit native suppression`, () => {
    const c = editor();
    c.events.on(phase, () => c.value.set('09:15', { silent: true }));
    type(c, '1');
    // Preserve EditorControl's existing nontransactional beforeChange ordering:
    // the outer accepted change follows any write made during beforeChange.
    const expected = phase === 'beforeChange' ? '01:00' : '09:15';
    assert.equal(c.value.get(), expected);
    assert.equal(c._input.value, expected);
    assert.equal(c._nativeInputSync, null);
    c.destroy();
  });
  test(`${phase} callback teardown stops the transaction`, () => {
    const c = editor();
    c.events.on(phase, () => c.destroy());
    assert.doesNotThrow(() => type(c, '1'));
    assert.equal(c.destroyed, true);
    assert.equal(c._input, null);
    assert.equal(c._nativeInputSync, null);
  });
}

test('callback same-value writes still canonicalize immediately', () => {
  const c = editor();
  c.events.on('change', () => c.value.set(c.value.get(), { silent: true }));
  type(c, '1');
  assert.equal(c._input.value, '01:00');
  c.destroy();
});

test('callback exceptions cannot leak native sync suppression into later API writes', () => {
  const c = editor(TimeInput, { onBeforeChange: () => { throw new Error('stop'); } });
  assert.throws(() => type(c, '1'), /stop/);
  assert.equal(c._nativeInputSync, null);
  c.value.set('09:15', { silent: true });
  assert.equal(c._input.value, '09:15');
  c.destroy();
});

for (const [Type, text, value] of [
  [DateInput, '2026-11-09', '2026-11-09'],
  [DateTimeInput, '2026-11-09T12:34', '2026-11-09T12:34'],
  [DateTimeInput, '2026-11-09 12:34', '2026-11-09T12:34']
]) {
  test(`${Type.name} native spelling and model contract remain distinct`, () => {
    const c = editor(Type);
    type(c, text);
    assert.equal(c._input.value, text);
    assert.equal(c.value.get(), value);
    formatted(c);
    assert.equal(c._input.value, value.replace('T', ' '));
    c.destroy();
  });
}

for (const [Type, options, text, value, display] of [
  [DateInput, {}, '2026-11-09XYZ', '2026-11-09', '2026-11-09'],
  [DateInput, {}, '2026-11-019', '2026-11-01', '2026-11-01'],
  [DateTimeInput, {}, '2026-11-09 12:345', '2026-11-09T12:34', '2026-11-09 12:34'],
  [TimeInput, {}, '99', '23:00', '23:00'],
  [TimeInput, { hourMode: '12' }, '11:99 PM', '23:59', '11:59 PM'],
  [TimeInput, { hourMode: '1-24' }, '25', '23:00', '23:00']
]) {
  test(`${Type.name} lossy normalization remains visible: ${text}`, () => {
    const c = editor(Type, options);
    type(c, text);
    assert.equal(c.value.get(), value);
    assert.equal(c._input.value, display);
    c.destroy();
  });
}

for (const [hourMode, text, value] of [
  ['1-24', '24', '00:00'], ['12', '1:34 PM', '13:34'],
  ['12', '12 AM', '00:00'], ['0-23', '9:34', '09:34']
]) {
  test(`lossless ${hourMode} clock spelling survives: ${text}`, () => {
    const c = editor(TimeInput, { hourMode });
    type(c, text);
    assert.equal(c.value.get(), value);
    assert.equal(c._input.value, text);
    c.destroy();
  });
}

function select(c, start, end = start, direction = 'none') {
  Object.assign(c._input, { selectionStart: start, selectionEnd: end, selectionDirection: direction });
  c._input.setSelectionRange = (a, b, d) => {
    Object.assign(c._input, { selectionStart: a, selectionEnd: b, selectionDirection: d });
  };
  c._nativeSelectionBefore = c._captureNativeInput();
}
for (const [Type, value, text] of [
  [DateInput, '2026-11-09', '2026-11-09'],
  [DateTimeInput, '2026-11-09T12:34', '2026-11-09 12:34']
]) {
  for (const mode of ['cancelable', 'noncancelable', 'missing', 'composition']) {
    test(`${Type.name} rejects destructive suffix insertion via ${mode}`, () => {
      const c = editor(Type, { value });
      c._rememberNativeInput();
      const at = text.length - 1;
      select(c, at);
      let changes = 0;
      c.events.on('beforeChange', () => changes++);
      let prevented = false;
      const event = { inputType: mode === 'composition' ? 'insertCompositionText' : 'insertText',
        data: '1', cancelable: mode === 'cancelable', isComposing: mode === 'composition',
        preventDefault() { prevented = true; } };
      if (mode !== 'missing') c._handleBeforeInput(event);
      if (!prevented) {
        c._input.value = text.slice(0, at) + '1' + text.slice(at);
        c._input.selectionStart = c._input.selectionEnd = at + 1;
        c._handleInput(event);
      }
      assert.equal(prevented, mode === 'cancelable');
      assert.equal(c._input.value, text);
      assert.equal(c.value.get(), value);
      assert.equal(c._input.selectionStart, at);
      assert.equal(c._input.selectionEnd, at);
      assert.equal(changes, 0);
      select(c, at, at + 1, 'backward');
      c._handleBeforeInput({ ...event, cancelable: true });
      c._input.value = text.slice(0, at) + '1';
      c._handleInput(event);
      assert.equal(c._input.value, text.slice(0, at) + '1');
      assert.equal(c.value.get(), (text.slice(0, at) + '1').replace(' ', 'T'));
      assert.equal(changes, 1);
      c.destroy();
    });
  }
  test(`${Type.name} API suffix normalization remains unchanged`, () => {
    const c = editor(Type, { value });
    c._rememberNativeInput();
    select(c, text.length - 1);
    c.value.set(text.slice(0, -1) + '1' + text.slice(-1), { silent: true });
    assert.equal(c._input.value, text.slice(0, -1) + '1');
    c.destroy();
  });
}

test('missing-beforeinput guard can infer the insertion without selection events', () => {
  const c = editor(DateInput, { value: '2026-11-09' });
  c._rememberNativeInput();
  c._nativeSelectionBefore = null;
  select(c, 10);
  c._nativeSelectionBefore = null;
  c._input.value = '2026-11-019';
  c._handleInput({ inputType: 'insertText' });
  assert.equal(c._input.value, '2026-11-09');
  assert.equal(c._input.selectionStart, 9);
  c.destroy();
});

test('beforeChange API write plus veto keeps surviving model and display coherent', () => {
  const c = editor(TimeInput, { value: '08:00' });
  c.events.on('beforeChange', e => { c.value.set('18:45', { silent: true }); e.cancel = true; });
  assert.equal(type(c, '1'), false);
  assert.equal(c.value.get(), '18:45');
  assert.equal(c._input.value, '18:45');
  c.destroy();
});

test('rejected noncancelable replacement restores backward selection and no new history value', () => {
  const c = editor(DateInput, { value: '2026-11-09' });
  c._rememberNativeInput();
  select(c, 8, 9, 'backward');
  c._handleBeforeInput({ cancelable: false, inputType: 'insertFromPaste', data: '12' });
  c._input.value = '2026-11-129';
  c._handleInput({ inputType: 'insertFromPaste' });
  assert.equal(c._input.value, '2026-11-09');
  assert.equal(c.value.get(), '2026-11-09');
  assert.deepEqual([c._input.selectionStart, c._input.selectionEnd, c._input.selectionDirection], [8, 9, 'backward']);
  c._handleBeforeInput({ cancelable: false, inputType: 'deleteContentBackward', data: null });
  c._input.value = '2026-11-9';
  c._handleInput({ inputType: 'deleteContentBackward' });
  assert.equal(c.value.get(), '2026-11-9');
  c._input.value = '2026-11-09';
  c._handleInput({ inputType: 'historyUndo' });
  assert.equal(c.value.get(), '2026-11-09');
  c.destroy();
});
