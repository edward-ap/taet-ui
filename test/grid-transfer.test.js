import test from 'node:test';
import assert from 'node:assert/strict';
import {DataStore} from '../src/core/DataStore.js';
import {DataView} from '../src/core/DataView.js';
import {Grid} from '../src/ui/Grid.js';
import {EventBus} from '../src/core/EventBus.js';
const stores=()=>{const a=new DataStore(),b=new DataStore();a.parse([{id:1,n:'one'},{id:2,n:'two'},{id:3,n:'three'}]);b.parse([{id:9,n:'nine'}]);return[a,b]};
const ids=s=>s.all().map(x=>x.id);
for(const mode of ['move','copy'])test(`store ${mode} commits one batch per changed store and preserves typed fields`,()=>{
 const [a,b]=stores(),date=new Date(),fn=()=>true;a.update(1,{date,fn,nested:{x:1}});const row=a.get(1),seen=[];
 for(const [s,name]of[[a,'a'],[b,'b']])for(const event of['invalidate','change','afterChange'])s.events.on(event,e=>{seen.push(name+event);assert.deepEqual(ids(a),mode==='move'?[3]:[1,2,3]);assert.deepEqual(ids(b),[9,1,2]);assert.equal(e.operation,'batch');assert.equal(e.changes.length,2)});
 const rev=a._revision;const out=a.transferTo(b,[2,1],{mode});assert.equal(out.accepted,true);assert.deepEqual(out.sourceIds,[1,2]);assert.deepEqual(out.ids,[1,2]);assert.equal(out.reason,null);assert.equal(b.get(1).date,date);assert.equal(b.get(1).fn,fn);assert.equal(b.get(1).nested,row.nested);assert.equal(b.get(1)===row,mode==='move');assert.deepEqual(out.notificationErrors,[]);assert.equal(seen.length,mode==='move'?6:3);if(mode==='copy')assert.equal(a._revision,rev);a.destroy();b.destroy();
});
for(const side of['source','target'])for(const kind of['veto','throw','write','destroy'])test(`preflight ${side} ${kind} cannot half-commit a multi-row transfer`,()=>{
 const[a,b]=stores(),s=side==='source'?a:b;let changed=0;a.events.on('change',()=>changed++);b.events.on('change',()=>changed++);
 s.events.on('beforeChange',e=>{if(e.id!==2)return;if(kind==='veto')e.cancel=true;if(kind==='throw')throw Error('reject batch');if(kind==='write')a.update(3,{n:'nested'});if(kind==='destroy')s.destroy()});
 const out=a.transferTo(b,[1,2]);assert.equal(out.accepted,false);assert.equal(changed,0);if(!a.destroyed)assert.deepEqual(ids(a),[1,2,3]);if(!b.destroyed)assert.deepEqual(ids(b),[9]);assert.equal(a._transferLock,null);assert.equal(b._transferLock,null);a.destroy();b.destroy();
});
test('same-store, existing/incoming IDs and partial missing sets reject without writes',()=>{
 const[a,b]=stores();assert.equal(a.transferTo(a,[1]).reason,'same-store');b.add({id:2});assert.equal(a.transferTo(b,[1,2]).reason,'id-conflict');assert.deepEqual(ids(a),[1,2,3]);assert.deepEqual(ids(b),[9,2]);b.remove(2);assert.equal(a.transferTo(b,[1,2],{mapItem:r=>({...r,id:7})}).reason,'id-conflict');assert.equal(a.transferTo(b,[1,99]).reason,'missing-id');assert.equal(a.transferTo(b,[1,1]).reason,'invalid-ids');assert.deepEqual(ids(b),[9]);a.destroy();b.destroy();
});
test('explicit mapping allocates IDs without JSON cloning and async maps reject',()=>{
 const[a,b]=stores();const out=a.transferTo(b,[1],{mode:'copy',mapItem:r=>({id:'copy-'+r.id,n:r.n})});assert.equal(out.accepted,true);assert.deepEqual(out.ids,['copy-1']);assert.deepEqual(ids(a),[1,2,3]);assert.equal(a.transferTo(b,[2],{mapItem:async r=>r}).reason,'invalid-item');a.destroy();b.destroy();
});
test('active transaction, before phase and transfer reentry reject conservatively',()=>{
 const[a,b]=stores();a.batch(()=>assert.equal(a.transferTo(b,[1]).reason,'busy'));b.batch(()=>assert.equal(a.transferTo(b,[1]).reason,'busy'));a.events.on('beforeChange',()=>assert.equal(a.transferTo(b,[1]).reason,'busy'));a.update(3,{n:'changed'});b.events.on('beforeChange',()=>assert.equal(a.transferTo(b,[1]).reason,'busy'));assert.equal(a.transferTo(b,[1]).accepted,true);a.destroy();b.destroy();
});
test('history is a boundary for changed stores; copy preserves source history',()=>{
 for(const mode of['move','copy']){const[a,b]=stores();a.batch(()=>a.update(3,{n:'history'}));b.batch(()=>b.update(9,{n:'history'}));b.undo();assert.equal(a.canUndo(),true);assert.equal(b.canRedo(),true);assert.equal(a.transferTo(b,[1],{mode}).accepted,true);assert.equal(a.canUndo(),mode==='copy');assert.equal(b.canUndo(),false);assert.equal(b.canRedo(),false);a.destroy();b.destroy()}
});
test('throwing early invalidation cannot starve views; post-commit writes stay blocked and result accepted',()=>{
 const[a,b]=stores(),error=Error('observer');b.events.on('invalidate',()=>{throw error});const av=new DataView({data:a}),bv=new DataView({data:b});const blocked=a.events.on('change',()=>b.add({id:50}));let later=false;b.events.on('invalidate',()=>later=true);
 const out=a.transferTo(b,[1,2]);assert.equal(out.accepted,true);assert.ok(out.notificationErrors.includes(error));assert.equal(out.notificationErrors.length,2);assert.equal(later,true);assert.deepEqual(av.all().map(x=>x.id),[3]);assert.deepEqual(bv.all().map(x=>x.id),[9,1,2]);assert.equal(b.get(50),undefined);blocked.dispose();a.add({id:4});av.destroy();bv.destroy();a.destroy();b.destroy();
});
test('index-derived IDs and getters trying to mutate either participant cannot transfer',()=>{
 const a=new DataStore({getId:(_,i)=>i}),b=new DataStore();a.parse([{},{}]);b.parse([{id:9}]);assert.equal(a.transferTo(b,[0]).reason,'unstable-ids');a.destroy();b.destroy();const[c,d]=stores();const row={id:4,get n(){d.clear();return'x'}};c.add(row);assert.equal(c.transferTo(d,[4],{mode:'copy'}).accepted,false);assert.deepEqual(ids(d),[9]);c.destroy();d.destroy();
});
test('ordinary EventBus emit remains fail-fast',()=>{const bus=new EventBus();let later=false;bus.on('x',()=>{throw Error('original')});bus.on('x',()=>later=true);assert.throws(()=>bus.emit('x'),/original/);assert.equal(later,false);bus.destroy()});
const grids=()=>{const a=new Grid({columns:[{id:'n',sortable:true}],multiSelect:true,rowTransfer:{drag:true,accept:true}}),b=new Grid({columns:[{id:'n',sortable:true}],multiSelect:true,rowTransfer:{drag:true,accept:true}});a.data.parse([{id:1,n:'one'},{id:2,n:'two'}]);b.data.parse([{id:9,n:'nine'}]);return[a,b]};
test('Grid hooks see old state, veto custom reason and report once per owner',()=>{
 const[a,b]=grids(),events=[];a.setSelectedIds([1,2]);for(const[g,role]of[[a,'source'],[b,'target']]){g.events.on('beforeRowTransfer',e=>{events.push('before-'+e.role);assert.equal(e.role,role);assert.deepEqual(ids(a.data),[1,2]);assert.deepEqual(ids(b.data),[9])});g.events.on('rowTransfer',e=>events.push(e.role+'-'+e.result.accepted))}
 const sub=b.events.on('beforeRowTransfer',e=>{e.cancel=true;e.reason='domain permission'});assert.equal(a.transferRowsTo(b,[1,2]).reason,'domain permission');assert.deepEqual(ids(a.data),[1,2]);assert.deepEqual(events,['before-target','source-false','target-false']);sub.dispose();events.length=0;const result=a.transferRowsTo(b,[1,2]);assert.equal(result.accepted,true);assert.deepEqual(events,['before-target','before-source','source-true','target-true']);assert.deepEqual(a.getSelectedIds(),[]);assert.deepEqual(b.getSelectedIds(),[]);a.destroy();b.destroy();
});
test('Grid compatible bindings ignore order/width; mapping required for different fields',()=>{
 const[a,b]=grids();b.setColumns([{id:'other'}]);assert.equal(a.transferRowsTo(b,[1]).reason,'schema-mismatch');assert.equal(a.transferRowsTo(b,[1],{mapItem:r=>({id:r.id,other:r.n})}).accepted,true);a.destroy();b.destroy();
});
test('Grid preflight teardown or schema changes leave borrowed stores untouched',()=>{
 for(const action of['destroy','schema']){const[a,b]=grids();const ad=a.data,bd=b.data;b._ownsData=false;b.events.on('beforeRowTransfer',()=>action==='destroy'?b.destroy():a.setColumns([{id:'other'}]));assert.equal(a.transferRowsTo(b,[1]).accepted,false);assert.deepEqual(ids(ad),[1,2]);assert.deepEqual(ids(bd),[9]);a.destroy();b.destroy();bd.destroy()}
});
test('Grid explicit permissions, disabled, same store, remote and hidden IDs reject; local sorted/filtered accepted',()=>{
 const[a,b]=grids();b.disable();assert.equal(a.transferRowsTo(b,[1]).reason,'target-unavailable');b.enable();a.setFilter(r=>r.id===1);assert.equal(a.transferRowsTo(b,[2]).reason,'not-visible');b.sortBy('n','desc');assert.equal(a.transferRowsTo(b,[1]).accepted,true);a.destroy();b.destroy();const no=new Grid({columns:[{id:'n'}]}),[x,y]=grids();assert.equal(x.transferRowsTo(no,[1]).reason,'target-unavailable');x.dataProvider={request(){}};assert.equal(x.transferRowsTo(y,[1]).reason,'source-unavailable');x.destroy();y.destroy();no.destroy();
});

test('Grid and store transfer provenance normalize userAction consistently',()=>{
 const[a,b]=grids(),seen=[];for(const grid of[a,b]){grid.events.on('beforeRowTransfer',e=>seen.push([e.origin,e.userAction]));grid.events.on('rowTransfer',e=>seen.push([e.origin,e.userAction]));grid.data.events.on('beforeChange',e=>seen.push([e.origin,e.userAction]))}assert.equal(a.transferRowsTo(b,[1],{origin:'user'}).accepted,true);assert.equal(seen.length,6);assert.ok(seen.every(([origin,userAction])=>origin==='user'&&userAction===true));a.destroy();b.destroy();
});
