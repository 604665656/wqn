/* v2.7 专项：默认猫左字右、分栏可调、统一旋转、拖动跟手、点击台词、零报错 */
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
  if(r)await p.touchscreen.tap(r.x,r.y);await p.waitForTimeout(260);return !!r;
};
const snap=async tag=>p.evaluate(t=>{
  const cs=s=>{const e=document.querySelector(s);if(!e)return null;
    const c=getComputedStyle(e);return {left:c.left,right:c.right,width:c.width,
      parent:e.parentElement?(e.parentElement.id||e.parentElement.className):''};};
  const hint=document.getElementById('landHint'),tabs=document.getElementById('tabs');
  return {tag:t,cls:document.documentElement.className,
    split:getComputedStyle(document.documentElement).getPropertyValue('--split').trim(),
    panel:cs('.panel.on'),char:cs('.stage-char'),bubble:cs('.stage .bubble'),
    tools:cs('.stage-tools'),pchip:cs('.pchip'),
    tabsInApp:!!(tabs&&tabs.parentElement&&tabs.parentElement.id==='app'),
    hintInApp:!!(hint&&hint.parentElement&&hint.parentElement.id==='app'),
    tabsPos:tabs?getComputedStyle(tabs).position:'',
    hintPos:hint?getComputedStyle(hint).position:'',
    charHit:!!document.querySelector('#charHit'),
    grip:!!document.querySelector('#splitGrip')};
},tag);

await tap('[data-view="landscape"]');
const A=await snap('① 开横屏');console.log(JSON.stringify(A,null,1));
await p.screenshot({path:'assets/ui_v27_default.png'});

/* 分栏：设置页滑杆 */
await p.evaluate(()=>{const t=document.querySelector('[data-t="set"]');if(t)t.click();});
await p.waitForTimeout(240);
const hasSlider=await p.evaluate(()=>!!document.querySelector('input[data-split]'));
await p.evaluate(()=>{
  const el=document.querySelector('input[data-split]');
  if(el){el.value=60;el.dispatchEvent(new Event('input',{bubbles:true}));}
});
await p.waitForTimeout(160);
const B=await p.evaluate(()=>({split:getComputedStyle(document.documentElement).getPropertyValue('--split').trim(),
  label:document.querySelector('[data-split-val]')?.textContent}));
console.log('② 滑杆',hasSlider,B);
/* 互换 */
await p.evaluate(()=>{const f=document.querySelector('[data-flip]');if(f)f.click();});
await p.waitForTimeout(240);
/* 互换后切回主页，才能看到立绘 */
await p.evaluate(()=>{const t=document.querySelector('[data-t="main"]');if(t)t.click();});
await p.waitForTimeout(280);
const C=await snap('③ 互换后');console.log(JSON.stringify({flip:C.cls.includes('stage-flip'),panel:C.panel,char:C.char,tabsInApp:C.tabsInApp,hintInApp:C.hintInApp},null,1));
await p.screenshot({path:'assets/ui_v27_flip.png'});
await p.evaluate(()=>{const t=document.querySelector('[data-t="set"]');if(t)t.click();});
await p.waitForTimeout(200);
/* 复位 */
await p.evaluate(()=>{const f=document.querySelector('[data-split-reset]');if(f)f.click();});
await p.waitForTimeout(240);
const D=await snap('④ 复位');console.log('复位',D.split,'flip',D.cls.includes('stage-flip'));

/* 回主页，测猫拖动：rot90 下屏幕 Δy 应变成容器 x 位移 */
await p.evaluate(()=>{const t=document.querySelector('[data-t="main"]');if(t)t.click();});
await p.waitForTimeout(260);
const hit=await p.evaluate(()=>{const e=document.querySelector('#charHit');if(!e)return null;
  const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2,w:r.width,h:r.height};});
console.log('⑤ 猫热区',hit);
if(hit){
  await p.touchscreen.tap(hit.x,hit.y);await p.waitForTimeout(200);
  const said=await p.evaluate(()=>{const e=document.getElementById('guideBubble');
    return {show:e?e.classList.contains('show'):false,text:e?e.textContent:''};});
  console.log('⑥ 点猫台词',said);
  /* 真拖：用 mouse 模拟 pointer 序列（touchscreen 无 drag API） */
  await p.mouse.move(hit.x,hit.y);await p.mouse.down();
  await p.mouse.move(hit.x,hit.y+70,{steps:8});await p.mouse.up();
  await p.waitForTimeout(200);
  const off=await p.evaluate(()=>({dx:getComputedStyle(document.documentElement).getPropertyValue('--char-dx').trim(),
    dy:getComputedStyle(document.documentElement).getPropertyValue('--char-dy').trim(),
    dragClass:document.documentElement.classList.contains('dragging-char')}));
  console.log('⑦ 拖动后',off);
}
/* 分割条拖动 */
const grip=await p.evaluate(()=>{const e=document.querySelector('#splitGrip');if(!e)return null;
  const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2};});
if(grip){
  await p.mouse.move(grip.x,grip.y);await p.mouse.down();
  await p.mouse.move(grip.x,grip.y+60,{steps:6});await p.mouse.up();await p.waitForTimeout(160);
  console.log('⑧ 拖分割条后 split',await p.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--split').trim()));
}
/* 退出仍可点 */
const out=await tap('[data-land-exit]');
const E=await p.evaluate(()=>({cls:document.documentElement.className,
  tabsInApp:(()=>{const t=document.getElementById('tabs');return !!(t&&t.parentElement&&t.parentElement.id==='app');})(),
  hint:!!document.getElementById('landHint')}));
console.log('⑨ 退出',out,JSON.stringify(E));
console.log('零报错',errs.length===0,errs.slice(0,3));
await b.close();})();
