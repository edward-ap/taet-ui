import test from 'node:test';
import assert from 'node:assert/strict';
import { NumberInput } from '../src/ui/NumberInput.js';

// State-machine tests supply the DOM-input snapshot explicitly. Real native
// number editing, badInput and focus routing are covered by browser tests.
function editor(options = {}) {
  const control = new NumberInput({ updateMode: 'commit', value: 20, ...options });
  control._input = { value: String(control.value.get() ?? ''), validity: { badInput: false } };
  return control;
}
function type(control, text, badInput = false) {
  control._input.value = text;
  control._input.validity.badInput = badInput;
  control._handleInput({});
}
function watch(control) {
  const events = [];
  for (const name of ['beforeChange', 'change', 'afterChange', 'dirtyChange', 'draftChange']) {
    control.events.on(name, event => events.push([name, event.newValue ?? event.pending]));
  }
  return events;
}

test('commit mode separates draft, numeric value, dirty and normalized validation', () => {
  const c = editor({ min: 10 });
  const events = watch(c);
  type(c, '1');
  assert.equal(c.value.get(), 20);
  assert.equal(c.getRawValue(), '20');
  assert.equal(c.isDirty(), false);
  assert.equal(c.hasPendingInput(), true);
  assert.equal(c.validate().value, 10);
  assert.equal(c.value.get(), 20);
  assert.deepEqual(events, [['draftChange', true]]);
  const result = c.commitInput({ origin: 'user' });
  assert.deepEqual(result, { ok: true, changed: true, status: 'committed', value: 10 });
  assert.equal(c._input.value, '10');
  assert.deepEqual(events.map(e => e[0]), ['draftChange', 'beforeChange', 'change', 'afterChange', 'dirtyChange', 'draftChange']);
  c.destroy();
});

test('normalization order, null and clamp false preserve existing semantics', () => {
  const c = editor({ isInteger: true, min: 1.26, precision: 1 });
  type(c, '1.99');
  assert.equal(c.commitInput().value, 1.3);
  type(c, '');
  assert.equal(c.commitInput().value, null);
  const free = editor({ min: 10, clamp: false });
  type(free, '1');
  assert.equal(free.validate().ok, true);
  assert.equal(free.commitInput().value, 1);
  c.destroy(); free.destroy();
});

test('unchanged successful commit clears text/pending without numeric events', () => {
  const c = editor({ value: 1 });
  const events = watch(c);
  type(c, '1.0');
  assert.deepEqual(c.commitInput(), { ok: true, changed: false, status: 'unchanged', value: 1 });
  assert.equal(c._input.value, '1');
  assert.deepEqual(events, [['draftChange', true], ['draftChange', false]]);
  c.destroy();
});

test('badInput is not empty null and can be corrected or canceled', () => {
  const c = editor();
  type(c, '', true);
  assert.equal(c.validate().ok, false);
  assert.equal(c.commitInput().status, 'invalid');
  assert.equal(c.value.get(), 20);
  assert.equal(c.hasPendingInput(), true);
  type(c, '12');
  assert.equal(c.commitInput().value, 12);
  type(c, '', true);
  assert.equal(c.cancelInput(), true);
  assert.equal(c._input.value, '12');
  assert.equal(c.hasPendingInput(), false);
  assert.equal(c.getErrors().length, 0);
  c.destroy();
});

for (const action of ['same', 'silent', 'clear', 'reset', 'userAction']) {
  test(`API ${action} immediately replaces pending text`, () => {
    const c = editor();
    type(c, '1');
    const events = watch(c);
    if (action === 'clear') c.value.clear();
    else if (action === 'reset') c.value.reset();
    else c.value.set(action === 'silent' ? 4 : 20, action === 'silent' ? { silent: true } : action === 'userAction' ? { origin: 'user' } : {});
    assert.equal(c.hasPendingInput(), false);
    assert.equal(c._input.value, action === 'clear' ? '' : action === 'silent' ? '4' : '20');
    if (action === 'silent') assert.deepEqual(events, []);
    c.destroy();
  });
}

test('veto retains recoverable draft and refuses repeated commit', () => {
  const c = editor();
  type(c, '1');
  const off = c.events.on('beforeChange', event => { event.cancel = true; });
  assert.equal(c.commitInput().status, 'vetoed');
  assert.equal(c.commitInput().ok, false);
  assert.equal(c.value.get(), 20);
  assert.equal(c.hasPendingInput(), true);
  off.off();
  assert.equal(c.commitInput().value, 1);
  c.destroy();
});

for (const phase of ['beforeChange', 'change', 'afterChange', 'dirtyChange', 'draftChange']) {
  for (const nested of ['silent', 'same', 'reset', 'destroy']) {
    test(`${phase}: nested ${nested} supersedes stale commit`, () => {
      const c = editor();
      type(c, '12');
      let called = false;
      c.events.on(phase, () => {
        if (called) return;
        called = true;
        if (nested === 'destroy') c.destroy();
        else if (nested === 'reset') c.value.reset({ silent: true });
        else c.value.set(nested === 'same' ? c.value.get() : 7, { silent: true });
      });
      const result = c.commitInput();
      assert.equal(result.status, nested === 'destroy' ? 'destroyed' : 'superseded');
      assert.equal(result.ok, false);
      if (nested === 'silent') assert.equal(c.value.get(), 7);
      if (nested === 'reset') assert.equal(c.value.get(), 20);
      if (!c.destroyed) c.destroy();
    });
  }
}

for (const state of ['disabled', 'readonly']) {
  test(`${state} preserves draft and refuses completion; API may replace it`, () => {
    const c = editor();
    type(c, '12');
    if (state === 'disabled') c.disable(); else c.setReadOnly(true);
    c.refresh();
    assert.equal(c._input.value, '12');
    assert.equal(c.commitInput().status, state);
    assert.equal(c.hasPendingInput(), true);
    c.value.set(7, { silent: true });
    assert.equal(c.value.get(), 7);
    assert.equal(c.hasPendingInput(), false);
    c.destroy();
  });
}

test('spin starts at draft and performs one normalized write', () => {
  const c = editor({ min: 10, increment: 2 });
  type(c, '1');
  let changes = 0;
  c.events.on('change', () => ++changes);
  assert.equal(c.spinUp(), true);
  assert.equal(c.value.get(), 10);
  assert.equal(changes, 1);
  assert.equal(c.hasPendingInput(), false);
  type(c, '', true);
  assert.equal(c.spinUp(), false);
  assert.equal(c.value.get(), 10);
  c.destroy();
});

test('destroy never commits; calls after teardown return a structured refusal', () => {
  const c = editor();
  type(c, '12');
  c.destroy();
  assert.equal(c.value.get(), 20);
  assert.equal(c.commitInput().status, 'destroyed');
  assert.equal(c.cancelInput(), false);
});

test('draft callback hydration wins over a real input event', () => {
  const c = editor();
  c.events.on('draftChange', event => { if (event.pending) c.value.set(7, { silent: true }); });
  type(c, '1');
  assert.equal(c.value.get(), 7);
  assert.equal(c._input.value, '7');
  assert.equal(c.hasPendingInput(), false);
  c.destroy();
});


for (const nested of ['silent', 'same', 'reset', 'cancel', 'destroy']) {
  test(`validator ${nested} supersedes candidate without later callbacks or stale errors`, () => {
    const c = editor();
    type(c, '12');
    let later = 0;
    c.setValidators([() => {
      if (nested === 'destroy') c.destroy();
      else if (nested === 'cancel') c.cancelInput({ silent: true });
      else if (nested === 'reset') c.value.reset({ silent: true });
      else c.value.set(nested === 'same' ? c.value.get() : 7, { silent: true });
      return 'Stale error';
    }, () => { ++later; return 'Later error'; }]);
    assert.equal(c.validate().ok, false);
    assert.equal(later, 0);
    assert.deepEqual(c.getErrors(), []);
    if (!c.destroyed) c.destroy();
  });
}

test('validate event supersession reports false without undoing nested hydration', () => {
  const c = editor();
  type(c, '12');
  c.events.on('validate', () => c.value.set(7, { silent: true }));
  assert.equal(c.validate().ok, false);
  assert.equal(c.value.get(), 7);
  c.destroy();
});

test('configuration normalization error does not discard a pending draft', () => {
  const c = editor();
  type(c, '12');
  c.precision = 101;
  assert.throws(() => c.value.set(4), RangeError);
  assert.equal(c.hasPendingInput(), true);
  assert.equal(c.value.get(), 20);
  c.destroy();
});

test('recursive commitInput is refused without duplicate model writes', () => {
  const c = editor();
  type(c, '12');
  const seen = [];
  c.events.on('beforeChange', () => seen.push(c.commitInput().status));
  assert.equal(c.commitInput().status, 'committed');
  assert.deepEqual(seen, ['superseded']);
  assert.equal(c.value.get(), 12);
  c.destroy();
});

test('recursive commit-mode validation is refused without recursion', () => {
  const c = editor();
  type(c, '12');
  c.setValidators([() => c.validate().ok]);
  assert.equal(c.validate().ok, false);
  c.destroy();
});

test('mutating the beforeChange payload cannot falsify committed change values', () => {
  const c = editor();
  type(c, '12');
  c.events.on('beforeChange', event => { event.newValue = 99; event.oldValue = -1; });
  const values = [];
  c.events.on('change', event => values.push([event.oldValue, event.newValue]));
  assert.equal(c.commitInput().value, 12);
  assert.deepEqual(values, [[20, 12]]);
  c.destroy();
});

test('malformed cancellation options do not discard pending input', () => {
  const c = editor();
  type(c, '12');
  assert.throws(() => c.cancelInput({ origin: 'invalid' }), TypeError);
  assert.equal(c.hasPendingInput(), true);
  assert.equal(c._input.value, '12');
  c.destroy();
});
