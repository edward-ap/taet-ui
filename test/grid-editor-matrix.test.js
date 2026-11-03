import test from 'node:test';
import assert from 'node:assert/strict';
import {gridEditors} from '../src/ui/GridEditors.js';
const samples=[null,undefined,'',0,false,-2.75];
for(const kind of ['text','date','time','dateTime'])test(`${kind} grid factory string codec is explicit`,()=>{
 for(const value of samples){const editor=gridEditors[kind]().createCellEditor({value});try{assert.equal(editor.getValue(),value==null?'':kind==='time'&&value===0?'00:00':String(value))}finally{editor.destroy()}}
});
test('number factory distinguishes empty and numeric zero',()=>{
 for(const [value,expected]of [[null,null],[undefined,null],['',null],[0,0],[false,0],[-2.75,-2.75],['invalid',null]]){
  const editor=gridEditors.number({clamp:false,step:'any'}).createCellEditor({value});try{assert.equal(editor.getValue(),expected)}finally{editor.destroy()}
 }
});
for(const kind of ['checkbox','switch'])test(`${kind} factory remains a strict boolean codec`,()=>{
 for(const value of [null,undefined,'',0,false,true,'false',1]){const editor=gridEditors[kind]().createCellEditor({value});try{assert.equal(editor.getValue(),value===true)}finally{editor.destroy()}}
});
test('Select explicitly configured null empty value survives creation clear and no-op set',()=>{
 const editor=gridEditors.select({emptyValue:null,items:[{id:0,text:'Zero'}]}).createCellEditor({value:null});
 try{assert.equal(editor.getValue(),null);assert.equal(editor.control.value.set(null),false);editor.control.value.set(0);assert.equal(editor.getValue(),0);editor.control.value.clear();assert.equal(editor.getValue(),null)}finally{editor.destroy()}
 const defaultEditor=gridEditors.select().createCellEditor({value:null});try{assert.equal(defaultEditor.getValue(),'')}finally{defaultEditor.destroy()}
});
test('radio keeps boolean zero and null choice values without stringification',()=>{
 for(const value of [null,0,false,true,'']){const editor=gridEditors.radio({items:[{value:false,text:'No'},{value:true,text:'Yes'}]}).createCellEditor({value});try{assert.equal(editor.getValue(),value)}finally{editor.destroy()}}
});
