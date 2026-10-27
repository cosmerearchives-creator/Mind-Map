window.installAutoSync=function(app,transport){
'use strict';
const core=SilverlightSync,crdt=new Proxy(SilverlightAuto,{get(target,key){return ['join','capture','verify','observed','envelope','merge','projection','resolve','recoverReference'].includes(key)?(...values)=>SilverlightTasks.run('auto',{method:key,values},e=>diagnostic.stage(e.phase==='images'?'images':(Object.hasOwn(SilverlightSyncDiagnostics.STAGES,key)?key:'worker'),e)):target[key]}});
let meta=null,running=false,retry=3000,label='Live sync is off',message='',started=false,generation=1,cleanGeneration=0,recordDigest=null,retryUntil=0,lastRepair=0,newest=0,lastChecked=0,changeCursor='',cursorDataset='',capturedGeneration=-1,sessionCache=null,sessionAt=0;const dirtyBoards=new Map();let fullCapture=true,lastEditAt=Date.now();
const diagnostic=SilverlightSyncDiagnostics.create({render:drawProgress});
function drawProgress(p){const box=document.querySelector('#autoProgress');if(!box)return;box.hidden=!p;if(!p)return;if(p.active){const status=document.querySelector('#autoStatus');if(status)status.textContent='Syncing · '+p.title}const bar=box.querySelector('progress'),caption=box.querySelector('[data-caption]'),timing=box.querySelector('[data-timing]');const measurable=p.total>0&&Number.isFinite(p.completed);if(measurable){bar.max=p.total;bar.value=Math.min(p.completed,p.total)}else if(!p.active){bar.max=1;bar.value=p.stage==='complete'?1:0}else bar.removeAttribute('value');caption.textContent=p.title+(measurable?' · '+p.completed+' of '+p.total+' steps'+(p.reused?' · '+p.reused+' reused':''):'')+(!measurable&&p.stage==='images'&&p.completed?' · '+p.completed+' unique images loaded':'')+(p.bytes?' · '+(p.bytes/1048576).toFixed(1)+' MiB received':'');timing.textContent='Elapsed '+Math.floor(p.elapsedMs/1000)+'s · Stage '+Math.floor(p.stageMs/1000)+'s · Last progress '+Math.floor(p.quietMs/1000)+'s ago'+(p.stalled?' · No reported progress for over a minute; this step may still be working. Download diagnostics.':'')+(p.retryMs?' · Retry in '+Math.ceil(p.retryMs/1000)+'s':'');box.dataset.stalled=String(p.stalled);bar.setAttribute('aria-label',p.title);}
const diagnosticTimer=setInterval(()=>diagnostic.tick(),1000);window.addEventListener('pagehide',()=>clearInterval(diagnosticTimer),{once:true});
function transferProgress(e){const stages={preparing:'preparing',images:'images',processing:'worker',checking:'checking',partHash:'partHash',uploading:'uploading',downloading:'downloading',finishing:'finishing',done:'done'};if(stages[e.phase])diagnostic.stage(stages[e.phase],e)}
const LIVE_POLL=2500,EDIT_DELAY=600,REPAIR_INTERVAL=60000,OVERLAP=120000;const scheduler=SilverlightLiveScheduler.create(cycle);
const clone=x=>SilverlightAssets.clone(x),state=()=>SilverlightAssets.fingerprint(app.getState());
function status(value,details=''){label=value;message=details;const el=document.querySelector('#autoStatus');if(el)el.textContent=value+(details?' · '+details:'');const last=document.querySelector('#autoLastSynced');if(last)last.textContent=meta?.lastSynced?'Last synced: '+new Date(meta.lastSynced).toLocaleString():'Not synced yet';const button=document.querySelector('#driveSync');button.title=value+(details?' · '+details:'');button.setAttribute('aria-label',button.title);button.dataset.state=value;const kind=/Needs|Retry|failed|error/i.test(value)?'error':/^Synced/.test(value)?'synced':/Offline/.test(value)?'offline':value==='Syncing'?'syncing':/Pending/.test(value)?'pending':'off';button.dataset.syncKind=kind;button.textContent=({error:'⚠',synced:'✓',offline:'☁×',syncing:'↻',pending:'◷',off:'☁'})[kind]}
function schedule(delay=EDIT_DELAY){if(meta?.enabled&&document.visibilityState!=='hidden')scheduler.request(Math.max(delay,retryUntil-Date.now()))}
function changed(ids){generation++;lastEditAt=Date.now();if(Array.isArray(ids)){for(const id of ids)dirtyBoards.set(id,generation)}else fullCapture=true;if(meta?.enabled){status('Pending','Live sync · waiting to send saved changes');schedule()}}
function settled(){if(meta.missing?.length||meta.conflicts?.length)status('Needs attention','Conflicting BOARD versions are preserved; open the cloud menu');else status('Synced','Live · '+new Date(lastChecked||meta.lastSynced||Date.now()).toLocaleTimeString())}
function wake(){retryUntil=0;lastRepair=0;schedule(0)}
function markPoll(files,repair){lastChecked=Date.now();if(repair)lastRepair=Date.now();for(const file of files){const created=Date.parse(file.createdTime);if(Number.isFinite(created))newest=Math.max(newest,created)}}

async function persist(next,w=null,expected=state(),allowReview=false){diagnostic.stage('saving');await app.writeSync(w,next,expected,allowReview);delete next.__resumeDigest;meta=next;}
async function call(op,args={}){return transport.request(op,{...args,silent:true,expectedAccount:meta.account,onProgress:transferProgress})}
function available(){return app.ready()&&app.canSync()&&document.visibilityState!=='hidden'&&!transport.isManualBusy()}
async function compactIfQuiet(){
 if(!transport.optimized?.()||(meta.incrementalUploads||0)<49||Date.now()-lastEditAt<15000)return;
 const stamp=generation,expected=state(),snapshot=await crdt.envelope(meta,app.getState());
 if(stamp!==generation)return;
 try{const result=await call('upload',{snapshot,optimized:true,dataset:meta.dataset,checkpoint:true,shouldContinue:()=>generation===stamp});
  const next=clone(meta);next.incrementalUploads=0;next.publishedFile=result.id;next.publishedRevision=snapshot.revision;if(!next.files.includes(result.id))next.files.push(result.id);await persist(next,null,expected);
 }catch(e){if(!e.deferred)throw e}
}
async function captureSaved(base,current){
 if(base.bootstrap||capturedGeneration===generation)return clone(base);
 const stamp=generation,ids=fullCapture?undefined:[...dirtyBoards.keys()];
 const result=await crdt.capture(base,current,ids);capturedGeneration=stamp;fullCapture=false;
 for(const [id,at]of dirtyBoards)if(at<=stamp)dirtyBoards.delete(id);
 return result;
}
async function cycle(){
 if(running||!meta?.enabled)return;
 if(!available()){schedule(1000);return}if(!navigator.onLine){status('Offline','Changes stay saved on this device');scheduler.cancel();schedule(15000);return}
 running=true;try{
  if(generation!==cleanGeneration||!recordDigest)diagnostic.begin();diagnostic.stage('session');
  // Every native data request still verifies expectedAccount. Avoid redundant authorization on each poll.
  if(!sessionCache||Date.now()-sessionAt>=30000){sessionCache=await transport.request('session',{silent:true});sessionAt=Date.now()}
  const session=sessionCache;if(!session.connected){sessionCache=null;diagnostic.finish('error','authorization');status('Needs sign-in','Open the cloud menu and Connect Google');scheduler.cancel();retryUntil=Date.now()+60000;schedule(60000);return}if(session.accountId!==meta.account){sessionCache=null;diagnostic.finish('error','account');status('Needs attention','Google account changed; reconnect the original account');scheduler.cancel();retryUntil=Date.now()+60000;schedule(60000);return}
  let repair=Date.now()-lastRepair>=REPAIR_INTERVAL;const args={silent:true,expectedAccount:meta.account,dataset:meta.dataset};
  // Read the server journal first. Local Board processing never runs on unchanged polls.
  if(cursorDataset!==meta.dataset){changeCursor='';cursorDataset=meta.dataset;repair=true}
  diagnostic.stage('listing');let delta=null;
  try{delta=await transport.changes?.({...args,pageToken:changeCursor})}catch(e){if(!/HTTP 410\b/.test(e.message))throw e;changeCursor='';repair=true;delta=await transport.changes?.({...args,pageToken:''})}
  if(delta?.bootstrap)repair=true;
  const files=(repair||!delta?await transport.list({...args,...(!repair&&newest?{after:new Date(Math.max(0,newest-OVERLAP)).toISOString()}:{})}):delta.files).filter(f=>f.appProperties?.protocol==='auto-v1'&&f.appProperties?.dataset===meta.dataset);
  const acceptCursor=()=>{if(delta?.cursor)changeCursor=delta.cursor};
  const unseen=files.filter(f=>!meta.files.includes(f.id));if(!unseen.length&&generation===cleanGeneration&&recordDigest&&meta.published===recordDigest&&!meta.deferred){await compactIfQuiet();acceptCursor();markPoll(files,repair);settled();schedule(generation!==cleanGeneration?EDIT_DELAY:LIVE_POLL);return}
  diagnostic.begin();diagnostic.stage('capture');status('Syncing','Live sync · checking saved changes');let current=clone(app.getState()),expected=state(),next=await captureSaved(meta,current);await persist(next,null,expected);
  const known=new Set(meta.files),remote=[];let cloudHashes=[];
  for(const file of [...files].sort((a,b)=>String(b.createdTime).localeCompare(String(a.createdTime)))){if(known.has(file.id))continue;diagnostic.stage('download');const result=await call('download',{fileId:file.id,objectResult:true,dataset:meta.dataset});const snapshot=(typeof result.snapshot==='string'?JSON.parse(result.snapshot):result.snapshot),records=await crdt.verify(snapshot,meta.dataset);diagnostic.stage('hash');remote.push(...records);cloudHashes.push(await core.revision(records));known.add(file.id);for(const covered of snapshot.auto.coveredFiles||[])known.add(covered)}
  if(!available()||!meta.enabled){diagnostic.finish('waiting');schedule(1000);return}
  // Capture intervening edits before learning remote clocks; they are concurrent, not overwrites.
  current=clone(app.getState());expected=state();next=await captureSaved(meta,current);if(next.bootstrap){next=await crdt.join(next,current,remote);delete next.bootstrap;capturedGeneration=generation;fullCapture=false;dirtyBoards.clear()}else next.records=await crdt.merge(next.records,remote);next.files=[...known];
  const projected=await crdt.projection(next.records,current);let incoming=null;
  const protectedIds=app.protectedBoards?.()||[];next.deferred=false;
  if(!projected.missing.length){core.workspace(projected.workspace);incoming=projected.workspace;
   for(const id of protectedIds){const local=current.boards.find(b=>b.id===id),remote=incoming.boards.find(b=>b.id===id);if(SilverlightAssets.fingerprint(local||null)!==SilverlightAssets.fingerprint(remote||null)){next.deferred=true;incoming.boards=incoming.boards.filter(b=>b.id!==id);if(local)incoming.boards.push(local)}}
   next=await crdt.observed(next,incoming,protectedIds)}
  next.missing=projected.missing;next.conflicts=projected.conflicts;
  if(!available()){diagnostic.finish('waiting');schedule(1000);return}
  await persist(next,incoming&&SilverlightAssets.fingerprint(current.boards)!==SilverlightAssets.fingerprint(incoming.boards)?incoming:null,expected);
  diagnostic.stage('hash');const digest=await core.revision(meta.records);
  if(cloudHashes.includes(digest)&&meta.published!==digest){next=clone(meta);next.published=digest;next.publishedFile='';await persist(next)}
  if(meta.published!==digest){
   const revisions=Object.fromEntries(await Promise.all(meta.records.map(async r=>[r.id,await core.revision(r)]))),checkpoint=!meta.publishedRecords||(meta.incrementalUploads||0)>=49,changed=checkpoint?null:meta.records.filter(r=>meta.publishedRecords[r.id]!==revisions[r.id]).map(r=>r.id);
   const optimized=!!transport.optimized?.();const snapshot=await crdt.envelope(meta,app.getState(),optimized?null:changed);const result=await call('upload',{snapshot,optimized,dataset:meta.dataset});next=clone(meta);next.published=digest;next.publishedRecords=revisions;next.incrementalUploads=(optimized?result.checkpoint:checkpoint)?0:(meta.incrementalUploads||0)+1;next.incrementalHistory=true;next.publishedFile=result.id;next.publishedRevision=snapshot.revision;if(result.id&&!next.files.includes(result.id))next.files.push(result.id);await persist(next)
  }
  expected=state();next=await captureSaved(meta,app.getState());diagnostic.stage('hash');recordDigest=await core.revision(next.records);const stillPending=recordDigest!==meta.published;next.lastSynced=new Date().toISOString();if(!stillPending)next.__resumeDigest=recordDigest;await persist(next,null,expected);retry=3000;retryUntil=0;cleanGeneration=capturedGeneration;markPoll(files,repair);
  if(meta.missing?.length||meta.conflicts?.length)status('Needs attention','Conflicting BOARD versions are preserved; open the cloud menu');else if(stillPending)status('Pending');else settled();
  if(meta.cleanupEnabled&&!meta.incrementalHistory&&meta.publishedFile&&!stillPending){try{const retentionFiles=await transport.list({silent:true,expectedAccount:meta.account,dataset:meta.dataset});for(const file of SilverlightRetention.candidates(retentionFiles,meta)){await transport.request('prune',{silent:true,expectedAccount:meta.account,fileId:file.id,replacementId:meta.publishedFile,dataset:meta.dataset,device:meta.device,revision:meta.publishedRevision})}}catch{message='Sync completed; old-copy cleanup will retry after the next upload.'}}
  acceptCursor();diagnostic.finish(meta.conflicts?.length||meta.missing?.length?'attention':'complete');schedule(stillPending||generation!==cleanGeneration?EDIT_DELAY:LIVE_POLL);
 }catch(error){sessionCache=null;capturedGeneration=-1;fullCapture=true;diagnostic.begin();diagnostic.finish('retry',error,retry);status(navigator.onLine?'Pending':'Offline',error.message);scheduler.cancel();retryUntil=Date.now()+retry;schedule(retry);retry=Math.min(retry*2,60000)}finally{running=false}
}
async function pause(){if(running)throw Error('Wait for the current sync to finish before pausing or restoring.');if(!meta)return;const next=clone(meta);next.enabled=false;await persist(next);capturedGeneration=-1;fullCapture=true;scheduler.cancel();status('Live sync is paused')}
async function enable(){
 if(running||transport.isManualBusy())return;running=true;
 try{
  if(!app.ready())throw Error('Wait for device storage to finish loading.');
  status('Connecting');const session=await transport.request('connect');if(!session.accountId)throw Error('Update both preview apps to use automatic sync.');
  if(meta?.dataset){if(meta.account!==session.accountId)throw Error('Reconnect the original Google account. Local data and sync history were kept.');app.modal('Resume live sync','<p>Changes made on this device while paused, including deletions, will sync to your other devices. Changes from those devices will combine; competing BOARD edits will be kept for review.</p>','<button id="autoResumeCancel" class="outline">Cancel</button><button id="autoEnableConfirm" class="primary">Resume live sync</button>');document.querySelector('#autoResumeCancel').onclick=transport.show;document.querySelector('#autoEnableConfirm').onclick=async()=>{try{const next=clone(meta);next.enabled=true;await persist(next);recordDigest=null;lastRepair=0;app.close();schedule(0)}catch(e){status('Needs attention',e.message)}};return}
  const files=(await transport.list()).filter(f=>f.appProperties?.protocol==='auto-v1'),groups=new Map();for(const f of files){const dataset=f.appProperties.dataset;if(dataset&&!groups.has(dataset))groups.set(dataset,f)}
  async function join(dataset){if(running)return;running=true;try{const expected=state(),device=meta?.device||crypto.randomUUID();let next=crdt.empty(device,dataset,session.accountId);next.enabled=true;next.bootstrap=true;await persist(next,null,expected);app.close();schedule(0)}catch(e){status('Needs attention',e.message)}finally{running=false}}
  if(groups.size){app.modal('Join live sync','<p>Join your existing automatic workspace. Local BOARDS will be combined; differences in the same BOARD will be kept for review.</p><div id="autoGroups"></div>','<button id="autoJoinCancel" class="outline">Cancel</button>');document.querySelector('#autoJoinCancel').onclick=transport.show;const root=document.querySelector('#autoGroups');for(const [dataset,file]of groups){const b=document.createElement('button');b.className='outline';b.textContent='Join workspace · '+new Date(file.createdTime).toLocaleString();b.onclick=()=>join(dataset);root.append(b)}}
  else {app.modal('Enable live sync','<p>Live sync sends saved changes between open, online devices using the same Google account and workspace. Compatible edits combine; competing edits are retained for review. Existing manual cloud copies remain available.</p>','<button id="autoEnableCancel" class="outline">Cancel</button><button id="autoEnableConfirm" class="primary">Enable live sync</button>');document.querySelector('#autoEnableCancel').onclick=transport.show;document.querySelector('#autoEnableConfirm').onclick=()=>join(crypto.randomUUID())}
 }catch(e){status('Needs attention',e.message)}finally{running=false}
}
async function resolveBoard(id,index,all=false,reference=false){
 if(running)return;running=true;try{
  const expected=state();let next=await crdt.capture(meta,app.getState());next=reference?await crdt.recoverReference(next,id):await crdt.resolve(next,id,index,all);const projected=await crdt.projection(next.records,app.getState());if(projected.missing.length)throw Error('This choice would leave a BOARD STICKY pointing to a missing BOARD. Keep that BOARD, or remove its links first.');core.workspace(projected.workspace);next=await crdt.observed(next,projected.workspace);next.conflicts=projected.conflicts;next.missing=[];await persist(next,projected.workspace,expected,true);recordDigest=null;app.close();schedule(0);
 }catch(e){status('Needs attention',e.message)}finally{running=false}
}
function conflicts(){
 if(!meta)return;app.modal('Review BOARD conflicts','<p>Choose which version keeps the original BOARD. Other versions are saved as separate conflict-copy BOARDS. Local recovery is also saved first.</p><p id="autoStatus"></p><div id="autoConflicts"></div>','<button id="autoConflictClose" class="outline">Back</button>');document.querySelector('#autoConflictClose').onclick=transport.show;const root=document.querySelector('#autoConflicts');
 for(const r of meta.records.filter(r=>r.versions.length>1)){const heading=document.createElement('h3');heading.textContent=r.versions.find(v=>v.board)?.board.title||'Deleted BOARD';root.append(heading);r.versions.forEach((v,i)=>{const text=document.createElement('p');text.textContent=v.board?`${v.board.title} · ${v.board.cards.length} STICKIES · ${String(v.board.cards[0]?.body||v.board.cards[0]?.title||'').slice(0,180)}`:'BOARD deleted on another version';root.append(text);const b=document.createElement('button');b.className='outline';b.textContent='Use version '+(i+1)+(v.board?'':' (deletion)')+'; keep other content as copies';b.onclick=()=>resolveBoard(r.id,i);root.append(b)});const b=document.createElement('button');b.className='primary';b.textContent='Keep all BOARD versions';b.onclick=()=>resolveBoard(r.id,0,true);root.append(b)}
 for(const id of meta.missing||[]){const b=document.createElement('button');b.className='outline';b.textContent='Keep linked BOARD: '+(meta.records.find(r=>r.id===id)?.versions.find(v=>v.previous)?.previous.title||id);b.onclick=()=>resolveBoard(id,0,false,true);root.append(b)}
 status(label,message);drawProgress(diagnostic.snapshot());
}
function decorate(){const dialog=document.querySelector('#modalRoot .modal');if(!dialog||document.querySelector('#autoSyncPanel'))return;const panel=document.createElement('section');panel.id='autoSyncPanel';panel.innerHTML='<h3>Live Google Drive sync</h3><p id="autoStatus" role="status"></p><p id="autoLastSynced"></p><section id="autoProgress" hidden style="padding:10px;border:1px solid #c8c3d0;border-radius:8px"><progress style="width:100%"></progress><p data-caption role="status"></p><p data-timing style="font-size:13px"></p></section><p>Checks for saved changes every few seconds while both apps are open and online. Other BOARDS can update while you edit. Changes to a BOARD with an open editor wait until its draft is saved or closed. Conflicting edits stay available for review. Manual restore pauses live sync.</p>';const actions=document.createElement('div');actions.className='actions';
 function button(id,title,fn){const b=document.createElement('button');b.id=id;b.dataset.driveAction='';b.className='outline';b.textContent=title;b.onclick=fn;actions.append(b)}
 button('autoEnable',meta?.enabled?'Pause live sync':'Enable live sync',()=>meta?.enabled?pause().then(transport.show).catch(e=>status('Needs attention',e.message)):enable());
 if(meta?.enabled){button('autoNow','Sync now',()=>{recordDigest=null;wake()});if(meta.conflicts?.length||meta.missing?.length)button('autoResolve','Review conflicts',conflicts)}
 button('autoRetention',meta?.cleanupEnabled?'Disable old-copy cleanup':'Set up old-copy cleanup',()=>{app.modal('Old cloud-copy cleanup','<p>Optional: automatically delete this device’s already-merged automatic copies older than 30 days, keeping at least its 10 newest copies and a newly confirmed complete replacement. Manual copies, other devices’ copies, and shared image parts are kept. This does not reclaim shared image storage. Google app-data deletion is permanent.</p>','<button id="retentionCancel" class="outline">Cancel</button><button id="retentionSave" class="primary">'+(meta?.cleanupEnabled?'Disable cleanup':'Enable cleanup')+'</button>');document.querySelector('#retentionCancel').onclick=transport.show;document.querySelector('#retentionSave').onclick=async()=>{if(running||!meta)return;try{const next=clone(meta);next.cleanupEnabled=!next.cleanupEnabled;await persist(next);transport.show()}catch(e){status('Needs attention',e.message)}}});
 button('autoDiagnostics','Download sync diagnostics',()=>{const blob=new Blob([JSON.stringify(diagnostic.report(),null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='silverlight-sync-diagnostics.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)});
 panel.append(actions);dialog.querySelector('.actions').before(panel);status(label,message);
}
async function start(){if(started)return;started=true;try{meta=await app.readSync();if(meta?.version!==1)meta=null;if(meta?.enabled){const stamp=generation;let resumed=null;try{resumed=await app.resumeSync?.(meta)}catch{}if(resumed&&generation===stamp){recordDigest=resumed;capturedGeneration=generation;cleanGeneration=generation;fullCapture=false}status('Pending',resumed?'Checking for cloud changes':'Starting live sync');schedule(0)}}catch(e){status('Needs attention',e.message)}}
window.addEventListener('online',wake);window.addEventListener('offline',()=>{if(meta?.enabled)status('Offline','Changes stay saved on this device')});window.addEventListener('focus',wake);window.addEventListener('silverlight-resume',wake);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')wake();else scheduler.cancel()});
return {start,changed,pause,decorate,wake:()=>{retryUntil=0;schedule(0)},isRunning:()=>running};
};
