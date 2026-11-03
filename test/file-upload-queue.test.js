import test from 'node:test';
import assert from 'node:assert/strict';
import { FileUploadQueue } from '../src/ui/fileUploadQueue.js';
import { FileUpload } from '../src/ui/FileUpload.js';
const file = (name, size = 2) => new File(['x'.repeat(size)], name, { lastModified: 1 });
const tick = () => new Promise(resolve => setImmediate(resolve));
test('file intake validates types, sizes, duplicates and custom veto before mount', () => {
 const q = new FileUpload({accept:'.djvu', maxFiles:2, maxFileSize:4, maxTotalSize:5});
 q.events.on('beforeAdd', e => { if(e.file.name === 'veto.djvu') e.cancel = true; });
 const result = q.addFiles([file('a.djvu'),file('a.djvu'),file('x.pdf'),file('big.djvu',5),file('veto.djvu'),file('b.djvu',4),file('empty.djvu',0),file('c.djvu')]);
 assert.equal(result.accepted.length,2);
 assert.deepEqual(result.rejected.map(x=>x.code),['duplicate','type','size','veto','totalSize','count']);
 assert.equal(q.getFiles()[0].name,'a.djvu'); q.destroy();
});
test('concurrency stays bounded while canceled adapter ignores abort; late progress is ignored', async () => {
 const jobs=[]; const q=new FileUploadQueue({concurrency:1, upload:(file,context)=>new Promise(resolve=>jobs.push({file,context,resolve}))});
 const {accepted}=q.addFiles([file('a'),file('b')]); const run=q.start(); await tick();
 jobs[0].context.onProgress(.5); assert.equal(q.getEntries()[0].progress,.5);
 q.cancel(accepted[0].id); jobs[0].context.onProgress(.9); assert.equal(q.getEntries()[0].progress,.5);
 assert.equal(q.retry(accepted[0].id),false); assert.equal(jobs.length,1);
 jobs[0].resolve('late'); await tick(); assert.equal(jobs.length,2);
 jobs[1].resolve('ok'); const entries=await run;
 assert.deepEqual(entries.map(x=>x.status),['canceled','uploaded']); q.destroy();
});
test('error can retry, removal aborts and teardown ignores unsettled adapter', async () => {
 let fail=true; const q=new FileUploadQueue({upload:()=>{if(fail) throw Error('offline'); return 'ok';}});
 const id=q.addFiles([file('a')]).accepted[0].id; await q.start(); assert.equal(q.getEntries()[0].error,'offline');
 fail=false; assert.equal(q.retry(id),true); await q.start(); assert.equal(q.getEntries()[0].status,'uploaded'); q.destroy();
 let finish,ctx; const late=new FileUploadQueue({upload:(f,c)=>{ctx=c;return new Promise(r=>finish=r);}});
 const key=late.addFiles([file('a')]).accepted[0].id; const run=late.start(); await tick();
 late.remove(key); assert.equal(ctx.signal.aborted,true); late.destroy(); assert.deepEqual(await run,[]); ctx.onProgress(.8); finish('ignored'); await tick();
});
test('beforeAdd teardown and clear reentry cannot insert stale files', () => {
 for(const action of ['clear','destroy']) {
  const q=new FileUploadQueue(); q.events.on('beforeAdd',()=>q[action]());
  assert.equal(q.addFiles([file('a')]).accepted.length,0); if(!q.destroyed) { assert.equal(q.getFiles().length,0); q.destroy(); }
 }
});
