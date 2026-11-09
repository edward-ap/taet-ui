import { expect, test } from './input-test-fixture.js';

test.describe('NumberInput editing', { tag: '@input-editing' }, () => {

async function mount(page, options = {}) {
  await page.goto('/browser-tests/recipes.html');
  await page.evaluate(async options => {
    const { NumberInput } = await import('/src/ui/inputs.js');
    window.number = new NumberInput('#root', options);
    window.changes = [];
    number.events.on('change', event => changes.push({
      value: event.newValue, origin: event.origin, userAction: event.userAction
    }));
    const outside = document.createElement('button');
    outside.id = 'outside';
    outside.textContent = 'Outside';
    document.querySelector('#root').append(outside);
  }, options);
  return page.locator('#root input');
}

test.afterEach(async ({ page }) => {
  await page.evaluate(() => window.number?.destroy());
});

const configurations = [
  { label: 'default', options: {}, step: null },
  { label: 'step:any', options: { step: 'any' }, step: 'any' },
  { label: 'fractional step', options: { step: 0.01 }, step: '0.01' }
];

for (const configuration of configurations) {
for (const value of ['1.05', '1.005', '0.05', '-1.05', '-0.05', '.05']) {
  test(`NumberInput keystrokes retain decimal ${value}, ${configuration.label}`, async ({ page }) => {
    const input = await mount(page, configuration.options);
    expect(await input.getAttribute('step')).toBe(configuration.step);
    await input.pressSequentially(value);
    expect(await input.inputValue()).not.toBe('');
    expect(Number(await input.inputValue())).toBe(Number(value));
    expect(await page.evaluate(() => number.value.get())).toBe(Number(value));
    expect(await page.evaluate(() => changes.at(-1))).toEqual({
      value: Number(value), origin: 'user', userAction: true
    });
    expect(await page.evaluate(() => changes.every(event =>
      typeof event.value === 'number' && event.origin === 'user' && event.userAction
    ))).toBe(true);
  });
}

}

for (const clamp of [true, false]) {
  test(`NumberInput keeps the draft through unchanged numbers and normalizes on blur, clamp=${clamp}`, async ({ page }) => {
    const input = await mount(page, { clamp });
    await input.pressSequentially('1.0');
    await expect(input).toHaveValue('1.0');
    expect(await page.evaluate(() => number.value.get())).toBe(1);
    expect(await page.evaluate(() => changes)).toEqual([{ value: 1, origin: 'user', userAction: true }]);
    await page.locator('#outside').click();
    await expect(input).toHaveValue('1');
    expect(await page.evaluate(() => changes)).toHaveLength(1);
  });
}

test('NumberInput emits the completed decimal without an event for its equal-valued prefix', async ({ page }) => {
  const input = await mount(page);
  await input.pressSequentially('1.0');
  await expect(input).toHaveValue('1.0');
  await input.pressSequentially('5');
  await expect(input).toHaveValue('1.05');
  expect(await page.evaluate(() => changes)).toEqual([
    { value: 1, origin: 'user', userAction: true },
    { value: 1.05, origin: 'user', userAction: true }
  ]);
});

test('NumberInput API setters, reset and clear synchronize a focused decimal draft', async ({ page }) => {
  const input = await mount(page, { value: 1 });
  await input.focus();
  await input.press('End');
  await input.pressSequentially('.0');
  await expect(input).toHaveValue('1.0');
  await page.evaluate(() => number.value.set(1, { silent: true }));
  await expect(input).toHaveValue('1');
  await input.press('End');
  await input.pressSequentially('.0');
  await page.evaluate(() => number.value.reset());
  await expect(input).toHaveValue('1');
  await input.press('End');
  await input.pressSequentially('.0');
  await page.evaluate(() => number.value.clear());
  await expect(input).toHaveValue('');
  expect(await page.evaluate(() => number.value.get())).toBeNull();
});

test('NumberInput native spin replaces a decimal draft with the new value', async ({ page }) => {
  const input = await mount(page);
  await input.pressSequentially('1.0');
  await expect(input).toHaveValue('1.0');
  await input.press('ArrowUp');
  await expect(input).toHaveValue('2');
  expect(await page.evaluate(() => number.value.get())).toBe(2);
  await input.press('ArrowDown');
  await expect(input).toHaveValue('1');
  expect(await page.evaluate(() => number.value.get())).toBe(1);
  expect(await page.evaluate(() => changes.map(event => event.value))).toEqual([1, 2, 1]);
});

test('NumberInput restores a vetoed decimal instead of retaining the draft', async ({ page }) => {
  const input = await mount(page);
  await page.evaluate(() => number.events.on('beforeChange', event => {
    if (event.newValue === 1.05) event.cancel = true;
  }));
  await input.pressSequentially('1.05');
  await expect(input).toHaveValue('1');
  expect(await page.evaluate(() => number.value.get())).toBe(1);
});

for (const options of [{ precision: 1 }, { max: 1 }, { isInteger: true }]) {
  test(`NumberInput still applies numeric normalization ${JSON.stringify(options)}`, async ({ page }) => {
    const input = await mount(page, options);
    await input.pressSequentially('1.01');
    await expect(input).toHaveValue('1');
    expect(await page.evaluate(() => number.value.get())).toBe(1);
  });
}

for (const option of ['readOnly', 'disabled']) {
  test(`NumberInput rejects synthetic user writes while ${option}`, async ({ page }) => {
    const input = await mount(page, { value: 1, [option]: true });
    await input.evaluate(input => {
      input.value = '1.0';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await expect(input).toHaveValue('1');
    expect(await page.evaluate(() => changes)).toEqual([]);
  });
}

test('NumberInput nested silent API writes remain synchronized during a user change', async ({ page }) => {
  const input = await mount(page);
  await page.evaluate(() => number.events.on('change', () => number.value.set(2, { silent: true })));
  await input.pressSequentially('1');
  await expect(input).toHaveValue('2');
  expect(await page.evaluate(() => number.value.get())).toBe(2);
});

for (const { label, options } of configurations) {
  test(`NumberInput sequential draft checkpoints, ${label}`, async ({ page }) => {
    const input = await mount(page, options);
    await input.pressSequentially('1');
    await expect(input).toHaveValue('1');
    await input.pressSequentially('.0');
    await expect(input).toHaveValue('1.0');
    expect(await page.evaluate(() => number.value.get())).toBe(1);
    await input.pressSequentially('0');
    await expect(input).toHaveValue('1.00');
    expect(await page.evaluate(() => changes)).toEqual([{ value: 1, origin: 'user', userAction: true }]);
    await input.pressSequentially('5');
    await expect(input).toHaveValue('1.005');
    expect(await page.evaluate(() => number.value.get())).toBe(1.005);
    expect(await page.evaluate(() => changes)).toEqual([
      { value: 1, origin: 'user', userAction: true },
      { value: 1.005, origin: 'user', userAction: true }
    ]);
  });

  test(`NumberInput keyboard replacement, deletion and refocus, ${label}`, async ({ page }) => {
    const input = await mount(page, { ...options, value: 42 });
    // Native number inputs do not support setSelectionRange. Select via the keyboard.
    await input.press('ControlOrMeta+A');
    await input.pressSequentially('1.05');
    await expect(input).toHaveValue('1.05');
    expect(await page.evaluate(() => number.value.get())).toBe(1.05);
    await input.press('Backspace');
    await expect(input).toHaveValue('1.0');
    expect(await page.evaluate(() => number.value.get())).toBe(1);
    const count = await page.evaluate(() => changes.length);
    await page.locator('#outside').click();
    await expect(input).toHaveValue('1');
    await input.focus();
    await input.press('ControlOrMeta+A');
    await input.press('ArrowRight');
    await input.pressSequentially('.05');
    await expect(input).toHaveValue('1.05');
    expect(await page.evaluate(() => number.value.get())).toBe(1.05);
    expect(await page.evaluate(() => changes.length)).toBe(count + 1);
    await input.press('ControlOrMeta+A');
    await input.press('Delete');
    await expect(input).toHaveValue('');
    expect(await page.evaluate(() => number.value.get())).toBeNull();
    expect(await page.evaluate(() => changes.at(-1))).toEqual({ value: null, origin: 'user', userAction: true });
    await input.pressSequentially('-0.05');
    await expect(input).toHaveValue('-0.05');
    expect(await page.evaluate(() => number.value.get())).toBe(-0.05);
  });
}

for (const option of ['readOnly', 'disabled']) {
  test(`NumberInput blocks real keyboard editing while ${option} and recovers`, async ({ page }) => {
    const input = await mount(page, { value: 1.05, [option]: true });
    if (option === 'disabled') {
      await expect(input).toBeDisabled();
      await page.locator('#outside').focus();
      await page.keyboard.press('Shift+Tab');
      await expect(input).not.toBeFocused();
    } else {
      await expect(input).not.toBeEditable();
      await input.click();
      await expect(input).toBeFocused();
    }
    await page.keyboard.press('ControlOrMeta+A');
    await page.keyboard.type('9');
    // Backspace can navigate browser history on noneditable native inputs in WebKit.
    // Exercise deletion with Delete here; editable Backspace is covered above.
    await page.keyboard.press('Delete');
    await page.keyboard.press('ArrowUp');
    await expect(input).toHaveValue('1.05');
    expect(await page.evaluate(() => number.value.get())).toBe(1.05);
    expect(await page.evaluate(() => changes)).toEqual([]);
    await page.evaluate(option => option === 'disabled' ? number.enable() : number.setReadOnly(false), option);
    await expect(input).toBeEditable();
    // Chromium's native number editor also needs refocus after clearing readonly.
    await page.locator('#outside').click();
    await input.click();
    await input.press('ControlOrMeta+A');
    await input.pressSequentially('0.05');
    await expect(input).toHaveValue('0.05');
    expect(await page.evaluate(() => number.value.get())).toBe(0.05);
    expect(await page.evaluate(() => changes.at(-1))).toEqual({ value: 0.05, origin: 'user', userAction: true });
  });
}

});
