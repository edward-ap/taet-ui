import { test, expect } from '@playwright/test';

test('Layout splitter supplies both base size and adjacent-cell metadata', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/browser-tests/recipes.html');
  await page.evaluate(async () => {
    const { Layout } = await import('/src/ui/all.js');
    const host = document.createElement('div'); document.body.append(host);
    window.layoutEvents = [];
    window.layout = new Layout(host, { name: 'size-contract', width: 600, height: 180,
      cols: [{ id: 'left', width: 200 }, { id: 'right' }],
      onResize(event) {
        layoutEvents.push({ width: event.width, height: event.height, oldSize: event.oldSize,
          newSize: event.newSize, reason: event.reason, beforeCellId: event.beforeCellId,
          beforeSize: event.beforeSize });
      }
    });
  });
  const splitter = page.locator('[data-dui-control-id="size-contract"] .dui-layout-splitter');
  const rect = await splitter.boundingBox(); expect(rect).not.toBeNull();
  await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2);
  await page.mouse.down(); await page.mouse.move(rect.x + 35, rect.y + rect.height / 2); await page.mouse.up();
  const events = await page.evaluate(() => { const events = layoutEvents; layout.destroy(); return events; });
  const split = events.find(event => event.reason === 'splitter');
  expect(split).toMatchObject({ width: 600, height: 180, oldSize: { width: 600, height: 180 },
    newSize: { width: 600, height: 180 }, beforeCellId: 'left' });
  expect(split.beforeSize).toBeGreaterThan(200); expect(errors).toEqual([]);
});

test('PropertyGrid does not focus a cancelled or destroyed editor in a later microtask', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/browser-tests/recipes.html');
  const result = await page.evaluate(async () => {
    const { PropertyGrid, gridEditors } = await import('/src/ui/all.js');
    let focused = 0, destroyed = 0;
    const make = action => {
      const grid = new PropertyGrid({ source: [{ properties: [{ name: 'x', type: 'custom', value: 'X',
        editor: gridEditors.custom(() => ({
          mount(host) { host.append(document.createElement('input')); }, getValue() { return 'X'; },
          validate() { return { ok: true }; }, focus() { focused++; }, destroy() { destroyed++; }
        }))
      }] }] });
      const host = document.createElement('div'); document.body.append(host); grid.mount(host);
      grid.events.on('editStart', () => action(grid)); return grid;
    };
    const cancelled = make(grid => grid.cancelEdit()); cancelled.startEdit('x');
    const closed = make(grid => grid.destroy()); closed.startEdit('x');
    await Promise.resolve(); cancelled.destroy(); return { focused, destroyed };
  });
  expect(result).toEqual({ focused: 0, destroyed: 2 }); expect(errors).toEqual([]);
});
