import { expect, test } from '@playwright/test';

async function mount(page, options = {}) {
  await page.goto('/browser-tests/recipes.html');
  await page.evaluate(async options => {
    const { NumberInput } = await import('/src/ui/inputs.js');
    window.number = new NumberInput('#root', { step: 'any', ...options });
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

for (const value of ['1.05', '1.005', '0.05', '-1.05', '.05']) {
  test(`NumberInput keystrokes retain decimal ${value}`, async ({ page }) => {
    const input = await mount(page);
    await input.pressSequentially(value);
    expect(await input.inputValue()).not.toBe('');
    expect(Number(await input.inputValue())).toBe(Number(value));
    expect(await page.evaluate(() => number.value.get())).toBe(Number(value));
    expect(await page.evaluate(() => changes.every(event =>
      typeof event.value === 'number' && event.origin === 'user' && event.userAction
    ))).toBe(true);
  });
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
  await input.press('ArrowDown');
  await expect(input).toHaveValue('1');
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
