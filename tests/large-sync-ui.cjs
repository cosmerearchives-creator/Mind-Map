const {chromium}=require('playwright'),assert=require('node:assert/strict');
(async()=>{const server=await require('./serve-assets.cjs')(),browser=await chromium.launch({headless:true,channel:'msedge'});
try{const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(server.url);await page.waitForFunction(()=>SilverlightAssetStore.stats.writes>=2&&!window.SilverlightLocalSaveStatus?.().pending);
const result=await page.evaluate(async()=>{
 const db=await new Promise((resolve,reject)=>{const q=indexedDB.open('openboard-workspace',1);q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error)});
 const image='data:image/png;base64,'+'A'.repeat(4*1024*1024),w={boards:[{id:'large',title:'Large regression',cards:Array.from({length:140},(_,i)=>({id:'c'+i,kind:'image',imageData:image,x:i,y:0}))}],tabs:[],active:null,views:{}};
 let meta=await SilverlightTasks.run('auto',{method:'capture',values:[SilverlightAuto.empty('device','dataset','account'),w]});
 await SilverlightAssetStore.write(db,[['main',{state:w}],['auto-sync-meta',meta]]);
 const disk=(await SilverlightAssetStore.read(db,'main',true,true)).state,history=await SilverlightAssetStore.read(db,'auto-sync-meta',false,true);
 const captured=await SilverlightTasks.run('auto',{method:'capture',values:[history,disk]}),snapshot=await SilverlightTasks.run('auto',{method:'envelope',values:[captured,disk]});
 let files=[];const request=installAssetTransfer(async(op,args)=>{if(op==='upload'){const v=JSON.parse(args.snapshot),id=String(files.length+1);files.push({id,snapshot:args.snapshot,appProperties:{protocol:v.format==='silverlight-part-v2'?'part-v2':'auto-v1',revision:v.revision}});return {id}}return {snapshot:files.find(f=>f.id===args.fileId).snapshot}},async()=>files);
 const uploaded=await request('upload',{snapshot}),restored=(await request('download',{fileId:uploaded.id,objectResult:true})).snapshot;
 await SilverlightTasks.run('auto',{method:'verify',values:[restored,'dataset']});
 // Abort a transaction after preparing large workspace/history; durable prior data must survive.
 const original=db.transaction.bind(db);db.transaction=(...args)=>{const t=original(...args);if(args[1]==='readwrite')queueMicrotask(()=>t.abort());return t};
 let aborted=false;try{await SilverlightAssetStore.write(db,[['main',{state:{...w,boards:[]}}],['auto-sync-meta',{...captured,published:'must-not-persist'}]])}catch{aborted=true}
 db.transaction=original;const durable=(await SilverlightAssetStore.read(db,'main',true,true)).state;
 const out={logical:SilverlightAssets.logicalSize(w),boards:durable.boards.length,cards:restored.workspace.boards[0].cards.length,exact:restored.workspace.boards[0].cards[139].imageData===image,versions:captured.records[0].versions.length,aborted,published:(await SilverlightAssetStore.read(db,'auto-sync-meta',false,true)).published,workerJobs:SilverlightTasks.stats.workerJobs};db.close();return out;
});
assert.ok(result.logical>512*1024*1024);assert.equal(result.boards,1);assert.equal(result.cards,140);assert.equal(result.exact,true);assert.equal(result.versions,1);assert.equal(result.aborted,true);assert.equal(result.published,'');assert.ok(result.workerJobs>0);assert.deepEqual(errors,[]);
await page.reload();await page.locator('[data-board="large"]').waitFor();console.log('PASS: >512 MiB logical workspace through browser Worker, lazy IndexedDB originals/history, multipart upload/download, checksum verification, transaction abort and restart without losing pending local data.');
}finally{await browser.close();await server.close()}})().catch(e=>{console.error(e);process.exit(1)});
