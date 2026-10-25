/* Conservative manifest retention. Shared immutable parts are never candidates. */
(function(root){'use strict';
function candidates(files,meta,now=Date.now()){
 if(!meta.cleanupEnabled||meta.conflicts?.length||meta.missing?.length||!meta.publishedFile||!meta.published)return [];
 const own=files.filter(f=>f.appProperties?.protocol==='auto-v1'&&f.appProperties.dataset===meta.dataset&&f.appProperties.device===meta.device&&Number.isFinite(Date.parse(f.createdTime))).sort((a,b)=>Date.parse(b.createdTime)-Date.parse(a.createdTime)||a.id.localeCompare(b.id));
 const replacement=own.find(f=>f.id===meta.publishedFile&&f.appProperties.revision===meta.publishedRevision);if(!replacement||now-Date.parse(replacement.createdTime)>86400000)return [];
 const keep=new Set(own.slice(0,10).map(f=>f.id)),known=new Set(meta.files);return own.filter(f=>!keep.has(f.id)&&known.has(f.id)&&f.id!==meta.publishedFile&&Date.parse(f.createdTime)<Date.parse(replacement.createdTime)&&now-Date.parse(f.createdTime)>30*86400000).slice(0,10);
}
const api={candidates};if(typeof module!=='undefined')module.exports=api;else root.SilverlightRetention=api;
})(globalThis);
