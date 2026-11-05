/* Synthetic workspace only. Protect navigation against repeated target resolution
   inside a workspace-wide Board search, including lazy Boards after reload. */
const {chromium}=require('playwright'),assert=require('node:assert/strict');
const hook=`
let workspaceTargetResolutions=0;
const resolveWorkspaceTarget=codexController.canvasBoardId;
codexController.canvasBoardId=function(...args){workspaceTargetResolutions++;return resolveWorkspaceTarget.apply(this,args)};
window.WorkspacePanProbe={current:()=>activeBoard()?.id,view:()=>({...view()}),reset:()=>{workspaceTargetResolutions=0},calls:()=>workspaceTargetResolutions};
`;
(async()=>{
 const server=await require('./serve-assets.cjs')(),browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1920,height:970}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/index.html',async route=>{const response=await route.fetch();await route.fulfill({response,body:(await response.text()).replace("document.querySelector('.app').inert=true;$('#main').innerHTML=",hook+"document.querySelector('.app').inert=true;$('#main').innerHTML=")})});
  await page.addInitScript(()=>{
   if(localStorage.getItem('workspace-pan-seeded'))return;
   localStorage.setItem('workspace-pan-seeded','1');
   const boards=Array.from({length:512},(_,i)=>({id:'workspace-'+i,title:'Synthetic Board '+i,stickyLayoutVersion:1,cards:[],connections:[]})),target=boards.at(-1);
   target.cards=Array.from({length:37},(_,i)=>({id:'sticky-'+i,kind:'text',body:'Synthetic research '+i,x:60+i%10*300,y:60+Math.floor(i/10)*180,width:200,height:100,sizeMode:'manual',color:i%3?'#ffffff':'#cfe8ff',stickyLayoutVersion:1}));
   target.connections=Array.from({length:19},(_,i)=>({id:'edge-'+i,from:'sticky-'+i,to:'sticky-'+(i+1),label:'Related'}));
   localStorage.setItem('openboard.v1',JSON.stringify({boards,tabs:[],views:{}}));
  });
  await page.goto(server.url);
  await page.waitForFunction(()=>!document.querySelector('.app').inert&&!SilverlightLocalSaveStatus().pending);
  await page.locator('[data-board="workspace-511"]').evaluate(el=>el.click());
  await page.locator('[data-card="sticky-0"]').waitFor();
  await page.waitForTimeout(300);
  const verifyTarget=async()=>{
   const result=await page.evaluate(()=>{WorkspacePanProbe.reset();const views=Array.from({length:20},()=>WorkspacePanProbe.view());return {id:WorkspacePanProbe.current(),calls:WorkspacePanProbe.calls(),views}});
   assert.equal(result.id,'workspace-511');
   assert.equal(result.calls,21,'each view/current lookup resolves its target once, independent of the 512-Board search position');
   assert.ok(result.views.every(v=>Number.isFinite(v.x)&&Number.isFinite(v.scale)));
  };
  await verifyTarget();
  const before=await require('./read-workspace.cjs')(page),writes=await page.evaluate(()=>SilverlightAssetStore.stats.boardsWritten);
  await page.mouse.move(900,550);await page.mouse.down({button:'middle'});
  await page.mouse.move(1700,700,{steps:40});await page.mouse.move(200,300,{steps:60});await page.mouse.move(900,550,{steps:40});
  await page.mouse.up({button:'middle'});
  await page.mouse.move(900,500);await page.keyboard.down('Control');
  for(let i=0;i<40;i++)await page.mouse.wheel(0,i<20?-30:30);
  await page.keyboard.up('Control');await page.waitForTimeout(300);
  assert.equal(await page.evaluate(()=>SilverlightAssetStore.stats.boardsWritten),writes,'pan/zoom do not write Board bodies');
  assert.deepEqual((await require('./read-workspace.cjs')(page)).boards,before.boards,'all Boards, content and connections remain unchanged');
  const navigation=await page.evaluate(()=>WorkspacePanProbe.view());
  await verifyTarget();await page.reload();await page.locator('[data-card="sticky-0"]').waitFor();await verifyTarget();
  const restored=await page.evaluate(()=>WorkspacePanProbe.view());
  for(const key of ['x','y','scale'])assert.ok(Math.abs(restored[key]-navigation[key])<.000001,'navigation survives reload: '+key);
  assert.deepEqual(errors,[]);
  console.log('PASS: continuous middle-pan and Ctrl-wheel zoom with 512 Boards and a late-position active Board; bounded target resolution before/after lazy reload, unchanged Board data and durable navigation.');
 }finally{await browser.close();await server.close()}
})().catch(e=>{console.error(e);process.exit(1)});
