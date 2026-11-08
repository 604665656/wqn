/* v2.8 提示条专项：三档可换、能关、能拖、跟随全局透明度、隐藏后仍退得出 */
const {chromium}=require('playwright');const path=require('path');
const URL='file://'+encodeURI(path.resolve('/data/workspace/wqn.html'));
(async()=>{
const b=await chromium.launch({headless:true,executablePath:'/usr/local/bin/chromium',
  args:['--no-sandbox','--allow-file-access-from-files']});
const p=await b.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,colorScheme:'light'});
const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto(URL,{waitUntil:'load'});
await p.waitForSelector('[data-act="newgame"]',{timeout:20000});
await p.tap('[data-act="newgame"]');await p.waitForSelector('.panel.on .opt',{timeout:12000});
const tap=async sel=>{
  const r=await p.evaluate(s=>{const e=document.querySelector(s);if(!e)return null;
    const x=e.getBoundingClientRect();return{x:x.x+x.width/2,y:x.y+x.height/2};},sel);
  if(r)await p.touchscreen.tap(r.x,r.y);await p.waitForTimeout(240);return !!r;
};
const st=()=>p.evaluate(()=>{
  const e=document.getElementById('landHint');
  const cs=e?getComputedStyle(e):null;
  const r=e?e.getBoundingClientRect():null;
  const ex=e?e.querySelector('.lh-exit'):null;
  let exHit=false;
  if(ex){const q=ex.getBoundingClientRect(),
    t=document.elementFromPoint(q.x+q.width/2,q.y+q.height/2);
    exHit=ex.contains(t)||ex===t;}
  return {cls:document.documentElement.className,mode:
      (document.documentElement.classList.contains('hint-full')?'full':
       document.documentElement.classList.contains('hint-off')?'off':'min'),
    exists:!!e,display:e?cs.display:'',parent:e?(e.parentElement.id||e.parentElement.tagName):'',
    rect:r?[r.width,r.height].map(Math.round):null,
    noteShown:e?(getComputedStyle(e.querySelector('.lh-note')).display!=='none'):false,
    bg:e?cs.backgroundColor:'',dx:getComputedStyle(document.documentElement).getPropertyValue('--lh-dx').trim(),
    exitHit:exHit,grip:!!(e&&e.querySelector('[data-hint-drag]')),
    hasLandBtn:!!document.querySelector('[data-view="landscape"]')};
});
await tap('[data-view="landscape"]');
console.log('① 默认',JSON.stringify(await st()));
await p.screenshot({path:'assets/ui_v28_hint_min.png'});
/* 拖柄 */
const g=await p.evaluate(()=>{const e=document.querySelector('[data-hint-drag]');if(!e)return null;
  const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2};});
if(g){await p.mouse.move(g.x,g.y);await p.mouse.down();
  await p.mouse.move(g.x-60,g.y-40,{steps:6});await p.mouse.up();await p.waitForTimeout(180);}
console.log('② 拖动后 dx',(await st()).dx);
/* 设置页三档 */
await p.evaluate(()=>{const t=document.querySelector('[data-t="set"]');if(t)t.click();});
await p.waitForTimeout(220);
const hasCtl=await p.evaluate(()=>!!document.querySelector('[data-hint-mode="full"]'));
console.log('设置入口',hasCtl);
await p.evaluate(()=>document.querySelector('[data-hint-mode="full"]').click());
await p.waitForTimeout(260);
console.log('③ 完整',JSON.stringify(await st()));
await p.screenshot({path:'assets/ui_v28_hint_full.png'});
await p.evaluate(()=>{const t=document.querySelector('[data-t="set"]');if(t)t.click();});
await p.waitForTimeout(200);
await p.evaluate(()=>document.querySelector('[data-hint-mode="off"]').click());
await p.waitForTimeout(260);
console.log('④ 隐藏',JSON.stringify(await st()));
/* 隐藏后：设置页内「横屏布局 → 关」必须可达 */
const okExit=await p.evaluate(()=>{
  const b=document.querySelector('[data-landscape="0"]');
  if(!b)return false;b.click();return true;});
await p.waitForTimeout(280);
const after=await p.evaluate(()=>({cls:document.documentElement.className,
  hint:!!document.getElementById('landHint')}));
console.log('⑤ 隐藏后退出',okExit,JSON.stringify(after));
/* 回主页再点工具条 ▯ 也应能退出 */
await tap('[data-view="landscape"]');await p.waitForTimeout(220);
await p.evaluate(()=>{const t=document.querySelector('[data-t="main"]');if(t)t.click();});
await p.waitForTimeout(220);
const btn=await p.evaluate(()=>!!document.querySelector('[data-view="landscape"]'));
console.log('⑤b 主页横屏键仍在',btn);
/* 透明度跟随：改全局 veil 后重建提示条 */
await p.evaluate(()=>{
  const v=document.querySelector('input[data-veil]');
  if(v){v.value=70;v.dispatchEvent(new Event('input',{bubbles:true}));}
  const m=document.querySelector('[data-hint-mode="min"]');if(m)m.click();
});
await p.waitForTimeout(260);
await tap('[data-view="landscape"]');
console.log('⑥ 透明度',JSON.stringify({bg:(await st()).bg,
  veil:await p.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--veil').trim())}));
console.log('零报错',errs.length===0,errs.slice(0,3));
await b.close();})();
