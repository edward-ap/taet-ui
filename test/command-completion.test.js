import assert from "node:assert/strict";
import test from "node:test";
import { CommandRegistry } from "../src/core/CommandRegistry.js";

for (const failure of [false, true]) {
  test(`pending command settles after registry teardown (${failure ? "failure" : "success"})`, async () => {
    const commands = new CommandRegistry();
    let finish;
    commands.register("save", { run: () => new Promise((resolve, reject) => {
      finish = () => failure ? reject(new Error("save failed")) : resolve("saved");
    }) });
    const events = [];
    commands.events.on("afterExecute", event => events.push(event));
    commands.events.on("error", event => events.push(event));
    const pending = commands.execute("save");
    commands.destroy();
    finish();
    const result = await pending;
    assert.equal(result.ok, !failure);
    if (failure) assert.equal(result.message, "save failed");
    else assert.equal(result.value, "saved");
    assert.deepEqual(events, []);
  });
}

test("afterExecute can close its screen and destroy the registry", async () => {
  const commands = new CommandRegistry();
  commands.register("close", { run: () => "closed" });
  commands.events.on("afterExecute", () => commands.destroy());
  assert.deepEqual(await commands.execute("close"), { ok: true, value: "closed" });
});

test("error handlers may destroy the registry without rejecting execute", async () => {
  const commands = new CommandRegistry();
  commands.register("save", { run() { throw new Error("save failed"); } });
  commands.events.on("error", () => commands.destroy());
  assert.equal((await commands.execute("save")).message, "save failed");
});

test("destroying the registry in beforeExecute prevents starting work", async () => {
  const commands = new CommandRegistry();
  let ran = false;
  commands.register("save", { run() { ran = true; } });
  commands.events.on("beforeExecute", () => commands.destroy());
  assert.equal((await commands.execute("save")).ok, false);
  assert.equal(ran, false);
});
