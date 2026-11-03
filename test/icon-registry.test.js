import test from "node:test";
import assert from "node:assert/strict";

import { IconRegistry } from "../src/core/IconRegistry.js";

const square = { viewBox: "0 0 10 10", nodes: [["rect", { x: 1, y: 1, width: 8, height: 8 }]] };

test("IconRegistry registers, resolves and lists icons", () => {
  const registry = new IconRegistry({ square });
  assert.equal(registry.resolve("square").viewBox, "0 0 10 10");
  assert.deepEqual(registry.list(), ["square"]);
});

test("IconRegistry supports aliases and replacement", () => {
  const registry = new IconRegistry({ square });
  registry.alias("shape.square", "square");
  assert.equal(registry.resolve("shape.square"), registry.resolve("square"));
  assert.throws(() => registry.register("square", square), /already registered/);
  registry.register("square", { ...square, viewBox: "0 0 20 20" }, { replace: true });
  assert.equal(registry.resolve("shape.square").viewBox, "0 0 20 20");
});

test("IconRegistry rejects invalid names and definitions", () => {
  const registry = new IconRegistry();
  assert.throws(() => registry.register("Bad Icon", square), /Invalid icon name/);
  assert.throws(() => registry.register("bad", {}), /nodes array/);
  assert.throws(() => registry.alias("missing-alias", "missing"), /unknown icon/);
});

test("IconRegistry unregisters aliases that target a removed icon", () => {
  const registry = new IconRegistry({ square });
  registry.alias("shape.square", "square");
  registry.alias("legacy.square", "shape.square");
  assert.equal(registry.unregister("square"), true);
  assert.equal(registry.has("shape.square"), false);
  assert.equal(registry.has("legacy.square"), false);
});

test("IconRegistry rejects circular aliases", () => {
  const registry = new IconRegistry({ square });
  registry.alias("shape.square", "square");
  assert.throws(() => registry.alias("square", "shape.square", { replace: true }), /Circular icon alias/);
});
