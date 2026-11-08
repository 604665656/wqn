/* 复现「点了横屏还是竖屏，还换不回去」：全程用真实坐标点击，不用 selector.click */
const {chromium}=require('playwright');const path=require('path');
(async()=>{
const b=await chromium.launch({headless:true,executablePath:'/usr/local/bin/chromium',
  args:['--no-sandbox','--allow-file-access-from-files']});
const p=await b.newPage({viewport:{width:390,height:844},colorScheme:'dark',isMobile:true,hasTouch:true});
const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('file://'+encodeURI(path.resolve('/data/workspace/wqn.html')),{waitUntil:'load'});
await p.waitForSelector('[data-act="newgame"]',{timeout:20000});
await p.click('[data-act="newgame"]');await p.waitForSelector('.panel.on .opt',{timeout:10000});

const snap=async(tag)=>{
  const v=await p.evaluate(()=>{
    const r=e=>{if(!e)return null;const x=e.getBoundingClientRect();
      return [Math.round(x.x),Math.round(x.y),Math.round(x.width),Math.round(x.height)]};
    const btn=document.querySelector('[data-view="landscape"]');
    const br=btn&&btn.getBoundingClientRect();
    const hit=br?document.elementFromPoint(br.x+br.width/2,br.y+br.height/2):null;
    const pan=document.querySelector('.panel.on');
    return {cls:document.documentElement.className,
      fullscreen:!!document.fullscreenElement,
      btn:r(btn),btnText:btn?btn.textContent:'',
      btnHit:hit?(hit.getAttribute('data-view')||hit.className||hit.tagName):null,
      stage:r(document.querySelector('.stage')),
      bg:r(document.querySelector('.stage-bg')),
      char:r(document.querySelector('.stage-char')),
      panel:r(pan),
      panelText:pan?pan.textContent.replace(/\s+/g,' ').slice(0,60):'',
      tabs:r(document.querySelector('.tabs')),
      hint:r(document.getElementById('landHint')),
      vp:[innerWidth,innerHeight]};
  });
  console.log(tag,JSON.stringify(v));
  return v;
};
const clickBtn=async()=>{
  const r=await p.evaluate(()=>{const b=document.querySelector('[data-view="landscape"]');
    if(!b)return null;const x=b.getBoundingClientRect();return{x:x.x+x.width/2,y:x.y+x.height/2};});
  if(!r){console.log('按钮不存在');return;}
  await p.mouse.click(r.x,r.y);await p.waitForTimeout(400);
};
await snap('① 开局竖屏');
await clickBtn();const a=await snap('② 第一次点横屏');
await p.screenshot({path:'assets/repro_land_on.png'});
await clickBtn();const c=await snap('③ 第二次点横屏（应回竖屏）');
await p.screenshot({path:'assets/repro_land_off.png'});
console.log('回到竖屏？',!c.cls.includes('landscape'),'仍全屏？',c.fullscreen);
console.log('零报错',errs.length===0,errs.slice(0,3));
await b.close();})();
