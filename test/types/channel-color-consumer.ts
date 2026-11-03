import { RGBColorPicker, CMYKColorPicker, type CmykColor } from 'taet-ui/inputs';
const rgb=new RGBColorPicker({value:'#123456',onChange:e=>{const hex:string=e.newValue;void hex;}});
const cmyk=new CMYKColorPicker({label:'Ink'});cmyk.setCmyk(10,20,30,40);const ink:CmykColor=cmyk.getCmyk();void ink;
// @ts-expect-error channels are numeric
cmyk.setCmyk('red',0,0,0);
rgb.destroy();cmyk.destroy();
