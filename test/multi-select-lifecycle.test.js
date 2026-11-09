import test from 'node:test';
import assert from 'node:assert/strict';
import { MultiSelectDropDown } from '../src/ui/inputs.js';
import { testValueTeardown } from './helpers/editor-value-contract.js';

const choices = [{ id: 'a' }, { id: 'b' }];
testValueTeardown({
  name: phase => `MultiSelect stops value phases after ${phase} teardown`,
  create: () => {
    const control = new MultiSelectDropDown({ value: ['a'] });
    control.data.parse(choices);
    return control;
  },
  oldValue: ['a'], newValue: ['b'],
  assertEvent: event => {
    assert.deepEqual(event.oldItems, [choices[0]]);
    assert.deepEqual(event.newItems, [choices[1]]);
    assert.equal(event.oldItems[0], choices[0]);
    assert.equal(event.newItems[0], choices[1]);
  }
});

test('MultiSelect add/remove reject use after teardown even when the write would be a no-op', () => {
  const control = new MultiSelectDropDown({ value: ['a'] }); control.destroy();
  assert.throws(() => control.addValue('a'), /destroyed/);
  assert.throws(() => control.removeValue('missing'), /destroyed/);
});