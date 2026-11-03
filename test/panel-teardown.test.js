import assert from "node:assert/strict";
import test from "node:test";
import { BaseControl, Form, Panel, TextInput } from "../src/ui/index.js";

test("terminal Panel teardown releases children even when normal removal is vetoed", () => {
  const parent = new Panel();
  const child = new BaseControl();
  let released = 0;
  child.disposables.add(() => { released += 1; parent.destroy(); });
  parent.addControl(child);
  parent.events.on("beforeChildRemove", event => { event.cancel = true; });
  assert.equal(parent.remove(child), null);
  assert.equal(child.destroyed, false);
  parent.destroy();
  parent.destroy();
  assert.equal(child.destroyed, true);
  assert.equal(child.events.destroyed, true);
  assert.equal(child.parent, null);
  assert.deepEqual(parent.getItems(), []);
  assert.equal(released, 1);
});

test("Form teardown releases unmounted logical descendants", () => {
  const input = new TextInput({ name: "name" });
  const form = new Form().row(input);
  form.events.on("beforeChildRemove", event => { event.cancel = true; });
  form.destroy();
  assert.equal(input.destroyed, true);
  assert.equal(input.disposables.disposed, true);
});
