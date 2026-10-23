/* Shared, lossless snapshot format. No credentials or device identity in workspace data. */
(function(root){
'use strict';
const FORMAT='silverlight-snapshot-v1', MAX_BYTES=256*1024*1024;
function canonical(value){if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';if(value&&typeof value==='object')return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}';return JSON.stringify(value)}
function workspace(input){
 const w=JSON.parse(JSON.stringify(input));
 if(!w||!Array.isArray(w.boards))throw Error('This is not a Silverlight workspace.');
 const validId=x=>typeof x==='string'&&x.length>0&&x.length<=300;
 const boards=new Set();
 for(const b of w.boards){if(!b||!validId(b.id)||boards.has(b.id)||typeof b.title!=='string'||!Array.isArray(b.cards))throw Error('Invalid or duplicate BOARD data.');boards.add(b.id)}
 for(const b of w.boards){const cards=new Set();for(const c of b.cards){if(!c||!validId(c.id)||cards.has(c.id))throw Error('Invalid or duplicate STICKY IDs.');cards.add(c.id);if(c.kind==='nested'&&(!validId(c.boardId)||!boards.has(c.boardId)))throw Error('A BOARD STICKY points to a missing BOARD. Repair it before transferring.');if(c.collectionId&&!b.cards.some(x=>x.id===c.collectionId&&x.kind==='collection'))throw Error('A STICKY points to a missing COLLECTION.');}
 if(b.connections!==undefined&&!Array.isArray(b.connections))throw Error('Invalid connections.');
 const connections=new Set();for(const edge of b.connections||[]){if(!edge||!validId(edge.id)||connections.has(edge.id)||!cards.has(edge.from)||!cards.has(edge.to))throw Error('A connection is invalid or points to a missing STICKY.');connections.add(edge.id)}
 }
 return w;
}
async function revision(w){const assets=typeof module!=='undefined'?require('./assets-core.js'):root.SilverlightAssets;let value=w;if(assets&&assets.logicalSize(w)>MAX_BYTES){assets.assertSize(w);value=await assets.pack(w)}const bytes=new TextEncoder().encode(canonical(value));if(bytes.length>MAX_BYTES)throw Error('Workspace exceeds the 256 MB transfer limit. Export a local backup instead.');const digest=await crypto.subtle.digest('SHA-256',bytes);return Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('')}
async function create(input,device){const w=workspace(input);return {format:FORMAT,createdAt:new Date().toISOString(),device:String(device).slice(0,120),revision:await revision(w),workspace:w}}
async function verify(input){if(!input||input.format!==FORMAT||!/^[a-f0-9]{64}$/.test(input.revision||'')||!Number.isFinite(Date.parse(input.createdAt)))throw Error('Unsupported or damaged cloud snapshot.');const w=workspace(input.workspace);if(await revision(w)!==input.revision)throw Error('Snapshot checksum does not match. Your local data was not changed.');return w}
function summary(w){return {boards:w.boards.length,stickies:w.boards.reduce((n,b)=>n+b.cards.length,0)}}
const api={FORMAT,MAX_BYTES,canonical,workspace,revision,create,verify,summary};
if(typeof module!=='undefined')module.exports=api;else root.SilverlightSync=api;
})(globalThis);
