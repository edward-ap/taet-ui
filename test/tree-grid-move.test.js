import test from 'node:test';
import assert from 'node:assert/strict';
import {DataStore} from '../src/core/DataStore.js';
import {TreeDataView} from '../src/core/TreeDataView.js';
import {EventBus} from '../src/core/EventBus.js';
import {SelectionModel} from '../src/core/SelectionModel.js';
import {describeTreeGridMoveSources,planTreeGridMove,moveTreeGridNodes} from '../src/ui/GridTreeMove.js';

const fixture=[{id:'A',text:'A'},{id:'A1',parentId:'A',text:'A1'},{id:'A11',parentId:'A1',text:'A11'},
  {id:'A2',parentId:'A',text:'A2'},{id:'B',text:'B'},{id:'B1',parentId:'B',text:'B1'},{id:'C',text:'C'}];
function owner(rows=fixture,options={}){
  const data=options.data??new DataStore(options),treeView=options.treeView??new TreeDataView({data,parentField:options.parentField,rootParentId:options.rootParentId});
  if(!options.data)data.parse(rows);
  const grid={data,treeView,events:new EventBus(),selection:new SelectionModel({multiple:true}),nodeReorderEnabled:true,
    columns:[{id:'text'}],treeColumnId:'text',parentField:options.parentField??'parentId',rootParentId:options.rootParentId??null,
    _movingNodes:false,destroyed:false,disabled:false,_activeId:null};
  grid.expand=(id,metadata)=>treeView.expand(id,metadata);
  grid._reconcileSelection=()=>{
    const before=grid.selection.get(),next=before.flatMap(row=>{
      const id=data.idOf(row),current=grid._nodeMoveSelectionHold?data.get(id):treeView.get(id);return current?[current]:[];
    });
    if(before.length!==next.length||before.some((row,index)=>row!==next[index]))grid.selection.set(next,{silent:true,origin:'system'});
  };
  treeView.events.on('invalidate',()=>{if(grid._activeId!=null&&!treeView.has(grid._activeId))grid._activeId=null;grid._reconcileSelection()});
  grid.selection.events.on('invalidate',()=>grid._reconcileSelection());
  grid.destroy=()=>{grid.destroyed=true;grid.events.destroy();if(!options.data)data.destroy();treeView.destroy();grid.selection.destroy()};
  return grid;
}
const ids=g=>g.data.all().map(row=>row.id);
const move=(g,source,target,position='inside',options={})=>moveTreeGridNodes(g,source,target,position,options);

test('description and plan normalize parent/child duplicates in complete source order without mutation',()=>{
  const g=owner();g.treeView.setFilter(row=>row.id==='B1');const before=g.data.all(),description=describeTreeGridMoveSources(g,['A2','A11','A','A']);
  assert.equal(description.accepted,true);assert.deepEqual(description.ids,['A']);assert.deepEqual(description.subtreeIds,['A','A1','A11','A2']);
  assert.equal(description.items[0],before[0]);assert.deepEqual(description.sourceItems,before);
  const plan=planTreeGridMove(g,['A2','A11','A'],'B');assert.equal(plan.accepted,true);assert.equal(plan.parentId,'B');
  assert.deepEqual(g.data.all(),before);assert.equal(g.data.canUndo(),false);g.destroy();
});

test('move reparents only roots, retains all descendants/references/typed data, and creates one undo entry',()=>{
  const g=owner(),nested={n:1},date=new Date(),fn=()=>true;g.data.update('A',{nested,date,fn});const root=g.data.get('A'),child=g.data.get('A1'),leaf=g.data.get('A11');
  const before=g.data.all(),publications=[];g.data.events.on('change',e=>publications.push(e));
  const result=move(g,['A1','A'],'B');assert.equal(result.accepted,true);assert.deepEqual(result.ids,['A']);assert.deepEqual(result.subtreeIds,['A','A1','A11','A2']);
  assert.equal(result.parentId,'B');assert.equal(result.reason,null);assert.deepEqual(result.notificationErrors,[]);
  assert.deepEqual(ids(g),['B','B1','A','A1','A11','A2','C']);assert.equal(g.data.get('A').parentId,'B');assert.notEqual(g.data.get('A'),root);
  assert.equal(g.data.get('A').nested,nested);assert.equal(g.data.get('A').date,date);assert.equal(g.data.get('A').fn,fn);
  assert.equal(g.data.get('A1'),child);assert.equal(g.data.get('A11'),leaf);assert.equal(publications.length,1);assert.equal(publications[0].operation,'batch');assert.equal(publications[0].changes.length,1);
  assert.equal(g.data.undo(),true);assert.deepEqual(g.data.all(),before);assert.equal(g.data.canUndo(),false);assert.equal(g.data.redo(),true);assert.equal(g.data.get('A').parentId,'B');g.destroy();
});

test('before/after honor sibling source order and repeated operations remain available after unlock',()=>{
  const g=owner();assert.equal(move(g,['A2'],'A1','before').accepted,true);assert.deepEqual(ids(g),['A','A2','A1','A11','B','B1','C']);
  assert.equal(planTreeGridMove(g,['A2'],'A1','after').accepted,true);assert.equal(move(g,['A2'],'A1','after').accepted,true);
  assert.deepEqual(ids(g),['A','A1','A2','A11','B','B1','C']);assert.equal(move(g,['B'],null).accepted,true);assert.deepEqual(ids(g),['A','A1','A2','A11','C','B','B1']);
  assert.equal(describeTreeGridMoveSources(g,['A']).accepted,true);g.destroy();
});

test('noncontiguous forests use direct sibling anchors instead of trailing descendant positions',()=>{
  const rows=[{id:'a'},{id:'b'},{id:'c'},{id:'b1',parentId:'b'}],g=owner(rows);
  assert.equal(move(g,['a'],'b','after').accepted,true);
  assert.deepEqual(g.data.all().filter(row=>row.parentId==null).map(row=>row.id),['b','a','c']);
  assert.equal(g.data.get('b1'),rows[3]);g.destroy();
  const h=owner([{id:'p'},{id:'p1',parentId:'p'},{id:'other'},{id:'p11',parentId:'p1'},{id:'incoming'}]);
  assert.equal(move(h,['incoming'],'p').accepted,true);assert.deepEqual(h.data.all().map(r=>r.id),['p','p1','incoming','other','p11']);h.destroy();
});

test('explicit null root marker and parent field on an injected view override facade defaults',()=>{
  const data=new DataStore();data.parse([{id:'a',up:null},{id:'child',up:'a'},{id:'b',up:null}]);
  const view=new TreeDataView({data,parentField:'up',rootParentId:null}),g=owner([],{data,treeView:view,parentField:'wrong',rootParentId:'wrong-root'});
  assert.equal(move(g,['a'],'b').accepted,true);assert.equal(data.get('a').up,'b');
  assert.equal(move(g,['a'],null).accepted,true);assert.equal(data.get('a').up,null);g.destroy();data.destroy();
});

test('before callbacks cannot retarget prepared parent links through record aliases',()=>{
  const g=owner();g.data.events.once('beforeChange',event=>{event.items.find(row=>row.id==='A').parentId='A11'});
  assert.equal(move(g,['A'],'B').reason,'stale');assert.equal(g.data.get('A').parentId,undefined);assert.equal(g.data.canUndo(),false);g.destroy();
});

test('custom parent/id fields prefer injected view root marker, preserve marker and descendant records',()=>{
  const data=new DataStore({idField:'key'});data.parse([{key:'a',up:0},{key:'child',up:'a'},{key:'b',up:0}]);
  const view=new TreeDataView({data,parentField:'up',rootParentId:0}),g=owner([],{data,treeView:view});const child=data.get('child');
  const out=move(g,['a'],'b');assert.equal(out.accepted,true);assert.equal(data.get('a').up,'b');assert.equal(data.get('child'),child);
  assert.equal(move(g,['a'],null).accepted,true);assert.equal(data.get('a').up,0);g.destroy();data.destroy();
});

for(const [source,target,position,reason] of [
  [['A'],'A','inside','cycle'],[['A'],'A11','inside','cycle'],[['A1'],'A11','before','cycle'],
  [['missing'],'B','inside','missing-id'],[['A'],'missing','inside','missing-target'],
  [[],null,'inside','invalid-ids'],[['A'],null,'before','invalid-target'],[['A'],'B','bad','invalid-position'],
  [['C'],null,'inside','noop']
])test(`rejects ${reason}: ${JSON.stringify([source,target,position])}`,()=>{
  const g=owner(),before=g.data.all();const result=move(g,source,target,position);assert.equal(result.accepted,false);assert.equal(result.reason,reason);
  assert.deepEqual(g.data.all(),before);assert.equal(g.data.canUndo(),false);g.destroy();
});

test('sorted relative moves reject, inside reparent remains allowed and does not change comparator',()=>{
  const g=owner(),sort=(a,b)=>a.text.localeCompare(b.text);g.treeView.setSort(sort);
  assert.equal(move(g,['A'],'B','before').reason,'sorted-order');assert.equal(move(g,['A'],'B','after').reason,'sorted-order');
  assert.equal(move(g,['A'],'B').accepted,true);assert.equal(g.treeView.getSort(),sort);g.destroy();
});

for(const rows of [[{id:'a',parentId:'missing'}],[{id:'a',parentId:'b'},{id:'b',parentId:'a'}],[{id:'a',parentId:'a'}]])
test(`invalid whole forest rejects ${JSON.stringify(rows)}`,()=>{const g=owner(rows);assert.equal(move(g,['a'],null).reason,'invalid-tree');g.destroy()});

test('before hook veto with reason sees unchanged source and stops later hooks',()=>{
  const g=owner(),before=g.data.all(),seen=[];g.events.on('beforeNodeMove',e=>{seen.push(e);assert.deepEqual(g.data.all(),before);assert.deepEqual(e.items,[g.data.get('A')]);e.cancel=true;e.reason='domain-locked'});
  g.events.on('beforeNodeMove',()=>assert.fail('later policy should not run'));g.events.on('nodeMove',e=>seen.push(e));
  const out=move(g,['A'],'B');assert.equal(out.reason,'domain-locked');assert.equal(out.accepted,false);assert.deepEqual(out.ids,['A']);assert.equal(seen.length,2);assert.equal(seen[1].result.accepted,false);assert.deepEqual(g.data.all(),before);g.destroy();
});

test('before hook source replacement is preserved and makes the old plan stale',()=>{
  const g=owner();g.events.on('beforeNodeMove',()=>g.data.parse([{id:'New'}],{silent:true}));
  assert.equal(move(g,['A'],'B').reason,'stale');assert.deepEqual(ids(g),['New']);assert.equal(g.data.canUndo(),false);g.destroy();
});

for(const action of ['destroy','columns','filter','collapse'])test(`before hook ${action} rejects without commit`,()=>{
  const data=new DataStore();data.parse(fixture);const g=owner([],{data});g.treeView.expandAll();const before=data.all();
  g.events.on('beforeNodeMove',()=>{if(action==='destroy')g.destroy();if(action==='columns')g.columns=[{id:'other'}];if(action==='filter')g.treeView.setFilter(r=>r.id==='B');if(action==='collapse')g.treeView.collapse('A')});
  assert.equal(move(g,['A1'],'B').accepted,false);assert.deepEqual(data.all(),before);assert.equal(data.canUndo(),false);g.destroy();data.destroy();
});

test('before hook exceptions reject callback-error and stop the remaining policy phase',()=>{
  const g=owner(),error=Error('policy');g.events.on('beforeNodeMove',()=>{throw error});g.events.on('beforeNodeMove',()=>assert.fail('late'));
  const result=move(g,['A'],'B');assert.equal(result.reason,'callback-error');assert.deepEqual(result.notificationErrors,[error]);assert.equal(g.data.get('A').parentId,undefined);g.destroy();
});

test('DataStore.beforeChange sees no transaction; its independent replacement survives stale rejection',()=>{
  const g=owner();g.data.events.once('beforeChange',event=>{assert.equal(event.operation,'parse');assert.equal(g.data._transaction,null);g.data.parse([{id:'Replacement'}],{silent:true})});
  const result=move(g,['A'],'B');assert.equal(result.accepted,false);assert.equal(result.reason,'stale');assert.deepEqual(ids(g),['Replacement']);assert.equal(g.data.canUndo(),false);g.destroy();
});

test('DataStore.beforeChange teardown cannot commit into a borrowed store',()=>{
  const data=new DataStore();data.parse(fixture);const g=owner([],{data}),before=data.all();data.events.on('beforeChange',()=>g.destroy());
  const result=move(g,['A'],'B');assert.equal(result.accepted,false);assert.deepEqual(data.all(),before);assert.equal(data.canUndo(),false);data.destroy();
});

test('store veto preserves existing history and writes no partial parse',()=>{
  const g=owner();g.data.batch(()=>g.data.update('C',{text:'Changed'}));const before=g.data.all();g.data.events.on('beforeChange',e=>{e.cancel=true});
  assert.equal(move(g,['A'],'B').reason,'veto');assert.deepEqual(g.data.all(),before);assert.equal(g.data._undoStack.length,1);g.destroy();
});

test('postcommit throwing observers cannot starve views or relabel accepted data',()=>{
  const data=new DataStore();data.parse(fixture);const error=Error('observer');data.events.on('invalidate',()=>{throw error});const g=owner([],{data});
  let later=0;data.events.on('invalidate',()=>later++);g.events.on('nodeMove',()=>{throw Error('node observer')});
  const result=move(g,['A'],'B');assert.equal(result.accepted,true);assert.equal(result.reason,null);assert.equal(data.get('A').parentId,'B');
  assert.equal(g.treeView.getEntry('A').parentId,'B');assert.equal(later,1);assert.equal(result.notificationErrors.length,2);assert.equal(result.notificationErrors[0],error);g.destroy();data.destroy();
});

test('postcommit owner teardown suppresses nodeMove without undoing borrowed data',()=>{
  const data=new DataStore();data.parse(fixture);const g=owner([],{data});let after=0;g.events.on('nodeMove',()=>after++);data.events.on('change',()=>g.destroy());
  const result=move(g,['A'],'B');assert.equal(result.accepted,true);assert.equal(data.get('A').parentId,'B');assert.equal(after,0);data.destroy();
});

test('silent operation still invalidates views and records one history batch without semantic hooks',()=>{
  const g=owner();let semantic=0,technical=0;g.events.on('beforeNodeMove',()=>semantic++);g.events.on('nodeMove',()=>semantic++);
  g.data.events.on('beforeChange',()=>semantic++);g.data.events.on('change',()=>semantic++);g.data.events.on('invalidate',e=>{technical++;assert.equal(e.silent,true)});
  assert.equal(move(g,['A'],'B','inside',{silent:true}).accepted,true);assert.equal(semantic,0);assert.equal(technical,1);assert.equal(g.treeView.getEntry('A').parentId,'B');assert.equal(g.data._undoStack.length,1);g.destroy();
});

test('reentry is busy and a post-report callback cannot corrupt the returned result',()=>{
  const g=owner();let nested;g.events.once('beforeNodeMove',()=>{nested=move(g,['C'],'B')});g.events.on('nodeMove',event=>{event.result.accepted=false;event.result.ids.length=0});
  const result=move(g,['A'],'B');assert.equal(nested.reason,'busy');assert.equal(result.accepted,true);assert.deepEqual(result.ids,['A']);assert.equal(g._movingNodes,false);g.destroy();
});

for(const mode of ['disabled','editing','opt-out','transaction','before-phase','subclass','index-id'])test(`unavailable ${mode} rejects conservatively`,()=>{
  let g=owner();if(mode==='disabled')g.disabled=true;if(mode==='editing')g._editing={};if(mode==='opt-out')g.nodeReorderEnabled=false;
  if(mode==='subclass'){g.destroy();class Custom extends DataStore{}const data=new Custom();data.parse(fixture);g=owner([],{data})}
  if(mode==='index-id'){g.destroy();g=owner([{text:'x'},{text:'y'}],{getId:(_,index)=>index})}
  let result;if(mode==='transaction')g.data.batch(()=>{result=move(g,['A'],'B')});else if(mode==='before-phase'){g.data.events.once('beforeChange',()=>{result=move(g,['A'],'B')});g.data.update('C',{text:'new'})}else result=move(g,mode==='index-id'?[0]:['A'],'B');
  assert.equal(result.accepted,false);assert.ok(['disabled','editing','node-reorder-disabled','busy','unsupported-store','unstable-ids'].includes(result.reason));g.destroy();
});

test('ordinary parse/batch retain fail-fast observer behavior',()=>{
  for(const batch of [false,true]){const data=new DataStore();let late=0;data.events.on('invalidate',()=>{throw Error('ordinary')});data.events.on('invalidate',()=>late++);
    assert.throws(()=>batch?data.batch(()=>data.parse([{id:1}])):data.parse([{id:1}]),/ordinary/);assert.equal(data.get(1).id,1);assert.equal(late,0);data.destroy()}
});

for(const phase of ['beforeNodeMove','afterChange'])test(`explicit direct silent/system selection wins during ${phase}`,()=>{
  const g=owner();g.selection.set([g.data.get('A')]);g._activeId='A';
  (phase==='beforeNodeMove'?g.events:g.data.events).on(phase,()=>g.selection.set([g.data.get('B')],{silent:true,origin:'system'}));
  assert.equal(move(g,['A'],'B').accepted,true);assert.deepEqual(g.selection.get().map(r=>r.id),['B']);assert.equal(g._nodeMoveSelectionHold,undefined);g.destroy();
});

test('selection survives default target expansion and prunes once when expansion is disabled or filter hides it',()=>{
  for(const mode of ['expand','no-expand','filter']){
    const g=owner();g.selection.set([g.data.get('A')]);g._activeId='A';if(mode==='filter')g.data.events.on('afterChange',()=>g.treeView.setFilter(row=>row.id==='B',{silent:true}));
    assert.equal(move(g,['A'],'B','inside',{expandTarget:mode!=='no-expand'}).accepted,true);
    assert.deepEqual(g.selection.get().map(r=>r.id),mode==='expand'?['A']:[]);
    if(mode==='expand'){assert.equal(g._activeId,'A');assert.equal(g.selection.get()[0],g.data.get('A'))}
    assert.equal(g._nodeMoveSelectionHold,undefined);g.destroy();
  }
});
