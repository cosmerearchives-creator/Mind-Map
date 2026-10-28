const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const timers=new Map(),workers=[];let timerId=0;
class Worker {
 constructor(){workers.push(this);queueMicrotask(()=>this.onmessage?.({data:{ready:true}}))}
 postMessage(message){this.sent=message;if(this.fail)throw Error('clone failure')}
 terminate(){this.terminated=true}
}
const context={Worker,URL,Blob,ArrayBuffer,location:{href:'https://example.test/index.html'},fetch:async()=>({ok:true,text:async()=>''}),setTimeout:(fn,ms)=>{timers.set(++timerId,{fn,ms});return timerId},clearTimeout:id=>timers.delete(id),SilverlightAssets:{resolve:x=>x,materialize:async x=>x,storageValue:x=>x},SilverlightBackgroundJob:()=>{throw Error('Unexpected main-thread fallback')}};context.window=context;
vm.runInNewContext(fs.readFileSync('app/src/main/assets/background-tasks.js','utf8'),context);
const tasks=context.SilverlightTasks,flush=async()=>{for(let i=0;i<30;i++)await Promise.resolve()};
(async()=>{
 const first=tasks.run('test',{image:'data:image/png;base64,AA=='}),second=tasks.run('test',{});const rejected=Promise.allSettled([first,second]);await flush();const old=workers[0],late=old.onmessage;
 const deadline=[...timers.values()].find(t=>t.ms===180000);assert.ok(deadline);deadline.fn();assert.ok(old.terminated);assert.ok((await rejected).every(r=>r.status==='rejected'));assert.equal(tasks.stats.lastFailure,'timeout');
 const next=tasks.run('test',{image:'data:image/png;base64,AA=='});await flush();const fresh=workers[1];assert.ok(fresh&&!fresh.terminated);assert.equal(fresh.sent.images.length,1,'images resent after cancellation');late({data:{id:old.sent.id,value:'stale'}});fresh.onmessage({data:{id:fresh.sent.id,value:'fresh'}});assert.equal(await next,'fresh');
 const crash=tasks.run('test',{}),caught=Promise.allSettled([crash]);await flush();fresh.onerror();assert.equal((await caught)[0].status,'rejected');assert.ok(fresh.terminated);
 const third=tasks.run('test',{});await flush();const w=workers[2];w.onmessage({data:{id:w.sent.id,value:42}});assert.equal(await third,42);
 w.fail=true;await assert.rejects(tasks.run('test',{}),/could not start/);assert.ok(w.terminated);assert.equal(tasks.stats.fallbackJobs,0);
 console.log('PASS worker timeout cancels all pending work, ignores late messages, resends images, recovers after crash and cleans post failures.');
})().catch(e=>{console.error(e);process.exit(1)});
