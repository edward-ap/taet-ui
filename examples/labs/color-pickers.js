import { Panel, Form, Button, ColorPicker, RGBColorPicker, CMYKColorPicker } from '../../src/ui/all.js';
const root=new Panel('#root',{width:'100%'});
const form=new Form({labelWidth:140}).row(new ColorPicker({name:'universal',label:'ColorPicker',value:'#526a93'}))
 .row(new RGBColorPicker({name:'rgb',label:'RGBColorPicker',value:'#5d5852'}))
 .row(new CMYKColorPicker({name:'cmyk',label:'CMYKColorPicker',value:'#eddfd1'}))
 .row(new Button({text:'Light / dark theme',onClick:()=>{document.body.classList.toggle('dui-theme-dark-blue');document.body.classList.toggle('dui-theme-light-blue');}}));
root.add(form);
window.addEventListener('pagehide',()=>root.destroy(),{once:true});
