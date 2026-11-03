import test from "node:test";
import assert from "node:assert/strict";

import { Layout } from "../src/ui/Layout.js";

test("Layout exposes header and bordered appearance state before mount", () => {
  const layout = new Layout({ title: "Workspace", bordered: true, cells: [] });
  const changes = [];
  layout.events.on("appearanceChange", event => changes.push(event));

  assert.equal(layout.getTitle(), "Workspace");
  assert.equal(layout.isHeaderVisible(), true);
  assert.equal(layout.isBordered(), true);
  assert.equal(layout.setTitle("Editor"), layout);
  assert.equal(layout.setHeaderVisible(false), layout);
  assert.equal(layout.setBordered(false), layout);
  assert.deepEqual(changes.map(event => event.name), ["title", "headerVisible", "bordered"]);
});

test("Layout serializes header and border appearance", () => {
  const layout = new Layout({ title: "Workspace", header: true, bordered: true, cells: [] });
  const state = layout.serializeState();

  assert.equal(state.title, "Workspace");
  assert.equal(state.headerVisible, true);
  assert.equal(state.bordered, true);
});
