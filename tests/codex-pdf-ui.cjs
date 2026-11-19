const assert = require('node:assert/strict');
const {chromium} = require('playwright');

function makePdf(streams, bookmarks = false, protection = '') {
 const objects = [
  '<< /Type /Catalog /Pages 2 0 R'+(bookmarks ? ' /Outlines 5 0 R' : '')+' >>',
  '<< /Type /Pages /Count '+streams.length+' /Kids ['+streams.map((_,i)=>(7+2*i)+' 0 R').join(' ')+'] >>',
  '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  '<< /Title (Synthetic Archive) /Author (Test Writer) >>',
  '<< /Type /Outlines /First 6 0 R /Last 6 0 R /Count 1 >>',
  '<< /Title (Second Chapter) /Parent 5 0 R /Dest [11 0 R /Fit] >>'
 ];
 for(const stream of streams){
  const contents = objects.length+2;
  objects.push('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents '+contents+' 0 R >>');
  objects.push('<< /Length '+stream.length+' >>\nstream\n'+stream+'\nendstream');
 }
 let encryption = '';
 if(protection){
  // Standard Security Handler revision 2, with copying disabled. The first pair
  // uses user password "locked", and the second uses an empty user password.
  const [owner,user] = protection==='password'
   ? ['8df40f5d54bd4c9644693f33c07cb54f587dce1e2682fe9ecea6107a1ef630dd','a00c5c79879fb7ae90d5b11a65c4b43470f1fe4b72f5383c286341316c8306c5']
   : ['c92422687facee686e373f10b5c7d04738053152f7e2ee30e11c69ec442576ab','0ab227a2d6060df58ab094fc6d5abfff088107202e83e1daa36326c8bcf73b1d'];
  objects.push('<< /Filter /Standard /V 1 /R 2 /P -20 /O <'+owner+'> /U <'+user+'> >>');
  encryption = ' /Encrypt '+objects.length+' 0 R /ID [<00112233445566778899aabbccddeeff><00112233445566778899aabbccddeeff>]';
 }
 let contents = '%PDF-1.4\n';
 const offsets = objects.map((value,i)=>{
  const offset = contents.length;
  contents += (i+1)+' 0 obj\n'+value+'\nendobj\n';
  return offset;
 });
 const xref = contents.length;
 contents += 'xref\n0 '+(objects.length+1)+'\n0000000000 65535 f \n';
 contents += offsets.map(offset=>String(offset).padStart(10,'0')+' 00000 n \n').join('');
 return Buffer.from(contents+'trailer\n<< /Size '+(objects.length+1)+' /Root 1 0 R'+(encryption || ' /Info 4 0 R')+' >>\nstartxref\n'+xref+'\n%%EOF\n');
}

const image = 'q 72 0 0 72 36 600 cm BI /W 1 /H 1 /BPC 8 /CS /RGB /F /AHx ID ff0000> EI Q';
const fixture = makePdf([
 'BT /F1 12 Tf 40 720 Td (First line) Tj 0 -14 Td (continues here.) Tj 0 -36 Td (Next paragraph.) Tj ET',
 image,
 'BT /F1 12 Tf 40 720 Td (Searchable passage on the third page.) Tj ET'
], true);

(async()=>{
 const server = await require('./serve-assets.cjs')();
 let browser;
 try {
  browser = await chromium.launch({headless:true,channel:'msedge'});
  const page = await browser.newPage();
  const external = [];
  page.on('request',request=>{
   if(/^https?:/.test(request.url()) && new URL(request.url()).origin!==new URL(server.url).origin)external.push(request.url());
  });
  await page.goto(server.url);
  await page.waitForFunction(()=>SilverlightAssetStore.stats.writes>0);
  const result = await page.evaluate(async bytes=>{
   const progress = [];
   const imported = await SilverlightCodexImport.analyze(new File([new Uint8Array(bytes)],'archive.PDF'),{progress:text=>progress.push(text)});
   imported.chapters[1].title = 'Renamed chapter';
   const built = await SilverlightCodex.build(imported.chapters,imported.metadata,SilverlightAssets.hash);
   const entry = built.boards.filter(board=>board.codexEntry)[1];
   const note = SilverlightCodex.annotation(entry,0,18,'#ffe066');
   entry.cards.push(note);
   const copied = SilverlightCodex.copied(entry,note,text=>text);
   const restored = JSON.parse(JSON.stringify({boards:built.boards}));
   SilverlightSync.workspace(restored);
   return {imported,progress,copied,entryCount:built.overview.cards.length,research:entry.unsorted[0].codexResearch,
    matches:SilverlightCanvasDocuments.resolveSource(restored.boards,copied.citation).map(match=>match.id),entryId:entry.id};
  },[...fixture]);
  assert.equal(result.imported.format,'pdf');
  assert.equal(result.imported.metadata.title,'Synthetic Archive');
  assert.equal(result.imported.skippedPages,1);
  assert.deepEqual(result.imported.chapters.map(chapter=>chapter.pdfPage),[1,3]);
  assert.equal(result.imported.chapters[0].title,'Page 1');
  assert.equal(result.imported.chapters[0].text,'First line continues here.\n\nNext paragraph.');
  assert.match(result.progress.at(-1),/page 3 of 3/);
  assert.equal(result.entryCount,2);
  assert.equal(result.research,true);
  assert.equal(result.copied.citation.pdfPage,3);
  assert.match(result.copied.body,/Renamed chapter\. PDF page 3\./);
  assert.deepEqual(result.matches,[result.entryId]);
  const title = await page.evaluate(async bytes=>(await SilverlightCodexImport.analyze(
   new File([new Uint8Array(bytes)],'bookmark.pdf'))).chapters[1].title,[...fixture]);
  assert.equal(title,'Second Chapter — Page 3');
  async function rejection(bytes, mode) {
   return page.evaluate(async ({bytes,mode})=>{
    let cancelled = false;
    try {
     await SilverlightCodexImport.analyze(new File([new Uint8Array(bytes)],'test.pdf'),{
      cancelled:()=>cancelled,progress:text=>{if(mode==='cancel' && text.includes('page 1 of'))setTimeout(()=>{cancelled=true;},0);}
     });
     return '';
    } catch(error) { return error.message; }
   },{bytes:[...bytes],mode});
  }
  assert.match(await rejection(makePdf([image])),/no extractable text.*OCR/);
  assert.match(await rejection(Buffer.from('%PDF-1.4\ncorrupt')),/damaged or unsupported/);
  assert.match(await rejection(makePdf(Array(1001).fill(''))),/at most 1,000 pages/);
  assert.match(await rejection(makePdf([''],false,'password')),/password-protected/);
  assert.match(await rejection(makePdf([''],false,'copy')),/restricts copying/);
  assert.match(await rejection(fixture,'cancel'),/cancelled/);
  const textImports = await page.evaluate(async()=>{
   const text = await SilverlightCodexImport.analyze(new File(['Plain text.'],'notes.txt'));
   const markdown = await SilverlightCodexImport.analyze(new File(['# First\nAlpha\n\n## Second\nBravo'],'notes.md'));
   return [text.chapters,markdown.chapters];
  });
  assert.equal(textImports[0][0].text,'Plain text.');
  assert.deepEqual(textImports[1].map(chapter=>chapter.title),['First','Second']);
  await page.evaluate(bytes=>{
   document.querySelector('#importCodex').click();
   const input = document.querySelector('#codexFile');
   if(!input.accept.includes('application/pdf'))throw Error('PDF is missing from the file picker.');
   const transfer = new DataTransfer();
   transfer.items.add(new File([new Uint8Array(bytes)],'archive.pdf',{type:'application/pdf'}));
   input.files = transfer.files;
   input.dispatchEvent(new Event('change',{bubbles:true}));
  },[...fixture]);
  await page.waitForFunction(()=>!!document.querySelector('#codexImportConfirm'));
  assert.match(await page.evaluate(()=>document.querySelector('#modalRoot').textContent),/1 PDF page.*scanned pages require OCR/i);
  await page.evaluate(()=>document.querySelector('#codexImportConfirm').click());
  await page.locator('[data-card] .boardTitleBelow').filter({hasText:'Second Chapter — Page 3'}).click();
  await page.waitForFunction(()=>document.querySelector('.codexSource')?.textContent.includes('Searchable passage on the third page.'));
  assert.equal(await page.evaluate(()=>document.querySelector('.codexSource').getAttribute('contenteditable')),'false');
  await page.getByRole('button',{name:'Search chapter text',exact:true}).click();
  await page.locator('#codexSearchQuery').fill('Searchable passage');
  await page.locator('#codexSearchForm button[type=submit]').click();
  await page.locator('.codexSearchResult').click();
  assert.equal(await page.locator('.codexSearchMatch').innerText(),'Searchable passage');
  assert.deepEqual(external,[]);
  console.log('PASS: offline PDF extraction, bookmarks, original page citations, research canvases, source links, scan/invalid/limit errors, cancellation, TXT and Markdown.');
 } finally {
  await browser?.close();
  await server.close();
 }
})().catch(error=>{console.error(error);process.exitCode=1;});
