const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const assets=path.join(__dirname,'../app/src/main/assets');
new Function(fs.readFileSync(path.join(assets,'index.html'),'utf8').match(/<script>([\s\S]*)<\/script>/)[1]);
for(const name of fs.readdirSync(assets).filter(x=>x.endsWith('.js')))execFileSync(process.execPath,['--check',path.join(assets,name)],{stdio:'inherit'});
for(const name of ['release-polish.cjs','sync-diagnostics.cjs','large-sync-stream.cjs','sync-core.cjs','auto-sync-core.cjs','sticky-property-sync.cjs','rich-sync.cjs','milanote-core.cjs','milanote-clipboard.cjs','clipboard-blank-boards.cjs','duplicate-boards.cjs','selection-core.cjs','planning-update.cjs','interaction-update.cjs','live-sync-scheduler.cjs','assets-transfer.cjs','upload-progress.cjs','workspace-capacity.cjs'])execFileSync(process.execPath,[path.join(__dirname,name)],{stdio:'inherit'});
console.log('PASS: all shared scripts parse and both snapshot/merge suites pass.');
