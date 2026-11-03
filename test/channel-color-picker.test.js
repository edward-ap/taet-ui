import test from 'node:test';
import assert from 'node:assert/strict';
import { RGBColorPicker, CMYKColorPicker } from '../src/ui/experimental.js';
test('RGB/CMYK fields share canonical values, bounds, empty and veto contracts',()=>{
 const rgb=new RGBColorPicker({value:'#abc'});assert.equal(rgb.value.get(),'#aabbcc');rgb.setRgb(300,-5,10);assert.equal(rgb.value.get(),'#ff000a');rgb.destroy();
 const cmyk=new CMYKColorPicker();cmyk.setCmyk(0,100,100,0);assert.equal(cmyk.value.get(),'#ff0000');assert.deepEqual(cmyk.getCmyk(),{cyan:0,magenta:100,yellow:100,black:0});
 cmyk.setCmyk(0,0,0,100);assert.equal(cmyk.value.get(),'#000000');assert.deepEqual(cmyk.getCmyk(),{cyan:0,magenta:0,yellow:0,black:100});
 cmyk.setCmyk(0,0,0,0);assert.equal(cmyk.value.get(),'#ffffff');
 cmyk.events.on('beforeChange',e=>e.cancel=true);assert.equal(cmyk.setCmyk(100,100,100,100),false);assert.equal(cmyk.value.get(),'#ffffff');cmyk.destroy();
});
