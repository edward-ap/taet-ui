import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {Grid,TreeGrid} from '../src/ui/grid-api.js';

const ids = grid => (grid.treeView ?? grid.view).all().map(row => row.id);
const dates = Array.from({length:7}, (_,i) => new Date(Date.UTC(2024,0,7+i,12)));
const create = (Type=TreeGrid,options={}) => new Type({columns:[{id:'when',sortable:true}],...options});

test('TreeGrid sorts seven valid Dates chronologically in either direction across timezones', () => {
  const program = `import {TreeGrid} from './src/ui/grid-api.js';
    const grid=new TreeGrid({columns:[{id:'when',sortable:true}]});
    try {const rows=[6,2,4,0,5,1,3].map(i=>({id:i,when:new Date(Date.UTC(2024,0,7+i,12))}));
      grid.data.parse(rows);grid.sortBy('when','asc');const asc=grid.treeView.all().map(r=>r.id);
      grid.sortBy('when','desc');console.log(JSON.stringify({asc,desc:grid.treeView.all().map(r=>r.id)}));
    } finally {grid.destroy();}`;
  for(const zone of ['UTC','America/New_York','Pacific/Kiritimati']){
    const child=spawnSync(process.execPath,['--input-type=module','-e',program],{cwd:new URL('../',import.meta.url),env:{...process.env,TZ:zone},encoding:'utf8',windowsHide:true});
    assert.equal(child.status,0,child.stderr);
    assert.deepEqual(JSON.parse(child.stdout),{asc:[0,1,2,3,4,5,6],desc:[6,5,4,3,2,1,0]},zone);
  }
});

test('Date sorting remains sibling-local, stable, and preserves records, selection and expansion', () => {
  const grid=create(TreeGrid,{multiSelect:true,expandedIds:['p2','p1']});
  const rows=[{id:'p2',when:null},{id:'p1',when:null},
    {id:'late',parentId:'p1',when:dates[1]},{id:'equal-first',parentId:'p1',when:dates[0]},
    {id:'equal-second',parentId:'p1',when:new Date(dates[0])},{id:'other',parentId:'p2',when:dates[6]}];
  try {
    grid.data.parse(rows);grid.setSelectedIds(['equal-first']);const expanded=grid.treeView.getExpandedIds();
    grid.sortBy('when','asc');assert.deepEqual(ids(grid),['p2','other','p1','equal-first','equal-second','late']);
    grid.sortBy('when','desc');assert.deepEqual(ids(grid),['p2','other','p1','late','equal-first','equal-second']);
    assert.deepEqual(grid.getSelectedIds(),['equal-first']);assert.deepEqual(grid.treeView.getExpandedIds(),expanded);
    rows.forEach(row=>assert.equal(grid.data.get(row.id),row));assert.equal(grid.data.get('equal-first').when,dates[0]);
    grid.setColumns([{id:'when',sortable:true,value:row=>row.when}]);
    assert.deepEqual(ids(grid),['p2','other','p1','late','equal-first','equal-second']);
    assert.deepEqual(grid.getSelectedIds(),['equal-first']);assert.deepEqual(grid.treeView.getExpandedIds(),expanded);
  } finally {grid.destroy();}
});

test('TreeGrid keeps legacy null placement; Grid keeps its distinct placement', () => {
  for(const Type of [Grid,TreeGrid]){
    const grid=create(Type);
    try {
      grid.data.parse([{id:'date',when:dates[0]},{id:'null',when:null},{id:'missing'}]);
      grid.sortBy('when','asc');assert.deepEqual(ids(grid),Type===TreeGrid?['null','missing','date']:['date','null','missing']);
      grid.sortBy('when','desc');assert.deepEqual(ids(grid),Type===TreeGrid?['date','null','missing']:['null','missing','date']);
    } finally {grid.destroy();}
  }
});

test('invalid Date and mixed-type pairs retain TreeGrid string fallback instead of coercion', () => {
  const previous=process.env.TZ;process.env.TZ='UTC';
  const cases=[
    [[{id:'valid',when:new Date('2024-01-01T12:00:00Z')},{id:'invalid',when:new Date(NaN)}],['invalid','valid']],
    [[{id:'bad-first',when:new Date(NaN)},{id:'bad-second',when:new Date(NaN)}],['bad-first','bad-second']],
    [[{id:'text',when:'zzzz'},{id:'date',when:dates[0]}],['date','text']],
    [[{id:'date',when:dates[0]},{id:'number',when:2}],['number','date']],
    [[{id:'ten',when:10},{id:'two',when:2}],['two','ten']],
    [[{id:'ten',when:'item10'},{id:'two',when:'ITEM2'}],['two','ten']]
  ];
  try {for(const [rows,expected] of cases){const grid=create();try{grid.data.parse(rows);grid.sortBy('when','asc');assert.deepEqual(ids(grid),expected);grid.sortBy('when','desc');assert.deepEqual(ids(grid),rows.every(r=>Number.isNaN(r.when?.getTime?.()))?expected:[...expected].reverse());}finally{grid.destroy();}}}
  finally {if(previous===undefined)delete process.env.TZ;else process.env.TZ=previous;}
});
