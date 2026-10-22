const assert=require('node:assert/strict');
const sync=require('../app/src/main/assets/sync-core.js');
(async()=>{
 const workspace={boards:[{id:'root',title:'HOME',cards:[{id:'a',kind:'nested',boardId:'child',title:'Selish',tags:'magic',collectionId:'collection'},{id:'collection',kind:'collection',collapsed:true},{id:'b',kind:'image',title:'Tower',imageMode:'raw',keepAspect:true,imageData:'data:image/png;base64,example',backgroundImageData:'data:image/png;base64,background'}],connections:[{id:'edge',from:'a',to:'b',direction:'both',label:'Test',labelPosition:.3}],junctions:{a:{x:30,y:50,label:'Trunk'}}},{id:'child',title:'Selish',cards:[]}],favoriteColors:['#123456'],tabs:['root'],active:'root',views:{root:{x:4,y:10,scale:1.2}}};
 const snapshot=await sync.create(workspace,'Windows');assert.deepEqual(await sync.verify(JSON.parse(JSON.stringify(snapshot))),workspace);assert.equal(workspace.boards[0].cards[0].id,'a');
 const reordered={views:workspace.views,active:workspace.active,tabs:workspace.tabs,favoriteColors:workspace.favoriteColors,boards:workspace.boards};assert.equal(await sync.revision(reordered),snapshot.revision);
 const bad=structuredClone(snapshot);bad.workspace.boards[0].title='Tampered';await assert.rejects(()=>sync.verify(bad),/checksum/);
 await assert.rejects(()=>sync.verify({...snapshot,format:'future-v2'}),/Unsupported/);
 const missing=structuredClone(workspace);missing.boards.pop();assert.throws(()=>sync.workspace(missing),/missing BOARD/);
 const edge=structuredClone(workspace);edge.boards[0].connections[0].to='missing';assert.throws(()=>sync.workspace(edge),/connection/);
 const duplicate=structuredClone(workspace);duplicate.boards.push(duplicate.boards[0]);assert.throws(()=>sync.workspace(duplicate),/duplicate BOARD/);
 assert.deepEqual(sync.summary(workspace),{boards:2,stickies:3});console.log('PASS: lossless snapshot round-trip, stable hash, nested BOARD references, raw image and connection preservation, corruption/schema/dangling-reference rejection.');
})().catch(e=>{console.error(e);process.exit(1)});
