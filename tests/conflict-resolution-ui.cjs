const {chromium}=require('playwright'),assert=require('node:assert/strict');
(async()=>{const server=await require('./serve-assets.cjs')(),browser=await chromium.launch({headless:true,channel:'msedge'});
try{for(const mobile of [false,true])for(const choice of [0,1,2]){
 const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1280,height:900}});
 await server.attach(page);await page.goto(server.url);
 await page.evaluate(async()=>{
  const board=title=>({id:'synthetic',title,cards:[{id:'note',kind:'text',body:'<p>Readable <b>research</b> &amp; notes</p>',x:0,y:0}],connections:[]});
  let workspace={boards:[board('Version A')],tabs:[],views:{},active:null};
  const a=await SilverlightAuto.capture(SilverlightAuto.empty('a','test','account'),workspace);
  const b=await SilverlightAuto.capture(SilverlightAuto.empty('b','test','account'),{...workspace,boards:[board('Version B')]});
  let meta={...a,enabled:true,records:SilverlightAuto.merge(a.records,b.records),conflicts:['synthetic'],missing:[]};
  window.fixture={original:JSON.stringify(meta),fail:true,writes:0};
  const app={ready:()=>true,canSync:()=>true,getState:()=>workspace,readSync:async()=>meta,
   writeSync:async(w,next,expected,review,recovery)=>{if(fixture.fail)throw Error('Synthetic storage failure');fixture.writes++;fixture.recovery=recovery;meta=next;if(w)workspace=w},
   modal:(title,body,actions)=>{document.querySelector('#modalRoot').innerHTML='<div class="modal"><h2>'+title+'</h2>'+body+'<div class="actions">'+actions+'</div></div>'},close:()=>document.querySelector('#modalRoot').innerHTML=''};
  window.fixture.read=()=>({workspace,meta});
  const transport={isManualBusy:()=>false,show:()=>{},request:()=>new Promise(resolve=>window.fixture.release=()=>resolve({connected:false}))};
  const auto=installAutoSync(app,transport);await auto.start();
  app.modal('Drive','','');auto.decorate();window.fixture.auto=auto;
 });
 await page.waitForFunction(()=>window.fixture.release);
 await page.locator('#autoResolve').click();
 assert.ok((await page.locator('#autoConflicts').innerText()).includes('Readable research & notes'));
 assert.ok(!(await page.locator('#autoConflicts').innerText()).includes('<p>'));
 const selector=choice===2?'Keep all BOARD versions':'Use version '+(choice+1);
 await page.getByRole('button',{name:selector,exact:choice===2}).click();
 await page.getByText('Waiting for the current sync to finish. All versions are preserved.',{exact:true}).waitFor();
 assert.equal(await page.locator('#autoConflictClose').isDisabled(),true);
 await page.evaluate(()=>fixture.release());
 await page.getByText('Could not resolve: Synthetic storage failure',{exact:true}).waitFor();
 assert.equal(await page.evaluate(()=>JSON.stringify(fixture.read().meta)===fixture.original),true);
 assert.equal(await page.locator('#autoConflictClose').isEnabled(),true);
 await page.evaluate(()=>fixture.fail=false);
 await page.getByRole('button',{name:selector,exact:choice===2}).click();
 await page.waitForFunction(()=>fixture.writes===1);
 const result=await page.evaluate(()=>({titles:fixture.read().workspace.boards.map(b=>b.title),versions:fixture.recovery.records[0].versions.length,conflicts:fixture.read().meta.conflicts}));
 assert.equal(result.versions,2);assert.deepEqual(result.conflicts,[]);assert.equal(result.titles.length,2);
 assert.ok(result.titles.some(x=>x.startsWith('Version A')));assert.ok(result.titles.some(x=>x.startsWith('Version B')));
 if(choice!==2)assert.equal(result.titles[0],choice===0?'Version A':'Version B');
 await page.close();
}console.log('PASS: desktop/mobile all three conflict actions queue behind busy sync, show progress/errors, preserve versions after storage failure, retry, and retain full conflict recovery; previews show decoded text.');
}finally{await browser.close();await server.close()}})().catch(e=>{console.error(e);process.exit(1)});
