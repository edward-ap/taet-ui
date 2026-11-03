import {test,expect} from '@playwright/test';
test.beforeEach(async({page})=>{page.on('pageerror',e=>{throw e});await page.goto('/browser-tests/recipes.html')});

test('TreeGrid replaces sorted/editing schema and releases a removed filter column',async({page})=>{
 await page.evaluate(async()=>{
  const {TreeGrid,gridEditors}=await import('/src/ui/grid-api.js');
  window.g=new TreeGrid('#root',{width:600,height:200,columns:[{id:'name',sortable:true,editor:gridEditors.text()}]});
  g.data.parse([{id:1,name:'B',other:'One'},{id:2,name:'A',other:'Two'}]);g.sortBy('name','asc');g.setSelectedIds([1]);g.startEdit(1,'name');
  g.setColumns([{id:'name',sortable:true,value:r=>r.id}]);
 });
 await expect(page.locator('.dui-grid__editor-host')).toHaveCount(0);
 await expect(page.getByRole('gridcell')).toHaveText(['1','2']);
 expect(await page.evaluate(()=>g.getSelectedIds())).toEqual([1]);
 await page.evaluate(()=>{g.setColumnFilter('name',{kind:'number',operator:'greater',value:1});g.setColumns([{id:'other'}]);g.data.update(1,{other:'New'});});
 await expect(page.getByRole('gridcell')).toHaveText(['New','Two']);
 expect(await page.evaluate(()=>g.getSortModel())).toEqual([]);
 await page.evaluate(()=>g.destroy());
});

for(const type of ['Grid','TreeGrid'])test(`${type} explicit filter-clear scope keeps search until requested`,async({page})=>{
 await page.evaluate(async type=>{
  const api=await import('/src/ui/grid-api.js');window.g=new api[type]('#root',{width:600,height:200,columns:[{id:'name'},{id:'n'}]});
  g.data.parse([{id:1,name:'Alpha',n:1},{id:2,name:'Beta',n:2}]);
  if(g.search){g.search.setMode('filter');g.search.set('Alpha')}else g.setSearchQuery('Alpha');
  g.setColumnFilter('n',{kind:'number',operator:'greater',value:0});g.clearAllFilters({search:false,silent:true});
 },type);
 await expect(page.locator('.dui-grid__body .dui-grid__row')).toHaveCount(1);
 await page.evaluate(()=>g.clearAllFilters({search:true,silent:true}));
 await expect(page.locator('.dui-grid__body .dui-grid__row')).toHaveCount(2);
 await page.evaluate(()=>g.destroy());
});

for(const type of ['Grid','TreeGrid'])test(`${type} silent edit start suppresses active and edit semantic events`,async({page})=>{
 const result=await page.evaluate(async type=>{
  const api=await import('/src/ui/grid-api.js');const g=new api[type]('#root',{width:600,height:200,columns:['a','b'].map(id=>({id,editor:api.gridEditors.text()}))});
  g.data.parse([{id:1,a:'A',b:'B'}]);const events=[];
  for(const name of ['activeChange','activeCellChange','beforeEditStart','editStart'])g.events.on(name,()=>events.push(name));
  const started=g.startEdit(1,'b',{silent:true});const result={started,events};g.destroy();return result;
 },type);
 expect(result).toEqual({started:true,events:[]});
});
