import {Panel,Button,Toolbar,TextArea} from '../../../src/ui/index.js';
import {createTreeFromJSON,createTreeGridFromJSON,createPropertyGridFromJSON,getPropertyGridValues} from '../../../src/ui/experimental.js';
import {gridExample} from './Grid.page.js';
import {importsFor} from './pageHelpers.js';

export const treeJSONPage={
 id:"tree-json",title:"Tree JSON Configuration",status:'experimental',
 imports:importsFor(["Panel", "Button", "Toolbar", "TextArea", "createTreeFromJSON"]),
 description:'Create a live component from a strict versioned JSON definition. Edit the payload below and rebuild.',
 paragraphs:['Schema and data are separate concepts. Rebuild creates a new component and resets local selection, expansion and editing state. Invalid JSON preserves the previous component.',
 'The host owns loading, saving and backend permissions. JSON contains no executable callbacks. Show Data reports committed values, without committing an editing draft.'],
 examples:[gridExample("Tree JSON Configuration",function treeJSONPageDemo({container,log}){
  const owner=new Panel(container,{name:"tree-jsonDemo"});
  const initial=JSON.stringify({"schemaVersion": 1, "height": 190, "tree": {"expandAll": true}, "selection": {"multiple": true}, "data": [{"id": "root", "text": "Project", "icon": "folder"}, {"id": "src", "parentId": "root", "text": "Source", "icon": "folder"}, {"id": "main", "parentId": "src", "text": "main.js", "icon": "file"}, {"id": "readme", "parentId": "root", "text": "README.md", "icon": "file"}]},null,2);
  const input=new TextArea({label:'Definition JSON',labelPosition:'top',value:initial,width:'100%',rows:10,spellcheck:false});
  let current=null;
  const rebuild=()=>{
   let next;
   try {
    next=createTreeFromJSON(input.value.get(),{width:'100%'});owner.add(next);
    if(current)owner.remove(current);current=next;log.write('Definition applied');
   }catch(error){if(next && next!==current && !next.destroyed)next.destroy();log.write(error.message);}
  };
  owner.add(input,new Toolbar().add(
   new Button({text:'Rebuild',onClick:rebuild}),
   new Button({text:'Show Data',onClick:()=>{if(current)log.write(JSON.stringify(current.data.all()));}})));
  rebuild();return owner;
 },'Change the definition, rebuild, then interact with the resulting component. The parent Panel owns and destroys each instance.')]
};

export const treeGridJSONPage={
 id:"tree-grid-json",title:"TreeGrid JSON Configuration",status:'experimental',
 imports:importsFor(["Panel", "Button", "Toolbar", "TextArea", "createTreeGridFromJSON"]),
 description:'Create a live component from a strict versioned JSON definition. Edit the payload below and rebuild.',
 paragraphs:['Schema and data are separate concepts. Rebuild creates a new component and resets local selection, expansion and editing state. Invalid JSON preserves the previous component.',
 'The host owns loading, saving and backend permissions. JSON contains no executable callbacks. Show Data reports committed values, without committing an editing draft.'],
 examples:[gridExample("TreeGrid JSON Configuration",function treeGridJSONPageDemo({container,log}){
  const owner=new Panel(container,{name:"tree-grid-jsonDemo"});
  const initial=JSON.stringify({"schemaVersion": 1, "height": 200, "tree": {"expandedIds": ["root", "src"]}, "columns": [{"id": "text", "title": "Resource", "width": 280, "sortable": true, "editor": {"type": "text", "required": true}}, {"id": "size", "title": "Bytes", "width": 140, "dataType": "number", "format": {"type": "number"}}], "data": [{"id": "root", "text": "Project", "icon": "folder", "size": null}, {"id": "src", "parentId": "root", "text": "Source", "icon": "folder", "size": null}, {"id": "main", "parentId": "src", "text": "main.js", "icon": "file", "size": 1024}, {"id": "readme", "parentId": "root", "text": "README.md", "icon": "file", "size": null}]},null,2);
  const input=new TextArea({label:'Definition JSON',labelPosition:'top',value:initial,width:'100%',rows:10,spellcheck:false});
  let current=null;
  const rebuild=()=>{
   let next;
   try {
    next=createTreeGridFromJSON(input.value.get(),{width:'100%'});owner.add(next);
    if(current)owner.remove(current);current=next;log.write('Definition applied');
   }catch(error){if(next && next!==current && !next.destroyed)next.destroy();log.write(error.message);}
  };
  owner.add(input,new Toolbar().add(
   new Button({text:'Rebuild',onClick:rebuild}),
   new Button({text:'Show Data',onClick:()=>{if(current)log.write(JSON.stringify(current.data.all()));}})));
  rebuild();return owner;
 },'Change the definition, rebuild, then interact with the resulting component. The parent Panel owns and destroys each instance.')]
};

export const propertyGridJSONPage={
 id:"property-grid-json",title:"PropertyGrid JSON Configuration",status:'experimental',
 imports:importsFor(["Panel", "Button", "Toolbar", "TextArea", "createPropertyGridFromJSON", "getPropertyGridValues"]),
 description:'Create a live component from a strict versioned JSON definition. Edit the payload below and rebuild.',
 paragraphs:['Schema and data are separate concepts. Rebuild creates a new component and resets local selection, expansion and editing state. Invalid JSON preserves the previous component.',
 'The host owns loading, saving and backend permissions. JSON contains no executable callbacks. Show Data reports committed values, without committing an editing draft.'],
 examples:[gridExample("PropertyGrid JSON Configuration",function propertyGridJSONPageDemo({container,log}){
  const owner=new Panel(container,{name:"property-grid-jsonDemo"});
  const initial=JSON.stringify({"schemaVersion": 1, "height": 240, "labelWidth": 160, "groups": [{"id": "general", "title": "General", "properties": [{"name": "name", "label": "Name", "editor": {"type": "text", "required": true}}, {"name": "copies", "label": "Copies", "editor": {"type": "number", "min": 1, "max": 20}}, {"name": "mode", "label": "Mode", "editor": {"type": "select", "items": [{"value": "draft", "text": "Draft"}, {"value": "final", "text": "Final"}]}}, {"name": "advanced", "label": "Advanced", "children": [{"name": "enabled", "label": "Enabled", "editor": {"type": "checkbox"}}]}]}], "data": {"name": "Report", "copies": 2, "mode": "draft", "enabled": true}},null,2);
  const input=new TextArea({label:'Definition JSON',labelPosition:'top',value:initial,width:'100%',rows:10,spellcheck:false});
  let current=null;
  const rebuild=()=>{
   let next;
   try {
    next=createPropertyGridFromJSON(input.value.get(),{width:'100%'});owner.add(next);
    if(current)owner.remove(current);current=next;log.write('Definition applied');
   }catch(error){if(next && next!==current && !next.destroyed)next.destroy();log.write(error.message);}
  };
  owner.add(input,new Toolbar().add(
   new Button({text:'Rebuild',onClick:rebuild}),
   new Button({text:'Show Data',onClick:()=>{if(current)log.write(JSON.stringify(getPropertyGridValues(current)));}})));
  rebuild();return owner;
 },'Change the definition, rebuild, then interact with the resulting component. The parent Panel owns and destroys each instance.')]
};
