import assert from "node:assert/strict";
import test from "node:test";
import { DataStore } from "../src/core/DataStore.js";

function editedStore() {
  const data = new DataStore();
  data.parse([{ id: "a", value: 1 }]);
  data.batch(() => data.update("a", { value: 2 }));
  return data;
}

for (const operation of ["undo", "redo"]) {
  for (const rejection of ["cancel", "throw"]) {
    test(`${operation} keeps its history entry when restoration is rejected by ${rejection}`, () => {
      const data = editedStore();
      if (operation === "redo") data.undo();
      const before = { items: data.all(), undo: data.canUndo(), redo: data.canRedo() };
      const guard = data.events.on("beforeChange", event => {
        if (event.origin !== operation) return;
        if (rejection === "throw") throw new Error("write rejected");
        event.cancel = true;
      });
      if (rejection === "throw") assert.throws(() => data[operation](), /write rejected/);
      else assert.equal(data[operation](), false);
      assert.deepEqual({ items: data.all(), undo: data.canUndo(), redo: data.canRedo() }, before);
      guard.dispose();
      assert.equal(data[operation](), true);
      assert.equal(data.get("a").value, operation === "undo" ? 1 : 2);
      data.destroy();
    });
  }
}

test("history flags reflect the accepted restoration when change observers run", () => {
  const data = editedStore();
  const states = [];
  data.events.on("change", event => states.push([event.origin, data.canUndo(), data.canRedo()]));
  data.undo();
  data.redo();
  assert.deepEqual(states, [["undo", false, true], ["redo", true, false]]);
  data.destroy();
});
