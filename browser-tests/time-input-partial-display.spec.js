import { expect, test } from './input-test-fixture.js';
import { pressNativeTab } from './keyboard-helpers.js';

const phases = ['beforeChange', 'change', 'afterChange'];
const shown = (value, mode) => mode === '12' ? `${value} AM` : value;
async function setup(page, hourMode = '12', value = '', options = {}) {
  await page.goto('/browser-tests/recipes.html');
  await page.evaluate(async ({ hourMode, value, options }) => {
    const { TimeInput } = await import('/src/ui/inputs.js');
    window.field = new TimeInput('#root', { hourMode, value, ...options });
    document.querySelector('#root input').id = 'time';
    window.changes = [];
    for (const phase of ['beforeChange', 'change', 'afterChange']) field.events.on(phase, e => changes.push({
      phase, value: e.newValue, old: e.oldValue, origin: e.origin, user: e.userAction, source: e.source === field
    }));
  }, { hourMode, value, options });
  return page.locator('#time');
}
async function select(input, start, end = start) {
  await input.focus();
  await input.evaluate((el, range) => el.setSelectionRange(...range), [start, end]);
}
async function gridFixture(page, facade) {
  await page.goto('/browser-tests/recipes.html');
  await page.evaluate(async facade => {
    const ui = await import('/src/ui/grid-api.js');
    window.validated = []; window.writes = []; window.events = []; window.changes = [];
    // Completeness is an application validator, not an implicit time constraint.
    const factory = ui.gridEditors.time({ hourMode: '12', required: true,
      validators: [value => { validated.push(value); return /^\d{2}:\d{2}$/.test(value) || 'Complete time required'; }] });
    const editor = ui.createGridEditorFactory(context => {
      window.ed = factory.createCellEditor(context);
      ed.control.events.on('change', e => changes.push(e.newValue));
      return ed;
    }, { activation: factory.activation, filterType: factory.filterType });
    window.owner = new ui[facade]('#root', { width: 500, height: 220, treeColumnId: 'label',
      columns: [{ id: 'label', readOnly: true }, { id: 'when', editor }, { id: 'tail', editor: ui.gridEditors.text() }] });
    owner.data.parse([{ id: 1, parentId: null, label: 'Row', when: '09:45', tail: 'Tail' }]);
    owner.data.events.on('change', e => writes.push(e.type));
    for (const name of ['cellChange', 'editCommit', 'editCancel', 'editReject']) owner.events.on(name, () => events.push(name));
    owner.startEdit(1, 'when');
  }, facade);
  const input = page.locator('.dui-grid__editor-host input');
  await expect(input).toBeFocused();
  await input.press('ControlOrMeta+A'); await input.pressSequentially('1:');
  return input;
}

test.describe('TimeInput incomplete display', { tag: '@input-editing' }, () => {
  test.afterEach(async ({ page }) => { await page.evaluate(() => { window.owner?.destroy(); window.field?.destroy(); }); });

  for (const hourMode of ['0-23', '1-24', '12']) {
    test(`${hourMode} partial survives blur and refocus without invented digits or suffix`, async ({ page }) => {
      const input = await setup(page, hourMode);
      await input.pressSequentially('1:');
      await expect(input).toHaveValue('1:');
      expect(await page.evaluate(() => field.value.get())).toBe('1:');
      const events = await page.evaluate(() => changes);
      expect(events).toEqual([
        ...phases.map(phase => ({ phase, value: '01:00', old: '', origin: 'user', user: true, source: true })),
        ...phases.map(phase => ({ phase, value: '1:', old: '01:00', origin: 'user', user: true, source: true }))
      ]);
      await pressNativeTab(page);
      await expect(input).not.toBeFocused();
      await expect(input).toHaveValue('1:');
      await input.focus();
      await expect(input).toHaveValue('1:');
      expect(await page.evaluate(() => ({ value: field.value.get(), changes }))).toEqual({ value: '1:', changes: events });
      await select(input, 2); await input.pressSequentially('3');
      await expect(input).toHaveValue('1:3');
      expect(await page.evaluate(() => field.value.get())).toBe('1:3');
      expect(await input.evaluate(el => [el.selectionStart, el.selectionEnd])).toEqual([3, 3]);
      await pressNativeTab(page); await expect(input).toHaveValue('1:3');
      await select(input, 3); await input.pressSequentially('4');
      await expect(input).toHaveValue('1:34');
      expect(await page.evaluate(() => field.value.get())).toBe('01:34');
      await pressNativeTab(page); await expect(input).toHaveValue(shown('01:34', hourMode));
      expect(await page.evaluate(() => changes.slice(6))).toEqual([
        ...phases.map(phase => ({ phase, value: '1:3', old: '1:', origin: 'user', user: true, source: true })),
        ...phases.map(phase => ({ phase, value: '01:34', old: '1:3', origin: 'user', user: true, source: true }))
      ]);
    });

    test(`${hourMode} selected partial replacement and deletion resume at the native caret`, async ({ page }) => {
      const input = await setup(page, hourMode, '1:3');
      await expect(input).toHaveValue('1:3');
      await select(input, 0, 1); await input.pressSequentially('2');
      await expect(input).toHaveValue('2:3');
      expect(await input.evaluate(el => [el.selectionStart, el.selectionEnd])).toEqual([1, 1]);
      await select(input, 2, 3); await input.press('Backspace');
      await expect(input).toHaveValue('2:');
      expect(await input.evaluate(el => [el.selectionStart, el.selectionEnd])).toEqual([2, 2]);
      expect(await page.evaluate(() => field.value.get())).toBe('2:');
      await pressNativeTab(page); await expect(input).toHaveValue('2:');
      await select(input, 2); await input.pressSequentially('45');
      await expect(input).toHaveValue('2:45');
      expect(await page.evaluate(() => field.value.get())).toBe('02:45');
      await pressNativeTab(page); await expect(input).toHaveValue(shown('02:45', hourMode));
    });

    test(`${hourMode} API, silent load, same-value refresh, clear and reset preserve honest partials`, async ({ page }) => {
      const input = await setup(page, hourMode, '09:45');
      await page.evaluate(() => field.value.set('1:'));
      await expect(input).toHaveValue('1:');
      expect(await page.evaluate(() => changes)).toEqual(phases.map(phase => ({
        phase, value: '1:', old: '09:45', origin: 'api', user: false, source: true
      })));
      await page.evaluate(() => { changes.length = 0; field.value.set(field.value.get(), { silent: true }); field.refresh(); });
      await expect(input).toHaveValue('1:');
      for (const partial of ['1:3', '12:34 P']) {
        await page.evaluate(partial => field.value.set(partial, { silent: true }), partial);
        await expect(input).toHaveValue(partial);
        await input.focus(); await pressNativeTab(page); await expect(input).toHaveValue(partial);
        expect(await page.evaluate(() => field.value.get())).toBe(partial);
      }
      await page.evaluate(() => field.value.reset({ silent: true }));
      await expect(input).toHaveValue(shown('09:45', hourMode));
      expect(await page.evaluate(() => ({ value: field.value.get(), dirty: field.isDirty(), changes })))
        .toEqual({ value: '09:45', dirty: false, changes: [] });
      await page.evaluate(() => field.value.set(null, { silent: true }));
      await expect(input).toHaveValue('');
      expect(await page.evaluate(() => ({ value: field.value.get(), changes }))).toEqual({ value: '', changes: [] });
    });
  }

  test('complete midnight, noon and PM values retain the established AM/PM conversion', async ({ page }) => {
    const input = await setup(page, '12');
    for (const [text, value] of [['12:34 AM', '00:34'], ['12:34 PM', '12:34'], ['01:34 PM', '13:34']]) {
      await input.press('ControlOrMeta+A'); await input.pressSequentially(text);
      await expect(input).toHaveValue(text);
      expect(await page.evaluate(() => field.value.get())).toBe(value);
      const count = await page.evaluate(() => changes.length);
      await pressNativeTab(page); await expect(input).toHaveValue(text);
      expect(await page.evaluate(() => changes.length)).toBe(count);
    }
  });

  for (const state of ['readOnly', 'disabled']) test(`${state} blocks editing a partial but permits silent API replacement`, async ({ page }) => {
    const input = await setup(page, '12', '1:');
    await input.focus();
    await page.evaluate(state => state === 'readOnly' ? field.setReadOnly(true) : field.disable(), state);
    await page.keyboard.press('ControlOrMeta+A'); await page.keyboard.type('2');
    await expect(input).toHaveValue('1:');
    expect(await page.evaluate(() => ({ value: field.value.get(), changes }))).toEqual({ value: '1:', changes: [] });
    await page.evaluate(() => field.value.set('1:4', { silent: true }));
    await expect(input).toHaveValue('1:4');
    await page.evaluate(state => state === 'readOnly' ? field.setReadOnly(false) : field.enable(), state);
    await select(input, 3); await input.pressSequentially('5');
    await expect(input).toHaveValue('1:45');
    expect(await page.evaluate(() => field.value.get())).toBe('01:45');
    await pressNativeTab(page); await expect(input).toHaveValue('01:45 AM');
  });

  for (const nested of [false, true]) test(`veto ${nested ? 'with silent replacement' : 'alone'} restores surviving incomplete text`, async ({ page }) => {
    const input = await setup(page, '12', '1:');
    await page.evaluate(nested => field.events.on('beforeChange', e => {
      if (nested) field.value.set('2:', { silent: true });
      e.cancel = true;
    }), nested);
    await select(input, 2); await input.pressSequentially('3');
    const expected = nested ? '2:' : '1:';
    await expect(input).toHaveValue(expected);
    expect(await page.evaluate(() => field.value.get())).toBe(expected);
    expect(await page.evaluate(() => changes.map(e => e.phase))).toEqual(['beforeChange']);
    await pressNativeTab(page); await expect(input).toHaveValue(expected);
  });

  for (const phase of phases) test(`${phase} teardown during a partial edit stops subsequent callbacks`, async ({ page }) => {
    const input = await setup(page, '12', '1:');
    await page.evaluate(phase => field.events.on(phase, () => field.destroy()), phase);
    await select(input, 2); await input.pressSequentially('3');
    await expect(input).toHaveCount(0);
    expect(await page.evaluate(() => changes.map(e => e.phase))).toEqual(phases.slice(0, phases.indexOf(phase) + 1));
    expect(await page.evaluate(() => field.destroyed)).toBe(true);
  });

  for (const action of ['Cancel', 'OK']) test(`picker 24 display mode preserves partial; explicit PM selection ${action} stages or commits complete value`, async ({ page }) => {
    const input = await setup(page, '12', '1:');
    await input.press('Alt+ArrowDown');
    const picker = page.locator('.dui-time-picker');
    await expect(picker).toBeVisible();
    await expect(picker.locator('.dui-time-picker__wheel .dui-active')).toHaveCount(0);
    await expect(picker.locator('.dui-time-picker__modes .dui-active')).toHaveCount(0);
    await picker.locator('.dui-time-picker__modes').getByRole('button', { name: '24', exact: true }).click();
    await expect(picker.locator('.dui-time-picker__wheel .dui-active')).toHaveCount(0);
    await expect(picker.locator('.dui-time-picker__modes .dui-active')).toHaveText('24');
    await expect(input).toHaveValue('1:');
    expect(await page.evaluate(() => ({ value: field.value.get(), changes }))).toEqual({ value: '1:', changes: [] });
    await picker.getByRole('button', { name: action, exact: true }).click();
    await expect(input).toHaveValue('1:');
    await expect(input).toBeFocused();
    expect(await page.evaluate(() => changes)).toEqual([]);
    await input.press('Alt+ArrowDown');
    // AM/PM is an explicit value choice, unlike blur or the display-only 24 button.
    // Keep its existing completion policy; this is not an implicit completeness validator.
    await picker.getByRole('button', { name: 'PM', exact: true }).click();
    await expect(input).toHaveValue('01:00 PM');
    await expect(picker.locator('.dui-time-picker__wheel .dui-active')).toHaveText(['01', '00']);
    await expect(picker.locator('.dui-time-picker__modes .dui-active')).toHaveText('PM');
    expect(await page.evaluate(() => ({ value: field.value.get(), changes }))).toEqual({ value: '1:', changes: [] });
    await picker.getByRole('button', { name: action, exact: true }).click();
    await expect(picker).toBeHidden();
    await expect(input).toHaveValue(action === 'OK' ? '01:00 PM' : '1:');
    await expect(input).toBeFocused();
    expect(await page.evaluate(() => field.value.get())).toBe(action === 'OK' ? '13:00' : '1:');
    expect(await page.evaluate(() => changes)).toEqual(action === 'OK' ? phases.map(phase => ({
      phase, value: '13:00', old: '1:', origin: 'user', user: true, source: true
    })) : []);
  });

  for (const complete of [false, true]) test(`Form ${complete ? 'explicit completeness validator blocks partial submit' : 'required remains a nonempty check'}`, async ({ page }) => {
    await page.goto('/browser-tests/recipes.html');
    await page.evaluate(async complete => {
      const { Form, TimeInput, required } = await import('/src/ui/all.js');
      window.field = new TimeInput({ name: 'when', hourMode: '12', required: true, validators: [required()] });
      if (complete) field.addValidator(value => /^\d{2}:\d{2}$/.test(value) || 'Complete time required');
      window.owner = new Form().row(field); owner.mount('#root');
      window.writes = []; window.changes = [];
      owner.events.on('submit', e => writes.push(e.value));
      field.events.on('change', e => changes.push(e.newValue));
    }, complete);
    const input = page.locator('#root input');
    await input.pressSequentially('1:');
    expect(await page.evaluate(() => owner.value.get())).toEqual({ when: '1:' });
    expect(await page.evaluate(() => owner.validate().ok)).toBe(!complete);
    expect(await page.evaluate(() => owner.submit({ origin: 'user', userAction: true }))).toBe(!complete);
    await expect(input).toHaveValue('1:');
    expect(await page.evaluate(() => writes)).toEqual(complete ? [] : [{ when: '1:' }]);
    expect(await page.evaluate(() => changes)).toEqual(['01:00', '1:']);
    if (complete) {
      await expect(input).toBeFocused();
      await select(input, 2); await input.pressSequentially('34');
      expect(await page.evaluate(() => owner.submit({ origin: 'user', userAction: true }))).toBe(true);
      expect(await page.evaluate(() => writes)).toEqual([{ when: '01:34' }]);
      await page.evaluate(() => owner.value.set({ when: '2:' }, { silent: true }));
      await expect(input).toHaveValue('2:');
      expect(await page.evaluate(() => owner.submit())).toBe(false);
      expect(await page.evaluate(() => writes)).toEqual([{ when: '01:34' }]);
    } else {
      await input.press('ControlOrMeta+A'); await input.press('Backspace');
      expect(await page.evaluate(() => owner.validate().ok)).toBe(false);
      expect(await page.evaluate(() => owner.submit())).toBe(false);
      expect(await page.evaluate(() => writes)).toEqual([{ when: '1:' }]);
    }
  });

  for (const facade of ['Grid', 'TreeGrid']) {
    for (const action of ['Enter', 'Tab', 'API']) test(`${facade} explicit completeness prevents ${action} owner write and allows corrected commit`, async ({ page }) => {
      const input = await gridFixture(page, facade);
      await expect(input).toHaveValue('1:');
      if (action === 'API') expect(await page.evaluate(() => owner.commitEdit())).toBe(false);
      else await input.press(action);
      await expect(input).toBeFocused(); await expect(input).toHaveValue('1:');
      expect(await page.evaluate(() => ({ field: ed.getValue(), value: owner.data.get(1).when, writes, events, validated })))
        .toEqual({ field: '1:', value: '09:45', writes: [], events: ['editReject'], validated: ['1:'] });
      await select(input, 2); await input.pressSequentially('34');
      expect(await page.evaluate(() => ({ value: owner.data.get(1).when, writes }))).toEqual({ value: '09:45', writes: [] });
      if (action === 'API') expect(await page.evaluate(() => owner.commitEdit())).toBe(true);
      else await input.press(action);
      expect(await page.evaluate(() => ({ value: owner.data.get(1).when, writes: writes.length, events, validated })))
        .toEqual({ value: '01:34', writes: 1, events: ['editReject', 'cellChange', 'editCommit'], validated: ['1:', '01:34'] });
      if (action === 'Tab') {
        await expect(page.locator('.dui-grid__editor-host input')).toHaveValue('Tail');
        await expect(page.locator('.dui-grid__editor-host input')).toBeFocused();
        await page.keyboard.press('Escape');
      } else await expect(page.locator('.dui-grid__editor-host')).toHaveCount(0);
      expect(await page.evaluate(() => writes.length)).toBe(1);
    });
    test(`${facade} Escape after partial rejection discards without a write; reopen is clean`, async ({ page }) => {
      const input = await gridFixture(page, facade);
      await input.press('Tab'); await expect(input).toBeFocused();
      await input.press('Escape');
      await expect(page.locator('.dui-grid__editor-host')).toHaveCount(0);
      expect(await page.evaluate(() => ({ value: owner.data.get(1).when, writes, events })))
        .toEqual({ value: '09:45', writes: [], events: ['editReject', 'editCancel'] });
      await page.evaluate(() => owner.startEdit(1, 'when'));
      await expect(input).toHaveValue('09:45 AM');
      await input.press('Escape');
      expect(await page.evaluate(() => writes)).toEqual([]);
    });
  }
});
