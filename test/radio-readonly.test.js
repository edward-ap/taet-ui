import assert from "node:assert/strict";
import test from "node:test";

import { RadioGroup, ReadonlyText } from "../src/ui/index.js";

test("RadioGroup exposes stable value, item, and appearance APIs before mount", () => {
  const radio = new RadioGroup({
    name: "priority",
    options: [
      { value: "low", text: "Low" },
      { value: "high", text: "High" }
    ]
  });
  const changes = [];
  radio.events.on("appearanceChange", event => changes.push(event));

  assert.equal(radio.value.get(), null);
  assert.equal(radio.value.set("high", { origin: "import" }), true);
  assert.equal(radio.getSelectedItem().text, "High");
  assert.equal(radio.setLayout("flow"), radio);
  assert.equal(radio.setColumns(2), radio);
  assert.equal(radio.getLayout(), "flow");
  assert.equal(radio.getColumns(), 2);
  assert.deepEqual(changes.map(event => event.name), ["layout", "columns"]);

  radio.setItems([{ value: "new", text: "New" }]);
  assert.equal(radio.value.get(), null);
  assert.throws(() => radio.setLayout("grid"), /column or flow/);
  assert.throws(() => radio.setColumns(0), /positive integer/);
  radio.destroy();
});

test("ReadonlyText exposes symmetric text access and provenance", () => {
  const text = new ReadonlyText({ name: "orderId", text: "A-100" });
  let event = null;
  text.events.on("textChange", value => { event = value; });

  assert.equal(text.getText(), "A-100");
  assert.equal(text.setText("A-101", { origin: "host" }), text);
  assert.equal(text.getText(), "A-101");
  assert.equal(event.oldValue, "A-100");
  assert.equal(event.newValue, "A-101");
  assert.equal(event.origin, "host");
  text.destroy();
});
