import test from 'node:test';
import assert from 'node:assert/strict';
import { GridColumnModel } from '../src/core/GridColumnModel.js';
import { GridFilterModel } from '../src/core/GridFilterModel.js';
import { GridSearchModel } from '../src/core/GridSearchModel.js';
import { GridGroupModel } from '../src/core/GridGroupModel.js';
import { DataStore } from '../src/core/DataStore.js';
import { TreeDataView } from '../src/core/TreeDataView.js';
import { Grid } from '../src/ui/Grid.js';

const fixtures = [
  {
    create: () => new GridColumnModel([{ id: 'name', width: 100 }]),
    operations: model => [() => model.all(), () => model.visible(), () => model.get('name'),
      () => model.getState(), () => model.replace([{ id: 'new' }]), () => model.move('name', 0),
      () => model.setHidden('name', true), () => model.setFrozen('name', 'left'),
      () => model.setWidth('name', 200), () => model.restoreState([{ id: 'new' }], { silent: true })],
    mutate: model => model.setWidth('name', 200)
  },
  {
    create: () => new GridFilterModel({ filters: { name: { kind: 'text', operator: 'contains', value: 'a' } } }),
    operations: model => [() => model.get('name'), () => model.all(), () => model.activeColumns(),
      () => model.hasAny(), () => model.set('name', { kind: 'boolean', value: true }),
      () => model.clear('name'), () => model.clearAll(), () => model.matches({}, () => true),
      () => model.createPredicate(() => true)],
    mutate: model => model.set('name', { kind: 'boolean', value: true })
  },
  {
    create: () => new GridSearchModel({ query: 'old' }),
    operations: model => [() => model.query, () => model.mode, () => model.columns,
      () => model.getState(), () => model.hasQuery(), () => model.set('new'),
      () => model.setMode('filter'), () => model.setColumns(['name']), () => model.clear(),
      () => model.restoreState({ query: 'new' }, { silent: true })],
    mutate: model => model.set('new')
  },
  {
    create: () => new GridGroupModel({ rules: ['name'] }),
    operations: model => [() => model.get(), () => model.hasAny(), () => model.getState(),
      () => model.set(['new']), () => model.clear(), () => model.toggle('/name:a'),
      () => model.entries([], () => ''), () => model.restoreState({ rules: ['new'] }, { silent: true })],
    mutate: model => model.set(['new'])
  }
];

for (const fixture of fixtures) {
  const probe = fixture.create(), name = probe.constructor.name; probe.destroy();
  test(`${name} has an idempotent terminal lifecycle`, () => {
    const model = fixture.create();
    let notifications = 0;
    const subscription = model.events.on('invalidate', () => notifications++);
    model.destroy(); model.destroy(); subscription.dispose(); subscription.dispose();
    assert.equal(model.destroyed, true);
    assert.equal(model.events.destroyed, true);
    for (const operation of fixture.operations(model)) assert.throws(operation, /destroyed/);
    assert.equal(notifications, 0);
  });

  test(`${name} stops later notifications when destroyed during invalidate`, () => {
    const model = fixture.create();
    const phases = [];
    model.events.on('invalidate', () => { phases.push('invalidate'); model.destroy(); });
    model.events.on('change', () => phases.push('change'));
    assert.equal(fixture.mutate(model), true);
    assert.deepEqual(phases, ['invalidate']);
    assert.equal(model.destroyed, true);
  });
}

test('Terminal guards run before parsing inputs or touching caller-owned data', () => {
  const source = [{ id: 'name', width: 100 }];
  const columns = new GridColumnModel(source); columns.destroy();
  assert.throws(() => columns.setWidth('name', 200), /destroyed/);
  assert.deepEqual(source, [{ id: 'name', width: 100 }]);
  const search = new GridSearchModel(); search.destroy();
  const groups = new GridGroupModel(); groups.destroy();
  let accessed = false;
  const input = { get rules() { accessed = true; return ['new']; }, get query() { accessed = true; return 'new'; } };
  assert.throws(() => groups.restoreState(input), /destroyed/);
  assert.throws(() => search.restoreState(input), /destroyed/);
  assert.equal(accessed, false);
  assert.throws(() => search.setMode('invalid'), /destroyed/);
  assert.throws(() => columns.setFrozen('name', 'invalid'), /destroyed/);
});

for (const fixture of fixtures.slice(1, 3)) {
  const probe = fixture.create(), name = probe.constructor.name; probe.destroy();
  test(`${name} does not apply a write after destruction in beforeChange`, () => {
    const model = fixture.create();
    model.events.on('beforeChange', () => model.destroy());
    assert.equal(fixture.mutate(model), false);
    assert.equal(model.destroyed, true);
    // Destruction must not be followed by a write that repopulates retained state.
    if (model instanceof GridSearchModel) assert.equal(model._query, '');
    else assert.equal(model._filters.size, 0);
  });
  test(`${name} skips afterChange after destruction in change`, () => {
    const model = fixture.create();
    const phases = [];
    model.events.on('change', () => { phases.push('change'); model.destroy(); });
    model.events.on('afterChange', () => phases.push('afterChange'));
    assert.equal(fixture.mutate(model), true);
    assert.deepEqual(phases, ['change']);
  });
}

test('TreeDataView clears callbacks and guards getters while its store survives', () => {
  const data = new DataStore(); data.parse([{ id: 1, parentId: null, name: 'A' }]);
  const view = new TreeDataView({ data, filter: () => true, sort: () => 0 });
  view.destroy(); view.destroy();
  assert.throws(() => view.getFilter(), /destroyed/);
  assert.throws(() => view.getSort(), /destroyed/);
  assert.equal(view._filter, null); assert.equal(view._sort, null);
  data.update(1, { name: 'B' });
  assert.equal(data.get(1).name, 'B');
  data.destroy();
});

test('Group toggle reports its applied expanded state even if invalidate destroys the model', () => {
  const groups = new GridGroupModel({ rules: ['name'] });
  groups.events.on('invalidate', () => groups.destroy());
  assert.equal(groups.toggle('/name:A'), false);
  assert.equal(groups.destroyed, true);
});

test('Closing Grid from beforeFilterChange aborts its owned model write safely', () => {
  const grid = new Grid({ columns: [{ id: 'name' }] });
  grid.data.parse([{ id: 1, name: 'A' }]);
  const filters = grid.filters, columns = grid.columnModel;
  grid.events.on('beforeFilterChange', () => grid.destroy());
  assert.equal(grid.setColumnFilter('name', { kind: 'text', operator: 'equals', value: 'A' }), false);
  assert.equal(grid.destroyed, true);
  assert.equal(filters.destroyed, true);
  assert.equal(columns.destroyed, true);
  assert.equal(filters._filters.size, 0);
});
