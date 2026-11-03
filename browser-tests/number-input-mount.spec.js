import { expect, test } from '@playwright/test';

for (const target of ['selector', 'element']) {
  test(`NumberInput ${target} constructor mounts after numeric normalization and supports native spin`, async ({ page }) => {
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.goto('/browser-tests/recipes.html');
    const result = await page.evaluate(async target => {
      const { NumberInput } = await import('/src/ui/inputs.js');
      const number = new NumberInput(target === 'selector' ? '#root' : document.querySelector('#root'), {
        value: 20.25, min: 0, max: 10, step: 2, precision: 1
      });
      window.number = number;
      window.changes = [];
      number.events.on('change', event => changes.push([event.newValue, event.origin, event.userAction]));
      return { mounted: number.mounted, value: number.value.get() };
    }, target);
    expect(result).toEqual({ mounted: true, value: 10 });
    const input = page.locator('#root input');
    await expect(input).toHaveAttribute('type', 'number');
    await expect(input).toHaveAttribute('min', '0');
    await expect(input).toHaveAttribute('max', '10');
    await expect(input).toHaveAttribute('step', '2');
    await expect(input).toHaveValue('10');
    await input.press('ArrowDown');
    await expect(input).toHaveValue('8');
    expect(await page.evaluate(() => changes)).toEqual([[8, 'user', true]]);
    await page.evaluate(() => number.destroy());
    await expect(input).toHaveCount(0);
    expect(errors).toEqual([]);
  });
}
