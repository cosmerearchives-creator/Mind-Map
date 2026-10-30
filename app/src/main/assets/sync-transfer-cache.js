/* Optional, bounded, account-separated cache; failed cache writes never replace workspace data. */
window.createSyncTransferCache=function(db,limits){'use strict';limits=limits||{};const prefix='sync-transfer-cache:',max=limits.bytes||64*1024*1024;
 const key=(account,id)=>prefix+encodeURIComponent(account||'')+':'+encodeURIComponent(id);
 async function get(account,id){try{const d=db();if(!d)return null;return await new Promise(resolve=>{const q=d.transaction('documents').objectStore('documents').get(key(account,id));q.onsuccess=()=>resolve(q.result?.value||null);q.onerror=()=>resolve(null)})}catch{return null}}
 async function putMany(account,entries){try{const d=db();if(!d)return;const encoder=new TextEncoder(),writes=new Map(entries.map(([id,value])=>[key(account,id),{value,size:encoder.encode(JSON.stringify(value)).length,at:Date.now()}]));let bytes=0;for(const entry of writes.values()){if(entry.size>max/2)return;bytes+=entry.size}if(bytes>max)return;const estimate=await navigator.storage?.estimate?.();if(estimate?.quota&&estimate.quota-estimate.usage<max*2)return;
 await new Promise(resolve=>{const t=d.transaction('documents','readwrite'),s=t.objectStore('documents'),items=[];const q=s.openCursor(IDBKeyRange.bound(prefix,prefix+'\uffff'));q.onsuccess=()=>{const c=q.result;if(c){if(!writes.has(c.key)){items.push({key:c.key,at:c.value.at||0,size:c.value.size||0});bytes+=c.value.size||0}c.continue();return}items.sort((a,b)=>a.at-b.at);while(bytes>max&&items.length){const old=items.shift();s.delete(old.key);bytes-=old.size}for(const [id,entry]of writes)s.put(entry,id)};t.oncomplete=t.onerror=t.onabort=()=>resolve()});}catch{}}
 const put=(account,id,value)=>putMany(account,[[id,value]]);
 return {get,put,putMany};
};
