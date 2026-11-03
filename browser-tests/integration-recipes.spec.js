import { test, expect } from "@playwright/test";

async function mount(page, options = {}) {
  await page.goto('/browser-tests/recipes.html');
  await page.evaluate(async options => {
    const { createIntegrationRecipes } = await import('/examples/ai-recipes/12-integration-contracts.js');
    window.requests = []; window.saves = []; window.changes = [];
    const service = options.deferred ? {
      load(id) { return new Promise((resolve, reject) => requests.push({ id, resolve, reject })); },
      save(dto) { return new Promise((resolve, reject) => saves.push({ dto, resolve, reject })); }
    } : undefined;
    window.r = createIntegrationRecipes('#root', { ...options, ...(service ? { service } : {}) });
    r.grid.data.events.on('change', e => changes.push(e.operation));
  }, options);
}
const input = page => page.getByRole('textbox', { name: 'Record name', exact: true });
test.beforeEach(({ page }) => page.on('pageerror', error => { throw error; }));

test('checked integration host renders and DTO close envelope validates, cancels and destroys owned fields', async ({ page }, testInfo) => {
  await page.goto('/examples/ai-recipes/integration-contracts.html');
  await expect(input(page)).toHaveValue('Alpha');
  await page.getByRole('button', { name: 'Open DTO dialog', exact: true }).click();
  const field = page.getByRole('textbox', { name: 'Dialog name', exact: true });
  await field.fill('');
  await page.getByRole('button', { name: 'Return DTO', exact: true }).click();
  await expect(field).toBeVisible();
  await field.fill('DTO only');
  await page.getByRole('button', { name: 'Return DTO', exact: true }).click();
  await expect(field).toHaveCount(0);
  expect(await page.evaluate(() => integrationRecipes.getLastDialogResult())).toEqual({ id: 'a', name: 'DTO only' });
  expect(await page.evaluate(() => integrationRecipes.grid.data.get('a').name)).toBe('Alpha');
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: testInfo.outputPath('integration-light.png'), fullPage: true });
  await page.locator('body').evaluate(body => body.classList.replace('dui-theme-light-blue', 'dui-theme-dark-blue'));
  await page.screenshot({ path: testInfo.outputPath('integration-dark.png'), fullPage: true });
  await page.evaluate(() => { window.dialogSession = integrationRecipes.openDialog(); });
  await page.getByRole('button', { name: 'Cancel DTO', exact: true }).click();
  expect(await page.evaluate(() => dialogSession.promise)).toBeNull();
  expect(await page.evaluate(() => ({ dialog: dialogSession.dialog.destroyed, field: dialogSession.name.destroyed }))).toEqual({ dialog: true, field: true });
  await page.evaluate(() => integrationRecipes.destroy());
  await expect(page.locator('#integration-root')).toBeEmpty();
});

test('out of order loads, newer drafts and retry never overwrite the current record', async ({ page }) => {
  await mount(page, { deferred: true });
  await page.evaluate(() => { r.select('b'); requests[1].resolve({ id: 'b', name: 'Loaded B' }); });
  await expect(input(page)).toHaveValue('Loaded B');
  await page.evaluate(() => requests[0].resolve({ id: 'a', name: 'Stale A' }));
  await expect(input(page)).toHaveValue('Loaded B');
  await page.evaluate(() => { window.reloadResult = r.reload(); });
  await input(page).fill('Draft B');
  await page.evaluate(() => requests[2].resolve({ id: 'b', name: 'Late B' }));
  expect(await page.evaluate(() => reloadResult)).toBe(false);
  await expect(input(page)).toHaveValue('Draft B');
  await page.evaluate(() => { window.saveResult = r.save(); saves[0].reject(new Error('Retry me')); });
  expect(await page.evaluate(() => saveResult)).toBe(false);
  await expect(input(page)).toHaveValue('Draft B');
  expect(await page.evaluate(() => r.form.isDirty())).toBe(true);
  await page.evaluate(() => { window.saveResult = r.save(); });
  await input(page).fill('Newer draft');
  await page.evaluate(() => saves[1].resolve({ id: 'b', name: 'Draft B' }));
  expect(await page.evaluate(() => saveResult)).toBe(true);
  await expect(input(page)).toHaveValue('Newer draft');
  expect(await page.evaluate(() => ({ stored: r.grid.data.get('b').name, dirty: r.form.isDirty(), writes: changes.length }))).toEqual({ stored: 'Draft B', dirty: true, writes: 1 });
  await page.evaluate(() => r.destroy());
});

test('dirty context veto and silent projection pruning retain a draft without writing another record', async ({ page }) => {
  await mount(page);
  await expect(input(page)).toHaveValue('Alpha');
  await input(page).fill('Unsent A');
  expect(await page.evaluate(() => r.select('b'))).toBe(false);
  expect(await page.evaluate(() => r.setSearch('Beta'))).toBe(false);
  await page.evaluate(() => { window.semanticSelections = 0; r.grid.events.on('selectionChange', () => semanticSelections++); r.grid.setFilter(row => row.id === 'b', { silent: true }); });
  expect(await page.evaluate(() => ({ context: r.getContext(), selected: r.grid.getSelectedIds(), events: semanticSelections }))).toEqual({ context: { selectedId: null, draftRecordId: 'a', dirty: true, loading: false, saving: false }, selected: [], events: 0 });
  await expect(input(page)).toHaveValue('Unsent A');
  expect(await page.evaluate(() => r.save())).toBe(false);
  await page.evaluate(() => { r.grid.setFilter(null, { silent: true }); r.select('a'); });
  await expect(input(page)).toHaveValue('Unsent A');
  await page.evaluate(() => { r.discardDraft(); r.setSearch('Beta'); });
  expect(await page.evaluate(() => r.getContext().selectedId)).toBeNull();
  await page.evaluate(() => { r.setSearch(''); r.select('b'); });
  await expect(input(page)).toHaveValue('Beta');
  expect(await page.evaluate(() => changes)).toEqual([]);
  await page.evaluate(() => r.destroy());
});

test('owner teardown settles dialog and ignores delayed load and save continuations', async ({ page }) => {
  await mount(page, { deferred: true });
  await input(page).fill('Pending');
  await page.evaluate(() => { window.saveResult = r.save(); window.session = r.openDialog(); r.destroy(); requests.forEach(x => x.resolve({ id: x.id, name: 'Late' })); saves[0].resolve({ id: 'a', name: 'Late save' }); });
  expect(await page.evaluate(async () => ({ saved: await saveResult, dialogResult: await session.promise, dialogReady: await session.ready, owner: r.owner.destroyed, field: r.name.destroyed }))).toEqual({ saved: false, dialogResult: null, dialogReady: false, owner: true, field: true });
  await expect(page.locator('#root')).toBeEmpty();
  await expect(page.locator('.dui-dialog')).toHaveCount(0);
});

test('delayed dialog content preserves a user draft and explicit reposition preserves a dragged location', async ({ page }) => {
  await mount(page, { deferred: true });
  await page.evaluate(() => { requests[0].resolve({ id: 'a', name: 'Alpha' }); window.session = r.openDialog(); });
  const field = page.getByRole('textbox', { name: 'Dialog name', exact: true });
  await field.fill('Dialog draft');
  const title = page.locator('.dui-dialog__header');
  const box = await title.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 75, box.y + box.height / 2 + 45, { steps: 5 }); await page.mouse.up();
  const before = await page.evaluate(() => { const b = session.dialog.element.getBoundingClientRect(); return { x: b.x, y: b.y }; });
  await page.evaluate(() => requests[1].resolve({ id: 'a', name: 'Late dialog' }));
  expect(await page.evaluate(() => session.ready)).toBe(true);
  await expect(field).toHaveValue('Dialog draft');
  expect(await page.evaluate(() => { const b = session.dialog.element.getBoundingClientRect(); return { x: b.x, y: b.y }; })).toEqual(before);
  await field.press('Escape');
  expect(await page.evaluate(() => session.promise)).toBeNull();
  await page.evaluate(() => r.destroy());
});

for (const rowRangeSelection of [false, true]) test(`active versus selected keyboard policy rowRangeSelection=${rowRangeSelection}`, async ({ page }) => {
  await mount(page, { rowRangeSelection });
  await page.evaluate(() => r.grid.events.on("activeChange", e => { window.activeId = e.id; }));
  const cell = page.getByRole("gridcell", { name: "Alpha", exact: true });
  await cell.click(); await page.keyboard.press('ArrowDown');
  expect(await page.evaluate(() => r.grid.getSelectedIds())).toEqual([rowRangeSelection ? 'b' : 'a']);
  expect(await page.evaluate(() => activeId)).toBe('b');
  await page.evaluate(() => r.destroy());
});

test('tree clear uses null and UI persistence listens to manual resize as well as layout change', async ({ page }) => {
  await mount(page);
  await page.evaluate(() => { r.tree.collapseAll(); r.tree.setFilter(() => true); });
  expect(await page.evaluate(() => r.tree.treeView.all().map(row => row.id))).toEqual(['root', 'child', 'leaf']);
  await page.evaluate(() => r.setTreeSearch(''));
  expect(await page.evaluate(() => r.tree.treeView.all().map(row => row.id))).toEqual(['root']);
  await page.evaluate(() => { window.resizeEnds = 0; window.layouts = 0; r.grid.events.on('columnResizeEnd', () => resizeEnds++); r.grid.events.on('layoutChange', () => layouts++); window.priorCount = r.getPersistenceCount(); });
  const handle = page.locator('[data-dui-grid-resize-column-id="name"]').last();
  const box = await handle.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 35, box.y + box.height / 2, { steps: 4 }); await page.mouse.up();
  expect(await page.evaluate(() => ({ resizeEnds, layouts, saved: r.getPersistenceCount() > priorCount }))).toEqual({ resizeEnds: 1, layouts: 0, saved: true });
  const state = await page.evaluate(() => { window.saved = r.saveUi(); return JSON.parse(saved); });
  expect(state.grid.columns.find(c => c.id === 'name').width).toEqual(expect.any(String));
  await page.evaluate(() => { r.grid.columnModel.setWidth('name', 99); r.grid.hideColumn('id'); r.tree.expandAll(); r.properties.setLabelWidth(70); r.properties.collapseCategory('display'); r.restoreUi(saved); });
  expect(await page.evaluate(() => r.grid.getLayoutState().columns)).toEqual(state.grid.columns);
  expect(await page.evaluate(() => ({ width: r.properties.labelWidth, collapsed: r.properties.getCollapsedCategories(), expanded: r.tree.treeView.all().map(row => row.id) }))).toEqual({ width: state.properties.labelWidth, collapsed: state.properties.collapsedCategories, expanded: ['root'] });
  await page.evaluate(() => r.destroy());
});

 test('Panel/Form/Toolbar ownership and LayoutCell replace versus append use live controls', async ({ page }) => {
  await page.goto('/browser-tests/recipes.html');
  const result = await page.evaluate(async () => {
    const { Panel, Form, Toolbar, Layout, TextInput, Button } = await import('/src/ui/all.js');
    const owner = new Panel('#root');
    const field = new TextInput({ name: 'name' }); const form = new Form().row(field);
    const action = new Button({ text: 'Action' }); const toolbar = new Toolbar().add(action);
    owner.add(form, toolbar);
    const layout = new Layout({ cols: [{ id: 'main' }] }); owner.add(layout);
    const first = new Panel(), second = new Panel(), third = new Panel();
    layout.cell('main').add(first); layout.cell('main').attach(second);
    const replaced = first.destroyed;
    layout.cell('main').attach(third, { replace: false });
    const bothMounted = second.mounted && third.mounted;
    owner.destroy();
    return { replaced, bothMounted, destroyed: [field, form, action, toolbar, layout, second, third].every(c => c.destroyed), empty: document.querySelector('#root').childElementCount === 0 };
  });
  expect(result).toEqual({ replaced: true, bothMounted: true, destroyed: true, empty: true });
});

// A successful service response is not permission to write another/removed local record.
test('in-flight save rejects a removed context and a local store veto keeps the draft', async ({ page }) => {
  await mount(page, { deferred: true });
  await page.evaluate(() => requests[0].resolve({ id: 'a', name: 'Alpha' }));
  await input(page).fill('Removed draft');
  await page.evaluate(() => { window.pending = r.save(); r.grid.data.remove('a'); saves[0].resolve({ id: 'a', name: 'Late save' }); });
  expect(await page.evaluate(() => pending)).toBe(false);
  expect(await page.evaluate(() => ({ missing: r.grid.data.get('a') == null, other: r.grid.data.get('b').name, current: r.getContext().selectedId }))).toEqual({ missing: true, other: 'Beta', current: null });
  await expect(input(page)).toHaveValue('Removed draft');
  await page.evaluate(() => r.destroy());
  await mount(page);
  await input(page).fill('Rejected locally');
  await page.evaluate(() => r.owner.disposables.add(r.grid.data.events.on('beforeChange', event => { if (event.operation === 'update') event.cancel = true; })));
  expect(await page.evaluate(() => r.save())).toBe(false);
  expect(await page.evaluate(() => ({ stored: r.grid.data.get('a').name, dirty: r.form.isDirty() }))).toEqual({ stored: 'Alpha', dirty: true });
  await expect(input(page)).toHaveValue('Rejected locally');
  await page.evaluate(() => r.destroy());
});

test('silent multi-selection pruning retains A draft when B remains selected', async ({ page }) => {
  await mount(page);
  await expect(input(page)).toHaveValue('Alpha');
  await page.evaluate(() => r.grid.setSelectedIds(['a', 'b']));
  await input(page).fill('Draft belonging to A');
  await page.evaluate(() => r.grid.setFilter(row => row.id === 'b', { silent: true }));
  expect(await page.evaluate(() => ({ selected: r.grid.getSelectedIds(), context: r.getContext() }))).toEqual({ selected: ['b'], context: { selectedId: 'b', draftRecordId: 'a', dirty: true, loading: false, saving: false } });
  await expect(input(page)).toHaveValue('Draft belonging to A');
  await expect(input(page)).toHaveAttribute('readonly', '');
  expect(await page.evaluate(() => r.save())).toBe(false);
  expect(await page.evaluate(() => r.grid.data.get('b').name)).toBe('Beta');
  await page.evaluate(() => { r.grid.setFilter(null, { silent: true }); r.select('a'); });
  await expect(input(page)).toHaveValue('Draft belonging to A');
  await expect(input(page)).not.toHaveAttribute('readonly', '');
  await page.evaluate(() => { r.grid.setSelectedIds(['a', 'b'], { silent: true }); r.grid.setFilter(row => row.id === 'b', { silent: true }); r.discardDraft(); });
  await expect(input(page)).toHaveValue('Beta');
  expect(await page.evaluate(() => r.getContext())).toEqual({ selectedId: 'b', draftRecordId: 'b', dirty: false, loading: false, saving: false });
  await page.evaluate(() => r.destroy());
});

test('save supersedes an older read even when there was no dirty edit', async ({ page }) => {
  await mount(page, { deferred: true });
  expect(await page.evaluate(() => r.form.isDirty())).toBe(false);
  await page.evaluate(() => { window.saved = r.save(); saves[0].resolve({ id: 'a', name: 'Server-normalized A' }); });
  expect(await page.evaluate(() => saved)).toBe(true);
  await expect(input(page)).toHaveValue('Server-normalized A');
  await page.evaluate(() => requests[0].resolve({ id: 'a', name: 'Stale initial A' }));
  await expect(input(page)).toHaveValue('Server-normalized A');
  expect(await page.evaluate(() => ({ stored: r.grid.data.get('a').name, context: r.getContext(), writes: changes.length }))).toEqual({ stored: 'Server-normalized A', context: { selectedId: 'a', draftRecordId: 'a', dirty: false, loading: false, saving: false }, writes: 1 });
  await page.evaluate(() => r.destroy());
});

test('Reload while Save is pending is rejected without locking future saves', async ({ page }) => {
  await mount(page, { deferred: true });
  await page.evaluate(() => requests[0].resolve({ id: 'a', name: 'Alpha' }));
  await expect.poll(() => page.evaluate(() => r.getContext().loading)).toBe(false);
  await page.getByRole('button', { name: 'Save record', exact: true }).click();
  await page.getByRole('button', { name: 'Reload record', exact: true }).click();
  expect(await page.evaluate(() => r.reload())).toBe(false);
  expect(await page.evaluate(() => ({ requests: requests.length, saves: saves.length, saving: r.getContext().saving }))).toEqual({ requests: 1, saves: 1, saving: true });
  await page.evaluate(() => saves[0].resolve({ id: 'a', name: 'Saved A' }));
  await expect(input(page)).toHaveValue('Saved A');
  expect(await page.evaluate(() => r.getContext().saving)).toBe(false);
  await input(page).fill('Second save');
  await page.getByRole('button', { name: 'Save record', exact: true }).click();
  await page.evaluate(() => saves[1].resolve({ id: 'a', name: 'Second save' }));
  await expect.poll(() => page.evaluate(() => r.getContext().saving)).toBe(false);
  expect(await page.evaluate(() => ({ value: r.grid.data.get('a').name, dirty: r.form.isDirty(), writes: changes.length }))).toEqual({ value: 'Second save', dirty: false, writes: 2 });
  await page.evaluate(() => r.destroy());
});
