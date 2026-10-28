const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
const root={addEventListener(){},firstChild:null};let pending=true,allowExit=false,asked=0;
const context={document:{querySelector:s=>s==='#modalRoot'?root:null},confirm:()=>{asked++;return allowExit}};context.window=context;context.SilverlightLocalSaveStatus=()=>({pending});
vm.runInNewContext(fs.readFileSync('app/src/main/assets/back-navigation.js','utf8'),context);
context.installBackNavigation({cancelGesture:()=>false,back:()=>false,hasDrafts:()=>false});
assert.equal(context.silverlightBack(),true,'Android Back stays open when pending-save exit is declined');assert.equal(asked,1);
pending=false;assert.equal(context.silverlightBack(),false);assert.equal(asked,1,'durable save needs no exit warning');
pending=true;allowExit=true;assert.equal(context.silverlightBack(),false,'explicit exit remains available');
console.log('PASS Android Back protects pending local saves and permits exit after save or explicit confirmation.');
