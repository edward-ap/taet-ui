import assert from "node:assert/strict";
import test from "node:test";

import { SelectionModel } from "../src/core/SelectionModel.js";
import { GridSelectionController } from "../src/ui/GridSelectionController.js";

function createOwner(options = {}) {
  return {
    disabled:false,
    multiSelect:options.multiSelect === true,
    selection:new SelectionModel({ multiple:options.multiSelect === true }),
    _activeId:null,
    _idOf:item => item.id
  };
}

test("GridSelectionController selects one row and synchronizes active id", () => {
  const owner = createOwner();
  const controller = new GridSelectionController(owner);
  const row = { id:"a" };

  assert.equal(controller.selectFromUser(row), true);
  assert.equal(owner._activeId, "a");
  assert.deepEqual(owner.selection.get(), [row]);
});

for (const modifier of ["ctrlKey", "metaKey"]) test(`GridSelectionController toggles rows with ${modifier} in multi-select mode`, () => {
  const owner = createOwner({ multiSelect:true });
  const controller = new GridSelectionController(owner);
  const first = { id:"a" };
  const second = { id:"b" };

  controller.selectFromUser(first);
  controller.selectFromUser(second, { [modifier]:true });
  assert.deepEqual(owner.selection.get(), [first, second]);
  controller.selectFromUser(first, { [modifier]:true });
  assert.deepEqual(owner.selection.get(), [second]);
});
