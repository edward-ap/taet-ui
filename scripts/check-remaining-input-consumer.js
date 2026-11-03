import assert from 'node:assert/strict';

export async function checkRemainingInputBrowserConsumer(page, url) {
  await page.goto(url);
  await page.evaluate(async () => {
    const { createRemainingInputs } = await import('/output/remaining-input-consumer.js');
    const { OverlayManager } = await import('/node_modules/taet-ui/src/core/OverlayManager.js');
    window.remainingManager = new OverlayManager();
    window.remaining = createRemainingInputs(document.querySelector('#root'), remainingManager);
  });
  const text = page.locator('textarea');
  assert.equal(await text.inputValue(), 'One\nTwo');
  await page.evaluate(() => { remaining.text.setSelection(0, 3); remaining.text.insertText('First', { silent: true }); });
  assert.equal(await text.inputValue(), 'First\nTwo');
  assert.deepEqual(await page.evaluate(() => remaining.text.getSelection()), { start: 5, end: 5, text: '' });
  await text.press('Tab');
  assert.equal(await text.inputValue(), 'First\t\nTwo');
  assert.deepEqual(await page.evaluate(() => remaining.changes), ['text', 'tab']);
  await text.press('Enter');
  assert.equal(await text.inputValue(), 'First\t\nTwo');
  assert.equal(await page.evaluate(() => remaining.text.calcAutoHeight() > 0), true);
  await page.evaluate(() => remaining.text.lines.set(['A', 'B'], { silent: true }));
  assert.equal(await text.inputValue(), 'A\nB');
  await page.locator('.dui-check-letter .dui-checkbox__content').click();
  await page.evaluate(() => remaining.checkLetter.setLetter(3));
  assert.equal(await page.getByRole('checkbox', { name: '3. Accepted', exact: true }).isChecked(), true);
  await page.getByRole('radiogroup').press('ArrowRight');
  assert.equal(await page.evaluate(() => remaining.radio.getSelectedItem().marker), 'B');
  const single = page.locator('[data-dui-control-id="single"] [role="combobox"]');
  await single.click();
  await page.getByRole('option', { name: 'South', exact: true }).click();
  assert.equal(await single.textContent(), 'South');
  const multi = page.locator('[data-dui-control-id="regions"] [role="combobox"]');
  await multi.click();
  await page.locator('.dui-dropdown-list__search:visible').fill('south');
  await page.getByRole('option', { name: 'South', exact: true }).click();
  assert.deepEqual(await page.evaluate(() => remaining.multi.value.get()), ['n', 's']);
  assert.equal(await page.getByRole('listbox').isVisible(), true);
  await page.evaluate(() => remaining.multi.closePopup({ silent: true }));
  await page.getByRole('button', { name: 'Remove North', exact: true }).click();
  assert.deepEqual(await page.evaluate(() => remaining.multi.value.get()), ['s']);
  await multi.press('Backspace');
  assert.deepEqual(await page.evaluate(() => remaining.multi.value.get()), []);
  await page.evaluate(() => { remaining.multi.value.set(['n'], { silent: true }); remaining.multi.setReadOnly(true); });
  await multi.press('Backspace');
  assert.deepEqual(await page.evaluate(() => remaining.multi.value.get()), ['n']);
  await page.evaluate(() => { remaining.multi.setReadOnly(false); remaining.multi.openPopup(); remaining.data.remove('n', { silent: true }); });
  assert.deepEqual(await page.evaluate(() => remaining.multi.value.get()), []);
  assert.equal(await page.locator('.dui-multi-select-dropdown__token').count(), 0);
  assert.deepEqual(await page.evaluate(() => {
    remaining.multi.destroy(); remaining.dropdown.destroy();
    return [remaining.data.destroyed, remainingManager.all().length];
  }), [false, 0]);
  await page.evaluate(() => {
    remaining.text.destroy(); remaining.checkLetter.destroy(); remaining.radio.destroy();
    remaining.data.destroy(); remainingManager.destroy();
  });
  assert.equal(await page.locator('#root .dui-control').count(), 0);
  console.log('Installed remaining inputs browser OK: lines/selection/tab, markers, popup variants, token/keyboard selection, readonly, silent data and ownership');
}
