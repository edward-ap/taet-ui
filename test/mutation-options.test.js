import test from "node:test";
import assert from "node:assert/strict";

import { normalizeMutationOptions } from "../src/core/mutationOptions.js";

test("normalizeMutationOptions rejects unknown origins", () => {
  assert.throws(
    () => normalizeMutationOptions({ origin: "drag" }),
    /Invalid mutation origin/
  );
});

test("normalizeMutationOptions keeps stable origin with reason metadata", () => {
  const mutation = normalizeMutationOptions({
    origin: "system",
    reason: "drag",
    operation: "dock"
  });

  assert.equal(mutation.origin, "system");
  assert.equal(mutation.reason, "drag");
  assert.equal(mutation.operation, "dock");
});
