import test from 'node:test';
import assert from 'node:assert/strict';
import {SelectionModel} from '../src/core/SelectionModel.js';
import {RangeSelectionModel} from '../src/core/RangeSelectionModel.js';
import {Grid} from '../src/ui/Grid.js';
import {TreeGrid} from '../src/ui/TreeGrid.js';

const fixtures = [
  {name:'SelectionModel', create:()=>new SelectionModel(), input:id=>[id],
    values:model=>model.get(), payload:event=>event.items, retained:model=>model._items},
  {name:'RangeSelectionModel', create:()=>new RangeSelectionModel(), input:id=>({from:{rowId:id,columnId:'name'}}),
    values:model=>model.get().map(r=>r.anchor.rowId), payload:event=>event.ranges.map(r=>r.anchor.rowId), retained:model=>model._ranges}
];
for(const f of fixtures){
  test(`${f.name} emits technical invalidation for silent writes and no event for no-op/veto`,()=>{
    const m=f.create(), phases=[], payloads=[];
    for(const phase of ['beforeChange','invalidate','change','afterChange'])m.events.on(phase,e=>{phases.push(phase);if(phase==='invalidate')payloads.push(e)});
    assert.equal(m.set(f.input('a'),{silent:true,origin:'import'}),true);
    assert.deepEqual(phases,['invalidate']);assert.equal(payloads[0].silent,true);assert.equal(payloads[0].origin,'import');
    assert.deepEqual(f.payload(payloads[0]),['a']);assert.equal(m.set(f.input('a')),false);assert.equal(phases.length,1);
    m.events.on('beforeChange',e=>{e.cancel=true});assert.equal(m.set(f.input('b')),false);assert.deepEqual(phases,['invalidate','beforeChange']);
    m.destroy();
  });
  test(`${f.name} orders technical and semantic phases once`,()=>{
    const m=f.create(),phases=[];
    for(const phase of ['beforeChange','invalidate','change','afterChange'])m.events.on(phase,e=>{phases.push(phase);if(phase==='invalidate')assert.equal(e.silent,false)});
    assert.equal(m.set(f.input('a')),true);assert.deepEqual(phases,['beforeChange','invalidate','change','afterChange']);m.destroy();
  });
  test(`${f.name} destruction before write leaves no retained state`,()=>{
    const m=f.create();m.events.on('beforeChange',()=>m.destroy());assert.equal(m.set(f.input('a')),false);
    assert.equal(m.destroyed,true);assert.deepEqual(f.retained(m),[]);
  });
  test(`${f.name} nested before write wins over the old proposal`,()=>{
    const m=f.create(),applied=[];m.events.once('beforeChange',()=>m.set(f.input('b')));
    m.events.on('change',e=>applied.push(f.payload(e)));assert.equal(m.set(f.input('a')),false);
    assert.deepEqual(f.values(m),['b']);assert.deepEqual(applied,[['b']]);m.destroy();
  });
  test(`${f.name} nested invalidation suppresses old semantic phases`,()=>{
    const m=f.create(),applied=[];m.events.once('invalidate',()=>m.set(f.input('b')));
    m.events.on('change',e=>applied.push(f.payload(e)));m.events.on('afterChange',e=>applied.push(f.payload(e)));
    assert.equal(m.set(f.input('a')),true);assert.deepEqual(f.values(m),['b']);assert.deepEqual(applied,[['b'],['b']]);m.destroy();
  });
  test(`${f.name} destruction after applied write stops semantic phases`,()=>{
    const m=f.create();let semantic=0;m.events.on('invalidate',()=>m.destroy());m.events.on('change',()=>semantic++);
    assert.equal(m.set(f.input('a')),true);assert.equal(semantic,0);assert.deepEqual(f.retained(m),[]);
  });
  test(`${f.name} technical snapshots do not corrupt later semantic snapshots`,()=>{
    const m=f.create();m.events.on('invalidate',e=>{if(e.items)e.items.length=0;else e.ranges[0].anchor.rowId='corrupt'});
    m.events.on('change',e=>assert.deepEqual(f.payload(e),['a']));m.set(f.input('a'));assert.deepEqual(f.values(m),['a']);m.destroy();
  });
}

for(const Table of [Grid,TreeGrid]){
  const create=()=>{const g=new Table({columns:[{id:'name'}]});g.data.parse([{id:'a',name:'A'},{id:'b',name:'B'},{id:'c',name:'C'}]);return g};
  for(const phase of ['beforeChange','invalidate','change'])test(`${Table.name} stops setSelectedIds after ${phase} teardown`,()=>{
    const g=create();g.selection.events.on(phase,()=>g.destroy());assert.doesNotThrow(()=>g.setSelectedIds(['a']));assert.equal(g.destroyed,true);
  });
  test(`${Table.name} veto does not activate the rejected row`,()=>{
    const g=create();g.setSelectedIds(['c']);g.selection.events.on('beforeChange',e=>{e.cancel=true});
    assert.equal(g.setSelectedIds(['a']),false);assert.deepEqual(g.getSelectedIds(),['c']);assert.equal(g._activeId,'c');g.destroy();
  });
  for(const phase of ['beforeChange','change'])test(`${Table.name} newer selection wins during ${phase}`,()=>{
    const g=create();g.setSelectedIds(['c']);g.selection.events.once(phase,()=>g.setSelectedIds(['b']));g.setSelectedIds(['a']);
    assert.deepEqual(g.getSelectedIds(),['b']);assert.equal(g._activeId,'b');g.destroy();
  });
  test(`${Table.name} source replacement in selection callback cannot activate the old record`,()=>{
    const g=create();g.setSelectedIds(['c']);g.selection.events.once('beforeChange',()=>g.data.parse([{id:'a',name:'New A'},{id:'c',name:'New C'}],{silent:true}));
    assert.equal(g.setSelectedIds(['a']),false);assert.deepEqual(g.getSelectedIds(),['c']);assert.equal(g.selection.get()[0],g.data.get('c'));assert.equal(g._activeId,'c');g.destroy();
  });
}
