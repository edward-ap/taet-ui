import test from "node:test";
import assert from "node:assert/strict";

import { PropertyDescription } from "../src/ui/PropertyDescription.js";
import { PropertyInspector } from "../src/ui/PropertyInspector.js";

test("PropertyDescription exposes selected property metadata before mount", () => {
  const description = new PropertyDescription({ emptyText: "No description" });
  const property = {
    name: "caption",
    label: "Caption",
    description: "Displayed text"
  };

  description.bind(property);
  assert.equal(description.getProperty(), property);
  assert.equal(description.getTitle(), "Caption");
  assert.equal(description.getDescription(), "Displayed text");
  description.clear();
  assert.equal(description.getProperty(), null);
  assert.equal(description.getDescription(), "No description");
});

test("PropertyInspector binds schema and synchronizes property selection", () => {
  const inspector = new PropertyInspector();
  const property = {
    name: "caption",
    path: "appearance.caption",
    label: "Caption",
    type: "text",
    value: "Review",
    help: "Text shown on the button"
  };

  inspector.bind([{ id: "appearance", title: "Appearance", properties: [property] }]);
  inspector.selectProperty("appearance.caption");

  assert.equal(inspector.getSelectedProperty(), property);
});

test("PropertyInspector forwards cancellable property changes", () => {
  const inspector = new PropertyInspector();
  inspector.events.on("beforePropertyChange", event => {
    event.cancel = true;
  });
  const event = { source: inspector.grid, cancel: false };

  inspector.grid.events.emit("beforePropertyChange", event);
  assert.equal(event.cancel, true);
});

test("PropertyInspector owns and destroys composed controls", () => {
  const inspector = new PropertyInspector();
  const grid = inspector.grid;

  inspector.destroy();
  assert.equal(grid.destroyed, true);
});
