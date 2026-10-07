import {chromium} from 'playwright';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import express from 'express';
import {startServer} from '../src/server.mjs';
import {buildFiles} from '../src/render.mjs';
const native=process.argv.includes('--native');
const out=path.resolve('test-results/'+(native?'native':'ordinary'));
await mkdir(out,{recursive:true});
const data=await mkdtemp(path.join(tmpdir(),'protest-browser-'));
const report={nativeRequired:native,fallback:'Browser plugin not available',checks:[],errors:[],unexpectedRequests:[]};
const disconnected={account:async()=>({connected:false,message:'No account connected for the isolated check.'}),login:{state:'idle'},status:async()=>null};
let instance,publicServer,browser;
const editorOrigins=new Set();
const stop=async()=>{if(instance){instance.server.closeAllConnections();await new Promise(r=>instance.server.close(r));instance=null;}};
const start=async()=>{instance=await startServer({port:0,dataDir:data,publisher:disconnected});editorOrigins.add(instance.origin);return instance.origin;};
try{
 let base=await start();
 browser=await chromium.launch({headless:true,...(process.env.PROTEST_BROWSER_EXECUTABLE?{executablePath:process.env.PROTEST_BROWSER_EXECUTABLE}:native?{channel:'chrome'}:{}),args:native?['--enable-features=WebMCP,WebMCPTesting']:[]});
 report.browser=browser.version();
 const context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true});
 const page=await context.newPage();
 page.on('pageerror',e=>report.errors.push(e.message));
 await context.route('**/*',route=>{const u=new URL(route.request().url());if(!editorOrigins.has(u.origin)&&!u.href.startsWith('blob:')){report.unexpectedRequests.push(u.origin);return route.abort();}return route.continue();});
 const saved=()=>page.getByText('Saved on this computer',{exact:true}).waitFor();
 const download=async(name,file)=>{const pending=page.waitForEvent('download');await page.getByRole('button',{name,exact:true}).click();const dl=await pending;await dl.saveAs(path.join(out,file));return readFile(path.join(out,file));};
 const layout=async(label)=>{for(const width of [1440,390,320]){await page.setViewportSize({width,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),width);await page.screenshot({path:path.join(out,label+'-'+width+'.png'),fullPage:true});}report.checks.push(label+' fits desktop and 390/320 pixels');};
 await page.goto(base);assert.match(await page.title(),/^Protest/);await page.getByLabel('Protest title',{exact:true}).waitFor();
 assert(await page.locator('main').innerText());assert.equal(await page.locator('vite-error-overlay').count(),0);
 await page.getByLabel('Protest title',{exact:true}).fill('Fictional library access workshop');await saved();
 await page.reload();assert.equal(await page.getByLabel('Protest title',{exact:true}).inputValue(),'Fictional library access workshop');
 await layout('purpose');
 await page.getByRole('button',{name:'The guide',exact:true}).click();await page.getByLabel(/^Private planning notes/).fill('PRIVATE_PROTEST_V1_CANARY');await saved();await page.keyboard.press('Escape');await page.getByRole('dialog').waitFor({state:'hidden'});
 const backup=await download('Save project','private-backup.json');const expected=JSON.parse(backup);assert.equal(expected.privateNotes,'PRIVATE_PROTEST_V1_CANARY');
 await page.getByRole('button',{name:'Open project',exact:true}).click();await page.locator('input[type=file]').setInputFiles({name:'invalid.json',mimeType:'application/json',buffer:Buffer.from('{"broken":true}')});await page.getByRole('alert').waitFor();
 assert.deepEqual((await(await page.request.get(base+'/api/session')).json()).project,expected);
 await page.getByRole('button',{name:'Dismiss',exact:true}).click();
 await page.route('**/api/project',async route=>{if(route.request().method()==='PUT')return route.fulfill({status:400,contentType:'application/json',body:JSON.stringify({error:'Controlled save failure'})});return route.continue();});
 await page.getByLabel('Protest title',{exact:true}).fill('Fictional recovered title');await page.getByText('Not saved',{exact:true}).waitFor();
 assert.equal((await(await page.request.get(base+'/api/session')).json()).project.title,expected.title);
 await page.unroute('**/api/project');await page.getByRole('button',{name:'Dismiss',exact:true}).click();await page.getByLabel('Protest title',{exact:true}).fill(expected.title);await saved();
 report.checks.push('invalid backup and failed save preserve stored draft; corrected save succeeds');
 await page.getByRole('button',{name:'Continue to details',exact:true}).click();await page.getByRole('combobox',{name:'Event status',exact:true}).selectOption('cancelled');await page.getByLabel(/^Public update/).fill('Fictional cancellation. No actual event.');await saved();await layout('details');
 await page.getByRole('button',{name:'Choose your design',exact:true}).click();await page.getByRole('button',{name:/Broadcast/}).click();await page.getByRole('combobox',{name:'Paper size',exact:true}).selectOption('a4');await saved();
 for(const [label,file] of [['Download printable PDF','flier.pdf'],['Download square image','social.png'],['Download story image','story.png'],['Download editable SVG','flier.svg']]){
  const bytes=await download(label,file);assert(bytes.length>100);assert(!bytes.includes('PRIVATE_PROTEST_V1_CANARY'));report.checks.push({download:file,bytes:bytes.length});
 }
 const svg=await readFile(path.join(out,'flier.svg'),'utf8');assert(svg.includes('CANCELLED'));assert(!svg.includes('SCAN FOR DETAILS'));
 const png=await readFile(path.join(out,'social.png'));assert.equal(png.readUInt32BE(16),1080);assert.equal(png.readUInt32BE(20),1080);
 const story=await readFile(path.join(out,'story.png'));assert.equal(story.readUInt32BE(16),1080);assert.equal(story.readUInt32BE(20),1920);
 await layout('design');await page.getByRole('button',{name:'Website',exact:true}).click();await page.frameLocator('iframe').getByText(/^CANCELLED:/).waitFor();
 await page.getByRole('button',{name:'Get ready to publish',exact:true}).click();await page.getByText('Connect your GitHub account',{exact:true}).waitFor();assert(await page.getByRole('button',{name:'Review publication'}).isDisabled());await layout('publish');
 const siteResponse=await page.request.get(base+'/api/download/site');assert.equal(siteResponse.status(),200);await writeFile(path.join(out,'site.zip'),await siteResponse.body());
 const finalBackup=await download('Save project','final-private-backup.json');const finalExpected=JSON.parse(finalBackup);
 await stop();base=await start();await page.goto(base);await page.getByLabel('Protest title',{exact:true}).waitFor();assert.deepEqual((await(await page.request.get(base+'/api/session')).json()).project,finalExpected);
 // Copy a saved project into a new data directory through the real import handler.
 page.once('dialog',dialog=>dialog.accept());await page.getByRole('button',{name:'New draft',exact:true}).click();await page.getByRole('button',{name:'Load example',exact:true}).waitFor();assert.equal(await page.getByLabel('Protest title',{exact:true}).inputValue(),'');
 await page.getByRole('button',{name:'Open project',exact:true}).click();await page.locator('input[type=file]').setInputFiles(path.join(out,'final-private-backup.json'));await saved();assert.deepEqual((await(await page.request.get(base+'/api/session')).json()).project,finalExpected);report.checks.push('replace draft then restore backup preserves exact ID and all private fields');
 report.checks.push('full server restart preserves exact saved project and private notes');
 const generated=await buildFiles(finalExpected,'');
 const siteDir=path.join(data,'generated-public');await mkdir(siteDir);
 for(const [name,bytes] of Object.entries(generated.files)){assert(!bytes.includes('PRIVATE_PROTEST_V1_CANARY'));await writeFile(path.join(siteDir,name),bytes);}
 const publicApp=express();publicApp.use(express.static(siteDir,{dotfiles:"allow"}));
 publicServer=await new Promise(resolve=>{const s=publicApp.listen(0,'127.0.0.1',()=>resolve(s));});
 const publicBase='http://127.0.0.1:'+publicServer.address().port;
 const publicContext=await browser.newContext({viewport:{width:1440,height:1000}});const site=await publicContext.newPage();site.on('pageerror',e=>report.errors.push(e.message));await site.goto(publicBase);
 await site.getByText('Fictional demonstration. This is not an actual event.',{exact:true}).waitFor();await site.getByText(/^CANCELLED:/).waitFor();
 for(const width of [1440,390,320]){await site.setViewportSize({width,height:900});assert.equal(await site.evaluate(()=>document.documentElement.scrollWidth),width);await site.screenshot({path:path.join(out,'generated-site-'+width+'.png'),fullPage:true});}
 for(const name of Object.keys(generated.files)){assert.equal((await site.request.get(publicBase+'/'+name)).status(),200);}
 if(native){
  await site.waitForFunction(async()=>typeof document.modelContext?.getTools==='function'&&(await document.modelContext.getTools()).length===2);
  const major=Number(report.browser.split('.')[0]);
  const result=await site.evaluate(async newer=>{const tools=await document.modelContext.getTools();const result={};for(const name of ['get_protest_details','get_participant_instructions']){const tool=tools.find(t=>t.name===name);if(!tool)throw Error('Missing '+name);result[name]=await document.modelContext.executeTool(tool,newer?{}:'{}');}return {names:tools.map(t=>t.name),result};},major>=155);
  assert.deepEqual(result.names.sort(),['get_participant_instructions','get_protest_details']);assert(JSON.stringify(result.result).includes('cancelled'));assert(!JSON.stringify(result.result).includes('PRIVATE_PROTEST_V1_CANARY'));report.nativeWebMCP={passed:true,...result};
 }
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.unexpectedRequests,[]);report.status='passed';
 await context.close();await publicContext.close();
}catch(error){report.status='failed';report.failure=error.message;throw error;}
finally{if(browser)await browser.close();await stop();if(publicServer){publicServer.closeAllConnections();await new Promise(r=>publicServer.close(r));}await writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,browser:report.browser,checks:report.checks.length,native:report.nativeWebMCP?.passed,error:report.failure}));await rm(data,{recursive:true,force:true});}



