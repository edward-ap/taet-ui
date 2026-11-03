import {test,expect} from '@playwright/test';
test('progress labels remain centered with complementary clipped colors across fill boundaries',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/browser-tests/recipes.html');
 await page.evaluate(async()=>{
  const {ProgressBar}=await import('/src/ui/all.js');
  document.body.style.setProperty('--dui-on-progress','#ffffff');document.body.style.setProperty('--dui-on-progress-track','#000000');
  document.body.style.setProperty('--dui-color-focus-border','#145060');document.body.style.setProperty('--dui-button-bg','#ffffff');
  window.bars=[new ProgressBar('#root',{label:'Horizontal',width:360,value:50}),new ProgressBar('#root',{label:'Vertical',orientation:'vertical',value:50})];
 });

 for(const value of [0,20,43,49,50,51,57,75,100]){
  await page.evaluate(v=>window.bars.forEach(b=>b.value.set(v)),value);
  const geometry=await page.locator('.dui-progress-bar__track').evaluateAll(tracks=>tracks.map(track=>{
   const t=track.getBoundingClientRect();
   return [...track.querySelectorAll('.dui-progress-bar__text')].map(e=>{const range=document.createRange();range.selectNodeContents(e);const r=range.getBoundingClientRect();return {dx:(r.left+r.right-t.left-t.right)/2,dy:(r.top+r.bottom-t.top-t.bottom)/2,clip:getComputedStyle(e).clipPath,color:getComputedStyle(e).color,hidden:e.getAttribute('aria-hidden')};});
  }));
  for(const layers of geometry){for(const layer of layers){expect(Math.abs(layer.dx)).toBeLessThan(1);expect(Math.abs(layer.dy)).toBeLessThan(2);expect(layer.hidden).toBe('true');expect(layer.clip).not.toBe('none');}expect(layers[0].color).toBe('rgb(0, 0, 0)');expect(layers[1].color).toBe('rgb(255, 255, 255)');}
  await expect(page.locator('.dui-progress-bar--horizontal .dui-progress-bar__text--track')).toHaveCSS('clip-path',`inset(0px 0px 0px ${value}%)`);
  await expect(page.locator('.dui-progress-bar--vertical .dui-progress-bar__text--fill')).toHaveCSS('clip-path',`inset(${100-value}% 0px 0px)`);
 }
 await page.evaluate(()=>{const b=window.bars[0];b.textMode='custom';b.setText('Long operation progress message');b.value.set(50);b.element.style.width='180px';});
 await expect(page.locator('.dui-progress-bar--horizontal .dui-progress-bar__text--track')).toHaveText('Long operation progress message');
 await page.screenshot({path:'test-results/progress-foreground.png',fullPage:true});
 await page.evaluate(()=>window.bars.forEach(b=>b.destroy()));expect(errors).toEqual([]);
});
