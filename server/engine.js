import { DatabaseSync } from 'node:sqlite';
import { randomBytes, createHash, timingSafeEqual } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, chmodSync } from 'node:fs';
import { join } from 'node:path';
export const token = () => randomBytes(24).toString('hex');
export const hash = s => createHash('sha256').update(s).digest('hex');
export const same = (a,b) => typeof a==='string' && typeof b==='string' && a.length===b.length && timingSafeEqual(Buffer.from(a),Buffer.from(b));
export class Fault extends Error { constructor(message,status=400){super(message);this.status=status;} }
export class Engine {
 constructor(dir,{now=Date.now,escalationMs=30000}={}){
  mkdirSync(dir,{recursive:true,mode:0o700});this.now=now;this.escalationMs=escalationMs;
  const p=join(dir,'owner-key');try{this.key=readFileSync(p,'utf8').trim();}catch{this.key=token();writeFileSync(p,this.key,{mode:0o600});}
  this.db=new DatabaseSync(join(dir,'relay.sqlite'));chmodSync(join(dir,'relay.sqlite'),0o600);
  this.db.exec('PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS state(id INTEGER PRIMARY KEY, body TEXT NOT NULL)');
  const row=this.db.prepare('SELECT body FROM state WHERE id=1').get();
  this.s=row?JSON.parse(row.body):{contacts:[],incidents:[],jobs:[],bee:[],seen:[],armedUntil:0,checkInAt:0,bridgeSeen:0};
  for(const j of this.s.jobs)if(j.status==='running'){j.status='interrupted';j.result='The worker restarted. Review and start a new task; it was not silently rerun.';}
  for(const i of this.s.incidents){i.audioReady=[];i.audioStates={};i.signals=[];i.callEpoch++;}
  this.save();
 }
 save(){if(this.closed)return;this.db.prepare('INSERT INTO state(id,body) VALUES(1,?) ON CONFLICT(id) DO UPDATE SET body=excluded.body').run(JSON.stringify(this.s));}
 close(){this.closed=true;this.db.close();}
 auth(key){if(same(key||'',this.key))return {role:'owner',id:'owner'};const c=this.s.contacts.find(c=>same(hash(key||''),c.hash)&&c.expiresAt>this.now());if(c)return {role:'contact',id:c.id};throw new Fault('This access link is invalid or expired.',401);}
 contact(id){const c=this.s.contacts.find(c=>c.id===id);if(!c)throw new Fault('Contact unavailable.',404);return c;}
 addContact(name){if(this.s.contacts.length>=3)throw new Fault('This prototype supports three contacts.');const key=token();const c={id:token().slice(0,12),name,hash:hash(key),accepted:false,seenAt:0,expiresAt:this.now()+48*3600000};this.s.contacts.push(c);this.save();return {id:c.id,name,key};}
 accept(id){const c=this.contact(id);c.accepted=true;c.seenAt=this.now();this.save();}
 pulse(id){if(id!=='owner'){this.contact(id).seenAt=this.now();this.save();}}
 log(i,type,text){i.events.push({at:this.now(),type,text});i.events=i.events.slice(-100);}
 active(){return this.s.incidents.find(i=>!['resolved','cancelled'].includes(i.status));}
 incident(id,actor){const i=this.s.incidents.find(i=>i.id===id);if(!i)throw new Fault('Help session not found.',404);if(actor.role!=='owner'&&!i.contacts.includes(actor.id))throw new Fault('This help session is not shared with you.',403);return i;}
 start(source='button',context='User pressed the SOS button.'){
  if(this.active())return this.active();
  const contacts=this.s.contacts.filter(c=>c.accepted&&c.expiresAt>this.now()).map(c=>c.id);
  const i={id:token().slice(0,20),startedAt:this.now(),status:'waiting',source,context,contacts,notified:[],acknowledgedBy:null,nextEscalationAt:this.now()+this.escalationMs,location:null,events:[],signals:[],signalSeq:0,audioReady:[],audioStates:{},callPeer:null,callEpoch:0};
  this.s.incidents.unshift(i);this.s.incidents=this.s.incidents.slice(0,30);this.log(i,'requested','Help requested. No emergency services are contacted by this prototype.');
  this.notifyNext(i);this.save();return i;
 }
 notifyNext(i){const next=i.contacts.find(id=>!i.notified.includes(id));if(next){i.notified.push(next);const c=this.contact(next);this.log(i,'queued',`Alert available in ${c.name}’s contact dashboard. Acknowledgement pending.`);}else{this.log(i,'unacknowledged',i.contacts.length?'All configured contacts have been notified in-app. Nobody has acknowledged.':'No accepted contact is available. This session has no responder.');}i.nextEscalationAt=this.now()+this.escalationMs;}
 tick(){let dirty=false;if(this.s.checkInAt&&this.now()>=this.s.checkInAt){this.s.checkInAt=0;this.start('check-in','The user-configured check-in deadline passed. Their situation is unknown.');dirty=true;}
  const i=this.active();if(i&&!i.acknowledgedBy&&i.notified.length<i.contacts.length&&this.now()>=i.nextEscalationAt){this.notifyNext(i);dirty=true;}
  if(this.s.armedUntil&&this.s.armedUntil<this.now()){this.s.armedUntil=0;dirty=true;}if(dirty)this.save();
 }
 acknowledge(i,actor){if(actor.role!=='contact')throw new Fault('A trusted contact must acknowledge.',403);if(!i.notified.includes(actor.id))throw new Fault('This contact has not yet been alerted.',403);if(['resolved','cancelled'].includes(i.status))throw new Fault('This session has ended.',409);if(i.acknowledgedBy&&i.acknowledgedBy!==actor.id)throw new Fault('Another contact is responding.',409);if(!i.acknowledgedBy){i.acknowledgedBy=actor.id;i.callPeer=actor.id;i.status='acknowledged';this.log(i,'acknowledged',`${this.contact(actor.id).name} acknowledged the request. This does not mean audio is connected.`);}this.save();}
 finish(i,status,actor){if(['resolved','cancelled'].includes(i.status))return;if(status==='cancelled'&&actor.role!=='owner')throw new Fault('Only the owner can cancel.',403);if(actor.role==='contact'&&i.acknowledgedBy!==actor.id)throw new Fault('Only the responding contact can resolve.',403);i.status=status;i.endedAt=this.now();i.audioReady=[];i.audioStates={};i.signals=[];i.location=null;this.log(i,status,status==='cancelled'?'User cancelled this request.':'Session explicitly marked resolved.');this.save();}
 beeEvent({eventId,capturedAt,payload},source='bee-cli'){
  if(this.s.seen.includes(eventId))return {duplicate:true};this.s.seen.push(eventId);this.s.seen=this.s.seen.slice(-500);
  const text=payload.utterance?.text||'';const historical=this.now()-capturedAt>60000||capturedAt>this.now()+10000;
  const agentRequest=source!=='documentation'&&!historical&&/^relay[, ]+ask (?:my )?agent[,: ]+/i.test(text)?text.replace(/^relay[, ]+ask (?:my )?agent[,: ]+/i,'').trim().slice(0,2000):null;
  const entry={agentRequest,at:this.now(),capturedAt,text:text.slice(0,1000),source,historical,eventId};this.s.bee.unshift(entry);this.s.bee=this.s.bee.slice(0,30);
  if(source==='bee-cli')this.s.bridgeSeen=this.now();
  const command=text.toLowerCase().replace(/[.,!?]/g,'').trim().replace(/\s+/g,' ');
  const triggered=source!=='documentation'&&!historical&&this.s.armedUntil>this.now()&&command==='relay i need help';
  if(triggered)this.start(source,`Exact configured help phrase received. Source: ${source}. Transcript: “${text.slice(0,250)}”. Speaker identity is not verified.`);
  this.save();return {triggered,historical,source};
 }
 view(actor){this.tick();const publicContact=c=>({id:c.id,name:c.name,accepted:c.accepted,online:this.now()-c.seenAt<12000,expired:c.expiresAt<=this.now()});
  const clean=i=>({...i,signals:undefined,contacts:i.contacts.map(id=>({id,name:this.contact(id).name,notified:i.notified.includes(id)}))});
  const base={role:actor.role,actorId:actor.id,now:this.now(),transport:'in-app',incidents:this.s.incidents.filter(i=>actor.role==='owner'||i.notified.includes(actor.id)).map(clean)};
  if(actor.role==='contact')return {...base,contact:publicContact(this.contact(actor.id))};
  return {...base,contacts:this.s.contacts.map(publicContact),armedUntil:this.s.armedUntil,checkInAt:this.s.checkInAt,bridgeSeen:this.s.bridgeSeen,bee:this.s.bee,jobs:this.s.jobs.map(({workspace,...j})=>j)};
 }
}
