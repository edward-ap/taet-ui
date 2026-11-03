import {Panel,Form,TextInput,CheckBox,Button,ReadonlyText} from '../../dist/taet-ui.min.js';
export function createCustomerEditor(container,saveCustomer){
 const name=new TextInput({name:'name',label:'Customer',value:'Ada'});
 const active=new CheckBox({name:'active',text:'Active',value:true});
 const status=new ReadonlyText({role:'status',text:'Ready',css:'customer-status'});
 let email=null,readOnly=false;
 const form=new Form({name:'customerForm',onSubmit(){saveCustomer(form.value.get());}}).row(name).row(active);
 form.row(new Button({text:'Save',onClick:()=>form.submit()}),
  new Button({text:'Toggle email',onClick(){
   if(email){form.remove(email);email=null;}else{email=new TextInput({name:'email',label:'Email',readOnly});form.row(email);}
  }}),
  new Button({text:'Toggle readonly',onClick(){readOnly=!readOnly;form.setReadOnly(readOnly);status.setText(readOnly?'Readonly':'Editable');}}));
 const screen=new Panel(container,{css:'customer-screen'}).add(form,status);
 return {screen,form,load(model){form.value.set(model,{silent:true,origin:'import'});},rename(caption){name.setLabel(caption);},destroy(){screen.destroy();}};
}
const example=createCustomerEditor('#app',model=>console.log('Save',model));
// The host calls destroy when this screen actually closes.
window.addEventListener('pagehide',()=>example.destroy(),{once:true});
window.example=example;
