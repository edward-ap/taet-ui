import {readFile,readdir} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
export async function sourceProvenance(root) {
 const hash=createHash('sha256');let files=0;
 async function visit(dir){for(const name of (await readdir(path.join(root,dir),{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name,'en'))){
  const rel=path.posix.join(dir,name.name);
  if(name.isDirectory())await visit(rel);else{const bytes=await readFile(path.join(root,rel));hash.update(rel+'\0');hash.update(bytes);hash.update('\0');files++;}
 }}
 for(const dir of ['src','scripts'])await visit(dir);
 for(const name of ['package.json','package-lock.json']){hash.update(name+'\0');hash.update(await readFile(path.join(root,name)));hash.update('\0');files++;}
 let git={revision:null,state:'not-versioned'};
 const command=args=>execFileSync('git',['-c','safe.directory='+root.split(path.sep).join('/'),'-C',root,...args],{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
 try{
  if(path.resolve(command(['rev-parse','--show-toplevel']))===path.resolve(root)){
   let revision=null;try{revision=command(['rev-parse','HEAD']);}catch{}
   const dirty=Boolean(command(['status','--porcelain=v1','-uall']));
   git={revision,state:revision?(dirty?'dirty':'clean'):'uncommitted'};
  }
 }catch{}
 const imported=await readFile(path.join(root,'provenance/source-snapshot.json'));
 const candidate=await readFile(path.join(root,'provenance/grid-candidate.json'));
 return {git,contentSha256:hash.digest('hex'),files,importManifestSha256:createHash('sha256').update(imported).digest('hex'),gridCandidateManifestSha256:createHash('sha256').update(candidate).digest('hex')};
}
