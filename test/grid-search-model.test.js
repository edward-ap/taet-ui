import test from "node:test";
import assert from "node:assert/strict";
import { GridSearchModel } from "../src/core/GridSearchModel.js";

test("GridSearchModel tracks query, mode, and columns", () => {
  const search = new GridSearchModel();
  search.set("alpha");
  search.setMode("filter");
  search.setColumns(["name", "status", "name"]);
  assert.deepEqual(search.getState(), {
    query: "alpha",
    mode: "filter",
    columns: ["name", "status"]
  });
});
