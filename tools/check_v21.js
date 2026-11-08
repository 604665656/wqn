const {chromium}=require('playwright');const path=require('path');
(async()=>{const b=await chromium.launch({headless:true,executablePath:'/usr/local/bin/chromium',args:['--no-sandbox','--allow-file-access-from-files']});
const p=await b.newPage({viewport:{width:390,height:844},colorScheme:'dark'});
const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('file://'+encodeURI(path.resolve('/data/workspace/wqn.html')),{waitUntil:'load'});
await p.waitForSelector('[data-act="newgame"]',{timeout:20000});
await p.click('[data-act="newgame"]');await p.waitForSelector('.panel.on .opt',{timeout:10000});
const A=await p.evaluate(()=>{const s=window.WQN.stage.status();
 return {layers:s.layers,scenes:s.backdropCount,chapters:s.scenes.length,pending:s.pending.length,
  bd:document.querySelectorAll('.bdpick').length,
  map:[['weave2','织一匹布'],['plaster','夯土起墙'],['ferry','撑篙过津渡'],['granary','量入仓廪'],
   ['astro','候气观星'],['mint','铸币权轻重'],['mask2','执面礼容'],['drum2','击鼓聚众']]
   .every(([k,t])=>window.WQN.stage.poseForOption({t:t})===k)};});
console.log('素材与映射',A);
await p.click('.bubble-voice[data-guide="say"]');
const t1=await p.evaluate(()=>document.querySelector('.bubble-voice[data-guide="say"]').textContent);
await p.click('[data-t="log"]');await p.waitForTimeout(80);await p.click('[data-t="main"]');await p.waitForTimeout(70);
const t2=await p.evaluate(()=>document.querySelector('.bubble-voice[data-guide="say"]').textContent);
await p.click('.bubble-voice[data-guide="say"]');await p.waitForTimeout(80);
const t3=await p.evaluate(()=>document.querySelector('.bubble-voice[data-guide="say"]').textContent);
console.log('朗读 点念→',t1,'重绘→',t2,'再点→',t3);
await p.click('[data-t="set"]');await p.click('[data-setmin="0"]');await p.waitForTimeout(120);
await p.evaluate(()=>document.querySelector('[data-scene-preview="paper"]').click());await p.waitForTimeout(220);
const r=await p.locator('.sp-char').boundingBox();
await p.mouse.move(r.x+r.width/2,r.y+r.height/2);await p.mouse.down();await p.waitForTimeout(110);await p.mouse.up();await p.waitForTimeout(50);
const bounce=await p.evaluate(()=>document.querySelector('.sp-char').className.includes('sp-bounce'));
await p.mouse.move(r.x+r.width/2,r.y+r.height/2);await p.mouse.down();await p.waitForTimeout(700);await p.mouse.up();await p.waitForTimeout(120);
const panel=await p.evaluate(()=>({open:!!document.querySelector('.pose-picker'),n:document.querySelectorAll('[data-pose-pick]').length}));
const s0=await p.evaluate(()=>document.querySelector('.sp-char').src);
await p.click('[data-pose-pick="happy"]');await p.waitForTimeout(120);
const changed=await p.evaluate(s0=>document.querySelector('.sp-char').src!==s0,s0);
const box=await p.locator('.sp-box').boundingBox(),sp=await p.locator('.sp-char').boundingBox();
await p.mouse.move(sp.x+sp.width/2,sp.y+sp.height/2);await p.mouse.down();
await p.mouse.move(sp.x+sp.width/2+400,sp.y+sp.height/2+400,{steps:8});await p.mouse.up();await p.waitForTimeout(100);
const sp2=await p.locator('.sp-char').boundingBox();
const inside=sp2.x>=box.x-1&&sp2.y>=box.y-1&&sp2.x+sp2.width<=box.x+box.width+1&&sp2.y+sp2.height<=box.y+box.height+1;
console.log('预览 短按回弹',bounce,'长按面板',panel,'选表情同步',changed,'拖不出框',inside);
await p.locator('.sp-box').screenshot({path:'assets/ui_v21_preview.png'});
await p.click('[data-sp-close]');await p.click('[data-close-set]');await p.waitForTimeout(150);
await p.evaluate(()=>window.scrollTo(0,0));await p.screenshot({path:'assets/ui_v21_main.png'});
console.log('零报错',errs.length===0,errs.slice(0,2));
await b.close();})();
