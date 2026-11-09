import { expect, test } from './input-test-fixture.js';
const cases = [
  ['DateInput', 'date', '2026-09-06', '2026-10-17'],
  ['TimeInput', 'time', '12:34', '18:45'],
  ['DateTimeInput', 'dateTime', '2026-09-06T12:34', '2026-10-17T18:45']
];
const display = value => value.replace('T', ' ');
test.describe('Temporal live editing owners', { tag: '@input-editing' }, () => {
  test.afterEach(async ({ page }) => { await page.evaluate(() => window.owner?.destroy()); });
  for (const [kind, editorName, initial, next] of cases) {
    test(`Form ${kind} live model, focused submit, silent reset and owner teardown`, async ({ page }) => {
      await page.goto('/browser-tests/recipes.html');
      await page.evaluate(async ({kind, initial}) => {
        const ui = await import('/src/ui/all.js');
        window.field = new ui[kind]({name:'when', value:initial});
        window.owner = new ui.Form().row(field); owner.mount('#root');
        window.events=[]; owner.events.on('submit', e => events.push(e.value));
        window.changes=[]; field.events.on('change', e=>changes.push(e.newValue));
      }, {kind, initial});
      const input=page.locator('#root input');
      if (kind !== 'TimeInput') {
        await input.focus();
        await input.evaluate(el => el.setSelectionRange(el.value.length - 1, el.value.length - 1));
        await input.pressSequentially('1');
        await expect(input).toHaveValue(display(initial));
        expect(await page.evaluate(() => owner.value.get())).toEqual({ when: initial });
        expect(await page.evaluate(() => changes)).toEqual([]);
      }
      await input.press('ControlOrMeta+A'); await input.pressSequentially(display(next));
      expect(await page.evaluate(()=>owner.value.get())).toEqual({when:next});
      expect(await page.evaluate(()=>owner.validate().ok)).toBe(true);
      await expect(input).toHaveValue(display(next));
      expect(await page.evaluate(()=>owner.submit({origin:'user',userAction:true}))).toBe(true);
      expect(await page.evaluate(()=>events)).toEqual([{when:next}]);
      await page.evaluate(initial=>{changes.length=0;owner.value.set({when:initial},{silent:true});},initial);
      await expect(input).toHaveValue(display(initial));
      expect(await page.evaluate(()=>changes)).toEqual([]);
      await page.evaluate(()=>owner.destroy()); await expect(input).toHaveCount(0);
      expect(await page.evaluate(()=>field.destroyed)).toBe(true);
    });

    for(const facade of ['Grid','TreeGrid']) for(const action of ['Enter','Tab','API','Escape','destroy']) {
      test(`${facade} ${kind} ${action} stores once or discards live editor`, async({page})=>{
        await page.goto('/browser-tests/recipes.html');
        await page.evaluate(async({facade,editorName,initial})=>{
          const ui=await import('/src/ui/grid-api.js');
          const base=ui.gridEditors[editorName]();
          const editor=ui.createGridEditorFactory(context=>{window.ed=base.createCellEditor(context);return ed;},{activation:base.activation,filterType:base.filterType});
          window.owner=new ui[facade]('#root',{width:500,height:220,treeColumnId:'label',columns:[{id:'label',readOnly:true},{id:'when',editor},{id:'tail',editor:ui.gridEditors.text()}]});
          owner.data.parse([{id:1,parentId:null,label:'Row',when:initial,tail:'Tail'}]);
          window.writes=[];owner.data.events.on('change',e=>writes.push(e.type));
          window.events=[];for(const name of ['cellChange','editCommit','editCancel']) owner.events.on(name,()=>events.push(name));
          owner.startEdit(1,'when');
        },{facade,editorName,initial});
        const input=page.locator('.dui-grid__editor-host input');
        await expect(input).toBeFocused();
        if (kind !== 'TimeInput') {
          await input.evaluate(el => el.setSelectionRange(el.value.length - 1, el.value.length - 1));
          await input.pressSequentially('1');
          await expect(input).toHaveValue(display(initial));
          expect(await page.evaluate(() => ed.getValue())).toBe(initial);
          expect(await page.evaluate(() => writes)).toEqual([]);
        }
        await input.press('ControlOrMeta+A');await input.pressSequentially(display(next));
        await expect(input).toHaveValue(display(next));
        expect(await page.evaluate(()=>ed.getValue())).toBe(next);
        expect(await page.evaluate(()=>owner.data.get(1).when)).toBe(initial);
        expect(await page.evaluate(()=>writes)).toEqual([]);
        if(action==='API') expect(await page.evaluate(()=>owner.commitEdit())).toBe(true);
        else if(action==='destroy') await page.evaluate(()=>owner.destroy());
        else await input.press(action);
        const saved=!['Escape','destroy'].includes(action);
        expect(await page.evaluate(()=>writes.length)).toBe(saved?1:0);
        if(action!=='destroy') expect(await page.evaluate(()=>owner.data.get(1).when)).toBe(saved?next:initial);
        expect(await page.evaluate(()=>events.filter(e=>e==='editCommit').length)).toBe(saved?1:0);
        if(saved) expect(await page.evaluate(()=>events)).toEqual(['cellChange','editCommit']);
        if(action==='Tab') {await expect(page.locator('.dui-grid__editor-host input')).toBeFocused();await page.keyboard.press('Escape');}
        else await expect(page.locator('.dui-grid__editor-host')).toHaveCount(0);
      });
    }
  }
});
