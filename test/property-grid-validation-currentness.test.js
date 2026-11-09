import test from 'node:test';
import assert from 'node:assert/strict';
import { PropertyGrid } from '../src/ui/PropertyGrid.js';
import { TextInput } from '../src/ui/TextInput.js';
import { NumberInput } from '../src/ui/NumberInput.js';
import { ControlCellEditor } from '../src/ui/GridEditors.js';

function setup(mode, editor = new ControlCellEditor(new TextInput({ value: 'b' }), {})) {
  const writes = [];
  const property = { name: 'value', type: mode === 'inline' ? 'text' : 'customText', value: 'a', set: value => writes.push(value) };
  const grid = new PropertyGrid({ source: [{ id: 'general', properties: [property] }] });
  const row = grid.getPropertyControl('value');
  const editing = { row, editor, oldValue: 'a', cell: { classList: { remove() {} }, replaceChildren() {}, textContent: '' } };
  if (mode === 'inline') {
    const subscription = editor.control?.events?.on('change', event => grid._handleInlineEditorChange(row, editor, event));
    grid._inlineEditors.push({ row, editor, subscription });
  } else grid._editing = editing;
  const phases = [];
  for (const type of ['beforePropertyChange', 'propertyChange', 'afterPropertyChange']) grid.events.on(type, () => phases.push(type));
  const attempt = options => mode === 'inline'
    ? grid._handleInlineEditorChange(row, editor, { origin: 'user', userAction: true, ...options })
    : grid.commitEdit(options);
  return { grid, row, property, editor, editing, writes, phases, attempt, mode };
}
function assertNoWrite(state) {
  assert.equal(state.property.value, 'a');
  assert.equal(state.row.value, 'a');
  assert.deepEqual(state.writes, []);
  assert.deepEqual(state.phases, []);
  if (state.mode !== 'inline') assert.equal(state.grid._editing, state.editing);
  assert.notEqual(state.editor.destroyed, true);
}

for (const mode of ['staged', 'inline']) {
  for (const change of ['silent', 'nested', 'aba']) {
    test(`PropertyGrid ${mode} rejects validation ${change} without rollback or automatic retry`, t => {
      const state = setup(mode);
      t.after(() => state.grid.destroy());
      const seen = [];
      state.editor.control.validators = [value => {
        seen.push(value);
        if (seen.length === 1) {
          state.editor.control.value.set('c', { silent: change !== 'nested' });
          if (change === 'aba') state.editor.control.value.set('b', { silent: true });
        }
        return null;
      }];
      state.attempt();
      assertNoWrite(state);
      assert.equal(state.editor.control.value.get(), change === 'aba' ? 'b' : 'c');
      assert.deepEqual(seen, ['b']);
      state.attempt();
      assert.equal(state.property.value, change === 'aba' ? 'b' : 'c');
      assert.deepEqual(state.writes, [change === 'aba' ? 'b' : 'c']);
      assert.deepEqual(seen, ['b', change === 'aba' ? 'b' : 'c']);
    });
  }
  test(`PropertyGrid ${mode} final getter mutation does not save or restore callback value`, t => {
    const state = setup(mode);
    t.after(() => state.grid.destroy());
    let validated = false;
    state.editor.control.validators = [() => { validated = true; return null; }];
    state.editor.getValue = () => {
      const value = state.editor.control.value.get();
      if (validated) state.editor.control.value.set('c', { silent: true });
      return value;
    };
    state.attempt();
    assertNoWrite(state);
    assert.equal(state.editor.control.value.get(), 'c');
  });
  for (const action of ['veto', 'noop']) {
    test(`PropertyGrid ${mode} ${action} write during validation remains current`, t => {
      const state = setup(mode);
      t.after(() => state.grid.destroy());
      if (action === 'veto') state.editor.control.events.on('beforeChange', event => { event.cancel = true; });
      state.editor.control.validators = [() => {
        state.editor.control.value.set(action === 'noop' ? 'b' : 'c'); return null;
      }];
      state.attempt();
      assert.equal(state.property.value, 'b');
      assert.deepEqual(state.writes, ['b']);
    });
  }
  for (const action of ['readonly', 'disable', 'replace']) {
    test(`PropertyGrid ${mode} stops after validation ${action}`, t => {
      const state = setup(mode);
      t.after(() => state.grid.destroy());
      state.editor.control.validators = [() => {
        if (action === 'readonly') state.property.readOnly = true;
        if (action === 'disable') state.grid.disable();
        if (action === 'replace') state.grid.bind([{ properties: [{ name: 'value', type: 'text', value: 'replacement' }] }]);
        return null;
      }];
      state.attempt();
      assert.equal(state.property.value, 'a');
      assert.deepEqual(state.writes, []);
      assert.deepEqual(state.phases, []);
    });
  }
  test(`PropertyGrid ${mode} revision reader property teardown skips returned callback`, () => {
    const state = setup(mode);
    let lookup = 0, calls = 0;
    Object.defineProperty(state.editor.control, 'getValidationRevision', { get() {
      ++lookup; state.grid.destroy(); return () => { ++calls; return 0; };
    } });
    state.attempt();
    assert.equal(lookup, 1);
    assert.equal(calls, 0);
    assert.deepEqual(state.writes, []);
  });
  test(`PropertyGrid ${mode} constant public token cannot weaken inherited tracking`, t => {
    const state = setup(mode);
    t.after(() => state.grid.destroy());
    state.editor.control.getValidationRevision = () => 0;
    state.editor.control.validators = [() => {
      state.editor.control.value.set('c', { silent: true });
      state.editor.control.value.set('b', { silent: true });
      return null;
    }];
    state.attempt();
    assertNoWrite(state);
  });
  test(`PropertyGrid ${mode} missing custom hook refuses even without validator`, t => {
    const control = { mount() {}, focus() {}, destroy() {}, value: { get: () => 'b', set() {} } };
    const state = setup(mode, new ControlCellEditor(control, {}));
    t.after(() => state.grid.destroy());
    state.attempt();
    assertNoWrite(state);
    control.getValidationRevision = () => 0n;
    state.attempt();
    assert.equal(state.property.value, 'b');
  });
  test(`PropertyGrid ${mode} pending numeric candidate change after validation is stale`, t => {
    const input = new NumberInput({ value: 2, updateMode: 'commit' });
    input._input = { value: '2', validity: {} };
    const state = setup(mode, new ControlCellEditor(input, {}));
    t.after(() => state.grid.destroy());
    input.validators = [() => { input._input.value = '9'; input._handleInput({}); return null; }];
    state.attempt();
    assertNoWrite(state);
    assert.equal(input.value.get(), 2);
    assert.equal(input.hasPendingInput(), true);
  });
  test(`PropertyGrid ${mode} ordinary owner veto keeps its existing restoration behavior`, t => {
    const state = setup(mode);
    t.after(() => state.grid.destroy());
    state.grid.events.on('beforePropertyChange', event => { event.cancel = true; });
    state.attempt();
    assert.equal(state.property.value, 'a');
    assert.deepEqual(state.writes, []);
    assert.equal(state.editor.control.value.get(), mode === 'inline' ? 'a' : 'b');
  });
  test(`PropertyGrid ${mode} validation-result accessor mutation is stale`, t => {
    const state = setup(mode);
    t.after(() => state.grid.destroy());
    state.editor.validate = () => ({ get ok() { state.editor.control.value.set('c', { silent: true }); return true; } });
    state.attempt();
    assertNoWrite(state);
    assert.equal(state.editor.control.value.get(), 'c');
  });
}

for (const mode of ['staged', 'inline']) {
  for (const silent of [false, true]) {
    for (const failure of ['missing', 'invalid', 'throw', 'unstable', 'stale']) {
      test(`PropertyGrid ${mode} ${failure} diagnostic preserves identity and silence=${silent}`, t => {
        const state = setup(mode);
        t.after(() => state.grid.destroy());
        const rejections = [];
        state.grid.events.on('editReject', event => rejections.push(event));
        if (failure === 'stale') state.editor.control.validators = [() => {
          state.editor.control.value.set('c', { silent: true }); return null;
        }];
        else if (failure === 'missing') {
          const control = { mount() {}, focus() {}, destroy() {}, value: { get: () => 'b', set() {} } };
          state.editor.control.destroy(); state.editor.control = control;
        } else state.editor.control.getValidationRevision = failure === 'throw'
          ? () => { throw new Error('invalid reader'); }
          : failure === 'unstable' ? () => Symbol('fresh') : () => -1;
        assert.equal(state.attempt({ silent, origin: 'import', userAction: false }), false);
        assertNoWrite(state);
        assert.equal(rejections.length, silent ? 0 : 1);
        if (!silent) {
          const event = rejections[0];
          assert.equal(event.source, state.grid);
          assert.equal(event.property, state.property);
          assert.equal(event.name, 'value');
          assert.equal(event.oldValue, 'a');
          assert.equal(event.origin, 'import');
          assert.equal(event.userAction, false);
          assert.equal('cancel' in event, false);
          assert.equal(event.reason, failure === 'stale' ? 'validation-stale' : 'validation-revision');
          assert.equal(event.validation.source, state.editor);
          assert.equal(event.validation.ok, false);
          if (failure === 'stale') assert.deepEqual(event.validation.errors, []);
          else assert.equal(event.validation.errors[0].code, 'validationRevision');
        }
      });
    }
  }
  for (const cancel of [false, true]) {
    test(`PropertyGrid ${mode} newer beforePropertyChange callback state survives cancel=${cancel}`, t => {
      const state = setup(mode);
      t.after(() => state.grid.destroy());
      const rejects = [];
      state.grid.events.on('editReject', event => rejects.push(event.reason));
      state.grid.events.on('beforePropertyChange', event => {
        state.editor.control.value.set('c', { silent: true }); event.cancel = cancel;
      });
      assert.equal(state.attempt(), false);
      assert.equal(state.property.value, 'a');
      assert.equal(state.row.value, 'a');
      assert.equal(state.editor.control.value.get(), 'c');
      assert.deepEqual(state.writes, []);
      assert.deepEqual(state.phases, ['beforePropertyChange']);
      assert.deepEqual(rejects, ['validation-stale']);
    });
  }
  test(`PropertyGrid ${mode} ordinary invalid result stays silent and retains the value`, t => {
    const state = setup(mode);
    t.after(() => state.grid.destroy());
    state.editor.control.validators = [() => 'invalid'];
    let rejects = 0;
    state.grid.events.on('editReject', () => ++rejects);
    assert.equal(state.attempt(), false);
    assertNoWrite(state);
    assert.equal(rejects, 0);
    assert.equal(state.editor.control.value.get(), 'b');
  });
  test(`PropertyGrid ${mode} rejection callback teardown stops later processing`, () => {
    const state = setup(mode);
    state.editor.control.validators = [() => { state.editor.control.value.set('c', { silent: true }); return null; }];
    let rejects = 0;
    state.grid.events.on('editReject', () => { ++rejects; state.grid.destroy(); });
    assert.equal(state.attempt(), false);
    assert.equal(rejects, 1);
    assert.equal(state.grid.destroyed, true);
    assert.deepEqual(state.writes, []);
  });
  test(`PropertyGrid ${mode} final validate property lookup teardown skips returned callback`, () => {
    const state = setup(mode);
    let called = 0;
    Object.defineProperty(state.editor, 'validate', { get() {
      state.grid.destroy(); return () => { ++called; return { ok: true }; };
    } });
    assert.equal(state.attempt(), false);
    assert.equal(called, 0);
    assert.deepEqual(state.writes, []);
  });
  test(`PropertyGrid ${mode} exception releases its attempt guard`, t => {
    const state = setup(mode);
    t.after(() => state.grid.destroy());
    state.editor.validate = () => { throw new Error('validator failed'); };
    assert.throws(() => state.attempt(), /validator failed/);
    state.editor.validate = () => ({ ok: true });
    assert.equal(state.attempt(), true);
    assert.equal(state.property.value, 'b');
  });
}

for (const disabled of [false, true]) for (const readOnly of [false, true]) {
  test(`PropertyGrid inline initial API hydration disabled=${disabled} readonly=${readOnly} stays supported`, t => {
    const state = setup('inline');
    t.after(() => state.grid.destroy());
    state.property.readOnly = readOnly;
    if (disabled) state.grid.disable();
    assert.equal(state.attempt({ origin: 'api', userAction: false }), true);
    assert.equal(state.property.value, 'b');
    assert.deepEqual(state.writes, ['b']);
  });
}

test('PropertyGrid inline nested writes cannot save a hidden c, but another PropertyGrid remains independent', t => {
  const state = setup('inline'), other = setup('inline');
  t.after(() => { state.grid.destroy(); other.grid.destroy(); });
  const seen = [];
  state.editor.control.validators = [value => {
    seen.push(value);
    state.editor.control.value.set('c');
    assert.equal(state.grid.commitEdit(), false);
    assert.equal(other.attempt(), true);
    return null;
  }];
  assert.equal(state.attempt(), false);
  assertNoWrite(state);
  assert.equal(state.editor.control.value.get(), 'c');
  assert.deepEqual(seen, ['b']);
  assert.equal(other.property.value, 'b');
  assert.deepEqual(other.writes, ['b']);
});

for (const mode of ['staged', 'inline']) {
  for (const method of ['validate', 'getValue']) {
    test(`PropertyGrid ${mode} wrapped final ${method} lookup teardown skips late callback and save`, () => {
      const control = { destroyed: false, mount() {}, focus() {}, destroy() { this.destroyed = true; },
        getValidationRevision: () => 0, value: { get: () => 'b', set() {} } };
      const state = setup(mode, new ControlCellEditor(control, {}));
      let late = 0, armed = false, reads = 0;
      control.validate = () => { armed = true; return { ok: true }; };
      const callback = () => { if (control.destroyed) ++late; return method === 'validate' ? { ok: true } : 'b'; };
      Object.defineProperty(method === 'validate' ? control : control.value, method === 'validate' ? 'validate' : 'get', { get() {
        if (method === 'validate' || (armed && ++reads === 3)) control.destroy();
        return callback;
      } });
      assert.equal(state.attempt(), false);
      assert.equal(late, 0);
      assert.equal(control.destroyed, true);
      assert.equal(state.property.value, 'a');
      assert.deepEqual(state.writes, []);
      assert.deepEqual(state.phases, []);
      state.grid.destroy();
    });
  }
}
