import test from 'node:test';
import assert from 'node:assert/strict';
import { Grid } from '../src/ui/Grid.js';
import { TreeGrid } from '../src/ui/TreeGrid.js';
import { TextInput } from '../src/ui/TextInput.js';
import { NumberInput } from '../src/ui/NumberInput.js';
import { ControlCellEditor, gridEditors } from '../src/ui/GridEditors.js';

function customEditor() {
  let value = 'b', revision = 0;
  return {
    mount() {}, focus() {}, destroy() { this.destroyed = true; },
    getValue: () => value, validate: () => ({ ok: true }),
    getValidationRevision: () => revision,
    write(next) { if (!Object.is(value, next)) { value = next; ++revision; } },
    draft() { ++revision; }
  };
}
function setup(Table, editor = new ControlCellEditor(new TextInput({ value: 'b' }), {})) {
  const grid = new Table({ columns: [{ id: 'value' }] });
  grid.data.parse([{ id: 1, parentId: null, value: 'a' }]);
  const editing = { item: grid.data.get(1), id: 1, column: grid.getColumn('value'),
    oldValue: 'a', cellEditor: editor, cell: { classList: { remove() {} } } };
  grid._editing = editing;
  const events = [];
  for (const type of ['editReject', 'beforeCellChange', 'cellChange', 'editCommit']) {
    grid.events.on(type, event => events.push({ type, ...event }));
  }
  return { grid, editing, editor, events };
}
function refused(state, reason = 'validation-stale', silent = false) {
  assert.equal(state.grid.data.get(1).value, 'a');
  assert.equal(state.grid._editing, state.editing);
  assert.equal(state.editor.destroyed, false);
  assert.deepEqual(state.events.map(event => event.type), silent ? [] : ['editReject']);
  if (!silent) {
    assert.equal(state.events[0].reason, reason);
    assert.equal(state.events[0].validation.ok, false);
    if (reason === 'validation-revision') assert.equal(state.events[0].validation.errors[0].code, 'validationRevision');
    else assert.deepEqual(state.events[0].validation.errors, []);
  }
}

for (const Table of [Grid, TreeGrid]) {
  for (const mode of ['change', 'aba', 'silent-attempt', 'constant-public']) {
    test(`${Table.name} rejects built-in validation ${mode} and validates a later explicit attempt`, t => {
      const state = setup(Table), { grid, editor } = state;
      t.after(() => grid.destroy());
      const control = editor.control;
      if (mode === 'constant-public') control.getValidationRevision = () => 0;
      const seen = [];
      control.validators = [value => { seen.push(value); if (seen.length === 1) {
        control.value.set('c', { silent: true });
        if (mode === 'aba') control.value.set('b', { silent: true });
      } return null; }];
      const silent = mode === 'silent-attempt';
      assert.equal(grid.commitEdit({ silent }), false);
      refused(state, 'validation-stale', silent);
      assert.equal(control.value.get(), mode === 'aba' ? 'b' : 'c');
      assert.deepEqual(seen, ['b']);
      assert.equal(grid.commitEdit({ silent }), true);
      assert.deepEqual(seen, ['b', mode === 'aba' ? 'b' : 'c']);
      assert.equal(grid.data.get(1).value, mode === 'aba' ? 'b' : 'c');
    });
  }
  for (const mode of ['veto', 'noop']) {
    test(`${Table.name} does not stale valid ${mode} writes`, t => {
      const { grid, editor } = setup(Table);
      t.after(() => grid.destroy());
      if (mode === 'veto') editor.control.events.on('beforeChange', event => { event.cancel = true; });
      editor.control.validators = [() => { editor.control.value.set(mode === 'veto' ? 'c' : 'b'); return null; }];
      assert.equal(grid.commitEdit(), true);
      assert.equal(grid.data.get(1).value, 'b');
    });
  }
  test(`${Table.name} rejects a newly pending numeric candidate after preparation`, t => {
    const input = new NumberInput({ value: 2, updateMode: 'commit' });
    input._input = { value: '2', validity: {} };
    const state = setup(Table, new ControlCellEditor(input, {}));
    t.after(() => state.grid.destroy());
    input.validators = [() => { input._input.value = '9'; input._handleInput({}); return null; }];
    assert.equal(state.grid.commitEdit(), false);
    refused(state);
    assert.equal(input.value.get(), 2);
    assert.equal(input.hasPendingInput(), true);
  });
  test(`${Table.name} rejects mutation by final getValue without retrying or reverting it`, t => {
    const state = setup(Table), { grid, editor } = state;
    t.after(() => grid.destroy());
    let validations = 0, reads = 0;
    editor.control.validators = [() => { ++validations; return null; }];
    editor.getValue = () => { ++reads; const old = editor.control.value.get(); editor.control.value.set('c', { silent: true }); return old; };
    assert.equal(grid.commitEdit(), false);
    refused(state);
    assert.equal(editor.control.value.get(), 'c');
    assert.equal(validations, 1);
    assert.equal(reads, 1);
  });
  for (const mode of ['change', 'aba', 'candidate']) {
    test(`${Table.name} guards independent custom ${mode} revisions`, t => {
      const editor = customEditor(), state = setup(Table, editor);
      editor.destroyed = false;
      t.after(() => state.grid.destroy());
      editor.validate = () => {
        if (mode === 'candidate') editor.draft();
        else { editor.write('c'); if (mode === 'aba') editor.write('b'); }
        return { ok: true };
      };
      assert.equal(state.grid.commitEdit(), false);
      refused(state);
      assert.equal(editor.getValue(), mode === 'change' ? 'c' : 'b');
    });
  }
  for (const token of [0, 0n, Symbol('revision')]) {
    test(`${Table.name} accepts a stable ${typeof token} custom token and pure getters`, t => {
      const editor = customEditor(), { grid } = setup(Table, editor);
      t.after(() => grid.destroy());
      editor.getValidationRevision = () => token;
      assert.equal(editor.getValue(), 'b');
      assert.equal(editor.getValue(), 'b');
      assert.equal(grid.commitEdit(), true);
      assert.equal(grid.data.get(1).value, 'b');
    });
  }
  for (const kind of ['missing', 'not-function', 'undefined', 'object', 'negative', 'fraction', 'unsafe', 'nan', 'promise', 'unstable', 'throw']) {
    test(`${Table.name} fails closed for custom revision ${kind}`, t => {
      const editor = customEditor(), state = setup(Table, editor);
      editor.destroyed = false;
      t.after(() => state.grid.destroy());
      let validated = 0, reads = 0;
      editor.validate = () => { ++validated; return { ok: true }; };
      editor.getValue = () => { ++reads; return 'b'; };
      const values = { undefined: undefined, object: {}, negative: -1, fraction: 0.5,
        unsafe: Number.MAX_SAFE_INTEGER + 1, nan: NaN, promise: Promise.resolve(0) };
      if (kind === 'missing') delete editor.getValidationRevision;
      else if (kind === 'not-function') editor.getValidationRevision = 1;
      else if (kind === 'unstable') editor.getValidationRevision = () => Symbol('fresh');
      else if (kind === 'throw') editor.getValidationRevision = () => { throw new Error('broken hook'); };
      else editor.getValidationRevision = () => values[kind];
      assert.equal(state.grid.commitEdit(), false);
      refused(state, 'validation-revision');
      assert.equal(validated, 0);
      assert.equal(reads, 0);
    });
  }
  test(`${Table.name} diagnoses a decreasing custom token`, t => {
    const editor = customEditor(), state = setup(Table, editor);
    editor.destroyed = false;
    t.after(() => state.grid.destroy());
    let token = 2;
    editor.getValidationRevision = () => token;
    editor.validate = () => { token = 1; return { ok: true }; };
    assert.equal(state.grid.commitEdit(), false);
    refused(state, 'validation-revision');
  });
  test(`${Table.name} a revision-reader write cannot hide behind a constant public token`, t => {
    const state = setup(Table), { grid, editor } = state;
    t.after(() => grid.destroy());
    editor.control.getValidationRevision = () => { editor.control.value.set('c', { silent: true }); return 0; };
    let calls = 0;
    editor.validate = () => { ++calls; return { ok: true }; };
    assert.equal(grid.commitEdit(), false);
    refused(state);
    assert.equal(calls, 0);
  });
  for (const action of ['destroy', 'cancel', 'replace']) {
    test(`${Table.name} revision reader ${action} stops all later phases`, () => {
      const editor = customEditor(), state = setup(Table, editor);
      let reads = 0, validations = 0;
      const replacement = customEditor();
      editor.getValidationRevision = () => {
        ++reads;
        if (action === 'destroy') state.grid.destroy();
        else {
          state.grid.cancelEdit({ silent: true });
          if (action === 'replace') state.grid._editing = { ...state.editing, disposed: false, cellEditor: replacement };
        }
        return 0;
      };
      editor.validate = () => { ++validations; return { ok: true }; };
      assert.equal(state.grid.commitEdit(), false);
      assert.equal(reads, 1);
      assert.equal(validations, 0);
      assert.deepEqual(state.events, []);
      if (action === 'replace') {
        assert.equal(state.grid._editing.cellEditor, replacement);
        assert.notEqual(replacement.destroyed, true);
        assert.equal(state.grid.commitEdit(), true);
      }
      state.grid.destroy();
    });
  }
  test(`${Table.name} recursive revision-reader commit is bounded without invalidating the outer attempt`, t => {
    const editor = customEditor(), { grid } = setup(Table, editor);
    t.after(() => grid.destroy());
    let reads = 0;
    editor.getValidationRevision = () => { ++reads; assert.equal(grid.commitEdit(), false); return 0; };
    assert.equal(grid.commitEdit(), true);
    assert.ok(reads > 0 && reads < 20);
  });
  test(`${Table.name} owned control replacement is stale even with unchanged token`, t => {
    const state = setup(Table), { editor, grid } = state;
    const previous = editor.control;
    t.after(() => { grid.destroy(); previous.destroy(); });
    editor.validate = () => { editor.control = new TextInput({ value: 'c' }); return { ok: true }; };
    assert.equal(grid.commitEdit(), false);
    assert.equal(grid.data.get(1).value, 'a');
    assert.equal(grid._editing, state.editing);
  });
  test(`${Table.name} beforeCellChange remains a trusted value override after validation`, t => {
    const { grid, editor } = setup(Table);
    t.after(() => grid.destroy());
    let validations = 0;
    editor.control.validators = [() => { ++validations; return null; }];
    grid.events.on('beforeCellChange', event => { editor.control.value.set('c', { silent: true }); event.newValue = 'trusted'; });
    assert.equal(grid.commitEdit(), true);
    assert.equal(validations, 1);
    assert.equal(grid.data.get(1).value, 'trusted');
  });
}

for (const mode of ['clipboard', 'toggle']) {
  test(`Grid ${mode} rejects stale temporary editor and destroys it exactly once`, t => {
    let control, destroys = 0;
    const factory = gridEditors.custom(context => {
      control = new TextInput({ value: context.value });
      control.validators = [() => { control.value.set('changed', { silent: true }); return null; }];
      const destroy = control.destroy.bind(control);
      control.destroy = () => { ++destroys; destroy(); };
      return control;
    });
    const grid = new Grid({ columns: [{ id: 'value', editor: factory }] });
    t.after(() => grid.destroy());
    grid.data.parse([{ id: 1, value: 'a' }]);
    const events = [];
    for (const type of ['editReject', 'cellChange', 'editCommit']) grid.events.on(type, event => events.push({ type, ...event }));
    assert.equal(grid._applyClipboardCell(grid.data.get(1), grid.getColumn('value'), 'b', {}, true, mode === 'toggle'), false);
    assert.equal(grid.data.get(1).value, 'a');
    assert.equal(destroys, 1);
    assert.deepEqual(events.map(event => event.type), ['editReject']);
    assert.equal(events[0].reason, 'validation-stale');
  });
}

for (const Table of [Grid, TreeGrid]) {
  for (const lookup of ['public', 'internal', 'adapter-source']) {
    test(`${Table.name} ${lookup} property lookup teardown does not call the returned reader`, async () => {
      const { validationRevision } = await import('../src/core/validationRevision.js');
      const { gridValidationSource } = await import('../src/ui/gridEditorValidation.js');
      const state = setup(Table, customEditor());
      const key = lookup === 'public' ? 'getValidationRevision' : lookup === 'internal' ? validationRevision : gridValidationSource;
      let lookups = 0, callbacks = 0;
      Object.defineProperty(state.editor, key, { configurable: true, get() {
        ++lookups; state.grid.destroy(); return () => { ++callbacks; return 0; };
      } });
      assert.equal(state.grid.commitEdit(), false);
      assert.equal(lookups, 1);
      assert.equal(callbacks, 0);
      assert.deepEqual(state.events, []);
    });
  }
  test(`${Table.name} custom control without validate still requires a revision capability`, t => {
    const control = { mount() {}, focus() {}, destroy() { this.destroyed = true; }, value: { get: () => 'b', set() {} } };
    const state = setup(Table, new ControlCellEditor(control, {}));
    t.after(() => state.grid.destroy());
    assert.equal(state.grid.commitEdit(), false);
    refused(state, 'validation-revision');
    control.getValidationRevision = () => 0n;
    assert.equal(state.grid.commitEdit(), true);
    assert.equal(state.grid.data.get(1).value, 'b');
  });
  test(`${Table.name} accepted value changes through validation-result accessor are stale`, t => {
    const state = setup(Table);
    t.after(() => state.grid.destroy());
    state.editor.validate = () => ({ get ok() { state.editor.control.value.set('c', { silent: true }); return true; } });
    assert.equal(state.grid.commitEdit(), false);
    refused(state);
    assert.equal(state.editor.control.value.get(), 'c');
  });
  test(`${Table.name} reject callback destroying the owned control never refocuses it`, t => {
    const state = setup(Table);
    t.after(() => state.grid.destroy());
    state.editor.control.validators = [() => { state.editor.control.value.set('c', { silent: true }); return null; }];
    let focus = 0;
    state.editor.focus = () => { ++focus; };
    state.grid.events.on('editReject', () => state.editor.control.destroy());
    assert.equal(state.grid.commitEdit(), false);
    assert.equal(focus, 0);
    assert.equal(state.grid.data.get(1).value, 'a');
  });
  test(`${Table.name} validator destroying the owned control skips the final getter`, t => {
    const state = setup(Table);
    t.after(() => state.grid.destroy());
    state.editor.control.validators = [() => { state.editor.control.destroy(); return null; }];
    state.editor.getValue = () => { throw new Error('late getter'); };
    assert.equal(state.grid.commitEdit(), false);
    assert.equal(state.grid.data.get(1).value, 'a');
    assert.deepEqual(state.events, []);
  });
}

for (const Table of [Grid, TreeGrid]) {
  for (const method of ['validate', 'getValue']) {
    test(`${Table.name} final ${method} property lookup teardown skips the returned function`, () => {
      const state = setup(Table), { grid, editor } = state;
      let validated = false, postValidationLookups = 0, calledAfterTeardown = 0;
      if (method === 'getValue') editor.validate = () => { validated = true; return { ok: true }; };
      const callback = () => { if (grid.destroyed) ++calledAfterTeardown; return method === 'validate' ? { ok: true } : 'b'; };
      Object.defineProperty(editor, method, { get() {
        if (method === 'validate' || (validated && ++postValidationLookups === 3)) grid.destroy();
        return callback;
      } });
      assert.equal(grid.commitEdit(), false);
      assert.equal(grid.destroyed, true);
      assert.equal(calledAfterTeardown, 0);
    });
  }
  test(`${Table.name} beforeCellChange control destruction interrupts without revalidating its trusted override`, t => {
    const { grid, editor } = setup(Table);
    t.after(() => grid.destroy());
    grid.events.on('beforeCellChange', event => { event.newValue = 'override'; editor.control.destroy(); });
    assert.equal(grid.commitEdit(), false);
    assert.equal(grid.data.get(1).value, 'a');
  });
}

for (const method of ['validate', 'getValue']) {
  test(`Grid temporary final ${method} lookup teardown skips the returned function`, () => {
    let grid, validated = false, postValidationLookups = 0, late = 0;
    const factory = gridEditors.custom(context => {
      const editor = customEditor();
      editor.validate = () => { validated = true; return { ok: true }; };
      const callback = () => { if (grid.destroyed) ++late; return method === 'validate' ? { ok: true } : context.value; };
      Object.defineProperty(editor, method, { get() {
        if (method === 'validate' || (validated && ++postValidationLookups === 3)) grid.destroy();
        return callback;
      } });
      return editor;
    });
    grid = new Grid({ columns: [{ id: 'value', editor: factory }] });
    grid.data.parse([{ id: 1, value: 'a' }]);
    assert.equal(grid._applyClipboardCell(grid.data.get(1), grid.getColumn('value'), 'b', {}, true), false);
    assert.equal(late, 0);
    grid.destroy();
  });
}

function accessorControl() {
  return { destroyed: false, mount() {}, focus() {}, destroy() { this.destroyed = true; },
    getValidationRevision: () => 0, value: { get: () => 'b', set() {} } };
}
for (const method of ['validate', 'prepareCommit', 'getValue']) {
  for (const action of ['destroy', 'replace']) {
    test(`ControlCellEditor ${method} wrapped lookup ${action} never calls the returned callback`, () => {
      const control = accessorControl(), replacement = accessorControl();
      const adapter = new ControlCellEditor(control, {});
      let lookups = 0, calls = 0;
      const key = method === 'prepareCommit' ? 'commitInput' : method === 'getValue' ? 'get' : 'validate';
      const target = method === 'getValue' ? control.value : control;
      Object.defineProperty(target, key, { configurable: true, get() {
        ++lookups;
        if (action === 'destroy') control.destroy(); else adapter.control = replacement;
        return () => { ++calls; return method === 'getValue' ? 'b' : { ok: true }; };
      } });
      const result = adapter[method]();
      assert.equal(lookups, 1);
      assert.equal(calls, 0);
      if (method === 'getValue') assert.equal(result, undefined, 'abandoned read is not a successful value');
      else assert.equal(result.ok, false);
      adapter.destroy(); control.destroy();
    });
  }
}
for (const action of ['destroy', 'replace']) {
  test(`ControlCellEditor value API lookup ${action} skips the subsequent getter lookup`, () => {
    const control = accessorControl(), adapter = new ControlCellEditor(control, {});
    let getterLookups = 0;
    Object.defineProperty(control, 'value', { get() {
      if (action === 'destroy') control.destroy(); else adapter.control = accessorControl();
      return { get get() { ++getterLookups; return () => 'b'; } };
    } });
    assert.equal(adapter.getValue(), undefined);
    assert.equal(getterLookups, 0);
    adapter.destroy(); control.destroy();
  });
}
test('ControlCellEditor optional validation fallback does not report success after a torn-down value lookup', () => {
  const control = accessorControl(), adapter = new ControlCellEditor(control, {});
  let calls = 0;
  Object.defineProperty(control.value, 'get', { get() {
    control.destroy(); return () => { ++calls; return 'b'; };
  } });
  const result = adapter.validate();
  assert.equal(calls, 0);
  assert.equal(result.ok, false);
  assert.deepEqual(result.errors, []);
  adapter.destroy();
});

for (const Table of [Grid, TreeGrid]) {
  test(`${Table.name} wrapped commitInput accessor teardown does not focus the destroyed control`, t => {
    const control = accessorControl(), editor = new ControlCellEditor(control, {}), state = setup(Table, editor);
    t.after(() => state.grid.destroy());
    let late = 0;
    control.focus = () => { if (control.destroyed) ++late; };
    Object.defineProperty(control, 'commitInput', { get() { control.destroy(); return () => ({ ok: true }); } });
    assert.equal(state.grid.commitEdit(), false);
    assert.equal(late, 0);
    assert.equal(state.grid.data.get(1).value, 'a');
    assert.equal(state.events.filter(event => ['cellChange', 'editCommit'].includes(event.type)).length, 0);
  });
}

for (const action of ['destroy', 'replace']) {
  test(`ControlCellEditor focus lookup ${action} stops the returned function`, () => {
    const control = accessorControl(), replacement = accessorControl(), adapter = new ControlCellEditor(control, {});
    let late = 0;
    Object.defineProperty(control, 'focus', { get() {
      if (action === 'destroy') control.destroy(); else adapter.control = replacement;
      return () => ++late;
    } });
    assert.equal(adapter.focus(), undefined);
    assert.equal(late, 0);
    if (action === 'replace') assert.equal(replacement.destroyed, false);
    adapter.destroy(); control.destroy();
  });
}
test('ControlCellEditor value API replacement during getter lookup abandons fallback validation', () => {
  const control = accessorControl(), adapter = new ControlCellEditor(control, {});
  let calls = 0;
  Object.defineProperty(control.value, 'get', { get() {
    control.value = { get: () => 'replacement', set() {} };
    return () => { ++calls; return 'b'; };
  } });
  const result = adapter.validate();
  assert.equal(result.ok, false);
  assert.equal(calls, 0);
  assert.equal(control.value.get(), 'replacement');
  adapter.destroy();
});
for (const method of ['prepareCommit', 'getValue', 'validate', 'focus']) {
  test(`ControlCellEditor ${method} already-destroyed adapter still throws`, () => {
    const adapter = new ControlCellEditor(accessorControl(), {});
    adapter.destroy();
    assert.throws(() => adapter[method](), /destroyed ControlCellEditor/);
  });
}

for (const Table of [Grid, TreeGrid]) {
  for (const phase of ['prepareCommit', 'validate']) {
    test(`${Table.name} wrapped ${phase} accessor replacement leaves the new session untouched`, t => {
      const control = accessorControl(), editor = new ControlCellEditor(control, {}), state = setup(Table, editor);
      t.after(() => state.grid.destroy());
      const replacement = customEditor();
      let late = 0;
      Object.defineProperty(control, phase === 'prepareCommit' ? 'commitInput' : 'validate', { get() {
        state.grid.cancelEdit({ silent: true });
        state.grid._editing = { ...state.editing, disposed: false, cellEditor: replacement };
        return () => { ++late; return { ok: true }; };
      } });
      assert.equal(state.grid.commitEdit(), false);
      assert.equal(late, 0);
      assert.equal(state.grid._editing.cellEditor, replacement);
      assert.notEqual(replacement.destroyed, true);
      assert.equal(state.grid.data.get(1).value, 'a');
      assert.deepEqual(state.events, []);
      assert.equal(state.grid.commitEdit(), true);
      assert.equal(state.grid.data.get(1).value, 'b');
    });
  }
}
