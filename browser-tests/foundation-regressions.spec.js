import {test,expect} from '@playwright/test';
test.describe.configure({mode:'parallel'});
test.beforeEach(async({page})=>{await page.goto('/browser-tests/recipes.html');});

test('mounted row and virtual columns forget removed fields, empty rows and names',async({page})=>{
 const result=await page.evaluate(async()=>{
  const {Form,TextInput}=await import('/src/components/index.js');
  const a=new TextInput({name:'a',value:'Ada'}),b=new TextInput({name:'b',value:'B'});
  const form=new Form('#root').row(a).columns(Form.column(b));form.remove(a);b.destroy();
  const empty={values:form.value.get(),rows:form.element.children.length,fields:form.getFields().length};
  const replacement=new TextInput({name:'a',value:'new'});form.row(replacement);
  form.value.set({a:'updated',b:'ignored'});form.validate();form.reset();const text=replacement.getFocusElement().value;
  form.destroy();return {empty,text,destroyed:replacement.destroyed,dom:document.querySelector('#root').childElementCount};
 });
 expect(result).toEqual({empty:{values:{},rows:0,fields:0},text:'updated',destroyed:true,dom:0});
});

test('failed mounted attach is atomic for duplicate names and prototype names work',async({page})=>{
 const result=await page.evaluate(async()=>{
  const {Panel,TextInput}=await import('/src/components/index.js');
  const p=new Panel('#root'),a=new TextInput({name:'same'}),b=new TextInput({name:'same'});p.add(a);
  let error='';try{p.add(b);}catch(e){error=e.message;}
  const atomic={count:p.getItems().length,parent:b.parent,mounted:b.mounted,element:b.element};
  const proto=new TextInput({name:'constructor'});p.add(proto);const registered=p.getItem('constructor')===proto;
  p.destroy();b.destroy();return {atomic,error,registered};
 });
 expect(result.error).toContain('Duplicate');expect(result.atomic).toEqual({count:1,parent:null,mounted:false,element:null});expect(result.registered).toBe(true);
});

test('mount callback teardown destroys a pending child without orphan DOM',async({page})=>{
 const result=await page.evaluate(async()=>{
  const {Panel}=await import('/src/components/index.js');const {BaseControl}=await import('/src/foundation/index.js');
  const owner=new Panel('#root');class Child extends BaseControl{createElement(){const el=super.createElement();owner.destroy();return el;}}
  const child=new Child();const attached=owner.attach(child);return {attached,destroyed:child.destroyed,mounted:child.mounted,dom:document.querySelector('#root').childElementCount};
 });
 expect(result).toEqual({attached:null,destroyed:true,mounted:false,dom:0});
});

test('real Form submit may destroy its screen without late event errors',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.evaluate(async()=>{const {Panel,Form,TextInput,Button}=await import('/src/components/index.js');const form=new Form({onSubmit(){screen.destroy();}}).row(new TextInput({name:'name',value:'Ada'}));form.row(new Button({text:'Save',onClick:()=>form.submit()}));const screen=new Panel('#root').add(form);});
 await page.getByRole('button',{name:'Save',exact:true}).click();await expect(page.locator('#root')).toBeEmpty();expect(errors).toEqual([]);
});

test('ShortcutManager in real inputs respects preventDefault, IME and editor opt-in',async({page})=>{
 const result=await page.evaluate(async()=>{
  const {CommandRegistry,ShortcutManager}=await import('/src/foundation/index.js');const {TextInput}=await import('/src/components/index.js');
  const commands=new CommandRegistry();let calls=0;commands.register('save',{run(){calls++;}});
  const field=new TextInput('#root',{label:'Name',value:'Ada'});const keys=new ShortcutManager({commands});keys.bind('save','Ctrl+S');
  const dispatch=options=>field.getFocusElement().dispatchEvent(new KeyboardEvent('keydown',{key:'s',ctrlKey:true,bubbles:true,cancelable:true,...options}));
  dispatch({});dispatch({isComposing:true});keys.bind('save','Ctrl+S',{allowInTextInput:true});dispatch({isComposing:true});
  const prevented=new KeyboardEvent('keydown',{key:'s',ctrlKey:true,bubbles:true,cancelable:true});prevented.preventDefault();field.getFocusElement().dispatchEvent(prevented);
  const before=calls;dispatch({});field.destroy();keys.destroy();commands.destroy();return {before,calls};
 });
 expect(result).toEqual({before:0,calls:1});
});
