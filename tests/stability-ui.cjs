const {chromium}=require('playwright'),assert=require('node:assert/strict');
(async()=>{const server=await require('./serve-assets.cjs')(),browser=await chromium.launch({channel:'msedge',headless:true});try{
 for(const mobile of [false,true]){
 const context=await browser.newContext(mobile?{viewport:{width:412,height:915},isMobile:true,hasTouch:true}:{}),page=await context.newPage();page.on('dialog',d=>d.accept());
 await page.addInitScript(()=>{localStorage.setItem('silverlight.desktopEditor.v2','popup');const NativeWorker=Worker;window.testWorkers=[];window.Worker=class extends NativeWorker{constructor(...args){super(...args);testWorkers.push(this)}};localStorage.setItem('openboard.v1',JSON.stringify({boards:[{id:'a',title:'A',cards:[{id:'n',kind:'text',body:'Original',x:100,y:100}],connections:[]},{id:'b',title:'B',cards:[],connections:[]}],tabs:['a','b'],views:{}}))});
 await page.goto(server.url);await page.waitForFunction(()=>SilverlightAssetStore.stats.writes>0);await page.locator('[data-board="a"]').first().click();await page.locator('[data-card="n"]').dblclick();await page.locator('.richEditor').fill('Retained draft');
 await page.evaluate(()=>{const original=SilverlightAssetStore.write;window.failSaves=2;window.saveAttempts=0;SilverlightAssetStore.write=async(...args)=>{window.saveAttempts++;if(window.failSaves-->0)throw Error('Injected transaction abort');return original(...args)}});
 await page.locator('#confirm').click();await page.waitForFunction(()=>document.querySelector('#storageCapacityStatus')?.textContent.startsWith('Unsaved changes:'));
 assert.equal(await page.evaluate(()=>SilverlightLocalSaveStatus().pending),true);await page.locator('[data-card="n"]').dblclick();await page.locator('.richEditor').fill('Latest edit after failure');await page.locator('#confirm').click();
 await page.waitForFunction(()=>saveAttempts>=3&&!document.querySelector('#storageCapacityStatus'),{},{timeout:15000});
 assert.equal(await page.evaluate(()=>SilverlightLocalSaveStatus().pending),false);
 const saved=await require('./read-workspace.cjs')(page);assert.match(saved.boards.find(b=>b.id==='a').cards.find(c=>c.id==='n').body,/Latest edit after failure/);
 await page.locator('[data-card="n"]').dblclick();await page.locator('.richEditor').fill('Draft survives worker failure');
 await page.evaluate(async()=>{await SilverlightTasks.run('parseLegacy','{}');const old=testWorkers.at(-1);old.dispatchEvent(new ErrorEvent('error'));if(SilverlightTasks.stats.lastFailure!=='worker')throw Error('Worker reset missing');const recovered=await SilverlightTasks.run('parseLegacy','{"recovered":true}');if(!recovered.recovered||testWorkers.at(-1)===old)throw Error('Worker did not restart')});
 assert.equal(await page.locator('.richEditor').innerText(),'Draft survives worker failure');await page.locator('#pickBoard').click();await page.locator('[data-close="a"]').click();assert.equal(await page.locator('[data-tab="a"]').count(),1,'suspended draft blocks tab close');await page.locator('#cancel').click();assert.equal(await page.locator('.richEditor').innerText(),'Draft survives worker failure');await page.locator('#cancel').click();await context.close();
 }
 console.log('PASS desktop and Android-size touch layout: transient save retry, durable text, stale warning cleared and editor draft retained.');
}finally{await browser.close();await server.close()}})().catch(e=>{console.error(e);process.exit(1)});
