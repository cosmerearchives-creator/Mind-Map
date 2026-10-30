const {chromium}=require('playwright'),assert=require('node:assert/strict');
(async()=>{
 const server=await require('./serve-assets.cjs')(),browser=await chromium.launch({headless:true,channel:process.env.SILVERLIGHT_BROWSER_CHANNEL||'msedge'});
 try{
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(server.url);await page.waitForFunction(()=>SilverlightAssetStore.stats.writes>0);
  assert.equal(await page.title(),'Archives of Arcanum');
  assert.equal(await page.locator('.brandName').textContent(),'Archives of Arcanum');
  const fresh=await require('./read-workspace.cjs')(page);
  assert.equal(fresh.boards[0].title,'Welcome to Archives of Arcanum');
  // An existing workspace remains in its original database, with user text intact.
  const legacy={boards:[{id:'existing',title:'My Silverlight research',cards:[{id:'note',kind:'text',title:'Keep this title',body:'Silverlight is part of my research notes.',x:0,y:0}],connections:[]}],tabs:[],active:null,views:{}};
  await page.evaluate(async workspace=>{
   const db=await new Promise((resolve,reject)=>{const q=indexedDB.open('openboard-workspace',1);q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error)});
   try{await SilverlightAssetStore.write(db,[['main',{state:workspace}]]);localStorage.setItem('silverlight.showHints','false')}finally{db.close()}
  },legacy);
  await page.reload();await page.locator('[data-board="existing"]').waitFor();
  const restored=await require('./read-workspace.cjs')(page);
  assert.equal(restored.boards[0].title,legacy.boards[0].title);
  assert.ok(JSON.stringify(restored).includes(legacy.boards[0].cards[0].body));
  assert.equal(await page.evaluate(()=>localStorage.getItem('silverlight.showHints')),'false');
  for(const width of [1280,390]){
   await page.setViewportSize({width,height:800});
   const layout=await page.locator('.top').evaluate(el=>({width:el.clientWidth,scroll:el.scrollWidth}));
   assert.ok(layout.scroll<=layout.width+1,'Renamed header must fit at '+width);
   assert.equal(await page.locator('.brandName').textContent(),'Archives of Arcanum');
  }
  assert.deepEqual(errors,[]);
  console.log('PASS renamed desktop/mobile header and fresh welcome; legacy database, preferences and user content survive reload.');
 }finally{await browser.close();await server.close()}
})().catch(e=>{console.error(e);process.exit(1)});
