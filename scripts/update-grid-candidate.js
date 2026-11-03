// Explicit maintenance command for an approved Grid change, never a test step.
// Keep the imported source-snapshot immutable; record the reviewed successor here.
import {readFile,writeFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const importedBytes=await readFile(path.join(root,'provenance/source-snapshot.json'));
const imported=JSON.parse(importedBytes);
const originals=new Map(imported.retained.map(r=>[r.path,r.sha256]));
const files=[];
for(const dir of ['src/ui','src/core'])for(const entry of await readdir(path.join(root,dir))){
 const rel=dir+'/'+entry;
 if(!/^src\/(?:ui|core)\/(?:[Gg]rid[^/]*|TreeGrid)\.(?:js|d\.ts)$/.test(rel))continue;
 files.push({path:rel,importedSha256:originals.get(rel)??null,sha256:digest(await readFile(path.join(root,rel)))});
}
files.sort((a,b)=>a.path.localeCompare(b.path,'en'));
const pkg=JSON.parse(await readFile(path.join(root,'package.json'),'utf8'));
await writeFile(path.join(root,'provenance/grid-candidate.json'),JSON.stringify({schemaVersion:1,
 packageVersion:pkg.version,changeSet:'feedback-ci-boolean-input-focus-2026-11-02',
 note:'User-approved Grid/TreeGrid contract evolution; imported provenance is preserved separately.',
 importManifestSha256:digest(importedBytes),files},null,2)+'\n');
console.log(`Grid candidate manifest: ${files.length} files; ${files.filter(f=>f.importedSha256!==f.sha256).length} changed/new.`);
