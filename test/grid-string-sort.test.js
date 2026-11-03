import test from 'node:test';
import assert from 'node:assert/strict';
import { Grid } from '../src/ui/Grid.js';
import { TreeGrid } from '../src/ui/TreeGrid.js';

const natural = (a, b) => String(a).localeCompare(String(b), undefined, {numeric: true, sensitivity: 'base'});
for (const Table of [Grid, TreeGrid]) {
  test(`${Table.name}: natural host-locale ordering, stable ties and clear`, () => {
    const rows = ['A10','a2','A02','á2','Z','éclair','ECLAIR','Å','ä','中','Я','item100','item9','',true,3,'3']
      .map((value, id) => ({id, parentId:null, value}));
    const table = new Table({columns:[{id:'value',sortable:true}]});
    try {
      table.data.parse(rows);
      const view = table.treeView ?? table.view;
      for (const direction of ['asc', 'desc']) {
        const sign = direction === 'desc' ? -1 : 1;
        const expected = [...rows].sort((a,b)=>sign*natural(a.value,b.value)).map(r=>r.id);
        table.sortBy('value',direction);
        assert.deepEqual(view.all().map(r=>r.id),expected);
      }
      table.clearSort();
      assert.deepEqual(view.all().map(r=>r.id),rows.map(r=>r.id));
    } finally { table.destroy(); }
  });

  test(`${Table.name}: preserve numeric ordering and existing null placement`, () => {
    const table = new Table({columns:[{id:'value',sortable:true}]});
    try {
      table.data.parse([null,10,2,null,-3].map((value,id)=>({id,parentId:null,value})));
      const view = table.treeView ?? table.view;
      table.sortBy('value','asc');
      assert.deepEqual(view.all().map(r=>r.id),Table===Grid?[4,2,1,0,3]:[0,3,4,2,1]);
      table.sortBy('value','desc');
      assert.deepEqual(view.all().map(r=>r.id),Table===Grid?[0,3,1,2,4]:[1,2,4,0,3]);
    } finally { table.destroy(); }
  });
}

test('Grid: dates, multi-column ties and custom comparator retain their contracts', () => {
  const grid = new Grid({columns:[{id:'name',sortable:true},{id:'date',sortable:true}]});
  try {
    grid.data.parse([
      {id:1,name:'a2',date:new Date('2026-02-01')},
      {id:2,name:'A02',date:new Date('2026-01-01')},
      {id:3,name:'a10',date:new Date('2025-01-01')},
      {id:4,name:'á2',date:new Date('2026-01-01')}
    ]);
    grid.setSortModel([{columnId:'name',direction:'asc'},{columnId:'date',direction:'asc'}]);
    assert.deepEqual(grid.view.all().map(r=>r.id),[2,4,1,3]);
    grid.clearSort();
    grid.setColumns([{id:'name',sort:(a,b)=>a.id-b.id}]);
    grid.sortBy('name','desc');
    assert.deepEqual(grid.view.all().map(r=>r.id),[4,3,2,1]);
  } finally { grid.destroy(); }
});

test('TreeGrid: sort siblings without moving children between parents', () => {
  const tree = new TreeGrid({columns:[{id:'value',sortable:true}]});
  try {
    tree.data.parse([
      {id:1,parentId:null,value:'group10'},{id:2,parentId:null,value:'group2'},
      {id:3,parentId:1,value:'item10'},{id:4,parentId:1,value:'item2'},
      {id:5,parentId:2,value:'item10'},{id:6,parentId:2,value:'item2'}
    ]);
    tree.expandAll();tree.sortBy('value','asc');
    assert.deepEqual(tree.treeView.all().map(r=>r.id),[2,6,5,1,4,3]);
    tree.sortBy('value','desc');
    assert.deepEqual(tree.treeView.all().map(r=>r.id),[1,3,4,2,5,6]);
  } finally { tree.destroy(); }
});
