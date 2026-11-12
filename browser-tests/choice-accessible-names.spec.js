import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => { await page.goto('/browser-tests/recipes.html'); });
const mount = (page, kind, options = {}) => page.evaluate(async ({kind,options}) => {
  window.field?.destroy();
  const ui = await import('/src/ui/inputs.js');
  const C = kind === 'CheckButton' ? (await import('/src/ui/CheckButton.js')).CheckButton : ui[kind];
  window.field = new C('#root', {name:'modelKey',label:'Caption', ...options});
}, {kind,options});

for (const kind of ['CheckBox','Switch','CheckLetter','CheckButton']) {
  const role = kind === 'CheckButton' ? 'button' : 'checkbox';
  const name = kind === 'CheckLetter' ? 'Caption. A. Enabled' : 'Caption Enabled';
  test(`${kind} caption/text remain separate from value and errors`, async ({page}) => {
    await mount(page,kind,{text:'Enabled',letter:'A'});
    const input=page.locator('#root').getByRole(role);
    await expect(input).toHaveAccessibleName(name);
    await page.evaluate(()=> {field.validators=[()=> 'Failure details'];field.validate();});
    await expect(input).toHaveAccessibleName(name);
    await expect(input).toHaveAccessibleDescription('Failure details');
    await page.evaluate(()=>{field.setLabel('Renamed');field.value.set(true);field.refresh();});
    await expect(input).toHaveAccessibleName(name.replace('Caption','Renamed'));
    await page.evaluate(()=>field.setText('Updated'));
    await expect(input).toHaveAccessibleName(name.replace('Caption','Renamed').replace('Enabled','Updated'));
    await page.evaluate(()=> {field.setLabel('');field.setText('');if(field.setLetter)field.setLetter('');field.clearValidation();});
    await expect(input).toHaveAccessibleName('');
    await page.evaluate(()=>field.setLabel('Restored'));
    await expect(input).toHaveAccessibleName('Restored');
  });
}
for (const kind of ['SelectInput','DropDownList','MultiSelectDropDown']) {
  test(`${kind} exact combobox name through rename/clear/validation`, async ({page}) => {
    await mount(page,kind);
    const input=page.getByRole('combobox');
    await expect(input).toHaveAccessibleName('Caption');
    await page.evaluate(()=> {field.data.parse([{id:'a',text:'Alpha'}]);field.validators=[()=> 'Invalid choice'];field.validate();field.setLabel('Renamed');field.refresh();});
    await expect(input).toHaveAccessibleName('Renamed');
    await expect(input).toHaveAccessibleDescription('Invalid choice');
    await page.evaluate(()=>field.setLabel(''));
    await expect(input).toHaveAccessibleName(kind==='SelectInput'?'':'modelKey');
    await page.evaluate(()=>field.setLabel('Restored'));
    await expect(input).toHaveAccessibleName('Restored');
  });
}
for (const kind of ['RadioGroup','RadioLetter']) {
  test(`${kind} group caption and item names stay independent`, async ({page}) => {
    await mount(page,kind,{items:[{value:'a',text:'Alpha',letter:'A'},{value:'b',text:'Beta',letter:'B'}]});
    const group=page.getByRole('radiogroup');
    await expect(group).toHaveAccessibleName('Caption');
    await expect(page.getByRole('radio',{name:kind==='RadioLetter'?'A. Alpha':'Alpha',exact:true})).toHaveCount(1);
    await page.evaluate(()=>{field.setLabel('Renamed');field.validators=[()=> 'Choose one'];field.validate();field.refresh();});
    await expect(group).toHaveAccessibleName('Renamed');await expect(group).toHaveAccessibleDescription('Choose one');
    await page.evaluate(()=>field.setLabel(''));await expect(group).toHaveAccessibleName('');
    await page.evaluate(()=>field.setLabel('Restored'));await expect(group).toHaveAccessibleName('Restored');
  });
}
test('CheckButton equal model names have distinct name references',async({page})=>{
  await page.evaluate(async()=>{const {CheckButton}=await import('/src/ui/CheckButton.js');window.a=new CheckButton('#root',{name:'same',label:'First',text:'One'});window.b=new CheckButton('#root',{name:'same',label:'Second',text:'Two'});});
  await expect(page.getByRole('button',{name:'First One',exact:true})).toHaveCount(1);
  await expect(page.getByRole('button',{name:'Second Two',exact:true})).toHaveCount(1);
});
test('OptionList keeps explicit label and item names across refresh and selection',async({page})=>{
  await mount(page,'OptionList');await page.evaluate(()=>{field.data.parse([{id:1,text:'Alpha'},{id:2,text:'Beta'}]);field.value.set(1);field.refresh();});
  await expect(page.getByRole('listbox')).toHaveAccessibleName('Caption');
  await expect(page.getByRole('option',{name:'Alpha',exact:true})).toHaveCount(1);
});
for (const kind of ['DropDownList','MultiSelectDropDown']) {
  test(`${kind} popup list and search retain contextual names with empty search hint`,async({page})=>{
    await mount(page,kind,{searchable:true,searchPlaceholder:''});
    await page.evaluate(()=>{field.data.parse([{id:1,text:'Alpha'}]);field.openPopup();});
    await expect(page.getByRole('listbox')).toHaveAccessibleName('Caption');
    await expect(page.getByRole('textbox')).toHaveAccessibleName('Search: Caption');
    await page.evaluate(()=>field.setLabel('Renamed'));
    await expect(page.getByRole('textbox')).toHaveAccessibleName('Search: Renamed');
    await expect(page.getByRole('listbox')).toHaveAccessibleName('Renamed');
    await page.evaluate(()=>field.closePopup());
  });
}


test('CheckLetter empty caption stays unnamed while invalid and focused', async ({page}) => {
  await mount(page, 'CheckLetter', {label: '', text: '', letter: ''});
  const input = page.getByRole('checkbox');
  await page.evaluate(() => {field.validators = [() => 'Failure details'];field.validate();});
  await input.focus();
  await expect(input).toBeFocused();
  await expect(input).toHaveAccessibleName('');
  await expect(input).toHaveAccessibleDescription('Failure details');
  await page.evaluate(() => {field.setLabel('Restored');field.setLetter('A');field.setText('Enabled');});
  await expect(input).toHaveAccessibleName('Restored. A. Enabled');
  await page.evaluate(() => {field.setLabel('');field.setLetter('');field.setText('');field.refresh();});
  await input.focus();
  await expect(input).toBeFocused();
  await expect(input).toHaveAccessibleName('');
  await expect(input).toHaveAccessibleDescription('Failure details');
});


for (const kind of ['SelectInput', 'DropDownList', 'MultiSelectDropDown']) {
  for (const key of ['name', 'id']) {
    test(`${kind} popup references stay instance-local with repeated ${key} in separate Forms`, async ({page}) => {
      await page.evaluate(async ({kind, key}) => {
        const ui = await import('/src/ui/inputs.js');
        const {Form} = await import('/src/ui/Form.js');
        window.choiceOwners = [0, 1].map(index => new Form('#root', {name: `owner${index}`}));
        window.choices = choiceOwners.map((owner, index) => {
          const field = new ui[kind]({[key]: 'repeated', label: `Choice ${index}`, searchable: true});
          field.data.parse([{id: 1, text: 'Alpha'}, {id: 2, text: 'Beta'}]);
          owner.add(field);
          return field;
        });
      }, {kind, key});
      const ids = await page.getByRole('combobox').evaluateAll(nodes => nodes.map(node => node.getAttribute('aria-controls')));
      expect(ids[0]).toBeTruthy();
      expect(ids[1]).toBeTruthy();
      expect(ids[0]).not.toBe(ids[1]);
      const assertReference = async index => {
        expect(await page.evaluate(index => {
          const field = choices[index];
          const id = field._input.getAttribute('aria-controls');
          return {
            exact: document.getElementById(id) === field._listElement,
            matches: [...document.querySelectorAll('[id]')].filter(node => node.id === id).length,
            role: document.getElementById(id)?.getAttribute('role')
          };
        }, index)).toEqual({exact: true, matches: 1, role: 'listbox'});
        await expect(page.getByRole('combobox', {name: `Choice ${index}`, exact: true})).toHaveAttribute('aria-controls', ids[index]);
      };
      for (const index of [0, 1]) {
        await page.evaluate(index => choices[index].openPopup(), index);
        await assertReference(index);
        await page.getByRole('textbox', {name: `Search: Choice ${index}`, exact: true}).fill('Beta');
        await expect(page.getByRole('option', {name: 'Beta', exact: true})).toHaveCount(1);
        await assertReference(index);
        await page.evaluate(index => {choices[index].refresh();choices[index].closePopup();choices[index].openPopup();}, index);
        await assertReference(index);
        await page.evaluate(index => choices[index].closePopup(), index);
      }
      await assertReference(0);
      await assertReference(1);
      await page.evaluate(() => choiceOwners[0].destroy());
      expect(await page.evaluate(id => document.getElementById(id) === null, ids[0])).toBe(true);
      await page.evaluate(() => {choices[1].openPopup();choices[1].setFilter('Alpha');choices[1].refresh();});
      await assertReference(1);
      await expect(page.getByRole('option', {name: 'Alpha', exact: true})).toHaveCount(1);
      await page.evaluate(() => choiceOwners[1].destroy());
      expect(await page.evaluate(id => document.getElementById(id) === null, ids[1])).toBe(true);
    });
  }
}
