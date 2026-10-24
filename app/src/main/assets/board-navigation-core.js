(function(root){'use strict';
function info(b){return root.SilverlightAssets?.boardInfo(b)||{owned:[...(b.cards||[]),...(b.unsorted||[])].filter(c=>c.kind==='nested'&&!c.tagReference).map(c=>c.boardId)}}
function parents(boards){const map=new Map();for(const b of boards)for(const id of info(b).owned||[])if(id!==b.id&&!map.has(id))map.set(id,b.id);return map}
function ancestors(boards,id){const parent=parents(boards),byId=new Map(boards.map(b=>[b.id,b])),out=[],seen=new Set([id]);while(parent.has(id)){id=parent.get(id);if(seen.has(id))break;seen.add(id);if(byId.has(id))out.unshift(byId.get(id))}return out}
function project(boards,id){const path=ancestors(boards,id);return path[0]?.id||id}
const api={parents,ancestors,project};if(typeof module!=='undefined')module.exports=api;else root.SilverlightNavigation=api;
})(globalThis);
