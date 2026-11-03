import test from 'node:test';
import assert from 'node:assert/strict';
import {Grid} from '../src/ui/Grid.js';
import {DataStore} from '../src/core/DataStore.js';
const ids=g=>g.data.all().map(r=>r.id);
function create(options={}) {const g=new Grid({columns:[{id:'name',sortable:true}],multiSelect:true,...options});g.data.parse(Array.from({length:6},(_,id)=>({id,name:'Row '+id})));return g;}
test('row move preserves source order, record identity, selection and mutation metadata',()=>{
 const g=create();try{
 const before=g.data.all();g.setSelectedIds([3,1]);let changes=0;const events=[];
 g.data.events.on('change',()=>changes++);g.events.on('rowReorder',e=>events.push([e.ids,e.targetId,e.position,e.origin,e.userAction]));
 assert.equal(g.moveRows([3,1],4,{position:'after',origin:'user'}),true);
 assert.deepEqual(ids(g),[0,2,4,1,3,5]);assert.equal(g.data.get(1),before[1]);assert.deepEqual(g.getSelectedIds(),[3,1]);
 assert.equal(changes,1);assert.deepEqual(events,[[[1,3],4,'after','user',true]]);
 }finally{g.destroy();}
});
test('filtered and paged targets resolve against the complete source',()=>{
 const g=create({statusBar:{pagination:{pageSize:2}}});try{
 g.setFilter(r=>r.id!==1);assert.equal(g.moveRows([0],3,{position:'after'}),true);assert.deepEqual(ids(g),[1,2,3,0,4,5]);
 }finally{g.destroy();}
});
test('row no-op, missing ids, target in selection and duplicate ids never lose data',()=>{
 const g=create();try{
 for(const [moving,target] of [[[],2],[[1],1],[[99],2],[[1],99],[[1],2]])assert.equal(g.moveRows(moving,target),false);
 assert.deepEqual(ids(g),[0,1,2,3,4,5]);assert.equal(g.moveRows([1,1],4),true);assert.deepEqual(ids(g),[0,2,3,1,4,5]);
 assert.throws(()=>g.moveRows([0],1,{position:'inside'}),TypeError);
 }finally{g.destroy();}
});
test('row moves preserve typed ids and reject index-derived identity',()=>{
 const g=create();try{g.data.parse([{id:1,name:'a'},{id:'1',name:'b'},{id:2,name:'c'}]);assert.equal(g.moveRows(['1'],1),true);assert.deepEqual(ids(g),['1',1,2]);}finally{g.destroy();}
 const indexed=new Grid({getId:(_r,i)=>i,columns:[{id:'name'}]});try{indexed.data.parse([{name:'a'},{name:'b'}]);assert.equal(indexed.moveRows([1],0),false);}finally{indexed.destroy();}
});
test('Grid and DataStore vetoes are atomic; silent moves synchronize without semantic events',()=>{
 const g=create();try{
 let veto=true,events=0;g.events.on('beforeRowReorder',e=>{e.cancel=veto;});g.events.on('rowReorder',()=>events++);
 assert.equal(g.moveRows([0],3),false);veto=false;
 const sub=g.data.events.on('beforeChange',e=>{e.cancel=true;});assert.equal(g.moveRows([0],3),false);sub.dispose();
 assert.deepEqual(ids(g),[0,1,2,3,4,5]);assert.equal(g.moveRows([0],3,{silent:true}),true);assert.equal(events,0);assert.deepEqual(g.view.all().map(r=>r.id),[1,2,0,3,4,5]);
 }finally{g.destroy();}
});
test('callbacks cannot overwrite newer data or continue after borrowed-owner teardown',()=>{
 const g=create();try{g.events.on('beforeRowReorder',()=>g.data.update(0,{name:'New'}));assert.equal(g.moveRows([0],3),false);assert.deepEqual(ids(g),[0,1,2,3,4,5]);}finally{g.destroy();}
 const data=new DataStore();const borrowed=create({data});data.events.on('beforeChange',()=>borrowed.destroy());
 assert.equal(borrowed.moveRows([0],3),false);assert.deepEqual(data.all().map(r=>r.id),[0,1,2,3,4,5]);data.destroy();
});
test('sorting/grouping/remote and projection changes in callbacks reject local moves',()=>{
 const g=create();try{
 g.sortBy('name','desc');assert.equal(g.moveRows([0],3),false);g.clearSort();
 g.view.setSort((a,b)=>b.id-a.id);assert.equal(g.moveRows([0],3),false);g.view.clearSort();
 g.setGroups(['name']);assert.equal(g.moveRows([0],3),false);g.clearGroups();
 g.data.events.on('beforeChange',()=>g.sortBy('name','desc'));assert.equal(g.moveRows([0],3),false);assert.deepEqual(ids(g),[0,1,2,3,4,5]);
 }finally{g.destroy();}
 const remote=create({dataProvider:{load:async()=>({rows:[],totalCount:0})}});try{assert.equal(remote.moveRows([0],3),false);}finally{remote.destroy();}
});
test('nested moves are rejected and completion teardown is safe',()=>{
 const g=create();g.events.on('beforeRowReorder',()=>assert.equal(g.moveRows([1],4),false));g.events.on('rowReorder',()=>g.destroy());
 assert.equal(g.moveRows([0],3),true);assert.equal(g.destroyed,true);
});
