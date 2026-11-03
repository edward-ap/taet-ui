import {test,expect} from '@playwright/test';

test('live Quick Start references only shipped delivery assets and profiles',async({page,request})=>{
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('/docs/index.html#quick-start');
 await expect(page.getByRole('heading',{name:'Quick Start',level:1})).toBeVisible();
 const text=await page.locator('article.dui-component-page p').allTextContents();
 const instructions=text.join('\n');
 const response=await request.get('/dist/size-report.json');expect(response.ok()).toBe(true);
 const report=await response.json(),files=report.profiles.full.files;
 const delivery=text.find(paragraph=>paragraph.startsWith('Run npm run build'))??'';
 const assets=[...new Set([...(instructions.match(/\b[\w.-]+\.(?:js|css|woff2)\b/g)??[]),...(delivery.match(/\b[\w.-]+\.md\b|\bLICENSE\b/g)??[])])];
 // app.js is the host application created by its author, not a library asset.
 for(const asset of assets.filter(name=>name!=='app.js')){
  expect(Object.hasOwn(files,asset),'Quick Start references an absent delivery asset: '+asset).toBe(true);
  expect((await request.get('/dist/'+asset)).ok(),asset+' must be served from the delivery').toBe(true);
 }
 expect(assets).toEqual(expect.arrayContaining(['taet-ui.min.js','taet-ui.min.css','LICENSE','THIRD_PARTY_NOTICES.md']));
 expect(instructions).toContain('fonts/');
 const fonts=Object.keys(files).filter(name=>name.startsWith('fonts/'));
 expect(fonts.some(name=>name.endsWith('.woff2'))).toBe(true);
 expect(fonts.some(name=>name.endsWith('-OFL.txt'))).toBe(true);
 for(const font of fonts)expect((await request.get('/dist/'+font)).ok(),font).toBe(true);
 for(const [,profile]of instructions.matchAll(/\bdist\/([a-z][a-z0-9-]*)\//g)){
  expect(Object.hasOwn(report.profiles,profile),'Absent documented profile: '+profile).toBe(true);
  expect((await request.get('/dist/'+profile+'/taet-ui.min.js')).ok()).toBe(true);
 }
 await page.locator('.dui-example-host__live').getByRole('button',{name:'Save',exact:true}).click();
 await expect(page.locator('.dui-example-host__output')).toHaveText('Save clicked');
 expect(errors).toEqual([]);
});
