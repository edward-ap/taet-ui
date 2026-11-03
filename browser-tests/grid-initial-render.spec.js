import { expect, test } from '@playwright/test';

const frames = page => page.evaluate(async () => {
  for (let i = 0; i < 4; i++) await new Promise(requestAnimationFrame);
});

async function setup(page, kind, options = {}) {
  await page.goto('/browser-tests/recipes.html');
  return page.evaluate(async ({ kind, options }) => {
    const { Grid, TreeGrid, gridEditors } = await import('/src/ui/grid-api.js');
    const { count = 1000, cols = 100, mode = 'visible', intrinsic = false, frozen = false,
      destroyAfterMount = false, editAfterMount = false, ...settings } = options;
    window.host = document.createElement('div');
    if (mode === 'hidden') host.hidden = true;
    if (mode !== 'detached') document.querySelector('#root').append(host);
    const Control = kind === 'Grid' ? Grid : TreeGrid;
    window.grid = new Control({ name: 'preloadedGrid', width: 800, height: 400, rowHeight: 24,
      columnMenu: false, columnReorder: false, treeColumnId: 'c0',
      expandedIds: Array.from({ length: Math.ceil(count / 100) }, (_, i) => `r${i * 100}`),
      ...settings,
      columns: Array.from({ length: cols }, (_, c) => ({ id: `c${c}`, title: `Column ${c}`,
        width: intrinsic && c === 0 ? 'max-content' : 120,
        frozen: frozen && c === 0 ? 'left' : frozen && c === cols - 1 ? 'right' : null,
        editor: c === 1 ? gridEditors.text() : undefined }))
    });
    grid.data.parse(Array.from({ length: count }, (_, r) => ({ id: `r${r}`,
      parentId: kind === 'TreeGrid' && r % 100 ? `r${r - r % 100}` : null,
      ...Object.fromEntries(Array.from({ length: cols }, (_, c) => [`c${c}`, `R${r} C${c}`])) })));
    window.renderCounts = [];
    const render = grid._renderRows.bind(grid);
    grid._renderRows = (...args) => {
      const result = render(...args);
      renderCounts.push(grid._body?.querySelectorAll('.dui-grid__cell').length ?? 0);
      return result;
    };
    grid.mount(host);
    const result = { rows: host.querySelectorAll('.dui-grid__row').length,
      cells: host.querySelectorAll('.dui-grid__cell').length,
      text: host.textContent, renderCounts };
    if (editAfterMount) {
      if (!grid.startEdit('r5', 'c1')) throw new Error('Editor did not open after mount');
      const input = host.querySelector('.dui-grid__editor-host input');
      input.value = 'Draft'; input.dispatchEvent(new Event('input', { bubbles: true }));
      window.initialEditor = input;
    }
    if (destroyAfterMount) {
      grid.data.update('r0', { c0: 'Queued' }); grid.destroy(); host.remove();
    }
    return result;
  }, { kind, options });
}

for (const kind of ['Grid', 'TreeGrid']) {
  test(`${kind}: preloaded wide mount bounds temporary DOM and renders synchronously`, async ({ page }) => {
    const initial = await setup(page, kind, { count: 10000, frozen: true });
    expect(initial.rows).toBeGreaterThan(0);
    expect(initial.cells).toBeLessThan(650);
    expect(initial.text).toContain('R0 C0');
    expect(initial.text).toContain('R0 C99');
    await frames(page);
    expect(await page.evaluate(() => Math.max(...renderCounts))).toBeLessThan(650);
    if (kind === 'TreeGrid') await expect(page.locator('[data-dui-grid-row-id="string:r1"]')).toHaveAttribute('aria-level', '2');
  });

  for (const mode of ['hidden', 'detached']) {
    test(`${kind}: ${mode} host materializes the viewport when shown`, async ({ page }) => {
      await setup(page, kind, { mode });
      await page.evaluate(() => {
        grid.data.update('r0', { c0: 'Updated before showing' }, { silent: true });
        if (!host.isConnected) document.querySelector('#root').append(host);
        host.hidden = false;
      });
      await frames(page);
      await expect(page.locator('[data-dui-grid-row-id="string:r0"] [data-dui-grid-column-id="c0"]')).toHaveText('Updated before showing');
      expect(await page.locator('.dui-grid__cell').count()).toBeLessThan(650);
      await page.locator('.dui-grid__body').evaluate(body => { body.scrollTop = body.scrollHeight; body.scrollLeft = body.scrollWidth; });
      await expect(page.locator('[data-dui-grid-row-id="string:r999"] [data-dui-grid-column-id="c99"]')).toHaveText('R999 C99');
    });
  }

  test(`${kind}: manual refresh updates a newly attached host without ResizeObserver`, async ({ page }) => {
    await setup(page, kind, { mode: 'detached', observeResize: false });
    const result = await page.evaluate(() => {
      document.querySelector('#root').append(host);
      grid.data.update('r0', { c0: 'Refreshed' }, { silent: true });
      grid.refresh();
      return { cells: host.querySelectorAll('.dui-grid__cell').length, text: host.textContent };
    });
    expect(result.cells).toBeLessThan(650);
    expect(result.text).toContain('Refreshed');
  });

  test(`${kind}: intrinsic widths keep all columns`, async ({ page }) => {
    const initial = await setup(page, kind, { count: 100, intrinsic: true });
    expect(initial.cells).toBe(initial.rows * 100);
    expect(initial.text).toContain('R0 C99');
    await frames(page);
    expect(await page.evaluate(() => host.querySelectorAll('.dui-grid__cell').length)).toBe(
      await page.evaluate(() => host.querySelectorAll('.dui-grid__row').length * 100));
  });

  test(`${kind}: nonvirtual rendering still exposes every cell`, async ({ page }) => {
    const initial = await setup(page, kind, { count: 20, cols: 30, virtualRows: false, virtualColumns: false });
    expect(initial.rows).toBe(20); expect(initial.cells).toBe(600);
    expect(initial.text).toContain('R19 C29');
  });

  test(`${kind}: preloaded editor survives initial resize and commits`, async ({ page }) => {
    await setup(page, kind, { editAfterMount: true });
    const input = page.locator('.dui-grid__editor-host input');
    await frames(page);
    expect(await page.evaluate(() => initialEditor === host.querySelector('.dui-grid__editor-host input'))).toBe(true);
    await expect(input).toHaveValue('Draft');
    await input.press('Enter');
    expect(await page.evaluate(() => grid.data.get('r5').c1)).toBe('Draft');
  });

  test(`${kind}: immediate destroy cancels startup work`, async ({ page }) => {
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await setup(page, kind, { destroyAfterMount: true });
    await frames(page);
    expect(await page.locator('.dui-grid').count()).toBe(0);
    expect(await page.evaluate(() => grid._windowRenderer.frame)).toBeNull();
    expect(errors).toEqual([]);
  });
}
