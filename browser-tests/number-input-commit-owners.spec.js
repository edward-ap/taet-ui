import { expect, test } from './input-test-fixture.js';

async function formFixture(page) {
  await page.goto('/browser-tests/recipes.html');
  await page.evaluate(async () => {
    const { Form, NumberInput } = await import('/src/ui/all.js');
    window.number = new NumberInput({ name: 'amount', value: 20, min: 10, updateMode: 'commit' });
    window.owner = new Form().row(number); owner.mount('#root');
    window.events = []; window.validated = [];
    number.setValidators([value => { validated.push(value); return value <= 30 || 'At most thirty'; }]);
    for (const name of ['beforeSubmit', 'submit', 'afterSubmit']) owner.events.on(name, e => events.push({ name, value: e.value }));
    window.changes = []; number.events.on('change', e => changes.push(e.newValue));
  });
  return page.locator('#root input');
}
async function gridFixture(page, facade) {
  await page.goto('/browser-tests/recipes.html');
  await page.evaluate(async facade => {
    const ui = await import('/src/ui/grid-api.js');
    window.validated = []; window.changes = []; window.events = []; window.writes = [];
    const factory = ui.gridEditors.number({ updateMode: 'commit', min: 10,
      validators: [value => { validated.push(value); return value <= 30 || 'At most thirty'; }] });
    const editor = ui.createGridEditorFactory(context => {
      window.ed = factory.createCellEditor(context);
      ed.control.events.on('change', e => changes.push(e.newValue));
      return ed;
    }, { activation: factory.activation, filterType: factory.filterType });
    window.owner = new ui[facade]('#root', { width: 460, height: 220, treeColumnId: 'label',
      columns: [{ id: 'label', readOnly: true }, { id: 'amount', editor }, { id: 'tail', editor: ui.gridEditors.text() }] });
    owner.data.parse(Array.from({ length: 100 }, (_, i) => ({ id: i + 1, parentId: null, label: `Row ${i + 1}`, amount: 20, tail: 'Tail' })));
    owner.data.events.on('change', e => writes.push(e.type));
    for (const name of ['cellChange', 'editCommit', 'editCancel', 'editReject']) owner.events.on(name, e => events.push(name));
    owner.startEdit(1, 'amount');
  }, facade);
  const input = page.locator('.dui-grid__editor-host input');
  await expect(input).toBeFocused();
  await input.press('ControlOrMeta+A');
  return input;
}

test.describe('NumberInput commit mode owners', { tag: '@input-editing' }, () => {
  test.afterEach(async ({ page }) => { await page.evaluate(() => window.owner?.destroy()); });

  test('Form validates pending candidate without mutation and submits focused input exactly once', async ({ page }) => {
    const input = await formFixture(page);
    await input.press('ControlOrMeta+A'); await input.pressSequentially('12');
    expect(await page.evaluate(() => owner.validate().ok)).toBe(true);
    expect(await page.evaluate(() => ({ validated, value: owner.value.get(), dirty: owner.isDirty(), changes, events })))
      .toEqual({ validated: [12], value: { amount: 20 }, dirty: false, changes: [], events: [] });
    expect(await page.evaluate(() => owner.submit({ origin: 'user', userAction: true }))).toBe(true);
    await expect(input).toBeFocused();
    expect(await page.evaluate(() => ({ value: owner.value.get(), changes, events }))).toEqual({
      value: { amount: 12 }, changes: [12],
      events: ['beforeSubmit', 'submit', 'afterSubmit'].map(name => ({ name, value: { amount: 12 } }))
    });
  });

  for (const failure of ['invalid', 'validator', 'veto']) test(`Form ${failure} blocks focused submit`, async ({ page }) => {
    const input = await formFixture(page);
    if (failure === 'veto') await page.evaluate(() => number.events.on('beforeChange', e => { e.cancel = true; }));
    await input.press('ControlOrMeta+A'); await input.pressSequentially(failure === 'invalid' ? '-' : failure === 'validator' ? '40' : '12');
    expect(await page.evaluate(() => owner.submit({ origin: 'user', userAction: true }))).toBe(false);
    expect(await page.evaluate(() => events.filter(e => e.name === 'submit'))).toEqual([]);
    if (failure !== 'validator') expect(await page.evaluate(() => ({ value: owner.value.get(), changes, pending: number.hasPendingInput(), events })))
      .toEqual({ value: { amount: 20 }, changes: [], pending: true, events: [] });
    await expect(input).toBeFocused();
  });

  for (const mode of ['inline', 'session']) for (const action of (mode === 'inline' ? ['Enter', 'Escape'] : ['Enter', 'API', 'Escape'])) test(`PropertyGrid ${mode} ${action} owns pending numeric edit`, async ({ page }) => {
    await page.goto('/browser-tests/recipes.html');
    await page.evaluate(async mode => {
      const { PropertyGrid, gridEditors } = await import('/src/ui/all.js');
      window.writes = [];
      window.owner = new PropertyGrid({ source: [{ id: 'general', properties: [{ name: 'amount',
        type: mode === 'inline' ? 'number' : 'custom', value: 20, editor: gridEditors.number({ min: 10, updateMode: 'commit' }),
        set: value => writes.push(value) }] }] }).mount('#root');
      owner.startEdit('amount');
    }, mode);
    const input = page.locator('#root input');
    await input.press('ControlOrMeta+A'); await input.pressSequentially('12');
    expect(await page.evaluate(() => writes)).toEqual([]);
    expect(await page.evaluate(() => owner.getPropertyControl('amount').property.value)).toBe(20);
    if (action === 'API') expect(await page.evaluate(() => owner.commitEdit())).toBe(true);
    else await input.press(action);
    expect(await page.evaluate(() => writes)).toEqual(action === 'Escape' ? [] : [12]);
    expect(await page.evaluate(() => owner.getPropertyControl('amount').property.value)).toBe(action === 'Escape' ? 20 : 12);
    if (mode === 'session') await expect(input).toHaveCount(0);
    else await expect(input).toHaveValue(action === 'Escape' ? '20' : '12');
  });

  for (const facade of ['Grid', 'TreeGrid']) {
    for (const action of ['Enter', 'Tab', 'API']) test(`${facade} ${action} prepares then validates and stores once`, async ({ page }) => {
      const input = await gridFixture(page, facade);
      await input.pressSequentially('1'); await expect(input).toHaveValue('1');
      await input.pressSequentially('2'); await expect(input).toHaveValue('12');
      expect(await page.evaluate(() => ({ field: ed.getValue(), value: owner.data.get(1).amount, writes, changes, validated })))
        .toEqual({ field: 20, value: 20, writes: [], changes: [], validated: [] });
      if (action === 'API') expect(await page.evaluate(() => owner.commitEdit())).toBe(true);
      else await input.press(action); // Grid handles plain Tab itself, including on macOS WebKit.
      expect(await page.evaluate(() => ({ value: owner.data.get(1).amount, writes: writes.length, changes, validated, events })))
        .toEqual({ value: 12, writes: 1, changes: [12], validated: [12], events: ['cellChange', 'editCommit'] });
      if (action === 'Tab') {
        await expect(page.locator('.dui-grid__editor-host input')).toBeFocused();
        expect(await page.evaluate(() => owner._editing.column.id)).toBe('tail');
        await page.keyboard.press('Escape');
      } else await expect(page.locator('.dui-grid__editor-host')).toHaveCount(0);
      expect(await page.evaluate(() => writes.length)).toBe(1);
    });

    for (const action of ['Escape', 'scroll', 'destroy']) test(`${facade} ${action} discards draft without any write`, async ({ page }) => {
      const input = await gridFixture(page, facade);
      await input.pressSequentially('12');
      if (action === 'Escape') await input.press('Escape');
      else if (action === 'scroll') await page.locator('.dui-grid__body').evaluate(el => { el.scrollTop = 100; });
      else await page.evaluate(() => owner.destroy());
      await expect(page.locator('.dui-grid__editor-host')).toHaveCount(0);
      expect(await page.evaluate(() => ({ writes, changes, validated }))).toEqual({ writes: [], changes: [], validated: [] });
    });

    for (const failure of ['invalid', 'validator', 'veto']) test(`${facade} ${failure} prevents owner write and keeps editor`, async ({ page }) => {
      const input = await gridFixture(page, facade);
      if (failure === 'veto') await page.evaluate(() => ed.control.events.on('beforeChange', e => { e.cancel = true; }));
      await input.pressSequentially(failure === 'invalid' ? '-' : failure === 'validator' ? '40' : '12');
      await input.press('Tab');
      await expect(input).toBeFocused();
      expect(await page.evaluate(() => ({ value: owner.data.get(1).amount, writes, events })))
        .toEqual({ value: 20, writes: [], events: ['editReject'] });
      if (failure !== 'validator') expect(await page.evaluate(() => ({ field: ed.getValue(), pending: ed.control.hasPendingInput(), changes })))
        .toEqual({ field: 20, pending: true, changes: [] });
      await input.press('Escape'); expect(await page.evaluate(() => writes)).toEqual([]);
    });

    test(`${facade} blur changes field only, explicit owner commit stores once`, async ({ page }) => {
      const input = await gridFixture(page, facade);
      await input.pressSequentially('12');
      await input.evaluate(el => el.blur());
      expect(await page.evaluate(() => ({ field: ed.getValue(), value: owner.data.get(1).amount, writes, changes })))
        .toEqual({ field: 12, value: 20, writes: [], changes: [12] });
      expect(await page.evaluate(() => owner.commitEdit())).toBe(true);
      expect(await page.evaluate(() => ({ writes: writes.length, changes, value: owner.data.get(1).amount })))
        .toEqual({ writes: 1, changes: [12], value: 12 });
    });

    for (const callback of ['destroy', 'replace']) test(`${facade} prepare callback ${callback} cannot commit stale editor`, async ({ page }) => {
      const input = await gridFixture(page, facade);
      await page.evaluate(callback => {
        ed.control.events.on('beforeChange', () => {
          if (callback === 'destroy') owner.destroy();
          else { owner.cancelEdit(); owner.startEdit(2, 'amount'); }
        });
      }, callback);
      await input.pressSequentially('12'); await input.press('Enter');
      expect(await page.evaluate(() => writes)).toEqual([]);
      expect(await page.evaluate(() => events.filter(name => name === 'editCommit'))).toEqual([]);
      if (callback === 'replace') {
        expect(await page.evaluate(() => owner._editing.id)).toBe(2);
        await expect(page.locator('.dui-grid__editor-host input')).toHaveValue('20');
      } else await expect(page.locator('.dui-grid__editor-host')).toHaveCount(0);
    });
  }
});
