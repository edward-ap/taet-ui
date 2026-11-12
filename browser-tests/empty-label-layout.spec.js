import {test, expect} from '@playwright/test';
const kinds=['TextInput','TextArea','NumberInput','DateInput','TimeInput','DateTimeInput','SelectInput','DropDownList','MultiSelectDropDown','CheckBox','CheckLetter','CheckButton','ToggleIconButton','Switch','RadioGroup','ColorPicker','RGBColorPicker','CMYKColorPicker','FilePicker','TrackBar','CircularSlider','ProgressBar'];
test.beforeEach(async({page})=>{page.on('pageerror',e=>{throw e});await page.goto('/browser-tests/recipes.html')});
for(const placement of ['standalone','left','top']) test('empty captions reclaim geometry: '+placement,async({page})=>{
  await page.evaluate(async({kinds,placement})=>{
    const ui=await import('/src/ui/all.js');
    window.fields=kinds.map((kind,i)=>new ui[kind]({name:'f'+i,label:i%2?'':undefined,width:300,items:[{value:'one',text:'One'}],text:'Action'}));
    if(placement==='standalone')fields.forEach(f=>f.mount('#root'));
    else {window.owner=new ui.Form({labelPosition:placement,width:340});fields.forEach(f=>owner.row(f));owner.mount('#root')}
  },{kinds,placement});
  async function shapes(){return page.evaluate(()=>fields.map(f=>{const e=f.element,l=e.querySelector('[data-dui-editor-label]'),s=getComputedStyle(e);return {kind:f.constructor.name,empty:e.classList.contains('dui-editor--no-label'),labelDisplay:getComputedStyle(l).display,display:s.display,columns:s.gridTemplateColumns,gap:s.columnGap,rowGap:s.rowGap}}))}
  for(const shape of await shapes()){expect(shape.empty,shape.kind).toBe(true);expect(shape.labelDisplay,shape.kind).toBe('none');if(shape.display.includes('grid'))expect(shape.columns.split(' ').length,shape.kind).toBe(1);expect(shape.gap,shape.kind).toBe('0px');expect(shape.rowGap,shape.kind).toBe('0px')}
  await page.evaluate(()=>fields.forEach(f=>f.setLabel('Caption')));
  for(const shape of await shapes()){expect(shape.empty,shape.kind).toBe(false);if(shape.kind==='ToggleIconButton')expect(shape.labelDisplay).toBe('none');else expect(shape.labelDisplay,shape.kind).not.toBe('none')}
  await page.evaluate(()=>fields.forEach(f=>{f.setLabelPosition('top');f.setLabel('');f.refresh()}));
  for(const shape of await shapes()){expect(shape.empty,shape.kind).toBe(true);expect(shape.labelDisplay,shape.kind).toBe('none');expect(shape.rowGap,shape.kind).toBe('0px')}
});
for(const parent of ['left','top']) test('mixed fields own their label placement in '+parent+' Form',async({page})=>{
  await page.evaluate(async parent=>{
    const {TextInput,Form}=await import('/src/ui/all.js');
    window.fields=[new TextInput({name:'inherit',label:'Inherited'}),new TextInput({name:'top',label:'Top',labelPosition:'top'}),new TextInput({name:'left',label:'Left',labelPosition:'left',labelWidth:80}),new TextInput({name:'none',ariaLabel:'No caption',value:'Ada'})];
    window.owner=new Form({labelPosition:parent,width:400});fields.forEach(f=>owner.row(f));owner.mount('#root');
  },parent);
  const modes=await page.evaluate(()=>fields.map(f=>getComputedStyle(f.element).gridTemplateColumns.split(' ').length));
  expect(modes).toEqual([parent==='top'?1:2,1,2,1]);
  await page.evaluate(()=>{fields[1].setLabel('');fields[2].setLabel('');});
  expect(await page.evaluate(()=>fields.slice(1,3).map(f=>getComputedStyle(f.element).gridTemplateColumns.split(' ').length))).toEqual([1,1]);
  await page.evaluate(()=>{fields[1].setLabel('Restored top');fields[2].setLabel('Restored left');});
  expect(await page.evaluate(()=>fields.slice(1,3).map(f=>getComputedStyle(f.element).gridTemplateColumns.split(' ').length))).toEqual([1,2]);
  expect(await page.evaluate(()=>owner.value.get().none)).toBe('Ada');
});
test('required empty-caption field has no ghost asterisk or empty caption track',async({page})=>{
 await page.evaluate(async()=>{const {TextInput}=await import('/src/ui/all.js');window.field=new TextInput('#root',{name:'customer',required:true,width:240,ariaLabel:'Customer'});});
 const input=page.getByRole('textbox',{name:'Customer',exact:true});await expect(input).toHaveAttribute('required','');
 expect(await input.evaluate(e=>e.checkValidity())).toBe(false);
 expect(await page.evaluate(()=>{const e=field.element;return e.getBoundingClientRect().height-e.querySelector('input').getBoundingClientRect().height})).toBe(0);
 await input.fill('Ada');expect(await input.evaluate(e=>e.checkValidity())).toBe(true);
 await page.evaluate(()=>field.setLabel('Customer'));await expect(input).toBeVisible();
 await page.evaluate(()=>field.setLabel(''));await expect(input).toBeVisible();
});
