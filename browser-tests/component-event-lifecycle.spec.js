import { test, expect } from '@playwright/test';

test('TabBar native clicks stop after teardown, disable or replacement from tabClick', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/browser-tests/recipes.html');
  const result = await page.evaluate(async () => {
    const { TabBar } = await import('/src/ui/all.js');
    const results = [];
    for (const phase of ['destroy', 'disable', 'replace']) {
      const host = document.createElement('div'); document.body.append(host);
      const tabs = new TabBar(host, { closable: true, tabs: [{ id: 'a' }, { id: 'b' }] });
      let changes = 0; tabs.events.on('change', () => changes++);
      tabs.events.on('tabClick', () => {
        if (phase === 'destroy') tabs.destroy();
        if (phase === 'disable') tabs.disable();
        if (phase === 'replace') {
          tabs.removeTab('b', { silent: true }); tabs.addTab({ id: 'b' }, { silent: true });
        }
      });
      host.querySelector('[data-dui-tab-id="b"]').click();
      results.push({ changes, active: tabs.activeId }); tabs.destroy();
    }
    return results;
  });
  expect(result).toEqual(Array.from({ length: 3 }, () => ({ changes: 0, active: 'a' })));
  expect(errors).toEqual([]);
});

test('PropertyGrid silent editing validates, writes with provenance and refreshes the cell', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/browser-tests/recipes.html');
  const result = await page.evaluate(async () => {
    const { PropertyGrid, gridEditors } = await import('/src/ui/all.js');
    let valid = false, validations = 0, destroyed = 0;
    const events = [], writes = [];
    const property = { name: 'name', type: 'custom', value: 'Before',
      set(value, options) { writes.push({ value, silent: options.silent, origin: options.origin }); },
      editor: gridEditors.custom(() => ({
        mount(host) { host.append(document.createElement('input')); },
        getValue() { return 'After'; }, validate() { validations++; return { ok: valid }; },
        focus() {}, destroy() { destroyed++; }
      }))
    };
    const host = document.createElement('div'); document.body.append(host);
    const grid = new PropertyGrid(host, { source: [{ properties: [property] }] });
    for (const name of ['editStart', 'beforePropertyChange', 'propertyChange', 'afterPropertyChange']) {
      grid.events.on(name, event => { events.push(name); event.cancel = true; });
    }
    const started = grid.startEdit('name', 'value', { silent: true });
    const rejected = grid.commitEdit({ silent: true, origin: 'import' });
    const before = property.value;
    valid = true;
    const committed = grid.commitEdit({ silent: true, origin: 'import' });
    const text = host.querySelector('.dui-property-grid__value').textContent;
    grid.destroy();
    return { started, rejected, before, committed, value: property.value, text, events, writes, validations, destroyed };
  });
  expect(result).toEqual({ started: true, rejected: false, before: 'Before', committed: true,
    value: 'After', text: 'After', events: [], writes: [{ value: 'After', silent: true, origin: 'import' }],
    validations: 2, destroyed: 1 });
  expect(errors).toEqual([]);
});

test('PropertyGrid abandons edits cancelled or destroyed by application callbacks', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/browser-tests/recipes.html');
  const result = await page.evaluate(async () => {
    const { PropertyGrid, gridEditors } = await import('/src/ui/all.js');
    const results = [];
    for (const phase of ['validate', 'beforePropertyChange', 'cancel', 'set', 'propertyChange']) {
      let grid, destroys = 0; const events = [];
      const property = { name: 'x', type: 'custom', value: 'Old',
        set() { if (phase === 'set') grid.destroy(); },
        editor: gridEditors.custom(() => ({
          mount(host) { host.append(document.createElement('input')); }, getValue() { return 'New'; },
          validate() { if (phase === 'validate') grid.destroy(); return { ok: true }; },
          focus() {}, destroy() { destroys++; }
        }))
      };
      const host = document.createElement('div'); document.body.append(host);
      grid = new PropertyGrid(host, { source: [{ properties: [property] }] });
      for (const name of ['beforePropertyChange', 'propertyChange', 'afterPropertyChange']) {
        grid.events.on(name, () => {
          events.push(name);
          if (name === phase) grid.destroy();
          if (name === 'beforePropertyChange' && phase === 'cancel') grid.cancelEdit({ silent: true });
        });
      }
      grid.startEdit('x');
      const committed = grid.commitEdit();
      grid.destroy();
      results.push({ phase, committed, value: property.value, destroys, events, empty: host.childElementCount === 0 });
    }
    await Promise.resolve(); return results;
  });
  expect(result).toEqual([
    { phase: 'validate', committed: false, value: 'Old', destroys: 1, events: [], empty: true },
    { phase: 'beforePropertyChange', committed: false, value: 'Old', destroys: 1, events: ['beforePropertyChange'], empty: true },
    { phase: 'cancel', committed: false, value: 'Old', destroys: 1, events: ['beforePropertyChange'], empty: true },
    { phase: 'set', committed: true, value: 'New', destroys: 1, events: ['beforePropertyChange'], empty: true },
    { phase: 'propertyChange', committed: true, value: 'New', destroys: 1, events: ['beforePropertyChange', 'propertyChange'], empty: true }
  ]);
  expect(errors).toEqual([]);
});

test('Menu and ContextMenu release popups when callbacks destroy the owner', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/browser-tests/recipes.html');
  const result = await page.evaluate(async () => {
    const { Menu, ContextMenu, CommandRegistry } = await import('/src/ui/all.js');
    const results = [];
    for (const Control of [Menu, ContextMenu]) {
      for (const phase of ['beforeOpen', 'open', 'beforeClose', 'close', 'itemClick', 'onClick', 'command']) {
        const host = document.createElement('div'); document.body.append(host);
        const commands = new CommandRegistry(); let actions = 0, menu;
        commands.register('close-screen', { run() { actions++; menu.destroy(); } });
        const action = { id: 'action', text: 'Action', ...(phase === 'command'
          ? { command: 'close-screen' }
          : { onClick() { actions++; if (phase === 'onClick') menu.destroy(); } }) };
        menu = new Control(host, { commands, items: Control === Menu
          ? [{ id: 'root', text: 'Root', items: [action] }] : [action] });
        for (const name of ['beforeOpen', 'open', 'beforeClose', 'close', 'itemClick']) {
          menu.events.on(name, () => { if (name === phase) menu.destroy(); });
        }
        if (Control === Menu) host.querySelector('button').click(); else menu.openAt(20, 20);
        if (phase === 'beforeClose' || phase === 'close') menu.close();
        if (['itemClick', 'onClick', 'command'].includes(phase)) {
          document.querySelector('.dui-menu-popup [data-dui-menu-item-id="action"]').click();
        }
        results.push({ destroyed: menu.destroyed, empty: host.childElementCount === 0,
          popups: document.querySelectorAll('.dui-menu-popup').length,
          actions, expectedActions: ['onClick', 'command'].includes(phase) ? 1 : 0 });
        menu.destroy(); commands.destroy();
      }
    }
    await new Promise(resolve => requestAnimationFrame(resolve)); return results;
  });
  for (const entry of result) expect(entry).toEqual({ destroyed: true, empty: true, popups: 0,
    actions: entry.expectedActions, expectedActions: entry.expectedActions });
  expect(errors).toEqual([]);
});

test('ContextMenu silent open/close changes the popup without semantic events', async ({ page }) => {
  await page.goto('/browser-tests/recipes.html');
  const result = await page.evaluate(async () => {
    const { ContextMenu } = await import('/src/ui/all.js');
    const menu = new ContextMenu({ items: [{ id: 'action', text: 'Action' }] });
    const events = [];
    for (const name of ['beforeOpen', 'open', 'beforeClose', 'close']) {
      menu.events.on(name, event => { events.push(name); event.cancel = true; });
    }
    const opened = menu.openForEvent(new MouseEvent('contextmenu', { clientX: 20, clientY: 20 }), { silent: true });
    const visible = document.querySelectorAll('.dui-menu-popup').length;
    const closed = menu.close({ silent: true }); menu.destroy();
    return { opened, visible, closed, remaining: document.querySelectorAll('.dui-menu-popup').length, events };
  });
  expect(result).toEqual({ opened: true, visible: 1, closed: true, remaining: 0, events: [] });
});

test('PropertyGrid inline and boolean edits stop when forwarded callbacks destroy the inspector', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/browser-tests/recipes.html');
  const result = await page.evaluate(async () => {
    const { PropertyInspector } = await import('/src/ui/all.js');
    const results = [];
    for (const type of ['text', 'boolean']) {
      for (const phase of ['beforePropertyChange', 'set', 'propertyChange']) {
        const host = document.createElement('div'); document.body.append(host);
        let inspector; const events = [];
        const property = { name: 'x', type, value: type === 'boolean' ? false : 'Old',
          set() { if (phase === 'set') inspector.destroy(); } };
        inspector = new PropertyInspector(host, { source: [{ properties: [property] }] });
        for (const name of ['beforePropertyChange', 'propertyChange', 'afterPropertyChange']) {
          inspector.events.on(name, () => { events.push(name); if (name === phase) inspector.destroy(); });
        }
        const input = host.querySelector('input');
        if (type === 'boolean') input.click();
        else { input.value = 'New'; input.dispatchEvent(new Event('input', { bubbles: true })); }
        results.push({ type, phase, value: property.value, destroyed: inspector.destroyed,
          empty: host.childElementCount === 0, events });
        inspector.destroy();
      }
    }
    return results;
  });
  for (const entry of result) {
    expect(entry.destroyed, JSON.stringify(entry)).toBe(true); expect(entry.empty).toBe(true);
    expect(entry.value).toBe(entry.type === 'boolean' ? entry.phase !== 'beforePropertyChange'
      : entry.phase === 'beforePropertyChange' ? 'Old' : 'New');
    expect(entry.events).toEqual(entry.phase === 'propertyChange'
      ? ['beforePropertyChange', 'propertyChange'] : ['beforePropertyChange']);
  }
  expect(errors).toEqual([]);
});
