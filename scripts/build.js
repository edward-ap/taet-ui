import {build, version as esbuildVersion} from 'esbuild';
import {readFile, writeFile, mkdir, copyFile, readdir, rm, lstat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {gzipSync, brotliCompressSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {sourceProvenance} from './source-provenance.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const out=path.resolve(root,'dist');
// Build owns exactly this directory; refuse a symlink or a path outside the repo.
if(path.dirname(out)!==root || path.basename(out)!=='dist')throw Error('Unsafe build directory');
try {if((await lstat(out)).isSymbolicLink())throw Error('Refusing to replace symlinked dist');}
catch(e){if(e.code!=='ENOENT')throw e;}
await rm(out,{recursive:true,force:true});await mkdir(out,{recursive:true});
const pkg=JSON.parse(await readFile(path.join(root,'package.json'),'utf8'));
const common={absWorkingDir:root,bundle:true,format:'esm',platform:'browser',target:'es2022',
  sourcemap:true,sourcesContent:true,charset:'utf8',legalComments:'eof',keepNames:true,
  logLevel:'warning',metafile:true};
const profiles={full:'src/ui/all.js',components:'scripts/bundle-profiles/components.js',foundation:'src/foundation/index.js'};
const report={version:pkg.version,esbuild:esbuildVersion,target:'es2022',
  source:await sourceProvenance(root),
  note:'Transport estimates are not WebView startup timings. Profiles are separate library instances; use one per document.',profiles:{}};
for(const [name,entry] of Object.entries(profiles)){
 const dir=name==='full'?out:path.join(out,name);await mkdir(dir,{recursive:true});
 const metas={};
 for(const minify of [false,true]){
  const suffix=minify?'.min':'';
  const js=await build({...common,entryPoints:[entry],outfile:path.join(dir,`taet-ui${suffix}.js`),minify,
   banner:{js:`/*! Tæt UI ${pkg.version} | MIT | see LICENSE and THIRD_PARTY_NOTICES.md */`}});
  metas[minify?'minified':'readable']=js.metafile;
  await build({...common,entryPoints:['src/ui/taet-ui.css'],outfile:path.join(dir,`taet-ui${suffix}.css`),minify,
   loader:{'.woff2':'file'},assetNames:'fonts/[name]',banner:{css:`/*! Tæt UI ${pkg.version} | MIT; bundled font OFL */`}});
 }
 const retained=Object.values(metas.minified.outputs).flatMap(o=>Object.entries(o.inputs??{})).filter(([,v])=>v.bytesInOutput>0).map(([p])=>p);
 const worker=false;
 for(const file of ['LICENSE','THIRD_PARTY_NOTICES.md'])await copyFile(path.join(root,file),path.join(dir,file));
 await copyFile(path.join(root,'src/ui/fonts/NotoSans-OFL.txt'),path.join(dir,'fonts/NotoSans-OFL.txt'));
 await writeFile(path.join(dir,'package.json'),JSON.stringify({name:`taet-ui-${name}-bundle`,version:pkg.version,private:true,type:'module'},null,2)+'\n');
 await writeFile(path.join(dir,'README.txt'),`Tæt UI ${pkg.version} (${name})\nUse ONE of taet-ui.js / taet-ui.min.js with the matching CSS.\nCopy fonts/ alongside CSS${worker?' and FlatFileWorker.js alongside JS':''}.\nES modules: use a WebView custom protocol or HTTP server; file:// is not guaranteed.\nDo not mix this bundle with source imports or another bundle in one document.\nFull exports include experimental APIs; bundling does not promote their stability.\nES2022 is a syntax target, not browser API polyfills. Source maps contain sources.\n`);
 const files={};
 async function scan(folder,prefix=''){
  for(const item of await readdir(folder,{withFileTypes:true})){
   if(Object.keys(profiles).includes(item.name))continue;
   const rel=prefix+item.name;
   if(item.isDirectory())await scan(path.join(folder,item.name),rel+'/');
   else{const bytes=await readFile(path.join(folder,item.name));files[rel]={bytes:bytes.length,gzip:gzipSync(bytes,{level:9}).length,brotli:brotliCompressSync(bytes).length,sha256:createHash('sha256').update(bytes).digest('hex')};}
  }
 }
 await scan(dir);
 const jsOutput=Object.values(metas.minified.outputs).find(o=>o.entryPoint===entry);
 report.profiles[name]={exports:jsOutput.exports,worker,retainedModules:retained,files};
 // Metafile paths are repo-relative. Keep them as build evidence, not runtime assets.
 await writeFile(path.join(out,`${name}.meta.json`),JSON.stringify(metas,null,2)+'\n');
}
await writeFile(path.join(out,'size-report.json'),JSON.stringify(report,null,2)+'\n');
for(const [name,data] of Object.entries(report.profiles))console.log(`${name}: JS ${data.files['taet-ui.min.js'].bytes} bytes; CSS ${data.files['taet-ui.min.css'].bytes} bytes; worker ${data.worker}`);
console.log('Build complete: dist/ (full), dist/components/, dist/foundation/.');
