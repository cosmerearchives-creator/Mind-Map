const assert=require('node:assert/strict'),A=require('../app/src/main/assets/assets-core.js'),core=require('../app/src/main/assets/sync-core.js'),capacity=require('../app/src/main/assets/storage-capacity.js');
(async()=>{
 assert.equal(capacity.assess(1,null).known,false);
 assert.equal(capacity.assess(100,{usage:950,quota:1000}).blocked,true);
 assert.equal(capacity.assess(100,{usage:0,quota:1024*1024*1024}).blocked,false);
 assert.equal(capacity.assess(100,{usage:990000,quota:1000000}).warning,true);
 assert.throws(()=>capacity.assess(-1,{}),/Invalid/);
 const base='A'.repeat(8*1024*1024),cards=Array.from({length:34},(_,i)=>({id:'c'+i,kind:'image',imageData:'data:image/png;base64,'+i+base})),w={boards:[{id:'large',title:'Above the old cap',cards}]};
 assert.ok(A.measure(w)>256*1024*1024);A.assertSize(w);
 const snapshot=await core.create(w,'test');assert.equal((await core.verify(snapshot)).boards[0].cards.length,34);assert.equal(snapshot.revision,await core.revision(w));
 const changed=A.clone(w);changed.boards[0].cards[33].imageData+='x';await assert.rejects(()=>core.verify({...snapshot,workspace:changed}),/checksum/);
 if(process.env.TEST_LARGE_TRANSFER){const fs=require('node:fs'),vm=require('node:vm');global.window={};global.SilverlightAssets=A;vm.runInThisContext(fs.readFileSync('app/src/main/assets/asset-transfer.js','utf8'));const files=[];const request=window.installAssetTransfer(async(op,args)=>{if(op==='upload'){const data=JSON.parse(args.snapshot),id=String(files.length+1);files.push({id,text:args.snapshot,appProperties:{protocol:data.format==='silverlight-part-v2'?'part-v2':'manual-v1',revision:data.revision}});return {id}}return {snapshot:files.find(f=>f.id===args.fileId).text}},async()=>files.map(({id,appProperties})=>({id,appProperties})));const uploaded=await request('upload',{snapshot});const downloaded=await request('download',{fileId:uploaded.id});const restored=await core.verify(JSON.parse(downloaded.snapshot));assert.equal(restored.boards[0].cards[33].imageData,cards[33].imageData);console.log('PASS: >256 MiB multipart cloud upload/download and snapshot verification.')}
 console.log('PASS: >256 MiB workspace accepted with verified content hashes; checksum corruption rejected; quota blocking, low-space warning and unavailable estimates handled.');
})().catch(e=>{console.error(e);process.exit(1)});
