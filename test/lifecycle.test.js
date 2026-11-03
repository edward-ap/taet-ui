import test from "node:test";
import assert from "node:assert/strict";

import { CommandRegistry } from "../src/core/CommandRegistry.js";
import { DocumentState } from "../src/core/DocumentState.js";
import { ShortcutManager } from "../src/core/ShortcutManager.js";
import { StaticContextProvider } from "../src/core/StaticContextProvider.js";

test("CommandRegistry rejects operations after destroy", () => {
  const commands = new CommandRegistry();
  commands.destroy();

  assert.equal(commands.destroyed, true);
  assert.throws(
    () => commands.register("project.save", { run() {} }),
    /destroyed CommandRegistry/
  );
});

test("DocumentState rejects operations after destroy", () => {
  const documentState = new DocumentState();
  documentState.destroy();

  assert.equal(documentState.destroyed, true);
  assert.throws(() => documentState.markDirty(), /destroyed DocumentState/);
});

test("ShortcutManager rejects operations after destroy", () => {
  const shortcuts = new ShortcutManager({ autoListen: false });
  shortcuts.destroy();

  assert.equal(shortcuts.destroyed, true);
  assert.throws(() => shortcuts.bind("x", "Ctrl+X"), /destroyed ShortcutManager/);
});

test("StaticContextProvider rejects operations after destroy", () => {
  const context = new StaticContextProvider({ project: true });
  context.destroy();

  assert.equal(context.destroyed, true);
  assert.throws(() => context.getContext(), /destroyed StaticContextProvider/);
});
