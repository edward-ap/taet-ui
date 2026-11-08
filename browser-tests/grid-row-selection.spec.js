import {test,expect} from '@playwright/test';
test.beforeEach(async({page})=>{page.on('pageerror',e=>{throw e;});await page.goto('/browser-tests/recipes.html');});
async function setup(page,kind='Grid') {await page.evaluate(async kind=>{
 const ui=await import('/src/ui/grid-api.js');window.g=new ui[kind]('#root',{
  height:160,width:450,multiSelect:true,rowRangeSelection:true,columns:[{id:'name',sortable:true,width:220}]
 });g.data.parse(Array.from({length:80},(_,id)=>({id,name:'Row '+id})));
},kind);}
const row=(page,id)=>page.getByRole('gridcell',{name:'Row '+id,exact:true});
for(const kind of ['Grid','TreeGrid']) {
 test(kind+' Shift pointer/keyboard ranges, primary-modifier focus and offscreen endpoints',async({page})=>{
  await setup(page,kind);await row(page,1).click();await row(page,4).click({modifiers:['Shift']});
  expect(await page.evaluate(()=>g.getSelectedIds())).toEqual([1,2,3,4]);
  await page.keyboard.press('Shift+ArrowUp');expect(await page.evaluate(()=>g.getSelectedIds())).toEqual([1,2,3]);
  await page.keyboard.press('ControlOrMeta+ArrowDown');expect(await page.evaluate(()=>g.getSelectedIds())).toEqual([1,2,3]);
  await page.keyboard.press('Shift+End');expect(await page.evaluate(()=>g.getSelectedIds())).toEqual(Array.from({length:79},(_,i)=>i+1));
  await expect(row(page,79)).toBeVisible();
  await page.keyboard.press('ArrowUp');expect(await page.evaluate(()=>g.getSelectedIds())).toEqual([78]);
  if(kind==='Grid')expect(await page.evaluate(()=>g.getCellRanges())).toEqual([]);
 });
 test(kind+' row selection callback may destroy the table',async({page})=>{
  await setup(page,kind);await page.evaluate(()=>g.events.on('selectionChange',()=>g.destroy()));
  await row(page,1).click();expect(await page.evaluate(()=>g.destroyed)).toBe(true);
 });
 test(kind+' Shift keyboard selection may destroy the table',async({page})=>{
  await setup(page,kind);await row(page,1).click();
  await page.evaluate(()=>g.events.on('selectionChange',()=>g.destroy()));
  await page.keyboard.press('Shift+ArrowDown');expect(await page.evaluate(()=>g.destroyed)).toBe(true);
 });
}
test('Grid row range skips collapsed groups for both pointer and keyboard',async({page})=>{
 await setup(page);await page.evaluate(()=>{
  g.data.parse([{id:0,name:'Row 0',team:'A'},{id:1,name:'Row 1',team:'B'},{id:2,name:'Row 2',team:'C'}]);
  g.setColumns([{id:'name',width:200},{id:'team',width:100}]);g.setGroups(['team']);g.toggleGroup('/team:B');
 });
 await row(page,0).click();await row(page,2).click({modifiers:['Shift']});expect(await page.evaluate(()=>g.getSelectedIds())).toEqual([0,2]);
 await row(page,0).click();await page.keyboard.press('Shift+ArrowDown');expect(await page.evaluate(()=>g.getSelectedIds())).toEqual([0,2]);
});
test('rangeSelection false also disables Shift keyboard cell ranges',async({page})=>{
 await page.evaluate(async()=>{const {Grid}=await import('/src/ui/Grid.js');window.g=new Grid('#root',{height:160,columns:[{id:'name'}],rangeSelection:false});g.data.parse([{id:0,name:'Row 0'},{id:1,name:'Row 1'}]);});
 await row(page,0).click();await page.keyboard.press('Shift+ArrowDown');expect(await page.evaluate(()=>g.getCellRanges())).toEqual([]);
});
