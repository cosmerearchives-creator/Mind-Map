const assert=require('node:assert/strict'),a=require('../app/src/main/assets/auto-sync-core.js');
const clone=structuredClone;
const initial={boards:[{id:'board',title:'Cosmere',cards:[{id:'one',kind:'text',title:'One',body:'Original',x:0,y:0},{id:'two',kind:'text',title:'Two',body:'Original',x:200,y:0}],connections:[]}],views:{},tabs:[]};
(async()=>{
 let A=await a.capture(a.empty('A','group','account'),initial),B=await a.observed({...clone(A),device:'B'},initial);
 async function changes(meta,fn,workspace=initial){const w=clone(workspace);fn(w.boards[0]);return a.capture(meta,w)}
 async function combine(left,right,w=initial){const records=a.merge(left.records,right.records),projected=a.projection(records,w);const m=await a.observed({...left,records},projected.workspace);await a.verify(await a.envelope(m,projected.workspace),'group');return {records,projected,m}}
 const left=await changes(A,b=>b.cards.push({id:'left',kind:'text',body:'Left addition',x:-500,y:0})),right=await changes(B,b=>b.cards.push({id:'right',kind:'text',body:'Right addition',x:900,y:0}));
 let result=await combine(left,right);assert.deepEqual(result.projected.conflicts,[]);assert.equal(result.projected.workspace.boards[0].cards.length,4);
 const move=await changes(A,b=>{b.cards[0].x=30;b.cards[0].y=60}),text=await changes(B,b=>b.cards[0].body='Edited');result=await combine(move,text);assert.deepEqual(result.projected.conflicts,[]);assert.equal(result.projected.workspace.boards[0].cards.find(c=>c.id==='one').body,'Edited');assert.equal(result.projected.workspace.boards[0].cards.find(c=>c.id==='one').x,30);
 const joined=result.projected.workspace;const later=await changes(result.m,b=>b.cards.find(c=>c.id==='two').title='Later',joined);assert.deepEqual(a.projection(a.merge(later.records,text.records),joined).conflicts,[]);
 const otherMove=await changes(B,b=>b.cards[0].x=100);assert.deepEqual(a.projection(a.merge(move.records,otherMove.records),initial).conflicts,['board']);
 const deletion=await changes(A,b=>b.cards.shift());assert.deepEqual(a.projection(a.merge(deletion.records,text.records),initial).conflicts,['board']);
 const deleteOther=await changes(A,b=>b.cards.pop());result=await combine(deleteOther,text);assert.deepEqual(result.projected.conflicts,[]);assert.equal(result.projected.workspace.boards[0].cards.length,1);
 const third=await changes(await a.observed({...clone(A),device:'C'},initial),b=>b.title='Renamed');const variants=[left,right,third];let digest;
 for(const order of [[0,1,2],[0,2,1],[1,0,2],[1,2,0],[2,0,1],[2,1,0]]){let records=[];for(const i of order)records=a.merge(records,variants[i].records);const p=a.projection(records,initial);assert.deepEqual(p.conflicts,[]);const value=JSON.stringify(p.workspace.boards);digest??=value;assert.equal(value,digest)}
 const superset=await changes(A,b=>{b.cards[0].body='Shared';b.cards[0].title='Extra'}),subset=await changes(B,b=>b.cards[0].body='Shared');const shared=await combine(superset,subset);const nextShared=await changes(shared.m,b=>b.title='After shared change',shared.projected.workspace);await a.verify(await a.envelope(nextShared,a.projection(nextShared.records,shared.projected.workspace).workspace),'group');
 // Migration: an older board-level snapshot remains readable and upgrades on edit.
 const legacy=clone(A);for(const r of legacy.records)for(const v of r.versions)delete v.cells;await a.verify(await a.envelope(legacy,initial),'group');const upgraded=await changes(legacy,b=>b.title='Upgrade');await a.verify(await a.envelope(upgraded,a.projection(upgraded.records,initial).workspace),'group');
 console.log('PASS: same-BOARD additions, movement plus text, continued edits, conflicting positions, delete/edit preservation, compatible deletion, delivery-order convergence and legacy migration.');
})().catch(e=>{console.error(e);process.exit(1)});
