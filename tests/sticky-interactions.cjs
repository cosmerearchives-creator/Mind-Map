// Run with NODE_PATH pointing at the installed Playwright package directory.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const path=require('node:path');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'msedge'});
 try {
 const page=await browser.newPage({viewport:{width:1400,height:1000}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const cards=['text','task','link','nested','image','collection'].map((kind,i)=>({id:kind,kind,title:kind==='nested'?'Selish':kind,body:'',boardId:kind==='nested'?'child':undefined,x:50+i%3*350,y:70+Math.floor(i/3)*330,width:230,height:200,imageData:kind==='image'?'data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="150"><circle cx="100" cy="75" r="60" fill="red"/></svg>'):undefined}));
 await page.addInitScript(seed=>{localStorage.setItem('openboard.v1',JSON.stringify(seed));}, {boards:[{id:'main',title:'Test BOARD',cards},{id:'child',title:'Selish BOARD',cards:[]}],tabs:['main'],active:'main',views:{main:{x:0,y:0,scale:1}}});
 await page.goto(pathToFileURL(path.resolve('app/src/main/assets/index.html')).href);
 await page.locator('[data-board="main"]').click();await page.locator('[data-card="text"]').waitFor();
 async function position(id){return page.locator(`[data-card="${id}"]`).evaluate(el=>({x:parseFloat(el.style.left),y:parseFloat(el.style.top)}));}
 async function drag(id){const loc=page.locator(`[data-card="${id}"]`),box=await loc.boundingBox(),before=await position(id);await page.mouse.move(box.x+70,box.y+65);await page.mouse.down();await page.mouse.move(box.x+95,box.y+80);const during=await position(id);assert.equal(during.x,before.x+25,id+' moves before hold delay');assert.equal(during.y,before.y+15);await page.mouse.up();}
 for(const c of cards)await drag(c.id);
 await page.locator('[data-card="nested"] .nestedFullButton').click({modifiers:['Control']});
 await page.locator('.tab.active').filter({hasText:'Selish BOARD'}).waitFor();
 await page.locator('[data-tab="main"] .tabName').click();
 await page.locator('[data-card="image"]').dispatchEvent('contextmenu',{clientX:400,clientY:300});await page.getByRole('menuitem',{name:'Edit note',exact:true}).click();
 await page.locator('#imageMode').selectOption('raw');await page.locator('#confirm').click();
 assert.equal(await page.locator('.rawImage').count(),1);
 assert.equal(await page.locator('.rawImage').evaluate(e=>getComputedStyle(e).backgroundColor),'rgba(0, 0, 0, 0)');
 await drag('image');
 await page.locator('[data-card="image"]').dispatchEvent('contextmenu',{clientX:400,clientY:300});await page.getByRole('menuitem',{name:'Edit note',exact:true}).click();assert.equal(await page.locator('#imageMode').inputValue(),'raw');await page.locator('#cancel').click();
 // Synthetic touch events exercise the same application handlers as Android WebView.
 const cdp=await page.context().newCDPSession(page);const touchBox=await page.locator('[data-card="text"]').boundingBox();async function touch(type,x,y){await cdp.send('Input.dispatchTouchEvent',{type:{pointerdown:'touchStart',pointermove:'touchMove',pointerup:'touchEnd'}[type],touchPoints:type==='pointerup'?[]:[{x:touchBox.x+x-80,y:touchBox.y+y-80}]});}
 const before=await position('text');await touch('pointerdown',100,100);await page.waitForTimeout(270);await touch('pointermove',130,120);await touch('pointerup',130,120);assert.equal((await position('text')).x,before.x+30,'touch hold moves Sticky');
 const prePan=await position('text');await touch('pointerdown',100,100);await touch('pointermove',130,120);await touch('pointerup',130,120);assert.deepEqual(await position('text'),prePan,'touch before hold pans instead');
 await page.waitForTimeout(300);await page.reload();await page.locator('.rawImage').waitFor();assert.deepEqual(await position('text'),prePan,'saved coordinates survive reload');
 assert.deepEqual(errors,[]);console.log('PASS: six Sticky types drag immediately; Selish Ctrl-click opens a new tab; Raw mode edits, drags and persists; touch hold and pan preserved; no page errors.');
 } finally {await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
