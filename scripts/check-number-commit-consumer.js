import assert from 'node:assert/strict';

// Runs the compiled TypeScript recipe against the freshly installed tarball.
export async function checkNumberCommitBrowserConsumer(page, url) {
  await page.goto(url);
  await page.evaluate(async () => {
    const { createNumberCommitFixture } = await import('/output/number-commit-browser.js');
    window.numberCommit = createNumberCommitFixture(document.querySelector('#root'));
  });
  const live = page.locator('[data-dui-control-id="number-live"] input');
  const draft = page.locator('[data-dui-control-id="number-commit"] input');
  await live.fill('7');
  assert.equal(await page.evaluate(() => numberCommit.live.value.get()), 7, 'Default live input updates immediately');
  await draft.fill('12');
  const pending = await page.evaluate(() => {
    numberCommit.field.validate(); // Validation and getters must not finish a draft.
    return numberCommit.snapshot();
  });
  assert.equal(pending.value, 2);
  assert.equal(pending.formValue, 2);
  assert.equal(pending.pending, true);
  assert.deepEqual(pending.changes, []);
  assert.equal(await draft.inputValue(), '12');
  assert.ok(await page.evaluate(() => numberCommit.drafts.some(event => event.text === '12'
    && event.pending && !event.badInput && event.origin === 'user' && event.userAction)), 'Typed draftChange metadata');
  assert.deepEqual(await page.evaluate(() => numberCommit.commit()),
    { ok: true, changed: true, status: 'committed', value: 12 });
  assert.equal(await page.evaluate(() => numberCommit.form.value.get().amount), 12);
  assert.equal(await page.evaluate(() => numberCommit.field.hasPendingInput()), false);
  await draft.fill('19');
  assert.equal(await page.evaluate(() => numberCommit.field.cancelInput()), true);
  assert.equal(await draft.inputValue(), '12');
  assert.equal(await page.evaluate(() => numberCommit.field.value.get()), 12);
  await draft.fill('22');
  assert.equal(await page.evaluate(() => numberCommit.form.submit()), true, 'Form submit prepares numeric draft');
  assert.equal(await page.evaluate(() => numberCommit.form.value.get().amount), 22);
  await draft.fill('23');
  await page.evaluate(() => numberCommit.field.value.set(30, { silent: true }));
  assert.equal(await draft.inputValue(), '30');
  assert.equal(await page.evaluate(() => numberCommit.field.hasPendingInput()), false);
  assert.deepEqual(await page.evaluate(() => numberCommit.changes), [12, 22], 'Silent replacement emits no numeric change');
  assert.equal(await page.evaluate(() => numberCommit.grid.startEdit(1, 'amount')), true);
  const editor = page.locator('.dui-grid__editor-host input');
  await editor.fill('41');
  assert.equal(await page.evaluate(() => numberCommit.grid.data.get(1).amount), 3, 'Grid store retains committed value during draft');
  assert.equal(await page.evaluate(() => numberCommit.grid.commitEdit()), true, 'Grid commit prepares numeric draft');
  assert.equal(await page.evaluate(() => numberCommit.grid.data.get(1).amount), 41);
  assert.equal(await editor.count(), 0);
  await page.evaluate(() => numberCommit.destroy());
  assert.equal(await page.locator('#root .dui-control').count(), 0);
  console.log('Installed NumberInput commit browser OK: live default, typed draft/model split, commit/cancel, silent replace, Form submit and Grid commit');
}
