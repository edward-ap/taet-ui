import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';

const ready=async page=>{await page.goto('/examples/theme-editor/');await expect(page.locator('body')).toHaveAttribute('data-ready','true');};
const nameDialog=async(page,name)=>{await page.getByRole('dialog').getByRole('textbox',{name:'Preset name'}).fill(name);await page.getByRole('dialog').getByRole('button',{name:'OK',exact:true}).click();};

test('canonical documentation and example globals retain previous host aliases',async({page})=>{
 await page.goto('/docs/index.html');
 await expect.poll(()=>page.evaluate(()=>Boolean(window.taetUiDocs?.shell))).toBe(true);
 expect(await page.evaluate(()=>window.taetUiDocs===window.denseUiDocs)).toBe(true);
 await ready(page);
 expect(await page.evaluate(()=>window.taetThemeEditor===window.denseThemeEditor)).toBe(true);
});

test('previous theme files import and re-export with the current format and filename',async({page})=>{
 await ready(page);
 const definition=await page.evaluate(()=>window.taetThemeEditor.getPreset().definition);
 const upload=async data=>page.locator('#preset-toolbar input[type=file]').setInputFiles({name:'previous-theme.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(data))});
 await upload({format:'dense-ui-theme',version:1,name:'Previous palette',definition});
 await nameDialog(page,'Imported palette');
 await expect(page.locator('#preset-current')).toHaveText('Imported palette');
 const download=page.waitForEvent('download');
 await page.getByRole('button',{name:'Export',exact:true}).click();
 const file=await download;
 expect(file.suggestedFilename()).toBe('Imported-palette.taet-theme.json');
 expect(JSON.parse(await readFile(await file.path(),'utf8'))).toMatchObject({format:'taet-ui-theme',version:1,name:'Imported palette'});
 await upload({format:'unrelated-theme',version:1,definition});
 await expect(page.getByRole('alert')).toContainText('Unsupported theme file format.');
 await upload({format:'taet-ui-theme',version:2,definition});
 await expect(page.getByRole('alert')).toContainText('Unsupported theme file format.');
 await expect(page.getByRole('dialog')).toHaveCount(0);
 await expect(page.locator('#preset-current')).toHaveText('Imported palette');
});

test('previous saved presets load without eager writes and migrate on the next save',async({page})=>{
 await page.goto('/browser-tests/recipes.html');
 await page.evaluate(async()=>{
  const {ThemeDesigner}=await import('/src/ui/all.js');
  const {presets}=await import('/src/ui/theme-designer/theme-presets.js');
  window.Designer=ThemeDesigner;
  window.previousKey='dense-ui.theme-editor.v1';window.currentKey='taet-ui.theme-editor.v1';
  window.previousValue=JSON.stringify([{id:'custom:previous',name:'Saved palette',definition:presets[1].definition}]);
  window.values=new Map([[previousKey,previousValue]]);window.writes=[];
  window.savedStorage={getItem:key=>values.get(key)??null,setItem:(key,value)=>{writes.push(key);values.set(key,value);}};
  window.designer=new Designer('#root',{storage:savedStorage});
 });
 expect(await page.evaluate(()=>designer.getPresets().some(p=>p.name==='Saved palette'))).toBe(true);
 expect(await page.evaluate(()=>writes)).toEqual([]);
 await page.getByRole('button',{name:'New',exact:true}).click();await nameDialog(page,'New palette');
 expect(await page.evaluate(()=>writes)).toEqual(['taet-ui.theme-editor.v1']);
 expect(await page.evaluate(()=>values.get(previousKey)===previousValue)).toBe(true);
 expect(await page.evaluate(()=>JSON.parse(values.get(currentKey)).map(p=>p.name))).toEqual(['Saved palette','New palette']);
 await page.evaluate(()=>{designer.destroy();values.set(currentKey,'[]');window.designer=new Designer('#root',{storage:savedStorage});});
 expect(await page.evaluate(()=>designer.getPresets().some(p=>p.name==='Saved palette'))).toBe(false);
 expect(await page.evaluate(()=>writes)).toEqual(['taet-ui.theme-editor.v1']);
 await page.evaluate(()=>designer.destroy());await expect(page.locator('#root')).toBeEmpty();
});
