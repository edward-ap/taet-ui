import {test,expect} from '@playwright/test';
test.beforeEach(async({page})=>{
 await page.goto('/browser-tests/recipes.html');
 await page.evaluate(async()=>{const {FileUpload}=await import('/src/ui/all.js'); window.upload=new FileUpload('#root',{accept:'.txt'});});
});
test('browse, file drop, rejection, keyboard removal and disabled intake',async({page})=>{
 await page.locator('input[type=file]').setInputFiles({name:'a.txt',mimeType:'text/plain',buffer:Buffer.from('hello')});
 await expect(page.getByRole('listitem')).toHaveCount(1);
 await page.evaluate(()=>{
  const data=new DataTransfer();data.items.add(new File(['x'],'b.txt'));data.items.add(new File(['x'],'bad.exe'));
  upload.element.dispatchEvent(new DragEvent('drop',{dataTransfer:data,bubbles:true,cancelable:true}));
 });
 await expect(page.getByRole('listitem')).toHaveCount(2);
 await expect(page.getByRole('status')).toContainText('not accepted');
 await page.getByRole('button',{name:'Remove a.txt',exact:true}).focus();await page.keyboard.press('Enter');
 await expect(page.getByRole('listitem')).toHaveCount(1);
 await expect(page.getByRole('button',{name:'Add files',exact:true})).toBeFocused();
 expect(await page.evaluate(()=>{upload.disable();const data=new DataTransfer();data.items.add(new File(['x'],'c.txt'));return upload.element.dispatchEvent(new DragEvent('drop',{dataTransfer:data,cancelable:true}));})).toBe(false);
 await expect(page.getByRole('listitem')).toHaveCount(1);
});
test('progress, retry and late completion after teardown',async({page})=>{
 await page.evaluate(async()=>{
  upload.destroy();const {FileUpload}=await import('/src/ui/all.js');window.jobs=[];
  window.upload=new FileUpload('#root',{upload:(file,ctx)=>new Promise((resolve,reject)=>jobs.push({ctx,resolve,reject}))});
  upload.addFiles([new File(['x'],'<b>book.txt')]);void upload.start();
 });
 await expect(page.getByRole('progressbar')).toBeVisible();
 await page.evaluate(()=>jobs[0].ctx.onProgress(.5));
 await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow','50');
 await page.evaluate(()=>jobs[0].reject(new Error('offline')));
 await expect(page.getByRole('button',{name:'Retry <b>book.txt',exact:true})).toBeEnabled();
 await page.getByRole('button',{name:'Retry <b>book.txt',exact:true}).click();
 await expect.poll(()=>page.evaluate(()=>jobs.length)).toBe(2);
 expect(await page.locator('.dui-file-upload__name b').count()).toBe(0);
 await page.evaluate(()=>{upload.destroy();jobs[1].ctx.onProgress(.9);jobs[1].resolve('late');});
 await expect(page.locator('.dui-file-upload')).toHaveCount(0);
});
test('external drop links detach without intercepting text drags',async({page})=>{
 expect(await page.evaluate(()=>{
  const area=document.createElement('div');document.body.append(area);const link=upload.linkDropArea(area);
  const text=new DataTransfer();text.setData('text/plain','text');
  const allowed=area.dispatchEvent(new DragEvent('drop',{dataTransfer:text,cancelable:true}));
  link.dispose();link.dispose();const files=new DataTransfer();files.items.add(new File(['x'],'x.txt'));
  const detached=area.dispatchEvent(new DragEvent('drop',{dataTransfer:files,cancelable:true}));
  area.remove();upload.destroy();return [allowed,detached];
 })).toEqual([true,true]);
});

test('documentation factories execute and render the local and adapter examples',async({page})=>{
 await page.evaluate(async()=>{
  upload.destroy(); const {fileUploadPage}=await import('/docs/src/pages/FileUpload.page.js');
  window.examples=fileUploadPage.examples.map(example=>{
   const control=example.create({log:{write(){}}});control.mount('#root');
   control.addFiles([new File(['book'],'book.djvu')]);return control;
  });
 });
 await expect(page.getByRole('listitem')).toHaveCount(2);
 await page.screenshot({path:'test-results/file-upload-docs.png'});
 await page.evaluate(()=>examples.forEach(example=>example.destroy()));
 await expect(page.locator('.dui-file-upload')).toHaveCount(0);
});

test('empty drop area becomes a bounded multi-file table and success replaces progress',async({page})=>{
 await expect(page.locator('.dui-file-upload__drop')).toBeVisible();
 await expect(page.getByRole('button',{name:'Browse files'})).toBeVisible();
 await page.evaluate(async()=>{
  upload.destroy();const {FileUpload}=await import('/src/ui/all.js');window.jobs=[];
  window.upload=new FileUpload('#root',{height:240,upload:(file,ctx)=>new Promise(resolve=>jobs.push({ctx,resolve}))});
  const data=new DataTransfer();for(let i=0;i<12;i++) data.items.add(new File(['abc'],`file-${i}.txt`,{lastModified:Date.UTC(2024,0,15)}));
  upload.element.dispatchEvent(new DragEvent('drop',{dataTransfer:data,bubbles:true,cancelable:true}));
 });
 await expect(page.locator('.dui-file-upload__drop')).toBeHidden();
 await expect(page.getByRole('listitem')).toHaveCount(12);
 await expect(page.locator('.dui-file-upload__size').first()).toContainText('2024');
 expect(await page.locator('.dui-file-upload__list').evaluate(el=>el.scrollHeight>el.clientHeight)).toBe(true);
 expect(await page.locator('.dui-file-upload').evaluate(el=>Math.round(el.getBoundingClientRect().height))).toBe(240);
 const chooser=page.waitForEvent('filechooser');await page.getByRole('button',{name:'Add files',exact:true}).click();
 await (await chooser).setFiles({name:'extra.txt',mimeType:'text/plain',buffer:Buffer.from('x')});
 await expect(page.getByRole('listitem')).toHaveCount(13);
 await page.evaluate(()=>void upload.start());
 await expect(page.getByRole('progressbar').first()).toBeVisible();
 await page.evaluate(()=>{jobs[0].ctx.onProgress(.5);jobs[0].resolve('ok');});
 await expect(page.getByRole('img',{name:'Uploaded file-0.txt',exact:true})).toBeVisible();
 await expect(page.getByRole('progressbar',{name:'Progress for file-0.txt',exact:true})).toBeHidden();
 await page.screenshot({path:'test-results/file-upload-table.png'});
 await page.evaluate(()=>upload.clear());
 await expect(page.locator('.dui-file-upload__drop')).toBeVisible();
 await expect(page.getByRole('listitem')).toHaveCount(0);
});
