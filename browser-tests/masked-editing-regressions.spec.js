import { test, expect } from './input-test-fixture.js';

async function mount(page, options = {}) {
  await page.goto('/browser-tests/recipes.html');
  await page.evaluate(async options => {
    const { TextInput } = await import('/src/ui/index.js');
    window.field = new TextInput('#root', { mask: '00:00', value: '1234', ...options });
    window.changes = [];
    field.events.on('change', e => changes.push({ oldValue: e.oldValue, newValue: e.newValue, origin: e.origin, userAction: e.userAction }));
  }, options);
  return page.locator('#root input');
}
const selection = (input, start, end = start) => input.evaluate((el, [start, end]) => { el.focus(); el.setSelectionRange(start, end); }, [start, end]);
const caret = input => input.evaluate(el => [el.selectionStart, el.selectionEnd]);

test.describe('Masked editing regressions', { tag: '@input-editing' }, () => {
  test.afterEach(async ({ page }) => { await page.evaluate(() => window.field?.destroy()); });
  for (const raw of [false, true]) {
    test(`raw=${raw} sequential selected replacement preserves suffix and insertion position`, async ({ page }) => {
      const input = await mount(page, { unmaskValue: raw });
      await selection(input, 0, 2);
      await input.pressSequentially('98');
      await expect(input).toHaveValue('98:34');
      expect(await caret(input)).toEqual([3, 3]);
      expect(await page.evaluate(() => field.value.get())).toBe(raw ? '9834' : '98:34');
    });
    test(`raw=${raw} Backspace across separator removes token without jumping to end`, async ({ page }) => {
      const input = await mount(page, { unmaskValue: raw });
      await selection(input, 3);
      await input.press('Backspace');
      await expect(input).toHaveValue('13:4');
      expect(await caret(input)).toEqual([1, 1]);
      await input.press('Backspace');
      await expect(input).toHaveValue('34:');
      expect(await caret(input)).toEqual([0, 0]);
      // End is not a portable caret command; establish the end caret explicitly.
      await input.press('ControlOrMeta+A'); expect(await caret(input)).toEqual([0, 3]);
      await input.press('ArrowRight'); expect(await caret(input)).toEqual([3, 3]);
      await input.press('Backspace');
      await input.press('Backspace');
      await expect(input).toHaveValue('');
    });
    test(`raw=${raw} invalid insertion preserves value caret and events`, async ({ page }) => {
      const input = await mount(page, { unmaskValue: raw });
      await selection(input, 1);
      await input.pressSequentially('X');
      await expect(input).toHaveValue('12:34');
      expect(await caret(input)).toEqual([1, 1]);
      expect(await page.evaluate(() => changes)).toEqual([]);
    });
    test(`raw=${raw} keyboard undo redo crosses formatting boundary`, async ({ page }) => {
      const input = await mount(page, { value: '1', unmaskValue: raw });
      await selection(input, 1);
      await input.pressSequentially('2');
      await expect(input).toHaveValue('12:');
      await input.press('ControlOrMeta+z');
      await expect(input).toHaveValue('1');
      expect(await caret(input)).toEqual([1, 1]);
      await input.press('ControlOrMeta+Shift+z');
      await expect(input).toHaveValue('12:');
      expect(await page.evaluate(() => changes)).toEqual([['1', raw ? '12' : '12:'], [raw ? '12' : '12:', '1'], ['1', raw ? '12' : '12:']].map(([oldValue, newValue]) => ({ oldValue, newValue, origin: 'user', userAction: true })));
    });
  }
});

test.describe('Masked grammar and mutation boundaries', { tag: '@input-editing' }, () => {
  test.afterEach(async ({ page }) => { await page.evaluate(() => window.field?.destroy()); });
  for (const raw of [false, true]) {
    for (const [mask, value, start, end, typed, display] of [
      ['AA-AA', 'ABCD', 0, 2, 'XY', 'XY-CD'],
      ['AA-0000', 'AB1234', 3, 5, '98', 'AB-9834'],
      ['99-aa**', '12abC3', 0, 1, '9', '92-abC3']
    ]) {
      test(`raw=${raw} grammar ${mask} selected homogeneous tokens retain other segments`, async ({ page }) => {
        const input = await mount(page, { mask, value, unmaskValue: raw });
        await selection(input, start, end); await input.pressSequentially(typed);
        await expect(input).toHaveValue(display);
        expect(await page.evaluate(() => field.value.get())).toBe(raw ? display.replace(/[^A-Za-z0-9]/g, '') : display);
      });
    }
    test(`raw=${raw} undo branch and silent API same-value boundary`, async ({ page }) => {
      const input = await mount(page, { value: '1', unmaskValue: raw });
      await selection(input, 1); await input.pressSequentially('2'); await input.press('ControlOrMeta+z');
      await input.pressSequentially('3'); await input.press('ControlOrMeta+Shift+z');
      await expect(input).toHaveValue('13:');
      await page.evaluate(() => field.value.set(field.value.get(), { silent: true }));
      const count = await page.evaluate(() => changes.length);
      await input.press('ControlOrMeta+z'); await expect(input).toHaveValue('13:');
      expect(await page.evaluate(() => changes.length)).toBe(count);
      await page.evaluate(() => field.value.reset({ silent: true }));
      await expect(input).toHaveValue('1');
      await input.press('ControlOrMeta+Shift+z'); await expect(input).toHaveValue('1');
    });
    test(`raw=${raw} veto keeps history and readonly disabled suppress real keys`, async ({ page }) => {
      const input = await mount(page, { value: '1', unmaskValue: raw });
      await selection(input, 1); await input.pressSequentially('2');
      await page.evaluate(() => { window.veto = field.events.on('beforeChange', event => event.cancel = true); });
      await selection(input, 0, 1); await input.pressSequentially('9');
      await expect(input).toHaveValue('12:'); expect(await caret(input)).toEqual([0, 1]);
      await page.evaluate(() => veto.off());
      await input.press('ControlOrMeta+z'); await expect(input).toHaveValue('1');
      await page.evaluate(() => field.setReadOnly(true));
      await input.pressSequentially('9'); await expect(input).toHaveValue('1');
      await page.evaluate(() => { field.setReadOnly(false); field.disable(); });
      await expect(input).toBeDisabled();
      await page.keyboard.press('9'); await expect(input).toHaveValue('1');
      await page.evaluate(() => field.enable()); await expect(input).toBeEnabled();
    });
    for (const beforeInput of [false, true]) test(`raw=${raw} fallback noncancelable beforeinput=${beforeInput} normalizes and synchronizes`, async ({ page }) => {
      const input = await mount(page, { value: '', unmaskValue: raw });
      await input.evaluate((el, beforeInput) => {
        if (beforeInput) el.dispatchEvent(new InputEvent('beforeinput', { bubbles: true, cancelable: false, inputType: 'insertText', data: '1234' }));
        el.value = '1234'; el.setSelectionRange(2, 2);
        el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: '1234' }));
      }, beforeInput);
      await expect(input).toHaveValue('12:34');
      expect(await page.evaluate(() => field.value.get())).toBe(raw ? '1234' : '12:34');
      expect(await page.evaluate(() => changes.length)).toBe(1);
    });
  }
  for (const phase of ['beforeChange', 'change', 'afterChange']) {
    test(`actual masked key teardown during ${phase} stops late callbacks`, async ({ page }) => {
      const input = await mount(page, { value: '1' });
      await page.evaluate(phase => {
        window.phases = []; window.retained = field._input;
        for (const name of ['beforeChange', 'change', 'afterChange']) field.events.on(name, () => { phases.push(name); if (name === phase) field.destroy(); });
      }, phase);
      await selection(input, 1); await input.pressSequentially('2');
      expect(await page.evaluate(() => phases)).toEqual(['beforeChange', 'change', 'afterChange'].slice(0, ['beforeChange', 'change', 'afterChange'].indexOf(phase) + 1));
      await expect(page.locator('#root')).toBeEmpty();
      const before = await page.evaluate(() => field.value.get());
      await page.evaluate(() => { retained.value = '9999'; retained.dispatchEvent(new InputEvent('input', { bubbles: true })); });
      expect(await page.evaluate(() => field.value.get())).toBe(before);
    });
  }
});

test.describe('Masked mixed-token safety', { tag: '@input-editing' }, () => {
  test.afterEach(async ({ page }) => { await page.evaluate(() => window.field?.destroy()); });
  for (const raw of [false, true]) test(`raw=${raw} reject deletion that would lose incompatible untouched suffix`, async ({ page }) => {
    const input = await mount(page, { mask: 'AA-0000', value: 'AB1234', unmaskValue: raw });
    await selection(input, 0, 2); await input.press('Delete');
    await expect(input).toHaveValue('AB-1234'); expect(await caret(input)).toEqual([0, 2]);
    expect(await page.evaluate(() => changes)).toEqual([]);
    await input.press('ControlOrMeta+a'); await input.press('Delete');
    await expect(input).toHaveValue('');
    expect(await page.evaluate(() => field.value.get())).toBe('');
  });
});


// This fixture repeats the reviewed isolation guards from input-isolated-clipboard.spec.js.
// Exact Chromium 149.0.7827.55 headless shell installs ClipboardNonBacked; browser
// permissions alone are NOT isolation. Fresh process per case; never OS clipboard.
const clipboardTest = test.extend({
  page: async ({ playwright, browserName, baseURL }, use) => {
    test.skip(browserName !== 'chromium', 'Only exact reviewed Chromium headless shell clipboard is isolated.');
    const browser = await playwright.chromium.launch({ channel: 'chromium-headless-shell', headless: true, args: ['--enable-automation'] });
    try {
      expect(browser.version()).toBe('149.0.7827.55');
      const cdp = await browser.newBrowserCDPSession();
      const { arguments: args } = await cdp.send('Browser.getBrowserCommandLine');
      expect(args[0]).toMatch(/(?:chrome-headless-shell|headless_shell)(?:\.exe)?$/i);
      expect(args).toContain('--headless'); await cdp.detach();
      const context = await browser.newContext({ baseURL });
      await use(await context.newPage()); await context.close();
    } finally { await browser.close(); }
  }
});
clipboardTest.describe('Masked isolated in-memory clipboard', { tag: ['@input-editing', '@input-clipboard'] }, () => {
  clipboardTest.afterEach(async ({ page }) => { await page.evaluate(() => window.field?.destroy()); });
  for (const raw of [false, true]) clipboardTest(`raw=${raw} selection paste cut undo redo`, async ({ page }) => {
    const input = await mount(page, { unmaskValue: raw });
    await page.evaluate(() => { const el = document.createElement('input'); el.id = 'source'; el.value = '98'; document.body.append(el); });
    const source = page.locator('#source');
    await source.focus(); await source.press('ControlOrMeta+a'); await source.press('ControlOrMeta+c');
    await selection(input, 0, 2); await input.press('ControlOrMeta+v');
    await expect(input).toHaveValue('98:34');
    await input.press('ControlOrMeta+z'); await expect(input).toHaveValue('12:34');
    await input.press('ControlOrMeta+Shift+z'); await expect(input).toHaveValue('98:34');
    await selection(input, 3, 5); await input.press('ControlOrMeta+x');
    await expect(input).toHaveValue('98:');
    await input.press('ControlOrMeta+z'); await expect(input).toHaveValue('98:34');
    expect(await caret(input)).toEqual([3, 5]);
    await input.press('ControlOrMeta+Shift+z'); await expect(input).toHaveValue('98:');
    await input.press('ControlOrMeta+v'); await expect(input).toHaveValue('98:34');
  });
});

test.describe('Masked literal deletion and synthetic composition', { tag: '@input-editing' }, () => {
  test.afterEach(async ({ page }) => { await page.evaluate(() => window.field?.destroy()); });
  for (const raw of [false, true]) {
    test(`raw=${raw} Delete moves through separator and end deletion is inert`, async ({ page }) => {
      const input = await mount(page, { unmaskValue: raw });
      await selection(input, 2); await input.press('Delete');
      await expect(input).toHaveValue('12:4');
      expect(await caret(input)).toEqual([2, 2]);
      await input.press('ControlOrMeta+A'); expect(await caret(input)).toEqual([0, 4]);
      await input.press('ArrowRight'); expect(await caret(input)).toEqual([4, 4]);
      const before = await page.evaluate(() => changes.length);
      await input.press('Delete'); await expect(input).toHaveValue('12:4');
      expect(await page.evaluate(() => changes.length)).toBe(before);
    });
    test(`raw=${raw} synthetic composition stays live and completion does not duplicate semantic events`, async ({ page }) => {
      const input = await mount(page, { value: '1', unmaskValue: raw });
      await selection(input, 1);
      await input.evaluate(el => {
        el.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
        el.value = '12'; el.setSelectionRange(2, 2);
        el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertCompositionText', data: '2', isComposing: true }));
      });
      // Synthetic dispatch tests lifecycle only, not native IME or OS integration.
      await expect(input).toHaveValue('12');
      expect(await page.evaluate(() => field.value.get())).toBe(raw ? '12' : '12:');
      expect(await page.evaluate(() => changes.length)).toBe(1);
      await input.evaluate(el => {
        el.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: '2' }));
        el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: '2' }));
      });
      await expect(input).toHaveValue('12:');
      expect(await page.evaluate(() => changes.length)).toBe(1);
      await input.press('ControlOrMeta+z'); await expect(input).toHaveValue('1');
    });
  }
});



test.describe('Masked capacity safety', { tag: '@input-editing' }, () => {
  test.afterEach(async ({ page }) => { await page.evaluate(() => window.field?.destroy()); });
  for (const raw of [false, true]) test(`raw=${raw} full mask insertion never discards untouched trailing token`, async ({ page }) => {
    const input = await mount(page, { unmaskValue: raw });
    await selection(input, 1); await input.pressSequentially('9');
    await expect(input).toHaveValue('12:34'); expect(await caret(input)).toEqual([1, 1]);
    expect(await page.evaluate(() => changes)).toEqual([]);
    await input.press('ControlOrMeta+a'); await input.pressSequentially('98765');
    await expect(input).toHaveValue('98:76');
    expect(await page.evaluate(() => field.value.get())).toBe(raw ? '9876' : '98:76');
  });
});

test.describe('Masked callback API boundaries', { tag: '@input-editing' }, () => {
  test.afterEach(async ({ page }) => { await page.evaluate(() => window.field?.destroy()); });
  for (const raw of [false, true]) for (const composing of [false, true]) {
    test(`raw=${raw} composing=${composing} beforeChange API load and explicit cancel preserve current DOM and history`, async ({ page }) => {
      const input = await mount(page, { value: '1', unmaskValue: raw });
      await page.evaluate(() => field.events.on('beforeChange', event => {
        if (event.origin !== 'user') return;
        field.value.set('98', { silent: true });
        event.cancel = true;
      }));
      await selection(input, 1);
      if (composing) {
        // Synthetic lifecycle dispatch, not native IME certification.
        await input.evaluate(el => {
          el.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
          el.value = '12'; el.setSelectionRange(2, 2);
          el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertCompositionText', data: '2', isComposing: true }));
          el.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: '2' }));
        });
      } else await input.pressSequentially('2');
      await expect(input).toHaveValue('98:');
      expect(await page.evaluate(() => field.value.get())).toBe(raw ? '98' : '98:');
      expect(await page.evaluate(() => changes)).toEqual([]);
      await input.press('ControlOrMeta+z'); await expect(input).toHaveValue('98:');
      await input.press('ControlOrMeta+Shift+z'); await expect(input).toHaveValue('98:');
    });
  }
});

test.describe('Masked interrupted synthetic composition', { tag: '@input-editing' }, () => {
  test.afterEach(async ({ page }) => { await page.evaluate(() => window.field?.destroy()); });
  for (const raw of [false, true]) {
    test(`raw=${raw} synthetic composing input without start snapshots last accepted value`, async ({ page }) => {
      const input = await mount(page, { value: '1', unmaskValue: raw });
      await selection(input, 1);
      await input.evaluate(el => {
        el.value = '12'; el.setSelectionRange(2, 2);
        el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertCompositionText', data: '2', isComposing: true }));
      });
      await expect(input).toHaveValue('12');
      expect(await page.evaluate(() => field.value.get())).toBe(raw ? '12' : '12:');
      await input.evaluate(el => el.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: '2' })));
      await expect(input).toHaveValue('12:');
      expect(await page.evaluate(() => changes.length)).toBe(1);
      await input.press('ControlOrMeta+z'); await expect(input).toHaveValue('1');
    });
    test(`raw=${raw} rejected synthetic composition restores original mixed-mask selection`, async ({ page }) => {
      const input = await mount(page, { mask: 'AA-0000', value: 'AB1234', unmaskValue: raw });
      await selection(input, 0, 2);
      await input.evaluate(el => {
        el.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
        el.value = 'X-1234'; el.setSelectionRange(1, 1);
        el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertCompositionText', data: 'X', isComposing: true }));
        el.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: 'X' }));
      });
      await expect(input).toHaveValue('AB-1234'); expect(await caret(input)).toEqual([0, 2]);
      expect(await page.evaluate(() => field.value.get())).toBe(raw ? 'AB1234' : 'AB-1234');
      expect(await page.evaluate(() => changes)).toEqual([]);
      await input.press('ControlOrMeta+z'); await expect(input).toHaveValue('AB-1234');
    });
  }
});
