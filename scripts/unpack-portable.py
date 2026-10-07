"""Verify the Windows package and extract into a new folder for its bundled-runtime check."""
import argparse,hashlib,json,stat,zipfile
from pathlib import Path,PurePosixPath
root=Path(__file__).resolve().parent.parent
parser=argparse.ArgumentParser();parser.add_argument('--out',required=True);parser.add_argument('--archive');args=parser.parse_args()
version=json.loads((root/'package.json').read_text(encoding='utf-8-sig'))['version']
archive=Path(args.archive).resolve() if args.archive else root/'release-artifacts'/f'Protest-{version}-windows-x64.zip'
checksum=hashlib.sha256(archive.read_bytes()).hexdigest()+'  '+archive.name+'\n'
if archive.with_name(archive.name+'.sha256').read_text(encoding='utf-8')!=checksum:raise ValueError('Portable checksum differs')
destination=Path(args.out).resolve()
if destination.exists() or destination.is_relative_to(root):raise ValueError('Use a new folder outside the checkout')
with zipfile.ZipFile(archive) as package:
 names=package.namelist()
 if len(names)!=len(set(names)) or package.testzip() is not None:raise ValueError('ZIP duplicate/CRC failure')
 files={}
 for item in package.infolist():
  name=item.filename;parts=PurePosixPath(name).parts
  if not name.startswith('Protest/') or PurePosixPath(name).is_absolute() or '..' in parts or '\\' in name or ':' in name:raise ValueError('Unsafe portable path')
  if any(p in {'.git','.protest','release','release-artifacts','test-results','reports'} or p.startswith('.env') for p in parts):raise ValueError('Private/build portable entry')
  if stat.S_IFMT(item.external_attr>>16) not in {0,stat.S_IFREG,stat.S_IFDIR}:raise ValueError('Linked/special entry')
  if not item.is_dir():files[name]=package.read(item)
 for name in ['node.exe','tools/gh.exe','Start Protest.cmd','LICENSE','THIRD_PARTY_NOTICES.md','tools/NODE-LICENSE.txt','tools/GH-LICENSE.txt','dist/index.html','src/server.mjs','src/mcp.mjs','package.json']:
  if 'Protest/'+name not in files:raise ValueError('Missing portable runtime/source/license: '+name)
 if json.loads(files['Protest/package.json'])['version']!=version:raise ValueError('Portable version mismatch')
 for name in ['LICENSE','README.md','SECURITY.md','THIRD_PARTY_NOTICES.md','CHANGELOG.md','package.json','pnpm-lock.yaml','src/server.mjs','src/mcp.mjs']:
  if files['Protest/'+name]!=(root/name).read_bytes():raise ValueError('Portable source differs: '+name)
 destination.mkdir(parents=True)
 for name,data in files.items():
  target=destination/name;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(data)
print(json.dumps({'archive':archive.name,'sha256':checksum.split()[0],'version':version,'files':len(files),'runtimeIncluded':True,'consumer':str(destination)}))

