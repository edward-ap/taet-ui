import {test,expect} from '@playwright/test';
test.beforeEach(async({page})=>{await page.goto('/browser-tests/recipes.html');await page.evaluate(async()=>{
 const {ScrollingLabel,TextInput}=await import('/src/ui/all.js');
 window.label=new ScrollingLabel('#root',{text:'A long scrolling title '.repeat(12),width:260,startDelay:0,speed:60,gap:48});
 window.input=new TextInput('#root',{label:'Fixed label',width:360,value:'A long editable field '.repeat(35)});
 await document.fonts.ready;
 await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
});});
test('loops with one native animation, pauses, resizes, respects reduced motion and releases resources',async({page})=>{
 await expect.poll(()=>page.evaluate(()=>label.element.getAnimations({subtree:true}).length)).toBe(1);
 const geometry=await page.evaluate(()=>{
  const first=label.element.querySelector('.dui-scrolling-label__text'), track=first.parentElement;
  const a=track.getAnimations()[0],width=parseFloat(getComputedStyle(first).width);
  const end=a.effect.getKeyframes().at(-1).transform;
  return {width,end,duration:a.effect.getTiming().duration,children:track.children.length};
 });
 expect(geometry.children).toBe(2);expect(Number(geometry.end.match(/[-\d.]+/)[0])).toBeCloseTo(-geometry.width-48,2);expect(geometry.duration).toBeCloseTo((geometry.width+48)/60*1000);
 await page.evaluate(()=>{label.element.style.transform='scale(1.25)';label.setGap(49);});
 const scaled=await page.evaluate(()=>{const first=label.element.firstChild.firstChild;return {width:parseFloat(getComputedStyle(first).width),end:label.element.getAnimations({subtree:true})[0].effect.getKeyframes().at(-1).transform};});
 expect(Number(scaled.end.match(/[-\d.]+/)[0])).toBeCloseTo(-scaled.width-49,2);
 await page.evaluate(()=>{label.element.style.transform='';label.setGap(48);});
 await page.evaluate(()=>label.setPaused(true));expect(await page.evaluate(()=>label.element.getAnimations({subtree:true})[0].playState)).toBe('paused');
 await page.evaluate(()=>label.setPaused(false));await expect.poll(()=>page.evaluate(()=>label.element.getAnimations({subtree:true})[0].playState)).toBe('running');
 await page.evaluate(()=>label.element.style.marginTop='2000px');
 await expect.poll(()=>page.evaluate(()=>label.element.getAnimations({subtree:true})[0].playState)).toBe('paused');
 await page.evaluate(()=>{label.element.style.marginTop='0';label.disable();});
 await expect.poll(()=>page.evaluate(()=>label.element.getAnimations({subtree:true})[0].playState)).toBe('paused');
 await page.evaluate(()=>label.enable());
 await expect.poll(()=>page.evaluate(()=>label.element.getAnimations({subtree:true})[0].playState)).toBe('running');
 await page.emulateMedia({reducedMotion:'reduce'});await expect.poll(()=>page.evaluate(()=>label.element.getAnimations({subtree:true}).length)).toBe(0);
 await page.emulateMedia({reducedMotion:'no-preference'});await expect.poll(()=>page.evaluate(()=>label.element.getAnimations({subtree:true}).length)).toBe(1);
 await page.evaluate(()=>label.setText('Short'));await expect.poll(()=>page.evaluate(()=>label.element.getAnimations({subtree:true}).length)).toBe(0);
 await page.evaluate(()=>{label.setText('overflow '.repeat(40));label.setSize(100);});await expect.poll(()=>page.evaluate(()=>label.element.getAnimations({subtree:true}).length)).toBe(1);
 await page.evaluate(()=>{window.anim=label.element.getAnimations({subtree:true})[0];label.destroy();input.destroy();});expect(await page.evaluate(()=>anim.playState)).toBe('idle');await expect(page.locator('.dui-scrolling-label')).toHaveCount(0);
});
test('native drag selection scrolls within another input without displacing its label',async({page})=>{
 const field=page.getByRole('textbox');const box=await field.boundingBox();
 const before=await page.locator('.dui-text-field__label').boundingBox();
 await field.click();await field.press('Home');
 await page.mouse.move(box.x+8,box.y+box.height/2);await page.mouse.down();
 await page.mouse.move(box.x+box.width+90,box.y+box.height/2,{steps:12});await page.waitForTimeout(900);
 expect(await field.evaluate(el=>el.selectionEnd>el.selectionStart)).toBe(true);
 expect(await field.evaluate(el=>el.scrollLeft)).toBeGreaterThan(0);
 await page.mouse.move(box.x-70,box.y+box.height/2,{steps:12});await page.waitForTimeout(500);await page.mouse.up();
 expect(await field.evaluate(el=>el.selectionStart>=0 && el.selectionEnd<=el.value.length)).toBe(true);
 expect(await page.locator('.dui-text-field__label').boundingBox()).toEqual(before);
 expect(await field.boundingBox()).toEqual(box);
 await expect.poll(()=>page.evaluate(()=>label.element.getAnimations({subtree:true})[0].playState)).toBe('running');
 await page.screenshot({path:'test-results/scrolling-label-selection.png'});
});
test('steady motion has no JS frame callbacks, timers or DOM mutation loop',async({page})=>{
 await expect.poll(()=>page.evaluate(()=>label.element.getAnimations({subtree:true})[0]?.playState)).toBe('running');
 await page.evaluate(()=>{
  window.writes=0;window.frames=0;window.timers=0;
  const raf=window.requestAnimationFrame,interval=window.setInterval,timeout=window.setTimeout;
  window.requestAnimationFrame=(...args)=>{frames++;return raf(...args);};
  window.setInterval=(...args)=>{timers++;return interval(...args);};window.setTimeout=(...args)=>{timers++;return timeout(...args);};
  window.observer=new MutationObserver(records=>writes+=records.length);observer.observe(label.element,{subtree:true,attributes:true,childList:true,characterData:true});
  window.startTransform=getComputedStyle(label.element.firstChild).transform;
 });
 await page.waitForTimeout(1200);
 const result=await page.evaluate(()=>{observer.disconnect();return {writes,frames,timers,moved:startTransform!==getComputedStyle(label.element.firstChild).transform};});
 expect(result).toEqual({writes:0,frames:0,timers:0,moved:true});
});

test('late font metrics update the animation after bounded layout delivery',async({page})=>{
 let resolveFontRequest;
 const fontRequest=new Promise(resolve=>{resolveFontRequest=resolve;});
 await page.route('**/NotoSans-variable.woff2?scrolling-label-late-font',route=>resolveFontRequest(route));
 await page.evaluate(()=>{
  window.lateLabelFont=new FontFace('ScrollingLabelLateTest','url("/src/ui/fonts/NotoSans-variable.woff2?scrolling-label-late-font")');
  document.fonts.add(lateLabelFont);label.element.style.fontFamily='"ScrollingLabelLateTest", monospace';
  void lateLabelFont.load();label.setGap(49);
 });
 const route=await fontRequest;
 const readGeometry=()=>page.evaluate(()=>{const first=label.element.querySelector('.dui-scrolling-label__text');return{width:parseFloat(getComputedStyle(first).width),end:Number(label.element.getAnimations({subtree:true})[0].effect.getKeyframes().at(-1).transform.match(/[-\d.]+/)[0])};});
 const fallback=await readGeometry();
 expect(fallback.end).toBeCloseTo(-fallback.width-49,2);
 await route.continue();
 await page.evaluate(async()=>{await lateLabelFont.loaded;await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));});
 const loaded=await readGeometry();
 expect(loaded.width).not.toBeCloseTo(fallback.width,2);
 expect(loaded.end).toBeCloseTo(-loaded.width-49,2);
 await page.evaluate(()=>{document.fonts.delete(lateLabelFont);label.destroy();input.destroy();});
});
