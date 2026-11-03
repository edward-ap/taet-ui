import test from 'node:test';
import assert from 'node:assert/strict';
import {editorDefinition} from '../examples/theme-editor/editor-model.js';
import {defaultDefinition} from '../examples/theme-editor/serialization.js';
import {withRayCount} from '../examples/theme-editor/wheel-geometry.js';
import {generateTheme} from '../examples/theme-editor/theme-generator.js';
import {spectrumColor} from '../examples/theme-editor/wheel-spectrum.js';
test('editor derives distribution from count and upgrades multi-ray reference accents',()=>{
 for(const n of [1,2,3,4]){
  const d=editorDefinition({...defaultDefinition,harmony:withRayCount({...defaultDefinition.harmony,baseHue:110},n),distribution:{mode:'manual',overrides:{contact:'accent'}}});
  assert.equal(d.distribution.mode,n===1?'primary-only':'scope-cycle');assert.equal(d.distribution.cycleAfter,n);assert.equal(d.distribution.sequence.length,n);assert.deepEqual(d.distribution.overrides,{});
  if(n>1){assert.equal(d.accentSource,'spectrum');assert.equal(d.chroma,1);const r=generateTheme(d);assert.equal(r.sourceAccent,sourceColor(d,d.harmony.baseHue).hex);assert.equal(r.families.primary.sourceAccent,sourceColor(d,d.harmony.baseHue).hex);}
 }
});
test('automatic distribution preserves edited spectrum intensity and is idempotent',()=>{
 const d=editorDefinition({...defaultDefinition,accentSource:'spectrum',chroma:.35,harmony:withRayCount(defaultDefinition.harmony,4)});
 assert.equal(d.chroma,1);assert.equal(d.baseTone.space,'oklch');assert.deepEqual(editorDefinition(d),d);
});

import {setBaseHex,sourceColor,sectorWidth} from '../examples/theme-editor/base-color.js';
import {serialize,deserialize} from '../examples/theme-editor/serialization.js';
test('base RGB preserves tone, round trips and drives all anchor colors',()=>{
 const d=structuredClone(defaultDefinition);setBaseHex(d,'#ede1d0');
 assert.equal(sourceColor(d,d.harmony.baseHue).hex,'#ede1d0');
 for(const H of [0,90,180,270]){const t=sourceColor(d,H);assert.equal(t.L,d.baseTone.L);assert.equal(t.H,H);assert.ok(t.C<=d.baseTone.C);}
 assert.deepEqual(deserialize(serialize(d)).baseTone,d.baseTone);
 const r=generateTheme(d);assert.equal(r.sourceAccent,'#ede1d0');
 d.baseTone.L=0;assert.equal(sourceColor(d,90).hex,'#000000');d.baseTone.L=1;assert.equal(sourceColor(d,90).hex,'#ffffff');
 assert.equal(sectorWidth(0),0);assert.equal(sectorWidth(.049),0);assert.equal(sectorWidth(.05),.9);assert.equal(sectorWidth(1),18);assert.equal(sectorWidth(4),18);
 assert.throws(()=>setBaseHex(d,'no color'));assert.throws(()=>deserialize(JSON.stringify({...d,baseTone:{s:'x',l:.5}})));
});

import {dragRay} from '../examples/theme-editor/wheel-geometry.js';
test('base lock fixes A and opposite C but allows secondary fork/cross adjustment',()=>{
 const h=withRayCount(defaultDefinition.harmony,4);
 assert.equal(dragRay(h,0,90,{lockBase:true}).baseHue,h.baseHue);
 assert.equal(dragRay(h,2,90,{lockBase:true}).baseHue,h.baseHue);
 const moved=dragRay(h,1,h.baseHue+45,{lockBase:true});assert.equal(moved.baseHue,h.baseHue);assert.equal(moved.spread,45);
 assert.notEqual(dragRay(h,0,90).baseHue,h.baseHue);
 const d={...defaultDefinition,lockBase:true};assert.equal(deserialize(serialize(d)).lockBase,true);
});

import {hexToLch} from '../examples/theme-editor/color-math.js';
test('OKLCH input hue is exact and independent of L/C; gamut mapping never mutates requests',()=>{
 const d=structuredClone(defaultDefinition);setBaseHex(d,'#e1caad');const input=hexToLch('#e1caad');
 assert.equal(d.harmony.baseHue,input.H);assert.equal(d.baseTone.L,input.L);assert.equal(d.baseTone.C,input.C);
 assert.equal(sourceColor(d,input.H).hex,'#e1caad');
 const hue=d.harmony.baseHue;d.baseTone.L=.6;d.baseTone.C=.4;const saved=structuredClone(d);const c=sourceColor(d,hue);
 assert.ok(c.clamped);assert.equal(c.H,hue);assert.equal(c.L,.6);assert.deepEqual(d,saved);
 d.baseTone.L=input.L;d.baseTone.C=input.C;assert.equal(sourceColor(d,hue).hex,'#e1caad');
 for(const hex of ['#808080','#ffffff','#000000']){setBaseHex(d,hex);assert.equal(d.harmony.baseHue,hue);assert.equal(d.baseTone.C,0);}
});
test('legacy HSL imports migrate once preserving base HEX',()=>{
 const old={...defaultDefinition,accentSource:'spectrum',chroma:1,baseTone:{s:.44615384615384635,l:.8725490196078431},harmony:{...defaultDefinition.harmony,baseHue:62.573805928137745}};
 const d=deserialize(JSON.stringify(old));assert.equal(d.baseTone.space,'oklch');assert.equal(sourceColor(d,d.harmony.baseHue).hex,'#ede1d0');assert.deepEqual(deserialize(serialize(d)),d);
});

import {stackBindings,swapStack} from '../examples/theme-editor/stack-model.js';
test('stack swaps persist, repeat for fewer levels and discard only inactive anchors',()=>{
 const initial=stackBindings({},4),swapped=swapStack(initial,4,0,2);assert.equal(swapped.primary,'c');assert.equal(swapped.tertiary,'a');
 const reduced=stackBindings(swapped,3);assert.deepEqual(reduced,{primary:'c',secondary:'b',tertiary:'a',accent:'c'});
 assert.deepEqual(stackBindings(reduced,4),swapped);assert.deepEqual(swapStack(initial,4,2,2),initial);assert.throws(()=>swapStack(initial,4,0,4));
 const d=editorDefinition({...defaultDefinition,harmony:withRayCount(defaultDefinition.harmony,4),roles:swapped});assert.deepEqual(editorDefinition(d).roles,swapped);assert.deepEqual(deserialize(serialize(d)).roles,swapped);
});

import {moveStack} from '../examples/theme-editor/stack-model.js';
test('distribution move inserts at target while preserving intermediate order',()=>{
 const roles=stackBindings({},4);assert.deepEqual(moveStack(roles,4,3,0),{primary:'d',secondary:'a',tertiary:'b',accent:'c'});
 assert.deepEqual(moveStack(roles,4,0,2),{primary:'b',secondary:'c',tertiary:'a',accent:'d'});assert.deepEqual(moveStack(roles,4,2,2),roles);
 assert.throws(()=>moveStack(roles,4,-1,2));
});

import {presets} from '../examples/theme-editor/theme-presets.js';
test('recovery presets are deeply read-only while their editor copies remain editable',()=>{
 for(const name of ['Light Blue','Dark Blue','Clear']){
  const p=presets.find(p=>p.name===name),before=JSON.stringify(p);
  assert.equal(p.readOnly,true);assert.throws(()=>{p.definition.preset='changed';},TypeError);
  if(p.definition.harmony)assert.throws(()=>{p.definition.harmony.baseHue=0;},TypeError);
  const draft=editorDefinition(p.definition);draft.foundation='dark';assert.equal(JSON.stringify(p),before);
 }
 assert.equal(presets.find(p=>p.name==='Warm').readOnly,false);
});


test('editor color cap normalizes every harmony and a split pair without mutating inputs',async()=>{
 const {hues}=await import('../src/ui/theme-designer/harmony.js');
 const {dragRay}=await import('../src/ui/theme-designer/wheel-geometry.js');
 for(const cap of [1,2,3,4])for(const count of [1,2,3,4]){
  const input=editorDefinition({...defaultDefinition,harmony:withRayCount(defaultDefinition.harmony,count)}),before=structuredClone(input);
  const limited=editorDefinition(input,cap);
  assert.equal(hues(limited.harmony).length,Math.min(cap,count));
  assert.equal(limited.distribution.cycleAfter,Math.min(cap,count));
  assert.deepEqual(input,before);assert.deepEqual(editorDefinition(limited,cap),limited);
  assert.ok(Object.values(limited.roles).every(id=>'abcd'.slice(0,Math.min(cap,count)).includes(id)));
 }
 const pair=editorDefinition({...defaultDefinition,harmony:withRayCount(defaultDefinition.harmony,2)});
 pair.harmony=dragRay(pair.harmony,1,pair.harmony.baseHue+130);
 assert.equal(hues(pair.harmony).length,3);
 assert.equal(hues(editorDefinition(pair,2).harmony).length,2);
 for(const cap of [0,5,1.5,NaN])assert.throws(()=>editorDefinition(defaultDefinition,cap),RangeError);
});


test('all built-in presets can be listed and reduced before a base tone exists',()=>{
 for(const max of [1,2,3,4])for(const preset of presets){
  const before=JSON.stringify(preset);
  const limited=editorDefinition(preset.definition,max);
  assert.doesNotThrow(()=>generateTheme(limited));
  assert.equal(JSON.stringify(preset),before);
 }
});
