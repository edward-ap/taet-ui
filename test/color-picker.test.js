import test from "node:test";
import assert from "node:assert/strict";

import {
  ColorPicker,
  normalizeHexColor
} from "../src/ui/ColorPicker.js";

test("ColorPicker stores canonical RGB hex values", () => {
  const picker = new ColorPicker({ value: "#39f" });

  assert.equal(picker.value.get(), "#3399ff");
  assert.deepEqual(picker.getRgb(), {
    red: 51,
    green: 153,
    blue: 255
  });

  picker.setRgb(33, 150, 243);
  assert.equal(picker.value.get(), "#2196f3");
  picker.destroy();
});

test("normalizeHexColor accepts RGB strings and rejects invalid colors", () => {
  assert.equal(normalizeHexColor("rgb(33, 150, 243)"), "#2196f3");
  assert.equal(normalizeHexColor(""), "");
  assert.throws(() => normalizeHexColor("not-a-color"), /Invalid RGB color/);
  assert.throws(() => normalizeHexColor("rgb(300, 0, 0)"), /Invalid RGB color/);
});
