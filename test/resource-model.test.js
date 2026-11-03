import test from 'node:test';
import assert from 'node:assert/strict';
import { MemoryResourceProvider, validateResources } from '../src/ui/resourceModel.js';
const initial = () => [
  {id: 0, name:'Library', kind:'folder', parentId:null},
  {id:'books', name:'Books', kind:'folder', parentId:0},
  {id:'rust', name:'Rust', kind:'file', parentId:'books'},
  {id:'inbox', name:'Inbox', kind:'folder', parentId:null}
];
const provider = new MemoryResourceProvider();
const run = (command, options={}) => provider.execute({command,items:initial(),...options});
test('resource model rejects malformed topology before use', () => {
  for (const items of [ [{id:1,name:'x',kind:'file',parentId:2}],
    [{id:1,name:'x',kind:'folder',parentId:1}],
    [{id:1,name:'x',kind:'folder'},{id:1,name:'y',kind:'file'}],
    [{id:1,name:'x',kind:'file'},{id:2,name:'y',kind:'file',parentId:1}],
    [{id:NaN,name:'x',kind:'file'}] ]) assert.throws(() => validateResources(items));
  assert.equal(validateResources(initial()).length,4);
});
test('resource create/rename validate names without mutating input', () => {
  const items=initial();
  const result=run('create',{items,parentId:0,name:'  Notes  ',kind:'file'});
  assert.equal(items.length,4); assert.equal(result.items.at(-1).name,'Notes');
  assert.equal(result.items.at(-1).parentId,0);
  assert.throws(() => run('create',{parentId:0,name:'Books'}),/already exists/);
  assert.throws(() => run('rename',{id:'rust',name:' '}),/Enter a name/);
  assert.equal(run('rename',{id:'rust',name:'Java'}).items.find(i=>i.id==='rust').name,'Java');
});
test('resource move/copy/delete operate on subtrees with collision and cycle protection', () => {
  assert.throws(() => run('move',{id:0,parentId:'books'}),/descendant/);
  assert.throws(() => run('copy',{id:0,parentId:'books'}),/descendant/);
  assert.throws(() => run('move',{id:'books',parentId:'rust'}),/folder/);
  const moved=run('move',{id:'books',parentId:'inbox'});
  assert.equal(moved.items.find(i=>i.id==='books').parentId,'inbox');
  assert.equal(moved.items.find(i=>i.id==='rust').parentId,'books');
  const copied=run('copy',{id:'books',parentId:'inbox'});
  assert.equal(copied.items.length,6);
  assert.equal(copied.items.find(i=>i.name==='Rust'&&i.id!=='rust').parentId,copied.selectId);
  assert.deepEqual(run('delete',{id:0}).items.map(i=>i.id),['inbox']);
});

test('delete targets its own resource even when another resource is on the clipboard', () => {
  const result=run('delete',{id:'inbox',clipboard:{id:'books',mode:'copy'}});
  assert.deepEqual(result.items.map(i=>i.id),[0,'books','rust']);
});
