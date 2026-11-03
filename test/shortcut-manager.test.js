import test from "node:test";
import assert from "node:assert/strict";

import { CommandRegistry } from "../src/core/CommandRegistry.js";
import { ShortcutManager } from "../src/core/ShortcutManager.js";

test("ShortcutManager bindCommands tracks commands registered later", () => {
  let executed = 0;
  const target = createTarget();
  const commands = new CommandRegistry();
  const shortcuts = new ShortcutManager({
    commands,
    target,
    autoListen: false
  });

  shortcuts.bindCommands(commands);
  commands.register("project.close", {
    shortcut: "Ctrl+W",
    run() {
      executed += 1;
    }
  });

  const event = createKeyboardEvent({ key: "w", ctrlKey: true });
  assert.equal(shortcuts.handleKeyboardEvent(event), true);
  assert.equal(event.defaultPrevented, true);
  assert.equal(executed, 1);
});

test("ShortcutManager ignores non-modifier shortcuts in text inputs by default", () => {
  let executed = 0;
  const commands = new CommandRegistry();
  const shortcuts = new ShortcutManager({
    commands,
    autoListen: false
  });

  commands.register("row.delete", {
    shortcut: "Delete",
    run() {
      executed += 1;
    }
  });
  shortcuts.bindCommands(commands);

  const event = createKeyboardEvent({
    key: "Delete",
    target: { tagName: "INPUT" }
  });

  assert.equal(shortcuts.handleKeyboardEvent(event), false);
  assert.equal(event.defaultPrevented, false);
  assert.equal(executed, 0);
});

function createTarget() {
  return {
    addEventListener() {},
    removeEventListener() {}
  };
}

function createKeyboardEvent(options = {}) {
  return {
    key: options.key,
    ctrlKey: options.ctrlKey === true,
    metaKey: options.metaKey === true,
    altKey: options.altKey === true,
    shiftKey: options.shiftKey === true,
    target: options.target ?? { tagName: "BODY" },
    defaultPrevented: false,
    preventDefault() {
      this.defaultPrevented = true;
    }
  };
}
