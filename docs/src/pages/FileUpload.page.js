import { importsFor } from "./pageHelpers.js";
import { FileUpload } from '../../../src/ui/experimental.js';
import { inputExample } from './inputExamples.js';
export const fileUploadPage = {
 id:'file-upload', title:'FileUpload', status:'experimental',
 description:'Drop local files into a scrollable file table; optionally upload through an application adapter.',
 keywords:['drop','drag','upload','files','local','queue'],
 imports: importsFor(["FileUpload"]),
 paragraphs:[
  'FileUpload combines keyboard-accessible browsing, drag-and-drop and a removable file queue. No network requests occur unless you provide upload(file, context). For local file processing, consume File objects from the add event or getFiles().',
  'Every intake path checks accept, count, size and duplicates. After intake, the empty drop area becomes a two-column table: file icon and name with size/last-modified date beneath, then progress or a green completion check. Additional files can still be dropped anywhere in the component. The queue owns metadata and retains File handles separately; it does not read file contents or create previews.'
 ],
 examples:[inputExample('Local files — no upload', function createLocalFiles({log}) {
  const files = new FileUpload({maxFiles:20,maxFileSize:100*1024*1024,height:320,dropText:'Drag & drop files here'});
  files.events.on('add', ({file}) => log.write(`Accepted: ${file.name} (${file.size} bytes)`));
  files.events.on('reject', ({message}) => log.write(message));
  return files;
 },'Drop one or several files. This example keeps files local and does not read their contents.'),
 inputExample('Upload queue — simulated transport', function createUploadQueue({log}) {
  const files = new FileUpload({height:320, concurrency:2, maxFiles:20, upload(file,{signal,onProgress}) {
   return new Promise((resolve,reject) => {
    let progress=0;
    const abort=()=>{clearInterval(timer);signal.removeEventListener('abort',abort);reject(new Error('Canceled'));};
    const timer=setInterval(()=>{
     progress+=.1;onProgress(progress);
     if(progress>=1){clearInterval(timer);signal.removeEventListener('abort',abort);resolve({name:file.name});}
    },150);
    signal.addEventListener('abort',abort,{once:true});
    if(signal.aborted) abort();
   });
  }});
  files.events.on('uploadSuccess',({entry})=>log.write(`Complete: ${entry.name}`));
  return files;
 },'Add files, then Upload. Two jobs run at a time. Cancel and Retry work locally; no file leaves the browser.')],
 options:[
  {name:'height',type:'number | string',description:'Default 360px. The table scrolls vertically inside this height; toolbar stays visible.'},
  {name:'upload',type:'(File, {signal, entry, onProgress}) => Promise<unknown>',description:'Application transport. Report progress as a fraction from 0 to 1; resolve on success, reject on failure.'},
  {name:'autoUpload / concurrency',type:'boolean / number',description:'Default false / 2. Auto upload requires an adapter; concurrency is a positive finite integer.'},
  {name:'accept',type:'string',description:'Comma-separated extensions or MIME types, including image/*. Default accepts all files.'},
  {name:'maxFiles / maxFileSize / maxTotalSize',type:'number',description:'Defaults 100 / Infinity / Infinity. Sizes are bytes and limits include completed rows until removed.'},
  {name:'allowDuplicates',type:'boolean',description:'Default false. Duplicate identity uses name, size, type, lastModified and relative path.'},
  {name:'label / dropText / disabled',type:'string / string / boolean',description:'Accessible queue name, drop hint and disabled intake/actions.'}
 ],
 methods:[
  {name:'addFiles(files)',type:'{accepted, rejected}',description:'Validate and enqueue browser Files, including before mount.'},
  {name:'getEntries() / getFiles() / getFile(id)',type:'metadata[] / File[] / File|null',description:'Read queue snapshots or retained local handles.'},
  {name:'start()',type:'Promise<metadata[]>',description:'Start queued jobs. Resolves when scheduled work settles; individual failures remain error rows.'},
  {name:'cancel(id?) / retry(id)',type:'void / boolean',description:'Cancel one/all jobs, or retry a failed/canceled row once its previous adapter settles.'},
  {name:'remove(id) / clear()',type:'boolean / void',description:'Abort and release one/all retained files.'},
  {name:'openPicker() / linkDropArea(element)',type:'boolean / Disposable',description:'Open from a user gesture or attach a scoped external drop target. Dispose the link to detach it.'}
 ],
 events:['beforeAdd','add','reject','remove','cancel','uploadStart','uploadSuccess','uploadError','complete'].map(name=>({name,type:'event',description:name==='beforeAdd'?'Set event.cancel=true to veto a file.':'Subscribe through files.events.on(name, handler).'})),
 notes:[
  'Canceled adapters still occupy their concurrency slot until they settle. Honor AbortSignal promptly. Destroy aborts work and ignores late callbacks; pending start() resolves with an empty array.',
  'Directories, gallery previews and server file management are outside v1. Browser drag-and-drop may not be exposed by every native WebView host; Add files remains available.',
  'accept and size checks are client-side intake rules. A remote upload service must enforce its own authorization and validation. FileUpload has no Form .value API.'
 ]
};
