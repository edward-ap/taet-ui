import {test,expect} from '@playwright/test';
const rows=(page,kind)=>page.locator(`.editor-matrix__${kind} [data-dui-grid-row-id]`);
const cell=(page,kind,id,column)=>page.locator(`.editor-matrix__${kind} [data-dui-grid-row-id="string:${id}"] [data-dui-grid-column-id="${column}"]`);
const popup=page=>page.locator('.dui-overlay-root > .dui-dropdown-list__popup:visible, .dui-overlay-root > .dui-date-time-picker:visible, .dui-overlay-root > .dui-time-picker:visible');
test.beforeEach(async({page})=>{page.on('pageerror',e=>{throw e});await page.goto('/examples/grid-editors/');await expect(page.locator('.dui-grid')).toHaveCount(2);await expect(rows(page,'grid').first()).toBeVisible()});
test('matrix shows raw types, formatter-independent number drafts and exactly one write per commit',{tag:'@input-editing'},async({page})=>{
 expect(await page.evaluate(()=>editorMatrix.editorKinds)).toEqual(['text','number','select','checkbox','switch','date','time','dateTime','radio']);
 await expect(page.locator('.editor-matrix__values')).toContainText('number    null: null');
 for(const [kind,value]of [['grid','-2.75'],['tree','4.25']]){
  await expect(cell(page,kind,'zero','number')).toHaveText(kind==='grid'?'0.00':'-2.75');await cell(page,kind,'zero','number').dblclick();const input=page.locator(`.editor-matrix__${kind} .dui-grid__editor-host input`);await expect(input).toHaveValue(kind==='grid'?'0':'-2.75');await input.press('ControlOrMeta+A');await input.pressSequentially(value);await input.press('Enter');await expect(input).toHaveCount(0);
  expect(await page.evaluate(()=>editorMatrix.data.get('zero').number)).toBe(Number(value));
 }
 expect(await page.evaluate(()=>editorMatrix.counters)).toEqual({cellChange:2,editCommit:2,editReject:0,storeChange:2});
 for(const kind of ['grid','tree']){
  await cell(page,kind,'zero','number').dblclick();const input=page.locator(`.editor-matrix__${kind} .dui-grid__editor-host input`);
  await input.press('ControlOrMeta+A');await input.pressSequentially('1.0');await expect(input).toHaveValue('1.0');await input.pressSequentially('5');await expect(input).toHaveValue('1.05');
  await input.press(kind==='grid'?'Escape':'Enter');await expect(input).toHaveCount(0);
  expect(await page.evaluate(()=>({value:editorMatrix.data.get('zero').number,type:typeof editorMatrix.data.get('zero').number}))).toEqual({value:kind==='grid'?4.25:1.05,type:'number'});
  expect(await page.evaluate(()=>editorMatrix.counters)).toEqual({cellChange:kind==='grid'?2:3,editCommit:kind==='grid'?2:3,editReject:0,storeChange:kind==='grid'?2:3});
 }

 await cell(page,'grid','readonly','number').dblclick();await expect(page.locator('.dui-grid__editor-host')).toHaveCount(0);
 expect(await page.evaluate(()=>editorMatrix.grid.startEdit('readonly','text'))).toBe(false);
 await page.evaluate(()=>editorMatrix.destroy());await expect(page.locator('#root')).toBeEmpty();
});
test('matrix retains draft on unrelated silent update and disposes editor/popups on parse remove and disable',async({page})=>{
 await cell(page,'grid','empty','text').dblclick();let input=page.locator('.editor-matrix__grid .dui-grid__editor-host input');await input.fill('Draft survives');
 await page.evaluate(()=>editorMatrix.data.update('decimal',{name:'Background changed'},{silent:true}));await expect(input).toHaveValue('Draft survives');await expect(input).toBeFocused();expect(await page.evaluate(()=>editorMatrix.counters.storeChange)).toBe(0);
 await page.getByRole('button',{name:'Reload records',exact:true}).click();await expect(input).toHaveCount(0);
 await cell(page,'tree','empty','select').dblclick();await page.locator('.dui-dropdown-list__display').press('ArrowDown');await expect(popup(page)).toHaveCount(1);
 await page.getByRole('button',{name:'Disable / enable',exact:true}).click();await expect(popup(page)).toHaveCount(0);await expect(page.locator('.dui-grid__editor-host')).toHaveCount(0);for(const table of await page.locator('.dui-grid').all())await expect(table).toHaveAttribute('aria-disabled','true');
 await page.getByRole('button',{name:'Disable / enable',exact:true}).click();
 await cell(page,'tree','empty','select').dblclick();await page.locator('.dui-dropdown-list__display').press('ArrowDown');await page.getByRole('button',{name:'Remove selected',exact:true}).click();await expect(popup(page)).toHaveCount(0);await expect(page.locator('.dui-grid__editor-host')).toHaveCount(0);expect(await page.evaluate(()=>editorMatrix.data.get('empty'))).toBeUndefined();
 await page.evaluate(()=>editorMatrix.destroy());await expect(page.locator('.dui-grid__control-editor,.dui-dropdown-list__popup,.dui-time-picker,.dui-date-time-picker')).toHaveCount(0);
});
test('matrix light/dark keeps 10px gutter, 24px virtual rows and one typed live draft',async({page})=>{
 await page.getByRole('button',{name:'Light / dark',exact:true}).click();await expect(page.locator('body')).toHaveClass(/dui-theme-dark-blue/);
 for(const kind of ['grid','tree']){
  await cell(page,kind,'invalid','text').dblclick();let input=page.locator(`.editor-matrix__${kind} .dui-grid__editor-host input`);await input.press('Enter');await expect(input).toBeFocused();await expect(input).toHaveValue('!');await expect(page.locator('.editor-matrix__values')).toContainText('string: "!"');await input.press('Escape');
  const geometry=await page.locator(`.editor-matrix__${kind}`).evaluate(root=>({gutter:root.querySelector('[data-dui-grid-indicator=header]').getBoundingClientRect().width,heights:[...root.querySelectorAll('.dui-grid__row')].map(r=>r.getBoundingClientRect().height)}));expect(geometry.gutter).toBe(10);expect(geometry.heights.every(h=>h===24)).toBe(true);
 }
 await page.getByRole('button',{name:'Light / dark',exact:true}).click();await expect(page.locator('body')).toHaveClass(/dui-theme-light-blue/);await page.evaluate(()=>editorMatrix.destroy());
});

test('matrix selection helper stops when a selection callback closes its owner',async({page})=>{
 await page.evaluate(()=>{editorMatrix.grid.events.on('selectionChange',()=>editorMatrix.destroy());editorMatrix.select('zero')});
 await expect(page.locator('#root')).toBeEmpty();
});
