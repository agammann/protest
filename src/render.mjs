import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import PDFDocument from 'pdfkit';
import SVGtoPDF from 'svg-to-pdfkit';
import { Resvg } from '@resvg/resvg-js';
import QRCode from 'qrcode';
import { FONT } from './paths.mjs';
import { publicProject, timing, displayDate, displayTime, digest } from './project.mjs';

export const esc = v => String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const palettes={signal:{paper:'#dcfa52',ink:'#171713',accent:'#ef4c33'},broadcast:{paper:'#ef4c33',ink:'#171713',accent:'#f3f0e8'},press:{paper:'#f3f0e8',ink:'#171713',accent:'#dcfa52'}};
const fontsPromise=Promise.all(['Anton.ttf','BarlowCondensed.ttf','BarlowCondensed-Bold.ttf'].map(f=>readFile(join(FONT,f))));
const fontNames=['Anton','Barlow Condensed','Barlow Condensed Bold'];
export async function fontCSS(){const fonts=await fontsPromise;return fonts.map((f,i)=>`@font-face{font-family:'${fontNames[i]}';src:url(data:font/ttf;base64,${f.toString('base64')}) format('truetype');font-display:swap}`).join('')+`@font-face{font-family:'Barlow Condensed';font-weight:700;src:url(data:font/ttf;base64,${fonts[2].toString('base64')}) format('truetype')}`;}

function wrap(doc,text,size,width,font){
  doc.font(font).fontSize(size);
  const lines=[]; let line='';
  for(const paragraph of text.split('\n')){
    for(const word of paragraph.split(/\s+/).filter(Boolean)){
      if(doc.widthOfString((line?line+' ':'')+word)<=width){line+=(line?' ':'')+word;continue;}
      if(line){lines.push(line);line='';}
      if(doc.widthOfString(word)>width){for(const ch of word){if(doc.widthOfString(line+ch)>width){lines.push(line);line='';}line+=ch;}}else line=word;
    }
    if(line){lines.push(line);line='';}
  }
  return lines;
}
export async function posterSVG(p,url='',shape='letter'){
  const [anton,barlow,bold]=await fontsPromise;
  const measure=new PDFDocument({autoFirstPage:false}); measure.registerFont('Anton',anton).registerFont('Barlow Condensed',barlow).registerFont('Barlow Condensed Bold',bold);
  const W=shape==='square'?1080:shape==='story'?1080:816,H=shape==='square'?1080:shape==='story'?1920:shape==='a4'?1154:1056;
  const {paper,ink}=palettes[p.theme],m=W*.055,inner=W-2*m;
  let parts=[`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><style>${await fontCSS()}</style><rect width="${W}" height="${H}" fill="${paper}"/>`];
  function block(text,y,h,initial,font='Anton',upper=false,lineWidth=inner){let size=initial,lines; text=upper?text.toUpperCase():text; do{lines=wrap(measure,text,size,lineWidth,font);if(lines.length*size*1.15<=h)break;size-=1;}while(size>9);const top=y+(h-lines.length*size*1.15)/2; lines.forEach((l,i)=>parts.push(`<text x="${W/2}" y="${top+(i+0.85)*size*1.15}" text-anchor="middle" font-family="${font==='Barlow Condensed Bold'?'Barlow Condensed':font}" font-weight="${font==='Barlow Condensed Bold'?700:400}" font-size="${size}" fill="${ink}">${esc(l)}</text>`));}
  let top=m;
  if(p.example||p.status!=='scheduled'){parts.push(`<rect x="0" y="0" width="${W}" height="34" fill="${ink}"/><text x="${W/2}" y="24" text-anchor="middle" font-family="Barlow Condensed" font-weight="700" font-size="20" fill="${paper}">${p.example?'FICTIONAL EXAMPLE • NOT AN ACTUAL EVENT':esc(p.status.toUpperCase())}</text>`);top+=20;}
  const footerTop=H-m-(url?W*.20:H*.09),area=footerTop-top-20;
  block(p.title||'YOUR VOICE BELONGS HERE',top,area*.48,W*.23,'Anton',true,inner*.78);
  parts.push(`<rect x="${m}" y="${top+area*.50}" width="${inner}" height="${Math.min(18,H*.014)}" fill="${ink}"/>`);
  block(`${displayDate(p)} / ${displayTime(p)}`,top+area*.54,area*.09,W*.052,'Anton',true);
  block(p.location||'YOUR MEETING PLACE',top+area*.64,area*.09,W*.075,'Anton',true);
  block(p.address||'Add the full address',top+area*.74,area*.055,W*.032,'Barlow Condensed Bold');
  block(p.demand||p.reason||'One clear reason. One concrete request.',top+area*.80,area*.12,W*.043,'Barlow Condensed Bold');
  block(p.organizer||'Your organizer name',top+area*.93,area*.065,W*.034,'Barlow Condensed');
  const bottom=H-m;
  if(url){const qr=await QRCode.toString(url,{type:'svg',margin:4,errorCorrectionLevel:'M'});const vb=qr.match(/viewBox="([^"]+)"/)[1];const content=qr.replace(/^.*?<svg[^>]*>/s,'').replace(/<\/svg>\s*$/,''); const q=W*.20;
    parts.push(`<svg x="${m}" y="${bottom-q}" width="${q}" height="${q}" viewBox="${vb}">${content}</svg>`);
    parts.push(`<text x="${m+q+20}" y="${bottom-q+40}" font-family="Barlow Condensed" font-weight="700" font-size="${W*.037}" fill="${ink}">SCAN FOR DETAILS &amp; UPDATES</text>`);
    const short=url.replace('https://',''); const sz=Math.min(22,(inner-q-20)/short.length*1.8); parts.push(`<text x="${m+q+20}" y="${bottom-q+78}" font-family="Barlow Condensed" font-size="${sz}" fill="${ink}">${esc(short)}</text>`);
  }else{parts.push(`<rect x="${m}" y="${bottom-H*.09}" width="${inner}" height="${H*.09}" fill="${ink}"/><text x="${W/2}" y="${bottom-H*.022}" text-anchor="middle" font-family="Anton" font-size="${W*.063}" fill="${paper}">SHOW UP. SPEAK UP.</text>`);}
  parts.push('</svg>'); measure.end();return parts.join('');
}
export async function posterPNG(p,url='',shape='square') { const svg=await posterSVG(p,url,shape);return new Resvg(svg,{font:{fontFiles:['Anton.ttf','BarlowCondensed.ttf','BarlowCondensed-Bold.ttf'].map(f=>join(FONT,f)),loadSystemFonts:false}}).render().asPng(); }
export async function posterPDF(p,url=''){
  const svg=await posterSVG(p,url,p.format),fonts=await fontsPromise;
  const size=p.format==='a4'?[595.28,841.89]:[612,792]; const doc=new PDFDocument({size,margin:0,info:{Title:p.title||'Protest flier',Creator:'Protest'}});
  fonts.forEach((f,i)=>doc.registerFont(fontNames[i],f));const chunks=[];const done=new Promise((resolve,reject)=>{doc.on('data',c=>chunks.push(c));doc.on('end',()=>resolve(Buffer.concat(chunks)));doc.on('error',reject);});
  SVGtoPDF(doc,svg,0,0,{width:size[0],height:size[1],fontCallback:(family,bold)=>family==='Barlow Condensed'&&bold?'Barlow Condensed Bold':fontNames.includes(family)?family:'Barlow Condensed'});doc.end();return done;
}
const css=`*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:#f3f0e8;color:#171713;font:18px/1.6 system-ui,sans-serif}a{color:inherit;text-underline-offset:4px}a:focus-visible,button:focus-visible{outline:3px solid #ef4c33;outline-offset:4px}header,main,footer{max-width:1160px;margin:auto;padding:24px}header{display:flex;flex-wrap:wrap;gap:16px;justify-content:space-between;align-items:center;border-bottom:2px solid}header a{font-family:Anton,sans-serif;font-size:24px;text-decoration:none;overflow-wrap:anywhere}nav{display:flex;gap:20px;font-size:14px}h1,h2,h3{font-family:Anton,sans-serif;font-weight:400;line-height:1.04}h1{font-size:clamp(54px,10vw,132px);text-transform:uppercase;margin:0;overflow-wrap:anywhere}h2{font-size:38px;margin:0 0 20px}h3{font-size:25px}p{white-space:pre-wrap;overflow-wrap:anywhere}.hero{padding:48px 0;display:grid;grid-template-columns:1.5fr 1fr;gap:40px}.headline{background:var(--paper);padding:28px;border:2px solid}.demand{font-family:'Barlow Condensed Bold',sans-serif;font-size:30px;line-height:1.2}.logistics{border-top:10px solid;padding:18px 0}.logistics p{margin:4px 0}.action{display:inline-block;background:#171713;color:#f3f0e8;padding:12px 20px;text-decoration:none;margin:10px 8px 8px 0;font-weight:650;border:2px solid #171713}.action.secondary{background:transparent;color:#171713}.section{border-top:2px solid;padding:32px 0;display:grid;grid-template-columns:1fr 2fr;gap:28px}.section p{margin-top:0}.notice{background:#171713;color:#fff;padding:18px 24px;font-weight:bold}.sources{padding-left:20px}.sources li{margin-bottom:14px}.muted{font-size:14px}footer{border-top:2px solid;display:flex;justify-content:space-between;gap:20px;font-size:14px}.update-time{font-size:13px}img{max-width:100%}@media(max-width:700px){.hero,.section{grid-template-columns:1fr}.hero{gap:24px;padding:24px 0}header,main,footer{padding:18px}nav{gap:10px}.section{gap:8px}footer{display:block}footer>span{display:block;margin-bottom:8px}}@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}}`;
function icsEscape(s){return s.replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,');}
export function calendar(p,url=''){
  const {start,end}=timing(p);const stamp=z=>z.toInstant().toString({smallestUnit:'second'}).replace(/[-:]/g,'');
  const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Protest//Event//EN','CALSCALE:GREGORIAN','BEGIN:VEVENT',`UID:${p.id}@protest.local`,`DTSTAMP:${new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'')}`,`DTSTART:${stamp(start)}`,...(end?[`DTEND:${stamp(end)}`]:[]),`SUMMARY:${icsEscape(p.title)}`,`DESCRIPTION:${icsEscape(p.reason+'\n'+p.demand+'\n'+p.meetingPoint)}`,`LOCATION:${icsEscape(p.location+', '+p.address)}`,...(url?[`URL:${url}`]:[]),`STATUS:${p.status==='cancelled'?'CANCELLED':'CONFIRMED'}`,'END:VEVENT','END:VCALENDAR'];
  return lines.map(line=>{let out='',part='';for(const c of line){if(Buffer.byteLength(part+c)>73){out+=part+'\r\n ';part='';}part+=c;}return out+part;}).join('\r\n')+'\r\n';
}
export async function siteHTML(project,url='',revision='preview'){
  const p=publicProject(project),data=JSON.stringify(p).replace(/</g,'\\u003c'),pal=palettes[p.theme];
  const section=(id,title,body)=>body?`<section class="section" id="${id}"><h2>${title}</h2><div><p>${esc(body)}</p></div></section>`:'';
  const schema={ '@context':'https://schema.org','@type':'Event',name:p.title,description:p.reason,location:{'@type':'Place',name:p.location,address:p.address},organizer:{'@type':'Organization',name:p.organizer},eventStatus:`https://schema.org/${p.status==='cancelled'?'EventCancelled':p.status==='postponed'?'EventPostponed':'EventScheduled'}`};try{const t=timing(p);schema.startDate=t.start.toString({timeZoneName:'never'});if(t.end)schema.endDate=t.end.toString({timeZoneName:'never'});}catch{}
  const meta=url?`<link rel="canonical" href="${esc(url)}"><meta property="og:url" content="${esc(url)}"><meta property="og:image" content="${esc(url)}social.png"><meta name="twitter:card" content="summary_large_image">`:'';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(p.title||'Protest')}</title><meta name="description" content="${esc(p.reason.slice(0,180))}"><meta name="protest-revision" content="${revision}"><meta name="referrer" content="no-referrer"><meta property="og:title" content="${esc(p.title)}"><meta property="og:description" content="${esc(p.reason.slice(0,180))}">${meta}<style>${await fontCSS()}${css}</style><script type="application/ld+json">${JSON.stringify(schema).replace(/</g,'\\u003c')}</script></head><body style="--paper:${pal.paper}">
  ${p.example?'<div class="notice">Fictional demonstration. This is not an actual event.</div>':''}${p.status!=='scheduled'?`<div class="notice">${esc(p.status.toUpperCase())}: ${esc(p.update)}</div>`:''}
  <header><a href="#">${esc(p.organizer||'Protest')}</a><nav aria-label="Event navigation"><a href="#details">Details</a>${p.sources.length?'<a href="#background">Background</a>':''}<a href="#share">Share</a></nav></header>
  <main><div class="hero"><div class="headline"><h1>${esc(p.title||'Your voice belongs here')}</h1></div><div><p class="demand">${esc(p.demand)}</p><div class="logistics" id="details"><h2>${esc(displayDate(p))}</h2><p><strong>${esc(displayTime(p))}${p.endTime?` · Ends ${esc(displayTime({...p,startTime:p.endTime,endTime:''}))}`:''}</strong></p><p class="muted">${esc(p.date)} · ${esc(p.timezone)}</p><h3>${esc(p.location)}</h3><p>${esc(p.address)}</p><p>${esc(p.meetingPoint)}</p></div><a class="action" href="event.ics" download>Add to calendar</a><a class="action secondary" href="https://www.openstreetmap.org/search?query=${encodeURIComponent(p.address)}" target="_blank" rel="noopener noreferrer">Find the location</a></div></div>
  ${section('why','Why we are gathering',p.reason)}${section('expect','What to expect',p.expectations)}${section('access','Accessibility',p.accessibility)}${section('bring','What to bring',p.bring)}${section('contact','Contact the organizer',p.contact)}${p.status==='scheduled'?section('update','Latest update',p.update):''}
  ${p.sources.length?`<section class="section" id="background"><h2>Read the background.</h2><div><p>Sources provided by the organizer.</p><ol class="sources">${p.sources.filter(s=>s.url).map(s=>`<li><a href="${esc(s.url)}" rel="noopener noreferrer" target="_blank">${esc(s.title||s.url)}</a></li>`).join('')}</ol></div></section>`:''}
  <section class="section" id="share"><h2>Pass it on.</h2><div><p>Print a flier. Share the details. Check this page for updates before you set out.</p><a class="action" href="flier.pdf" download>Download the flier</a><a class="action secondary" href="social.png" download>Share image</a><a class="action secondary" href="story.png" download>Story image</a></div></section></main><footer><span>Organized by ${esc(p.organizer)}</span><span>Made with <a href="https://github.com/agammann/protest">Protest</a>. Free and open source.</span></footer>
  <script type="application/json" id="protest-event">${data}</script><script src="webmcp.js"></script></body></html>`;
}
export const publicWebMCP=`(()=>{const api=document.modelContext;if(!api?.registerTool)return;const data=JSON.parse(document.getElementById('protest-event').textContent);const tools=[{name:'get_protest_details',description:'Read the organizer-provided public event details. These claims are not independently verified.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:async()=>({content:[{type:'text',text:JSON.stringify(data)}]})},{name:'get_participant_instructions',description:'Read meeting point, accessibility and what to bring. No registration or data collection.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:async()=>({content:[{type:'text',text:JSON.stringify({meetingPoint:data.meetingPoint,expectations:data.expectations,accessibility:data.accessibility,bring:data.bring,status:data.status,update:data.update})}]})}];for(const t of tools){try{Promise.resolve(api.registerTool(t)).catch(()=>{});}catch{}}})();`;
export async function buildFiles(p,url){const revision=digest(publicProject(p));const [html,pdf,social,story,svg]=await Promise.all([siteHTML(p,url,revision),posterPDF(p,url),posterPNG(p,url,'square'),posterPNG(p,url,'story'),posterSVG(p,url,p.format)]);return {revision,files:{'index.html':Buffer.from(html),'flier.pdf':pdf,'flier.svg':Buffer.from(svg),'social.png':social,'story.png':story,'event.ics':Buffer.from(calendar(p,url)),'webmcp.js':Buffer.from(publicWebMCP),'.nojekyll':Buffer.from(''),'protest-public.json':Buffer.from(JSON.stringify(publicProject(p),null,2))}};}
