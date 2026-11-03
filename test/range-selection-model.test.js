import test from "node:test";
import assert from "node:assert/strict";
import { RangeSelectionModel } from "../src/core/RangeSelectionModel.js";

test("RangeSelectionModel stores anchor/focus ranges", () => {
  const model = new RangeSelectionModel();
  model.set({
    anchor: { rowId: "a", columnId: "name" },
    focus: { rowId: "c", columnId: "amount" }
  });
  assert.deepEqual(model.primary(), {
    anchor: { rowId: "a", columnId: "name" },
    focus: { rowId: "c", columnId: "amount" }
  });
  model.add({
    from: { rowId: "d", columnId: "name" },
    to: { rowId: "d", columnId: "name" }
  });
  assert.equal(model.get().length, 2);
});
