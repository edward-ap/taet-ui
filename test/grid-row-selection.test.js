import test from 'node:test';
import assert from 'node:assert/strict';
import { Grid } from '../src/ui/Grid.js';
import { TreeGrid } from '../src/ui/TreeGrid.js';
function create(options={}) {
 const grid=new Grid({multiSelect:true,rowRangeSelection:true,columns:[{id:'name',sortable:true}],...options});
 grid.data.parse(['A','B','C','D','E'].map((name,id)=>({id,name})));
 return grid;
}
const pick=(g,id,event={})=>g._selectionController.selectFromUser(g.data.get(id),event);
test('row ranges extend, shrink and Ctrl+Shift union without changing their anchor',()=>{
 const g=create();try{
 pick(g,1);pick(g,4,{shiftKey:true});assert.deepEqual(g.getSelectedIds(),[1,2,3,4]);
 pick(g,2,{shiftKey:true});assert.deepEqual(g.getSelectedIds(),[1,2]);
 pick(g,4,{ctrlKey:true});pick(g,3,{ctrlKey:true,shiftKey:true});
 assert.deepEqual(g.getSelectedIds(),[1,2,4,3]);
 pick(g,2);pick(g,0,{shiftKey:true});assert.deepEqual(g.getSelectedIds(),[0,1,2]);
 }finally{g.destroy();}
});
test('row anchor uses typed identity and the current filtered/sorted order',()=>{
 const g=create();try{
 pick(g,1);g.sortBy('name','desc');pick(g,4,{shiftKey:true});assert.deepEqual(g.getSelectedIds(),[4,3,2,1]);
 g.setFilter(r=>r.id!==1);pick(g,2,{shiftKey:true});assert.deepEqual(g.getSelectedIds(),[2]);
 pick(g,4,{shiftKey:true});assert.deepEqual(g.getSelectedIds(),[4,3,2]);
 g.data.parse([{id:1,name:'Number'},{id:'1',name:'String'},{id:2,name:'Other'}]);g.clearAllFilters();g.clearSort();
 pick(g,'1');pick(g,2,{shiftKey:true});assert.deepEqual(g.getSelectedIds(),['1',2]);
 }finally{g.destroy();}
});
test('paging limits ranges and replacement records resolve through the anchor id',()=>{
 const g=create({statusBar:{pagination:{pageSize:2}}});try{
 pick(g,0);g.nextPage();pick(g,3,{shiftKey:true});assert.deepEqual(g.getSelectedIds(),[3]);
 g.data.update(3,{name:'Updated'});pick(g,2,{shiftKey:true});assert.deepEqual(g.getSelectedIds(),[2,3]);
 }finally{g.destroy();}
});
test('default Grid cell mode and single selection remain unchanged',()=>{
 for(const options of [{rowRangeSelection:false},{multiSelect:false}]){
  const g=create(options);try{pick(g,0);pick(g,3,{shiftKey:true});assert.deepEqual(g.getSelectedIds(),[3]);}finally{g.destroy();}
 }
});
test('row range selection respects cancellation and user provenance',()=>{
 const g=create();try{
 pick(g,0);let blocked=true;const changes=[];
 g.selection.events.on('beforeChange',e=>{if(blocked)e.cancel=true;});
 g.events.on('selectionChange',e=>changes.push([e.origin,e.userAction]));
 pick(g,3);assert.deepEqual(g.getSelectedIds(),[0]);blocked=false;
 pick(g,2,{shiftKey:true});assert.deepEqual(g.getSelectedIds(),[0,1,2]);assert.deepEqual(changes,[['user',true]]);
 }finally{g.destroy();}
});
test('TreeGrid ranges omit collapsed children',()=>{
 const g=new TreeGrid({multiSelect:true,rowRangeSelection:true,columns:[{id:'text'}]});try{
 g.data.parse([{id:'p',text:'Parent'},{id:'c',parentId:'p',text:'Child'},{id:'q',text:'Other'}]);
 g.expand('p');pick(g,'p');pick(g,'q',{shiftKey:true});assert.deepEqual(g.getSelectedIds(),['p','c','q']);
 g.collapse('p');pick(g,'p');pick(g,'q',{shiftKey:true});assert.deepEqual(g.getSelectedIds(),['p','q']);
 }finally{g.destroy();}
});

test('a missing anchor resets even when the fallback target is already selected',()=>{
 const g=create();try{
 pick(g,0);g.setFilter(r=>r.id>=2);g.setSelectedIds([2]);pick(g,2,{shiftKey:true});
 pick(g,4,{shiftKey:true});assert.deepEqual(g.getSelectedIds(),[2,3,4]);
 }finally{g.destroy();}
});
