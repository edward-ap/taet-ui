import test from "node:test";
import assert from "node:assert/strict";

import { SelectionModel } from "../src/core/SelectionModel.js";

test("SelectionModel single mode rejects multiple items", () => {
  const selection = new SelectionModel();

  assert.throws(
    () => selection.set(["a", "b"]),
    /single mode accepts at most one item/
  );
});

test("SelectionModel multiple mode keeps unique items", () => {
  const selection = new SelectionModel({ multiple: true });

  assert.equal(selection.set(["a", "a", "b"]), true);
  assert.deepEqual(selection.get(), ["a", "b"]);
});
