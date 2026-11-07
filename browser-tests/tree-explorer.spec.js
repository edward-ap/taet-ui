import { test, expect } from '@playwright/test';
async function setup(page) {
  page.on('pageerror', error => { throw error; });
  await page.goto('/browser-tests/recipes.html');
  await page.evaluate(async () => {
    const { treeExplorerPage } = await import('/docs/src/pages/TreeExplorer.page.js');
    window.explorer = treeExplorerPage.examples[0].create().mount('#root');
  });
}
test('explorer surfaces share contextual targets and inline create/rename/cancel', async ({ page }) => {
  await setup(page);
  await page.getByText('Programming', { exact: true }).click({ button: 'right' });
  await page.getByRole('menuitem', { name: /Rename/ }).click();
  const input = page.locator('.dui-grid__editor-host input');
  await expect(input).toBeVisible();
  await input.fill('Languages'); await input.press('Enter');
  await expect(page.getByText('Languages', { exact: true })).toBeVisible();
  await page.evaluate(() => explorer.execute('newFolder', 'books'));
  await expect(input).toBeVisible(); await input.press('Escape');
  expect(await page.evaluate(() => explorer.getResources().length)).toBe(7);
  await page.evaluate(() => explorer.execute('newFolder', 'books'));
  await input.fill('New library'); await input.press('Enter');
  await expect(page.getByText('New library', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => explorer.getResources().find(i => i.name === 'New library').parentId)).toBe('books');
});
test('keyboard scopes shortcuts, clipboard subtrees and permissions', async ({ page }) => {
  await setup(page);
  await page.getByText('Rust.djvu', { exact: true }).click();
  await page.keyboard.press('F2');
  const input = page.locator('.dui-grid__editor-host input');
  await expect(input).toBeVisible(); await input.press('Escape');
  await page.keyboard.press('ControlOrMeta+x');
  await page.getByText('Documents', { exact: true }).click(); await page.keyboard.press('ControlOrMeta+v');
  await expect.poll(() => page.evaluate(() => explorer.getResources().find(i => i.id === 'rust').parentId)).toBe('documents');
  await page.keyboard.press('Shift+F10');
  await expect(page.getByRole('menuitem', { name: /Rename/ })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.evaluate(() => { explorer.provider.canExecute = command => command !== 'delete'; });
  expect(await page.evaluate(() => explorer.execute('delete', 'documents'))).toBe(false);
  expect(await page.evaluate(() => explorer.getResources().length)).toBe(7);
});
test('async failure retains draft; replacement and destroy ignore late results', async ({ page }) => {
  await setup(page);
  await page.evaluate(() => { explorer.provider.execute = () => Promise.reject(new Error('Disk unavailable')); return explorer.execute('rename', 'rust'); });
  const input = page.locator('.dui-grid__editor-host input');
  await input.fill('Better.djvu'); await input.press('Enter');
  await expect(page.getByRole('status')).toHaveText('Disk unavailable');
  await expect(input).toHaveValue('Better.djvu');
  await page.evaluate(() => { explorer.provider.execute = request => new Promise(resolve => { window.pending = { resolve, request }; }); });
  await input.press('Enter');
  expect(await page.evaluate(() => explorer.busy)).toBe(true);
  await page.evaluate(() => { explorer.setResources([{id:'replacement',name:'Replacement',kind:'folder'}]); pending.resolve({items:pending.request.items}); });
  await expect(page.getByText('Replacement', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => explorer.getResources().length)).toBe(1);
  await page.evaluate(() => { void explorer.execute('delete','replacement'); explorer.destroy(); pending.resolve({items:[]}); });
  await expect(page.locator('.dui-tree-explorer')).toHaveCount(0);
});
test('documentation mounts explorer with accessible creation menu', async ({ page }) => {
  await page.goto('/docs/index.html#tree-explorer');
  await expect(page.getByRole('heading', { name: 'TreeExplorer', exact: true, level: 1 })).toBeVisible();
  await page.getByRole('button', { name: 'Create resource', exact: true }).click();
  await expect(page.getByRole('menuitem', { name: /New Folder/ })).toBeVisible();
});


test('row and blank menus, Enter Open and denied keyboard commands', async ({ page }) => {
  await setup(page);
  await page.getByText('Books', {exact:true}).click();
  await page.getByText('notes.txt', {exact:true}).hover();
  await page.getByRole('button', {name:'Actions for notes.txt', exact:true}).click();
  await expect(page.getByRole('menuitem', {name:/Rename/})).toBeVisible();
  await expect(page.getByRole('menuitem', {name:/New Folder/})).toHaveCount(0);
  await page.keyboard.press('Escape');
  await page.evaluate(() => { window.opened=[]; explorer.events.on('operation',e=>opened.push([e.command,e.id])); });
  await page.getByText('Rust.djvu', {exact:true}).click(); await page.keyboard.press('Enter');
  await expect.poll(()=>page.evaluate(()=>opened)).toEqual([['open','rust']]);
  await expect(page.locator('.dui-grid__editor-host')).toHaveCount(0);
  await page.evaluate(() => { explorer.provider.canExecute=()=>false; });
  await page.keyboard.press('Enter'); await page.keyboard.press('F2'); await page.keyboard.press('Delete');
  await expect(page.locator('.dui-grid__editor-host')).toHaveCount(0);
  expect(await page.evaluate(()=>explorer.getResources().length)).toBe(7);
  await page.evaluate(() => { explorer.provider.canExecute=()=>true; });
  await page.locator('.dui-tree-explorer__body').click({button:'right',position:{x:100,y:270}});
  await expect(page.getByRole('menuitem', {name:/Refresh/})).toBeVisible();
  await expect(page.getByRole('menuitem', {name:/Rename/})).toHaveCount(0);
});


test('pending create cancellation, disabled state and destroyed DOM release commands', async ({ page }) => {
  await setup(page);
  await page.evaluate(() => {
    explorer.provider.execute=request=>new Promise(resolve=>{window.pending={request,resolve};});
    return explorer.execute('newFolder','books');
  });
  const input=page.locator('.dui-grid__editor-host input');
  await input.fill('Transient'); await input.press('Enter');
  await expect(input).toHaveAttribute('readonly','');
  await input.press('Escape');
  expect(await page.evaluate(()=>pending.request.signal.aborted)).toBe(true);
  expect(await page.evaluate(()=>explorer.getResources().length)).toBe(7);
  await page.evaluate(()=>pending.resolve({items:[...pending.request.items,{id:'late',name:'Late',kind:'folder'}]}));
  await expect(page.getByText('Late',{exact:true})).toHaveCount(0);
  await page.evaluate(()=>explorer.disable());
  expect(await page.evaluate(()=>explorer.execute('newFolder','books'))).toBe(false);
  await expect(page.getByRole('button',{name:'Create resource',exact:true})).toBeDisabled();
  expect(await page.evaluate(()=>{
    const element=explorer.grid.element,commands=explorer.commands;
    explorer.destroy();
    element.dispatchEvent(new KeyboardEvent('keydown',{key:'F2',bubbles:true}));
    return commands.destroyed;
  })).toBe(true);
});


test('hierarchy arrows visit children and parents without navigating the action column', async ({ page }) => {
  await setup(page);
  await page.getByText('Books',{exact:true}).click();
  await page.keyboard.press('ArrowLeft');
  expect(await page.evaluate(()=>explorer.grid.isExpanded('books'))).toBe(false);
  await page.keyboard.press('ArrowRight');
  expect(await page.evaluate(()=>explorer.grid.isExpanded('books'))).toBe(true);
  await page.keyboard.press('ArrowRight');
  expect(await page.evaluate(()=>explorer.grid.getSelectedIds())).toEqual(['programming']);
  await page.keyboard.press('ArrowRight');
  expect(await page.evaluate(()=>explorer.grid.getSelectedIds())).toEqual(['rust']);
  await page.keyboard.press('ArrowLeft');
  expect(await page.evaluate(()=>explorer.grid.getSelectedIds())).toEqual(['programming']);
});
