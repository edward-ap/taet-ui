import test from "node:test";
import assert from "node:assert/strict";

import { DataStore } from "../src/core/DataStore.js";
import { TreeDataView } from "../src/core/TreeDataView.js";

test("TreeDataView returns flattened visible entries", () => {
  const data = createTreeStore();
  const view = new TreeDataView({
    data,
    expandedIds: ["sources"]
  });

  assert.deepEqual(view.entries().map(entry => entry.id), [
    "sources",
    "customer",
    "orders",
    "mapping"
  ]);
  assert.deepEqual(
    view.entries().map(entry => entry.level),
    [0, 1, 1, 0]
  );
  assert.equal(view.getEntry("sources").hasChildren, true);
  assert.equal(view.getEntry("sources").expanded, true);
});

test("TreeDataView expand and collapse update visible projection", () => {
  const data = createTreeStore();
  const view = new TreeDataView({ data });
  const events = [];

  view.events.on("change", event => events.push(event));

  assert.deepEqual(view.entries().map(entry => entry.id), ["sources", "mapping"]);
  assert.equal(view.expand("sources"), true);
  assert.deepEqual(view.entries().map(entry => entry.id), [
    "sources",
    "customer",
    "orders",
    "mapping"
  ]);
  assert.equal(view.collapse("sources"), true);
  assert.deepEqual(view.entries().map(entry => entry.id), ["sources", "mapping"]);
  assert.equal(events.length, 2);
});

test("TreeDataView reacts to source data changes", () => {
  const data = createTreeStore();
  const view = new TreeDataView({
    data,
    expandedIds: ["sources"]
  });
  const events = [];

  view.events.on("change", event => events.push(event));
  data.add({ id: "products", parentId: "sources", text: "Products" });

  assert.deepEqual(view.entries().map(entry => entry.id), [
    "sources",
    "customer",
    "orders",
    "products",
    "mapping"
  ]);
  assert.equal(events.length, 1);
});

test("TreeDataView filter keeps matching descendants and their ancestors", () => {
  const view = new TreeDataView({ data:createTreeStore() });

  view.setFilter(item => item.id === "customer");

  assert.deepEqual(view.entries().map(entry => entry.id), ["sources", "customer"]);
});

test("TreeDataView sort orders siblings without flattening hierarchy", () => {
  const view = new TreeDataView({ data:createTreeStore(), expandedIds:["sources"] });

  view.setSort((left, right) => String(right.id).localeCompare(String(left.id)));

  assert.deepEqual(view.entries().map(entry => entry.id), ["sources", "orders", "customer", "mapping"]);
});

test("TreeDataView rejects operations after destroy", () => {
  const view = new TreeDataView({ data: createTreeStore() });

  view.destroy();

  assert.equal(view.destroyed, true);
  assert.throws(() => view.entries(), /destroyed TreeDataView/);
});

function createTreeStore() {
  const data = new DataStore();

  data.parse([
    { id: "sources", parentId: null, text: "Sources" },
    { id: "customer", parentId: "sources", text: "Customer" },
    { id: "orders", parentId: "sources", text: "Orders" },
    { id: "mapping", parentId: null, text: "Mapping" }
  ]);

  return data;
}
