import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {normalizeHue,hexToLch,toGamut,lchToLinear,contrast} from '../examples/theme-editor/color-math.js';
import {template,hues,roles} from '../examples/theme-editor/harmony.js';
import {generateTheme} from '../examples/theme-editor/theme-generator.js';
import {presets} from '../examples/theme-editor/theme-presets.js';
import {normalizeDefinition,serialize,deserialize,exportCSS} from '../examples/theme-editor/serialization.js';
import {references} from '../examples/theme-editor/reference-tokens.js';
const near=(a,b,t=1e-5)=>assert.ok(Math.abs(a-b)<t,`${a} ≠ ${b}`);
test('theme hue geometry preserves rigid and symmetric patterns',()=>{
 assert.deepEqual([-30,360,750].map(normalizeHue),[330,0,30]);
 assert.deepEqual(template('complementary'),[0,180]);assert.deepEqual(template('triad'),[0,120,240]);assert.deepEqual(template('square'),[0,90,180,270]);
 for(const a of [20,30,60,90]){const t=template('tetrad',a);near(t[2]-t[0],180);near(t[3]-t[1],180);}
 for(const a of [5,30,60]){const t=template('split-complementary',a);near((t[1]+t[2])/2,180);near(t[2]-t[1],2*a);}
 assert.deepEqual(template('analogous',100),[0,-60,60]);assert.deepEqual(template('tetrad',90),template('square'));
 const h={type:'square',baseHue:350,spread:30,lockGeometry:true,spokeOffsets:[0,20,-20,10]};assert.deepEqual(hues(h),[350,80,170,260]);
 assert.deepEqual(hues({...h,lockGeometry:false}),[350,100,150,270]);assert.deepEqual(roles([0,90,180,270],1),[90,180,270,0]);assert.deepEqual(roles([0,90,180,270],-1),[270,0,90,180]);
});
test('OKLab known red, sRGB round trips, gamut clamp preserves L and H',()=>{
 const red=hexToLch('#ff0000');near(red.L,.62795536);near(red.C,.2576833);near(red.H,29.233885,1e-3);
 for(const hex of ['#000000','#ffffff','#ff0000','#00ff00','#0000ff','#5fa2d9','#223b59'])assert.equal(toGamut(hexToLch(hex)).hex,hex);
 const clamped=toGamut({L:.7,C:.5,H:145});assert.ok(clamped.clamped);near(clamped.L,.7);near(clamped.H,145);assert.ok(clamped.C<.5);assert.ok(lchToLinear(clamped).every(v=>v>=-1e-7&&v<=1+1e-7));near(contrast('#000000','#ffffff'),21);
});
test('serialization is canonical, versioned, bounded and rejects untrusted values',()=>{
 for(const p of presets)assert.deepEqual(deserialize(serialize(p.definition)),normalizeDefinition(p.definition));
 for(const input of ['null','[]','{"version":2}',serialize(presets[0].definition).replace('"light"','"garbage"')])assert.throws(()=>deserialize(input));
 const d=structuredClone(presets[0].definition);d.chroma=Infinity;assert.throws(()=>normalizeDefinition(d));
 assert.throws(()=>deserialize(' '.repeat(20001)));d.chroma=99;d.harmony.spokeOffsets=[0,999];d.harmony.type='complementary';const n=normalizeDefinition(d);assert.equal(n.chroma,1);assert.equal(n.harmony.spokeOffsets[1],20);
});
test('reference token snapshot stays aligned with current theme CSS',async()=>{
 const css=await readFile(new URL('../src/ui/styles/tokens.css',import.meta.url),'utf8');
 const get=selector=>Object.fromEntries([...css.match(new RegExp(selector.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\s*\\{([^}]+)'))[1].matchAll(/(--dui-[\w-]+):\s*([^;]+);/g)].map(m=>[m[1],m[2]]));
 const root=get(':root');
 for(const [mode,selector] of [['clear',':root'],['light','.dui-theme-light-blue'],['dark','.dui-theme-dark-blue']]){const values={...root,...get(selector)};const colorKeys=Object.entries(values).filter(([k,v])=>/^(#|rgb)/.test(v)||/^var\(--dui-(color|button|command-button)/.test(v)).map(([k])=>k).filter(k=>!k.startsWith('--dui-shadow')).sort();assert.deepEqual(Object.keys(references[mode]).sort(),colorKeys);for(const [key,value] of Object.entries(references[mode])){let resolved=values[key];for(let i=0;i<5;i++)resolved=resolved.replace(/var\((--dui-[\w-]+)\)/g,(_,k)=>values[k]);assert.equal(value,resolved,`${mode} ${key}`);}}
});
test('reference calibration preserves non-text L/C ramps; generation is deterministic',()=>{
 for(const p of presets){const a=generateTheme(p.definition);assert.deepEqual(a,generateTheme(p.definition));assert.equal(Object.keys(a.tokens).length,p.definition.preset==='clear'?46:174);assert.ok(!/font|height|radius|shadow/.test(exportCSS(a)));}
 const r=generateTheme(presets[0].definition);
 for(const key of ['--dui-color-bg','--dui-color-surface','--dui-color-border','--dui-color-border-strong','--dui-color-selection-bg'])assert.equal(r.tokens[key],references.light[key],key);
 assert.deepEqual(generateTheme({version:1,preset:'clear'}).tokens,references.clear);
});
test('contrast guard covers parameter extremes; statuses do not rotate',()=>{
 for(const foundation of ['light','dark'])for(const hue of [0,55,145,250,320])for(const strength of [0,1]){
  const d=structuredClone(presets[0].definition);d.foundation=foundation;d.chroma=strength;d.surfaceTint=strength;d.borderContrast=strength;d.stateIntensity=strength;d.harmony={...d.harmony,type:'square',baseHue:hue,harmonyStrength:strength};
  const r=generateTheme(d);assert.equal(r.warnings.length,0,JSON.stringify(r.warnings));for(const c of r.checks)assert.ok(c.ratio>=c.target);
  d.harmony.baseHue+=100;const other=generateTheme(d);for(const key of Object.keys(r.tokens).filter(k=>/invalid|warning|success|info/.test(k)))assert.equal(r.tokens[key],other.tokens[key]);
 }
});
import {roleChroma,tokenRole,neutralChroma} from '../examples/theme-editor/role-distribution.js';
test('semantic roles confine non-primary anchors to their permitted tokens',()=>{
 const d=structuredClone(presets[0].definition);d.harmony={...d.harmony,type:'square',lockGeometry:false,harmonyStrength:1,spokeOffsets:[0,0,0,0]};
 d.distribution.mode='semantic';const original=generateTheme(d);
 for(const i of [2,3]){const changed=structuredClone(d);changed.harmony.spokeOffsets[i]=20;const next=generateTheme(changed);
  for(const token of Object.keys(references.light))assert.equal(next.tokens[token],original.tokens[token],`Anchor ${i+1} leaked into ${token}`);
 }
 const secondary=structuredClone(d);secondary.harmony.spokeOffsets[1]=20;const next=generateTheme(secondary);
 for(const token of Object.keys(references.light).filter(k=>!k.includes('selection')))assert.equal(next.tokens[token],original.tokens[token],`Secondary leaked into ${token}`);
 assert.notEqual(next.tokens['--dui-color-selection-bg'],original.tokens['--dui-color-selection-bg']);
 assert.equal(tokenRole('--dui-window-header-bg'),'P');assert.equal(tokenRole('--dui-color-focus-border'),'P');assert.equal(tokenRole('--dui-color-selection-bg'),'S');
 assert.equal(roleChroma('P',0),1);near(roleChroma('S',1),.7);near(roleChroma('T',1),.45);near(roleChroma('A',1),.3);assert.equal(roleChroma('S',0),0);
 // Role shift changes the primary bucket's hue; it never changes the routing policy.
 const shifted=generateTheme({...d,roleShift:1});assert.notEqual(shifted.tokens['--dui-window-header-bg'],original.tokens['--dui-window-header-bg']);
});
test('extreme tint remains reference-bounded',()=>{
 near(neutralChroma(.04,1),.048);near(neutralChroma(.04,.5),.04);
 for(const foundation of ['light','dark']){
  const d=structuredClone(presets[0].definition);d.foundation=foundation;d.surfaceTint=.96;d.stateIntensity=.96;d.chroma=.2;d.harmony.type='triad';
  const r=generateTheme(d);assert.equal(r.warnings.length,0);
  for(const token of ['--dui-color-surface','--dui-color-surface-raised','--dui-color-border'])assert.ok(hexToLch(r.tokens[token]).C<=hexToLch(references[foundation][token]).C*1.2+.003,token);
 }
});
test('auto accent policy migrates legacy preferences and preserves anchors',()=>{
 const d=structuredClone(presets[0].definition),before=structuredClone(d),r=generateTheme(d);
 assert.deepEqual(d,before);assert.equal(r.sourceAccent,'#5fa2d9');
 assert.equal(r.tokens['--dui-window-header-bg'],'#387bb0');
 assert.equal(r.tokens['--dui-window-header-text'],'#ffffff');
 assert.equal(deserialize(serialize({ ...d,accentForeground:undefined,preferLightAccents:true})).accentForeground,'light');
 assert.equal(deserialize(serialize({...d,accentForeground:undefined,preferLightAccents:false})).accentForeground,'auto');
 assert.throws(()=>normalizeDefinition({...d,accentForeground:'invalid'}));
 assert.equal(r.warnings.length,0);assert.ok(r.adjustments.some(x=>x.includes('bounded L correction')));
});
