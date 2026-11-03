import test from "node:test";
import assert from "node:assert/strict";

import { CharacterRangeSelectionModel } from "../src/core/CharacterRangeSelectionModel.js";

test("CharacterRangeSelectionModel normalizes direction and uses half-open ranges", () => {
  const selection = new CharacterRangeSelectionModel({ maximum: 20 });

  assert.equal(selection.set({ anchor: 8, focus: 3 }), true);
  assert.deepEqual(selection.get(), {
    anchor: 8,
    focus: 3,
    start: 3,
    end: 8,
    length: 5,
    collapsed: false
  });
  assert.equal(selection.hasSelection(), true);
});

test("CharacterRangeSelectionModel clamps selection when bounds change", () => {
  const selection = new CharacterRangeSelectionModel({
    maximum: 20,
    range: { start: 4, end: 12 }
  });

  selection.setBounds(0, 7);

  assert.deepEqual(selection.get(), {
    anchor: 4,
    focus: 7,
    start: 4,
    end: 7,
    length: 3,
    collapsed: false
  });
});

test("CharacterRangeSelectionModel emits mutation metadata and can be cancelled", () => {
  const selection = new CharacterRangeSelectionModel({ maximum: 20 });
  const events = [];

  selection.events.on("beforeChange", event => {
    if (event.range.start === 9) {
      event.cancel = true;
    }
  });
  selection.events.on("change", event => events.push(event));

  assert.equal(
    selection.set({ start: 2, end: 5 }, { origin: "user", userAction: true }),
    true
  );
  assert.equal(selection.set({ start: 9, end: 10 }), false);
  assert.equal(events.length, 1);
  assert.equal(events[0].origin, "user");
});
