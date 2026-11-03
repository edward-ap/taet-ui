import {test,expect} from '@playwright/test';
for(const zone of ['UTC','Pacific/Kiritimati']){
 test.describe(zone,()=>{
  test.use({timezoneId:zone});
  test('TreeGrid valid Date order is chronological and keeps sibling context',async({page})=>{
   const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/browser-tests/recipes.html');
   await page.evaluate(async()=>{
    const {TreeGrid}=await import('/src/ui/grid-api.js');
    window.columns=()=>[{id:'label',width:180},{id:'when',sortable:true,width:180,value:r=>r.when,render:v=>v instanceof Date?v.toISOString().slice(0,10):''}];
    window.grid=new TreeGrid('#root',{width:600,height:350,treeColumnId:'label',multiSelect:true,expandedIds:['p'],columns:columns()});
    grid.data.parse([{id:'p',label:'Parent',when:null},...[6,2,4,0,5,1,3].map(i=>({id:'d'+i,parentId:'p',label:'Day '+i,when:new Date(Date.UTC(2024,0,7+i,12))})),{id:'d0b',parentId:'p',label:'Equal timestamp',when:new Date(Date.UTC(2024,0,7,12))}]);
    grid.setSelectedIds(['d2']);grid.sortBy('when','asc');
   });
   const rows=()=>page.locator('.dui-grid__body .dui-grid__row').evaluateAll(nodes=>nodes.map(n=>n.dataset.duiGridRowId));
   const ascending=['p','d0','d0b','d1','d2','d3','d4','d5','d6'];
   expect(await page.evaluate(()=>grid.treeView.all().map(row=>row.id))).toEqual(ascending);
   // The model is synchronous; window painting is queued for an animation frame.
   await expect.poll(rows).toEqual(ascending.map(x=>'string:'+x));
   await page.evaluate(()=>grid.sortBy('when','desc'));
   const descending=['p','d6','d5','d4','d3','d2','d1','d0','d0b'].map(x=>'string:'+x);
   expect(await page.evaluate(()=>grid.treeView.all().map(row=>row.id))).toEqual(descending.map(x=>x.slice('string:'.length)));
   await expect.poll(rows).toEqual(descending);
   expect(await page.evaluate(()=>({selected:grid.getSelectedIds(),expanded:grid.treeView.getExpandedIds()}))).toEqual({selected:['d2'],expanded:['p']});
   await page.evaluate(()=>grid.setColumns(columns()));
   expect(await page.evaluate(()=>grid.treeView.all().map(row=>row.id))).toEqual(descending.map(x=>x.slice('string:'.length)));
   await expect.poll(rows).toEqual(descending);
   expect(await page.evaluate(()=>grid.getSelectedIds())).toEqual(['d2']);
   await page.evaluate(()=>grid.destroy());await expect(page.locator('#root > *')).toHaveCount(0);expect(errors).toEqual([]);
  });
 });
}
