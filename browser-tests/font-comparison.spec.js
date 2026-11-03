import {test,expect} from '@playwright/test';
test('font comparison loads local faces and keeps equal desktop metrics',async({page})=>{
 const errors=[],external=[];page.on('pageerror',e=>errors.push(e.message));
 page.on('request',request=>{if(!new URL(request.url()).hostname.match(/^(127\.0\.0\.1|localhost)$/))external.push(request.url());});
 await page.goto('/examples/labs/font-comparison.html');
 await expect(page.locator('body')).toHaveAttribute('data-ready','true');
 await expect(page.locator('.font-sample')).toHaveCount(3);
 await expect(page.locator('[data-font="Noto Sans"]')).toHaveAttribute('data-loaded','true');
 await expect(page.locator('[data-font="Roboto"]')).toHaveAttribute('data-loaded','true');
 const metrics=await page.locator('.font-sample').evaluateAll(cards=>cards.map(card=>{
  const input=card.querySelector('input[type=text]');const style=getComputedStyle(input);
  return {family:style.fontFamily,size:style.fontSize,height:input.getBoundingClientRect().height,row:getComputedStyle(card).getPropertyValue('--dui-row-height').trim()};
 }));
 expect(new Set(metrics.map(m=>m.family)).size).toBe(3);
 for(const metric of metrics){expect(metric.size).toBe('12px');expect(metric.height).toBe(24);expect(metric.row).toBe('22px');}
 for(const card of await page.locator('.font-sample').all()) {
  await card.getByRole('textbox',{name:'Name',exact:true}).fill('William 101');
  await expect(card.getByRole('textbox',{name:'Name',exact:true})).toHaveValue('William 101');
 }
 await page.screenshot({path:'test-results/font-comparison-light.png',fullPage:true});
 await page.getByRole('button',{name:'Light / dark theme'}).click();await expect(page.locator('body')).toHaveClass(/dui-theme-dark-blue/);
 await page.screenshot({path:'test-results/font-comparison-dark.png',fullPage:true});
 expect(errors).toEqual([]);expect(external).toEqual([]);
});
