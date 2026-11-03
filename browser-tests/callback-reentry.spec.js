import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  page.on('pageerror', error => { throw error; });
  await page.goto('/browser-tests/recipes.html');
});

for (const emitter of ['dialog', 'manager']) {
  test(`Dialog ${emitter} close notification may start an independent modal session`, async ({ page }) => {
    const result = await page.evaluate(async emitter => {
      const { Dialog, OverlayManager } = await import('/src/ui/all.js');
      const manager = new OverlayManager();
      const dialog = new Dialog({ manager, title: 'Session' });
      const first = dialog.showModal();
      let second;
      (emitter === 'dialog' ? dialog : manager).events.once('close', () => { second = dialog.showModal(); });
      dialog.close('first');
      const reopened = dialog.isOpen() && manager.has(dialog);
      const distinct = second !== first;
      let secondSettled = false;
      second.then(() => { secondSettled = true; });
      const firstResult = await first;
      await Promise.resolve();
      const premature = secondSettled;
      dialog.close('second');
      const secondResult = await second;
      dialog.destroy(); manager.destroy();
      return { reopened, distinct, premature, firstResult, secondResult };
    }, emitter);
    expect(result).toEqual({ reopened: true, distinct: true, premature: false, firstResult: 'first', secondResult: 'second' });
  });
}

for (const emitter of ['dialog', 'manager']) {
  test(`Dialog result settles even when a ${emitter} close listener throws`, async ({ page }) => {
    const result = await page.evaluate(async emitter => {
      const { Dialog, OverlayManager } = await import('/src/ui/all.js');
      const manager = new OverlayManager();
      const dialog = new Dialog({ manager });
      const pending = dialog.showModal();
      let settled = false;
      let value;
      pending.then(result => { settled = true; value = result; });
      (emitter === 'dialog' ? dialog : manager).events.once('close', () => { throw new Error('consumer failure'); });
      let error;
      try { dialog.close('done'); } catch (caught) { error = caught.message; }
      await Promise.resolve();
      const opened = dialog.isOpen();
      const remaining = manager.all().length;
      dialog.destroy(); manager.destroy();
      return { settled, value, error, opened, remaining };
    }, emitter);
    expect(result).toEqual({ settled: true, value: 'done', error: 'consumer failure', opened: false, remaining: 0 });
  });
}

test('Dialog close veto preserves its pending result; a borrowed button may tear down its owner during mount', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const { Dialog, Button, OverlayManager } = await import('/src/ui/all.js');
    const manager = new OverlayManager();
    const dialog = new Dialog({ manager });
    const first = dialog.showModal();
    const veto = dialog.events.on('beforeClose', event => { event.cancel = true; });
    const closed = dialog.close('vetoed');
    const same = dialog.showModal() === first;
    veto.dispose();
    dialog.close('accepted');
    const value = await first;
    dialog.destroy();
    const borrowed = new Button({ text: 'Borrowed' });
    const mount = borrowed.mount.bind(borrowed);
    let owner;
    borrowed.mount = host => { mount(host); owner.destroy(); return borrowed; };
    owner = new Dialog({ manager, buttons: [borrowed, { text: 'Never mount', result: 'obsolete' }] });
    const terminalResult = await owner.showModal();
    const ownedButtons = owner._ownedButtons.length;
    const borrowedAlive = !borrowed.destroyed;
    const terminal = owner.destroyed && !owner.mounted;
    borrowed.destroy(); manager.destroy();
    return { closed, same, value, terminalResult, ownedButtons, borrowedAlive, terminal };
  });
  expect(result).toEqual({ closed: false, same: true, value: 'accepted', terminalResult: null,
    ownedButtons: 0, borrowedAlive: true, terminal: true });
});

test('TreeList text callbacks cannot append obsolete rows or resurrect a destroyed mount', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const { TreeList, DataStore } = await import('/src/ui/all.js');
    const data = new DataStore();
    data.parse([{ id: 'old', text: 'Old' }]);
    let replace = false;
    const tree = new TreeList({ data, textField(item) {
      if (replace) { replace = false; data.parse([{ id: 'new', text: 'Current' }]); }
      return item.text;
    } }).mount(document.querySelector('#root'));
    replace = true;
    tree.refresh();
    const rows = [...tree.element.querySelectorAll('[role=treeitem]')].map(row => row.textContent);
    tree.destroy(); data.destroy();
    let terminal;
    terminal = new TreeList({ textField() { terminal.destroy(); return 'Obsolete'; } });
    terminal.data.parse([{ id: 1, text: 'Sample' }]);
    terminal.mount(document.querySelector('#root'));
    return { rows, destroyed: terminal.destroyed, mounted: terminal.mounted,
      remaining: document.querySelector('#root').childElementCount };
  });
  expect(result).toEqual({ rows: ['Current'], destroyed: true, mounted: false, remaining: 0 });
});
