import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeDefinition,serialize,deserialize} from '../examples/theme-editor/serialization.js';
import {generateTheme} from '../examples/theme-editor/theme-generator.js';
import {presets} from '../examples/theme-editor/theme-presets.js';
import {resolveScope} from '../examples/theme-editor/scope-model.js';
const square=()=>normalizeDefinition({...presets[0].definition,harmony:{...presets[0].definition.harmony,type:'square'}});
test('anchor aliases do not change bindings or generated colors; v1 migration preserves shifted roles',()=>{
 const d=square(),before=generateTheme(d);d.harmony.anchors[1].name='Ocean';assert.deepEqual(generateTheme(d).tokens,before.tokens);
 d.roles.primary='c';assert.notEqual(generateTheme(d).tokens['--dui-command-button-bg'],before.tokens['--dui-command-button-bg']);assert.deepEqual(deserialize(serialize(d)),d);
 const old={...presets[0].definition,version:1,harmony:d.harmony,roleShift:1};delete old.distribution;const migrated=normalizeDefinition(old);assert.equal(migrated.roles.primary,'b');assert.equal(migrated.distribution.mode,'semantic');
 for(const bad of [{...d,roles:{...d.roles,primary:'Ocean'}},{...d,roleShift:NaN},{...d,distribution:{...d.distribution,inheritLeaves:false}}])assert.throws(()=>normalizeDefinition(bad));
});
test('cycle counts explicit scopes and supports repeated roles, reset and independent manual overrides',()=>{
 const d=square().distribution;d.mode='scope-cycle';d.sequence=['accent','secondary','secondary','primary'];d.cycleAfter=3;
 const root=resolveScope(d,{id:'root'},null),child=resolveScope(d,{id:'child'},root),leaf=resolveScope(d,{id:'leaf',boundary:false},child);
 assert.deepEqual(root,{role:'accent',depth:0});assert.deepEqual(leaf,child);
 assert.equal(resolveScope(d,{id:'window',window:true},child).role,'accent');d.restartAtWindow=false;assert.equal(resolveScope(d,{id:'window',window:true},child).depth,2);
 d.mode='manual';d.overrides={child:'tertiary'};assert.equal(resolveScope(d,{id:'child'},root).role,'tertiary');assert.equal(resolveScope(d,{id:'other',themeRole:'primary'},root).role,'primary');
});
test('each contextual family has contrast checked states and leaves neutral/status colors global',()=>{
 for(const foundation of ['light','dark']){const d=square();d.foundation=foundation;d.accentForeground='auto';const r=generateTheme(d);
 for(const family of Object.values(r.families)){assert.equal(family.warnings.length,0);assert.ok(family.checks.every(c=>c.ratio>=c.target));assert.equal(family.ramp.onColor,family.tokens['--dui-command-button-text']);assert.ok(family.resolutions.some(r=>r.token==='--dui-command-button-text'));assert.ok(Object.keys(family.tokens).every(k=>!/(surface|invalid|success|warning|info)/.test(k)));}}
});

test('boundary defaults separate neutral/inherit/advance/fixed and support saturation',()=>{
 const d=square().distribution;d.mode='scope-cycle';d.afterLast='stay';
 let state=resolveScope(d,{kind:'workspace'},null);assert.deepEqual(state,{role:'primary',depth:0});
 state=resolveScope(d,{kind:'panel'},state);assert.deepEqual(state,{role:'secondary',depth:1});
 const none=resolveScope(d,{kind:'panel',behavior:'none'},state);assert.deepEqual(none,{role:null,depth:1});assert.deepEqual(resolveScope(d,{kind:'leaf'},none),none);
 assert.deepEqual(resolveScope(d,{kind:'simple'},state),state);
 state=resolveScope(d,{kind:'grid'},state);assert.deepEqual(state,{role:'tertiary',depth:2});
 for(let i=0;i<6;i++)state=resolveScope(d,{kind:'panel'},state);assert.equal(state.role,'accent');assert.equal(state.depth,8);
 assert.equal(resolveScope(d,{kind:'panel',behavior:'fixed',themeRole:'secondary'},state).role,'secondary');
 assert.throws(()=>normalizeDefinition({...square(),distribution:{...d,afterLast:'invalid'}}));
 assert.throws(()=>normalizeDefinition({...square(),distribution:{...d,boundaryDefaults:{leaf:'advance'}}}));
});
