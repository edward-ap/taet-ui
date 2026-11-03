import assert from "node:assert/strict";
import test from "node:test";

import * as stable from "../src/ui/index.js";
import * as experimental from "../src/ui/experimental.js";
import * as grid from "../src/ui/grid-api.js";
import * as all from "../src/ui/all.js";

test("stable UI entry point excludes experimental controls", () => {
  assert.equal(typeof stable.Button, "function");
  assert.equal(typeof stable.DataStore, "function");
  assert.equal(typeof stable.required, "function");
  assert.equal(typeof stable.email, "function");
  assert.equal(typeof stable.valueInData, "function");
  assert.equal(typeof stable.IconRegistry, "function");
  assert.equal(typeof stable.createIcon, "function");
  assert.equal(typeof stable.renderIcon, "function");
  assert.equal(typeof stable.Layout, "function");
  assert.equal(typeof stable.CheckLetter, "function");
  assert.equal(typeof stable.RadioGroup, "function");
  assert.equal(typeof stable.RadioLetter, "function");
  assert.equal(typeof stable.ReadonlyText, "function");
  assert.equal(typeof stable.ToolbarSpacer, "function");
  assert.equal(stable.icons.has("window.close"), true);
  assert.equal(stable.icons.has("settings"), true);
  assert.equal(stable.icons.has("theme-light"), true);
  assert.equal(stable.icons.has("theme-dark"), true);
  assert.equal("Grid" in stable, false);
  assert.equal("DockLayout" in stable, false);
});

test("experimental and grid entry points expose their intended surfaces", () => {
  assert.equal(typeof experimental.DockLayout, "function");
  assert.equal(typeof experimental.MdiWorkspace, "function");
  assert.equal(typeof experimental.MdiWindow, "function");
  assert.equal(typeof experimental.MultiSelectDropDown, "function");
  assert.equal(typeof experimental.ColorPicker, "function");
  assert.equal(typeof experimental.MapperWindow, "function");
  assert.equal(typeof experimental.StaticPortProvider, "function");
  assert.equal(typeof experimental.ConnectorLayer, "function");
  assert.equal("FlatFileLayoutEditor" in experimental, false);
  assert.equal("FlatFileDesigner" in experimental, false);
  assert.equal(typeof experimental.CharacterRangeSelectionModel, "function");
  assert.equal("normalizeFlatFileDefinition" in experimental, false);
  assert.equal("compileFlatFileDefinition" in experimental, false);
  assert.equal(typeof experimental.Grid, "function");
  assert.equal("GraphViewer" in experimental, false);
  assert.equal(typeof experimental.createHeaderAction, "function");
  assert.equal(typeof experimental.setHeaderAction, "function");
  assert.equal(typeof experimental.TextLayout, "function");
  assert.equal("QuestionPanel" in experimental, false);
  assert.equal("QuestionPanel" in all, false);
  assert.equal(typeof grid.Grid, "function");
  assert.equal("Button" in grid, false);
});

test("all UI entry point composes stable and experimental exports", () => {
  assert.equal(all.Button, stable.Button);
  assert.equal(all.required, stable.required);
  assert.equal(all.Grid, grid.Grid);
  assert.equal(all.Popup, experimental.Popup);
  assert.equal(all.Layout, stable.Layout);
  assert.equal(all.TextLayout, experimental.TextLayout);
});
