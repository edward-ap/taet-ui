import test from "node:test";
import assert from "node:assert/strict";
import { ConnectorLayer } from "../src/ui/ConnectorLayer.js";

function fixture(options = {}) {
  const layer = new ConnectorLayer(options);
  for (const controlId of ["a", "b"]) layer.registerProvider({ controlId, getPortPosition:() => ({ x:10, y:20, status:"visible" }) });
  return { layer, source:{ controlId:"a", itemId:0 }, target:{ controlId:"b", itemId:"0" } };
}

test("silent connection writes still validate and suppress semantic events", () => {
  let validations = 0, changes = 0;
  const { layer, source, target } = fixture({ canConnect:() => { validations++; return true; } });
  layer.events.on("beforeConnectionChange", () => changes++);
  layer.events.on("connectionCreate", () => changes++);
  layer.events.on("connectionChange", () => changes++);
  const connection = layer.connect(source, target, { silent:true });
  assert.ok(connection);
  assert.equal(layer.reconnect(connection.id, "target", { ...target, itemId:"new" }, { silent:true }), true);
  assert.equal(validations, 2);
  assert.equal(changes, 0);
  assert.equal(layer.model.get(connection.id).source.itemId, 0);
  layer.destroy();
});

test("connection validation cannot recursively commit another connection", () => {
  const { layer, source, target } = fixture();
  layer.events.on("beforeConnectionChange", () => assert.equal(layer.connect(source, target), null));
  assert.ok(layer.connect(source, target));
  assert.equal(layer.model.all().length, 1);
  layer.destroy();
});

test("reconnection stops when its validation callback replaces the original edge", () => {
  const { layer, source, target } = fixture();
  const connection = layer.connect(source, target);
  layer.events.on("beforeConnectionChange", () => layer.model.update(connection.id, { label:"Updated elsewhere" }));
  assert.equal(layer.reconnect(connection.id, "target", { ...target, itemId:"new" }), false);
  assert.equal(layer.model.get(connection.id).target.itemId, "0");
  assert.equal(layer.model.get(connection.id).label, "Updated elsewhere");
  layer.destroy();
});
