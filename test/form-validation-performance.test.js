import test from 'node:test';
import assert from 'node:assert/strict';
import { Form } from '../src/ui/Form.js';
import { Panel } from '../src/ui/Panel.js';
import { BaseControl } from '../src/core/BaseControl.js';
import { TextInput } from '../src/ui/TextInput.js';
import { validationRevision } from '../src/core/validationRevision.js';

for (const count of [1, 16, 80]) {
  test(`Form guards each reader phase once while preserving full traversal for ${count} fields`, t => {
    const nested = new Form({ name: 'nested' });
    const form = new Form().row(nested);
    t.after(() => form.destroy());
    let validations = 0, publicReads = 0, traversals = 0, guardWrites = 0;
    for (let i = 0; i < count; ++i) {
      const field = new TextInput({ name: `field${i}`, validators: [() => { ++validations; return true; }] });
      field.getValidationRevision = () => { ++publicReads; return 0; };
      nested.row(field);
    }
    for (const owner of [form, nested]) {
      const rows = owner._rows;
      let reading;
      Object.defineProperty(rows, Symbol.iterator, { configurable: true, value: function* () { ++traversals; yield* Array.prototype.values.call(this); } });
      Object.defineProperty(owner, '_readingValidationRevision', {
        configurable: true,
        get() { return reading; },
        set(value) { ++guardWrites; reading = value; }
      });
    }
    try {
      assert.equal(form.validate().ok, true);
      assert.equal(validations, count, 'every field still validates once');
      assert.equal(traversals, 4 * (count + 4), 'both complete currentness traversals remain at every boundary');
      assert.equal(guardWrites, 4 * (count + 4), 'one enter/leave per Form per reader phase, not per field');
      assert.equal(publicReads, 2 * count * (count + 4), 'strict repeated hook checks remain at every boundary');
    } finally {
      for (const owner of [form, nested]) {
        const rows = owner._rows;
        delete rows[Symbol.iterator];
      }
    }
  });
}

test('an untracked nonvalue leaf remains valid', t => {
  const form = new Form().row(new BaseControl({ name: 'decoration' }));
  t.after(() => form.destroy());
  assert.equal(form.validate().ok, true);
});

for (const replace of [false, true]) {
  test(`untracked structural container ${replace ? 'replacement' : 'no-change'} retains full traversal checks`, t => {
    let later = 0;
    const first = new TextInput({ name: 'first' });
    const second = new TextInput({ name: 'second', validators: [() => { ++later; return true; }] });
    const replacement = new TextInput({ name: 'second' });
    const container = new BaseControl({ name: 'structural' });
    container.items = [first, second];
    const form = new Form().row(container);
    t.after(() => { form.destroy(); first.destroy(); second.destroy(); replacement.destroy(); });
    first.events.on('validate', () => { if (replace) container.items = [first, replacement]; });
    assert.equal(form.validate().ok, !replace);
    assert.equal(later, replace ? 0 : 1);
  });
}

test('a tracked container becoming a value field refuses before later validators', t => {
  let later = 0;
  const first = new TextInput({ name: 'first' });
  const panel = new Panel({ name: 'panel' });
  const second = new TextInput({ name: 'second', validators: [() => { ++later; return true; }] });
  panel.addControl(second);
  const form = new Form().row(first, panel);
  t.after(() => form.destroy());
  first.events.on('validate', () => { panel.value = { get: () => 'replacement', set() {}, clear() {} }; });
  assert.equal(form.validate().ok, false);
  assert.equal(later, 0);
});

for (const change of ['add', 'remove', 'replace']) {
  test(`late public hook ${change} refuses before later validators`, t => {
    let later = 0;
    const first = new TextInput({ name: 'first' });
    const second = new TextInput({ name: 'second', validators: [() => { ++later; return true; }] });
    if (change !== 'add') second.getValidationRevision = () => 0;
    const form = new Form().row(first, second);
    t.after(() => form.destroy());
    first.events.on('validate', () => {
      if (change === 'remove') delete second.getValidationRevision;
      else second.getValidationRevision = () => 0;
    });
    const result = form.validate();
    assert.equal(result.ok, false);
    assert.deepEqual(result.errors, []);
    assert.equal(later, 0);
  });
}

test('second metadata pass observes a value-facade accessor write before checking earlier stamps', t => {
  let later = 0, trigger = false, armed = false;
  const first = new TextInput({ name: 'first', value: 'initial' });
  const second = new TextInput({ name: 'second', validators: [() => { ++later; return true; }] });
  const api = second.value;
  Object.defineProperty(second, 'value', { get() {
    if (armed) {
      armed = false;
      trigger = false;
      first.value.set('changed', { silent: true });
      first.value.set('initial', { silent: true });
    }
    return api;
  } });
  second.getValidationRevision = () => { if (trigger) armed = true; return 0; };
  const form = new Form().row(first, second);
  t.after(() => form.destroy());
  first.events.on('validate', () => { trigger = true; });
  const result = form.validate();
  assert.equal(result.ok, false);
  assert.deepEqual(result.errors, []);
  assert.equal(later, 0);
  assert.equal(first.value.get(), 'initial');
});

for (const reader of ['internal', 'public']) for (const target of ['field', 'form']) {
  test(`late ${reader} accessor ${target} teardown does not invoke its returned reader`, t => {
    let later = 0, returnedReads = 0;
    const first = new TextInput({ name: 'first' });
    const second = new TextInput({ name: 'second', validators: [() => { ++later; return true; }] });
    const form = new Form().row(first, second);
    t.after(() => { if (!form.destroyed) form.destroy(); });
    first.events.on('validate', () => {
      Object.defineProperty(second, reader === 'internal' ? validationRevision : 'getValidationRevision', {
        get() {
          if (target === 'form') form.destroy(); else second.destroy();
          return () => { ++returnedReads; return 0; };
        }
      });
    });
    const result = form.validate();
    assert.equal(result.ok, false);
    assert.deepEqual(result.errors, []);
    assert.equal(later, 0);
    assert.equal(returnedReads, 0);
    assert.equal(form._validating, false);
    assert.ok(!form._readingValidationRevision);
  });
}
for (const mutation of ['accessorReverse', 'accessorAppend', 'replaceItems', 'pushItem', 'replaceItem', 'inheritedItems', 'inheritedRows']) {
  test(`late Panel topology ${mutation} cannot validate an unchecked topology`, t => {
    let later = 0;
    const first = new TextInput({ name: 'first' });
    const second = new TextInput({ name: 'second', validators: [() => { ++later; return true; }] });
    const extra = new TextInput({ name: 'extra', value: 'unvalidated', validators: [() => false] });
    class CustomPanel extends Panel {}
    const panel = new CustomPanel();
    panel.addControl(first); panel.addControl(second);
    const form = new Form().row(panel);
    t.after(() => {
      delete CustomPanel.prototype.items;
      delete CustomPanel.prototype._rows;
      Object.defineProperty(panel, 'items', { configurable: true, writable: true, value: [first, second] });
      form.destroy(); extra.destroy();
    });
    first.events.on('validate', () => {
      const previous = panel.items;
      if (mutation === 'pushItem') panel.items.push(extra);
      else if (mutation === 'replaceItem') panel.items[1] = extra;
      else if (mutation === 'replaceItems') panel.items = [...previous, extra];
      else if (mutation === 'inheritedRows') {
        Object.defineProperty(CustomPanel.prototype, '_rows', { configurable: true, get: () => [{ controls: [extra] }] });
      } else {
        const target = mutation === 'inheritedItems' ? CustomPanel.prototype : panel;
        if (mutation === 'inheritedItems') delete panel.items;
        Object.defineProperty(target, 'items', { configurable: true,
          get: () => mutation === 'accessorReverse' ? [...previous].reverse() : [...previous, extra] });
      }
    });
    assert.equal(form.validate().ok, false);
    assert.equal(later, 0);
  });
}

test('second metadata classification observes a value-facade accessor rename before later validators', t => {
  let later = 0, trigger = false, armed = false;
  const first = new TextInput({ name: 'first' });
  const second = new TextInput({ name: 'second', validators: [() => { ++later; return true; }] });
  const api = second.value;
  Object.defineProperty(second, 'value', { get() {
    if (armed) { armed = false; trigger = false; second.name = 'renamed'; }
    return api;
  } });
  second.getValidationRevision = () => { if (trigger) armed = true; return 0; };
  const form = new Form().row(first, second);
  t.after(() => form.destroy());
  first.events.on('validate', () => { trigger = true; });
  assert.equal(form.validate().ok, false);
  assert.equal(later, 0);
});
for (const target of ['field', 'form']) {
  test(`second metadata accessor ${target} teardown stops before earlier internal reader lookup`, t => {
    let lateReads = 0, later = 0, trigger = false, armed = false;
    const first = new TextInput({ name: 'first' });
    const second = new TextInput({ name: 'second', validators: [() => { ++later; return true; }] });
    const form = new Form().row(first, second);
    t.after(() => { if (!form.destroyed) form.destroy(); });
    const original = first[validationRevision];
    Object.defineProperty(first, validationRevision, { get() {
      if (first.destroyed || form.destroyed) ++lateReads;
      return original;
    } });
    const api = second.value;
    Object.defineProperty(second, 'value', { get() {
      if (armed) {
        armed = false; trigger = false;
        if (target === 'form') form.destroy(); else first.destroy();
      }
      return api;
    } });
    second.getValidationRevision = () => { if (trigger) armed = true; return 0; };
    first.events.on('validate', () => { trigger = true; });
    assert.equal(form.validate().ok, false);
    assert.equal(later, 0);
    assert.equal(lateReads, 0);
  });
}
for (const count of [1, 16, 80]) {
  test(`snapshot traversal avoids redundant per-container deduplication Sets for ${count} fields`, t => {
    const nested = new Form({ name: 'nested' });
    const form = new Form().row(nested);
    for (let i = 0; i < count; ++i) nested.row(new TextInput({ name: `field${i}` }));
    t.after(() => form.destroy());
    const OriginalSet = globalThis.Set;
    let iterableSets = 0;
    globalThis.Set = class extends OriginalSet {
      constructor(...args) { super(...args); if (args.length) ++iterableSets; }
    };
    try {
      assert.equal(form.validate().ok, true);
      assert.equal(iterableSets, 2, 'only final getValue uses one local dedup Set per Form, independent of field count');
    } finally {
      globalThis.Set = OriginalSet;
    }
  });
}
test('stable internal array stamps preserve their iterator copy semantics', t => {
  const field = new TextInput({ name: 'first' });
  const stamp = [0];
  stamp[Symbol.iterator] = function* () { yield 7; };
  field[validationRevision] = () => stamp;
  const form = new Form().row(field);
  t.after(() => form.destroy());
  assert.equal(form.validate().ok, true);
  assert.equal(form.submit(), true);
});

test('duplicate rows and items keep first occurrence and perform no duplicate field reads', t => {
  const order = [], reads = { first: 0, second: 0 };
  const first = new TextInput({ name: 'first', validators: [() => { order.push('first'); return true; }] });
  const second = new TextInput({ name: 'second', validators: [() => { order.push('second'); return true; }] });
  const form = new Form().row(first, second);
  t.after(() => form.destroy());
  form._rows.push({ controls: [first, second, first] });
  form.items.push(first, second);
  for (const field of [first, second]) {
    const api = field.value;
    Object.defineProperty(field, 'value', { get() { ++reads[field.name]; return api; } });
  }
  assert.equal(form.validate().ok, true);
  assert.deepEqual(order, ['first', 'second']);
  // Eleven snapshot traversals read each facade five times. Final getValue reads
  // the facade four times for field classification and once for its value.
  assert.deepEqual(reads, { first: 60, second: 60 });
});