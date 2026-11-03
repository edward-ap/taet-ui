import test from 'node:test';
import assert from 'node:assert/strict';
import {localize} from '../src/ui/localize.js';
test('optional translation preserves fallback and treats parameters as literal text',()=>{
 assert.equal(localize({},'Actions for {name}',{name:'A'}),'Actions for A');
 assert.equal(localize({translate:()=> 'Действия: {name}'},'Actions for {name}',{name:'{x}<b>'}),'Действия: {x}<b>');
 assert.equal(localize({translate:()=>null},'Close'),'Close');
});
