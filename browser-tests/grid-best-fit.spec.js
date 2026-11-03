import {test,expect} from '@playwright/test';
for (const kind of ['Grid','TreeGrid']) {
  test(`${kind} best fit measures content and is stable`,async({page})=>{
    await page.goto('/browser-tests/recipes.html');
    await page.evaluate(async kind=>{
      const ui=await import('/src/ui/experimental.js');
      window.grid=new ui[kind]('#root',{height:300,columnMenu:true,columns:[
        {id:'name',title:'Symbol',width:440,sortable:true},
        {id:'value',title:'Amount',width:440,render:v=>Number(v).toFixed(2)}]});
      grid.data.parse([{id:1,name:'ABC',value:12}]);
    },kind);
    await page.evaluate(()=>document.fonts.ready);
    const fit=async()=>{await page.getByRole('button',{name:'Column menu for Symbol',exact:true}).click();await page.getByRole('menuitem',{name:'Best fit',exact:true}).click();};
    await fit();
    const width=await page.evaluate(()=>grid.getColumn('name').width);
    expect(width).toBeLessThan(150);expect(width).toBeGreaterThan(48);
    await fit();expect(await page.evaluate(()=>grid.getColumn('name').width)).toBe(width);
    const header=page.locator('.dui-grid__header-cell[data-dui-grid-column-id="name"]');
    await expect(header.locator('.dui-grid__sort-indicator')).toHaveCount(0);
    expect(await header.locator('.dui-grid__header-title').evaluate(e=>e.scrollWidth<=e.clientWidth+1)).toBe(true);
    const handle=header.locator('.dui-grid__resize-handle');
    const rect=await handle.boundingBox();
    await page.mouse.move(rect.x+1,rect.y+8);await page.mouse.down();
    await page.mouse.move(rect.x+81,rect.y+8,{steps:5});await page.mouse.up();
    await fit();expect(await page.evaluate(()=>grid.getColumn('name').width)).toBe(width);
    await header.click();await expect(header.locator('.dui-grid__sort-indicator')).toHaveCount(1);
    await fit();
    expect(await header.locator('.dui-grid__header-title').evaluate(e=>e.scrollWidth<=e.clientWidth+1)).toBe(true);
    await page.evaluate(()=>{grid.columnModel.setWidth('value',48);grid.data.update(1,{value:123456789.5});});
    await expect(page.locator('.dui-grid__cell[data-dui-grid-column-id="value"]').first()).toHaveText('123456789.50');
    await page.evaluate(()=>grid.autoSizeColumn('value'));
    expect(await page.evaluate(()=>grid.getColumn('value').width)).toBeGreaterThan(90);
    expect(await page.locator('.dui-grid__cell[data-dui-grid-column-id="value"]').first().evaluate(e=>e.scrollWidth<=e.clientWidth+1)).toBe(true);
    const widths=await page.evaluate(()=>{grid.autoSizeColumns();return grid.columns.map(c=>c.width);});
    await page.evaluate(()=>grid.autoSizeColumns());expect(await page.evaluate(()=>grid.columns.map(c=>c.width))).toEqual(widths);
  });
  test(`${kind} scoped multiline header supports two and three lines`,async({page})=>{
    await page.goto('/browser-tests/recipes.html');
    await page.addStyleTag({content:'.multiline { --dui-grid-header-height: 64px; } .multiline .dui-grid__header-title { white-space: pre-line; }'});
    await page.evaluate(async kind=>{const ui=await import('/src/ui/experimental.js');window.grid=new ui[kind]('#root',{height:300,css:'multiline',columns:[{id:'name',title:'Current\nunderlying\nprice',width:140},{id:'value',title:'Option\npremium',width:140}]});grid.data.parse([{id:1,name:'ABC',value:12}]);},kind);
    const heights=await page.locator('.dui-grid__header-title').evaluateAll(es=>es.map(e=>e.getBoundingClientRect().height));
    expect(heights[0]).toBeGreaterThan(heights[1]*1.4);
    expect(await page.locator('.dui-grid__header').evaluate(e=>e.scrollHeight<=e.clientHeight+1)).toBe(true);
  });
}

test('TreeGrid best fit includes nested indentation and honors bounds',async({page})=>{
  await page.goto('/browser-tests/recipes.html');
  await page.evaluate(async()=>{
    const {TreeGrid}=await import('/src/ui/TreeGrid.js');
    window.grid=new TreeGrid('#root',{height:300,columns:[{id:'name',title:'Name',width:60,maxWidth:350}]});
    grid.data.parse([{id:1,name:'Root'},{id:2,parentId:1,name:'Nested content wider than header'}]);grid.expandAll();
  });
  await expect(page.locator('.dui-tree-grid__text').last()).toHaveText('Nested content wider than header');
  await page.evaluate(()=>document.fonts.ready);
  await page.evaluate(()=>grid.autoSizeColumn('name'));
  await expect.poll(()=>page.locator('.dui-tree-grid__text').last().evaluate(e=>e.scrollWidth<=e.clientWidth+1)).toBe(true);
  const width=await page.evaluate(()=>grid.getColumn('name').width);expect(width).toBeGreaterThan(200);expect(width).toBeLessThanOrEqual(350);
  await page.evaluate(()=>{grid.setColumns([{id:'name',title:'Name',width:500,minWidth:80,maxWidth:100}]);grid.autoSizeColumn('name');});
  expect(await page.evaluate(()=>grid.getColumn('name').width)).toBe(100);
});
