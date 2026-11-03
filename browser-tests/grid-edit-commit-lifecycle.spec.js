import { expect, test } from '@playwright/test';

test('Grid Tab commit does not navigate after teardown or replace an editor opened by a commit handler', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/browser-tests/recipes.html');
  await page.evaluate(async () => {
    const { Grid, gridEditors } = await import('/src/ui/grid-api.js');
    window.create = () => {
      window.grid = new Grid('#root', { height: 220, columns: [{ id: 'name', width: 180, editor: gridEditors.text() }] });
      grid.data.parse([{ id: 1, name: 'First' }, { id: 2, name: 'Next' }, { id: 3, name: 'Chosen' }]);
      grid.startEdit(1, 'name');
    };
    create(); grid.events.on('editCommit', () => grid.destroy());
  });
  const input = page.locator('.dui-grid__editor-host input');
  await input.fill('Saved'); await input.press('Tab');
  await expect(input).toHaveCount(0);
  await page.evaluate(() => { create(); grid.events.on('editCommit', () => grid.startEdit(3, 'name')); });
  await input.fill('Saved'); await input.press('Tab');
  await expect(input).toHaveValue('Chosen');
  await page.evaluate(() => grid.destroy());
  expect(errors).toEqual([]);
});

for (const kind of ['Grid', 'TreeGrid']) {
  test(`${kind} real editors tolerate teardown at commit callback boundaries`, async ({ page }) => {
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.goto('/browser-tests/recipes.html');
    const results = await page.evaluate(async kind => {
      const { Grid, TreeGrid, gridEditors } = await import('/src/ui/grid-api.js');
      const { DataStore } = await import('/src/core/DataStore.js');
      const results = [];
      for (const phase of ['validator', 'beforeCellChange', 'editReject', 'cellChange', 'editCommit']) {
        const data = new DataStore(); data.parse([{ id: 1, parentId: null, name: 'Old' }]);
        let grid, editorControl;
        const editor = gridEditors.text({ onFocus: e => { editorControl = e.source; },
          validators: [() => { if (phase === 'validator') grid.destroy(); return phase === 'editReject' ? 'No' : null; }] });
        grid = new ({ Grid, TreeGrid }[kind])('#root', { data, height: 220, columns: [{ id: 'name', width: 180, editor }] });
        const events = [];
        for (const type of ['beforeCellChange', 'editReject', 'cellChange', 'editCommit']) {
          grid.events.on(type, e => { events.push(type); if (phase === type) e.source.destroy(); });
        }
        if (!grid.startEdit(1, 'name', { origin: 'user', userAction: true })) throw new Error('No editor');
        await new Promise(requestAnimationFrame);
        editorControl.value.set('New');
        const committed = grid.commitEdit({ origin: 'system', userAction: false });
        results.push({ phase, committed, events, value: data.get(1).name,
          disposed: grid.destroyed && editorControl.destroyed, empty: document.querySelector('#root').childElementCount === 0 });
        data.destroy();
      }
      return results;
    }, kind);
    for (const result of results) {
      const applied = ['cellChange', 'editCommit'].includes(result.phase);
      expect(result.committed).toBe(applied);
      expect(result.value).toBe(applied ? 'New' : 'Old');
      expect(result.disposed && result.empty).toBe(true);
      expect(result.events).toEqual(result.phase === 'validator' ? [] :
        result.phase === 'editReject' ? ['editReject'] :
        ['beforeCellChange', ...(applied ? ['cellChange'] : []), ...(result.phase === 'editCommit' ? ['editCommit'] : [])]);
    }
    expect(errors).toEqual([]);
  });

  test(`${kind} preserves replacement editors and silent custom writes`, async ({ page }) => {
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.goto('/browser-tests/recipes.html');
    await page.evaluate(async kind => {
      const { Grid, TreeGrid, gridEditors } = await import('/src/ui/grid-api.js');
      window.events = []; window.writerOptions = [];
      window.grid = new ({ Grid, TreeGrid }[kind])('#root', { height: 220, columns: [{ id: 'name', width: 180,
        editor: gridEditors.text(), set: (_item, value, context) => {
          writerOptions.push([context.origin, context.userAction, context.silent]);
          return grid.data.update(context.id, { name: value }, context);
        } }] });
      grid.data.parse([{ id: 1, parentId: null, name: 'Old' }, { id: 2, parentId: null, name: 'Second' }]);
      for (const type of ['beforeCellChange', 'editReject', 'cellChange', 'editCommit', 'dataChange']) grid.events.on(type, e => {
        events.push([type, e.origin, e.userAction]);
      });
      window.replace = grid.events.on('beforeCellChange', () => {
        grid.cancelEdit({ silent: true }); grid.startEdit(2, 'name');
      });
      grid.startEdit(1, 'name', { origin: 'user', userAction: true });
    }, kind);
    const input = page.locator('.dui-grid__editor-host input');
    await input.fill('Cancelled');
    expect(await page.evaluate(() => grid.commitEdit())).toBe(false);
    await expect(input).toHaveValue('Second');
    expect(await page.evaluate(() => grid.data.get(1).name)).toBe('Old');
    await page.evaluate(() => { replace.dispose(); events.length = 0; });
    await input.fill('Silent');
    expect(await page.evaluate(() => grid.commitEdit({ silent: true, origin: 'import', userAction: false }))).toBe(true);
    await expect(input).toHaveCount(0);
    await expect(page.locator('.dui-grid__cell').filter({ hasText: 'Silent' })).toHaveCount(1);
    expect(await page.evaluate(() => events)).toEqual([]);
    expect(await page.evaluate(() => writerOptions)).toEqual([['import', false, true]]);
    await page.evaluate(() => {
      grid.events.on('editCommit', () => grid.startEdit(1, 'name'));
      grid.startEdit(2, 'name');
    });
    await input.fill('User commit');
    await input.press('Enter');
    await expect(input).toHaveValue('Old');
    expect(await page.evaluate(() => events.filter(e => e[0] !== 'dataChange'))).toEqual(
      ['beforeCellChange', 'cellChange', 'editCommit'].map(type => [type, 'user', true]));
    await page.evaluate(() => grid.destroy());
    expect(errors).toEqual([]);
  });
}
