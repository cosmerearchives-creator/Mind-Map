/* Sparse document patches. Causal conflict handling remains in auto-sync-core. */
(function(root){'use strict';
const clone=x=>JSON.parse(JSON.stringify(x)),safe=k=>!['__proto__','prototype','constructor'].includes(k);
function equal(a,b){if(a===b)return true;if(!a||!b||typeof a!=='object'||typeof b!=='object'||Array.isArray(a)!==Array.isArray(b))return false;const ak=Object.keys(a),bk=Object.keys(b);return ak.length===bk.length&&ak.every(k=>Object.hasOwn(b,k)&&equal(a[k],b[k]))}
function diff(a,b){if(equal(a,b))return null;
 if(!a||!b||typeof a!=='object'||typeof b!=='object'||Array.isArray(a)!==Array.isArray(b))return {set:b};
 const edits={},remove=Object.keys(a).filter(k=>!Object.hasOwn(b,k));for(const k of Object.keys(b)){if(!safe(k))throw Error('Invalid delta property.');const change=Object.hasOwn(a,k)?diff(a[k],b[k]):{set:b[k]};if(change)edits[k]=change}
 return Array.isArray(b)?{array:edits,length:b.length}:{object:edits,remove};
}
function apply(base,patch,depth=0,budget={nodes:0}){if(++budget.nodes>2000000||depth>128||!patch||typeof patch!=='object')throw Error('Invalid sync delta.');
 if(Object.hasOwn(patch,'set'))return clone(patch.set);
 const array=Object.hasOwn(patch,'array'),edits=array?patch.array:patch.object;
 if(!edits||typeof edits!=='object'||Array.isArray(edits)||!base||typeof base!=='object'||Array.isArray(base)!==array)throw Error('Delta base does not match.');
 const out=array?base.slice():{...base};
 if(array){if(!Number.isSafeInteger(patch.length)||patch.length<0||patch.length>10000000)throw Error('Invalid delta array.');out.length=patch.length}else for(const k of patch.remove||[]){if(typeof k!=='string'||!safe(k))throw Error('Invalid delta removal.');delete out[k]}
 for(const [k,p]of Object.entries(edits)){if(!safe(k)||(array&&(!/^(0|[1-9][0-9]*)$/.test(k)||Number(k)>=patch.length)))throw Error('Invalid delta path.');out[k]=apply(base[k],p,depth+1,budget)}return out;
}
const api={equal,diff,apply};if(typeof module!=='undefined')module.exports=api;else root.SilverlightDelta=api;
})(globalThis);
