import test from "node:test";
import assert from "node:assert/strict";
import { DataStore } from "../src/core/DataStore.js";
import { GridDataProvider } from "../src/core/GridDataProvider.js";
import { GridGroupModel } from "../src/core/GridGroupModel.js";
import { Grid } from "../src/ui/Grid.js";
import { gridExporters } from "../src/ui/GridExporters.js";

test("DataStore batch emits one change and supports undo/redo", () => {
  const data = new DataStore();
  data.parse([{ id:"a", value:1 }, { id:"b", value:2 }]);
  let invalidations = 0;
  data.events.on("invalidate", () => invalidations += 1);
  data.batch(() => {
    data.update("a", { value:10 });
    data.update("b", { value:20 });
  }, { origin:"user" });
  assert.equal(invalidations, 1);
  assert.equal(data.canUndo(), true);
  data.undo();
  assert.deepEqual(data.all().map(item => item.value), [1, 2]);
  data.redo();
  assert.deepEqual(data.all().map(item => item.value), [10, 20]);
});

test("GridGroupModel creates nested collapsible group entries", () => {
  const model = new GridGroupModel({ rules:["status"] });
  const items = [{ status:"Open" }, { status:"Open" }, { status:"Done" }];
  const entries = model.entries(items, (item, column) => item[column]);
  assert.deepEqual(entries.filter(entry => entry.type === "group").map(entry => entry.count), [2, 1]);
  model.toggle(entries[0].path);
  assert.equal(model.entries(items, (item, column) => item[column]).filter(entry => entry.type === "item").length, 1);
});

test("Grid exports projected data as CSV and workbook model", () => {
  const grid = new Grid({ columns:[{ id:"name", title:"Name" }, { id:"note", title:"Note" }] });
  grid.data.parse([{ id:"a", name:"Alpha", note:"a,b" }]);
  assert.equal(grid.exportData(gridExporters.csv()), 'Name,Note\r\nAlpha,"a,b"');
  assert.deepEqual(grid.exportData(gridExporters.workbook()).sheets[0].rows, [["Alpha", "a,b"]]);
});

test("GridDataProvider validates async responses", async () => {
  const provider = new GridDataProvider(async request => ({
    items:[{ id:"a", page:request.page }], totalCount:100
  }));
  const response = await provider.request({ page:2, pageSize:10 });
  assert.equal(response.totalCount, 100);
  assert.equal(response.items[0].page, 2);
});
