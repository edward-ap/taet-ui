import test from 'node:test';
import assert from 'node:assert/strict';
import {Grid} from '../src/ui/Grid.js';
const cols=()=>[{id:'name',sortable:true},{id:'value',sortable:true}];
test('setColumns prunes missing sorts, keeps valid rules and selection, silently',()=>{
 const g=new Grid({columns:cols()});try{
 g.data.parse([{id:1,name:'B',value:0},{id:2,name:'A',value:1}]);g.setSelectedIds([1]);g.setSortModel([{columnId:'value',direction:'asc'},{columnId:'name',direction:'asc'}]);let events=0;g.events.on('sortChange',()=>events++);
 g.setColumns([{id:'name',sortable:true}]);assert.deepEqual(g.getSortModel(),[{columnId:'name',direction:'asc'}]);assert.deepEqual(g.view.all().map(r=>r.id),[2,1]);assert.deepEqual(g.getSelectedIds(),[1]);assert.equal(events,0);
 g.setColumns([{id:'name',sortable:false}]);assert.deepEqual(g.getSortModel(),[]);assert.deepEqual(g.view.all().map(r=>r.id),[1,2]);
 assert.throws(()=>g.setSortModel([{columnId:'missing',direction:'asc'}]),/must exist/);
 }finally{g.destroy();}
});
test('setColumns reapplies changed comparator even when column IDs survive',()=>{
 const g=new Grid({columns:cols()});try{g.data.parse([{id:1,name:'A'},{id:2,name:'B'}]);g.sortBy('name','asc');g.setColumns([{id:'name',sort:(a,b)=>b.id-a.id}]);assert.deepEqual(g.view.all().map(r=>r.id),[2,1]);}finally{g.destroy();}
});
test('null and undefined tie stably in either direction and defer to secondary sort',()=>{
 for(const reverse of [false,true])for(const direction of ['asc','desc']){
 const g=new Grid({columns:cols()});try{
 const rows=[{id:1,value:null,name:'B'},{id:2,name:'A'},{id:3,value:2,name:'C'}];if(reverse)rows.reverse();g.data.parse(rows);g.sortBy('value',direction);
 const nullish=g.view.all().filter(r=>r.value==null).map(r=>r.id);assert.deepEqual(nullish,rows.filter(r=>r.value==null).map(r=>r.id));
 g.setSortModel([{columnId:'value',direction},{columnId:'name',direction:'asc'}]);assert.deepEqual(g.view.all().filter(r=>r.value==null).map(r=>r.id),[2,1]);
 }finally{g.destroy();}}
});
