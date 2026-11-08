/* v2.6 iOS「假横屏」专项
   双引擎实机：WebKit（iOS Safari 内核）+ Chromium（iOS Chrome / WebView 均用 WebKit，但对照跑）
   验证：旋转画布生效、文字不被自动放大、常驻退出条 touch 命中、
        地址栏收放不抖动、三个退出入口、零报错、不请求全屏/锁方向。 */
const path=require('path');
const {chromium,webkit}=require('playwright');
const URL='file://'+encodeURI(path.resolve('/data/workspace/wqn.html'));
const IPHONE_UA='Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) '
  +'AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const errs=[];
const VIEWPORTS=[
  {name:'iPhone SE',w:375,h:667},
  {name:'iPhone 14',w:390,h:844},
  {name:'iPhone Pro Max',w:428,h:926},
  {name:'iPad 竖屏',w:820,h:1180}
];

async function boot(engine,vp){
  const b=await engine.launch({headless:true,...(engine===chromium
    ?{executablePath:'/usr/local/bin/chromium',args:['--no-sandbox','--allow-file-access-from-files']}:{})});
  const p=await b.newPage({viewport:{width:vp.w,height:vp.h},userAgent:IPHONE_UA,
    isMobile:true,hasTouch:true,deviceScaleFactor:3,colorScheme:'light'});
  p.on('pageerror',e=>errs.push(vp.name+': '+e.message));
  await p.goto(URL,{waitUntil:'load'});
  await p.waitForSelector('[data-act="newgame"]',{timeout:25000});
  await p.tap('[data-act="newgame"]');
  await p.waitForSelector('.panel.on .opt',{timeout:12000});
  return {b,p};
}
const state=p=>p.evaluate(()=>{
  const app=document.getElementById('app'),cs=getComputedStyle(app);
  const hint=document.getElementById('landHint');
  const ex=hint&&hint.querySelector('[data-land-exit]');
  let exitHit=false;
  if(ex){const r=ex.getBoundingClientRect(),e=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
    exitHit=ex.contains(e)||ex===e;}
  const btn=document.querySelector('[data-view="landscape"]');
  return {cls:document.documentElement.className,
    rot:cs.transform,textAdjust:cs.webkitTextSizeAdjust||cs.textSizeAdjust||'',
    touchAction:cs.touchAction,
    fullscreen:!!document.fullscreenElement,
    exitBtn:!!ex,hintFixed:(()=>{const h=document.getElementById('landHint');return !!(h&&h.parentElement===document.body&&h.querySelector('[data-land-exit]'));})(),
    exitHit:exitHit,btnOn:btn?btn.classList.contains('on'):false,
    pressed:btn?btn.getAttribute('aria-pressed'):'',
    vp:[innerWidth,innerHeight]};
});
async function tap(p,sel){
  // 用真实坐标触摸点击（旋转后的 elementFromPoint 由浏览器换算）
  const pos=await p.evaluate(s=>{const e=document.querySelector(s);
    if(!e)return null;const x=e.getBoundingClientRect();
    return{x:x.x+x.width/2,y:x.y+x.height/2};},sel);
  if(!pos)return false;
  await p.touchscreen.tap(pos.x,pos.y);await p.waitForTimeout(300);return true;
}

(async()=>{
for(const eng of [
  {name:'WebKit (iOS Safari)',e:webkit},
  {name:'Chromium (对照)',e:chromium}
]){
  console.log('\n=== '+eng.name+' ===');
  for(const vp of VIEWPORTS){
    let b,p;
    try{({b,p}=await boot(eng.e,vp));}
    catch(e){
      if(/Executable doesn't exist/.test(e.message)){
        console.log(vp.name.padEnd(15),'SKIP：本环境未安装 WebKit 二进制，'
          +'无法跑真 iOS Safari 内核；下面 Chromium 的 iPhone 模拟为对照实测');
        continue;
      }
      console.log(vp.name,'启动失败',e.message.slice(0,90));continue;}
    const s0=await state(p);
    await tap(p,'[data-view="landscape"]');
    const s1=await state(p);
    const rotated=/matrix\(0,\s*1,\s*-1,\s*0/.test(s1.rot)||/rotate\(90/.test(s1.rot);
    /* iOS 地址栏收放：高度变 60px，但宽高关系不变，画布不应重旋/抖动 */
    await p.setViewportSize({width:vp.w,height:vp.h-60});await p.waitForTimeout(260);
    const s2=await state(p);
    const stable=s2.cls.includes('rot90')===s1.cls.includes('rot90')&&s2.rot===s1.rot;
    await p.setViewportSize({width:vp.w,height:vp.h});await p.waitForTimeout(220);
    /* 触摸点退出条 */
    const okTap=await tap(p,'[data-land-exit]');
    const s3=await state(p);
    /* 再开一次，用横屏键退出（toggle 语义） */
    await tap(p,'[data-view="landscape"]');
    const s4=await state(p);
    await tap(p,'[data-view="landscape"]');
    const s5=await state(p);
    console.log(vp.name.padEnd(15),
      JSON.stringify({rot90:s1.cls.includes('rot90'),rotated,
        textAdjust:s1.textAdjust,fullscreen:s1.fullscreen,
        hintFixed:s1.hintFixed,exitHit:s1.exitHit,pressed:s1.pressed,
        addrBarStable:stable,
        exitByTap:!s3.cls.includes('landscape'),
        toggleBack:!s5.cls.includes('landscape')&&!s5.fullscreen&&!s5.btnOn,
        errs:errs.length}));
    if(vp.name==='iPhone 14'){
      await tap(p,'[data-view="landscape"]');
      await p.screenshot({path:'assets/ui_v26_ios_'+eng.name.split(' ')[0].toLowerCase()+'.png'});
    }
    await b.close();
  }
}
console.log('\n零报错',errs.length===0,errs.slice(0,4));
})();
