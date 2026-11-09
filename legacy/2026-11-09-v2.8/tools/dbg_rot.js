const {chromium}=require('playwright');const path=require('path');
(async()=>{
const b=await chromium.launch({headless:true,executablePath:'/usr/local/bin/chromium',args:['--no-sandbox','--allow-file-access-from-files']});
const p=await b.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,colorScheme:'light'});
await p.goto('file://'+encodeURI(path.resolve('/data/workspace/wqn.html')),{waitUntil:'load'});
await p.waitForSelector('[data-act="newgame"]',{timeout:20000});
await p.click('[data-act="newgame"]');await p.waitForSelector('.panel.on .opt',{timeout:10000});
await p.evaluate(()=>document.querySelector('[data-view="landscape"]').click());await p.waitForTimeout(350);
console.log(JSON.stringify(await p.evaluate(()=>{
  const sels=['#app','.stage','.stage-bg','.stage-char','.stage-tools','.tabs','#landHint','.pchip','.panel.on','.stage .bubble'];
  const out={};
  sels.forEach(s=>{const e=document.querySelector(s);if(!e){out[s]='MISSING';return;}
    const r=e.getBoundingClientRect(),c=getComputedStyle(e);
    out[s]={rect:[r.x,r.y,r.width,r.height].map(Math.round),
      pos:c.position,parent:e.parentElement?(e.parentElement.id||e.parentElement.className):'',
      transform:c.transform.slice(0,44)};});
  return out;
}),null,1));
await b.close();})();
