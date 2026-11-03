import assert from 'node:assert/strict';

// Actual packaged services and compiled TS recipes; DOM access stays in the harness.
export async function checkGridEditorServices(page, url) {
  for (const kind of ['Grid', 'TreeGrid']) {
    await page.goto(url);
    await page.evaluate(async kind => {
      const { OverlayManager } = await import('/node_modules/taet-ui/src/core/OverlayManager.js');
      const recipe = await import('/output/grid-editor-services-consumer.js');
      const manager = new OverlayManager({ baseZIndex: 2500 });
      const events = [];
      manager.events.on('open', () => events.push('open'));
      window.services = { ...recipe.createServicesGrid(kind, document.querySelector('#root'), manager), manager, events };
      if (!services.grid.startEdit(1, 'country')) throw new Error('Select activation failed');
    }, kind);
    await page.locator('.dui-dropdown-list__button').click();
    assert.equal(await page.locator('.dui-overlay-root .dui-dropdown-list__item').count(), 2);
    assert.equal(await page.locator('.dui-dropdown-list__item').first().textContent(), '<Canada>');
    assert.equal(await page.locator('.dui-dropdown-list__item canada').count(), 0, 'Renderer strings are text, not HTML');
    await page.evaluate(() => services.choices.update('ca', { label: 'Live Canada' }, { silent: true }));
    assert.equal(await page.locator('.dui-dropdown-list__item').first().textContent(), '<Live Canada>', 'Borrowed data updates the open popup');
    await page.locator('.dui-dropdown-list__search').fill(' EUROPE ');
    assert.equal(await page.locator('.dui-dropdown-list__item').count(), 1);
    assert.equal(await page.locator('.dui-dropdown-list__item').textContent(), '<France>');
    await page.locator('.dui-dropdown-list__item').click();
    const select = await page.evaluate(() => {
      const { grid, choices, manager, seen } = services;
      if (!grid.commitEdit()) throw new Error('Select commit failed');
      return { country: grid.data.get(1).country, alive: !choices.destroyed, size: choices.all().length,
        overlays: manager.all().length, queries: seen.queries, rows: seen.rows };
    });
    assert.equal(select.country, 'fr'); assert.equal(select.alive, true); assert.equal(select.size, 2);
    assert.equal(select.overlays, 0); assert.ok(select.queries.includes('europe')); assert.deepEqual(select.rows, [1]);
    // Reopening uses live borrowed data; cancelling releases only the editor popup.
    await page.evaluate(() => {
      services.choices.update('ca', { label: 'Canada updated' }, { silent: true });
      services.grid.startEdit(1, 'country');
    });
    await page.locator('.dui-dropdown-list__button').click();
    assert.ok((await page.locator('.dui-dropdown-list__item').allTextContents()).includes('<Canada updated>'));
    await page.evaluate(() => services.grid.cancelEdit());
    for (const field of ['date', 'time', 'dateTime']) {
      await page.evaluate(field => { if (!services.grid.startEdit(1, field)) throw new Error('Picker activation failed'); }, field);
      await page.locator('.dui-date-time-input__button').click();
      assert.equal(await page.evaluate(() => services.manager.all().length), 1, `${kind} ${field}: injected manager used`);
      assert.equal(await page.evaluate(() => services.manager.getRoot().querySelectorAll('[hidden]').length), 0);
      await page.evaluate(field => {
        if (field === 'dateTime') services.grid.destroy();
        else services.grid.cancelEdit();
      }, field);
      assert.equal(await page.evaluate(() => services.manager.all().length), 0, `${kind} ${field}: overlay detached`);
    }
    const ownership = await page.evaluate(() => {
      const { choices, manager, events } = services;
      const alive = !choices.destroyed && !manager.events.destroyed;
      choices.update('ca', { label: 'After table teardown' });
      // The same manager remains usable after its table and editors are gone.
      const element = document.createElement('div'); manager.getRoot().append(element);
      const marker = {}; manager.open(marker, { element });
      const reusable = manager.has(marker); manager.close(marker); element.remove();
      const result = { alive, reusable, popupCount: document.querySelectorAll('.dui-dropdown-list__popup, .dui-date-picker, .dui-time-picker, .dui-date-time-picker').length,
        openings: events.length };
      choices.destroy(); manager.destroy(); return result;
    });
    assert.deepEqual(ownership, { alive: true, reusable: true, popupCount: 0, openings: 6 });
    console.log(`Installed ${kind} service options OK: typed choices, custom search/rendering, borrowed store and picker overlays`);
  }
}
