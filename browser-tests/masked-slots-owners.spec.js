import { test, expect } from './input-test-fixture.js';
import { pressNativeTab } from './keyboard-helpers.js';

async function setup(page, kind, raw, complete = false) {
  await page.goto('/browser-tests/recipes.html');
  await page.evaluate(async ({ kind, raw, complete }) => {
    const ui = await import('/src/ui/all.js');
    window.writes = []; window.events = [];
    const options = { mask: 'AA-0000', maskMode: 'slots', unmaskValue: raw,
      validators: [ui.required(), ...(complete ? [value => !value.includes('_') || 'Complete the code'] : [])] };
    if (kind === 'Form') {
      window.field = new ui.TextInput({ name: 'code', value: 'AB1234', ...options });
      window.owner = new ui.Form().row(field).mount('#root');
      const outside = document.createElement('button'); outside.textContent = 'Outside'; document.body.append(outside);
    } else {
      const factory = ui.gridEditors.text(options);
      const editor = ui.createGridEditorFactory(context => { const instance = factory.createCellEditor(context); window.field = instance.control; return instance; });
      window.owner = new ui[kind]('#root', { width: 460, height: 200, treeColumnId: 'label',
        columns: [{ id: 'label', readOnly: true }, { id: 'code', editor }, { id: 'tail', editor: ui.gridEditors.text() }] });
      owner.data.parse([{ id: 1, parentId: null, label: 'Row', code: raw ? 'AB1234' : 'AB-1234', tail: 'Tail' }]);
      owner.data.events.on('change', event => writes.push(event.type));
      for (const name of ['cellChange', 'editCommit', 'editCancel', 'editReject']) owner.events.on(name, () => events.push(name));
      owner.startEdit(1, 'code');
    }
  }, { kind, raw, complete });
  return page.locator(kind === 'Form' ? '#root input' : '.dui-grid__editor-host input');
}
async function holes(input) {
  await input.focus(); await input.evaluate(el => el.setSelectionRange(0, 2)); await input.press('Delete');
  await expect(input).toHaveValue('__-1234');
}

test.describe('Masked slots owner roundtrip', { tag: '@input-editing' }, () => {
  test.afterEach(async ({ page }) => { await page.evaluate(() => window.owner?.destroy()); });
  for (const raw of [false, true]) {
    test(`Form raw=${raw} live holes survive silent import reset and explicit validation`, async ({ page }) => {
      const input = await setup(page, 'Form', raw);
      await holes(input);
      expect(await page.evaluate(() => owner.value.get().code)).toBe(raw ? '__1234' : '__-1234');
      await input.press('Escape'); await pressNativeTab(page);
      expect(await page.evaluate(() => owner.submit())).toBe(true);
      await page.evaluate(() => { window.saved = owner.value.get(); field.value.clear({ silent: true }); owner.value.set(saved, { silent: true }); });
      await expect(input).toHaveValue('__-1234');
      await page.evaluate(() => field.value.reset({ silent: true })); await expect(input).toHaveValue('AB-1234');
      await input.press('ControlOrMeta+a'); await input.press('Delete'); await expect(input).toHaveValue('__-____');
      expect(await page.evaluate(() => owner.submit())).toBe(false);
      await input.pressSequentially('X'); await expect(input).toHaveValue('X_-____');
      expect(await page.evaluate(() => owner.submit())).toBe(true);
    });
    for (const kind of ['Grid', 'TreeGrid']) {
      for (const action of ['Enter', 'Tab', 'Escape']) test(`${kind} raw=${raw} ${action} preserves holes only on owner commit`, async ({ page }) => {
        const input = await setup(page, kind, raw);
        await holes(input);
        expect(await page.evaluate(() => owner.data.get(1).code)).toBe(raw ? 'AB1234' : 'AB-1234');
        expect(await page.evaluate(() => writes)).toEqual([]);
        await input.press(action);
        expect(await page.evaluate(() => owner.data.get(1).code)).toBe(action === 'Escape' ? (raw ? 'AB1234' : 'AB-1234') : (raw ? '__1234' : '__-1234'));
        expect(await page.evaluate(() => events)).toEqual(action === 'Escape' ? ['editCancel'] : ['cellChange', 'editCommit']);
        await page.evaluate(() => { owner.cancelEdit(); owner.startEdit(1, 'code'); });
        await expect(input).toHaveValue(action === 'Escape' ? 'AB-1234' : '__-1234');
        if (action !== 'Escape') {
          await input.evaluate(el => el.setSelectionRange(0, 0)); await input.pressSequentially('XY');
          await expect(input).toHaveValue('XY-1234'); await input.press('Enter');
          expect(await page.evaluate(() => owner.data.get(1).code)).toBe(raw ? 'XY1234' : 'XY-1234');
        }
      });
      test(`${kind} raw=${raw} explicit completeness rejects holes without changing required`, async ({ page }) => {
        const input = await setup(page, kind, raw, true); await holes(input); await input.press('Enter');
        expect(await page.evaluate(() => events)).toEqual(['editReject']); await expect(input).toBeFocused();
        expect(await page.evaluate(() => writes)).toEqual([]);
        await input.evaluate(el => el.setSelectionRange(0, 0)); await input.pressSequentially('XY'); await input.press('Enter');
        expect(await page.evaluate(() => owner.data.get(1).code)).toBe(raw ? 'XY1234' : 'XY-1234');
      });
    }
  }
});


test.describe('Slots empty focus presentation', { tag: '@input-editing' }, () => {
  test.afterEach(async ({ page }) => { await page.evaluate(() => window.owner?.destroy()); });
  for (const raw of [false, true]) test(`raw=${raw} empty scaffold enables suffix navigation without value events or required bypass`, async ({ page }) => {
    await page.goto('/browser-tests/recipes.html');
    await page.evaluate(async raw => {
      const { Form, TextInput, required } = await import('/src/ui/index.js');
      window.field = new TextInput({ name: 'code', mask: 'AA-0000', maskMode: 'slots', unmaskValue: raw, required: true, validators: [required()] });
      window.owner = new Form().row(field).mount('#root');
      window.scaffoldChanges = [];
      field.events.on('change', event => scaffoldChanges.push(event.newValue));
      const outside = document.createElement('button'); outside.textContent = 'Outside'; outside.id = 'scaffold-outside'; document.body.append(outside);
    }, raw);
    const input = page.locator('#root input');
    const emptyState = () => page.evaluate(() => ({ value: field.value.get(), raw: field.getRawValue(), display: field.getDisplayValue(), valid: owner.validate().ok, changes: scaffoldChanges.slice() }));
    await expect(input).toHaveValue('');
    expect(await emptyState()).toEqual({ value: '', raw: '', display: '', valid: false, changes: [] });
    await input.focus(); await expect(input).toHaveValue('__-____');
    expect(await input.evaluate(el => [el.selectionStart, el.selectionEnd])).toEqual([0, 0]);
    expect(await input.evaluate(el => el.checkValidity())).toBe(false);
    await pressNativeTab(page); await expect(input).toHaveValue('');
    expect(await emptyState()).toEqual({ value: '', raw: '', display: '', valid: false, changes: [] });
    await input.focus();
    // Real arrow navigation reaches the numeric suffix of an otherwise empty mask.
    await input.press('ArrowRight'); await input.press('ArrowRight'); await input.press('ArrowRight');
    await input.pressSequentially('1234'); await expect(input).toHaveValue('__-1234');
    expect(await page.evaluate(() => field.value.get())).toBe(raw ? '__1234' : '__-1234');
    expect(await page.evaluate(() => owner.validate().ok)).toBe(true);
    expect(await input.evaluate(el => el.checkValidity())).toBe(true);
    const count = await page.evaluate(() => scaffoldChanges.length);
    await page.evaluate(() => field.value.clear({ silent: true })); await expect(input).toHaveValue('__-____');
    expect(await page.evaluate(() => field.value.get())).toBe('');
    expect(await input.evaluate(el => el.checkValidity())).toBe(false);
    await page.evaluate(() => { field.value.reset({ silent: true }); field.value.set('', { silent: true }); });
    await expect(input).toHaveValue('__-____');
    expect(await page.evaluate(() => scaffoldChanges.length)).toBe(count);
    await pressNativeTab(page); await expect(input).toHaveValue('');
    expect(await page.evaluate(() => ({ value: field.value.get(), raw: field.getRawValue(), valid: owner.validate().ok }))).toEqual({ value: '', raw: '', valid: false });
  });
});
