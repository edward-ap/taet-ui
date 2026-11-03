import {test,expect} from '@playwright/test';
test.describe.configure({mode:'parallel'});
for(const profile of ['full','components','foundation'])for(const min of [0,1])test(profile+' bundle '+(min?'minified':'readable')+' runs without source files',async({page,baseURL})=>{
 const errors=[],unexpected=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(r.url());});
 const origin=new URL(baseURL).origin;
 await page.route('**/*',route=>{const url=new URL(route.request().url());if(url.protocol==='data:')return route.continue();
  if(url.origin!==origin||!(/^(?:\/dist\/|\/browser-tests\/bundle(?:-fixture\.js|\.html))/.test(url.pathname))){unexpected.push(url.href);return route.abort();}return route.continue();});
 await page.goto('/browser-tests/bundle.html?profile='+profile+'&min='+min+'&autorun=1');
 await page.waitForFunction(()=>window.bundleResult||window.bundleError);
 expect(await page.evaluate(()=>window.bundleError)).toBeUndefined();
 expect(await page.evaluate(()=>window.bundleResult)).toMatchObject({profile,minified:Boolean(min),font:true});
 expect(errors).toEqual([]);expect(unexpected).toEqual([]);
});
