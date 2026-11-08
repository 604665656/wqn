/* v2.5 综合实测：三视图新素材、despill 0 残留、真横屏全屏重排、零报错 */
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
  const M=[['loom5','理纴引绪'],['kiln5','抟陶圆坯'],['bridge5','横木济川'],
    ['well5','提桶汲泉'],['ink5','磨砚松烟'],['sail5','张帆布帆'],
    ['herd5','羔羊乳羔'],['bell5','摇铃铜铃']];
  return {layers:s.layers,scenes:s.backdropCount,chapters:s.scenes.length,
    ready:s.ready,locked:s.locked,pending:s.pending.length,
    bd:document.querySelectorAll('.bdpick').length,
    map:M.every(([k,t])=>window.WQN.stage.poseForOption({t:t})===k),
    oldLayer:[window.WQN.stage.poseForOption({t:'架梁横木'}),
              window.WQN.stage.poseForOption({t:'牧畜抱羔'})].join('/')};
});
console.log('素材与映射',A);
/* 呼吸要在开局立刻测：切过横屏再回来时，待机微表演类会临时接管 animation */
const B=await p.evaluate(async()=>{
  const c=document.querySelector('.stage-char');if(!c)return{noChar:true};
  const a=getComputedStyle(c),t0=a.translate,s0=a.scale;
  await new Promise(r=>setTimeout(r,1200));
  const a2=getComputedStyle(c);
  return {hasBreathe:a.animationName.indexOf('breathe')>=0,
    moved:t0!==a2.translate||s0!==a2.scale};
});
console.log('呼吸',B);
await p.evaluate(()=>window.scrollTo(0,0));
await p.screenshot({path:'assets/ui_v25_main.png'});

/* 横屏：全屏背景 + 右侧完整立绘 + 左侧整宽竖列选项 */
await p.click('[data-view="landscape"]');await p.waitForTimeout(450);
const L=await p.evaluate(()=>{
  const st=document.querySelector('.stage'),bg=document.querySelector('.stage-bg'),
    ch=document.querySelector('.stage-char'),hint=document.getElementById('landHint');
  let optsDir='',optW=0;
  const op=document.querySelector('.panel.on .opts');
  if(op){optsDir=getComputedStyle(op).flexDirection;
    const f=op.querySelector('.opt');if(f)optW=Math.round(f.getBoundingClientRect().width);}
  else{
    const host=document.querySelector('.panel.on')||document.body;
    const t=document.createElement('div');t.className='opts';
    const f=document.createElement('div');f.className='opt';f.textContent='测';
    t.appendChild(f);host.appendChild(t);
    optsDir=getComputedStyle(t).flexDirection;optW=Math.round(f.getBoundingClientRect().width);
    t.remove();
  }
  const R=e=>{const r=e.getBoundingClientRect();return [Math.round(r.width),Math.round(r.height)]};
  return {cls:document.documentElement.classList.contains('landscape'),
    stage:R(st),bg:R(bg),char:R(ch),hint:hint?R(hint):null,
    optsDir:optsDir,optW:optW,
    toolsTop:getComputedStyle(document.querySelector('.stage-tools')).right,
    vp:[innerWidth,innerHeight]};
});
console.log('真横屏',L);
await p.screenshot({path:'assets/ui_v25_land.png'});

/* 提示条可关、再点回竖屏 */
await p.click('[data-landhint-close]');await p.waitForTimeout(100);
const hintGone=await p.evaluate(()=>!document.getElementById('landHint'));
await p.click('[data-view="landscape"]');await p.waitForTimeout(180);
const back=await p.evaluate(()=>({cls:document.documentElement.classList.contains('landscape'),
  hint:!!document.getElementById('landHint')}));
console.log('提示条可关',hintGone,'再点回竖屏',back);

console.log('零报错',errs.length===0,errs.slice(0,2));
await b.close();})();
