import test from 'node:test';
import assert from 'node:assert/strict';
import {Grid} from '../src/ui/Grid.js';
import {TreeGrid} from '../src/ui/TreeGrid.js';
import {PropertyGrid} from '../src/ui/PropertyGrid.js';
import {DataStore} from '../src/core/DataStore.js';
import {TreeDataView} from '../src/core/TreeDataView.js';
import {isGridEditorFactory as marker} from '../src/ui/gridEditorFactory.js';
import {isGridEditorFactory, gridEditors} from '../src/ui/GridEditors.js';

test('editor marker is the same protocol and function through the optional catalog', () => {
  assert.equal(marker, isGridEditorFactory);
  for (const name of ['text','number','checkbox','switch','date','time','dateTime']) {
    assert.equal(marker(gridEditors[name]()), true);
  }
  assert.equal(marker({[Symbol.for('dui.gridEditorFactory')]:true, createCellEditor(){}}), true);
  assert.equal(marker({createCellEditor(){}}), false);
});

test('TreeGrid schema replacement rebuilds accessors and prunes missing/unsortable sorts', () => {
  const g = new TreeGrid({columns:[{id:'name',sortable:true}]});
  try {
    g.data.parse([{id:1,name:'B'},{id:2,name:'A'}]);
    g.setSelectedIds([1]); g.sortBy('name','asc');
    let semantic=0;g.events.on('sortChange',()=>semantic++);
    g.setColumns([{id:'name',sortable:true,value:r=>r.id}]);
    assert.deepEqual(g.treeView.all().map(r=>r.id),[1,2]);
    assert.deepEqual(g.getSortModel(),[{columnId:'name',direction:'asc'}]);
    assert.deepEqual(g.getSortState(),g.getSortModel());
    const snapshot=g.getSortModel();snapshot[0].direction='desc';
    assert.equal(g.getSortState()[0].direction,'asc');
    g.setColumns([{id:'name',sortable:false}]);assert.deepEqual(g.getSortModel(),[]);
    g.setColumns([{id:'other'}]);assert.deepEqual(g.getSelectedIds(),[1]);
    assert.equal(semantic,0);
  } finally {g.destroy();}
});

test('TreeGrid schema replacement reapplies filters and cannot retain a missing-column filter', () => {
  const g=new TreeGrid({columns:[{id:'n'}]});
  try {
    g.data.parse([{id:1,n:1},{id:2,n:10}]);
    g.setColumnFilter('n',{kind:'number',operator:'greater',value:5});
    assert.deepEqual(g.treeView.all().map(r=>r.id),[2]);
    g.setColumns([{id:'n',value:r=>-r.n}]);assert.deepEqual(g.treeView.all(),[]);
    g.setColumns([{id:'other'}]);
    assert.doesNotThrow(()=>g.data.update(1,{n:20}));
    assert.deepEqual(g.treeView.all().map(r=>r.id),[1,2]);
    assert.equal(g.clearColumnFilter('n'),false);
  } finally {g.destroy();}
});

for(const Table of [Grid,TreeGrid]) {
  test(`${Table.name} column conditions and explicit clear-search scope`,()=>{
    const g=new Table({columns:[{id:'name'},{id:'n'}]});
    try {
      g.data.parse([{id:1,name:'Alpha',n:10},{id:2,name:'Beta',n:20}]);
      if(g.search){g.search.setMode('filter');g.search.set('Alpha');}else g.setSearchQuery('Alpha');
      g.setColumnFilter('n',{kind:'number',operator:'greater',value:5});
      g.clearAllFilters({search:false,silent:true});
      assert.deepEqual((g.view??g.treeView).all().map(r=>r.id),[1]);
      g.clearAllFilters({search:true,silent:true});
      assert.deepEqual((g.view??g.treeView).all().map(r=>r.id),[1,2]);
      g.setColumnFilter('name',{kind:'text',operator:'startsWith',value:'B'});
      assert.deepEqual((g.view??g.treeView).all().map(r=>r.id),[2]);
      g.clearColumnFilter('name');assert.equal((g.view??g.treeView).all().length,2);
    } finally {g.destroy();}
  });
}

test('legacy TreeGrid strings/functions and clearAllFilters search default remain',()=>{
  const g=new TreeGrid({columns:[{id:'name'}]});try{
    g.data.parse([{id:1,name:'Alpha'},{id:2,name:'Beta'}]);
    g.setColumnFilter('name','ALP');assert.deepEqual(g.treeView.all().map(r=>r.id),[1]);
    g.setColumnFilter('name',value=>value==='Beta');assert.deepEqual(g.treeView.all().map(r=>r.id),[2]);
    g.clearColumnFilter('name');g.setSearchQuery('Alpha');g.clearAllFilters();
    assert.equal(g.treeView.all().length,2);
  }finally{g.destroy();}
});

for(const Table of [Grid,TreeGrid])test(`${Table.name} schema callbacks may close or replace schema without stale work`,()=>{
  for(const action of ['destroy','replace']){
    const g=new Table({columns:[{id:'name'}]});g.data.parse([{id:1,name:'A'}]);
    g.columnModel.events.once('invalidate',()=>action==='destroy'?g.destroy():g.setColumns([{id:'new'}]));
    assert.doesNotThrow(()=>g.setColumns([{id:'outer'}]));
    if(!g.destroyed)assert.deepEqual(g.columns.map(c=>c.id),['new']);g.destroy();
  }
});

test('schema reconciliation preserves a borrowed tree view global filter and store',()=>{
  const data=new DataStore();data.parse([{id:1,n:1},{id:2,n:2}]);
  const filter=r=>r.id===2;const treeView=new TreeDataView({data,filter});
  const g=new TreeGrid({data,treeView,columns:[{id:'n'}]});
  g.setColumnFilter('n',{kind:'number',operator:'greater',value:0});g.setColumns([{id:'x'}]);
  assert.equal(treeView.getFilter(),filter);assert.deepEqual(treeView.all().map(r=>r.id),[2]);
  g.destroy();assert.equal(treeView.destroyed,false);assert.equal(data.destroyed,false);
  treeView.destroy();data.destroy();
});

test('workbench PropertyGrid selection stops when focus callback closes its owner',()=>{
 for(const method of ['selectProperty','clearPropertySelection']){
  const g=new PropertyGrid({source:[{id:'group',properties:[{name:'a',type:'text',value:'A'},{name:'b',type:'text',value:'B'}]}]});
  if(method==='clearPropertySelection')g.selectProperty('a');
  g.events.once('propertyFocusChange',()=>g.destroy());
  assert.doesNotThrow(()=>method==='selectProperty'?g.selectProperty('a'):g.clearPropertySelection());
  assert.equal(g.destroyed,true);
 }
});
