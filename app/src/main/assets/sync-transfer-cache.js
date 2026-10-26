/* Optional, bounded, account-separated cache; failed cache writes never replace workspace data. */
window.createSyncTransferCache=function(db,limits){'use strict';limits=limits||{};const prefix='sync-transfer-cache:',max=limits.bytes||64*1024*1024;
 const key=(account,id)=>prefix+encodeURIComponent(account||'')+':'+encodeURIComponent(id);
 async function get(account,id){try{const d=db();if(!d)return null;return await new Promise(resolve=>{const q=d.transaction('documents').objectStore('documents').get(key(account,id));q.onsuccess=()=>resolve(q.result?.value||null);q.onerror=()=>resolve(null)})}catch{return null}}
 async function put(account,id,value){try{const d=db();if(!d)return;const size=new TextEncoder().encode(JSON.stringify(value)).length;if(size>max/2)return;const estimate=await navigator.storage?.estimate?.();if(estimate?.quota&&estimate.quota-estimate.usage<max*2)return;
 await new Promise(resolve=>{const t=d.transaction('documents','readwrite'),s=t.objectStore('documents'),items=[];let bytes=size;const q=s.openCursor(IDBKeyRange.bound(prefix,prefix+'\uffff'));q.onsuccess=()=>{const c=q.result;if(c){if(c.key!==key(account,id)){items.push({key:c.key,at:c.value.at||0,size:c.value.size||0});bytes+=c.value.size||0}c.continue();return}items.sort((a,b)=>a.at-b.at);while(bytes>max&&items.length){const old=items.shift();s.delete(old.key);bytes-=old.size}s.put({value,size,at:Date.now()},key(account,id))};t.oncomplete=t.onerror=t.onabort=()=>resolve()});}catch{}}
 return {get,put};
};
