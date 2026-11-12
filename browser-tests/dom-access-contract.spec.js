import { test, expect } from '@playwright/test';

// This is an escape-hatch/lifecycle contract, not a frozen DOM layout snapshot.
const targets = {
  TextInput: 'input', NumberInput: 'input', TextArea: 'textarea',
  DateInput: 'input', TimeInput: 'input', DateTimeInput: 'input',
  CheckBox: 'input[type=checkbox]', Switch: 'input[type=checkbox]', CheckLetter: 'input[type=checkbox]',
  RadioGroup: '[role=radiogroup]', RadioLetter: '[role=radiogroup]',
  SelectInput: 'select', DropDownList: '[role=combobox]', MultiSelectDropDown: '[role=combobox]',
  FilePicker: 'input[type=text]', TrackBar: 'input[type=range]', CircularSlider: 'input[type=range]',
  ColorPicker: 'button', RGBColorPicker: 'button', CMYKColorPicker: 'button',
  ProgressBar: '[data-dui-control-id]', StepProgressBar: '[role=list]', OptionList: '[role=listbox]',
  Button: 'button', CheckButton: 'button'
};

test.beforeEach(async ({page}) => {
  page.on('pageerror', error => { throw error; });
  await page.goto('/browser-tests/recipes.html');
});
test.afterEach(async ({page}) => { await page.evaluate(() => { window.controls?.forEach(c => c.destroy()); }); });

test('contract matrix covers every concrete inputs export', async ({page}) => {
  const names = await page.evaluate(async () => Object.keys(await import('/src/ui/inputs.js')).filter(n => !['EditorControl','normalizeHexColor'].includes(n)).sort());
  expect(names).toEqual(Object.keys(targets).filter(n => !['Button','CheckButton'].includes(n)).sort());
});

for (const [kind, selector] of Object.entries(targets)) {
  test(`${kind}: root and primary target survive public lifecycle operations`, async ({page}) => {
    const initial = await page.evaluate(async kind => {
      const ui = await import('/src/ui/all.js');
      const c = new ui[kind]({name:'modelKey', id:'controlKey', label:'Caption', text:'Action', ...(kind === 'StepProgressBar' ? {tabIndex:0,interactive:true,items:['One','Two']} : {})});
      window.controls = [c]; window.field = c;
      const before = [c.element, c.getFocusElement(), c.canFocus(), c.focus()];
      c.mount('#root');
      return before;
    }, kind);
    expect(initial).toEqual([null,null,false,false]);
    const inspect = () => page.evaluate(selector => {
      const c = window.field, root = c.element, target = c.getFocusElement();
      return {rootConnected:root.isConnected, marker:root.dataset.duiControlId,
        targetConnected:target.isConnected, contained:root === target || root.contains(target),
        matches:target.matches(selector), belongs:target.closest('[data-dui-control-id]') === root,
        focus:c.canFocus() ? c.focus() && document.activeElement === target : null};
    }, selector);
    const expected = {rootConnected:true, marker:'controlKey', targetConnected:true, contained:true, matches:true, belongs:true,
      focus:kind === 'ProgressBar' ? null : true};
    expect(await inspect()).toEqual(expected);
    expect(await page.evaluate(() => {
      field.disable(); const disabled = [field.canFocus(),field.focus(),!!field.getFocusElement()];
      field.enable(); field.hide(); const hidden = [field.canFocus(),field.focus(),!!field.getFocusElement()];
      field.show(); field.refresh(); field.setLabel?.('Renamed');
      return {disabled,hidden};
    })).toEqual({disabled:[false,false,true],hidden:[false,false,true]});
    expect(await inspect()).toEqual(expected);
    expect(await page.evaluate(() => {
      const root = field.element; field.destroy();
      return [field.element,field.getFocusElement(),field.canFocus(),field.focus(),root.isConnected];
    })).toEqual([null,null,false,false,false]);
  });
}

test('owner-local name/id lookup is separate from DOM id and accessible label', async ({page}) => {
  const result = await page.evaluate(async () => {
    const {Panel,TextInput,Button} = await import('/src/ui/all.js');
    const left = new Panel('#root'), right = new Panel('#root'); window.controls=[left,right];
    const a = new TextInput({name:'customer',id:'field',label:'Left'}), b = new TextInput({name:'customer',id:'field',label:'Right'});
    left.add(a); right.add(b);
    const button = new Button({name:'save',text:'Save'}); left.add(button);
    a.setLabel('Renamed');
    let duplicateRejected=false; const duplicate = new TextInput({name:'customer'});
    try {left.add(duplicate);} catch {duplicateRejected=true;} finally {duplicate.destroy();}
    return {lookup:left.getItem('customer')===a && left.getItem('field')===a && right.getItem('customer')===b,
      button:left.getItem('save')===button && button.element===button.getFocusElement(),
      markers:[a.element.dataset.duiControlId,b.element.dataset.duiControlId],
      noRootHtmlId:!a.element.id && !b.element.id,duplicateRejected,
      scoped:left.element.querySelectorAll('[data-dui-control-id="field"]').length};
  });
  expect(result).toEqual({lookup:true,button:true,markers:['field','field'],noRootHtmlId:true,duplicateRejected:true,scoped:1});
  await expect(page.getByRole('textbox',{name:'Renamed',exact:true})).toHaveCount(1);
  await expect(page.getByRole('button',{name:'Save',exact:true})).toHaveCount(1);
});

test('container primary target never borrows a nested child focus target', async ({page}) => {
  expect(await page.evaluate(async () => {
    const {Panel,TextInput} = await import('/src/ui/all.js');
    const owner = new Panel('#root'), child = new TextInput({name:'nested'}); window.controls=[owner];
    owner.add(child);
    return [owner.getFocusElement()===owner.element,owner.canFocus(),child.getFocusElement()!==owner.getFocusElement()];
  })).toEqual([true,false,true]);
});

for (const kind of ['SelectInput','DropDownList','MultiSelectDropDown']) {
  test(`${kind}: portal is resolved by ARIA relationship, not root ancestry or model name`, async ({page}) => {
    await page.evaluate(async kind => {
      const ui=await import('/src/ui/all.js');
      const a=new ui[kind]('#root',{name:'same',label:'First',searchable:true});
      const b=new ui[kind]('#root',{name:'same',label:'Second',searchable:true});
      window.controls=[a,b];window.field=a;
      for(const c of controls)c.data.parse([{id:'a',text:'Alpha'}]);
      a.openPopup();
    },kind);
    const inspect = () => page.evaluate(() => {
      const trigger=field.getFocusElement(),id=trigger.getAttribute('aria-controls'),popup=trigger.ownerDocument.getElementById(id);
      return {expanded:trigger.getAttribute('aria-expanded'),exists:!!popup,role:popup?.getAttribute('role'),
        outside:!field.element.contains(popup),unique:document.querySelectorAll(`[id="${id}"]`).length};
    });
    expect(await inspect()).toEqual({expanded:'true',exists:true,role:'listbox',outside:true,unique:1});
    await page.evaluate(() => {field.closePopup();field.refresh();field.openPopup();});
    expect(await inspect()).toEqual({expanded:'true',exists:true,role:'listbox',outside:true,unique:1});
    const ids=await page.evaluate(() => {const first=field.getFocusElement().getAttribute('aria-controls');field.closePopup();field=controls[1];field.openPopup();return [first,field.getFocusElement().getAttribute('aria-controls')];});
    expect(ids[0]).not.toBe(ids[1]);
    expect(await inspect()).toEqual({expanded:'true',exists:true,role:'listbox',outside:true,unique:1});
    expect(await page.evaluate(() => {const id=field.getFocusElement().getAttribute('aria-controls');field.destroy();return document.getElementById(id)===null;})).toBe(true);
  });
}

test('checked basic form recipe exposes named field and button through its owner', async ({page}) => {
  await page.evaluate(async () => {
    const {createBasicForm}=await import('/examples/ai-recipes/01-basic-form.js');
    const owner=createBasicForm('#root',value=>window.saved=value);window.controls=[owner];
    const form=owner.getItem('customerForm');window.field=form.getItem('firstName');
    window.save=form.getItem('saveCustomer');
    field.value.set('Ada');
    if(field.getFocusElement().value!=='Ada' || save.getFocusElement()!==save.element)throw new Error('Recipe DOM contract');
  });
  await page.getByRole('button',{name:'Save',exact:true}).click();
  expect(await page.evaluate(()=>window.saved)).toEqual({firstName:'Ada'});
});

test('native value assignment is not a model setter',async({page})=>{
  expect(await page.evaluate(async()=>{
    const {TextInput}=await import('/src/ui/inputs.js');
    const field=new TextInput('#root',{value:'Ada'});window.controls=[field];
    field.getFocusElement().value='DOM only'; const model=field.value.get();
    field.value.set('Grace');return [model,field.value.get(),field.getFocusElement().value];
  })).toEqual(['Ada','Grace','Grace']);
});
