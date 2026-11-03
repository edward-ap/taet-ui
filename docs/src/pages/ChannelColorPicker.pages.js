import { importsFor } from "./pageHelpers.js";
import { RGBColorPicker, CMYKColorPicker } from '../../../src/ui/experimental.js';
import { Form } from '../../../src/ui/index.js';
import { inputExample } from './inputExamples.js';
const shared = {
 status:'experimental',
 paragraphs:['The field value is an empty string or canonical #rrggbb. Open the field to edit vertical channels. A square preview and editable HEX value appear on the left. Enter accepts the draft and closes the popup; Escape or clicking outside discards it. Channel arrows adjust the selected slider. The popup follows the current Tæt UI theme.'],
 options:[{name:'value / label / name',type:'string',description:'Initial color, field label and Form key.'},{name:'allowEmpty',type:'boolean',description:'Show Clear for an empty draft; default true.'},{name:'readOnly / disabled',type:'boolean',description:'Prevent opening or editing.'}],
 methods:[{name:'value.get() / value.set(color, options)',type:'string / boolean',description:'Read/write the canonical color; programmatic updates replace the popup draft.'},{name:'getRgb() / setRgb(r,g,b,options)',type:'RgbColor / boolean',description:'Read or set RGB channels, 0–255.'},{name:'openPopup() / closePopup()',type:'boolean',description:'Open or dismiss the popup. Dismissal does not accept draft changes.'}],
 events:[{name:'beforeChange / change / afterChange',type:'ChangeEvent',description:'Enter emits a cancellable value change. A veto keeps the popup open.'},{name:'open / close',type:'ControlEvent',description:'Popup lifecycle; accepting closes with reason accept.'}],
 notes:['Owned sliders and buttons are destroyed with the field. Alpha is not supported.']
};
export const rgbColorPickerPage={...shared,id:'rgb-color-picker',title:'RGBColorPicker',keywords:['color','RGB','channels'],description:'Choose a color with three vertical RGB channels.',
 imports: importsFor(["Form", "RGBColorPicker"]),
 examples:[inputExample('RGB channels',function createRgbExample({log}) {
  return new Form({labelWidth:90}).row(new RGBColorPicker({name:'rgb',label:'RGB color',value:'#5d5852',onChange:event=>log.write(event.newValue)}));
 },'Open the field. R, G and B range from 0 to 255. Press Enter to select the previewed color.')]
};
export const cmykColorPickerPage={...shared,id:'cmyk-color-picker',title:'CMYKColorPicker',keywords:['color','CMYK','channels'],description:'Choose a color with four vertical CMYK percentage channels.',
 imports: importsFor(["Form", "CMYKColorPicker"]),
 examples:[inputExample('CMYK channels',function createCmykExample({log}) {
  const color=new CMYKColorPicker({name:'cmyk',label:'CMYK color',onChange:event=>log.write(event.newValue)});
  color.setCmyk(0,5,12,7,{silent:true});
  return new Form({labelWidth:90}).row(color);
 },'C, M, Y and K range from 0 to 100%. Press Enter to accept. The preview is an approximate RGB conversion, not a print proof.')],
 methods:[...shared.methods,{name:'getCmyk() / setCmyk(c,m,y,k,options)',type:'CmykColor / boolean',description:'Read derived percentages or convert percentages into the RGB field value.'}],
 notes:[...shared.notes,'CMYK is a channel editing mode, not an ICC color-management system. Conversion uses RGB = 255 × (1 − channel/100) × (1 − K/100). Reopening derives normalized CMYK from the saved RGB, so the original ink decomposition is not preserved.']
};
