import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import * as full from '../src/ui/all.js';
import * as components from './bundle-profiles/components.js';
import * as foundation from '../src/foundation/index.js';
import {docsCatalog} from '../docs/src/docsCatalog.js';
const report=JSON.parse(await readFile(new URL('../dist/size-report.json',import.meta.url),'utf8'));
assert.match(report.source.contentSha256,/^[a-f0-9]{64}$/);
assert.ok(['clean','dirty','uncommitted','not-versioned'].includes(report.source.git.state));
if(!report.source.git.revision)assert.notEqual(report.source.git.state,'clean','No invented clean commit');
for(const [name,expected]of Object.entries({full,components,foundation})){
 const prefix=name==='full'?'':name+'/';
 for(const suffix of ['','.min']){
  const actual=await import('../dist/'+prefix+'taet-ui'+suffix+'.js');
  assert.deepEqual(Object.keys(actual).sort(),Object.keys(expected).sort(),name+' exports');
  assert.equal(actual.BaseControl.name,'BaseControl');
  for(const excluded of ['RenderViewport','Painter','StockChart','SpectrumAnalyzer','FlatFileDesigner','PivotGrid'])assert.ok(!(excluded in actual),'Deferred '+excluded);
  const css=await readFile(new URL('../dist/'+prefix+'taet-ui'+suffix+'.css',import.meta.url),'utf8');
  assert.ok(!/@import\s/.test(css));
  for(const [,asset]of css.matchAll(/url\(["']?([^)"']+)["']?\)/g)){
   assert.ok(!/^(https?:|data:)/.test(asset));await access(new URL('../dist/'+prefix+asset,import.meta.url));
  }
 }
 assert.equal(report.profiles[name].worker,false);
 for(const [file,record]of Object.entries(report.profiles[name].files)){
  const bytes=await readFile(new URL('../dist/'+prefix+file,import.meta.url));
  assert.equal(bytes.length,record.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),record.sha256);
 }
}
assert.ok(report.profiles.foundation.files['taet-ui.min.js'].bytes<report.profiles.components.files['taet-ui.min.js'].bytes);
let pages=0;
function check(group){for(const page of group.pages??[]){
 for(const snippet of page.imports??[])for(const m of snippet.matchAll(/import\s*\{([^}]+)\}\s*from\s*["']([^"']+)["']/g)){
  assert.equal(m[2],'./taet-ui.min.js');for(const name of m[1].split(',').map(n=>n.trim()))assert.ok(name in full,page.id+': '+name);
 }pages++;
}for(const child of group.groups??[])check(child);}
docsCatalog.forEach(check);
console.log('Bundle profiles, provenance, assets, exclusions and '+pages+' documentation imports passed.');
