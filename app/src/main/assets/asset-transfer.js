/* Immutable, checksummed, reusable Drive parts; commit a manifest only after all parts upload. */
window.installAssetTransfer=function(raw,list){'use strict';const A=SilverlightAssets,PART=1024*1024,MAX_PARTS=16384;
async function request(op,args={}){
 if(op==='upload'){
  const {onProgress,...wireArgs}=args;args=wireArgs;const progress=event=>{if(onProgress)try{onProgress(event)}catch{}};let completed=0,total=0,reused=0;try{progress({phase:'preparing'});
  const original=typeof args.snapshot==='string'?JSON.parse(args.snapshot):args.snapshot,bundle=await (typeof SilverlightTasks!=='undefined'?SilverlightTasks.run('pack',original):A.pack(original));A.assertSize(bundle);const text=JSON.stringify(bundle);
  if(!Object.keys(bundle.assets).length&&new TextEncoder().encode(text).length<PART){progress({phase:'uploading'});const result=await raw(op,{...args,snapshot:JSON.stringify(original)});if(!result?.id)throw Error('Drive did not confirm the workspace copy.');progress({phase:'done',completed:1,total:1});return result}
  progress({phase:'checking'});
  const files=await list({silent:args.silent,expectedAccount:args.expectedAccount}),known=new Map(files.filter(f=>f.appProperties?.protocol==='part-v2').map(f=>[f.appProperties.revision,f.id]));
  const objects=[['document',JSON.stringify(bundle.document)],...Object.entries(bundle.assets)],entries=[];total=objects.reduce((n,[,value])=>n+Math.ceil(value.length/PART),0)+1;if(total-1>MAX_PARTS)throw Error('Transfer contains too many parts.');progress({phase:'uploading',completed,total,reused});
  for(const [name,value]of objects){const parts=[];for(let at=0;at<value.length;at+=PART){if(entries.reduce((n,e)=>n+e.parts.length,0)+parts.length>=MAX_PARTS)throw Error('Transfer contains too many parts.');const data=value.slice(at,at+PART),revision=await A.hash(data);let id=known.get(revision);if(!id){const part={format:'silverlight-part-v2',workspace:{boards:[]},revision,data};const result=await raw('upload',{...args,snapshot:JSON.stringify(part)});if(!result.id)throw Error('Drive did not confirm a transfer part.');id=result.id;known.set(revision,id)}else reused++;completed++;progress({phase:'uploading',completed,total,reused});parts.push({id,revision,length:data.length})}entries.push({name,length:value.length,parts})}
  progress({phase:'finishing',completed,total,reused});
  const manifest={format:'silverlight-transfer-v2',originalFormat:original.format,workspace:{boards:original.workspace?.boards?.map(b=>({id:b.id,title:b.title,cards:[]}))||[]},revision:original.revision,auto:original.auto?{dataset:original.auto.dataset}:undefined,entries,checksum:await A.hash(text)};
  const result=await raw('upload',{...args,snapshot:JSON.stringify(manifest)});if(!result?.id)throw Error('Drive did not confirm the workspace copy.');progress({phase:'done',completed:total,total,reused});return result;
  }catch(error){progress({phase:'error',completed,total,reused,message:error.message});throw error}
 }
 if(op==='download'){
  const result=await raw(op,args),manifest=JSON.parse(result.snapshot);if(manifest.format!=='silverlight-transfer-v2')return result;
  if(!Array.isArray(manifest.entries)||manifest.entries.length>MAX_PARTS||!['silverlight-snapshot-v1','silverlight-auto-v1'].includes(manifest.originalFormat))throw Error('Unsupported or damaged transfer manifest. Update both devices before restoring.');
  const available=new Set((await list({silent:args.silent,expectedAccount:args.expectedAccount})).map(f=>f.id)),assets=Object.create(null),names=new Set();let document,total=0,count=0;
  for(const entry of manifest.entries){if(names.has(entry.name)||!(entry.name==='document'||/^[a-f0-9]{64}$/.test(entry.name))||!Array.isArray(entry.parts)||!Number.isSafeInteger(entry.length)||entry.length<0)throw Error('Damaged transfer entry.');names.add(entry.name);let value='';for(const part of entry.parts){if(++count>MAX_PARTS||!available.has(part.id)||!Number.isInteger(part.length)||part.length<0||part.length>PART||!/^[a-f0-9]{64}$/.test(part.revision))throw Error('A transfer part is missing or invalid.');const r=await raw('download',{...args,fileId:part.id}),p=JSON.parse(r.snapshot);if(p.format!=='silverlight-part-v2'||typeof p.data!=='string'||p.data.length!==part.length||p.revision!==part.revision||await A.hash(p.data)!==part.revision)throw Error('Transfer checksum failed; your workspace was not replaced.');value+=p.data;total+=new TextEncoder().encode(p.data).length;if(!Number.isSafeInteger(total))throw Error('Invalid transfer size.')}if(value.length!==entry.length)throw Error('Transfer is incomplete.');if(entry.name==='document')document=JSON.parse(value);else assets[entry.name]=value}
  const bundle={format:A.FORMAT,document,assets};if(!document||await A.hash(JSON.stringify(bundle))!==manifest.checksum)throw Error('Transfer manifest checksum failed; your workspace was not replaced.');const original=await A.unpack(bundle);if(original.format!==manifest.originalFormat||original.revision!==manifest.revision)throw Error('Transfer identity mismatch.');return {snapshot:JSON.stringify(original)};
 }
 return raw(op,args);
}
return request;
};
