window.installAutoSync=function(app,transport){
'use strict';
const core=SilverlightSync,crdt=SilverlightAuto;
let meta=null,running=false,timer=null,retry=5000,label='Automatic sync is off',message='',started=false;
const clone=x=>JSON.parse(JSON.stringify(x)),state=()=>core.canonical(app.getState());
function status(value,details=''){label=value;message=details;const bar=document.querySelector('#syncStatusBar');if(bar){bar.hidden=!meta?.enabled;bar.textContent=value+(details?' · '+details:'');bar.dataset.state=value;bar.onclick=transport.show}const el=document.querySelector('#autoStatus');if(el)el.textContent=value+(details?' · '+details:'');const last=document.querySelector('#autoLastSynced');if(last)last.textContent=meta?.lastSynced?'Last synced: '+new Date(meta.lastSynced).toLocaleString():'Not synced yet';const button=document.querySelector('#driveSync');button.title=value+(details?' · '+details:'');button.setAttribute('aria-label',button.title)}
function schedule(delay=2000){clearTimeout(timer);if(meta?.enabled)timer=setTimeout(()=>cycle(),delay)}
function changed(){if(meta?.enabled){status('Pending');schedule()}}
async function persist(next,w=null,expected=state()){await app.writeSync(w,next,expected);meta=next;}
async function call(op,args={}){return transport.request(op,{...args,silent:true,expectedAccount:meta.account})}
function available(){return app.ready()&&app.canSync()&&document.visibilityState!=='hidden'&&!transport.isManualBusy()}
async function cycle(){
 if(running||!meta?.enabled)return;
 if(!available()){schedule(3000);return}if(!navigator.onLine){status('Offline','Changes stay saved on this device');schedule(15000);return}
 running=true;try{
  status('Syncing');const session=await transport.request('session',{silent:true});if(!session.connected){status('Needs sign-in','Open the cloud menu and Connect Google');schedule(60000);return}if(session.accountId!==meta.account){status('Needs attention','Google account changed; reconnect the original account');schedule(60000);return}
  let current=clone(app.getState()),expected=state(),next=await crdt.capture(meta,current);await persist(next,null,expected);
  const files=(await transport.list({silent:true,expectedAccount:meta.account})).filter(f=>f.appProperties?.protocol==='auto-v1'&&f.appProperties?.dataset===meta.dataset);
  const known=new Set(meta.files),remote=[];let cloudHashes=[];
  for(const file of files){if(known.has(file.id))continue;const result=await call('download',{fileId:file.id});const snapshot=JSON.parse(result.snapshot),records=await crdt.verify(snapshot,meta.dataset);remote.push(...records);cloudHashes.push(await core.revision(records));known.add(file.id)}
  if(!available()||!meta.enabled){schedule(3000);return}
  // Capture intervening edits before learning remote clocks; they are concurrent, not overwrites.
  current=clone(app.getState());expected=state();next=await crdt.capture(meta,current);next.records=crdt.merge(next.records,remote);next.files=[...known];
  const projected=crdt.projection(next.records,current);let incoming=null;
  if(!projected.missing.length){core.workspace(projected.workspace);incoming=projected.workspace;next=await crdt.observed(next,incoming)}
  next.missing=projected.missing;next.conflicts=projected.conflicts;
  await persist(next,incoming&&core.canonical(current.boards)!==core.canonical(incoming.boards)?incoming:null,expected);
  const digest=await core.revision(meta.records);
  if(cloudHashes.includes(digest)&&meta.published!==digest){next=clone(meta);next.published=digest;await persist(next)}
  if(meta.published!==digest){const snapshot=await crdt.envelope(meta,app.getState());const result=await call('upload',{snapshot});next=clone(meta);next.published=digest;if(result.id&&!next.files.includes(result.id))next.files.push(result.id);await persist(next)}
  expected=state();next=await crdt.capture(meta,app.getState());const stillPending=await core.revision(next.records)!==meta.published;next.lastSynced=new Date().toISOString();await persist(next,null,expected);retry=5000;
  if(meta.missing?.length||meta.conflicts?.length)status('Needs attention','Conflicting BOARD versions are preserved; open the cloud menu');else if(stillPending)status('Pending');else status('Synced',new Date(meta.lastSynced).toLocaleTimeString());
  schedule(stillPending?2000:15000);
 }catch(error){status(navigator.onLine?'Pending':'Offline',error.message);schedule(retry);retry=Math.min(retry*2,60000)}finally{running=false}
}
async function pause(){if(running)throw Error('Wait for the current sync to finish before pausing or restoring.');if(!meta)return;const next=clone(meta);next.enabled=false;await persist(next);clearTimeout(timer);status('Automatic sync is paused')}
async function enable(){
 if(running||transport.isManualBusy())return;running=true;
 try{
  if(!app.ready())throw Error('Wait for device storage to finish loading.');
  status('Connecting');const session=await transport.request('connect');if(!session.accountId)throw Error('Update both preview apps to use automatic sync.');
  if(meta?.dataset){if(meta.account!==session.accountId)throw Error('Reconnect the original Google account. Local data and sync history were kept.');app.modal('Resume automatic sync','<p>Changes made on this device while paused, including deletions, will sync to your other devices. Changes from those devices will combine; competing BOARD edits will be kept for review.</p>','<button id="autoResumeCancel" class="outline">Cancel</button><button id="autoEnableConfirm" class="primary">Resume automatic sync</button>');document.querySelector('#autoResumeCancel').onclick=transport.show;document.querySelector('#autoEnableConfirm').onclick=async()=>{try{const next=clone(meta);next.enabled=true;await persist(next);app.close();schedule(0)}catch(e){status('Needs attention',e.message)}};return}
  const files=(await transport.list()).filter(f=>f.appProperties?.protocol==='auto-v1'),groups=new Map();for(const f of files){const dataset=f.appProperties.dataset;if(dataset&&!groups.has(dataset))groups.set(dataset,f)}
  async function join(dataset){if(running)return;running=true;try{const expected=state(),device=meta?.device||crypto.randomUUID();let next=crdt.empty(device,dataset,session.accountId);next.enabled=true;next=await crdt.capture(next,app.getState());await persist(next,null,expected);app.close();schedule(0)}catch(e){status('Needs attention',e.message)}finally{running=false}}
  if(groups.size){app.modal('Join automatic sync','<p>Join your existing automatic workspace. Local BOARDS will be combined; differences in the same BOARD will be kept for review.</p><div id="autoGroups"></div>','<button id="autoJoinCancel" class="outline">Cancel</button>');document.querySelector('#autoJoinCancel').onclick=transport.show;const root=document.querySelector('#autoGroups');for(const [dataset,file]of groups){const b=document.createElement('button');b.className='outline';b.textContent='Join workspace · '+new Date(file.createdTime).toLocaleString();b.onclick=()=>join(dataset);root.append(b)}}
  else {app.modal('Enable automatic sync','<p>Automatically sync BOARDS while Silverlight is open. Different BOARDS combine; competing edits to one BOARD are retained for review. Existing manual cloud copies remain available.</p>','<button id="autoEnableCancel" class="outline">Cancel</button><button id="autoEnableConfirm" class="primary">Enable automatic sync</button>');document.querySelector('#autoEnableCancel').onclick=transport.show;document.querySelector('#autoEnableConfirm').onclick=()=>join(crypto.randomUUID())}
 }catch(e){status('Needs attention',e.message)}finally{running=false}
}
async function resolveBoard(id,index,all=false,reference=false){
 if(running)return;running=true;try{
  const expected=state();let next=await crdt.capture(meta,app.getState());next=reference?crdt.recoverReference(next,id):crdt.resolve(next,id,index,all);const projected=crdt.projection(next.records,app.getState());if(projected.missing.length)throw Error('This choice would leave a BOARD STICKY pointing to a missing BOARD. Keep that BOARD, or remove its links first.');core.workspace(projected.workspace);next=await crdt.observed(next,projected.workspace);next.conflicts=projected.conflicts;next.missing=[];await persist(next,projected.workspace,expected);app.close();schedule(0);
 }catch(e){status('Needs attention',e.message)}finally{running=false}
}
function conflicts(){
 if(!meta)return;app.modal('Review BOARD conflicts','<p>Choose which version keeps the original BOARD. Other versions are saved as separate conflict-copy BOARDS. Local recovery is also saved first.</p><p id="autoStatus"></p><div id="autoConflicts"></div>','<button id="autoConflictClose" class="outline">Back</button>');document.querySelector('#autoConflictClose').onclick=transport.show;const root=document.querySelector('#autoConflicts');
 for(const r of meta.records.filter(r=>r.versions.length>1)){const heading=document.createElement('h3');heading.textContent=r.versions.find(v=>v.board)?.board.title||'Deleted BOARD';root.append(heading);r.versions.forEach((v,i)=>{const text=document.createElement('p');text.textContent=v.board?`${v.board.title} · ${v.board.cards.length} STICKIES · ${String(v.board.cards[0]?.body||v.board.cards[0]?.title||'').slice(0,180)}`:'BOARD deleted on another version';root.append(text);const b=document.createElement('button');b.className='outline';b.textContent='Use version '+(i+1)+(v.board?'':' (deletion)')+'; keep other content as copies';b.onclick=()=>resolveBoard(r.id,i);root.append(b)});const b=document.createElement('button');b.className='primary';b.textContent='Keep all BOARD versions';b.onclick=()=>resolveBoard(r.id,0,true);root.append(b)}
 for(const id of meta.missing||[]){const b=document.createElement('button');b.className='outline';b.textContent='Keep linked BOARD: '+(meta.records.find(r=>r.id===id)?.versions.find(v=>v.previous)?.previous.title||id);b.onclick=()=>resolveBoard(id,0,false,true);root.append(b)}
 status(label,message);
}
function decorate(){const dialog=document.querySelector('#modalRoot .modal');if(!dialog||document.querySelector('#autoSyncPanel'))return;const panel=document.createElement('section');panel.id='autoSyncPanel';panel.innerHTML='<h3>Automatic sync</h3><p id="autoStatus" role="status"></p><p id="autoLastSynced"></p><p>Runs while Silverlight is open. BOARDS edited on both devices need review. Manual restore pauses automatic sync.</p>';const actions=document.createElement('div');actions.className='actions';
 function button(id,title,fn){const b=document.createElement('button');b.id=id;b.dataset.driveAction='';b.className='outline';b.textContent=title;b.onclick=fn;actions.append(b)}
 button('autoEnable',meta?.enabled?'Pause automatic sync':'Enable automatic sync',()=>meta?.enabled?pause().then(transport.show).catch(e=>status('Needs attention',e.message)):enable());
 if(meta?.enabled){button('autoNow','Sync now',()=>{app.close();schedule(0)});if(meta.conflicts?.length||meta.missing?.length)button('autoResolve','Review conflicts',conflicts)}
 panel.append(actions);dialog.querySelector('.actions').before(panel);status(label,message);
}
async function start(){if(started)return;started=true;try{meta=await app.readSync();if(meta?.version!==1)meta=null;if(meta?.enabled){status('Pending');schedule(500)}}catch(e){status('Needs attention',e.message)}}
window.addEventListener('online',()=>schedule(0));window.addEventListener('offline',()=>{if(meta?.enabled)status('Offline','Changes stay saved on this device')});window.addEventListener('focus',()=>schedule(0));window.addEventListener('silverlight-resume',()=>schedule(0));document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')schedule(0)});
return {start,changed,pause,decorate,isRunning:()=>running};
};
