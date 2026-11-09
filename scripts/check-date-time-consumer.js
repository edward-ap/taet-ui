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
  await checkTemporalKeyboardConsumer(page);
  await checkPartialTimeConsumer(page);
  console.log('Installed date/time browser OK: typed local values, preview/commit/veto/cancel, calendar, steppers, readonly, validation and borrowed overlays');
}

async function checkTemporalKeyboardConsumer(page) {
  const field = page.locator('#root input');
  for (const hourMode of ['0-23', '12', '1-24']) {
    await page.evaluate(async hourMode => {
      const { TimeInput } = await import('taet-ui/inputs');
      window.temporalConsumer = new TimeInput('#root', { hourMode });
    }, hourMode);
    await field.pressSequentially('12:34');
    assert.equal(await field.inputValue(), '12:34', hourMode + ' keeps the active edit');
    assert.equal(await page.evaluate(() => temporalConsumer.value.get()), '12:34');
    assert.deepEqual(await field.evaluate(node => [node.selectionStart, node.selectionEnd]), [5, 5]);
    await page.evaluate(() => temporalConsumer.value.set('00:15', { silent: true }));
    assert.equal(await field.inputValue(), hourMode === '12' ? '12:15 AM' : hourMode === '1-24' ? '24:15' : '00:15');
    await page.evaluate(() => temporalConsumer.destroy());
  }
  for (const kind of ['DateInput', 'DateTimeInput']) {
    await page.evaluate(async kind => {
      const inputs = await import('taet-ui/inputs');
      window.temporalConsumer = new inputs[kind]('#root', {
        value: kind === 'DateInput' ? '2026-09-06' : '2026-09-06T14:30'
      });
    }, kind);
    // Replace one digit without deleting an unselected suffix or choosing a new parser policy.
    await field.press('Home');
    for (let index = 0; index < 9; index++) await field.press('ArrowRight');
    await field.press('Shift+ArrowRight');
    await field.pressSequentially('7');
    assert.equal(await field.inputValue(), kind === 'DateInput' ? '2026-09-07' : '2026-09-07 14:30');
    assert.equal(await page.evaluate(() => temporalConsumer.value.get()), kind === 'DateInput' ? '2026-09-07' : '2026-09-07T14:30');
    assert.deepEqual(await field.evaluate(node => [node.selectionStart, node.selectionEnd]), [10, 10]);
    await page.evaluate(() => temporalConsumer.destroy());
  }
  console.log('Installed temporal keyboard OK: sequential time in three modes, canonical model, silent formatting and date/date-time partial replacement');
}

async function checkPartialTimeConsumer(page) {
  const field = page.locator('#root input');
  for (const hourMode of ['0-23', '12', '1-24']) {
    await page.evaluate(async hourMode => {
      const { TimeInput } = await import('taet-ui/inputs');
      const { required } = await import('taet-ui');
      window.partialTime = new TimeInput('#root', { hourMode, validators: [required('Required')] });
    }, hourMode);
    await field.pressSequentially('1:');
    await field.press('Tab');
    assert.equal(await field.inputValue(), '1:', hourMode + ' blur must not invent a complete display');
    assert.deepEqual(await page.evaluate(() => ({ value: partialTime.value.get(), valid: partialTime.validate().ok })),
      { value: '1:', valid: true }, 'Required checks presence, not time completeness');
    await page.evaluate(() => partialTime.addValidator(value =>
      /^(?:[01][0-9]|2[0-3]):[0-5][0-9]$/.test(value) ? null : { code: 'complete-time', message: 'Enter a complete time' }));
    assert.deepEqual(await page.evaluate(() => {
      const result = partialTime.validate();
      return { valid: result.ok, codes: result.errors.map(error => error.code) };
    }), { valid: false, codes: ['complete-time'] });
    await field.press('End');
    await field.pressSequentially('23');
    assert.equal(await field.inputValue(), '1:23', 'Continued typing remains a native live edit');
    assert.deepEqual(await page.evaluate(() => ({ value: partialTime.value.get(), valid: partialTime.validate().ok })),
      { value: '01:23', valid: true });
    await field.press('Tab');
    assert.equal(await field.inputValue(), hourMode === '12' ? '01:23 AM' : '01:23');
    await page.evaluate(() => partialTime.value.set('1:', { silent: true }));
    assert.equal(await field.inputValue(), '1:', 'Silent API writes preserve incomplete text');
    assert.equal(await page.evaluate(() => partialTime.value.get()), '1:');
    await page.evaluate(() => partialTime.destroy());
  }
  console.log('Installed partial time OK: honest blur/API display in three modes, continuation, required versus explicit completeness');
}
