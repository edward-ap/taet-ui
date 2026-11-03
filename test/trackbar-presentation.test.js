import test from 'node:test';
import assert from 'node:assert/strict';
import {TrackBar} from '../src/ui/TrackBar.js';
test('TrackBar presentation setters validate and retain numeric model before mount',()=>{
 const slider=new TrackBar({value:35,valuePosition:'top',thumbShape:'ring'});
 assert.equal(slider.setThumbShape('grip').setValuePosition('left').setShowValue(true),slider);assert.equal(slider.value.get(),35);
 assert.throws(()=>slider.setValuePosition('center'),TypeError);assert.equal(slider.valuePosition,'left');
 assert.throws(()=>slider.setThumbShape('triangle'),TypeError);assert.equal(slider.thumbShape,'grip');
 slider.destroy();assert.throws(()=>slider.setShowValue(false));
});
