// Local licensed distribution only. No vendor sources or generated output are committed.
import {chromium} from '@playwright/test';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,sep} from 'node:path';
import assert from 'node:assert/strict';
const vendor=resolve(process.argv[2]??'');
if(!process.argv[2])throw Error('Usage: node scripts/compare-grid-dhtmlx.js <enterprise directory>');
await readFile(resolve(vendor,'codebase/suite.js'));
const root=resolve('.');
const server=createServer(async(req,res)=>{
 const url=new URL(req.url,'http://local');
 if(url.pathname==='/'){res.setHeader('Content-Type','text/html');res.end('<html><head><link rel="stylesheet" href="/vendor/codebase/suite.css"><link rel="stylesheet" href="/dense/src/ui/taet-ui.css"></head><body><div id="vendor" style="width:650px;height:240px"></div><div id="dense"></div></body></html>');return;}
 const base=url.pathname.startsWith('/vendor/')?vendor:root;
 const relative=decodeURIComponent(url.pathname.replace(/^\/(vendor|dense)\//,''));const path=resolve(base,relative);
 if(!path.startsWith(base+sep)){res.writeHead(403).end();return;}
 try{res.setHeader('Content-Type',path.endsWith('.js')?'text/javascript':path.endsWith('.css')?'text/css':'application/octet-stream');res.end(await readFile(path));}catch{res.writeHead(404).end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch();
try{
 const page=await browser.newPage();await page.route('**/*',route=>route.request().url().startsWith(origin+'/')?route.continue():route.abort());
 await page.goto(origin);await page.addScriptTag({url:origin+'/vendor/codebase/suite.js'});
 const result=await page.evaluate(async()=>{
  const {Grid}=await import('/dense/src/ui/Grid.js');
  const rows=[{id:'a',name:'Alpha',amount:10,team:'X'},{id:'b',name:'Beta',amount:20,team:'Y'},{id:'c',name:'Gamma',amount:30,team:'X'}];
  const d=new dhx.Grid('vendor',{columns:[{id:'name',header:[{text:'Name'}]},{id:'amount',type:'number',header:[{text:'Amount'}],footer:[{content:'sum'}]},{id:'team',header:[{text:'Team'}]}],data:JSON.parse(JSON.stringify(rows)),selection:'row',multiselection:true,splitAt:1});
  const g=new Grid('#dense',{height:240,columns:[{id:'name',sortable:true},{id:'amount',sortable:true,dataType:'number',summary:'total'},{id:'team'}]});g.data.parse(JSON.parse(JSON.stringify(rows)));
  const out={dhtmlx:{initial:d.data.serialize().map(r=>({id:r.id,name:r.name,amount:r.amount,team:r.team}))},dense:{initial:g.data.all()}};
  d.data.sort({by:'amount',dir:'desc',as:Number});g.sortBy('amount','desc');
  out.dhtmlx.sorted=d.data.serialize().map(r=>r.id);out.dense.sorted=g.view.projectedAll().map(r=>r.id);
  d.data.filter(r=>r.team==='X');g.setFilter(r=>r.team==='X');
  out.dhtmlx.filtered=d.data.serialize().map(r=>r.id);out.dense.filtered=g.view.projectedAll().map(r=>r.id);
  out.dhtmlx.json=JSON.parse(JSON.stringify(d.data.serialize())).map(r=>r.id);out.dense.json=JSON.parse(JSON.stringify(g.data.all())).map(r=>r.id);
  d.hideColumn('team');g.hideColumn('team');out.dhtmlx.hidden=d.isColumnHidden('team');out.dense.hidden=g.getColumn('team').hidden;
  d.showColumn('team');g.showColumn('team');out.dhtmlx.shown=!d.isColumnHidden('team');out.dense.shown=!g.getColumn('team').hidden;
  out.dense.summary=g.getColumnSummaryValue('amount');
  const methods=instance=>{
   const names=new Set();
   for(let p=instance;p && p!==Object.prototype;p=Object.getPrototypeOf(p)){
    for(const name of Object.getOwnPropertyNames(p)){
     if(name!=='constructor'&&!name.startsWith('_')&&typeof Object.getOwnPropertyDescriptor(p,name)?.value==='function')names.add(name);
    }
   }
   return [...names].sort();
  };
  out.dhtmlx.publicMethods=methods(d);
  out.dense.publicMethods=methods(g);
  window.vendorGrid=d;window.denseGrid=g;return out;
 });
 assert.deepEqual(result.dhtmlx.initial,result.dense.initial);
 for(const key of ['sorted','filtered','hidden','shown'])assert.deepEqual(result.dhtmlx[key],result.dense[key],key);
 assert.deepEqual(result.dhtmlx.json,['c','a']);
 assert.deepEqual(result.dense.json,['a','b','c']);
 assert.equal(result.dense.summary,'Total 40');
 await mkdir('test-results/grid-comparison',{recursive:true});
 await page.screenshot({path:'test-results/grid-comparison/grids.png'});
 await writeFile('test-results/grid-comparison/result.json',JSON.stringify(result,null,2)+'\n');
 await page.evaluate(()=>{vendorGrid.destructor();denseGrid.destroy();});console.log(JSON.stringify(result,null,2));
}finally{await browser.close();await new Promise(r=>server.close(r));}
