import test from 'node:test';
import assert from 'node:assert/strict';
import { Grid } from '../src/ui/Grid.js';
import { TreeGrid } from '../src/ui/TreeGrid.js';
import { TextInput } from '../src/ui/TextInput.js';

test('A destroyed editor does not continue validators or repopulate validation state', () => {
  let later = 0;
  const input = new TextInput({ validators: [(_value, { control }) => { control.destroy(); return 'Gone'; },
    () => { later++; return 'Later'; }] });
  assert.equal(input.validate().ok, false);
  assert.equal(later, 0);
  assert.equal(input.destroyed, true);
});

for (const Table of [Grid, TreeGrid]) {
  function setup() {
    const grid = new Table({ columns: [{ id: 'name' }] });
    grid.data.parse([{ id: 1, parentId: null, name: 'Old' }]);
    const counts = { destroy: 0, focus: 0, read: 0 };
    const editor = { validate: () => ({ ok: true }), getValue: () => { counts.read++; return 'New'; },
      focus: () => { counts.focus++; }, destroy: () => { counts.destroy++; } };
    grid._editing = { item: grid.data.get(1), id: 1, column: grid.getColumn('name'), oldValue: 'Old',
      origin: 'user', userAction: true, cellEditor: editor, cell: { classList: { remove() {} } } };
    return { grid, editor, counts };
  }

  for (const phase of ['validate', 'getValue', 'beforeCellChange', 'editReject', 'cellChange', 'editCommit', 'editorDestroy']) {
    test(`${Table.name} can be destroyed during commit ${phase}`, () => {
      const { grid, editor, counts } = setup();
      const phases = [];
      for (const type of ['beforeCellChange', 'editReject', 'cellChange', 'editCommit']) {
        grid.events.on(type, () => { phases.push(type); if (type === phase) grid.destroy(); });
      }
      if (phase === 'validate') editor.validate = () => { grid.destroy(); return { ok: true }; };
      if (phase === 'getValue') editor.getValue = () => { grid.destroy(); return 'New'; };
      if (phase === 'editReject') editor.validate = () => ({ ok: false });
      if (phase === 'editorDestroy') editor.destroy = () => { counts.destroy++; grid.destroy(); };
      const applied = ['cellChange', 'editCommit', 'editorDestroy'].includes(phase);
      assert.equal(grid.commitEdit(), applied);
      assert.equal(grid.destroyed, true);
      assert.equal(counts.destroy, 1);
      assert.equal(counts.focus, 0);
      assert.deepEqual(phases, phase === 'beforeCellChange' ? ['beforeCellChange'] :
        phase === 'editReject' ? ['editReject'] : applied ?
          ['beforeCellChange', 'cellChange', ...(phase === 'editCommit' ? ['editCommit'] : [])] : []);
    });
  }

  test(`${Table.name} stops a cancelled session and rejects recursive commit without writing twice`, () => {
    const { grid } = setup();
    let nested;
    const listener = grid.events.on('beforeCellChange', () => {
      nested = grid.commitEdit(); grid.cancelEdit({ silent: true });
    });
    assert.equal(grid.commitEdit(), false);
    assert.equal(nested, false);
    assert.equal(grid.data.get(1).name, 'Old');
    listener.dispose(); grid.destroy();
  });

  test(`${Table.name} releases the commit guard after validation throws`, () => {
    const { grid, editor } = setup();
    editor.validate = () => { throw new Error('validator failed'); };
    assert.throws(() => grid.commitEdit(), /validator failed/);
    editor.validate = () => ({ ok: true });
    assert.equal(grid.commitEdit(), true);
    assert.equal(grid.data.get(1).name, 'New');
    grid.destroy();
  });

  test(`${Table.name} commit and rejection use attempt metadata with a complete cell identity`, () => {
    const { grid, editor } = setup();
    const events = [];
    for (const type of ['editReject', 'beforeCellChange', 'cellChange', 'editCommit']) {
      grid.events.on(type, event => events.push([type, event.origin, event.userAction, event.columnId]));
    }
    editor.validate = () => ({ ok: false, errors: ['required'] });
    assert.equal(grid.commitEdit({ origin: 'system', userAction: false }), false);
    editor.validate = () => ({ ok: true });
    assert.equal(grid.commitEdit(), true);
    assert.deepEqual(events, [ ['editReject', 'system', false, 'name'],
      ...['beforeCellChange', 'cellChange', 'editCommit'].map(type => [type, 'api', false, 'name']) ]);
    grid.destroy();
  });

  test(`${Table.name} silent commit validates but suppresses semantic table/store events`, () => {
    const { grid, editor } = setup();
    let validations = 0, semantic = 0;
    editor.validate = () => ({ ok: ++validations > 1 });
    for (const type of ['beforeCellChange', 'cellChange', 'editCommit', 'editReject', 'dataChange']) {
      grid.events.on(type, () => semantic++);
    }
    grid.data.events.on('change', () => semantic++);
    assert.equal(grid.commitEdit({ silent: true }), false);
    assert.equal(grid.data.get(1).name, 'Old');
    assert.equal(grid.commitEdit({ silent: true }), true);
    assert.equal(grid.data.get(1).name, 'New');
    assert.equal(semantic, 0);
    assert.equal(validations, 2);
    grid.destroy();
  });

  test(`${Table.name} a custom write may close the table after applying its value`, () => {
    const { grid, counts } = setup();
    let written;
    grid.getColumn('name').set = (_item, value) => { written = value; grid.destroy(); };
    assert.equal(grid.commitEdit(), true);
    assert.equal(written, 'New');
    assert.equal(counts.destroy, 1);
  });

  test(`${Table.name} asynchronous setters reject and leave the editor available`, () => {
    const { grid, counts } = setup();
    grid.getColumn('name').set = () => Promise.resolve(true);
    assert.throws(() => grid.commitEdit(), /synchronous/);
    assert.equal(counts.destroy, 0);
    grid.getColumn('name').set = () => false;
    assert.equal(grid.commitEdit(), false);
    assert.equal(counts.focus, 1);
    grid.destroy();
  });
}
