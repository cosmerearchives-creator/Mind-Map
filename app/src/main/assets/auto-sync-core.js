/* BOARD and per-STICKY property registers. Vector clocks, never wall clocks, decide causality. */
(function(root){
'use strict';
const core=typeof module!=='undefined'?require('./sync-core.js'):root.SilverlightSync;
const FORMAT='silverlight-auto-v1',copy=x=>(typeof module!=='undefined'?require('./assets-core.js'):root.SilverlightAssets).clone(x);
function semantic(b){if(b===null)return null;const value=copy(b);delete value.updated;for(const c of value.cards||[])delete c.collectionHidden;value.cards=(value.cards||[]).sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0);value.connections=(value.connections||[]).sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0);value.junctions=value.junctions||{};return value}
const compare=(a,b)=>a<b?-1:a>b?1:0;
function equal(a,b){if(a===b)return true;if(!a||!b||typeof a!=='object'||typeof b!=='object'||Array.isArray(a)!==Array.isArray(b))return false;const keys=Object.keys(a).filter(k=>a[k]!==undefined),other=Object.keys(b).filter(k=>b[k]!==undefined);return keys.length===other.length&&keys.every(k=>Object.hasOwn(b,k)&&equal(a[k],b[k]))}
const same=(a,b)=>equal(semantic(a),semantic(b));
function clockJoin(...clocks){const m=new Map();for(const c of clocks)for(const [id,n]of c||[])m.set(id,Math.max(n,m.get(id)||0));return [...m].sort(([a],[b])=>compare(a,b))}
function dominates(a,b){const am=new Map(a);return b.every(([id,n])=>(am.get(id)||0)>=n)}
function tick(clock,device){const m=new Map(clock);m.set(device,(m.get(device)||0)+1);return clockJoin([...m])}

// Per-property registers let compatible changes within a BOARD converge.
function flatten(board){const out={};if(!board)return out;
 const put=(path,value)=>out[JSON.stringify(path)]=copy(value);
 for(const [k,v]of Object.entries(semantic(board)))if(!['cards','connections','junctions'].includes(k))put(['board',k],v);
 for(const group of ['cards','connections'])for(const entity of board[group]||[]){put([group,entity.id,'exists'],true);for(const [k,v]of Object.entries(entity))if(!['id','collectionHidden','x','y'].includes(k))put([group,entity.id,k],v);if(group==='cards')put([group,entity.id,'position'],{x:entity.x,y:entity.y});}
 for(const [k,v]of Object.entries(board.junctions||{}))put(['junctions',k],v);return out;
}
function cellJoin(...maps){const out={};for(const map of maps)for(const [key,values]of Object.entries(map||{})){let vals=[...(out[key]||[]),...copy(values)],live=[];for(const v of vals){if(live.some(o=>dominates(o.clock,v.clock)&&dominates(v.clock,o.clock)&&(o.present!==v.present||!equal(o.value,v.value))))throw Error('Conflicting property revision. Local data was kept.');if(live.some(o=>dominates(o.clock,v.clock)))continue;live=live.filter(o=>!dominates(v.clock,o.clock));live.push(v)}const groups=[];for(const v of live){const old=groups.find(o=>o.present===v.present&&equal(o.value,v.value));if(old)old.clock=clockJoin(old.clock,v.clock);else groups.push(v)}out[key]=groups.sort((a,b)=>compare(core.canonical(a.clock),core.canonical(b.clock)));}return out;}
function cellsFor(board,clock){return Object.fromEntries(Object.entries(flatten(board)).map(([k,value])=>[k,[{clock,present:true,value}]]));}
function materialize(versions){if(!versions.length||versions.some(v=>!v.board||!v.cells))return null;const cells=cellJoin(...versions.map(v=>v.cells));if(Object.values(cells).some(values=>values.length!==1))return null;
 const board={},entities={cards:new Map(),connections:new Map()},junctions={};
 for(const [key,[cell]]of Object.entries(cells)){if(!cell.present)continue;const path=JSON.parse(key),value=copy(cell.value);if(path[0]==='board')board[path[1]]=value;else if(path[0]==='junctions')junctions[path[1]]=value;else{const map=entities[path[0]];if(!map)return null;const e=map.get(path[1])||{id:path[1]};map.set(path[1],e);if(path[2]==='exists')e.__exists=value;else if(path[2]==='position')Object.assign(e,value);else e[path[2]]=value;}}
 for(const group of ['cards','connections'])board[group]=[...entities[group].values()].filter(e=>e.__exists).map(e=>{delete e.__exists;return e}).sort((a,b)=>compare(a.id,b.id));if(Object.keys(junctions).length)board.junctions=junctions;
 try{const refs=new Set(board.cards.filter(c=>c.kind==='nested').map(c=>c.boardId));core.workspace({boards:[board,...[...refs].filter(id=>id!==board.id).map(id=>({id,title:'Reference',cards:[]}))]})}catch{return null}return {board,cells,clock:clockJoin(...versions.map(v=>v.clock))};
}
function updateCells(versions,previous,board,clock){const projected=materialize(versions),matching=versions.find(v=>same(v.board,previous));let cells=copy(projected&&same(projected.board,previous)?projected.cells:matching?.cells||cellsFor(previous,matching?.clock||[]));const before=flatten(previous),after=flatten(board),changedEntities=new Set();
 for(const key of new Set([...Object.keys(before),...Object.keys(after)])){if(equal(before[key],after[key]))continue;const path=JSON.parse(key);if(path[0]==='cards'||path[0]==='connections')changedEntities.add(JSON.stringify(path.slice(0,2)));cells[key]=[{clock,present:Object.hasOwn(after,key),value:Object.hasOwn(after,key)?after[key]:null}];}
 for(const entity of changedEntities){const path=JSON.parse(entity),key=JSON.stringify([...path,'exists']);cells[key]=[{clock,present:true,value:Object.hasOwn(after,key)}];}return cells;
}
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
 const grouped=[];for(const v of result){const match=grouped.find(x=>same(x.board,v.board));if(match){match.clock=clockJoin(match.clock,v.clock);if(match.cells&&v.cells)match.cells=cellJoin(match.cells,v.cells);if(v.previous&&(!match.previous||core.compareCanonical(v.previous,match.previous)<0))match.previous=v.previous;}else grouped.push(v)}
 return grouped.sort((a,b)=>compare(core.canonical(a.clock),core.canonical(b.clock)));
}
function merge(a,b){const m=new Map();for(const record of [...a,...b])m.set(record.id,normalize([...(m.get(record.id)||[]),...record.versions]));return [...m].sort(([a],[b])=>compare(a,b)).map(([id,versions])=>({id,versions}))}
function empty(device,dataset,account){return {version:1,device,dataset,account,enabled:false,records:[],seen:[],files:[],published:'',lastSynced:null}}
async function capture(meta,workspace,changedIds){
 core.workspace(workspace);const next=copy(meta),seen=new Map(next.seen.map(x=>[x.id,x])),boards=new Map(workspace.boards.map(b=>[b.id,b])),records=new Map(next.records.map(r=>[r.id,r]));
 for(const id of changedIds?new Set(changedIds):new Set([...boards.keys(),...seen.keys()])){
  const board=boards.get(id)||null,hash=await core.revision(semantic(board)),old=seen.get(id);
  if(!old||old.hash!==hash){
   if(!old&&!board)continue;
   const versions=records.get(id)?.versions||[],own=Math.max(0,...versions.map(v=>new Map(v.clock).get(next.device)||0));
   const clock=tick(clockJoin(old?.clock||[],own?[[next.device,own]]:[]),next.device),previous=versions.find(v=>old&&sameClock(v.clock,old.clock))?.board;
   const previousBoard=old?(versions.find(v=>sameClock(v.clock,old.clock))?.board||materialize(versions)?.board):null;const v={clock,board:copy(board)};if(board)v.cells=updateCells(versions,previousBoard,board,clock);if(board===null&&(previous||previousBoard))v.previous=copy(previous||previousBoard);
   records.set(id,{id,versions:normalize([...versions,v])});seen.set(id,{id,hash,clock});
  }
 }
 next.records=merge([...records.values()],[]);next.seen=[...seen.values()];return next;
}
const sameClock=(a,b)=>dominates(a,b)&&dominates(b,a);
function projection(records,current){
 const existing=new Map(current.boards.map(b=>[b.id,b])),boards=[],conflicts=[],selected=[];
 for(const r of records){const combined=r.versions.length>1?materialize(r.versions):null;let chosen=combined||r.versions.find(v=>same(v.board,existing.get(r.id)||null))||r.versions.find(v=>v.board!==null)||r.versions[0];if(chosen.board)boards.push(copy(same(chosen.board,existing.get(r.id)||null)?existing.get(r.id):chosen.board));selected.push({id:r.id,board:chosen.board,clock:chosen.clock});if(r.versions.length>1&&!combined)conflicts.push(r.id)}
 const order=new Map(current.boards.map((b,i)=>[b.id,i]));boards.sort((a,b)=>(order.get(a.id)??Infinity)-(order.get(b.id)??Infinity)||compare(a.id,b.id));
 const ids=new Set(boards.map(b=>b.id)),missing=[];for(const b of boards)for(const c of b.cards)if(c.kind==='nested'&&!ids.has(c.boardId)&&!missing.includes(c.boardId))missing.push(c.boardId);
 return {workspace:{...copy(current),boards},selected,conflicts,missing};
}
async function observed(meta,w,protectedIds=[]){const blocked=new Set(protectedIds),next=copy(meta),boards=new Map(w.boards.map(b=>[b.id,b])),old=new Map(next.seen.map(x=>[x.id,x]));next.seen=[];for(const r of next.records){if(blocked.has(r.id)&&old.has(r.id)){next.seen.push(copy(old.get(r.id)));continue}const board=boards.get(r.id)||null,hash=await core.revision(semantic(board)),v=r.versions.find(x=>same(x.board,board));next.seen.push({id:r.id,hash,clock:(same(materialize(r.versions)?.board||null,board)?materialize(r.versions)?.clock:null)||v?.clock||old.get(r.id)?.clock||[]})}return next}
async function join(meta,w,remote){
 const next=await capture(meta,w),projected=projection(remote,w),boards=new Map(projected.workspace.boards.map(b=>[b.id,b]));
 // Identical local Boards adopt existing clocks rather than inventing an edit.
 const identical=new Set(w.boards.filter(b=>boards.has(b.id)&&same(b,boards.get(b.id))).map(b=>b.id));
 next.records=merge(remote,next.records.filter(r=>!identical.has(r.id)));
 const adopted=await observed({...next,seen:[]},projected.workspace);
 next.seen=next.seen.map(s=>identical.has(s.id)?adopted.seen.find(x=>x.id===s.id)||s:s);
 for(const s of adopted.seen)if(!next.seen.some(x=>x.id===s.id))next.seen.push(s);
 return next;
}
function resolve(meta,id,index,keepAll=false){
 const next=copy(meta),record=next.records.find(r=>r.id===id);if(!record)throw Error('BOARD conflict no longer exists.');
 const chosen=keepAll?record.versions.find(v=>v.board):record.versions[index];if(!chosen)throw Error('Version no longer exists.');
 const clock=tick(clockJoin(...record.versions.map(v=>v.clock)),next.device);
 // Resolution never discards alternative content: preserve it as independent BOARDS.
 for(const v of record.versions){if(!v.board||same(v.board,chosen.board))continue;const board=copy(v.board),newId=crypto.randomUUID();board.id=newId;board.title+=' (conflict copy)';for(const c of board.cards)if(c.kind==='nested'&&c.boardId===id)c.boardId=newId;next.records.push({id:newId,versions:[{clock:[[next.device,1]],board}]})}
 record.versions=[{clock,board:copy(chosen.board),...(chosen.previous?{previous:chosen.previous}:{})}];next.published='';return next;
}
function recoverReference(meta,id){const next=copy(meta),r=next.records.find(r=>r.id===id),board=r?.versions.find(v=>v.board)?.board||r?.versions.find(v=>v.previous)?.previous;if(!board)throw Error('Restore this missing BOARD from Local recovery or a manual cloud copy, then retry.');r.versions=[{clock:tick(clockJoin(...r.versions.map(v=>v.clock)),next.device),board:copy(board)}];next.published='';return next}
async function envelope(meta,w,changedIds,onProgress=()=>{}){
 let records=meta.records,source=w;
 if(changedIds){
  const ids=new Set(changedIds),byId=new Map(records.map(r=>[r.id,r]));let expanded=true;
  // Include every linked Board needed to validate retained/conflicting versions.
  while(expanded){expanded=false;for(const id of [...ids])for(const v of byId.get(id)?.versions||[])for(const board of [v.board,v.previous].filter(Boolean))for(const c of [...board.cards,...(board.unsorted||[])])if(c.kind==='nested'&&!ids.has(c.boardId)){ids.add(c.boardId);expanded=true}}
  records=records.filter(r=>ids.has(r.id));source={...w,boards:w.boards.filter(b=>ids.has(b.id))};
 }
 onProgress({phase:'snapshotValidate'});const auto={dataset:meta.dataset,device:meta.device,records,...(!changedIds?{coveredFiles:(meta.files||[]).slice(-10000)}:{})},workspace=core.workspace(source);return {format:FORMAT,createdAt:new Date().toISOString(),workspace,auto,revision:await core.revision({workspace,auto},onProgress)};
}
async function verify(snapshot,dataset){
 if(!snapshot||snapshot.format!==FORMAT||snapshot.auto?.dataset!==dataset||typeof snapshot.auto.device!=='string'||!Array.isArray(snapshot.auto.records))throw Error('Unsupported automatic sync snapshot.');
 core.workspace(snapshot.workspace);const ids=new Set();
 if(snapshot.auto.coveredFiles!==undefined&&(!Array.isArray(snapshot.auto.coveredFiles)||snapshot.auto.coveredFiles.length>10000||snapshot.auto.coveredFiles.some(id=>typeof id!=='string'||!id||id.length>300)))throw Error('Invalid covered snapshot history.');
 for(const r of snapshot.auto.records){if(!r||typeof r.id!=='string'||!r.id||r.id.length>300||ids.has(r.id)||!Array.isArray(r.versions)||!r.versions.length||r.versions.length>100)throw Error('Damaged BOARD sync history.');ids.add(r.id);
  for(const v of r.versions){if(v.cells){if(typeof v.cells!=='object'||Array.isArray(v.cells))throw Error('Invalid property history.');for(const [key,values]of Object.entries(v.cells)){let path;try{path=JSON.parse(key)}catch{throw Error('Invalid property path.')}if(!Array.isArray(path)||!['board','cards','connections','junctions'].includes(path[0])||path.some(x=>typeof x!=='string'||['__proto__','constructor','prototype'].includes(x))||!Array.isArray(values)||!values.length||values.some(c=>!Array.isArray(c.clock)||!c.clock.length||c.clock.some(p=>!Array.isArray(p)||p.length!==2||typeof p[0]!=='string'||!Number.isSafeInteger(p[1])||p[1]<1)||typeof c.present!=='boolean'||!dominates(v.clock,c.clock)))throw Error('Invalid property history.');}const check=materialize([v]);if(!check||!same(check.board,v.board))throw Error('Property history does not match BOARD.');}if(!Array.isArray(v.clock)||!v.clock.length||v.clock.length>1000)throw Error('Invalid sync clock.');const devices=new Set();for(const pair of v.clock){if(!Array.isArray(pair)||pair.length!==2||typeof pair[0]!=='string'||!pair[0]||devices.has(pair[0])||!Number.isSafeInteger(pair[1])||pair[1]<1)throw Error('Invalid sync revision.');devices.add(pair[0])}if(v.board!==null&&v.board?.id!==r.id)throw Error('BOARD ID mismatch.');}
 }
 // Validate each retained version, including versions hidden by conflicts.
 for(const r of snapshot.auto.records)for(const v of r.versions)for(const board of [v.board,v.previous].filter(Boolean)){if(board.id!==r.id)throw Error('Recovery BOARD ID mismatch.');const references=new Set((board.cards||[]).filter(c=>c.kind==='nested').map(c=>c.boardId));for(const ref of references)if(!ids.has(ref))throw Error('Missing BOARD sync record.');core.workspace({boards:[board,...[...references].filter(id=>id!==board.id).map(id=>({id,title:'Reference',cards:[]}))]})}
 if(await core.revision({workspace:snapshot.workspace,auto:snapshot.auto})!==snapshot.revision)throw Error('Automatic snapshot checksum mismatch. Local data was not replaced.');
 return merge(snapshot.auto.records,[]);
}
const api={FORMAT,semantic,same,clockJoin,dominates,normalize,materialize,merge,empty,capture,projection,observed,join,resolve,recoverReference,envelope,verify};if(typeof module!=='undefined')module.exports=api;else root.SilverlightAuto=api;
})(globalThis);
