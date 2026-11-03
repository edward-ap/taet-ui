import {test,expect} from '@playwright/test';
test.beforeEach(async({page})=>{page.on('pageerror',error=>{throw error;});});
test('Tree JSON demo expands typed hierarchy and rejects a broken parent without replacing it',async({page})=>{
 await page.goto('/docs/index.html#tree-json');const live=page.locator('.dui-example-host__live');
 await expect(live.getByRole('treeitem')).toHaveCount(4);
 await live.getByRole('treeitem',{name:'Project',exact:true}).locator('[data-dui-tree-toggle]').click();await expect(live.getByRole('treeitem')).toHaveCount(1);
 await live.locator('textarea').fill(JSON.stringify({schemaVersion:1,data:[{id:1,parentId:999}]}));await live.getByRole('button',{name:'Rebuild',exact:true}).click();
 await expect(page.locator('.dui-example-host__output')).toContainText('missing parent');await expect(live.getByRole('treeitem')).toHaveCount(1);
});
test('TreeGrid JSON demo edits a child and retains tree structure',async({page})=>{
 await page.goto('/docs/index.html#tree-grid-json');const live=page.locator('.dui-example-host__live');
 await live.getByRole('gridcell',{name:'main.js',exact:true}).dblclick();const input=live.locator('.dui-grid__editor-host input');
 await input.fill('');await input.press('Enter');await expect(input).toBeVisible();await input.fill('index.js');await input.press('Enter');
 await live.getByRole('button',{name:'Show Data',exact:true}).click();const output=page.locator('.dui-example-host__output');await expect(output).toContainText('index.js');await expect(output).toContainText('"parentId":"src"');
});
test('PropertyGrid JSON edits typed values, validates required and snapshots collapsed children',async({page})=>{
 await page.goto('/docs/index.html#property-grid-json');const live=page.locator('.dui-example-host__live');
 const row=name=>live.locator(`[data-dui-property-name="${name}"]`);const input=row('name').locator('input');
 await input.fill('');await input.press('Enter');await live.getByRole('button',{name:'Show Data',exact:true}).click();const output=page.locator('.dui-example-host__output');await expect(output).toContainText('"name":"Report"');
 await input.fill('Annual');await input.press('Enter');await row('mode').locator('select').selectOption({label:'Final'});
 await row('advanced').locator('[data-dui-property-toggle]').click();await row('enabled').locator('.dui-property-grid__value').click();await row('advanced').locator('[data-dui-property-toggle]').click();
 await live.getByRole('button',{name:'Show Data',exact:true}).click();await expect(output).toContainText('"name":"Annual"');await expect(output).toContainText('"mode":"final"');await expect(output).toContainText('"enabled":false');
});
test('all collection source examples execute and destroy their owned controls',async({page})=>{
 await page.goto('/browser-tests/recipes.html');expect(await page.evaluate(async()=>{
 const ui=await import('/src/ui/all.js');const pages=await import('/docs/src/pages/CollectionJSON.pages.js');let count=0;
 for(const page of Object.values(pages))for(const example of page.examples){
  const source=example.source.replace(/const example =/,'return');const root=document.querySelector('#root');
  const owner=new Function(...Object.keys(ui),'container','log',source)(...Object.values(ui),root,{write(){}});
  if(!owner || !root.children.length)throw new Error('No live owner');owner.destroy();if(root.children.length)throw new Error('Owner leaked DOM');count++;
 }return count;
 })).toBe(3);
});

test('inline PropertyGrid validator refresh cannot commit a destroyed editor',async({page})=>{
 await page.goto('/browser-tests/recipes.html');await page.evaluate(async()=>{
 const {createPropertyGridFromJSON,gridEditors,getPropertyGridValues}=await import('/src/ui/experimental.js');
 const g=createPropertyGridFromJSON({schemaVersion:1,groups:[{id:'g',title:'General',properties:[{name:'name',editor:{type:'text'}}]}],data:{name:'Original'}},{container:'#root'});
 window.g=g;window.values=()=>getPropertyGridValues(g);window.changes=0;g.events.on('propertyChange',()=>window.changes++);
 g.getPropertyControl('name').property.editor=gridEditors.text({validators:[()=>{g.refresh();return true;}]});g.refresh();
 });const input=page.locator('[data-dui-property-name="name"] input');await input.fill('Changed');await input.press('Enter');
 await expect(input).toHaveValue('Original');expect(await page.evaluate(()=>({value:values().name,changes}))).toEqual({value:'Original',changes:0});await page.evaluate(()=>g.destroy());
});
