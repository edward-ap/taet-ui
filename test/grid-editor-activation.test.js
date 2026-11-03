import test from 'node:test';
import assert from 'node:assert/strict';
import { ControlCellEditor, createGridEditorFactory } from '../src/ui/GridEditors.js';
import { Grid } from '../src/ui/Grid.js';
import { TreeGrid } from '../src/ui/TreeGrid.js';

function control(overrides = {}) {
  return { mount() {}, focus() {}, destroy() {}, value: { get: () => '', set() {} }, ...overrides };
}

test('ControlCellEditor does not resume mount after its control destroys the adapter', () => {
  let destroyed = 0, editor;
  const valueControl = control({ mount: () => editor.destroy(), destroy: () => destroyed++ });
  editor = new ControlCellEditor(valueControl, {});
  assert.equal(editor.mount({}), editor); // No DOM globals: post-mount listeners must not be installed.
  assert.equal(editor.destroyed, true);
  assert.equal(editor.context, null);
  assert.equal(destroyed, 1);
});

test('ControlCellEditor destroys a failed partial mount and tolerates recursive disposal', () => {
  let destroyed = 0, editor;
  editor = new ControlCellEditor(control({ mount: () => { throw new Error('partial mount'); },
    destroy: () => { destroyed++; editor.destroy(); } }), {});
  assert.throws(() => editor.mount({}), /partial mount/);
  editor.destroy();
  assert.equal(destroyed, 1);
  assert.equal(editor.destroyed, true);
  assert.equal(editor.context, null);
});

test('Invalid factory results are released before their contract error propagates', () => {
  for (const result of [{}, { mount() {}, getValue() {}, focus() {} }]) {
    let destroyed = 0;
    result.destroy = () => destroyed++;
    assert.throws(() => createGridEditorFactory(() => result).createCellEditor({}), /ValueControl|validate/);
    assert.equal(destroyed, 1);
  }
});

for (const Table of [Grid, TreeGrid]) {
  test(`${Table.name} rejects activation while unmounted and after teardown without invoking a factory`, () => {
    let called = 0;
    const grid = new Table({ columns: [{ id: 'name', editor: () => { called++; throw new Error('unexpected'); } }] });
    grid.data.parse([{ id: 1, name: 'A' }]);
    assert.equal(grid.startEdit(1, 'name'), false);
    grid.destroy();
    assert.equal(grid.startEdit(1, 'name'), false);
    assert.equal(called, 0);
  });

  test(`${Table.name} detaches a raw editor before its destroy callback closes the table again`, () => {
    const grid = new Table(); let destroyed = 0;
    grid._editing = { cellEditor: { destroy() { destroyed++; grid.destroy(); } } };
    grid.destroy();
    assert.equal(grid.destroyed, true);
    assert.equal(destroyed, 1);
  });
}
