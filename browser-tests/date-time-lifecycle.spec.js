import { test, expect } from '@playwright/test';

for (const kind of ['TimeInput', 'DateTimeInput']) {
  test(`${kind} Cancel restores latest committed value after an API write`, async ({ page }) => {
    await page.goto('/browser-tests/recipes.html');
    await page.evaluate(async kind => {
      const ui = await import('/src/ui/inputs.js');
      window.field = new ui[kind]('#root', { value: kind === 'TimeInput' ? '14:30' : '2026-09-06T14:30' });
    }, kind);
    const input = page.locator('#root input');
    await input.press('Alt+ArrowDown');
    await page.locator('.dui-time-picker__wheel').first().getByRole('button', { name: '16', exact: true }).click();
    const latest = kind === 'TimeInput' ? '18:45' : '2026-09-08T18:45';
    await page.evaluate(value => field.value.set(value, { silent: true }), latest);
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(input).toHaveValue(latest.replace('T', ' '));
    expect(await page.evaluate(() => field.value.get())).toBe(latest);
    await page.evaluate(() => field.destroy());
  });
}

for (const kind of ['DateInput', 'TimeInput', 'DateTimeInput']) {
  test(`${kind} picker value phases stop work and release DOM on teardown`, async ({ page }) => {
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.goto('/browser-tests/recipes.html');
    const actions = kind === 'DateInput' ? ['clear', 'day'] : kind === 'TimeInput' ? ['ok', 'step'] : ['ok'];
    for (const action of actions) for (const phase of ['beforeChange', 'change', 'afterChange']) {
      await page.evaluate(async ({ kind, phase }) => {
        const ui = await import('/src/ui/inputs.js');
        window.field = new ui[kind]('#root', { value: kind === 'TimeInput' ? '14:30' : kind === 'DateInput' ? '2026-09-06' : '2026-09-06T14:30' });
        window.seen = [];
        field.events.on(phase, () => field.destroy());
        // Detect post-destroy work, including rendering into detached retained picker DOM.
        for (const name of ['_renderPicker', '_closePicker', '_hidePicker']) {
          const original = field[name];
          if (original) field[name] = function (...args) {
            if (this.destroyed) seen.push(name);
            return original.apply(this, args);
          };
        }
      }, { kind, phase });
      await page.locator('#root input').press('Alt+ArrowDown');
      if (action === 'clear') await page.getByRole('button', { name: 'Clear', exact: true }).click();
      else if (action === 'day') await page.locator('.dui-date-picker .dui-date-time-picker__day:not(.dui-muted)').filter({ hasText: /^7$/ }).click();
      else if (action === 'step') await page.getByRole('button', { name: 'Increase time', exact: true }).click();
      else {
        await page.locator('.dui-time-picker__wheel').first().getByRole('button', { name: '16', exact: true }).click();
        await page.getByRole('button', { name: 'OK', exact: true }).click();
      }
      await expect(page.locator('#root .dui-control')).toHaveCount(0);
      await expect(page.locator('.dui-time-picker, .dui-date-time-picker')).toHaveCount(0);
      expect(await page.evaluate(() => seen)).toEqual([]);
      expect(await page.evaluate(() => field._picker)).toBeNull();
    }
    expect(errors).toEqual([]);
  });
}
