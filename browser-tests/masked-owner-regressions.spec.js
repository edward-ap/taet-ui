import { pressNativeTab } from './keyboard-helpers.js';
import { test, expect } from './input-test-fixture.js';
test.describe('Masked owner regressions', { tag: '@input-editing' }, () => {
  test.afterEach(async ({ page }) => { await page.evaluate(() => window.owner?.destroy()); });
  for (const raw of [false, true]) for (const mask of ['+0 (000) 000-0000', '+7 (000) 000-0000']) {
    test(`raw=${raw} ${mask} literal-only input remains required-empty`, async ({ page }) => {
      await page.goto('/browser-tests/recipes.html');
      await page.evaluate(async ({ raw, mask }) => {
        const { TextInput, Form, required } = await import('/src/ui/index.js');
        window.field = new TextInput({ name: 'phone', mask, unmaskValue: raw, validators: [required()] });
        window.owner = new Form().row(field).mount('#root');
      }, { raw, mask });
      const input = page.locator('#root input');
      await input.pressSequentially('x');
      await expect(input).toHaveValue('');
      expect(await page.evaluate(() => ({ value: field.value.get(), raw: field.getRawValue(), valid: owner.validate().ok, submitted: owner.submit() }))).toEqual({ value: '', raw: '', valid: false, submitted: false });
      await input.pressSequentially('1');
      expect(await page.evaluate(() => owner.validate().ok)).toBe(true);
    });
  }
});

async function ownerEditor(page, facade, raw, validate = false) {
  await page.goto('/browser-tests/recipes.html');
  await page.evaluate(async ({ facade, raw, validate }) => {
    const ui = await import('/src/ui/all.js');
    window.changes = []; window.writes = []; window.ownerEvents = [];
    const options = { mask: '00-00', unmaskValue: raw,
      validators: validate ? [value => value.replace(/\D/g, '').length === 4 || 'Four digits required'] : [] };
    if (facade === 'Form') {
      window.field = new ui.TextInput({ name: 'code', value: '9876', ...options });
      window.owner = new ui.Form().row(field).mount('#root');
      const button = document.createElement('button'); button.id = 'outside'; button.textContent = 'Outside'; document.body.append(button);
    } else {
      const factory = ui.gridEditors.text(options);
      const editor = ui.createGridEditorFactory(context => {
        const instance = factory.createCellEditor(context); window.field = instance.control; return instance;
      });
      window.owner = new ui[facade]('#root', { width: 460, height: 200, treeColumnId: 'label',
        columns: [{ id: 'label', readOnly: true }, { id: 'code', editor }, { id: 'tail', editor: ui.gridEditors.text() }] });
      owner.data.parse([{ id: 1, parentId: null, label: 'Row', code: raw ? '9876' : '98-76', tail: 'Tail' }]);
      owner.data.events.on('change', event => writes.push(event.type));
      for (const name of ['cellChange', 'editCommit', 'editCancel', 'editReject']) owner.events.on(name, () => ownerEvents.push(name));
      owner.startEdit(1, 'code');
    }
    field.events.on('change', event => changes.push(event.newValue));
  }, { facade, raw, validate });
  return page.locator(facade === 'Form' ? '#root input' : '.dui-grid__editor-host input');
}
const ownerState = page => page.evaluate(() => ({ value: owner.data ? owner.data.get(1).code : owner.value.get().code, field: field.value.get(), changes, writes, events: ownerEvents }));

test.describe('Masked live editors and owner transactions', { tag: '@input-editing' }, () => {
  test.afterEach(async ({ page }) => { await page.evaluate(() => window.owner?.destroy()); });
  for (const raw of [false, true]) {
    test(`Form raw=${raw} live partial value Escape blur silent import reset and veto`, async ({ page }) => {
      const input = await ownerEditor(page, 'Form', raw);
      await input.press('ControlOrMeta+a'); await input.pressSequentially('12');
      expect(await ownerState(page)).toMatchObject({ field: raw ? '12' : '12-', value: raw ? '12' : '12-', changes: ['1', raw ? '12' : '12-'] });
      await input.press('Escape');
      await pressNativeTab(page);
      expect(await page.evaluate(() => owner.submit())).toBe(true);
      expect((await ownerState(page)).value).toBe(raw ? '12' : '12-');
      await page.evaluate(() => owner.value.set({ code: '5678' }, { silent: true }));
      await expect(input).toHaveValue('56-78');
      await page.evaluate(() => field.value.reset({ silent: true }));
      await expect(input).toHaveValue('98-76');
      expect((await ownerState(page)).changes).toHaveLength(2);
      await page.evaluate(() => field.events.on('beforeChange', event => event.cancel = true));
      await input.focus(); await input.evaluate(el => el.setSelectionRange(1, 2));
      await input.pressSequentially('1');
      await expect(input).toHaveValue('98-76');
      expect(await input.evaluate(el => [el.selectionStart, el.selectionEnd])).toEqual([1, 2]);
      expect((await ownerState(page)).changes).toHaveLength(2);
    });
    for (const facade of ['Grid', 'TreeGrid']) {
      for (const action of ['Enter', 'Tab', 'Escape', 'blur', 'API']) {
        test(`${facade} raw=${raw} ${action} owns commit while mask stays live`, async ({ page }) => {
          const input = await ownerEditor(page, facade, raw);
          await input.press('ControlOrMeta+a'); await input.pressSequentially('1234');
          expect(await ownerState(page)).toMatchObject({ field: raw ? '1234' : '12-34', value: raw ? '9876' : '98-76', writes: [], changes: ['1', raw ? '12' : '12-', raw ? '123' : '12-3', raw ? '1234' : '12-34'] });
          if (action === 'API') await page.evaluate(() => owner.commitEdit());
          else if (action === 'blur') {
            await input.evaluate(el => el.blur());
            expect((await ownerState(page)).writes).toEqual([]);
            await page.evaluate(() => owner.commitEdit());
          } else await input.press(action); // Library-managed Tab must remain plain Tab.
          const state = await ownerState(page);
          expect(state.value).toBe(action === 'Escape' ? (raw ? '9876' : '98-76') : (raw ? '1234' : '12-34'));
          expect(state.writes).toHaveLength(action === 'Escape' ? 0 : 1);
          expect(state.events).toEqual(action === 'Escape' ? ['editCancel'] : ['cellChange', 'editCommit']);
        });
      }
      for (const validate of [false, true]) {
        test(`${facade} raw=${raw} partial acceptance requires explicit completeness validator=${validate}`, async ({ page }) => {
          const input = await ownerEditor(page, facade, raw, validate);
          await input.press('ControlOrMeta+a'); await input.pressSequentially('12'); await input.press('Enter');
          const state = await ownerState(page);
          expect(state.value).toBe(validate ? (raw ? '9876' : '98-76') : (raw ? '12' : '12-'));
          expect(state.events).toEqual(validate ? ['editReject'] : ['cellChange', 'editCommit']);
          if (validate) { await expect(input).toBeFocused(); await input.press('Escape'); expect((await ownerState(page)).writes).toEqual([]); }
        });
      }
    }
  }
});
