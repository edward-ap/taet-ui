import {test,expect} from '@playwright/test';
test.beforeEach(async({page})=>{page.on('pageerror',e=>{throw e;});});
test('JSON demo edits server-described fields and invalid rebuild preserves current grid',async({page})=>{
 await page.goto('/docs/index.html#grid-json');await expect(page.getByRole('gridcell',{name:'$49.50',exact:true})).toBeVisible();
 await page.getByRole('gridcell',{name:/Keyboard$/}).dblclick();const editor=page.locator('.dui-grid__editor-host input');await editor.fill('');await editor.press('Enter');await expect(editor).toBeVisible();
 await editor.fill('Updated');await editor.press('Enter');await expect(page.getByRole('gridcell',{name:/Updated$/})).toBeVisible();
 await page.locator('textarea').fill('{"schemaVersion":9}');await page.getByRole('button',{name:'Rebuild Grid',exact:true}).click();await expect(page.locator('.dui-example-host__output')).toContainText('schemaVersion');await expect(page.getByRole('gridcell',{name:/Updated$/})).toBeVisible();
 await page.getByRole('button',{name:'Reset JSON',exact:true}).click();await expect(page.getByRole('gridcell',{name:/Keyboard$/})).toBeVisible();await expect(page.locator('.dui-example-host__live .dui-grid')).toHaveCount(1);
});
test('JSON formatting and headings remain text, client registry resolves names',async({page})=>{
 await page.goto('/browser-tests/recipes.html');await page.evaluate(async()=>{
 const {createGridFromJSON}=await import('/src/ui/GridDefinition.js');window.g=createGridFromJSON({schemaVersion:1,columns:[{id:'name',title:'<img src=x onerror=alert(1)>',format:{type:'registered',name:'literal'}}],data:[{id:'x',name:'<script>bad()</script>'}]},{container:'#root',formatters:{literal:v=>v}});
 });await expect(page.locator('.dui-grid img, .dui-grid script')).toHaveCount(0);await expect(page.getByRole('gridcell')).toHaveText('<script>bad()</script>');await page.evaluate(()=>g.destroy());
});
test('separate schema and data supports select, numeric and checkbox factories',async({page})=>{
 await page.goto('/browser-tests/recipes.html');await page.evaluate(async()=>{
 const {createGridFromJSON}=await import('/src/ui/GridDefinition.js');window.g=createGridFromJSON({schemaVersion:1,columns:[{id:'name',editor:{type:'select',items:[{value:'a',text:'Alpha'},{value:'b',text:'Beta'}]}},{id:'qty',editor:{type:'number',min:0}},{id:'enabled',editor:{type:'checkbox'}}]},{container:'#root'});g.data.parse([{id:1,name:'a',qty:4,enabled:false}]);g.startEdit(1,'qty');
 });const input=page.locator('.dui-grid__editor-host input');await input.fill('12');await input.press('Enter');expect(await page.evaluate(()=>g.data.get(1).qty)).toBe(12);
 await page.locator('[data-dui-grid-column-id="enabled"][role="gridcell"]').click();expect(await page.evaluate(()=>g.data.get(1).enabled)).toBe(true);
 await page.evaluate(()=>g.startEdit(1,'name'));await expect(page.locator('.dui-grid__editor-host')).toBeVisible();await page.locator('.dui-grid__editor-host select').selectOption({label:'Beta'});await page.locator('.dui-grid__editor-host select').press('Enter');expect(await page.evaluate(()=>g.data.get(1).name)).toBe('b');await page.evaluate(()=>{g.cancelEdit();g.destroy();});
});
