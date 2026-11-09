import test from 'node:test';
import assert from 'node:assert/strict';
import { Grid } from '../src/ui/Grid.js';
import { gridEditors } from '../src/ui/GridEditors.js';
import { DataStore } from '../src/core/DataStore.js';

function setup(columns = [{ id: 'name', editor: gridEditors.text() }]) {
  const grid = new Grid({ columns });
  grid.data.parse([{ id: 1, name: 'One', flag: false }, { id: 2, name: 'Two', flag: false }]);
  range(grid, 1, columns[0].id);
  return grid;
}
function range(grid, id, columnId = 'name') {
  grid.setCellRanges({ anchor: { rowId: id, columnId }, focus: { rowId: id, columnId } });
}

test('Grid paste applies the draft and keeps current record and attempt metadata across columns', () => {
  const seen = [];
  const grid = setup([{ id: 'name', editor: gridEditors.text() },
    { id: 'flag', editor: gridEditors.checkbox(context => {
      seen.push(context.item.name); return {};
    }) }]);
  const events = [];
  grid.events.on('beforeCellChange', event => {
    if (event.columnId === 'name') event.newValue = 'Adjusted';
    event.id = 2; event.origin = 'user'; event.userAction = true;
  });
  for (const type of ['cellChange', 'clipboardPaste']) grid.events.on(type, event => events.push(event));
  assert.equal(grid.pasteClipboardText('Pasted\ttrue', { origin: 'system', userAction: false }), true);
  assert.equal(grid.data.get(1).name, 'Adjusted');
  assert.equal(grid.data.get(1).flag, true);
  assert.equal(grid.data.get(2).name, 'Two');
  assert.deepEqual(seen, ['Adjusted']);
  assert.ok(events.every(event => event.origin === 'system' && event.userAction === false));
  assert.equal(events[0].id, 1);
  assert.equal(events.at(-1).changed, 2);
  assert.equal(grid.data.undo(), true);
  assert.equal(grid.data.get(1).name, 'One');
  assert.equal(grid.data.get(1).flag, false);
  grid.destroy();
});

test('Grid silent paste validates, forwards silent to writers and synchronizes the view without semantic events', () => {
  const writes = [], validations = [], events = [];
  const grid = setup([{ id: 'name', editor: gridEditors.text({ validators: [value => { validations.push(value); return null; }] }),
    set: (_item, value, context) => {
      writes.push([context.origin, context.userAction, context.silent]);
      return context.source.data.update(context.id, { name: value }, context);
    } }]);
  for (const type of ['beforeCellChange', 'cellChange', 'clipboardPaste', 'editReject']) grid.events.on(type, () => events.push(type));
  for (const type of ['beforeChange', 'change', 'afterChange']) grid.data.events.on(type, () => events.push(type));
  assert.equal(grid.pasteClipboardText('New', { silent: true }), true);
  assert.deepEqual(writes, [['api', false, true]]);
  assert.deepEqual(validations, ['New']);
  assert.deepEqual(events, []);
  assert.equal(grid.view.get(1).name, 'New');
  grid.destroy();
});

for (const reason of ['clipboard-parse', 'validation', 'before-cell-change', 'write-rejected']) {
  test(`Grid immediate writes report ${reason} with identity and attempt provenance`, () => {
    const grid = setup([{ id: 'flag', dataType: 'boolean', editor: gridEditors.checkbox({
      validators: [() => reason === 'validation' ? 'Blocked' : null]
    }), ...(reason === 'write-rejected' ? { set: () => false } : {}) }]);
    const events = [];
    grid.events.on('editReject', event => events.push(event));
    if (reason === 'before-cell-change') grid.events.on('beforeCellChange', event => { event.cancel = true; });
    assert.equal(grid.pasteClipboardText(reason === 'clipboard-parse' ? 'invalid' : 'true'), false);
    assert.equal(events.length, 1);
    const event = events[0];
    assert.deepEqual([event.reason, event.id, event.columnId, event.oldValue, event.origin, event.userAction],
      [reason, 1, 'flag', false, 'api', false]);
    if (reason === 'clipboard-parse') assert.ok(event.error instanceof TypeError);
    if (reason === 'validation') assert.equal(event.validation.ok, false);
    assert.equal(grid.data.get(1).flag, false);
    grid.destroy();
  });
}

for (const phase of ['factory', 'validate', 'getValue', 'destroy', 'beforeCellChange', 'cellChange']) {
  test(`Grid paste stops safely when ${phase} closes its owning table`, () => {
    let grid, disposed = 0, writes = 0;
    const editor = gridEditors.custom(context => {
      if (phase === 'factory') grid.destroy();
      return { mount() {}, focus() {}, getValidationRevision: () => 0,
        validate() { if (phase === 'validate') grid.destroy(); return { ok: true }; },
        getValue() { if (phase === 'getValue') grid.destroy(); return context.value; },
        destroy() { disposed++; if (phase === 'destroy') grid.destroy(); }
      };
    });
    grid = setup([{ id: 'name', editor }]);
    grid.events.on('beforeCellChange', () => { if (phase === 'beforeCellChange') grid.destroy(); });
    grid.events.on('cellChange', () => { writes++; if (phase === 'cellChange') grid.destroy(); });
    assert.equal(grid.pasteClipboardText('New\nLater'), phase === 'cellChange');
    assert.equal(grid.destroyed, true);
    assert.equal(disposed, 1);
    assert.equal(writes, phase === 'cellChange' ? 1 : 0);
  });
}

test('Grid immediate cleanup preserves a replacement editor and releases guards after throwing', () => {
  let grid, disposed = 0, replacementDisposed = 0, fail = true;
  const replacement = { cellEditor: { destroy() { replacementDisposed++; } } };
  const editor = gridEditors.custom(context => ({ mount() {}, focus() {}, getValidationRevision: () => 0,
    validate() { if (fail) throw new Error('Failed'); grid._editing = replacement; return { ok: true }; },
    getValue: () => context.value, destroy() { disposed++; }
  }));
  grid = setup([{ id: 'name', editor }]);
  assert.throws(() => grid.pasteClipboardText('New'), /Failed/);
  fail = false;
  assert.equal(grid.pasteClipboardText('New'), false);
  assert.equal(grid._editing, replacement);
  assert.equal(disposed, 2); assert.equal(replacementDisposed, 0);
  grid.destroy();
  assert.equal(replacementDisposed, 1);
});

test('Grid fast toggle validates, honors draft veto and silent, and blocks recursive writes', () => {
  let blocked = true;
  const grid = setup([{ id: 'flag', editor: gridEditors.switch({ validators: [() => blocked ? 'Blocked' : null] }) }]);
  const events = [];
  for (const type of ['editReject', 'cellChange', 'editCommit']) grid.events.on(type, event => events.push([type, event.origin, event.userAction]));
  const toggle = options => grid._toggleCheckboxCell(grid.data.get(1), grid.getColumn('flag'), options);
  assert.equal(toggle({ origin: 'user' }), false);
  blocked = false;
  const listener = grid.events.on('beforeCellChange', event => {
    assert.equal(toggle(), false); event.newValue = false;
  });
  assert.equal(toggle(), false);
  listener.dispose();
  assert.equal(toggle({ origin: 'user' }), true);
  assert.equal(toggle({ silent: true }), true);
  assert.equal(grid.data.get(1).flag, false);
  assert.deepEqual(events, [['editReject', 'user', true], ['cellChange', 'user', true], ['editCommit', 'user', true]]);
  grid.destroy();
});

test('Grid asynchronous clipboard binds targets to the request and suppresses late UI events', async () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  let finish;
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { clipboard: {
    writeText: () => new Promise(resolve => { finish = resolve; }),
    readText: () => new Promise(resolve => { finish = resolve; })
  } } });
  try {
    for (const operation of ['cut', 'paste']) for (const change of ['selection', 'data', 'destroy']) {
      const grid = setup();
      const pending = grid[operation]();
      if (change === 'selection') range(grid, 2);
      if (change === 'data') grid.data.update(1, { name: 'Edited' });
      if (change === 'destroy') grid.destroy();
      finish('Replacement');
      assert.equal(await pending, false);
      if (!grid.destroyed) {
        assert.equal(grid.data.get(1).name, change === 'data' ? 'Edited' : 'One');
        assert.equal(grid.data.get(2).name, 'Two');
        grid.destroy();
      }
    }
    const grid = setup(); let events = 0;
    grid.events.on('clipboardCopy', () => { events++; });
    const pending = grid.copy(); grid.destroy(); finish();
    assert.equal(await pending, true); assert.equal(events, 0);
    const cutGrid = setup(); let captured;
    cutGrid.events.on('clipboardCut', event => { captured = event; range(cutGrid, 2); });
    const cut = cutGrid.cut(); finish();
    assert.equal(await cut, false);
    assert.equal(captured.ranges[0].anchor.rowId, 1);
    assert.equal(cutGrid.data.get(1).name, 'One');
    assert.equal(cutGrid.data.get(2).name, 'Two');
    cutGrid.destroy();

    const silent = setup(); let silentEvents = 0;
    silent.setCellRanges({ anchor: { rowId: 1, columnId: 'name' }, focus: { rowId: 2, columnId: 'name' } });
    silent.events.on('clipboardCut', () => { silentEvents++; });
    silent.events.on('cellChange', () => { silentEvents++; });
    silent.data.events.on('change', () => { silentEvents++; });
    const clear = silent.cut({ silent: true }); finish();
    assert.equal(await clear, true);
    assert.deepEqual(silent.view.all().map(row => row.name), ['', '']);
    assert.equal(silentEvents, 0);
    assert.equal(silent.data.undo(), true);
    assert.deepEqual(silent.data.all().map(row => row.name), ['One', 'Two']);
    silent.destroy();
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'navigator', descriptor);
    else delete globalThis.navigator;
  }
});

test('DataStore destruction during a batch is terminal even if the callback throws', () => {
  for (const throws of [false, true]) {
    const data = new DataStore(); data.parse([{ id: 1 }]);
    const run = () => data.batch(store => {
      store.update(1, { name: 'New' }); store.destroy();
      if (throws) throw new Error('After destruction');
      return 'done';
    });
    if (throws) assert.throws(run, /After destruction/);
    else assert.equal(run(), 'done');
    assert.equal(data._items.length, 0);
    assert.equal(data._itemsById.size, 0);
    assert.throws(() => data.all(), /destroyed/);
  }
});

test('DataStore stops writes and later event phases after a listener destroys it', () => {
  for (const phase of ['beforeChange', 'invalidate', 'change']) {
    const data = new DataStore(); data.parse([{ id: 1 }]);
    const seen = [];
    for (const type of ['beforeChange', 'invalidate', 'change', 'afterChange']) data.events.on(type, () => {
      seen.push(type); if (type === phase) data.destroy();
    });
    assert.equal(data.update(1, { name: 'New' }), phase !== 'beforeChange');
    assert.deepEqual(seen, ['beforeChange', 'invalidate', 'change'].slice(0, ['beforeChange', 'invalidate', 'change'].indexOf(phase) + 1));
    assert.equal(data._items.length, 0);
  }
});
