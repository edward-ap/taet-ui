import test from 'node:test';
import assert from 'node:assert/strict';
import { CodeBlock } from '../src/ui/CodeBlock.js';
import { Form } from '../src/ui/Form.js';
import { TextInput } from '../src/ui/TextInput.js';
import { required } from '../src/core/validators.js';
import { CharacterRangeSelectionModel } from '../src/core/CharacterRangeSelectionModel.js';
import { Panel } from '../src/ui/Panel.js';

test('CodeBlock reports the text actually copied and honors silent after async completion', async () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  const writes = [], pending = [];
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { clipboard: {
    writeText(value) { writes.push(value); return new Promise(resolve => pending.push(resolve)); }
  } } });
  const block = new CodeBlock({ code: 'first' }); const events = [];
  block.events.on('copy', event => events.push(event.value));
  try {
    const copied = block.copy(); block.setCode('second'); pending.shift()();
    assert.equal(await copied, true); assert.deepEqual(events, ['first']);
    const silent = block.copy({ silent: true }); pending.shift()();
    assert.equal(await silent, true); assert.deepEqual(events, ['first']);
    assert.deepEqual(writes, ['first', 'second']);
    const destroyed = block.copy(); block.destroy(); pending.shift()();
    assert.equal(await destroyed, false); assert.deepEqual(events, ['first']);
  } finally {
    block.destroy();
    if (descriptor) Object.defineProperty(globalThis, 'navigator', descriptor); else delete globalThis.navigator;
  }
});

test('CodeBlock settles failed clipboard requests after destroy without an event', async () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  let reject;
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { clipboard: {
    writeText() { return new Promise((_, fail) => { reject = fail; }); }
  } } });
  const block = new CodeBlock();
  try {
    const copying = block.copy(); block.destroy(); reject(new Error('Denied'));
    assert.equal(await copying, false);
  } finally {
    block.destroy();
    if (descriptor) Object.defineProperty(globalThis, 'navigator', descriptor); else delete globalThis.navigator;
  }
});

test('Form clearValidation propagates silent and origin to fields', () => {
  const field = new TextInput({ name: 'name', validators: [required()] });
  const form = new Form().row(field); const events = [];
  field.events.on('validationClear', event => events.push(event.origin));
  assert.equal(form.validate().ok, false);
  form.clearValidation({ silent: true }); assert.deepEqual(field.getErrors(), []); assert.deepEqual(events, []);
  form.validate(); form.clearValidation({ origin: 'restore' }); assert.deepEqual(events, ['restore']);
  form.destroy();
});

test('CharacterRangeSelectionModel stops event phases when a listener destroys it', () => {
  for (const operation of ['set', 'clear']) for (const phase of ['beforeChange', 'change']) {
    const range = new CharacterRangeSelectionModel({ range: { start: 1, end: 3 } });
    let after = 0; range.events.on(phase, () => range.destroy()); range.events.on('afterChange', () => after++);
    const accepted = operation === 'set' ? range.set({ start: 2, end: 5 }) : range.clear();
    assert.equal(accepted, phase !== 'beforeChange'); assert.equal(range.destroyed, true); assert.equal(after, 0);
  }
});

test('Panel attach and remove stop when before listeners destroy the owner', () => {
  const parent = new Panel(), child = new Panel();
  parent.events.on('beforeChildAdd', () => parent.destroy());
  assert.equal(parent.attach(child), null); assert.equal(child.destroyed, false); child.destroy();
  const owner = new Panel(), owned = new Panel(); owner.addControl(owned);
  owner.events.on('beforeChildRemove', () => owner.destroy());
  assert.equal(owner.remove(owned), null); assert.equal(owned.destroyed, true);
});
