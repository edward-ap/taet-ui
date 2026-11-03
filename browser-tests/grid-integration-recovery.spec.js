import {test,expect} from '@playwright/test';
test.beforeEach(async({page})=>{page.on('pageerror',error=>{throw error;});await page.goto('/browser-tests/recipes.html');});
test('NumberInput retains spinbutton through rejected submit, state changes and retry',async({page})=>{
 await page.evaluate(async()=>{const {Form,NumberInput}=await import('/src/ui/index.js');window.n=new NumberInput({name:'quantity',label:'Quantity',value:3,min:0,validators:[v=>v<=5||'Too large']});window.f=new Form().row(n);f.mount('#root');});
 const input=page.getByRole('spinbutton',{name:'Quantity',exact:true});await input.fill('8');expect(await page.evaluate(()=>f.submit())).toBe(false);
 await page.evaluate(()=>{f.disable();f.enable();n.setReadOnly(true);n.setReadOnly(false);n.refresh();});await expect(input).toHaveAttribute('type','number');await expect(input).toHaveAccessibleName('Quantity');await expect(input).toHaveAccessibleDescription('Too large');
 await input.fill('4');expect(await page.evaluate(()=>f.submit())).toBe(true);await expect(input).not.toHaveAttribute('aria-invalid','true');await page.evaluate(()=>f.destroy());
});
test('field errors are descriptions, labels remain stable through edits and relabeling',async({page})=>{
 await page.evaluate(async()=>{const {Form,TextInput,TextArea,required}=await import('/src/ui/all.js');window.a=new TextInput({label:'Symbol',validators:[required()]});window.b=new TextArea({label:'Notes',validators:[required()]});window.f=new Form().row(a,b);f.mount('#root');f.validate();a.focus();});
 for(const name of ['Symbol','Notes']){const input=page.getByRole('textbox',{name,exact:true});await expect(input).toHaveAccessibleName(name);await expect(input).toHaveAccessibleDescription('Required');}
 await page.evaluate(()=>a.setLabel('Ticker'));await page.getByRole('textbox',{name:'Ticker',exact:true}).fill('ABC');await expect(page.getByRole('textbox',{name:'Ticker',exact:true})).not.toHaveAttribute('aria-describedby');await page.evaluate(()=>f.destroy());
});
test('text live regions opt in without emitting internal label/text roles',async({page})=>{
 await page.evaluate(async()=>{const {Panel,LabelText,ReadonlyText}=await import('/src/ui/all.js');window.p=new Panel('#root');window.s=new ReadonlyText({role:'status',text:'Loading'});p.add(s,new LabelText({text:'Failure',ariaRole:'alert'}),new LabelText({name:'plain',text:'Plain'}),new ReadonlyText({name:'read',text:'Read'}));});
 await expect(page.getByRole('status')).toHaveAttribute('aria-live','polite');await expect(page.getByRole('status')).toHaveAttribute('aria-atomic','true');await expect(page.getByRole('alert')).toHaveAttribute('aria-live','assertive');
 await expect(page.locator('[data-dui-control-id="plain"]')).not.toHaveAttribute('role');await expect(page.locator('[data-dui-control-id="read"]')).not.toHaveAttribute('role');await page.evaluate(()=>s.setText('Saved'));await expect(page.getByRole('status')).toHaveText('Saved');await page.evaluate(()=>p.destroy());
});
test('mounted Grid removes sorted editing column without stale selection or editor',async({page})=>{
 await page.evaluate(async()=>{const {Grid,gridEditors}=await import('/src/ui/experimental.js');window.g=new Grid('#root',{columns:[{id:'name',sortable:true},{id:'value',sortable:true,editor:gridEditors.number()}]});g.data.parse([{id:1,name:'B',value:0},{id:2,name:'A',value:1}]);g.setSelectedIds([1]);g.setSortModel([{columnId:'value',direction:'asc'},{columnId:'name',direction:'asc'}]);g.startEdit(1,'value');g.setColumns([{id:'name',sortable:true}]);});
 await expect(page.locator('.dui-grid__editor-host')).toHaveCount(0);await expect(page.getByRole('gridcell')).toHaveText(['A','B']);expect(await page.evaluate(()=>g.getSelectedIds())).toEqual([1]);await page.evaluate(()=>g.destroy());
});

test('same field names in different forms have independent captions and error descriptions',async({page})=>{
 await page.evaluate(async()=>{const {Panel,TextInput}=await import('/src/ui/all.js');window.p=new Panel('#root');const left=new Panel(),right=new Panel();p.add(left,right);const a=new TextInput({name:'name',label:'Customer',validators:[()=> 'Customer error']});const b=new TextInput({name:'name',label:'Vendor',validators:[()=> 'Vendor error']});left.add(a);right.add(b);a.validate();b.validate();});
 await expect(page.getByRole('textbox',{name:'Customer',exact:true})).toHaveAccessibleDescription('Customer error');await expect(page.getByRole('textbox',{name:'Vendor',exact:true})).toHaveAccessibleDescription('Vendor error');await page.evaluate(()=>p.destroy());
});
