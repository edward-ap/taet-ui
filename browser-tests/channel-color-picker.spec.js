import {test,expect} from '@playwright/test';
for(const name of ['ColorPicker','RGBColorPicker','CMYKColorPicker']) {
 test(`${name} accepts typed HEX with Enter, restores focus and honors invalid input/veto`,async({page})=>{
  await page.goto('/browser-tests/recipes.html');
  await page.evaluate(async name=>{const ui=await import('/src/ui/all.js');window.field=new ui[name]('#root',{label:'Color',value:'#123456'});window.changes=[];field.events.on('change',e=>changes.push(e.newValue));},name);
  await page.getByRole('button',{name:'Color',exact:true}).click();
  await page.getByRole('textbox',{name:'Hex color'}).fill('#ff8800');
  await page.getByRole('textbox',{name:'Hex color'}).press('Enter');
  await expect(page.getByRole('dialog')).toBeHidden();expect(await page.evaluate(()=>field.value.get())).toBe('#ff8800');
  await expect(page.getByRole('button',{name:'Color',exact:true})).toBeFocused();
  await page.getByRole('button',{name:'Color',exact:true}).click();
  await page.getByRole('textbox',{name:'Hex color'}).fill('wrong');await page.getByRole('textbox',{name:'Hex color'}).press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.evaluate(()=>field.events.on('beforeChange',e=>e.cancel=true));
  await page.getByRole('textbox',{name:'Hex color'}).fill('#ffffff');await page.getByRole('textbox',{name:'Hex color'}).press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();await page.keyboard.press('Escape');
  expect(await page.evaluate(()=>field.value.get())).toBe('#ff8800');await page.evaluate(()=>field.destroy());
 });
}
for(const name of ['RGBColorPicker','CMYKColorPicker']) test(`${name} owns vertical channel drafts, theme and lifecycle`,async({page})=>{
 await page.goto('/browser-tests/recipes.html');
 await page.evaluate(async name=>{const ui=await import('/src/ui/all.js');window.field=new ui[name]('#root',{label:'Color',value:'#567890'});document.body.className='dui-theme-dark-blue';},name);
 await page.getByRole('button',{name:'Color',exact:true}).click();
 const sliders=page.getByRole('slider');await expect(sliders).toHaveCount(name==='RGBColorPicker'?3:4);
 await expect(sliders.first()).toHaveAttribute('aria-orientation','vertical');
 await sliders.first().focus();await page.keyboard.press('Home');
 expect(await page.evaluate(()=>field.value.get())).toBe('#567890');
 await expect(page.locator('.dui-channel-color__panel')).toHaveCSS('background-color','rgb(24, 35, 49)');
 await page.screenshot({path:`test-results/${name}.png`});
 await page.keyboard.press('Escape');expect(await page.evaluate(()=>field.value.get())).toBe('#567890');
 await page.getByRole('button',{name:'Color',exact:true}).click();await sliders.first().focus();await page.keyboard.press('End');await page.keyboard.press('Enter');
 await expect(page.getByRole('dialog')).toBeHidden();expect(await page.evaluate(()=>field.value.get())).not.toBe('#567890');
 await page.getByRole('button',{name:'Color',exact:true}).click();await page.evaluate(()=>field.destroy());await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('channel draft reacts to API writes, readOnly and destruction during accept',async({page})=>{
 await page.goto('/browser-tests/recipes.html');
 await page.evaluate(async()=>{const {RGBColorPicker}=await import('/src/ui/all.js');window.field=new RGBColorPicker('#root',{label:'Color',value:'#123456'});});
 await page.getByRole('button',{name:'Color',exact:true}).click();
 await page.getByRole('textbox',{name:'Hex color'}).fill('#ffffff');
 await page.evaluate(()=>field.value.set('#ff0000',{silent:true}));
 await expect(page.getByRole('textbox',{name:'Hex color'})).toHaveValue('#ff0000');
 await page.evaluate(()=>field.setReadOnly(true));await expect(page.getByRole('dialog')).toBeHidden();
 await page.evaluate(()=>field.setReadOnly(false));await page.getByRole('button',{name:'Color',exact:true}).click();
 await page.getByRole('textbox',{name:'Hex color'}).fill('#00ff00');
 await page.evaluate(()=>field.events.on('change',()=>field.destroy()));
 await page.getByRole('textbox',{name:'Hex color'}).press('Enter');await expect(page.getByRole('dialog')).toHaveCount(0);
});
