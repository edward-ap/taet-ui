import assert from "node:assert/strict";
import test from "node:test";

import { ConnectorModel } from "../src/ui/ConnectorModel.js";

test("ConnectorModel normalizes endpoint sides and stores domain metadata", () => {
  const model = new ConnectorModel();
  const connector = model.add({
    id:"join-1",
    source:{ controlId:"left", itemId:"field-a" },
    target:{ controlId:"right", itemId:"field-b" },
    data:{ joinType:"left" }
  });
  assert.equal(connector.source.side, "right");
  assert.equal(connector.target.side, "left");
  assert.equal(connector.directed, false);
  assert.equal(model.get("join-1").data.joinType, "left");
  model.destroy();
});

test("ConnectorModel rejects incomplete logical endpoints", () => {
  const model = new ConnectorModel();
  assert.throws(() => model.add({ id:"bad", source:{}, target:{ controlId:"right" } }), /source.controlId/);
  model.destroy();
});
