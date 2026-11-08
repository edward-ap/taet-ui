import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  page.on('pageerror', error => { throw error; });
  await page.goto('/browser-tests/recipes.html');
});

// Deliberately use plain Tab, including on macOS WebKit: modal containment
// must not depend on the host's full keyboard navigation preference.
test('modal Tab visits interior buttons and wraps without escaping to the document', async ({ page }) => {
  await page.evaluate(async () => {
    const { Dialog, OverlayManager } = await import('/src/ui/all.js');
    const opener = document.createElement('button');
    opener.id = 'opener'; opener.textContent = 'Open'; document.querySelector('#root').append(opener); opener.focus();
    const content = document.createElement('div');
    content.innerHTML = '<input id="first"><button id="middle">Middle</button><button id="last">Last</button>';
    window.manager = new OverlayManager();
    window.dialog = new Dialog({ manager, title: 'Containment', closeable: false, content });
    dialog.open();
  });
  await page.locator('#middle').focus();
  for (const id of ['last', 'first', 'middle', 'last']) {
    await page.keyboard.press('Tab');
    await expect(page.locator('#' + id)).toBeFocused();
  }
  for (const id of ['middle', 'first', 'last']) {
    await page.keyboard.press('Shift+Tab');
    await expect(page.locator('#' + id)).toBeFocused();
  }
  await page.keyboard.press('Escape');
  await expect(page.locator('#opener')).toBeFocused();
});

test('modal Tab includes a nested portal and ignores disabled hidden and inert controls', async ({ page }) => {
  await page.evaluate(async () => {
    const { Dialog, OverlayManager } = await import('/src/ui/all.js');
    const content = document.createElement('div');
    content.innerHTML = '<button id="first">First</button><button disabled>Disabled</button><button hidden>Hidden</button><div inert><button>Inert</button></div><button id="last">Last</button>';
    window.manager = new OverlayManager();
    window.dialog = new Dialog({ manager, title: 'Portal', closeable: false, content });
    dialog.open();
    const portal = document.createElement('div');
    portal.innerHTML = '<button id="portal-first">Portal first</button><button id="portal-last">Portal last</button>';
    manager.getRoot().append(portal);
    window.portal = { element: portal };
    manager.open(window.portal, { closeOnEscape: false });
  });
  await page.locator('#first').focus();
  for (const id of ['last', 'portal-first', 'portal-last', 'first']) {
    await page.keyboard.press('Tab');
    await expect(page.locator('#' + id)).toBeFocused();
  }
  await page.keyboard.press('Shift+Tab');
  await expect(page.locator('#portal-last')).toBeFocused();
});

test('modal Tab respects control consumption and does not run after owner teardown', async ({ page }) => {
  await page.evaluate(async () => {
    const { Dialog, OverlayManager } = await import('/src/ui/all.js');
    const content = document.createElement('div');
    content.innerHTML = '<input id="first"><button id="last">Last</button>';
    window.manager = new OverlayManager();
    window.dialog = new Dialog({ manager, title: 'Events', closeable: false, content });
    dialog.open();
    window.action = 'consume';
    content.addEventListener('keydown', event => {
      if (event.key !== 'Tab') return;
      if (action === 'consume') event.preventDefault();
      else { event.preventDefault(); dialog.destroy(); manager.destroy(); }
    });
  });
  await page.locator('#last').focus();
  await page.keyboard.press('Tab');
  await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 0)));
  await expect(page.locator('#last')).toBeFocused();
  await page.evaluate(() => { action = 'destroy'; });
  await page.keyboard.press('Tab');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('.dui-overlay-root')).toHaveCount(0);
});

test('modal does not steal Grid editor Tab validation and commit', async ({ page }) => {
  await page.evaluate(async () => {
    const { Dialog, OverlayManager, Grid, gridEditors } = await import('/src/ui/all.js');
    window.manager = new OverlayManager();
    window.grid = new Grid({ width: 400, height: 180, columnMenu: false, columns: [
      { id: 'a', editor: gridEditors.text(), sortable: false, resizable: false },
      { id: 'b', editor: gridEditors.text(), sortable: false, resizable: false }
    ] });
    grid.data.parse([{ id: 1, a: 'First', b: 'Second' }]);
    grid.events.on('beforeCellChange', event => { if (event.newValue === 'Veto') event.cancel = true; });
    window.dialog = new Dialog({ manager, title: 'Editor', closeable: false, content: grid });
    dialog.open();
    grid.startEdit(1, 'a');
  });
  const input = page.locator('.dui-grid__editor-host input');
  await input.fill('Veto');
  await page.keyboard.press('Tab');
  await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 0)));
  await expect(input).toBeFocused();
  await expect(input).toHaveValue('Veto');
  await input.fill('Saved');
  await page.keyboard.press('Tab');
  await expect(input).toBeFocused();
  await expect(input).toHaveValue('Second');
  expect(await page.evaluate(() => grid.data.get(1).a)).toBe('Saved');
});

test('nested modal and focus-triggered replacement keep the newest focus owner', async ({ page }) => {
  await page.evaluate(async () => {
    const { Dialog, OverlayManager } = await import('/src/ui/all.js');
    window.manager = new OverlayManager();
    const content = document.createElement('div');
    content.innerHTML = '<button id="parent-first">Parent first</button><button id="parent-last">Parent last</button>';
    window.parentDialog = new Dialog({ manager, title: 'Parent', closeable: false, content });
    parentDialog.open();
    const childContent = document.createElement('div');
    childContent.innerHTML = '<button id="child-first">Child first</button><button id="child-last">Child last</button>';
    window.childDialog = new Dialog({ manager, title: 'Child', closeable: false, content: childContent });
    window.replacement = new Dialog({ manager, title: 'Replacement', closeable: false });
  });
  await page.locator('#parent-first').focus();
  await page.evaluate(() => childDialog.open());
  await expect(page.getByRole('dialog', { name: 'Child', exact: true })).toBeFocused();
  for (const id of ['child-first', 'child-last', 'child-first']) {
    await page.keyboard.press('Tab');
    await expect(page.locator('#' + id)).toBeFocused();
  }
  await page.keyboard.press('Escape');
  await expect(page.locator('#parent-first')).toBeFocused();
  await page.evaluate(() => {
    document.querySelector('#parent-last').addEventListener('focus', () => {
      parentDialog.destroy();
      replacement.open();
    }, { once: true });
  });
  await page.keyboard.press('Tab');
  await expect(page.getByRole('dialog', { name: 'Replacement', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('dialog', { name: 'Replacement', exact: true })).toBeFocused();
});

test('modal preserves positive tabindex and deduplicates a contained overlay', async ({ page }) => {
  await page.evaluate(async () => {
    const { Dialog, OverlayManager } = await import('/src/ui/all.js');
    const content = document.createElement('div');
    content.innerHTML = '<button id="zero">Zero</button><div id="nested"><button id="two" tabindex="2">Two</button><button id="one" tabindex="1">One</button></div><button id="last">Last</button>';
    window.manager = new OverlayManager();
    window.dialog = new Dialog({ manager, title: 'Order', closeable: false, content });
    dialog.open();
    const nested = document.querySelector('#nested');
    manager.open({ element: nested }, { closeOnEscape: false });
  });
  // Option+Tab is full native keyboard navigation on macOS WebKit.
  for (const key of ['Tab', 'Alt+Tab']) {
    await page.getByRole('dialog').focus();
    for (const id of ['one', 'two', 'zero', 'last', 'one']) {
      await page.keyboard.press(key);
      await expect(page.locator('#' + id)).toBeFocused();
    }
    await page.keyboard.press(key === 'Tab' ? 'Shift+Tab' : 'Alt+Shift+Tab');
    await expect(page.locator('#last')).toBeFocused();
  }
});

test('modal radio groups have one Tab stop and retain form ownership', async ({ page }) => {
  await page.evaluate(async () => {
    const { Dialog, OverlayManager } = await import('/src/ui/all.js');
    const content = document.createElement('div');
    content.innerHTML = '<button id="before">Before</button><form><input type="radio" name="choice" id="a"><input type="radio" name="choice" id="b" checked><input type="radio" name="choice" id="c"></form><form><input type="radio" name="choice" id="d" checked></form><input type="radio" id="unnamed"><button id="after">After</button>';
    window.manager = new OverlayManager();
    window.dialog = new Dialog({ manager, title: 'Radios', closeable: false, content });
    dialog.open();
  });
  await page.locator('#before').focus();
  for (const id of ['b', 'd', 'unnamed', 'after']) {
    await page.keyboard.press('Tab');
    await expect(page.locator('#' + id)).toBeFocused();
  }
  for (const id of ['unnamed', 'd', 'b', 'before']) {
    await page.keyboard.press('Shift+Tab');
    await expect(page.locator('#' + id)).toBeFocused();
  }
  await page.evaluate(() => { document.querySelector('#b').checked = false; });
  await page.keyboard.press('Tab');
  await expect(page.locator('#a')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.locator('#d')).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.locator('#c')).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.locator('#before')).toBeFocused();
});

for (const kind of ['Grid', 'TreeGrid']) {
  for (const backwards of [false, true]) {
    test(`${kind} consumed editor ${backwards ? 'Shift+Tab' : 'Tab'} boundary stays inside its modal`, async ({ page }) => {
      await page.evaluate(async ({ kind, backwards }) => {
        const ui = await import('/src/ui/all.js');
        const opener = document.createElement('button');
        opener.id = 'outside'; opener.textContent = 'Outside'; document.querySelector('#root').append(opener); opener.focus();
        window.manager = new ui.OverlayManager();
        window.grid = new ui[kind]({ width: 400, height: 180, columnMenu: false, columns: [
          { id: 'a', editor: ui.gridEditors.text(), sortable: false, resizable: false },
          { id: 'b', editor: ui.gridEditors.text(), sortable: false, resizable: false }
        ] });
        grid.data.parse([{ id: 1, a: 'First', b: 'Last' }]);
        window.dialog = new ui.Dialog({ manager, title: 'Boundary', closeable: false, content: grid });
        dialog.open();
        grid.startEdit(1, backwards ? 'a' : 'b');
      }, { kind, backwards });
      await page.locator('.dui-grid__editor-host input').fill('Committed');
      await page.keyboard.press(backwards ? 'Shift+Tab' : 'Tab');
      // Include a complete post-dispatch task, not a microtask assumption.
      await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 0)));
      await expect(page.locator('.dui-grid')).toBeFocused();
      expect(await page.evaluate(backwards => grid.data.get(1)[backwards ? 'a' : 'b'], backwards)).toBe('Committed');
      await expect(page.locator('.dui-grid__editor-host input')).toHaveCount(0);
    });
  }
}

test('consumed editor Tab replacement cannot restore the old modal after dispatch', async ({ page }) => {
  await page.evaluate(async () => {
    const { Dialog, OverlayManager, Grid, gridEditors } = await import('/src/ui/all.js');
    window.manager = new OverlayManager();
    window.grid = new Grid({ width: 400, height: 180, columnMenu: false,
      columns: [{ id: 'a', editor: gridEditors.text(), sortable: false, resizable: false }] });
    grid.data.parse([{ id: 1, a: 'First' }]);
    window.dialog = new Dialog({ manager, title: 'Old', closeable: false, content: grid });
    window.replacement = new Dialog({ manager, title: 'New', closeable: false });
    dialog.open();
    grid.events.on('beforeCellChange', () => { dialog.destroy(); replacement.open(); });
    grid.startEdit(1, 'a');
  });
  await page.locator('.dui-grid__editor-host input').fill('Replace owner');
  await page.keyboard.press('Tab');
  await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 0)));
  await expect(page.getByRole('dialog', { name: 'Old', exact: true })).toHaveCount(0);
  await expect(page.getByRole('dialog', { name: 'New', exact: true })).toBeFocused();
});

for (const kind of ['Grid', 'TreeGrid']) {
  for (const editorKind of ['select', 'date']) {
    test(`${kind} final ${editorKind} popup Tab commits and stays in the surviving modal`, async ({ page }) => {
      await page.evaluate(async ({ kind, editorKind }) => {
        const ui = await import('/src/ui/all.js');
        const opener = document.createElement('button');
        opener.textContent = 'Outside'; document.querySelector('#root').append(opener); opener.focus();
        window.manager = new ui.OverlayManager();
        const options = { overlayManager: manager };
        if (editorKind === 'select') Object.assign(options, { searchable: true, items: [{ id: 1, text: 'First' }] });
        window.grid = new ui[kind]({ width: 400, height: 180, columnMenu: false,
          columns: [{ id: 'value', editor: ui.gridEditors[editorKind](options), sortable: false, resizable: false }] });
        grid.data.parse([{ id: 1, value: editorKind === 'select' ? 1 : '2026-11-01' }]);
        window.commits = 0;
        grid.events.on('editCommit', () => { commits++; });
        window.dialog = new ui.Dialog({ manager, title: 'Popup boundary', closeable: false, content: grid });
        dialog.open();
        grid.startEdit(1, 'value');
      }, { kind, editorKind });
      const popup = page.locator('.dui-dropdown-list__popup:visible, .dui-date-time-picker:visible');
      if (editorKind === 'select') {
        await page.locator('.dui-dropdown-list__display').press('ArrowDown');
        await expect(page.locator('.dui-dropdown-list__search')).toBeFocused();
      } else {
        await page.locator('.dui-date-time-input__button').click();
        await popup.locator('button').first().focus();
      }
      await expect(popup).toHaveCount(1);
      await page.keyboard.press('Tab');
      await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 0)));
      await expect(popup).toHaveCount(0);
      await expect(page.locator('.dui-grid__editor-host')).toHaveCount(0);
      await expect(page.locator('.dui-grid')).toBeFocused();
      expect(await page.evaluate(() => commits)).toBe(1);
    });
  }
}

test('modal Tab retains native summary navigation', async ({ page }) => {
  await page.evaluate(async () => {
    const { Dialog, OverlayManager } = await import('/src/ui/all.js');
    const content = document.createElement('div');
    content.innerHTML = '<button id="before">Before</button><details><summary id="summary">Details</summary>Content</details><button id="after">After</button>';
    window.dialog = new Dialog({ manager: new OverlayManager(), title: 'Summary', closeable: false, content });
    dialog.open();
  });
  await page.locator('#before').focus();
  await page.keyboard.press('Tab');
  await expect(page.locator('#summary')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('details')).toHaveAttribute('open', '');
  await page.keyboard.press('Tab');
  await expect(page.locator('#after')).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.locator('#summary')).toBeFocused();
});

for (const editable of ['true', '', 'plaintext-only']) {
  test(`modal Tab preserves native contenteditable=${JSON.stringify(editable)} hosts`, async ({ page }) => {
    await page.evaluate(async editable => {
      const { Dialog, OverlayManager } = await import('/src/ui/all.js');
      const content = document.createElement('div');
      content.innerHTML = '<button id="before">Before</button><div id="edit"><span id="inherited">Text</span><div id="nested" contenteditable="true">Nested</div><div id="explicit" contenteditable="true" tabindex="0">Explicit</div></div><div id="excluded" contenteditable="true" tabindex="-1">Programmatic only</div><div contenteditable="false">Not editable</div><button id="after">After</button>';
      content.querySelector('#edit').setAttribute('contenteditable', editable);
      window.manager = new OverlayManager();
      window.dialog = new Dialog({ manager, title: 'Editable hosts', closeable: false, content });
      dialog.open();
    }, editable);
    await page.locator('#before').focus();
    for (const id of ['edit', 'explicit', 'after', 'before']) {
      await page.keyboard.press('Tab');
      await expect(page.locator('#' + id)).toBeFocused();
    }
    for (const id of ['after', 'explicit', 'edit', 'before']) {
      await page.keyboard.press('Shift+Tab');
      await expect(page.locator('#' + id)).toBeFocused();
    }
  });
}
