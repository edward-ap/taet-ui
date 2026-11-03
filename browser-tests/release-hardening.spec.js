import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  page.on('pageerror', error => { throw error; });
  await page.goto('/browser-tests/recipes.html');
});

test('Select renderer replacement, teardown and silent popup activation preserve state', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const { SelectInput, OverlayManager } = await import('/src/ui/all.js');
    const manager = new OverlayManager();
    let action = '';
    const select = new SelectInput({ searchable: true, overlayManager: manager, renderItem(item, { source }) {
      if (action === 'replace') { action = ''; source.data.parse([{ id: 2, text: 'Current' }]); }
      else if (action === 'destroy') source.destroy();
      return item.text;
    } }).mount(document.querySelector('#root'));
    select.data.parse([{ id: 1, text: 'Old' }]);
    const events = [];
    select.events.on('open', () => events.push('open'));
    manager.events.on('open', () => events.push('manager'));
    action = 'replace'; select.openPopup({ silent: true });
    const rows = [...document.querySelectorAll('.dui-dropdown-list__item')].map(row => row.textContent);
    select.closePopup({ silent: true });
    action = 'destroy'; select.openPopup();
    const remaining = manager.all().length; manager.destroy();
    return { rows, events, destroyed: select.destroyed, remaining };
  });
  expect(result).toEqual({ rows: ['Current'], events: [], destroyed: true, remaining: 0 });
});

test('Untrusted display text stays literal across text, code, list and table rendering', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const { TextLayout, CodeBlock, List, Grid, SelectInput } = await import('/src/ui/all.js');
    window.injected = false;
    const text = '<img src=x onerror="window.injected=true"><script>window.injected=true</script>';
    const host = document.querySelector('#root');
    const controls = [new TextLayout({ title: text, text }), new CodeBlock({ code: text }), new List(),
      new Grid({ columns: [{ id: 'text', title: text }], width: 600, height: 180 }), new SelectInput({ label: text })];
    controls.forEach(control => control.mount(host));
    for (const control of controls.slice(2)) control.data.parse([{ id: 1, text }]);
    await new Promise(requestAnimationFrame);
    const activeNodes = host.querySelectorAll('img,script,[onerror]').length;
    const literal = controls.every(control => control.element.textContent.includes(text));
    controls.forEach(control => control.destroy());
    return { activeNodes, literal, executed: window.injected, remaining: host.childElementCount };
  });
  expect(result).toEqual({ activeNodes: 0, literal: true, executed: false, remaining: 0 });
});

test('Popup silent transitions synchronize the manager without semantic events', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const { Popup, OverlayManager } = await import('/src/ui/all.js');
    const manager = new OverlayManager();
    const popup = new Popup({ manager, modal: true, content: 'Sample' });
    const events = [];
    for (const type of ['beforeOpen', 'open', 'beforeClose', 'close']) popup.events.on(type, () => events.push(type));
    for (const type of ['open', 'close']) manager.events.on(type, () => events.push(`manager:${type}`));
    const opened = popup.open(null, { silent: true });
    const visible = !popup.element.hidden && manager.has(popup);
    const closed = popup.close({ silent: true });
    popup.destroy(); manager.destroy();
    return { opened, visible, closed, events };
  });
  expect(result).toEqual({ opened: true, visible: true, closed: true, events: [] });
});

test('Popup stops after beforeOpen and manager-open teardown and recursive close', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const { Popup, OverlayManager } = await import('/src/ui/all.js');
    const manager = new OverlayManager();
    const before = new Popup({ manager, modal: true });
    before.events.on('beforeOpen', () => before.destroy());
    const beforeResult = before.open();
    const during = new Popup({ manager, modal: true });
    const off = manager.events.on('open', () => during.destroy());
    const duringResult = during.open(); off.dispose();
    const recursive = new Popup({ manager, modal: true });
    recursive.open();
    let nested;
    recursive.events.on('beforeClose', () => { nested = recursive.close(); });
    const closed = recursive.close();
    recursive.destroy();
    const remaining = manager.all().length;
    manager.destroy();
    return { beforeResult, duringResult, nested, closed, remaining };
  });
  expect(result).toEqual({ beforeResult: false, duringResult: false, nested: false, closed: true, remaining: 0 });
});

test('List render callbacks cannot append obsolete rows or resurrect a destroyed mount', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const { List, DataStore } = await import('/src/ui/all.js');
    const store = new DataStore(); store.parse([{ id: 'old', text: 'Old' }]);
    let replace = false;
    const list = new List({ data: store, renderItem(item) {
      if (replace && item.id === 'old') { replace = false; store.parse([{ id: 'new', text: 'New' }]); }
      return item.text;
    } }).mount(document.querySelector('#root'));
    replace = true; list.refresh();
    const rows = [...list.element.querySelectorAll('[role=option]')].map(row => row.textContent);
    list.destroy(); store.destroy();
    const terminal = new List({ renderItem(item, { source }) { source.destroy(); return 'Obsolete'; } });
    terminal.data.parse([{ id: 1 }]); terminal.mount(document.querySelector('#root'));
    return { rows, destroyed: terminal.destroyed, mounted: terminal.mounted,
      remaining: document.querySelector('#root').childElementCount };
  });
  expect(result).toEqual({ rows: ['New'], destroyed: true, mounted: false, remaining: 0 });
});

test('Modal traps focus from the root and includes links while skipping inert content', async ({ page }) => {
  await page.evaluate(async () => {
    const { Dialog, OverlayManager } = await import('/src/ui/all.js');
    const content = document.createElement('div');
    const link = document.createElement('a'); link.href = '#help'; link.textContent = 'Help';
    const inert = document.createElement('div'); inert.inert = true;
    const ignored = document.createElement('button'); ignored.textContent = 'Inert'; inert.append(ignored);
    const input = document.createElement('input'); input.setAttribute('aria-label', 'Name');
    content.append(link, input, inert);
    window.dialog = new Dialog({ manager: new OverlayManager(), title: 'Focus test', content, closeable: false });
    dialog.open();
  });
  await expect(page.getByRole('dialog')).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('textbox', { name: 'Name' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Help' })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('textbox', { name: 'Name' })).toBeFocused();
  await page.evaluate(() => { const manager = dialog.manager; dialog.destroy(); manager.destroy(); });
});

test('Queued focus restoration does not steal focus from a replacement modal', async ({ page }) => {
  await page.evaluate(async () => {
    const { Dialog, OverlayManager } = await import('/src/ui/all.js');
    const trigger = document.createElement('button'); trigger.textContent = 'Trigger'; document.body.append(trigger); trigger.focus();
    const manager = new OverlayManager();
    window.first = new Dialog({ manager, title: 'First' });
    window.second = new Dialog({ manager, title: 'Second' });
    first.open();
    await Promise.resolve();
    first.close(); second.open();
  });
  await expect(page.getByRole('dialog', { name: 'Second' })).toBeFocused();
  await page.evaluate(() => { const manager = first.manager; first.destroy(); second.destroy(); manager.destroy(); });
});

test('Dialog can retry after a throwing activation and resolves teardown during beforeClose', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const { Dialog, OverlayManager } = await import('/src/ui/all.js');
    const manager = new OverlayManager(); const dialog = new Dialog({ manager });
    const subscription = dialog.events.on('beforeOpen', () => { throw new Error('Application rejection'); });
    let rejected = false;
    try { dialog.showModal(); } catch (error) { rejected = error.message === 'Application rejection'; }
    subscription.dispose();
    const result = dialog.showModal();
    dialog.events.on('beforeClose', () => dialog.destroy());
    const close = dialog.close(); const resolved = await result;
    const remaining = manager.all().length; manager.destroy();
    return { rejected, close, resolved, remaining };
  });
  expect(result).toEqual({ rejected: true, close: false, resolved: null, remaining: 0 });
});

test('Popup and Dialog release owned content when its mount destroys the owner', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const { Popup, Dialog, TextInput, OverlayManager } = await import('/src/ui/all.js');
    const manager = new OverlayManager(); const states = [];
    for (const Constructor of [Popup, Dialog]) {
      let owner;
      class Content extends TextInput {
        mount(host) { super.mount(host); owner.destroy(); return this; }
      }
      const content = new Content();
      owner = new Constructor({ manager, modal: true, content, destroyContent: true, buttons: [{ text: 'Never mounted' }] });
      const opened = owner.open();
      states.push([opened, owner.destroyed, content.destroyed, owner.mounted]);
    }
    const remaining = manager.all().length; manager.destroy();
    return { states, remaining };
  });
  expect(result).toEqual({ states: [[false, true, true, false], [false, true, true, false]], remaining: 0 });
});

for (const theme of ['light-blue', 'dark-blue']) {
  test(`Form and portal Select keep modal focus at 200% scale in ${theme}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1100, height: 800 });
    await page.evaluate(async theme => {
      const { Dialog, Form, TextInput, SelectInput, Button, OverlayManager } = await import('/src/ui/all.js');
      document.body.className = `dui-theme-${theme} dui-profile-compact`; document.body.style.zoom = '2';
      const manager = new OverlayManager();
      window.choice = new SelectInput({ label: 'Country', searchable: true, overlayManager: manager });
      choice.data.parse([{ id: 'ca', text: 'Canada' }, { id: 'us', text: 'United States' }]);
      const form = new Form().row(new TextInput({ label: 'Name', value: 'Ada' })).row(choice);
      window.trigger = new Button({ text: 'Edit contact' }).mount(document.querySelector('#root'));
      trigger.focus();
      window.dialog = new Dialog({ manager, title: 'Contact', content: form, destroyContent: true, width: 420,
        buttons: [{ text: 'Unavailable', primary: true, disabled: true }, { text: 'Save', result: 'save' }] });
      dialog.open();
    }, theme);
    await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeFocused();
    const rect = await page.getByRole('dialog', { name: 'Contact' }).boundingBox();
    expect(Math.abs(rect.x - (1100 - rect.width) / 2)).toBeLessThan(2);
    expect(Math.abs(rect.y - (800 - rect.height) / 2)).toBeLessThan(2);
    await page.screenshot({ path: testInfo.outputPath('modal-scale.png') });
    await page.evaluate(() => choice.openPopup());
    await expect(page.locator('.dui-dropdown-list__search')).toBeFocused();
    const popup = await page.locator('.dui-dropdown-list__popup').boundingBox();
    expect(popup.x).toBeGreaterThanOrEqual(0);
    expect(popup.x + popup.width).toBeLessThanOrEqual(1100);
    expect(popup.y + popup.height).toBeLessThanOrEqual(800);
    for (let i = 0; i < 9; i++) {
      await page.keyboard.press('Tab');
      expect(await page.evaluate(() => dialog.manager.all().some(owner =>
        (owner === choice ? document.querySelector('.dui-dropdown-list__popup') : owner.element)?.contains(document.activeElement)))).toBe(true);
    }
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: 'Contact' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: 'Edit contact' })).toBeFocused();
    await page.evaluate(() => { const manager = dialog.manager; dialog.destroy(); trigger.destroy(); manager.destroy(); });
  });
}
