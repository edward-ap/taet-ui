import test from 'node:test';
import assert from 'node:assert/strict';
import { DataStore } from '../src/core/DataStore.js';
import { DataView } from '../src/core/DataView.js';
import { TreeDataView } from '../src/core/TreeDataView.js';
import { Grid } from '../src/ui/Grid.js';
import { TreeGrid } from '../src/ui/TreeGrid.js';

for (const Table of [Grid, TreeGrid]) {
  function setup(sort = null) {
    const data = new DataStore();
    data.parse([{ id: 1, parentId: null, name: 'A' }, { id: 2, parentId: null, name: 'B' }]);
    const view = Table === Grid ? new DataView({ data, sort }) : new TreeDataView({ data, sort });
    const grid = new Table({ columns: [{ id: 'name', sortable: true }], [Table === Grid ? 'view' : 'treeView']: view });
    return { data, view, grid, close: () => { grid.destroy(); view.destroy(); data.destroy(); } };
  }
  const state = grid => Table === Grid ? grid.getSortModel() : grid.getSortState();

  test(`${Table.name} clears column state before external sort projection events, including unchanged order`, () => {
    const { view, grid, close } = setup();
    grid.sortBy('name', 'asc');
    const events = [];
    grid.events.on('sortChange', () => events.push('sort'));
    view.events.on('invalidate', () => { assert.deepEqual(state(grid), []); events.push('projection'); });
    assert.equal(view.setSort((a, b) => a.name.localeCompare(b.name), { silent: true }), false);
    assert.deepEqual(state(grid), []);
    assert.deepEqual(events, []);
    view.setSort((a, b) => b.name.localeCompare(a.name), { origin: 'import' });
    assert.deepEqual(view.all().map(item => item.id), [2, 1]);
    assert.deepEqual(events, ['projection']);
    close();
  });

  test(`${Table.name} retains its indicator for the same comparator and resets it for external clear`, () => {
    const { view, grid, close } = setup();
    grid.sortBy('name', 'asc');
    view.setSort(view.getSort(), { silent: true });
    assert.deepEqual(state(grid), [{ columnId: 'name', direction: 'asc' }]);
    view.setSort(null, { silent: true });
    assert.deepEqual(state(grid), []);
    grid.sortBy('name');
    assert.deepEqual(state(grid), [{ columnId: 'name', direction: 'asc' }]);
    close();
  });

  test(`${Table.name} restores the comparator it replaced and preserves newer external sorting`, () => {
    const initial = (a, b) => b.name.localeCompare(a.name);
    const { view, grid, close } = setup(initial);
    grid.sortBy('name', 'asc');
    grid.destroy();
    assert.equal(view.getSort(), initial);
    assert.deepEqual(view.all().map(item => item.id), [2, 1]);
    const next = new Table({ columns: [{ id: 'name', sortable: true }], [Table === Grid ? 'view' : 'treeView']: view });
    next.sortBy('name', 'desc');
    const external = () => 0;
    view.setSort(external);
    next.destroy();
    assert.equal(view.getSort(), external);
    close();
  });
}
