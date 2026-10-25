/* Smooth discrete wheel notches; precise pixel gestures keep their native response. */
window.SilverlightWheel=(()=>{
 const tasks=new Map(),reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const notched=e=>e.deltaMode!==0||(!e.deltaX&&Math.abs(e.deltaY)>=40&&Number.isInteger(e.deltaY)&&(e.deltaY%10===0||e.deltaY%53===0));
 function cancel(key){const task=tasks.get(key);if(task){cancelAnimationFrame(task.frame);tasks.delete(key);task.done?.()}}
 function move(key,dx,dy,options,smooth=true){let task=tasks.get(key);if(!smooth||reduced.matches){cancel(key);const p=options.get();options.set(p.x+dx,p.y+dy);options.done?.();return}if(task){task.x+=dx;task.y+=dy;return}const p=options.get();task={...options,x:p.x+dx,y:p.y+dy,last:performance.now()};tasks.set(key,task);
  function frame(now){if(!tasks.has(key))return;if(task.valid&&!task.valid()){cancel(key);return}const p=task.get(),dt=Math.min(40,Math.max(1,now-task.last));task.last=now;const f=1-Math.exp(-dt/18),x=p.x+(task.x-p.x)*f,y=p.y+(task.y-p.y)*f;if(Math.abs(task.x-x)<.75&&Math.abs(task.y-y)<.75){task.set(task.x,task.y);tasks.delete(key);task.done?.();return}task.set(x,y);task.frame=requestAnimationFrame(frame)}task.frame=requestAnimationFrame(frame);
 }
 function cancelAll(){for(const key of [...tasks.keys()])cancel(key)}
 document.addEventListener('pointerdown',cancelAll,true);document.addEventListener('keydown',cancelAll,true);window.addEventListener('blur',cancelAll);reduced.addEventListener('change',cancelAll);
 document.addEventListener('wheel',e=>{if(e.ctrlKey||e.metaKey||e.defaultPrevented)return;const smooth=notched(e)&&!reduced.matches;if(!smooth)cancelAll();const unit=e.deltaMode===1?16:e.deltaMode===2?innerHeight:1,dx=(e.shiftKey?(e.deltaY||e.deltaX):e.deltaX)*unit,dy=e.shiftKey?0:e.deltaY*unit;
  for(let el=e.target instanceof Element?e.target:null;el&&el!==document.body;el=el.parentElement){if(el.matches('#canvas,.homeViewport,.world,.boardGrid'))return;const style=getComputedStyle(el),maxX=Math.max(0,el.scrollWidth-el.clientWidth),maxY=Math.max(0,el.scrollHeight-el.clientHeight),x=/auto|scroll/.test(style.overflowX)&&maxX>0,y=/auto|scroll/.test(style.overflowY)&&maxY>0;if(!(x&&dx||y&&dy))continue;
   const target=tasks.get(el),px=target?.x??el.scrollLeft,py=target?.y??el.scrollTop;if(!(x&&dx&&(dx>0?px<maxX:px>0)||y&&dy&&(dy>0?py<maxY:py>0)))continue;
   if(!smooth){e.stopImmediatePropagation();return}e.preventDefault();e.stopImmediatePropagation();move(el,x?Math.max(-px,Math.min(maxX-px,dx)):0,y?Math.max(-py,Math.min(maxY-py,dy)):0,{get:()=>({x:el.scrollLeft,y:el.scrollTop}),set:(a,b)=>{el.scrollLeft=a;el.scrollTop=b},valid:()=>el.isConnected});return;
  }
 },{capture:true,passive:false});
 return {move,cancel,cancelAll,notched};
})();
