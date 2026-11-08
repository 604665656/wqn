/* test/reality.test.js —— 真实性档位 / 玩法 / 舆地页 / 局中调档 专项（node test/reality.test.js） */
const {chromium}=require('playwright');
const path=require('path');
const FILE='file://'+encodeURI(path.resolve(__dirname,'..','..','wqn.html'));
(async()=>{
  const b=await chromium.launch({headless:true,executablePath:'/usr/local/bin/chromium',
    args:['--no-sandbox','--allow-file-access-from-files']});
  const p=await b.newPage({viewport:{width:390,height:844}});
  const errs=[];
  p.on('pageerror',e=>errs.push('PAGEERROR: '+e.message));
  p.on('console',m=>{if(m.type()==='error')errs.push('CONSOLE: '+m.text());});
  const txt=()=>p.evaluate(()=>document.body.innerText);
  async function freshStart(){
    await p.goto(FILE,{waitUntil:'load'});
    await p.evaluate(()=>{try{localStorage.clear();}catch(e){}});
    await p.reload({waitUntil:'load'});
  }

  /* A 狂想档 + 考据模式 + 短局 */
  await freshStart();
  await p.click('[data-tier="wild"]');
  await p.click('[data-mode="quiz"]');
  await p.click('[data-len="short"]');
  await p.click('[data-act="newgame"]');
  await p.waitForTimeout(80);
  const a1=await p.evaluate(()=>({banner:document.querySelector('.warnbar')?.innerText||'',
    vol:document.querySelector('.vt')?.innerText||'',
    opts:document.querySelectorAll('.panel.on .opt').length,
    warn:document.body.innerText.indexOf('本档含明确标注的未证实假说')>=0}));

  /* 连点，直到短局两卷收束或 30 笔 */
  let shortEnd=false,climSeen=false,textSeen=false,hypSeen=false;
  for(let i=0;i<30;i++){
    const t=await txt();
    if(t.indexOf('短卷收束')>=0){shortEnd=true;break;}
    if(t.indexOf('气候／地理')>=0)climSeen=true;
    if(/文本传统 · 非史实|文本别册/.test(t))textSeen=true;
    if(t.indexOf('无证据 · 虚构推演')>=0)hypSeen=true;
    const c=await p.$('.panel.on [data-act="contvol"]');
    if(c){await p.click('.panel.on [data-act="contvol"]');continue;}
    const o=await p.$('.panel.on .opt');
    if(o){await p.click('.panel.on .opt');continue;}
    const n=await p.$('.panel.on [data-act="next"]');
    if(n){await p.click('.panel.on [data-act="next"]');continue;}
    break;
  }
  const a2={shortEnd:shortEnd,climSeen:climSeen,textSeen:textSeen,hypSeen:hypSeen};

  /* B 舆地页：地图、气候免责、史前序章、假说红色警示 */
  await freshStart();
  await p.click('[data-act="newgame"]');
  await p.waitForTimeout(60);
  await p.click('.tabs button:has-text("舆地")');
  const b1=await p.evaluate(()=>({
    map:(window.WQN&&WQN.data&&WQN.data.atlas)?WQN.data.atlas.units.length:0,
    polities:(window.WQN&&WQN.data&&WQN.data.atlas)?WQN.data.atlas.polities.length:0,
    canvas:!!document.querySelector('.panel.on #atlasCanvas'),
    disclaimer:document.body.innerText.indexOf('本图不是历史国界图')>=0,
    caveat:document.body.innerText.indexOf('时间重合不等于已证因果')>=0,
    pre:document.body.innerText.indexOf('史 前 序 章')>=0,
    closed:document.body.innerText.indexOf('当 前 关 闭')>=0,
    tabs:document.querySelectorAll('.tabs button').length}));

  /* B2 舆图交互：按钮放大 → 滚轮放大 → 拖动平移 → 复位 → 年份滑杆 */
  const z0=await p.evaluate(()=>WQN.atlas.getView().scale);
  await p.click('.panel.on [data-atlas="in"]');
  const z1=await p.evaluate(()=>WQN.atlas.getView().scale);
  const bb=await (await p.$('.panel.on #atlasCanvas')).boundingBox();
  const cx=bb.x+bb.width/2,cy=bb.y+bb.height/2;
  await p.mouse.move(cx,cy);
  await p.mouse.wheel(0,-300);
  await p.waitForTimeout(120);
  let z2=await p.evaluate(()=>WQN.atlas.getView().scale);
  if(z2<=z1){
    await p.evaluate(()=>{
      const c=document.querySelector('.panel.on #atlasCanvas'),r=c.getBoundingClientRect();
      c.dispatchEvent(new WheelEvent('wheel',{deltaY:-300,bubbles:true,cancelable:true,
        clientX:r.left+r.width/2,clientY:r.top+r.height/2}));
    });
    z2=await p.evaluate(()=>WQN.atlas.getView().scale);
  }
  await p.mouse.move(cx,cy);await p.mouse.down();
  await p.mouse.move(cx-90,cy+25,{steps:5});await p.mouse.up();
  const z3=await p.evaluate(()=>({t:WQN.atlas.getView().tx,s:WQN.atlas.getView().scale}));
  await p.click('.panel.on [data-atlas="reset"]');
  const z4=await p.evaluate(()=>WQN.atlas.getView().scale);
  await p.evaluate(()=>{const r=document.getElementById('atlasYear');
    r.value=750;r.dispatchEvent(new Event('input',{bubbles:true}));});
  const y1=await p.evaluate(()=>({y:WQN.atlas.getYear(),
    list:document.getElementById('atlasList').innerText}));
  const bz={z0:z0,z1:z1,z2:z2,tx:z3.t,z4:z4,year:y1.y,
    zoomed:z1>z0&&z2>z1,dragged:z3.t<0,reset:z4===1,
    yearOK:y1.y===750&&y1.list.indexOf('阿拔斯')>=0&&y1.list.indexOf('李唐')>=0};

  /* B3 四图层：开关、叠加、四块列表、家族据点 */
  const layers0=await p.evaluate(()=>({
    buttons:document.querySelectorAll('.panel.on [data-layer]').length,
    state:WQN.atlas.getLayers(),
    list:document.getElementById('atlasList').innerText,
    famDist:WQN.engine.famDistribution(WQN.engine.state()).length,
    disclaimer:document.body.innerText.indexOf('人口热力不是历史人口统计')>=0
  }));
  const snap0=await p.evaluate(()=>document.querySelector('.panel.on #atlasCanvas').toDataURL().length);
  await p.click('.panel.on [data-layer="climate"]');
  const off=await p.evaluate(()=>({state:WQN.atlas.getLayers().climate,
    list:document.getElementById('atlasList').innerText.indexOf('气 候')>=0}));
  const snap1=await p.evaluate(()=>document.querySelector('.panel.on #atlasCanvas').toDataURL().length);
  await p.click('.panel.on [data-layer="climate"]');
  const onAgain=await p.evaluate(()=>WQN.atlas.getLayers().climate);
  const bl={buttons:layers0.buttons,
    /* 地方志是第五层，默认关闭；「全开」只针对原有四层 */
    allOn:['polity','climate','pop','family'].every(k=>layers0.state[k]===true),
    localOff:layers0.state.local===false,
    hasPolity:layers0.list.indexOf('政 权')>=0,
    hasClimate:layers0.list.indexOf('气 候')>=0,
    hasPop:layers0.list.indexOf('人 口 重 心')>=0,
    hasFamily:layers0.list.indexOf('本 局 家 族 分 布')>=0,
    famDist:layers0.famDist,disclaimer:layers0.disclaimer,
    offWorks:off.state===false&&!off.list,
    changed:snap0!==snap1,onAgain:onAgain===true};

  /* C 局中切到狂想档，舆地页应改为列出假说 */
  await p.click('.tabs button:has-text("设置")');
  await p.click('[data-setmin="0"]');   /* v1.6 默认精简，展开全部 */
  await p.click('.panel.on [data-live-tier="wild"]');
  const c1=await p.evaluate(()=>({banner:document.querySelector('.warnbar')?.innerText||'',
    share:(document.body.innerText.match(/WQN1\./)||[]).length>0}));
  await p.click('.tabs button:has-text("舆地")');
  const c2=await p.evaluate(()=>({hypList:document.body.innerText.indexOf('狂 想 档 专 属')>=0,
    noEvidence:document.body.innerText.indexOf('无考古／文献／可重复证据支持')>=0}));

  /* D 考据档：不应出现未证实假说 */
  await freshStart();
  await p.click('[data-tier="strict"]');
  await p.click('[data-act="newgame"]');
  await p.waitForTimeout(60);
  await p.click('.tabs button:has-text("舆地")');
  const d1=await p.evaluate(()=>({strict:document.body.innerText.indexOf('考据档')>=0,
    closed:document.body.innerText.indexOf('当 前 关 闭')>=0}));

  /* E 族谱：不出现百岁古人，且写明跨年不是一人活过百年 */
  await freshStart();
  await p.click('[data-act="newgame"]');
  await p.waitForTimeout(60);
  for(let i=0;i<14;i++){
    const c=await p.$('.panel.on [data-act="contvol"]');
    if(c){await p.click('.panel.on [data-act="contvol"]');continue;}
    const o=await p.$('.panel.on .opt');
    if(o){await p.click('.panel.on .opt');continue;}
    const n=await p.$('.panel.on [data-act="next"]');
    if(n){await p.click('.panel.on [data-act="next"]');continue;}
    break;
  }
  await p.click('.tabs button:has-text("族谱")');
  const e1=await p.evaluate(()=>{
    const t=document.querySelector('.panel.on')?.innerText||'';
    const ages=[...t.matchAll(/约\s*(\d+)\s*岁/g)].map(m=>+m[1]);
    return {ages:ages,max:ages.length?Math.max(...ages):0,
      note:t.indexOf('并非一人活过百年')>=0||t.indexOf('不是同一个人活过的年数')>=0,
      hasOld:/\b1\d\d\s*岁/.test(t)};
  });

  /* F 难度与真实性档位正交：困难 + 考据档，史实分层照旧、假说仍关闭 */
  await freshStart();
  await p.click('[data-tier="strict"]');
  await p.click('[data-diff="hard"]');
  await p.click('[data-act="newgame"]');
  await p.waitForTimeout(50);
  for(let i=0;i<14;i++){
    const c=await p.$('.panel.on [data-act="contvol"]');
    if(c){await p.click('.panel.on [data-act="contvol"]');continue;}
    const o=await p.$('.panel.on .opt');
    if(o){await p.click('.panel.on .opt');continue;}
    const n=await p.$('.panel.on [data-act="next"]');
    if(n){await p.click('.panel.on [data-act="next"]');continue;}
    break;
  }
  const f1=await p.evaluate(()=>{
    const st=WQN.engine.state(),txt=document.body.innerText;
    return {tier:st.reality,diff:st.difficulty,hints:WQN.difficulty.hints(st),
      noHyp:txt.indexOf('无证据·虚构推演')<0&&txt.indexOf('奇谈别册')<0,
      civTotal:WQN.data.civilization.items.length,
      banner:txt.indexOf('考据档')>=0&&txt.indexOf('难度：困难')>=0};
  });

  console.log('狂想短局开局 →',JSON.stringify(a1));
  console.log('短局与分层   →',JSON.stringify(a2));
  console.log('舆地页       →',JSON.stringify(b1));
  console.log('舆图缩放     →',JSON.stringify(bz));
  console.log('四图层       →',JSON.stringify(bl));
  console.log('局中调档     →',JSON.stringify(c1),JSON.stringify(c2));
  console.log('考据档       →',JSON.stringify(d1));
  console.log('族谱年岁     →',JSON.stringify(e1));
  console.log('难度正交     →',JSON.stringify(f1));
  console.log('ERRORS       →',errs.length?errs.join('\n'):'(none)');

  const ok=!errs.length&&a1.opts>=3&&a1.opts<=6&&a1.warn&&/第 0\/4 笔/.test(a1.vol)
    &&a2.shortEnd&&b1.map===29&&b1.polities>=25&&b1.canvas&&b1.disclaimer
    &&b1.caveat&&b1.pre&&b1.closed&&b1.tabs===8
    &&bz.zoomed&&bz.dragged&&bz.reset&&bz.yearOK
    &&bl.buttons===5&&bl.allOn&&bl.localOff&&bl.hasPolity&&bl.hasClimate&&bl.hasPop&&bl.hasFamily
    &&bl.famDist>=1&&bl.disclaimer&&bl.offWorks&&bl.changed&&bl.onAgain
    &&c1.share&&c2.hypList&&c2.noEvidence&&d1.strict&&d1.closed
    &&e1.max>0&&e1.max<=92&&!e1.hasOld&&e1.note
    &&f1.tier==='strict'&&f1.diff==='hard'&&f1.hints===0&&f1.noHyp
    &&f1.civTotal>=1306&&f1.banner;
  console.log(ok?'\n✅ 档位与舆地专项通过':'\n❌ 档位专项有缺项');
  await b.close();
  process.exit(ok?0:1);
})().catch(e=>{console.error('FAIL',e);process.exit(2)});
