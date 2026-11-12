import {test,expect} from '@playwright/test';

test.beforeEach(async({page})=>{await page.goto('/browser-tests/recipes.html');});

test('Menu honors hidden items and separators at every level and after replacement',async({page})=>{
 await page.evaluate(async()=>{
  const {Menu}=await import('/src/ui/Menu.js');
  window.visibilityMenu=new Menu('#root',{items:[
   {id:'hidden-root',text:'Hidden root',hidden:true},
   {id:'hidden-root-separator',type:'separator',hidden:true},
   {id:'file',text:'File',items:[{id:'hidden-child',text:'Hidden child',hidden:true},{id:'hidden-child-separator',type:'separator',visible:false},{id:'open',text:'Open'}]}
  ]});
 });
 await expect(page.getByRole('menuitem',{name:'Hidden root',exact:true})).toHaveCount(0);
 await expect(page.locator('[data-dui-menu-item-id="hidden-root-separator"]')).toHaveCount(0);
 await page.getByRole('menuitem',{name:'File',exact:true}).click();
 await expect(page.getByRole('menuitem',{name:'Open',exact:true})).toBeVisible();
 await expect(page.getByRole('menuitem',{name:'Hidden child',exact:true})).toHaveCount(0);
 await expect(page.locator('[data-dui-menu-item-id="hidden-child-separator"]')).toHaveCount(0);
 await page.evaluate(()=>visibilityMenu.setItems([{id:'revealed',text:'Revealed',hidden:false},{id:'conflict',text:'Conflict',hidden:true,visible:true}]));
 await expect(page.getByRole('menuitem',{name:'Revealed',exact:true})).toBeVisible();
 await expect(page.getByRole('menuitem',{name:'Conflict',exact:true})).toHaveCount(0);
 await expect(page.getByRole('menuitem',{name:'Open',exact:true})).toHaveCount(0);
 await page.evaluate(()=>visibilityMenu.destroy());
});

test('ContextMenu combines local visibility with live command visibility',async({page})=>{
 await page.evaluate(async()=>{
  const {ContextMenu}=await import('/src/ui/Menu.js');const {CommandRegistry}=await import('/src/core/CommandRegistry.js');
  window.commandVisible=true;window.menuCommands=new CommandRegistry();menuCommands.register('action',{label:'Dynamic action',visible:()=>commandVisible,run(){}});
  window.visibilityMenu=new ContextMenu({commands:menuCommands,items:[{id:'shown',command:'action'},{id:'locally-hidden',command:'action',hidden:true},{id:'locally-invisible',command:'action',visible:false}]});visibilityMenu.openAt(100,100);
 });
 await expect(page.getByRole('menuitem',{name:'Dynamic action',exact:true})).toHaveCount(1);
 await expect(page.locator('[data-dui-menu-item-id="locally-hidden"]')).toHaveCount(0);
 await expect(page.locator('[data-dui-menu-item-id="locally-invisible"]')).toHaveCount(0);
 await page.evaluate(()=>{commandVisible=false;menuCommands.refreshState();});
 await expect(page.getByRole('menuitem',{name:'Dynamic action',exact:true})).toHaveCount(0);
 await page.evaluate(()=>{commandVisible=true;menuCommands.refreshState();visibilityMenu.openAt(100,100);});
 await expect(page.getByRole('menuitem',{name:'Dynamic action',exact:true})).toHaveCount(1);
 await page.evaluate(()=>{visibilityMenu.destroy();menuCommands.destroy();});
});
