import assert from 'node:assert/strict';

export async function checkSpecializedInputBrowserConsumer(page, url) {
  await page.goto(url);
  await page.evaluate(async () => {
    const { createSpecializedInputs } = await import('/output/specialized-input-consumer.js');
    window.specialized = createSpecializedInputs(document.querySelector('#root'));
  });
  const single = page.locator('[data-dui-control-id="file"] input[type=file]');
  const multiple = page.locator('[data-dui-control-id="files"] input[type=file]');
  await single.setInputFiles({ name: 'one.txt', mimeType: 'text/plain', buffer: Buffer.from('one') });
  assert.deepEqual(await page.evaluate(() => specialized.events[0]), ['file', ['one.txt']]);
  await multiple.setInputFiles([{ name: 'a.txt', mimeType: 'text/plain', buffer: Buffer.from('a') },
    { name: 'b.txt', mimeType: 'text/plain', buffer: Buffer.from('bb') }]);
  assert.equal(await page.locator('[data-dui-control-id="files"] .dui-file-picker__display').inputValue(), '2 files');
  assert.deepEqual(await page.evaluate(() => specialized.files.value.get().map(file => file.size)), [1, 2]);
  await page.evaluate(() => { specialized.files.clearFiles({ silent: true }); specialized.file.value.clear(); specialized.file.validate(); });
  assert.equal(await multiple.evaluate(input => input.files.length), 0);
  assert.equal(await page.locator('[data-dui-control-id="file"] .dui-file-picker__display').getAttribute('aria-invalid'), 'true');
  await page.evaluate(() => specialized.file.value.reset({ silent: true }));
  assert.equal(await page.locator('[data-dui-control-id="file"] .dui-file-picker__display').inputValue(), 'initial.txt');
  assert.equal(await page.evaluate(() => specialized.file.getFiles().length), 0);
  const slider = page.locator('.dui-trackbar__input');
  await slider.press('ArrowUp');
  assert.equal(await slider.inputValue(), '0.75');
  assert.equal(await page.locator('.dui-trackbar__value').textContent(), '0.75');
  await page.evaluate(() => { specialized.track.setRange(0, 1); specialized.track.value.clear(); });
  assert.equal(await slider.inputValue(), '0');
  await slider.press('End'); assert.equal(await slider.inputValue(), '1');
  await page.evaluate(() => specialized.track.setReadOnly(true));
  assert.equal(await slider.isDisabled(), true);
  await page.getByRole('button', { name: 'Accent', exact: true }).click();
  await page.getByRole('textbox', { name: 'Hex color' }).fill('#123456');
  await page.getByRole('textbox', { name: 'Hex color' }).press('Tab');
  assert.equal(await page.evaluate(() => specialized.color.value.get()), '#123456');
  await page.getByRole('spinbutton', { name: 'R channel' }).fill('255');
  assert.equal(await page.evaluate(() => specialized.color.getRgb().red), 255);
  await page.keyboard.press('Escape');
  assert.equal(await page.evaluate(() => specialized.events.some(event => event[0] === 'close' && event[1] === 'escape')), true);
  await page.evaluate(() => { specialized.color.openPopup(); specialized.color.value.set('#abc', { silent: true }); });
  assert.equal(await page.getByRole('textbox', { name: 'Hex color' }).inputValue(), '#aabbcc');
  await page.evaluate(() => specialized.color.setReadOnly(true));
  assert.equal(await page.getByRole('button', { name: 'Accent', exact: true }).isDisabled(), true);
  await page.evaluate(() => specialized.destroy());
  assert.equal(await page.locator('#root .dui-control, .dui-color-picker__popup').count(), 0);
  console.log('Installed specialized browser OK: actual files/metadata, validation/reset, fractional vertical range, RGB/hex popup, readonly and teardown');
}
