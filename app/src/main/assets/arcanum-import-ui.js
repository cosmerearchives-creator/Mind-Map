window.installArcanumImport=function(app){'use strict';
 let busy=false,seen='';const bridge=window.ArcanumShare;
 async function importFile(file,token=''){
  if(busy)return;busy=true;
  try{if(file.size>ArcanumPackage.LIMITS.compressed)throw Error('Transfer exceeds 32 MiB.');
   const pkg=await ArcanumPackage.read(new Uint8Array(await file.arrayBuffer()),fflate);
   if(!app.ready())throw Error('Wait for device storage and finish open editors before importing.');
   const result=await app.commit(pkg);
   if(token)bridge.postMessage(JSON.stringify({action:'saved',token}));
   app.open();alert('Saved to Dumping Ground: '+result.cards+' Stickies added; '+result.skipped+' unchanged source items already present.');
  }catch(e){alert('Archives transfer was not confirmed: '+e.message+' Your source entries remain queued. Use Retry shared import or share the file again.');}
  finally{busy=false}
 }
 function choose(){const input=document.createElement('input');input.type='file';input.accept='.arcanum,application/vnd.arcanum.package+zip,application/zip';input.onchange=()=>{if(input.files[0])importFile(input.files[0])};input.click()}
 document.addEventListener('click',e=>{if(e.target.closest('#arcanumImport'))choose();if(e.target.closest('#dumpingGround'))app.open();if(e.target.closest('#arcanumRetry')){seen='';poll()}});
 function poll(){if(bridge&&!busy&&app.ready())bridge.postMessage(JSON.stringify({action:'poll'}))}
 if(bridge){bridge.onmessage=async e=>{try{const {token}=JSON.parse(e.data);if(!token||token===seen||busy)return;seen=token;const response=await fetch('/arcanum/'+encodeURIComponent(token));if(!response.ok)throw Error('Cannot read staged share.');await importFile(await response.blob(),token)}catch(e){alert(e.message)}};setInterval(poll,1500);poll()}
 // Attachments stay in the saved card and are available offline in a download dialog.
 document.addEventListener('click',e=>{const source=e.target.closest('[data-arcanum-source]');if(source){const c=[...(app.board()?.cards||[]),...(app.board()?.unsorted||[])].find(c=>c.id===source.dataset.arcanumSource);if(!c)return;app.modal('Source details','<p>'+app.esc(c.source.origin)+' · '+app.esc(c.source.id)+'</p>'+(c.source.url?'<p><a target="_blank" rel="noopener noreferrer" href="'+app.esc(c.source.url)+'">Open original source</a></p>':'')+'<pre style="white-space:pre-wrap;overflow-wrap:anywhere">'+app.esc(JSON.stringify(c.source.metadata,null,2))+'</pre>','<button class="outline" id="closeSourceDetails">Close</button>');document.querySelector('#closeSourceDetails').onclick=app.close;return}const el=e.target.closest('[data-arcanum-attachments]');if(!el)return;const c=[...(app.board()?.cards||[]),...(app.board()?.unsorted||[])].find(c=>c.id===el.dataset.arcanumAttachments);if(!c)return;app.modal('Attachments',c.attachments.map((a,i)=>'<p><button class="outline" data-download-attachment="'+i+'">'+app.esc(a.name)+'</button></p>').join(''),'<button class="outline" id="closeAttachments">Close</button>');document.querySelector('#closeAttachments').onclick=app.close;document.querySelectorAll('[data-download-attachment]').forEach(button=>button.onclick=async()=>{const a=c.attachments[Number(button.dataset.downloadAttachment)];try{const response=await fetch(await SilverlightAssets.load(a.data)),bytes=new Uint8Array(await response.arrayBuffer());if(window.ArcanumBackup){const sink=await ArcanumBackupFiles.open({name:a.name,mime:a.mime});try{await sink.write(bytes);await sink.commit(await ArcanumPackage.hash(bytes))}catch(e){await sink.abort().catch(()=>{});throw e}}else{const url=URL.createObjectURL(new Blob([bytes],{type:a.mime})),link=document.createElement('a');link.href=url;link.download=a.name;link.click();setTimeout(()=>URL.revokeObjectURL(url),60000)}}catch(e){alert('Attachment could not be saved: '+e.message)}})});
};
