import test from 'node:test';
import assert from 'node:assert/strict';
import { SelectInput, RadioGroup } from '../src/ui/inputs.js';
import { testValueTeardown } from './helpers/editor-value-contract.js';

const choices = [{ id: 'a' }, { id: 'b' }];
testValueTeardown({
  name: phase => `SelectInput stops value phases after ${phase} destroys it`,
  create: () => {
    const select = new SelectInput({ value: 'a' });
    select.data.parse(choices);
    return select;
  },
  oldValue: 'a', newValue: 'b',
  assertEvent: event => {
    assert.equal(event.oldItem, choices[0]);
    assert.equal(event.newItem, choices[1]);
  }
});

for (const phase of ['beforeChange', 'change', 'afterChange']) {
  test(`RadioGroup setItems skips notification when reconciliation ${phase} destroys it`, () => {
    const radio = new RadioGroup({ value: 'a', items: ['a', 'b'] });
    let itemsChanges = 0;
    radio.events.on('itemsChange', () => { itemsChanges++; });
    radio.events.on(phase, () => radio.destroy());
    assert.equal(radio.setItems(['c']), radio);
    assert.equal(radio.destroyed, true);
    assert.equal(itemsChanges, 0);
    assert.equal(radio.value.get(), phase === 'beforeChange' ? 'a' : null);
  });
}