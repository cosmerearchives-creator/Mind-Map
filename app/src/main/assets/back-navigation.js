/* Native Back asks the page to finish the topmost interaction before exiting. */
window.installBackNavigation=function(app){
 const root=document.querySelector('#modalRoot');
 root.addEventListener('input',()=>{if(root.firstElementChild)root.firstElementChild.dataset.dirty='true'});
 root.addEventListener('change',()=>{if(root.firstElementChild)root.firstElementChild.dataset.dirty='true'});
 window.silverlightBack=()=>{
  const expanded=document.querySelector('.richExpanded');if(expanded){expanded.querySelector('[data-collapse]')?.click();return true}
  const context=document.querySelector('.silverlightContextMenu');if(context){context.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));return true}
  if(root.firstChild){if(root.firstElementChild.dataset.dirty==='true'&&!confirm('Discard the unsaved changes in this editor?'))return true;const cancel=root.querySelector('#cancel,#personCancel,#relationCancel,#familyClose,#familyCancel,#familyRenameCancel,#cancelRecovery,[data-cancel]');if(cancel)cancel.click();else app.close();return true}
  if(app.cancelGesture())return true;
  if(app.back())return true;
  return false;
 };
};
