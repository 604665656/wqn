/* v2.6 横屏专项：旋转画布可见、按钮开关、三个退出入口、物理横屏自动转正、可点选项、零报错 */
const {chromium}=require('playwright');const path=require('path');
const URL='file://'+encodeURI(path.resolve('/data/workspace/wqn.html'));
const LAUNCH={headless:true,executablePath:'/usr/local/bin/chromium',
  args:['--no-sandbox','--allow-file-access-from-files']};
const boot=async(p)=>{
  await p.goto(URL,{waitUntil:'load'});
  await p.waitForSelector('[data-act="newgame"]',{timeout:20000});
  await p.click('[data-act="newgame"]');await p.waitForSelector('.panel.on .opt',{timeout:10000});
};
const state=p=>p.evaluate(()=>{
  const app=document.getElementById('app'),r=app.getBoundingClientRect();
  const btn=document.querySelector('[data-view="landscape"]');
  return {cls:document.documentElement.className,
    app:[Math.round(r.width),Math.round(r.height)],
    rot:getComputedStyle(app).transform,
    fullscreen:!!document.fullscreenElement,
    btnText:btn?btn.textContent:'',btnOn:btn?btn.classList.contains('on'):false,
    btnPressed:btn?btn.getAttribute('aria-pressed'):'',
    exit:!!document.querySelector('[data-land-exit]'),
    hint:!!document.getElementById('landHint'),
    vp:[innerWidth,innerHeight]};
});
const clickAt=async(p,sel)=>{
  const r=await p.evaluate(s=>{const e=document.querySelector(s);
    if(!e)return null;const x=e.getBoundingClientRect();
    return {x:x.x+x.width/2,y:x.y+x.height/2};},sel);
  if(!r)return false;
  await p.mouse.click(r.x,r.y);return true;
};
const clickLand=p=>clickAt(p,'[data-view="landscape"]');
(async()=>{
const b=await chromium.launch(LAUNCH);
/* ---- A. 竖屏物理手机：点横屏 → 旋转画布 → 三种退出 ---- */
const p=await b.newPage({viewport:{width:390,height:844},colorScheme:'dark',isMobile:true,hasTouch:true});
const errs=[];p.on('pageerror',e=>errs.push(e.message));
await boot(p);
const s0=await state(p);console.log('① 开局',s0);
await clickLand(p);await p.waitForTimeout(350);
const s1=await state(p);console.log('② 点横屏',s1);
await p.screenshot({path:'assets/ui_v26_rot90.png'});
/* 旋转画布下点第一个选项，确认触摸命中没有被 transform 搞坏 */
const t0=await p.evaluate(()=>window.WQN.engine.state().phase);
const ok=await p.evaluate(()=>{
  const o=document.querySelector('.panel.on .opt');if(!o)return false;
  const r=o.getBoundingClientRect();
  const hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
  return o.contains(hit)||hit===o;
});
if(ok)await clickAt(p,'.panel.on .opt');await p.waitForTimeout(400);
const t1=await p.evaluate(()=>window.WQN.engine.state().phase);
console.log('③ 旋转后选项可点',ok,'阶段',t0,'→',t1,
  '退出条仍在',await p.evaluate(()=>!!document.querySelector('[data-land-exit]')));
/* 退出入口 1：常驻「退出横屏」按钮 */
await clickAt(p,'[data-land-exit]');await p.waitForTimeout(300);
const s2=await state(p);console.log('④ 退出按钮',s2.cls.includes('landscape')?'失败':'已回竖屏',s2);
/* 退出入口 2：Esc */
await clickLand(p);await p.waitForTimeout(250);
await p.keyboard.press('Escape');await p.waitForTimeout(250);
const s3=await state(p);console.log('⑤ Esc 退出',s3.cls.includes('landscape')?'失败':'已回竖屏');
/* 退出入口 3：横屏键再点一次，且不再残留全屏 */
await clickLand(p);await p.waitForTimeout(250);
await clickLand(p);await p.waitForTimeout(250);
const s4=await state(p);console.log('⑥ 再点横屏键',s4.cls.includes('landscape')?'失败':'已回竖屏',
  '残留全屏',s4.fullscreen,'按钮复位',s4.btnText==='▭'&&!s4.btnOn);
await p.close();

/* ---- B. 物理横过来：自动去掉 rot90，用原生横向布局 ---- */
const q=await b.newPage({viewport:{width:844,height:390},colorScheme:'dark',isMobile:true,hasTouch:true});
q.on('pageerror',e=>errs.push(e.message));
await boot(q);
await clickLand(q);await q.waitForTimeout(300);
const h1=await state(q);console.log('⑦ 物理横屏点横屏',h1);
await q.screenshot({path:'assets/ui_v26_real_land.png'});
/* 转回竖屏：应重新旋成横向画布 */
await q.setViewportSize({width:390,height:844});await q.waitForTimeout(400);
const h2=await state(q);console.log('⑧ 转回竖屏',h2.cls.includes('rot90')?'已重旋':'未重旋',h2.app);
await q.close();
console.log('零报错',errs.length===0,errs.slice(0,3));
await b.close();})();
