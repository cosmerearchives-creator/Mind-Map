const assert=require('node:assert/strict'),S=require('../app/src/main/assets/smart-regions.js');
function pixels(draw){const width=320,height=320,data=new Uint8ClampedArray(width*height*4);for(let y=0;y<height;y++)for(let x=0;x<width;x++){const i=(y*width+x)*4,bright=draw(x,y);data[i]=bright?224:16;data[i+1]=bright?185:18;data[i+2]=bright?80:30;data[i+3]=255}return {width,height,data}}
const circle=pixels((x,y)=>Math.abs(Math.hypot(x-160,y-155)-92)<2||(Math.abs(x-160)<2&&y>125&&y<180)||(Math.abs(y-155)<2&&x>130&&x<190));
const result=S.fitPixels(circle,{x:58,y:58,w:196,h:184});assert.equal(result.shape,'circle');const b=S.bounds(result.points);assert.ok(Math.abs(b.x-68)<5&&Math.abs(b.y-63)<5&&Math.abs(b.w-184)<8&&Math.abs(b.h-184)<8,JSON.stringify(b));
const rectangle=pixels((x,y)=>(x>=75&&x<=245&&Math.abs(y-65)<2)||(x>=75&&x<=245&&Math.abs(y-255)<2)||(y>=65&&y<=255&&Math.abs(x-75)<2)||(y>=65&&y<=255&&Math.abs(x-245)<2));
const box=S.fitPixels(rectangle,{x:65,y:55,w:190,h:210},'rectangle');assert.equal(box.shape,'rectangle');const r=S.bounds(box.points);assert.ok(Math.abs(r.x-75)<5&&Math.abs(r.y-65)<5&&Math.abs(r.w-170)<8&&Math.abs(r.h-190)<8,JSON.stringify(r));
assert.equal(S.fitPixels(pixels(()=>false),{x:50,y:50,w:200,h:200}),null);
assert.deepEqual(S.resize([[.2,.2],[.4,.2],[.4,.4],[.2,.4]],{x:.1,y:.1,w:.4,h:.4}),[[.1,.1],[.5,.1],[.5,.5],[.1,.5]]);
console.log('PASS: bounded offline circle/rectangle fitting with interior noise, blank-image fallback and normalized resizing.');
