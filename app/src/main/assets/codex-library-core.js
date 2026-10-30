/* Additive library metadata. Book ownership, source offsets and citations stay intact. */
(function(root){'use strict';
const inspect=b=>root.SilverlightAssets?.inspectBoard?.(b)||b;
const summary=b=>root.SilverlightAssets?.boardInfo(b)||{codexRole:b.codexBook?'book':b.codexEntry?'entry':null,owned:[...(b.cards||[]),...(b.unsorted||[])].filter(c=>c.kind==='nested'&&!c.tagReference).map(c=>c.boardId)};
function catalog(boards){const nodes=new Map();for(const b of boards)if(summary(b).codexCatalog||b.title==='Codex library organization'){const c=inspect(b).codexCatalog;if(c?.version===1)for(const n of Array.isArray(c.nodes)?c.nodes:[])if(n&&typeof n.id==='string'&&!nodes.has(n.id))nodes.set(n.id,{...n})}return [...nodes.values()]}
function ancestors(nodes,id){const map=new Map(nodes.map(n=>[n.id,n])),out=[],seen=new Set();while(id&&map.has(id)&&!seen.has(id)){seen.add(id);const n=map.get(id);out.unshift(n);id=n.parentId}return out}
function descendants(nodes,id){const ids=new Set([id]);let changed=true;while(changed){changed=false;for(const n of nodes)if(ids.has(n.parentId)&&!ids.has(n.id)){ids.add(n.id);changed=true}}return ids}
function validate(nodes){const ids=new Set();for(const n of nodes){if(!n||typeof n.id!=='string'||ids.has(n.id)||!String(n.title||'').trim()||!String(n.label||'').trim())throw Error('Every library layer needs a unique ID, name and type.');ids.add(n.id)}for(const n of nodes){if(n.parentId&&!ids.has(n.parentId))throw Error('Library parent is missing.');let id=n.parentId,seen=new Set([n.id]);while(id){if(seen.has(id))throw Error('A layer cannot be placed inside itself.');seen.add(id);id=nodes.find(x=>x.id===id)?.parentId}}return nodes}
function group(nodes,{id,title,label,parentId=null}){const next=nodes.map(n=>({...n})),node={id,title:String(title||'').trim().slice(0,500),label:String(label||'').trim().slice(0,80),parentId:parentId||null},at=next.findIndex(n=>n.id===id);if(at<0)next.push(node);else next[at]=node;return validate(next)}
function remove(nodes,id){const parent=nodes.find(n=>n.id===id)?.parentId||null;return validate(nodes.filter(n=>n.id!==id).map(n=>({...n,parentId:n.parentId===id?parent:n.parentId})))}
function books(boards){return boards.filter(b=>summary(b).codexRole==='book')}
function scopeBooks(boards,scope){if(scope.kind==='book')return boards.filter(b=>b.id===scope.id);const ids=descendants(catalog(boards),scope.id);return books(boards).filter(b=>ids.has(inspect(b).codexBook.libraryParentId))}
function chapterBoards(boards,scope){if(scope.kind==='chapter')return boards.filter(b=>b.id===scope.id);const ids=new Set(scopeBooks(boards,scope).flatMap(b=>(inspect(b).cards||[]).filter(c=>c.codexEntryLink).map(c=>c.boardId)));return boards.filter(b=>ids.has(b.id)&&summary(b).codexRole==='entry')}
function plain(value){const s=String(value||'');return s.startsWith('silverlight-rich-v1:')?s.slice('silverlight-rich-v1:'.length).replace(/<[^>]*>/g,' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&#39;/g,"'").replace(/&quot;/g,'"'):s}
// Retain original UTF-16 offsets when punctuation is omitted from quoted phrases.
function searchPattern(query,matchCase){
 const quoted=query.length>=2&&query.startsWith('"')&&query.endsWith('"');
 const clean=s=>quoted?s.replace(/\p{P}/gu,''):s;
 let term=clean(quoted?query.slice(1,-1):query),prefix=term.startsWith('&'),suffix=term.endsWith('&');
 if(prefix)term=term.slice(1);if(suffix)term=term.slice(0,-1);
 if(!term.trim())throw Error('Enter letters beside & or inside quotation marks.');
 const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 const literal=escape(term),source=(prefix?'(?<!\\S)\\S+':suffix?'(?<!\\S)':'')+literal+(suffix?'\\S+(?!\\S)':prefix?'(?!\\S)':'');
 return {quoted,pattern:new RegExp(source,matchCase?'gu':'giu')};
}
async function search(boards,scope,column,query,{cancelled=()=>false,skip=0,limit=100,matchCase=false,progress=()=>{}}={}){
 query=String(query||'').trim();if(!query)return {results:[],more:false};if(query.length>500)throw Error('Search for a phrase of 500 characters or fewer.');
 const {pattern,quoted}=searchPattern(query,matchCase),entries=chapterBoards(boards,scope),results=[];let matched=0,scanned=0;
 function find(text,base){text=String(text||'');let searchable='',offsets=[];if(quoted){for(let i=0;i<text.length;){const char=String.fromCodePoint(text.codePointAt(i));if(!/\p{P}/u.test(char)){searchable+=char;for(let j=0;j<char.length;j++)offsets.push(i+j)}i+=char.length}}else searchable=text;pattern.lastIndex=0;for(const m of searchable.matchAll(pattern)){const start=quoted?offsets[m.index]:m.index,end=quoted?offsets[m.index+m[0].length-1]+1:m.index+m[0].length;if(cancelled())return true;if(matched++<skip)continue;if(results.length>=limit)return true;results.push({...base,start,end,excerpt:text.slice(Math.max(0,start-65),end+100),match:text.slice(start,end)})}return false}
 const read=new Set();for(const ref of entries){if(cancelled())return {results:[],cancelled:true};const entry=inspect(ref),label=entry.codexEntry.chapterTitle,base={entryId:entry.id,chapter:label,book:entry.codexEntry.book.title};let more=false;
  if(column==='reading')more=find(entry.codexEntry.text,{...base,kind:'source'});
  else if(column==='notes'){for(const note of entry.cards||[]){if(find([note.quote,note.title,plain(note.body)].filter(Boolean).join('\n'),{...base,kind:'note',noteId:note.id,anchor:note.start})){more=true;break}}}
  else{const pending=[summary(ref).codexResearchId||(entry.unsorted||[]).find(c=>c.codexResearch)?.boardId];while(pending.length&&!more){const id=pending.shift();if(!id||read.has(id))continue;read.add(id);const b=boards.find(b=>b.id===id);if(!b)continue;const board=inspect(b);for(const card of (board.cards||[])){if(card.kind==='nested'&&!card.tagReference&&card.boardId)pending.push(card.boardId);if(find([card.title,plain(card.body)].filter(Boolean).join('\n'),{...base,kind:'canvas',boardId:id,cardId:card.id})){more=true;break}}}}
  if(more)return {results,more:true};progress(++scanned,entries.length);await new Promise(r=>setTimeout(r,0));
 }return {results,more:false};
}
const api={catalog,ancestors,descendants,validate,group,remove,books,scopeBooks,chapterBoards,search,plain};if(typeof module!=='undefined')module.exports=api;else root.SilverlightCodexLibrary=api;
})(globalThis);
