const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),fflate=require('../app/src/main/assets/vendor/fflate/fflate.js');
(async()=>{
 const dir=process.env.MILANOTE_PDF_DIR;if(!dir)throw Error('Set MILANOTE_PDF_DIR.');
 const assets=path.resolve('app/src/main/assets'),server=http.createServer((req,res)=>{
  const file=path.resolve(assets,'.'+decodeURIComponent(req.url.split('?')[0]));
  if(!file.startsWith(assets+path.sep)){res.writeHead(403).end();return}
  try{res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.html')?'text/html':'application/octet-stream');res.end(fs.readFileSync(file))}catch{res.writeHead(404).end()}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({headless:true,channel:'msedge'});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.route('https://**',r=>r.abort());
  const dust=fs.readFileSync(path.join(dir,'canvas_Dustbringers-261023_0531.pdf')),vasher=fs.readFileSync(path.join(dir,'canvas_Vasher-261023_0539.pdf'));
  const main='Archive/canvas_Dustbringers-261023_0531.pdf',child='Archive/canvas_Dustbringer Radiants-261023_0539.pdf',duplicate='Archive/canvas_Dustbringer Radiants-261022_0539.pdf';
  const zip=fflate.zipSync({[main]:dust,[child]:vasher,[duplicate]:vasher},{level:1});
  await page.goto('http://127.0.0.1:'+server.address().port+'/index.html');
  const chooser=page.waitForEvent('filechooser');await page.locator('#pdfImport').click();await(await chooser).setFiles({name:'Flat.zip',mimeType:'application/zip',buffer:Buffer.from(zip)});
  await page.locator('#importLayout').waitFor();assert.equal(await page.locator('#importLayout').inputValue(),'flat');assert.equal(await page.locator('#analyzeImport').isDisabled(),true);
  await page.locator('[data-root-group="0"]').selectOption(main);await page.locator('#analyzeImport').click();await page.locator('#commitMilanote').waitFor({timeout:60000});
  assert.equal(await page.locator('#commitMilanote').isDisabled(),true);assert.ok((await page.locator('#milanoteSummary').innerText()).includes('more than one filename'));
  await page.locator('[data-nested-target]').first().selectOption(child);assert.equal(await page.locator('#commitMilanote').isDisabled(),false);
  await page.locator('#commitMilanote').click();await page.waitForTimeout(500);
  const read=()=>page.evaluate(()=>new Promise(resolve=>{const q=indexedDB.open('openboard-workspace',1);q.onsuccess=()=>{const r=q.result.transaction('documents').objectStore('documents').get('main');r.onsuccess=()=>resolve(JSON.parse(r.result.state))}}));
  let saved=await read();const root=saved.boards.find(b=>b.source?.path===main),nested=saved.boards.find(b=>b.source?.path===child);assert.ok(root&&nested);assert.equal(saved.boards.some(b=>b.source?.path===duplicate),false);assert.equal(root.cards.find(c=>c.kind==='nested').boardId,nested.id);
  const note=root.cards.find(c=>c.title==='Ashspren');assert.equal(note.kind,'text');assert.equal(note.body,'(EMPTY BOARD ON IMPORT - CHANGE TO NESTED TO USE AS NEW BOARD)');assert.equal(note.hideTitle,false);assert.equal(note.boardId,undefined);
  await page.reload();await page.locator('[data-card]').first().waitFor();saved=await read();assert.equal(saved.boards.find(b=>b.id===root.id).cards.find(c=>c.id===note.id).body,note.body);
  await page.locator('[data-card="'+note.id+'"] .noteMenu').click();
  // Notes produced from missing PDFs remain normal editable Notes with conversion available.
  assert.equal(await page.locator('#nestedToggle').isChecked(),false);assert.equal(await page.locator('#cardTitle').inputValue(),'Ashspren');await page.locator('#nestedToggle').check();await page.locator('#confirm').click();await page.waitForTimeout(400);saved=await read();const converted=saved.boards.find(b=>b.id===root.id).cards.find(c=>c.id===note.id);assert.equal(converted.kind,'nested');assert.ok(saved.boards.some(b=>b.id===converted.boardId&&b.title==='Ashspren'));assert.equal(converted.body,note.body);
  assert.deepEqual(errors,[]);
  console.log('PASS: flat ZIP main selector, duplicate-name blocking and explicit PDF resolution, inferred nesting, exact missing-board Note, persistence and no duplicate Board.');
 }finally{await browser.close();await new Promise(r=>server.close(r))}
})().catch(e=>{console.error(e);process.exit(1)});
