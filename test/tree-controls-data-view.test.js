import test from "node:test";
import assert from "node:assert/strict";

import { DataStore } from "../src/core/DataStore.js";
import { TreeDataView } from "../src/core/TreeDataView.js";
import { GridCore } from "../src/ui/GridCore.js";
import { TreeGrid } from "../src/ui/TreeGrid.js";
import { TreeList } from "../src/ui/TreeList.js";

test("TreeGrid uses GridCore shared mechanics", () => {
  const treeGrid = new TreeGrid({ columns: [{ id: "text" }] });

  assert.ok(treeGrid instanceof GridCore);
  assert.equal(treeGrid._visibleColumns()[0].id, "text");
});

test("TreeGrid accepts TreeDataView and uses visible entries", () => {
  const data = createTreeStore();
  const treeView = new TreeDataView({
    data,
    expandedIds: ["sources"]
  });
  const treeGrid = new TreeGrid({
    treeView,
    columns: [{ id: "text" }]
  });

  assert.equal(treeGrid.data, data);
  assert.equal(treeGrid.treeView, treeView);
  assert.deepEqual(treeGrid._getVisibleEntries().map(entry => entry.id), [
    "sources",
    "customer",
    "orders",
    "mapping"
  ]);
});

test("TreeList accepts TreeDataView and uses visible entries", () => {
  const data = createTreeStore();
  const treeView = new TreeDataView({
    data,
    expandedIds: ["sources"]
  });
  const treeList = new TreeList({ treeView });

  assert.equal(treeList.data, data);
  assert.equal(treeList.treeView, treeView);
  assert.deepEqual(treeList._getVisibleItems().map(entry => entry.id), [
    "sources",
    "customer",
    "orders",
    "mapping"
  ]);
});

test("TreeList moves nodes inside and between siblings through one API", () => {
  const data = createTreeStore();
  const tree = new TreeList({
    data,
    expandedIds: ["sources"]
  });
  const events = [];

  tree.events.on("beforeNodeMove", event =>
    events.push(["before", event.id, event.targetId, event.position])
  );
  tree.events.on("nodeMove", event =>
    events.push(["after", event.id, event.parentId, event.index])
  );

  assert.equal(tree.moveNode("mapping", "sources", "inside"), true);
  assert.equal(data.get("mapping").parentId, "sources");
  assert.deepEqual(tree._getVisibleItems().map(entry => [entry.id, entry.level]), [
    ["sources", 0],
    ["customer", 1],
    ["orders", 1],
    ["mapping", 1]
  ]);
  assert.deepEqual(events, [
    ["before", "mapping", "sources", "inside"],
    ["after", "mapping", "sources", 2]
  ]);

  assert.equal(tree.moveNode("orders", "customer", "before"), true);
  assert.deepEqual(tree._getVisibleItems().map(entry => entry.id), [
    "sources",
    "orders",
    "customer",
    "mapping"
  ]);
  assert.equal(tree.canMoveNode("orders", "customer", "before"), false);
  assert.equal(tree.moveNode("orders", "customer", "before"), false);
  assert.equal(data.canUndo(), true);
  data.undo();
  assert.deepEqual(tree._getVisibleItems().map(entry => entry.id), [
    "sources",
    "customer",
    "orders",
    "mapping"
  ]);
});

test("TreeList rejects cycles and supports domain drop validation and cancellation", () => {
  const data = createTreeStore();
  const tree = new TreeList({
    data,
    expandedIds: ["sources"],
    canDropNode: move => move.targetId !== "mapping"
  });

  assert.equal(tree.canMoveNode("sources", "customer", "inside"), false);
  assert.equal(tree.moveNode("sources", "customer", "inside"), false);
  assert.equal(tree.canMoveNode("orders", "mapping", "inside"), false);
  assert.throws(
    () => tree.moveNode("orders", "customer", "unknown"),
    /before, inside, or after/
  );

  tree.events.on("beforeNodeMove", event => {
    if (event.id === "orders") {
      event.cancel = true;
    }
  });
  assert.equal(tree.moveNode("orders", "customer", "inside"), false);
  assert.equal(data.get("orders").parentId, "sources");
});

test("TreeGrid emits treeViewChange when TreeDataView projection changes", () => {
  const data = createTreeStore();
  const treeGrid = new TreeGrid({
    data,
    columns: [{ id: "text" }]
  });
  const events = [];

  treeGrid.events.on("treeViewChange", event => events.push(event));
  treeGrid.expand("sources");

  assert.equal(events.length, 1);
  assert.deepEqual(treeGrid._getVisibleEntries().map(entry => entry.id), [
    "sources",
    "customer",
    "orders",
    "mapping"
  ]);
});

test("Tree controls reject treeView/data mismatch", () => {
  const data = createTreeStore();
  const otherData = createTreeStore();
  const treeView = new TreeDataView({ data: otherData });

  assert.throws(
    () =>
      new TreeGrid({
        data,
        treeView,
        columns: [{ id: "text" }]
      }),
    /same DataStore/
  );

  assert.throws(
    () =>
      new TreeList({
        data,
        treeView
      }),
    /same DataStore/
  );
});

test("TreeGrid computes virtual row render range with overscan", () => {
  const treeGrid = new TreeGrid({
    columns: [{ id: "text" }],
    rowHeight: 18,
    virtualOverscan: 3
  });

  treeGrid._body = {
    clientHeight: 90,
    scrollTop: 180
  };

  assert.deepEqual(treeGrid._getRenderRange(80), {
    start: 7,
    end: 18,
    topHeight: 126,
    bottomHeight: 1116,
    rowHeight: 18
  });
});

test("TreeGrid selects visible tree rows by id", () => {
  const data = createTreeStore();
  const treeGrid = new TreeGrid({
    data,
    columns: [{ id: "text" }],
    multiSelect: true
  });

  assert.equal(treeGrid.setSelectedIds(["customer", "mapping"]), true);
  assert.deepEqual(treeGrid.getSelectedIds(), ["mapping"]);

  treeGrid.expand("sources", { silent: true });
  assert.equal(treeGrid.setSelectedIds(["customer", "mapping"]), true);
  assert.deepEqual(treeGrid.getSelectedIds(), ["customer", "mapping"]);
});

test("TreeGrid shares column layout state and starts without active cell", () => {
  const tree = new TreeGrid({
    columns:[{ id:"name", frozen:"left" }, { id:"owner", width:90 }]
  });
  tree.data.parse([{ id:"root", name:"Root", owner:"Nora" }]);
  assert.equal(tree._activeId, null);
  tree.hideColumn("owner");
  const state = tree.getLayoutState();
  assert.equal(state.columns[1].hidden, true);
  tree.showColumn("owner");
  tree.restoreLayoutState(state);
  assert.deepEqual(tree._visibleColumns().map(column => column.id), ["name"]);
});

test("TreeGrid column drop reorders only inside the same frozen zone", () => {
  const tree = new TreeGrid({
    columns:[{ id:"name" }, { id:"owner" }, { id:"fixed", frozen:"right" }]
  });
  const controller = tree._columnReorderController;
  const header = {classList:{add(){},remove(){}}, getBoundingClientRect:()=>({left:0,width:100})};
  const event = {target:{closest:()=>null},currentTarget:header,clientX:75,preventDefault(){}};
  assert.equal(controller.start(event, tree.getColumn("name")), true);
  assert.equal(controller.over(event, tree.getColumn("owner"), header), true);
  assert.equal(controller.drop(event, tree.getColumn("owner")), true);
  assert.deepEqual(tree.columns.map(column => column.id), ["owner", "name", "fixed"]);

  assert.equal(controller.start(event, tree.getColumn("name")), true);
  assert.equal(controller.over(event, tree.getColumn("fixed"), header), false);
  assert.equal(controller.drop(event, tree.getColumn("fixed")), false);
  assert.deepEqual(tree.columns.map(column => column.id), ["owner", "name", "fixed"]);
  tree.destroy();
});

test("TreeGrid horizontal navigation preserves the nearest vertical position", () => {
  const tree = new TreeGrid({ columns:[{ id:"a", width:120 }, { id:"b", width:120 }, { id:"c", width:120 }] });
  tree._activeId = "row"; tree._activeColumnId = "c";
  tree._body = { scrollTop: 400, scrollLeft: 0, clientHeight: 240, clientWidth: 120 };
  tree._header = { isConnected: false, children: [] };
  tree._windowRenderer.rowIndices.set("row", 1);
  tree._windowRenderer.offsets = [0, 500, 524];
  tree._renderRows = () => {};
  tree._scrollActiveCellIntoView();
  assert.equal(tree._body.scrollTop, 400);
  assert.equal(tree._body.scrollLeft, 240);
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
