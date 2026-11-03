import test from 'node:test';
import assert from 'node:assert/strict';
import {withRayCount,dragRay} from '../examples/theme-editor/wheel-geometry.js';
import {hues} from '../examples/theme-editor/harmony.js';
import {defaultDefinition,normalizeDefinition} from '../examples/theme-editor/serialization.js';
test('wheel ray geometry rotates rigidly, splits B and mirrors the full semicircle',()=>{
 let h=withRayCount({...defaultDefinition.harmony,baseHue:0},2);
 assert.deepEqual(hues(h),[0,180]);h=dragRay(h,1,160);assert.deepEqual(hues(h),[0,160,200]);
 for(const angle of [0,1,45,90,179,180]){
  const next=dragRay(h,1,angle);assert.deepEqual(hues(next),angle===180?[0,180]:[0,angle,(360-angle)%360]);
  const rotated=dragRay(next,0,30);assert.deepEqual(hues(rotated),hues(next).map(a=>(a+30)%360));
 }
 h=withRayCount(h,4);assert.deepEqual(hues(h),[0,90,180,270]);
 assert.deepEqual(hues(dragRay(h,2,200)),[20,110,200,290]);
 assert.deepEqual(hues(dragRay(h,3,220)),[0,40,180,220]);
 for(const angle of [0,180])assert.equal(normalizeDefinition({...defaultDefinition,harmony:dragRay(h,1,angle)}).harmony.spread,angle);
 assert.throws(()=>withRayCount(h,5));
});

test('either fork handle collapses to two rays across hue wrap and can reopen',()=>{
 const fork=withRayCount({...defaultDefinition.harmony,baseHue:350},3);
 for(const index of [1,2]){
  const closed=dragRay(fork,index,170);assert.equal(closed.type,'complementary');assert.deepEqual(hues(closed),[350,170]);
  assert.equal(hues(dragRay(closed,1,150)).length,3);
 }
 assert.equal(hues(dragRay(fork,1,169.8)).length,2);
 assert.equal(hues(dragRay(fork,1,168)).length,3);
});
