/* 截 v2.8 提示条三档，拼成对比图 */
const {chromium}=require('playwright');const path=require('path');
(async()=>{
const b=await chromium.launch({headless:true,executablePath:'/usr/local/bin/chromium',args:['--no-sandbox','--allow-file-access-from-files']});
const p=await b.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,colorScheme:'light'});
await p.goto('file://'+encodeURI(path.resolve('/data/workspace/wqn.html')),{waitUntil:'load'});
await p.waitForSelector('[data-act="newgame"]',{timeout:20000});
await p.tap('[data-act="newgame"]');await p.waitForSelector('.panel.on .opt',{timeout:12000});
await p.evaluate(()=>document.querySelector('[data-view="landscape"]').click());
await p.waitForTimeout(350);
await p.screenshot({path:'assets/ui_v28_hint_min.png'});
const set=async mode=>{
  await p.evaluate(()=>{const t=document.querySelector('[data-t="set"]');if(t)t.click();});
  await p.waitForTimeout(220);
  await p.evaluate(m=>{const x=document.querySelector('[data-hint-mode="'+m+'"]');if(x)x.click();},mode);
  await p.waitForTimeout(260);
  await p.evaluate(()=>{const t=document.querySelector('[data-t="main"]');if(t)t.click();});
  await p.waitForTimeout(260);
};
await set('full');await p.screenshot({path:'assets/ui_v28_hint_full.png'});
await set('off');await p.screenshot({path:'assets/ui_v28_hint_off.png'});
await b.close();console.log('三张截图完成');
})();
