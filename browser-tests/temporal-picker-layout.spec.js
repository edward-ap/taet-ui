import {test, expect} from '@playwright/test';
import {pressNativeTab} from './keyboard-helpers.js';
const cases = [
  ['DateInput', 'date', '2026-11-12', 'calendar', 'Open calendar', 128],
  ['TimeInput', 'time', '12:34', 'clock', 'Focus time', 156],
  ['DateTimeInput', 'dateTime', '2026-11-12T12:34', 'calendar', 'Open date and time picker', 156]
];
const popup = page => page.locator('.dui-date-time-picker:visible, .dui-time-picker:visible');
test.beforeEach(async ({page}) => {
  page.on('pageerror', error => {throw error;});
  await page.goto('/browser-tests/recipes.html');
});
async function checkLayout(page, kind, icon, width) {
  const group = page.locator('.dui-date-time-input__group');
  await expect(group.locator('.dui-date-time-input__icon')).toHaveCount(0);
  const shape = await group.evaluate(async (group, {icon}) => {
    const {createIcon} = await import('/src/ui/Icon.js');
    const input = group.querySelector('input'), button = group.querySelector('.dui-date-time-input__button');
    const g = group.getBoundingClientRect(), i = input.getBoundingClientRect(), b = button.getBoundingClientRect();
    const end = group.lastElementChild.getBoundingClientRect();
    return {first: group.firstElementChild === input, glyph: button.firstElementChild.outerHTML === createIcon(icon).outerHTML,
      left: i.left-g.left, gap: b.left-i.right, width:g.width, inputWidth:i.width, buttonWidth:b.width,
      overflow:end.right-g.right, height:g.height, inputHeight:i.height, buttonHeight:b.height};
  }, {icon});
  expect(shape.first).toBe(true); expect(shape.glyph).toBe(true);
  expect(Math.abs(shape.left)).toBeLessThan(1); expect(Math.abs(shape.gap)).toBeLessThan(1);
  expect(shape.buttonWidth).toBe(24); expect(shape.overflow).toBeLessThan(1);
  expect(shape.width-shape.inputWidth).toBeCloseTo(kind === 'TimeInput' ? 72 : 24, 0);
  expect(shape.width).toBeLessThanOrEqual(width+1);
  expect(shape.inputWidth).toBeGreaterThan(kind === 'TimeInput' ? 70 : 95);
  expect(shape.buttonHeight).toBe(shape.inputHeight);
}
for (const [kind, editor, value, icon, name, width] of cases) {
  test(`${kind} compact Form has one trailing picker, correct glyph and native focus`, async ({page}) => {
    await page.evaluate(async ({kind,value,width}) => {
      const ui=await import('/src/ui/all.js');
      window.field=new ui[kind]({name:'value',label:'Appointment',labelPosition:'top',value,width});
      window.owner=new ui.Form({labelPosition:'top',width}).row(field); owner.mount('#root');
    }, {kind,value,width});
    const input=page.getByRole('textbox',{name:'Appointment',exact:true});
    const button=page.getByRole('button',{name,exact:true});
    await checkLayout(page,kind,icon,width);
    await expect(button.locator('svg')).toHaveAttribute('aria-hidden','true');
    await expect(page.locator('.dui-date-time-input__group button')).toHaveCount(kind==='TimeInput'?3:1);
    await input.focus(); await pressNativeTab(page); await expect(button).toBeFocused();
    await button.press('Enter'); await expect(popup(page)).toHaveCount(1);
    await expect(button).toHaveAttribute('aria-expanded','true');
    await page.keyboard.press('Escape'); await expect(popup(page)).toHaveCount(0); await expect(input).toBeFocused();
    await input.press('Alt+ArrowDown'); await expect(popup(page)).toHaveCount(1);
    await page.keyboard.press('Escape'); await expect(input).toBeFocused();
    await button.click(); await expect(popup(page)).toHaveCount(1);
    await page.keyboard.press('Escape');
    for(const mode of ['readonly','disabled']) {
      await page.evaluate(mode=>mode==='readonly'?field.setReadOnly(true):field.disable(),mode);
      await expect(button).toBeDisabled();
      if(mode==='readonly') {await input.press('Alt+ArrowDown'); await expect(popup(page)).toHaveCount(0);}
      await page.evaluate(()=>{field.setReadOnly(false);field.enable();});
    }
    expect(await page.evaluate(()=>owner.value.get().value)).toBe(value);
    await page.evaluate(()=>owner.destroy()); await expect(page.locator('#root')).toBeEmpty();
  });
  for (const facade of ['Grid','TreeGrid']) test(`${facade} narrow ${kind} retains input space and popup keyboard`, async ({page}) => {
    await page.evaluate(async ({facade,editor,value,width})=>{
      const ui=await import('/src/ui/grid-api.js');
      window.owner=new ui[facade]('#root',{width:440,height:220,rowHeight:22,treeColumnId:'label',columns:[
        {id:'label',width:100,readOnly:true},{id:'value',width,editor:ui.gridEditors[editor]()},{id:'tail',width:90,editor:ui.gridEditors.text()}]});
      owner.data.parse([{id:1,parentId:null,label:'Row',value,tail:'Tail'}]);owner.startEdit(1,'value');
    },{facade,editor,value,width});
    const input=page.locator('.dui-grid__editor-host input');
    const button=page.getByRole('button',{name,exact:true});
    await expect(input).toBeFocused(); await checkLayout(page,kind,icon,width);
    await input.press('Alt+ArrowDown'); await expect(popup(page)).toHaveCount(1);
    await page.keyboard.press('Escape'); await expect(popup(page)).toHaveCount(0); await expect(input).toBeFocused();
    await button.click(); await expect(popup(page)).toHaveCount(1); await page.keyboard.press('Escape');
    await input.press('Enter'); await expect(page.locator('.dui-grid__editor-host')).toHaveCount(0);
    expect(await page.evaluate(()=>owner.data.get(1).value)).toBe(value);
    await page.evaluate(()=>owner.destroy()); await expect(popup(page)).toHaveCount(0);
  });
}

