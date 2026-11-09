import { expect, test } from '@playwright/test';

test('Grid checkbox click and switch Space validate before writing with user provenance', async ({ page }) => {
  await page.goto('/browser-tests/recipes.html');
  await page.evaluate(async () => {
    const { Grid, gridEditors } = await import('/src/ui/grid-api.js');
    window.blocked = true; window.phases = [];
    const options = { validators: [() => window.blocked ? 'Blocked' : null] };
    window.grid = new Grid('#root', { height: 220, columns: [
      { id: 'check', width: 160, editor: gridEditors.checkbox(options) },
      { id: 'switch', width: 160, editor: gridEditors.switch(options) }
    ] });
    grid.data.parse([{ id: 1, check: false, switch: false }]);
    for (const type of ['editReject', 'cellChange', 'editCommit']) grid.events.on(type,
      event => phases.push([type, event.columnId, event.origin, event.userAction]));
  });
  await page.locator('.dui-grid__cell[data-dui-grid-column-id="check"]').click();
  expect(await page.evaluate(() => grid.data.get(1).check)).toBe(false);
  await page.evaluate(() => { window.blocked = false; });
  await page.locator('.dui-grid__cell[data-dui-grid-column-id="check"]').click();
  expect(await page.evaluate(() => grid.data.get(1).check)).toBe(true);
  await page.locator('.dui-grid__cell[data-dui-grid-column-id="switch"]').click();
  await page.keyboard.press('Space');
  expect(await page.evaluate(() => grid.data.get(1).switch)).toBe(false);
  const phases = await page.evaluate(() => phases);
  expect(phases).toHaveLength(7);
  expect(phases[0]).toEqual(['editReject', 'check', 'user', true]);
  expect(phases.every(event => event[2] === 'user' && event[3] === true)).toBe(true);
  await page.evaluate(() => grid.destroy());
});

test('Grid dispatched paste updates rendered cells and cut cannot clear a handler-selected range', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/browser-tests/recipes.html');
  const result = await page.evaluate(async () => {
    const { Grid, gridEditors } = await import('/src/ui/grid-api.js');
    window.grid = new Grid('#root', { height: 220, columns: [{ id: 'name', width: 180, editor: gridEditors.text() }] });
    grid.data.parse([{ id: 1, name: 'One' }, { id: 2, name: 'Two' }]);
    const range = id => ({ anchor: { rowId: id, columnId: 'name' }, focus: { rowId: id, columnId: 'name' } });
    grid.setCellRanges(range(1));
    const phases = [];
    grid.events.on('clipboardPaste', event => phases.push([event.changed, event.origin, event.userAction]));
    const data = new DataTransfer(); data.setData('text/plain', 'Pasted');
    // Firefox's synthetic ClipboardEvent ignores constructor clipboardData.
    // Inject the payload on a DOM event; still exercise the registered handler.
    const paste = new Event('paste', { bubbles: true, cancelable: true });
    Object.defineProperty(paste, 'clipboardData', { value: data });
    grid.element.dispatchEvent(paste);
    grid.events.on('clipboardCut', event => {
      event.ranges[0].anchor.rowId = 2; event.ranges[0].focus.rowId = 2;
      grid.setCellRanges(event.ranges);
    });
    const cutData = new DataTransfer();
    const cut = new Event('cut', { bubbles: true, cancelable: true });
    Object.defineProperty(cut, 'clipboardData', { value: cutData });
    grid.element.dispatchEvent(cut);
    return { phases, copied: cutData.getData('text/plain'), names: grid.data.all().map(row => row.name) };
  });
  expect(result).toEqual({ phases: [[1, 'user', true]], copied: 'Pasted', names: ['Pasted', 'Two'] });
  await expect(page.locator('.dui-grid__cell[data-dui-grid-column-id="name"]').first()).toContainText('Pasted');
  await page.evaluate(() => grid.destroy());
  expect(errors).toEqual([]);
});

test('Grid temporary paste editor preserves a mounted replacement opened from validation', async ({ page }) => {
  await page.goto('/browser-tests/recipes.html');
  const result = await page.evaluate(async () => {
    const { Grid, gridEditors } = await import('/src/ui/grid-api.js');
    let grid, disposed = 0;
    grid = new Grid('#root', { height: 220, columns: [
      { id: 'name', width: 180, editor: gridEditors.custom(context => ({ mount() {}, focus() {}, getValidationRevision: () => 0,
        validate() { grid.startEdit(2, 'other'); return { ok: true }; },
        getValue: () => context.value, destroy() { disposed++; }
      })) },
      { id: 'other', width: 180, editor: gridEditors.text() }
    ] });
    grid.data.parse([{ id: 1, name: 'One', other: 'A' }, { id: 2, name: 'Two', other: 'B' }]);
    grid.setCellRanges({ anchor: { rowId: 1, columnId: 'name' }, focus: { rowId: 1, columnId: 'name' } });
    const applied = grid.pasteClipboardText('New');
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const result = { applied, disposed, name: grid.data.get(1).name,
      inputs: grid.element.querySelectorAll('.dui-grid__editor-host input').length,
      focused: document.activeElement?.value };
    grid.destroy(); return result;
  });
  expect(result).toEqual({ applied: false, disposed: 1, name: 'One', inputs: 1, focused: 'B' });
});

test('Grid dispatched paste may close the table after the first write without batch or DOM errors', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/browser-tests/recipes.html');
  const result = await page.evaluate(async () => {
    const { Grid, gridEditors } = await import('/src/ui/grid-api.js');
    const grid = new Grid('#root', { height: 220, columns: [{ id: 'name', editor: gridEditors.text() }] });
    grid.data.parse([{ id: 1, name: 'One' }, { id: 2, name: 'Two' }]);
    grid.setCellRanges({ anchor: { rowId: 1, columnId: 'name' }, focus: { rowId: 1, columnId: 'name' } });
    let writes = 0; grid.events.on('cellChange', () => { writes++; grid.destroy(); });
    const data = new DataTransfer(); data.setData('text/plain', 'New\nLater');
    // Firefox's synthetic ClipboardEvent ignores constructor clipboardData.
    // Inject the payload on a DOM event; still exercise the registered handler.
    const paste = new Event('paste', { bubbles: true, cancelable: true });
    Object.defineProperty(paste, 'clipboardData', { value: data });
    grid.element.dispatchEvent(paste);
    await new Promise(resolve => requestAnimationFrame(resolve));
    return { writes, destroyed: grid.destroyed, hosts: document.querySelectorAll('.dui-grid__editor-host').length };
  });
  expect(result).toEqual({ writes: 1, destroyed: true, hosts: 0 });
  expect(errors).toEqual([]);
});
