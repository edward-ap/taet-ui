import {test, expect} from '@playwright/test';

const row = (page, id) => page.locator(`.dui-grid__body [data-dui-grid-row-id="string:${id}"]`);
const cell = (page, id, column = 'name') => row(page, id).locator(`[data-dui-grid-column-id="${column}"]`);
const handle = (page, id) => row(page, id).locator('[data-dui-tree-node-draggable="true"]');
const body = page => page.locator('.dui-tree-grid .dui-grid__body');
const ghost = page => page.locator('.dui-tree-grid__node-drag-ghost');
const markers = page => page.locator('[class*="--node-drop-"]');
const settle = page => page.evaluate(async () => {for (let i = 0; i < 3; i++) await new Promise(requestAnimationFrame);});
const source = page => page.evaluate(() => treeMove.tree.data.all().map(item => ({...item})));
const parent = (page, id) => page.evaluate(id => treeMove.tree.data.get(id).parentId, id);

test.beforeEach(async ({page}) => {
  page.on('pageerror', error => {throw error;});
  await page.goto('/examples/tree-move/');
  await page.waitForFunction(() => window.treeMove?.tree?.element);
  await expect(handle(page, 'A1')).toBeVisible();
  await page.evaluate(() => {
    window.moveResults = [];
    window.moveBefore = [];
    window.nativeMoves = [];
    treeMove.tree.events.on('beforeNodeMove', event => moveBefore.push({ids:[...event.ids], subtreeIds:[...event.subtreeIds]}));
    treeMove.tree.events.on('nodeMove', event => moveResults.push(event.result));
    for (const type of ['dragstart', 'drop', 'dragend']) document.addEventListener(type, event => {
      nativeMoves.push({type, trusted:event.isTrusted, selected:treeMove.tree.destroyed ? [] : [...treeMove.tree.getSelectedIds()]});
    }, {capture:true});
  });
});

async function selectWithMouse(page, ids, range = false) {
  await cell(page, ids[0]).click();
  if (range) await cell(page, ids.at(-1)).click({modifiers:['Shift']});
  else for (const id of ids.slice(1)) await cell(page, id).click({modifiers:['ControlOrMeta']});
  const selected = await page.evaluate(() => treeMove.tree.getSelectedIds());
  expect(selected.length).toBeGreaterThanOrEqual(2);
  for (const id of selected) await expect(row(page, id)).toHaveAttribute('aria-selected', 'true');
  return selected;
}

async function drag(page, from, to, position = 'inside') {
  const bounds = await row(page, to).boundingBox();
  await handle(page, from).dragTo(row(page, to), {targetPosition:{x:80, y:position === 'before' ? 2 : position === 'after' ? bounds.height - 2 : bounds.height / 2}});
  await settle(page);
}

async function beginNative(page, id, targetId) {
  const from = await handle(page, id).boundingBox();
  const target = await row(page, targetId).boundingBox();
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(target.x + 90, target.y + target.height / 2, {steps:12});
  await page.mouse.move(target.x + 92, target.y + target.height / 2);
  await expect(ghost(page)).toBeVisible();
}

test('native modifier-selected subtree move keeps the selected set and unchanged descendant records', async ({page}) => {
  const selected = await selectWithMouse(page, ['A1', 'A2']);
  await page.evaluate(() => {window.descendant = treeMove.tree.data.get('A11'); window.originalIds = treeMove.tree.data.all().map(item => item.id); treeMove.tree.collapse('B');});
  await drag(page, 'A1', 'B');
  expect(await parent(page, 'A1')).toBe('B');
  expect(await parent(page, 'A2')).toBe('B');
  expect(await page.evaluate(() => treeMove.tree.isExpanded('B'))).toBe(true);
  await expect(row(page, 'A11')).toBeVisible();
  expect(await parent(page, 'A11')).toBe('A1');
  expect(await page.evaluate(() => treeMove.tree.data.get('A11') === descendant)).toBe(true);
  expect(await page.evaluate(() => treeMove.tree.data.all().map(item => item.id).sort())).toEqual(await page.evaluate(() => [...originalIds].sort()));
  expect(await page.evaluate(() => treeMove.tree.getSelectedIds())).toEqual(selected);
  const events = await page.evaluate(() => ({native:nativeMoves, before:moveBefore, results:moveResults}));
  expect(events.before).toEqual([{ids:['A1', 'A2'], subtreeIds:['A1', 'A11', 'A2']}]);
  expect(events.results.at(-1)).toMatchObject({accepted:true, ids:['A1', 'A2'], subtreeIds:['A1', 'A11', 'A2'], parentId:'B'});
  expect(events.native.some(event => event.type === 'dragstart' && event.trusted && event.selected.length === 2)).toBe(true);
  expect(events.native.some(event => event.type === 'drop' && event.trusted)).toBe(true);
  await expect(ghost(page)).toHaveCount(0); await expect(markers(page)).toHaveCount(0);
});

test('native Shift range normalizes a selected parent and child once in source order', async ({page}) => {
  const selected = await selectWithMouse(page, ['A1', 'A2'], true);
  expect(selected).toEqual(['A1', 'A11', 'A2']);
  await drag(page, 'A11', 'B');
  expect(await page.evaluate(() => moveResults.at(-1))).toMatchObject({accepted:true, ids:['A1', 'A2'], subtreeIds:['A1', 'A11', 'A2']});
  expect(await page.evaluate(() => moveBefore)).toHaveLength(1);
  expect(await parent(page, 'A11')).toBe('A1');
  expect(await page.evaluate(() => treeMove.tree.getSelectedIds())).toEqual(selected);
});

test('native top and bottom zones reorder sibling branches before and after the target', async ({page}) => {
  for (const position of ['before', 'after']) {
    if (position === 'after') {await page.evaluate(() => treeMove.reset()); await settle(page);}
    await drag(page, 'C', 'B', position);
    const roots = await page.evaluate(() => treeMove.tree.treeView.all().filter(item => item.parentId == null).map(item => item.id));
    const index = roots.indexOf('B');
    expect(roots[position === 'before' ? index - 1 : index + 1]).toBe('C');
    expect(await parent(page, 'C')).toBeNull();
  }
});

test('native blank-body drop appends a complete branch at root level', async ({page}) => {
  const bounds = await body(page).boundingBox();
  await handle(page, 'A1').dragTo(body(page), {targetPosition:{x:100, y:bounds.height - 12}});
  expect(await parent(page, 'A1')).toBeNull();
  expect(await parent(page, 'A11')).toBe('A1');
  const roots = await page.evaluate(() => treeMove.tree.treeView.all().filter(item => item.parentId == null).map(item => item.id));
  expect(roots.at(-1)).toBe('A1');
  expect(await page.evaluate(() => moveResults.at(-1))).toMatchObject({accepted:true, targetId:null, position:'inside'});
});

test('cycle attempts through native drag and API leave every source record unchanged', async ({page}) => {
  const before = await source(page);
  await drag(page, 'A', 'A11');
  expect(await source(page)).toEqual(before);
  const result = await page.evaluate(() => treeMove.tree.moveNode('A', 'A11'));
  expect(result.accepted).toBe(false); expect(result.reason).toMatch(/cycle/);
  expect(await source(page)).toEqual(before);
  await expect(ghost(page)).toHaveCount(0); await expect(markers(page)).toHaveCount(0);
});

test('demo read-only policy vetoes the entire native modifier-selected batch and names the blocking ID', async ({page}) => {
  const before = await source(page);
  await selectWithMouse(page, ['A2', 'locked']);
  await drag(page, 'A2', 'B');
  expect(await source(page)).toEqual(before);
  expect(await page.evaluate(() => moveResults.at(-1))).toMatchObject({accepted:false});
  expect(await page.evaluate(() => moveResults.at(-1).reason)).toContain('locked');
  expect(await page.evaluate(() => treeMove.tree.getSelectedIds())).toEqual(['A2', 'locked']);
});

test('read-only target and a hidden read-only descendant reject without partial writes', async ({page}) => {
  const before = await source(page);
  await drag(page, 'A1', 'locked');
  expect(await source(page)).toEqual(before);
  expect(await page.evaluate(() => moveResults.at(-1).reason)).toContain('locked');
  await page.evaluate(() => {treeMove.tree.data.update('A11', {readOnly:true}); treeMove.tree.collapse('A1');});
  const current = await source(page);
  const result = await page.evaluate(() => treeMove.tree.moveNode('A1', 'B'));
  expect(result.accepted).toBe(false); expect(result.reason).toContain('A11');
  expect(await source(page)).toEqual(current);
});

test('sorted sibling order rejects before/after while a native inside move remains valid', async ({page}) => {
  await page.getByRole('button', {name:'Sort names', exact:true}).click();
  await settle(page);
  const before = await source(page);
  for (const position of ['before', 'after']) {
    const result = await page.evaluate(position => treeMove.tree.moveNode('C', 'B', position), position);
    expect(result.accepted).toBe(false); expect(result.reason).toBe('sorted-order');
    expect(await source(page)).toEqual(before);
  }
  await drag(page, 'A1', 'B');
  expect(await parent(page, 'A1')).toBe('B');
  expect(await parent(page, 'A11')).toBe('A1');
  await page.getByRole('button', {name:'Clear sorting', exact:true}).click();
  expect(await page.evaluate(() => treeMove.tree.getSortModel())).toEqual([]);
});

test('collapsed and filtered descendants move with their branch and hidden selection follows view policy', async ({page}) => {
  await page.evaluate(() => {const tree=treeMove.tree; tree.setSelectedIds(['A1']); tree.collapse('A1'); tree.collapse('B'); tree.setFilter(item => item.id !== 'A11');});
  await expect(row(page, 'A11')).toHaveCount(0);
  const result = await page.evaluate(() => treeMove.tree.moveNode('A1', 'B', 'inside', {expandTarget:false}));
  expect(result).toMatchObject({accepted:true, subtreeIds:['A1', 'A11']});
  expect(await parent(page, 'A11')).toBe('A1');
  // Existing TreeDataView filters reveal matching descendants despite saved collapse.
  await expect(row(page, 'A1')).toBeVisible();
  await expect(row(page, 'A11')).toHaveCount(0);
  expect(await page.evaluate(() => treeMove.tree.getSelectedIds())).toEqual(['A1']);
  expect(await page.evaluate(() => treeMove.tree.isExpanded('B'))).toBe(false);
  await page.evaluate(() => treeMove.tree.clearFilter());
  await expect(row(page, 'A1')).toHaveCount(0);
  expect(await page.evaluate(() => treeMove.tree.getSelectedIds())).toEqual([]);
  await page.evaluate(() => treeMove.tree.expandAll());
  await expect(row(page, 'A11')).toBeVisible();
  await expect(row(page, 'A11')).toHaveAttribute('aria-level', '3');
});

test('parse replacement in beforeNodeMove rejects the stale proposal and never moves the replacement', async ({page}) => {
  const result = await page.evaluate(() => {
    const tree=treeMove.tree;
    tree.events.once('beforeNodeMove', () => tree.data.parse([{id:'A1', parentId:null, name:'Replacement', amount:700}, {id:'B', parentId:null, name:'Target'}]));
    return tree.moveNode('A1', 'B');
  });
  expect(result.accepted).toBe(false);
  expect(await parent(page, 'A1')).toBeNull();
  expect(await page.evaluate(() => treeMove.tree.data.get('A1').amount)).toBe(700);
  expect(await source(page)).toHaveLength(2);
});

test('owner teardown in beforeNodeMove stops later observers and writes', async ({page}) => {
  const result = await page.evaluate(() => {
    const tree=treeMove.tree; window.lateMove=false;
    tree.events.once('beforeNodeMove', () => treeMove.owner.destroy());
    tree.events.on('nodeMove', () => {lateMove=true;});
    const result=tree.moveNode('A1', 'B');
    return {accepted:result.accepted, destroyed:tree.destroyed, ownerDestroyed:treeMove.owner.destroyed, late:lateMove};
  });
  expect(result).toEqual({accepted:false, destroyed:true, ownerDestroyed:true, late:false});
  await expect(page.locator('.dui-tree-grid')).toHaveCount(0); await expect(ghost(page)).toHaveCount(0);
});

test('native drag snapshots become stale after data or schema replacement', async ({page}) => {
  for (const change of ['data', 'schema']) {
    if (change === 'schema') await page.evaluate(() => treeMove.reset());
    await beginNative(page, 'A1', 'B');
    await page.evaluate(change => {
      const tree=treeMove.tree;
      if(change==='data') tree.data.parse(tree.data.all().map(item => ({...item, amount:99})));
      else tree.setColumns([...tree.columns].reverse());
    }, change);
    await page.mouse.up();
    await expect(ghost(page)).toHaveCount(0); await expect(markers(page)).toHaveCount(0);
    expect(await parent(page, 'A1')).toBe('A');
    expect(await parent(page, 'A11')).toBe('A1');
  }
});

test('trusted native Escape and outside drop release the drag without moving records', async ({page}, info) => {
  const before = await source(page);
  await selectWithMouse(page, ['A1', 'A2']);
  await beginNative(page, 'A1', 'B');
  await expect(row(page, 'B')).toHaveClass(/--node-drop-inside/);
  await expect(ghost(page)).toHaveText('2 roots / 3 nodes');
  await page.screenshot({path:info.outputPath('tree-move-drag-target.png')});
  await page.keyboard.press('Escape'); await page.mouse.up();
  await expect(ghost(page)).toHaveCount(0); await expect(markers(page)).toHaveCount(0);
  expect(await source(page)).toEqual(before);
  await handle(page, 'A1').dragTo(page.getByRole('button', {name:'Reset fixture', exact:true}));
  await expect(ghost(page)).toHaveCount(0); await expect(markers(page)).toHaveCount(0);
  expect(await source(page)).toEqual(before);
  expect(await page.evaluate(() => nativeMoves.filter(event => event.type==='dragstart' && event.trusted).length)).toBeGreaterThanOrEqual(2);
});

test('only the service gutter drags nodes; data cells, hierarchy toggle, header and active editor do not', async ({page}) => {
  const before = await source(page);
  expect(await handle(page, 'A1').evaluate(node => ({width:node.getBoundingClientRect().width, draggable:node.draggable, role:node.getAttribute('role')})))
    .toEqual({width:10, draggable:true, role:'presentation'});
  for (const locator of [cell(page, 'A1'), row(page, 'A1'), page.locator('.dui-grid__indicator-header'), cell(page, 'A').locator('.dui-tree-grid__toggle')]) {
    expect(await locator.evaluate(node => node.draggable)).toBe(false);
  }
  await cell(page, 'A1').dragTo(row(page, 'B'));
  expect(await source(page)).toEqual(before); await expect(ghost(page)).toHaveCount(0);
  await cell(page, 'A1').dblclick();
  const input=cell(page, 'A1').locator('.dui-grid__editor-host input');
  await expect(input).toBeFocused(); await input.fill('Preserve draft');
  expect((await page.evaluate(() => treeMove.tree.moveNode('A1', 'B'))).accepted).toBe(false);
  expect(await row(page, 'A1').locator('.dui-grid__indicator-body').evaluate(node => node.draggable)).toBe(false);
  await expect(input).toHaveValue('Preserve draft'); await expect(input).toBeFocused();
  await input.press('Escape'); expect(await source(page)).toEqual(before);
});

test('virtual row recycling and scrolling clear an active native drag and teardown releases its UI', async ({page}) => {
  await page.evaluate(() => {
    const tree=treeMove.tree;
    tree.data.parse(Array.from({length:1500}, (_,i) => ({id:`N${i}`, parentId:null, name:`Node ${i}`, amount:i})));
  });
  await settle(page);
  expect(await body(page).locator('[data-dui-grid-row-id]').count()).toBeLessThan(80);
  await beginNative(page, 'N0', 'N4');
  await body(page).evaluate(node => {node.scrollTop=18000;}); await settle(page); await page.mouse.up();
  await expect(ghost(page)).toHaveCount(0); await expect(markers(page)).toHaveCount(0);
  expect(await body(page).locator('[data-dui-grid-row-id]').count()).toBeLessThan(80);
  expect(await body(page).locator('.dui-control').count()).toBe(0);
  expect(await parent(page, 'N0')).toBeNull();
  await body(page).evaluate(node => {node.scrollTop=0;}); await settle(page);
  await beginNative(page, 'N0', 'N4');
  await page.evaluate(() => treeMove.owner.destroy()); await page.mouse.up();
  await expect(ghost(page)).toHaveCount(0); await expect(markers(page)).toHaveCount(0);
  await expect(page.locator('.dui-control')).toHaveCount(0);
});

test('silent direct move synchronizes hierarchy without semantic move events', async ({page}) => {
  const result=await page.evaluate(() => treeMove.tree.moveNodes(['A1', 'A11'], 'B', 'inside', {silent:true}));
  expect(result).toMatchObject({accepted:true, ids:['A1'], subtreeIds:['A1', 'A11']});
  expect(await parent(page, 'A1')).toBe('B'); expect(await parent(page, 'A11')).toBe('A1');
  await expect(row(page, 'A1')).toHaveAttribute('aria-level', '2');
  expect(await page.evaluate(() => ({before:moveBefore.length, after:moveResults.length}))).toEqual({before:0, after:0});
});

test('demo reset and light/dark retain dense tree geometry without horizontal overflow', async ({page}, info) => {
  const colors=[];
  for (const theme of ['light', 'dark']) {
    if(theme==='dark') await page.getByRole('button', {name:'Light / dark', exact:true}).click();
    await page.evaluate(() => document.fonts.ready);
    const geometry=await page.evaluate(() => {
      const tree=treeMove.tree, row=tree.element.querySelector('[data-dui-grid-row-id]');
      return {font:getComputedStyle(tree.element).fontFamily, color:getComputedStyle(tree.element).backgroundColor,
        overflow:document.documentElement.scrollWidth>innerWidth, rowHeight:row.getBoundingClientRect().height,
        gutter:row.querySelector('.dui-grid__indicator-body').getBoundingClientRect().width};
    });
    expect(geometry.font).toContain('Noto Sans'); expect(geometry.overflow).toBe(false);
    expect(geometry.rowHeight).toBe(24); expect(geometry.gutter).toBe(10); colors.push(geometry.color);
    await page.screenshot({path:info.outputPath(`tree-move-${theme}.png`)});
  }
  expect(colors[0]).not.toBe(colors[1]);
  await drag(page, 'A1', 'B'); await page.getByRole('button', {name:'Reset fixture', exact:true}).click();
  expect(await parent(page, 'A1')).toBe('A'); expect(await parent(page, 'A11')).toBe('A1');
  await expect(row(page, 'locked')).toContainText('[READ ONLY] Locked branch');
});
