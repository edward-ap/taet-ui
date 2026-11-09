import test from "node:test";
import assert from "node:assert/strict";

import { Grid } from "../src/ui/Grid.js";
import { gridEditors } from "../src/ui/GridEditors.js";

test("Grid keeps editor open and emits editReject when DataStore vetoes write", () => {
  const grid = createEditingGrid();
  const cellChanges = [];
  const editCommits = [];
  const editRejects = [];

  grid.data.events.on("beforeChange", event => {
    event.cancel = true;
  });
  grid.events.on("cellChange", event => cellChanges.push(event));
  grid.events.on("editCommit", event => editCommits.push(event));
  grid.events.on("editReject", event => editRejects.push(event));

  const editing = attachFakeEditor(grid, "new");
  const committed = grid.commitEdit({ origin: "user", userAction: true });

  assert.equal(committed, false);
  assert.equal(grid.data.get("a").value, "old");
  assert.equal(grid._editing, editing);
  assert.equal(editing.focusCount(), 1);
  assert.equal(cellChanges.length, 0);
  assert.equal(editCommits.length, 0);
  assert.equal(editRejects.length, 1);
  assert.equal(editRejects[0].reason, "write-rejected");
  assert.equal(editing.destroyCount(), 0);
});

test("Grid emits cellChange only after successful write", () => {
  const grid = createEditingGrid();
  const cellChanges = [];
  const editCommits = [];

  grid.events.on("cellChange", event => cellChanges.push(event));
  grid.events.on("editCommit", event => editCommits.push(event));
  const editing = attachFakeEditor(grid, "new");

  const committed = grid.commitEdit({ origin: "user", userAction: true });

  assert.equal(committed, true);
  assert.equal(grid.data.get("a").value, "new");
  assert.equal(grid._editing, null);
  assert.equal(cellChanges.length, 1);
  assert.equal(cellChanges[0].oldValue, "old");
  assert.equal(cellChanges[0].newValue, "new");
  assert.equal(editCommits.length, 1);
  assert.equal(editCommits[0].writeResult, true);
  assert.equal(editing.destroyCount(), 1);
});

test("Grid keeps invalid control editor open", () => {
  const grid = createEditingGrid();
  const editRejects = [];
  const editing = attachFakeEditor(grid, "", {
    validation: {
      ok: false,
      errors: [{ severity: "error", message: "Value is required" }]
    }
  });
  grid.events.on("editReject", event => editRejects.push(event));

  assert.equal(grid.commitEdit({ origin: "user", userAction: true }), false);
  assert.equal(grid._editing, editing);
  assert.equal(editing.focusCount(), 1);
  assert.equal(editing.destroyCount(), 0);
  assert.equal(editRejects[0].reason, "validation");
  assert.deepEqual(editRejects[0].validation, {
    ok: false, errors: [{ severity: "error", message: "Value is required" }]
  });
  assert.equal(editRejects[0].source, grid);
  assert.equal(editRejects[0].columnId, "value");
  assert.equal(grid.data.get("a").value, "old");
});

test("Grid destroys active editor when the visible projection changes", () => {
  const grid = createEditingGrid();
  const editing = attachFakeEditor(grid, "new");
  const cancels = [];
  grid.events.on("editCancel", event => cancels.push(event));

  grid.data.add({ id: "b", value: "second" }, { origin: "host" });

  assert.equal(grid._editing, null);
  assert.equal(editing.destroyCount(), 1);
  assert.equal(cancels.length, 1);
  assert.equal(cancels[0].reason, "add");
  assert.equal(cancels[0].origin, "host");
});

test("Grid destroy also destroys the active editor", () => {
  const grid = createEditingGrid();
  const editing = attachFakeEditor(grid, "new");

  grid.destroy();

  assert.equal(editing.destroyCount(), 1);
});

test("Grid column set can reject checkbox edit without false change event", () => {
  const grid = new Grid({
    columns: [
      {
        id: "active",
        editor: gridEditors.checkbox(),
        set: () => false
      }
    ]
  });
  const cellChanges = [];
  const editRejects = [];

  grid.data.parse([{ id: "a", active: false }]);
  grid.events.on("cellChange", event => cellChanges.push(event));
  grid.events.on("editReject", event => editRejects.push(event));

  const changed = grid._toggleCheckboxCell(grid.data.get("a"), grid.getColumn("active"), {
    origin: "user",
    userAction: true
  });

  assert.equal(changed, false);
  assert.equal(cellChanges.length, 0);
  assert.equal(editRejects.length, 1);
  assert.equal(editRejects[0].reason, "write-rejected");
});

function createEditingGrid() {
  const grid = new Grid({
    columns: [{ id: "value", editor: gridEditors.text() }]
  });
  grid.data.parse([{ id: "a", value: "old" }]);
  return grid;
}

function attachFakeEditor(grid, value, options = {}) {
  let focusCount = 0;
  let destroyCount = 0;
  const item = grid.data.get("a");
  const cellEditor = {
    getValidationRevision: () => 0, // This fixture returns an immutable captured value.
    getValue: () => value,
    validate: () => options.validation ?? { ok: true, errors: [], value },
    focus() {
      focusCount += 1;
    },
    destroy() {
      destroyCount += 1;
    }
  };
  const editing = {
    item,
    id: "a",
    column: grid.getColumn("value"),
    editor: grid.getColumn("value").editor,
    cellEditor,
    oldValue: item.value,
    editorElement: {},
    cell: {
      classList: {
        remove() {}
      }
    },
    origin: "user",
    userAction: true,
    focusCount: () => focusCount,
    destroyCount: () => destroyCount
  };

  grid._editing = editing;
  return editing;
}
