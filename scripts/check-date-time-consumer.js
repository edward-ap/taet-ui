import assert from 'node:assert/strict';

export async function checkDateTimeBrowserConsumer(page, url) {
  await page.goto(url);
  await page.evaluate(async () => {
    const { createSchedule } = await import('/output/date-time-consumer.js');
    const { OverlayManager } = await import('/node_modules/taet-ui/src/core/OverlayManager.js');
    window.scheduleManager = new OverlayManager();
    window.schedule = createSchedule(document.querySelector('#root'), scheduleManager);
  });
  const date = page.locator('[data-dui-control-id="date"] input');
  const time = page.locator('[data-dui-control-id="time"] input');
  const combined = page.locator('[data-dui-control-id="combined"] input');
  assert.equal(await date.inputValue(), '2026-09-06');
  assert.equal(await time.inputValue(), '02:30 PM');
  assert.equal(await combined.inputValue(), '2026-09-06 14:30');
  assert.equal(await date.getAttribute('min'), '2026-01-01');
  await date.press('Alt+ArrowDown');
  await page.locator('.dui-date-picker .dui-date-time-picker__day:not(.dui-muted)').filter({ hasText: /^7$/ }).click();
  assert.equal(await date.inputValue(), '2026-09-07');
  assert.deepEqual(await page.evaluate(() => schedule.changes), [['date', '2026-09-07', 'user', true]]);

  await time.press('Alt+ArrowDown');
  await page.locator('.dui-time-picker__wheel:visible').first().getByRole('button', { name: '04', exact: true }).click();
  assert.equal(await time.inputValue(), '04:30 PM');
  assert.equal(await page.evaluate(() => schedule.time.value.get()), '14:30');
  await page.getByRole('button', { name: 'OK', exact: true }).click();
  assert.equal(await time.inputValue(), '02:30 PM'); // vetoed 16:30
  assert.equal(await page.evaluate(() => schedule.changes.length), 1);
  await time.press('Alt+ArrowDown');
  await page.locator('.dui-time-picker__wheel:visible').first().getByRole('button', { name: '03', exact: true }).click();
  await page.getByRole('button', { name: 'OK', exact: true }).click();
  assert.equal(await time.inputValue(), '03:30 PM');
  await page.getByRole('button', { name: 'Increase time', exact: true }).click();
  assert.equal(await time.inputValue(), '03:45 PM');

  await combined.press('Alt+ArrowDown');
  await page.locator('.dui-time-picker__wheel:visible').first().getByRole('button', { name: '16', exact: true }).click();
  assert.equal(await combined.inputValue(), '2026-09-06 16:30');
  await page.keyboard.press('Escape');
  assert.equal(await combined.inputValue(), '2026-09-06 14:30');
  await combined.press('Alt+ArrowDown');
  await page.locator('.dui-time-picker__wheel:visible').first().getByRole('button', { name: '16', exact: true }).click();
  await page.getByRole('button', { name: 'OK', exact: true }).click();
  assert.equal(await page.evaluate(() => schedule.combined.value.get()), '2026-09-06T16:30');
  await page.evaluate(() => {
    schedule.date.value.clear({ silent: true });
    schedule.date.validate({ earliest: '2026-01-01' });
    schedule.time.setReadOnly(true); schedule.combined.disable();
  });
  assert.equal(await date.getAttribute('aria-invalid'), 'true');
  assert.equal(await time.getAttribute('readonly'), '');
  assert.equal(await page.getByRole('button', { name: 'Increase time', exact: true }).isDisabled(), true);
  assert.equal(await combined.isDisabled(), true);
  await page.evaluate(() => { schedule.date.value.reset({ silent: true }); schedule.time.value.set('00:15', { silent: true }); });
  assert.equal(await date.inputValue(), '2026-09-06');
  assert.equal(await date.getAttribute('aria-invalid'), null);
  assert.equal(await time.inputValue(), '12:15 AM');
  await date.press('Alt+ArrowDown');
  await page.evaluate(() => schedule.destroy());
  assert.equal(await page.locator('#root .dui-control').count(), 0);
  assert.equal(await page.locator('.dui-date-time-picker, .dui-time-picker').count(), 0);
  assert.deepEqual(await page.evaluate(() => [scheduleManager.all().length, scheduleManager.getRoot().isConnected]), [0, true]);
  await page.evaluate(async () => {
    const { TimeInput } = await import('taet-ui/inputs');
    window.nextTime = new TimeInput('#root', { value: '00:15', hourMode: '1-24', overlayManager: scheduleManager });
  });
  assert.equal(await page.locator('#root input').inputValue(), '24:15');
  await page.locator('#root input').fill('24:30');
  assert.equal(await page.evaluate(() => nextTime.value.get()), '00:30');
  await page.locator('#root input').press('Alt+ArrowDown');
  assert.equal(await page.evaluate(() => scheduleManager.has(nextTime)), true);
  await page.evaluate(() => { nextTime.destroy(); scheduleManager.destroy(); });
  console.log('Installed date/time browser OK: typed local values, preview/commit/veto/cancel, calendar, steppers, readonly, validation and borrowed overlays');
}
