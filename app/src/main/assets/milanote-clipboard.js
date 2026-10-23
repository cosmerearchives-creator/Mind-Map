/* Milanote clipboard protocol adapter. Source objects are data, never executable code. */
(function(root){'use strict';
const MIME='application/milanote-elements',PREFIX='silverlight-rich-v1:',MAX_BYTES=64*1024*1024;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const web=s=>typeof s==='string'&&/^https?:\/\//i.test(s)?s:null;
const style=a=>Object.entries(a||{}).filter(([k,v])=>['color','background-color','font-family','font-size','text-align','margin-left'].includes(k)&&typeof v==='string'&&!/url|expression|[<>";]/i.test(v)).map(([k,v])=>k+':'+v).join(';');
const palette={RED:'#ff5757',BLUE:'#4ebafd',DEEP_BLUE:'#5882f8',CHARCOAL:'#5f6672',GREY:'#bbbec3',CYAN:'#62dbc8',GREEN:'#7cd651',BROWN:'#d58558',YELLOW:'#ffd14d',ORANGE:'#ff8d48',PINK:'#ff6ed4',PURPLE:'#ad6fff',WHITE:'#ffffff'};
function color(value){if(typeof value!=='string')return null;let v=palette[value]||value;if(/^#[a-f0-9]{3}$/i.test(v))v='#'+[...v.slice(1)].map(x=>x+x).join('');return /^#[a-f0-9]{6}$/i.test(v)?v:null}
function contrast(value){const hex=color(value)||'#ffffff',v=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4),l=v[0]*.2126+v[1]*.7152+v[2]*.0722;return (l+.05)/.05<1.05/(l+.05)?'#ffffff':'#222222'}
function rich(value,depth=0){
 if(depth>40)throw Error('Clipboard text nesting is too deep.');
 if(value==null)return '';if(value._html)return String(value._html);if(typeof value==='string'){try{if(/^[{[]/.test(value))return rich(JSON.parse(value),depth+1)}catch{}return esc(value).replace(/\n/g,'<br>')}
 if(Array.isArray(value))return value.map(x=>rich(x,depth+1)).join('');
 if(value.blocks){return value.blocks.map(b=>{
  const text=String(b.text||''),ranges=b.inlineStyleRanges||[],entities=b.entityRanges||[],cuts=new Set([0,text.length]);
  for(const r of [...ranges,...entities]){cuts.add(Math.max(0,Math.min(text.length,r.offset)));cuts.add(Math.max(0,Math.min(text.length,r.offset+r.length)))}
  const points=[...cuts].sort((a,b)=>a-b);let body='';
  for(let i=0;i<points.length-1;i++){const start=points[i],end=points[i+1];let part=esc(text.slice(start,end));for(const r of ranges.filter(r=>r.offset<=start&&r.offset+r.length>=end)){const tags={BOLD:'b',ITALIC:'i',UNDERLINE:'u',STRIKETHROUGH:'s',CODE:'code'},tag=tags[r.style];if(tag)part='<'+tag+'>'+part+'</'+tag+'>';else if(/^color-#[a-f0-9]{3,8}$/i.test(r.style))part='<span style="color:'+esc(r.style.slice(6))+'">'+part+'</span>'}for(const r of entities.filter(r=>r.offset<=start&&r.offset+r.length>=end)){const entity=value.entityMap?.[r.key],href=web(entity?.data?.url);if(entity?.type==='LINK'&&href)part='<a href="'+esc(href)+'">'+part+'</a>'}body+=part}
  const tags={'header-one':'h1','header-two':'h2','header-three':'h3','blockquote':'blockquote','code-block':'pre'},tag=tags[b.type]||'p';if(b.type==='unordered-list-item'||b.type==='ordered-list-item'){const list=b.type==='ordered-list-item'?'ol':'ul';return '<'+list+'><li>'+body+'</li></'+list+'>'}return '<'+tag+'>'+body+'</'+tag+'>';
 }).join('')}
 const a=value.attrs||{};let body=value.type==='text'?esc(value.text||''):rich(value.content||[],depth+1);
 for(const m of value.marks||[]){const tags={bold:'b',italic:'i',underline:'u',strike:'s',code:'code'},tag=tags[m.type];if(tag)body='<'+tag+'>'+body+'</'+tag+'>';else if(m.type==='link'&&web(m.attrs?.href))body='<a href="'+esc(m.attrs.href)+'">'+body+'</a>';else if(m.type==='textStyle'||m.type==='highlight'){const x=m.attrs||{},css=style(m.type==='highlight'?{'background-color':x.color||'#ffff00'}:{color:x.color,'font-family':x.fontFamily,'font-size':x.fontSize});body='<span style="'+esc(css)+'">'+body+'</span>'}}
 if(value.type==='inlineBoardLink')return esc(a.title||'Board link');if(value.type==='hardBreak')return '<br>';
 const tags={paragraph:'p',heading:'h'+Math.max(1,Math.min(6,Number(a.level)||2)),blockquote:'blockquote',bulletList:'ul',orderedList:'ol',listItem:'li',taskList:'ul',taskItem:'li',taskListTitle:'h3',codeBlock:'pre',smallText:'p',callout:'blockquote'},tag=tags[value.type];
 return tag?'<'+tag+(a.textAlign?' style="'+esc(style({'text-align':a.textAlign}))+'"':'')+'>'+body+'</'+tag+'>':body;
}
function decode(data){
 let raw=data.getData(MIME)||data.getData('web '+MIME),marked=!!raw;
 const html=data.getData('text/html')||'';
 if(!raw&&/data-milanote-elements\s*=/i.test(html)){
  marked=true;if(typeof document!=='undefined'){const template=document.createElement('template');template.innerHTML=html;raw=template.content.querySelector('[data-milanote-elements]')?.getAttribute('data-milanote-elements')}
  else{const m=html.match(/data-milanote-elements\s*=\s*(["'])([\s\S]*?)\1/i);raw=m?.[2]?.replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&')}
 }
 if(!raw){const text=data.getData('text/plain')||'';if(text.includes('"elements"')&&text.includes('"saveId"')){try{const p=JSON.parse(text);if(Array.isArray(p.elements)&&p.operation&&p.saveId){raw=text;marked=true}}catch{}}}
 if(!marked)return null;
 if(!raw||new TextEncoder().encode(raw).length>MAX_BYTES)throw Error('Milanote clipboard data is empty or exceeds 64 MB. Copy a smaller selection.');
 let payload;try{payload=JSON.parse(raw)}catch{throw Error('Milanote clipboard data could not be decoded. Copy the cards again.')}
 if(!payload||!Array.isArray(payload.elements)||payload.elements.length>5000)throw Error('Unsupported Milanote clipboard structure. Copy up to 5,000 elements.');
 return payload;
}
function translate(payload,existing=[],destinationId,uid=()=>crypto.randomUUID()){
 const elements=payload.elements,byId=new Map(),issues=[...(payload.recoveryIssues||[])],boards=[],cards=[],unsorted=[],connections=[],importPendingLinks=[],boardIds=new Map(),cardIds=new Map();
 const id=e=>String(e.id||e._id||'');
 for(const e of elements){if(!e||typeof e!=='object'||!id(e)||byId.has(id(e)))throw Error('Milanote clipboard contains missing or duplicate element IDs.');byId.set(id(e),e);cardIds.set(id(e),uid())}
 const children=pid=>elements.filter(e=>String(e.location?.parentId||'')===pid);
 for(const e of elements)if(e.elementType==='BOARD'){const bid=uid();boardIds.set(id(e),bid);boards.push({id:bid,title:String(e.content?.title||'Imported Board'),cards:[],unsorted:[],connections:[],importPendingLinks:[],updated:Date.now(),source:{type:'milanote-clipboard',milanoteId:id(e)}})}
 function owner(e){let current=e,seen=new Set([id(e)]);for(let i=0;i<50;i++){const pid=String(current.location?.parentId||'');if(!byId.has(pid))return destinationId;if(seen.has(pid))throw Error('Milanote clipboard contains a containment cycle.');seen.add(pid);if(boardIds.has(pid))return boardIds.get(pid);current=byId.get(pid)}throw Error('Milanote clipboard containment is too deep.')}
 const parents=new Map(),made=new Map(),num=(v,f=0)=>Number.isFinite(Number(v))?Math.max(-1000000,Math.min(1000000,Number(v))):f;
 for(const e of elements){
  if(e.elementType==='LINE'&&!e.content?._imageData)continue;
  const c=e.content||{},pos=e.location?.position||{},measure=e.measurements||{},type=e.elementType,bid=owner(e);
  const o={id:cardIds.get(id(e)),kind:'text',title:String(c.title||''),body:PREFIX+rich(c.textContent||c.caption||''),x:num(pos.x)*10,y:num(pos.y)*10,width:Math.max(20,num(measure.width,num(c.width,34)*10)),height:Math.max(20,num(measure.height,num(c.height,c.autoHeight===false?(c.minHeight||c.maxHeight||18):Math.max(8,Math.min(42,6+JSON.stringify(c.textContent||'').length/28)))*10)),color:color(c.background?.color||c.color)||'#ffffff',source:{type:'milanote-clipboard',milanoteId:id(e),elementType:type}};
  o.source.importAutoHeight=!measure.height&&!c.height&&c.autoHeight!==false;
  o.textColor=color(c.secondaryColor)||contrast(o.color);o.layer=num(pos.score);if(c.transparent?.enabled)o.transparent=true;
  if(JSON.stringify(c.textContent||'').includes('inlineBoardLink')){o.source.originalTextContent=c.textContent;issues.push('Inline Board references are retained as their titles; their original structured text is saved in source metadata.')}
  if(type==='CARD'||type==='DOCUMENT'||type==='TASK'||type==='TASK_LIST'){o.hideTitle=!o.title;if(type==='TASK'||type==='TASK_LIST')issues.push('Tasks are imported as editable Notes; assignment and due-date behavior is not transferred.')}
  else if(type==='COLUMN'){o.kind='collection';o.title=o.title||'Collection';o.collectionLayout='free';o.collectionHeaderHeight=70;o.width=Math.max(300,o.width);o.height=Math.max(240,o.height);if(!children(id(e)).length)issues.push('Collection '+o.title+' contains no member objects in this clipboard selection.')}
  else if(type==='BOARD'||type==='ALIAS'){
   const candidates=existing.filter(b=>b.source?.type==='milanote-clipboard'&&b.source.milanoteId===String(c.linkTo||id(e)));
   const target=boardIds.get(type==='ALIAS'?String(c.linkTo||''):id(e))||(candidates.length===1?candidates[0].id:null);if(type==='ALIAS')o.source.destinationMilanoteId=String(c.linkTo||'');
   if(target){o.kind=type==='ALIAS'?'shortcut':'nested';o.boardId=target;o.body='';o.titlePosition=parents.has(id(e))?'beside':'below';o.titleLabelWidth=130;o.width=num(c.width,8)*10;o.height=80;o.boardIconData=c._iconData||'';o.backgroundImageData=c._iconData||'';o.backgroundOverlay=0;o.backgroundFit='contain'}
   else{o.body='(EMPTY BOARD ON IMPORT - CHANGE TO NESTED TO USE AS NEW BOARD)';o.width=260;o.height=180;issues.push('Board '+o.title+' has no copied contents or known destination; retained as a Note. Copying a tile does not guarantee that its descendants are included.')}
  }else if(type==='LINK'){o.kind='link';o.url=web(c.url||c.link?.url)||'';o.title=o.title||c.link?.title||o.url;o.body=PREFIX+rich(c.caption||c.link?.description||'')}
  else if(type==='IMAGE'||type==='ANNOTATION'||type==='SKETCH'||type==='LINE'){
   const image=c.image||{},src=c._mediaFailed?null:[c._imageData,image.original,image.huge,image.large,image.regular].find(x=>typeof x==='string'&&/^data:image\/(png|jpe?g|webp|gif);base64,/i.test(x));
   if(src){o.kind='image';o.imageData=src;o.imageMode='raw';o.hideTitle=true;o.imageWidth=o.width;o.height=num(c.height,o.width*(image.height||c.drawing?.height||200)/(image.width||c.drawing?.width||340)/10)*10;o.imageHeight=o.height}else{o.body=PREFIX+rich(c.caption||'Image requires its original file.');if(c.drawing)o.source.originalDrawing=c.drawing;o.source.imageReference=[image.original,image.huge,image.large,image.regular].find(x=>typeof x==='string')||'';issues.push('Image '+(o.title||id(e))+' is a remote or private reference. Its pixels are not embedded in this clipboard payload.')}
  }else{o.title=o.title||type||'Unsupported element';issues.push('Unsupported '+type+' retained as a Note; source content is saved for review.');o.source.unsupportedContent=JSON.stringify(c)}
  if(type==='LINE'&&c._lineBox){Object.assign(o,{x:o.x+c._lineBox.x,y:o.y+c._lineBox.y,width:c._lineBox.width,height:c._lineBox.height,imageWidth:c._lineBox.width,imageHeight:c._lineBox.height});o.source.importAutoHeight=false}
  const pid=String(e.location?.parentId||'');if(byId.get(pid)?.elementType==='COLUMN'){parents.set(id(e),pid);if(['nested','shortcut'].includes(o.kind)){o.titlePosition='beside';o.width=260;o.height=74;o.color='#ffffff';o.textColor='#222222';delete o.backgroundImageData}}
  let inInbox=e.location?.section==='INBOX';let ancestor=byId.get(pid);for(let depth=0;ancestor&&depth<50;depth++){if(ancestor.location?.section==='INBOX')inInbox=true;ancestor=byId.get(String(ancestor.location?.parentId||''))}made.set(id(e),{o,bid,e,inInbox});const dest=bid===destinationId?{cards,unsorted}:boards.find(b=>b.id===bid);(inInbox?dest.unsorted:dest.cards).push(o);if(inInbox){o.source.originalCollectionId=cardIds.get(parents.get(id(e)));o.source.importOrder=num(pos.index,num(pos.score));}
 }
 for(const [sid,pid]of parents){const item=made.get(sid),parent=made.get(pid);if(!item||!parent||item.bid!==parent.bid||item.inInbox)continue;item.o.collectionId=parent.o.id;const peers=children(pid).filter(e=>made.has(id(e))),i=peers.findIndex(e=>id(e)===sid);item.o.x=parent.o.x+18;item.o.y=parent.o.y+78+peers.slice(0,i).reduce((sum,e)=>sum+(made.get(id(e))?.o.height||120)+12,0);parent.o.height=Math.max(parent.o.height,item.o.y-parent.o.y+item.o.height+18);parent.o.width=Math.max(parent.o.width,item.o.width+36)}
 for(const e of elements.filter(e=>e.elementType==='LINE')){
  const c=e.content||{};if(c._imageData&&!c.start?.elementId&&!c.end?.elementId)continue;const from=made.get(String(c.start?.elementId||'')),to=made.get(String(c.end?.elementId||''));
  if(!from||!to||from.bid!==to.bid){issues.push('A connector endpoint is missing or belongs to another Board. Copy both endpoint cards together.');continue}
  const arrow=v=>/arrow/i.test(String(v||''));let direction=arrow(c.startStyle)&&arrow(c.endStyle)?'both':arrow(c.startStyle)?'backward':arrow(c.endStyle)?'forward':'none';
  const link={id:uid(),from:from.o.id,to:to.o.id,direction,...(c.lineLabelEnabled&&c.lineLabel?{label:String(c.lineLabel)}:{})};const dest=from.bid===destinationId?{connections,importPendingLinks}:boards.find(b=>b.id===from.bid);(from.inInbox||to.inInbox?dest.importPendingLinks:dest.connections).push(link);
 }
 unsorted.sort((a,b)=>(a.source.importOrder||0)-(b.source.importOrder||0));for(const b of boards)b.unsorted.sort((a,z)=>(a.source.importOrder||0)-(z.source.importOrder||0));
 return {cards,unsorted,connections,importPendingLinks,boards,issues:[...new Set(issues)],sourceCount:elements.length};
}
const api={MIME,MAX_BYTES,decode,translate,rich,color,contrast};if(typeof module!=='undefined')module.exports=api;else root.MilanoteClipboard=api;
})(globalThis);
