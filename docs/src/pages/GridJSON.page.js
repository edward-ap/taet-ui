import {Panel, Button, Toolbar, TextArea} from '../../../src/ui/index.js';
import {createGridFromJSON} from '../../../src/ui/experimental.js';
import {gridExample} from './Grid.page.js';
import {importsFor} from './pageHelpers.js';
export const gridJSONPage = {
 id:'grid-json', title:'JSON Configuration', status:'experimental',
 imports:importsFor(['Panel','Button','Toolbar','TextArea','createGridFromJSON']),
 description:'Build a Grid from a versioned server definition containing columns, behavior and optional data.',
 paragraphs:['Edit the JSON and rebuild. Invalid definitions leave the existing table intact. Rebuilding intentionally discards the old selection, column widths and editing draft; this is not a live schema patch.',
 'Fetch JSON in your host and pass it to createGridFromJSON. For separate data responses, omit data initially and later call grid.data.parse(rows). This adapter does not fetch, execute scripts or infer backend permissions.'],
 examples:[gridExample('Server-defined order table',function createJSONGridDemo({container,log}) {
  const owner=new Panel(container,{name:'jsonGridDemo'});
  const initial=JSON.stringify({schemaVersion:1,height:240,selection:{multiple:true,range:'rows'},rowReorder:true,
   columns:[{id:'name',title:'Product',width:240,sortable:true,filterable:true,editor:{type:'text',required:true}},
    {id:'price',title:'Price',width:140,dataType:'number',sortable:true,editor:{type:'number',min:0},format:{type:'currency',currency:'USD'},summary:'total'},
    {id:'status',title:'Status',width:140,editor:{type:'select',items:[{value:'Pending',text:'Pending'},{value:'Ready',text:'Ready'}]}},
    {id:'active',title:'Active',width:100,editor:{type:'checkbox'},format:{type:'boolean'}}],
   data:[{id:'a',name:'Keyboard',price:49.5,status:'Pending',active:true},{id:'b',name:'Mouse',price:19.9,status:'Ready',active:false}]},null,2);
  const input=new TextArea({name:'gridDefinitionJSON',value:initial,rows:12,width:'100%',height:260,spellcheck:false});
  let current=null;
  const rebuild=()=>{
   let next;
   try {
    next=createGridFromJSON(input.value.get(),{width:'100%'});
    owner.add(next);
    if(current)owner.remove(current);
    current=next;
    current.events.on('cellChange',()=>log.write(JSON.stringify(current.data.all())));
    log.write('Definition applied');
   } catch(error) {if(next && next!==current && !next.destroyed)next.destroy();log.write(error.message);}
  };
  owner.add(input,new Toolbar().add(new Button({text:'Rebuild Grid',onClick:rebuild}),new Button({text:'Reset JSON',onClick:()=>{input.value.set(initial);rebuild();}})));
  rebuild();return owner;
 },'Try changing column titles, currency, editors, visibility or row selection. JSON strings are rendered as text. Formatters named in the JSON must be registered by the host.')],
 options:[{name:'schemaVersion',type:'1',description:'Required version; unknown fields are rejected.'},{name:'columns / data',type:'array',description:'Column definitions and optional JSON records with unique string/number ids.'}],
 methods:[{name:'compileGridDefinition(input, registry)',type:'{ options, data }',description:'Validate/copy JSON and compile editor/formatter descriptors without creating controls.'},{name:'createGridFromJSON(input, host)',type:'Grid',description:'Create a Grid; host may provide container, dimensions and a formatter registry. Caller owns destruction.'}]
};
