import test from 'node:test';
import assert from 'node:assert/strict';
import {ScrollingLabel} from '../src/ui/ScrollingLabel.js';
test('ScrollingLabel text and presentation API work before mount',()=>{
 const label=new ScrollingLabel({text:()=>42});assert.equal(label.getText(),'42');let events=0;label.events.on('textChange',()=>events++);
 label.setText('<b>plain</b>');assert.equal(label.getText(),'<b>plain</b>');label.setText('silent',{silent:true});assert.equal(events,1);
 label.setSpeed(20).setGap(30).setPaused(true);assert.equal(label.paused,true);assert.throws(()=>label.setSpeed(0),TypeError);assert.equal(label.speed,20);
 label.destroy();assert.throws(()=>label.setText('late'));
});
