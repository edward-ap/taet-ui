import {test,expect} from '@playwright/test';
test.beforeEach(async({page})=>{page.on('pageerror',e=>{throw e;});await page.goto('/browser-tests/recipes.html');});
async function setup(page){await page.evaluate(async()=>{
 const {Grid}=await import('/src/ui/Grid.js');
 window.g=new Grid('#root',{width:560,height:260,multiSelect:true,columnReorder:true,columns:[
  {id:'name',width:140,sortable:true},{id:'amount',width:140,dataType:'number',sortable:true,summary:{kind:'total',scope:'filtered'},render:v=>'$'+v},
  {id:'team',width:140,sortable:true},{id:'extra',width:220}],formatting:[{columnId:'amount',when:v=>v>=30,className:'high-amount'}]});
 g.data.parse(Array.from({length:30},(_,i)=>({id:'r'+i,name:'Name '+i,amount:i*10,team:i%2?'Y':'X',extra:'Extra '+i})));
});}
const cell=(page,id,col)=>page.locator(".dui-grid__row[data-dui-grid-row-id]").filter({has:page.getByRole("gridcell",{name:"Name "+id.slice(1),exact:true})}).locator(`.dui-grid__cell[data-dui-grid-column-id="${col}"]`);
const header=(page,col)=>page.locator(`.dui-grid__header-cell[data-dui-grid-column-id="${col}"]`);
test('header sorting, conditional formatting, filters and footer repaint together',async({page})=>{
 await setup(page);await expect(cell(page,'r3','amount')).toHaveText('$30');await expect(cell(page,'r3','amount')).toHaveClass(/high-amount/);
 await header(page,'amount').locator('.dui-grid__header-title').click();await expect(header(page,'amount')).toHaveAttribute('aria-sort','ascending');
 await header(page,'amount').locator('.dui-grid__header-title').click();await expect(header(page,'amount')).toHaveAttribute('aria-sort','descending');
 await page.evaluate(()=>g.setColumnFilter('amount',{kind:'number',operator:'greater',value:260}));
 await expect(page.locator('.dui-grid__row[data-dui-grid-row-id]')).toHaveCount(3);
 expect(await page.evaluate(()=>g.getColumnSummaryValue('amount'))).toBe('Total 840');
 await page.evaluate(()=>g.data.update('r29',{amount:5}));await expect(page.locator('.dui-grid__row[data-dui-grid-row-id]')).toHaveCount(2);
 expect(await page.evaluate(()=>g.getColumnSummaryValue('amount'))).toBe('Total 550');
 await page.evaluate(()=>g.clearAllFilters());await page.evaluate(()=>g.sortBy('amount','asc'));
 await expect(cell(page,'r29','amount')).toHaveText('$5');await expect(cell(page,'r29','amount')).not.toHaveClass(/high-amount/);
});
test('Ctrl row selection survives sorting; Shift extends a separate cell range',async({page})=>{
 await setup(page);await cell(page,'r0','name').click();await cell(page,'r2','name').click({modifiers:['Control']});
 expect(await page.evaluate(()=>g.getSelectedIds())).toEqual(['r0','r2']);
 await cell(page,'r2','name').click({modifiers:['Control']});expect(await page.evaluate(()=>g.getSelectedIds())).toEqual(['r0']);
 await cell(page,'r2','name').click({modifiers:['Control']});
 await page.evaluate(()=>g.sortBy('amount','desc'));expect((await page.evaluate(()=>g.getSelectedIds())).sort()).toEqual(['r0','r2']);
 await page.evaluate(()=>g.clearSort());
 await cell(page,'r0','name').click();await cell(page,'r3','name').click({modifiers:['Shift']});
 expect(await page.evaluate(()=>g.getCellRanges())).toEqual([{anchor:{rowId:'r0',columnId:'name'},focus:{rowId:'r3',columnId:'name'}}]);
 expect(await page.evaluate(()=>g.getSelectedIds())).toEqual(['r3']);
});
test('left and right frozen cells stay aligned during horizontal scroll and hide/restore',async({page})=>{
 await setup(page);await page.evaluate(()=>{g.freezeColumn('name','left');g.freezeColumn('extra','right');});
 const left=await cell(page,'r0','name').boundingBox(),right=await cell(page,'r0','extra').boundingBox();
 await page.locator('.dui-grid__body').evaluate(el=>{el.scrollLeft=140;el.dispatchEvent(new Event('scroll'));});
 await expect.poll(async()=>Math.abs((await cell(page,'r0','name').boundingBox()).x-left.x)).toBeLessThan(2);
 expect(Math.abs((await cell(page,'r0','extra').boundingBox()).x-right.x)).toBeLessThan(2);
 await page.evaluate(()=>g.hideColumn('amount'));await expect(header(page,'amount')).toHaveCount(0);
 await page.evaluate(()=>g.showColumn('amount'));await expect(header(page,'amount')).toHaveCount(1);
 await page.evaluate(()=>{const state=JSON.parse(JSON.stringify(g.getLayoutState()));g.unfreezeColumn('name');g.restoreLayoutState(state);});
 expect(await page.evaluate(()=>g.getColumn('name').frozen)).toBe('left');
});
test('real column drag reorders and cannot cross frozen bands',async({page})=>{
 await setup(page);
 await header(page,'team').dragTo(header(page,'name'),{targetPosition:{x:8,y:12}});
 expect(await page.evaluate(()=>g.columns.map(c=>c.id))).toEqual(['team','name','amount','extra']);
 await page.evaluate(()=>g.freezeColumn('team','left'));
 await header(page,'name').dragTo(header(page,'team'),{targetPosition:{x:8,y:12}});
 expect(await page.evaluate(()=>g.columns.map(c=>c.id))).toEqual(['team','name','amount','extra']);
 await expect(page.locator('.dui-grid__header-cell--dragging')).toHaveCount(0);
});
for(const [kind,initial,value,options] of [
 ['text','Old','New',{}],['number',1,25,{min:0,max:100}],['select','a','b',{items:['a','b']}],
 ['checkbox',false,true,{}],['switch',false,true,{}],['radio','a','b',{items:[{value:'a',text:'A'},{value:'b',text:'B'}]}],
 ['date','2026-01-02','2026-09-24',{}],['time','10:15','16:30',{}],['dateTime','2026-01-02T10:15','2026-09-24T16:30',{}]
])test(`Grid ${kind} control commits, cancels and releases its mounted editor`,async({page})=>{
 await page.evaluate(async({kind,initial,options})=>{
  const {Grid,gridEditors}=await import('/src/ui/grid-api.js');
  const factory=gridEditors[kind](options);
  window.g=new Grid('#root',{width:450,height:200,columns:[{id:'value',width:300,editor:gridEditors.custom(ctx=>{window.ed=factory.createCellEditor(ctx);return ed;})}]});
  g.data.parse([{id:'r',value:initial}]);g.startEdit('r','value');
 },{kind,initial,options});
 expect(await page.evaluate(value=>{ed.control.value.set(value);return g.commitEdit();},value)).toBe(true);
 expect(await page.evaluate(()=>g.data.get('r').value)).toEqual(value);
 expect(await page.evaluate(()=>ed.destroyed)).toBe(true);
 await page.evaluate(initial=>{g.startEdit('r','value');ed.control.value.set(initial);g.cancelEdit();},initial);
 expect(await page.evaluate(()=>g.data.get('r').value)).toEqual(value);
 await expect(page.locator('.dui-grid__editor-host')).toHaveCount(0);
 await page.evaluate(()=>g.destroy());
});
