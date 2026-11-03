import {Panel,Form,TextInput,Button,ReadonlyText} from './vendor/taet-ui.min.js';
const name=new TextInput({name:'name',label:'Customer',value:'Ada'});
const form=new Form().row(name);
const status=new ReadonlyText({role:'status',text:'Ready',css:'example-status'});
const screen=new Panel('#app').add(form,status);
form.row(new Button({text:'Rust echo',async onClick(){
 try {
  const reply=await window.__TAURI__.core.invoke('echo',{payload:JSON.stringify(form.value.get())});
  if(!screen.destroyed)status.setText(reply.payload);
 } catch(error) { if(!screen.destroyed)status.setText(String(error)); }
}}));
window.addEventListener('pagehide',()=>screen.destroy(),{once:true});
