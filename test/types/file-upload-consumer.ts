import {FileUpload, type FileUploadEntry} from 'taet-ui/experimental';
const files=new FileUpload({accept:'.djvu',upload(file,{signal,onProgress,entry}) {
 const id:string=entry.id; onProgress(.5); return Promise.resolve({id,size:file.size,canceled:signal.aborted});
}});
files.events.on('beforeAdd',event=>{event.cancel=event.file.size>1024;});
files.events.on('uploadSuccess',event=>{const entry:FileUploadEntry=event.entry;void entry;});
files.addFiles([new File(['book'],'book.djvu')]);
const entries:FileUploadEntry[]=files.getEntries();void entries;
// @ts-expect-error progress uses numeric fractions
new FileUpload({upload(file,context){context.onProgress('50%');}});
files.destroy();
