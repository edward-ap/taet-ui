import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  page.on('pageerror', error => { throw error; });
  await page.goto('/browser-tests/recipes.html');
});

for (const type of ['Grid', 'TreeGrid']) {
  for (const hook of type === 'Grid' ? ['render', 'value', 'rowClass', 'format', 'detail', 'groupValue', 'summary', 'summaryFormat', 'statusFormat', 'editor', 'readOnly'] : ['render', 'value', 'nodeIcon']) {
    test(`${type} ${hook} stops a render pass after teardown or data replacement`, async ({ page }) => {
      const results = await page.evaluate(async ({ type, hook }) => {
        const ui = await import('/src/ui/all.js');
        const results = [];
        for (const action of ['destroy', 'replace']) {
          let owner, armed = false, calls = 0;
          const callback = () => {
            if (!armed) return;
            armed = false; calls++;
            if (action === 'destroy') owner.destroy();
            else owner.data.parse([{ id: 'new', text: 'Current record' }], { silent: true });
          };
          const column = { id: 'text' };
          if (hook === 'render') column.render = value => { callback(); return value; };
          if (hook === 'value' || hook === 'groupValue') column.value = item => { callback(); return item.text; };
          if (hook === 'summary') column.summary = { kind: 'custom', value: rows => { callback(); return rows.length; } };
          if (hook === 'summaryFormat') { column.summary = 'count'; column.summaryFormat = value => { callback(); return String(value); }; }
          if (hook === 'editor') column.editor = () => { callback(); return ui.gridEditors.text(); };
          if (hook === 'readOnly') { column.editor = ui.gridEditors.text(); column.readOnly = () => { callback(); return false; }; }
          owner = new ui[type]({ columns: [column], treeColumnId: 'text', width: 400, height: 200,
            ...(hook === 'rowClass' ? { rowClass: () => { callback(); return ''; } } : {}),
            ...(hook === 'format' ? { formatting: [{ when: () => { callback(); return true; }, className: 'formatted' }] } : {}),
            ...(hook === 'detail' ? { rowDetail: () => { callback(); return 'Detail'; } } : {}),
            ...(hook === 'nodeIcon' ? { nodeIcon: () => { callback(); return null; } } : {}),
            ...(hook === 'statusFormat' ? { statusBar: { visible: true, formatNumber: function (value) {
              'use strict';
              if (this !== undefined) throw new Error('formatter receiver changed');
              callback(); return String(value);
            } } } : {})
          }).mount(document.querySelector('#root'));
          owner.data.parse([{ id: 'old', text: 'Obsolete record' }]);
          if (hook === 'detail') owner.expandDetail('old');
          if (hook === 'groupValue') owner.setGroups(['text']);
          armed = true;
          let error = null;
          try { owner.refresh(); } catch (failure) { error = failure.message; }
          await new Promise(requestAnimationFrame); await new Promise(requestAnimationFrame);
          const text = document.querySelector('#root').textContent;
          results.push({ action, error, calls, destroyed: owner.destroyed,
            current: text.includes('Current record'), stale: text.includes('Obsolete record') });
          owner.destroy();
        }
        return results;
      }, { type, hook });
      expect(results).toEqual([
        { action: 'destroy', error: null, calls: 1, destroyed: true, current: false, stale: false },
        { action: 'replace', error: null, calls: 1, destroyed: false, current: true, stale: false }
      ]);
    });
  }

  test(`${type} recursive refresh is bounded and a throwing renderer can be retried`, async ({ page }) => {
    const result = await page.evaluate(async type => {
      const ui = await import('/src/ui/all.js');
      let action = '', calls = 0, owner;
      owner = new ui[type]({ columns: [{ id: 'text', render(value) {
        calls++;
        if (action === 'refresh') { if (calls > 20) throw new Error('recursive render'); owner.refresh(); }
        if (action === 'throw') throw new Error('consumer failure');
        return value;
      } }], treeColumnId: 'text' }).mount(document.querySelector('#root'));
      owner.data.parse([{ id: 1, text: 'Record' }]);
      action = 'refresh';
      let recursiveError = null;
      try { owner.refresh(); } catch (error) { recursiveError = error.message; }
      await new Promise(requestAnimationFrame); await new Promise(requestAnimationFrame);
      const bounded = calls < 5;
      action = 'throw';
      let consumerError;
      try { owner.refresh(); } catch (error) { consumerError = error.message; }
      action = ''; owner.refresh();
      const recovered = owner.element.textContent.includes('Record');
      owner.destroy();
      return { recursiveError, bounded, consumerError, recovered };
    }, type);
    expect(result).toEqual({ recursiveError: null, bounded: true, consumerError: 'consumer failure', recovered: true });
  });

  test(`${type} initial mount renderer teardown cannot remount the destroyed owner`, async ({ page }) => {
    const result = await page.evaluate(async type => {
      const ui = await import('/src/ui/all.js');
      let owner;
      owner = new ui[type]({ columns: [{ id: 'text', render() { owner.destroy(); return 'obsolete'; } }] });
      owner.data.parse([{ id: 1, text: 'Record' }]);
      let error = null;
      try { owner.mount(document.querySelector('#root')); } catch (failure) { error = failure.message; }
      return { error, destroyed: owner.destroyed, mounted: owner.mounted, children: document.querySelector('#root').childElementCount };
    }, type);
    expect(result).toEqual({ error: null, destroyed: true, mounted: false, children: 0 });
  });

  test(`${type} continuously mutating renderers stop after eight passes and can recover`, async ({ page }) => {
    page.removeAllListeners('pageerror');
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.evaluate(async type => {
      const ui = await import('/src/ui/all.js');
      window.renderCalls = 0; window.mutateRender = true;
      window.renderOwner = new ui[type]({ columns: [{ id: 'text', render(value) {
        if (window.mutateRender) {
          window.renderCalls++;
          window.renderOwner.data.parse([{ id: 1, text: 'Recovered' }], { silent: true });
        }
        return value;
      } }] }).mount(document.querySelector('#root'));
      window.renderOwner.data.parse([{ id: 1, text: 'Initial' }]);
    }, type);
    await expect.poll(() => errors).toEqual(['Grid render callbacks did not settle after 8 passes. Keep render callbacks pure.']);
    expect(await page.evaluate(() => window.renderCalls)).toBe(8);
    await page.evaluate(() => { window.mutateRender = false; window.renderOwner.refresh(); });
    await expect(page.locator('.dui-grid__body')).toContainText('Recovered');
    await page.evaluate(() => window.renderOwner.destroy());
  });
}

test('direct Grid summary painting stops after formatter teardown', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const { Grid } = await import('/src/ui/all.js');
    const owner = new Grid({ columns: [{ id: 'text' }] }).mount(document.querySelector('#root'));
    owner.data.parse([{ id: 1, text: 'Record' }]);
    let error = null;
    const events = [];
    owner.events.on('summaryChange', () => events.push('summary'));
    try { owner.setColumnSummary('text', { kind: 'custom', value() { owner.destroy(); return 'old'; } }); }
    catch (failure) { error = failure.message; }
    return { error, events, destroyed: owner.destroyed, children: document.querySelector('#root').childElementCount };
  });
  expect(result).toEqual({ error: null, events: [], destroyed: true, children: 0 });
});

test('nested Grid summary replacement wins without recursive footer painting', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const { Grid } = await import('/src/ui/all.js');
    const owner = new Grid({ columns: [{ id: 'text' }] }).mount(document.querySelector('#root'));
    owner.data.parse([{ id: 1, text: 'Record' }]);
    const events = [];
    let calls = 0;
    owner.events.on('summaryChange', event => events.push(event.summary));
    owner.setColumnSummary('text', { kind: 'custom', value() {
      calls++;
      owner.setColumnSummary('text', 'count');
      return 'Obsolete summary';
    } });
    await new Promise(requestAnimationFrame); await new Promise(requestAnimationFrame);
    const text = owner.element.querySelector('.dui-grid__footer').textContent;
    owner.destroy();
    return { calls, events, text };
  });
  expect(result).toEqual({ calls: 1, events: ['count'], text: 'Count 1' });
});

test('Grid detail expansion requested by a renderer survives interrupted painting', async ({ page }) => {
  await page.evaluate(async () => {
    const { Grid } = await import('/src/ui/all.js');
    let armed = true;
    const owner = new Grid({ rowDetail: () => 'Expanded detail', columns: [{ id: 'text', render(value) {
      if (armed) { armed = false; owner.expandDetail(1); }
      return value;
    } }] }).mount(document.querySelector('#root'));
    owner.data.parse([{ id: 1, text: 'Record' }]);
  });
  await expect(page.locator('.dui-grid__body')).toContainText('Expanded detail');
});
