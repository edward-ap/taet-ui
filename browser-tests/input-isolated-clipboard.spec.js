import { expect, test as guardedTest } from './input-test-fixture.js';

// Reviewed against the EXACT installed Chromium tag, not inferred from permissions:
// https://raw.githubusercontent.com/chromium/chromium/149.0.7827.55/headless/lib/browser/headless_browser_main_parts.cc
// https://raw.githubusercontent.com/chromium/chromium/149.0.7827.55/components/headless/clipboard/headless_clipboard.cc
// https://raw.githubusercontent.com/chromium/chromium/149.0.7827.55/ui/base/clipboard/clipboard_non_backed.h
// Shell installs HeadlessClipboard (ClipboardNonBacked) before its main loop.
// It never synchronizes with Windows/macOS clipboard. Re-review on browser upgrade.
// A fresh shell PROCESS per case also avoids clipboard sharing across contexts.
const test = guardedTest.extend({
  page: async ({ playwright, browserName, baseURL }, use) => {
    test.skip(browserName !== 'chromium', 'Only Chromium headless shell has a reviewed in-memory clipboard backend; no OS clipboard permission.');
    const browser = await playwright.chromium.launch({
      channel: 'chromium-headless-shell', headless: true, args: ['--enable-automation']
    });
    try {
      expect(browser.version(), 'Review exact-tag clipboard isolation before updating this version').toBe('149.0.7827.55');
      const cdp = await browser.newBrowserCDPSession();
      const { arguments: args } = await cdp.send('Browser.getBrowserCommandLine');
      expect(args[0], 'Never run these gestures in a regular or user browser').toMatch(/(?:chrome-headless-shell|headless_shell)(?:\.exe)?$/i);
      expect(args).toContain('--headless');
      await cdp.detach();
      const context = await browser.newContext({ baseURL });
      const page = await context.newPage();
      await use(page);
      await context.close();
    } finally {
      await browser.close();
    }
  }
});

test.describe('Isolated headless clipboard keyboard integration', { tag: '@input-clipboard' }, () => {
  test.afterEach(async ({ page }) => {
    await page.evaluate(() => window.clipboardEditor?.destroy());
  });
  for (const [kind, decimalPaste] of [['TextInput', false], ['TextArea', false], ['NumberInput', false], ['NumberInput', true]]) {
    test(`${kind}${decimalPaste ? ' fractional' : ''} copies, pastes, cuts and restores test text like a bare editor`, async ({ page }) => {
      const numeric = kind === 'NumberInput';
      const initial = numeric ? (decimalPaste ? '12.5' : '12') : kind === 'TextArea' ? 'ab\ncd' : 'abcd';
      const pasted = decimalPaste ? '1.05' : initial + initial;
      await page.goto('/browser-tests/recipes.html');
      await page.evaluate(async ({ kind, initial, numeric }) => {
        const inputs = await import('/src/ui/inputs.js');
        window.clipboardEditor = new inputs[kind]('#root', {
          value: numeric ? Number(initial) : initial, ...(numeric ? { step: 'any' } : {})
        });
        const editor = document.querySelector('#root input, #root textarea');
        editor.id = 'clipboard-editor';
        const bare = document.createElement(kind === 'TextArea' ? 'textarea' : 'input');
        bare.id = 'clipboard-bare';
        if (numeric) { bare.type = 'number'; bare.step = 'any'; }
        bare.value = initial;
        const source = document.createElement('input');
        source.id = 'clipboard-source';
        source.value = '1.05';
        window.sourceCopyEvents = [];
        source.addEventListener('copy', event => sourceCopyEvents.push({ type: event.type, trusted: event.isTrusted }));
        document.querySelector('#root').append(source);
        document.querySelector('#root').append(bare);
        window.clipboardChanges = [];
        for (const phase of ['beforeChange', 'change', 'afterChange']) {
          clipboardEditor.events.on(phase, event => clipboardChanges.push({
            phase, oldValue: event.oldValue, newValue: event.newValue,
            origin: event.origin, userAction: event.userAction,
            sourceMatches: event.source === clipboardEditor
          }));
        }
        window.clipboardEvents = { bare: [], editor: [] };
        window.clipboardInputs = { bare: [], editor: [] };
        for (const [name, element] of [['bare', bare], ['editor', editor]]) {
          for (const type of ['copy', 'cut', 'paste']) {
            // Do not inspect clipboardData: only our rendered test text is observed.
            element.addEventListener(type, event => clipboardEvents[name].push({ type, trusted: event.isTrusted }));
          }
          element.addEventListener('input', event => clipboardInputs[name].push({
            value: element.value, inputType: event.inputType, trusted: event.isTrusted
          }));
        }
      }, { kind, initial, numeric });
      const snapshots = {};
      for (const name of ['bare', 'editor']) {
        const input = page.locator(`#clipboard-${name}`);
        snapshots[name] = [];
        const check = async value => {
          await expect(input).toHaveValue(value);
          snapshots[name].push(await input.evaluate(el => ({
            value: el.value, start: el.selectionStart, end: el.selectionEnd, direction: el.selectionDirection
          })));
          if (name === 'editor') {
            expect(await page.evaluate(() => clipboardEditor.value.get())).toBe(numeric ? (value === '' ? null : Number(value)) : value);
          }
        };
        if (decimalPaste) {
          const source = page.locator('#clipboard-source');
          await source.focus();
          await source.press('ControlOrMeta+A');
          await source.press('ControlOrMeta+C');
        }
        await input.focus();
        await input.press('ControlOrMeta+A');
        // First clipboard operation always overwrites only the isolated in-memory
        // clipboard with this case's known test text. Never paste preexisting data.
        if (!decimalPaste) await input.press('ControlOrMeta+C');
        await check(initial);
        if (name === 'editor') expect(await page.evaluate(() => clipboardChanges)).toEqual([]);
        if (!decimalPaste) await input.press('ArrowRight');
        await input.press('ControlOrMeta+V');
        await check(pasted);
        await input.press('ControlOrMeta+A');
        await input.press('ControlOrMeta+X');
        await check('');
        await input.press('ControlOrMeta+V');
        await check(pasted);
      }
      expect(snapshots.editor).toEqual(snapshots.bare);
      expect(await page.evaluate(() => sourceCopyEvents)).toEqual(decimalPaste
        ? [{ type: 'copy', trusted: true }, { type: 'copy', trusted: true }] : []);
      const { events, inputs } = await page.evaluate(() => ({ events: clipboardEvents, inputs: clipboardInputs }));
      expect(events.editor).toEqual(events.bare);
      expect(events.editor).toEqual((decimalPaste ? ['paste', 'cut', 'paste'] : ['copy', 'paste', 'cut', 'paste']).map(type => ({ type, trusted: true })));
      expect(inputs.editor).toEqual(inputs.bare);
      expect(inputs.editor).toEqual([
        { value: pasted, inputType: 'insertFromPaste', trusted: true },
        { value: '', inputType: 'deleteByCut', trusted: true },
        { value: pasted, inputType: 'insertFromPaste', trusted: true }
      ]);
      const model = value => numeric ? (value === '' ? null : Number(value)) : value;
      expect(await page.evaluate(() => clipboardChanges)).toEqual(
        [[initial, pasted], [pasted, ''], ['', pasted]].flatMap(([oldValue, newValue]) =>
          ['beforeChange', 'change', 'afterChange'].map(phase => ({
            phase, oldValue: model(oldValue), newValue: model(newValue),
            origin: 'user', userAction: true, sourceMatches: true
          }))
        )
      );
    });
  }
});
