/* v2.7 文字可读性专项
   1) 浅色 / 深色 / 高对比度三种模式下量 .result 的字色、底色、光晕、对比度
   2) 注入「旧规则」复现用户截图里的灰白糊字，与修复后拼成对比图
   3) 断言：不再是黑底深字、白光晕已关、对比度 ≥ 7 */
const {chromium}=require('playwright');const path=require('path');
const fs=require('fs');
const URL='file://'+encodeURI(path.resolve('/data/workspace/wqn.html'));
const OLD=`
html.avg .panel.on .result{background:#1a1610!important;color:#2b2218!important;
  font-weight:400!important;-webkit-text-stroke:0!important;border:0!important;
  border-left:3px solid #b1512f!important}
html.avg .panel.on .result,html.avg .panel.on .result *{
  text-shadow:0 1px 1px rgba(255,250,238,.98),0 0 2px rgba(255,250,238,.72)!important}
`;
const lum=s=>{const m=String(s).match(/[\d.]+/g);if(!m)return null;
  const v=m.slice(0,3).map(x=>{x=+x/255;return x<=.03928?x/12.92:Math.pow((x+.055)/1.055,2.4)});
  return .2126*v[0]+.7152*v[1]+.0722*v[2];};
const ratio=(a,b)=>{const L1=lum(a),L2=lum(b);
  return L1==null||L2==null?null:+((Math.max(L1,L2)+.05)/(Math.min(L1,L2)+.05)).toFixed(2);};

async function boot(scheme,hc){
  const b=await chromium.launch({headless:true,executablePath:'/usr/local/bin/chromium',
    args:['--no-sandbox','--allow-file-access-from-files']});
  const p=await b.newPage({viewport:{width:390,height:844},colorScheme:scheme,
    isMobile:true,hasTouch:true,deviceScaleFactor:2});
  const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.goto(URL,{waitUntil:'load'});
  await p.waitForSelector('[data-act="newgame"]',{timeout:20000});
  await p.click('[data-act="newgame"]');await p.waitForSelector('.panel.on .opt',{timeout:10000});
  if(hc)await p.evaluate(()=>document.documentElement.classList.add('hc'));
  await p.click('.panel.on .opt');await p.waitForTimeout(420);
  return {b,p,errs};
}
const metrics=p=>p.evaluate(()=>{
  const r=document.querySelector('.panel.on .result');
  if(!r)return{noResult:true};
  const c=getComputedStyle(r);
  return {color:c.color,bg:c.backgroundColor,shadow:c.textShadow,
    stroke:c.webkitTextStroke||'',weight:c.fontWeight,size:c.fontSize,
    box:[Math.round(r.getBoundingClientRect().width),Math.round(r.getBoundingClientRect().height)],
    text:r.textContent.replace(/\s+/g,' ').slice(0,70)};
});
(async()=>{
const all=[];
for(const [name,scheme,hc] of [['浅色','light',false],['深色','dark',false],['高对比度','light',true]]){
  const {b,p,errs}=await boot(scheme,hc);
  const m=await metrics(p);
  m.name=name;m.contrast=ratio(m.color,m.bg);m.errs=errs.length;
  all.push(m);
  console.log(name.padEnd(6),JSON.stringify({color:m.color,bg:m.bg,shadow:m.shadow,
    stroke:m.stroke,weight:m.weight,contrast:m.contrast,errs:m.errs}));
  if(name==='浅色'){
    /* 局部：修后 */
    await p.locator('.panel.on .result').screenshot({path:'assets/ui_v27_text_after.png'});
    /* 注入旧规则复现糊字，再截一张 */
    const tag=await p.addStyleTag({content:OLD});
    await p.waitForTimeout(120);
    await p.locator('.panel.on .result').screenshot({path:'assets/ui_v27_text_before.png'});
    const old=await metrics(p);
    console.log('旧规则复现',JSON.stringify({color:old.color,bg:old.bg,
      shadow:old.shadow,contrast:ratio(old.color,old.bg)}));
    await tag.evaluate(e=>e.remove());
  }
  await b.close();
}
/* 拼对比图 */
try{
  const {default:sharp}=await import('sharp');
  const a=await sharp('assets/ui_v27_text_before.png').metadata();
  const w=Math.max(a.width,360)+24;
  const label=async(t)=>sharp({create:{width:w,height:30,channels:4,
    background:{r:238,g:230,b:214,alpha:1}}}).composite([{input:Buffer.from(
    `<svg width="${w}" height="30"><text x="10" y="21" font-size="15" fill="#5a4a32" font-family="sans-serif">${t}</text></svg>`),top:0,left:0}]).png().toBuffer();
  const parts=[];
  for(const [f,t] of [['assets/ui_v27_text_before.png','修前：黑底深字 + 白光晕（对比度 1.15:1）'],
                       ['assets/ui_v27_text_after.png','修后：半透浅底 + 实深字（对比度 16:1）']]){
    parts.push({input:await label(t),top:parts.length?0:0,left:0});
    const im=await sharp(f).extend({top:0,bottom:0,left:12,right:12,
      background:{r:238,g:230,b:214,alpha:1}}).toBuffer();
    parts.push({input:im,top:0,left:0});
  }
  /* 手工纵向堆叠 */
  const imgs=[await label('修前：黑底深字 + 白光晕 · 对比度 1.15:1'),
              await sharp('assets/ui_v27_text_before.png').extend({top:0,bottom:8,left:12,right:12,background:'#eee6d6'}).toBuffer(),
              await label('修后：半透浅底 + 实深字 · 对比度 16:1'),
              await sharp('assets/ui_v27_text_after.png').extend({top:0,bottom:8,left:12,right:12,background:'#eee6d6'}).toBuffer()];
  const metas=await Promise.all(imgs.map(x=>sharp(x).metadata()));
  const H=metas.reduce((s,m)=>s+m.height,0);
  let y=0;const comp=[];
  imgs.forEach((buf,i)=>{comp.push({input:buf,top:y,left:0});y+=metas[i].height;});
  await sharp({create:{width:Math.max(...metas.map(m=>m.width)),height:H,channels:4,
    background:'#eee6d6'}}).composite(comp).jpeg({quality:92}).toFile('assets/ui_v27_text_fix.jpg');
  console.log('对比图已生成 assets/ui_v27_text_fix.jpg');
}catch(e){console.log('拼图跳过（sharp 不可用）',e.message.slice(0,80));}

let bad=0;
all.forEach(m=>{
  if(m.noResult||m.shadow!=='none'||/rgb\(26, 22, 16\)/.test(m.bg)||m.contrast<7||m.errs){
    console.log('❌ '+m.name+' 未达标');bad++;
  }
});
console.log(bad?'❌ '+bad+' 项未达标':'✅ 三种模式全部达标：白光晕已关、非黑底、对比度 ≥ 7、零报错');
if(bad)process.exit(1);
})();
