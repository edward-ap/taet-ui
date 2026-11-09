import { expect, test } from './input-test-fixture.js';
import { pressNativeTab } from './keyboard-helpers.js';

async function mount(page, options = {}) {
  await page.goto('/browser-tests/recipes.html');
  await page.evaluate(async options => {
    const { NumberInput } = await import('/src/ui/inputs.js');
    window.number = new NumberInput('#root', { value: 20, updateMode: 'commit', ...options });
    window.events = [];
    for (const name of ['beforeChange', 'change', 'afterChange', 'dirtyChange']) {
      number.events.on(name, event => events.push({ name, old: event.oldValue, value: event.newValue,
        origin: event.origin, userAction: event.userAction }));
    }
    const outside = document.createElement('button');
    outside.id = 'outside'; outside.textContent = 'Outside';
    document.querySelector('#root').append(outside);
  }, options);
  const input = page.locator('#root input');
  await input.focus();
  await input.press('ControlOrMeta+A');
  return input;
}
const snapshot = page => page.evaluate(() => ({ value: number.value.get(), dirty: number.isDirty(),
  pending: number.hasPendingInput(), events }));
const cycle = (old, value, dirty = true) => [
  ...['beforeChange', 'change', 'afterChange'].map(name => ({ name, old, value, origin: 'user', userAction: true })),
  ...(dirty ? [{ name: 'dirtyChange', old: false, value: true, origin: 'user', userAction: true }] : [])
];

test.describe('NumberInput opt-in commit mode', { tag: '@input-editing' }, () => {
  test.afterEach(async ({ page }) => { await page.evaluate(() => window.number?.destroy()); });

  for (const key of ['Enter', 'Tab', 'blur', 'API']) {
    test(`min 10 sequential 1 then 12 commits once via ${key}`, async ({ page }) => {
      const input = await mount(page, { min: 10 });
      await input.pressSequentially('1');
      await expect(input).toHaveValue('1');
      expect(await snapshot(page)).toEqual({ value: 20, dirty: false, pending: true, events: [] });
      await input.pressSequentially('2');
      await expect(input).toHaveValue('12');
      expect(await snapshot(page)).toEqual({ value: 20, dirty: false, pending: true, events: [] });
      if (key === 'API') expect(await page.evaluate(() => number.commitInput({ origin: 'user', userAction: true })))
        .toEqual({ ok: true, changed: true, status: 'committed', value: 12 });
      else if (key === 'Tab') await pressNativeTab(page);
      else if (key === 'blur') await page.locator('#outside').click();
      else await input.press(key);
      await expect(input).toHaveValue('12');
      expect(await snapshot(page)).toEqual({ value: 12, dirty: true, pending: false, events: cycle(20, 12) });
      await page.locator('#outside').click();
      await input.focus();
      expect((await snapshot(page)).events).toEqual(cycle(20, 12));
    });
  }

  for (const [options, text, value] of [
    [{ min: 10 }, '1', 10], [{ max: 25 }, '123', 25], [{}, '-1.05', -1.05],
    [{ precision: 2 }, '1.005', 1], [{ isInteger: true }, '-12.75', -12],
    [{ max: 25, clamp: false }, '123', 123]
  ]) {
    test(`normalizes only at commit ${JSON.stringify(options)} ${text}`, async ({ page }) => {
      const input = await mount(page, options);
      await input.pressSequentially(text);
      await expect(input).toHaveValue(text);
      expect(await snapshot(page)).toEqual({ value: 20, dirty: false, pending: true, events: [] });
      await input.press('Enter');
      await expect(input).toHaveValue(String(value));
      expect(await snapshot(page)).toEqual({ value, dirty: true, pending: false, events: cycle(20, value) });
    });
  }

  test('equal numeric prefix normalizes without duplicate semantic events', async ({ page }) => {
    const input = await mount(page, { value: 1 });
    await input.pressSequentially('1.0');
    await expect(input).toHaveValue('1.0');
    expect(await snapshot(page)).toEqual({ value: 1, dirty: false, pending: true, events: [] });
    expect(await page.evaluate(() => number.commitInput())).toEqual({ ok: true, changed: false, status: 'unchanged', value: 1 });
    await expect(input).toHaveValue('1');
    await input.press('Enter'); await page.locator('#outside').click();
    expect(await snapshot(page)).toEqual({ value: 1, dirty: false, pending: false, events: [] });
  });

  test('native empty is null but a typed minus is invalid and recoverable', async ({ page }) => {
    const input = await mount(page);
    await input.press('Delete');
    expect(await input.evaluate(el => el.validity.badInput)).toBe(false);
    await input.press('Enter');
    expect((await snapshot(page)).value).toBeNull();
    await page.evaluate(() => { number.value.set(20, { silent: true }); number.setCleanValue(); events.length = 0; });
    await input.press('ControlOrMeta+A'); await input.pressSequentially('-');
    expect(await input.evaluate(el => el.validity.badInput)).toBe(true);
    expect(await page.evaluate(() => number.commitInput())).toMatchObject({ ok: false, changed: false, status: 'invalid' });
    expect(await snapshot(page)).toEqual({ value: 20, dirty: false, pending: true, events: [] });
    await input.pressSequentially('5'); await input.press('Enter');
    await expect(input).toHaveValue('-5');
    expect((await snapshot(page)).events).toEqual(cycle(20, -5));
  });

  for (const cancellation of ['Escape', 'API']) test(`${cancellation} cancels draft without model or dirty changes`, async ({ page }) => {
    const input = await mount(page);
    await input.pressSequentially('12');
    if (cancellation === 'Escape') await input.press('Escape');
    else expect(await page.evaluate(() => number.cancelInput())).toBe(true);
    await expect(input).toHaveValue('20');
    await page.locator('#outside').click();
    expect(await snapshot(page)).toEqual({ value: 20, dirty: false, pending: false, events: [] });
  });

  test('validation sees candidate without committing; veto retains recoverable draft', async ({ page }) => {
    const input = await mount(page);
    await page.evaluate(() => {
      window.validated = [];
      number.setValidators([value => { validated.push(value); return value >= 10 || 'At least ten'; }]);
    });
    await input.pressSequentially('1');
    expect(await page.evaluate(() => number.validate().ok)).toBe(false);
    expect(await page.evaluate(() => validated)).toEqual([1]);
    expect(await snapshot(page)).toEqual({ value: 20, dirty: false, pending: true, events: [] });
    await input.pressSequentially('2');
    expect(await page.evaluate(() => number.validate().ok)).toBe(true);
    await page.evaluate(() => number.events.on('beforeChange', event => { event.cancel = true; }));
    expect(await page.evaluate(() => number.commitInput({ origin: 'user', userAction: true })))
      .toMatchObject({ ok: false, changed: false, status: 'vetoed', value: 20 });
    await expect(input).toHaveValue('12');
    expect(await snapshot(page)).toEqual({ value: 20, dirty: false, pending: true, events: cycle(20, 12).slice(0, 1) });
    await input.press('Escape'); await expect(input).toHaveValue('20');
  });

  for (const operation of ['same', 'silent', 'reset', 'clear']) test(`API ${operation} replaces a focused draft`, async ({ page }) => {
    const input = await mount(page);
    await input.pressSequentially('12');
    await page.evaluate(operation => {
      if (operation === 'same') number.value.set(20);
      if (operation === 'silent') number.value.set(7, { silent: true });
      if (operation === 'reset') number.value.reset();
      if (operation === 'clear') number.value.clear({ silent: true });
    }, operation);
    const value = operation === 'silent' ? 7 : operation === 'clear' ? null : 20;
    await expect(input).toHaveValue(value === null ? '' : String(value));
    await page.locator('#outside').click(); await input.focus();
    expect(await snapshot(page)).toEqual({ value, dirty: value !== 20, pending: false, events: [] });
  });

  for (const state of ['readonly', 'disabled']) test(`${state} blocks commit and preserves pending input until enabled`, async ({ page }) => {
    const input = await mount(page);
    await input.pressSequentially('12');
    await page.evaluate(state => state === 'readonly' ? number.setReadOnly(true) : number.disable(), state);
    expect(await page.evaluate(() => number.commitInput({ origin: 'user', userAction: true })))
      .toMatchObject({ ok: false, changed: false, status: state });
    await expect(input).toHaveValue('12');
    expect(await snapshot(page)).toEqual({ value: 20, dirty: false, pending: true, events: [] });
    await page.evaluate(state => state === 'readonly' ? number.setReadOnly(false) : number.enable(), state);
    await input.focus(); await input.press('Enter');
    expect((await snapshot(page)).events).toEqual(cycle(20, 12));
  });

  test('refresh retains draft and spin combines draft plus delta into one change', async ({ page }) => {
    const input = await mount(page, { step: 0.5 });
    await input.pressSequentially('12.5');
    await page.evaluate(() => number.refresh());
    await expect(input).toHaveValue('12.5');
    await input.press('ArrowUp');
    await expect(input).toHaveValue('13');
    expect(await snapshot(page)).toEqual({ value: 13, dirty: true, pending: false, events: cycle(20, 13) });
  });

  test('nested silent API change wins over committed draft', async ({ page }) => {
    const input = await mount(page);
    await page.evaluate(() => number.events.on('change', () => number.value.set(7, { silent: true })));
    await input.pressSequentially('12'); await input.press('Enter');
    await expect(input).toHaveValue('7');
    expect((await snapshot(page)).value).toBe(7);
    expect((await snapshot(page)).pending).toBe(false);
    await page.locator('#outside').click();
    expect((await snapshot(page)).events.filter(e => e.name === 'change')).toHaveLength(1);
  });

  test('draftChange exposes native text and pending transitions without changing model events', async ({ page }) => {
    const input = await mount(page, { min: 10 });
    await page.evaluate(() => {
      window.drafts = [];
      number.events.on('draftChange', ({ text, badInput, pending, origin, userAction }) =>
        drafts.push({ text, badInput, pending, origin, userAction }));
    });
    await input.pressSequentially('12');
    const userDraft = (text, pending = true) => ({ text, badInput: false, pending, origin: 'user', userAction: true });
    expect(await page.evaluate(() => drafts)).toEqual([userDraft('1'), userDraft('12')]);
    expect((await snapshot(page)).events).toEqual([]);
    await input.press('Enter');
    expect(await page.evaluate(() => drafts)).toEqual([userDraft('1'), userDraft('12'), userDraft('12', false)]);
    await input.press('ControlOrMeta+A'); await input.pressSequentially('14');
    const count = await page.evaluate(() => drafts.length);
    await page.evaluate(() => number.value.set(20, { silent: true }));
    expect(await page.evaluate(() => drafts.length)).toBe(count);
    expect((await snapshot(page)).pending).toBe(false);
  });

  test('draftChange callback API replacement supersedes the typed draft', async ({ page }) => {
    const input = await mount(page);
    await page.evaluate(() => number.events.on('draftChange', event => {
      if (event.pending) number.value.set(7, { silent: true });
    }));
    await input.pressSequentially('1');
    await expect(input).toHaveValue('7');
    expect(await snapshot(page)).toEqual({ value: 7, dirty: true, pending: false, events: [] });
    await input.press('Enter');
    expect((await snapshot(page)).events).toEqual([]);
  });

  test('silent commit synchronizes value and dirty without semantic or draft notifications', async ({ page }) => {
    const input = await mount(page);
    await input.pressSequentially('12');
    await page.evaluate(() => { window.drafts = []; number.events.on('draftChange', e => drafts.push(e.pending)); });
    expect(await page.evaluate(() => number.commitInput({ silent: true, origin: 'import' })))
      .toEqual({ ok: true, changed: true, status: 'committed', value: 12 });
    await expect(input).toHaveValue('12');
    expect(await snapshot(page)).toEqual({ value: 12, dirty: true, pending: false, events: [] });
    expect(await page.evaluate(() => drafts)).toEqual([]);
    await input.press('Enter'); expect((await snapshot(page)).events).toEqual([]);
  });

  test('beforeChange nested API write supersedes commit without stale change callbacks', async ({ page }) => {
    const input = await mount(page);
    await page.evaluate(() => number.events.on('beforeChange', () => number.value.set(7, { silent: true })));
    await input.pressSequentially('12');
    expect(await page.evaluate(() => number.commitInput({ origin: 'user', userAction: true })))
      .toMatchObject({ ok: false, status: 'superseded', value: 7 });
    await expect(input).toHaveValue('7');
    expect(await snapshot(page)).toEqual({ value: 7, dirty: true, pending: false, events: cycle(20, 12).slice(0, 1) });
  });

  test('destroy during beforeChange stops later callback phases', async ({ page }) => {
    const input = await mount(page);
    await page.evaluate(() => number.events.on('beforeChange', () => number.destroy()));
    await input.pressSequentially('12'); await input.press('Enter');
    await expect(input).toHaveCount(0);
    expect(await page.evaluate(() => events.map(e => e.name))).toEqual(['beforeChange']);
  });

  test('synthetic composing and prevented keys do not commit or cancel a real typed draft', async ({ page }) => {
    const input = await mount(page);
    await input.pressSequentially('12');
    // Dispatch flags exercise guards only. This does not claim native IME coverage.
    for (const key of ['Enter', 'Tab', 'Escape', 'ArrowUp']) for (const flags of [{ isComposing: true }, { keyCode: 229 }, { prevented: true }]) {
      await input.evaluate((el, { key, flags }) => {
        const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...flags });
        if (flags.prevented) event.preventDefault();
        el.dispatchEvent(event);
      }, { key, flags });
      await expect(input).toHaveValue('12');
      expect(await snapshot(page)).toEqual({ value: 20, dirty: false, pending: true, events: [] });
    }
    await input.press('Enter'); expect((await snapshot(page)).value).toBe(12);
  });
});
