import test from 'node:test';
import assert from 'node:assert/strict';
import {compileGridDefinition,createGridFromJSON} from '../src/ui/GridDefinition.js';
const definition=()=>({schemaVersion:1,columns:[{id:'name',title:'Name',editor:{type:'text',required:true}},
 {id:'amount',dataType:'number',sortable:true,editor:{type:'number',min:0},format:{type:'currency',currency:'USD'},summary:'total'}],
 data:[{id:1,name:'One',amount:10},{id:'1',name:'Two',amount:20}],selection:{multiple:true,range:'rows'}});
test('JSON definition builds live Grid with data, editors, formatting and summary',()=>{
 const spec=definition();const g=createGridFromJSON(JSON.stringify(spec));try{
 assert.deepEqual(g.data.all(),spec.data);assert.equal(g.rowRangeSelection,true);assert.equal(g.getColumnSummaryValue('amount'),'Total 30');
 assert.equal(g.getColumn('amount').render(12.5),'$12.50');assert.equal(typeof g.getColumn('name').editor.createCellEditor,'function');
 }finally{g.destroy();}
});
test('compilation clones JSON and supports schema separated from data and host formatters',()=>{
 const spec=definition();const compiled=compileGridDefinition(spec);spec.data[0].name='Changed';assert.equal(compiled.data[0].name,'One');
 delete spec.data;spec.columns[0].format={type:'registered',name:'upper'};
 const g=createGridFromJSON(spec,{formatters:{upper:value=>String(value).toUpperCase()}});try{
 assert.equal(g.data.all().length,0);g.data.parse([{id:'x',name:'hello',amount:1}]);assert.equal(g.getColumn('name').render('hello'),'HELLO');
 }finally{g.destroy();}
});
test('definition maps sorting, paging, hidden/frozen columns and readonly editors',()=>{
 const spec=definition();spec.sort=[{columnId:'amount',direction:'desc'}];spec.paging={pageSize:1};spec.columns[0].hidden=true;spec.columns[1].frozen='right';spec.columns[1].editable=false;
 const g=createGridFromJSON(spec);try{assert.equal(g.view.all()[0].amount,20);assert.equal(g.getColumn('name').hidden,true);assert.equal(g.getColumn('amount').readOnly,true);assert.equal(g.getColumn('amount').frozen,'right');}finally{g.destroy();}
});
for(const [label,change,path] of [
 ['version',s=>s.schemaVersion=2,'schemaVersion'],['unknown',s=>s.onClick='alert(1)','onClick'],
 ['duplicate column',s=>s.columns.push(s.columns[0]),'columns[2].id'],['duplicate id',s=>s.data.push(s.data[0]),'data[2].id'],
 ['editor',s=>s.columns[0].editor.type='eval','columns[0].editor.type'],['numeric summary',s=>s.columns[0].summary='total','columns[0].summary'],
 ['formatter',s=>s.columns[0].format={type:'registered',name:'missing'},'columns[0].format.name'],
 ['identity edit',s=>s.columns[0].field='id','columns[0].editor'],['bad sort',s=>s.sort=[{columnId:'missing',direction:'asc'}],'sort[0].columnId'],
 ['editor options',s=>s.columns[0].editor.min=0,'columns[0].editor.min']
])test('rejects '+label+' with a diagnostic path',()=>{const s=definition();change(s);assert.throws(()=>compileGridDefinition(s),e=>e instanceof TypeError && e.message.includes(path));});
test('rejects scripts, getters, cycles and reserved keys without invoking accessors',()=>{
 const s=definition();s.columns[0].render=()=>'';assert.throws(()=>compileGridDefinition(s),/JSON value/);
 let calls=0;const accessor={};Object.defineProperty(accessor,'schemaVersion',{enumerable:true,get(){calls++;return 1;}});
 assert.throws(()=>compileGridDefinition(accessor),/accessors/);assert.equal(calls,0);
 const cycle={};cycle.self=cycle;assert.throws(()=>compileGridDefinition(cycle),/cyclic/);
 assert.throws(()=>compileGridDefinition('{"__proto__":{"polluted":true}}'),/reserved/);assert.equal({}.polluted,undefined);
 assert.throws(()=>compileGridDefinition('broken'),/invalid JSON/);
});
test('limits dimensions, nesting, sparse arrays and text size',()=>{
 const s=definition();s.height=-1;assert.throws(()=>compileGridDefinition(s),/height/);
 let deep={};for(let i=0;i<34;i++)deep={deep};assert.throws(()=>compileGridDefinition(deep),/complexity/);
 assert.throws(()=>compileGridDefinition({schemaVersion:1,columns:new Array(2)}),/sparse/);
 assert.throws(()=>compileGridDefinition(' '.repeat(2_000_001)),/exceeds/);
});

test('choice editors validate values before mounting and retain typed identities',()=>{
 const spec={schemaVersion:1,columns:[{id:'choice',editor:{type:'select',items:[{value:1,text:'Number'},{value:'1',text:'String'}]}}]};
 const factory=compileGridDefinition(spec).options.columns[0].editor;
 const cell=factory.createCellEditor({value:1});
 try {assert.equal(cell.getValue(),1);assert.deepEqual(cell.control.data.all().map(x=>x.value),[1,'1']);} finally {cell.destroy();}
 spec.columns[0].editor.items=[{value:true,text:'Yes'}];assert.throws(()=>compileGridDefinition(spec),/value type/);
 spec.columns[0].editor.type='radio';assert.doesNotThrow(()=>compileGridDefinition(spec));
 spec.columns[0].editor.items.push({value:true,text:'Duplicate'});assert.throws(()=>compileGridDefinition(spec),/duplicate choice/);
});

test('required descriptor installs validation rather than only visual state',()=>{
 const compiled=compileGridDefinition(definition());const editor=compiled.options.columns[0].editor.createCellEditor({value:''});
 try {assert.equal(editor.validate().ok,false);editor.control.value.set('Valid');assert.equal(editor.validate().ok,true);}finally{editor.destroy();}
});
