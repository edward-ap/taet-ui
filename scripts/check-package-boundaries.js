import assert from 'node:assert/strict';
import {readFile,readdir,access} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import ts from 'typescript';
const root=fileURLToPath(new URL('../',import.meta.url));
const pkg=JSON.parse(await readFile(new URL('../package.json',import.meta.url),'utf8'));
assert.equal(Object.keys(pkg.dependencies??{}).length,0,'No runtime npm dependencies');
const files=[];
async function visit(dir){for(const item of await readdir(dir,{withFileTypes:true})){const p=path.join(dir,item.name);if(item.isDirectory())await visit(p);else files.push(p);}}
await visit(path.join(root,'src'));
for(const p of files){
 const rel=path.relative(root,p).split(path.sep).join('/');
 assert.ok(!/flatfile|renderViewport|RenderViewport|StockChart|stockGeometry|stockIndicators|stockVolume|SpectrumAnalyzer|spectrumGeometry|PivotGrid|PivotModel|PivotResult|pivotHeaders|Painter|painterGeometry/.test(rel),'Deferred source in main delivery: '+rel);
 if(/\.(js|ts)$/.test(p)){
  const ast=ts.createSourceFile(p,await readFile(p,'utf8'),ts.ScriptTarget.Latest,true);
  for(const node of ast.statements){
   if(!(ts.isImportDeclaration(node)||ts.isExportDeclaration(node))||!node.moduleSpecifier)continue;
   const spec=node.moduleSpecifier.text;assert.ok(spec.startsWith('.'),'External runtime/type dependency '+rel+': '+spec);
   let target=path.resolve(path.dirname(p),spec);
   assert.ok(target.startsWith(path.join(root,'src')+path.sep),'Import escapes src');
   try{await access(target);}catch{if(p.endsWith('.d.ts'))target=target.replace(/\.js$/,'.d.ts');await access(target);}
  }
 }
 if(p.endsWith('.css')){
  const text=await readFile(p,'utf8');
  for(const [,spec]of text.matchAll(/(?:@import\s+(?:url\(\s*)?|url\(\s*)["']([^"']+)["']/g)){
   assert.ok(!/^(https?:|\/\/)/.test(spec),'Remote CSS resource');
   await access(path.resolve(path.dirname(p),spec));
  }
 }
}
const imported=JSON.parse(await readFile(path.join(root,'provenance/source-snapshot.json'),'utf8'));
const candidate=JSON.parse(await readFile(path.join(root,'provenance/grid-candidate.json'),'utf8'));
assert.equal(candidate.schemaVersion,1,'Unsupported Grid candidate manifest');
assert.equal(candidate.packageVersion,pkg.version,'Grid candidate package version differs');
const importedDigest=createHash('sha256').update(await readFile(path.join(root,'provenance/source-snapshot.json'))).digest('hex');
assert.equal(candidate.importManifestSha256,importedDigest,'Imported provenance changed');
const approved=new Map();
for(const record of candidate.files){
 assert.match(record.path,/^src\/(?:ui|core)\/(?:[Gg]rid[^/]*|TreeGrid)\.(?:js|d\.ts)$/,'Invalid candidate path');
 assert.ok(!approved.has(record.path),'Duplicate candidate path');approved.set(record.path,record);
 const original=imported.retained.find(item=>item.path===record.path);
 assert.equal(record.importedSha256,original?.sha256??null,'Candidate lost imported hash');
 const actual=createHash('sha256').update(await readFile(path.join(root,record.path))).digest('hex');
 assert.equal(actual,record.sha256,'Unreviewed Grid source change: '+record.path);
}
let gridFiles=0;
for(const record of imported.retained){
 if(!/^src\/(?:ui|core)\/(?:[Gg]rid[^/]*|TreeGrid)\.(?:js|d\.ts)$/.test(record.path))continue;
 const digest=createHash('sha256').update(await readFile(path.join(root,record.path))).digest('hex');
 assert.ok(approved.has(record.path),'Imported Grid file missing from candidate manifest');
 assert.equal(digest,approved.get(record.path).sha256,'Grid source changed: '+record.path);gridFiles++;
}
for(const file of files){const rel=path.relative(root,file).split(path.sep).join('/');
 if(/^src\/(?:ui|core)\/(?:[Gg]rid[^/]*|TreeGrid)\.(?:js|d\.ts)$/.test(rel))assert.ok(approved.has(rel),'Unrecorded Grid file: '+rel);
}
for(const tier of ['foundation','components','advanced'])assert.ok(pkg.exports['./'+tier],'Missing tier');
console.log('Package boundaries passed: '+files.length+' source/resources; '+gridFiles+' imported Grid files retained in provenance; '+approved.size+' approved candidate hashes verified.');
