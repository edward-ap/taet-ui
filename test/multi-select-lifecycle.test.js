import test from 'node:test';
import assert from 'node:assert/strict';
import { MultiSelectDropDown } from '../src/ui/inputs.js';

for (const phase of ['beforeChange', 'change', 'afterChange']) test(`MultiSelect stops value phases after ${phase} teardown`, () => {
  const control = new MultiSelectDropDown({ value: ['a'] });
  control.data.parse([{ id: 'a' }, { id: 'b' }]);
  const seen = [];
  for (const name of ['beforeChange', 'change', 'afterChange', 'dirtyChange']) control.events.on(name, () => {
    seen.push(name); if (name === phase) control.destroy();
  });
  assert.equal(control.value.set(['b']), phase !== 'beforeChange');
  assert.deepEqual(control.value.get(), phase === 'beforeChange' ? ['a'] : ['b']);
  assert.deepEqual(seen, ['beforeChange', 'change', 'afterChange'].slice(0, ['beforeChange', 'change', 'afterChange'].indexOf(phase) + 1));
});
test('MultiSelect add/remove reject use after teardown even when the write would be a no-op', () => {
  const control = new MultiSelectDropDown({ value: ['a'] }); control.destroy();
  assert.throws(() => control.addValue('a'), /destroyed/);
  assert.throws(() => control.removeValue('missing'), /destroyed/);
});
