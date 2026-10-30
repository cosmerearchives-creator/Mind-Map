/* Local clean-start proof over stored asset IDs; original/remote checksum verification is unchanged. */
(function(root){'use strict';
const A=typeof module!=='undefined'?require('./assets-core.js'):root.SilverlightAssets,Auto=typeof module!=='undefined'?require('./auto-sync-core.js'):root.SilverlightAuto;
function expand(v){if(v&&typeof v==='object'){if(Object.keys(v).length===1&&typeof v.__silverlightBoardJSON==='string')return JSON.parse(v.__silverlightBoardJSON);if(Array.isArray(v))return v.map(expand);return Object.fromEntries(Object.entries(v).map(([k,x])=>[k,expand(x)]))}return v}
async function recordProof(records){const proofs=[];for(const r of records)proofs.push({id:r.id,hash:await A.stream.hashJSON(r,true)});return A.stream.hashJSON(proofs,true)}
async function check(input){const {document:d}=await A.pack(expand(input)),{meta,workspace,cached}=d;
 if(!meta?.enabled||meta.bootstrap||meta.deferred||meta.conflicts?.length||meta.missing?.length||!Array.isArray(meta.records)||!Array.isArray(meta.seen)||!Array.isArray(workspace?.boards)||!/^[a-f0-9]{64}$/.test(meta.published||''))return null;
 const legacyKey=()=>A.stream.hashJSON(meta.records,true);const recordsKey=meta.localResume?.kind==='record-digests-v1'?await recordProof(meta.records):await legacyKey();let proven=meta.localResume?.digest===meta.published&&meta.localResume?.records===recordsKey;
 // Upgrade path: an already-verified cached upload can prove the same local records without rereading images.
 if(!proven&&cached&&meta.publishedFile&&cached.fileId===meta.publishedFile&&cached.document?.revision===meta.publishedRevision&&cached.document?.auto?.dataset===meta.dataset&&cached.document?.auto?.device===meta.device&&await A.stream.hashJSON(cached.document,true)===cached.documentHash){proven=await A.stream.hashJSON(cached.document.auto.records,true)===(meta.localResume?.kind==='record-digests-v1'?await legacyKey():recordsKey)}
 if(!proven)return null;
 // Represent known asset IDs as references so existing causal materialization can validate compatible partner edits.
 const local=A.lazyDocument({records:meta.records,boards:workspace.boards},{},()=>{throw Error('Startup comparison must not load image bytes.')}),boards=new Map(local.boards.map(b=>[b.id,b])),seen=new Map(meta.seen.map(s=>[s.id,s]));if(boards.size!==workspace.boards.length)return null;
 for(const r of local.records){const v=r.versions?.length===1?r.versions[0]:Auto.materialize(r.versions||[]),observed=seen.get(r.id);if(!v||!observed||!Auto.dominates(observed.clock,v.clock)||!Auto.dominates(v.clock,observed.clock)||!Auto.same(v.board,boards.get(r.id)||null))return null;boards.delete(r.id)}
 return boards.size?null:meta.published;
}
const api={expand,check,recordProof};if(typeof module!=='undefined')module.exports=api;else root.SilverlightResume=api;
})(globalThis);
