/* Local, bounded, allowlisted diagnostics. Never accept document content or credentials. */
(function(root){'use strict';
const STAGES={session:'Checking Google session',listing:'Checking cloud changes',capture:'Checking saved changes',images:'Loading local images',worker:'Processing workspace',saving:'Saving local sync state',download:'Downloading cloud changes',verify:'Verifying cloud changes',merge:'Combining saved changes',projection:'Preparing combined workspace',observed:'Checking combined workspace',hash:'Hashing sync history',envelope:'Preparing upload snapshot',preparing:'Preparing transfer',checking:'Checking reusable cloud parts',partHash:'Hashing transfer part',uploading:'Uploading parts',downloading:'Downloading parts',finishing:'Verifying and finishing transfer',done:'Transfer confirmed',attention:'Sync cycle finished; conflicts need review',complete:'Sync completed',waiting:'Waiting for editor or app to be ready',retry:'Waiting to retry',error:'Sync failed'};
const KEY='silverlight.syncDiagnostics.v1',LIMIT=256;
function category(error){const s=String(error?.message||error||'');return /quota|space/i.test(s)?'storage-capacity':/checksum|damaged|missing.*image/i.test(s)?'integrity':/sign.in|account|Google.*access|OAuth/i.test(s)?'authorization':/timed? out|timeout/i.test(s)?'timeout':/storage|save|transaction|abort/i.test(s)?'storage':/network|HTTP|connection|fetch/i.test(s)?'network':/worker|background/i.test(s)?'worker':'other'}
function create({now=()=>performance.now(),wall=()=>Date.now(),storage,render=()=>{}}={}){
 try{storage??=root.localStorage}catch{storage=null}
 let events=[],current=null,sequence=0,lastWrite=-Infinity,dirty=false,stalled=false;
 try{const old=JSON.parse(storage?.getItem(KEY)||'[]');if(Array.isArray(old))events=old.slice(-LIMIT).map(clean).filter(Boolean)}catch{}
 function clean(e){if(!e||!STAGES[e.stage])return null;const out={stage:e.stage};for(const k of ['at','run','elapsedMs','stageMs','completed','total','reused','bytes','retryMs'])if(Number.isFinite(e[k])&&e[k]>=0)out[k]=e[k];if(['start','stage','progress','stall','finish','failure'].includes(e.event))out.event=e.event;if(['storage-capacity','integrity','authorization','timeout','storage','network','worker','other'].includes(e.error))out.error=e.error;return out}
 function save(force=false){if(!dirty||(!force&&now()-lastWrite<1000))return;try{storage?.setItem(KEY,JSON.stringify(events));dirty=false;lastWrite=now()}catch{}}
 function record(event,extra={}){if(!current)return;events.push(clean({event,stage:current.stage,at:wall(),run:current.run,elapsedMs:Math.round(now()-current.started),stageMs:Math.round(now()-current.stageAt),...extra}));events=events.slice(-LIMIT);dirty=true;save(event==='finish'||event==='failure')}
 function notify(){try{render(snapshot())}catch{}}
 function begin(){if(current?.active)return;current={active:true,run:++sequence,started:now(),stageAt:now(),advanced:now(),stage:'session'};stalled=false;record('start');notify()}
 function stage(code,counts={}){if(!STAGES[code]||!current?.active)return;const changing=current.stage!==code;let advance=changing;
  if(changing){record('stage');current.stage=code;current.stageAt=now();for(const k of ['completed','total','reused','bytes'])delete current[k]}
  for(const k of ['completed','total','reused','bytes'])if(Number.isFinite(counts[k])&&counts[k]>=0){if(current[k]!==counts[k])advance=true;current[k]=counts[k]}
  if(advance){current.advanced=now();stalled=false;if(changing||now()-lastWrite>=1000)record('progress',counts)}notify();
 }
 function finish(code='complete',error=null,retryMs=0){if(!current?.active){if(code==='complete')return;begin()}stage(code);record(error?'failure':'finish',{...(error?{error:category(error)}:{}),retryMs});current.active=false;current.finishedAt=now();current.retryAt=retryMs?now()+retryMs:0;save(true);notify()}
 function snapshot(){if(!current)return null;return {...current,title:STAGES[current.stage],elapsedMs:Math.max(0,(current.active?now():current.finishedAt)-current.started),stageMs:Math.max(0,(current.active?now():current.finishedAt)-current.stageAt),quietMs:Math.max(0,now()-current.advanced),stalled:current.active&&now()-current.advanced>=60000,retryMs:Math.max(0,(current.retryAt||0)-now())}}
 function tick(){if(current?.active&&!stalled&&now()-current.advanced>=60000){stalled=true;record('stall')}save();notify()}
 function report(){save(true);return {format:'silverlight-sync-diagnostics-v1',generatedAt:new Date(wall()).toISOString(),current:current?clean({stage:current.stage,elapsedMs:Math.round(snapshot().elapsedMs),completed:current.completed,total:current.total,bytes:current.bytes}):null,events:events.map(clean)}}
 return {begin,stage,finish,tick,snapshot,report};
}
const api={create,category,STAGES};if(typeof module!=='undefined')module.exports=api;else root.SilverlightSyncDiagnostics=api;
})(globalThis);
