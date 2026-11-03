import test from "node:test";
import assert from "node:assert/strict";

import { DataStore } from "../src/core/DataStore.js";
import { DataView } from "../src/core/DataView.js";

test("DataView projects filtered and sorted DataStore items", () => {
  const store = new DataStore();
  store.parse([
    { id: "low", name: "Low", active: true, priority: 1 },
    { id: "high", name: "High", active: true, priority: 3 },
    { id: "off", name: "Off", active: false, priority: 2 }
  ]);

  const view = new DataView({
    data: store,
    filter: item => item.active,
    sort: (left, right) => right.priority - left.priority
  });

  assert.deepEqual(view.all().map(item => item.id), ["high", "low"]);
  assert.equal(view.get("off"), undefined);
  assert.equal(view.get("high").name, "High");
  assert.equal(view.indexOf("low"), 1);
});

test("DataView emits change when source data changes visible projection", () => {
  const store = new DataStore();
  store.parse([
    { id: "a", active: true },
    { id: "b", active: false }
  ]);

  const view = new DataView({
    data: store,
    filter: item => item.active
  });

  const events = [];
  view.events.on("change", event => events.push(event));

  store.update("b", { active: true }, { origin: "api" });

  assert.deepEqual(view.all().map(item => item.id), ["a", "b"]);
  assert.equal(events.length, 1);
  assert.deepEqual(events[0].oldIds, ["a"]);
  assert.deepEqual(events[0].ids, ["a", "b"]);
});

test("DataView emits change when visible item object changes without id order change", () => {
  const store = new DataStore();
  store.parse([{ id: "a", value: 1 }]);
  const view = new DataView({ data: store });
  const events = [];

  view.events.on("change", event => events.push(event));
  store.update("a", { value: 2 });

  assert.equal(events.length, 1);
  assert.deepEqual(events[0].oldIds, ["a"]);
  assert.deepEqual(events[0].ids, ["a"]);
  assert.equal(view.get("a").value, 2);
});

test("DataView stays synchronized after silent DataStore mutation without public change", () => {
  const store = new DataStore();
  const view = new DataView({ data: store });
  const events = [];

  view.events.on("change", event => events.push(event));
  store.parse([{ id: "a", value: 1 }], { silent: true });

  assert.deepEqual(view.all(), [{ id: "a", value: 1 }]);
  assert.equal(events.length, 0);
});

test("DataView setFilter and setSort rebuild projection", () => {
  const store = new DataStore();
  store.parse([
    { id: "a", rank: 2 },
    { id: "b", rank: 1 },
    { id: "c", rank: 3 }
  ]);
  const view = new DataView({ data: store });

  view.setFilter(item => item.rank >= 2);
  assert.deepEqual(view.all().map(item => item.id), ["a", "c"]);

  view.setSort((left, right) => right.rank - left.rank);
  assert.deepEqual(view.all().map(item => item.id), ["c", "a"]);
});

test("DataView applies paging after filter and sort projection", () => {
  const store = new DataStore();
  store.parse(
    Array.from({ length: 12 }, (_, index) => ({
      id: `row-${index + 1}`,
      value: index + 1,
      active: index % 2 === 0
    }))
  );
  const view = new DataView({ data: store, pageSize: 3, page: 2 });

  assert.deepEqual(view.all().map(item => item.id), ["row-4", "row-5", "row-6"]);
  assert.deepEqual(view.getPageState(), {
    enabled: true,
    page: 2,
    pageSize: 3,
    pageCount: 4,
    filteredCount: 12,
    pageItemCount: 3,
    from: 4,
    to: 6,
    canGoFirst: true,
    canGoPrevious: true,
    canGoNext: true,
    canGoLast: true
  });

  view.setFilter(item => item.active);
  assert.equal(view.getPageState().page, 1);
  assert.equal(view.getPageState().filteredCount, 6);
  assert.deepEqual(view.all().map(item => item.id), ["row-1", "row-3", "row-5"]);

  view.setSort((left, right) => right.value - left.value);
  assert.equal(view.getPageState().page, 1);
  assert.deepEqual(view.all().map(item => item.id), ["row-11", "row-9", "row-7"]);
});

test("DataView reports old and new page state and clamps the last page", () => {
  const store = new DataStore();
  store.parse(Array.from({ length: 7 }, (_, index) => ({ id: index + 1 })));
  const view = new DataView({ data: store, pageSize: 3 });
  const events = [];
  view.events.on("change", event => events.push(event));

  assert.equal(view.setPage(3, { origin: "user" }), true);
  assert.equal(events[0].oldPageState.page, 1);
  assert.equal(events[0].pageState.page, 3);
  assert.deepEqual(view.all().map(item => item.id), [7]);

  store.remove(7);
  assert.equal(view.getPageState().page, 2);
  assert.equal(view.getPageState().pageCount, 2);
  assert.deepEqual(view.all().map(item => item.id), [4, 5, 6]);
});

test("DataView rejects operations after destroy", () => {
  const store = new DataStore();
  const view = new DataView({ data: store });

  view.destroy();

  assert.equal(view.destroyed, true);
  assert.throws(() => view.all(), /destroyed DataView/);
});

test("DataView page lookups retain typed custom-field IDs through incremental updates", () => {
  const store = new DataStore({ idField: "key" });
  store.parse([{ key: 1 }, { key: "1" }, { key: 2 }, { key: "2" }, { key: 3 }]);
  const view = new DataView({ data: store, pageSize: 2, page: 2 });
  assert.equal(view.get(1), undefined);
  assert.equal(view.get(2), store.get(2));
  assert.equal(view.get("2"), store.get("2"));
  assert.equal(view.indexOf(2), 0);
  assert.equal(view.indexOf("2"), 1);
  store.update(1, { label: "off page" });
  store.update("2", { label: "visible" });
  assert.equal(view.get(1), undefined);
  assert.equal(view.get("2").label, "visible");
  view.setPage(1);
  assert.equal(view.get(1).label, "off page");
  assert.equal(view.get("1"), store.get("1"));
  view.setPage(3);
  store.remove(3);
  assert.equal(view.getPageState().page, 2);
  assert.deepEqual(view.all().map(item => item.key), [2, "2"]);
  store.clear();
  assert.deepEqual(view.all(), []);
  assert.equal(view.get("2"), undefined);
  view.destroy(); store.destroy();
});

test("DataView custom identity keeps source filter indices and page-local lookup indices", () => {
  const store = new DataStore({ getId: (item, index) => `${item.key}:${index}` });
  store.parse([{ key: "a", rank: 1 }, { key: "b", rank: 2 }, { key: "c", rank: 3 }]);
  const seen = [];
  const view = new DataView({ data: store, pageSize: 1, page: 2,
    filter: (item, context) => { seen.push(context.id); return true; },
    sort: (left, right) => right.rank - left.rank
  });
  assert.deepEqual(seen, ["a:0", "b:1", "c:2"]);
  assert.equal(view.get("b:0"), store.all()[1]);
  assert.equal(view.get("b:1"), undefined);
  assert.equal(view.indexOf("b:0"), 0);
  view.setPage(3);
  assert.equal(view.get("a:0"), store.all()[0]);
  assert.equal(view.get("b:0"), undefined);
  view.destroy(); store.destroy();
});
