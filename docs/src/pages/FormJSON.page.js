import {Panel,Toolbar,Button,TextArea} from '../../../src/ui/index.js';
import {createFormFromJSON} from '../../../src/ui/experimental.js';
import {importsFor} from './pageHelpers.js';
import {gridExample} from './Grid.page.js';
export const formJSONPage={
 id:'form-json',title:'Form JSON Configuration',status:'experimental',
 imports:importsFor(['Panel','Toolbar','Button','TextArea','createFormFromJSON']),
 description:'Build a normal Tæt UI Form from groups, rows, fields and a separate value object.',
 paragraphs:['Each row contains one or more fields. A group with a title becomes a FieldGroup; without a title it is an unframed Form. Field names are unique across the entire form and values remain flat.',
 'Buttons below are host code, not server commands. Rebuild creates a new form and resets local editing state. Invalid definitions keep the existing form. Normal value.get/set/reset, validate, submit and change events remain available.'],
 examples:[gridExample('Server-defined contact form',function createJSONFormDemo({container,log}){
  const owner=new Panel(container,{name:'jsonFormDemo'});
  const initial=JSON.stringify({schemaVersion:1,labelPosition:'top',groups:[
   {id:'contact',title:'Contact information',rows:[
    [{name:'first',label:'First name',editor:{type:'text',placeholder:'First',required:true}},
     {name:'last',label:'Last name',editor:{type:'text',placeholder:'Last'}}],
    [{name:'city',label:'City',editor:{type:'text'}},{name:'state',label:'State',editor:{type:'text'}},{name:'zip',label:'ZIP',editor:{type:'text'}}],
    [{name:'country',label:'Country',editor:{type:'select',items:[{value:'ca',text:'Canada'},{value:'us',text:'United States'}]}}]]},
   {id:'preferences',rows:[[{name:'copies',label:'Copies',editor:{type:'number',min:1,max:10}},{name:'notify',label:'Notify',editor:{type:'switch'}}]]}
  ],data:{first:'Ada',last:'Lovelace',city:'Toronto',state:'ON',zip:'M5V',country:'ca',copies:2,notify:true}},null,2);
  const input=new TextArea({label:'Definition JSON',labelPosition:'top',value:initial,width:'100%',rows:10,spellcheck:false});
  let current=null;
  const rebuild=()=>{
   let next;
   try{
    next=createFormFromJSON(input.value.get(),{width:'100%'});owner.add(next);
    if(current)owner.remove(current);current=next;
    current.events.on('submit',event=>log.write(JSON.stringify(event.value)));
    current.events.on('validationFail',event=>log.write(event.errors.map(error=>error.path+': '+error.message).join('; ')));
    log.write('Definition applied');
   }catch(error){if(next && next!==current && !next.destroyed)next.destroy();log.write(error.message);}
  };
  owner.add(input,new Toolbar().add(
   new Button({text:'Rebuild',onClick:rebuild}),
   new Button({text:'Read values',onClick:()=>{if(current)log.write(JSON.stringify(current.value.get()));}}),
   new Button({text:'Submit',onClick:()=>current?.submit()}),
   new Button({text:'Reset',onClick:()=>{if(current){current.value.reset();log.write('Values reset');}}})));
  rebuild();return owner;
 },'Edit the payload and rebuild. Required fields validate before submit; reset restores the normalized initial values. No request is sent.')]
};
