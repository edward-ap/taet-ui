import test from 'node:test';
import assert from 'node:assert/strict';
import { NumberInput } from '../src/ui/NumberInput.js';

// Public numeric behavior only; native intermediate input text is browser coverage.
for (const { name, options, delta } of [
  { name: 'default step', options: {}, delta: 1 },
  { name: 'step any default increment', options: { step: 'any' }, delta: 1 },
  { name: 'step any fractional increment', options: { step: 'any', increment: 0.5 }, delta: 0.5 },
  { name: 'fractional step overrides increment', options: { step: 0.25, increment: 2 }, delta: 0.25 },
  { name: 'increment without step', options: { increment: 0.5 }, delta: 0.5 }
]) {
  test(`NumberInput ${name} spins, clears and resets its numeric model`, t => {
    const input = new NumberInput({ value: 4, ...options });
    t.after(() => input.destroy());
    const changes = [];
    input.events.on('change', event => {
      assert.equal(event.source, input);
      assert.equal(event.origin, 'api');
      assert.equal(event.userAction, false);
      changes.push([event.oldValue, event.newValue]);
    });
    assert.equal(input.isDirty(), false);
    assert.equal(input.spinUp(), true);
    assert.equal(input.value.get(), 4 + delta);
    assert.equal(input.isDirty(), true);
    assert.equal(input.spinDown(), true);
    assert.equal(input.value.get(), 4);
    assert.equal(input.isDirty(), false);
    assert.equal(input.value.clear(), true);
    assert.equal(input.value.get(), null);
    assert.equal(input.getDisplayValue(), '');
    assert.equal(input.getRawValue(), '');
    assert.equal(input.value.clear(), false);
    assert.equal(input.value.reset(), true);
    assert.equal(input.value.get(), 4);
    assert.equal(input.isDirty(), false);
    assert.equal(input.value.reset(), false);
    assert.deepEqual(changes, [[4, 4 + delta], [4 + delta, 4], [4, null], [null, 4]]);
  });
}

for (const { name, options, initial, write, normalized, baseline } of [
  { name: 'fractional values without rounding', options: {}, initial: 1.25, baseline: 1.25, write: 2.75, normalized: 2.75 },
  { name: 'integer truncation toward zero', options: { isInteger: true }, initial: 3.9, baseline: 3, write: -2.9, normalized: -2 },
  { name: 'precision rounding', options: { precision: 2 }, initial: 1.234, baseline: 1.23, write: 2.346, normalized: 2.35 },
  { name: 'range clamping', options: { min: 2, max: 5 }, initial: 1, baseline: 2, write: 8, normalized: 5 },
  { name: 'disabled clamping', options: { min: 2, max: 5, clamp: false }, initial: 1, baseline: 1, write: 8, normalized: 8 },
  { name: 'truncation before clamp before rounding', options: { isInteger: true, min: 1.26, precision: 1 }, initial: 3.9, baseline: 3, write: 1.99, normalized: 1.3 }
]) {
  test(`NumberInput ${name} preserves normalized baselines across a write sequence`, t => {
    const input = new NumberInput({ value: initial, ...options });
    t.after(() => input.destroy());
    assert.equal(input.value.get(), baseline);
    assert.equal(input.isDirty(), false);
    const seen = [];
    for (const type of ['beforeChange', 'change', 'afterChange', 'dirtyChange']) {
      input.events.on(type, () => seen.push(type));
    }
    input.setValidators([value => value === null ? 'Required' : 'Existing error']);
    assert.equal(input.validate().value, baseline);
    assert.equal(input.getErrors().length, 1);
    assert.equal(input.value.set(write, { silent: true, origin: 'import' }), true);
    assert.equal(input.value.get(), normalized);
    assert.equal(input.getDisplayValue(), String(normalized));
    assert.equal(input.isDirty(), true);
    assert.deepEqual(input.getErrors(), []);
    assert.deepEqual(seen, []);
    assert.equal(input.value.reset(), true);
    assert.equal(input.value.get(), baseline);
    assert.equal(input.isDirty(), false);
    assert.equal(input.value.set(write), true);
    assert.equal(input.setCleanValue(), input);
    assert.equal(input.isDirty(), false);
    assert.equal(input.value.clear(), true);
    assert.equal(input.value.get(), null, 'clear must not clamp empty to min');
    assert.equal(input.value.reset(), true);
    assert.equal(input.value.get(), normalized);
    assert.equal(input.isDirty(), false);
  });
}

for (const [name, options, up, down] of [
  ['unbounded default', {}, 1, -1],
  ['unbounded fractional any', { step: 'any', increment: 0.5 }, 0.5, -0.5],
  ['bounded fractional', { min: 2, max: 5, step: 0.5 }, 2, 5]
]) {
  test(`NumberInput empty ${name} spins from the documented starting point`, t => {
    const input = new NumberInput(options);
    t.after(() => input.destroy());
    assert.equal(input.value.get(), null);
    assert.equal(input.spin(100), true);
    assert.equal(input.value.get(), up);
    input.value.clear();
    assert.equal(input.spin(-100), true);
    assert.equal(input.value.get(), down);
  });
}

for (const state of ['disabled', 'readonly']) {
  test(`NumberInput ${state} rejects spin but permits API hydration and later recovers`, t => {
    const input = new NumberInput({ value: 4, step: 'any', increment: 0.5 });
    t.after(() => input.destroy());
    if (state === 'disabled') input.disable();
    else input.setReadOnly(true);
    assert.equal(input.spinUp(), false);
    assert.equal(input.spinDown(), false);
    assert.equal(input.value.get(), 4);
    assert.equal(input.value.set(2.5), true);
    if (state === 'disabled') input.enable();
    else input.setReadOnly(false);
    assert.equal(input.spinUp(), true);
    assert.equal(input.value.get(), 3);
  });
}