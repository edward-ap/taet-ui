import test from "node:test";
import assert from "node:assert/strict";

import { TabBar } from "../src/ui/TabBar.js";

for (const [method, before, changed, after] of [
  ["setActive", "beforeChange", "change", "afterChange"],
  ["removeTab", "beforeClose", "close", "afterClose"]
]) {
  for (const phase of [before, changed]) {
    test(`TabBar ${method} stops after destruction in ${phase}`, () => {
      const tabs = new TabBar({ closable: true, tabs: [{ id: "a" }, { id: "b" }] });
      const events = [];
      for (const name of [before, changed, after]) tabs.events.on(name, () => {
        events.push(name);
        if (name === phase) tabs.destroy();
      });
      assert.equal(tabs[method]("b"), phase !== before);
      assert.deepEqual(events, phase === before ? [before] : [before, changed]);
      assert.equal(tabs.destroyed, true);
    });
  }
}

test("TabBar rechecks the target and index after before callbacks", () => {
  const tabs = new TabBar({ closable: true, tabs: [{ id: "a" }, { id: "b" }, { id: "c" }] });
  tabs.events.on("beforeClose", () => tabs.removeTab("a", { silent: true }));
  assert.equal(tabs.removeTab("b"), true);
  assert.deepEqual(tabs.all().map(tab => tab.id), ["c"]);
  tabs.addTab({ id: "d" });
  tabs.events.on("beforeChange", () => tabs.removeTab("d", { silent: true }));
  assert.equal(tabs.setActive("d"), false);
  assert.equal(tabs.getActive().id, "c");
  tabs.destroy();
});

test("TabBar preserves a selection made by a beforeChange handler", () => {
  const tabs = new TabBar({ tabs: [{ id: "a" }, { id: "b" }, { id: "c" }] });
  tabs.events.on("beforeChange", () => tabs.setActive("c", { silent: true }));
  assert.equal(tabs.setActive("b"), false);
  assert.equal(tabs.getActive().id, "c");
  tabs.destroy();
});

test("TabBar exposes a runtime bordered appearance contract", () => {
  const tabs = new TabBar({ bordered: true, tabs: [{ id: "one", text: "One" }] });
  const changes = [];
  tabs.events.on("appearanceChange", event => changes.push(event));

  assert.equal(tabs.isBordered(), true);
  assert.equal(tabs.setBordered(false), tabs);
  assert.equal(tabs.isBordered(), false);
  assert.equal(changes.length, 1);
  assert.equal(changes[0].name, "bordered");
  assert.equal(changes[0].oldValue, true);
  assert.equal(changes[0].value, false);
});

test("TabBar validates and changes orientation", () => {
  const tabs = new TabBar({ orientation: "left", tabs: [{ id: "one", text: "One" }] });
  const changes = [];
  tabs.events.on("appearanceChange", event => changes.push(event));

  assert.equal(tabs.getOrientation(), "left");
  assert.equal(tabs.setOrientation("bottom"), tabs);
  assert.equal(tabs.getOrientation(), "bottom");
  assert.equal(changes[0].name, "orientation");
  assert.equal(changes[0].oldValue, "left");
  assert.equal(changes[0].value, "bottom");
  assert.throws(() => new TabBar({ orientation: "center" }), /orientation/);
  assert.throws(() => tabs.setOrientation("horizontal"), /orientation/);
});
