import { test, expect } from '@playwright/test';
test.beforeEach(async ({ page }) => {
  page.on('pageerror', error => { throw error; });
  await page.goto('/browser-tests/recipes.html');
});

for (const type of ['TreeList', 'TreeGrid']) {
  for (const method of ['expand', 'collapse', 'expandAll', 'collapseAll']) {
    test(`${type} ${method} tolerates owner teardown from projection notification`, async ({ page }) => {
      const result = await page.evaluate(async ({ type, method }) => {
        const ui = await import('/src/ui/all.js');
        const tree = new ui[type]({ columns: [{ id: 'text' }], expandAll: method.startsWith('collapse') }).mount(document.querySelector('#root'));
        tree.data.parse([{ id: 'r', text: 'Root' }, { id: 'c', parentId: 'r', text: 'Child' }]);
        if (method.startsWith('collapse')) tree.expandAll({ silent: true });
        tree.events.on('treeViewChange', () => tree.destroy());
        if (method.endsWith('All')) tree[method](); else tree[method]('r');
        return { destroyed: tree.destroyed, remaining: document.querySelector('#root').childElementCount };
      }, { type, method });
      expect(result).toEqual({ destroyed: true, remaining: 0 });
    });
  }
  test(`${type} nested collapse wins over the old expand notification`, async ({ page }) => {
    const result = await page.evaluate(async type => {
      const ui = await import('/src/ui/all.js');
      const tree = new ui[type]({ columns: [{ id: 'text' }] }).mount(document.querySelector('#root'));
      tree.data.parse([{ id: 'r', text: 'Root' }, { id: 'c', parentId: 'r', text: 'Child' }]);
      const events = [];
      tree.events.once('treeViewChange', () => tree.collapse('r'));
      tree.events.on('expand', () => events.push('expand'));
      tree.events.on('collapse', () => events.push('collapse'));
      tree.expand('r');
      const expanded = tree.isExpanded('r');
      tree.destroy();
      return { events, expanded };
    }, type);
    expect(result).toEqual({ events: ['collapse'], expanded: false });
  });
}

for (const phase of ['validator', 'beforeNodeMove']) {
  for (const action of ['destroy', 'replace']) {
    test(`node move ${phase} ${action} prevents stale writes`, async ({ page }) => {
      const result = await page.evaluate(async ({ phase, action }) => {
        const { TreeList, DataStore } = await import('/src/ui/all.js');
        const data = new DataStore(); data.parse([{ id: 'a', text: 'A' }, { id: 'b', text: 'B' }]);
        let tree;
        const interrupt = () => {
          if (action === 'destroy') tree.destroy();
          else data.parse([{ id: 'a', text: 'New A' }, { id: 'b', text: 'New B' }], { silent: true });
          return true;
        };
        tree = new TreeList({ data, canDropNode: phase === 'validator' ? interrupt : undefined }).mount(document.querySelector('#root'));
        if (phase !== 'validator') tree.events.on(phase, interrupt);
        const changed = tree.moveNode('a', 'b');
        const rows = data.all().map(item => ({ text: item.text, parentId: item.parentId ?? null }));
        tree.destroy(); data.destroy();
        return { changed, rows };
      }, { phase, action });
      expect(result).toEqual({ changed: false, rows: [
        { text: action === 'replace' ? 'New A' : 'A', parentId: null },
        { text: action === 'replace' ? 'New B' : 'B', parentId: null }
      ] });
    });
  }
}

test('recursive node move is rejected and a committed move survives notification teardown', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const { TreeList, DataStore } = await import('/src/ui/all.js');
    const data = new DataStore(); data.parse([{ id: 'a' }, { id: 'b' }]);
    const tree = new TreeList({ data }).mount(document.querySelector('#root'));
    let nested;
    tree.events.once('beforeNodeMove', () => { nested = tree.moveNode('b', 'a'); });
    tree.events.on('dataChange', () => tree.destroy());
    const changed = tree.moveNode('a', 'b');
    const parent = data.get('a').parentId;
    data.destroy();
    return { nested, changed, parent };
  });
  expect(result).toEqual({ nested: false, changed: true, parent: 'b' });
});

for (const action of ['destroy', 'replace', 'recursive', 'veto']) {
  test(`TreeGrid beforeExpand ${action} preserves the current owner/data`, async ({ page }) => {
    const result = await page.evaluate(async action => {
      const { TreeGrid } = await import('/src/ui/all.js');
      const tree = new TreeGrid({ columns: [{ id: 'text' }] }).mount(document.querySelector('#root'));
      tree.data.parse([{ id: 'r' }, { id: 'c', parentId: 'r' }]);
      let nested;
      tree.events.once('beforeExpand', event => {
        if (action === 'destroy') tree.destroy();
        if (action === 'replace') tree.data.parse([{ id: 'r' }, { id: 'new', parentId: 'r' }], { silent: true });
        if (action === 'recursive') nested = tree.expand('r');
        if (action === 'veto') event.cancel = true;
      });
      const changed = tree.expand('r');
      const expanded = tree.destroyed ? false : tree.isExpanded('r');
      tree.destroy();
      return { changed, expanded, nested: nested ?? null };
    }, action);
    expect(result).toEqual({ changed: action === 'recursive', expanded: action === 'recursive', nested: action === 'recursive' ? false : null });
  });
}

for (const phase of ['start', 'over']) {
  test(`native node drag ${phase} callback may destroy the tree`, async ({ page }) => {
    const result = await page.evaluate(async phase => {
      const { TreeList } = await import('/src/ui/all.js');
      const tree = new TreeList().mount(document.querySelector('#root'));
      tree.data.parse([{ id: 'a', text: 'A' }, { id: 'b', text: 'B' }]);
      const controller = tree._nodeDragController;
      const rows = tree.element.querySelectorAll('[role=treeitem]');
      if (phase === 'start') tree.events.on('nodeDragStart', () => tree.destroy());
      else tree.nodeDropValidator = () => { tree.destroy(); return true; };
      const transfer = new DataTransfer();
      rows[0].dispatchEvent(new DragEvent('dragstart', { bubbles: true, cancelable: true, dataTransfer: transfer }));
      if (phase === 'over') {
        const rect = rows[1].getBoundingClientRect();
        rows[1].dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: transfer, clientY: rect.top + rect.height / 2 }));
      }
      return { destroyed: tree.destroyed, state: controller.state, remaining: document.querySelector('#root').childElementCount };
    }, phase);
    expect(result).toEqual({ destroyed: true, state: null, remaining: 0 });
  });
}

test('throwing drop/end handlers release drag resources and owner teardown still completes', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const { TreeList } = await import('/src/ui/all.js');
    const tree = new TreeList().mount(document.querySelector('#root'));
    tree.data.parse([{ id: 'a', text: 'A' }, { id: 'b', text: 'B' }]);
    const controller = tree._nodeDragController;
    const start = () => {
      const rows = tree.element.querySelectorAll('[role=treeitem]');
      const transfer = new DataTransfer();
      rows[0].dispatchEvent(new DragEvent('dragstart', { bubbles: true, cancelable: true, dataTransfer: transfer }));
      const rect = rows[1].getBoundingClientRect();
      rows[1].dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: transfer, clientY: rect.top + rect.height / 2 }));
    };
    start();
    tree.events.once('beforeNodeMove', () => { throw new Error('drop failure'); });
    let dropError;
    try { controller.drop(new DragEvent('drop', { cancelable: true }), tree.treeView.getEntry('b')); }
    catch (error) { dropError = error.message; }
    const cleared = controller.state === null && tree.element.querySelectorAll('[aria-grabbed],.dui-tree-node--drop-inside').length === 0;
    start();
    tree.events.on('nodeDragEnd', () => { throw new Error('end failure'); });
    let endError;
    try { tree.destroy(); } catch (error) { endError = error.message; }
    return { dropError, endError, cleared, destroyed: tree.destroyed, detached: controller.tree === null,
      remaining: document.querySelector('#root').childElementCount };
  });
  expect(result).toEqual({ dropError: 'drop failure', endError: 'end failure', cleared: true,
    destroyed: true, detached: true, remaining: 0 });
});

test('silent move and expansion synchronize state and preserve one undo step', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const { TreeList } = await import('/src/ui/all.js');
    const tree = new TreeList().mount(document.querySelector('#root'));
    tree.data.parse([{ id: 'a' }, { id: 'b' }]);
    const events = [];
    for (const type of ['beforeNodeMove', 'nodeMove', 'expand', 'expandAll', 'collapseAll', 'treeViewChange']) tree.events.on(type, () => events.push(type));
    tree.moveNode('a', 'b', 'inside', { silent: true });
    const parent = tree.data.get('a').parentId;
    const level = tree.element.querySelector('[data-dui-list-item-id="string:a"]').getAttribute('aria-level');
    tree.collapseAll({ silent: true }); tree.expandAll({ silent: true });
    tree.data.undo({ silent: true });
    const restored = tree.data.all().map(item => item.id);
    tree.destroy();
    return { parent, level, events, restored };
  });
  expect(result).toEqual({ parent: 'b', level: '2', events: [], restored: ['a', 'b'] });
});

test('an old drag cannot move replacement records with reused IDs', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const { TreeList } = await import('/src/ui/all.js');
    const tree = new TreeList().mount(document.querySelector('#root'));
    tree.data.parse([{ id: 'a', text: 'A' }, { id: 'b', text: 'B' }]);
    const controller = tree._nodeDragController;
    const rows = tree.element.querySelectorAll('[role=treeitem]');
    const transfer = new DataTransfer();
    rows[0].dispatchEvent(new DragEvent('dragstart', { bubbles: true, dataTransfer: transfer }));
    const rect = rows[1].getBoundingClientRect();
    rows[1].dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: transfer, clientY: rect.top + rect.height / 2 }));
    tree.data.parse([{ id: 'a', text: 'New A' }, { id: 'b', text: 'New B' }]);
    const changed = controller.drop(new DragEvent('drop'), tree.treeView.getEntry('b'));
    const parent = tree.data.get('a').parentId ?? null;
    const cleared = controller.state === null;
    tree.destroy();
    return { changed, parent, cleared };
  });
  expect(result).toEqual({ changed: false, parent: null, cleared: true });
});
