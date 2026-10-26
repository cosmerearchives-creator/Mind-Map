(function(root){'use strict';
 const S=typeof module!=='undefined'?require('./selection-core.js'):root.SelectionCore,clone=x=>JSON.parse(JSON.stringify(x));
 function capture(board,boards){return S.make(board,board.cards.map(c=>c.id),boards)}
 function apply(board,payload,mode,uid=()=>crypto.randomUUID()){
  if(!['unsorted','delete','append'].includes(mode))throw Error('Choose what happens to existing content.');
  const next=clone(board),copy=S.paste(payload,uid);
  if(mode==='unsorted'){
   next.unsorted=[...(next.unsorted||[]),...next.cards.map(c=>{const item=clone(c);item.collectionHidden=false;if(item.collectionId){item.source={...item.source,originalCollectionId:item.collectionId};delete item.collectionId}return item})];
   next.importPendingLinks=[...(next.importPendingLinks||[]),...(next.connections||[])];
   next.templateRecoveryJunctions={...next.templateRecoveryJunctions,...next.junctions};
  }
  if(mode!=='append'){next.cards=[];next.connections=[];next.junctions={}}
  next.cards.push(...copy.cards);next.connections=[...(next.connections||[]),...copy.connections];next.junctions={...next.junctions,...copy.junctions};next.updated=Date.now();return {board:next,boards:copy.boards};
 }
 function note(card,template,preserve,values={}){
  const next=clone(card),layout=clone(template),escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const substitute=(text,rich)=>String(text||'').replace(/\{\{([\w .-]{1,80})\}\}/g,(all,key)=>Object.hasOwn(values,key)?(rich?escape(values[key]):String(values[key])):all);
  const old=next.body||'',rich=String(layout.body||'').startsWith('silverlight-rich-v1:');
  for(const key of ['title','body','color','backgroundImageData','backgroundFit','backgroundOverlay','width','height'])if(Object.hasOwn(layout,key))next[key]=key==='body'||key==='title'?substitute(layout[key],key==='body'&&rich):layout[key];
  if(preserve){next.title=card.title||next.title;const toHTML=body=>body.startsWith('silverlight-rich-v1:')?body.slice(19):escape(body).replace(/\n/g,'<br>');if(old)next.body='silverlight-rich-v1:'+toHTML(next.body||'')+'<p><br></p>'+toHTML(old)}
  return next;
 }
 const api={capture,apply,note};if(typeof module!=='undefined')module.exports=api;else root.SilverlightTemplates=api;
})(globalThis);
