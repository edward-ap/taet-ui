import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const here=path.dirname(fileURLToPath(import.meta.url));
const flag=process.argv.indexOf('--taet-ui-root');
if(flag>=0&&!process.argv[flag+1])throw Error('Usage: node prepare.mjs [--taet-ui-root <checkout>]');
const root=path.resolve(flag<0?path.join(here,'../..'):process.argv[flag+1]??'');
const report=JSON.parse(fs.readFileSync(path.join(root,'dist/size-report.json'),'utf8'));
const files=['taet-ui.min.js','taet-ui.min.css','fonts/NotoSans-variable.woff2','fonts/NotoSans-OFL.txt','LICENSE','THIRD_PARTY_NOTICES.md'];
const assets=files.map(name=>{
 const from=path.join(root,'dist/components',name),data=fs.readFileSync(from);
 const sha256=createHash('sha256').update(data).digest('hex');
 if(report.profiles.components.files[name]?.sha256!==sha256)throw Error('Stale or mismatched bundle asset: '+name);
 const dest=path.join(here,'web/vendor',name);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,data);
 return {path:name,sha256};
});
fs.writeFileSync(path.join(here,'BUNDLE.json'),JSON.stringify({version:report.version,profile:'components',source:report.source,assets},null,2)+'\n');
console.log('Prepared one components delivery with fonts/notices; no acceptance data copied.');
