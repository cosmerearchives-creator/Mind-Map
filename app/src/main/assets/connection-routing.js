/* Routing changes presentation only; edge IDs, labels and causal data stay intact. */
(function(root){'use strict';
const center=r=>({x:r.x+r.width/2,y:r.y+r.height/2});
function anchor(r,p){const c=center(r),dx=p.x-c.x,dy=p.y-c.y;if(!dx&&!dy)return {x:r.x+r.width,y:c.y};const t=Math.min(dx?Math.abs(r.width/2/dx):Infinity,dy?Math.abs(r.height/2/dy):Infinity);return {x:c.x+dx*t,y:c.y+dy*t}}
function plan(source,targets,manual){if(!targets.length)return [];const c=center(source);let groups;
 if(Number.isFinite(manual?.x)&&Number.isFinite(manual?.y))groups=[targets];else{
  const sorted=targets.map(t=>({t,angle:Math.atan2(center(t.box).y-c.y,center(t.box).x-c.x)})).sort((a,b)=>a.angle-b.angle);let gap=-1,start=0;
  for(let i=0;i<sorted.length;i++){const d=(sorted[(i+1)%sorted.length].angle-sorted[i].angle+Math.PI*2)%(Math.PI*2);if(d>gap){gap=d;start=(i+1)%sorted.length}}
  const ordered=sorted.slice(start).concat(sorted.slice(0,start));groups=[];let first=0,group=[];
  for(const item of ordered){let angle=item.angle;if(angle<ordered[0].angle)angle+=Math.PI*2;if(group.length&&angle-first>Math.PI*.72){groups.push(group);group=[]}if(!group.length)first=angle;group.push(item.t)}if(group.length)groups.push(group);
 }
 return groups.map((group,i)=>{if(group.length===1){const t=group[0],end=anchor(t.box,c),start=anchor(source,end);return {start,branches:[{...t,start,end}],junction:null}}
  const average=group.reduce((p,t)=>({x:p.x+center(t.box).x/group.length,y:p.y+center(t.box).y/group.length}),{x:0,y:0}),origin=anchor(source,average),junction=Number.isFinite(manual?.x)&&Number.isFinite(manual?.y)?{x:manual.x,y:manual.y}:{x:origin.x+(average.x-origin.x)*.32,y:origin.y+(average.y-origin.y)*.32};
  return {start:anchor(source,junction),junction,primary:i===0,branches:group.map(t=>({...t,start:junction,end:anchor(t.box,junction)}))};
 });
}
function curve(a,b){const dx=b.x-a.x,dy=b.y-a.y;return Math.abs(dx)>Math.abs(dy)?`M${a.x} ${a.y} C${a.x+dx/2} ${a.y} ${a.x+dx/2} ${b.y} ${b.x} ${b.y}`:`M${a.x} ${a.y} C${a.x} ${a.y+dy/2} ${b.x} ${a.y+dy/2} ${b.x} ${b.y}`}
const api={plan,anchor,curve};if(typeof module!=='undefined')module.exports=api;else root.SilverlightRouting=api;
})(globalThis);
