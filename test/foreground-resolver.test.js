import test from 'node:test';
import assert from 'node:assert/strict';
import {parseColor,composite,relativeLuminance,effectiveContrast,resolveForeground} from '../examples/theme-editor/foreground-resolver.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
test('foreground resolution preserves readable current text and uses foundation preference otherwise',()=>{
 assert.equal(resolveForeground({backgrounds:['#00ffff'],current:'#171a1d'}).foreground,'#171a1d');
 assert.equal(resolveForeground({backgrounds:['#101030'],current:'#171a1d'}).foreground,'#ffffff');
 const options={backgrounds:['#767676'],current:'#777777',textDark:'#000000'};
 assert.equal(resolveForeground({...options,foundation:'light'}).foreground,'#000000');
 assert.equal(resolveForeground({...options,foundation:'dark'}).foreground,'#ffffff');
});
test('family choice is stable across normal hover active; pure fallback precedes background correction',()=>{
 const backgrounds=['#12404f','#185263','#1c6172'];
 const r=resolveForeground({backgrounds,current:'#ffffff'});
 assert.equal(r.foreground,'#ffffff');assert.equal(r.needsBackgroundAdjustment,false);for(const bg of backgrounds)assert.ok(effectiveContrast(r.foreground,bg)>=4.5);
 const fallback=resolveForeground({backgrounds:['#888888'],current:'#aaaaaa',textDark:'#444444',textLight:'#dddddd'});
 assert.equal(fallback.reason,'pure fallback');assert.equal(fallback.foreground,'#000000');
 const impossible=resolveForeground({backgrounds:['#000000','#ffffff'],current:'#777777'});
 assert.equal(impossible.needsBackgroundAdjustment,true);
 assert.deepEqual(backgrounds,['#12404f','#185263','#1c6172']);
 for(let i=0;i<256;i++){const hex='#'+i.toString(16).padStart(2,'0').repeat(3);const r=resolveForeground({backgrounds:[hex]});assert.ok(!r.needsBackgroundAdjustment,hex);assert.ok(r.score>=4.5);}
});
test('effective contrast composites alpha and group opacity before sRGB luminance',()=>{
 near(relativeLuminance('#000000'),0);near(relativeLuminance('#ffffff'),1);
 const c=composite('rgba(0, 0, 0, .25)','#ffffff');near(c.r,191.25);near(c.g,191.25);
 near(effectiveContrast('#000000',{color:'rgba(0 0 0 / 25%)',over:'#ffffff'}),effectiveContrast('#000000',c));
 near(effectiveContrast('#000000',{color:'#ffffff',over:'#ffffff',opacity:.5}),effectiveContrast({r:127.5,g:127.5,b:127.5},'#ffffff'));
 assert.ok(effectiveContrast('#000000',{color:'#ffffff',over:'#ffffff',opacity:.5})<4.5);
 assert.throws(()=>effectiveContrast('#000000','rgba(255 255 255 / .5)'));
 assert.throws(()=>relativeLuminance('#ffffff88'));assert.throws(()=>parseColor('red'));
 const r=resolveForeground({backgrounds:[{color:'#ffffff',over:'#ffffff',opacity:0}],current:'#000000'});assert.equal(r.needsBackgroundAdjustment,true);near(r.score,1);
});

import {resolveAccentFamily} from '../examples/theme-editor/foreground-resolver.js';
import {hexToLch} from '../examples/theme-editor/color-math.js';
test('auto accent polarity corrects only bounded derived backgrounds and falls back on pastels',()=>{
 for(const backgrounds of [['#5fa2d9'],['#5fa2d9','#65a8df','#4087bc'],['#ede1d0'],['#ffff00'],['#ffffff'],['#000000']]){
  const original=[...backgrounds],r=resolveAccentFamily({backgrounds,current:'#171a1d'});
  assert.deepEqual(backgrounds,original);
  for(const [i,bg] of r.backgrounds.entries()){
   assert.ok(effectiveContrast(r.foreground,bg)>=4.5);
   assert.ok(Math.abs(hexToLch(bg).L-hexToLch(backgrounds[i]).L)<=.162);
  }
 }
 const blue=resolveAccentFamily({backgrounds:['#5fa2d9'],current:'#171a1d'});
 assert.equal(blue.foreground,'#ffffff');assert.equal(blue.backgrounds[0],'#387bb0');
 const pastel=resolveAccentFamily({backgrounds:['#ede1d0'],current:'#171a1d'});
 assert.deepEqual(pastel.backgrounds,['#ede1d0']);assert.equal(pastel.reason,'current');
 const yellow=resolveAccentFamily({backgrounds:['#ffff00']});assert.match(yellow.reason,/exceeds/);assert.equal(yellow.foreground,'#171a1d');
});
