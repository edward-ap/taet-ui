import {test,expect} from '@playwright/test';
test.use({deviceScaleFactor:2});
test('scope registry restores owned styles on clear and disposal without traversing wrappers',async({page})=>{
 await page.goto('/examples/theme-editor/');
 const result=await page.evaluate(async()=>{
  const {ThemeScopes}=await import('/examples/theme-editor/theme-scopes.js');const {generateTheme}=await import('/examples/theme-editor/theme-generator.js');const {presets}=await import('/examples/theme-editor/theme-presets.js');
  const d=structuredClone(presets[0].definition);d.harmony.type='square';d.distribution={mode:'scope-cycle'};const theme=generateTheme(d),registry=new ThemeScopes();
  const root=document.createElement('div'),wrapper=document.createElement('div'),child=document.createElement('div');document.body.append(root);root.append(wrapper);wrapper.append(child);child.style.setProperty('--dui-command-button-bg','pink','important');
  registry.register(root,{id:'root'});registry.register(child,{id:'child',parent:'root'});registry.apply(theme);const role=registry.states.get('child');registry.apply(generateTheme({preset:'clear'}));const clear=child.style.getPropertyValue('--dui-command-button-bg');registry.apply(theme);registry.destroy();const restored={value:child.style.getPropertyValue('--dui-command-button-bg'),priority:child.style.getPropertyPriority('--dui-command-button-bg'),role:child.getAttribute('data-dui-theme-role'),id:child.getAttribute('data-dui-scope-id')};root.remove();return {role,clear,restored};
 });
 expect(result).toEqual({role:{role:'secondary',depth:1},clear:'pink',restored:{value:'pink',priority:'important',role:null,id:null}});
});

test('automatic ray distribution paints four real levels on both tabs for 1–4 rays',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/examples/theme-editor/');await expect(page.locator('body')).toHaveAttribute('data-ready','true');
 await setHue(page,110);
 const preview=page.frameLocator('#preview'),frame=page.frames().find(f=>f.url().endsWith('/preview.html'));
 await preview.getByRole('textbox',{name:'Name',exact:true}).fill('Keep this form');
 const more=page.getByRole('button',{name:'More rays',exact:true}),less=page.getByRole('button',{name:'Fewer rays',exact:true});
 for(const count of [1,2,3,4,3,2,1]){
  const current=Number(await page.locator('#wheel-center .dui-radio-letter__marker').textContent());
  if(count>current)await more.click();if(count<current)await less.click();
  await expect(page.locator('#wheel-center .dui-radio-letter__marker')).toHaveText(String(count));
  const expected=await page.evaluate(async()=>{const {toGamut}=await import('/examples/theme-editor/color-math.js');const {resolveAccentFamily}=await import('/examples/theme-editor/foreground-resolver.js');const {editorDefinition}=await import('/examples/theme-editor/editor-model.js');const {presets}=await import('/examples/theme-editor/theme-presets.js');const tone=editorDefinition(presets[0].definition).baseTone;const {hues}=await import('/examples/theme-editor/harmony.js');const n=Number(document.querySelector('#wheel-center .dui-radio-letter__marker').textContent);const angles=hues({type:['monochrome','complementary','fork','cross'][n-1],baseHue:110,spread:n===4?90:60,lockGeometry:true});return Array.from({length:4},(_,i)=>{const raw=toGamut({L:tone.L,C:tone.C,H:angles[i%n]}).hex;const hex=resolveAccentFamily({backgrounds:[raw],current:'#171a1d'}).backgrounds[0];return 'rgb('+hex.match(/[a-f\d]{2}/gi).map(v=>parseInt(v,16)).join(', ')+')';});});
  await preview.getByRole('tab',{name:'Form',exact:true}).click();
  await expect(preview.locator('.preview-header')).toHaveCSS('background-color',expected[0]);
  await expect(preview.getByRole('tab',{name:'Form',exact:true})).toHaveCSS('background-color',expected[1]);
  await expect(preview.locator('[data-dui-scope-id="form-layout"] > .scope-heading')).toHaveCSS('background-color',expected[2]);
  await expect(preview.locator('.dui-field-group__title')).toHaveCSS('background-color',expected[3]);
  await expect(preview.getByRole('button',{name:'Save changes',exact:true})).toHaveCSS('background-color',expected[3]);
  await expect(preview.getByRole('textbox',{name:'Name',exact:true})).toHaveValue('Keep this form');
  if(count===4)await page.screenshot({path:'test-results/theme-four-levels-form.png',fullPage:true});
  await preview.getByRole('tab',{name:'Table',exact:true}).click();
  await expect(preview.locator('[data-dui-scope-id="table-layout"] > .scope-heading')).toHaveCSS('background-color',expected[2]);
  await expect(preview.locator('.dui-grid__header-cell').first()).toHaveCSS('background-color',expected[3]);
  if(count===4)await page.screenshot({path:'test-results/theme-four-levels-table.png',fullPage:true});
 }
 await preview.getByRole('tab',{name:'Form',exact:true}).click();
 await expect(preview.locator('.theme-details')).toHaveCount(0);await expect(preview.getByText('Second window',{exact:true})).toHaveCount(0);
 expect(errors).toEqual([]);
});

test('base RGB picker commits channel edits with Enter and cancels with Escape',async({page})=>{
 await page.goto('/examples/theme-editor/');await expect(page.locator('body')).toHaveAttribute('data-ready','true');
 const picker=page.getByRole('button',{name:'Base color RGB',exact:true});await picker.click();
 for(const name of ['Red','Green','Blue'])await expect(page.getByRole('button',{name:name+' channel',exact:true})).toBeVisible();
 const red=page.locator('.dui-channel-color__channels').getByRole('slider').first();await red.focus();await red.press('Home');
 const draft=await page.getByRole('textbox',{name:'Hex color',exact:true}).inputValue();
 await page.screenshot({path:'test-results/theme-rgb-popup.png',fullPage:true});
 await red.press('Enter');await expect(picker).toHaveAttribute('aria-expanded','false');
 // RGB edits commit only on Enter; Escape restores the previous value.
 await expect(picker).toContainText('#');await picker.click();await page.getByRole('textbox',{name:'Hex color',exact:true}).fill('#123456');await page.getByRole('textbox',{name:'Hex color',exact:true}).press('Escape');
 await expect(picker).not.toContainText('#123456');expect(draft).toMatch(/^#00/);
});


test('compact distribution sits beside the wheel with HEX strips and draggable letters',async({page})=>{
 await page.goto('/examples/theme-editor/');await expect(page.locator('body')).toHaveAttribute('data-ready','true');
 await expect(page.locator('#wheel-legend,.stack-section,.distribution-handle')).toHaveCount(0);
 for(let n=1;n<=4;n++){
  if(n>1)await page.getByRole('button',{name:'More rays',exact:true}).click();
  const items=page.locator('.distribution-color');await expect(items).toHaveCount(n);
  const wheel=await page.locator('#wheel').boundingBox(),tree=await page.locator('#harmony-stack').boundingBox();
  expect(tree.x).toBeGreaterThanOrEqual(wheel.x+wheel.width);expect(tree.y).toBeLessThan(wheel.y+wheel.height);
  for(const item of await items.all())await expect(item).toHaveText(/^#[a-f0-9]{6}$/);
  for(const marker of await page.locator('.distribution-marker').all())await expect(marker).toHaveAttribute('draggable','true');
 }
 await page.screenshot({path:'test-results/theme-compact-distribution.png',fullPage:true});
});

test('Distribution moves sequence items and inspects matching Preview boundaries',async({page})=>{
 await page.goto('/examples/theme-editor/');await expect(page.locator('body')).toHaveAttribute('data-ready','true');
 for(let i=0;i<3;i++)await page.getByRole('button',{name:'More rays',exact:true}).click();
 const rows=page.locator('.distribution-row'),markers=page.locator('.distribution-marker'),bars=page.locator('.distribution-color'),handles=page.locator('.distribution-marker');await expect(rows).toHaveCount(4);
 const widths=await bars.evaluateAll(es=>es.map(e=>e.getBoundingClientRect().width));expect(Math.max(...widths)-Math.min(...widths)).toBeLessThan(1);
 expect((await page.locator('.distribution-list').boundingBox()).height).toBeLessThan(170);
 await handles.nth(3).dragTo(handles.nth(0));await expect(markers).toHaveText(['D','A','B','C']);
 const preview=page.frameLocator('#preview');const color=await preview.locator('[data-dui-scope-id="application"]').evaluate(e=>{const span=document.createElement('span');span.style.backgroundColor=getComputedStyle(e).getPropertyValue('--dui-window-header-bg');e.append(span);const color=getComputedStyle(span).backgroundColor;span.remove();return color;});await expect(preview.locator('.preview-header')).toHaveCSS('background-color',color);
 await rows.nth(2).hover();await expect(preview.locator('[data-dui-scope-id="form-layout"]')).toHaveClass(/distribution-highlight/);
 await markers.nth(2).click();await page.locator('header').hover();await expect(preview.locator('[data-dui-scope-id="form-layout"]')).toHaveClass(/distribution-highlight/);
 await rows.nth(0).hover();await expect(preview.locator('[data-dui-scope-id="application"]')).toHaveClass(/distribution-highlight/);await expect(preview.locator('[data-dui-scope-id="form-layout"]')).not.toHaveClass(/distribution-highlight/);
 await page.locator('header').hover();await expect(preview.locator('[data-dui-scope-id="form-layout"]')).toHaveClass(/distribution-highlight/);
 await page.screenshot({path:'test-results/theme-distribution.png',fullPage:true});
 await handles.nth(2).focus();await handles.nth(2).press('Alt+ArrowUp');await expect(markers).toHaveText(['D','B','A','C']);
 await setHue(page,80);await expect(markers).toHaveText(['D','B','A','C']);
 await page.getByRole('button',{name:'Fewer rays',exact:true}).click();await expect(markers).toHaveText(['B','A','C']);
});


test('inspection synchronizes wheel, HEX strips, Distribution and Preview',async({page})=>{
 await page.goto('/examples/theme-editor/');await expect(page.locator('body')).toHaveAttribute('data-ready','true');
 for(let i=0;i<3;i++)await page.getByRole('button',{name:'More rays',exact:true}).click();
 const legend=page.locator('.distribution-color[data-anchor="B"]'),row=page.locator('.distribution-row[data-anchor="b"]'),wheel=page.locator('#wheel'),preview=page.frameLocator('#preview');
 await legend.hover();await expect(legend).toHaveCSS('text-decoration-line','underline');await expect(row).toHaveClass(/distribution-inspected/);await expect(wheel).toHaveAttribute('data-highlight-anchor','b');await expect(preview.locator('[data-dui-scope-id="tabs"]')).toHaveClass(/distribution-highlight/);
 await row.getByRole('button',{name:'Inspect B at Level 1',exact:true}).click();await page.locator('header').hover();await expect(legend).toHaveCSS('text-decoration-line','underline');
 await page.screenshot({path:'test-results/theme-cross-inspection.png',fullPage:true});
 await preview.locator('.preview-header').hover();await expect(wheel).toHaveAttribute('data-highlight-anchor','a');await expect(page.locator('.distribution-row[data-anchor="a"]')).toHaveClass(/distribution-inspected/);
 await page.locator('header').hover();await expect(wheel).toHaveAttribute('data-highlight-anchor','b');
 await row.getByRole('button',{name:'Inspect B at Level 1',exact:true}).focus();await page.keyboard.press('Escape');await expect(wheel).toHaveAttribute('data-highlight-anchor','');await expect(legend).not.toHaveCSS('text-decoration-line','underline');
});


test('inspection uses a subtle outline and describes every matching scope',async({page})=>{
 await page.goto('/examples/theme-editor/');await expect(page.locator('body')).toHaveAttribute('data-ready','true');
 const a=page.locator('.distribution-color[data-anchor="A"]');await a.hover();const preview=page.frameLocator('#preview');
 const frame=page.frames().find(f=>f.url().endsWith('/preview.html'));const count=await frame.evaluate(()=>window.anchorScopes('a').length);
 expect(count).toBeGreaterThan(1);await expect(preview.locator('.distribution-highlight')).toHaveCount(count);
 await expect(preview.locator('[data-dui-scope-id="application"]')).toHaveCSS('outline-style','solid');await expect(preview.locator('[data-dui-scope-id="application"]')).toHaveCSS('outline-width','1px');
 await expect(a).toHaveAttribute('title',/Anchor A\nHEX #[a-f0-9]{6}\nDepth level 0, 1, 2, 3\nApplied to:.*Project workspace.*Contact workspace/);
 await expect(page.locator('.distribution-marker')).toHaveAttribute('title',await a.getAttribute('title'));
 await page.screenshot({path:'test-results/theme-inspection-polish.png',fullPage:true});
});

async function setHue(page,value){await page.getByRole('slider',{name:'Base hue',exact:true}).fill(String(value));}

test('two-column editor groups settings and restores locked recovery presets',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/examples/theme-editor/');await expect(page.locator('body')).toHaveAttribute('data-ready','true');
 await expect(page.locator('main > section')).toHaveCount(2);
 await expect(page.getByRole('group',{name:'Preset config',exact:true})).toHaveCount(0);
 await expect(page.getByRole('group',{name:'UI configuration',exact:true})).toHaveCount(0);
 await expect(page.locator('#ui-dials .dui-circular-slider')).toHaveCount(3);
 await expect(page.locator('#inspector,#actions,#scope-controls,.editor-column')).toHaveCount(0);
 await expect(page.getByRole('textbox',{name:'Preset name',exact:true})).toHaveCount(0);
 expect((await page.locator('.wheel-column').boundingBox()).width).toBe(530);
 expect((await page.locator('.preview-column').boundingBox()).width).toBeGreaterThan(800);
 const picker=page.getByRole('button',{name:'Base color RGB',exact:true}),lock=page.getByRole('checkbox',{name:'Lock',exact:true});
 for(const label of ['Light Blue','Dark Blue','Clear']){
  await openLocal(page,label);await expect(lock).toBeChecked();const original=await picker.textContent();
  await lock.uncheck();await setHue(page,80);await page.getByRole('slider',{name:'Lightness',exact:true}).fill('50');
  await openLocal(page,'Warm');await openLocal(page,label);await expect(lock).toBeChecked();await expect(picker).toHaveText(original);
 }
 await openLocal(page,'Light Blue');
 await page.screenshot({path:'test-results/theme-editor-two-columns.png',fullPage:true});
 await page.goto('about:blank');expect(errors).toEqual([]);
});

test('preset and UI settings repaint live controls without replacing form input',async({page})=>{
 await page.goto('/examples/theme-editor/');await expect(page.locator('body')).toHaveAttribute('data-ready','true');
 const preview=page.frameLocator('#preview'),name=preview.getByRole('textbox',{name:'Name',exact:true});await name.fill('Keep this edit');
 await name.evaluate(el=>window.originalInput=el);
 await page.locator('#foundation-toggle .dui-switch__visual').click();await expect(page.getByRole('checkbox',{name:/^Dark foundation:/})).toBeChecked();await expect(preview.locator('body')).toHaveAttribute('data-foundation','dark');
 const before=await preview.locator('body').getAttribute('style');
 await page.getByRole('slider',{name:'Surface',exact:true}).focus();
 await page.getByRole('slider',{name:'Surface',exact:true}).press('End');
 await expect(preview.locator('body')).not.toHaveAttribute('style',before);
 await expect(page.getByRole('checkbox',{name:'Prefer white text on accents',exact:true})).toHaveCount(0);
 await expect(preview.locator('.preview-header')).toHaveCSS('color','rgb(255, 255, 255)');
 await expect(name).toHaveValue('Keep this edit');expect(await name.evaluate(el=>el===window.originalInput)).toBe(true);
});

test('locked A stays fixed and tone sliders preserve hue through clipping',async({page})=>{
 await page.goto('/examples/theme-editor/');await expect(page.locator('body')).toHaveAttribute('data-ready','true');
 await setHue(page,80);const picker=page.getByRole('button',{name:'Base color RGB',exact:true});
 // Slider changes are painted on the next frame; capture the updated color.
 await expect(picker).toHaveText('#be9448');const initial=await picker.textContent();
 const box=await page.locator('#wheel').boundingBox(),r=Math.min(box.width,box.height)/2-28,cx=box.x+box.width/2,cy=box.y+box.height/2;
 await page.mouse.move(cx+Math.cos(80*Math.PI/180)*r,cy+Math.sin(80*Math.PI/180)*r);await page.mouse.down();await page.mouse.move(cx+r,cy,{steps:10});await page.mouse.up();await expect(picker).toHaveText(initial);
 await page.getByRole('slider',{name:'Saturation',exact:true}).fill('100');await page.getByRole('slider',{name:'Lightness',exact:true}).fill('100');
 await expect(picker).toHaveText('#ffffff');await expect(page.getByRole('slider',{name:'Base hue',exact:true})).toHaveValue('80');await expect(page.getByRole('slider',{name:'Saturation',exact:true})).toHaveValue('100');
});


test('Preview contact form shows compact fields, required state and linked progress',async({page})=>{
 await page.goto('/examples/theme-editor/');const f=page.frameLocator('#preview');
 await expect(f.getByRole('textbox',{name:'Name',exact:true})).toHaveAttribute('placeholder','First Name');
 await expect(f.getByRole('textbox',{name:'Last name',exact:true})).toHaveAttribute('placeholder','Last Name');
 const required=f.locator('input[required]');await expect(required).toHaveAttribute('required','');
 expect(await required.evaluate(e=>getComputedStyle(e.closest('.dui-text-field').querySelector('.dui-text-field__label'),'::after').content)).toBe('"*"');
 await f.locator('.dui-trackbar input').fill('43');await expect(f.getByRole('progressbar')).toHaveAttribute('aria-valuenow','43');
 await expect(f.locator('.dui-trackbar')).toHaveAttribute('data-thumb-shape','grip');
 const group=f.locator('.dui-field-group');await expect(group.locator('img')).toHaveCount(1);
 const layout=f.locator('[data-dui-scope-id="form-layout"]');await expect(layout.locator('.statuses')).toHaveCount(0);
 const bounds=await layout.boundingBox(),statuses=await f.locator('.statuses').boundingBox();expect(statuses.y).toBeGreaterThanOrEqual(bounds.y+bounds.height);
 const review=await f.getByRole('button',{name:'Review',exact:true}).boundingBox(),save=await f.getByRole('button',{name:'Save changes',exact:true}).boundingBox();expect(save.x).toBeGreaterThan(review.x+review.width+30);
 const actionBounds=await f.locator('.preview-actions').boundingBox(),lastButton=await f.getByRole('button',{name:'Disabled',exact:true}).boundingBox();expect(Math.abs(lastButton.x+lastButton.width-actionBounds.x-actionBounds.width)).toBeLessThan(2);expect(Math.abs(review.x-actionBounds.x)).toBeLessThan(2);
 expect(await f.locator('body').innerText()).not.toMatch(/[А-Яа-яЁё]/);
 await page.screenshot({path:'test-results/theme-preview-contact.png',fullPage:true});
});


test('Preview fills available height without an outer scrollbar and scrolls real overflow',async({page})=>{
 await page.setViewportSize({width:1440,height:1000});await page.goto('/examples/theme-editor/');
 const preview=page.frameLocator('#preview');await expect(preview.getByRole('textbox',{name:'Name',exact:true})).toBeVisible();
 for(const height of [1000,650,1000]){
  await page.setViewportSize({width:1440,height});
  await expect.poll(()=>page.locator('.preview-column').evaluate(e=>e.scrollHeight-e.clientHeight)).toBe(0);
  expect(await page.evaluate(()=>document.documentElement.scrollHeight-innerHeight)).toBe(0);
  const frame=page.frames().find(f=>f.url().endsWith('/preview.html'));
  await expect.poll(()=>frame.evaluate(()=>document.documentElement.scrollHeight>innerHeight)).toBe(height===650);
 }
 await page.screenshot({path:'test-results/theme-preview-height.png',fullPage:true});
});

async function openLocal(page,name){
 await page.evaluate(name=>window.denseThemeEditor.connectHost({getPresetDirectory:async()=> 'local',openPresetExplorer:async()=>window.denseThemeEditor.getPresets().find(p=>p.name===name)}),name);
 await page.getByRole('toolbar',{name:'Preset actions'}).getByRole('button',{name:'Open',exact:true}).click();
 await expect(page.locator('#preset-current')).toHaveText(name);
}
