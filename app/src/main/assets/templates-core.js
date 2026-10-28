(function(root){'use strict';
 const S=typeof module!=='undefined'?require('./selection-core.js'):root.SelectionCore,clone=x=>JSON.parse(JSON.stringify(x));
 function capture(board,boards,views={}){const all={...board,cards:[...board.cards,...(board.unsorted||[])]},payload=S.make(all,all.cards.map(c=>c.id),boards),ids=new Set(board.cards.map(c=>c.id));payload.unsorted=payload.cards.filter(c=>!ids.has(c.id));payload.cards=payload.cards.filter(c=>ids.has(c.id));payload.templateVersion=2;payload.rootId=board.id;payload.boards=payload.boards.filter(b=>b.id!==board.id);payload.root=clone(board);for(const k of ['id','title','updated','cards','connections','unsorted','junctions','importPendingLinks','templateRecoveryJunctions'])delete payload.root[k];payload.importPendingLinks=clone(board.importPendingLinks||[]);payload.view=clone(views[board.id]||{x:0,y:0,scale:1});payload.views=Object.fromEntries(payload.boards.filter(b=>views[b.id]).map(b=>[b.id,clone(views[b.id])]));return payload}
 function apply(board,payload,mode,uid=()=>crypto.randomUUID()){
  if(!['unsorted','delete','append'].includes(mode))throw Error('Choose what happens to existing content.');
  const next=clone(board);let mapping;const copy=S.paste({...payload.root,...payload},uid,{unbounded:true,rootId:payload.rootId,targetId:board.id,onRemap:m=>mapping=m});
  if(mode==='unsorted'){
   next.unsorted=[...(next.unsorted||[]),...next.cards.map(c=>{const item=clone(c);item.collectionHidden=false;if(item.collectionId){item.source={...item.source,originalCollectionId:item.collectionId};delete item.collectionId}return item})];
   next.importPendingLinks=[...(next.importPendingLinks||[]),...(next.connections||[])];
   next.templateRecoveryJunctions={...next.templateRecoveryJunctions,...next.junctions};
  }
  if(mode!=='append'){next.cards=[];next.connections=[];next.junctions={}}
  if(copy.templateVersion===2&&mode!=='append')Object.assign(next,Object.fromEntries(Object.keys(copy.root||{}).map(k=>[k,copy[k]])));next.unsorted=[...(next.unsorted||[]),...(copy.unsorted||[])];next.importPendingLinks=[...(next.importPendingLinks||[]),...(copy.importPendingLinks||[])];next.cards.push(...copy.cards);next.connections=[...(next.connections||[]),...copy.connections];next.junctions={...next.junctions,...copy.junctions};next.updated=Date.now();return {board:next,boards:copy.boards,view:copy.view,views:Object.fromEntries(Object.entries(copy.views||{}).map(([id,v])=>[mapping.get(id)||id,v]))};
 }
 function note(card,template,preserve,values={}){
  const next=clone(card),layout=clone(template),escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const substitute=(text,rich)=>String(text||'').replace(/\{\{([\w .-]{1,80})\}\}/g,(all,key)=>Object.hasOwn(values,key)?(rich?escape(values[key]):String(values[key])):all);
  const old=next.body||'',rich=String(layout.body||'').startsWith('silverlight-rich-v1:');
  for(const key of ['sizeMode','title','body','color','backgroundImageData','backgroundFit','backgroundOverlay','width','height'])if(Object.hasOwn(layout,key))next[key]=key==='body'||key==='title'?substitute(layout[key],key==='body'&&rich):layout[key];
  if(preserve){next.title=card.title||next.title;const toHTML=body=>body.startsWith('silverlight-rich-v1:')?body.slice(19):escape(body).replace(/\n/g,'<br>');if(old)next.body='silverlight-rich-v1:'+toHTML(next.body||'')+'<p><br></p>'+toHTML(old)}
  if((!next.kind||['text','task'].includes(next.kind))&&next.title){const title=escape(next.title),body=next.body||'';next.body='silverlight-rich-v1:<p><strong>'+title+'</strong></p>'+(body.startsWith('silverlight-rich-v1:')?body.slice(19):escape(body).replace(/\n/g,'<br>'));next.title='';next.hideTitle=true}return next;
 }
 const api={capture,apply,note};if(typeof module!=='undefined')module.exports=api;else root.SilverlightTemplates=api;
})(globalThis);
