import { Panel,Form,TextInput,Button,List,PropertyGrid } from 'taet-ui/components';
import { ThemeApplicator } from 'taet-ui/foundation';
import { Dialog } from 'taet-ui/components';
export async function checkRemainingComponents(host:HTMLElement) {
 const field=new TextInput({name:'name',value:'Ada'});
 const form=new Form().row(field,new Button({text:'Save'}));
 const screen=new Panel(host).add(form);
 form.value.set({name:'Ed'},{silent:true});
 if(field.value.get()!=='Ed')throw Error('Installed Form synchronization');
 form.remove(field);
 if('name' in form.value.get())throw Error('Removed installed field remains in values');
 const list=new List({height:120});screen.add(list);list.data.parse([{id:1,text:'One'}]);
 const properties=new PropertyGrid();screen.add(properties);
 const theme=new ThemeApplicator(screen);theme.destroy();
 const dialog=new Dialog({title:'Installed dialog',buttons:[{text:'OK',result:'ok'}]});
 const result=dialog.showModal();dialog.close('ok');await result;dialog.destroy();
 screen.destroy();if(host.childElementCount||!form.destroyed||!list.destroyed||!properties.destroyed)throw Error('Installed ownership');
}
