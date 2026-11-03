import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,mkdir,rm,realpath} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {request,createServer} from 'node:http';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createTestServer} from '../scripts/test-server.js';

test('HTTP fixture sends exact UTF-8/binary bytes and HEAD framing across concurrent keep-alive requests',async()=>{
 const temp=await realpath(tmpdir()),root=await mkdtemp(path.join(temp,'taet-ui-http-'));
 const js=Buffer.from('export const title="Tæt UI";\n'),font=Buffer.from(Array.from({length:131073},(_,i)=>i%251));
 const server=createTestServer(root);
 try{
  await writeFile(path.join(root,'module.js'),js);await writeFile(path.join(root,'font.woff2'),font);
  await mkdir(path.join(root,'nested'));await writeFile(path.join(root,'nested/index.html'),'<h1>Fixture</h1>');
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const url='http://127.0.0.1:'+server.address().port;
  for(let round=0;round<8;round++)await Promise.all(Array.from({length:12},async(_,i)=>{
   const bytes=i%2?js:font,res=await fetch(url+(i%2?'/module.js':'/font.woff2'));
   assert.equal(res.status,200);assert.equal(res.headers.get('x-taet-fixture-pid'),String(process.pid));assert.equal(Number(res.headers.get('content-length')),bytes.length);
   assert.deepEqual(Buffer.from(await res.arrayBuffer()),bytes);
   assert.match(res.headers.get('content-type'),i%2?/^text\/javascript/:/^font\/woff2/);
   assert.match(res.headers.get('cache-control'),/no-store/);
  }));
  const head=await fetch(url+'/module.js',{method:'HEAD'});
  assert.equal(Number(head.headers.get('content-length')),js.length);assert.equal((await head.arrayBuffer()).byteLength,0);
  const redirect=await fetch(url+'/nested?sample=1',{redirect:'manual'});
  assert.equal(redirect.status,301);assert.equal(redirect.headers.get('location'),'/nested/?sample=1');
  assert.equal(await (await fetch(url+'/nested/')).text(),'<h1>Fixture</h1>');
  assert.equal((await fetch(url+'/missing.js')).status,404);
  const status=await new Promise((resolve,reject)=>{
   const req=request(url,{path:'/%2e%2e%2foutside.js'},res=>{res.resume();resolve(res.statusCode);});req.on('error',reject);req.end();
  });
  assert.equal(status,404);
 }finally{
  server.closeAllConnections();await new Promise(resolve=>server.close(resolve));
  const resolved=await realpath(root);if(path.dirname(resolved)!==temp||!path.basename(resolved).startsWith('taet-ui-http-'))throw Error('Unsafe fixture cleanup');
  await rm(resolved,{recursive:true});
 }
});

test('browser runner refuses an occupied port instead of testing an unrelated server',async()=>{
 const foreign=createServer((req,res)=>res.end('unrelated fixture'));
 await new Promise(resolve=>foreign.listen(0,'127.0.0.1',resolve));
 const port=foreign.address().port;
 try{
  const child=spawn(process.execPath,[fileURLToPath(new URL('../scripts/run-browser.js',import.meta.url)),'--list'],{
   cwd:fileURLToPath(new URL('../',import.meta.url)),windowsHide:true,
   env:{...process.env,TAET_UI_PORT:String(port)},stdio:['ignore','pipe','pipe']});
  let output='';child.stdout.on('data',b=>output+=b);child.stderr.on('data',b=>output+=b);
  const code=await new Promise((resolve,reject)=>{child.on('error',reject);child.on('exit',resolve);});
  assert.notEqual(code,0);assert.match(output,/choose a free TAET_UI_PORT/);
  assert.match(output,/EADDRINUSE/);assert.doesNotMatch(output,/Total: .* tests/);
  assert.equal(await (await fetch('http://127.0.0.1:'+port)).text(),'unrelated fixture');
 }finally{foreign.closeAllConnections();await new Promise(resolve=>foreign.close(resolve));}
});
