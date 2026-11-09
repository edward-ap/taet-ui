import { expect, test } from './input-test-fixture.js';

test.describe('Text editor keyboard contract', { tag: '@input-editing' }, () => {
  test.afterEach(async ({ page }) => {
    await page.evaluate(() => window.editor?.destroy());
  });

  for (const kind of ['TextInput', 'TextArea']) {
    test(`${kind} preserves insertion position, selection replacement, deletion and refocus`, async ({ page }) => {
      await page.goto('/browser-tests/recipes.html');
      await page.evaluate(async kind => {
        const inputs = await import('/src/ui/inputs.js');
        window.editor = new inputs[kind]('#root', { value: 'abcd' });
        window.changes = [];
        editor.events.on('change', event => changes.push({
          value: event.newValue, origin: event.origin, userAction: event.userAction
        }));
        const outside = document.createElement('button');
        outside.id = 'outside';
        outside.textContent = 'Outside';
        document.querySelector('#root').append(outside);
      }, kind);
      const input = page.locator('#root input, #root textarea');
      const check = async (value, caret) => {
        await expect(input).toHaveValue(value);
        expect(await page.evaluate(() => editor.value.get())).toBe(value);
        expect(await input.evaluate(el => [el.selectionStart, el.selectionEnd])).toEqual([caret, caret]);
      };
      await input.focus();
      await input.press('ControlOrMeta+A');
      await input.press('ArrowLeft');
      await input.press('ArrowRight');
      await input.press('ArrowRight');
      await input.pressSequentially('XY');
      await check('abXYcd', 4);
      await input.press('Shift+ArrowLeft');
      await input.press('Shift+ArrowLeft');
      await input.pressSequentially('q');
      await check('abqcd', 3);
      await input.press('Backspace');
      await check('abcd', 2);
      await input.press('Delete');
      await check('abd', 2);
      const count = await page.evaluate(() => changes.length);
      await page.locator('#outside').click();
      await input.focus();
      await expect(input).toHaveValue('abd');
      expect(await page.evaluate(() => editor.value.get())).toBe('abd');
      expect(await page.evaluate(() => changes.length)).toBe(count);
      await input.press('ControlOrMeta+A');
      await input.press('ArrowRight');
      await input.pressSequentially('!');
      await check('abd!', 4);
      expect(await page.evaluate(() => changes)).toEqual(
        ['abXcd', 'abXYcd', 'abqcd', 'abcd', 'abd', 'abd!'].map(value => ({
          value, origin: 'user', userAction: true
        }))
      );
      // This is browser keyboard editing, not OS clipboard or native IME coverage.
    });
  }
});

// Fixture self-checks are intentionally outside the @input-editing product gate.
test.describe('pageerror fixture observes test and teardown', () => {
  test.use({ expectedPageErrors: ['intentional body error', 'intentional teardown error'] });
  test.afterEach(async ({ page }) => {
    await Promise.all([
      page.waitForEvent('pageerror'),
      page.evaluate(() => setTimeout(() => { throw new Error('intentional teardown error'); }, 0))
    ]);
  });
  test('matches expected errors exactly, including afterEach', async ({ page }) => {
    await page.goto('/browser-tests/recipes.html');
    await Promise.all([
      page.waitForEvent('pageerror'),
      page.evaluate(() => setTimeout(() => { throw new Error('intentional body error'); }, 0))
    ]);
  });
});
