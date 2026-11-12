import test from 'node:test';
import assert from 'node:assert/strict';
import {Menu} from '../src/ui/Menu.js';
import {CommandRegistry} from '../src/core/CommandRegistry.js';

test('Menu visibility honors hidden and visible flags for items and separators',()=>{
 const menu=new Menu({items:[{id:'visible',text:'Visible'},{id:'hidden',text:'Hidden',hidden:true},{id:'invisible',visible:false},{id:'hidden-separator',type:'separator',hidden:true},{id:'invisible-separator',type:'separator',visible:false},{id:'separator',type:'separator'}]});
 assert.deepEqual(menu._visibleItems(menu.items).map(i=>i.id),['visible','separator']);
 menu.setItems([{id:'revealed',hidden:false},{id:'conflict',visible:true,hidden:true}]);
 assert.deepEqual(menu._visibleItems(menu.items).map(i=>i.id),['revealed']);
 menu.destroy();
});

test('Menu local visibility can hide a command but cannot expose an invisible command',()=>{
 const commands=new CommandRegistry();commands.register('shown',{label:'Shown',run(){}});commands.register('invisible',{label:'Invisible',visible:false,run(){}});
 const menu=new Menu({commands,items:[{id:'shown',command:'shown'},{id:'hidden',command:'shown',hidden:true},{id:'local-off',command:'shown',visible:false},{id:'command-off',command:'invisible',visible:true}]});
 assert.deepEqual(menu._visibleItems(menu.items).map(i=>i.id),['shown']);
 menu.destroy();commands.destroy();
});
