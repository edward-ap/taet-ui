import test from 'node:test';
import assert from 'node:assert/strict';
import { DataStore } from '../src/core/DataStore.js';
import { TreeDataView } from '../src/core/TreeDataView.js';

for (const method of ['expand', 'collapse', 'expandAll', 'collapseAll']) {
  for (const phase of ['invalidate', 'change']) {
    test(`${method} stops projection events after ${phase} teardown`, () => {
      const data = new DataStore();
      data.parse([{ id: 'r' }, { id: 'c', parentId: 'r' }]);
      const view = new TreeDataView({ data, expandAll: method.startsWith('collapse') });
      const late = [];
      view.events.on(phase, () => view.destroy());
      view.events.on('afterChange', () => late.push('after'));
      view.events.on(method, () => late.push(method));
      assert.doesNotThrow(() => method.endsWith('All') ? view[method]() : view[method]('r'));
      assert.deepEqual(late, []);
      assert.equal(data.all().length, 2);
      data.destroy();
    });
  }
}

for (const phase of ['invalidate', 'change']) {
  test(`nested collapse during ${phase} suppresses obsolete expand phases and preserves snapshots`, () => {
    const data = new DataStore();
    data.parse([{ id: 'r' }, { id: 'c', parentId: 'r' }]);
    const view = new TreeDataView({ data });
    const completed = [];
    let snapshot;
    view.events.once(phase, event => { snapshot = event; view.collapse('r'); });
    view.events.on('afterChange', event => completed.push(event.ids));
    view.events.on('expand', () => completed.push('stale expand'));
    assert.equal(view.expand('r'), true);
    assert.deepEqual(view.all().map(item => item.id), ['r']);
    assert.deepEqual(snapshot.ids, ['r', 'c']);
    assert.deepEqual(completed, [['r']]);
    view.destroy(); data.destroy();
  });
}
