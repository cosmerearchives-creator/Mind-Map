window.installDesktopSelection=function(app){
 'use strict';let selected=new Set(),active=null,drag=null,lastBlank=0,localCopy=null,desktopUsed=false;
 const canvas=()=>document.querySelector('#canvas'),editing=e=>!!document.querySelector('#modalRoot').firstChild||e.target.closest?.('input,textarea,select,[contenteditable="true"]');
 function sync(){if(active!==app.board()?.id){active=app.board()?.id;selected.clear()}const ids=new Set(app.board()?.cards.map(c=>c.id)||[]);selected=new Set([...selected].filter(id=>ids.has(id)));for(const el of document.querySelectorAll('[data-card]')){el.classList.toggle('multiSelected',selected.has(el.dataset.card));if(desktopUsed)el.classList.toggle('selected',selected.has(el.dataset.card));el.setAttribute('aria-selected',String(selected.has(el.dataset.card)))}const hint=document.querySelector('#canvas .hint');if(hint&&(desktopUsed||matchMedia('(pointer:fine)').matches))hint.firstChild.textContent='Middle mouse: pan · Left drag: select · Shift-click: add/remove · Drag selection: move';}
 function stop(e){e.preventDefault();e.stopImmediatePropagation()}
 function point(e){const r=canvas().getBoundingClientRect(),v=app.view();return {x:(e.clientX-r.left-v.x)/v.scale,y:(e.clientY-r.top-v.y)/v.scale}}
 document.addEventListener('pointerdown',e=>{
  if(e.pointerType!=='mouse'){desktopUsed=false;return}desktopUsed=true;
  if(!canvas()||!e.target.closest('#canvas')||app.busy()||editing(e))return;
  sync();if(!e.target.closest('.tagToolbar')){const popup=document.querySelector('#boardActionsMenu');if(popup)popup.hidden=true;document.querySelector('#boardActionsToggle')?.setAttribute('aria-expanded','false')}
  if(e.button===1){stop(e);canvas().setPointerCapture(e.pointerId);drag={kind:'pan',id:e.pointerId,x:e.clientX,y:e.clientY,v:{...app.view()}};return}
  if(e.button!==0||e.target.closest('button,a,.wireHit,.wireLabel,[data-junction]'))return;
  const el=e.target.closest('[data-card]');
  if(el){const id=el.dataset.card;if(e.shiftKey){stop(e);selected.has(id)?selected.delete(id):selected.add(id);sync();return}
   if(!selected.has(id)){selected=new Set([id]);sync();return}
   if(selected.size<2)return;
   stop(e);canvas().setPointerCapture(e.pointerId);const ids=SelectionCore.expand(app.board(),selected);drag={kind:'move',id:e.pointerId,start:point(e),before:JSON.parse(JSON.stringify(app.board().cards)),beforeJunctions:JSON.parse(JSON.stringify(app.board().junctions||{})),ids,moved:false};return;
  }
  if(e.target.closest('.tools,.tagToolbar,.hint,.floatMenu'))return;
  stop(e);canvas().setPointerCapture(e.pointerId);const start=point(e);drag={kind:'box',id:e.pointerId,start,base:e.shiftKey?new Set(selected):new Set(),x:e.clientX,y:e.clientY};if(!e.shiftKey)selected.clear();const box=document.createElement('div');box.className='selectionBox';box.id='selectionBox';canvas().append(box);sync();
 },true);
 document.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;stop(e);
  if(drag.kind==='pan'){const v=app.view();v.x=drag.v.x+e.clientX-drag.x;v.y=drag.v.y+e.clientY-drag.y;app.transform();return}
  const p=point(e),dx=p.x-drag.start.x,dy=p.y-drag.start.y;
  if(drag.kind==='move'){
   if(!drag.moved&&Math.hypot(dx,dy)>2){app.snapshot();drag.moved=true;app.dragging([...selected])}
   if(drag.moved){for(const c of app.board().cards)if(drag.ids.has(c.id)){const old=drag.before.find(x=>x.id===c.id);c.x=old.x+dx;c.y=old.y+dy}for(const [id,j]of Object.entries(drag.beforeJunctions))if(drag.ids.has(id)&&(app.board().connections||[]).filter(e=>e.from===id).every(e=>drag.ids.has(e.to))&&Number.isFinite(j.x)&&Number.isFinite(j.y))app.board().junctions[id]={...j,x:j.x+dx,y:j.y+dy};app.draw();sync()}return;
  }
  const left=Math.min(p.x,drag.start.x),top=Math.min(p.y,drag.start.y),right=Math.max(p.x,drag.start.x),bottom=Math.max(p.y,drag.start.y),v=app.view(),box=document.querySelector('#selectionBox');if(box)Object.assign(box.style,{left:(left*v.scale+v.x)+'px',top:(top*v.scale+v.y)+'px',width:((right-left)*v.scale)+'px',height:((bottom-top)*v.scale)+'px'});
  selected=new Set(drag.base);for(const c of app.board().cards){const size=app.size(c);if(!c.collectionHidden&&c.x>=left&&c.y>=top&&c.x+size.width<=right&&c.y+size.height<=bottom)selected.add(c.id)}sync();
 },true);
 function end(e){if(!drag||drag.id!==e.pointerId)return;stop(e);const g=drag;drag=null;document.querySelector('#selectionBox')?.remove();
  if(e.type==='pointercancel'){if(g.kind==='move'&&g.moved){app.board().cards=g.before;app.board().junctions=g.beforeJunctions;app.dragging(null);app.draw()}sync();return}
  if(g.kind==='move'&&g.moved){const roots=[...selected].filter(id=>{let c=app.board().cards.find(c=>c.id===id),seen=new Set();while(c?.collectionId&&!seen.has(c.collectionId)){if(selected.has(c.collectionId))return false;seen.add(c.collectionId);c=app.board().cards.find(x=>x.id===c.collectionId)}return true});for(const id of roots){const c=app.board().cards.find(c=>c.id===id);app.drop(c,g)}app.dragging(null);app.commit();app.draw()}
  if(g.kind==='pan')app.persist();
  if(g.kind==='box'&&Math.hypot(e.clientX-g.x,e.clientY-g.y)<4){const now=Date.now();if(now-lastBlank<350){app.create(e.clientX,e.clientY);lastBlank=0}else lastBlank=now}
  sync();
 }
 document.addEventListener('pointerup',end,true);document.addEventListener('pointercancel',end,true);
 document.addEventListener('auxclick',e=>{if(e.button===1&&e.target.closest('#canvas'))e.preventDefault()});
 async function copy(e){if(editing(e)||!canvas()||!selected.size)return;stop(e);try{localCopy=SelectionCore.make(app.board(),selected,app.boards());const text=JSON.stringify(localCopy);if(new TextEncoder().encode(text).length>16*1024*1024)throw Error('Selection exceeds 16 MB.');if(window.SilverlightClipboard?.canWrite)await app.clipboard('write',null,null,text);else if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(text);else throw Error('Clipboard is unavailable.')}catch(error){alert(error.message)}}
 document.addEventListener('keydown',e=>{if(editing(e)||!canvas())return;if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='c'){copy(e)}if(e.key==='Escape'){selected.clear();sync()}},true);
 document.addEventListener('copy',e=>{if(editing(e)||!canvas()||!selected.size)return;e.preventDefault();localCopy=SelectionCore.make(app.board(),selected,app.boards());e.clipboardData?.setData('text/plain',JSON.stringify(localCopy));e.clipboardData?.setData(SelectionCore.MIME,JSON.stringify(localCopy));},true);
 document.addEventListener('paste',e=>{
  if(editing(e)||!canvas())return;const raw=e.clipboardData?.getData(SelectionCore.MIME)||e.clipboardData?.getData('text/plain');if(!raw?.includes('silverlight-selection-v1'))return;
  let payload;try{payload=JSON.parse(raw)}catch{return}if(payload.format!==SelectionCore.FORMAT)return;stop(e);
  try{const result=SelectionCore.paste(payload),v=app.view(),r=canvas().getBoundingClientRect(),minX=Math.min(...result.cards.map(c=>c.x)),minY=Math.min(...result.cards.map(c=>c.y)),dx=(r.width*.3-v.x)/v.scale-minX,dy=(r.height*.25-v.y)/v.scale-minY;
   for(const c of result.cards){c.x+=dx;c.y+=dy}for(const j of Object.values(result.junctions||{})){if(Number.isFinite(j.x))j.x+=dx;if(Number.isFinite(j.y))j.y+=dy}const b=app.board(),updated={...b,cards:[...b.cards,...result.cards],connections:[...(b.connections||[]),...result.connections],junctions:{...(b.junctions||{}),...(result.junctions||{})}},workspace={boards:app.boards().map(x=>x.id===b.id?updated:x).concat(result.boards)};SilverlightSync.workspace(workspace);if(new TextEncoder().encode(JSON.stringify(workspace)).length>SilverlightSync.MAX_BYTES)throw Error('Selection would exceed the workspace size limit.');
   app.mutate(()=>{b.cards.push(...result.cards);b.junctions={...(b.junctions||{}),...(result.junctions||{})};b.connections=[...(b.connections||[]),...result.connections];app.boards().push(...result.boards);b.updated=Date.now()});selected=new Set(result.cards.map(c=>c.id));sync();
  }catch(error){alert('Selection paste failed: '+error.message)}
 },true);
 const css=document.createElement('style');css.textContent='.transparentSticky{background:transparent!important;border-color:transparent;box-shadow:none}.clipboardSticky .richBody h1{font-size:22px;line-height:1.2;margin:0 0 .4em}.clipboardSticky .richBody h2{font-size:20px;line-height:1.2;margin:0 0 .4em}.clipboardSticky .richBody h3{font-size:18px;line-height:1.2;margin:0 0 .4em}.note.multiSelected{outline:2px solid #796b96;outline-offset:2px}.selectionBox{position:absolute;border:1px solid #796b96;background:#796b9622;pointer-events:none;z-index:10000}.importedSticky .noteBody,.importedSticky .nestedFullButton{color:inherit}.importedSticky .noteTitle{color:inherit}';document.head.append(css);
 return {sync,ids:()=>[...selected]};
};
