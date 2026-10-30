/* Shared, lossless snapshot format. No credentials or device identity in workspace data. */
(function(root){
'use strict';
const FORMAT='silverlight-snapshot-v1', MAX_BYTES=Number.MAX_SAFE_INTEGER,LEGACY_HASH_BYTES=256*1024*1024;
function canonical(value){if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';if(value&&typeof value==='object')return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}';return JSON.stringify(value)}
function compareCanonical(a,b){const S=typeof module!=='undefined'?require('./stream-json.js'):root.SilverlightStream,ai=S.json(a,true),bi=S.json(b,true);let av=ai.next(),bv=bi.next(),x=0,y=0;while(!av.done&&!bv.done){const n=Math.min(av.value.length-x,bv.value.length-y),as=av.value.slice(x,x+n),bs=bv.value.slice(y,y+n);if(as!==bs)return as<bs?-1:1;x+=n;y+=n;if(x===av.value.length){av=ai.next();x=0}if(y===bv.value.length){bv=bi.next();y=0}}return av.done?(bv.done?0:-1):1}
function workspace(input){
 const assets=typeof module!=='undefined'?require('./assets-core.js'):root.SilverlightAssets;const w=assets?assets.clone(input):JSON.parse(JSON.stringify(input));
 if(!w||!Array.isArray(w.boards))throw Error('This is not a Archives of Arcanum workspace.');
 const validId=x=>typeof x==='string'&&x.length>0&&x.length<=300;
 const boards=new Set();
 for(const b of w.boards){if(!b||!validId(b.id)||boards.has(b.id)||typeof b.title!=='string'||!Array.isArray(b.cards))throw Error('Invalid or duplicate BOARD data.');boards.add(b.id)}
 for(const b of w.boards){if(b.codexEntry){const codex=typeof module!=='undefined'?require('./codex-core.js'):root.SilverlightCodex;codex.validateEntry(b)}const cards=new Set();for(const c of b.cards){if(!c||!validId(c.id)||cards.has(c.id))throw Error('Invalid or duplicate STICKY IDs.');cards.add(c.id);if(c.kind==='familyTree'){const family=typeof module!=='undefined'?require('./family-tree-core.js'):root.SilverlightFamilyTree;family.validate(c.familyTree)}if(c.kind==='spreadsheet'||c.kind==='timeline'){const docs=typeof module!=='undefined'?require('./canvas-documents-core.js'):root.SilverlightCanvasDocuments;if(c.kind==='spreadsheet')docs.validateSheet(c.sheet);else docs.validateTimeline(c.timeline)}if(c.kind==='nested'&&(!validId(c.boardId)||!boards.has(c.boardId)))throw Error('A BOARD STICKY points to a missing BOARD. Repair it before transferring.');if(c.collectionId&&!b.cards.some(x=>x.id===c.collectionId&&x.kind==='collection'))throw Error('A STICKY points to a missing COLLECTION.');}
 if(b.connections!==undefined&&!Array.isArray(b.connections))throw Error('Invalid connections.');
 const connections=new Set();for(const edge of b.connections||[]){if(!edge||!validId(edge.id)||connections.has(edge.id)||!cards.has(edge.from)||!cards.has(edge.to))throw Error('A connection is invalid or points to a missing STICKY.');connections.add(edge.id)}
 }
 return w;
}
// Asset IDs come from pack's verified SHA-256 mapping. Keep only four tiny SHA states, never image bytes.
const assetPrefixes=new Map();
async function packedRevision(bundle,stream){const ids=Object.keys(bundle.assets).sort(),key=JSON.stringify(ids);let prefix=assetPrefixes.get(key);if(!prefix){prefix=new stream.SHA256();await stream.updateChunks(prefix,(function*(){yield '{"assets":';yield* stream.json(bundle.assets,true)})());if(key.length<=1024*1024)assetPrefixes.set(key,prefix);if(assetPrefixes.size>4)assetPrefixes.delete(assetPrefixes.keys().next().value)}else{assetPrefixes.delete(key);assetPrefixes.set(key,prefix)}return stream.hashChunks((function*(){yield ',"document":';yield* stream.json(bundle.document,true);yield ',"format":';yield* stream.json(bundle.format,true);yield '}'})(),prefix)}
async function revision(w,onProgress=()=>{}){const assets=typeof module!=='undefined'?require('./assets-core.js'):root.SilverlightAssets,stream=typeof module!=='undefined'?require('./stream-json.js'):root.SilverlightStream;let value=w;if(assets&&assets.logicalSize(w)>LEGACY_HASH_BYTES){onProgress({phase:'snapshotPack'});const bundle=await assets.pack(w);onProgress({phase:'snapshotHash'});if(assets.logicalSize(bundle)<=LEGACY_HASH_BYTES)return packedRevision(bundle,stream);value={format:'silverlight-large-revision-v1',document:bundle.document,assets:Object.keys(bundle.assets).sort()}}onProgress({phase:'snapshotHash'});return stream.hashJSON(value,true)}

async function create(input,device){const w=workspace(input);return {format:FORMAT,createdAt:new Date().toISOString(),device:String(device).slice(0,120),revision:await revision(w),workspace:w}}
async function verify(input){if(!input||input.format!==FORMAT||!/^[a-f0-9]{64}$/.test(input.revision||'')||!Number.isFinite(Date.parse(input.createdAt)))throw Error('Unsupported or damaged cloud snapshot.');const w=workspace(input.workspace);if(await revision(w)!==input.revision)throw Error('Snapshot checksum does not match. Your local data was not changed.');return w}
function summary(w){return {boards:w.boards.length,stickies:w.boards.reduce((n,b)=>n+b.cards.length,0)}}
const api={FORMAT,MAX_BYTES,canonical,compareCanonical,workspace,revision,create,verify,summary};
if(typeof module!=='undefined')module.exports=api;else root.SilverlightSync=api;
})(globalThis);
