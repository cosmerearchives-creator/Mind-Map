/* Board-level multi-value register with vector clocks. Wall clocks never decide edits. */
(function(root){
'use strict';
const core=typeof module!=='undefined'?require('./sync-core.js'):root.SilverlightSync;
const FORMAT='silverlight-auto-v1',copy=x=>JSON.parse(JSON.stringify(x));
function semantic(b){if(b===null)return null;const value=copy(b);delete value.updated;for(const c of value.cards||[])delete c.collectionHidden;return value}
const compare=(a,b)=>a<b?-1:a>b?1:0;
const same=(a,b)=>core.canonical(semantic(a))===core.canonical(semantic(b));
function clockJoin(...clocks){const m=new Map();for(const c of clocks)for(const [id,n]of c||[])m.set(id,Math.max(n,m.get(id)||0));return [...m].sort(([a],[b])=>compare(a,b))}
function dominates(a,b){const am=new Map(a);return b.every(([id,n])=>(am.get(id)||0)>=n)}
function tick(clock,device){const m=new Map(clock);m.set(device,(m.get(device)||0)+1);return clockJoin([...m])}
function normalize(versions){
 let result=[];
 for(const raw of versions){const v=copy(raw);v.board=semantic(v.board);if(v.previous)v.previous=semantic(v.previous);v.clock=clockJoin(v.clock);let consumed=false;
  for(let i=result.length-1;i>=0;i--){const old=result[i],newer=dominates(v.clock,old.clock),older=dominates(old.clock,v.clock);
   if(newer&&older&&!same(v.board,old.board))throw Error('Conflicting data uses the same sync revision. No data was replaced.');
   if(older){consumed=true;break}if(newer)result.splice(i,1);
  }
  if(!consumed)result.push(v);
 }
 // Equal concurrent content is a safe join, not a user-facing conflict.
 const grouped=[];for(const v of result){const match=grouped.find(x=>same(x.board,v.board));if(match){match.clock=clockJoin(match.clock,v.clock);if(v.previous&&(!match.previous||core.canonical(v.previous)<core.canonical(match.previous)))match.previous=v.previous;}else grouped.push(v)}
 return grouped.sort((a,b)=>compare(core.canonical(a.clock),core.canonical(b.clock)));
}
function merge(a,b){const m=new Map();for(const record of [...a,...b])m.set(record.id,normalize([...(m.get(record.id)||[]),...record.versions]));return [...m].sort(([a],[b])=>compare(a,b)).map(([id,versions])=>({id,versions}))}
function empty(device,dataset,account){return {version:1,device,dataset,account,enabled:false,records:[],seen:[],files:[],published:'',lastSynced:null}}
async function capture(meta,workspace){
 core.workspace(workspace);const next=copy(meta),seen=new Map(next.seen.map(x=>[x.id,x])),boards=new Map(workspace.boards.map(b=>[b.id,b])),records=new Map(next.records.map(r=>[r.id,r]));
 for(const id of new Set([...boards.keys(),...seen.keys()])){
  const board=boards.get(id)||null,hash=await core.revision(semantic(board)),old=seen.get(id);
  if(!old||old.hash!==hash){
   if(!old&&!board)continue;
   const versions=records.get(id)?.versions||[],own=Math.max(0,...versions.map(v=>new Map(v.clock).get(next.device)||0));
   const clock=tick(clockJoin(old?.clock||[],own?[[next.device,own]]:[]),next.device),previous=versions.find(v=>old&&sameClock(v.clock,old.clock))?.board;
   const v={clock,board:copy(board)};if(board===null&&previous)v.previous=copy(previous);
   records.set(id,{id,versions:normalize([...versions,v])});seen.set(id,{id,hash,clock});
  }
 }
 next.records=merge([...records.values()],[]);next.seen=[...seen.values()];return next;
}
const sameClock=(a,b)=>dominates(a,b)&&dominates(b,a);
function projection(records,current){
 const existing=new Map(current.boards.map(b=>[b.id,b])),boards=[],conflicts=[],selected=[];
 for(const r of records){let chosen=r.versions.find(v=>same(v.board,existing.get(r.id)||null))||r.versions.find(v=>v.board!==null)||r.versions[0];if(chosen.board)boards.push(copy(same(chosen.board,existing.get(r.id)||null)?existing.get(r.id):chosen.board));selected.push({id:r.id,board:chosen.board,clock:chosen.clock});if(r.versions.length>1)conflicts.push(r.id)}
 const order=new Map(current.boards.map((b,i)=>[b.id,i]));boards.sort((a,b)=>(order.get(a.id)??Infinity)-(order.get(b.id)??Infinity)||compare(a.id,b.id));
 const ids=new Set(boards.map(b=>b.id)),missing=[];for(const b of boards)for(const c of b.cards)if(c.kind==='nested'&&!ids.has(c.boardId)&&!missing.includes(c.boardId))missing.push(c.boardId);
 return {workspace:{...copy(current),boards},selected,conflicts,missing};
}
async function observed(meta,w){const next=copy(meta),boards=new Map(w.boards.map(b=>[b.id,b])),old=new Map(next.seen.map(x=>[x.id,x]));next.seen=[];for(const r of next.records){const board=boards.get(r.id)||null,hash=await core.revision(semantic(board)),v=r.versions.find(x=>same(x.board,board));next.seen.push({id:r.id,hash,clock:v?.clock||old.get(r.id)?.clock||[]})}return next}
function resolve(meta,id,index,keepAll=false){
 const next=copy(meta),record=next.records.find(r=>r.id===id);if(!record)throw Error('BOARD conflict no longer exists.');
 const chosen=keepAll?record.versions.find(v=>v.board):record.versions[index];if(!chosen)throw Error('Version no longer exists.');
 const clock=tick(clockJoin(...record.versions.map(v=>v.clock)),next.device);
 // Resolution never discards alternative content: preserve it as independent BOARDS.
 for(const v of record.versions){if(!v.board||same(v.board,chosen.board))continue;const board=copy(v.board),newId=crypto.randomUUID();board.id=newId;board.title+=' (conflict copy)';for(const c of board.cards)if(c.kind==='nested'&&c.boardId===id)c.boardId=newId;next.records.push({id:newId,versions:[{clock:[[next.device,1]],board}]})}
 record.versions=[{clock,board:copy(chosen.board),...(chosen.previous?{previous:chosen.previous}:{})}];next.published='';return next;
}
function recoverReference(meta,id){const next=copy(meta),r=next.records.find(r=>r.id===id),board=r?.versions.find(v=>v.board)?.board||r?.versions.find(v=>v.previous)?.previous;if(!board)throw Error('Restore this missing BOARD from Local recovery or a manual cloud copy, then retry.');r.versions=[{clock:tick(clockJoin(...r.versions.map(v=>v.clock)),next.device),board:copy(board)}];next.published='';return next}
async function envelope(meta,w){const auto={dataset:meta.dataset,device:meta.device,records:meta.records},workspace=core.workspace(w);return {format:FORMAT,createdAt:new Date().toISOString(),workspace,auto,revision:await core.revision({workspace,auto})}}
async function verify(snapshot,dataset){
 if(!snapshot||snapshot.format!==FORMAT||snapshot.auto?.dataset!==dataset||typeof snapshot.auto.device!=='string'||!Array.isArray(snapshot.auto.records))throw Error('Unsupported automatic sync snapshot.');
 core.workspace(snapshot.workspace);const ids=new Set();
 for(const r of snapshot.auto.records){if(!r||typeof r.id!=='string'||!r.id||r.id.length>300||ids.has(r.id)||!Array.isArray(r.versions)||!r.versions.length||r.versions.length>100)throw Error('Damaged BOARD sync history.');ids.add(r.id);
  for(const v of r.versions){if(!Array.isArray(v.clock)||!v.clock.length||v.clock.length>1000)throw Error('Invalid sync clock.');const devices=new Set();for(const pair of v.clock){if(!Array.isArray(pair)||pair.length!==2||typeof pair[0]!=='string'||!pair[0]||devices.has(pair[0])||!Number.isSafeInteger(pair[1])||pair[1]<1)throw Error('Invalid sync revision.');devices.add(pair[0])}if(v.board!==null&&v.board?.id!==r.id)throw Error('BOARD ID mismatch.');}
 }
 // Validate each retained version, including versions hidden by conflicts.
 for(const r of snapshot.auto.records)for(const v of r.versions)for(const board of [v.board,v.previous].filter(Boolean)){if(board.id!==r.id)throw Error('Recovery BOARD ID mismatch.');const references=new Set((board.cards||[]).filter(c=>c.kind==='nested').map(c=>c.boardId));for(const ref of references)if(!ids.has(ref))throw Error('Missing BOARD sync record.');core.workspace({boards:[board,...[...references].filter(id=>id!==board.id).map(id=>({id,title:'Reference',cards:[]}))]})}
 if(await core.revision({workspace:snapshot.workspace,auto:snapshot.auto})!==snapshot.revision)throw Error('Automatic snapshot checksum mismatch. Local data was not replaced.');
 return merge(snapshot.auto.records,[]);
}
const api={FORMAT,semantic,same,clockJoin,dominates,normalize,merge,empty,capture,projection,observed,resolve,recoverReference,envelope,verify};if(typeof module!=='undefined')module.exports=api;else root.SilverlightAuto=api;
})(globalThis);
