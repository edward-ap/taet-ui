import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  page.on('pageerror', error => { throw error; });
  await page.goto('/browser-tests/recipes.html');
});

for (const type of ['Grid', 'TreeGrid']) {
  test(`${type} stays synchronized after a nested replacement and removal cancel stale updates`, async ({ page }) => {
    const result = await page.evaluate(async type => {
      const ui = await import('/src/ui/all.js');
      const owner = new ui[type]({ columns: [{ id: 'text' }], width: 400, height: 180 }).mount(document.querySelector('#root'));
      const frames = async () => { await new Promise(requestAnimationFrame); await new Promise(requestAnimationFrame); };
      owner.data.parse([{ id: 1, text: 'Old record' }]);
      owner.data.events.once('beforeChange', () => owner.data.parse([{ id: 1, text: 'Nested record' }], { silent: true }));
      const replaced = owner.data.update(1, { text: 'Stale write' });
      await frames();
      const text = owner.element.textContent;
      owner.data.events.once('beforeChange', () => owner.data.remove(1, { silent: true }));
      const removed = owner.data.update(1, { text: 'Ghost write' });
      await frames();
      const view = type === 'Grid' ? owner.view : owner.treeView;
      const empty = view.all().length === 0 && owner.data.get(1) === undefined;
      const stale = owner.element.textContent.includes('Ghost write') || owner.element.textContent.includes('Nested record');
      owner.destroy();
      return { replaced, removed, nested: text.includes('Nested record'), obsolete: text.includes('Stale write'), empty, stale };
    }, type);
    expect(result).toEqual({ replaced: false, removed: false, nested: true, obsolete: false, empty: true, stale: false });
  });

  test(`${type} nested undo keeps history and visible rows synchronized`, async ({ page }) => {
    const result = await page.evaluate(async type => {
      const ui = await import('/src/ui/all.js');
      const owner = new ui[type]({ columns: [{ id: 'text' }], width: 400, height: 180 }).mount(document.querySelector('#root'));
      owner.data.batch(() => owner.data.add({ id: 1, text: 'First record' }));
      owner.data.batch(() => owner.data.add({ id: 2, text: 'Second record' }));
      owner.data.events.once('beforeChange', () => owner.data.undo({ silent: true }));
      const changed = owner.data.undo();
      await new Promise(requestAnimationFrame); await new Promise(requestAnimationFrame);
      const text = owner.element.textContent;
      const next = owner.data.undo();
      const view = type === 'Grid' ? owner.view : owner.treeView;
      const empty = view.all().length === 0;
      const redo = owner.data.redo();
      const ids = view.all().map(item => item.id);
      owner.destroy();
      return { changed, first: text.includes('First record'), second: text.includes('Second record'), next, empty, redo, ids };
    }, type);
    expect(result).toEqual({ changed: false, first: true, second: false, next: true, empty: true, redo: true, ids: [1] });
  });
}
