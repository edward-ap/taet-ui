import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const port=process.env.TAET_UI_PORT??'5173';
const server=spawn('python',['scripts/dev-server.py','--port',port,'--bind','127.0.0.1'],{cwd:root,stdio:'ignore',windowsHide:true});
let failed;
server.on('error',error=>{failed=error;});
try{
 let ready=false;
 for(let i=0;i<60;i++){
  if(failed)throw failed;if(server.exitCode!==null)throw Error('Development server failed; choose a free TAET_UI_PORT.');
  try{const response=await fetch('http://127.0.0.1:'+port+'/browser-tests/recipes.html',{signal:AbortSignal.timeout(1000)});await response.body?.cancel();if(response.ok){ready=true;break;}}catch{}
  await new Promise(resolve=>setTimeout(resolve,100));
 }
 if(!ready)throw Error('Development server did not become ready');
 const child=spawn(process.execPath,['node_modules/@playwright/test/cli.js','test',...process.argv.slice(2)],{
  cwd:root,stdio:'inherit',windowsHide:true,env:{...process.env,TAET_UI_TEST_SERVER:'1',TAET_UI_PORT:port}
 });
 process.exitCode=await new Promise((resolve,reject)=>{child.on('error',reject);child.on('exit',code=>resolve(code??1));});
}finally{server.kill();}
