import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  page.on('pageerror', error => { throw error; });
  await page.goto('/browser-tests/recipes.html');
});

for (const type of ['Grid', 'TreeGrid']) {
  test(`${type} keyboard navigation stops after renderer teardown`, async ({ page }) => {
    await page.evaluate(async type => {
      const ui = await import('/src/ui/all.js');
      window.destroyOnRender = false;
      window.navigationEvents = [];
      const owner = new ui[type]({ width: 500, height: 180, columnMenu: false,
        columns: [{ id: 'text', sortable: false, resizable: false, render(value) {
          if (window.destroyOnRender) owner.destroy();
          return value;
        } }]
      }).mount(document.querySelector('#root'));
      owner.data.parse(Array.from({ length: 40 }, (_, id) => ({ id, text: `Row ${id}` })));
      owner.events.on('activeCellChange', () => window.navigationEvents.push('cell'));
      owner.events.on('activeChange', () => window.navigationEvents.push('row'));
    }, type);
    await page.keyboard.press('Tab');
    await page.keyboard.press('ArrowDown');
    await page.evaluate(() => { window.navigationEvents = []; window.destroyOnRender = true; });
    await page.keyboard.press('End');
    await expect(page.locator('.dui-grid')).toHaveCount(0);
    expect(await page.evaluate(() => window.navigationEvents)).toEqual([]);
  });

  test(`${type} keyboard-only entry, virtual navigation, text editing and exit`, async ({ page }) => {
    await page.evaluate(async type => {
      const ui = await import('/src/ui/all.js');
      const host = document.querySelector('#root');
      new ui.Button({ text: 'Before table' }).mount(host);
      const owner = new ui[type]({ width: 500, height: 180, rowHeight: 24, treeColumnId: 'a', columnMenu: false,
        columns: [{ id: 'a', width: 200, sortable: false, resizable: false, editor: ui.gridEditors.text() },
          { id: 'b', width: 200, sortable: false, resizable: false }]
      }).mount(host);
      owner.data.parse(Array.from({ length: 40 }, (_, id) => ({ id, a: `Row ${id}`, b: 'Other' })));
      new ui.Button({ text: 'After table' }).mount(host);
      window.keyboardOwner = owner;
    }, type);
    const root = page.locator('.dui-grid');
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'Before table', exact: true })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(root).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(root).toHaveAttribute('aria-activedescendant', /.+/);
    await page.keyboard.press('End');
    await expect(root.locator('.dui-grid__cell--active')).toHaveText('Row 39');
    await page.keyboard.press('Home');
    await expect(root.locator('.dui-grid__cell--active')).toHaveText('Row 0');
    await page.keyboard.press('Enter');
    const editor = root.locator('.dui-grid__editor-host input');
    await expect(editor).toBeFocused();
    const active = await root.getAttribute('aria-activedescendant');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Home');
    await expect(editor).toBeFocused();
    await expect(root).toHaveAttribute('aria-activedescendant', active);
    await page.keyboard.press('Control+A');
    await page.keyboard.type('Cancelled draft');
    await page.keyboard.press('Escape');
    await expect(root).toBeFocused();
    expect(await page.evaluate(() => window.keyboardOwner.data.get(0).a)).toBe('Row 0');
    await page.keyboard.press('Enter');
    await expect(editor).toBeFocused();
    await page.keyboard.press('Control+A');
    await page.keyboard.type('Saved from keyboard');
    await page.keyboard.press('Enter');
    await expect(root).toBeFocused();
    expect(await page.evaluate(() => window.keyboardOwner.data.get(0).a)).toBe('Saved from keyboard');
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'After table', exact: true })).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(root).toBeFocused();
  });
}

test('Grid Tab and Shift+Tab skip hidden editable columns', async ({ page }) => {
  await page.evaluate(async () => {
    const { Grid, gridEditors } = await import('/src/ui/all.js');
    window.keyboardOwner = new Grid({ width: 500, height: 180, columnMenu: false,
      columns: ['a', 'hidden', 'c'].map(id => ({ id, hidden: id === 'hidden', sortable: false,
        resizable: false, editor: gridEditors.text() }))
    }).mount(document.querySelector('#root'));
    window.keyboardOwner.data.parse([{ id: 1, a: 'First', hidden: 'Hidden', c: 'Last' }]);
  });
  await page.keyboard.press('Tab');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('F2');
  const root = page.locator('.dui-grid');
  await expect(root.locator('[data-dui-grid-column-id="a"] input')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(root.locator('[data-dui-grid-column-id="c"] input')).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(root.locator('[data-dui-grid-column-id="a"] input')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(root).toBeFocused();
});

test('TreeGrid keyboard expands, enters a child, returns to parent and collapses', async ({ page }) => {
  await page.evaluate(async () => {
    const { TreeGrid } = await import('/src/ui/all.js');
    window.keyboardOwner = new TreeGrid({ width: 500, height: 180, treeColumnId: 'text', columnMenu: false,
      columns: [{ id: 'text', sortable: false, resizable: false }]
    }).mount(document.querySelector('#root'));
    window.keyboardOwner.data.parse([{ id: 1, text: 'Parent' }, { id: 2, parentId: 1, text: 'Child' }, { id: 3, text: 'Other root' }]);
  });
  const root = page.locator('.dui-grid');
  await page.keyboard.press('Tab');
  await page.keyboard.press('ArrowDown');
  await expect(root.locator('.dui-grid__cell--active')).toHaveText('Parent');
  await page.keyboard.press('ArrowRight');
  await expect(root.locator('.dui-active')).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('ArrowDown');
  await expect(root.locator('.dui-grid__cell--active')).toHaveText('Child');
  await page.keyboard.press('ArrowLeft');
  await expect(root.locator('.dui-grid__cell--active')).toHaveText('Parent');
  await page.keyboard.press('ArrowLeft');
  await expect(root.locator('.dui-active')).toHaveAttribute('aria-expanded', 'false');
  await expect(root.locator('.dui-grid__row')).toHaveCount(2);
});

test('TabBar keyboard skips disabled tabs and leaves the tablist in both directions', async ({ page }) => {
  await page.evaluate(async () => {
    const { Button, TabBar } = await import('/src/ui/all.js');
    const host = document.querySelector('#root');
    new Button({ text: 'Before tabs' }).mount(host);
    new TabBar({ tabs: [{ id: 'a', text: 'First' }, { id: 'disabled', text: 'Unavailable', disabled: true },
      { id: 'c', text: 'Last' }] }).mount(host);
    new Button({ text: 'After tabs' }).mount(host);
  });
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Before tabs', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('tab', { name: 'First', exact: true })).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'Last', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('tab', { name: 'Last', exact: true })).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('Home');
  await expect(page.getByRole('tab', { name: 'First', exact: true })).toBeFocused();
  await page.keyboard.press('End');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'After tabs', exact: true })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('tab', { name: 'Last', exact: true })).toBeFocused();
});

test('Dialog Form supports keyboard text, choice, checkbox, focus trap and return to opener', async ({ page }) => {
  await page.evaluate(async () => {
    const { Button, Form, TextInput, SelectInput, CheckBox, Dialog, OverlayManager } = await import('/src/ui/all.js');
    const manager = new OverlayManager();
    const form = new Form();
    form.row(new TextInput({ name: 'name', label: 'Name' }));
    const country = new SelectInput({ name: 'country', label: 'Country', searchable: true, overlayManager: manager });
    country.data.parse([{ id: 'ca', text: 'Canada' }, { id: 'us', text: 'United States' }]);
    form.row(country);
    form.row(new CheckBox({ name: 'notify', label: 'Notify' }));
    window.keyboardForm = form;
    window.keyboardDialog = new Dialog({ manager, title: 'Keyboard form', content: form, destroyContent: true, closeable: false });
    new Button({ text: 'Open form', onClick: () => window.keyboardDialog.open() }).mount(document.querySelector('#root'));
  });
  const dialog = page.getByRole('dialog', { name: 'Keyboard form' });
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  await expect(dialog).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('textbox', { name: 'Name', exact: true })).toBeFocused();
  await page.keyboard.type('Keyboard user');
  await page.keyboard.press('Tab');
  await expect(page.locator('.dui-dropdown-list__display')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('.dui-dropdown-list__search')).toBeFocused();
  await page.keyboard.type('Canada');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  expect(await page.evaluate(() => window.keyboardForm.value.get().country)).toBe('ca');
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(page.locator('.dui-dropdown-list__search')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeVisible();
  await expect(page.locator('.dui-dropdown-list__display')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Open list' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('checkbox', { name: 'Notify' })).toBeFocused();
  await page.keyboard.press('Space');
  expect(await page.evaluate(() => window.keyboardForm.value.get())).toEqual({ name: 'Keyboard user', country: 'ca', notify: true });
  await page.keyboard.press('Tab');
  await expect(page.getByRole('textbox', { name: 'Name', exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('button', { name: 'Open form', exact: true })).toBeFocused();
});
