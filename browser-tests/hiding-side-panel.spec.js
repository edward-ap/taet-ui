import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/browser-tests/recipes.html');
  await page.evaluate(async () => {
    const { Panel, TextInput } = await import('/src/ui/index.js');
    const { HidingSidePanel } = await import('/src/ui/experimental.js');
    window.owner = new Panel('#root', { width: 800, height: 500 });
    owner.element.style.position = 'relative';
    window.canvas = document.createElement('div');
    canvas.style.cssText = 'width:100%;height:100%;background:#ccc';
    owner.element.append(canvas);
    window.side = new HidingSidePanel({ title: 'Library', panelWidth: 260 });
    owner.add(side);
    side.add(new TextInput({ name: 'query', label: 'Search' }));
    window.changes = [];
    side.events.on('placementChange', event => changes.push(event.value));
  });
});

test('overlay reserves zero space, preserves live controls, focus and external popup interaction', async ({ page }) => {
  const geometry = () => page.evaluate(() => ({ width: canvas.clientWidth, height: canvas.clientHeight, x: canvas.getBoundingClientRect().x }));
  const before = await geometry();
  const tab = page.getByRole('button', { name: 'Library', exact: true });
  const input = page.getByRole('textbox', { name: 'Search' });
  await expect(input).toBeHidden();
  await tab.click(); await input.fill('preserved');
  expect(await geometry()).toEqual(before);
  await page.evaluate(() => {
    const popup = document.createElement('button'); popup.textContent = 'Portalled menu'; document.body.append(popup);
  });
  await page.getByRole('button', { name: 'Portalled menu' }).click();
  await expect(input).toBeVisible();
  await input.press('Escape');
  await expect(tab).toBeFocused(); await expect(input).toBeHidden();
  await tab.press('Enter'); await expect(input).toHaveValue('preserved');
  const box = await page.locator('#root').boundingBox();
  await page.mouse.click(box.x + 650, box.y + 200);
  await expect(input).toBeHidden(); expect(await geometry()).toEqual(before);
  await page.evaluate(() => owner.destroy());
  await expect(tab).toHaveCount(0);
});

test('drag tab changes height and edge once, never opens it, survives host resize', async ({ page }) => {
  const tab = page.getByRole('button', { name: 'Library', exact: true });
  const start = await tab.boundingBox();
  const root = await page.locator('#root').boundingBox();
  await page.mouse.move(start.x + 8, start.y + 34); await page.mouse.down();
  await page.mouse.move(root.x + 795, root.y + 400, { steps: 12 }); await page.mouse.up();
  expect(await page.evaluate(() => side.side)).toBe('right');
  expect(await page.evaluate(() => side.opened)).toBe(false);
  expect(await page.evaluate(() => changes.length)).toBe(1);
  await tab.click(); await expect(tab).toHaveAttribute('aria-expanded', 'true');
  await page.evaluate(() => owner.setSize(180, 130));
  await expect.poll(async () => (await tab.boundingBox()).y).toBeLessThan(root.y + 130);
  const drawer = await page.locator('.dui-hiding-side-panel__drawer').boundingBox();
  expect(drawer.width).toBeLessThanOrEqual(160);
  await tab.press('Alt+ArrowLeft');
  expect(await page.evaluate(() => side.side)).toBe('left');
  await tab.press('Alt+ArrowUp');
  expect(await page.evaluate(() => side.tabPosition)).toBeLessThan(1);
});

test('resize, cancellation, silent updates and reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.evaluate(() => side.setOpen(true, { silent: true }));
  const separator = page.getByRole('separator');
  await separator.press('ArrowRight'); expect(await page.evaluate(() => side.panelWidth)).toBe(270);
  const box = await separator.boundingBox();
  await page.mouse.move(box.x + 2, box.y + 100); await page.mouse.down();
  await page.mouse.move(box.x + 62, box.y + 100, { steps: 4 }); await page.mouse.up();
  expect(await page.evaluate(() => side.panelWidth)).toBe(330);
  const tab = page.getByRole('button', { name: 'Library', exact: true });
  const position = await page.evaluate(() => side.tabPosition);
  const t = await tab.boundingBox();
  await tab.evaluate(el => el.addEventListener('pointerdown', e => el.dataset.testPointerId = String(e.pointerId), { once: true }));
  await page.mouse.move(t.x + 8, t.y + 34); await page.mouse.down(); await page.mouse.move(t.x + 8, t.y + 110);
  await tab.dispatchEvent('pointercancel', { pointerId: Number(await tab.getAttribute('data-test-pointer-id')) }); await page.mouse.up();
  expect(await page.evaluate(() => side.tabPosition)).toBe(position);
  expect(await page.evaluate(() => getComputedStyle(document.querySelector('.dui-hiding-side-panel__drawer')).transitionDuration)).toBe('0s');
  await page.evaluate(() => side.disable()); await expect(tab).toBeDisabled();
  await page.evaluate(() => owner.destroy());
});
