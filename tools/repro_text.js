/* 复现「这个字有点看不清楚」：量 .result 块的字色 / 底色 / 光晕 / 对比度并截图 */
const {chromium}=require('playwright');const path=require('path');
(async()=>{
const b=await chromium.launch({headless:true,executablePath:'/usr/local/bin/chromium',
  args:['--no-sandbox','--allow-file-access-from-files']});
const p=await b.newPage({viewport:{width:390,height:844},colorScheme:'light',isMobile:true,hasTouch:true});
const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('file://'+encodeURI(path.resolve('/data/workspace/wqn.html')),{waitUntil:'load'});
await p.waitForSelector('[data-act="newgame"]',{timeout:20000});
await p.click('[data-act="newgame"]');await p.waitForSelector('.panel.on .opt',{timeout:10000});
/* 进 result 态 */
await p.click('.panel.on .opt');await p.waitForTimeout(450);
const info=await p.evaluate(()=>{
  const r=document.querySelector('.panel.on .result');
  if(!r)return{noResult:true};
  const c=getComputedStyle(r);
  const lum=s=>{const m=s.match(/[\d.]+/g);if(!m)return null;
    const v=m.slice(0,3).map(x=>{x=+x/255;return x<=.03928?x/12.92:Math.pow((x+.055)/1.055,2.4)});
    return .2126*v[0]+.7152*v[1]+.0722*v[2];};
  const L1=lum(c.color),L2=lum(c.backgroundColor);
  const ratio=L1!=null&&L2!=null?((Math.max(L1,L2)+.05)/(Math.min(L1,L2)+.05)).toFixed(2):'n/a';
  /* 背景可能是半透明，取 .card 的实际底色另算 */
  const card=document.querySelector('.panel.on .card'),cc=card?getComputedStyle(card):null;
  return {color:c.color,bg:c.backgroundColor,textShadow:c.textShadow,
    stroke:c.webkitTextStroke||c.webkitTextStrokeColor||'',
    fontSize:c.fontSize,fontWeight:c.fontWeight,
    contrastVsOwnBg:ratio,cardBg:cc?cc.backgroundColor:'',
    html:document.documentElement.className,
    text:r.textContent.replace(/\s+/g,' ').slice(0,80)};
});
console.log('结果卡实测',JSON.stringify(info,null,1));
await p.screenshot({path:'assets/repro_text_before.png'});
/* 局部放大截图，看糊字 */
await p.locator('.panel.on .result').screenshot({path:'assets/repro_text_crop_before.png'})
  .catch(e=>console.log('局部截图失败',e.message.slice(0,60)));
console.log('零报错',errs.length===0,errs.slice(0,2));
await b.close();})();
