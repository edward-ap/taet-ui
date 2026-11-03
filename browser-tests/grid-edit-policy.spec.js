import { test, expect } from '@playwright/test';

async function setup(page, kind) {
  page.on('pageerror', error => { throw error; });
  await page.goto('/browser-tests/recipes.html');
  await page.evaluate(async kind => {
    const api = await import('/src/ui/grid-api.js');
    const { Button } = await import('/src/ui/Button.js');
    const host = document.querySelector('#root');
    new Button({ text:'Before table' }).mount(host);
    const editor = api.gridEditors.text({ validators:[value => value !== '' || 'Required'] });
    window.grid = new api[kind](host, { width:700, height:240, columnMenu:false,
      columns:[{ id:'a', width:180, sortable:true, editor },
        { id:'hidden', width:80, hidden:true, editor },
        { id:'readonly', width:100, readOnly:true, editor },
        { id:'plain', width:100 }, { id:'b', width:180, editor }] });
    grid.data.parse([{ id:1, a:'A1', b:'B1', hidden:'H1', readonly:'R1', plain:'P1' },
      { id:2, a:'Z2', b:'B2', hidden:'H2', readonly:'R2', plain:'P2' }]);
    window.api = api;
    new Button({ text:'After table' }).mount(host);
  }, kind);
}

for (const kind of ['Grid', 'TreeGrid']) {
  test(`${kind} shared keyboard edit policy skips unavailable cells and exits both boundaries`, async ({ page }) => {
    await setup(page, kind);
    const root = page.locator('.dui-grid');
    const input = page.locator('.dui-grid__editor-host input');
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name:'Before table', exact:true })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(root).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('F2');
    await expect(input).toBeFocused();
    await input.fill('Saved');
    await page.keyboard.press('Tab');
    await expect(input).toHaveValue('B1');
    await expect(input).toBeFocused();
    expect(await page.evaluate(() => grid.data.get(1).a)).toBe('Saved');
    await page.keyboard.press('Shift+Tab');
    await expect(input).toHaveValue('Saved');
    await expect(input).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(root).toBeFocused();
    await page.keyboard.press('End');
    for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowRight');
    await page.keyboard.press('F2');
    await expect(input).toHaveValue('B2');
    await expect(input).toBeFocused();
    await input.fill('Last saved');
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name:'After table', exact:true })).toBeFocused();
    expect(await page.evaluate(() => grid.data.get(2).b)).toBe('Last saved');
    await page.keyboard.press('Shift+Tab');
    await expect(root).toBeFocused();
    await page.keyboard.press('Home');
    for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('Enter');
    await expect(input).toHaveValue('Saved');
    await expect(input).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(page.getByRole('button', { name:'Before table', exact:true })).toBeFocused();
    await expect(input).toHaveCount(0);
  });

  test(`${kind} invalid or vetoed Tab retains its draft and editor focus`, async ({ page }) => {
    await setup(page, kind);
    await page.evaluate(() => {
      grid.events.on('beforeCellChange', event => { if (event.newValue === 'Veto') event.cancel = true; });
      grid.startEdit(1, 'a');
    });
    const input = page.locator('.dui-grid__editor-host input');
    await input.fill('');
    await input.press('Tab');
    await expect(input).toBeFocused();
    await expect(input).toHaveValue('');
    expect(await page.evaluate(() => grid.data.get(1).a)).toBe('A1');
    await input.press('Enter');
    await expect(input).toBeFocused();
    await input.fill('Veto');
    await input.press('Shift+Tab');
    await expect(input).toBeFocused();
    await expect(input).toHaveValue('Veto');
    await input.fill('Valid');
    await input.press('Tab');
    await expect(input).toHaveValue('B1');
    await expect(input).toBeFocused();
    await input.press('Escape');
    await expect(page.locator('.dui-grid')).toBeFocused();
  });

  test(`${kind} composition and prevented keys never start, commit or cancel an edit`, async ({ page }) => {
    await setup(page, kind);
    const result = await page.evaluate(() => {
      grid.setSelectedIds([1]);
      for (const options of [{ isComposing:true }, { keyCode:229 }, { prevented:true }]) {
        const event = new KeyboardEvent('keydown', { key:'F2', bubbles:true, cancelable:true, ...options });
        if (options.prevented) event.preventDefault();
        grid.element.dispatchEvent(event);
        if (grid._editing) throw new Error('Composition started editing');
      }
      grid.startEdit(1, 'a');
      const input = grid._editing.cell.querySelector('input');
      input.value = 'Draft'; input.dispatchEvent(new Event('input', { bubbles:true }));
      for (const key of ['Enter', 'Escape', 'Tab']) {
        input.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles:true, cancelable:true, isComposing:true }));
        const prevented = new KeyboardEvent('keydown', { key, bubbles:true, cancelable:true });
        prevented.preventDefault(); input.dispatchEvent(prevented);
        input.dispatchEvent(new KeyboardEvent('keydown', { key, keyCode:229, bubbles:true, cancelable:true }));
      }
      return { editing:!!grid._editing, draft:input.value, saved:grid.data.get(1).a };
    });
    expect(result).toEqual({ editing:true, draft:'Draft', saved:'A1' });
    await page.locator('.dui-grid__editor-host input').press('Escape');
    await expect(page.locator('.dui-grid__editor-host')).toHaveCount(0);
  });

  test(`${kind} beforeEditStart veto/teardown/replacement precedes factory and commit flags describe the write`, async ({ page }) => {
    await setup(page, kind);
    const result = await page.evaluate(() => {
      let creations = 0;
      const factory = api.gridEditors.text();
      const columns = [{ id:'a', width:180, editor:{ ...factory, createCellEditor(context) {
        creations++; return factory.createCellEditor(context);
      } } }];
      grid.setColumns(columns);
      const veto = grid.events.on('beforeEditStart', event => { event.cancel = true; });
      const rejected = grid.startEdit(1, 'a'); veto.dispose();
      const silent = grid.startEdit(1, 'a', { silent:true }); grid.cancelEdit({ silent:true });
      const commits = [];
      grid.events.on('editCommit', event => commits.push({ changed:event.changed, writeResult:event.writeResult,
        ...(Object.hasOwn(event, 'cancel') ? { cancel:event.cancel } : {}) }));
      grid.startEdit(1, 'a'); grid.commitEdit();
      grid.startEdit(1, 'a');
      const input = grid._editing.cell.querySelector('input'); input.value = 'Changed'; input.dispatchEvent(new Event('input', { bubbles:true }));
      grid.commitEdit();
      const replace = grid.events.once('beforeEditStart', () => grid.data.parse([{ id:1, a:'Replacement' }]));
      const replacement = grid.startEdit(1, 'a'); replace.dispose();
      const beforeDestroy = creations;
      grid.events.once('beforeEditStart', () => grid.destroy());
      const destroyedStart = grid.startEdit(1, 'a');
      return { rejected, silent, replacement, destroyedStart, beforeDestroy, creations, commits, destroyed:grid.destroyed };
    });
    expect(result.rejected).toBe(false);
    expect(result.silent).toBe(true);
    expect(result.replacement).toBe(false);
    expect(result.destroyedStart).toBe(false);
    expect(result.destroyed).toBe(true);
    expect(result.creations).toBe(result.beforeDestroy);
    expect(result.beforeDestroy).toBe(3);
    expect(result.commits).toEqual([
      { changed:false, writeResult:false, ...(kind === 'TreeGrid' ? { cancel:false } : {}) },
      { changed:true, writeResult:true, ...(kind === 'TreeGrid' ? { cancel:false } : {}) }
    ]);
  });

  test(`${kind} Tab stops when an editability callback replaces source records`, async ({ page }) => {
    await setup(page, kind);
    await page.evaluate(() => {
      let armed = false;
      grid.setColumns([{ id:'a', width:180, editor:api.gridEditors.text() },
        { id:'b', width:180, editor:api.gridEditors.text(), readOnly:() => {
          if (armed) { armed = false; grid.data.parse([{ id:1, a:'Replacement', b:'New target' }]); }
          return false;
        } }]);
      grid.events.once('editCommit', () => { armed = true; });
      grid.startEdit(1, 'a');
    });
    await page.locator('.dui-grid__editor-host input').fill('Saved');
    await page.keyboard.press('Tab');
    await expect(page.locator('.dui-grid__editor-host')).toHaveCount(0);
    expect(await page.evaluate(() => grid.data.get(1).a)).toBe('Replacement');
  });

  for (const phase of ['cellChange', 'editCommit', 'editorDestroy']) {
    test(`${kind} Tab stops after ${phase} replaces only the committed record`, async ({ page }) => {
      await setup(page, kind);
      await page.evaluate(phase => {
        const replacement = () => grid.data.update(1, { a:'Callback replacement', b:'New B' });
        if (phase === 'editorDestroy') {
          const factory = api.gridEditors.text();
          let armed = true;
          grid.setColumns([{ id:'a', width:180, editor:{ ...factory, createCellEditor(context) {
            const editor = factory.createCellEditor(context);
            const destroy = editor.destroy.bind(editor);
            editor.destroy = () => { destroy(); if (armed) { armed = false; replacement(); } };
            return editor;
          } } }, { id:'b', width:180, editor:factory }]);
        } else grid.events.once(phase, replacement);
        grid.startEdit(1, 'a');
      }, phase);
      await page.locator('.dui-grid__editor-host input').fill('Saved');
      await page.keyboard.press('Tab');
      await expect(page.locator('.dui-grid__editor-host')).toHaveCount(0);
      expect(await page.evaluate(() => ({ a:grid.data.get(1).a, b:grid.data.get(1).b })))
        .toEqual({ a:'Callback replacement', b:'New B' });
    });
  }

  for (const phase of ['beforeEditStart', 'activeCellChange', 'factory']) {
    test(`${kind} edit activation preserves a selection redirect from ${phase}`, async ({ page }) => {
      await setup(page, kind);
      const result = await page.evaluate(phase => {
        let created = 0;
        const factory = api.gridEditors.text();
        grid.setColumns([{ id:'a', width:180 }, { id:'b', width:180, editor:{ ...factory, createCellEditor(context) {
          created++;
          if (phase === 'factory') grid.setSelectedIds([2]);
          return factory.createCellEditor(context);
        } } }]);
        grid.setSelectedIds([1]);
        if (phase !== 'factory') grid.events.once(phase, () => grid.setSelectedIds([2]));
        const started = grid.startEdit(1, 'b');
        return { started, created, selected:grid.getSelectedIds(), active:grid._activeId, editing:!!grid._editing };
      }, phase);
      expect(result).toEqual({ started:false, created:phase === 'factory' ? 1 : 0, selected:[2], active:2, editing:false });
    });
  }

  test(`${kind} explicit activation may choose a different row when callbacks do not redirect`, async ({ page }) => {
    await setup(page, kind);
    expect(await page.evaluate(() => {
      grid.setSelectedIds([2]);
      return grid.startEdit(1, 'a');
    })).toBe(true);
    await expect(page.locator('.dui-grid__editor-host input')).toHaveValue('A1');
  });

  for (const reverse of [false, true]) {
    test(`${kind} ${reverse ? 'Shift+Tab' : 'Tab'} leaves document-edge table with default header buttons`, async ({ page }) => {
      await page.goto('/browser-tests/recipes.html');
      await page.evaluate(async kind => {
        const api = await import('/src/ui/grid-api.js');
        window.grid = new api[kind]('#root', { width:500, height:220,
          columns:[{ id:'a', width:180, editor:api.gridEditors.text() }] });
        grid.data.parse([{ id:1, a:'Only cell' }]);
        grid.startEdit(1, 'a');
      }, kind);
      await expect(page.locator('.dui-grid__column-menu-button')).toHaveCount(1);
      await page.locator('.dui-grid__editor-host input').fill('Saved at boundary');
      await page.keyboard.press(reverse ? 'Shift+Tab' : 'Tab');
      await expect(page.locator('.dui-grid__editor-host')).toHaveCount(0);
      expect(await page.evaluate(() => ({
        inside:grid.element.contains(document.activeElement),
        focusWithin:grid.element.matches(':focus-within'),
        activeTag:document.activeElement.tagName
      }))).toEqual({ inside:false, focusWithin:false, activeTag:'BODY' });
      await expect(page.locator('.dui-grid__column-menu-button')).not.toHaveAttribute('tabindex', '-1');
      expect(await page.evaluate(() => grid.data.get(1).a)).toBe('Saved at boundary');
    });
  }

  test(`${kind} boundary focus honors positive tabindex outside DOM order`, async ({ page }) => {
    await setup(page, kind);
    await page.evaluate(() => {
      document.querySelectorAll('button').forEach(button => { button.tabIndex = -1; });
      const root = grid.element;
      root.tabIndex = 2;
      const later = document.createElement('button'); later.textContent = 'Order 3'; later.tabIndex = 3;
      const earlier = document.createElement('button'); earlier.textContent = 'Order 1'; earlier.tabIndex = 1;
      root.before(later); root.after(earlier);
      grid.startEdit(2, 'b');
    });
    await expect(page.locator('.dui-grid__editor-host input')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name:'Order 3', exact:true })).toBeFocused();
    await page.evaluate(() => grid.startEdit(1, 'a'));
    await expect(page.locator('.dui-grid__editor-host input')).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(page.getByRole('button', { name:'Order 1', exact:true })).toBeFocused();
  });

  for (const action of ['replace', 'filter', 'schema', 'sort', 'destroy']) {
    test(`${kind} Tab does not enter stale cells after commit callback ${action}`, async ({ page }) => {
      await setup(page, kind);
      await page.evaluate(action => {
        grid.events.once('editCommit', () => {
          if (action === 'replace') grid.data.parse([{ id:1, a:'Replacement', b:'New' }, { id:2, a:'Other', b:'Other' }]);
          if (action === 'filter') grid.setFilter(item => item.id !== 1);
          if (action === 'schema') grid.setColumns([{ id:'a', width:200, editor:api.gridEditors.text() }]);
          if (action === 'sort') grid.sortBy('a', 'desc');
          if (action === 'destroy') grid.destroy();
        });
        grid.startEdit(1, 'a');
      }, action);
      await page.locator('.dui-grid__editor-host input').fill('Saved');
      await page.keyboard.press('Tab');
      await expect(page.locator('.dui-grid__editor-host')).toHaveCount(0);
      if (action === 'destroy') await expect(page.locator('.dui-grid')).toHaveCount(0);
    });
  }
}

test('TreeGrid Tab respects a branch collapsed from editCommit', async ({ page }) => {
  await setup(page, 'TreeGrid');
  await page.evaluate(() => {
    grid.data.parse([{ id:1, a:'Parent', b:'P' }, { id:2, parentId:1, a:'Child', b:'C' }]);
    grid.expand(1);
    grid.events.once('editCommit', () => grid.collapse(1));
    grid.startEdit(2, 'a');
  });
  await page.locator('.dui-grid__editor-host input').fill('Changed child');
  await page.keyboard.press('Tab');
  await expect(page.locator('.dui-grid__editor-host')).toHaveCount(0);
  expect(await page.evaluate(() => grid.treeView.all().map(item => item.id))).toEqual([1]);
});
