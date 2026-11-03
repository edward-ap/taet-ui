import { ScrollingLabel } from '../../../src/ui/experimental.js';
import { Panel, Form, TextInput, Button } from '../../../src/ui/index.js';
import { liveExample, importsFor, apiRows } from './pageHelpers.js';
export const scrollingLabelPage={id:'scrolling-label',title:'ScrollingLabel',status:'experimental',
 description:'Loop overflowing plain text with a gap between repetitions, using a browser-managed transform.',
 keywords:['marquee','scroll','ticker','radio','text'],
 imports:importsFor(['Panel','Form','TextInput','Button'],['ScrollingLabel']),
 paragraphs:['Short text stays still. Long text starts at its beginning, waits briefly, then moves left at a constant speed. Its next copy follows the tail after a configurable blank gap. The repeated copy is hidden from assistive technology.',
 'No JavaScript frame loop or periodic timer runs during scrolling. The browser animates one text strip inside a clipped boundary. Animation still costs rendering/compositing work; zero CPU/GPU load cannot be guaranteed. Hidden/offscreen/disabled labels pause, and reduced-motion preference shows static text.'],
 examples:[liveExample('Scrolling alongside editable fields',function createScrollingLabelExample({container,log}) {
  const ticker=new ScrollingLabel({width:340,text:'Now playing: a long artist name — a long track title — live session recorded this evening.',speed:35,gap:48});
  const field=new TextInput({name:'title',label:'Track title',value:'A long editable title with enough words to extend beyond the visible input field. Select it with the mouse and keep dragging beyond the edge.'});
  const form=new Form({width:540,labelWidth:100}).row(field).row(new TextInput({name:'notes',label:'Notes',value:'This field remains independent.'}));
  const pause=new Button({text:'Pause / resume',onClick:()=>ticker.setPaused(!ticker.paused)});
  const panel=new Panel(container,{width:'100%'});panel.add(ticker);panel.add(form);panel.add(pause);return panel;
 },'While the banner runs, drag-select the long title past its right edge, then back past its left edge. The native selection and scrolling stay inside that input. Pause/resume is available for comfortable reading.')],
 options:apiRows([['text','string | number | function','Plain text; function sources reevaluate on refresh.'],['speed / gap / startDelay','number','Defaults: 35 px/s, 48 px, 1000 ms. Delay applies on restart, not between seamless cycles.'],['width / paused','number|string / boolean','Constrain the display width; optionally start paused.']]),
 methods:apiRows([['setText(text, options) / refresh()','this / void','Update text and restart from the beginning; short text stops scrolling.'],['setPaused(boolean) / setSpeed(number) / setGap(number)','this','Pause/resume or change motion geometry.'],['getText()','string','Read the complete text.']]),
 events:apiRows([['textChange','event','Same semantic event as LabelText. No per-frame events.']]),
 notes:['The control owns two text spans, observers and one animation only while needed. Destroy cancels animation and detaches observers/listeners. There are no global mouse handlers or changes to input selection.', 'Very large text, many simultaneous tickers and native WebView drivers still need measurement on the target device. A transform animation is not a promise of zero GPU activity.']
};
