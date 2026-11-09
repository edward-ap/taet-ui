import { expect, test } from './input-test-fixture.js';
import { pressNativeTab } from './keyboard-helpers.js';

const cases = [
  ['DateInput', '2026-09-06', '2026-10-17'],
  ['TimeInput', '12:34', '18:45'],
  ['DateTimeInput', '2026-09-06T12:34', '2026-10-17T18:45']
];
const display = value => value.replace('T', ' ');
async function setup(page, kind, value = '', options = {}) {
  await page.goto('/browser-tests/recipes.html');
  await page.evaluate(async ({ kind, value, options }) => {
    const ui = await import('/src/ui/inputs.js');
    window.field = new ui[kind]('#root', { value, ...options });
    const input = document.querySelector('#root input'); input.id = 'temporal';
    const bare = document.createElement('input'); bare.id = 'bare'; bare.type = 'text'; bare.value = input.value;
    document.body.append(bare);
    window.changes = [];
    for (const phase of ['beforeChange', 'change', 'afterChange']) field.events.on(phase, e => changes.push({
      phase, value: e.newValue, old: e.oldValue, origin: e.origin, user: e.userAction, source: e.source === field
    }));
  }, { kind, value, options });
  return page.locator('#temporal');
}
const snapshot = input => input.evaluate(el => ({ value: el.value, start: el.selectionStart, end: el.selectionEnd, direction: el.selectionDirection }));
async function select(input, start, end = start) {
  await input.focus(); await input.evaluate((el, range) => el.setSelectionRange(...range), [start, end]);
}

test.describe('Temporal native editing', { tag: '@input-editing' }, () => {
  test.afterEach(async ({ page }) => { await page.evaluate(() => window.field?.destroy()); });
  test('TimeInput sequential 12:34 remains editable native text', async ({ page }) => {
    const input = await setup(page, 'TimeInput');
    await input.pressSequentially('12:34');
    await expect(input).toHaveValue('12:34');
    expect(await page.evaluate(() => field.value.get())).toBe('12:34');
  });

  for (const [kind, canonical, replacement] of cases) {
    test(`${kind} each canonical keystroke retains native text and caret; blur presents model`, async ({ page }) => {
      const input = await setup(page, kind); const bare = page.locator('#bare');
      // T is intentional: canonical strings are accepted; editing must not rewrite it to space mid-keystroke.
      const expected = [];
      for (const key of canonical) { await bare.pressSequentially(key); expected.push(await snapshot(bare)); }
      for (const [i, key] of [...canonical].entries()) {
        await input.pressSequentially(key); expect(await snapshot(input)).toEqual(expected[i]);
      }
      expect(await page.evaluate(() => field.value.get())).toBe(canonical);
      const count = await page.evaluate(() => changes.length);
      await pressNativeTab(page); await expect(input).toHaveValue(display(canonical));
      expect(await page.evaluate(() => changes.length)).toBe(count);
      expect(await page.evaluate(() => changes.every(e => e.origin === 'user' && e.user && e.source))).toBe(true);
    });

    for (const operation of ['insert middle', 'delete middle', 'backspace middle', 'replace selection', 'replace all', 'delete all']) {
      test(`${kind} ${operation} and native undo/redo match bare text`, async ({ page }) => {
        const input = await setup(page, kind, canonical); const bare = page.locator('#bare');
        const results = {};
        for (const [name, target] of [['bare', bare], ['editor', input]]) {
          if (operation === 'replace all' || operation === 'delete all') { await target.focus(); await target.press('ControlOrMeta+A'); }
          else await select(target, operation === 'append' ? display(canonical).length : 1, operation === 'replace selection' ? 2 : operation === 'append' ? display(canonical).length : 1);
          if (operation === 'delete middle') await target.press('Delete');
          else if (operation === 'backspace middle' || operation === 'delete all') await target.press('Backspace');
          else await target.pressSequentially(operation === 'replace all' ? display(replacement) : '1');
          results[name] = [await snapshot(target)];
          await target.press('ControlOrMeta+Z'); results[name].push(await snapshot(target));
          await target.press('ControlOrMeta+Shift+Z'); results[name].push(await snapshot(target));
        }
        expect(results.editor).toEqual(results.bare);
      });
    }

    test(`${kind} same-length calendar and clock segment replacements remain canonical`, async ({ page }) => {
      const input = await setup(page, kind, canonical);
      const segments = kind === 'TimeInput' ? [[0, 2, '18'], [3, 5, '45']]
        : [[0, 4, '2027'], [5, 7, '10'], [8, 10, '17'], ...(kind === 'DateTimeInput' ? [[11, 13, '18'], [14, 16, '45']] : [])];
      for (const [start, end, text] of segments) {
        await page.evaluate(value => field.value.set(value, { silent: true }), canonical);
        await select(input, start, end); await input.pressSequentially(text);
        const expected = display(canonical).slice(0, start) + text + display(canonical).slice(end);
        await expect(input).toHaveValue(expected);
        expect(await input.evaluate(el => [el.selectionStart, el.selectionEnd])).toEqual([start + text.length, start + text.length]);
        expect(await page.evaluate(() => field.value.get())).toBe(kind === 'DateTimeInput' ? expected.replace(' ', 'T') : expected);
      }
    });
    test(`${kind} separator replacement and restoration retain selection`, async ({ page }) => {
      const input = await setup(page, kind, canonical); const bare = page.locator('#bare');
      const position = kind === 'TimeInput' ? 2 : 4;
      const results = {};
      for (const [name, target] of [['bare', bare], ['editor', input]]) {
        await select(target, position, position + 1); await target.pressSequentially('/');
        results[name] = [await snapshot(target)];
        await target.press('Backspace'); await target.pressSequentially(kind === 'TimeInput' ? ':' : '-');
        results[name].push(await snapshot(target));
      }
      expect(results.editor).toEqual(results.bare);
      expect(await page.evaluate(() => field.value.get())).toBe(canonical);
    });
    test(`${kind} API, silent load, clear and reset replace partial text`, async ({ page }) => {
      const input = await setup(page, kind, canonical);
      await input.press('ControlOrMeta+A'); await input.pressSequentially('2');
      await page.evaluate(value => { changes.length = 0; field.value.set(value, { silent: true }); }, replacement);
      await expect(input).toHaveValue(display(replacement));
      expect(await page.evaluate(() => changes)).toEqual([]);
      await page.evaluate(() => field.value.reset({ silent: true })); await expect(input).toHaveValue(display(canonical));
      expect(await page.evaluate(() => field.isDirty())).toBe(false);
      await page.evaluate(() => field.value.set(null)); await expect(input).toHaveValue('');
      expect(await page.evaluate(() => changes.map(e => e.phase))).toEqual(['beforeChange', 'change', 'afterChange']);
    });

    test(`${kind} veto restores model instead of retaining rejected text`, async ({ page }) => {
      const input = await setup(page, kind, canonical);
      await page.evaluate(() => field.events.on('beforeChange', e => { e.cancel = true; }));
      await input.press('ControlOrMeta+A'); await input.pressSequentially('3');
      await expect(input).toHaveValue(display(canonical));
      expect(await page.evaluate(() => field.value.get())).toBe(canonical);
      expect(await page.evaluate(() => changes.map(e => e.phase))).toEqual(['beforeChange']);
    });

    test(`${kind} beforeChange silent API write plus veto keeps surviving model and DOM coherent`, async ({ page }) => {
      const input = await setup(page, kind, canonical);
      await page.evaluate(replacement => field.events.on('beforeChange', e => {
        field.value.set(replacement, { silent: true }); e.cancel = true;
      }), replacement);
      await input.press('ControlOrMeta+A'); await input.pressSequentially('3');
      await expect(input).toHaveValue(display(replacement));
      expect(await page.evaluate(() => field.value.get())).toBe(replacement);
      expect(await page.evaluate(() => changes.map(e => e.phase))).toEqual(['beforeChange']);
    });
    for (const phase of ['beforeChange', 'change', 'afterChange']) {
      test(`${kind} ${phase} teardown stops later phases`, async ({ page }) => {
        const input = await setup(page, kind, canonical);
        await page.evaluate(phase => field.events.on(phase, () => field.destroy()), phase);
        await input.press('ControlOrMeta+A'); await input.pressSequentially('3');
        await expect(page.locator('#temporal')).toHaveCount(0);
        expect(await page.evaluate(() => changes.map(e => e.phase))).toEqual(['beforeChange', 'change', 'afterChange'].slice(0, ['beforeChange', 'change', 'afterChange'].indexOf(phase) + 1));
      });
      test(`${kind} ${phase} nested write preserves existing live callback semantics`, async ({ page }) => {
        const input = await setup(page, kind, canonical);
        await page.evaluate(({ phase, replacement }) => field.events.on(phase, () => field.value.set(replacement, { silent: true })), { phase, replacement });
        await input.press('ControlOrMeta+A'); await input.pressSequentially('3');
        const expected = phase === 'beforeChange' ? (kind === 'TimeInput' ? '03:00' : '3') : replacement;
        await expect(input).toHaveValue(display(expected));
        expect(await page.evaluate(() => field.value.get())).toBe(expected);
      });
    }

    test(`${kind} same-value API and refresh reconcile native display without semantic events`, async ({ page }) => {
      const input = await setup(page, kind, canonical);
      await input.press('ControlOrMeta+A'); await input.pressSequentially(canonical);
      await page.evaluate(() => { changes.length = 0; field.value.set(field.value.get(), { silent: true }); });
      await expect(input).toHaveValue(display(canonical));
      await page.evaluate(() => field.refresh());
      await expect(input).toHaveValue(display(canonical));
      expect(await page.evaluate(() => changes)).toEqual([]);
    });

    for (const state of ['readOnly', 'disabled']) test(`${kind} ${state} blocks real keyboard but allows API`, async ({ page }) => {
      const input = await setup(page, kind, canonical);
      await input.focus();
      await page.evaluate(state => state === 'readOnly' ? field.setReadOnly(true) : field.disable(), state);
      await page.keyboard.press('ControlOrMeta+A'); await page.keyboard.type('3');
      expect(await page.evaluate(() => field.value.get())).toBe(canonical);
      expect(await page.evaluate(() => changes)).toEqual([]);
      await page.evaluate(value => field.value.set(value, { silent: true }), replacement);
      await expect(input).toHaveValue(display(replacement));
    });
    test(`${kind} synthetic composition preserves provisional DOM then reconciles final input`, async ({ page }) => {
      const input = await setup(page, kind);
      // Synthetic lifecycle probe only; not a real OS IME certification.
      await input.evaluate((el, text) => {
        el.focus(); el.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
        el.value = text; el.setSelectionRange(text.length, text.length);
        el.dispatchEvent(new InputEvent('input', { bubbles: true, data: text, inputType: 'insertCompositionText', isComposing: true }));
      }, display(canonical));
      await expect(input).toHaveValue(display(canonical));
      await input.evaluate(el => {
        el.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: el.value }));
        el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: el.value }));
      });
      expect(await page.evaluate(() => field.value.get())).toBe(canonical);
    });
  }

  for (const [hourMode, text, value, shown] of [
    ['0-23', '12:34', '12:34', '12:34'], ['1-24', '24:34', '00:34', '24:34'],
    ['12', '01:34 PM', '13:34', '01:34 PM']
  ]) test(`TimeInput ${hourMode} retains partials and normalizes on blur`, async ({ page }) => {
    const input = await setup(page, 'TimeInput', '', { hourMode });
    let prefix = '';
    for (const key of text) { prefix += key; await input.pressSequentially(key); await expect(input).toHaveValue(prefix); }
    expect(await page.evaluate(() => field.value.get())).toBe(value);
    await pressNativeTab(page); await expect(input).toHaveValue(shown);
  });

  for (const hourMode of ['0-23', '1-24', '12']) test(`DateTimeInput ${hourMode} text stays 24-hour independent of picker mode`, async ({ page }) => {
    const input = await setup(page, 'DateTimeInput', '', { hourMode });
    await input.pressSequentially('2026-09-06T18:45');
    await expect(input).toHaveValue('2026-09-06T18:45');
    expect(await page.evaluate(() => field.value.get())).toBe('2026-09-06T18:45');
    await pressNativeTab(page); await expect(input).toHaveValue('2026-09-06 18:45');
  });
  for (const [kind, canonical] of [['DateInput', '2026-11-09'], ['DateTimeInput', '2026-11-09T12:34']]) {
    for (const composition of [false, true]) test(`${kind} synthetic ${composition ? 'composition' : 'missing-beforeinput'} insertion restores untouched suffix before events`, async ({ page }) => {
      const input = await setup(page, kind, canonical);
      const position = display(canonical).length - 1;
      await select(input, position);
      await input.evaluate((el, { position, composition }) => {
        // Isolated synthetic fallback/lifecycle probe, not an OS IME or clipboard claim.
        el.dispatchEvent(new Event('select', { bubbles: true }));
        if (composition) el.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
        el.value = el.value.slice(0, position) + '1' + el.value.slice(position);
        el.setSelectionRange(position + 1, position + 1);
        el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: composition ? 'insertCompositionText' : 'insertText', data: '1', isComposing: composition }));
      }, { position, composition });
      await expect(input).toHaveValue(display(canonical));
      expect(await input.evaluate(el => [el.selectionStart, el.selectionEnd])).toEqual([position, position]);
      expect(await page.evaluate(() => ({ value: field.value.get(), changes }))).toEqual({ value: canonical, changes: [] });
      if (composition) await input.evaluate(el => el.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: '1' })));
      await select(input, position, position + 1); await input.pressSequentially('1');
      expect(await page.evaluate(() => field.value.get())).toBe(canonical.slice(0, -1) + '1');
    });

    test(`${kind} explicit API prefix normalization remains unchanged`, async ({ page }) => {
      const input = await setup(page, kind, canonical);
      const incoming = canonical.slice(0, -1) + '1' + canonical.slice(-1);
      await page.evaluate(value => field.value.set(value, { silent: true }), incoming);
      const expected = incoming.slice(0, canonical.length);
      await expect(input).toHaveValue(display(expected));
      expect(await page.evaluate(() => field.value.get())).toBe(expected);
      expect(await page.evaluate(() => changes)).toEqual([]);
    });
    test(`${kind} rejects insertion that would truncate untouched final digit`, async ({ page }) => {
      const input = await setup(page, kind, canonical);
      const position = display(canonical).length - 1;
      await select(input, position); await input.pressSequentially('1');
      await expect(input).toHaveValue(display(canonical));
      expect(await input.evaluate(el => [el.selectionStart, el.selectionEnd])).toEqual([position, position]);
      expect(await page.evaluate(() => field.value.get())).toBe(canonical);
      expect(await page.evaluate(() => changes)).toEqual([]);
      // A selected final digit can still be replaced, with no unrelated suffix lost.
      await select(input, position, position + 1); await input.pressSequentially('1');
      const replaced = canonical.slice(0, -1) + '1';
      await expect(input).toHaveValue(display(replaced));
      expect(await page.evaluate(() => field.value.get())).toBe(replaced);
      await input.press('ControlOrMeta+Z');
      await expect(input).toHaveValue(display(canonical));
      expect(await page.evaluate(() => field.value.get())).toBe(canonical);
      await input.press('ControlOrMeta+Shift+Z');
      await expect(input).toHaveValue(display(replaced));
      expect(await page.evaluate(() => field.value.get())).toBe(replaced);
    });
  }
  test('TimeInput short hour stays live while reads do not rewrite text; explicit same-value API does', async ({ page }) => {
    const input = await setup(page, 'TimeInput');
    await input.pressSequentially('1'); await expect(input).toHaveValue('1');
    expect(await page.evaluate(() => ({ value: field.value.get(), valid: field.validate().ok }))).toEqual({value:'01:00',valid:true});
    await expect(input).toHaveValue('1');
    expect(await page.evaluate(() => changes.map(e => [e.phase, e.value]))).toEqual(['beforeChange','change','afterChange'].map(phase => [phase,'01:00']));
    await page.evaluate(() => field.value.set('01:00', { silent: true }));
    await expect(input).toHaveValue('01:00');
    expect(await page.evaluate(() => changes.length)).toBe(3);
  });
  test('DateInput keeps arbitrary locale text; no localized parser or range validator is promised', async ({ page }) => {
    const input = await setup(page, 'DateInput', '', { min: '2026-01-01', max: '2026-12-31' });
    await input.pressSequentially('06.09.2026');
    expect(await page.evaluate(() => field.value.get())).toBe('06.09.2026');
    await pressNativeTab(page); await expect(input).toHaveValue('06.09.2026');
  });
});
