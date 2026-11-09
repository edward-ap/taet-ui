import { expect, test } from './input-test-fixture.js';

// Real browser keyboard history, not synthetic InputEvent dispatch or clipboard.
// No clipboard APIs/shortcuts are used: browser permissions are not OS isolation.
test.describe('Native keyboard edit history', { tag: '@input-editing' }, () => {
  test.afterEach(async ({ page }) => {
    await page.evaluate(() => window.historyEditor?.destroy());
  });

  for (const [kind, label, initial] of [
    ['TextInput', 'TextInput', 'abcd'],
    ['TextArea', 'TextArea', 'abcd'],
    ['TextArea', 'TextArea multiline', 'ab\ncd'],
    ['NumberInput', 'NumberInput integer', '1234'],
    ['NumberInput', 'NumberInput fractional', '12.5']
  ]) {
    for (const operation of ['append', 'replace selection', 'delete selection']) {
      test(`${label} ${operation} undo/redo matches a bare native editor`, async ({ page }) => {
        const numeric = kind === 'NumberInput';
        const replacement = numeric ? '5' : 'X';
        const edited = operation === 'append' ? initial + replacement
          : operation === 'replace selection' ? replacement : '';
        await page.goto('/browser-tests/recipes.html');
        await page.evaluate(async ({ kind, initial, numeric }) => {
          const inputs = await import('/src/ui/inputs.js');
          window.historyEditor = new inputs[kind]('#root', {
            value: numeric ? Number(initial) : initial,
            ...(numeric ? { step: 'any' } : {})
          });
          window.historyChanges = [];
          for (const phase of ['beforeChange', 'change', 'afterChange']) {
            historyEditor.events.on(phase, event => historyChanges.push({
              phase, oldValue: event.oldValue, newValue: event.newValue,
              origin: event.origin, userAction: event.userAction,
              sourceMatches: event.source === historyEditor
            }));
          }
          const editor = document.querySelector('#root input, #root textarea');
          editor.id = 'history-editor';
          const bare = document.createElement(kind === 'TextArea' ? 'textarea' : 'input');
          bare.id = 'history-bare';
          if (numeric) { bare.type = 'number'; bare.step = 'any'; }
          bare.value = initial;
          document.querySelector('#root').append(bare);
          window.nativeHistoryEvents = { editor: [], bare: [] };
          for (const [name, element] of [['editor', editor], ['bare', bare]]) {
            element.addEventListener('input', event => nativeHistoryEvents[name].push({
              value: element.value, inputType: event.inputType, trusted: event.isTrusted
            }));
          }
        }, { kind, initial, numeric });

        const snapshots = {};
        for (const name of ['bare', 'editor']) {
          const input = page.locator(`#history-${name}`);
          snapshots[name] = [];
          const check = async value => {
            await expect(input).toHaveValue(value);
            snapshots[name].push(await input.evaluate(el => ({
              value: el.value, selectionStart: el.selectionStart, selectionEnd: el.selectionEnd,
              selectionDirection: el.selectionDirection
            })));
            if (name === 'editor') {
              expect(await page.evaluate(() => historyEditor.value.get())).toBe(
                numeric ? (value === '' ? null : Number(value)) : value
              );
            }
          };
          await input.focus();
          await input.press('ControlOrMeta+A');
          if (operation === 'append') await input.press('ArrowRight');
          if (operation === 'delete selection') await input.press('Backspace');
          else await input.pressSequentially(replacement);
          await check(edited);
          await input.press('ControlOrMeta+Z');
          await check(initial);
          await input.press('ControlOrMeta+Shift+Z');
          await check(edited);
        }
        expect(snapshots.editor, 'DOM text and restored selection must match native history').toEqual(snapshots.bare);
        const native = await page.evaluate(() => nativeHistoryEvents);
        expect(native.editor).toEqual(native.bare);
        expect(native.editor.map(event => event.value)).toEqual([edited, initial, edited]);
        expect(native.editor.every(event => event.trusted)).toBe(true);
        const toModel = value => numeric ? (value === '' ? null : Number(value)) : value;
        const transitions = [[initial, edited], [edited, initial], [initial, edited]];
        expect(await page.evaluate(() => historyChanges)).toEqual(transitions.flatMap(([oldValue, newValue]) =>
          ['beforeChange', 'change', 'afterChange'].map(phase => ({
            phase, oldValue: toModel(oldValue), newValue: toModel(newValue),
            origin: 'user', userAction: true, sourceMatches: true
          }))
        ));
      });
    }
  }
});
