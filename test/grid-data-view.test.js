import test from "node:test";
import assert from "node:assert/strict";

import { DataStore } from "../src/core/DataStore.js";
import { DataView } from "../src/core/DataView.js";
import { Grid } from "../src/ui/Grid.js";
import { GridCore } from "../src/ui/GridCore.js";
import { gridEditors } from "../src/ui/GridEditors.js";

test("Grid uses GridCore shared mechanics", () => {
  const grid = new Grid({ columns: [{ id: "name" }] });

  assert.ok(grid instanceof GridCore);
  assert.equal(grid._visibleColumns()[0].id, "name");
});

test("Grid accepts DataView and uses it as visible projection", () => {
  const data = new DataStore();
  data.parse([
    { id: "draft", status: "draft" },
    { id: "active", status: "active" }
  ]);
  const view = new DataView({
    data,
    filter: item => item.status === "active"
  });
  const grid = new Grid({
    view,
    columns: [{ id: "status" }]
  });

  assert.equal(grid.data, data);
  assert.equal(grid.view, view);
  assert.deepEqual(grid._visibleItems().map(item => item.id), ["active"]);
});

test("Grid emits viewChange when DataView projection changes", () => {
  const grid = new Grid({
    columns: [{ id: "status" }]
  });
  const events = [];

  grid.view.setFilter(item => item.status === "active", { silent: true });
  grid.events.on("viewChange", event => events.push(event));

  grid.data.parse([
    { id: "draft", status: "draft" },
    { id: "active", status: "active" }
  ]);

  assert.equal(events.length, 1);
  assert.deepEqual(grid._visibleItems().map(item => item.id), ["active"]);
});

test("Grid rejects view/data mismatch", () => {
  const data = new DataStore();
  const otherData = new DataStore();
  const view = new DataView({ data: otherData });

  assert.throws(
    () =>
      new Grid({
        data,
        view,
        columns: [{ id: "name" }]
      }),
    /same DataStore/
  );
});

test("Grid computes virtual row render range with overscan", () => {
  const grid = new Grid({
    columns: [{ id: "name" }],
    rowHeight: 20,
    virtualOverscan: 2
  });

  grid._body = {
    clientHeight: 100,
    scrollTop: 200
  };

  assert.deepEqual(grid._getRenderRange(100), {
    start: 8,
    end: 17,
    topHeight: 160,
    bottomHeight: 1660,
    rowHeight: 20
  });
});

test("Grid selects rows by id through the visible DataView", () => {
  const grid = new Grid({
    multiSelect: true,
    columns: [{ id: "status" }]
  });

  grid.data.parse([
    { id: "draft", status: "draft" },
    { id: "active", status: "active" },
    { id: "done", status: "done" }
  ]);
  grid.setFilter(item => item.status !== "draft", { silent: true });

  assert.equal(grid.setSelectedIds(["draft", "done"]), true);
  assert.deepEqual(grid.getSelectedIds(), ["done"]);
});

test("Grid starts without an active row or active cell", () => {
  const grid = new Grid({
    columns: [{ id: "name" }]
  });

  grid.data.parse([
    { id: "a", name: "Alpha" },
    { id: "b", name: "Beta" }
  ]);

  assert.equal(grid._activeId, null);
  assert.equal(grid.getStatusBarState().rowIndex, 0);

  grid._handleKeyDown({
    key: "ArrowDown",
    preventDefault() {}
  });

  assert.equal(grid._activeId, "a");
});

test("GridCore mirrors a layout scrollbar gutter into header geometry", () => {
  const grid = new Grid({ columns:[{ id:"name" }] });
  let gutter = null;
  grid.element = {
    style:{ setProperty:(name, value) => { if (name === "--dui-grid-scrollbar-gutter") gutter = value; } }
  };
  grid._body = { offsetWidth:300, clientWidth:286 };
  grid._syncScrollbarGutter();
  assert.equal(gutter, "14px");
  grid.element = null;
  grid._body = null;
  grid.destroy();
});

test("Grid sortBy delegates sorting to DataView and tracks sort state", () => {
  const grid = new Grid({
    columns: [{ id: "name", sortable: true }]
  });

  grid.data.parse([
    { id: "b", name: "Beta" },
    { id: "a", name: "Alpha" },
    { id: "c", name: "Gamma" }
  ]);

  assert.equal(grid.sortBy("name", "asc"), true);
  assert.deepEqual(grid._visibleItems().map(item => item.id), ["a", "b", "c"]);
  assert.deepEqual(grid.getSortState(), { columnId: "name", direction: "asc" });

  assert.equal(grid.sortBy("name", "desc"), true);
  assert.deepEqual(grid._visibleItems().map(item => item.id), ["c", "b", "a"]);

  assert.equal(grid.clearSort(), true);
  assert.deepEqual(grid._visibleItems().map(item => item.id), ["b", "a", "c"]);
  assert.equal(grid.getSortState(), null);
});

test("Grid requests a paint after silent DataView projection change without public viewChange", () => {
  const grid = new Grid({
    columns: [{ id: "status" }]
  });
  let renderCount = 0;
  let viewChangeCount = 0;

  grid.data.parse([
    { id: "draft", status: "draft" },
    { id: "active", status: "active" }
  ]);
  grid._windowRenderer.request = () => {
    renderCount += 1;
  };
  grid.events.on("viewChange", () => {
    viewChangeCount += 1;
  });

  grid.setFilter(item => item.status === "active", { silent: true });

  assert.deepEqual(grid.view.all().map(item => item.id), ["active"]);
  assert.equal(renderCount, 1);
  assert.equal(viewChangeCount, 0);
});

test("Grid applies initial sortState to DataView", () => {
  const data = new DataStore();
  data.parse([
    { id: "b", name: "Beta" },
    { id: "a", name: "Alpha" }
  ]);

  const grid = new Grid({
    data,
    sortState: { columnId: "name", direction: "asc" },
    columns: [{ id: "name", sortable: true }]
  });

  assert.deepEqual(grid.view.all().map(item => item.id), ["a", "b"]);
  assert.deepEqual(grid.getSortState(), { columnId: "name", direction: "asc" });
  assert.equal(typeof grid.view.getSort(), "function");
});

test("Grid supports stable multi-column sorting", () => {
  const grid = new Grid({
    columns: [
      { id: "group", sortable: true },
      { id: "rank", sortable: true, dataType: "number" }
    ]
  });

  grid.data.parse([
    { id: "a2", group: "A", rank: 2 },
    { id: "b1", group: "B", rank: 1 },
    { id: "a1", group: "A", rank: 1 }
  ]);

  grid.setSortModel([
    { columnId: "group", direction: "asc" },
    { columnId: "rank", direction: "asc" }
  ]);

  assert.deepEqual(grid.view.all().map(item => item.id), ["a1", "a2", "b1"]);
  assert.deepEqual(grid.getSortModel(), [
    { columnId: "group", direction: "asc" },
    { columnId: "rank", direction: "asc" }
  ]);
  assert.deepEqual(grid.getSortState(), { columnId: "group", direction: "asc" });
});

test("Grid layout state restores column order, width, visibility, and frozen side", () => {
  const grid = new Grid({
    columns: [
      { id: "name", width: 120 },
      { id: "status", width: 90 }
    ]
  });
  const events = [];
  grid.events.on("layoutChange", event => events.push(event));

  grid.moveColumn("status", 0);
  grid.hideColumn("name");
  grid.freezeColumn("status", "left");

  const state = grid.getLayoutState();
  assert.deepEqual(state.columns, [
    { id: "status", order: 0, width: 90, hidden: false, frozen: "left" },
    { id: "name", order: 1, width: 120, hidden: true, frozen: null }
  ]);
  assert.equal(events.length, 3);

  const restored = new Grid({
    columns: [
      { id: "name", width: 20 },
      { id: "status", width: 20 }
    ]
  });
  restored.restoreLayoutState(state);

  assert.deepEqual(restored.columnModel.getState(), state.columns);
  assert.deepEqual(restored._visibleColumns().map(column => column.id), ["status"]);
});

test("Grid column drop reorders only inside the same frozen zone", () => {
  const grid = new Grid({
    columns: [
      { id: "a" },
      { id: "b" },
      { id: "fixed", frozen: "right" }
    ]
  });
  const controller = grid._columnReorderController;
  const header = {classList:{add(){},remove(){}}, getBoundingClientRect:()=>({left:0,width:100})};
  const event = {target:{closest:()=>null},currentTarget:header,clientX:75,preventDefault(){}};
  assert.equal(controller.start(event, grid.getColumn("a")), true);
  assert.equal(controller.over(event, grid.getColumn("b"), header), true);
  assert.equal(controller.drop(event, grid.getColumn("b")), true);
  assert.deepEqual(grid.columns.map(column => column.id), ["b", "a", "fixed"]);

  assert.equal(controller.start(event, grid.getColumn("a")), true);
  assert.equal(controller.over(event, grid.getColumn("fixed"), header), false);
  assert.equal(controller.drop(event, grid.getColumn("fixed")), false);
  assert.deepEqual(grid.columns.map(column => column.id), ["b", "a", "fixed"]);
  grid.destroy();
});

test("Grid rejects invalid initial sortState", () => {
  assert.throws(
    () =>
      new Grid({
        sortState: { columnId: "missing", direction: "asc" },
        columns: [{ id: "name", sortable: true }]
      }),
    /initial sort column/
  );
});

test("Grid cell scrolling keeps the active row at its nearest vertical position", () => {
  const grid = new Grid({
    columns: [{ id: "name" }]
  });
  grid._body = { scrollTop: 100, clientHeight: 200 };
  const renderer = grid._windowRenderer;
  renderer.offsets = [0, 100, 200, 400];
  renderer.rowIndices = new Map([["above", 0], ["visible", 1], ["below", 2]]);
  renderer.scrollToRow("visible");
  assert.equal(grid._body.scrollTop, 100);
  renderer.scrollToRow("below");
  assert.equal(grid._body.scrollTop, 200);
  renderer.scrollToRow("above");
  assert.equal(grid._body.scrollTop, 0);
});

test("Grid composes global and per-column filters", () => {
  const grid = new Grid({
    columns: [
      { id: "status", filterable: true },
      { id: "active", filterable: true }
    ]
  });

  grid.data.parse([
    { id: "a", status: "active", active: true },
    { id: "b", status: "review", active: true },
    { id: "c", status: "active", active: false }
  ]);
  grid.setFilter(item => item.active);
  grid.setColumnFilter("status", {
    kind: "values",
    values: ["active"]
  });

  assert.deepEqual(grid.view.all().map(item => item.id), ["a"]);

  grid.clearColumnFilter("status");
  assert.deepEqual(grid.view.all().map(item => item.id), ["a", "b"]);
});

test("Grid search highlights without filtering and filters through DataView on demand", () => {
  const grid = new Grid({
    columns: [{ id: "name" }, { id: "status", searchable: false }]
  });
  grid.data.parse([
    { id: "a", name: "Alpha", status: "hidden match" },
    { id: "b", name: "Beta", status: "Alpha" }
  ]);

  grid.search.set("alpha");
  assert.deepEqual(grid.view.all().map(item => item.id), ["a", "b"]);
  assert.deepEqual(grid._getSearchMatches().map(match => match.rowId), ["a"]);

  grid.search.setMode("filter");
  assert.deepEqual(grid.view.all().map(item => item.id), ["a"]);
  grid.search.clear();
  assert.deepEqual(grid.view.all().map(item => item.id), ["a", "b"]);
});

test("Grid search navigation moves to the page containing the next result", () => {
  const grid = new Grid({
    statusBar: { visible: true, pagination: { pageSize: 1 } },
    columns: [{ id: "name" }]
  });
  grid.data.parse([
    { id: "a", name: "Alpha" },
    { id: "b", name: "Beta target" }
  ]);
  grid.search.set("target");
  assert.equal(grid.nextSearchMatch(), true);
  assert.equal(grid.getPageState().page, 2);
  assert.equal(grid._activeId, "b");
});

test("Grid beforeFilterChange can cancel column filter", () => {
  const grid = new Grid({
    columns: [{ id: "status", filterable: true }]
  });

  grid.data.parse([{ id: "a", status: "active" }]);
  grid.events.on("beforeFilterChange", event => {
    event.cancel = true;
  });

  assert.equal(
    grid.setColumnFilter("status", {
      kind: "values",
      values: ["active"]
    }),
    false
  );
  assert.equal(grid.filters.hasAny(), false);
});

test("Grid removes filters for columns removed by setColumns", () => {
  const grid = new Grid({
    columns: [
      { id: "status", filterable: true },
      { id: "name" }
    ]
  });

  grid.data.parse([
    { id: "a", status: "active", name: "Alpha" },
    { id: "b", status: "draft", name: "Beta" }
  ]);
  grid.setColumnFilter("status", {
    kind: "values",
    values: ["active"]
  });
  grid.setColumns([{ id: "name" }]);

  assert.equal(grid.filters.hasAny(), false);
  assert.deepEqual(grid.view.all().map(item => item.id), ["a", "b"]);
});

test("Grid status bar state tracks active row and filtered projection", () => {
  const grid = new Grid({
    statusBar: true,
    columns: [{ id: "status", filterable: true }]
  });

  grid.data.parse([
    { id: "a", status: "active" },
    { id: "b", status: "active" },
    { id: "c", status: "draft" }
  ]);
  grid.selectById("b", { silent: true });

  assert.deepEqual(grid.getStatusBarState(), {
    rowIndex: 2,
    rowCount: 3,
    filteredCount: 3,
    totalCount: 3,
    filterActive: false,
    pageState: unpagedState(3)
  });

  grid.setColumnFilter(
    "status",
    {
      kind: "values",
      values: ["active"]
    },
    { silent: true }
  );

  assert.deepEqual(grid.getStatusBarState(), {
    rowIndex: 2,
    rowCount: 2,
    filteredCount: 2,
    totalCount: 3,
    filterActive: true,
    pageState: unpagedState(2)
  });
});

test("Grid pagination delegates to DataView and emits pageChange", () => {
  const grid = new Grid({
    statusBar: {
      pagination: {
        pageSize: 2,
        pageSizes: [2, 5]
      }
    },
    columns: [{ id: "name" }]
  });
  grid.data.parse(
    Array.from({ length: 5 }, (_, index) => ({ id: index + 1, name: `Row ${index + 1}` }))
  );
  const events = [];
  grid.events.on("pageChange", event => events.push(event));

  assert.deepEqual(grid.view.all().map(item => item.id), [1, 2]);
  assert.equal(grid.getStatusBarState().filteredCount, 5);
  assert.equal(grid.getPageState().pageCount, 3);

  assert.equal(grid.nextPage({ origin: "user" }), true);
  assert.deepEqual(grid.view.all().map(item => item.id), [3, 4]);
  assert.equal(events.length, 1);
  assert.equal(events[0].oldPageState.page, 1);
  assert.equal(events[0].pageState.page, 2);
  assert.equal(events[0].userAction, true);

  assert.equal(grid.setPageSize(5), true);
  assert.equal(grid.getPageState().page, 1);
  assert.equal(grid.getPageState().pageCount, 1);
  assert.deepEqual(grid.view.all().map(item => item.id), [1, 2, 3, 4, 5]);
});

test("Grid validates status bar options", () => {
  assert.throws(
    () =>
      new Grid({
        statusBar: "visible",
        columns: []
      }),
    /statusBar must be boolean or an options object/
  );

  assert.throws(
    () =>
      new Grid({
        statusBar: { pagination: { pageSize: 0 } },
        columns: []
      }),
    /pageSize must be a positive integer/
  );
});

test("Grid manages configurable column summaries", () => {
  const grid = new Grid({
    columns: [
      { id: "name", summary: "count" },
      { id: "amount", filterType: "number", summary: "total" }
    ]
  });
  const events = [];
  grid.events.on("summaryChange", event => events.push(event));

  assert.equal(grid.getColumnSummary("name"), "count");
  assert.equal(grid.getColumnSummary("amount"), "total");
  assert.equal(grid.setColumnSummary("name", "none", { origin: "user" }), true);
  assert.equal(grid.getColumnSummary("name"), null);
  assert.equal(events.length, 1);
  assert.equal(events[0].oldSummary, "count");
  assert.equal(events[0].summary, null);
  assert.equal(events[0].userAction, true);

  grid.events.on("beforeSummaryChange", event => {
    if (event.columnId === "amount") {
      event.cancel = true;
    }
  });
  assert.equal(grid.setColumnSummary("amount", "none"), false);
  assert.equal(grid.getColumnSummary("amount"), "total");
});

test("Grid rejects total summary for non-numeric columns", () => {
  assert.throws(
    () => new Grid({ columns: [{ id: "name", summary: "total" }] }),
    /total summary requires a numeric column/
  );
});

test("Grid copies and pastes rectangular TSV ranges with typed values", () => {
  const grid = new Grid({
    columns: [
      { id: "name", editor: gridEditors.text() },
      { id: "amount", editor: gridEditors.number(), dataType: "number", filterType: "number" }
    ]
  });
  grid.data.parse([
    { id: "a", name: "Alpha", amount: 1 },
    { id: "b", name: "Beta", amount: 2 }
  ]);
  grid.setCellRanges({
    anchor: { rowId: "a", columnId: "name" },
    focus: { rowId: "b", columnId: "amount" }
  });
  assert.equal(grid.getClipboardText(), "Alpha\t1\r\nBeta\t2");

  grid.setCellRanges({
    anchor: { rowId: "a", columnId: "name" },
    focus: { rowId: "a", columnId: "name" }
  });
  assert.equal(grid.pasteClipboardText("Gamma\t42\r\nDelta\t84"), true);
  assert.deepEqual(grid.data.all(), [
    { id: "a", name: "Gamma", amount: 42 },
    { id: "b", name: "Delta", amount: 84 }
  ]);
});

test("Grid summaries support aggregate kinds and filtered scope beyond current page", () => {
  const grid = new Grid({
    statusBar: { visible: true, pagination: { pageSize: 1 } },
    columns: [{
      id: "amount",
      dataType: "number",
      filterType: "number",
      summary: { kind: "average", scope: "filtered" }
    }]
  });
  grid.data.parse([
    { id: "a", amount: 10 },
    { id: "b", amount: 20 },
    { id: "c", amount: 100 }
  ]);
  grid.setFilter(item => item.amount < 100, { silent: true });
  const column = grid.getColumn("amount");
  assert.equal(grid.getColumnSummaryValue(column.id), "Avg 15");
  grid.setColumnSummary("amount", { kind: "max", scope: "all" });
  assert.equal(grid.getColumnSummaryValue(column.id), "Max 100");
});

function unpagedState(itemCount) {
  return {
    enabled: false,
    page: 1,
    pageSize: null,
    pageCount: 1,
    filteredCount: itemCount,
    pageItemCount: itemCount,
    from: itemCount === 0 ? 0 : 1,
    to: itemCount,
    canGoFirst: false,
    canGoPrevious: false,
    canGoNext: false,
    canGoLast: false
  };
}
