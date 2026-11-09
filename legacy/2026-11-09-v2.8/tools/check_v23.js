/* v2.3 综合实测：素材规模、新层映射、人声卡、朗读表演事件、全屏预览跟随、零报错 */
const {chromium}=require('playwright');const path=require('path');
(async()=>{
const b=await chromium.launch({headless:true,executablePath:'/usr/local/bin/chromium',
  args:['--no-sandbox','--allow-file-access-from-files']});
const p=await b.newPage({viewport:{width:390,height:844},colorScheme:'dark'});
const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('file://'+encodeURI(path.resolve('/data/workspace/wqn.html')),{waitUntil:'load'});
await p.waitForSelector('[data-act="newgame"]',{timeout:20000});
await p.click('[data-act="newgame"]');await p.waitForSelector('.panel.on .opt',{timeout:10000});

const A=await p.evaluate(()=>{
  const s=window.WQN.stage.status();
  const M=[['plow4','扶犁深耕'],['sieve4','簸扬扬糠'],['quill4','削简书契'],
    ['lamp4','挑灯夜分'],['drum4','播鼗摇鼓'],['net4','结网罟目'],
    ['cart4','舆载任重'],['oven4','炊釜粒食']];
  return {layers:s.layers,scenes:s.backdropCount,chapters:s.scenes.length,
    pending:s.pending.length,bd:document.querySelectorAll('.bdpick').length,
    map:M.every(([k,t])=>window.WQN.stage.poseForOption({t:t})===k),
    mood:window.WQN.stage.talkMood('忽有异象，失手骤变')};
});
console.log('素材与映射',A);

/* 说话表演事件驱动：开始加类、结束移除。必须在主页测，主页才有立绘节点 */
const T=await p.evaluate(()=>{
  const ch=document.querySelector('.stage-char');if(!ch)return {noChar:true};
  document.dispatchEvent(new CustomEvent('wqn:speakstart',{detail:{mood:'happy',silent:false}}));
  const on=ch.classList.contains('ch-talking');
  document.dispatchEvent(new CustomEvent('wqn:speakend',{}));
  return {on:on,off:!ch.classList.contains('ch-talking')};
});
console.log('说话表演事件',T);

/* 设置页：人声卡、声线档、试听、开关 */
await p.click('[data-t="set"]');await p.waitForTimeout(140);
const V=await p.evaluate(()=>({card:document.body.textContent.indexOf('向 导 人 声')>=0,
  vp:document.querySelectorAll('[data-voicepack]').length,
  cue:document.querySelectorAll('[data-cue-try]').length,
  talk:document.querySelectorAll('[data-talkact]').length,
  cueSw:document.querySelectorAll('[data-cue]').length}));
await p.click('[data-voicepack="deep"]');await p.waitForTimeout(120);
const vpNow=await p.evaluate(()=>window.WQN.a11y.status().voicePack);
await p.click('[data-voicepack="gentle"]');await p.waitForTimeout(100);
console.log('人声卡',V,'切低沉档→',vpNow);

/* 全屏预览：点缩略图 → 整屏背景与选中场景一致 */
await p.evaluate(()=>document.querySelector('[data-scene-preview="paper"]').click());
await p.waitForTimeout(220);
const P1=await p.evaluate(()=>({open:!!document.querySelector('#scenePreview'),
  name:document.querySelector('.sp-bar b').textContent,
  match:document.querySelector('.sp-bg').src===window.WQN.stage.bgURL()}));
/* 预览内切到已解锁的另一张 */
const keys=await p.evaluate(()=>Array.from(document.querySelectorAll('[data-sp-key]')).map(x=>x.dataset.spKey));
const other=keys.find(k=>k!=='paper');
if(other){await p.click('[data-sp-key="'+other+'"]');await p.waitForTimeout(180);}
else{await p.click('[data-sp-key="paper"]');await p.waitForTimeout(150);}
const P2=await p.evaluate(()=>({name:document.querySelector('.sp-bar b').textContent,
  match:document.querySelector('.sp-bg').src===window.WQN.stage.bgURL(),
  on:document.querySelectorAll('[data-sp-key].on').length===1}));
console.log('全屏预览跟随选中场景',P1,'预览内点场景名',other||'仅素纸已解锁（点同名不串板）',P2);

/* 预览立绘短按 / 长按 / 拖动不出框 */
const r=await p.locator('.sp-char').boundingBox();
await p.mouse.move(r.x+r.width/2,r.y+r.height/2);await p.mouse.down();
await p.waitForTimeout(110);await p.mouse.up();await p.waitForTimeout(50);
const bounce=await p.evaluate(()=>document.querySelector('.sp-char').className.includes('sp-bounce'));
await p.mouse.move(r.x+r.width/2,r.y+r.height/2);await p.mouse.down();
await p.waitForTimeout(700);await p.mouse.up();await p.waitForTimeout(120);
const panel=await p.evaluate(()=>!!document.querySelector('.pose-picker'));
const s0=await p.evaluate(()=>document.querySelector('.sp-char').src);
if(panel)await p.click('[data-pose-pick="happy"]');
await p.waitForTimeout(120);
const changed=await p.evaluate(s0=>document.querySelector('.sp-char').src!==s0,s0);
const box=await p.locator('.sp-box').boundingBox();
const sp=await p.locator('.sp-char').boundingBox();
await p.mouse.move(sp.x+sp.width/2,sp.y+sp.height/2);await p.mouse.down();
await p.mouse.move(sp.x+sp.width/2+400,sp.y+sp.height/2+400,{steps:8});
await p.mouse.up();await p.waitForTimeout(100);
const sp2=await p.locator('.sp-char').boundingBox();
const inside=sp2.x>=box.x-1&&sp2.y>=box.y-1&&
  sp2.x+sp2.width<=box.x+box.width+1&&sp2.y+sp2.height<=box.y+box.height+1;
console.log('预览互动 短按',bounce,'长按面板',panel,'选表情同步',changed,'拖不出框',inside);
await p.locator('.sp-box').screenshot({path:'assets/ui_v23_preview.png'});
await p.click('[data-sp-close]');await p.waitForTimeout(120);
await p.click('[data-t="main"]');await p.waitForTimeout(140);
await p.evaluate(()=>window.scrollTo(0,0));
await p.screenshot({path:'assets/ui_v23_main.png'});
console.log('零报错',errs.length===0,errs.slice(0,2));
await b.close();})();
