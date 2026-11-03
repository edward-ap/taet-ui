import test from 'node:test';
import assert from 'node:assert/strict';
import {compileTreeDefinition,createTreeFromJSON} from '../src/ui/TreeDefinition.js';
import {compileTreeGridDefinition,createTreeGridFromJSON} from '../src/ui/TreeGridDefinition.js';
import {compilePropertyGridDefinition,createPropertyGridFromJSON,getPropertyGridValues} from '../src/ui/PropertyGridDefinition.js';
const data=()=>[{id:'root',text:'Root'},{id:1,parentId:'root',text:'Zulu'},{id:'1',parentId:'root',text:'Alpha'}];
const tree=()=>({schemaVersion:1,tree:{expandAll:true},data:data()});
const table=()=>({...tree(),columns:[{id:'text',sortable:true,editor:{type:'text',required:true}}],sort:[{columnId:'text',direction:'asc'}]});
const properties=()=>({schemaVersion:1,groups:[{id:'general',title:'General',properties:[{name:'name',editor:{type:'text',required:true}},{name:'mode',editor:{type:'select',items:[{value:1,text:'One'},{value:'1',text:'String'}]}},{name:'advanced',children:[{name:'enabled',editor:{type:'checkbox'}}]}]}],data:{name:'Settings',mode:1,enabled:true}});
test('Tree JSON initializes typed forest and explicit expansion without implicit drag permission',()=>{
 const spec=tree(),t=createTreeFromJSON(spec);try{assert.equal(t.treeView.all().length,3);assert.equal(t.isExpanded('root'),true);assert.equal(t.nodeReorderEnabled,false);spec.data[0].text='Mutated';assert.equal(t.data.get('root').text,'Root');}finally{t.destroy();}
});
test('TreeGrid JSON reuses columns, applies sibling sorting and expandedIds',()=>{
 const spec=table();spec.tree={expandedIds:['root']};const t=createTreeGridFromJSON(JSON.stringify(spec));try{
 assert.deepEqual(t.treeView.all().map(x=>x.id),['root','1',1]);assert.equal(typeof t.getColumn('text').editor.createCellEditor,'function');
 }finally{t.destroy();}
});
for(const [label,rows] of [
 ['missing parent',[{id:1,parentId:2}]],['cycle',[{id:1,parentId:2},{id:2,parentId:1}]],
 ['duplicate',[{id:1},{id:1}]],['invalid ID',[{id:true}]],['icon',[{id:1,icon:'not.a.registered.icon'}]],
 ['depth',Array.from({length:129},(_,i)=>({id:i,parentId:i?i-1:null}))]
])test('both tree adapters reject '+label,()=>{
 assert.throws(()=>compileTreeDefinition({...tree(),data:rows}),TypeError);
 assert.throws(()=>compileTreeGridDefinition({...table(),data:rows}),TypeError);
});
test('tree schema refuses unsupported Grid features and mutable hierarchy identity',()=>{
 for(const extra of [{paging:{pageSize:2}},{rowReorder:true}])assert.throws(()=>compileTreeGridDefinition({...table(),...extra}),/unknown property/);
 const s=table();s.columns[0].summary='count';assert.throws(()=>compileTreeGridDefinition(s),/summaries/);
 delete s.columns[0].summary;s.columns[0].field='parentId';assert.throws(()=>compileTreeGridDefinition(s),/identity/);
 assert.throws(()=>compileTreeDefinition({...tree(),selection:{range:'rows'}}),/unknown property/);
});
test('schema and tree rows can be delivered separately',()=>{
 const spec=tree();delete spec.data;spec.tree={expandedIds:['root']};const t=createTreeFromJSON(spec);try{t.data.parse(data());assert.equal(t.treeView.all().length,3);}finally{t.destroy();}
});
test('PropertyGrid snapshots include hidden nested properties and are detached',()=>{
 const spec=properties(),g=createPropertyGridFromJSON(spec);try{
 assert.deepEqual(getPropertyGridValues(g),{name:'Settings',mode:1,advanced:null,enabled:true});
 const snapshot=getPropertyGridValues(g);snapshot.name='Other';assert.equal(getPropertyGridValues(g).name,'Settings');
 assert.equal(g.getPropertyControl('enabled').property.type,'boolean');
 const prop=g.getPropertyControl('name').property,edit=prop.editor.createCellEditor({value:''});try{assert.equal(edit.validate().ok,false);}finally{edit.destroy();}
 g.bind([{id:'replacement',properties:[]}]);assert.throws(()=>getPropertyGridValues(g),/replaced/);
 }finally{g.destroy();}assert.throws(()=>getPropertyGridValues(g),/live/);
});
test('PropertyGrid rejects duplicate names/groups, unknown values and executable editors',()=>{
 const s=properties();s.groups[0].properties.push({name:'name'});assert.throws(()=>compilePropertyGridDefinition(s),/duplicate property/);
 const s2=properties();s2.groups.push(s2.groups[0]);assert.throws(()=>compilePropertyGridDefinition(s2),/duplicate group/);
 assert.throws(()=>compilePropertyGridDefinition({...properties(),data:{missing:1}}),/unknown property/);
 const s3=properties();s3.groups[0].properties[0].editor={type:'custom',create:'code'};assert.throws(()=>compilePropertyGridDefinition(s3),/unknown property/);
});
for(const compile of [compileTreeDefinition,compileTreeGridDefinition,compilePropertyGridDefinition])test(compile.name+' shares strict JSON boundary',()=>{
 assert.throws(()=>compile('{"__proto__":{}}'),/reserved/);assert.throws(()=>compile({schemaVersion:1,onClick:()=>{}}),/JSON value/);
 assert.throws(()=>compile({schemaVersion:2}),/schemaVersion/);
});
