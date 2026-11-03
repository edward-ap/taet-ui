import assert from "node:assert/strict";
import test from "node:test";
import { DataStore, SelectInput } from "../src/ui/index.js";

test("silent data replacement reconciles missing SelectInput values without public changes", () => {
  const data = new DataStore();
  data.parse([{ id: "a", text: "Alpha" }]);
  const select = new SelectInput({ data, value: "a", clearValueOnMissingData: true });
  const changes = [];
  select.events.on("change", event => changes.push(event));
  data.parse([{ id: "b", text: "Beta" }], { silent: true, origin: "import" });
  assert.equal(select.value.get(), "");
  assert.deepEqual(changes, []);
  select.destroy();
  assert.equal(data.destroyed, false);
  data.destroy();
});
