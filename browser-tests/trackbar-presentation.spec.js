import {test,expect} from '@playwright/test';
test('value alignment for both orientations and every position; runtime updates retain input and value',async({page})=>{
 await page.goto('/browser-tests/recipes.html');
 const results=await page.evaluate(async()=>{
  const {TrackBar}=await import('/src/ui/inputs.js');const results=[];
  for(const orientation of ['horizontal','vertical']) for(const position of ['left','right','top','bottom']) for(const scale of ['none','range']) {
   const slider=new TrackBar('#root',{orientation,valuePosition:position,showValue:true,scale,value:40,width:300,labelPosition:'top'});
   const input=slider.element.querySelector('input'), value=slider.element.querySelector('.dui-trackbar__value');
   const a=input.getBoundingClientRect(),b=value.getBoundingClientRect();
   results.push({orientation,position,scale,delta:['top','bottom'].includes(position)?Math.abs(a.x+a.width/2-b.x-b.width/2):Math.abs(a.y+a.height/2-b.y-b.height/2)});
   slider.setThumbShape('grip').setValuePosition('top').setShowValue(false);
   if(slider.element.querySelector('input')!==input || slider.value.get()!==40 || getComputedStyle(value).display!=='none') throw Error('Runtime setter changed model/input');
   slider.destroy();
  }
  return results;
 });
 for(const result of results) expect(result.delta,JSON.stringify(result)).toBeLessThan(1.5);
});
test('thumb variants preserve keyboard and pointer input; color channel values are centered',async({page})=>{
 await page.goto('/browser-tests/recipes.html');
 await page.evaluate(async()=>{
  const {TrackBar,CMYKColorPicker}=await import('/src/ui/all.js');window.controls=[];
  for(const orientation of ['horizontal','vertical']) for(const thumbShape of ['circle','ring','grip','line']) controls.push(new TrackBar('#root',{orientation,thumbShape,label:orientation+' '+thumbShape,labelPosition:'top',width:240,value:50,showValue:true,valuePosition:'top'}));
  window.color=new CMYKColorPicker('#root',{label:'Color',value:'#eddfd1'});
 });
 for(const slider of await page.getByRole('slider').all()) {
  await slider.focus();await slider.press('End');await expect(slider).toHaveValue('100');
  await slider.press('Home');await expect(slider).toHaveValue('0');
  await slider.click();expect(Number(await slider.inputValue())).toBeGreaterThan(0);
 }
 await page.getByRole('button',{name:'Color',exact:true}).click();
 const deltas=await page.locator('.dui-channel-color__channel').evaluateAll(nodes=>nodes.map(node=>{const a=node.querySelector('input').getBoundingClientRect(),b=node.querySelector('.dui-trackbar__value').getBoundingClientRect();return Math.abs(a.x+a.width/2-b.x-b.width/2);}));
 deltas.forEach(delta=>expect(delta).toBeLessThan(1.5));
 await page.screenshot({path:'test-results/trackbar-presentation.png',fullPage:true});
 await page.evaluate(()=>{color.destroy();controls.forEach(control=>control.destroy());});
});
