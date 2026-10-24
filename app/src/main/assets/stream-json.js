/* Bounded JSON traversal and incremental SHA-256. No aggregate document string. */
(function(root){'use strict';
const encoder=new TextEncoder();
function* json(value,sorted=false){
 if(typeof value==='string'){
  yield '"';for(let at=0;at<value.length;){let end=Math.min(at+16384,value.length);if(end<value.length&&/[\uD800-\uDBFF]/.test(value[end-1]))end--;yield JSON.stringify(value.slice(at,end)).slice(1,-1);at=end}yield '"';return;
 }
 if(Array.isArray(value)){yield '[';for(let i=0;i<value.length;i++){if(i)yield ',';if(sorted&&value[i]===undefined)yield '';else yield* json(value[i]===undefined?null:value[i],sorted)}yield ']';return}
 if(value&&typeof value==='object'){yield '{';let first=true;const keys=Object.keys(value);if(sorted)keys.sort();for(const key of keys){if(!sorted&&value[key]===undefined)continue;if(!first)yield ',';first=false;yield* json(key);yield ':';if(sorted&&value[key]===undefined)yield 'undefined';else yield* json(value[key],sorted)}yield '}';return}
 yield JSON.stringify(value)??'null';
}
const K=new Uint32Array([0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2]);
const rotate=(x,n)=>(x>>>n)|(x<<(32-n));
class SHA256{
 constructor(){this.h=new Uint32Array([0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19]);this.buffer=new Uint8Array(64);this.used=0;this.length=0;this.words=new Uint32Array(64)}
 block(bytes){const w=this.words;for(let i=0;i<16;i++)w[i]=(bytes[i*4]<<24)|(bytes[i*4+1]<<16)|(bytes[i*4+2]<<8)|bytes[i*4+3];for(let i=16;i<64;i++){const a=w[i-15],b=w[i-2];w[i]=w[i-16]+(rotate(a,7)^rotate(a,18)^(a>>>3))+w[i-7]+(rotate(b,17)^rotate(b,19)^(b>>>10))}let [a,b,c,d,e,f,g,h]=this.h;for(let i=0;i<64;i++){const t1=(h+(rotate(e,6)^rotate(e,11)^rotate(e,25))+((e&f)^(~e&g))+K[i]+w[i])|0,t2=((rotate(a,2)^rotate(a,13)^rotate(a,22))+((a&b)^(a&c)^(b&c)))|0;h=g;g=f;f=e;e=(d+t1)|0;d=c;c=b;b=a;a=(t1+t2)|0}for(const [i,v]of [a,b,c,d,e,f,g,h].entries())this.h[i]+=v}
 update(bytes){this.length+=bytes.length;let at=0;while(at<bytes.length){const n=Math.min(64-this.used,bytes.length-at);this.buffer.set(bytes.subarray(at,at+n),this.used);this.used+=n;at+=n;if(this.used===64){this.block(this.buffer);this.used=0}}return this}
 digest(){const bits=this.length*8;this.buffer[this.used++]=128;if(this.used>56){this.buffer.fill(0,this.used);this.block(this.buffer);this.used=0}this.buffer.fill(0,this.used,56);const view=new DataView(this.buffer.buffer);view.setUint32(56,Math.floor(bits/4294967296));view.setUint32(60,bits>>>0);this.block(this.buffer);return [...this.h].map(v=>v.toString(16).padStart(8,'0')).join('')}
}
async function hashChunks(chunks){const sha=new SHA256();let processed=0;for(const chunk of chunks){sha.update(encoder.encode(chunk));processed+=chunk.length;if(processed>=4*1024*1024){processed=0;await new Promise(r=>setTimeout(r,0))}}return sha.digest()}
function* textChunks(text){for(let at=0;at<text.length;){let end=Math.min(at+16384,text.length);if(end<text.length&&/[\uD800-\uDBFF]/.test(text[end-1]))end--;yield text.slice(at,end);at=end}}
// Parse each scalar separately. A document can exceed the engine's single-string limit.
class Parser{
 constructor(){this.stack=[];this.token='';this.string=false;this.escape=false;this.hasRoot=false;this.value=undefined}
 accept(token){const top=this.stack.at(-1);if(token===']'||token==='}'){if(!top||top.array!==(token===']')||!['first','end'].includes(top.state))throw Error('Invalid streamed JSON.');this.stack.pop();return}if(token===','){if(!top||top.state!=='end')throw Error('Invalid streamed JSON.');top.state=top.array?'value':'key';return}if(token===':'){if(!top||top.state!=='colon')throw Error('Invalid streamed JSON.');top.state='value';return}
  if(top&&!top.array&&['first','key'].includes(top.state)){const key=JSON.parse(token);if(typeof key!=='string')throw Error('Invalid streamed JSON key.');top.key=key;top.state='colon';return}
  const container=token==='['||token==='{',value=container?(token==='['?[]:{}):JSON.parse(token);
  if(top){if(!['first','value'].includes(top.state)||(!top.array&&top.state==='first'))throw Error('Invalid streamed JSON value.');if(top.array)top.value.push(value);else Object.defineProperty(top.value,top.key,{value,enumerable:true,writable:true,configurable:true});top.state='end'}else{if(this.hasRoot)throw Error('Multiple JSON documents.');this.value=value;this.hasRoot=true}
  if(container)this.stack.push({value,array:token==='[',state:'first'});
 }
 write(text){for(const ch of text){if(this.string){this.token+=ch;if(this.escape)this.escape=false;else if(ch==='\\')this.escape=true;else if(ch==='"'){this.string=false;this.accept(this.token);this.token=''}continue}if(ch==='"'){if(this.token)throw Error('Invalid streamed JSON.');this.token=ch;this.string=true;continue}if(/[\s{}\[\],:]/.test(ch)){if(this.token){this.accept(this.token);this.token=''}if(!/\s/.test(ch))this.accept(ch)}else this.token+=ch}}
 finish(){if(this.string)throw Error('Incomplete JSON string.');if(this.token)this.accept(this.token);if(this.stack.length||!this.hasRoot)throw Error('Incomplete JSON document.');return this.value}
}
const api={json,textChunks,SHA256,Parser,hashChunks,hashJSON:(v,sorted=false)=>hashChunks(json(v,sorted)),hashText:t=>hashChunks(textChunks(t))};
if(typeof module!=='undefined')module.exports=api;else root.SilverlightStream=api;
})(globalThis);
