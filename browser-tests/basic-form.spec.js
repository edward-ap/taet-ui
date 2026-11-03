import {test,expect} from '@playwright/test';
test('portable quickstart edits and removes fields without stale logical values',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/examples/basic-form/index.html');
 await page.getByRole('textbox',{name:'Customer',exact:true}).fill('Grace');
 await page.getByRole('button',{name:'Toggle email',exact:true}).click();
 await page.getByRole('textbox',{name:'Email',exact:true}).fill('grace@example.test');
 expect(await page.evaluate(()=>window.example.form.value.get())).toMatchObject({name:'Grace',email:'grace@example.test'});
 await page.getByRole('button',{name:'Toggle email',exact:true}).click();
 expect(await page.evaluate(()=>Object.hasOwn(window.example.form.value.get(),'email'))).toBe(false);
 await page.getByRole('button',{name:'Toggle readonly',exact:true}).click();
 await expect(page.getByRole('textbox',{name:'Customer',exact:true})).toHaveAttribute('readonly','');
 expect(await page.evaluate(()=>{window.example.load({name:'Ada',active:false});return window.example.form.isDirty();})).toBe(true);
 await page.evaluate(()=>window.example.form.setCleanValue(window.example.form.value.get()));
 expect(await page.evaluate(()=>window.example.form.isDirty())).toBe(false);
 await page.evaluate(()=>window.example.destroy());
 await expect(page.locator('#app')).toBeEmpty();expect(errors).toEqual([]);
});
