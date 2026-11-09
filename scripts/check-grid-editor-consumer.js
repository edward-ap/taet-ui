import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';
import { checkGridEditorServices } from './check-grid-editor-services.js';
import { checkInputBrowserConsumer } from './check-input-consumer.js';
import { checkChoiceInputBrowserConsumer } from './check-choice-input-consumer.js';
import { checkDateTimeBrowserConsumer } from './check-date-time-consumer.js';
import { checkRemainingInputBrowserConsumer } from './check-remaining-input-consumer.js';
import { checkSpecializedInputBrowserConsumer } from './check-specialized-input-consumer.js';
import { checkIndicatorInputBrowserConsumer } from './check-indicator-input-consumer.js';
import { checkNumberCommitBrowserConsumer } from './check-number-commit-consumer.js';

// The caller supplies a freshly installed, compiled consumer outside the checkout.
// Only this test harness creates DOM hosts; the compiled recipe uses Tæt UI editors.
export async function checkGridEditorBrowserConsumer(consumer) {
  const installed = JSON.parse(await readFile(path.join(consumer, 'node_modules/taet-ui/package.json'), 'utf8'));
  const imports = {};
  imports['taet-ui'] = `/node_modules/taet-ui/${installed.exports['.'].default.slice(2)}`;
  for (const name of ['./core', './grid', './grid/editors', './inputs', './experimental', './all', './foundation', './components', './advanced']) {
    const entry = installed.exports[name];
    imports[`taet-ui/${name.slice(2)}`] = `/node_modules/taet-ui/${(typeof entry === 'string' ? entry : entry.default).slice(2)}`;
  }
  const html = `<!doctype html><html><head><link rel="stylesheet" href="/node_modules/taet-ui/src/ui/taet-ui.css">
    <script type="importmap">${JSON.stringify({ imports })}</script></head><body><div id="root"></div></body></html>`;
  const server = createServer(async (req, res) => {
    try {
      const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      if (pathname === '/') { res.setHeader('Content-Type', 'text/html'); res.end(html); return; }
      const file = path.resolve(consumer, '.' + pathname);
      if (!file.startsWith(consumer + path.sep)) { res.writeHead(403).end(); return; }
      res.setHeader('Content-Type', file.endsWith('.css') ? 'text/css' : 'text/javascript');
      res.end(await readFile(file));
    } catch { res.writeHead(404).end(); }
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  let browser, page;
  try {
    browser = await chromium.launch({ headless: true });
    page = await browser.newPage();
    await page.context().tracing.start({ screenshots: true, snapshots: true, sources: true });
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    const url = `http://127.0.0.1:${server.address().port}/`;
    for (const kind of ['Grid', 'TreeGrid']) {
      await page.goto(url);
      await page.evaluate(async kind => {
        const { Grid, TreeGrid, gridEditors } = await import('taet-ui/grid');
        const { DataStore } = await import('taet-ui/core');
        const editors = await import('taet-ui/grid/editors');
        if (gridEditors !== editors.gridEditors) throw new Error('Editor subpath introduced wrappers');
        const recipe = await import('/output/grid-editor-consumer.js');
        const jsRecipe = await import('/output/grid-editor-javascript.js');
        if (!editors.isGridEditorFactory(jsRecipe.editor)) throw new Error('JSDoc recipe factory');
        const data = new DataStore();
        data.parse([{ id: 4, parentId: 1, name: 'Beta', limit: 60 },
          { id: 1, parentId: null, name: 'Alpha', limit: 60 },
          { id: 3, parentId: null, name: 'Gamma', limit: 60 }]);
        const grid = new (kind === 'Grid' ? Grid : TreeGrid)({ data, columns: recipe.columns,
          treeColumnId: 'name', expandedIds: [1], width: 500, height: 240, rowHeight: 24 });
        grid.mount(document.querySelector('#root'));
        grid.sortBy('name', 'asc'); grid.refresh();
        const observer = recipe.observe(grid), commits = [];
        grid.events.on('editCommit', event => commits.push({ changed: event.changed, writeResult: event.writeResult, cancel: event.cancel }));
        window.consumer = { grid, data, recipe, observer, commits };
        if (!grid.startEdit(4, 'name', { origin: 'user', userAction: true })) throw new Error('Failed to start editing');
      }, kind);
      const input = page.locator('.dui-grid__editor-host input');
      assert.equal(await input.inputValue(), 'Beta / 1', `${kind}: projection context`);
      assert.equal(await input.getAttribute('placeholder'), 'Position 1');
      assert.equal(await input.getAttribute('maxlength'), '60');
      const callbacks = await page.evaluate(() => {
        const { grid, recipe } = consumer, control = recipe.focusedControl;
        if (!control || control === grid || control.value.get() !== 'Beta / 1') throw new Error('Typed callback source is not the editor');
        const field = control.element.querySelector('input');
        let bubbled = false;
        const listener = () => { bubbled = true; };
        document.addEventListener('keydown', listener);
        const event = new KeyboardEvent('keydown', { key: 'F2', code: 'F2', bubbles: true, cancelable: true });
        field.dispatchEvent(event);
        document.removeEventListener('keydown', listener);
        field.dispatchEvent(new KeyboardEvent('keyup', { key: 'F2', code: 'F2', bubbles: true }));
        const oldResize = recipe.controlEvents.resize;
        control.setSize(210, 30);
        control.blur(); control.focus();
        return { prevented: event.defaultPrevented, bubbled, focused: recipe.controlEvents.focusValues.includes('Beta / 1'),
          blurred: recipe.controlEvents.blur > 0, resized: recipe.controlEvents.resize > oldResize,
          keyDown: recipe.controlEvents.keys.includes('down:F2'), keyUp: recipe.controlEvents.keys.includes('up:F2') };
      });
      assert.deepEqual(callbacks, { prevented: true, bubbled: false, focused: true, blurred: true, resized: true, keyDown: true, keyUp: true });
      await input.fill('');
      assert.equal(await page.evaluate(() => consumer.grid.commitEdit()), false, `${kind}: validation rejection`);
      assert.equal(await input.count(), 1, `${kind}: rejected editor remains mounted`);
      await input.fill('VETO');
      assert.equal(await page.evaluate(() => consumer.grid.commitEdit()), false, `${kind}: mutation veto`);
      await input.fill(' Updated ');
      assert.equal(await page.evaluate(() => consumer.grid.commitEdit()), true, `${kind}: commit`);
      assert.equal(await input.count(), 0);
      const committed = await page.evaluate(() => ({ name: consumer.data.get(4).name,
        events: consumer.observer.events, attempts: consumer.observer.attempts, commits: consumer.commits,
        captures: consumer.recipe.captures, validations: consumer.recipe.validationContexts,
        valueEvents: consumer.recipe.valueEvents, resolvers: consumer.recipe.resolverSources }));
      assert.equal(committed.name, 'Updated');
      assert.deepEqual(committed.events, ['reject:validation', 'reject:before-cell-change', 'commit:4']);
      assert.deepEqual(committed.attempts,
        ['editReject', 'beforeCellChange', 'editReject', 'beforeCellChange', 'cellChange', 'editCommit']
          .map(type => ({ type, columnId: 'name', origin: 'api', userAction: false })));
      assert.deepEqual(committed.commits, [kind === 'Grid' ? { changed: true, writeResult: true, cancel: undefined } :
        { changed: true, writeResult: true, cancel: false }]);
      assert.deepEqual(committed.captures[0], { id: 4, rowIndex: 1, value: 'Beta / 1' });
      assert.ok(committed.validations.length >= 3 && committed.validations.every(index => index === 1));
      assert.ok(committed.valueEvents.includes(' UPDATED '));
      assert.ok(committed.resolvers.includes('present') && committed.resolvers.includes('absent'));
      await page.evaluate(() => { consumer.grid.startEdit(4, 'name', { origin: 'user', userAction: true }); });
      await input.fill('Cancelled');
      assert.equal(await page.evaluate(() => consumer.recipe.cancelForReload(consumer.grid)), true);
      assert.deepEqual(await page.evaluate(() => consumer.observer.cancellations), [
        { origin: 'system', userAction: false, reason: 'reload' }
      ]);
      const teardown = await page.evaluate(() => {
        const { grid, data, recipe, observer } = consumer;
        grid.startEdit(4, 'name'); observer.dispose(); grid.destroy();
        const result = { created: recipe.customCreated, destroyed: recipe.customDestroyed,
          name: data.get(4).name, storeAlive: !data.destroyed };
        data.destroy(); return result;
      });
      assert.equal(teardown.created, 3);
      assert.equal(teardown.destroyed, teardown.created);
      assert.equal(teardown.name, 'Updated');
      assert.equal(teardown.storeAlive, true);
      console.log(`Installed ${kind} editor consumer OK: context, validation, veto, commit, cancel, teardown`);
    }
    // Compiled raw factories transfer ownership even when mounting fails or closes the table.
    for (const kind of ['Grid', 'TreeGrid']) {
      await page.goto(url);
      const activation = await page.evaluate(async kind => {
        const { Grid, TreeGrid } = await import('taet-ui/grid');
        const recipe = await import('/output/grid-editor-consumer.js');
        let grid, fail = true, released = 0, started = 0;
        const editor = recipe.activationEditor(() => { if (fail) throw new Error('typed mount failure'); }, () => released++);
        grid = new ({ Grid, TreeGrid }[kind])('#root', { height: 220, columns: [{ id: 'name', width: 180, editor }] });
        grid.data.parse([{ id: 1, parentId: null, name: 'One', limit: 60 }]);
        grid.events.on('editStart', () => started++);
        let rejected = false;
        try { grid.startEdit(1, 'name'); } catch (error) { rejected = error.message === 'typed mount failure'; }
        const empty = !document.querySelector('.dui-grid__editor-host');
        fail = false;
        const retried = grid.startEdit(1, 'name', { silent: true });
        grid.destroy();
        return { rejected, empty, retried, released, started };
      }, kind);
      assert.deepEqual(activation, { rejected: true, empty: true, retried: true, released: 2, started: 0 });
      console.log(`Installed ${kind} activation consumer OK: failed mount, cleanup and silent retry`);
    }
    // Mount and execute each declared built-in, including its real return-value semantics.
    await page.goto(url);
    const values = await page.evaluate(async () => {
      const { gridEditors, ControlCellEditor, createGridEditorFactory } = await import('taet-ui/grid/editors');
      const { Grid } = await import('taet-ui/grid');
      const grid = new Grid({ columns: [{ id: 'value' }] });
      grid.data.parse([{ id: 1, value: '' }]);
      const result = {};
      for (const [name, value, options] of [
        ['text', 'hello', {}], ['number', 12, { min: 0 }], ['numberEmpty', null, {}],
        ['select', 7, { options: [{ id: 7, text: 'Seven' }] }],
        ['radio', 'a', { options: ['a', 'b'], layout: 'flow', markerStyle: 'letter' }],
        ['checkbox', true, {}], ['switch', false, {}], ['date', '2026-09-06', {}],
        ['time', '12:30', { hourMode: '12' }], ['dateTime', '2026-09-06T12:30', {}]
      ]) {
        const context = { source: grid, grid, item: grid.data.get(1), id: 1, rowIndex: 0,
          column: grid.getColumn('value'), columnId: 'value', value };
        const editor = gridEditors[name === 'numberEmpty' ? 'number' : name](options).createCellEditor(context);
        const host = document.createElement('div'); document.body.append(host);
        editor.mount(host); editor.focus();
        if (editor.validate().ok !== true) throw new Error(`Unexpected ${name} validation`);
        result[name] = editor.getValue(); editor.destroy(); host.remove();
        if (!editor.destroyed || editor.context !== null) throw new Error(`Leaked ${name} editor`);
      }
      const context = { source: grid, grid, item: grid.data.get(1), id: 1, rowIndex: 0,
        column: grid.getColumn('value'), columnId: 'value', value: 'fallback' };
      let disposed = false;
      const control = { value: { get: () => 'fallback', set: () => true }, mount() {}, focus() {}, destroy() { disposed = true; } };
      const adapter = new ControlCellEditor(control, context);
      if (!adapter.validate().ok || adapter.getValue() !== 'fallback') throw new Error('Optional control validation');
      adapter.destroy(); if (!disposed) throw new Error('Adapter cleanup');
      const raw = { mount() {}, getValue() { return 'raw'; }, validate() { return { ok: true }; }, focus() {}, destroy() {} };
      if (createGridEditorFactory(() => raw).createCellEditor(context) !== raw) throw new Error('Raw editor identity');
      const jsRecipe = await import('/output/grid-editor-javascript.js');
      const jsEditor = jsRecipe.editor.createCellEditor({ ...context, item: { id: 1, label: 'JSDoc label' }, value: 'JS value' });
      const jsHost = document.createElement('div'); document.body.append(jsHost);
      jsEditor.mount(jsHost);
      if (jsHost.querySelector('input')?.placeholder !== 'JSDoc label' || jsEditor.getValue() !== 'JS value') throw new Error('JSDoc editor context');
      jsEditor.destroy(); jsHost.remove();
      grid.destroy(); return result;
    });
    assert.deepEqual(values, { text: 'hello', number: 12, numberEmpty: null, select: 7, radio: 'a', checkbox: true,
      switch: false, date: '2026-09-06', time: '12:30', dateTime: '2026-09-06T12:30' });
    for (const kind of ['Grid', 'TreeGrid']) {
      await page.goto(url);
      const modelState = await page.evaluate(async kind => {
        const { Grid, TreeGrid } = await import('taet-ui/grid');
        const models = await import('/output/grid-model-fixture.js');
        const fixture = kind === 'Grid' ? models.createGridModels() : models.createTreeModels();
        const grid = new (kind === 'Grid' ? Grid : TreeGrid)({ ...fixture.options,
          columns: [{ id: 'name', width: 240 }], width: 500, height: 240, treeColumnId: 'name' });
        grid.mount('#root');
        grid.setSelectedIds([2]);
        if (fixture.options.selection.get()[0]?.id !== 2) throw new Error('Grid selection must hold records');
        fixture.updateSilently(); grid.refresh();
        if (!grid.element.textContent.includes('Silent root')) throw new Error('Silent model mutation did not render');
        fixture.hideSelected(); grid.refresh();
        if (grid.getSelectedIds().length || fixture.options.selection.hasAny()) throw new Error('Hidden selection not reconciled');
        let remote = null;
        if (kind === 'Grid') {
          grid.setCellRanges({ anchor: { rowId: 1, columnId: 'name' } });
          if (fixture.options.ranges.primary()?.anchor.rowId !== 1 ||
            !grid.element.querySelector('.dui-grid__cell--range-selected')) throw new Error('External range model did not render');
          // The external view and Grid now share the global predicate.
          grid.clearFilter();
          await grid.reloadRemote({ page: 3, pageSize: 2 }); grid.refresh();
          remote = { ids: grid.data.all().map(row => row.id), total: grid.remoteTotalCount };
          if (!grid.element.textContent.includes('Remote 3:0')) throw new Error('Typed provider response did not render');
        }
        grid.destroy(); const survived = fixture.isAlive(); fixture.destroy();
        return { survived, disposed: !fixture.isAlive(), remote };
      }, kind);
      assert.deepEqual(modelState, { survived: true, disposed: true,
        remote: kind === 'Grid' ? { ids: [5, 6], total: 1000 } : null });
      console.log(`Installed ${kind} model consumer OK: silent projection, record selection, external ownership${kind === 'Grid' ? ', ranges and remote loading' : ''}`);
    }
    for (const kind of ['Grid', 'TreeGrid']) {
      await page.goto(url);
      await page.evaluate(async kind => {
        const recipe = await import('/output/grid-filter-owner.js');
        const fixture = kind === 'Grid' ? recipe.createGridFilterOwner() : recipe.createTreeFilterOwner();
        const { table, view } = fixture;
        table.mount('#root');
        const silent = { silent: true, origin: 'restore' };
        const events = [];
        for (const type of ['sortChange', 'filterChange', 'searchChange', 'viewChange', 'treeViewChange', 'selectionChange']) {
          table.events.on(type, () => events.push(type));
        }
        const paint = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        const checkRows = expected => {
          const actual = Array.from(table.element.querySelectorAll('.dui-grid__row[data-dui-grid-row-id]'), row => row.dataset.duiGridRowId);
          if (actual.join() !== expected.map(id => `number:${id}`).join()) throw new Error(`${kind}: expected rows ${expected}; got ${actual}`);
        };
        view.setFilter(row => row.amount <= 30, silent);
        fixture.restrictColumn(); fixture.search('Beta');
        await paint(); checkRows([2]);
        if (table.element.querySelector('.dui-grid__search-input')?.value !== 'Beta') throw new Error('Programmatic search did not synchronize its input');
        const external = row => row.amount >= 30;
        view.setFilter(external, silent);
        if (table.getFilter() !== external || view.getFilter() !== external) throw new Error('Global predicate identity');
        await paint(); checkRows([4]);
        table.clearFilter(silent);
        fixture.sort(); await paint(); checkRows([4, 2]);
        table.clearSort(silent); await paint(); checkRows([2, 4]);
        table.clearAllFilters(silent); fixture.search('');
        await paint(); checkRows([1, 2, 3, 4]);
        if (events.length) throw new Error(`Silent projection emitted ${events}`);
        // Same-result predicate updates still synchronize table state and status.
        const all = () => true; view.setFilter(all, silent);
        await paint(); checkRows([1, 2, 3, 4]);
        if (table.getFilter() !== all || (kind === 'Grid' && !table.getStatusBarState().filterActive)) throw new Error('Same-result filter state');
        fixture.restrictColumn(); fixture.search('Beta');
        table.destroy();
        if (view.destroyed || view.getFilter() !== all || view.all().length !== 4) throw new Error('External view retained table predicates after teardown');
        view.setFilter(row => row.id === 1, silent);
        if (view.all()[0]?.id !== 1) throw new Error('External view stopped working after teardown');
        fixture.destroy();
      }, kind);
      console.log(`Installed ${kind} filter owner OK: shared predicate, silent composition/sort, DOM and detached external view`);
    }
    await page.goto(url);
    const gridState = await page.evaluate(async () => {
      const { Grid } = await import('taet-ui/grid');
      const { createGridState, configureColumns, checkColumnDOM } = await import('/output/grid-state-browser.js');
      const fixture = createGridState();
      const grid = new Grid({ ...fixture.options, width: 520, height: 260 }); grid.mount('#root');
      const semanticEvents = [];
      for (const type of ['layoutChange', 'searchChange', 'viewChange', 'pageChange', 'groupChange']) {
        grid.events.on(type, () => semanticEvents.push(type));
      }
      const visible = configureColumns(grid.columnModel);
      checkColumnDOM(grid.element);
      const layout = grid.getLayoutState();
      grid.showColumn('category', { silent: true });
      grid.restoreLayoutState(layout, { silent: true });
      checkColumnDOM(grid.element);
      fixture.filterSilently();
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      if (grid.view.all().map(row => row.id).join() !== '1,2' || grid.element.textContent.includes('Gamma')) throw new Error('Silent column filter projection');
      fixture.search();
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      if (grid.view.all().map(row => row.id).join() !== '2' || grid.element.textContent.includes('Alpha')) throw new Error('Injected search model projection');
      fixture.highlightSilently();
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      if (grid.element.querySelectorAll('.dui-grid__cell--search-match').length !== 1 || !grid.element.textContent.includes('Alpha')) throw new Error('Silent search mode did not restore/highlight rows');
      fixture.excludeMatchesSilently();
      if (grid.element.querySelector('.dui-grid__cell--search-match')) throw new Error('Silent search columns did not clear highlight');
      fixture.options.filters.clearAll({ silent: true });
      fixture.highlightSilently();
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      fixture.clearIntoFilterSilently();
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      if (grid.element.querySelector('.dui-grid__cell--search-match')) throw new Error('Empty filter search left old highlights');
      fixture.filterSilently();
      fixture.clearSearch(); fixture.groupSilently();
      // Let the model invalidation paint; do not mask a missing subscription with refresh.
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      if (grid.element.querySelectorAll('.dui-grid__group-row').length !== 2) throw new Error('Silent grouping did not render');
      if (fixture.collapseFirst() !== false) throw new Error('Group collapse result');
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      if (grid.element.textContent.includes('Alpha') || !grid.element.textContent.includes('Beta')) throw new Error('Silent group collapse did not render');
      const events = fixture.events();
      if (semanticEvents.length) throw new Error(`Silent state emitted ${semanticEvents.join()}`);
      const width = grid.columnModel.get('amount').width, frozen = grid.columnModel.get('amount').frozen;
      grid.destroy();
      const survived = fixture.isAlive(), columnsDisposed = grid.columnModel.destroyed && grid.columnModel.events.destroyed;
      fixture.afterGridDestroy(); fixture.destroy();
      return { visible, width, frozen, events, survived, columnsDisposed, disposed: !fixture.isAlive() };
    });
    assert.deepEqual(gridState, { visible: ['amount', 'name'], width: 145, frozen: 'left',
      events: { filterChanges: 0, groupChanges: 0 }, survived: true, columnsDisposed: true, disposed: true });
    await page.goto(url);
    const treeColumns = await page.evaluate(async () => {
      const { TreeGrid } = await import('taet-ui/grid');
      const { columns, rows, configureColumns, checkColumnDOM } = await import('/output/grid-state-browser.js');
      const tree = new TreeGrid({ columns, treeColumnId: 'name', width: 520, height: 260 });
      tree.data.parse(rows.map(row => ({ ...row, parentId: null }))); tree.mount('#root');
      let layoutChanges = 0;
      tree.events.on('layoutChange', () => layoutChanges++);
      const visible = configureColumns(tree.columnModel);
      checkColumnDOM(tree.element);
      const layout = tree.getLayoutState();
      tree.showColumn('category', { silent: true });
      tree.restoreLayoutState(layout, { silent: true });
      checkColumnDOM(tree.element);
      if (layoutChanges) throw new Error('Silent TreeGrid columns emitted layoutChange');
      if (!tree.element.textContent.includes('Beta') || tree.columnModel.get('amount').width !== 145) throw new Error('TreeGrid column model integration');
      tree.destroy(); return { visible, disposed: tree.columnModel.events.destroyed };
    });
    assert.deepEqual(treeColumns, { visible: ['amount', 'name'], disposed: true });
    console.log('Installed Grid state integration OK: columns in both grids, silent filters/groups, search, collapse and ownership');
    await page.goto(url);
    const lifecycle = await page.evaluate(async () => {
      const { Panel } = await import('taet-ui');
      const { verifyBaseControl } = await import('/output/base-control-browser.js');
      return verifyBaseControl(new Panel('#root', { observeResize: false }));
    });
    assert.deepEqual(lifecycle, { cancelled: true, released: 1, calls: 1, globalKeys: 1, keyEvents: 1 });
    console.log('Installed BaseControl consumer OK: subclass, DOM state, focus, keyboard veto, resize and Panel ownership');
    for (const kind of ['Grid', 'TreeGrid']) {
      await page.goto(url);
      await page.evaluate(async kind => {
        const recipe = await import('/output/grid-constructor-consumer.js');
        const { Grid, TreeGrid } = await import('taet-ui/grid');
        const fixture = kind === 'Grid' ? recipe.createGrid('#root') : { grid: recipe.createTree('#root') };
        const grid = fixture.grid;
        if (!(grid instanceof (kind === 'Grid' ? Grid : TreeGrid))) throw new Error('Compiled constructor identity');
        if (kind === 'Grid') {
          grid.expandDetail(1); grid.refresh();
          if (!grid.element.textContent.includes('Details: Root')) throw new Error('Typed row detail');
        }
        const commits = [];
        grid.events.on('editCommit', event => commits.push(event.columnId));
        if (!grid.startEdit(1, 'name')) throw new Error('Typed constructor editor activation');
        window.typedGrid = { fixture, grid, commits };
      }, kind);
      const editor = page.locator('.dui-grid__editor-host input');
      await editor.fill('Changed by typed constructor');
      const outcome = await page.evaluate(kind => {
        const { grid, fixture, commits } = typedGrid;
        if (!grid.commitEdit()) throw new Error('Typed constructor edit commit');
        if (grid.data.get(1).name !== 'Changed by typed constructor') throw new Error('Typed record write');
        if (kind === 'Grid') {
          grid.setPage(2); grid.refresh();
          if (!grid.element.querySelector('.typed-high-amount')) throw new Error('Typed formatting callback');
          if (!grid.element.textContent.includes('Total 40')) throw new Error('Typed summary formatter');
          grid.setColumnFilter('name', { kind: 'text', operator: 'equals', value: 'Child' });
          if (grid.view.all()[0]?.id !== 2) throw new Error('Typed column filter');
        } else {
          grid.collapse(1); grid.refresh();
          if (grid.element.textContent.includes('Child')) throw new Error('Typed collapse');
          grid.expand(1); grid.refresh();
        }
        grid.destroy();
        const external = fixture.data ? !fixture.data.destroyed : null;
        fixture.data?.destroy();
        return { commits, external, destroyed: grid.destroyed };
      }, kind);
      assert.deepEqual(outcome, { commits: ['name'], external: kind === 'Grid' ? true : null, destroyed: true });
    }
    console.log('Installed typed constructors OK: direct TS Grid/TreeGrid construction, editors, detail/formatting/summary, paging and collapse');
    await page.goto(url);
    await page.evaluate(async()=>{const {verifyGridTransfer}=await import('/output/grid-transfer-consumer.js');verifyGridTransfer(document.querySelector('#root'));});
    console.log('Installed browser Grid transfer OK: independent stores and typed mapping');
    await page.goto(url);
    await page.evaluate(async () => {
      const host = document.querySelector('#root');
      const typed = await import('/output/grid-revision-consumer.js');
      const checkedJs = await import('/output/grid-revision-javascript.js');
      typed.checkGridRevisionBrowser(host);
      checkedJs.checkJavascriptRevisionBrowser(host);
      const properties = await import('/output/property-revision-consumer.js');
      const propertyJs = await import('/output/property-revision-javascript.js');
      properties.checkPropertyRevisionBrowser(host);
      propertyJs.checkPropertyRevisionJavascript(host);
    });
    console.log('Installed Grid/TreeGrid revision consumers OK: direct/custom controls, accepted/pending/final-read ABA, protocol diagnostics, retry and trusted overrides');
    console.log('Installed PropertyGrid revision consumers OK: typed strict diagnostics, staged custom hooks, inline inherited tracking, silent suppression and unchanged ordinary validation');
    await checkGridEditorServices(page, url);
    await checkInputBrowserConsumer(page, url);
    await checkChoiceInputBrowserConsumer(page, url);
    await checkDateTimeBrowserConsumer(page, url);
    await checkRemainingInputBrowserConsumer(page, url);
    await checkSpecializedInputBrowserConsumer(page, url);
    await checkIndicatorInputBrowserConsumer(page, url);
    await checkNumberCommitBrowserConsumer(page, url);
    await page.goto(url);
    await page.evaluate(async () => {
      const recipe = await import('/output/remaining-components-browser.js');
      await recipe.checkRemainingComponents(document.querySelector('#root'));
    });
    await page.evaluate(async()=>{const {checkThemeDesigner}=await import('/output/theme-designer-consumer.js');checkThemeDesigner(document.querySelector('#root'));});
    console.log('Installed ThemeDesigner OK: packaged assets, isolated snapshots and teardown');
    console.log('Installed remaining components OK: typed Form removal, list, PropertyGrid, Dialog, theme and teardown');
    assert.deepEqual(errors, [], 'Installed consumer browser errors');
    console.log('Installed built-in editor consumers OK: nine controls, nullable number, adapter and raw editor ownership');
    await page.context().tracing.stop();
  } catch (error) {
    // Retained with the caller's failed temporary consumer for diagnosis.
    if (page) {
      await page.screenshot({ path: path.join(consumer, 'editor-failure.png'), fullPage: true }).catch(() => {});
      await page.context().tracing.stop({ path: path.join(consumer, 'editor-trace.zip') }).catch(() => {});
    }
    throw error;
  } finally {
    try { await browser?.close(); } finally { await new Promise(resolve => server.close(resolve)); }
  }
}
