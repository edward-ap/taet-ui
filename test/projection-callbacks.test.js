import test from 'node:test';
import assert from 'node:assert/strict';
import { DataStore } from '../src/core/DataStore.js';
import { DataView } from '../src/core/DataView.js';
import { TreeDataView } from '../src/core/TreeDataView.js';

for (const View of [DataView, TreeDataView]) {
  for (const kind of ['filter', 'sort']) {
    const setter = kind === 'filter' ? 'setFilter' : 'setSort';
    const result = kind === 'filter' ? true : 0;
    test(`${View.name} ${kind} teardown stops callbacks and publication`, () => {
      const data = new DataStore(); data.parse([{ id: 1 }, { id: 2 }, { id: 3 }]);
      const view = new View({ data });
      let calls = 0;
      const events = [];
      view.events.on('change', event => events.push(event));
      assert.equal(view[setter](() => { calls++; view.destroy(); return result; }), false);
      assert.equal(calls, 1);
      assert.deepEqual(events, []);
      assert.equal(data.all().length, 3); data.destroy();
    });
    test(`${View.name} ${kind} data replacement publishes only the new records`, () => {
      const data = new DataStore(); data.parse([{ id: 1 }, { id: 2 }, { id: 3 }]);
      const view = new View({ data });
      let replaced = false;
      const events = [];
      view.events.on('change', event => events.push(event));
      view[setter](() => {
        if (!replaced) { replaced = true; data.parse([{ id: 8 }, { id: 9 }], { silent: true, origin: 'import' }); }
        return result;
      });
      assert.deepEqual(view.all().map(item => item.id), [8, 9]);
      assert.deepEqual(events, []);
      view.destroy(); data.destroy();
    });
    test(`${View.name} ${kind} replacement wins without reentering the old callback`, () => {
      const data = new DataStore(); data.parse([{ id: 1 }, { id: 2 }, { id: 3 }]);
      const view = new View({ data });
      let calls = 0;
      const replacement = kind === 'filter' ? item => item.id === 3 : (a, b) => b.id - a.id;
      view[setter](() => { calls++; view[setter](replacement); return result; });
      assert.equal(calls, 1);
      assert.equal(view[kind === 'filter' ? 'getFilter' : 'getSort'](), replacement);
      assert.deepEqual(view.all().map(item => item.id), kind === 'filter' ? [3] : [3, 2, 1]);
      view.destroy(); data.destroy();
    });
    test(`${View.name} ${kind} recursive refresh is bounded and exceptions can be retried`, () => {
      const data = new DataStore(); data.parse([{ id: 1 }, { id: 2 }, { id: 3 }]);
      const view = new View({ data });
      let calls = 0;
      view[setter](() => {
        assert.ok(++calls < 12);
        assert.equal(view.refresh(), false);
        return result;
      });
      assert.throws(() => view[setter](() => { throw new Error('consumer failure'); }), /consumer failure/);
      assert.deepEqual(view.all().map(item => item.id), [1, 2, 3]);
      view[setter](null);
      data.parse([{ id: 4 }]);
      assert.deepEqual(view.all().map(item => item.id), [4]);
      view.destroy(); data.destroy();
    });
  }
  test(`${View.name} a continuously mutating predicate fails in a bounded number of calls`, () => {
    const data = new DataStore(); data.parse([{ id: 1 }]);
    const view = new View({ data });
    let calls = 0;
    assert.throws(() => view.setFilter(() => {
      assert.ok(++calls < 20, 'must not overflow the stack');
      data.parse([{ id: calls + 1 }]);
      return true;
    }), /Projection callbacks did not settle/);
    view.setFilter(null);
    assert.equal(view.all()[0].id, data.all()[0].id);
    view.destroy(); data.destroy();
  });
}

test('a page change requested by a predicate publishes the final page and metadata', () => {
  const data = new DataStore(); data.parse([{ id: 1 }, { id: 2 }, { id: 3 }]);
  const view = new DataView({ data, pageSize: 1 });
  let moved = false;
  const events = [];
  view.events.on('invalidate', event => events.push({ ids: event.ids, origin: event.origin, silent: event.silent }));
  view.setFilter(() => {
    if (!moved) { moved = true; assert.equal(view.setPage(2, { silent: true, origin: 'import' }), false); }
    return true;
  });
  assert.equal(view.getPageState().page, 2);
  assert.deepEqual(view.all().map(item => item.id), [2]);
  assert.deepEqual(events, [{ ids: [2], origin: 'import', silent: true }]);
  view.destroy(); data.destroy();
});

for (const operation of ['filter', 'update']) {
  test(`DataView ${operation} publication stops after invalidate teardown`, () => {
    const data = new DataStore(); data.parse([{ id: 1 }, { id: 2 }]);
    const view = new DataView({ data });
    view.events.on('invalidate', () => view.destroy());
    assert.doesNotThrow(() => operation === 'filter' ? view.setFilter(item => item.id === 1) : data.update(1, { text: 'New' }));
    assert.equal(view.destroyed, true);
    data.destroy();
  });
}

test('view callbacks retain their existing receiver contracts', () => {
  const data = new DataStore(); data.parse([{ id: 1 }, { id: 2 }]);
  const flat = new DataView({ data });
  const tree = new TreeDataView({ data });
  flat.setFilter(function () { assert.equal(this, flat); return true; });
  flat.setSort(function () { assert.equal(this, flat); return 0; });
  tree.setFilter(function () { assert.equal(this, tree); return true; });
  tree.setSort(function () { assert.equal(this, undefined); return 0; });
  flat.destroy(); tree.destroy(); data.destroy();
});
