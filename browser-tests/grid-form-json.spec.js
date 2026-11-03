import {test,expect} from '@playwright/test';
test.beforeEach(async({page})=>{page.on('pageerror',error=>{throw error;});});
test('JSON Form demo edits grouped rows, validates, submits and resets',async({page})=>{
 await page.goto('/docs/index.html#form-json');const live=page.locator('.dui-example-host__live');const output=page.locator('.dui-example-host__output');
 const first=live.getByRole('textbox',{name:/^First name/});await expect(first).toHaveValue('Ada');
 await first.fill('');await live.getByRole('button',{name:'Submit',exact:true}).click();await expect(output).toContainText('first: Required');await expect(first).toBeFocused();
 await first.fill('Grace');await live.getByRole('combobox',{name:'Country',exact:true}).selectOption({label:'United States'});await live.getByRole('button',{name:'Submit',exact:true}).click();await expect(output).toContainText('"first":"Grace"');await expect(output).toContainText('"country":"us"');
 await live.getByRole('button',{name:'Reset',exact:true}).click();await expect(first).toHaveValue('Ada');await expect(live.getByRole('combobox',{name:'Country',exact:true}).locator('option:checked')).toHaveText('Canada');
 await live.locator('textarea').fill('{"schemaVersion":2}');await live.getByRole('button',{name:'Rebuild',exact:true}).click();await expect(output).toContainText('schemaVersion');await expect(first).toHaveValue('Ada');
});
test('JSON Form native controls support typed selection, events, readonly and owner teardown',async({page})=>{
 await page.goto('/browser-tests/recipes.html');await page.evaluate(async()=>{
 const {createFormFromJSON}=await import('/src/ui/experimental.js');window.f=createFormFromJSON({schemaVersion:1,groups:[{id:'g',title:'Settings',rows:[
 [{name:'choice',label:'Choice',editor:{type:'select',items:[{value:1,text:'Number'},{value:'1',text:'String'}]}},{name:'fixed',label:'Fixed',editor:{type:'text'},readOnly:true}],
 [{name:'flag',label:'Flag',editor:{type:'checkbox'}},{name:'mode',label:'Mode',editor:{type:'radio',items:[{value:true,text:'Yes'},{value:false,text:'No'}]}}],
 [{name:'date',label:'Date',editor:{type:'date'}},{name:'time',label:'Time',editor:{type:'time'}},{name:'stamp',label:'Stamp',editor:{type:'dateTime'}}]
 ]}],data:{choice:1,fixed:'Locked',flag:false,mode:true}},{container:'#root'});window.fields=f.getFields();window.changes=[];f.events.on('change',event=>changes.push(event.value));
 });await page.getByRole('combobox',{name:'Choice',exact:true}).selectOption({label:'String'});expect(await page.evaluate(()=>f.value.get().choice)).toBe('1');
 await expect(page.getByRole('textbox',{name:'Fixed',exact:true})).toHaveAttribute('readonly','');await page.getByRole('checkbox',{name:'Flag',exact:true}).check();expect(await page.evaluate(()=>f.value.get().flag)).toBe(true);
 await page.locator('.dui-radio-group').getByText('No',{exact:true}).click();expect(await page.evaluate(()=>f.value.get().mode)).toBe(false);expect(await page.evaluate(()=>changes.length)).toBeGreaterThan(0);
 await page.evaluate(()=>f.destroy());await expect(page.locator('#root > *')).toHaveCount(0);expect(await page.evaluate(()=>fields.every(field=>field.destroyed))).toBe(true);
});
test('Form documentation source is executable and owns all fields',async({page})=>{
 await page.goto('/browser-tests/recipes.html');expect(await page.evaluate(async()=>{
 const ui=await import('/src/ui/all.js');const {formJSONPage}=await import('/docs/src/pages/FormJSON.page.js');const example=formJSONPage.examples[0];
 const owner=new Function(...Object.keys(ui),'log',example.source.replace(/const example =/,'return'))(...Object.values(ui),{write(){}});
 const fields=owner.items.at(-1).getFields();owner.destroy();return fields.length===8 && fields.every(field=>field.destroyed) && !document.querySelector('#root').children.length;
 })).toBe(true);
});
