import test from 'node:test';
import assert from 'node:assert/strict';
import { Form } from '../src/ui/Form.js';
import { TextInput } from '../src/ui/TextInput.js';
import { Grid } from '../src/ui/Grid.js';
import { TreeGrid } from '../src/ui/TreeGrid.js';
import { gridEditors } from '../src/ui/GridEditors.js';

function pending(name = 'amount') {
  const field = new TextInput({ name, value: 'old' });
  let draft = true;
  field.hasPendingInput = () => draft;
  field.commitInput = options => { field.value.set('new', options); draft = false; return { ok: true }; };
  return field;
}

test('Form explicitly prepares nested fields before beforeSubmit; reads do not prepare', () => {
  const field = pending();
  const nested = new Form({ name: 'nested' }).row(field);
  const form = new Form().row(nested);
  assert.deepEqual(form.value.get(), { amount: 'old' });
  form.validate();
  assert.equal(field.hasPendingInput(), true);
  let seen;
  field.events.on('change', () => assert.equal(nested.submit(), false));
  form.events.on('beforeSubmit', event => { seen = event.value; event.cancel = true; });
  assert.equal(form.submit(), false);
  assert.deepEqual(seen, { amount: 'new' });
  assert.equal(field.hasPendingInput(), false);
  form.destroy();
});

test('Form preparation rejects failure, reentry, removed fields and newly pending drafts', () => {
  for (const mode of ['failure', 'remove', 'pending']) {
    const first = pending('first'), second = pending('second');
    const form = new Form().row(first, second);
    let submit = 0;
    form.events.on('submit', () => submit++);
    first.commitInput = () => {
      assert.equal(form.submit(), false);
      if (mode === 'remove') form.remove(second);
      return { ok: mode !== 'failure' };
    };
    assert.equal(form.submit({ focusInvalid: false }), false);
    assert.equal(submit, 0);
    form.destroy();
  }
});

test('Form silent preparation forwards mutation metadata without field/form change', () => {
  const field = pending(), form = new Form().row(field);
  let changes = 0;
  field.events.on('change', () => changes++);
  form.events.on('change', () => changes++);
  assert.equal(form.submit({ silent: true, origin: 'import' }), true);
  assert.equal(changes, 0);
  assert.equal(field.value.get(), 'new');
  form.destroy();
});

for (const Table of [Grid, TreeGrid]) {
  function setup(prepareCommit) {
    const grid = new Table({ columns: [{ id: 'amount' }] });
    grid.data.parse([{ id: 1, parentId: null, amount: 1 }]);
    const calls = [];
    const editor = { getValidationRevision: () => 0, prepareCommit: context => { calls.push('prepare'); return prepareCommit(grid, context); },
      validate: () => { calls.push('validate'); return { ok: true }; },
      getValue: () => { calls.push('get'); return 2; }, focus() {}, destroy() {} };
    grid._editing = { item: grid.data.get(1), id: 1, column: grid.getColumn('amount'), oldValue: 1,
      cellEditor: editor, cell: { classList: { remove() {} } } };
    return { grid, calls, editor };
  }
  test(`${Table.name} prepares before validation/read and forwards silent metadata`, () => {
    const { grid, calls } = setup((_grid, context) => {
      assert.equal(context.silent, true); assert.equal(context.origin, 'import'); return { ok: true };
    });
    assert.equal(grid.commitEdit({ silent: true, origin: 'import' }), true);
    assert.deepEqual(calls, ['prepare', 'validate', 'get']);
    assert.equal(grid.data.get(1).amount, 2);
    grid.destroy();
  });
  for (const kind of ['reject', 'replace', 'destroy', 'schema']) {
    test(`${Table.name} stops after prepare ${kind}`, () => {
      const { grid, calls } = setup(grid => {
        assert.equal(grid.commitEdit(), false);
        if (kind === 'replace') grid.data.update(1, { amount: 7 });
        if (kind === 'destroy') grid.destroy();
        if (kind === 'schema') grid.setColumns([{ id: 'amount' }]);
        return { ok: kind !== 'reject' };
      });
      assert.equal(grid.commitEdit(), false);
      assert.deepEqual(calls, ['prepare']);
      if (!grid.destroyed) { assert.equal(grid.data.get(1).amount, kind === 'replace' ? 7 : 1); grid.destroy(); }
    });
  }
}

test('Unmounted commit number adapter prepares without changing seeded clipboard value', () => {
  const editor = gridEditors.number({ updateMode: 'commit' }).createCellEditor({ value: 4 });
  assert.equal(editor.prepareCommit({ silent: true }).ok, true);
  assert.equal(editor.getValue(), 4);
  editor.destroy();
});

for (const action of ['disable', 'destroyEditor']) {
  test(`PropertyGrid stops before property write after callback ${action}`, async () => {
    const { PropertyGrid } = await import('../src/ui/PropertyGrid.js');
    let writes = 0;
    const grid = new PropertyGrid({ source: [{ id: 'general', properties: [
      { name: 'amount', type: 'number', value: 1, set: () => writes++ }
    ] }] });
    const row = grid.getPropertyControl('amount');
    const editor = { getValidationRevision: () => 0, prepareCommit: () => ({ ok: true }), validate: () => ({ ok: true }),
      getValue: () => 2, destroy() { this.destroyed = true; } };
    grid._editing = { row, editor, oldValue: 1 };
    grid.events.on('beforePropertyChange', () => {
      if (action === 'disable') grid.disable();
      else editor.destroy();
    });
    assert.equal(grid.commitEdit(), false);
    assert.equal(writes, 0);
    assert.equal(row.property.value, 1);
    grid._editing = null;
    grid.destroy();
  });
}

test('Grid clipboard prepare cannot continue a self-destroyed custom editor', () => {
  let reads = 0;
  const factory = gridEditors.custom(() => ({
    mount() {}, focus() {}, destroy() { this.destroyed = true; },
    prepareCommit() { this.destroy(); return { ok: true }; },
    validate() { reads++; return { ok: true }; },
    getValue() { reads++; return 9; }
  }));
  const grid = new Grid({ columns: [{ id: 'amount', editor: factory }] });
  grid.data.parse([{ id: 1, amount: 1 }]);
  assert.equal(grid._applyClipboardCell(grid.data.get(1), grid.getColumn('amount'), 9, {}, true), false);
  assert.equal(reads, 0);
  assert.equal(grid.data.get(1).amount, 1);
  grid.destroy();
});
