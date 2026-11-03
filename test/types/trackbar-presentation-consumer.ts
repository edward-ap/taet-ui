import {TrackBar,type TrackBarValuePosition,type TrackBarThumbShape} from 'taet-ui/inputs';
const position:TrackBarValuePosition='top',shape:TrackBarThumbShape='grip';
const slider=new TrackBar({valuePosition:position,thumbShape:shape});slider.setThumbShape('ring').setValuePosition('bottom').setShowValue(true);
// @ts-expect-error only defined shapes
slider.setThumbShape('triangle');
slider.destroy();
