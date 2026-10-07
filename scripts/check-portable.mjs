import assert from 'node:assert/strict';
import {spawn,execFileSync} from 'node:child_process';
import {mkdtemp,mkdir,readFile,writeFile,rm} from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {pathToFileURL} from 'node:url';
const app=path.resolve(process.env.PROTEST_PORTABLE_PATH||'../protest-portable-consumer/Protest');
const out=path.resolve('test-results/portable');await mkdir(out,{recursive:true});
const data=await mkdtemp(path.join(tmpdir(),'protest-portable-'));
const runtime=path.join(app,'node.exe');const report={checks:[],errors:[]};
let server,client;
const stop=async()=>{if(!server)return;const exited=new Promise(r=>server.once('exit',r));server.kill();await exited;server=null;};
const start=async()=>{
 server=spawn(runtime,[path.join(app,'src/server.mjs')],{cwd:app,windowsHide:true,env:{...process.env,PROTEST_PORT:'0',PROTEST_DATA_DIR:data,PROTEST_GH_PATH:path.join(data,'absent-gh.exe')}});
 let log='';server.stdout.on('data',d=>log+=d);server.stderr.on('data',d=>report.errors.push(String(d)));
 return await new Promise((resolve,reject)=>{const timer=setTimeout(()=>{clearInterval(poll);reject(Error('Portable startup timed out'));},15000);const poll=setInterval(()=>{const match=log.match(/http:\/\/127\.0\.0\.1:\d+/);if(match){clearTimeout(timer);clearInterval(poll);resolve(match[0]);}},50);server.once('exit',code=>{clearTimeout(timer);clearInterval(poll);reject(Error('Portable exited before startup: '+code));});});
};
try{
 report.node=execFileSync(runtime,['--version'],{encoding:'utf8',windowsHide:true}).trim();assert.match(report.node,/^v24\./);
 report.gh=execFileSync(path.join(app,'tools/gh.exe'),['--version'],{encoding:'utf8',windowsHide:true}).split(/\r?\n/)[0];
 let origin=await start();assert.equal((await fetch(origin)).status,200);
 let session=await(await fetch(origin+'/api/session')).json();
 const project={...session.project,title:'Fictional portable verification',status:'cancelled',update:'Fictional test only. No actual event.',privateNotes:'PRIVATE_PORTABLE_V1_CANARY'};
 const save=await fetch(origin+'/api/project',{method:'PUT',headers:{'Content-Type':'application/json','X-Protest-Session':session.csrf},body:JSON.stringify(project)});assert.equal(save.status,200);
 const backup=await(await fetch(origin+'/api/download/project')).json();assert.deepEqual(backup,project);
 for(const kind of ['pdf','svg','square','story','site']){
  const response=await fetch(origin+'/api/download/'+kind);assert.equal(response.status,200);const bytes=Buffer.from(await response.arrayBuffer());assert(bytes.length>100);assert(!bytes.includes('PRIVATE_PORTABLE_V1_CANARY'));if(kind==='svg'){assert(bytes.includes('CANCELLED'));assert(!bytes.includes('SCAN FOR DETAILS'));}await writeFile(path.join(out,kind+'.bin'),bytes);report.checks.push({export:kind,bytes:bytes.length});
 }
 await stop();origin=await start();session=await(await fetch(origin+'/api/session')).json();assert.deepEqual(session.project,backup);report.checks.push('bundled entrypoint restart preserves exact saved draft and private notes');
 const sdk=path.join(app,'node_modules/@modelcontextprotocol/sdk/dist/esm');
 const {Client}=await import(pathToFileURL(path.join(sdk,'client/index.js')));
 const {StdioClientTransport}=await import(pathToFileURL(path.join(sdk,'client/stdio.js')));
 client=new Client({name:'portable-verification',version:'1.0.0'});
 await client.connect(new StdioClientTransport({command:runtime,args:[path.join(app,'src/mcp.mjs')],env:{...process.env,PROTEST_DATA_DIR:data},stderr:'pipe'}));
 assert.equal(client.getServerVersion().version,'1.0.0');
 const {tools}=await client.listTools();assert.equal(tools.length,6);
 const call=async(name,args={})=>{const r=await client.callTool({name,arguments:args});assert(!r.isError,JSON.stringify(r));return JSON.parse(r.content[0].text);};
 const publicDraft=await call('get_protest');assert(!JSON.stringify(publicDraft).includes('PRIVATE_PORTABLE_V1_CANARY'));assert.equal(publicDraft.project.status,'cancelled');
 assert.equal((await call('check_protest')).issues.length,0);
 const update=await call('update_protest',{projectId:backup.id,changes:{bring:'Water for the fictional workshop.'}});assert.equal(update.project.bring,'Water for the fictional workshop.');
 const exported=await call('export_materials');assert.equal(exported.files.length,5);const exportedBackup=JSON.parse(await readFile(path.join(exported.directory,'project.json'),'utf8'));assert.equal(exportedBackup.privateNotes,'PRIVATE_PORTABLE_V1_CANARY');
 const review=await call('prepare_publication');assert.equal(review.issues.length,0);assert(!JSON.stringify(review).includes('PRIVATE_PORTABLE_V1_CANARY'));
 const conflict=await client.callTool({name:'create_protest',arguments:{details:{}}});assert(conflict.isError);
 const created=await call('create_protest',{replaceCurrent:true,details:{title:'Another fictional draft'}});assert.notEqual(created.project.id,backup.id);
 session=await(await fetch(origin+'/api/session')).json();const restore=await fetch(origin+'/api/project',{method:'PUT',headers:{'Content-Type':'application/json','X-Protest-Session':session.csrf},body:JSON.stringify(backup)});assert.equal(restore.status,200);assert.deepEqual((await(await fetch(origin+'/api/session')).json()).project,backup);
 report.checks.push('all six real MCP stdio tools, replacement guard, private-note boundary, and full backup restore');
 assert.deepEqual(report.errors,[]);report.status='passed';
}catch(error){report.status='failed';report.failure=error.message;throw error;}
finally{if(client)await client.close();await stop();await writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,node:report.node,gh:report.gh,checks:report.checks.length,error:report.failure}));await rm(data,{recursive:true,force:true});}

