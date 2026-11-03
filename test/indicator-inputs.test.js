import test from 'node:test';
import assert from 'node:assert/strict';
import { OptionList, StepProgressBar } from '../src/ui/inputs.js';
import { SelectionModel } from '../src/core/SelectionModel.js';

test('OptionList resolves copied pending IDs during silent loads and reconciles silent replacements', () => {
  const list = new OptionList({ multiple: true });
  const requested = ['a', 'b']; list.value.set(requested); requested.push('c');
  list.data.parse([{ id: 'a' }, { id: 'b' }, { id: 'c' }], { silent: true });
  assert.deepEqual(list.value.get(), ['a', 'b']);
  list.data.update('a', { text: 'changed' }, { silent: true });
  assert.equal(list.selection.get()[0], list.data.get('a'));
  list.data.remove('b', { silent: true }); assert.deepEqual(list.value.get(), ['a']);
  list.destroy();
});

test('StepProgressBar rejects fractional item indices and guards no-op movement after destruction', () => {
  const steps = new StepProgressBar({ items: ['One'] });
  assert.equal(steps.setItemProgress(0.5, 25), false);
  steps.selectAll(); steps.destroy();
  assert.throws(() => steps.selectNext(), /destroyed/i);
  assert.throws(() => steps.selectPrevious(), /destroyed/i);
});

test('SelectionModel stops later phases when a selection listener destroys it', () => {
  for (const phase of ['beforeChange', 'change', 'afterChange']) {
    const selection = new SelectionModel(); const events = [];
    for (const name of ['beforeChange', 'change', 'afterChange']) selection.events.on(name, () => {
      events.push(name); if (phase === name) selection.destroy();
    });
    assert.equal(selection.set(['one']), phase !== 'beforeChange');
    assert.deepEqual(events, ['beforeChange', 'change', 'afterChange'].slice(0, ['beforeChange', 'change', 'afterChange'].indexOf(phase) + 1));
  }
});
