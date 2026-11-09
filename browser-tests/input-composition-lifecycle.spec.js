import { expect, test } from './input-test-fixture.js';

// All composition events below are explicitly synthetic. They exercise dispatch,
// phase cancellation and listener cleanup, not native IME or OS keyboard routing.
test.describe('Synthetic composition lifecycle', { tag: '@input-editing' }, () => {
  test.beforeEach(async ({ page }) => { await page.goto('/browser-tests/recipes.html'); });
  test.afterEach(async ({ page }) => { await page.evaluate(() => window.owner?.destroy()); });

  for (const kind of ['TextInput', 'TextArea', 'masked TextInput', 'NumberInput']) {
    for (const phase of ['beforeChange', 'change', 'afterChange']) {
      test(`${kind}: Form destruction during ${phase} stops phases and late synthetic input`, async ({ page }) => {
        const result = await page.evaluate(async ({ kind, phase }) => {
          const { Form, TextInput, TextArea, NumberInput } = await import('/src/ui/index.js');
          const numeric = kind === 'NumberInput';
          const Constructor = kind === 'TextArea' ? TextArea : numeric ? NumberInput : TextInput;
          const field = new Constructor({ name: 'entry', value: numeric ? 12 : '12',
            ...(kind === 'masked TextInput' ? { mask: '0000' } : {}) });
          window.owner = new Form().row(field).mount('#root');
          const input = document.querySelector('#root input, #root textarea');
          const phases = [];
          for (const current of ['beforeChange', 'change', 'afterChange', 'dirtyChange']) {
            field.events.on(current, event => {
              phases.push({ phase: current, oldValue: event.oldValue, newValue: event.newValue,
                source: event.source === field, origin: event.origin, userAction: event.userAction });
              if (current === phase) owner.destroy();
            });
          }
          input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
          input.value = '123';
          input.dispatchEvent(new InputEvent('input', { bubbles: true, data: '3',
            inputType: 'insertCompositionText', isComposing: true }));
          const retained = field.value.get();
          const count = phases.length;
          // Retained detached target must no longer call the destroyed field.
          input.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: '123' }));
          input.value = '1234';
          input.dispatchEvent(new InputEvent('input', { bubbles: true, data: '4', isComposing: false }));
          return { phases, count, retained, final: field.value.get(), destroyed: field.destroyed,
            ownerDestroyed: owner.destroyed, connected: input.isConnected,
            fields: owner.getFields().length, children: document.querySelector('#root').childElementCount };
        }, { kind, phase });
        const expectedPhases = ['beforeChange', 'change', 'afterChange'].slice(0,
          ['beforeChange', 'change', 'afterChange'].indexOf(phase) + 1);
        const numeric = kind === 'NumberInput';
        expect(result.phases).toEqual(expectedPhases.map(phase => ({ phase,
          oldValue: numeric ? 12 : '12', newValue: numeric ? 123 : '123',
          source: true, origin: 'user', userAction: true })));
        expect(result.count).toBe(expectedPhases.length);
        expect(result.retained).toBe(phase === 'beforeChange' ? (numeric ? 12 : '12') : (numeric ? 123 : '123'));
        expect(result.final).toBe(result.retained);
        expect(result).toMatchObject({ destroyed: true, ownerDestroyed: true, connected: false, fields: 0, children: 0 });
      });
    }
  }

  for (const kind of ['TextInput', 'TextArea']) {
    test(`${kind}: repeated synthetic composition input synchronizes Form once per distinct value`, async ({ page }) => {
      const result = await page.evaluate(async kind => {
        const ui = await import('/src/ui/index.js');
        const field = new ui[kind]({ name: 'entry', value: '' });
        window.owner = new ui.Form().row(field).mount('#root');
        const input = document.querySelector('#root input, #root textarea');
        const phases = [], forms = [], snapshots = [];
        for (const phase of ['beforeChange', 'change', 'afterChange']) {
          field.events.on(phase, e => phases.push({ phase, oldValue: e.oldValue, newValue: e.newValue,
            source: e.source === field, origin: e.origin, userAction: e.userAction }));
        }
        owner.events.on('change', e => forms.push(e.value.entry));
        for (const value of ['\u65e5', '\u65e5\u672c']) {
          input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
          input.value = value;
          input.dispatchEvent(new InputEvent('input', { bubbles: true, data: value,
            inputType: 'insertCompositionText', isComposing: true }));
          snapshots.push({ field: field.value.get(), form: owner.value.get(), count: phases.length });
          input.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: value }));
          input.dispatchEvent(new InputEvent('input', { bubbles: true, data: value, isComposing: false }));
        }
        return { phases, forms, snapshots, value: input.value };
      }, kind);
      expect(result.snapshots).toEqual([
        { field: '\u65e5', form: { entry: '\u65e5' }, count: 3 },
        { field: '\u65e5\u672c', form: { entry: '\u65e5\u672c' }, count: 6 }
      ]);
      expect(result.phases).toEqual(['\u65e5', '\u65e5\u672c'].flatMap((newValue, i) =>
        ['beforeChange', 'change', 'afterChange'].map(phase => ({ phase,
          oldValue: i ? '\u65e5' : '', newValue, source: true, origin: 'user', userAction: true }))));
      expect(result.forms).toEqual(['\u65e5', '\u65e5\u672c']);
      expect(result.value).toBe('\u65e5\u672c');
    });
  }

  test('NumberInput: synthetic composing arrow guards recover after interrupted/repeated dispatch', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { NumberInput } = await import('/src/ui/inputs.js');
      window.owner = new NumberInput('#root', { value: 12 });
      const input = document.querySelector('#root input');
      const changes = [], guarded = [];
      owner.events.on('change', e => changes.push({ oldValue: e.oldValue, newValue: e.newValue,
        origin: e.origin, userAction: e.userAction }));
      for (const flags of [{ isComposing: true }, { keyCode: 229 }]) {
        input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
        for (const key of ['ArrowUp', 'ArrowDown']) {
          const e = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...flags });
          input.dispatchEvent(e);
          guarded.push({ prevented: e.defaultPrevented, value: owner.value.get() });
        }
        input.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: '' }));
      }
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true, cancelable: true }));
      return { guarded, changes, value: owner.value.get(), display: input.value };
    });
    expect(result).toEqual({ guarded: Array.from({ length: 4 }, () => ({ prevented: false, value: 12 })),
      changes: [{ oldValue: 12, newValue: 13, origin: 'user', userAction: true }], value: 13, display: '13' });
  });

  for (const kind of ['Grid', 'TreeGrid']) {
    test(`${kind}: synthetic composing commit/cancel keys keep draft isolated; late events after cancel are inert`, async ({ page }) => {
      const result = await page.evaluate(async kind => {
        const { Grid, TreeGrid, gridEditors } = await import('/src/ui/grid-api.js');
        window.owner = new ({ Grid, TreeGrid }[kind])('#root', { height: 220,
          columns: [{ id: 'name', width: 180, editor: gridEditors.text() }] });
        owner.data.parse([{ id: 1, parentId: null, name: 'Old' }]);
        const commits = [], guarded = [];
        owner.events.on('editCommit', e => commits.push(e.value));
        owner.startEdit(1, 'name');
        const input = document.querySelector('.dui-grid__editor-host input');
        input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
        input.value = 'New';
        input.dispatchEvent(new InputEvent('input', { bubbles: true, data: 'New', isComposing: true }));
        for (const flags of [{ isComposing: true }, { keyCode: 229 }]) {
          for (const key of ['Enter', 'Tab', 'Escape']) {
            const e = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...flags });
            input.dispatchEvent(e);
            guarded.push({ prevented: e.defaultPrevented, connected: input.isConnected,
              value: owner.data.get(1).name, commits: commits.length });
          }
        }
        owner.cancelEdit();
        input.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: 'New' }));
        input.dispatchEvent(new InputEvent('input', { bubbles: true }));
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        const canceled = { value: owner.data.get(1).name, commits: commits.length, connected: input.isConnected };
        const reopened = owner.startEdit(1, 'name');
        const fresh = document.querySelector('.dui-grid__editor-host input');
        fresh.value = 'Final';
        fresh.dispatchEvent(new InputEvent('input', { bubbles: true }));
        fresh.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
        return { guarded, canceled, reopened, value: owner.data.get(1).name, commits: commits.length };
      }, kind);
      expect(result.guarded).toEqual(Array.from({ length: 6 }, () => ({ prevented: false,
        connected: true, value: 'Old', commits: 0 })));
      expect(result.canceled).toEqual({ value: 'Old', commits: 0, connected: false });
      expect(result).toMatchObject({ reopened: true, value: 'Final', commits: 1 });
    });
  }
});
