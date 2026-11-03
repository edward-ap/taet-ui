import test from 'node:test';
import assert from 'node:assert/strict';
import { DataStore } from '../src/core/DataStore.js';
import { DataView } from '../src/core/DataView.js';
import { TreeDataView } from '../src/core/TreeDataView.js';
import { Grid } from '../src/ui/Grid.js';
import { TreeGrid } from '../src/ui/TreeGrid.js';

const rows = [
  { id: 1, parentId: null, name: 'Alpha', amount: 10 },
  { id: 2, parentId: null, name: 'Beta', amount: 20 },
  { id: 3, parentId: null, name: 'Gamma', amount: 30 },
  { id: 4, parentId: null, name: 'Beta', amount: 40 }
];
const columns = [{ id: 'name', width: 160 }, { id: 'amount', width: 100 }];
const silent = { silent: true, origin: 'restore' };
const ids = view => view.all().map(row => row.id);

for (const Table of [Grid, TreeGrid]) {
  test(`${Table.name} shares global filters with its view and detaches local conditions`, () => {
    const data = new DataStore(); data.parse(rows);
    const initial = row => row.amount <= 30;
    const view = Table === Grid ? new DataView({ data, filter: initial }) : new TreeDataView({ data, filter: initial });
    const table = new Table({ columns, [Table === Grid ? 'view' : 'treeView']: view });
    const events = [];
    for (const type of ['viewChange', 'treeViewChange', 'filterChange', 'searchChange']) table.events.on(type, () => events.push(type));
    assert.equal(table.getFilter(), initial);
    assert.equal(view.getFilter(), initial);
    table.setColumnFilter('amount', Table === Grid
      ? { kind: 'number', operator: 'greaterOrEqual', value: 20 } : value => value >= 20, silent);
    if (Table === Grid) table.search.restoreState({ query: 'Beta', mode: 'filter', columns: ['name'] }, silent);
    else table.setSearchQuery('Beta', silent);
    assert.deepEqual(ids(view), [2]);
    const external = row => row.amount >= 30;
    view.setFilter(external, silent);
    assert.equal(table.getFilter(), external);
    assert.equal(view.getFilter(), external);
    assert.deepEqual(ids(view), [4]);
    table.clearFilter(silent);
    assert.equal(view.getFilter(), null);
    assert.deepEqual(ids(view), [2, 4]);
    table.setFilter(initial, silent);
    view.setFilter(null, silent);
    assert.equal(table.getFilter(), null);
    assert.deepEqual(ids(view), [2, 4]);
    table.clearAllFilters(silent);
    assert.deepEqual(ids(view), Table === Grid ? [2, 4] : [1, 2, 3, 4]);
    assert.deepEqual(events, []);
    view.setFilter(initial, silent);
    table.destroy();
    assert.equal(view.destroyed, false);
    assert.equal(view.getFilter(), initial);
    assert.deepEqual(ids(view), [1, 2, 3]);
    data.update(1, { name: 'Updated after table destroy' }, silent);
    assert.equal(view.get(1).name, 'Updated after table destroy');
    view.setFilter(null, silent);
    assert.deepEqual(ids(view), [1, 2, 3, 4]);
    view.destroy(); data.destroy();
  });

  test(`${Table.name} rejects a second filter owner but releases the view on destroy`, () => {
    const data = new DataStore(); data.parse(rows);
    const View = Table === Grid ? DataView : TreeDataView;
    const view = new View({ data });
    const options = { columns, [Table === Grid ? 'view' : 'treeView']: view };
    const table = new Table(options);
    assert.throws(() => new Table(options), /only one table filter owner/);
    const independentView = new View({ data });
    const independent = new Table({ ...options, [Table === Grid ? 'view' : 'treeView']: independentView });
    table.setFilter(row => row.id === 1, silent);
    assert.deepEqual(ids(independentView), [1, 2, 3, 4]);
    table.destroy();
    assert.throws(() => new Table({ ...options, selection: {} }), /SelectionModel/);
    // A failed mount must not leave the caller's view permanently bound.
    assert.throws(() => new Table('#missing-host', options));
    const replacement = new Table(options);
    assert.equal(replacement.getFilter(), view.getFilter());
    replacement.destroy(); independent.destroy(); independentView.destroy(); view.destroy(); data.destroy();
  });
}

test('Grid clearAllFilters veto preserves the shared global filter and emits one projection when accepted', () => {
  const grid = new Grid({ columns }); grid.data.parse(rows);
  const global = row => row.amount <= 30;
  grid.view.setFilter(global);
  grid.setColumnFilter('amount', { kind: 'number', operator: 'greaterOrEqual', value: 20 });
  grid.events.once('beforeFilterChange', event => { event.cancel = true; });
  assert.equal(grid.clearAllFilters(), false);
  assert.equal(grid.getFilter(), global);
  assert.equal(grid.view.getFilter(), global);
  assert.deepEqual(ids(grid.view), [2, 3]);
  let changes = 0;
  grid.view.events.on('change', () => changes++);
  assert.equal(grid.clearAllFilters(), true);
  assert.equal(changes, 1);
  assert.equal(grid.view.getFilter(), null);
  assert.deepEqual(ids(grid.view), [1, 2, 3, 4]);
  grid.destroy();
});

test('TreeGrid silent sort/filter/search changes suppress semantic events and retain normal provenance', () => {
  const tree = new TreeGrid({ columns }); tree.data.parse(rows);
  const events = [];
  for (const type of ['sortChange', 'filterChange', 'treeViewChange']) tree.events.on(type, event => events.push({ type, event }));
  tree.sortBy('amount', 'desc', silent);
  assert.deepEqual(ids(tree.treeView), [4, 3, 2, 1]);
  tree.setColumnFilter('name', 'Beta', silent);
  assert.deepEqual(ids(tree.treeView), [4, 2]);
  tree.clearSort(silent);
  assert.deepEqual(ids(tree.treeView), [2, 4]);
  tree.setSearchQuery('40', silent);
  assert.deepEqual(ids(tree.treeView), [4]);
  tree.clearAllFilters(silent);
  assert.deepEqual(ids(tree.treeView), [1, 2, 3, 4]);
  assert.deepEqual(events, []);
  tree.sortBy('amount', 'desc', { origin: 'user', userAction: true });
  tree.setColumnFilter('name', 'Beta', { origin: 'host' });
  const sort = events.find(entry => entry.type === 'sortChange').event;
  const filter = events.find(entry => entry.type === 'filterChange').event;
  assert.equal(sort.source, tree); assert.equal(sort.origin, 'user'); assert.equal(sort.userAction, true);
  assert.equal(filter.source, tree); assert.equal(filter.origin, 'host'); assert.equal(filter.userAction, false);
  tree.destroy();
});

test('Grid teardown releases a table-dependent sort and preserves a later external comparator', () => {
  const data = new DataStore(); data.parse(rows);
  const original = (left, right) => left.id - right.id;
  const view = new DataView({ data, sort: original });
  const create = () => new Grid({ view, columns: [{ id: 'amount', sortable: true,
    sort(left, right, context) { context.grid.getSortModel(); return left - right; } }] });
  const grid = create();
  grid.sortBy('amount', 'desc');
  grid.setColumnFilter('amount', { kind: 'number', operator: 'greater', value: 10 });
  grid.destroy();
  assert.equal(view.getSort(), original);
  data.update(1, { amount: 50 });
  assert.deepEqual(ids(view), [1, 2, 3, 4]);
  const next = create(); next.sortBy('amount', 'asc');
  const external = (left, right) => right.id - left.id;
  view.setSort(external);
  next.destroy();
  assert.equal(view.getSort(), external);
  assert.deepEqual(ids(view), [4, 3, 2, 1]);
  view.destroy(); data.destroy();
});
