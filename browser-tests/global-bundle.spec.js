import {test,expect} from '@playwright/test';
for(const profile of ['full','components','foundation'])for(const min of [0,1])test(profile+' classic IIFE '+(min?'minified':'readable')+' has the same public exports and ownership',async({page})=>{
 const errors=[],unexpected=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',route=>{const u=new URL(route.request().url());if(u.protocol==='data:')return route.continue();
  if(u.hostname!=='127.0.0.1'||!/^\/(?:dist\/|browser-tests\/global-bundle.html)/.test(u.pathname)){unexpected.push(u.href);return route.abort();}return route.continue();});
 await page.goto('/browser-tests/global-bundle.html?profile='+profile+'&min='+min);
 await page.waitForFunction(()=>window.globalBundleResult||window.globalBundleError);
 expect(await page.evaluate(()=>window.globalBundleError)).toBeUndefined();
 expect(await page.evaluate(()=>window.globalBundleResult)).toMatchObject({profile,min:Boolean(min)});
 expect(errors).toEqual([]);expect(unexpected).toEqual([]);
});
