import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm,realpath} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {sourceProvenance} from '../scripts/source-provenance.js';

test('source provenance ignores Python bytecode but detects real build input changes',async()=>{
 const temp=await realpath(tmpdir()),root=await mkdtemp(path.join(temp,'taet-provenance-'));
 try{
  for(const dir of ['src','scripts','provenance'])await mkdir(path.join(root,dir));
  for(const file of ['package.json','package-lock.json','provenance/source-snapshot.json','provenance/grid-candidate.json'])await writeFile(path.join(root,file),'{}');
  await writeFile(path.join(root,'src/control.js'),'export const value=1;');
  await writeFile(path.join(root,'scripts/build.py'),'print("build")');
  const before=await sourceProvenance(root);
  await mkdir(path.join(root,'scripts/__pycache__'));
  await writeFile(path.join(root,'scripts/__pycache__/build.cpython-313.pyc'),Buffer.from([1,2,3]));
  await writeFile(path.join(root,'scripts/old.pyc'),Buffer.from([4,5,6]));
  const cached=await sourceProvenance(root);
  assert.equal(cached.contentSha256,before.contentSha256);assert.equal(cached.files,before.files);
  await writeFile(path.join(root,'scripts/build.py'),'print("changed")');
  assert.notEqual((await sourceProvenance(root)).contentSha256,before.contentSha256);
 }finally{
  const resolved=await realpath(root);if(path.dirname(resolved)!==temp||!path.basename(resolved).startsWith('taet-provenance-'))throw Error('Unsafe fixture cleanup');
  await rm(resolved,{recursive:true});
 }
});
