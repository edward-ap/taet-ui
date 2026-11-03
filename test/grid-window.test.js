import test from "node:test";
import assert from "node:assert/strict";
import { columnWindow, rowOffsets, windowRange } from "../src/ui/gridWindowGeometry.js";
import { GridGroupModel } from "../src/core/GridGroupModel.js";

test("row window accounts for tall details, exact boundaries and empty data", () => {
  const offsets = rowOffsets([24, 300, 24, 24, 24]);
  assert.deepEqual(windowRange(offsets, 200, 130, 0), { start: 1, end: 3, topHeight: 24, bottomHeight: 48 });
  assert.deepEqual(windowRange(offsets, 324, 24, 1), { start: 1, end: 5, topHeight: 24, bottomHeight: 0 });
  assert.deepEqual(windowRange([0], 0, 400, 6), { start: 0, end: 0, topHeight: 0, bottomHeight: 0 });
  assert.deepEqual(windowRange(offsets, 200, 130, 0, false), { start: 0, end: 5, topHeight: 0, bottomHeight: 0 });
});

test("column window retains both frozen edges and overscan with unequal widths", () => {
  const columns = Array.from({ length: 10 }, (_, id) => ({ id, frozen: id === 0 ? "left" : id === 9 ? "right" : null }));
  const layout = columnWindow(columns, [50, 100, 100, 100, 200, 100, 100, 100, 100, 70], 350, 200);
  assert.deepEqual(layout.visible.map(track => track.column.id), [0, 3, 4, 5, 9]);
  assert.equal(layout.totalWidth, 1020);
  assert.equal(layout.frozenLeft, 50);
  assert.equal(layout.frozenRight, 70);
  assert.equal(columnWindow(columns, columns.map(() => 100), 500, 200, 1, false).visible.length, 10);
});

test("silent grouping invalidates its consumers without a semantic change event", () => {
  const groups = new GridGroupModel();
  const invalidations = [], changes = [];
  groups.events.on("invalidate", event => invalidations.push(event.operation));
  groups.events.on("change", event => changes.push(event));
  groups.set(["category"], { silent: true });
  groups.toggle("/category:A", { silent: true });
  groups.restoreState({ rules: [], collapsed: [] }, { silent: true });
  assert.deepEqual(invalidations, ["rules", "toggle", "restore"]);
  assert.deepEqual(changes, []);
  groups.destroy();
});
