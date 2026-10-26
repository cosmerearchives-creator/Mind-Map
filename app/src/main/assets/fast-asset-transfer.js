/* Verified sparse transfers layered over the legacy backup/restore transport. */
window.installFastAssetTransfer=function(legacy,raw,list,options){'use strict';options=options||{};
 const A=SilverlightAssets,D=SilverlightDelta,heads=new Map(),documents=new Map();
 function remember(key,entry){if(A.logicalSize(entry.document)>32*1024*1024)return;documents.delete(key);documents.set(key,entry);while(documents.size>2)documents.delete(documents.keys().next().value)}
 const hash=x=>A.stream.hashJSON(x,true),partition=args=>(args.expectedAccount||'')+':'+(args.dataset||'');
 const get=async(args,key)=>options.cache?.get(args.expectedAccount||'',key);
 const put=async(args,key,value)=>options.cache?.put(args.expectedAccount||'',key,value);
 const checkpoint=()=>{const e=Error('Checkpoint deferred for saved edits.');e.deferred=true;throw e};
 async function batch(jobs,args){const out=[],wire={silent:args.silent,expectedAccount:args.expectedAccount};for(let at=0;at<jobs.length;at+=3){if(args.shouldContinue&&!args.shouldContinue())checkpoint();const group=jobs.slice(at,at+3);if(group.length===1)out.push(await raw(group[0].op,{...wire,...group[0].args}));else{const r=await raw('batch',{...wire,requests:group.map(j=>({op:j.op,...j.args}))});if(r.results?.length!==group.length)throw Error('Incomplete transfer batch.');for(const item of r.results){if(item.error)throw Error(item.error);out.push(item.result)}}}return out}
 async function pack(value,known){const assets={},data={},seen=new Map();let visited=0;
  async function visit(v){if(++visited%512===0)await new Promise(r=>setTimeout(r,0));v=A.resolve(v);if(A.diskRef(v)){const id=v.slice(18);if(known[id]){assets[id]=known[id];return {__silverlightAsset:id}}v=await A.load(v)}
   if(typeof v==='string'&&v.startsWith('data:image/')){let id=seen.get(v);if(!id){id=await A.hash(v);seen.set(v,id)}if(known[id])assets[id]=known[id];else data[id]=v;return {__silverlightAsset:id}}
   if(Array.isArray(v)){const out=[];for(const x of v)out.push(await visit(x));return out}if(v&&typeof v==='object'){const out={};for(const [k,x]of Object.entries(v)){if(['__proto__','prototype','constructor'].includes(k))throw Error('Invalid transfer property.');if(x!==undefined)out[k]=await visit(x)}return out}return v;
  }return {document:await visit(value),assets,data};
 }
 async function upload(args){const {onProgress,shouldContinue,...wire}=args,notify=e=>{try{onProgress?.(e)}catch{}},key=partition(args);notify({phase:'preparing'});
  let base=heads.get(key)||await get(args,'head:'+args.dataset);const files=await list({silent:true,expectedAccount:args.expectedAccount}),available=new Set(files.map(f=>f.id)),known=new Map(files.filter(f=>f.appProperties?.protocol==='part-v2').map(f=>[f.appProperties.revision,f.id]));
  if(base&&!available.has(base.fileId))base=null;const oldAssets=base?.assets||{},validAssets={};for(const [id,entry]of Object.entries(oldAssets))if(entry.parts.every(p=>available.has(p.id)))validAssets[id]=entry;
  const packed=await pack(typeof args.snapshot==='string'?JSON.parse(args.snapshot):args.snapshot,validAssets);if(shouldContinue&&!shouldContinue())checkpoint();
  const patch=base&&!args.checkpoint?(D.diff(base.document,packed.document)||{object:{},remove:[]}):null;
  const delta=base&&!args.checkpoint&&A.logicalSize(patch)<A.logicalSize(packed.document)*.7;
  let payload=delta?patch:packed.document,parts=0,reused=0;const assets={...packed.assets};
  async function pieces(name,value,json=false){const refs=[],jobs=[],chunkSize=1024*1024;let pending='';function add(data){jobs.push({data})}
   for(const chunk of json?A.stream.json(value):A.stream.textChunks(value)){pending+=chunk;while(pending.length>=chunkSize){add(pending.slice(0,chunkSize));pending=pending.slice(chunkSize)}}if(pending)add(pending);
   for(let at=0;at<jobs.length;at+=3){if(shouldContinue&&!shouldContinue())checkpoint();const group=jobs.slice(at,at+3),missing=[];for(const job of group){job.revision=await A.hash(job.data);job.id=known.get(job.revision);if(job.id)reused++;else missing.push({op:'upload',args:{snapshot:JSON.stringify({format:'silverlight-part-v2',workspace:{boards:[]},revision:job.revision,data:job.data})}})}
    const uploaded=await batch(missing,{...wire,shouldContinue});let i=0;for(const job of group){if(!job.id){job.id=uploaded[i++]?.id;if(!job.id)throw Error('Drive did not confirm a transfer part.');known.set(job.revision,job.id)}refs.push({id:job.id,revision:job.revision,length:job.data.length});parts++;notify({phase:'uploading',completed:parts,reused})}}
   return {name,length:refs.reduce((n,p)=>n+p.length,0),parts:refs};
  }
  for(const [id,data]of Object.entries(packed.data))assets[id]=await pieces(id,data);
  let documentParts=null;if(A.logicalSize(payload)>128*1024){documentParts=await pieces('document',payload,true);payload=null}
  if(shouldContinue&&!shouldContinue())checkpoint();
  const assetChanges=delta?Object.fromEntries(Object.entries(assets).filter(([id])=>!base.assets[id])):assets;
  const manifest={format:'silverlight-transfer-v3',originalFormat:'silverlight-auto-v1',workspace:{boards:[]},auto:{dataset:args.dataset,device:packed.document.auto.device,checkpoint:!delta},revision:packed.document.revision,base:delta?{id:base.fileId,hash:base.documentHash}:null,payload,documentParts,assets:assetChanges,assetIds:[...A.refs(packed.document)].sort(),documentHash:await hash(packed.document),depth:delta?(base.depth||0)+1:0};
  manifest.checksum=await hash(manifest);notify({phase:'finishing'});const result=await raw('upload',{...wire,snapshot:JSON.stringify(manifest)});if(!result?.id)throw Error('Drive did not confirm the sync manifest.');
  const entry={fileId:result.id,document:packed.document,documentHash:manifest.documentHash,assets,depth:manifest.depth,at:Date.now()};heads.set(key,entry);remember(partition(args)+':'+result.id,entry);await put(args,'head:'+args.dataset,entry);await put(args,'document:'+result.id,entry);notify({phase:'done',completed:parts+1,total:parts+1,reused});return {...result,checkpoint:!delta,depth:entry.depth};
 }
 async function download(args){const notify=e=>{try{args.onProgress?.(e)}catch{}},cacheKey=id=>partition(args)+':'+id;
  let listed=null;async function authorize(){if(!listed)listed=new Set((await list({silent:true,expectedAccount:args.expectedAccount})).map(f=>f.id));return listed}
  async function readParts(entry){if(!entry||!Array.isArray(entry.parts)||entry.parts.length>16384||!Number.isSafeInteger(entry.length)||entry.length<0)throw Error('Invalid transfer entry.');const values=[],jobs=[];let length=0;
   for(let i=0;i<entry.parts.length;i++){const p=entry.parts[i];if(!/^[a-f0-9]{64}$/.test(p.revision)||!Number.isInteger(p.length)||p.length<0||p.length>1048576)throw Error('Invalid transfer part.');const saved=await get(args,'part:'+p.revision);if(saved&&saved.length===p.length&&await A.hash(saved)===p.revision)values[i]=saved;else jobs.push({i,p})}
   if(jobs.length)await authorize();for(let at=0;at<jobs.length;at+=3){const group=jobs.slice(at,at+3);if(group.some(j=>!listed.has(j.p.id)))throw Error('A transfer part is missing. Local changes are kept.');const results=await batch(group.map(j=>({op:'download',args:{fileId:j.p.id}})),args);for(let n=0;n<group.length;n++){const {i,p}=group[n],value=JSON.parse(results[n].snapshot);if(value.format!=='silverlight-part-v2'||typeof value.data!=='string'||value.data.length!==p.length||await A.hash(value.data)!==p.revision)throw Error('Transfer checksum failed.');values[i]=value.data;await put(args,'part:'+p.revision,value.data);notify({phase:'downloading',completed:at+n+1,total:jobs.length})}}
   for(const v of values)length+=v.length;if(length!==entry.length)throw Error('Transfer is incomplete.');return values;
  }
  async function metadata(id){const cached=documents.get(cacheKey(id))||await get(args,'document:'+id);if(cached&&await hash(cached.document)===cached.documentHash)return cached;return null}
  const chain=[],seen=new Set();let id=args.fileId,base=null;
  while(!base){if(seen.has(id)||seen.size>=4096)throw Error('Invalid sync dependency chain.');seen.add(id);base=await metadata(id);if(base)break;
   if(chain.length)await authorize();const response=await raw('download',{silent:args.silent,expectedAccount:args.expectedAccount,fileId:id}),manifest=JSON.parse(response.snapshot);
   if(manifest.format!=='silverlight-transfer-v3'){
    const restored=await legacy('download',{...args,fileId:id,objectResult:true,prefetched:response}),snapshot=typeof restored.snapshot==='string'?JSON.parse(restored.snapshot):restored.snapshot;return chain.length?Promise.reject(Error('A delta base is not a verified v3 checkpoint.')):{snapshot:args.objectResult?snapshot:JSON.stringify(snapshot)};
   }
   const {checksum,...signed}=manifest;if(await hash(signed)!==checksum||manifest.auto?.dataset!==args.dataset&&args.dataset||manifest.originalFormat!=='silverlight-auto-v1'||!Array.isArray(manifest.assetIds))throw Error('Sync manifest checksum or workspace mismatch.');chain.push({id,manifest});if(!manifest.base)break;id=manifest.base.id;
  }
  while(chain.length){const {id,manifest:m}=chain.pop();let payload=m.payload;if(m.documentParts){const parser=new A.stream.Parser();for(const text of await readParts(m.documentParts))parser.write(text);payload=parser.finish()}
   if(m.base&&(!base||base.documentHash!==m.base.hash))throw Error('Sync delta base checksum mismatch.');const document=m.base?D.apply(base.document,payload):payload;if(await hash(document)!==m.documentHash)throw Error('Reconstructed sync checksum failed.');const assets={...(m.base?base.assets:{}),...m.assets};if(m.assetIds.some(k=>!assets[k]||!/^[a-f0-9]{64}$/.test(k)))throw Error('A sync image entry is missing.');base={fileId:id,document,documentHash:m.documentHash,assets,depth:m.depth||0,at:Date.now()};remember(cacheKey(id),base);await put(args,'document:'+id,base);
  }
  const assets={};for(const asset of A.refs(base.document)){try{const local=await A.load('silverlight-asset:'+asset);if(await A.hash(local)===asset){assets[asset]=local;continue}}catch{}const chunks=await readParts(base.assets[asset]);assets[asset]=chunks.join('');if(await A.hash(assets[asset])!==asset)throw Error('Image checksum failed.')}
  const snapshot=await A.unpack({format:A.FORMAT,document:base.document,assets});heads.set(partition(args),base);await put(args,'head:'+args.dataset,base);notify({phase:'done'});return {snapshot:args.objectResult?snapshot:JSON.stringify(snapshot)};
 }
 return async function request(op,args={}){if(op==='upload'&&args.optimized&&options.supported?.())return upload(args);if(op==='download'&&options.supported?.())return download(args);const {optimized,checkpoint,shouldContinue,dataset,...legacyArgs}=args;return legacy(op,op==='upload'||op==='download'?legacyArgs:args)};
};
