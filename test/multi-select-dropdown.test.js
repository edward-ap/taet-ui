import assert from "node:assert/strict";
import test from "node:test";

import { MultiSelectDropDown } from "../src/ui/MultiSelectDropDown.js";

test("MultiSelectDropDown exposes an immutable-style array value", () => {
  const control = new MultiSelectDropDown({ value: ["north", "east", "north"] });
  assert.deepEqual(control.value.get(), ["north", "east"]);

  const value = control.value.get();
  value.push("west");
  assert.deepEqual(control.value.get(), ["north", "east"]);
});

test("MultiSelectDropDown adds, removes, clears and tracks dirty state", () => {
  const control = new MultiSelectDropDown({ value: ["north"] });
  control.data.parse([
    { id: "north", text: "North" },
    { id: "south", text: "South" }
  ]);

  assert.equal(control.isDirty(), false);
  assert.equal(control.addValue("south"), true);
  assert.deepEqual(control.value.get(), ["north", "south"]);
  assert.equal(control.isDirty(), true);
  assert.equal(control.removeValue("north"), true);
  assert.deepEqual(control.value.get(), ["south"]);
  control.value.clear();
  assert.deepEqual(control.value.get(), []);
});

test("MultiSelectDropDown emits array and item details", () => {
  const control = new MultiSelectDropDown();
  control.data.parse([
    { id: "north", text: "North" },
    { id: "south", text: "South" }
  ]);
  let change;
  control.events.on("change", event => {
    change = event;
  });

  control.value.set(["north", "south"], { origin: "import" });
  assert.deepEqual(change.oldValue, []);
  assert.deepEqual(change.newValue, ["north", "south"]);
  assert.deepEqual(change.newItems.map(item => item.id), ["north", "south"]);
});
