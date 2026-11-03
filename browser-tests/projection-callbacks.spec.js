import { test, expect } from '@playwright/test';
test.beforeEach(async ({ page }) => {
  page.on('pageerror', error => { throw error; });
  await page.goto('/browser-tests/recipes.html');
});

test('direct Grid global filtering preserves its receiver through external view detachment', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const { Grid, DataView, DataStore } = await import('/src/ui/all.js');
    const data = new DataStore(); data.parse([{ id: 1 }]);
    const view = new DataView({ data });
    const owner = new Grid({ data, view, columns: [{ id: 'id' }] }).mount(document.querySelector('#root'));
    let receiver;
    owner.setFilter(function () { 'use strict'; receiver = this; return true; });
    const plain = receiver === undefined;
    owner.destroy();
    view.refresh();
    const detached = receiver === view;
    view.destroy(); data.destroy();
    return { plain, detached };
  });
  expect(result).toEqual({ plain: true, detached: true });
});

for (const type of ['Grid', 'TreeGrid']) {
  for (const borrowed of [false, true]) {
    test(`${type} filter can destroy its owner with ${borrowed ? 'borrowed' : 'owned'} models`, async ({ page }) => {
      const result = await page.evaluate(async ({ type, borrowed }) => {
        const ui = await import('/src/ui/all.js');
        const data = new ui.DataStore(); data.parse([{ id: 1, text: 'One' }, { id: 2, text: 'Two' }]);
        const view = new ui[type === 'Grid' ? 'DataView' : 'TreeDataView']({ data });
        const owner = new ui[type]({ columns: [{ id: 'text' }], ...(borrowed ? { data, [type === 'Grid' ? 'view' : 'treeView']: view } : {}) }).mount(document.querySelector('#root'));
        if (!borrowed) owner.data.parse(data.all());
        let calls = 0;
        owner.setFilter(() => { if (++calls === 1) owner.destroy(); return true; });
        const alive = !view.destroyed && !data.destroyed;
        if (borrowed) view.setFilter(null);
        view.destroy(); data.destroy();
        return { destroyed: owner.destroyed, alive, remaining: document.querySelector('#root').childElementCount };
      }, { type, borrowed });
      expect(result).toEqual({ destroyed: true, alive: true, remaining: 0 });
    });
  }

  test(`${type} sort value callback teardown stops the second getter and sort event`, async ({ page }) => {
    const result = await page.evaluate(async type => {
      const ui = await import('/src/ui/all.js');
      let action = false, calls = 0;
      const owner = new ui[type]({ columns: [{ id: 'text', sortable: true, value(item) {
        if (action) { calls++; owner.destroy(); }
        return item.text;
      } }] }).mount(document.querySelector('#root'));
      owner.data.parse([{ id: 1, text: 'One' }, { id: 2, text: 'Two' }]);
      const events = [];
      owner.events.on('sortChange', () => events.push('sort'));
      action = true;
      owner.sortBy('text', 'asc');
      return { calls, events, destroyed: owner.destroyed };
    }, type);
    expect(result).toEqual({ calls: 1, events: [], destroyed: true });
  });

  test(`${type} filter data replacement updates DOM once with the surviving predicate`, async ({ page }) => {
    const result = await page.evaluate(async type => {
      const ui = await import('/src/ui/all.js');
      const owner = new ui[type]({ columns: [{ id: 'text' }], width: 400, height: 180 }).mount(document.querySelector('#root'));
      owner.data.parse([{ id: 1, text: 'Old' }]);
      let changed = false;
      owner.setFilter(() => {
        if (!changed) {
          changed = true;
          owner.data.parse([{ id: 8, text: 'Current' }, { id: 9, text: 'Excluded' }], { silent: true });
          owner.setFilter(item => item.id === 8, { silent: true });
        }
        return true;
      });
      await new Promise(requestAnimationFrame); await new Promise(requestAnimationFrame);
      const view = type === 'Grid' ? owner.view : owner.treeView;
      const ids = view.all().map(item => item.id);
      const text = owner.element.textContent;
      owner.destroy();
      return { ids, current: text.includes('Current'), stale: text.includes('Old') || text.includes('Excluded') };
    }, type);
    expect(result).toEqual({ ids: [8], current: true, stale: false });
  });

  test(`${type} nested sort updates the surviving header and does not emit the old sort`, async ({ page }) => {
    const result = await page.evaluate(async type => {
      const ui = await import('/src/ui/all.js');
      let change = false;
      const owner = new ui[type]({ columns: [
        { id: 'a', sortable: true, value(item) {
          if (change) { change = false; owner.sortBy('b', 'desc', { silent: true }); }
          return item.a;
        } }, { id: 'b', sortable: true }
      ] }).mount(document.querySelector('#root'));
      owner.data.parse([{ id: 1, a: 1, b: 1 }, { id: 2, a: 2, b: 2 }]);
      const events = [];
      owner.events.on('sortChange', event => events.push(event.columnId));
      change = true;
      owner.sortBy('a', 'asc');
      const view = type === 'Grid' ? owner.view : owner.treeView;
      const ids = view.all().map(item => item.id);
      const sort = owner.element.querySelector('.dui-grid__header-cell[data-dui-grid-column-id="b"]').getAttribute('aria-sort');
      owner.destroy();
      return { ids, sort, events };
    }, type);
    expect(result).toEqual({ ids: [2, 1], sort: 'descending', events: [] });
  });
}
