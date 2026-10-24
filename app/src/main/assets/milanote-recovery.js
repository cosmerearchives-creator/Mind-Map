/* Browser-only recovery of visible Collection members and portable media. */
(function(root){'use strict';
const allowedMedia=url=>{try{const u=new URL(url);return u.protocol==='https:'&&!u.username&&!u.password&&(!u.port||u.port==='443')&&((u.hostname==='app.milanote.com'&&u.pathname.startsWith('/media/p/'))||(u.hostname==='media.milanote.com'&&(u.pathname.startsWith('/p/resized/')||u.pathname.startsWith('/p/images/'))))}catch{return false}};
function safeSVG(source){
 const doc=new DOMParser().parseFromString(source,'image/svg+xml');if(doc.querySelector('parsererror')||doc.documentElement.localName!=='svg')throw Error('Invalid drawing SVG.');
 const tags=new Set(['svg','g','path','rect','circle','ellipse','line','polyline','polygon','text','tspan']);
 const attrs=new Set(['xmlns','viewBox','width','height','d','x','y','x1','x2','y1','y2','cx','cy','r','rx','ry','points','fill','stroke','stroke-width','stroke-linecap','stroke-linejoin','fill-rule','opacity','fill-opacity','stroke-opacity','transform','font-size','font-family','text-anchor']);
 for(const el of [...doc.querySelectorAll('*')]){if(!tags.has(el.localName)){el.remove();continue}const opacity=el.classList.contains('fa-secondary')?'.4':null;for(const a of [...el.attributes])if(!attrs.has(a.name)||/url\s*\(|javascript:|https?:|data:/i.test(a.value)&&a.name!=='xmlns')el.removeAttribute(a.name);if(opacity)el.setAttribute('opacity',opacity)}
 doc.documentElement.setAttribute('xmlns','http://www.w3.org/2000/svg');return new XMLSerializer().serializeToString(doc.documentElement).replace(/currentColor/g,'#333333');
}
async function raster(source,width,height,padding=0){const image=new Image();image.src='data:image/svg+xml;base64,'+btoa(unescape(encodeURIComponent(safeSVG(source))));await image.decode();const canvas=document.createElement('canvas');canvas.width=Math.min(2048,Math.max(1,Math.ceil(width)));canvas.height=Math.min(2048,Math.max(1,Math.ceil(height)));const w=canvas.width-2*padding,h=canvas.height-2*padding,scale=Math.min(w/image.naturalWidth,h/image.naturalHeight);canvas.getContext('2d').drawImage(image,(canvas.width-image.naturalWidth*scale)/2,(canvas.height-image.naturalHeight*scale)/2,image.naturalWidth*scale,image.naturalHeight*scale);return canvas.toDataURL('image/png')}
function recover(payload,html){
 if(!html)return payload;if(html.length>64*1024*1024)throw Error('Collection HTML exceeds 64 MB. Copy a smaller selection.');
 const template=document.createElement('template');template.innerHTML=html;const doc=template.content,ids=new Set(payload.elements.map(e=>e.id||e._id));payload.recoveryIssues=[];
 for(const column of [...payload.elements].filter(e=>e.elementType==='COLUMN')){
  const cid=column.id||column._id;if(payload.elements.some(e=>e.location?.parentId===cid))continue;
  const headings=[...doc.querySelectorAll('h2')].filter(h=>h.textContent.trim()===String(column.content?.title||'').trim());
  if(headings.length!==1){payload.recoveryIssues.push('Collection '+(column.content?.title||'')+': no unique HTML member group was available.');continue}
  const group=headings[0].parentElement;
  for(const wrapper of group.querySelectorAll('.Element[data-element-id]')){
   const id=wrapper.getAttribute('data-element-id');if(!id||ids.has(id))continue;
   const el=wrapper.querySelector('.Board,.Card,.Column,.Image,.Link,.TaskList');if(!el)continue;
   let parent=wrapper.parentElement.closest('.Element[data-element-id]'),parentId=parent&&group.contains(parent)?parent.getAttribute('data-element-id'):cid;
   const title=el.querySelector('.EditableTitle,.title-text')?.textContent.trim()||'',type=el.classList.contains('Board')?'BOARD':el.classList.contains('Column')?'COLUMN':el.classList.contains('Image')?'IMAGE':el.classList.contains('Link')?'LINK':'CARD';
   const content={title},body=el.querySelector('.CardTiptapEditor .tiptap,.tiptap');if(body)content.textContent={_html:body.innerHTML};
   const background=el.querySelector('.background');if(background?.style.backgroundColor)content.background={color:rgb(background.style.backgroundColor)};
   const img=el.querySelector('img');if(img)content.image={original:img.getAttribute('src')||''};
   const svg=el.querySelector('.BoardIcon svg');if(svg)content.icon={type:'svg',svgSource:svg.outerHTML};
   boardVisual(el,content);
   const size=wrapper.style.containIntrinsicSize?.match(/([\d.]+)px\s+([\d.]+)px/);if(payload.elements.length>=5000)throw Error('Copied Collection exceeds 5,000 elements.');payload.elements.push({id,elementType:type,content,location:{parentId,section:column.location?.section||'CANVAS',position:{index:payload.elements.length,score:payload.elements.length}},...(size?{measurements:{width:Number(size[1]),height:Number(size[2])}}:{}),recoveredFromHTML:true});ids.add(id);
  }
 }
 for(const e of payload.elements.filter(e=>['BOARD','ALIAS'].includes(e.elementType))){const wrapper=[...doc.querySelectorAll('[data-element-id]')].find(el=>el.getAttribute('data-element-id')===(e.id||e._id));if(wrapper)boardVisual(wrapper,e.content||=( {}))}
 return payload;
}
function boardVisual(el,c){const icon=el.querySelector('.board-icon-content')||el.querySelector('.BoardIcon');if(icon?.style.backgroundColor)c.color=rgb(icon.style.backgroundColor);const svg=icon?.querySelector('svg');if(svg&&!c.icon?.svg)c.icon={...c.icon,svgSource:svg.outerHTML};const img=icon?.querySelector('img');let src=img?.getAttribute('src');if(!src)for(const node of [icon,...(icon?.querySelectorAll('[style]')||[])]){const match=node?.style.backgroundImage?.match(/url\(["']?(.*?)["']?\)/);if(match){src=match[1];break}}if(src)c.image={...c.image,original:src};}
function rgb(value){const m=value.match(/^rgba?\(\s*(\d+)[, ]+\s*(\d+)[, ]+\s*(\d+)/);return m?'#'+m.slice(1,4).map(x=>Number(x).toString(16).padStart(2,'0')).join(''):value}
async function prepare(payload,request,progress=()=>{},cancelled=()=>false){
 const cache=new Map();let total=0;payload.recoveryIssues||=[];
 async function image(url){
  if(!allowedMedia(url))throw Error('Image reference is unavailable or outside Milanote public media.');
  if(cache.has(url))return cache.get(url);
  const job=(async()=>{const candidates=[url],original=new URL(url);if(original.hostname==='app.milanote.com'&&/^\/media\/p\/(images|resized)\//.test(original.pathname)){const cdn=new URL(original);cdn.hostname='media.milanote.com';cdn.pathname=cdn.pathname.replace(/^\/media/,'');candidates.push(cdn.href)}let failure;
   for(const address of candidates){if(cancelled())throw Error('Paste cancelled.');try{let data;if(request){const items=await request('media',null,address);data=items[0];if(!data?.base64)throw Error('Image was not returned.');data='data:'+data.type+';base64,'+data.base64}else{const r=await fetch(address,{credentials:'omit',signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error('Image download failed.');const blob=await r.blob();if(blob.size>8*1024*1024)throw Error('Image exceeds 8 MB.');data=await new Promise(resolve=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.readAsDataURL(blob)})}
    const im=new Image();im.src=data;await im.decode();if(im.naturalWidth<2||im.naturalHeight<2||im.naturalWidth*im.naturalHeight>64*1024*1024)throw Error('Image dimensions are unsupported.');if(total+data.length>128*1024*1024)throw Error('Copied images exceed the paste memory limit.');total+=data.length;return data;
   }catch(error){failure=error}}throw failure||Error('Original image is unavailable.');})();cache.set(url,job);return job;
 }

 for(let i=0;i<payload.elements.length;i++){
  if(cancelled())throw Error('Paste cancelled.');const e=payload.elements[i],c=e.content||{};progress('Recovering item '+(i+1)+' / '+payload.elements.length);
  try{
   if(e.elementType==='IMAGE'){
    const candidates=[c.image?.original,c.image?.huge,c.image?.large,c.image?.regular].filter(x=>typeof x==='string');let recovered=false;
    for(const src of candidates){try{if(src.startsWith('data:image/')){const im=new Image();im.src=src;await im.decode();if(im.naturalWidth<2||im.naturalHeight<2)continue;c._imageData=src}else c._imageData=await image(src);recovered=true;break}catch{}}
    if(!recovered)throw Error('Original image pixels could not be downloaded; the tiny color thumbnail was not substituted.');
   }
   if(['ANNOTATION','SKETCH'].includes(e.elementType)&&c.drawing?.svg){c._imageData=await raster(c.drawing.svg,c.drawing.width*2,c.drawing.height*2)}
   if(e.elementType==='LINE'&&!c.start?.elementId&&!c.end?.elementId){const line=await lineImage(c);c._imageData=line.data;c._lineBox=line.box}
   if(['BOARD','ALIAS'].includes(e.elementType)){
    const urls=[];function media(value,depth=0){if(depth>4)return;if(typeof value==='string'){if(allowedMedia(value))urls.push(value)}else if(value&&typeof value==='object'){for(const key of ['original','huge','large','regular'])if(value[key])media(value[key],depth+1);for(const [key,item]of Object.entries(value).slice(0,80))if(!['original','huge','large','regular','svg'].includes(key))media(item,depth+1)}}media(c.image);media(c.icon);const remote=urls[0];
    if(remote)c._iconData=await image(remote);
    else if(c.icon?.svgSource||c.icon?.svg){const source=c.icon.svgSource||decodeURIComponent(escape(atob(c.icon.svg)));const fg=MilanoteClipboard.color(c.secondaryColor)||MilanoteClipboard.contrast(c.color);c._iconData=await raster(source.replace(/<svg\b/,'<svg fill="'+fg+'"').replace(/currentColor/g,fg),160,160,35)}
    else if(c.icon?.string){const canvas=document.createElement('canvas');canvas.width=canvas.height=160;const ctx=canvas.getContext('2d');ctx.fillStyle=MilanoteClipboard.color(c.secondaryColor)||MilanoteClipboard.contrast(c.color);ctx.font='bold 45px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(c.icon.string.slice(0,6),80,80);c._iconData=canvas.toDataURL('image/png')}
    if(!c._iconData){const canvas=document.createElement('canvas');canvas.width=canvas.height=160;const ctx=canvas.getContext('2d');ctx.fillStyle=MilanoteClipboard.color(c.color)||'#d1cbc6';ctx.fillRect(0,0,160,160);c._iconData=canvas.toDataURL('image/png')}
    if(c._iconData&&!remote){const im=new Image();im.src=c._iconData;await im.decode();const canvas=document.createElement('canvas');canvas.width=canvas.height=160;const ctx=canvas.getContext('2d');ctx.fillStyle=MilanoteClipboard.color(c.color)||'#d1cbc6';ctx.fillRect(0,0,160,160);ctx.drawImage(im,0,0,160,160);c._iconData=canvas.toDataURL('image/png')}
   }
  }catch(error){if(e.elementType==='IMAGE')c._mediaFailed=true;payload.recoveryIssues.push((e.elementType==='IMAGE'?'Image':e.elementType)+' recovery: '+error.message)}
 }
 return payload;
}
async function lineImage(c){
 const n=v=>Number.isFinite(Number(v))?Math.max(-100000,Math.min(100000,Number(v)))*10:0;
 const a={x:n(c.start?.x),y:n(c.start?.y)},b={x:n(c.end?.x),y:n(c.end?.y)},weight=Math.max(1,Math.min(30,Number(c.lineWeight)||2)),pad=Math.max(12,weight*3),left=Math.min(a.x,b.x)-pad,top=Math.min(a.y,b.y)-pad,w=Math.max(20,Math.abs(a.x-b.x)+pad*2),h=Math.max(20,Math.abs(a.y-b.y)+pad*2),scale=Math.min(2,2048/w,2048/h),canvas=document.createElement('canvas');canvas.width=Math.ceil(w*scale);canvas.height=Math.ceil(h*scale);const ctx=canvas.getContext('2d');ctx.scale(scale,scale);ctx.translate(-left,-top);ctx.strokeStyle=MilanoteClipboard.color(c.color)||'#333333';ctx.fillStyle=ctx.strokeStyle;ctx.lineWidth=weight;ctx.lineCap='round';if(/dash/i.test(c.lineStyle||''))ctx.setLineDash([weight*4,weight*3]);else if(/dot/i.test(c.lineStyle||''))ctx.setLineDash([weight,weight*3]);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.setLineDash([]);
 function arrow(p,q,style){if(!/arrow/i.test(style||''))return;const angle=Math.atan2(p.y-q.y,p.x-q.x),size=Math.max(9,weight*4);ctx.beginPath();ctx.moveTo(p.x-size*Math.cos(angle-.5),p.y-size*Math.sin(angle-.5));ctx.lineTo(p.x,p.y);ctx.lineTo(p.x-size*Math.cos(angle+.5),p.y-size*Math.sin(angle+.5));ctx.stroke()};arrow(a,b,c.startStyle);arrow(b,a,c.endStyle);return {data:canvas.toDataURL('image/png'),box:{x:left,y:top,width:w,height:h}};
}
root.MilanoteRecovery={recover,prepare,safeSVG,allowedMedia,raster};
})(globalThis);
