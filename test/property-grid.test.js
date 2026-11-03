import test from "node:test";
import assert from "node:assert/strict";

import { PropertyGrid } from "../src/ui/PropertyGrid.js";
import { gridEditors } from "../src/ui/GridEditors.js";
import { BaseControl } from "../src/core/BaseControl.js";
import { Grid } from "../src/ui/Grid.js";

function expandableGrid() {
  return new PropertyGrid({ source: [{ id: "general", properties: [{
    name: "font", type: "readonly", value: "Font",
    children: [{ name: "size", type: "number", value: 12 }]
  }] }] });
}

test("PropertyGrid silent toggles update visible rows without cancellable or completion events", () => {
  const grid = expandableGrid();
  const events = [];
  for (const name of ["beforeCategoryToggle", "categoryToggle", "categoryCollapse", "categoryExpand",
    "beforePropertyToggle", "propertyToggle", "propertyCollapse", "propertyExpand"]) {
    grid.events.on(name, event => { events.push(name); event.cancel = true; });
  }
  assert.equal(grid.expandProperty("font", { silent: true }), true);
  assert.equal(grid.data.all().length, 3);
  assert.equal(grid.collapseCategory("general", { silent: true }), true);
  assert.equal(grid.data.all().length, 1);
  assert.equal(grid.expandCategory("general", { silent: true }), true);
  assert.equal(grid.data.all().length, 3);
  for (const row of grid.data.all().filter(row => row.kind === "property")) {
    assert.equal(grid.getPropertyControl(row.propertyKey), row);
  }
  assert.equal(grid.collapseProperty("font", { silent: true }), true);
  assert.equal(grid.data.all().length, 2);
  assert.deepEqual(events, []);
  grid.destroy();
});

for (const [method, id, before, changed, after] of [
  ["collapseCategory", "general", "beforeCategoryToggle", "categoryToggle", "categoryCollapse"],
  ["expandProperty", "font", "beforePropertyToggle", "propertyToggle", "propertyExpand"]
]) {
  for (const phase of [before, changed]) {
    test(`PropertyGrid ${method} stops after destruction in ${phase}`, () => {
      const grid = expandableGrid();
      const events = [];
      for (const name of [before, changed, after]) grid.events.on(name, () => {
        events.push(name); if (name === phase) grid.destroy();
      });
      assert.equal(grid[method](id), phase !== before);
      assert.deepEqual(events, phase === before ? [before] : [before, changed]);
    });
  }
  test(`PropertyGrid ${method} abandons a replaced model`, () => {
    const grid = expandableGrid();
    grid.events.on(before, () => grid.bind([{ id: "replacement", properties: [] }]));
    assert.equal(grid[method](id), false);
    assert.deepEqual(grid.data.all().map(row => row.group.id), ["replacement"]);
    grid.destroy();
  });
}

test("PropertyGrid is an independent Control rather than a Grid subclass", () => {
  const propertyGrid = new PropertyGrid();
  assert.equal(propertyGrid instanceof BaseControl, true);
  assert.equal(propertyGrid instanceof Grid, false);
});

test("PropertyGrid accepts PropertyModel object with groups", () => {
  const propertyGrid = new PropertyGrid();

  propertyGrid.bind({
    source: { id: "box-1" },
    groups: [
      {
        id: "general",
        title: "General",
        properties: [{ name: "name", label: "Name", type: "text", value: "Source" }]
      }
    ]
  });

  assert.deepEqual(
    propertyGrid.data.all().map(row => row.kind),
    ["category", "property"]
  );
  assert.equal(propertyGrid.getPropertyControl("name").value, "Source");
});

test("PropertyGrid can hide category rows", () => {
  const propertyGrid = new PropertyGrid({
    showCategories: false
  });

  propertyGrid.bind([
    {
      title: "General",
      properties: [{ name: "name", label: "Name", type: "text", value: "Source" }]
    }
  ]);

  assert.deepEqual(
    propertyGrid.data.all().map(row => row.kind),
    ["property"]
  );
});

test("PropertyGrid alphabetical sort flattens and sorts properties", () => {
  const propertyGrid = new PropertyGrid({
    showCategories: false,
    sortMode: "alphabetical"
  });

  propertyGrid.bind([
    {
      title: "General",
      properties: [
        { name: "width", label: "Width", type: "number", value: 100 },
        { name: "caption", label: "Caption", type: "text", value: "Panel" }
      ]
    },
    {
      title: "Behavior",
      properties: [{ name: "enabled", label: "Enabled", type: "boolean", value: true }]
    }
  ]);

  assert.deepEqual(
    propertyGrid.data.all().map(row => row.name),
    ["caption", "enabled", "width"]
  );
});

test("PropertyGrid uses property path as stable key when present", () => {
  const propertyGrid = new PropertyGrid();

  propertyGrid.bind([
    {
      title: "Left",
      properties: [
        { name: "caption", path: "left.caption", label: "Caption", type: "text", value: "Left" }
      ]
    },
    {
      title: "Right",
      properties: [
        { name: "caption", path: "right.caption", label: "Caption", type: "text", value: "Right" }
      ]
    }
  ]);

  assert.equal(propertyGrid.getPropertyControl("left.caption").value, "Left");
  assert.equal(propertyGrid.getPropertyControl("right.caption").value, "Right");
  assert.equal(propertyGrid.getPropertyControl("caption").value, "Left");
});

test("PropertyGrid supports default editor overrides by property type", () => {
  const propertyGrid = new PropertyGrid({
    defaultEditors: {
      boolean: gridEditors.checkbox()
    }
  });

  propertyGrid.bind([
    {
      title: "General",
      properties: [{ name: "enabled", label: "Enabled", type: "boolean", value: true }]
    }
  ]);

  const row = propertyGrid.getPropertyControl("enabled");
  assert.equal(propertyGrid.getColumn("value").editor(row).activation, "toggle");

  propertyGrid.setDefaultEditor("boolean", gridEditors.select({ options: [true, false] }));
  assert.equal(propertyGrid.getColumn("value").editor(row).filterType, "values");
});

test("PropertyGrid provides desktop editors for extended property types", () => {
  const propertyGrid = new PropertyGrid();
  propertyGrid.bind([{
    title: "Editors",
    properties: [
      { name: "count", type: "integer", value: 2 },
      { name: "date", type: "date", value: "2026-07-11" },
      { name: "time", type: "time", value: "09:30" },
      { name: "stamp", type: "dateTime", value: "2026-07-11T09:30" },
      { name: "active", type: "switch", value: true },
      { name: "mode", type: "radio", value: "a", options: ["a", "b"] }
    ]
  }]);

  for (const name of ["count", "date", "time", "stamp", "active", "mode"]) {
    assert.equal(typeof propertyGrid.getColumn("value").editor(propertyGrid.getPropertyControl(name)).createCellEditor, "function");
  }
});

test("PropertyGrid collapses and expands categories by stable id", () => {
  const propertyGrid = new PropertyGrid();
  propertyGrid.bind([
    {
      id: "general",
      title: "General",
      properties: [{ name: "name", label: "Name", type: "text", value: "Panel" }]
    }
  ]);

  assert.equal(propertyGrid.collapseCategory("general"), true);
  assert.deepEqual(propertyGrid.data.all().map(row => row.kind), ["category"]);
  assert.equal(propertyGrid.isCategoryCollapsed("general"), true);
  assert.equal(propertyGrid.expandCategory("general"), true);
  assert.deepEqual(propertyGrid.data.all().map(row => row.kind), ["category", "property"]);
});

test("PropertyGrid category toggle is cancellable", () => {
  const propertyGrid = new PropertyGrid();
  propertyGrid.bind([
    {
      id: "general",
      title: "General",
      properties: [{ name: "name", label: "Name", type: "text", value: "Panel" }]
    }
  ]);
  propertyGrid.events.on("beforeCategoryToggle", event => {
    event.cancel = true;
  });

  assert.equal(propertyGrid.collapseCategory("general"), false);
  assert.equal(propertyGrid.isCategoryCollapsed("general"), false);
});

test("PropertyGrid selects a property by path and expands its category", () => {
  const propertyGrid = new PropertyGrid({ collapsedCategories: ["general"] });
  const property = {
    name: "caption",
    path: "appearance.caption",
    label: "Caption",
    type: "text",
    value: "Review",
    description: "Displayed text"
  };
  propertyGrid.bind([{ id: "general", title: "General", properties: [property] }]);

  assert.equal(propertyGrid.selectProperty("appearance.caption"), true);
  assert.equal(propertyGrid.isCategoryCollapsed("general"), false);
  assert.equal(propertyGrid.getSelectedProperty(), property);
  assert.equal(propertyGrid.getSelectedPropertyDescription(), "Displayed text");
});

test("PropertyGrid flattens expandable properties into stable hierarchy rows", () => {
  const propertyGrid = new PropertyGrid({ expandedProperties: ["appearance.font"] });
  propertyGrid.bind([{
    id: "appearance",
    title: "Appearance",
    properties: [{
      name: "font",
      path: "appearance.font",
      label: "Font",
      type: "readonly",
      value: "Segoe UI",
      children: [{ name: "size", label: "Size", type: "number", value: 12 }]
    }]
  }]);

  const rows = propertyGrid.data.all();
  assert.deepEqual(rows.map(row => row.kind), ["category", "property", "property"]);
  assert.equal(rows[1].expandable, true);
  assert.equal(rows[1].expanded, true);
  assert.equal(rows[2].propertyKey, "appearance.font.size");
  assert.equal(rows[2].level, 1);
  assert.equal(propertyGrid.collapseProperty("appearance.font"), true);
  assert.equal(propertyGrid.data.all().length, 2);
});
