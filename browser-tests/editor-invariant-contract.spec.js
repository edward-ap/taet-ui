import { expect, test } from './input-test-fixture.js';
import { editorCases, customEditorCases } from './editor-invariant-adapters.js';

async function mount(page, ownerKind, descriptor, extra = {}) {
  await page.goto('/browser-tests/recipes.html');
  await page.evaluate(async args => {
    const { installInvariantFixture } = await import('/browser-tests/editor-invariant-adapters.js');
    await installInvariantFixture(args);
  }, { ownerKind, descriptor, ...extra });
  return page.locator(ownerKind === 'Grid' || ownerKind === 'TreeGrid' ? '.dui-grid__editor-host input' : '#root input');
}
const snapshot = page => page.evaluate(() => contract.snapshot());
const action = (page, name) => page.locator(`[data-action="${name}"]`).click();

// The adapters share observations, not parsing, commit modes or reentry precedence.
test.describe('Editor invariant contract', { tag: '@input-editing' }, () => {
  test.afterEach(async ({ page }) => { await page.evaluate(() => window.contract?.cleanup?.()); });

  for (const ownerKind of ['Form', 'NestedForm', 'Grid', 'TreeGrid']) {
    test(`${ownerKind} validation ok:false with empty errors prohibits owner save`, async ({ page }) => {
      const input = await mount(page, ownerKind, editorCases.find(c => c.id === 'number-commit'), { validationReplacement: true });
      if (ownerKind.includes('Form')) await action(page, 'save');
      else await input.press('Enter');
      const state = await snapshot(page);
      expect(state.validations).toEqual([{ ok: false, errors: [], value: 1 }]);
      expect(state.value).toBe(99);
      expect(state.stored).toBe(1);
      expect(state.saves).toEqual([]);
      expect(state.writes).toEqual([]);
      expect(state.fieldEvents).toEqual([]);
      if (ownerKind.includes('Form')) {
        expect(state.actionResult).toBe(false);
        expect(state.ownerEvents).toEqual(['beforeSubmit', 'validate', 'validationFail']);
      } else expect(state.ownerEvents).toEqual(['editReject']);
    });
  }
});


async function replaceText(input, text) {
  await input.press('ControlOrMeta+A');
  await input.pressSequentially(text);
}
const phases = state => state.fieldEvents.map(e => e.name);
const projectedValue = (ownerKind, value) => ownerKind === 'Form' ? { value } : value;
const accept = async (page, input, ownerKind) => ownerKind === 'Form' ? action(page, 'save') : input.press('Enter');

test.describe('Adapter-based editing boundaries', { tag: '@input-editing' }, () => {
  test.describe.configure({ mode: 'parallel' });
  test.afterEach(async ({ page }) => { await page.evaluate(() => window.contract?.cleanup?.()); });

  for (const descriptor of editorCases) {
    test(`${descriptor.id} silent API replacement and equal public value synchronize without phases`, async ({ page }) => {
      const input = await mount(page, 'Standalone', descriptor);
      await replaceText(input, descriptor.text);
      await expect(input).toHaveValue(descriptor.display ?? String(descriptor.next));
      const edited = await snapshot(page);
      expect(edited.value).toBe(descriptor.deferred ? descriptor.initial : descriptor.next);
      expect(edited.pending).toBe(!!descriptor.deferred);
      await action(page, 'silent');
      await expect(input).toHaveValue(String(descriptor.replacement));
      const replaced = await snapshot(page);
      expect(replaced.value).toBe(descriptor.replacement);
      expect(replaced.pending).toBe(false);
      expect(replaced.dirty).toBe(true);
      expect(replaced.fieldEvents).toEqual(edited.fieldEvents);
      await action(page, 'equal');
      await input.press('Enter');
      const equal = await snapshot(page);
      expect(equal.actionResult).toBe(false);
      expect(equal.fieldEvents).toEqual(edited.fieldEvents);
      expect(equal.value).toBe(descriptor.replacement);
    });

    for (const ownerKind of ['Form', 'Grid', 'TreeGrid']) {
      test(`${ownerKind} ${descriptor.id} separates native text, accepted field and saved store`, async ({ page }) => {
        const input = await mount(page, ownerKind, descriptor);
        await replaceText(input, descriptor.text);
        const edited = await snapshot(page);
        expect(edited.dom).toBe(descriptor.display ?? String(descriptor.next));
        expect(edited.value).toBe(descriptor.deferred ? descriptor.initial : descriptor.next);
        expect(edited.pending).toBe(!!descriptor.deferred);
        expect(edited.stored).toBe(descriptor.initial);
        expect(edited.projected).toEqual(projectedValue(ownerKind,
          ownerKind === 'Form' && !descriptor.deferred ? descriptor.next : descriptor.initial));
        expect(edited.writes).toEqual([]);
        expect(edited.saves).toEqual([]);
        expect(phases(edited)).toEqual(descriptor.deferred ? [] : ['beforeChange', 'change', 'afterChange', 'dirtyChange']);
        await accept(page, input, ownerKind);
        const saved = await snapshot(page);
        expect(saved.value).toBe(descriptor.next);
        expect(saved.stored).toBe(descriptor.next);
        expect(phases(saved)).toEqual(['beforeChange', 'change', 'afterChange', 'dirtyChange']);
        expect(saved.fieldEvents.every(e => e.origin === 'user' && e.userAction)).toBe(true);
        expect(saved.writes.length).toBe(ownerKind === 'Form' ? 0 : 1);
        expect(saved.saves).toEqual(ownerKind === 'Form' ? [{ value: descriptor.next }] : []);
        expect(saved.ownerEvents).toEqual(ownerKind === 'Form'
          ? ['beforeSubmit', 'validate', 'submit', 'afterSubmit'] : ['beforeCellChange', 'cellChange', 'editCommit']);
        if (ownerKind !== 'Form') await expect(input).toHaveCount(0);
      });
    }
  }

  // One rejection per control adapter, rotated across owners; not a parser x owner x key cross product.
  for (const [index, descriptor] of editorCases.entries()) {
    const ownerKind = ['Form', 'Grid', 'TreeGrid'][index % 3];
    test(`${ownerKind} ${descriptor.id} rejected save does not roll back accepted fields or invent store writes`, async ({ page }) => {
      const input = await mount(page, ownerKind, descriptor);
      await page.evaluate(() => contract.field.setValidators([() => 'Rejected by application']));
      await replaceText(input, descriptor.text);
      await accept(page, input, ownerKind);
      const rejected = await snapshot(page);
      // prepareCommit already accepted a deferred NumberInput before owner validation failed.
      expect(rejected.value).toBe(descriptor.next);
      expect(rejected.stored).toBe(descriptor.initial);
      expect(rejected.writes).toEqual([]);
      expect(rejected.saves).toEqual([]);
      expect(rejected.ownerEvents).toEqual(ownerKind === 'Form'
        ? ['beforeSubmit', 'validate', 'validationFail'] : ['editReject']);
      if (ownerKind === 'Form') {
        expect(rejected.actionResult).toBe(false);
        expect(rejected.projected).toEqual({ value: descriptor.next });
        // Form has no cancellation transaction; destroying it cannot invent a save.
        await action(page, 'destroy');
      } else await input.press('Escape');
      const canceled = await snapshot(page);
      expect(canceled.stored).toBe(descriptor.initial);
      expect(canceled.writes).toEqual([]);
      expect(canceled.saves).toEqual([]);
      expect(canceled.fieldEvents).toEqual(rejected.fieldEvents);
      await expect(input).toHaveCount(0);
    });

    test(`${ownerKind} ${descriptor.id} destruction in beforeChange stops subsequent phases`, async ({ page }) => {
      const input = await mount(page, ownerKind, descriptor);
      await page.evaluate(() => contract.field.events.on('beforeChange', () => contract.owner.destroy()));
      await replaceText(input, descriptor.text);
      if (descriptor.deferred) await input.press('Enter');
      const state = await snapshot(page);
      expect(state.destroyed).toBe(true);
      expect(state.value).toBe(descriptor.initial);
      expect(state.stored).toBe(descriptor.initial);
      expect(phases(state)).toEqual(['beforeChange']);
      expect(state.writes).toEqual([]);
      expect(state.saves).toEqual([]);
      expect(state.ownerEvents.filter(e => ['submit', 'afterSubmit', 'cellChange', 'editCommit'].includes(e))).toEqual([]);
      await expect(input).toHaveCount(0);
    });
  }

  for (const id of ['text', 'number-live', 'number-commit']) {
    const descriptor = editorCases.find(c => c.id === id);
    test(`${id} nested beforeChange retains its existing ${descriptor.deferred ? 'inner' : 'outer'}-write priority`, async ({ page }) => {
      const input = await mount(page, 'Standalone', descriptor);
      await page.evaluate(() => contract.field.events.on('beforeChange', () =>
        contract.field.value.set(contract.descriptor.replacement, { silent: true })));
      await replaceText(input, descriptor.text);
      if (descriptor.deferred) await input.press('Enter');
      const state = await snapshot(page);
      expect(state.value).toBe(descriptor.deferred ? descriptor.replacement : descriptor.next);
      expect(state.pending).toBe(false);
      expect(phases(state)).toEqual(descriptor.deferred ? ['beforeChange'] : ['beforeChange', 'change', 'afterChange', 'dirtyChange']);
      await expect(input).toHaveValue(String(state.value));
    });
  }

  for (const ownerKind of ['Form', 'Grid', 'TreeGrid']) {
    test(`${ownerKind} commit callback cannot resurrect an obsolete owner session`, async ({ page }) => {
      const descriptor = editorCases.find(c => c.id === 'number-commit');
      const input = await mount(page, ownerKind, descriptor);
      await page.evaluate(ownerKind => {
        const h = contract;
        h.oldField = h.field;
        if (ownerKind === 'Form') h.owner.events.on('beforeSubmit', () => h.owner.destroy());
        else h.owner.events.on('beforeCellChange', () => {
          h.owner.cancelEdit(); h.owner.startEdit(2, 'value');
        });
      }, ownerKind);
      await replaceText(input, descriptor.text);
      await accept(page, input, ownerKind);
      const state = await snapshot(page);
      expect(state.stored).toBe(descriptor.initial);
      expect(state.writes).toEqual([]);
      expect(state.saves).toEqual([]);
      expect(state.ownerEvents.filter(e => ['submit', 'afterSubmit', 'cellChange', 'editCommit'].includes(e))).toEqual([]);
      expect(await page.evaluate(() => ({ value: contract.oldField.value.get(), destroyed: contract.oldField.destroyed })))
        .toEqual({ value: descriptor.next, destroyed: true });
      if (ownerKind === 'Form') {
        expect(state.actionResult).toBe(false);
        await expect(input).toHaveCount(0);
      } else {
        await expect(input).toHaveValue(String(descriptor.replacement));
        expect(await page.evaluate(() => contract.owner._editing.id)).toBe(2);
        await input.press('Escape');
        expect((await snapshot(page)).writes).toEqual([]);
      }
    });
  }

  for (const id of ['number-live', 'number-commit']) {
    test(`${id} numerically equal native prefix has no redundant value phases`, async ({ page }) => {
      const descriptor = editorCases.find(c => c.id === id);
      const input = await mount(page, 'Standalone', descriptor);
      await replaceText(input, '1.0');
      await expect(input).toHaveValue('1.0');
      expect((await snapshot(page)).value).toBe(1);
      expect((await snapshot(page)).fieldEvents).toEqual([]);
      await action(page, 'equal');
      await expect(input).toHaveValue('1');
      await input.press('Enter');
      const state = await snapshot(page);
      expect(state.pending).toBe(false);
      expect(state.fieldEvents).toEqual([]);
    });
  }

  test('slots focused empty scaffold is not public data or an application validator', async ({ page }) => {
    const descriptor = { ...editorCases.find(c => c.id === 'slots'), initial: '', options: { mask: '00-00', maskMode: 'slots', required: true } };
    const input = await mount(page, 'Form', descriptor);
    await input.focus();
    await expect(input).toHaveValue('__-__');
    expect(await input.evaluate(el => ({ valid: el.checkValidity(), customError: el.validity.customError })))
      .toEqual({ valid: false, customError: true });
    await action(page, 'validate');
    const state = await snapshot(page);
    expect(state.actionResult).toEqual({ ok: true, errors: [] });
    expect(state.value).toBe('');
    expect(state.projected).toEqual({ value: '' });
    expect(state.stored).toBe('');
    expect(state.fieldEvents).toEqual([]);
    await replaceText(input, '5');
    expect((await snapshot(page)).value).toBe('5_-__');
    expect(await input.evaluate(el => el.checkValidity())).toBe(true);
    await action(page, 'save');
    expect((await snapshot(page)).saves).toEqual([{ value: '5_-__' }]);
  });

  test('numeric native range validity is distinct from library and Form validation', async ({ page }) => {
    const descriptor = { ...editorCases.find(c => c.id === 'number-commit'), options: { updateMode: 'commit', min: 10, clamp: false } };
    const input = await mount(page, 'Form', descriptor);
    expect(await input.evaluate(el => ({ valid: el.checkValidity(), rangeUnderflow: el.validity.rangeUnderflow })))
      .toEqual({ valid: false, rangeUnderflow: true });
    await action(page, 'validate');
    expect((await snapshot(page)).actionResult).toEqual({ ok: true, errors: [] });
    await action(page, 'save');
    expect((await snapshot(page)).saves).toEqual([{ value: 1 }]);
  });

  for (const ownerKind of ['Form', 'Grid', 'TreeGrid']) {
    test(`${ownerKind} TimeInput picker choice is staged separately from live text and store`, async ({ page }) => {
      const descriptor = editorCases.find(c => c.id === 'time');
      const input = await mount(page, ownerKind, descriptor);
      await input.press('Alt+ArrowDown');
      const chooseHour = () => page.locator('.dui-time-picker__wheel').first().getByRole('button', { name: '16', exact: true }).click();
      await chooseHour();
      expect(await page.evaluate(() => contract.field._pendingValue)).toBe('16:45');
      let state = await snapshot(page);
      expect(state.dom).toBe('16:45');
      expect(state.value).toBe(descriptor.initial);
      expect(state.stored).toBe(descriptor.initial);
      expect(state.fieldEvents).toEqual([]);
      await page.getByRole('button', { name: 'Cancel', exact: true }).click();
      await expect(input).toHaveValue(descriptor.initial);
      expect((await snapshot(page)).fieldEvents).toEqual([]);
      await input.press('Alt+ArrowDown'); await chooseHour();
      await page.getByRole('button', { name: 'OK', exact: true }).click();
      state = await snapshot(page);
      expect(state.value).toBe('16:45');
      expect(state.stored).toBe(descriptor.initial);
      expect(phases(state)).toEqual(['beforeChange', 'change', 'afterChange', 'dirtyChange']);
      await accept(page, input, ownerKind);
      expect((await snapshot(page)).stored).toBe('16:45');
    });
  }
});

// Bounded currentness probes. Public field writes and owner topology are observable;
// arbitrary mutation of external context or object internals is not claimed here.
const staleValidationCases = [
  { name: 'later validator changes an already checked text field', ownerKind: 'Form', id: 'text', phase: 'validator', operation: 'save' },
  { name: 'later validator silently changes an already checked live number', ownerKind: 'Form', id: 'number-live', phase: 'validator', silent: true, operation: 'save' },
  { name: 'nested later validator silently changes an already checked field', ownerKind: 'NestedForm', id: 'text', phase: 'validator', silent: true, operation: 'save' },
  { name: 'own validate callback silently changes a committed number', ownerKind: 'Form', id: 'number-commit', phase: 'owner', silent: true, operation: 'save' },
  { name: 'nested owner validate callback changes a checked field', ownerKind: 'NestedForm', id: 'text', phase: 'owner', operation: 'validate' },
  { name: 'silent validator ABA invalidates the checked snapshot', ownerKind: 'Form', id: 'text', phase: 'validator', silent: true, aba: true, operation: 'save' },
  { name: 'nested own-callback ABA invalidates direct validation', ownerKind: 'NestedForm', id: 'number-live', phase: 'owner', silent: true, aba: true, operation: 'validate' },
  { name: 'same-name same-value replacement invalidates field identity', ownerKind: 'Form', id: 'text', phase: 'owner', identity: true, operation: 'save' },
  { name: 'nested same-name replacement invalidates field identity', ownerKind: 'NestedForm', id: 'text', phase: 'validator', identity: true, operation: 'save' }
];

test.describe('Form checked-data currentness', { tag: '@input-editing' }, () => {
  test.describe.configure({ mode: 'parallel' });
  test.afterEach(async ({ page }) => { await page.evaluate(() => window.contract?.cleanup?.()); });
  for (const scenario of staleValidationCases) test(scenario.name, async ({ page }) => {
    const descriptor = editorCases.find(c => c.id === scenario.id);
    await mount(page, scenario.ownerKind, descriptor);
    await page.evaluate(async scenario => {
      const { TextInput } = await import('/src/ui/inputs.js');
      const h = contract;
      h.checked = []; h.ownerResults = []; h.mutations = 0;
      const container = h.inner ?? h.owner;
      const checkTarget = value => { h.checked.push({ name: 'target', value }); return null; };
      h.field.setValidators([checkTarget]);
      const mutate = () => {
        if (h.mutations++) return;
        if (scenario.identity) {
          h.oldField = h.field;
          container.remove(h.oldField);
          h.field = new TextInput({ name: 'value', value: h.descriptor.initial, validators: [checkTarget] });
          container.row(h.field);
        } else {
          h.field.value.set(h.descriptor.next, { silent: !!scenario.silent });
          if (scenario.aba) h.field.value.set(h.descriptor.initial, { silent: !!scenario.silent });
        }
      };
      const other = new TextInput({ name: 'other', value: 'x', validators: [value => {
        h.checked.push({ name: 'other', value });
        if (scenario.phase === 'validator') mutate();
        return null;
      }] });
      container.row(other);
      if (scenario.phase === 'owner') h.owner.events.on('validate', mutate);
      const validate = h.owner.validate.bind(h.owner);
      h.owner.validate = context => {
        const result = validate(context);
        h.ownerResults.push({ ok: result.ok, errors: result.errors.map(e => e.message) });
        return result;
      };
    }, scenario);
    await action(page, scenario.operation);
    const rejected = await snapshot(page);
    const retainedValue = scenario.aba || scenario.identity ? descriptor.initial : descriptor.next;
    expect(rejected.actionResult).toEqual(scenario.operation === 'save' ? false : { ok: false, errors: [] });
    expect(rejected.value).toBe(retainedValue);
    expect(rejected.stored).toBe(descriptor.initial);
    expect(rejected.saves).toEqual([]);
    expect(rejected.ownerEvents.filter(name => name === 'submit' || name === 'afterSubmit')).toEqual([]);
    expect(await page.evaluate(() => contract.ownerResults)).toEqual([{ ok: false, errors: [] }]);
    expect(await page.evaluate(() => contract.checked)).toEqual([
      { name: 'target', value: descriptor.initial }, { name: 'other', value: 'x' }
    ]);
    // No rollback and no automatic retry. A fresh explicit attempt validates current fields.
    await action(page, 'save');
    const accepted = await snapshot(page);
    expect(accepted.actionResult).toBe(true);
    expect(accepted.stored).toBe(retainedValue);
    expect(accepted.saves).toEqual([{ value: retainedValue, other: 'x' }]);
    expect(await page.evaluate(() => contract.ownerResults)).toEqual([
      { ok: false, errors: [] }, { ok: true, errors: [] }
    ]);
    const rechecked = await page.evaluate(() => contract.checked.slice(2));
    expect(rechecked).toHaveLength(2);
    expect(rechecked).toContainEqual({ name: 'target', value: retainedValue });
    expect(rechecked).toContainEqual({ name: 'other', value: 'x' });
    if (scenario.identity) expect(await page.evaluate(() => ({ replaced: contract.oldField !== contract.field, destroyed: contract.oldField.destroyed })))
      .toEqual({ replaced: true, destroyed: true });
  });
});

test.describe('Accepted-write teardown boundary', { tag: '@input-editing' }, () => {
  test.afterEach(async ({ page }) => { await page.evaluate(() => window.contract?.cleanup?.()); });
  for (const ownerKind of ['Form', 'Grid', 'TreeGrid']) test(`${ownerKind} teardown after saving retains the write and stops later phases`, async ({ page }) => {
    const descriptor = editorCases.find(c => c.id === 'number-commit');
    const input = await mount(page, ownerKind, descriptor);
    await page.evaluate(ownerKind => contract.owner.events.on(ownerKind === 'Form' ? 'submit' : 'cellChange', () => contract.owner.destroy()), ownerKind);
    await replaceText(input, descriptor.text);
    await accept(page, input, ownerKind);
    const state = await snapshot(page);
    expect(state.destroyed).toBe(true);
    expect(state.stored).toBe(descriptor.next);
    expect(state.writes.length).toBe(ownerKind === 'Form' ? 0 : 1);
    expect(state.saves.length).toBe(ownerKind === 'Form' ? 1 : 0);
    expect(state.ownerEvents).toEqual(ownerKind === 'Form'
      ? ['beforeSubmit', 'validate', 'submit'] : ['beforeCellChange', 'cellChange']);
    if (ownerKind === 'Form') expect(state.actionResult).toBe(true);
    await expect(input).toHaveCount(0);
  });
});




const customCase = (id, options = {}) => {
  const descriptor = customEditorCases.find(c => c.id === id);
  return { ...descriptor, options: { ...descriptor.options, ...options } };
};
const customState = page => page.evaluate(() => ({ commitCalls: contract.field.commitCalls ?? 0,
  validationCalls: contract.field.validationCalls ?? 0, checked: contract.field.checked ?? [],
  widgetDestroyed: contract.field.widget?.destroyed ?? false }));

test.describe('Custom field revision contract', { tag: '@input-editing' }, () => {
  test.describe.configure({ mode: 'parallel' });
  test.afterEach(async ({ page }) => { await page.evaluate(() => window.contract?.cleanup?.()); });

  for (const ownerKind of ['Form', 'Grid']) test(`${ownerKind} real widget bridge uses EditorControl accepted writes without hidden owner commit`, async ({ page }) => {
    const input = await mount(page, ownerKind, customCase('widget-bridge'));

    await replaceText(input, 'b');
    await action(page, 'fieldValidate');
    const edited = await snapshot(page);
    expect(edited.actionResult).toEqual({ ok: true, value: 'b' });
    expect(edited.dom).toBe('b'); expect(edited.value).toBe('b'); expect(edited.stored).toBe('a');
    expect(edited.saves).toEqual([]); expect(edited.writes).toEqual([]);
    expect(phases(edited)).toEqual(['beforeChange', 'change', 'afterChange', 'dirtyChange']);
    await accept(page, input, ownerKind);
    const saved = await snapshot(page);
    expect(saved.stored).toBe('b'); expect(saved.fieldEvents).toEqual(edited.fieldEvents);
    if (ownerKind === 'Grid') expect((await customState(page)).widgetDestroyed).toBe(true);
  });

  for (const tokenMode of ['number', 'bigint', 'symbol']) test(`independent ${tokenMode} token is stable and its getter does not commit`, async ({ page }) => {
    const input = await mount(page, tokenMode === 'bigint' ? 'NestedForm' : 'Form', customCase('independent-widget', { tokenMode }));
    await page.evaluate(() => { contract.initialToken = contract.field.getValidationRevision(); });
    await action(page, 'revisionProbe');
    expect((await snapshot(page)).actionResult).toEqual({ type: tokenMode, stable: true });
    expect((await customState(page)).commitCalls).toBe(0);
    expect((await snapshot(page)).fieldEvents).toEqual([]);
    await replaceText(input, 'b');
    expect(await page.evaluate(() => Object.is(contract.initialToken, contract.field.getValidationRevision()))).toBe(false);
    await action(page, 'validateDetailed');
    expect((await snapshot(page)).actionResult).toEqual({ ok: true, errors: [] });
    expect((await snapshot(page)).stored).toBe('a');
    expect((await customState(page)).commitCalls).toBe(0);
    await action(page, 'save');
    expect((await snapshot(page)).saves).toEqual([{ value: 'b' }]);
  });

  for (const [index, tokenMode] of ['missing', 'noncallable', 'invalid-type', 'invalid-number', 'invalid-bigint', 'throw', 'unstable'].entries()) {
    test(`custom token ${tokenMode} fails closed with field diagnostics`, async ({ page }) => {
      await mount(page, index % 2 ? 'NestedForm' : 'Form', customCase('independent-widget', { tokenMode }));
      await page.evaluate(() => {
        contract.diagnostics = [];
        contract.owner.events.on('validationFail', event => contract.diagnostics.push(event.errors.map(error => ({
          code: error.code, path: error.path, severity: error.severity, field: error.control === contract.field
        }))));
      });
      await action(page, 'validateDetailed');
      const checked = await snapshot(page);
      expect(checked.actionResult.ok).toBe(false);
      expect(checked.actionResult.errors).toEqual([{ code: 'validationRevision', severity: 'error', path: 'value', field: true }]);
      expect(checked.value).toBe('a'); expect(checked.stored).toBe('a'); expect(checked.fieldEvents).toEqual([]);
      await action(page, 'save');
      const refused = await snapshot(page);
      expect(refused.actionResult).toBe(false); expect(refused.saves).toEqual([]); expect(refused.writes).toEqual([]);
      expect(refused.ownerEvents.filter(name => ['submit', 'afterSubmit'].includes(name))).toEqual([]);
      expect((await customState(page)).commitCalls).toBe(0);
      expect(await page.evaluate(() => contract.diagnostics.at(-1)))
        .toEqual([{ code: 'validationRevision', severity: 'error', path: 'value', field: true }]);
    });
  }

  for (const id of ['widget-bridge', 'independent-widget']) test(`${id} silent ABA refuses nested Form save without relying on change events`, async ({ page }) => {
    // The public override must not erase EditorControl's authoritative accepted-write stamp.
    const descriptor = customCase(id, id === 'widget-bridge' ? { constantPublicToken: true } : { tokenMode: 'symbol' });
    await mount(page, 'NestedForm', descriptor);
    await page.evaluate(() => contract.owner.events.once('validate', () => {
      contract.field.value.set('b', { silent: true }); contract.field.value.set('a', { silent: true });
    }));
    await action(page, 'save');
    const refused = await snapshot(page);
    expect(refused.actionResult).toBe(false); expect(refused.value).toBe('a'); expect(refused.stored).toBe('a');
    expect(refused.saves).toEqual([]); expect(refused.fieldEvents).toEqual([]);
    await action(page, 'save');
    expect((await snapshot(page)).actionResult).toBe(true);
    expect((await snapshot(page)).saves).toEqual([{ value: 'a' }]);
  });

  test('independent pending candidate is previewed without hidden commit and explicitly saved once', async ({ page }) => {
    const input = await mount(page, 'NestedForm', customCase('independent-widget', { tokenMode: 'bigint', deferred: true }));
    await replaceText(input, 'b');
    await action(page, 'revisionProbe');
    expect((await snapshot(page)).actionResult).toEqual({ type: 'bigint', stable: true });
    await action(page, 'validateDetailed');
    const preview = await snapshot(page);
    expect(preview.actionResult).toEqual({ ok: true, errors: [] });
    expect(preview.dom).toBe('b'); expect(preview.value).toBe('a'); expect(preview.pending).toBe(true);
    expect(preview.stored).toBe('a'); expect(preview.fieldEvents).toEqual([]);
    expect(await customState(page)).toMatchObject({ commitCalls: 0, checked: ['b'] });
    await action(page, 'save');
    const saved = await snapshot(page);
    expect(saved.stored).toBe('b'); expect(saved.pending).toBe(false); expect(saved.saves).toEqual([{ value: 'b' }]);
    expect((await customState(page)).commitCalls).toBe(1);
    expect(phases(saved)).toEqual(['beforeChange', 'change', 'afterChange', 'dirtyChange']);
  });

  test('independent pending-candidate revision invalidates preview without committing either draft', async ({ page }) => {
    const input = await mount(page, 'NestedForm', customCase('independent-widget', { deferred: true }));
    await page.evaluate(() => contract.field.events.once('validate', () => contract.field.draft.set('c')));
    await replaceText(input, 'b');
    await action(page, 'validateDetailed');
    const changed = await snapshot(page);
    expect(changed.actionResult).toEqual({ ok: false, errors: [] });
    expect(changed.dom).toBe('c'); expect(changed.value).toBe('a'); expect(changed.stored).toBe('a');
    expect(changed.pending).toBe(true); expect(changed.fieldEvents).toEqual([]);
    expect((await customState(page)).commitCalls).toBe(0);
    await action(page, 'save');
    expect((await snapshot(page)).saves).toEqual([{ value: 'c' }]);
    expect(await customState(page)).toMatchObject({ commitCalls: 1, checked: ['b', 'c'] });
  });

  test('custom validation callback reentry cannot submit the Form twice', async ({ page }) => {
    const input = await mount(page, 'NestedForm', customCase('independent-widget'));
    await page.evaluate(() => {
      contract.reentry = [];
      contract.field.events.on('validate', () => contract.reentry.push(contract.owner.submit()));
    });
    await replaceText(input, 'b'); await action(page, 'save');
    expect(await page.evaluate(() => contract.reentry)).toEqual([false]);
    expect((await snapshot(page)).actionResult).toBe(true);
    expect((await snapshot(page)).saves).toEqual([{ value: 'b' }]);
  });

  for (const id of ['widget-bridge', 'independent-widget']) test(`${id} validation teardown releases widget and stops owner save`, async ({ page }) => {
    const input = await mount(page, 'NestedForm', customCase(id));
    await page.evaluate(() => contract.field.events.on('validate', () => contract.owner.destroy()));
    await replaceText(input, 'b'); await action(page, 'save');
    const stopped = await snapshot(page);
    expect(stopped.actionResult).toBe(false); expect(stopped.destroyed).toBe(true);
    expect(stopped.value).toBe('b'); expect(stopped.stored).toBe('a'); expect(stopped.saves).toEqual([]);
    expect(stopped.ownerEvents.filter(name => ['submit', 'afterSubmit'].includes(name))).toEqual([]);
    expect((await customState(page)).widgetDestroyed).toBe(true);
    await expect(input).toHaveCount(0);
  });

  test('Grid custom editor without a revision hook is rejected without hidden owner writes', async ({ page }) => {
    const input = await mount(page, 'Grid', customCase('independent-widget', { tokenMode: 'missing' }));
    await replaceText(input, 'b'); await action(page, 'fieldValidate');
    expect((await snapshot(page)).actionResult).toEqual({ ok: true, value: 'b' });
    expect((await snapshot(page)).stored).toBe('a'); expect((await customState(page)).commitCalls).toBe(0);
    await input.press('Enter');
    const refused = await snapshot(page);
    expect(refused.stored).toBe('a'); expect(refused.writes).toEqual([]);
    expect(refused.rejections).toEqual([{ reason: 'validation-revision', errors: [expect.objectContaining({ code: 'validationRevision', severity: 'error', field: true })] }]);
    await expect(input).toHaveValue('b');
  });

  test('Grid honors a custom adapter stale-result refusal without inventing owner writes', async ({ page }) => {
    const input = await mount(page, 'Grid', customCase('independent-widget', { guardValidation: true }));
    await page.evaluate(() => contract.field.events.once('validate', () => contract.field.value.set('c', { silent: true })));
    await replaceText(input, 'b'); await input.press('Enter');
    const refused = await snapshot(page);
    expect(refused.value).toBe('c'); expect(refused.stored).toBe('a'); expect(refused.writes).toEqual([]);
    expect(refused.ownerEvents).toEqual(['editReject']);
    await input.press('Enter');
    expect((await snapshot(page)).stored).toBe('c'); expect((await snapshot(page)).writes).toHaveLength(1);
  });
});




// Table owners take their own proof after prepareCommit; a child ok:true is not
// permission to store a different, unvalidated value from a later read.
test.describe('Table validation currentness', { tag: '@input-editing' }, () => {
  test.describe.configure({ mode: 'parallel' });
  test.afterEach(async ({ page }) => { await page.evaluate(() => window.contract?.cleanup?.()); });
  for (const ownerKind of ['Grid', 'TreeGrid']) {
    for (const id of ['text', 'widget-bridge', 'independent-widget']) {
      test(`${ownerKind} ${id} rejects validator self-change and explicitly validates the retained value next time`, async ({ page }) => {
        const descriptor = id === 'text' ? editorCases[0] : customCase(id);
        const input = await mount(page, ownerKind, descriptor);
        await page.evaluate(() => {
          contract.checked = [];
          contract.field.setValidators([value => {
            contract.checked.push(value);
            if (value === 'b') contract.field.value.set('c', { silent: true });
            return null;
          }]);
        });
        await replaceText(input, 'b'); await input.press('Enter');
        const refused = await snapshot(page);
        expect(refused.value).toBe('c'); expect(refused.stored).toBe('a'); expect(refused.writes).toEqual([]);
        expect(refused.ownerEvents).toEqual(['editReject']);
        expect(refused.rejections).toEqual([{ reason: 'validation-stale', errors: [] }]);
        expect(await page.evaluate(() => contract.checked)).toEqual(['b']);
        await expect(input).toHaveValue('c');
        await input.press('Enter');
        expect(await page.evaluate(() => contract.checked)).toEqual(['b', 'c']);
        expect((await snapshot(page)).stored).toBe('c'); expect((await snapshot(page)).writes).toHaveLength(1);
        await expect(input).toHaveCount(0);
      });
    }

    for (const id of ['widget-bridge', 'independent-widget']) test(`${ownerKind} ${id} silent ABA cannot hide a changed validation snapshot`, async ({ page }) => {
      const descriptor = customCase(id, id === 'widget-bridge' ? { constantPublicToken: true } : { tokenMode: 'symbol' });
      const input = await mount(page, ownerKind, descriptor);
      await page.evaluate(() => contract.field.events.once('validate', () => {
        contract.field.value.set('c', { silent: true }); contract.field.value.set('b', { silent: true });
      }));
      await replaceText(input, 'b'); const before = await snapshot(page);
      await input.press('Enter');
      const refused = await snapshot(page);
      expect(refused.value).toBe('b'); expect(refused.stored).toBe('a'); expect(refused.writes).toEqual([]);
      expect(refused.fieldEvents).toEqual(before.fieldEvents);
      expect(refused.rejections).toEqual([{ reason: 'validation-stale', errors: [] }]);
      await expect(input).toHaveValue('b');
      await input.press('Enter');
      expect((await snapshot(page)).stored).toBe('b'); expect((await snapshot(page)).writes).toHaveLength(1);
    });

    test(`${ownerKind} a candidate changed after prepare stays pending until the next explicit commit`, async ({ page }) => {
      const input = await mount(page, ownerKind, customCase('independent-widget', { deferred: true }));
      await page.evaluate(() => contract.field.events.once('validate', () => contract.field.draft.set('c')));
      await replaceText(input, 'b'); await input.press('Enter');
      const refused = await snapshot(page);
      expect(refused.value).toBe('b'); expect(refused.dom).toBe('c'); expect(refused.pending).toBe(true);
      expect(refused.stored).toBe('a'); expect(refused.writes).toEqual([]);
      expect(refused.rejections).toEqual([{ reason: 'validation-stale', errors: [] }]);
      expect(await customState(page)).toMatchObject({ commitCalls: 1, checked: ['b'] });
      await input.press('Enter');
      expect((await snapshot(page)).stored).toBe('c'); expect((await snapshot(page)).writes).toHaveLength(1);
      expect(await customState(page)).toMatchObject({ commitCalls: 2, checked: ['b', 'c'] });
    });

    test(`${ownerKind} final getter mutation refuses the old read without rolling back the callback`, async ({ page }) => {
      const input = await mount(page, ownerKind, editorCases[0]);
      await page.evaluate(() => {
        const h = contract; h.checked = []; h.armFinalRead = false;
        h.field.setValidators([value => { h.checked.push(value); return null; }]);
        h.field.events.once('validate', () => { h.armFinalRead = true; });
        const get = h.editor.getValue.bind(h.editor);
        h.editor.getValue = () => {
          const value = get();
          if (h.armFinalRead) { h.armFinalRead = false; h.field.value.set('c', { silent: true }); }
          return value;
        };
      });
      await replaceText(input, 'b'); await input.press('Enter');
      const refused = await snapshot(page);
      expect(refused.value).toBe('c'); expect(refused.stored).toBe('a'); expect(refused.writes).toEqual([]);
      expect(refused.rejections).toEqual([{ reason: 'validation-stale', errors: [] }]);
      expect(await page.evaluate(() => contract.checked)).toEqual(['b']);
      await expect(input).toHaveValue('c');
      await input.press('Enter');
      expect(await page.evaluate(() => contract.checked)).toEqual(['b', 'c']);
      expect((await snapshot(page)).stored).toBe('c'); expect((await snapshot(page)).writes).toHaveLength(1);
    });

    for (const interruption of ['destroy', 'replace']) test(`${ownerKind} validation ${interruption} cannot resume the obsolete session`, async ({ page }) => {
      const input = await mount(page, ownerKind, customCase('widget-bridge'));
      await page.evaluate(interruption => {
        const h = contract; h.oldField = h.field;
        h.field.events.once('validate', () => {
          if (interruption === 'destroy') h.owner.destroy();
          else { h.owner.cancelEdit(); h.owner.startEdit(2, 'value'); }
        });
      }, interruption);
      await replaceText(input, 'b'); await input.press('Enter');
      const stopped = await snapshot(page);
      expect(stopped.stored).toBe('a'); expect(stopped.writes).toEqual([]);
      expect(stopped.ownerEvents.filter(name => ['beforeCellChange', 'cellChange', 'editCommit'].includes(name))).toEqual([]);
      expect(await page.evaluate(() => ({ value: contract.oldField.value.get(), destroyed: contract.oldField.destroyed, widgetDestroyed: contract.oldField.widget.destroyed })))
        .toEqual({ value: 'b', destroyed: true, widgetDestroyed: true });
      if (interruption === 'destroy') await expect(input).toHaveCount(0);
      else { await expect(input).toHaveValue('c'); expect(await page.evaluate(() => contract.owner._editing.id)).toBe(2); }
    });

    test(`${ownerKind} revision-reader teardown stops before a second read or validation`, async ({ page }) => {
      const input = await mount(page, ownerKind, customCase('independent-widget'));
      await page.evaluate(() => {
        const h = contract; h.revisionReads = 0;
        const read = h.field.getValidationRevision.bind(h.field);
        h.field.getValidationRevision = () => { ++h.revisionReads; h.owner.destroy(); return read(); };
      });
      await replaceText(input, 'b'); await input.press('Enter');
      const stopped = await snapshot(page);
      expect(stopped.destroyed).toBe(true); expect(stopped.stored).toBe('a'); expect(stopped.writes).toEqual([]);
      expect(await page.evaluate(() => contract.revisionReads)).toBe(1);
      expect((await customState(page)).validationCalls).toBe(0);
      await expect(input).toHaveCount(0);
    });

    test(`${ownerKind} trusted beforeCellChange value override remains a distinct accepted boundary`, async ({ page }) => {
      const input = await mount(page, ownerKind, editorCases[0]);
      await page.evaluate(() => {
        contract.checked = [];
        contract.field.setValidators([value => { contract.checked.push(value); return value === 'b' || 'Only b before the trusted override'; }]);
        contract.owner.events.on('beforeCellChange', event => { event.newValue = 'c'; });
      });
      await replaceText(input, 'b'); await input.press('Enter');
      const saved = await snapshot(page);
      expect(saved.value).toBe('b'); expect(saved.stored).toBe('c'); expect(saved.writes).toHaveLength(1);
      expect(saved.ownerEvents).toEqual(['beforeCellChange', 'cellChange', 'editCommit']);
      expect(await page.evaluate(() => contract.checked)).toEqual(['b']);
      await expect(input).toHaveCount(0);
    });
  }
});

test.describe('Revision property lookup lifetime', { tag: '@input-editing' }, () => {
  test.afterEach(async ({ page }) => { await page.evaluate(() => window.contract?.cleanup?.()); });
  for (const ownerKind of ['NestedForm', 'Grid', 'TreeGrid']) test(`${ownerKind} revision-property lookup teardown never calls the returned reader`, async ({ page }) => {
    const input = await mount(page, ownerKind, customCase('independent-widget'));
    await page.evaluate(() => {
      const h = contract; h.revisionLookups = 0; h.returnedReaderCalls = 0;
      Object.defineProperty(h.field, 'getValidationRevision', { configurable: true, get() {
        ++h.revisionLookups; h.owner.destroy();
        return () => { ++h.returnedReaderCalls; return 0; };
      } });
    });
    await replaceText(input, 'b');
    if (ownerKind === 'NestedForm') await action(page, 'validateDetailed'); else await input.press('Enter');
    const stopped = await snapshot(page);
    expect(stopped.destroyed).toBe(true); expect(stopped.stored).toBe('a');
    expect(stopped.writes).toEqual([]); expect(stopped.saves).toEqual([]);
    expect(await page.evaluate(() => ({ lookups: contract.revisionLookups, calls: contract.returnedReaderCalls })))
      .toEqual({ lookups: 1, calls: 0 });
    expect(await customState(page)).toMatchObject({ validationCalls: 0, widgetDestroyed: true });
    if (ownerKind === 'NestedForm') expect(stopped.actionResult.ok).toBe(false);
    await expect(input).toHaveCount(0);
  });
});

async function mountProperty(page, mode, descriptor = editorCases[0]) {
  await page.goto('/browser-tests/recipes.html');
  await page.evaluate(async args => {
    const { installPropertyInvariantFixture } = await import('/browser-tests/editor-invariant-adapters.js');
    await installPropertyInvariantFixture(args);
  }, { mode, descriptor });
  return page.locator('.dui-property-grid__value input');
}
async function propertyAttempt(input, mode, text = 'b') {
  await replaceText(input, text);
  if (mode === 'staged') await input.press('Enter');
}
const propertySaves = state => state.ownerEvents.filter(name => ['propertyChange', 'afterPropertyChange'].includes(name));

test.describe('PropertyGrid validation currentness', { tag: '@input-editing' }, () => {
  test.afterEach(async ({ page }) => { await page.evaluate(() => window.contract?.cleanup?.()); });
  for (const mode of ['inline', 'staged']) {
    test(`${mode} rejects validator self-change and checks the retained invalid value on explicit retry`, async ({ page }) => {
      const input = await mountProperty(page, mode);
      await page.evaluate(() => contract.field.setValidators([value => {
        contract.checked.push(value);
        if (value === 'b') contract.field.value.set('c', { silent: true });
        return value !== 'c' || 'c is invalid';
      }]));
      await propertyAttempt(input, mode);
      const stale = await snapshot(page);
      expect(stale.stored).toBe('a'); expect(stale.propertyValue).toBe('a'); expect(stale.value).toBe('c');
      expect(stale.writes).toEqual([]); expect(stale.checked).toEqual(['b']); expect(propertySaves(stale)).toEqual([]);
      expect(stale.rejections).toEqual([{ reason: 'validation-stale', oldValue: 'a', newValue: mode === 'inline' ? 'b' : undefined, name: 'value', property: true, errors: [] }]);
      await expect(input).toHaveValue('c');
      if (mode === 'staged') {
        await input.press('Enter');
        const invalid = await snapshot(page);
        expect(invalid.checked).toEqual(['b', 'c']); expect(invalid.writes).toEqual([]);
        expect(invalid.rejections).toHaveLength(1); await expect(input).toHaveValue('c');
      }
      await propertyAttempt(input, mode, 'd');
      const saved = await snapshot(page);
      expect(saved.checked).toEqual(mode === 'staged' ? ['b', 'c', 'd'] : ['b', 'd']);
      expect(saved.stored).toBe('d'); expect(saved.propertyValue).toBe('d'); expect(saved.writes).toEqual(['d']);
      expect(propertySaves(saved)).toEqual(['propertyChange', 'afterPropertyChange']);
    });

    test(`${mode} silent ABA keeps the property unchanged until a new explicit attempt`, async ({ page }) => {
      const input = await mountProperty(page, mode, { ...customEditorCases[0], options: { constantPublicToken: true } });
      await page.evaluate(() => contract.field.setValidators([value => {
        contract.checked.push(value);
        if (!contract.changed) { contract.changed = true; contract.field.value.set('c', { silent: true }); contract.field.value.set('b', { silent: true }); }
        return true;
      }]));
      await propertyAttempt(input, mode);
      const stale = await snapshot(page);
      expect(stale.stored).toBe('a'); expect(stale.value).toBe('b'); expect(stale.checked).toEqual(['b']); expect(stale.writes).toEqual([]);
      expect(stale.rejections.map(e => e.reason)).toEqual(['validation-stale']);
      expect(stale.fieldEvents.filter(e => e.name === 'change')).toHaveLength(1);
      if (mode === 'staged') await input.press('Enter'); else await propertyAttempt(input, mode, 'd');
      const saved = await snapshot(page);
      expect(saved.writes).toEqual([mode === 'staged' ? 'b' : 'd']); expect(saved.checked).toEqual(['b', mode === 'staged' ? 'b' : 'd']);
    });

    test(`${mode} a normal nested field write does not recursively save or validate`, async ({ page }) => {
      const input = await mountProperty(page, mode);
      await page.evaluate(() => contract.field.setValidators([value => {
        contract.checked.push(value);
        if (value === 'b') contract.field.value.set('c', { origin: 'api' });
        return true;
      }]));
      await propertyAttempt(input, mode);
      const stale = await snapshot(page);
      expect(stale.stored).toBe('a'); expect(stale.value).toBe('c'); expect(stale.checked).toEqual(['b']); expect(stale.writes).toEqual([]);
      expect(stale.fieldEvents.filter(e => e.name === 'change').map(e => e.value)).toEqual(['b', 'c']);
      expect(stale.rejections.map(e => e.reason)).toEqual(['validation-stale']);
      await propertyAttempt(input, mode, 'd');
      expect((await snapshot(page)).writes).toEqual(['d']);
    });

    for (const interruption of ['destroy', 'replace']) test(`${mode} validator ${interruption} stops obsolete owner phases`, async ({ page }) => {
      const input = await mountProperty(page, mode, customEditorCases[0]);
      await page.evaluate(interruption => {
        contract.originalField = contract.field;
        contract.field.setValidators([value => {
          contract.checked.push(value);
          if (interruption === 'destroy') contract.owner.destroy(); else contract.replaceOwnerRow();
          return true;
        }]);
      }, interruption);
      await propertyAttempt(input, mode);
      const stopped = await snapshot(page);
      expect(stopped.writes).toEqual([]); expect(stopped.stored).toBe('a'); expect(stopped.checked).toEqual(['b']); expect(propertySaves(stopped)).toEqual([]);
      expect(await page.evaluate(() => ({ control: contract.originalField.destroyed, widget: contract.originalField.widget.destroyed }))).toEqual({ control: true, widget: true });
      if (interruption === 'destroy') { expect(stopped.destroyed).toBe(true); await expect(input).toHaveCount(0); }
      else { expect(stopped.destroyed).toBe(false); expect(stopped.propertyValue).toBe('r'); await expect(input).toHaveValue('r'); }
    });

    for (const tokenMode of ['missing', 'unstable']) test(`${mode} ${tokenMode} custom revision fails closed before validation`, async ({ page }) => {
      const input = await mountProperty(page, mode, { ...customEditorCases[1], options: { tokenMode } });
      await propertyAttempt(input, mode);
      const blocked = await snapshot(page);
      expect(blocked.stored).toBe('a'); expect(blocked.value).toBe('b'); expect(blocked.propertyValue).toBe('a'); expect(blocked.writes).toEqual([]);
      expect(blocked.rejections).toEqual([{ reason: 'validation-revision', oldValue: 'a', newValue: undefined, name: 'value', property: true,
        errors: [expect.objectContaining({ code: 'validationRevision', severity: 'error', field: true })] }]);
      expect(await page.evaluate(() => contract.field.validationCalls)).toBe(0);
      await expect(input).toHaveValue('b');
    });

    for (const veto of [false, true]) test(`${mode} beforePropertyChange mutation${veto ? ' plus veto' : ''} retains callback state without a write`, async ({ page }) => {
      const input = await mountProperty(page, mode);
      await page.evaluate(veto => {
        contract.field.setValidators([value => { contract.checked.push(value); return true; }]);
        contract.owner.events.on('beforePropertyChange', event => { contract.field.value.set('c', { silent: true }); event.cancel = veto; });
      }, veto);
      await propertyAttempt(input, mode);
      const stale = await snapshot(page);
      expect(stale.checked).toEqual(['b']); expect(stale.stored).toBe('a'); expect(stale.value).toBe('c'); expect(stale.writes).toEqual([]);
      expect(propertySaves(stale)).toEqual([]); expect(stale.rejections.map(e => e.reason)).toEqual(['validation-stale']);
      await expect(input).toHaveValue('c');
    });

    test(`${mode} unchanged ordinary veto keeps its existing rollback boundary`, async ({ page }) => {
      const input = await mountProperty(page, mode);
      await page.evaluate(() => contract.owner.events.on('beforePropertyChange', event => { event.cancel = true; }));
      await propertyAttempt(input, mode);
      const vetoed = await snapshot(page);
      expect(vetoed.writes).toEqual([]); expect(vetoed.stored).toBe('a'); expect(vetoed.rejections).toEqual([]);
      await expect(input).toHaveValue(mode === 'inline' ? 'a' : 'b');
    });
  }

  test('staged custom pending candidate changed by validation is retained for explicit prepare', async ({ page }) => {
    const input = await mountProperty(page, 'staged', { ...customEditorCases[1], options: { tokenMode: 'symbol', deferred: true } });
    await page.evaluate(() => contract.field.setValidators([value => {
      contract.checked.push(value); if (value === 'b') contract.field.draft.set('c'); return true;
    }]));
    await propertyAttempt(input, 'staged');
    const stale = await snapshot(page);
    expect(stale.value).toBe('b'); expect(stale.pending).toBe(true); expect(stale.stored).toBe('a'); expect(stale.writes).toEqual([]);
    expect(stale.checked).toEqual(['b']); await expect(input).toHaveValue('c');
    expect(await page.evaluate(() => contract.field.commitCalls)).toBe(1);
    await input.press('Enter');
    const saved = await snapshot(page);
    expect(saved.writes).toEqual(['c']); expect(saved.checked).toEqual(['b', 'c']);
    expect(await page.evaluate(() => contract.field.commitCalls)).toBe(2);
  });

  for (const mode of ['inline', 'staged']) test(`${mode} final getter mutation refuses its stale value and keeps the editor available`, async ({ page }) => {
    const input = await mountProperty(page, mode);
    await page.evaluate(() => {
      contract.field.setValidators([value => { contract.checked.push(value); return true; }]);
      contract.field.events.on('validate', () => { if (!contract.changed) contract.armed = true; });
      const getValue = contract.editor.getValue.bind(contract.editor);
      contract.editor.getValue = () => {
        const value = getValue();
        if (contract.armed) { contract.armed = false; contract.changed = true; contract.field.value.set('c', { silent: true }); }
        return value;
      };
    });
    await propertyAttempt(input, mode);
    const stale = await snapshot(page);
    expect(stale.stored).toBe('a'); expect(stale.value).toBe('c'); expect(stale.writes).toEqual([]);
    expect(stale.rejections.map(e => e.reason)).toEqual(['validation-stale']); await expect(input).toHaveValue('c');
    if (mode === 'staged') await input.press('Enter'); else await propertyAttempt(input, mode, 'd');
    expect((await snapshot(page)).writes).toEqual([mode === 'staged' ? 'c' : 'd']);
  });

  for (const mode of ['inline', 'staged']) test(`${mode} revision property lookup teardown does not call its returned reader`, async ({ page }) => {
    const input = await mountProperty(page, mode, customEditorCases[1]);
    await page.evaluate(() => {
      contract.lookups = 0; contract.readerCalls = 0;
      Object.defineProperty(contract.field, 'getValidationRevision', { get() {
        ++contract.lookups; contract.owner.destroy(); return () => { ++contract.readerCalls; return 0; };
      } });
    });
    await propertyAttempt(input, mode);
    const stopped = await snapshot(page);
    expect(stopped.destroyed).toBe(true); expect(stopped.writes).toEqual([]); expect(stopped.stored).toBe('a');
    expect(await page.evaluate(() => [contract.lookups, contract.readerCalls, contract.field.validationCalls])).toEqual([1, 0, 0]);
    await expect(input).toHaveCount(0);
  });
});



test.describe('Wrapped control lookup lifetime', { tag: '@input-editing' }, () => {
  test.afterEach(async ({ page }) => { await page.evaluate(() => window.contract?.cleanup?.()); });
  for (const ownerKind of ['Grid', 'TreeGrid', 'PropertyGrid inline', 'PropertyGrid staged']) {
    test(`${ownerKind} validate accessor teardown never calls the returned validator`, async ({ page }) => {
      const propertyMode = ownerKind.startsWith('PropertyGrid') ? ownerKind.split(' ')[1] : null;
      const input = propertyMode ? await mountProperty(page, propertyMode, customEditorCases[0])
        : await mount(page, ownerKind, customEditorCases[0]);
      await page.evaluate(() => {
        contract.validatorLookups = 0; contract.lateValidatorCalls = 0;
        Object.defineProperty(contract.field, 'validate', { configurable: true, get() {
          ++contract.validatorLookups; contract.field.destroy();
          return () => { ++contract.lateValidatorCalls; return { ok: true, errors: [], value: 'b' }; };
        } });
      });
      if (propertyMode) await propertyAttempt(input, propertyMode); else { await replaceText(input, 'b'); await input.press('Enter'); }
      const stopped = await snapshot(page);
      expect(stopped.stored).toBe('a'); expect(stopped.writes).toEqual([]);
      expect(stopped.ownerEvents.filter(name => ['beforeCellChange', 'cellChange', 'editCommit', 'beforePropertyChange', 'propertyChange', 'afterPropertyChange'].includes(name))).toEqual([]);
      expect(await page.evaluate(() => ({ lookups: contract.validatorLookups, calls: contract.lateValidatorCalls,
        control: contract.field.destroyed, widget: contract.field.widget.destroyed })))
        .toEqual({ lookups: 1, calls: 0, control: true, widget: true });
      await expect(input).toHaveCount(0);
    });
  }
});

test.describe('Wrapped adjacent lookup lifetime', { tag: '@input-editing' }, () => {
  test.afterEach(async ({ page }) => { await page.evaluate(() => window.contract?.cleanup?.()); });
  for (const lookup of ['prepare', 'value']) test(`${lookup} lookup teardown has no late forwarded callback or refocus`, async ({ page }) => {
    const input = lookup === 'prepare' ? await mount(page, 'Grid', customEditorCases[0])
      : await mountProperty(page, 'inline', customEditorCases[0]);
    await page.evaluate(lookup => {
      contract.lookups = 0; contract.lateCalls = 0;
      if (lookup === 'prepare') Object.defineProperty(contract.field, 'commitInput', { get() {
        ++contract.lookups; contract.field.destroy(); return () => { ++contract.lateCalls; return { ok: true }; };
      } });
      else {
        const valueApi = contract.field.value;
        const getValue = contract.editor.getValue.bind(contract.editor);
        contract.editor.getValue = () => { contract.readArmed = true; return getValue(); };
        contract.field.value = Object.defineProperty({ ...valueApi }, 'get', { get() {
          if (!contract.readArmed) return valueApi.get;
          ++contract.lookups; contract.field.value = valueApi; contract.field.destroy();
          return () => { ++contract.lateCalls; return 'b'; };
        } });
      }
    }, lookup);
    if (lookup === 'prepare') { await replaceText(input, 'b'); await input.press('Enter'); }
    else await propertyAttempt(input, 'inline');
    const stopped = await snapshot(page);
    expect(stopped.stored).toBe('a'); expect(stopped.writes).toEqual([]);
    expect(await page.evaluate(() => [contract.lookups, contract.lateCalls, contract.field.destroyed])).toEqual([1, 0, true]);
    await expect(input).toHaveCount(0);
  });
});
