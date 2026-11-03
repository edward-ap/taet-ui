import {test,expect} from '@playwright/test';

test('single-theme host can omit preset toolbar while retaining live draft API',async({page})=>{
 await page.goto('/browser-tests/recipes.html');
 await page.evaluate(async()=>{
  const {ThemeDesigner}=await import('/src/ui/all.js');window.changes=[];
  window.editor=new ThemeDesigner('#root',{toolbar:false,maxColors:3,onChange:e=>changes.push(e.preset)});
 });
 await expect(page.getByRole('button',{name:'Apply',exact:true})).toHaveCount(0);
 await page.getByRole('slider',{name:'Surface',exact:true}).press('Home');
 await expect.poll(()=>page.evaluate(()=>changes.length)).toBeGreaterThan(0);
 expect(await page.evaluate(()=>editor.getPreset().definition.surfaceTint)).toBe(0);
 await page.evaluate(()=>editor.destroy());
 await expect(page.locator('.dui-theme-designer')).toHaveCount(0);
});
test('two designer instances isolate presets, hosts and teardown without frames',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/browser-tests/recipes.html');
 await page.evaluate(async()=>{
  const {ThemeDesigner}=await import('/src/ui/all.js');window.applied=[];
  window.first=new ThemeDesigner('#root',{preview:true,width:1100,height:650,host:{applyPreset:({preset})=>applied.push(preset.name)}});
  window.second=new ThemeDesigner(document.body,{preview:true,width:1100,height:650});
 });
 const first=page.locator('.dui-theme-designer').first(),second=page.locator('.dui-theme-designer').last();
 await expect(first.locator('[data-designer-ref="wheel"]')).toBeVisible();
 await expect(page.locator('iframe')).toHaveCount(0);
 await page.evaluate(()=>{const p=first.getPreset();p.name='Independent';p.definition.surfaceTint=.8;first.setPreset(p);});
 await expect(first.locator('[data-designer-ref="preset-current"]')).toHaveText('Independent');
 await expect(second.locator('[data-designer-ref="preset-current"]')).toHaveText('Light Blue');
 await first.getByRole('button',{name:'Apply',exact:true}).click();expect(await page.evaluate(()=>applied)).toEqual(['Independent']);
 await second.getByRole('button',{name:'Apply',exact:true}).click();await expect(second.getByRole('alert')).toContainText('Host API not connected');
 await first.getByRole('slider',{name:'Surface',exact:true}).focus();await first.getByRole('slider',{name:'Surface',exact:true}).press('Home');
 expect(await page.evaluate(()=>first.getPreset().definition.surfaceTint)).toBe(0);
 await page.screenshot({path:'test-results/theme-designer-component.png',fullPage:true});
 await page.evaluate(()=>{first.destroy();second.destroy();});await expect(page.locator('.dui-theme-designer')).toHaveCount(0);expect(errors).toEqual([]);
});

test('designer aborts pending host work, validates before mount and releases repeated owners',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/browser-tests/recipes.html');
 await page.evaluate(async()=>{
  const {ThemeDesigner}=await import('/src/ui/all.js');window.Designer=ThemeDesigner;
  try{new ThemeDesigner('#root',{preset:{name:'Invalid',definition:{version:99}}});throw Error('Accepted invalid definition');}catch(e){if(e.message==='Accepted invalid definition')throw e;}
  if(document.querySelector('#root').childElementCount)throw Error('Invalid mount leaked DOM');
  window.editor=new ThemeDesigner('#root',{preview:true,width:1100,height:650,host:{applyPreset:({signal})=>{window.pendingSignal=signal;return new Promise(resolve=>window.finishApply=resolve);}}});
 });
 await page.getByRole('button',{name:'Apply',exact:true}).click();
 await page.evaluate(async()=>{editor.destroy();if(!pendingSignal.aborted)throw Error('Host was not aborted');finishApply();await Promise.resolve();await Promise.resolve();});
 await expect(page.locator('.dui-theme-designer')).toHaveCount(0);
 await page.evaluate(()=>{
  for(let i=0;i<20;i++){const control=new Designer('#root',{preview:true,width:1100,height:650});control.destroy();}
  let control;control=new Designer('#root',{preview:true,width:1100,height:650,onChange:()=>control.destroy()});
  const p=control.getPreset();p.name='Destroy from callback';control.setPreset(p);
  if(!control.destroyed)throw Error('No callback teardown');
 });
 await expect(page.locator('#root')).toBeEmpty();expect(errors).toEqual([]);
});

test('designer documentation mounts a real control and preview owns its foundation',async({page})=>{
 await page.goto('/docs/index.html#theme-designer');
 await expect(page.getByRole('heading',{name:'ThemeDesigner',exact:true,level:1})).toBeVisible();
 const designer=page.locator('.dui-theme-designer');
 await designer.getByRole('button',{name:'Apply',exact:true}).click();
 await expect(page.locator('.dui-example-host__output')).toContainText('Application received Light Blue');
 await designer.locator('[data-designer-ref="foundation-toggle"] .dui-switch__visual').click();
 const preview=designer.locator('.preview-root');await expect(preview).toHaveAttribute('data-foundation','dark');
 expect(await preview.evaluate(el=>getComputedStyle(el).backgroundColor)).not.toBe('rgba(0, 0, 0, 0)');
});


test('toolbar notifications overlay without moving layout, expire, pause and dispose',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/browser-tests/recipes.html');
 await page.evaluate(async()=>{const {ThemeDesigner}=await import('/src/ui/experimental.js');window.designer=new ThemeDesigner('#root',{preview:true,width:1100,height:650,notificationDuration:1500});});
 const root=page.locator('.dui-theme-designer'),wheel=root.locator('[data-designer-ref="wheel"]'),notice=root.locator('.dui-designer-notice');
 const before=await wheel.boundingBox();
 await root.getByRole('button',{name:'Apply',exact:true}).focus();
 await root.getByRole('button',{name:'Apply',exact:true}).click();
 await expect(root.getByRole('alert')).toContainText('Host API not connected: applyPreset');
 expect(await wheel.boundingBox()).toEqual(before);
 await notice.hover();await page.waitForTimeout(1800);await expect(notice).toBeVisible();
 await root.getByRole('button',{name:'Dismiss notification'}).focus();await page.mouse.move(1,1);await page.waitForTimeout(1800);await expect(notice).toBeVisible();
 await page.keyboard.press('Enter');await expect(notice).not.toBeVisible();await expect(root.getByRole('button',{name:'Apply',exact:true})).toBeFocused();
 await root.getByRole('button',{name:'Apply',exact:true}).click();await expect(notice).toBeVisible();await expect(notice).not.toBeVisible({timeout:3000});
 await page.evaluate(()=>designer.connectHost({applyPreset:()=>{}}));
 await root.getByRole('button',{name:'Apply',exact:true}).click();await expect(root.getByRole('status')).toContainText('Preset applied');await expect(notice).toHaveAttribute('data-kind','success');
 await page.evaluate(()=>designer.destroy());await expect(notice).toHaveCount(0);await page.waitForTimeout(1800);expect(errors).toEqual([]);
});

test('standalone toolbar error uses default timeout without shifting wheel',async({page})=>{
 await page.goto('/examples/theme-editor/');await expect(page.locator('body')).toHaveAttribute('data-ready','true');
 const before=await page.locator('#wheel').boundingBox();
 await page.getByRole('button',{name:'Apply',exact:true}).click();
 const notice=page.locator('.dui-designer-notice');await expect(notice).toBeVisible();expect(await page.locator('#wheel').boundingBox()).toEqual(before);
 await page.screenshot({path:'test-results/theme-designer-notification.png'});
 await expect(notice).not.toBeVisible({timeout:6500});
});


test('compact designer sizes to its settings tray without constructing preview controls',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/browser-tests/recipes.html');
 await page.evaluate(async()=>{const {ThemeDesigner}=await import('/src/ui/all.js');window.changes=[];window.compact=new ThemeDesigner('#root',{onChange:e=>changes.push(e.theme)});});
 const root=page.locator('.dui-theme-designer'),panel=root.locator('.wheel-column'),tray=root.locator('[data-designer-ref="synth-bottom"]');
 await expect(root.locator('.preview-column,.preview-root,.dui-grid')).toHaveCount(0);
 const r=await root.boundingBox(),p=await panel.boundingBox(),t=await tray.boundingBox();
 expect(r.width).toBe(550);expect(r.height).toBeLessThan(450);expect(Math.abs(p.y+p.height-t.y-t.height-13)).toBeLessThan(2);expect(Math.abs(r.y+r.height-p.y-p.height-10)).toBeLessThan(2);
 expect(await tray.evaluate(el=>getComputedStyle(el).backgroundColor)).not.toBe('rgba(0, 0, 0, 0)');
 await root.getByRole('slider',{name:'Surface',exact:true}).focus();await page.keyboard.press('Home');await expect.poll(()=>page.evaluate(()=>changes.length)).toBeGreaterThan(0);
 await page.screenshot({path:'test-results/theme-designer-compact.png'});
 await page.evaluate(()=>compact.destroy());await expect(root).toHaveCount(0);expect(errors).toEqual([]);
});


test('host theme, limited anchors and subscriptions remain instance-local',async({page})=>{
 await page.goto('/browser-tests/recipes.html');
 await page.evaluate(async()=>{
  const {ThemeDesigner}=await import('/src/ui/all.js');window.Designer=ThemeDesigner;
  const root=document.querySelector('#root');root.classList.add('dui-theme-dark-blue');
  window.editor=new ThemeDesigner(root,{maxColors:2});window.events=[];
  window.subscription=editor.events.on('change',e=>events.push(e));
 });
 const root=page.locator('.dui-theme-designer'),panel=root.locator('.wheel-column'),tray=root.locator('[data-designer-ref="synth-bottom"]');
 await expect(panel).toHaveCSS('background-color','rgb(17, 25, 35)');
 await expect(tray).toHaveCSS('background-color','rgb(24, 35, 49)');
 await page.evaluate(()=>document.querySelector('#root').className='dui-theme-light-blue');
 await expect(tray).toHaveCSS('background-color','rgb(244, 247, 251)');
 await root.getByRole('button',{name:'More rays',exact:true}).click();await expect(root.getByRole('button',{name:'More rays',exact:true})).toBeDisabled();
 await expect(root.locator('.distribution-marker')).toHaveCount(2);
 await expect.poll(()=>page.evaluate(()=>events.length)).toBe(1);
 expect(await page.evaluate(()=>({origin:events[0].origin,userAction:events[0].userAction}))).toEqual({origin:'user',userAction:true});
 await page.evaluate(()=>{window.four=editor.getPreset();four.name='Four';four.definition.harmony.type='cross';editor.setPreset(four);});
 await expect(root.locator('.distribution-marker')).toHaveCount(2);
 expect(await page.evaluate(()=>four.definition.harmony.type)).toBe('cross');
 expect(await page.evaluate(()=>events.at(-1).origin)).toBe('api');
 await page.evaluate(()=>{events.at(-1).preset.name='Tampered';if(editor.getPreset().name==='Tampered')throw Error('Live event snapshot');subscription.off();window.count=events.length;const p=editor.getPreset();p.name='After unsubscribe';editor.setPreset(p);});
 expect(await page.evaluate(()=>events.length===count)).toBe(true);
 await page.evaluate(()=>{const input=editor.element.querySelector('[data-designer-ref="ui-dials"] input');input.value='0';input.dispatchEvent(new Event('input',{bubbles:true}));if(editor.getTheme().definition.surfaceTint!==0)throw Error('Stale getTheme before repaint');});
 await page.evaluate(()=>{editor.connectHost({getPresetDirectory:()=>'.',openPresetExplorer:()=>four,applyPreset:({theme,preset})=>{window.applied={theme,preset};}});});
 await root.getByRole('button',{name:'Open',exact:true}).click();await expect(root.locator('.distribution-marker')).toHaveCount(2);
 await root.getByRole('button',{name:'Apply',exact:true}).click();
 expect(await page.evaluate(()=>applied.theme.definition.distribution.cycleAfter)).toBe(2);

 await page.evaluate(()=>editor.destroy());
 // Each supported limit normalizes programmatic presets before mounting.
 await page.evaluate(()=>{for(const maxColors of [1,2,3,4]){const c=new Designer('#root',{maxColors,preset:four});if(c.element.querySelectorAll('.distribution-marker').length!==maxColors)throw Error('Wrong cap');c.destroy();}for(const maxColors of [0,5,2.5,NaN]){try{new Designer('#root',{maxColors});throw Error('Accepted invalid cap');}catch(e){if(!(e instanceof RangeError))throw e;}}});
 await expect(page.locator('#root')).toBeEmpty();
});

test('compact designer does not retain the demo page minimum width', async ({page}) => {
 await page.goto('/browser-tests/recipes.html');
 await page.evaluate(async()=>{const {ThemeDesigner}=await import('/src/ui/ThemeDesigner.js');const host=document.createElement('div');host.style.width='550px';document.body.append(host);new ThemeDesigner(host,{toolbar:false});});
 const editor=page.locator('.dui-theme-designer');
 expect(await editor.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
});

