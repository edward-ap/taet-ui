import {test,expect} from '@playwright/test';
const cell=(page,kind,id)=>page.locator(`.editor-matrix__${kind} [data-dui-grid-row-id="string:${id}"] [data-dui-grid-column-id="switch"]`);
test.beforeEach(async({page})=>{page.on('pageerror',e=>{throw e});await page.goto('/examples/grid-editors/');await page.waitForFunction(()=>window.editorMatrix?.grid)});
test('editor portal uses the bundled font token and actual Noto Sans glyphs',async({page,browserName})=>{
 expect((await page.request.get('/src/ui/fonts/NotoSans-variable.woff2')).status()).toBe(200);
 for(const theme of ['light','dark'])for(const kind of ['grid','tree']){
  await page.evaluate(({theme,kind})=>{document.body.style.fontFamily='serif';document.body.classList.remove('dui-theme-light-blue','dui-theme-dark-blue');document.body.classList.add(`dui-theme-${theme}-blue`);editorMatrix[kind].startEdit('zero','select')},{theme,kind});
  await page.locator('.dui-dropdown-list__display').press('ArrowDown');const popup=page.locator('.dui-dropdown-list__popup:visible');await expect(popup).toHaveCount(1);
  const fonts=await popup.evaluate(async popup=>{await document.fonts.ready;const root=getComputedStyle(document.querySelector('.dui-grid')),token=root.fontFamily;return {inspector:getComputedStyle(document.querySelector('.editor-matrix__values')).fontFamily,token,rootSize:root.fontSize,rootLine:root.lineHeight,loaded:[...document.fonts].some(f=>f.family.replaceAll('\"','')==='Noto Sans'&&f.status==='loaded'),nodes:[popup.parentElement,popup,...popup.querySelectorAll('.dui-dropdown-list__item-text,.dui-dropdown-list__search')].map(e=>{const s=getComputedStyle(e);return {family:s.fontFamily,size:s.fontSize,line:s.lineHeight}})}});
  expect(fonts.token.split(',')[0].replaceAll('"','').trim()).toBe('Noto Sans');expect(fonts.loaded).toBe(true);expect(fonts.inspector).toBe(fonts.token);
  for(const f of fonts.nodes)expect(f).toEqual({family:fonts.token,size:fonts.rootSize,line:fonts.rootLine});
  if(browserName==='chromium'){
   const cdp=await page.context().newCDPSession(page);await cdp.send('DOM.enable');await cdp.send('CSS.enable');const doc=await cdp.send('DOM.getDocument');const node=await cdp.send('DOM.querySelector',{nodeId:doc.root.nodeId,selector:'.dui-dropdown-list__popup:not([hidden]) .dui-dropdown-list__item-text'});const actual=await cdp.send('CSS.getPlatformFontsForNode',{nodeId:node.nodeId});await cdp.detach();expect(actual.fonts.length).toBeGreaterThan(0);for(const f of actual.fonts){expect(f.isCustomFont).toBe(true);expect(f.familyName).toBe('Noto Sans')}
  }
  await page.keyboard.press('Escape');await page.keyboard.press('Escape');
 }await page.evaluate(()=>editorMatrix.destroy());
});
for(const kind of ['grid','tree'])test(`${kind} Switch read indicator has explicit editing and bounded virtual DOM`,async({page})=>{
 const indicator=cell(page,kind,'zero').getByRole('img');await expect(indicator).toHaveAttribute('aria-label','Off');await expect(cell(page,kind,'zero')).toHaveText('');
 await cell(page,kind,'zero').click();expect(await page.evaluate(()=>editorMatrix.data.get('zero').switch)).toBe(false);await expect(page.locator('.dui-grid__editor-host')).toHaveCount(0);
 await cell(page,kind,'zero').dblclick();const input=page.locator('.dui-grid__editor-host .dui-switch__input');await expect(input).toBeFocused();await page.locator('.dui-grid__editor-host .dui-switch__visual').click();await expect(input).toBeChecked();expect(await page.evaluate(()=>editorMatrix.data.get('zero').switch)).toBe(false);await page.keyboard.press('Escape');await expect(indicator).toHaveAttribute('aria-label','Off');expect(await page.evaluate(()=>editorMatrix.counters.storeChange)).toBe(0);
 await page.locator(`.editor-matrix__${kind}`).press('F2');await expect(input).toBeFocused();await page.keyboard.press('Space');await expect(input).toBeChecked();
 await page.evaluate(kind=>editorMatrix.live.get(editorMatrix[kind]).adapter.control.setValidators([v=>v===false||'Rejected draft']),kind);await page.keyboard.press('Tab');await expect(input).toBeFocused();await expect(input).toBeChecked();expect(await page.evaluate(()=>editorMatrix.data.get('zero').switch)).toBe(false);
 await page.evaluate(kind=>editorMatrix.live.get(editorMatrix[kind]).adapter.control.setValidators([]),kind);await page.keyboard.press('Enter');await expect(page.locator('.dui-grid__editor-host')).toHaveCount(0);
 for(const k of ['grid','tree'])await expect(cell(page,k,'zero').getByRole('img')).toHaveAttribute('aria-label','On');
 expect(await page.evaluate(()=>({value:editorMatrix.data.get('zero').switch,type:typeof editorMatrix.data.get('zero').switch,counters:editorMatrix.counters}))).toEqual({value:true,type:'boolean',counters:{cellChange:1,editCommit:1,editReject:1,storeChange:1}});
 await cell(page,kind,'readonly').dblclick();await expect(page.locator('.dui-grid__editor-host')).toHaveCount(0);
 await page.getByRole('button',{name:'Disable / enable',exact:true}).click();const box=await cell(page,kind,'zero').boundingBox();await page.mouse.click(box.x+box.width/2,box.y+box.height/2);expect(await page.evaluate(()=>editorMatrix.data.get('zero').switch)).toBe(true);await expect(page.locator('.dui-grid__editor-host')).toHaveCount(0);await page.getByRole('button',{name:'Disable / enable',exact:true}).click();
 await page.evaluate(()=>editorMatrix.data.update('zero',{switch:false},{silent:true}));for(const k of ['grid','tree'])await expect(cell(page,k,'zero').getByRole('img')).toHaveAttribute('aria-label','Off');
 for(const top of [600,1200,2000,0]){
  await page.locator(`.editor-matrix__${kind} .dui-grid__body`).evaluate((b,top)=>{b.scrollTop=top;b.dispatchEvent(new Event('scroll'))},top);await page.evaluate(async()=>{await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame)});
  const state=await page.locator(`.editor-matrix__${kind}`).evaluate(root=>({rows:root.querySelectorAll('[data-dui-grid-row-id]').length,controls:root.querySelectorAll('.dui-switch.dui-control').length,inputs:root.querySelectorAll('[data-dui-grid-column-id="switch"] input').length,indicators:[...root.querySelectorAll('.dui-grid__switch-indicator')].map(e=>({role:e.getAttribute('role'),control:e.hasAttribute('data-dui-control-id')}))}));expect(state.rows).toBeLessThan(75);expect(state.controls).toBe(0);expect(state.inputs).toBe(0);expect(state.indicators.length).toBeGreaterThan(0);for(const e of state.indicators)expect(e).toEqual({role:'img',control:false});
 }
 expect(await page.evaluate(()=>editorMatrix.counters)).toEqual({cellChange:1,editCommit:1,editReject:1,storeChange:1});await page.evaluate(()=>editorMatrix.destroy());await expect(page.locator('#root')).toBeEmpty();await expect(page.locator('.dui-grid__switch-indicator,.dui-switch__input')).toHaveCount(0);
});
