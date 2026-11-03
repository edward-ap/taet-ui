"""Build reviewed portable ZIPs from the current esbuild output; no publication."""
from pathlib import Path
import hashlib, json, subprocess, zipfile, datetime, sys, os

root = Path(__file__).resolve().parent.parent
dist = root / 'dist'
output = root / 'distribution'
if output.is_symlink():
    raise RuntimeError('Refusing a symlinked distribution directory')
output.mkdir(exist_ok=True)
pkg = json.loads((root / 'package.json').read_text(encoding='utf-8'))
report = json.loads((dist / 'size-report.json').read_text(encoding='utf-8'))
if report['version'] != pkg['version']:
    raise RuntimeError('Stale distribution version')
current = json.loads(subprocess.check_output(['node','--input-type=module','-e',
    "import {sourceProvenance} from './scripts/source-provenance.js'; console.log(JSON.stringify(await sourceProvenance(process.cwd())));"],cwd=root))
if current['contentSha256'] != report['source']['contentSha256'] or current['git'] != report['source']['git']:
    raise RuntimeError('Build output does not identify the current source tree; run npm run build')
if '--release' in sys.argv and current['git']['state'] != 'clean':
    raise RuntimeError('Release distribution requires a clean committed tree')

def sha(data): return hashlib.sha256(data).hexdigest()
version = pkg['version']
example = root / 'examples/webview-standalone'
try:
    stamp = int(subprocess.check_output(['git','-c','safe.directory='+root.as_posix(),'-C',str(root),'show','-s','--format=%ct','HEAD'],stderr=subprocess.DEVNULL))
except subprocess.CalledProcessError:
    stamp = int(os.environ.get('SOURCE_DATE_EPOCH','315532800'))
zip_date = datetime.datetime.fromtimestamp(stamp, datetime.timezone.utc).timetuple()[:6]
artifacts = []
for profile, meta in report['profiles'].items():
    source = dist if profile == 'full' else dist / profile
    entries = {}
    for name, info in meta['files'].items():
        asset = (source / name).resolve()
        if not asset.is_relative_to(source.resolve()):
            raise RuntimeError('Asset escapes profile: '+name)
        data = asset.read_bytes()
        if sha(data) != info['sha256']:
            raise RuntimeError('Stale or mismatched asset: '+name)
        if name != 'package.json': entries[name] = data
    for name in ['index.html','example-esm.html','example.js']:
        entries[name] = (example / name).read_bytes()
    entries['README.txt'] = (f'Tæt UI {version} — {profile} standalone WebView delivery\n'
      'Open index.html through a WebView origin or HTTP for the classic TaetUI IIFE example.\n'
      'example-esm.html uses ESM. Local-file access depends on host policy.\n'
      'Use ONE JS file: taet-ui[.min].js (ESM) OR taet-ui.global[.min].js (classic IIFE).\n'
      'Keep the matching CSS, fonts/, LICENSE and THIRD_PARTY_NOTICES.md together.\n'
      'Do not mix profiles/formats in one document. Full retains experimental APIs.\n'
      'No Node, Python, npm or network dependency is required in the packaged application.\n'
      'ES2022 is a syntax target, not API polyfills. Source maps embed public framework source.\n'
      f'Source repository: https://github.com/edward-ap/taet\n'
      f'Git revision/state: {report["source"]["git"]}\n'
      f'Source content SHA-256: {report["source"]["contentSha256"]}\n').encode('utf-8')
    manifest = {'schemaVersion':1,'package':'taet-ui','version':version,'profile':profile,
      'formats':{'esm':'taet-ui.min.js','iife':'taet-ui.global.min.js','global':'TaetUI'},
      'source':report['source'],'esbuild':report['esbuild'],'target':report['target'],
      'files':{name:{'bytes':len(data),'sha256':sha(data)} for name,data in sorted(entries.items())}}
    entries['PROVENANCE.json'] = (json.dumps(manifest,ensure_ascii=False,indent=2)+'\n').encode('utf-8')
    entries['SHA256SUMS.txt'] = ''.join(sha(data)+'  '+name+'\n' for name,data in sorted(entries.items())).encode('utf-8')
    filename = f'taet-ui-{version}-{profile}.zip'
    prefix = filename[:-4]+'/'
    with zipfile.ZipFile(output / filename,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=9) as archive:
        for name,data in sorted(entries.items()):
            info=zipfile.ZipInfo(prefix+name,zip_date);info.compress_type=zipfile.ZIP_DEFLATED
            info.external_attr=0o100644 << 16
            archive.writestr(info,data,compress_type=zipfile.ZIP_DEFLATED,compresslevel=9)
    data=(output / filename).read_bytes()
    artifacts.append({'filename':filename,'bytes':len(data),'sha256':sha(data),'members':len(entries)})
    print(filename, len(entries), 'files', sha(data))
(output / 'artifacts.json').write_text(json.dumps({'version':version,'source':report['source'],'artifacts':artifacts},indent=2)+'\n',encoding='utf-8')
(output / 'SHA256SUMS.txt').write_text(''.join(a['sha256']+'  '+a['filename']+'\n' for a in artifacts),encoding='utf-8')
