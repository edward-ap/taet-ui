import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/browser-tests/recipes.html');
  await page.evaluate(() => {
    document.body.innerHTML = '<div id="root" style="height:300px;width:500px"></div>';
  });
});

async function mount(page, type, options = {}) {
  await page.evaluate(async ({ type, options }) => {
    const ui = await import('/src/ui/all.js');
    window.control = new ui[type]({ label: 'Records', expandAll: true, ...options })
      .mount(document.querySelector('#root'));
    control.data.parse([
      { id: 'r', text: 'Root', parentId: null },
      { id: 'a', text: 'Alpha', parentId: type === 'TreeList' ? 'r' : null }
    ]);
    // expandAll in constructor applies to records present at construction.
    if (type === 'TreeList') control.expandAll({ silent: true });
    window.seen = [];
    for (const name of ['itemClick', 'itemDblClick', 'selectionChange', 'expand', 'collapse']) {
      control.events.on(name, () => seen.push(name));
    }
  }, { type, options });
}

async function physicalClick(page, locator, double = false) {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  // Do not force a locator click or dispatch a synthetic DOM event. Real users
  // can hit-test a disabled ARIA collection even though Playwright refuses it.
  await page.mouse[double ? 'dblclick' : 'click'](box.x + box.width / 2, box.y + box.height / 2);
}

for (const type of ['List', 'TreeList']) {
  test(`${type} disabled blocks real pointer click and double-click callbacks, reenable restores them`, async ({ page }) => {
    await mount(page, type);
    await page.evaluate(() => control.disable());
    const row = page.getByRole(type === 'List' ? 'option' : 'treeitem', { name: 'Alpha', exact: true });
    await physicalClick(page, row);
    await physicalClick(page, row, true);
    expect(await page.evaluate(() => ({ events: seen, selected: control.selection.get() })))
      .toEqual({ events: [], selected: [] });
    await page.evaluate(() => control.enable());
    await row.click();
    expect(await page.evaluate(() => control.selection.get().map(x => x.id))).toEqual(['a']);
    expect(await page.evaluate(() => seen)).toContain('itemClick');
  });

  test(`${type} disabled still accepts programmatic data and selection updates`, async ({ page }) => {
    await mount(page, type);
    expect(await page.evaluate(() => {
      control.disable();
      control.data.update('a', { text: 'Updated' });
      control.selection.set([control.data.get('a')]);
      return { text: control.element.textContent, selected: control.selection.get().map(x => x.id) };
    })).toEqual({ text: expect.stringContaining('Updated'), selected: ['a'] });
  });

  test(`${type} disabling inside selection callback stops trailing click callback`, async ({ page }) => {
    await mount(page, type);
    await page.evaluate(() => control.events.on('selectionChange', () => control.disable()));
    await page.getByRole(type === 'List' ? 'option' : 'treeitem', { name: 'Alpha', exact: true }).click();
    expect(await page.evaluate(() => seen)).not.toContain('itemClick');
  });
}

for (const expandOnClick of [false, true]) {
  test(`TreeList disabled expansion blocked for ${expandOnClick ? 'row' : 'toggle'} click, API expansion remains available`, async ({ page }) => {
    await mount(page, 'TreeList', { expandOnClick });
    await page.evaluate(() => control.disable());
    const row = page.getByRole('treeitem', { name: 'Root', exact: true });
    await physicalClick(page, expandOnClick ? row : row.locator('[data-dui-tree-toggle]'));
    expect(await page.evaluate(() => ({ expanded: control.isExpanded('r'), events: seen })))
      .toEqual({ expanded: true, events: [] });
    expect(await page.evaluate(() => {
      control.collapse('r');
      const collapsed = !control.isExpanded('r');
      control.expand('r');
      return collapsed && control.isExpanded('r');
    })).toBe(true);
  });
}
