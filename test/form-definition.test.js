import test from 'node:test';
import assert from 'node:assert/strict';
import {compileFormDefinition,createFormFromJSON} from '../src/ui/FormDefinition.js';
const spec=()=>({schemaVersion:1,labelPosition:'top',groups:[{id:'contact',title:'Contact',rows:[
 [{name:'first',editor:{type:'text',required:true}},{name:'last',editor:{type:'text'}}],
 [{name:'count',editor:{type:'number',min:1,max:10}},{name:'mode',editor:{type:'select',items:[{value:1,text:'Numeric'},{value:'1',text:'Text'}]}}]
]},{id:'options',rows:[[{name:'enabled',editor:{type:'checkbox'},readOnly:true}]]}],data:{first:'Ada',last:'Lovelace',count:2,mode:1,enabled:true}});
test('JSON Form composes before mounting, preserves typed choices and resets normalized initial values',()=>{
 const s=spec(),f=createFormFromJSON(s);const fields=f.getFields();try{
 assert.equal(fields.length,5);assert.deepEqual(f.value.get(),s.data);assert.equal(f.isDirty(),false);
 assert.equal(fields[0].labelPosition,'top');assert.equal(fields[4].state.has('readonly'),true);
 const select=fields.find(x=>x.name==='mode');assert.deepEqual(select.data.all().map(x=>x.value),[1,'1']);
 s.data.first='External';assert.equal(f.value.get().first,'Ada');f.value.set({first:'Grace',mode:'1'});assert.equal(f.value.get().mode,'1');assert.equal(f.isDirty(),true);
 f.value.reset();assert.deepEqual(f.value.get(),{first:'Ada',last:'Lovelace',count:2,mode:1,enabled:true});assert.equal(f.isDirty(),false);
 }finally{f.destroy();}assert.ok(fields.every(x=>x.destroyed));
});
test('JSON Form uses existing validation/submit, readonly values remain in the result',()=>{
 const f=createFormFromJSON(spec());let submits=0;f.events.on('submit',()=>submits++);try{
 f.value.set({first:''});assert.equal(f.validate().ok,false);assert.equal(f.submit({focusInvalid:false}),false);assert.equal(submits,0);
 f.value.set({first:'Valid'});assert.equal(f.submit(),true);assert.equal(submits,1);assert.equal(f.value.get().enabled,true);
 }finally{f.destroy();}
});
test('compiled definitions create no controls and apply label overrides',()=>{
 const s=spec();s.groups[0].labelPosition='left';s.groups[0].rows[0][0].labelPosition='top';const c=compileFormDefinition(s);
 assert.equal(c.groups[0].rows[0][0].options.labelPosition,'top');assert.equal(c.groups[0].rows[0][1].options.labelPosition,'left');
 assert.equal(c.groups[1].framed,false);assert.equal(c.groups[0].framed,true);
});
for(const [label,mutate,pattern] of [
 ['duplicate field',s=>s.groups[1].rows[0][0].name='first',/duplicate field/],
 ['duplicate group',s=>s.groups[1].id='contact',/duplicate group/],
 ['unknown value',s=>s.data.other=1,/unknown field/],
 ['object value',s=>s.data.first={nested:1},/scalar/],
 ['script',s=>s.groups[0].onClick='code',/unknown property/],
 ['reserved name',s=>s.groups[0].rows[0][0].name='__proto__',/reserved/],
 ['empty row',s=>s.groups[0].rows=[[]],/empty row/],
 ['unknown editor',s=>s.groups[0].rows[0][0].editor.type='custom',/expected/],
 ['version',s=>s.schemaVersion=2,/schemaVersion/]
])test('Form definition rejects '+label,()=>{const s=spec();mutate(s);assert.throws(()=>compileFormDefinition(s),pattern);});
test('Form JSON shares accessor/cycle boundaries',()=>{
 const a={};Object.defineProperty(a,'groups',{enumerable:true,get(){throw new Error('Must not execute');}});assert.throws(()=>compileFormDefinition(a),/accessors/);
 const s=spec();s.self=s;assert.throws(()=>compileFormDefinition(s),/cyclic/);
});
