import test from 'node:test';
import assert from 'node:assert/strict';
import { Grid } from '../src/ui/Grid.js';
import { TreeGrid } from '../src/ui/TreeGrid.js';

for (const Table of [Grid, TreeGrid]) {
  test(`${Table.name} editing commit reports common flags and retains TreeGrid legacy cancel`, () => {
    const grid = new Table({ columns:[{ id:'name' }] });
    grid.data.parse([{ id:1, name:'Old' }]);
    const events = [];
    grid.events.on('editCommit', event => events.push(event));
    for (const value of ['Old', 'New']) {
      grid._editing = { id:1, item:grid.data.get(1), column:grid.getColumn('name'), oldValue:grid.data.get(1).name,
        cellEditor:{ validate:() => ({ ok:true }), getValue:() => value, destroy() {}, focus() {} } };
      assert.equal(grid.commitEdit(), true);
    }
    assert.deepEqual(events.map(event => [event.changed, event.writeResult]), [[false, false], [true, true]]);
    if (Table === TreeGrid) assert.deepEqual(events.map(event => event.cancel), [false, false]);
    grid.destroy();
  });

  test(`${Table.name} ignored keyboard events do not call editing actions`, () => {
    const grid = new Table();
    let calls = 0;
    grid.commitEdit = grid.cancelEdit = grid.startEdit = () => { calls++; return true; };
    grid._editing = { cellEditor:{ destroy() {} } };
    for (const key of ['Escape', 'Enter', 'Tab']) {
      for (const state of [{ isComposing:true }, { keyCode:229 }, { defaultPrevented:true }]) {
        grid._handleEditorKeyDown({ key, ...state, preventDefault() { throw new Error('consumed ignored event'); }, stopPropagation() {} });
      }
    }
    grid._editing = null;
    for (const state of [{ isComposing:true }, { keyCode:229 }, { defaultPrevented:true }]) {
      grid._handleKeyDown({ key:'F2', ...state });
    }
    assert.equal(calls, 0);
    grid.destroy();
  });
}
