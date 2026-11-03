import {test,expect} from '@playwright/test';
test.beforeEach(async({page})=>{page.on('pageerror',e=>{throw e;});await page.goto('/browser-tests/recipes.html');});
test('Dialog primary Enter, native buttons, multiline, veto and Escape',async({page})=>{
 await page.evaluate(async()=>{const {Dialog}=await import('/src/ui/all.js');const content=document.createElement('div');content.innerHTML='<input aria-label="Name"><textarea aria-label="Notes"></textarea>';window.results=[];window.dialog=new Dialog({title:'Keys',content,buttons:[{text:'Save',primary:true,result:'save'},{text:'Cancel',result:'cancel'}]});window.openDialog=()=>dialog.showModal().then(r=>results.push(r));openDialog();});
 await page.getByRole('textbox',{name:'Name',exact:true}).press('Enter');await expect.poll(()=>page.evaluate(()=>results)).toEqual(['save']);
 await page.evaluate(()=>{openDialog();});await page.getByRole('textbox',{name:'Notes'}).fill('line');await page.getByRole('textbox',{name:'Notes'}).press('Enter');expect(await page.evaluate(()=>dialog.opened)).toBe(true);
 await page.getByRole('button',{name:'Cancel',exact:true}).press('Enter');await expect.poll(()=>page.evaluate(()=>results)).toEqual(['save','cancel']);
 await page.evaluate(()=>{window.veto=true;dialog.events.on('beforeClose',e=>{if(veto)e.cancel=true;});openDialog();});await page.getByRole('textbox',{name:'Name',exact:true}).press('Enter');expect(await page.evaluate(()=>dialog.opened)).toBe(true);
 await page.evaluate(()=>veto=false);await page.keyboard.press('Escape');await expect.poll(()=>page.evaluate(()=>results.length)).toBe(3);expect(await page.evaluate(()=>results[2])).toBe('cancel');
});
test('Dialog disabled primary, composition and nested overlay keep their keyboard ownership',async({page})=>{
 await page.evaluate(async()=>{const {Dialog,Popup}=await import('/src/ui/all.js');const content=document.createElement('input');content.setAttribute('aria-label','Entry');window.dialog=new Dialog({title:'Parent',content,buttons:[{text:'Save',primary:true,disabled:true,result:'save'}]});dialog.open();window.popup=new Popup({content:'Child'});});
 const input=page.getByRole('textbox',{name:'Entry'});await input.press('Enter');expect(await page.evaluate(()=>dialog.opened)).toBe(true);
 await input.dispatchEvent('keydown',{key:'Escape',isComposing:true});expect(await page.evaluate(()=>dialog.opened)).toBe(true);
 await page.evaluate(()=>popup.open(dialog.element));await page.keyboard.press('Escape');expect(await page.evaluate(()=>[popup.opened,dialog.opened])).toEqual([false,true]);
 await page.evaluate(()=>{dialog.closeOnEscape=false;dialog.close();dialog.open();});await input.press('Escape');expect(await page.evaluate(()=>dialog.opened)).toBe(true);await page.evaluate(()=>{popup.destroy();dialog.destroy();});
});
for(const type of ['Grid','TreeGrid'])test(`${type} public double click, cancellation, editing, disabled and teardown`,async({page})=>{
 await page.evaluate(async type=>{const ui=await import('/src/ui/all.js');window.hits=[];window.cancel=true;window.grid=new ui[type]('#root',{height:240,columns:[{id:'name',editable:true,editor:ui.gridEditors.text()}]});grid.data.parse([{id:1,name:'Example'}]);grid.events.on('rowDoubleClick',e=>hits.push(['row',e.id,e.nativeEvent.type]));grid.events.on('cellDoubleClick',e=>{hits.push(['cell',e.columnId,e.value]);e.cancel=cancel;});},type);
 const cell=page.locator('.dui-grid__row .dui-grid__cell').first();await cell.dblclick();expect(await page.evaluate(()=>hits)).toEqual([['row',1,'dblclick'],['cell','name','Example']]);expect(await page.evaluate(()=>!!grid._editing)).toBe(false);
 await page.evaluate(()=>cancel=false);await cell.dblclick();expect(await page.evaluate(()=>!!grid._editing)).toBe(true);await page.keyboard.press('Escape');
 await page.evaluate(()=>{grid.disable();hits=[];});await cell.dispatchEvent('dblclick');expect(await page.evaluate(()=>hits)).toEqual([]);
 await page.evaluate(()=>{grid.enable();grid.events.on('rowDoubleClick',()=>grid.destroy());});await cell.dblclick();expect(await page.evaluate(()=>grid.destroyed)).toBe(true);
});
test('Dense Form input Enter validates; consumed and composing keys do not confirm',async({page})=>{
 await page.evaluate(async()=>{const {Dialog,Form,TextInput,Popup}=await import('/src/ui/all.js');window.field=new TextInput({label:'Project',value:'Example'});const form=new Form().row(field);window.dialog=new Dialog({title:'Form keys',content:form,destroyContent:true,buttons:[{text:'Apply',result:'apply',primary:true}]});window.dialogCloseCount=0;window.veto=true;dialog.events.on('beforeClose',e=>{if(veto)e.cancel=true;});dialog.events.on('close',()=>dialogCloseCount++);dialog.open();window.popup=new Popup({content:'Overlay'});});
 const input=page.getByRole('textbox',{name:'Project',exact:true});await input.press('Enter');expect(await page.evaluate(()=>dialog.opened)).toBe(true);
 await page.evaluate(()=>veto=false);await input.dispatchEvent('keydown',{key:'Enter',isComposing:true});expect(await page.evaluate(()=>dialogCloseCount)).toBe(0);
 await input.evaluate(e=>e.addEventListener('keydown',event=>event.preventDefault(),{once:true}));await input.press('Enter');expect(await page.evaluate(()=>dialogCloseCount)).toBe(0);
 await page.evaluate(()=>popup.open(dialog.element));await input.dispatchEvent('keydown',{key:'Enter'});expect(await page.evaluate(()=>dialogCloseCount)).toBe(0);await page.keyboard.press('Escape');
 await input.press('Enter');expect(await page.evaluate(()=>dialogCloseCount)).toBe(1);await page.evaluate(()=>{popup.destroy();dialog.destroy();});
});
