import test from 'node:test';
import assert from 'node:assert/strict';
import { EditorControl, TextInput } from '../src/ui/inputs.js';

for (const Control of [EditorControl, TextInput]) {
  for (const phase of ['beforeChange', 'change', 'afterChange']) {
    test(`${Control.name} stops value mutation phases when ${phase} destroys it`, () => {
      const control = new Control({ value: 'Old' });
      const seen = [];
      for (const type of ['beforeChange', 'change', 'afterChange', 'dirtyChange']) control.events.on(type, () => {
        seen.push(type); if (type === phase) control.destroy();
      });
      assert.equal(control.value.set('New'), phase !== 'beforeChange');
      assert.equal(control.value.get(), phase === 'beforeChange' ? 'Old' : 'New');
      assert.equal(control.destroyed, true);
      assert.deepEqual(seen, ['beforeChange', 'change', 'afterChange'].slice(0, ['beforeChange', 'change', 'afterChange'].indexOf(phase) + 1));
      assert.equal(control.getErrors().length, 0);
    });
  }
}
