import { expect, test } from '@playwright/test';

for (const kind of ['Grid', 'TreeGrid']) {
  test(`${kind} releases failed or interrupted activation and can retry`, async ({ page }) => {
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.goto('/browser-tests/recipes.html');
    const results = await page.evaluate(async kind => {
      const { Grid, TreeGrid, gridEditors } = await import('/src/ui/grid-api.js');
      const { TextInput } = await import('/src/ui/TextInput.js');
      const results = [];
      for (const phase of ['factory-throw', 'factory-close', 'mount-throw', 'mount-close', 'mount-cancel',
        'start-throw', 'start-close', 'start-cancel', 'factory-filter', 'invalid-raw']) {
        let grid, active = true, created = 0, disposed = 0, focused = 0, starts = 0, nested;
        class Input extends TextInput {
          mount(host) {
            super.mount(host);
            if (active && phase === 'mount-throw') throw new Error(phase);
            if (active && phase === 'mount-close') grid.destroy();
            if (active && phase === 'mount-cancel') grid.cancelEdit({ silent: true });
            return this;
          }
          focus(options) { focused++; return super.focus(options); }
          destroy() { if (!this.destroyed) disposed++; super.destroy(); }
        }
        const editor = gridEditors.custom(context => {
          nested = grid.startEdit(2, 'name');
          if (active && phase === 'factory-throw') throw new Error(phase);
          const input = new Input({ value: context.value }); created++;
          if (active && phase === 'factory-close') grid.destroy();
          if (active && phase === 'factory-filter') (grid.view ?? grid.treeView).setFilter(() => false, { silent: true });
          if (active && phase === 'invalid-raw') return { mount() {}, getValue() {}, focus() {}, destroy: () => input.destroy() };
          return input;
        });
        grid = new ({ Grid, TreeGrid }[kind])('#root', { height: 220, columns: [{ id: 'name', width: 180, editor }] });
        grid.data.parse([{ id: 1, parentId: null, name: 'One' }, { id: 2, parentId: null, name: 'Two' }]);
        grid.events.on('editStart', () => {
          starts++;
          if (active && phase === 'start-throw') throw new Error(phase);
          if (active && phase === 'start-close') grid.destroy();
          if (active && phase === 'start-cancel') grid.cancelEdit({ silent: true });
        });
        let opened, thrown;
        try { opened = grid.startEdit(1, 'name'); } catch (error) { thrown = error.message; }
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        const first = { opened, thrown, nested, created, disposed, focused, starts,
          hosts: document.querySelectorAll('.dui-grid__editor-host').length,
          markers: document.querySelectorAll('.dui-grid__cell--editing').length };
        active = false;
        if (!grid.destroyed) {
          (grid.view ?? grid.treeView).setFilter(null, { silent: true });
          if (!grid.startEdit(1, 'name')) throw new Error(`Retry failed: ${phase}`);
          grid.destroy();
        }
        results.push({ phase, first, balanced: created === disposed });
      }
      return results;
    }, kind);
    for (const { phase, first, balanced } of results) {
      expect(first.nested).toBe(false);
      if (phase.includes('throw') || phase === 'invalid-raw') expect(first.thrown).toBeTruthy();
      else expect(first.opened).toBe(false);
      expect(first.created).toBe(first.disposed);
      expect(first.focused).toBe(0);
      expect(first.hosts).toBe(0); expect(first.markers).toBe(0);
      expect(first.starts).toBe(phase.startsWith('start-') ? 1 : 0);
      expect(balanced).toBe(true);
    }
    expect(errors).toEqual([]);
  });

  test(`${kind} editStart replacement owns its focus and silent starts stay silent`, async ({ page }) => {
    await page.goto('/browser-tests/recipes.html');
    const result = await page.evaluate(async kind => {
      const { Grid, TreeGrid, gridEditors } = await import('/src/ui/grid-api.js');
      const { TextInput } = await import('/src/ui/TextInput.js');
      const focusIds = [], destroyed = [], results = [], starts = [];
      let closing = false, duringDestroy;
      const editor = gridEditors.custom(context => {
        class Input extends TextInput {
          focus(options) { focusIds.push(context.id); return super.focus(options); }
          destroy() {
            if (!this.destroyed) destroyed.push(context.id);
            if (closing) { duringDestroy = grid.startEdit(2, 'name'); grid.destroy(); }
            super.destroy();
          }
        }
        return new Input({ value: context.value });
      });
      const grid = new ({ Grid, TreeGrid }[kind])('#root', { height: 220, columns: [{ id: 'name', width: 180, editor }] });
      grid.data.parse([{ id: 1, parentId: null, name: 'One' }, { id: 2, parentId: null, name: 'Two' }]);
      grid.events.on('editStart', event => {
        starts.push(event.id);
        if (event.id === 1) { grid.cancelEdit({ silent: true }); results.push(grid.startEdit(2, 'name')); }
      });
      results.push(grid.startEdit(1, 'name'));
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const value = document.querySelector('.dui-grid__editor-host input').value;
      grid.cancelEdit({ silent: true });
      grid.events.on('beforeEditStart', () => { throw new Error('Silent start must skip veto'); });
      const silent = grid.startEdit(1, 'name', { silent: true });
      closing = true;
      grid.destroy();
      await new Promise(resolve => requestAnimationFrame(resolve));
      return { focusIds, destroyed, results, starts, value, silent, duringDestroy };
    }, kind);
    expect(result).toEqual({ focusIds: [2], destroyed: [1, 2, 1], results: [true, false],
      starts: [1, 2], value: 'Two', silent: true, duringDestroy: false });
  });
}

test('Grid beforeEditStart can veto, close or invalidate the target before factory creation', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/browser-tests/recipes.html');
  const results = await page.evaluate(async () => {
    const { Grid, gridEditors } = await import('/src/ui/grid-api.js');
    const results = [];
    for (const action of ['veto', 'close', 'filter', 'recurse']) {
      let created = 0, nested;
      const grid = new Grid('#root', { height: 220, columns: [{ id: 'name', editor: gridEditors.text(() => { created++; return {}; }) }] });
      grid.data.parse([{ id: 1, name: 'One' }]);
      grid.events.on('beforeEditStart', event => {
        if (action === 'veto') event.cancel = true;
        if (action === 'close') grid.destroy();
        if (action === 'filter') grid.view.setFilter(() => false);
        if (action === 'recurse') { nested = grid.startEdit(1, 'name'); event.cancel = true; }
      });
      const opened = grid.startEdit(1, 'name'); grid.destroy();
      results.push({ opened, created, nested });
    }
    return results;
  });
  expect(results).toEqual([false, false, false, false].map((opened, index) => ({ opened, created: 0, nested: index === 3 ? false : undefined })));
  await page.evaluate(async () => {
    const { Grid, gridEditors } = await import('/src/ui/grid-api.js');
    window.keyboardGrid = new Grid('#root', { height: 220, columns: [{ id: 'name', editor: gridEditors.text() }] });
    keyboardGrid.data.parse([{ id: 1, name: 'One' }]);
    keyboardGrid.startEdit(1, 'name'); keyboardGrid.cancelEdit({ silent: true });
    keyboardGrid.events.on('beforeEditStart', () => keyboardGrid.destroy());
  });
  await page.locator('[role="grid"]').press('Enter');
  expect(await page.evaluate(() => keyboardGrid.destroyed)).toBe(true);
  expect(errors).toEqual([]);
});
