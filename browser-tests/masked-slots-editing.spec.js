import { test, expect } from './input-test-fixture.js';

async function mount(page, options = {}) {
  await page.goto('/browser-tests/recipes.html');
  await page.evaluate(async options => {
    const { TextInput } = await import('/src/ui/index.js');
    window.field = new TextInput('#root', { mask: 'AA-0000', maskMode: 'slots', value: 'AB1234', ...options });
    window.changes = [];
    field.events.on('change', event => changes.push({ oldValue: event.oldValue, newValue: event.newValue, origin: event.origin, userAction: event.userAction }));
  }, options);
  return page.locator('#root input');
}
const select = (input, start, end = start) => input.evaluate((el, range) => { el.focus(); el.setSelectionRange(...range); }, [start, end]);
const caret = input => input.evaluate(el => [el.selectionStart, el.selectionEnd]);

test.describe('Masked slots editing', { tag: '@input-editing' }, () => {
  test.afterEach(async ({ page }) => { await page.evaluate(() => window.field?.destroy()); });
  for (const raw of [false, true]) {
    test(`strict slots baseline raw=${raw}: deletion retains fixed suffix and holes roundtrip`, async ({ page }) => {
      const input = await mount(page, { unmaskValue: raw });
      await select(input, 0, 2); await input.press('Delete');
      await expect(input).toHaveValue('__-1234');
      expect(await page.evaluate(() => field.value.get())).toBe(raw ? '__1234' : '__-1234');
      expect(await page.evaluate(() => field.getRawValue())).toBe('__1234');
      expect(await caret(input)).toEqual([0, 0]);
      await input.pressSequentially('X'); await expect(input).toHaveValue('X_-1234');
      await input.pressSequentially('Y'); await expect(input).toHaveValue('XY-1234');
    });
  }
});

test.describe('Masked slots lifecycle and grammar', { tag: '@input-editing' }, () => {
  test.afterEach(async ({ page }) => { await page.evaluate(() => window.field?.destroy()); });
  for (const raw of [false, true]) {
    test(`raw=${raw} overwrite selection deletion and caret never shift unaffected slots`, async ({ page }) => {
      const input = await mount(page, { unmaskValue: raw });
      await select(input, 4, 6); await input.press('Backspace'); await expect(input).toHaveValue('AB-1__4');
      expect(await caret(input)).toEqual([4, 4]);
      await input.pressSequentially('98'); await expect(input).toHaveValue('AB-1984');
      await select(input, 3); await input.press('Backspace'); await expect(input).toHaveValue('A_-1984');
      expect(await caret(input)).toEqual([1, 1]);
      await input.pressSequentially('Z'); await expect(input).toHaveValue('AZ-1984');
      await select(input, 2); await input.press('Delete'); await expect(input).toHaveValue('AZ-_984');
      await select(input, 4); await input.pressSequentially('7'); await expect(input).toHaveValue('AZ-_784');
      await select(input, 4); const count = await page.evaluate(() => changes.length);
      await input.pressSequentially('X'); await expect(input).toHaveValue('AZ-_784'); expect(await caret(input)).toEqual([4, 4]);
      expect(await page.evaluate(() => changes.length)).toBe(count);
    });
    test(`raw=${raw} undo redo stores holes and selection and new edits discard redo`, async ({ page }) => {
      const input = await mount(page, { unmaskValue: raw });
      await select(input, 0, 2); await input.press('Delete');
      await input.press('ControlOrMeta+z'); await expect(input).toHaveValue('AB-1234'); expect(await caret(input)).toEqual([0, 2]);
      await input.press('ControlOrMeta+Shift+z'); await expect(input).toHaveValue('__-1234');
      await input.pressSequentially('X'); await input.press('ControlOrMeta+z'); await expect(input).toHaveValue('__-1234');
      await input.pressSequentially('Y'); await input.press('ControlOrMeta+Shift+z'); await expect(input).toHaveValue('Y_-1234');
      expect(await page.evaluate(() => changes.every(e => e.origin === 'user' && e.userAction))).toBe(true);
    });
    test(`raw=${raw} API silent canonical holes reset clear and veto preserve boundaries`, async ({ page }) => {
      const input = await mount(page, { unmaskValue: raw });
      await select(input, 0, 2); await input.press('Delete');
      await page.evaluate(raw => field.value.set(raw ? 'X_1_34' : 'X_-1_34', { silent: true }), raw);
      await expect(input).toHaveValue('X_-1_34');
      expect(await page.evaluate(() => changes.length)).toBe(1);
      await input.press('ControlOrMeta+z'); await expect(input).toHaveValue('X_-1_34');
      await page.evaluate(() => field.value.reset({ silent: true })); await expect(input).toHaveValue('AB-1234');
      await page.evaluate(() => { window.veto = field.events.on('beforeChange', event => event.cancel = true); });
      await select(input, 0, 2); await input.press('Delete'); await expect(input).toHaveValue('AB-1234'); expect(await caret(input)).toEqual([0, 2]);
      await page.evaluate(() => { veto.off(); field.value.clear({ silent: true }); }); await expect(input).toHaveValue('__-____');
      expect(await page.evaluate(() => field.getRawValue())).toBe('');
      await input.press('ControlOrMeta+Shift+z'); await expect(input).toHaveValue('__-____');
    });
    test(`raw=${raw} alphanumeric literals and holes survive repeated API roundtrip`, async ({ page }) => {
      const input = await mount(page, { mask: 'ID-000', value: '12', unmaskValue: raw });
      await expect(input).toHaveValue('ID-12_');
      expect(await page.evaluate(() => field.getRawValue())).toBe('ID12_');
      await select(input, 3, 4); await input.press('Delete'); await expect(input).toHaveValue('ID-_2_');
      const value = raw ? 'ID_2_' : 'ID-_2_';
      expect(await page.evaluate(() => field.value.get())).toBe(value);
      await page.evaluate(() => { const value = field.value.get(); field.value.clear({ silent: true }); field.value.set(value, { silent: true }); });
      await expect(input).toHaveValue('ID-_2_');
      await input.press('ControlOrMeta+a'); await input.press('Delete'); await expect(input).toHaveValue('ID-___');
      expect(await page.evaluate(() => field.getRawValue())).toBe('');
    });
    test(`raw=${raw} synthetic composition remains live with one completed history operation`, async ({ page }) => {
      const input = await mount(page, { value: '__1234', unmaskValue: raw });
      await select(input, 0, 1);
      await input.evaluate(el => {
        el.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
        el.value = 'X_-1234'; el.setSelectionRange(1, 1);
        el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertCompositionText', data: 'X', isComposing: true }));
      });
      expect(await page.evaluate(() => field.value.get())).toBe(raw ? 'X_1234' : 'X_-1234');
      await input.evaluate(el => {
        el.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: 'X' }));
        el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: 'X' }));
      });
      await expect(input).toHaveValue('X_-1234'); expect(await page.evaluate(() => changes.length)).toBe(1);
      await input.press('ControlOrMeta+z'); await expect(input).toHaveValue('__-1234');
      // Synthetic lifecycle only. This is not native IME or OS keyboard coverage.
    });
  }
  test('custom placeholder preserves holes; ambiguous or invalid placeholders fail eagerly', async ({ page }) => {
    const input = await mount(page, { placeholderChar: '?', value: 'X?12?4' });
    await expect(input).toHaveValue('X?-12?4');
    expect(await page.evaluate(() => field.getRawValue())).toBe('X?12?4');
    const errors = await page.evaluate(async () => {
      const { TextInput } = await import('/src/ui/index.js');
      return ['', '__', 'A', '0', ' ', '\n', '-', 'é'].map(placeholderChar => {
        try { const control = new TextInput({ mask: 'AA-0000', maskMode: 'slots', placeholderChar }); control.destroy(); return false; }
        catch (error) { return error instanceof Error; }
      });
    });
    expect(errors).toEqual(Array(8).fill(true));
  });
  test('readonly disabled and teardown stop real and retained detached input', async ({ page }) => {
    const input = await mount(page);
    await page.evaluate(() => field.setReadOnly(true)); await select(input, 0, 2); await input.press('Delete'); await expect(input).toHaveValue('AB-1234');
    await page.evaluate(() => { field.setReadOnly(false); field.disable(); }); await expect(input).toBeDisabled();
    await page.keyboard.press('Delete'); await expect(input).toHaveValue('AB-1234');
    await page.evaluate(() => { field.enable(); window.retained = field._input; field.events.on('change', () => field.destroy()); });
    await select(input, 0, 2); await input.press('Delete'); await expect(page.locator('#root')).toBeEmpty();
    const value = await page.evaluate(() => field.value.get());
    await page.evaluate(() => { retained.value = 'XY-5678'; retained.dispatchEvent(new InputEvent('input', { bubbles: true })); });
    expect(await page.evaluate(() => field.value.get())).toBe(value);
  });
});

// Same reviewed exact headless-shell ClipboardNonBacked isolation as
// input-isolated-clipboard.spec.js. Never use the shared OS clipboard.
const clipboardTest = test.extend({
  page: async ({ playwright, browserName, baseURL }, use) => {
    test.skip(browserName !== 'chromium', 'Only the exact reviewed Chromium headless shell has an isolated in-memory clipboard.');
    const browser = await playwright.chromium.launch({ channel: 'chromium-headless-shell', headless: true, args: ['--enable-automation'] });
    try {
      expect(browser.version()).toBe('149.0.7827.55');
      const cdp = await browser.newBrowserCDPSession();
      const { arguments: args } = await cdp.send('Browser.getBrowserCommandLine');
      expect(args[0]).toMatch(/(?:chrome-headless-shell|headless_shell)(?:\.exe)?$/i);
      expect(args).toContain('--headless'); await cdp.detach();
      const context = await browser.newContext({ baseURL }); await use(await context.newPage()); await context.close();
    } finally { await browser.close(); }
  }
});
clipboardTest.describe('Slots isolated in-memory clipboard', { tag: ['@input-editing', '@input-clipboard'] }, () => {
  clipboardTest.afterEach(async ({ page }) => { await page.evaluate(() => window.field?.destroy()); });
  for (const raw of [false, true]) clipboardTest(`raw=${raw} paste replaces slots and cut leaves holes with reversible history`, async ({ page }) => {
    const input = await mount(page, { unmaskValue: raw });
    await page.evaluate(() => { const source = document.createElement('input'); source.id = 'slot-source'; source.value = 'XY'; document.body.append(source); });
    const source = page.locator('#slot-source');
    await source.focus(); await source.press('ControlOrMeta+a'); await source.press('ControlOrMeta+c');
    await select(input, 0, 2); await input.press('ControlOrMeta+v'); await expect(input).toHaveValue('XY-1234');
    await input.press('ControlOrMeta+z'); await expect(input).toHaveValue('AB-1234');
    await input.press('ControlOrMeta+Shift+z'); await expect(input).toHaveValue('XY-1234');
    await select(input, 0, 2); await input.press('ControlOrMeta+x'); await expect(input).toHaveValue('__-1234');
    await input.press('ControlOrMeta+z'); await expect(input).toHaveValue('XY-1234'); expect(await caret(input)).toEqual([0, 2]);
    await input.press('ControlOrMeta+Shift+z'); await expect(input).toHaveValue('__-1234');
    await input.press('ControlOrMeta+v'); await expect(input).toHaveValue('XY-1234');
  });
});


test.describe('Slots native validation ownership', { tag: '@input-editing' }, () => {
  test.afterEach(async ({ page }) => { await page.evaluate(() => window.field?.destroy()); });
  test('required scaffold survives barred validation and never clears external custom validity', async ({ page }) => {
    const input = await mount(page, { value: '', required: true });
    const validity = () => input.evaluate(el => ({ willValidate: el.willValidate, customError: el.validity.customError,
      valueMissing: el.validity.valueMissing, valid: el.checkValidity(), message: el.validationMessage }));
    await input.focus();
    expect(await validity()).toMatchObject({ willValidate: true, customError: true, valueMissing: false, valid: false });
    await input.evaluate(el => el.blur()); await expect(input).toHaveValue('');
    expect(await validity()).toMatchObject({ willValidate: true, customError: false, valueMissing: true, valid: false });
    for (const state of ['readonly', 'disabled']) {
      await input.focus();
      await page.evaluate(state => state === 'readonly' ? field.setReadOnly(true) : field.disable(), state);
      expect(await validity()).toMatchObject({ willValidate: false, valid: true });
      await page.evaluate(() => field.value.set('AB1234', { silent: true }));
      await page.evaluate(state => state === 'readonly' ? field.setReadOnly(false) : field.enable(), state);
      expect(await validity()).toMatchObject({ willValidate: true, customError: false, valueMissing: false, valid: true });
      await input.focus(); await page.evaluate(() => field.value.clear({ silent: true }));
      await expect(input).toHaveValue('__-____');
      expect(await validity()).toMatchObject({ customError: true, valueMissing: false, valid: false });
      await page.evaluate(state => state === 'readonly' ? field.setReadOnly(true) : field.disable(), state);
      await input.evaluate(el => el.setCustomValidity('Application-owned error'));
      await page.evaluate(() => field.value.set('XY5678', { silent: true }));
      await page.evaluate(state => state === 'readonly' ? field.setReadOnly(false) : field.enable(), state);
      expect(await validity()).toMatchObject({ willValidate: true, customError: true, valid: false, message: 'Application-owned error' });
      await input.focus(); await input.evaluate(el => el.blur());
      await page.evaluate(() => field.value.clear({ silent: true }));
      await input.focus();
      expect(await validity()).toMatchObject({ customError: true, valid: false, message: 'Application-owned error' });
      await input.evaluate(el => el.setCustomValidity(''));
      // Re-enter focus to let the editor supply its own required-only message again.
      await input.evaluate(el => el.blur()); await input.focus();
      expect(await validity()).toMatchObject({ customError: true, valueMissing: false, valid: false });
    }
  });
});
