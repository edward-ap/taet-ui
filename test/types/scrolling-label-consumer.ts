import {ScrollingLabel,type ScrollingLabelOptions} from 'taet-ui/experimental';
const options:ScrollingLabelOptions={text:'Title',speed:35,gap:48,startDelay:1000};
const label=new ScrollingLabel(options);label.setText('Next').setSpeed(40).setPaused(true);label.destroy();
