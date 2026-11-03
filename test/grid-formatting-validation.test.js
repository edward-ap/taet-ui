import test from 'node:test';
import assert from 'node:assert/strict';
import {Grid} from '../src/ui/Grid.js';
test('Grid rejects unknown formatting columns atomically, including alias and silent writes',()=>{
 for(const field of ['columnId','column'])assert.throws(()=>new Grid({columns:[{id:'value'}],formatting:[{[field]:'typo',when:()=>true}]}),/Unknown Grid formatting column: typo/);
 const grid=new Grid({columns:[{id:'value',hidden:true}],formatting:[{when:()=>true},{columnId:'value',when:()=>true}]});try{let events=0;grid.events.on('formattingChange',()=>events++);assert.throws(()=>grid.addFormattingRule({columnId:'missing',when:()=>true},{silent:true}),/Unknown Grid formatting column/);assert.equal(grid.formatting.length,2);assert.equal(events,0);grid.addFormattingRule({column:'value',when:()=>true});assert.equal(events,1);grid.setColumns([{id:'other'}]);assert.equal(grid.formatting.length,3);}finally{grid.destroy();}
});
