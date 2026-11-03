import {DataStore,CommandRegistry,ThemeApplicator} from 'taet-ui/foundation';
import {Form,Panel,TextInput,Grid,TreeGrid,PropertyGrid,createFormFromJSON} from 'taet-ui/components';
import {Chart,DockLayout} from 'taet-ui/advanced';
import {Form as LegacyForm} from 'taet-ui';
import {Grid as LegacyGrid} from 'taet-ui/grid';
if(Form!==LegacyForm||Grid!==LegacyGrid)throw Error('Tier aliases introduced duplicate constructors');
const store=new DataStore<{id:number;name:string}>();store.parse([{id:1,name:'Ada'}]);
const field=new TextInput({name:'name'});const form=new Form().row(field);form.value.set({name:'Ed'},{silent:true});
form.remove(field);if('name' in form.value.get())throw Error('Removed installed field retained');
form.destroy();const commands=new CommandRegistry();commands.destroy();store.destroy();
void [Panel,TreeGrid,PropertyGrid,createFormFromJSON,Chart,DockLayout,ThemeApplicator];
if(false){
 // @ts-expect-error unknown field value
 const bad:DataStore<{id:number}> = new DataStore<{id:string}>();
 void bad;
}
console.log('Installed tiers OK: constructor identity, typed models, Form removal, JSON/advanced exports');
