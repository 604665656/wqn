/* v2.4 综合实测：呼吸真动、待机微表演、横屏按钮可点且布局生效、零报错 */
const {chromium}=require('playwright');const path=require('path');
(async()=>{
const b=await chromium.launch({headless:true,executablePath:'/usr/local/bin/chromium',
  args:['--no-sandbox','--allow-file-access-from-files']});
const p=await b.newPage({viewport:{width:390,height:844},colorScheme:'dark'});
const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('file://'+encodeURI(path.resolve('/data/workspace/wqn.html')),{waitUntil:'load'});
await p.waitForSelector('[data-act="newgame"]',{timeout:20000});
await p.click('[data-act="newgame"]');await p.waitForSelector('.panel.on .opt',{timeout:10000});

/* 1) 呼吸：animationName 含 breathe，且独立 translate/scale 值随时间变化 */
const B=await p.evaluate(async()=>{
  const c=document.querySelector('.stage-char');if(!c)return {noChar:true};
  const a=getComputedStyle(c);
  const name=a.animationName;
  const t0=a.translate,s0=a.scale;
  await new Promise(r=>setTimeout(r,1200));
  const a2=getComputedStyle(c);
  return {name:name,hasBreathe:name.indexOf('breathe')>=0,
    t0:t0,t1:a2.translate,s0:s0,s1:a2.scale,
    moved:t0!==a2.translate||s0!==a2.scale};
});
console.log('呼吸',B);

/* 2) 待机微表演：监听 class 变化，等 9 秒内至少出现一次 ch-idle-* */
await p.evaluate(()=>{
  window.__idle=[];const c=document.querySelector('.stage-char');
  new MutationObserver(()=>{
    const hit=(c.className.match(/ch-idle-[a-d]/)||[])[0];
    if(hit&&window.__idle[window.__idle.length-1]!==hit)window.__idle.push(hit);
  }).observe(c,{attributes:true,attributeFilter:['class']});
});
await p.waitForTimeout(9500);
const I=await p.evaluate(()=>window.__idle.slice());
console.log('待机微表演 9 秒内触发',I.length,'次',I.join(','));

/* 3) 横屏键默认露出、不在收起的齿轮里 */
const L0=await p.evaluate(()=>{
  const b=document.querySelector('[data-view="landscape"]');
  const vt=document.querySelector('.viewtools');
  return {exists:!!b,outsideGear:!!b&&!b.closest('.viewtools'),
    visible:!!b&&b.getBoundingClientRect().width>0,
    gearHidden:!!vt&&getComputedStyle(vt).display==='none'};
});
console.log('横屏键',L0);

/* 4) 点横屏：类生效、提示条出现、窄屏下舞台铺满宽度、说清不能强制旋转 */
await p.click('[data-view="landscape"]');await p.waitForTimeout(350);
const L1=await p.evaluate(()=>{
  const st=document.querySelector('.stage'),hint=document.getElementById('landHint');
  return {cls:document.documentElement.classList.contains('landscape'),
    hint:!!hint,hintText:hint?hint.textContent.slice(0,80):'',
    stageW:Math.round(st.getBoundingClientRect().width),
    vpW:Math.round(window.innerWidth),
    cols:getComputedStyle(document.querySelector('.opts')||document.body).gridTemplateColumns};
});
console.log('点横屏后',L1);
await p.screenshot({path:'assets/ui_v24_land.png'});

/* 5) 关掉提示条、切回竖屏 */
await p.click('[data-landhint-close]');await p.waitForTimeout(120);
const hintGone=await p.evaluate(()=>!document.getElementById('landHint'));
await p.click('[data-view="landscape"]');await p.waitForTimeout(200);
const L2=await p.evaluate(()=>({cls:document.documentElement.classList.contains('landscape'),
  hint:!!document.getElementById('landHint')}));
console.log('提示条可关',hintGone,'再点回竖屏',L2);

/* 6) 减少动效下待机不排程 */
const RM=await p.evaluate(()=>{
  document.documentElement.classList.add('rm');
  const c=document.querySelector('.stage-char');
  return {anim:getComputedStyle(c).animationName};
});
console.log('减少动效',RM);

await p.evaluate(()=>document.documentElement.classList.remove('rm'));
await p.evaluate(()=>window.scrollTo(0,0));
await p.screenshot({path:'assets/ui_v24_main.png'});
console.log('零报错',errs.length===0,errs.slice(0,3));
await b.close();})();
