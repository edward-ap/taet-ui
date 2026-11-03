import {test,expect} from '@playwright/test';
test('Form row and columns can close from child mount events without later work',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/browser-tests/recipes.html');
 const results=await page.evaluate(async()=>{
  const {Form,TextInput}=await import('/src/ui/all.js');const host=document.querySelector('#root');const results=[];
  for(const layout of ['row','columns'])for(const phase of ['beforeChildAdd','childAdd']){
   const form=new Form(),a=new TextInput({name:'a'}),b=new TextInput({name:'b'});let calls=0;
   if(layout==='row')form.row(a,b);else form.columns([a],[b]);
   form.events.on(phase,()=>{calls++;form.destroy();});form.mount(host);
   results.push({closed:form.destroyed&&a.destroyed&&b.destroyed,calls,dom:host.childElementCount});
  }return results;
 });expect(results).toEqual(Array.from({length:4},()=>({closed:true,calls:1,dom:0})));expect(errors).toEqual([]);
});
test('reentrant attach rejection leaves only the accepted control and no transient DOM',async({page})=>{
 await page.goto('/browser-tests/recipes.html');
 const result=await page.evaluate(async()=>{
  const {Panel,BaseControl}=await import('/src/ui/all.js');const owner=new Panel('#root');let accepted,error;
  class ClaimKey extends BaseControl{mount(host){super.mount(host);accepted=new BaseControl({name:'same'});owner.add(accepted);return this;}}
  const child=new ClaimKey({name:'same'});try{owner.attach(child);}catch(e){error=e.message;}
  const result={rejected:/Duplicate/.test(error??''),destroyed:child.destroyed,owned:owner.getItems().length,dom:owner.element.childElementCount,accepted:owner.getItem('same')===accepted};owner.destroy();return result;
 });expect(result).toEqual({rejected:true,destroyed:true,owned:1,dom:1,accepted:true});
});
test('Form batch callback may remove the next field without a stale write',async({page})=>{
 await page.goto('/browser-tests/recipes.html');
 const result=await page.evaluate(async()=>{
  const {Form,TextInput}=await import('/src/ui/all.js');let form;
  const first=new TextInput({name:'first',onChange(){form.remove('next');}}),next=new TextInput({name:'next'});form=new Form('#root').row(first,next);
  form.value.set({first:'kept',next:'removed'});const result={values:form.value.get(),removed:next.destroyed,dom:form.element.querySelectorAll('input').length};form.destroy();return result;
 });expect(result).toEqual({values:{first:'kept'},removed:true,dom:1});
});

test('readonly state callback can close its Form without a late event or focus error',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/browser-tests/recipes.html');
 const result=await page.evaluate(async()=>{
  const {Form,TextInput}=await import('/src/ui/all.js');const a=new TextInput({name:'a'}),b=new TextInput({name:'b'}),form=new Form('#root').row(a,b);let late=0;
  a.focus();a.events.on('stateChange',()=>form.destroy());form.events.on('readOnlyChange',()=>late++);form.setReadOnly(true);
  return {closed:form.destroyed&&a.destroyed&&b.destroyed,late,dom:document.querySelector('#root').childElementCount};
 });expect(result).toEqual({closed:true,late:0,dom:0});expect(errors).toEqual([]);
});
