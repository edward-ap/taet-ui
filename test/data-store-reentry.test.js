import test from 'node:test';
import assert from 'node:assert/strict';
import { DataStore } from '../src/core/DataStore.js';
import { DataView } from '../src/core/DataView.js';

function consistent(store, expected) {
  assert.deepEqual(store.all(), expected);
  for (const item of store.all()) assert.equal(store.get(item.id), item);
}

for (const silent of [false, true]) {
  for (const operation of ['add', 'update', 'remove', 'parse', 'clear']) {
    test(`${operation} abandons its stale beforeChange write after a ${silent ? 'silent' : 'public'} nested replacement`, () => {
      const store = new DataStore();
      store.parse([{ id: 'a', value: 'old' }]);
      const nested = { id: operation === 'add' ? 'b' : 'a', value: 'nested' };
      store.events.once('beforeChange', () => store.parse([nested], { silent }));
      const events = [];
      store.events.on('change', event => events.push(event.operation));
      const changed = operation === 'add' ? store.add({ id: 'b', value: 'outer' })
        : operation === 'update' ? store.update('a', { value: 'outer' })
        : operation === 'remove' ? store.remove('a')
        : operation === 'parse' ? store.parse([{ id: 'outer' }]) : store.clear();
      assert.equal(changed, false);
      consistent(store, [nested]);
      assert.deepEqual(events, silent ? [] : ['parse']);
      store.destroy();
    });
  }
}

test('nested add cannot create duplicate IDs and nested remove cannot leave an update ghost', () => {
  const store = new DataStore();
  store.events.once('beforeChange', event => store.add({ id: event.id, value: 'nested' }, { silent: true }));
  assert.equal(store.add({ id: 'a', value: 'outer' }), false);
  consistent(store, [{ id: 'a', value: 'nested' }]);
  store.events.once('beforeChange', event => store.remove(event.id, { silent: true }));
  assert.equal(store.update('a', { value: 'outer' }), false);
  consistent(store, []);
  assert.equal(store.get('a'), undefined);
  store.destroy();
});

for (const phase of ['invalidate', 'change']) {
  test(`a nested write during ${phase} stops obsolete later store event phases`, () => {
    const store = new DataStore();
    const events = [];
    store.events.once(phase, () => store.parse([{ id: 'new' }], { silent: true }));
    store.events.on('change', event => events.push(`change:${event.operation}`));
    store.events.on('afterChange', event => events.push(`after:${event.operation}`));
    assert.equal(store.add({ id: 'old' }), true);
    consistent(store, [{ id: 'new' }]);
    assert.deepEqual(events, phase === 'change' ? ['change:add'] : []);
    store.destroy();
  });
}

test('recursive beforeChange calls fail with a bounded error and the store remains usable', () => {
  const store = new DataStore();
  let calls = 0;
  const subscription = store.events.on('beforeChange', () => {
    assert.ok(++calls < 20, 'must not overflow the stack');
    store.add({ id: calls });
  });
  assert.throws(() => store.add({ id: 'outer' }), /DataStore beforeChange recursion/);
  consistent(store, []);
  subscription.dispose();
  assert.equal(store.add({ id: 'recovered' }), true);
  store.destroy();
});

for (const method of ['undo', 'redo']) {
  test(`${method} does not transfer a history entry twice after a nested replay`, () => {
    const store = new DataStore();
    store.batch(() => store.add({ id: 1 }));
    store.batch(() => store.add({ id: 2 }));
    if (method === 'redo') { store.undo(); store.undo(); }
    store.events.once('beforeChange', () => assert.equal(store[method]({ silent: true }), true));
    assert.equal(store[method](), false);
    consistent(store, [{ id: 1 }]);
    assert.equal(store[method](), true);
    consistent(store, method === 'undo' ? [] : [{ id: 1 }, { id: 2 }]);
    assert.equal(store[method](), false);
    store.destroy();
  });
}

test('undo and redo inside a batch cannot mutate history that rollback would retain', () => {
  const store = new DataStore();
  store.batch(() => store.add({ id: 1 }));
  store.batch(() => store.add({ id: 2 }));
  store.undo();
  assert.throws(() => store.batch(() => {
    assert.equal(store.undo(), false);
    assert.equal(store.redo(), false);
    store.add({ id: 3 });
    throw new Error('rollback');
  }), /rollback/);
  consistent(store, [{ id: 1 }]);
  assert.equal(store.redo(), true);
  consistent(store, [{ id: 1 }, { id: 2 }]);
  store.destroy();
});

test('batch rollback restores captured identity without invoking a changed getId callback', () => {
  let fail = false;
  const store = new DataStore({ getId(item) {
    if (fail) throw new Error('identity callback');
    return item.id;
  } });
  store.parse([{ id: 1 }]);
  assert.throws(() => store.batch(() => {
    store.add({ id: 2 });
    fail = true;
    throw new Error('original callback error');
  }), /original callback error/);
  consistent(store, [{ id: 1 }]);
  fail = false;
  assert.equal(store.add({ id: 3 }), true);
  store.destroy();
});

test('custom identity teardown or replacement cancels a pending parse before publication', () => {
  for (const destroy of [false, true]) {
    let action;
    const store = new DataStore({ getId(item) { action?.(); return item.id; } });
    store.parse([{ id: 'old' }]);
    action = () => { action = null; destroy ? store.destroy() : store.parse([{ id: 'nested' }], { silent: true }); };
    assert.equal(store.parse([{ id: 'outer' }, { id: 'later' }]), false);
    if (!destroy) { consistent(store, [{ id: 'nested' }]); store.destroy(); }
  }
});

test('nested writes in beforeChange form one accepted batch and synchronize a view', () => {
  const store = new DataStore();
  store.parse([{ id: 1, value: 'old' }]);
  const view = new DataView({ data: store });
  const events = [];
  store.events.on('change', event => events.push(event));
  store.events.once('beforeChange', () => store.update(1, { value: 'nested' }, { silent: true }));
  const result = store.batch(() => store.update(1, { value: 'outer' }));
  assert.equal(result, false);
  assert.deepEqual(view.all(), [{ id: 1, value: 'nested' }]);
  assert.equal(events.length, 1);
  assert.equal(events[0].changes.length, 1);
  store.undo();
  assert.deepEqual(view.all(), [{ id: 1, value: 'old' }]);
  store.redo();
  assert.deepEqual(view.all(), [{ id: 1, value: 'nested' }]);
  view.destroy(); store.destroy();
});

test('a no-op nested write does not cancel an otherwise valid operation', () => {
  const store = new DataStore();
  store.parse([{ id: 1 }]);
  store.events.once('beforeChange', () => assert.equal(store.update(1, {}), false));
  assert.equal(store.add({ id: 2 }), true);
  consistent(store, [{ id: 1 }, { id: 2 }]);
  store.destroy();
});

for (const throws of [false, true]) {
  test(`a ${throws ? 'throwing' : 'vetoing'} beforeChange handler retains its accepted nested write`, () => {
    const store = new DataStore();
    store.events.once('beforeChange', event => {
      store.add({ id: 'nested' }, { silent: true });
      if (throws) throw new Error('consumer');
      event.cancel = true;
    });
    if (throws) assert.throws(() => store.add({ id: 'outer' }), /consumer/);
    else assert.equal(store.add({ id: 'outer' }), false);
    consistent(store, [{ id: 'nested' }]);
    assert.equal(store.add({ id: 'recovered' }), true);
    store.destroy();
  });
}

test('a nested batch replaces the pending undo without consuming its new history entry', () => {
  const store = new DataStore();
  store.batch(() => store.add({ id: 1 }));
  store.events.once('beforeChange', () => store.batch(() => store.add({ id: 2 }), { silent: true }));
  assert.equal(store.undo(), false);
  consistent(store, [{ id: 1 }, { id: 2 }]);
  assert.equal(store.undo(), true);
  consistent(store, [{ id: 1 }]);
  assert.equal(store.undo(), true);
  consistent(store, []);
  store.destroy();
});

test('rollback preserves row and lookup identity when an ID change reordered the map', () => {
  const store = new DataStore();
  store.parse([{ id: 1 }, { id: 2 }]);
  store.update(1, { id: 3 });
  assert.throws(() => store.batch(() => {
    store.remove(2);
    store.update(3, { id: 4 });
    throw new Error('rollback');
  }), /rollback/);
  consistent(store, [{ id: 3 }, { id: 2 }]);
  assert.equal(store.get(1), undefined);
  assert.equal(store.get(4), undefined);
  store.destroy();
});
