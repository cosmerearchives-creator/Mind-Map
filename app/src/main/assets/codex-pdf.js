import * as pdf from './vendor/pdfjs/pdf.js';

const maxPages = 1000;
const maxPageText = 256 * 1024;
const maxDocumentText = 8 * 1024 * 1024;
const maxPageItems = 100000;
const timeoutMs = 3 * 60 * 1000;
class ImportError extends Error {}

async function bookmarkTitles(document) {
 const titles = new Map();
 const pending = (await document.getOutline() || []).slice(0, maxPages).reverse();
 for(let visited=0; pending.length && visited<maxPages; visited++){
  const bookmark = pending.pop();
  const title = String(bookmark.title || '').replace(/\s+/g,' ').trim().slice(0, 480);
  if(title && bookmark.dest){
   try {
    const destination = typeof bookmark.dest === 'string'
     ? await document.getDestination(bookmark.dest) : bookmark.dest;
    const target = destination?.[0];
    const index = Number.isInteger(target) ? target : target && await document.getPageIndex(target);
    if(Number.isInteger(index) && index>=0 && index<document.numPages && !titles.has(index+1)){
     titles.set(index+1, title);
    }
   } catch { /* Ignore broken bookmarks. */ }
  }
  const children = bookmark.items || [];
  for(let i=Math.min(children.length, maxPages-pending.length)-1; i>=0; i--)pending.push(children[i]);
 }
 return titles;
}

async function pageText(page, remaining) {
 const reader = page.streamTextContent().getReader();
 const parts = [];
 let size = 0, count = 0, previous = null;
 try {
  while(true){
   const {value, done} = await reader.read();
   if(done)break;
   for(const item of value.items){
    if(++count>maxPageItems)throw new ImportError('A PDF page exceeds the text complexity limit.');
    if(typeof item.str !== 'string')continue;
    const text = item.str.replace(/\u0000/g,'');
    if(text){
     let separator = '';
     if(previous){
      const [,,,, x, y] = item.transform;
      const [,,,, oldX, oldY] = previous.transform;
      const height = Math.max(Math.abs(previous.height), Math.abs(item.height), 1);
      if(previous.dir==='ltr' && item.dir==='ltr' && Math.abs(y-oldY)>height*1.6){
       separator = '\n\n';
      }else if(!/\s$/.test(parts.at(-1)) && !/^\s/.test(text) &&
       (previous.hasEOL || (previous.dir==='ltr' && item.dir==='ltr' &&
        x-oldX-previous.width>height*.18))){
       separator = ' ';
      }
     }
     size += separator.length+text.length;
     if(size>maxPageText || size>remaining)throw new ImportError('PDF text exceeds the import limit. Split the PDF into smaller files.');
     if(separator)parts.push(separator);
     parts.push(text);
     previous = item;
    }else if(item.hasEOL && previous)previous = {...previous,hasEOL:true};
   }
  }
  return parts.join('').trim();
 } finally {
  // Cancellation may already have closed the worker transport.
  void reader.cancel().catch(()=>{});
 }
}

export async function extract(data, metadata, {cancelled, progress}) {
 const asset = path => new URL(path, import.meta.url).href;
 if(cancelled())throw Error('Import cancelled.');
 // A dedicated worker can be stopped even while parsing a damaged content stream.
 const port = new Worker(asset('vendor/pdfjs/pdf.worker.js'), {type:'module'});
 const worker = new pdf.PDFWorker({port});
 const task = pdf.getDocument({
  data,
  worker,
  isEvalSupported:false,
  useSystemFonts:false,
  stopAtErrors:true,
  cMapUrl:asset('vendor/pdfjs/cmaps/'),
  cMapPacked:true,
  standardFontDataUrl:asset('vendor/pdfjs/standard_fonts/')
 });
 let timer, pageNumber = 0;
 const interrupted = new Promise((_, reject)=>{
  const start = Date.now();
  const stop = message => reject(new ImportError(message));
  port.addEventListener('error', event=>{
   event.preventDefault();
   stop('Could not start the offline PDF reader.');
  }, {once:true});
  task.onPassword = () => stop('This PDF is password-protected. Import an unlocked copy.');
  timer = setInterval(()=>{
   if(cancelled())stop('Import cancelled.');
   else if(Date.now()-start>timeoutMs)stop('PDF import timed out. Try a smaller PDF.');
  }, 100);
 });
 async function read() {
  const document = await task.promise;
  if(document.numPages>maxPages)throw new ImportError('Choose a PDF with at most 1,000 pages.');
  const permissions = await document.getPermissions();
  if(permissions && !permissions.includes(pdf.PermissionFlag.COPY)){
   throw new ImportError('This PDF restricts copying text. Import a copy that allows text extraction.');
  }
  const info = (await document.getMetadata().catch(()=>null))?.info;
  const clean = value => typeof value==='string' ? value.trim().slice(0, 2000) : '';
  metadata.title = clean(info?.Title) || metadata.title;
  metadata.author = clean(info?.Author);
  const titles = await bookmarkTitles(document).catch(()=>new Map());
  const chapters = [];
  let length = 0;
  for(pageNumber=1; pageNumber<=document.numPages; pageNumber++){
   if(cancelled())throw new ImportError('Import cancelled.');
   progress('Extracting PDF page '+pageNumber+' of '+document.numPages+'…');
   if(cancelled())throw new ImportError('Import cancelled.');
   const page = await document.getPage(pageNumber);
   const text = await pageText(page, maxDocumentText-length);
   page.cleanup();
   if(!text || !/[^\s\p{C}\uFFFD]/u.test(text))continue;
   length += text.length;
   const bookmark = titles.get(pageNumber);
   chapters.push({title:(bookmark ? bookmark+' — ' : '')+'Page '+pageNumber,text,pdfPage:pageNumber});
  }
  if(cancelled())throw new ImportError('Import cancelled.');
  if(!chapters.length)throw new ImportError('This PDF has no extractable text. Scanned or image-only PDFs require OCR before import.');
  return {metadata,chapters,format:'pdf',skippedPages:document.numPages-chapters.length};
 }
 try {
  return await Promise.race([read(),interrupted]);
 } catch(error) {
  if(error instanceof ImportError)throw error;
  if(error.name==='PasswordException')throw Error('This PDF is password-protected. Import an unlocked copy.');
  throw Error(pageNumber ? 'Could not read PDF page '+pageNumber+'. The PDF may be damaged or unsupported.'
   : 'Could not open this PDF. The file may be damaged or unsupported.');
 } finally {
  clearInterval(timer);
  // Start teardown immediately without making cancellation wait for a busy worker.
  void task.destroy().catch(()=>{});
  worker.destroy();
  port.terminate();
 }
}
