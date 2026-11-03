import { ColorPicker } from "../../src/ui/experimental.js";

export function createColorPicker(container, value = "#2196f3") {
  return new ColorPicker(container, {
    name: "accentColor",
    label: "Accent color",
    value,
    allowEmpty: true
  });
}
