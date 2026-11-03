import test from 'node:test';
import assert from 'node:assert/strict';
import { GridColumnModel } from '../src/core/GridColumnModel.js';
import { GridSearchModel } from '../src/core/GridSearchModel.js';
import { GridGroupModel } from '../src/core/GridGroupModel.js';
import { Grid } from '../src/ui/Grid.js';

test('Search invalidates applied states, including silent writes, but not vetoes or no-ops', () => {
  const search = new GridSearchModel();
  const notifications = [];
  for (const type of ['beforeChange', 'invalidate', 'change', 'afterChange']) {
    search.events.on(type, event => notifications.push({ type, event }));
  }
  search.set('first', { silent: true, origin: 'restore' });
  assert.deepEqual(notifications.map(entry => entry.type), ['invalidate']);
  const snapshot = notifications[0].event;
  assert.equal(snapshot.type, 'invalidate');
  assert.equal(snapshot.source, search);
  assert.equal(snapshot.origin, 'restore');
  assert.equal(snapshot.silent, true);
  assert.equal(snapshot.state.query, 'first');
  assert.equal(search.set('first'), false);
  assert.equal(notifications.length, 1);
  search.events.once('beforeChange', event => { event.cancel = true; });
  assert.equal(search.set('veto'), false);
  assert.equal(search.query, 'first');
  assert.equal(notifications.at(-1).type, 'beforeChange');
  notifications.length = 0;
  search.setColumns(['name'], { origin: 'user', userAction: true });
  assert.deepEqual(notifications.map(entry => entry.type), ['beforeChange', 'invalidate', 'change', 'afterChange']);
  assert.equal(notifications[1].event.silent, false);
  assert.equal(notifications[1].event.userAction, true);
  assert.equal(snapshot.state.columns, null);
  search.destroy();
});

test('Column mutations invalidate before change and silent restore preserves snapshots', () => {
  const columns = new GridColumnModel([{ id: 'name', width: 100 }, { id: 'amount', width: 80 }]);
  const notifications = [];
  columns.events.on('invalidate', event => notifications.push(event));
  columns.events.on('change', event => notifications.push(event));
  columns.setWidth('name', 140, { silent: true, origin: 'restore' });
  assert.equal(notifications.length, 1);
  const first = notifications[0];
  assert.equal(first.type, 'invalidate');
  assert.equal(first.silent, true);
  assert.equal(first.origin, 'restore');
  assert.equal(first.oldState[0].width, 100);
  assert.equal(first.state[0].width, 140);
  assert.equal(columns.setWidth('name', 140), false);
  assert.equal(notifications.length, 1);
  columns.move('amount', 0);
  assert.deepEqual(notifications.slice(1).map(event => event.type), ['invalidate', 'change']);
  columns.restoreState([{ id: 'name', order: 0, width: 160, hidden: true }], { silent: true });
  assert.equal(notifications.at(-1).operation, 'restore');
  assert.equal(notifications.at(-1).silent, true);
  assert.equal(first.state[0].width, 140);
  columns.destroy();
});

test('Grid applies silent search to projection and paging without semantic events', () => {
  const searchModel = new GridSearchModel({ mode: 'filter', columns: ['name'] });
  const grid = new Grid({ columns: [{ id: 'name' }, { id: 'category' }], searchModel, pageSize: 1 });
  grid.data.parse([{ id: 1, name: 'Alpha', category: 'A' }, { id: 2, name: 'Beta', category: 'B' }]);
  grid.setPage(2);
  const events = [];
  for (const type of ['searchChange', 'viewChange', 'pageChange']) grid.events.on(type, () => events.push(type));
  searchModel.set('Alpha', { silent: true });
  assert.deepEqual(grid.view.all().map(row => row.id), [1]);
  assert.equal(grid.getPageState().page, 1);
  searchModel.setColumns(['category'], { silent: true });
  assert.equal(grid.view.all().length, 0);
  searchModel.setMode('highlight', { silent: true });
  assert.equal(grid.view.projectedAll().length, 2);
  assert.deepEqual(events, []);
  grid.restoreLayoutState({ ...grid.getLayoutState(), search: { query: 'Beta', mode: 'filter', columns: ['name'] } }, { silent: true });
  assert.deepEqual(grid.view.all().map(row => row.id), [2]);
  assert.deepEqual(events, []);
  grid.destroy();
  assert.equal(searchModel.destroyed, false);
  searchModel.clear({ silent: true });
  searchModel.destroy();
});

test('Grid groupChange identifies the table and preserves a separate groupModel reference', () => {
  const groupModel = new GridGroupModel();
  const grid = new Grid({ columns: [{ id: 'name' }], groupModel });
  let modelEvent, gridEvent;
  groupModel.events.on('change', event => { modelEvent = event; });
  grid.events.on('groupChange', event => { gridEvent = event; });
  groupModel.set(['name'], { origin: 'user', userAction: true });
  assert.equal(modelEvent.source, groupModel);
  assert.equal(modelEvent.type, 'change');
  assert.equal(gridEvent.source, grid);
  assert.equal(gridEvent.groupModel, groupModel);
  assert.equal(gridEvent.type, 'groupChange');
  assert.equal(gridEvent.operation, 'rules');
  assert.equal(gridEvent.origin, 'user');
  assert.equal(gridEvent.userAction, true);
  assert.deepEqual(gridEvent.state, groupModel.getState());
  grid.destroy();
  groupModel.clear();
  groupModel.destroy();
});
