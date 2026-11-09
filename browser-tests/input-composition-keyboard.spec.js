import { expect, test } from './input-test-fixture.js';
import { pressNativeTab } from './keyboard-helpers.js';

// Composition and legacy keyCode events are synthetic dispatch, not native IME QA.
// Recovery/default editing uses Playwright browser keyboard, not an OS IME.
test.describe('TextArea composition keyboard guards', { tag: '@input-editing' }, () => {
  test.beforeEach(async ({ page }) => { await page.goto('/browser-tests/recipes.html'); });
  test.afterEach(async ({ page }) => { await page.evaluate(() => window.field?.destroy()); });

  for (const flags of [{ isComposing: true }, { keyCode: 229 }]) {
    for (const key of ['Enter', 'Tab']) {
      test(`synthetic ${JSON.stringify(flags)} ${key} ignores commands and recovers`, async ({ page }) => {
        const result = await page.evaluate(async ({ flags, key }) => {
          const { TextArea } = await import('/src/ui/inputs.js');
          window.field = new TextArea('#root', { value: 'draft', acceptsReturn: false, acceptsTab: true });
          window.events = [];
          for (const name of ['enterKey', 'tabInsert', 'change']) field.events.on(name, () => events.push(name));
          const input = document.querySelector('#root textarea');
          input.focus();
          field.setSelection(5);
          input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
          const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...flags });
          input.dispatchEvent(event);
          return { prevented: event.defaultPrevented, value: field.value.get(), events: [...events] };
        }, { flags, key });
        // Preserve all four original regression assertions.
        expect(result).toEqual({ prevented: false, value: 'draft', events: [] });
        const input = page.locator('#root textarea');
        await expect(input).toHaveValue('draft');
        expect(await input.evaluate(el => [el.selectionStart, el.selectionEnd])).toEqual([5, 5]);
        await input.dispatchEvent('compositionend', { data: '' });
        await input.press(key);
        const value = key === 'Enter' ? 'draft' : 'draft\t';
        await expect(input).toHaveValue(value);
        expect(await page.evaluate(() => ({ value: field.value.get(), events }))).toEqual({
          value, events: key === 'Enter' ? ['enterKey'] : ['change', 'tabInsert']
        });
        await expect(input).toBeFocused();
      });
    }
  }

  for (const key of ['Enter', 'Tab']) {
    test(`already prevented ${key} does not invoke commands; next keyboard event recovers`, async ({ page }) => {
      await page.evaluate(async () => {
        const { TextArea } = await import('/src/ui/inputs.js');
        window.field = new TextArea('#root', { value: 'draft', acceptsReturn: false, acceptsTab: true });
        window.events = [];
        for (const name of ['enterKey', 'tabInsert', 'change']) field.events.on(name, () => events.push(name));
        field.setSelection(5);
        // A host capture listener owns this key before the control's bubble handler.
        document.querySelector('#root').addEventListener('keydown', event => event.preventDefault(),
          { capture: true, once: true });
      });
      const input = page.locator('#root textarea');
      await input.press(key);
      await expect(input).toHaveValue('draft');
      expect(await page.evaluate(() => ({ value: field.value.get(), events }))).toEqual({ value: 'draft', events: [] });
      await input.press(key);
      expect(await page.evaluate(() => ({ value: field.value.get(), events }))).toEqual({
        value: key === 'Enter' ? 'draft' : 'draft\t',
        events: key === 'Enter' ? ['enterKey'] : ['change', 'tabInsert']
      });
    });
  }

  test('default options pass synthetic composition through, then native Enter inserts and Tab moves focus', async ({ page }) => {
    const guarded = await page.evaluate(async () => {
      const { TextArea } = await import('/src/ui/inputs.js');
      window.field = new TextArea('#root', { value: 'draft' });
      window.events = [];
      for (const name of ['enterKey', 'tabInsert', 'change']) field.events.on(name, () => events.push(name));
      const input = document.querySelector('#root textarea');
      const next = document.createElement('button');
      next.id = 'next'; next.textContent = 'Next'; document.querySelector('#root').append(next);
      input.focus(); field.setSelection(5);
      input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
      const snapshots = [];
      for (const flags of [{ isComposing: true }, { keyCode: 229 }]) for (const key of ['Enter', 'Tab']) {
        const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...flags });
        input.dispatchEvent(event);
        snapshots.push({ prevented: event.defaultPrevented, value: field.value.get(), events: [...events] });
      }
      input.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: '' }));
      return snapshots;
    });
    expect(guarded).toEqual(Array.from({ length: 4 }, () => ({ prevented: false, value: 'draft', events: [] })));
    const input = page.locator('#root textarea');
    await input.press('Enter');
    await expect(input).toHaveValue('draft\n');
    expect(await page.evaluate(() => ({ value: field.value.get(), events }))).toEqual({ value: 'draft\n', events: ['change'] });
    await pressNativeTab(page);
    await expect(page.locator('#next')).toBeFocused();
    expect(await page.evaluate(() => ({ value: field.value.get(), events }))).toEqual({ value: 'draft\n', events: ['change'] });
  });

  for (const state of ['readonly', 'disabled']) {
    test(`${state}: synthetic composing keys are inert and rejected Tab writes emit no change`, async ({ page }) => {
      const result = await page.evaluate(async state => {
        const { TextArea } = await import('/src/ui/inputs.js');
        window.field = new TextArea('#root', { value: 'draft', acceptsReturn: false, acceptsTab: true });
        if (state === 'readonly') field.setReadOnly(true); else field.disable();
        window.events = [];
        for (const name of ['enterKey', 'tabInsert', 'change']) field.events.on(name, () => events.push(name));
        const input = document.querySelector('#root textarea');
        const guarded = [];
        for (const flags of [{ isComposing: true }, { keyCode: 229 }]) for (const key of ['Enter', 'Tab']) {
          const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...flags });
          input.dispatchEvent(event);
          guarded.push({ prevented: event.defaultPrevented, value: field.value.get(), events: [...events] });
        }
        // Synthetic dispatch reaches even disabled DOM nodes. Only assert the declared
        // rejection of user value writes, not native disabled keyboard delivery.
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
        return { guarded, value: field.value.get(), display: input.value, events: [...events] };
      }, state);
      expect(result).toEqual({
        guarded: Array.from({ length: 4 }, () => ({ prevented: false, value: 'draft', events: [] })),
        value: 'draft', display: 'draft', events: []
      });
      await page.evaluate(state => {
        if (state === 'readonly') field.setReadOnly(false); else field.enable();
        field.setSelection(5);
      }, state);
      await page.locator('#root textarea').press('Tab');
      await expect(page.locator('#root textarea')).toHaveValue('draft\t');
      expect(await page.evaluate(() => ({ value: field.value.get(), events }))).toEqual({ value: 'draft\t', events: ['change', 'tabInsert'] });
    });
  }
});
