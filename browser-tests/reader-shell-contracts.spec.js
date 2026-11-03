import { test, expect } from '@playwright/test';
test('observed edge gestures preserve child input, capture, scroll and drag', async ({ page }) => {
  await page.goto('/browser-tests/recipes.html');
  await page.evaluate(async () => {
    const { EdgeActionLayer } = await import('/src/ui/experimental.js');
    const { Panel, IconButton } = await import('/src/ui/index.js');
    window.owner = new Panel('#root', { width: 600, height: 300 });
    owner.element.style.position = 'relative';
    window.child = document.createElement('div'); child.style.cssText = 'height:100%;width:100%;background:#ddd'; owner.element.append(child);
    window.hits = []; window.presses = 0;
    child.addEventListener('pointerdown', event => { presses++; child.setPointerCapture(event.pointerId); });
    window.layer = new EdgeActionLayer({ parent: owner, observe: true, left: { action: () => hits.push('left') }, right: { action: () => hits.push('right') } });
    window.button = new IconButton({ text: 'Toggle', icon: 'add', pressed: false }); owner.add(button); button.element.style.cssText = 'position:absolute;left:20px;top:20px';
  });
  const r = await page.locator('#root > .dui-panel').boundingBox();
  await page.mouse.click(r.x + 40, r.y + 160); expect(await page.evaluate(() => hits)).toEqual(['left']); expect(await page.evaluate(() => presses)).toBe(1);
  await page.mouse.move(r.x + 540, r.y + 160); await page.mouse.down(); await page.mouse.move(r.x + 460, r.y + 160, { steps: 8 }); await page.mouse.up();
  expect(await page.evaluate(() => hits)).toEqual(['left']);
  await page.getByRole('button', { name: 'Toggle' }).click(); expect(await page.evaluate(() => hits)).toEqual(['left']);
  await page.evaluate(() => button.setPressed(true)); await expect(page.getByRole('button', { name: 'Toggle' })).toHaveAttribute('aria-pressed', 'true');
  await page.evaluate(() => owner.setSize(800, 300)); expect((await page.locator('[data-edge=right]').boundingBox()).width).toBe(200);
  await page.evaluate(() => owner.destroy()); await expect(page.locator('.dui-edge-action-layer')).toHaveCount(0);
});
test('TreeExplorer public renderers, hidden header and drag persist through provider', async ({ page }) => {
  await page.goto('/browser-tests/recipes.html');
  await page.evaluate(async () => {
    const { TreeExplorer } = await import('/src/ui/experimental.js');
    window.tree = new TreeExplorer('#root', { width: 500, height: 400, dragDrop: true, showHeader: false, rowHeight: 36,
      items: [{ id: 'a', name: 'First', kind: 'folder' }, { id: 'b', name: 'Second', kind: 'folder' }, { id: 'file', parentId: 'a', name: 'File', kind: 'file', progress: '37%' }],
      renderName: item => { const node = document.createElement('span'); node.dataset.resource = item.id; node.textContent = item.name; return node; },
      renderDetail: item => item.progress ?? '' });
  });
  await expect(page.locator('.dui-tree-explorer__header')).toBeHidden();
  await expect(page.locator('.dui-tree-explorer')).toContainText('37%');
  // An unselected row is rebuilt by selection; menu placement must use the live button.
  const actions = page.getByRole('button', { name: 'Actions for File', exact: true });
  await actions.hover();
  const anchor = await actions.boundingBox();
  await actions.click();
  const menu = await page.getByRole('menu').boundingBox();
  expect(Math.abs(menu.x - anchor.x)).toBeLessThan(2);
  expect(Math.abs(menu.y - (anchor.y + anchor.height))).toBeLessThan(2);
  await page.keyboard.press('Escape');
  await page.locator('[data-resource=file]').dragTo(page.locator('[data-resource=b]'));
  await expect.poll(() => page.evaluate(() => tree.getResources().find(item => item.id === 'file').parentId)).toBe('b');
  await page.evaluate(() => tree.destroy()); await expect(page.locator('.dui-tree-explorer')).toHaveCount(0);
});
test('DockLayout can omit restore strips when the host supplies a restore action', async ({ page }) => {
  await page.goto('/browser-tests/recipes.html');
  await page.evaluate(async () => {
    const { DockLayout } = await import('/src/ui/experimental.js');
    const { Panel } = await import('/src/ui/index.js');
    window.dock = new DockLayout('#root', { width: 800, height: 500, showRestoreStrips: false, areaSizes: { left: 220 } });
    window.left = dock.addPanel({ name: 'left', title: 'Left', area: 'left' });
    window.center = new Panel({ width: '100%', height: '100%' });
    dock.addPanel({ name: 'center', area: 'center', content: center });
    dock.collapsePanel(left);
  });
  expect(await page.evaluate(() => center.element.clientWidth)).toBeGreaterThan(790);
  await expect(page.locator('.dui-dock-strip--left')).toBeHidden();
  await page.evaluate(() => dock.expandPanel(left));
  await expect(page.locator('section[data-dui-control-id=left]')).toBeVisible();
  await page.evaluate(() => dock.destroy());
});
