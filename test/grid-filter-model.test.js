import test from "node:test";
import assert from "node:assert/strict";

import { GridFilterModel } from "../src/core/GridFilterModel.js";

test("GridFilterModel matches multiple value filters", () => {
  const filters = new GridFilterModel();
  const item = {
    status: "active",
    owner: "Nora"
  };

  filters.set("status", {
    kind: "values",
    values: ["active", "review"]
  });
  filters.set("owner", {
    kind: "values",
    values: ["Nora"]
  });

  assert.equal(filters.matches(item, (current, columnId) => current[columnId]), true);
  assert.equal(
    filters.matches({ ...item, owner: "Ivan" }, (current, columnId) => current[columnId]),
    false
  );
  assert.deepEqual(filters.activeColumns(), ["status", "owner"]);
});

test("GridFilterModel supports blank values", () => {
  const filters = new GridFilterModel();

  filters.set("owner", {
    kind: "values",
    values: ["Nora"],
    includeEmpty: true
  });

  assert.equal(filters.matches({ owner: null }, item => item.owner), true);
  assert.equal(filters.matches({ owner: "" }, item => item.owner), true);
  assert.equal(filters.matches({ owner: "Ivan" }, item => item.owner), false);
});

test("GridFilterModel silent changes invalidate without public change", () => {
  const filters = new GridFilterModel();
  const invalidations = [];
  const changes = [];

  filters.events.on("invalidate", event => invalidations.push(event));
  filters.events.on("change", event => changes.push(event));
  filters.set(
    "status",
    {
      kind: "values",
      values: ["active"]
    },
    {
      silent: true,
      origin: "restore"
    }
  );

  assert.equal(invalidations.length, 1);
  assert.equal(invalidations[0].silent, true);
  assert.equal(changes.length, 0);
});

test("GridFilterModel beforeChange can cancel mutation", () => {
  const filters = new GridFilterModel();

  filters.events.on("beforeChange", event => {
    event.cancel = true;
  });

  assert.equal(
    filters.set("status", {
      kind: "values",
      values: ["active"]
    }),
    false
  );
  assert.equal(filters.hasAny(), false);
});

test("GridFilterModel clearAll emits one projection change", () => {
  const filters = new GridFilterModel({
    filters: {
      status: { kind: "values", values: ["active"] },
      owner: { kind: "values", values: ["Nora"] }
    }
  });
  const changes = [];

  filters.events.on("change", event => changes.push(event));

  assert.equal(filters.clearAll(), true);
  assert.equal(filters.hasAny(), false);
  assert.equal(changes.length, 1);
  assert.equal(changes[0].operation, "clearAll");
});

test("GridFilterModel supports text operators", () => {
  const filters = new GridFilterModel();

  filters.set("name", {
    kind: "text",
    operator: "startsWith",
    value: "cus"
  });

  assert.equal(filters.matches({ name: "Customer" }, item => item.name), true);
  assert.equal(filters.matches({ name: "Account" }, item => item.name), false);

  filters.set("name", {
    kind: "text",
    operator: "empty"
  });
  assert.equal(filters.matches({ name: "" }, item => item.name), true);
  assert.equal(filters.matches({ name: "Customer" }, item => item.name), false);
});

test("GridFilterModel supports number between with normalized bounds", () => {
  const filters = new GridFilterModel();

  filters.set("amount", {
    kind: "number",
    operator: "between",
    value: 200,
    valueTo: 100
  });

  assert.equal(filters.matches({ amount: 150 }, item => item.amount), true);
  assert.equal(filters.matches({ amount: 250 }, item => item.amount), false);
  assert.equal(filters.matches({ amount: null }, item => item.amount), false);
});

test("GridFilterModel supports date and boolean filters", () => {
  const filters = new GridFilterModel();

  filters.set("updated", {
    kind: "date",
    operator: "between",
    value: "2026-07-10",
    valueTo: "2026-07-12"
  });
  filters.set("active", {
    kind: "boolean",
    value: true
  });

  assert.equal(
    filters.matches(
      { updated: "2026-07-11", active: true },
      (item, columnId) => item[columnId]
    ),
    true
  );
  assert.equal(
    filters.matches(
      { updated: "2026-07-13", active: true },
      (item, columnId) => item[columnId]
    ),
    false
  );
});

test("GridFilterModel rejects invalid typed filter values", () => {
  const filters = new GridFilterModel();

  assert.throws(
    () =>
      filters.set("amount", {
        kind: "number",
        operator: "greater",
        value: "not-a-number"
      }),
    /must be finite/
  );
  assert.throws(
    () =>
      filters.set("updated", {
        kind: "date",
        operator: "on",
        value: "not-a-date"
      }),
    /valid date/
  );
});
