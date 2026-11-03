import assert from 'node:assert/strict';
export async function checkIndicatorInputBrowserConsumer(page, url) {
  await page.goto(url);
  await page.evaluate(async () => {
    const { createIndicatorInputs } = await import('/output/indicator-input-consumer.js');
    window.indicators = createIndicatorInputs(document.querySelector('#root'));
    indicators.data.parse([{ key: 1, title: 'Source' }, { key: 2, title: 'Mapping' }, { key: 3, title: 'Export' }], { silent: true });
  });
  const progress = page.locator('[data-dui-control-id="progress"] [role=progressbar]');
  assert.equal(await progress.getAttribute('aria-valuenow'), '20');
  assert.equal(await progress.getAttribute('aria-valuetext'), 'Halfway');
  await page.evaluate(() => indicators.progress.setText('Working', { silent: true }));
  assert.equal(await progress.getAttribute('aria-valuetext'), 'Working');
  const formatted = page.locator('[data-dui-control-id="formatted"]');
  assert.deepEqual(await formatted.locator('.dui-progress-bar__text').allTextContents(), ['25/100 (25%)', '25/100 (25%)']);
  assert.equal(await formatted.locator('.dui-progress-bar__text[aria-hidden="true"]').count(), 2);
  assert.equal(await formatted.locator('[role=progressbar]').getAttribute('aria-valuetext'), '25/100 (25%)');
  const source = page.getByRole('button', { name: 'Step 1: Source', exact: true });
  await source.click(); await source.press('ArrowRight');
  assert.equal(await page.getByRole('button', { name: 'Step 3: Export', exact: true }).evaluate(el => el === document.activeElement), true);
  await page.keyboard.press('Enter');
  assert.equal(await page.evaluate(() => indicators.steps.getSelectedItemIndex()), 2);
  assert.equal(await page.getByRole('button', { name: 'Step 3: Export', exact: true }).getAttribute('aria-current'), 'step');
  const list = page.getByRole('listbox', { name: 'Export contents' });
  assert.equal(await list.getByRole('option', { name: 'Source', exact: true }).getAttribute('aria-selected'), 'true');
  await list.getByRole('option', { name: 'Mapping', exact: true }).click();
  assert.deepEqual(await page.evaluate(() => indicators.options.value.get()), [1, 3, 2]);
  await list.press('Home'); await list.press('Space');
  assert.deepEqual(await page.evaluate(() => indicators.options.value.get()), [3, 2]);
  await page.evaluate(() => indicators.data.update(3, { title: 'Output' }, { silent: true }));
  assert.equal(await list.getByRole('option', { name: 'Output', exact: true }).getAttribute('aria-selected'), 'true');
  await page.evaluate(() => indicators.options.value.clear({ silent: true }));
  assert.equal(await list.locator('[aria-selected=true]').count(), 0);
  await page.evaluate(() => indicators.destroy());
  assert.deepEqual(await page.evaluate(() => [indicators.data.destroyed, indicators.selection.destroyed]), [false, false]);
  await page.evaluate(() => { indicators.data.destroy(); indicators.selection.destroy(); });
  assert.equal(await page.locator('#root .dui-control').count(), 0);
  console.log('Installed indicators/OptionList browser OK: accessible progress, stage keyboard navigation, pending IDs, silent data, toggles and ownership');
}
