/* One-time, per-record presentation migration. Recovery data stays with the record. */
(function(root){'use strict';const VERSION=1,PREFIX='silverlight-rich-v1:';
 const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const isNote=c=>!c.kind||c.kind==='text'||c.kind==='task';
 function plain(s){return String(s||'').replace(/^silverlight-rich-v1:/,'').replace(/<br\s*\/?\s*>|<\/?(?:p|div|li|h[1-6])(?:\s[^>]*)?>/gi,'\n').replace(/<[^>]*>/g,'').replace(/&#(x[\da-f]+|\d+);/gi,(_,n)=>{const code=n[0].toLowerCase()==='x'?parseInt(n.slice(1),16):Number(n);return code<=0x10ffff?String.fromCodePoint(code):''}).replace(/&(amp|lt|gt|quot|apos|nbsp);/g,(_,n)=>({amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' '})[n]).trim()}
 function card(c){if(c.stickyLayoutVersion===VERSION&&!(isNote(c)&&c.title)&&!(c.kind==='nested'&&c.body))return false;if(c.codex||!isNote(c)&&c.kind!=='nested')return false;const title=String(c.title||''),body=String(c.body||'');
  if((title||body)&&!c.legacyStickyLayout)c.legacyStickyLayout={title,body};
  if(isNote(c)){if(title)c.body=body.startsWith(PREFIX)?PREFIX+'<p><strong>'+escape(title)+'</strong></p>'+body.slice(PREFIX.length):title+(body?'\n\n'+body:'');c.title='';c.hideTitle=true}
  else{const text=body.startsWith(PREFIX)?plain(body):body;if(text)c.title=title+(title?'\n\n':'')+text;c.body=''}
  c.stickyLayoutVersion=VERSION;return true;
 }
 function board(b){if(b.templateCatalog===1||b.codexEntry)return false;let changed=false;for(const c of [...(b.cards||[]),...(b.unsorted||[])])changed=card(c)||changed;if(b.stickyLayoutVersion!==VERSION){b.stickyLayoutVersion=VERSION;changed=true}return changed}
 const api={VERSION,PREFIX,isNote,plain,card,board};if(typeof module!=='undefined')module.exports=api;else root.SilverlightStickyLayout=api;
})(globalThis);
