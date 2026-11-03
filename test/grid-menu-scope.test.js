import test from 'node:test';
import assert from 'node:assert/strict';
import {Grid} from '../src/ui/Grid.js';
import {TreeGrid} from '../src/ui/TreeGrid.js';

function item(items,id){return items.find(entry=>entry.id===id)}
function localMenu(grid,id){grid._columnMenu.openAt=()=>false;grid._openColumnMenu(grid.getColumn(id),0,0);return grid._columnMenu.items}
function invoke(grid,entry){return entry.onClick({source:grid._gridMenu,item:entry,id:entry.id})}
for(const Table of [Grid,TreeGrid]){
 test(`${Table.name} global menu settings preserve the existing menu opt-out`,()=>{
  for(const [options,expected]of [[{},true],[{columnMenu:false},false],[{columnMenu:false,gridMenu:true},true],[{indicatorGutter:false,gridMenu:true},false],[{gridMenu:false},false]]){
   const grid=new Table({columns:[{id:'a'}],...options});assert.equal(grid.gridMenuEnabled,expected);assert.equal(!!grid._gridMenu,expected);grid.destroy();
  }
 });
 test(`${Table.name} menus separate common column layout and table-wide commands`,()=>{
  const grid=new Table({columns:[{id:'a',sortable:true},{id:'b'}]});try{
   const local=localMenu(grid,'a'),global=grid._getGridMenuItems();
   assert.ok(item(local,'best-fit'));assert.ok(item(local,'hide-column'));
   for(const id of ['columns','best-fit-all','clear-all-filters','reset-column-layout'])assert.equal(item(local,id),undefined);
   for(const id of ['columns','best-fit-all','clear-all-filters','clear-sort','reset-column-layout'])assert.ok(item(global,id));
   if(Table===TreeGrid){assert.ok(item(global,'expand-all'));assert.ok(item(global,'collapse-all'));}
   else {assert.ok(item(global,'search-panel'));assert.ok(item(global,'status-bar'));}
  }finally{grid.destroy();}
 });
 test(`${Table.name} reset column layout restores constructor layout from all hidden without resetting data or query`,()=>{
  const grid=new Table({columns:[{id:'a',width:120,frozen:'left'},{id:'b',width:80}]});try{
   grid.data.parse([{id:1,a:'One',b:'B'}]);const original=grid.columnModel.getState();
   grid.setFilter(row=>row.id===1);const filter=grid.getFilter();
   grid.moveColumn('b',0);grid.columnModel.setWidth('a',260);grid.hideColumn('a');grid.hideColumn('b');
   invoke(grid,item(grid._getGridMenuItems(),'reset-column-layout'));
   assert.deepEqual(grid.columnModel.getState(),original);assert.equal(grid.getFilter(),filter);assert.equal(grid.data.get(1).a,'One');
  }finally{grid.destroy();}
 });
 test(`${Table.name} stale column-menu callbacks cannot mutate a replacement schema`,()=>{
  const grid=new Table({columns:[{id:'a'},{id:'b'}]});try{
   const hide=item(localMenu(grid,'a'),'hide-column');grid.setColumns([{id:'a'},{id:'b'}]);
   assert.equal(hide.onClick({source:grid._columnMenu}),false);assert.equal(grid.getColumn('a').hidden,undefined);
  }finally{grid.destroy();}
 });
 test(`${Table.name} column menu beforeOpen teardown stops the old opening`,()=>{
  const grid=new Table({columns:[{id:'a'}]});const menu=grid._columnMenu;
  menu.events.on('beforeOpen',()=>grid.destroy());menu.openAt=()=>{const e={cancel:false};menu.events.emit('beforeOpen',e);return !e.cancel};
  assert.doesNotThrow(()=>assert.equal(grid._openColumnMenu(grid.getColumn('a'),0,0),false));assert.equal(grid.destroyed,true);
 });
}

test('Grid local clear-sorting keeps other descriptor and external sorting is global-only',()=>{
 const grid=new Grid({columns:[{id:'a',sortable:true},{id:'b',sortable:true}]});try{
  grid.data.parse([{id:1,a:1,b:2},{id:2,a:2,b:1}]);grid.setSortModel([{columnId:'a',direction:'asc'},{columnId:'b',direction:'asc'}]);
  const clear=item(localMenu(grid,'a'),'clear-sort');assert.equal(clear.enabled,true);clear.onClick({source:grid._columnMenu});
  assert.deepEqual(grid.getSortModel(),[{columnId:'b',direction:'asc'}]);assert.deepEqual(grid.view.all().map(row=>row.id),[2,1]);
  const external=(a,b)=>a.id-b.id;grid.view.setSort(external,{silent:true});
  assert.equal(item(localMenu(grid,'a'),'clear-sort').enabled,false);assert.equal(item(grid._getGridMenuItems(),'clear-sort').enabled,true);
  invoke(grid,item(grid._getGridMenuItems(),'clear-sort'));assert.equal(grid.view.getSort(),null);
 }finally{grid.destroy();}
});

test('global filter clear includes search explicitly on both tables',()=>{
 for(const Table of [Grid,TreeGrid]){
  const grid=new Table({columns:[{id:'a'}]});try{
   grid.data.parse([{id:1,a:'One'},{id:2,a:'Two'}]);grid.setColumnFilter('a',{kind:'text',operator:'contains',value:'One'});
   if(grid.search){grid.search.setMode('filter');grid.search.set('One')}else grid.setSearchQuery('One');
   invoke(grid,item(grid._getGridMenuItems(),'clear-all-filters'));
   assert.equal((grid.view??grid.treeView).all().length,2);
  }finally{grid.destroy();}
 }
});

for(const Table of [Grid,TreeGrid]){
 test(`${Table.name} all-column best-fit stops after teardown or replacement from a width callback`,()=>{
  for(const action of ['destroy','replace']){
   const grid=new Table({columns:[{id:'a',width:200},{id:'b',width:200}]});
   let resized=0;grid.columnModel.events.on('invalidate',()=>resized++);
   grid.columnModel.events.once('invalidate',()=>action==='destroy'?grid.destroy():grid.setColumns([{id:'new',width:180}]));
   assert.doesNotThrow(()=>grid.autoSizeColumns());
   if(!grid.destroyed){assert.equal(grid.getColumn('new').width,180);assert.equal(grid.getColumn('b'),null);grid.destroy();}
   assert.ok(resized>=1);
  }
 });
 test(`${Table.name} hiding the edited column releases its editor exactly once`,()=>{
  const grid=new Table({columns:[{id:'a'},{id:'b'}]});grid.data.parse([{id:1,a:'A',b:'B'}]);
  let destroyed=0,meta;
  grid._editing={id:1,item:grid.data.get(1),column:grid.getColumn('a'),oldValue:'A',cell:{classList:{remove(){}}},cellEditor:{destroy(){destroyed++}}};
  grid.events.on('editCancel',e=>meta={origin:e.origin,userAction:e.userAction,reason:e.reason});
  assert.doesNotThrow(()=>grid.hideColumn('a',{origin:'user',userAction:true}));
  assert.equal(grid._editing,null);assert.equal(destroyed,1);assert.deepEqual(meta,{origin:'user',userAction:true,reason:'column-hidden'});
  grid.destroy();assert.equal(destroyed,1);
 });
}

for(const Table of [Grid,TreeGrid])test(`${Table.name} reset replaces an autosized default width with the original flexible track`,()=>{
 const grid=new Table({columns:[{id:'a'},{id:'b'}]});try{
  grid.columnModel.setWidth('a',300);invoke(grid,item(grid._getGridMenuItems(),'reset-column-layout'));
  assert.equal(grid.getColumn('a').width,'minmax(120px, 1fr)');
 }finally{grid.destroy();}
});

for(const Table of [Grid,TreeGrid])test(`${Table.name} global beforeOpen cannot publish a disabled or replaced menu context`,()=>{
 for(const action of ['disable','replace']){
  const grid=new Table({columns:[{id:'a'}]});const menu=grid._gridMenu;
  grid._gridMenuButton={isConnected:true,setAttribute(){}};
  menu.events.on('beforeOpen',()=>action==='disable'?grid.disable():grid.setColumns([{id:'new'}]));
  menu.openAt=()=>{const event={cancel:false};menu.events.emit('beforeOpen',event);return !event.cancel};
  assert.equal(grid._openGridMenu(0,0),false);assert.equal(grid._gridMenuOpen,false);grid.destroy();
 }
});
