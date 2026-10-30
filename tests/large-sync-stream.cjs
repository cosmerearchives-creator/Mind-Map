const assert=require('node:assert/strict'),crypto=require('node:crypto'),fs=require('node:fs'),vm=require('node:vm');
const S=require('../app/src/main/assets/stream-json.js'),A=require('../app/src/main/assets/assets-core.js'),C=require('../app/src/main/assets/sync-core.js'),Auto=require('../app/src/main/assets/auto-sync-core.js');
const digest=t=>crypto.createHash('sha256').update(t).digest('hex');
async function main(){
 for(const text of ['', 'abc','a'.repeat(55),'a'.repeat(56),'a'.repeat(64),'a'.repeat(1000000),'x'.repeat(16383)+'😀\ud800終'])assert.equal(await S.hashText(text),digest(text));
 for(const cryptoAPI of [undefined,{subtle:{digest:async()=>{throw Error('native unavailable')}}}]){const sandbox={TextEncoder,setTimeout,crypto:cryptoAPI};vm.runInNewContext(fs.readFileSync('app/src/main/assets/stream-json.js','utf8'),sandbox);assert.equal(await sandbox.SilverlightStream.hashText('Native fallback 😀'),digest('Native fallback 😀'))}
 const bounded='Z'.repeat(33*1024*1024);assert.equal(await S.hashText(bounded),digest(bounded),'larger hashes fall back without unbounded native buffers');
 const values=[null,{},[],{z:'😀\n"\\\ud800',a:[true,false,null,0,-2,1e30]},{a:'x'.repeat(16383)+'😀end',b:undefined}];
 for(const value of values){const text=JSON.stringify(value);assert.equal([...S.json(value)].join(''),text);assert.equal(await S.hashJSON(value),digest(text));assert.equal(await S.hashJSON(value,true),digest(C.canonical(value)));for(const size of [1,7,16384]){const p=new S.Parser();for(let at=0;at<text.length;at+=size)p.write(text.slice(at,at+size));assert.deepEqual(p.finish(),JSON.parse(text))}}
 for(const bad of ['[1,]','{"a":}','{"a" 1}','[}','{}{}','"unterminated','{"a":1,}'])assert.throws(()=>{const p=new S.Parser();p.write(bad);p.finish()});
 for(const a of values)for(const b of values)assert.equal(Math.sign(C.compareCanonical(a,b)),Math.sign(C.canonical(a)<C.canonical(b)?-1:C.canonical(a)>C.canonical(b)?1:0));
 // > V8's ~512 MiB string ceiling through repeated assets in BOARD, registers and snapshot.
 const image='data:image/png;base64,'+'A'.repeat(4*1024*1024),w={boards:[{id:'large',title:'Large',cards:Array.from({length:140},(_,i)=>({id:'c'+i,kind:'image',imageData:image,x:i,y:0}))}]};
 assert.ok(A.logicalSize(w)>512*1024*1024);
 const saved=JSON.stringify;JSON.stringify=function(value,...args){if(value&&typeof value==='object'&&A.logicalSize(value)>16*1024*1024)throw Error('Aggregate serialization regression');return saved(value,...args)};
 global.window={};global.SilverlightAssets=A;vm.runInThisContext(fs.readFileSync('app/src/main/assets/asset-transfer.js','utf8'));
 let files=[],fail=false;const raw=async(op,args)=>{if(op==='upload'){const doc=JSON.parse(args.snapshot);if(fail&&doc.format==='silverlight-transfer-v2')throw Error('Interrupted');const id=String(files.length+1);files.push({id,snapshot:args.snapshot,appProperties:{revision:doc.revision,protocol:doc.format==='silverlight-part-v2'?'part-v2':'auto-v1'}});return {id}}return {snapshot:files.find(f=>f.id===args.fileId).snapshot}};
 const request=window.installAssetTransfer(raw,async()=>files);
 try{
  let meta=Auto.empty('device','dataset','account');meta=await Auto.capture(meta,w);assert.equal((await Auto.capture(meta,w)).records[0].versions.length,1);
  const snapshot=await Auto.envelope(meta,w),before=await C.revision(meta.records),uploaded=await request('upload',{snapshot});
  const restored=(await request('download',{fileId:uploaded.id,objectResult:true})).snapshot;await Auto.verify(restored,'dataset');assert.equal(restored.workspace.boards[0].cards[139].imageData,image);assert.equal(await C.revision(meta.records),before);
  const count=files.length;await request('upload',{snapshot});assert.equal(files.length,count+1,'unchanged immutable parts reused');fail=true;await assert.rejects(request('upload',{snapshot}),/Interrupted/);assert.equal(files.length,count+1,'no partial manifest');fail=false;
  const part=files.find(f=>f.appProperties.protocol==='part-v2'),old=part.snapshot;part.snapshot=old.replace('silverlight-part-v2','corrupt');await assert.rejects(request('download',{fileId:uploaded.id,objectResult:true}),/checksum/);assert.equal(await C.revision(meta.records),before,'failure leaves local history untouched');part.snapshot=old;
 }finally{JSON.stringify=saved}
 console.log('PASS: SHA-256 vectors and UTF-8 boundaries, byte-identical legacy JSON checksums, incremental JSON parsing, >512 MiB logical live-sync history and envelope round-trip, part reuse, interrupted manifest and corrupt part preserve local data.');
}
main().catch(e=>{console.error(e);process.exit(1)});
