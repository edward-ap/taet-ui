import test from 'node:test';
import assert from 'node:assert/strict';
import { SelectInput, RadioGroup } from '../src/ui/inputs.js';

for (const phase of ['beforeChange', 'change', 'afterChange']) {
  test(`SelectInput stops value phases after ${phase} destroys it`, () => {
    const select = new SelectInput({ value: 'a' });
    select.data.parse([{ id: 'a' }, { id: 'b' }]);
    const seen = [];
    for (const type of ['beforeChange', 'change', 'afterChange', 'dirtyChange']) select.events.on(type, event => {
      seen.push(type);
      assert.ok(event.source === select);
      if (type === phase) select.destroy();
    });
    assert.equal(select.value.set('b'), phase !== 'beforeChange');
    assert.equal(select.value.get(), phase === 'beforeChange' ? 'a' : 'b');
    assert.equal(select.destroyed, true);
    assert.deepEqual(seen, ['beforeChange', 'change', 'afterChange'].slice(0, ['beforeChange', 'change', 'afterChange'].indexOf(phase) + 1));
  });
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
