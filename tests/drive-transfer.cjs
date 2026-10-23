const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const path=require('node:path');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'msedge'});
 try{
 let snapshots=[],damage=false;
 const errors=[];
 async function device(title){
  const context=await browser.newContext({viewport:title.startsWith('Android')?{width:390,height:844}:{width:1280,height:900}});const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.exposeFunction('mockDrive',async r=>{if(r.op==='connect')return {};if(r.op==='upload'){snapshots.push({id:String(snapshots.length+1),data:r.snapshot});return {id:String(snapshots.length)}}if(r.op==='list')return {files:snapshots.map(x=>({id:x.id,createdTime:'2026-10-22T12:00:00Z',appProperties:{platform:'Windows',boards:'2',protocol:JSON.parse(x.data).format==='silverlight-part-v2'?'part-v2':'manual-v1',revision:JSON.parse(x.data).revision}}))};if(r.op==='download'){const s=JSON.parse(snapshots.find(x=>x.id===r.fileId).data);if(damage){if(s.format==='silverlight-transfer-v2')s.checksum='0'.repeat(64);else if(s.format==='silverlight-part-v2')s.data+='DAMAGED';else s.workspace.boards[0].title='DAMAGED'};return {snapshot:JSON.stringify(s)}}throw Error('Unexpected operation')});
  await page.addInitScript(title=>{
   if(!localStorage.getItem('seeded')){localStorage.setItem('seeded','1');localStorage.setItem('openboard.v1',JSON.stringify({boards:[{id:'root',title,cards:[{id:'nested',kind:'nested',title:'Selish',boardId:'child',body:'',x:10,y:10},{id:'image',kind:'image',title:'Image',body:'',imageMode:'raw',imageData:'data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg"/>'),x:300,y:10}],connections:[{id:'edge',from:'nested',to:'image',label:'Preserved'}]},{id:'child',title:'Selish',cards:[]}],tabs:[],active:null,views:{}}))}
   window.SilverlightNative={postMessage:async text=>{const r=JSON.parse(text);try{const result=await window.mockDrive(r);window.SilverlightNative.onmessage({data:JSON.stringify({channel:r.channel,id:r.id,result})})}catch(e){window.SilverlightNative.onmessage({data:JSON.stringify({channel:r.channel,id:r.id,error:e.message})})}}};
  },title);
  await page.goto(pathToFileURL(path.resolve('app/src/main/assets/index.html')).href);await page.locator('[data-board="root"]').waitFor();await page.waitForTimeout(300);assert.equal(await page.locator('#export').evaluate(el=>el.getBoundingClientRect().right<=innerWidth),true,'header controls stay visible on mobile');return page;
 }
 async function saved(page){return page.evaluate(async()=>{const db=await new Promise((resolve,reject)=>{const q=indexedDB.open('openboard-workspace',1);q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error)});try{return JSON.parse((await SilverlightAssetStore.read(db,'main')).state)}finally{db.close()}})}
 async function review(page){await page.locator('#driveSync').click();await page.locator('#driveList').click();await page.locator('#driveSnapshots button').first().click();await page.locator('#driveConfirmRestore').waitFor()}
 const a=await device('Windows original'),b=await device('Android original');
 await b.evaluate(()=>{const original=IDBDatabase.prototype.transaction;IDBDatabase.prototype.transaction=function(...args){const t=original.apply(this,args);if(window.abortNextRestore&&args[1]==='readwrite'){window.abortNextRestore=false;queueMicrotask(()=>t.abort())}return t}});
 await a.locator('#driveSync').click();await a.locator('#driveUpload').click();await a.locator('#driveConfirmUpload').click();await a.locator('#driveStatus').filter({hasText:'Cloud copy uploaded'}).waitFor();assert.equal(snapshots.filter(x=>JSON.parse(x.data).format!=='silverlight-part-v2').length,1);const source=await saved(a);
 await review(b);await b.locator('#driveCancelRestore').click();assert.equal((await saved(b)).boards[0].title,'Android original');await b.locator('#driveClose').click();
 await review(b);await b.evaluate(()=>window.abortNextRestore=true);await b.locator('#driveConfirmRestore').click();await b.locator('#driveStatus').filter({hasText:/(interrupted|aborted|could not be saved|Could not save workspace images)/i}).waitFor();assert.equal((await saved(b)).boards[0].title,'Android original');await b.locator('#driveCancelRestore').click();await b.locator('#driveClose').click();
 await b.locator('#newBoard').click();await b.locator('#boardTitle').fill('Concurrent change');await b.locator('#confirm').click();await b.locator('#home').click();await review(b);await b.keyboard.press('Control+z');await b.locator('#driveConfirmRestore').click();await b.locator('#driveStatus').filter({hasText:'workspace changed'}).waitFor();await b.locator('#driveCancelRestore').click();await b.locator('#driveClose').click();
 damage=true;await b.locator('#driveSync').click();await b.locator('#driveList').click();await b.locator('#driveSnapshots button').first().click();await b.locator('#driveStatus').filter({hasText:'checksum'}).waitFor();assert.equal((await saved(b)).boards[0].title,'Android original');await b.locator('#driveClose').click();damage=false;
 await review(b);await b.locator('#driveConfirmRestore').click();await b.locator('#driveStatus').filter({hasText:'Restored successfully'}).waitFor();assert.deepEqual((await saved(b)).boards,source.boards);
 await b.locator('#driveRecovery').click();await b.locator('#driveSnapshots button').first().click();await b.locator('#driveConfirmRestore').click();await b.locator('#driveStatus').filter({hasText:'Restored successfully'}).waitFor();assert.equal((await saved(b)).boards[0].title,'Android original');
 await b.locator('#driveClose').click();await b.reload();await b.locator('[data-board="root"]').filter({hasText:'Android original'}).waitFor();assert.equal(snapshots.filter(x=>JSON.parse(x.data).format!=='silverlight-part-v2').length,1,'Restores never overwrite cloud');assert.deepEqual(errors,[]);
 console.log('PASS: two-device upload/restore simulation, cancel without mutation, aborted transaction rollback, stale-preview rejection, checksum rejection, exact BOARD/STICKY/link/image preservation, durable local recovery and restart. Google authorization and real Drive access require device testing.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
