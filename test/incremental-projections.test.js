import test from "node:test";
import assert from "node:assert/strict";
import { DataStore } from "../src/core/DataStore.js";
import { DataView } from "../src/core/DataView.js";
import { TreeDataView } from "../src/core/TreeDataView.js";
import { Grid } from "../src/ui/Grid.js";

function rebuilds(view) {
  let count = 0;
  const original = view._rebuild.bind(view);
  view._rebuild = () => { count++; original(); };
  return () => count;
}

test("DataView replaces records without rebuilding, preserving synchronous event snapshots", () => {
  const data = new DataStore();
  data.parse([{ id: "a", value: 1 }, { id: "b", value: 2 }]);
  const view = new DataView({ data }), count = rebuilds(view), events = [], invalidations = [];
  view.events.on("change", event => events.push(event));
  view.events.on("invalidate", event => invalidations.push(event));
  data.update("a", { value: 3 }, { origin: "import" });
  assert.equal(view.get("a"), data.get("a"));
  assert.equal(events.length, 1);
  assert.equal(events[0].origin, "import");
  assert.equal(events[0].reason, "update");
  assert.equal(events[0].operation, undefined);
  data.update("a", { value: 4 }, { silent: true });
  assert.equal(events[0].oldItems[0].value, 1);
  assert.equal(events[0].items[0].value, 3);
  assert.equal(events.length, 1);
  assert.equal(invalidations.length, 2);
  assert.equal(invalidations[1].silent, true);
  assert.equal(count(), 0);
  view.destroy(); data.destroy();
});

test("paging updates outside the page replace projected data without a page change", () => {
  const data = new DataStore();
  data.parse(Array.from({ length: 8 }, (_, id) => ({ id, n: id })));
  const view = new DataView({ data, pageSize: 2, page: 2 }), count = rebuilds(view);
  let changes = 0; view.events.on("change", () => changes++);
  data.update(7, { n: 99 });
  assert.equal(changes, 0); assert.equal(count(), 0);
  assert.equal(view.projectedAll()[7], data.get(7));
  assert.deepEqual(view.all().map(item => item.id), [2, 3]);
  data.update(2, { n: 22 });
  assert.equal(changes, 1); assert.equal(count(), 0);
  view.setPage(4); assert.equal(view.get(7).n, 99);
});

test("Grid built-in filters and sort skip only unrelated fields", () => {
  const grid = new Grid({ columns: [{ id: "label", field: "name", sortable: true }, { id: "active", filterable: true }, { id: "note" }] });
  grid.data.parse([{ id: "a", name: "A", active: true }, { id: "b", name: "B", active: true }, { id: "c", name: "C", active: false }]);
  grid.sortBy("label", "asc"); grid.setColumnFilter("active", { kind: "boolean", value: true });
  const count = rebuilds(grid.view);
  grid.data.update("b", { note: "Unrelated" });
  grid.data.update("c", { note: "Still excluded" });
  assert.equal(count(), 0);
  assert.equal(grid.view.get("b"), grid.data.get("b"));
  grid.data.update("b", { name: "0" });
  assert.equal(count(), 1); assert.deepEqual(grid.view.all().map(item => item.id), ["b", "a"]);
  grid.data.update("c", { active: true });
  assert.equal(count(), 2); assert.equal(grid.view.has("c"), true);
  grid.destroy();
});

test("opaque callbacks, custom identity, id changes, batches and undo recompute safely", () => {
  const data = new DataStore(); data.parse([{ id: "a", rank: 1 }, { id: "b", rank: 2 }]);
  let threshold = 0;
  const view = new DataView({ data, filter: item => item.rank > threshold }), count = rebuilds(view);
  threshold = 1; data.update("a", { note: "external state changed" });
  assert.deepEqual(view.all().map(item => item.id), ["b"]); assert.equal(count(), 1);
  view.clearFilter(); const before = count();
  data.update("b", { id: "new" }); assert.equal(count(), before + 1); assert.equal(view.has("b"), false);
  data.batch(() => data.update("a", { rank: 5 }));
  assert.equal(view.get("a").rank, 5); data.undo(); assert.equal(view.get("a").rank, 1);
  const custom = new DataStore({ getId: item => item.key }); custom.parse([{ key: "x", n: 1 }]);
  const customView = new DataView({ data: custom }), customCount = rebuilds(customView);
  custom.update("x", { n: 2 }); assert.equal(customCount(), 1);
});

test("custom Grid accessors and comparators never receive inferred dependencies", () => {
  const grid = new Grid({ columns: [{ id: "rank", sortable: true, value: item => item.rank }, { id: "name" }] });
  grid.data.parse([{ id: 1, rank: 1 }, { id: 2, rank: 2 }]); grid.sortBy("rank", "asc");
  const count = rebuilds(grid.view);
  grid.data.update(1, { name: "custom getter" }); assert.equal(count(), 1);
  grid.getColumn("rank").value = null; grid.getColumn("rank").sort = (a, b) => b.rank - a.rank;
  grid.data.update(1, { name: "custom comparator" }); assert.equal(count(), 2);
  assert.deepEqual(grid.view.all().map(item => item.id), [2, 1]);
});

test("TreeDataView updates hidden/visible records and expansion without rebuilding hierarchy", () => {
  const data = new DataStore(); data.parse([
    { id: "root", parentId: null }, { id: "branch", parentId: "root" },
    { id: "leaf", parentId: "branch", name: "old" }, { id: "other", parentId: null }
  ]);
  const view = new TreeDataView({ data }), count = rebuilds(view);
  let changes = 0, invalidations = 0;
  view.events.on("change", () => changes++); view.events.on("invalidate", () => invalidations++);
  data.update("leaf", { name: "new" }, { silent: true });
  view.expand("branch", { silent: true }); // Remember expansion under a collapsed parent.
  view.expand("root", { silent: true });
  assert.deepEqual(view.all().map(item => item.id), ["root", "branch", "leaf", "other"]);
  assert.equal(view.get("leaf").name, "new"); assert.equal(changes, 0); assert.equal(invalidations, 1);
  view.collapse("root"); view.expand("root"); assert.equal(count(), 0);
  data.update("leaf", { parentId: "other" }); assert.equal(count(), 1); assert.equal(view.has("leaf"), false);
  view.expand("other"); assert.equal(view.getEntry("leaf").level, 1);
});

test("tree filters evaluate descendants even when their parent matches", () => {
  const data = new DataStore(); data.parse([{ id: "p" }, { id: "a", parentId: "p" }, { id: "b", parentId: "p" }]);
  let calls = 0;
  const view = new TreeDataView({ data, filter: () => { calls++; return true; } });
  assert.deepEqual(view.all().map(item => item.id), ["p", "a", "b"]);
  assert.equal(calls, 3);
  const count = rebuilds(view); data.update("a", { n: 1 }, { silent: true }); assert.equal(count(), 1);
  assert.equal(view.get("a"), data.get("a"));
});

test("incremental projections match fresh projections across mixed mutations", () => {
  const data = new DataStore();
  data.parse(Array.from({ length: 40 }, (_, id) => ({ id, parentId: id % 10 ? id - id % 10 : null, rank: id % 7, note: "" })));
  const grid = new Grid({ data, columns: [{ id: "rank", sortable: true }, { id: "note" }] });
  grid.sortBy("rank", "asc"); grid.view.setPageSize(7);
  const tree = new TreeDataView({ data, expandedIds: [0, 10, 20, 30] });
  for (let step = 0; step < 60; step++) {
    const id = step * 17 % 40;
    data.update(id, step % 3 ? { note: String(step) } : { rank: step % 11 }, { silent: step % 2 === 0 });
    if (step % 5 === 0) tree.toggle(step % 4 * 10, { silent: true });
    if (step % 7 === 0) grid.view.setPage(step % 5 + 1);
    const fresh = new DataView({ data, sort: grid.view.getSort(), page: grid.view.getPageState().page, pageSize: 7 });
    assert.deepEqual(grid.view.all(), fresh.all()); assert.deepEqual(grid.view.getPageState(), fresh.getPageState());
    const freshTree = new TreeDataView({ data, expandedIds: tree.getExpandedIds() });
    assert.deepEqual(tree.entries(), freshTree.entries());
    fresh.destroy(); freshTree.destroy();
  }
  tree.destroy(); grid.destroy(); data.destroy();
});

test("tree event snapshots retain their version through updates, expansion, rebuild and destroy", () => {
  const data = new DataStore();
  data.parse([{ id: 'root' }, { id: 'a', parentId: 'root', value: 0 }, { id: 'b' }]);
  const view = new TreeDataView({ data, expandedIds: ['root'] });
  const events = [], expected = [];
  let before = view.entries();
  view.events.on('invalidate', event => {
    const after = view.entries();
    expected.push({ oldEntries: before, entries: after }); before = after;
    events.push(Object.freeze(event)); // Do not read arrays until after teardown.
  });
  data.update('a', { value: 1 });
  view.collapse('root'); view.expand('root', { silent: true });
  data.update('a', { value: 2 });
  data.update('a', { parentId: 'b' }); view.expand('b');
  view.setFilter(() => true); view.setSort((a, b) => b.id.localeCompare(a.id));
  data.clear(); view.destroy(); data.destroy();
  for (let i = 0; i < events.length; i++) {
    const event = events[i], snapshot = expected[i];
    assert.deepEqual(event.oldEntries, snapshot.oldEntries);
    assert.deepEqual(event.entries, snapshot.entries);
    assert.deepEqual(event.oldIds, snapshot.oldEntries.map(entry => entry.id));
    assert.deepEqual(event.ids, snapshot.entries.map(entry => entry.id));
    assert.equal(event.entries, event.entries);
  }
});

test("tree snapshots tolerate reentrant mutations and remain isolated from caller writes", () => {
  const data = new DataStore(); data.parse([{ id: 'a', value: 0 }]);
  const view = new TreeDataView({ data }), events = [];
  let nested = false;
  view.events.on('invalidate', event => {
    events.push(event);
    if (!nested) { nested = true; data.update('a', { value: 2 }); }
  });
  data.update('a', { value: 1 });
  assert.equal(events[0].oldEntries[0].item.value, 0);
  assert.equal(events[0].entries[0].item.value, 1);
  assert.equal(events[1].oldEntries[0].item.value, 1);
  assert.equal(events[1].entries[0].item.value, 2);
  events[0].entries[0].level = 99;
  events[0].entries[0].id = 'changed';
  events[0].entries.push({ id: 'extra' });
  // IDs are independent even when first read after a caller changed entries.
  assert.deepEqual(events[0].ids, ['a']);
  assert.equal(view.getEntry('a').level, 0);
  assert.equal(events[1].oldEntries[0].level, 0);
  const copy = { ...events[1] };
  assert.deepEqual(copy.entries, events[1].entries);
  assert.ok(Object.keys(events[1]).includes('oldEntries'));
  events[1].entries = [];
  assert.deepEqual(events[1].entries, []);
  assert.equal(copy.entries.length, 1);
  view.destroy(); data.destroy();
});

test("tree event phases share snapshot arrays without exposing internal entry wrappers", () => {
  const data = new DataStore(); data.parse([{ id: 'a' }]);
  const view = new TreeDataView({ data }), phases = [];
  for (const type of ['invalidate', 'change', 'afterChange']) view.events.on(type, event => phases.push(event));
  data.update('a', { value: 1 }, { origin: 'import', userAction: true });
  assert.deepEqual(phases.map(event => event.type), ['invalidate', 'change', 'change']);
  for (const event of phases) {
    assert.equal(event.entries, phases[0].entries);
    assert.equal(event.oldEntries, phases[0].oldEntries);
    assert.equal(event.ids, phases[0].ids);
    assert.equal(event.origin, 'import'); assert.equal(event.reason, 'update');
    assert.equal(event.userAction, true);
    event.entries[0].expanded = true;
    assert.equal(view.getEntry('a').expanded, false);
  }
  data.update('a', { value: 2 }, { silent: true });
  assert.equal(phases.length, 4); assert.equal(phases[3].silent, true);
  assert.equal(phases[3].oldEntries[0].expanded, false);
  view.destroy(); data.destroy();
});
