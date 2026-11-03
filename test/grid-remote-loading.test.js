import test from 'node:test';
import assert from 'node:assert/strict';
import { Grid } from '../src/ui/Grid.js';
import { GridDataProvider } from '../src/core/GridDataProvider.js';

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const response = id => ({ items: [{ id }], totalCount: 10000 });

test('provider rejects stale responses without clearing a newer loading state', async () => {
  const pending = [];
  const provider = new GridDataProvider((request, { signal }) => {
    const item = { ...deferred(), signal };
    pending.push(item);
    return item.promise;
  });
  const loaded = [];
  provider.events.on('load', event => loaded.push(event.response.items[0].id));
  const first = provider.request({ page: 1, pageSize: 50 });
  const rejected = assert.rejects(first, { name: 'AbortError' });
  const second = provider.request({ page: 2, pageSize: 50 });
  assert.equal(pending[0].signal.aborted, true);
  pending[0].resolve(response(1));
  await rejected;
  assert.equal(provider.loading, true);
  pending[1].resolve(response(51));
  await second;
  assert.deepEqual(loaded, [51]);
  assert.equal(provider.loading, false);
  provider.destroy();
});

test('provider links caller cancellation and ignores a completion after destruction', async () => {
  const pending = [];
  const provider = new GridDataProvider((request, { signal }) => {
    const item = { ...deferred(), signal }; pending.push(item); return item.promise;
  });
  let events = 0;
  provider.events.on('load', () => events++);
  provider.events.on('error', () => events++);
  const caller = new AbortController();
  const request = provider.request({}, { signal: caller.signal });
  const cancelled = assert.rejects(request, { name: 'AbortError' });
  caller.abort();
  assert.equal(pending[0].signal.aborted, true);
  pending[0].resolve(response(1));
  await cancelled;
  const last = provider.request({});
  const destroyed = assert.rejects(last, { name: 'AbortError' });
  provider.destroy();
  assert.equal(pending[1].signal.aborted, true);
  pending[1].resolve(response(2));
  await destroyed;
  assert.equal(events, 0);
  assert.equal(provider.loading, false);
});

test('Grid lazy reload keeps one batch and retains it on a load failure', async () => {
  const requests = [];
  const provider = new GridDataProvider(async ({ page, pageSize }) => {
    requests.push(page);
    if (page === 3) throw new Error('offline');
    return { page, pageSize, totalCount: 10000,
      items: Array.from({ length: pageSize }, (_, i) => ({ id: (page - 1) * pageSize + i + 1 })) };
  });
  const grid = new Grid({ columns: [{ id: 'id' }], dataProvider: provider });
  for (const page of [1, 2, 200, 1]) {
    await grid.reloadRemote({ page, pageSize: 50 });
    assert.equal(grid.data.all().length, 50);
    assert.equal(grid.view.all().length, 50);
    assert.equal(grid.data.all()[0].id, (page - 1) * 50 + 1);
    assert.equal(grid.getStatusBarState().totalCount, 10000);
  }
  await assert.rejects(grid.reloadRemote({ page: 3, pageSize: 50 }), /offline/);
  assert.equal(grid.data.all()[0].id, 1);
  assert.equal(grid.data.all().length, 50);
  assert.deepEqual(requests, [1, 2, 200, 1, 3]);
  grid.destroy();
  assert.equal(provider.destroyed, false);
  provider.destroy();
});

test('Grid guards stale and destroyed completions even with a provider that ignores abort', async () => {
  const pending = [];
  const grid = new Grid({ columns: [{ id: 'id' }], dataProvider: { request(request, { signal }) {
    const item = { ...deferred(), signal }; pending.push(item); return item.promise;
  } } });
  let loads = 0;
  grid.events.on('remoteLoad', () => loads++);
  const first = grid.reloadRemote({ page: 1, pageSize: 50 });
  const rejected = assert.rejects(first, { name: 'AbortError' });
  const second = grid.reloadRemote({ page: 2, pageSize: 50 });
  pending[1].resolve(response(51));
  await second;
  pending[0].resolve(response(1));
  await rejected;
  assert.deepEqual(grid.data.all(), [{ id: 51 }]);
  assert.equal(loads, 1);
  const third = grid.reloadRemote({ page: 3, pageSize: 50 });
  const destroyed = assert.rejects(third, { name: 'AbortError' });
  grid.destroy();
  assert.equal(pending[2].signal.aborted, true);
  pending[2].resolve(response(101));
  await destroyed;
  assert.equal(loads, 1);
});
