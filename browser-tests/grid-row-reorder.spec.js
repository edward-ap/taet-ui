import {test,expect} from '@playwright/test';
test.beforeEach(async({page})=>{page.on('pageerror',e=>{throw e;});await page.goto('/browser-tests/recipes.html');});
async function setup(page){await page.evaluate(async()=>{const {Grid}=await import('/src/ui/Grid.js');window.g=new Grid('#root',{width:500,height:220,rowReorder:true,multiSelect:true,columns:[{id:'name',width:250,sortable:true},{id:'value',width:250}]});g.data.parse(Array.from({length:6},(_,id)=>({id,name:'Row '+id,value:id})));});}
const row=(p,id)=>p.locator('.dui-grid__row[data-dui-grid-row-id]').filter({has:p.getByRole('gridcell',{name:new RegExp('Row '+id+'$')})});
const handle=(p,id)=>row(p,id).getByRole('button',{name:'Move row'});
const ids=page=>page.evaluate(()=>g.data.all().map(r=>r.id));
test('native row drag moves a selected block in source order and keeps selection',async({page})=>{
 await setup(page);await page.evaluate(()=>g.setSelectedIds([3,1]));
 await handle(page,1).dragTo(row(page,4),{targetPosition:{x:100,y:20}});
 expect(await ids(page)).toEqual([0,2,4,1,3,5]);expect(await page.evaluate(()=>g.getSelectedIds())).toEqual([3,1]);
 await expect(page.locator('.dui-grid__row--drop-before, .dui-grid__row--drop-after')).toHaveCount(0);
});
test('handle Alt+Up/Down reorders and restores keyboard focus',async({page})=>{
 await setup(page);await handle(page,2).focus();await page.keyboard.press('Alt+ArrowUp');expect(await ids(page)).toEqual([0,2,1,3,4,5]);await expect(handle(page,2)).toBeFocused();
 await page.keyboard.press('Alt+ArrowDown');expect(await ids(page)).toEqual([0,1,2,3,4,5]);await expect(handle(page,2)).toBeFocused();
});
test('filtered drag retains hidden records; sorting disables handles',async({page})=>{
 await setup(page);await page.evaluate(()=>g.setFilter(r=>r.id!==1));await handle(page,0).dragTo(row(page,3),{targetPosition:{x:100,y:20}});
 expect(await ids(page)).toEqual([1,2,3,0,4,5]);await page.evaluate(()=>g.sortBy('name','desc'));await expect(handle(page,0)).toBeDisabled();
});
test('data change during drag cancels it and Escape removes target markers',async({page})=>{
 await setup(page);const data=await page.evaluateHandle(()=>new DataTransfer());
 await handle(page,0).dispatchEvent('dragstart',{dataTransfer:data});await row(page,3).dispatchEvent('dragover',{dataTransfer:data,clientY:0});
 await expect(page.locator('.dui-grid__row--drop-before')).toHaveCount(1);await page.keyboard.press('Escape');await expect(page.locator('.dui-grid__row--drop-before')).toHaveCount(0);
 await handle(page,0).dispatchEvent('dragstart',{dataTransfer:data});await page.evaluate(()=>g.data.update(0,{value:99}));
 await row(page,3).dispatchEvent('drop',{dataTransfer:data,clientY:0});expect(await ids(page)).toEqual([0,1,2,3,4,5]);await data.dispose();
});
test('vetoed drop and drop over another grid do not transfer or remove rows',async({page})=>{
 await setup(page);await page.evaluate(async()=>{g.events.on('beforeRowReorder',e=>{e.cancel=true;});const {Grid}=await import('/src/ui/Grid.js');const host=document.createElement('div');document.body.append(host);window.other=new Grid(host,{height:100,rowReorder:true,columns:[{id:'name'}]});other.data.parse([{id:20,name:'Other'}]);});
 await handle(page,0).dragTo(row(page,3),{targetPosition:{x:100,y:20}});expect(await ids(page)).toEqual([0,1,2,3,4,5]);
 await handle(page,0).dragTo(page.getByRole('gridcell',{name:/Other$/}));expect(await ids(page)).toEqual([0,1,2,3,4,5]);expect(await page.evaluate(()=>other.data.all().length)).toBe(1);
});

test('edge drag scrolls only while active and teardown releases the timer',async({page})=>{
 await setup(page);await page.evaluate(()=>g.data.parse(Array.from({length:80},(_,id)=>({id,name:'Row '+id,value:id}))));
 const data=await page.evaluateHandle(()=>new DataTransfer());await handle(page,0).dispatchEvent('dragstart',{dataTransfer:data});
 const bounds=await page.locator('.dui-grid__body').boundingBox();
 await row(page,4).dispatchEvent('dragover',{dataTransfer:data,clientY:bounds.y+bounds.height-2});
 await expect.poll(()=>page.locator('.dui-grid__body').evaluate(el=>el.scrollTop)).toBeGreaterThan(0);
 expect(await page.evaluate(()=>{const c=g._rowReorderController;g.destroy();return {timer:c.timer,state:c.state,grid:c.grid};})).toEqual({timer:null,state:null,grid:null});await data.dispose();
});
test('handle double click does not edit; active editor blocks row move',async({page})=>{
 await setup(page);await page.evaluate(async()=>{const {gridEditors}=await import('/src/ui/grid-api.js');g.setColumns([{id:'name',width:250,editor:gridEditors.text()}]);});
 await handle(page,0).dblclick();await expect(page.locator('.dui-grid__editor-host')).toHaveCount(0);
 expect(await page.evaluate(()=>{g.startEdit(0,'name');return g.moveRows([0],3);})).toBe(false);
 expect(await ids(page)).toEqual([0,1,2,3,4,5]);
});
test('drop callback can destroy owner without a late write',async({page})=>{
 await setup(page);await page.evaluate(()=>g.events.on('beforeRowReorder',()=>g.destroy()));
 await handle(page,0).dragTo(row(page,3),{targetPosition:{x:100,y:20}});expect(await page.evaluate(()=>g.destroyed)).toBe(true);
});
