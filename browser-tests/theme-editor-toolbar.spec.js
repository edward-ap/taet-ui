import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
const ready=async page=>{await page.goto('/examples/theme-editor/');await expect(page.locator('body')).toHaveAttribute('data-ready','true');};
const command=(page,name)=>page.getByRole('toolbar',{name:'Preset actions'}).getByRole('button',{name,exact:true});
const nameDialog=async(page,name)=>{await page.getByRole('dialog').getByRole('textbox',{name:'Preset name'}).fill(name);await page.getByRole('dialog').getByRole('button',{name:'OK',exact:true}).click();};
test('toolbar manages local presets with dialogs, protection and portable files',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await ready(page);
 await expect(command(page,'Save')).toBeDisabled();await expect(command(page,'Delete')).toBeDisabled();
 await command(page,'New').click();await nameDialog(page,'Ocean draft');
 await expect(page.locator('#preset-current')).not.toHaveText('Light Blue');
 await page.getByRole('slider',{name:'Base hue',exact:true}).fill('80');
 await command(page,'Save').click();await page.getByRole('dialog').getByRole('button',{name:'Cancel',exact:true}).click();
 await command(page,'Save').click();await page.getByRole('dialog').getByRole('button',{name:'OK',exact:true}).click();await expect(page.getByRole('status')).toContainText('Preset saved locally.');
 const download=page.waitForEvent('download');await command(page,'Export').click();const file=await download;expect(file.suggestedFilename()).toBe('Ocean-draft.taet-theme.json');const text=await readFile(await file.path(),'utf8');expect(JSON.parse(text)).toMatchObject({format:'taet-ui-theme',version:1,name:'Ocean draft'});
 await page.locator('#preset-toolbar input[type=file]').setInputFiles({name:'theme.json',mimeType:'application/json',buffer:Buffer.from(text)});await nameDialog(page,'Imported ocean');
 await command(page,'Delete').click();await page.getByRole('dialog').getByRole('button',{name:'Cancel',exact:true}).click();await expect(command(page,'Delete')).toBeEnabled();
 await command(page,'Delete').click();await page.getByRole('dialog').getByRole('button',{name:'OK',exact:true}).click();await expect(command(page,'Delete')).toBeDisabled();
 await page.reload();await expect(page.locator('body')).toHaveAttribute('data-ready','true');await openLocal(page,'Ocean draft');await expect(page.getByRole('slider',{name:'Base hue',exact:true})).toHaveValue('80');
 await page.screenshot({path:'test-results/theme-toolbar.png',fullPage:true});await page.goto('about:blank');expect(errors).toEqual([]);
});
test('host stub reports missing connection and adapter receives explorer and apply requests',async({page})=>{
 await ready(page);await command(page,'Open').click();await expect(page.getByRole('alert')).toContainText('Host API not connected: getPresetDirectory');
 await page.evaluate(async()=>{const {presets}=await import('/examples/theme-editor/theme-presets.js');window.calls=[];window.taetThemeEditor.connectHost({
 getPresetDirectory:async()=>{calls.push('directory');return 'presets-folder';},
 openPresetExplorer:async({directory,purpose})=>{calls.push({directory,purpose});return {name:'Host palette',definition:structuredClone(presets[3].definition)};},
 applyPreset:async({preset,theme})=>{calls.push({applied:preset.name,token:theme.tokens['--dui-window-header-bg']});}
 });});
 await command(page,'Open').click();await expect(page.locator('#preset-current')).not.toHaveText('Light Blue');
 await command(page,'Copy').click();await nameDialog(page,'Host copy');await command(page,'Apply').click();await expect(page.getByRole('status')).toContainText('Preset applied');
 expect(await page.evaluate(()=>calls)).toEqual(['directory',{directory:'presets-folder',purpose:'open'},'directory',{directory:'presets-folder',purpose:'copy'},{applied:'Host copy',token:expect.stringMatching(/^#/)}]);
});

async function openLocal(page,name){
 await page.evaluate(name=>window.taetThemeEditor.connectHost({getPresetDirectory:async()=> 'local',openPresetExplorer:async()=>window.taetThemeEditor.getPresets().find(p=>p.name===name)}),name);
 await page.getByRole('toolbar',{name:'Preset actions'}).getByRole('button',{name:'Open',exact:true}).click();
 await expect(page.locator('#preset-current')).toHaveText(name);
}
