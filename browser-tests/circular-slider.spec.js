import {test,expect} from '@playwright/test';
test('circular range supports pointer seam, keyboard, silent writes and teardown',async({page})=>{
 await page.goto('/examples/theme-editor/');await expect(page.locator('body')).toHaveAttribute('data-ready','true');
 await page.evaluate(async()=>{
  const {CircularSlider}=await import('/src/ui/all.js');
  const host=document.createElement('div');host.id='dial-test';host.style='position:fixed;top:0;left:0;background:white;z-index:9999';document.body.append(host);
  window.dial=new CircularSlider(host,{label:'Test dial',value:50});window.changes=0;dial.events.on('change',()=>window.changes++);
 });
 const input=page.getByRole('slider',{name:'Test dial'}),ring=page.locator('#dial-test .dui-circular-slider__dial');
 await input.focus();await input.press('End');await expect(input).toHaveValue('100');await expect(input).toHaveAttribute('aria-valuetext','100%');
 await input.press('Home');await input.press('ArrowUp');await expect(input).toHaveValue('1');
 const b=await ring.boundingBox(),x=b.x+b.width/2,y=b.y+b.height/2,r=b.width*.45;
 await page.mouse.click(x-r,y);await expect(input).toHaveValue('25');
 await page.mouse.click(x,y-r);await expect(input).toHaveValue('50');
 await page.mouse.move(x+r,y);await page.mouse.down();await expect(input).toHaveValue('75');
 await page.mouse.move(x+2,y+r);await page.mouse.move(x-2,y+r);await expect(input).toHaveValue('100');await page.mouse.up();
 const count=await page.evaluate(()=>changes);await page.evaluate(()=>dial.value.set(33,{silent:true}));await expect(input).toHaveValue('33');expect(await page.evaluate(()=>changes)).toBe(count);
 await page.evaluate(()=>dial.disable());await page.mouse.click(x,y-r);await expect(input).toHaveValue('33');
 await page.evaluate(()=>{dial.enable();dial.setReadOnly(true);});await page.mouse.click(x,y-r);await expect(input).toHaveValue('33');
 await page.evaluate(()=>{dial.setReadOnly(false);dial.setRange(10,20);dial.value.set(15);});await expect(input).toHaveAttribute('aria-valuetext','50%');
 await page.evaluate(()=>dial.destroy());await expect(input).toHaveCount(0);
 const wheel=await page.locator('#wheel-stage').boundingBox(),base=await page.locator('#base-row').boundingBox();expect(base.y).toBeGreaterThan(wheel.y+wheel.height);
 for(const dial of await page.locator('#ui-dials .dui-circular-slider__dial').all()){const box=await dial.boundingBox();expect(box.width).toBe(44);expect(box.height).toBe(44);}
 await page.screenshot({path:'test-results/theme-circular-sliders.png',fullPage:true});
});
