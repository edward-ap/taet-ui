import assert from "node:assert/strict";
import test from "node:test";
import { CommandRegistry } from "../src/core/CommandRegistry.js";

for (const replace of [false, true]) {
  test(`beforeExecute ${replace ? "replacement" : "removal"} cancels the captured command, even with force`, async () => {
    const registry = new CommandRegistry();
    const runs = [];
    registry.register("save", { run: () => runs.push("old") });
    registry.events.once("beforeExecute", () => {
      registry.unregister("save");
      if (replace) registry.register("save", { run: () => runs.push("new") });
    });
    assert.deepEqual(await registry.execute("save", {}, { force: true }), { ok: false, message: "Cancelled" });
    assert.deepEqual(runs, []);
    registry.destroy();
  });
}

for (const phase of ["context", "enabled", "visible"]) {
  test(`teardown during ${phase} stops the remaining execute phases`, async () => {
    const registry = new CommandRegistry();
    let active = false;
    const calls = [];
    registry.setContextProvider({ getContext() {
      if (active && phase === "context") registry.destroy();
      return {};
    } });
    registry.register("save", {
      enabled() { if (active) { calls.push("enabled"); if (phase === "enabled") registry.destroy(); } return true; },
      visible() { if (active) { calls.push("visible"); if (phase === "visible") registry.destroy(); } return true; },
      checked() { if (active) calls.push("checked"); return false; },
      run() { calls.push("run"); }
    });
    active = true;
    assert.deepEqual(await registry.execute("save"), { ok: false, message: "Cancelled" });
    assert.deepEqual(calls, phase === "context" ? [] : phase === "enabled" ? ["enabled"] : ["enabled", "visible"]);
  });
}

for (const failure of [false, true]) {
  test(`obsolete async ${failure ? "failure" : "success"} resolves without notifying a replacement`, async () => {
    const registry = new CommandRegistry();
    let finish;
    registry.register("save", { run: () => new Promise((resolve, reject) => {
      finish = () => failure ? reject(new Error("old failure")) : resolve("old result");
    }) });
    const events = [];
    registry.events.on("error", () => events.push("error"));
    registry.events.on("afterExecute", () => events.push("afterExecute"));
    const pending = registry.execute("save");
    registry.unregister("save");
    registry.register("save", { run() {} });
    finish();
    const result = await pending;
    assert.equal(result.ok, !failure);
    assert.equal(failure ? result.message : result.value, failure ? "old failure" : "old result");
    assert.deepEqual(events, []);
    registry.destroy();
  });
}

test("registration disposal is identity-scoped and safe after teardown", () => {
  const registry = new CommandRegistry();
  const old = registry.register("save", { run() {} });
  registry.unregister("save");
  const current = registry.register("save", { id: "injected", run() {} });
  old.dispose();
  assert.equal(registry.get("save").id, "save");
  registry.destroy();
  assert.doesNotThrow(() => current.dispose());
  current.off();
});

test("registration callbacks can destroy the registry without resuming refresh", () => {
  for (const phase of ["enabled", "register"]) {
    const registry = new CommandRegistry();
    if (phase === "register") registry.events.on("register", () => registry.destroy());
    const subscription = registry.register("save", {
      enabled() { if (phase === "enabled") registry.destroy(); return true; }, run() {}
    });
    assert.equal(registry.destroyed, true);
    subscription.dispose();
  }
});

test("failed initial state evaluation rolls back only its own registration", () => {
  const registry = new CommandRegistry();
  assert.throws(() => registry.register("save", { enabled() { throw new Error("bad state"); }, run() {} }), /bad state/);
  assert.equal(registry.get("save"), undefined);
  assert.throws(() => registry.register("save", { enabled() {
    registry.unregister("save");
    registry.register("save", { label: "Replacement", run() {} });
    throw new Error("old state");
  }, run() {} }), /old state/);
  assert.equal(registry.state("save").label, "Replacement");
  registry.destroy();
});

test("state callbacks may request refresh or query themselves without recursion", () => {
  const registry = new CommandRegistry();
  let calls = 0;
  const nested = [];
  registry.register("save", { enabled() {
    assert.ok(++calls < 10, "state evaluation must be bounded");
    registry.refreshState();
    nested.push(registry.state("save").enabled);
    return true;
  }, run() {} });
  registry.refreshState();
  assert.equal(registry.state("save").enabled, true);
  assert.equal(nested[0], false);
  assert.ok(nested.slice(1).every(Boolean));
  registry.destroy();
});

test("refresh snapshots registrations and never writes state for replaced entries", () => {
  const registry = new CommandRegistry();
  let replace = false;
  const states = [];
  registry.register("save", { label: "Old", enabled() {
    if (replace) {
      replace = false;
      registry.unregister("save");
      registry.register("save", { label: "New", run() {} });
    }
    return false;
  }, run() {} });
  registry.events.on("stateChange", event => states.push(event.state.label));
  replace = true;
  registry.refreshState();
  registry.refreshState();
  assert.equal(registry.state("save").label, "New");
  assert.deepEqual(states, []);
  registry.destroy();
});

test("provider replacement during subscription disposal retains the newest subscription", () => {
  const registry = new CommandRegistry();
  const disposed = [];
  const latest = { getContext: () => ({ latest: true }), events: { on: () => ({ dispose() { disposed.push("latest"); } }) } };
  registry.setContextProvider({ getContext: () => ({}), events: { on: () => ({ dispose() {
    disposed.push("old");
    registry.setContextProvider(latest);
  } }) } });
  registry.setContextProvider({ getContext: () => ({ latest: false }) });
  registry.register("save", { enabled: context => context.latest, run() {} });
  assert.equal(registry.state("save").enabled, true);
  registry.destroy();
  assert.deepEqual(disposed, ["old", "latest"]);
});

test("subscription acquisition and disposal may destroy the registry", () => {
  const registry = new CommandRegistry();
  let disposals = 0;
  let notify;
  registry.setContextProvider({ getContext: () => ({}), events: { on(name, handler) {
    notify = handler;
    registry.destroy();
    return { dispose() { disposals++; registry.destroy(); } };
  } } });
  assert.equal(registry.destroyed, true);
  assert.equal(disposals, 1);
  assert.doesNotThrow(() => notify());
});

test("provider replacement in a predicate cancels execution before run", async () => {
  const registry = new CommandRegistry();
  let replace = false;
  let runs = 0;
  registry.register("save", { enabled() {
    if (replace) { replace = false; registry.setContextProvider({ getContext: () => ({ current: true }) }); }
    return true;
  }, run(context) { runs++; return context.current; } });
  replace = true;
  assert.deepEqual(await registry.execute("save"), { ok: false, message: "Cancelled" });
  assert.equal(runs, 0);
  assert.deepEqual(await registry.execute("save"), { ok: true, value: true });
  registry.destroy();
});

test("refresh invalidated by a provider switch publishes only on a subsequent fresh pass", () => {
  const registry = new CommandRegistry({ contextProvider: { getContext: () => ({ enabled: true }) } });
  let replace = false;
  registry.register("save", { enabled(context) {
    if (replace) {
      replace = false;
      registry.setContextProvider({ getContext: () => ({ enabled: false }) });
    }
    return context.enabled;
  }, run() {} });
  const states = [];
  registry.events.on("stateChange", event => states.push(event.state.enabled));
  replace = true;
  registry.refreshState();
  assert.deepEqual(states, []);
  registry.refreshState();
  assert.deepEqual(states, [false]);
  registry.destroy();
});

test("context getters may query command state without reentering the provider", () => {
  const registry = new CommandRegistry();
  registry.register("save", { enabled: context => context.ready === true, run() {} });
  let calls = 0;
  registry.setContextProvider({ getContext() {
    assert.ok(++calls < 5, "context evaluation must be bounded");
    assert.equal(registry.state("save").enabled, false);
    return { ready: true };
  } });
  assert.equal(registry.state("save").enabled, true);
  registry.destroy();
});
