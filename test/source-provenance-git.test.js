import test from 'node:test';
import assert from 'node:assert/strict';
import childProcess from 'node:child_process';
import {syncBuiltinESMExports} from 'node:module';
import {mkdtemp,mkdir,writeFile,rm,realpath} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {sourceProvenance} from '../scripts/source-provenance.js';

const sha256=value=>createHash('sha256').update(value).digest('hex');

test('source provenance respects Git trust and keeps content identity independent of metadata',async t=>{
 const temp=await realpath(tmpdir()),root=await mkdtemp(path.join(temp,'taet-provenance-git-'));
 const original=childProcess.execFileSync;
 const imported='{"imported":true}\n',candidate='{"approved":true}\n';
 const inputs=[['src/a.js','export const a=1;'],['src/nested/z.js','export const z=2;'],['scripts/build.js','// build'],['package.json','{}'],['package-lock.json','{}']];
 const hash=createHash('sha256');
 for(const [name,bytes] of inputs)hash.update(name+'\0').update(bytes).update('\0');
 const expected={contentSha256:hash.digest('hex'),files:inputs.length,importManifestSha256:sha256(imported),gridCandidateManifestSha256:sha256(candidate)};
 const identity=({git,...rest})=>rest;
 let calls=[];
 function mockGit(reply){
  calls=[];
  childProcess.execFileSync=(file,args,options)=>{
   calls.push(args.slice());
   assert.equal(file,'git');
   assert.deepEqual(options,{encoding:'utf8',stdio:['ignore','pipe','pipe']});
   assert.deepEqual(args.slice(0,2),['-C',root]);
   return reply(args.slice(2));
  };
  syncBuiltinESMExports();
 }
 try{
  for(const dir of ['src/nested','scripts','provenance'])await mkdir(path.join(root,dir),{recursive:true});
  // Deliberately create files in reverse order to exercise deterministic traversal.
  for(const [name,bytes] of [...inputs].reverse())await writeFile(path.join(root,name),bytes);
  await writeFile(path.join(root,'provenance/source-snapshot.json'),imported);
  await writeFile(path.join(root,'provenance/grid-candidate.json'),candidate);
  for(const failure of ['unavailable','untrusted'])await t.test(`${failure} Git preserves fallback and hashes`,async()=>{
   mockGit(()=>{throw Object.assign(new Error(failure==='untrusted'?'fatal: detected dubious ownership':'spawnSync git ENOENT'),{code:failure==='untrusted'?128:'ENOENT'});});
   for(let i=0;i<2;i++){
    const result=await sourceProvenance(root);
    assert.deepEqual(result.git,{revision:null,state:'not-versioned'});
    assert.deepEqual(identity(result),expected);
   }
   assert.deepEqual(calls,Array.from({length:2},()=>['-C',root,'rev-parse','--show-toplevel']));
  });
  for(const state of ['clean','dirty','uncommitted'])await t.test(`${state} Git metadata retains exact read-only invocation`,async()=>{
   const revision='a'.repeat(40);
   mockGit(args=>{
    if(args.join(' ')==='rev-parse --show-toplevel')return root+'\n';
    if(args.join(' ')==='rev-parse HEAD'){
     if(state==='uncommitted')throw new Error('HEAD does not exist');
     return revision+'\n';
    }
    if(args.join(' ')==='status --porcelain=v1 -uall')return state==='clean'?'':'?? new.js\n';
    throw new Error('Unexpected Git arguments');
   });
   const result=await sourceProvenance(root);
   assert.deepEqual(result.git,{revision:state==='uncommitted'?null:revision,state});
   assert.deepEqual(identity(result),expected);
   assert.deepEqual(calls,[['-C',root,'rev-parse','--show-toplevel'],['-C',root,'rev-parse','HEAD'],['-C',root,'status','--porcelain=v1','-uall']]);
  });
  await t.test('parent repository is not reported as the source repository',async()=>{
   mockGit(()=>temp+'\n');
   const result=await sourceProvenance(root);
   assert.deepEqual(result.git,{revision:null,state:'not-versioned'});
   assert.deepEqual(identity(result),expected);
   assert.deepEqual(calls,[['-C',root,'rev-parse','--show-toplevel']]);
  });
  await t.test('status failure discards partial metadata without changing hashes',async()=>{
   mockGit(args=>{
    if(args.join(' ')==='rev-parse --show-toplevel')return root;
    if(args.join(' ')==='rev-parse HEAD')return 'b'.repeat(40);
    throw new Error('Git status unavailable');
   });
   const result=await sourceProvenance(root);
   assert.deepEqual(result.git,{revision:null,state:'not-versioned'});
   assert.deepEqual(identity(result),expected);
  });
 }finally{
  childProcess.execFileSync=original;
  syncBuiltinESMExports();
  const resolved=await realpath(root);
  if(path.dirname(resolved)!==temp||!path.basename(resolved).startsWith('taet-provenance-git-'))throw new Error('Unsafe fixture cleanup');
  await rm(resolved,{recursive:true});
 }
});
