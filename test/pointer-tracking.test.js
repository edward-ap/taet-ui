import test from "node:test";
import assert from "node:assert/strict";

import { listenUntilPointerUp } from "../src/core/pointerTracking.js";

test("listenUntilPointerUp removes listeners on pointerup", () => {
  const target = createEventTarget();
  const moves = [];
  const ups = [];

  const tracking = listenUntilPointerUp({
    target,
    move: event => moves.push(event.clientX),
    up: event => ups.push(event.clientX)
  });

  assert.equal(target.count("pointermove"), 1);
  assert.equal(target.count("pointerup"), 1);

  target.dispatch("pointermove", { clientX: 10 });
  target.dispatch("pointerup", { clientX: 20 });

  assert.deepEqual(moves, [10]);
  assert.deepEqual(ups, [20]);
  assert.equal(target.count("pointermove"), 0);
  assert.equal(target.count("pointerup"), 0);

  tracking.dispose();
  assert.equal(target.count("pointermove"), 0);
  assert.equal(target.count("pointerup"), 0);
});

test("listenUntilPointerUp dispose removes listeners without pointerup", () => {
  const target = createEventTarget();
  let moved = false;
  let finished = false;

  const tracking = listenUntilPointerUp({
    target,
    move: () => {
      moved = true;
    },
    up: () => {
      finished = true;
    }
  });

  tracking.dispose();
  target.dispatch("pointermove", {});
  target.dispatch("pointerup", {});

  assert.equal(moved, false);
  assert.equal(finished, false);
  assert.equal(target.count("pointermove"), 0);
  assert.equal(target.count("pointerup"), 0);
});

function createEventTarget() {
  const handlers = new Map();

  return {
    addEventListener(type, handler) {
      if (!handlers.has(type)) {
        handlers.set(type, new Set());
      }

      handlers.get(type).add(handler);
    },
    removeEventListener(type, handler) {
      handlers.get(type)?.delete(handler);
    },
    dispatch(type, event) {
      for (const handler of [...(handlers.get(type) ?? [])]) {
        handler(event);
      }
    },
    count(type) {
      return handlers.get(type)?.size ?? 0;
    }
  };
}
