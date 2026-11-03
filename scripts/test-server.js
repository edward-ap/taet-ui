import {createServer} from 'node:http';
import {readFile, stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const defaultRoot=fileURLToPath(new URL('../',import.meta.url));
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8',
 '.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8',
 '.json':'application/json','.map':'application/json','.svg':'image/svg+xml',
 '.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp',
 '.woff2':'font/woff2','.woff':'font/woff','.ttf':'font/ttf','.otf':'font/otf',
 '.txt':'text/plain; charset=utf-8'};

// Browser fixtures use Node, already required by the test toolchain. Read each
// resource into one Buffer so Content-Length describes the exact response bytes.
// This is a loopback development fixture, not an application runtime server.
export function createTestServer(root=defaultRoot) {
 root=path.resolve(root);
 return createServer(async(req,res)=>{
  if(req.method!=='GET'&&req.method!=='HEAD'){
   res.writeHead(501,{'Content-Length':'0'});res.end();return;
  }
  try{
   const url=new URL(req.url,'http://localhost');
   let file=path.resolve(root,'.'+decodeURIComponent(url.pathname));
   if(file!==root&&!file.startsWith(root+path.sep))throw Error('Path escapes fixture root');
   if((await stat(file)).isDirectory()){
    if(!url.pathname.endsWith('/')){
     res.writeHead(301,{'Location':url.pathname+'/'+url.search,'Content-Length':'0'});res.end();return;
    }
    file=path.join(file,'index.html');
   }
   const body=await readFile(file);
   res.writeHead(200,{'Content-Type':mime[path.extname(file).toLowerCase()]??'application/octet-stream',
    'Content-Length':body.length,'X-Taet-Fixture-Pid':String(process.pid),'Cache-Control':'no-store, no-cache, must-revalidate',
    'Pragma':'no-cache','Expires':'0'});
   res.end(req.method==='HEAD'?undefined:body);
  }catch{
   res.writeHead(404,{'Content-Length':'0','Cache-Control':'no-store'});res.end();
  }
 });
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const port=Number(process.argv[2]??process.env.TAET_UI_PORT??5173);
 if(!Number.isInteger(port)||port<1||port>65535)throw Error('Invalid fixture port');
 const server=createTestServer();
 server.on('error',error=>{console.error(error);process.exitCode=1;});
 server.listen(port,'127.0.0.1',()=>console.log(`Tæt UI test fixtures: http://127.0.0.1:${port}/`));
}
