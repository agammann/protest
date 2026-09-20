import { z } from 'zod';
import { Temporal } from '@js-temporal/polyfill';
import { createHash, randomUUID } from 'node:crypto';

const text = (max) => z.string().max(max).refine(v => !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(v), 'Unsupported control character');
const link = z.string().max(1500).refine(v => { try { const u = new URL(v); return u.protocol === 'https:' && !u.username && !u.password; } catch { return false; } }, 'Use a complete HTTPS link');
export const projectSchema = z.object({
  version: z.literal(1), id: z.string().uuid(), example: z.boolean(),
  title: text(100), reason: text(1400), demand: text(400), organizer: text(120),
  date: text(10), startTime: text(5), endTime: text(5), timezone: text(80),
  location: text(140), address: text(240), meetingPoint: text(700),
  expectations: text(1400), accessibility: text(1000), bring: text(700),
  contact: text(240), sources: z.array(z.object({ title: text(160), url: link.or(z.literal('')) }).strict()).max(12),
  status: z.enum(['scheduled', 'updated', 'postponed', 'cancelled', 'completed']), update: text(1000),
  theme: z.enum(['signal', 'broadcast', 'press']), format: z.enum(['letter', 'a4']),
  privateNotes: text(5000), checks: z.array(z.enum(['purpose','location','access','roles','updates'])).max(5),
  repo: z.string().max(70).regex(/^$|^[a-z0-9][a-z0-9-]{0,69}$/, 'Use lowercase letters, numbers, and hyphens'),
}).strict();

export function newProject() {
  return { version:1, id:randomUUID(), example:false, title:'', reason:'', demand:'', organizer:'', date:'', startTime:'', endTime:'', timezone:Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC', location:'', address:'', meetingPoint:'', expectations:'', accessibility:'', bring:'', contact:'', sources:[], status:'scheduled', update:'', theme:'signal', format:'letter', privateNotes:'', checks:[], repo:'' };
}
export function exampleProject() {
  return { ...newProject(), example:true, title:'Keep our library open', reason:'A peaceful gathering for a library that stays open to everyone.', demand:'Keep evening hours in the next library budget.', organizer:'Neighbors for the library', date:'2026-10-17', startTime:'14:00', endTime:'15:00', timezone:'America/Los_Angeles', location:'Civic Square', address:'Fictional example location', meetingPoint:'Meet beside the library steps at the east entrance. This is a fictional example, not an actual event.', expectations:'A peaceful, stationary gathering with short community speeches.', accessibility:'Add confirmed access information before inviting participants.', bring:'Water, weather appropriate clothing, and a sign if you would like.', repo:'library-gathering' };
}
export function timing(p) {
  const start = Temporal.ZonedDateTime.from(`${p.date}T${p.startTime}[${p.timezone}]`, { disambiguation:'reject' });
  const end = p.endTime ? Temporal.ZonedDateTime.from(`${p.date}T${p.endTime}[${p.timezone}]`, {disambiguation:'reject'}) : null;
  if (end && Temporal.ZonedDateTime.compare(end,start) <= 0) throw new Error('End time must be after start time on the same day.');
  return {start, end};
}
export function readiness(p) {
  const issues = [];
  for (const [key, label] of Object.entries({title:'Protest title',reason:'Reason for gathering',demand:'Requested change',organizer:'Organizer',date:'Date',startTime:'Start time',timezone:'Time zone',location:'Location',address:'Address',meetingPoint:'Exact meeting point'})) if (!p[key].trim()) issues.push(`${label} is missing.`);
  if (p.date && p.startTime && p.timezone) { try {timing(p);} catch {issues.push('Check the date, time zone, and times. Ambiguous or skipped daylight saving times need a different time. End time must follow start time.');} }
  if (p.status !== 'scheduled' && !p.update.trim()) issues.push('Explain the event status in the public update.');
  p.sources.forEach((s,i)=>{if(!s.url)issues.push(`Source ${i+1} needs an HTTPS link or should be removed.`);});
  return issues;
}
export function publicProject(p) { const {privateNotes,checks,repo,...data}=projectSchema.parse(p); return data; }
export const digest = p => createHash('sha256').update(JSON.stringify(p)).digest('hex');
export function slug(title) { return title.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,60) || 'our-protest'; }
export function displayDate(p) { try { return new Intl.DateTimeFormat('en-US',{weekday:'short',day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(`${p.date}T12:00:00Z`)); } catch {return 'DATE TO COME';} }
export function displayTime(p) { try { const {start}=timing(p); return new Intl.DateTimeFormat('en-US',{hour:'numeric',minute:'2-digit',timeZone:p.timezone,timeZoneName:'short'}).format(new Date(Number(start.epochMilliseconds))); } catch {return 'TIME TO COME';} }

export const guide = [
  {id:'purpose',title:'Give people a reason to show up.',body:'Explain the issue in your own words. Name the specific change you are asking for and who can make that change. Link to original documents or reliable reporting so people can read the background.'},
  {id:'location',title:'Make the meeting point unmistakable.',body:'Use a full address and a landmark or entrance. Visit the place when possible. Check the relevant local requirements for your activity and location with the responsible authority. A generated page is not a permit or legal assessment.'},
  {id:'access',title:'Plan for the people joining you.',body:'Confirm step free access, seating or rest areas, toilets, transit, and interpretation where available. Describe what is actually available. Explain the format, duration, weather plan, and what to bring.'},
  {id:'roles',title:'Share the work before the day.',body:'Agree who welcomes people, answers questions, handles accessibility requests, and posts updates. Set expectations for peaceful participation and how organizers will respond if someone needs help. Keep private contact lists out of public materials.'},
  {id:'updates',title:'Keep one dependable source of information.',body:'Check every date, address, and link before printing. Use the same site for changes and cancellation notices. After the gathering, share what happened, what changed, and a concrete next step. Avoid publishing identifying photos or details without permission.'}
];
