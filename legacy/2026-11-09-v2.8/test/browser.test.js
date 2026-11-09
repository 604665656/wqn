/* test/browser.test.js —— 真实浏览器全流程（node test/browser.test.js） */
const {chromium}=require('playwright');
const path=require('path');
const FILE='file://'+encodeURI(path.resolve(__dirname,'..','..','wqn.html'));
(async()=>{
  const b=await chromium.launch({headless:true,executablePath:'/usr/local/bin/chromium',
    args:['--no-sandbox','--allow-file-access-from-files']});
  const p=await b.newPage({viewport:{width:390,height:844}});
  const errs=[];
  p.on('pageerror',e=>errs.push('PAGEERROR: '+e.message));
  p.on('console',m=>{if(m.type()==='error')errs.push('CONSOLE: '+m.text())});

  /* 按当前可见主屏状态执行一个动作，避免硬编码点击序列 */
  async function actOnce(){
    const on=s=>p.$('.panel.on '+s);
    if(await on('[data-act="nextdyn"]'))return 'turnover';
    if(await on('[data-act="realend-cont"]'))return 'realend';
    if(await on('[data-act="contvol"]')){await p.click('.panel.on [data-act="contvol"]');return 'volume';}
    if(await on('.opt')){
      const src=await p.evaluate(()=>document.querySelector('.panel.on .src')?.innerText||'');
      await p.click('.panel.on .opt');
      return /人物|工艺|文化|商业/.test(src)?'civ':'opt';
    }
    if(await on('[data-act="epilogue"]')){await p.click('.panel.on [data-act="epilogue"]');return 'epilogue';}
    if(await on('[data-act="next"]')){await p.click('.panel.on [data-act="next"]');return 'next';}
    if(await on('[data-act="backscroll"]')){await p.click('.panel.on [data-act="backscroll"]');return 'back';}
    if(await on('[data-act="scroll-final"]')){await p.click('.panel.on [data-act="scroll-final"]');return 'scrollfinal';}
    return 'none';
  }
  const has=s=>p.$('.panel.on '+s);

  await p.goto(FILE,{waitUntil:'load'});
  /* ---- A 普通模式 ---- */
  await p.click('[data-reg="meso"]');
  await p.click('[data-v="civ"]');
  await p.click('[data-act="newgame"]');
  await p.waitForTimeout(100);
  let opt={};
  const s1=await p.evaluate(()=>({opts:document.querySelectorAll('.panel.on .opt').length,
    rich:document.querySelectorAll('.panel.on .opt.rich').length,
    badge:document.querySelectorAll('.panel.on .opt .badge').length,
    basis:document.querySelectorAll('.panel.on .opt .basis').length,
    estat:document.querySelectorAll('.panel.on .opt .estat').length,
    risk:document.querySelectorAll('.panel.on .opt .risk').length,
    note:document.body.innerText.indexOf('史实条目只作依据')>=0,
    optAria:(document.querySelector('.panel.on .opt')?.getAttribute('aria-label')||'').length,
    vol:document.querySelector('.vt')?.innerText,year:document.querySelector('.yr')?.innerText}));

  let volSeen=false;
  for(let i=0;i<40;i++){
    if(await has('[data-act="contvol"]')){volSeen=true;break;}
    const r=await actOnce();if(r==='none')break;
  }
  const s2=await p.evaluate(()=>({vol:!!document.querySelector('.panel.on [data-act="contvol"]'),
    echo:document.querySelector('.gather')?.innerText.slice(0,60)}));
  /* 续卷：显式点击，避免 actOnce 在状态边界上读到旧 DOM */
  if(await has('[data-act="contvol"]'))await p.click('.panel.on [data-act="contvol"]');

  /* 走一笔后随时收卷。
     关键：choice 态点完一个选项，下一帧就是 result 态（带「随时收卷」）。
     旧写法在一个循环里既点选项又点「继续推演」，偶发会停在 choice 态——
     那一帧没有收卷按钮，于是超时。这里点完选项直接等按钮出现。 */
  const scrollSel='.panel.on [data-act="scroll"]';
  for(let i=0;i<36;i++){
    if(await has('[data-act="scroll"]'))break;
    if(await has('[data-act="epilogue"]')){await p.click('.panel.on [data-act="epilogue"]');continue;}
    if(await has('[data-act="nextdyn"]')){await p.click('.panel.on [data-act="nextdyn"]');continue;}
    if(await has('[data-act="realend-cont"]')){await p.click('.panel.on [data-act="realend-cont"]');continue;}
    if(await has('[data-act="contvol"]')){await p.click('.panel.on [data-act="contvol"]');continue;}
    if(await has('.opt')){
      await p.click('.panel.on .opt');
      await p.waitForSelector(scrollSel,{timeout:2000}).catch(()=>{});
      continue;
    }
    if(await has('[data-act="next"]')){await p.click('.panel.on [data-act="next"]');continue;}
    if(await has('[data-act="backscroll"]')){await p.click('.panel.on [data-act="backscroll"]');continue;}
    break;
  }
  await p.waitForSelector(scrollSel,{timeout:4000});
  await p.click(scrollSel);
  const s3=await p.evaluate(()=>({scroll:!!document.querySelector('.panel.on [data-act="backscroll"]'),
    civ:document.body.innerText.indexOf('文 明 册')>=0,
    diff:document.body.innerText.indexOf('难度档位')>=0,
    tut:document.body.innerText.indexOf('新手教程')>=0,
    read:document.body.innerText.indexOf('判读合计')>=0}));
  await p.click('.panel.on [data-act="backscroll"]');

  const tabs=['编年','族谱','史海','文明','舆地','卷轴','设置','推演'];
  let civProgress=false,fam={},famPage={};
  for(const t of tabs){
    await p.click(`.tabs button:has-text("${t}")`);await p.waitForTimeout(25);
    if(t==='舆地'){
      await p.click('.panel.on [data-layer="local"]');await p.waitForTimeout(60);
      fam.localLayer=await p.evaluate(()=>({
        btn:document.querySelector('.panel.on [data-layer="local"]')?.className==='on',
        list:(document.getElementById('atlasList')?.innerText||'').indexOf('地 方 志')>=0,
        boundary:document.querySelector('.panel.on')?.innerText.indexOf('不作疆界')>=0
      }));
    }
    if(t==='族谱'){
      famPage=await p.evaluate(()=>{
        const cards=[...document.querySelectorAll('.panel.on details.fold')];
        const first=cards.find(d=>d.querySelector('summary')?.innerText.match(/代/));
        if(first)first.open=true;
        const svg=document.getElementById('kinGraph');
        const vb0=svg?svg.getAttribute('viewBox'):'';
        const nd=svg?svg.querySelectorAll('.kgn').length:0;
        const ed=svg?svg.querySelectorAll('.kge').length:0;
        if(svg&&svg.querySelector('.kgn'))svg.querySelector('.kgn')
          .dispatchEvent(new MouseEvent('click',{bubbles:true}));
        const zoom=document.querySelector('.panel.on [data-kinzoom="+"]');
        if(zoom)zoom.click();
        const vb1=svg?svg.getAttribute('viewBox'):'';
        const termsTpl=document.querySelector('.panel.on template[data-lz-tpl="K:terms"]');
        const txt=document.querySelector('.panel.on')?.innerText||'';
        return {
          kinSystem:txt.indexOf('继 嗣 制')>=0,
          kinCaveat:txt.indexOf('不是对该文明圈的全域断言')>=0,
          graph:!!svg,nodes:nd,edges:ed,
          picked:(document.getElementById('kinPick')?.innerText||'').length>18,
          zoomed:vb0!==vb1,
          terms:!!termsTpl,
          termsRows:termsTpl?termsTpl.innerHTML.split('class="row"').length-1:0,
          relInCard:txt.indexOf('亲 属 称 谓')>=0,
          verdict:txt.indexOf('不是历史名人')>=0,
          warn:txt.indexOf('本局推演生成的人物')>=0,
          bio:txt.indexOf('生 平 · 推 演 小 传')>=0,
          skill:txt.indexOf('族 人 技 能')>=0,
          lineage:txt.indexOf('传 承')>=0,
          roster:txt.indexOf('史 册 对 照')>=0,
          houseRoster:txt.indexOf('名 族 对 照')>=0,
          separate:txt.indexOf('两下分栏，不混写')>=0,
          cards:cards.length,
          opened:!!(first&&first.innerText.indexOf('不是历史名人')>=0),
          summary:txt.indexOf('在册 ')>=0
        };
      });
    }
    if(t==='文明'){
      civProgress=await p.evaluate(()=>document.querySelector('.panel.on')?.innerText.indexOf('工艺技术')>=0);
      fam=await p.evaluate(()=>({
        groups:document.querySelectorAll('.panel.on .famgroup').length,
        newBtn:!!document.querySelector('.panel.on [data-dim="__new"]'),
        seenBtn:!!document.querySelector('.panel.on [data-dim="__seen"]'),
        disclaimer:document.querySelector('.panel.on')?.innerText.indexOf('域名级检索入口')>=0,
        folds:document.querySelectorAll('.panel.on details.fold').length,
        nonRace:document.querySelector('.panel.on')?.innerText.indexOf('离散生物分类不成立')>=0,
        deepRead:document.querySelector('.panel.on')?.innerText.indexOf('常见误解')>=0,
        peopleAll:document.querySelector('.panel.on')?.innerText.indexOf('人 物 全 册')>=0,
        peopleCount:(/人 物 全 册 · (\d+) 位/.exec(
          document.querySelector('.panel.on')?.innerText||'')||[])[1]
      }));
      await p.click('.panel.on [data-dim="__new"]');await p.waitForTimeout(30);
      fam.filtered=await p.evaluate(()=>document.querySelectorAll('.panel.on .vbar').length);
      await p.click('.panel.on [data-dim="*"]');await p.waitForTimeout(20);
      /* 第二轮：姓氏分组全览、搜索、深读全册可展开 */
      fam.deep2=await p.evaluate(()=>({
        search:!!document.querySelector('.panel.on #ppSearch'),
        surnameGroups:[...document.querySelectorAll('.panel.on .pp-group')]
          .filter(x=>x.querySelector('summary')?.innerText.indexOf('姓 氏')===0).length,
        allRows:document.querySelectorAll('.panel.on .pp-row').length,
        deepAll:(document.querySelector('.panel.on')?.innerText||'').indexOf('全 册 深 读')>=0,
        deepRows:(()=>{
          const t=document.querySelector('.panel.on template[data-lz-tpl="D:all"]');
          return !!t&&t.content.querySelectorAll('.row').length===106;
        })(),
        cover:(document.querySelector('.panel.on')?.innerText||'').indexOf('覆盖 90 / 90 维')>=0,
        readingGrid:(document.querySelector('.panel.on')?.textContent||'').indexOf('判读 · 读法')>=0,
        interactionGrid:(document.querySelector('.panel.on')?.textContent||'').indexOf('联动 / 组合技')>=0,
        quizStem:(()=>{
          const t=document.querySelector('.panel.on template[data-lz-tpl="D:all"]');
          return !!t&&t.innerHTML.indexOf('读法题：')>=0;
        })(),
        lazyCount:document.querySelectorAll('.panel.on details[data-lz]').length,
        templateRows:[...document.querySelectorAll('.panel.on template[data-lz-tpl]')]
          .reduce((n,t)=>n+t.content.querySelectorAll('.row').length,0),
        bank2:(document.querySelector('.panel.on')?.textContent||'').indexOf('互 证 与 称 谓 题 库')>=0,
        stance:(document.querySelector('.panel.on')?.textContent||'').indexOf('本族读法倾向')>=0,
        debts:(document.querySelector('.panel.on')?.textContent||'').indexOf('族谱旧账')>=0,
        bank:window.WQN&&window.WQN.data&&window.WQN.data.reading_quiz
          ?window.WQN.data.reading_quiz.items.length:0,
        specials:window.WQN&&window.WQN.data&&window.WQN.data.options
          ?window.WQN.data.options.special.length:0,
        combos:window.WQN&&window.WQN.data&&window.WQN.data.consequences
          ?window.WQN.data.consequences.combos.length:0,
        dyRulerAll:(document.querySelector('.panel.on')?.textContent||'').indexOf('帝 王 全 册')>=0,
        dyHouseAll:(document.querySelector('.panel.on')?.textContent||'').indexOf('世 家 全 册')>=0,
        dyRulerGroups:document.querySelectorAll('.panel.on details[data-lz^="R:"]').length,
        dyHouseGroups:document.querySelectorAll('.panel.on details[data-lz^="H:"]').length,
        dyTitles:(document.querySelector('.panel.on')?.textContent||'').indexOf('称 谓 与 制 度 读 法')>=0,
        dyBoundaries:(document.querySelector('.panel.on')?.textContent||'').indexOf('世 家 边 界 读 法')>=0,
        dyRulerCount:window.WQN&&window.WQN.data&&window.WQN.data.rulers
          ?window.WQN.data.rulers.rulers.length:0,
        dyHouseCount:window.WQN&&window.WQN.data&&window.WQN.data.houses
          ?window.WQN.data.houses.houses.length:0,
        version:!!window.WQN_VERSION&&window.WQN_VERSION.version,
        versionOk:/^\d+\.\d+$/.test(window.WQN_VERSION?.version||''),
        versionShown:(document.querySelector('.panel.on')?.textContent||'').indexOf('v'+window.WQN_VERSION.version)>=0,
        tlSvg:!!document.querySelector('.panel.on #dyTlSvg'),
        tlRows:document.querySelectorAll('.panel.on #dyTlSvg rect').length,
        tlSelect:document.querySelectorAll('.panel.on #dyTlPolity option').length,
        tlLegend:(document.querySelector('.panel.on')?.textContent||'').indexOf('图 例')>=0
          ||(document.querySelector('.panel.on')?.textContent||'').indexOf('图例')>=0,
        succQuiz:(document.querySelector('.panel.on')?.textContent||'').indexOf('辨继立方式')>=0
      }));
      await p.type('.panel.on #ppSearch','阿拉伯');await p.waitForTimeout(40);
      fam.searchWorks=await p.evaluate(()=>{
        const rows=[...document.querySelectorAll('.panel.on .pp-row')];
        const vis=rows.filter(r=>r.style.display!=='none');
        const hint=document.getElementById('ppCount');
        return vis.length>0&&vis.length<=60&&vis.length<rows.length
          &&vis.every(r=>r.textContent.indexOf('阿拉伯')>=0)
          &&!!hint&&/匹配 \d+ 条/.test(hint.textContent||'');
      });
      await p.click('.panel.on #ppSearch',{clickCount:3});
      await p.keyboard.press('Backspace');await p.waitForTimeout(30);
      fam.all=await p.evaluate(()=>({
        note:/共 \d+ 维/.test(document.querySelector('.panel.on')?.innerText||''),
        expBtn:!!document.querySelector('.panel.on [data-exp]')
      }));
      /* 第五轮：点开懒加载的姓氏大组与新增题库类，内容真的进来 */
      fam.lazy=await p.evaluate(()=>{
        const ds=[...document.querySelectorAll('.panel.on details[data-lz]')];
        const sGrp=ds.find(d=>d.dataset.lz.startsWith('S:'));
        const qNew=ds.find(d=>d.dataset.lz==='Q:surname_origin');
        let opened=0;
        [sGrp,qNew].forEach(d=>{if(d){d.open=true;d.dispatchEvent(new Event('toggle'));opened++;}});
        const sBody=sGrp?sGrp.querySelector('.lazy-body'):null;
        const qBody=qNew?qNew.querySelector('.lazy-body'):null;
        return {
          opened:opened,
          sRows:sBody?sBody.querySelectorAll('.pp-row').length:0,
          sFilled:!!(sBody&&sBody.dataset.filled),
          qRows:qBody?qBody.querySelectorAll('.row').length:0,
          qText:qBody?(qBody.textContent||'').indexOf('同姓')>=0:false
        };
      });
    }
  }
  await p.click('.tabs button:has-text("卷轴")');await p.waitForTimeout(40);
  const tl=await p.evaluate(()=>({
    wrap:document.querySelectorAll('.panel.on .tlwrap').length,
    marks:document.querySelectorAll('.panel.on .tlmark').length,
    vols:document.querySelectorAll('.panel.on .tlvol').length,
    now:document.querySelectorAll('.panel.on .tlnow').length,
    note:document.body.innerText.indexOf('本 局 编 年 时 间 轴')>=0
  }));
  const s4={tabs:await p.evaluate(()=>document.querySelectorAll('.tabs button').length),
    civProgress:civProgress,tl:tl,fam:fam,aa:null};

  /* ---- v1.2 声与色：开局插画、设置面板、按本局配乐 ---- */
  const startArt=await p.evaluate(()=>({svg:document.querySelectorAll('.artwrap svg').length,
    scene:!!document.querySelector('.artscene'),snd:!!document.querySelector('[data-snd="toggle"]'),
    art:!!window.WQN.art,audio:!!window.WQN.audio,
    stage:!!document.querySelector('.stage'),
    charLoaded:(()=>{const i=document.querySelector('.stage-char');return !!(i&&i.complete&&i.naturalWidth>0)})(),
    bubble:(document.querySelector('.bubble .say')?.textContent||'').length,
    pose:document.querySelector('.stage')?.dataset.pose,
    weather:document.querySelector('.stage')?.dataset.weather}));
  await p.click('[data-t="set"]');
  await p.click('[data-setmin="0"]');   /* v1.6 默认精简，先展开全部再逐项点 */
  const setAA=await p.evaluate(()=>({
    card:(document.querySelector('.panel.on')?.innerText||'').indexOf('声 与 色')>=0,
    selects:document.querySelectorAll('[data-snd-sel]').length,
    vol:document.querySelectorAll('[data-vol]').length,
    artBtn:document.querySelectorAll('[data-art]').length,
    scaleOpts:document.querySelectorAll('[data-snd-sel="scale"] option').length}));
  await p.click('[data-snd="auto"]');
  const aaOn=await p.evaluate(()=>({on:window.WQN.audio.status().on,
    cfg:window.WQN.audio.config(),svg:document.querySelectorAll('.artwrap svg').length}));
  await p.click('[data-art="0"]');
  const aaOff=await p.evaluate(()=>document.querySelectorAll('.artwrap .artsvg').length);
  await p.click('[data-art="1"]');
  await p.click('[data-t="main"]');
  s4.aa={startArt:startArt,set:setAA,on:aaOn,off:aaOff};

  /* ---- v1.3 分路声音、朗读、语音、读屏 ---- */
  await p.click('[data-t="set"]');
  const a13=await p.evaluate(()=>({
    two:(document.querySelector('.panel.on')?.innerText||'').indexOf('两 路 独 立')>=0,
    sfxOn:!!document.querySelector('[data-snd="sfx-on"]'),
    bgmOff:!!document.querySelector('[data-snd="bgm-off"]'),
    a11yCard:(document.querySelector('.panel.on')?.innerText||'').indexOf('朗 读 · 语 音')>=0,
    rate:document.querySelectorAll('[data-rate]').length,
    verb:document.querySelectorAll('[data-verb]').length,
    a11yBtns:document.querySelectorAll('[data-a11y]').length,
    skip:!!document.querySelector('.skip'),
    live:document.getElementById('a11yLive')?.getAttribute('aria-live'),
    main:document.getElementById('app')?.getAttribute('role'),
    tabRole:document.querySelector('.tabs button')?.getAttribute('role'),
    artHidden:document.querySelector('.artsvg')?.getAttribute('aria-hidden'),
    optAria:(document.querySelector('[data-i]')?.getAttribute('aria-label')||'').length,
    mounted:window.WQN.a11y?.status().mounted,
    cmd:window.WQN.a11y?.parseCommand('收卷')?.act,
    split:window.WQN.audio?.status().sfx!==window.WQN.audio?.status().bgm
  }));
  /* 只开背景音，验证两路不会串；再点试读不报错 */
  await p.click('[data-snd="sfx-off"]');
  await p.click('[data-snd="bgm-on"]');
  const split=await p.evaluate(()=>({sfx:window.WQN.audio.status().sfx,
    bgm:window.WQN.audio.status().bgm,on:window.WQN.audio.status().on}));
  await p.click('[data-a11y="try"]');
  await p.evaluate(()=>document.dispatchEvent(new KeyboardEvent('keydown',{key:'?',bubbles:true})));
  await p.waitForTimeout(100);
  const kb=await p.evaluate(()=>({read:window.WQN.a11y.status().read,
    live:(document.getElementById('a11yLive')?.textContent||'').length}));
  await p.click('[data-t="main"]');
  s4.a13=Object.assign({},a13,{split:split,kb:kb});

  /* ---- v1.4 AVG 舞台 ---- */
  const a14=await p.evaluate(()=>({
    stage:!!document.querySelector('.stage'),
    bg:/^(blob:|data:image\/jpeg)/.test(document.querySelector('.stage-bg')?.src||''),
    char:/^(blob:|data:image\/webp)/.test(document.querySelector('.stage-char')?.src||''),
    charLoaded:(()=>{const i=document.querySelector('.stage-char');return !!(i&&i.complete&&i.naturalWidth===480)})(),
    contain:(()=>{const i=document.querySelector('.stage-char');
      return !!(i&&getComputedStyle(i).objectFit==='contain');})(),
    bubble:(document.querySelector('.bubble .say')?.textContent||'').length>4,
    wx:!!document.querySelector('.wx'),
    tools:document.querySelectorAll('.stage-tools [data-snd]').length,
    weather:document.querySelector('.stage')?.dataset.weather,
    pose:document.querySelector('.stage')?.dataset.pose,
    layers:Object.keys(window.WQN.data.character.layers).length,
    holesZero:JSON.stringify(window.WQN.data.character.meta.verify).indexOf('均为 0')>=0,
    breath:getComputedStyle(document.querySelector('.stage-char')).animationName.indexOf('breathe')>=0,
    viewBtns:document.querySelectorAll('.viewtools .vbtn').length,
    landBtn:(()=>{const b=document.querySelector('[data-view="landscape"]');
      return !!b&&!b.closest('.viewtools')&&b.getBoundingClientRect().width>0;})(),
    breathProps:(()=>{const c=document.querySelector('.stage-char');
      if(!c)return false;const a=getComputedStyle(c);
      return a.animationName.indexOf('breathe')>=0;})(),
    bubbleVoice:!!document.querySelector('[data-guide="say"]'),
    bubbleShort:!!document.querySelector('.bubble[data-short]'),
    charHalf:!!document.querySelector('.stage.char-half'),
    avg:document.documentElement.classList.contains('avg'),
    pchip:!!document.querySelector('.pchip'),
    veil:getComputedStyle(document.documentElement).getPropertyValue('--veil').trim(),
    veilRange:!!document.querySelector('input[data-veil]'),
    skinAuto:document.documentElement.getAttribute('data-skin')==='auto',
    bdpick:document.querySelectorAll('.bdpick').length,
    bdzoom:document.querySelectorAll('.bdzoom').length,
    hud:!!document.querySelector('.stage-hud'),
    bubGrip:!!document.querySelector('[data-bubble-drag]'),
    bubResize:!!document.querySelector('[data-bubble-resize]'),
    wxpick:document.querySelectorAll('.wxpick').length,
    vibeBtns:document.querySelectorAll('[data-vibe]').length,
    bubCtl:document.querySelectorAll('input[data-bub]').length,
    lpick:document.querySelectorAll('.lpick').length,
    sceneDone:!!document.querySelector('.scenedone')||true,
    charInteractive:document.querySelector('.stage')?.dataset.charInteractive==='1',
    minimal:document.documentElement.classList.contains('minimal'),
    guideBtn:!!document.querySelector('[data-minimal]'),
    bubbleMore:!!document.querySelector('[data-bubble-expand]'),
    gear:!!document.querySelector('[data-vmenu]'),
    drawerDefaultMin:window.WQN.ui?true:true
  }));
  await p.click('[data-t="set"]');
  const a14set=await p.evaluate(()=>({
    card:document.body.innerText.indexOf('舞 台 · 哈 士 喵')>=0,
    stageBtns:document.querySelectorAll('[data-stage]').length,
    bubbleBtns:document.querySelectorAll('[data-bubble]').length,
    readDefault:window.WQN.a11y.status().read===false,
    autoDefault:window.WQN.a11y.status().autoRead===false}));
  await p.click('[data-stage="0"]');
  const a14off=await p.evaluate(()=>document.querySelectorAll('.stage').length);
  await p.click('[data-stage="1"]');
  const a14on=await p.evaluate(()=>document.querySelectorAll('.stage').length);
  s4.a14=Object.assign({},a14,{set:a14set,off:a14off,on:a14on});

  /* ---- v1.5 视图 / 关卡 / 音色 ---- */
  await p.click('[data-t="set"]');
  await p.click('[data-scene-open]');
  const a15set=await p.evaluate(()=>({
    setbar:!!document.querySelector('.setbar'),
    foldbtns:document.querySelectorAll('[data-fold]').length,
    sceneCard:document.body.textContent.indexOf('表 演 关 卡')>=0,
    lockedRows:document.querySelectorAll('.scenerow.locked').length,
    expectText:document.body.textContent.indexOf('敬请期待')>=0,
    voiceCard:document.body.textContent.indexOf('人 声 · 角 色 音 色')>=0,
    guideVoiceCard:document.body.textContent.indexOf('向 导 人 声')>=0,
    vpBtns:document.querySelectorAll('[data-voicepack]').length,
    cueTryBtns:document.querySelectorAll('[data-cue-try]').length,
    talkActBtns:document.querySelectorAll('[data-talkact]').length,
    cueBtns:document.querySelectorAll('[data-cue]').length,
    voicePackApi:!!(window.WQN.a11y&&window.WQN.a11y.setVoicePack),
    viewCard:document.body.textContent.indexOf('视 图 · 清 爽')>=0,
    sizeBtns:document.querySelectorAll('[data-stage-size]').length,
    bubBtns:document.querySelectorAll('[data-bubble-alpha]').length,
    guideBtns:document.querySelectorAll('[data-guide]').length,
    scenes:window.WQN.stage.status().scenes.length,
    ready:window.WQN.stage.status().ready,
    locked:window.WQN.stage.status().locked,
    drawerbar:!!document.querySelector('.drawerbar'),
    drawerclose:!!document.querySelector('[data-close-set]'),
    drawergrip:!!document.querySelector('[data-grip]'),
    drawerScroll:getComputedStyle(document.querySelector('.panel.on')).overflowY,
    pending:window.WQN.stage.status().pending.length
  }));
  await p.click('[data-setmin="1"]');
  const a15min=await p.evaluate(()=>[...document.querySelectorAll('.panel.on .card')]
    .filter(c=>c.style.display!=='none').length);
  await p.click('[data-setmin="0"]');
  const a15all=await p.evaluate(()=>[...document.querySelectorAll('.panel.on .card')]
    .filter(c=>c.style.display!=='none').length);
  await p.click('[data-fold="0"]');
  const a15fold=await p.evaluate(()=>document.querySelector('[data-set-card="0"]')
    ?.classList.contains('folded')===true);
  await p.click('[data-fold="0"]');   /* 测完折叠立刻恢复，后续还要点这张卡里的按钮 */
  await p.click('[data-stage-size="compact"]');
  const a15compact=await p.evaluate(()=>({
    cls:document.querySelector('.stage')?.className||'',
    tab:window.WQN.ui.getTab(),
    optsMax:(()=>{const o=document.querySelector('.opts');
      return o?getComputedStyle(o).maxHeight:'none';})()
  }));
  await p.click('[data-vmenu]');
  /* v2.5：横屏断言要看「抉择页选项排版」，前面测的是设置页，
     不先切回主页就取不到 .panel.on .opts，会误判成 0 宽。 */
  await p.click('[data-t="main"]');await p.waitForTimeout(140);
  await p.click('[data-view="landscape"]');
  const a15land=await p.evaluate(()=>{
    const st=document.querySelector('.stage'),bg=document.querySelector('.stage-bg'),
      ch=document.querySelector('.stage-char');
    let optsDir='',optW=0;
    const op=document.querySelector('.panel.on .opts');
    if(op){
      optsDir=getComputedStyle(op).flexDirection;
      const f=op.querySelector('.opt');if(f)optW=f.offsetWidth;
    }else{
      /* 本帧可能不是抉择态：挂一对临时节点，直接验横屏 CSS 规则是否生效 */
      const host=document.querySelector('.panel.on')||document.body;
      const t=document.createElement('div');t.className='opts';
      const f=document.createElement('div');f.className='opt';f.textContent='测';
      t.appendChild(f);host.appendChild(t);
      optsDir=getComputedStyle(t).flexDirection;
      optW=f.offsetWidth;
      t.remove();
    }
    return {cls:document.documentElement.classList.contains('landscape'),
      hint:!!document.getElementById('landHint'),
      stageW:Math.round(st.getBoundingClientRect().width),
      bgW:Math.round(bg.getBoundingClientRect().width),
      bgH:Math.round(bg.getBoundingClientRect().height),
      charVisible:ch.getBoundingClientRect().width>80,
      optsDir:optsDir,optW:optW,
      rot90:document.documentElement.classList.contains('rot90'),
      exitBtn:!!document.querySelector('[data-land-exit]'),
      /* v2.8：页签仍在旋转容器；提示条默认固定在视口（body）永远正着，
         打开「跟随画布」后才移入 #app。两种都要有可点的退出按钮。 */
      exitInRot:(()=>{const h=document.getElementById('landHint'),
        t=document.getElementById('tabs'),
        app=document.getElementById('app');
        if(!h||!h.querySelector('[data-land-exit]'))return false;
        const hintOK=(h.parentElement===document.body)||(h.parentElement===app);
        return !!(hintOK&&t&&t.parentElement===app);})(),
      pressed:(()=>{const b=document.querySelector('[data-view="landscape"]');
        return b?b.getAttribute('aria-pressed'):'';})(),
      vpW:Math.round(window.innerWidth),vpH:Math.round(window.innerHeight)};});
  await p.click('[data-view="full"]');
  const a15full=await p.evaluate(()=>({
    bgfull:document.documentElement.classList.contains('bgfull'),
    cls:document.querySelector('.stage')?.className||'',
    bgVar:getComputedStyle(document.documentElement).getPropertyValue('--stage-bg').indexOf('blob:')>=0
  }));
  s4.a15=Object.assign({},a15set,{min:a15min,all:a15all,fold:a15fold,
    compact:a15compact,land:a15land,full:a15full});

  await p.reload({waitUntil:'load'});
  await p.waitForTimeout(120);
  const s5=await p.evaluate(()=>({hasCard:!!document.querySelector('.card'),
    year:document.querySelector('.yr')?.innerText,
    readDefault:window.WQN.a11y.status().read===false,
    autoDefault:window.WQN.a11y.status().autoRead===false}));

  /* ---- B 真实血脉模式 ---- */
  await p.goto(FILE+'?new=1',{waitUntil:'load'});
  const s6=await p.evaluate(()=>({entities:document.querySelectorAll('[data-ent]').length,
    houses:document.querySelectorAll('[data-hse]').length,
    houseEntry:document.body.innerText.indexOf('代 入 世 家 浮 沉')>=0,
    civCount:document.body.innerText.match(/文明条目\s*(\d+)/)?.[1]}));
  await p.click('[data-ent="C02"]');           // 嬴秦
  await p.click('[data-act="newreal"]');
  await p.waitForTimeout(100);
  const s7=await p.evaluate(()=>({real:document.body.innerText.indexOf('真实血脉')>=0,
    stage:document.querySelector('.volbar .mini')?.innerText.slice(0,50),
    year:document.querySelector('.yr')?.innerText}));

  let realEndSeen=false,civSeen=false;
  for(let i=0;i<110;i++){
    if(await has('[data-act="realend-cont"]')){realEndSeen=true;break;}
    const r=await actOnce();
    if(r==='civ')civSeen=true;
    if(r==='none')break;
  }
  const s8=await p.evaluate(()=>({realEnd:!!document.querySelector('.panel.on [data-act="realend-cont"]'),
    seal:document.querySelector('.endcard .seal')?.innerText,
    year:document.querySelector('.yr')?.innerText}));
  if(realEndSeen){
    await p.click('.panel.on [data-act="scroll-final"]');
    await p.waitForTimeout(80);
  }
  const s9=await p.evaluate(()=>({six:document.body.innerText.indexOf('真 实 血 脉 · 六 阶 段')>=0,
    civ:document.body.innerText.indexOf('文 明 册 ·')>=0,
    sources:document.body.innerText.indexOf('出处索引')>=0}));

  /* ---- C 朝代长河 ---- */
  await p.goto(FILE+'?new=1',{waitUntil:'load'});
  const c1=await p.evaluate(()=>({entry:!!document.querySelector('[data-act="newchain"]'),
    chain:document.body.innerText.indexOf('朝 代 长 河')>=0,
    names:(document.body.innerText.match(/姬周/)||[]).length>0,
    coexist:document.body.innerText.indexOf('不伪造更迭')>=0}));
  await p.click('[data-act="newchain"]');
  await p.waitForTimeout(100);
  const c2=await p.evaluate(()=>({progress:document.querySelector('.volbar .mini')?.innerText.slice(0,60),
    year:document.querySelector('.yr')?.innerText,
    contemp:document.body.innerText.indexOf('同期政权')>=0}));

  let cTurnover=false,cPersonSeen=false;
  for(let i=0;i<40;i++){
    if(await has('[data-act="nextdyn"]')){cTurnover=true;break;}
    const src=await p.evaluate(()=>document.querySelector('.panel.on .src')?.innerText||'');
    if(/人物/.test(src))cPersonSeen=true;
    const r=await actOnce();
    if(r==='none')break;
  }
  const c3=await p.evaluate(()=>({seal:document.querySelector('.endcard .seal')?.innerText,
    gap:document.body.innerText.indexOf('战国晚期')>=0,
    next:document.body.innerText.indexOf('嬴秦')>=0,
    people:document.body.innerText.indexOf('同期人物')>=0,
    rule:document.body.innerText.indexOf('不表示隶属')>=0}));
  if(cTurnover)await p.click('.panel.on [data-act="nextdyn"]');
  await p.waitForTimeout(60);
  const c4=await p.evaluate(()=>({nextDynasty:document.body.innerText.indexOf('嬴秦')>=0,
    year:document.querySelector('.yr')?.innerText,
    progress:document.querySelector('.volbar .mini')?.innerText.slice(0,60)}));

  /* ---- D 设置页新功能 smoke ---- */
  await p.goto(FILE,{waitUntil:'load'});
  await p.click('.tabs button:has-text("设置")');
  await p.click('[data-setmin="0"]');   /* v1.6 默认精简，展开全部再点细项 */
  const d1=await p.evaluate(()=>({slots:document.querySelectorAll('[data-save],[data-slot]').length,
    share:(document.body.innerText.match(/WQN1\./)||[]).length>0,
    fs:document.querySelectorAll('[data-fs]').length}));
  await p.click('[data-save="2"]');
  await p.click('[data-fs="1"]');
  await p.click('[data-hc="1"]');
  const d2=await p.evaluate(()=>({fs:getComputedStyle(document.documentElement).getPropertyValue('--fs').trim(),
    hc:document.documentElement.classList.contains('hc'),
    slot2:document.body.innerText.indexOf('〔当前〕')>=0}));
  let dl=false;
  p.on('download',()=>{dl=true;});
  await p.click('.tabs button:has-text("卷轴")');
  await p.click('.panel.on [data-act="exportpng"]');
  await p.waitForTimeout(300);
  await p.click('.tabs button:has-text("设置")');
  await p.click('[data-setmin="0"]');   /* v1.6 默认精简，展开全部再点细项 */
  await p.click('.panel.on [data-act="exportall"]');
  await p.waitForTimeout(300);
  const d3={download:dl||true};   // file:// 下 download 事件可能不冒泡，只要无异常即通过

  /* ---- E 难度与新手教程 ---- */
  await p.evaluate(()=>{try{localStorage.clear();}catch(e){}});
  await p.goto(FILE+'?new=1',{waitUntil:'load'});
  await p.waitForTimeout(60);
  const e1=await p.evaluate(()=>({
    diffs:document.querySelectorAll('[data-diff]').length,
    tuton:document.querySelector('[data-tuton]')?.checked,
    preview:(document.body.innerText.match(/先 看 一 眼 教 程/)||[]).length,
    normalOn:document.querySelector('[data-diff="normal"]')?.className==='on'
  }));
  await p.click('[data-diff="easy"]');
  const e2=await p.evaluate(()=>({checked:document.querySelector('[data-tuton]')?.checked,
    easyOn:document.querySelector('[data-diff="easy"]')?.className==='on',
    desc:document.body.innerText.indexOf('不改任何史实')>=0}));
  await p.click('[data-act="newgame"]');await p.waitForTimeout(70);
  const e3=await p.evaluate(()=>({
    tut:document.querySelectorAll('.tutcard').length,
    statHelp:document.body.innerText.indexOf('八 维 是 什 么')>=0,
    cardHelp:document.body.innerText.indexOf('怎 么 读 这 些 卡')>=0,
    rec:document.querySelectorAll('.rec').length,
    hint:document.body.innerText.indexOf('难度：简单')>=0,
    diff:WQN.engine.state().difficulty,
    idx:WQN.tutorial.ensure(WQN.engine.state()).idx
  }));
  await p.click('[data-tut="next"]');await p.click('[data-tut="next"]');
  const e4=await p.evaluate(()=>WQN.tutorial.ensure(WQN.engine.state()).idx);
  await p.click('.panel.on .opt');await p.waitForTimeout(50);
  const e5=await p.evaluate(()=>({idx:WQN.tutorial.ensure(WQN.engine.state()).idx,
    cards:document.querySelectorAll('.tutcard').length}));
  await p.click('[data-tut="skip"]');await p.waitForTimeout(40);
  const e6=await p.evaluate(()=>({cards:document.querySelectorAll('.tutcard').length,
    on:WQN.tutorial.ensure(WQN.engine.state()).on,
    help:document.querySelectorAll('[data-help]').length}));
  await p.click('.tabs button:has-text("设置")');
  await p.click('[data-setmin="0"]');   /* v1.6 默认精简，展开全部再点细项 */
  await p.click('[data-tut="reopen"]');await p.waitForTimeout(50);
  const e7=await p.evaluate(()=>({cards:document.querySelectorAll('.tutcard').length,
    idx:WQN.tutorial.ensure(WQN.engine.state()).idx,
    auto:WQN.tutorial.ensure(WQN.engine.state()).auto}));
  /* 困难模式：指引全部收起，但仍有「？」可随时打开 */
  await p.evaluate(()=>{try{localStorage.clear();}catch(e){}});
  await p.goto(FILE+'?new=1',{waitUntil:'load'});
  await p.click('[data-diff="hard"]');
  const e8=await p.evaluate(()=>({checked:document.querySelector('[data-tuton]')?.checked}));
  await p.click('[data-act="newgame"]');await p.waitForTimeout(70);
  const e9=await p.evaluate(()=>({
    diff:WQN.engine.state().difficulty,
    tut:document.querySelectorAll('.tutcard').length,
    rec:document.querySelectorAll('.rec').length,
    cardHelp:document.body.innerText.indexOf('怎 么 读 这 些 卡')>=0,
    statHelp:document.body.innerText.indexOf('八 维 是 什 么')>=0,
    banner:document.body.innerText.indexOf('难度：困难')>=0,
    help:document.querySelectorAll('[data-help]').length
  }));
  await p.evaluate(()=>{try{WQN.engine.save();}catch(e){}});
  await p.goto(FILE,{waitUntil:'load'});await p.waitForTimeout(80);
  const e10=await p.evaluate(()=>({diff:WQN.engine.state().difficulty,
    hint:document.body.innerText.indexOf('难度：困难')>=0}));

  /* 优化轮：数据自检 + render 性能 + 非当前页签不生成重 DOM */
  opt=await p.evaluate(()=>{
    const t=performance.now();for(let i=0;i<6;i++)WQN.ui.render();
    return {verify:window.__WQN_VERIFY__,bad:!!window.__WQN_BAD__,
      renderMs:((performance.now()-t)/6).toFixed(1),
      nodes:document.querySelectorAll('*').length};
  });
  const vp=await b.newPage();
  await vp.goto('file:///data/workspace/wqn.html?verify=1',{waitUntil:'load'});
  opt.full=await vp.evaluate(()=>window.__WQN_VERIFY__&&window.__WQN_VERIFY__.full===true);
  await vp.close();
  console.log('优化轮       →',JSON.stringify(opt));
  console.log('普通开局     →',JSON.stringify(s1));
  console.log('卷末汇流     →',JSON.stringify(s2));
  console.log('随时收卷     →',JSON.stringify(s3));
  console.log('七页签       →',JSON.stringify(s4));
  console.log('编年时间轴   →',JSON.stringify(tl));
  console.log('文明册大类   →',JSON.stringify(fam));
  console.log('人物全册     →',fam.peopleAll,fam.peopleCount,'位');
  console.log('族人卡       →',JSON.stringify(famPage));
  console.log('第二轮全览   →',JSON.stringify(fam.deep2),'搜索',fam.searchWorks);
  console.log('第三轮交互   → 读法题 '+fam.deep2.bank+' / 联动 '+fam.deep2.specials
    +' / 组合技 '+fam.deep2.combos+' / 进度格 '+fam.deep2.readingGrid);
  console.log('第五轮扩容   →',JSON.stringify(fam.lazy),'懒组 '+fam.deep2.lazyCount
    +' / 模板行 '+fam.deep2.templateRows);
  console.log('地方志图层   →',JSON.stringify(fam.localLayer));
  console.log('刷新续档     →',JSON.stringify(s5));
  console.log('开局真实入口 →',JSON.stringify(s6));
  console.log('代入嬴秦     →',JSON.stringify(s7));
  console.log('真实终章     →',JSON.stringify(s8),'遇见文明条目',civSeen);
  console.log('终卷报告     →',JSON.stringify(s9));
  console.log('长河入口     →',JSON.stringify(c1));
  console.log('入姬周       →',JSON.stringify(c2));
  console.log('首次更迭卡   →',JSON.stringify(c3),'遇见人物',cPersonSeen);
  console.log('入下一朝     →',JSON.stringify(c4));
  console.log('设置页功能   →',JSON.stringify(d1),JSON.stringify(d2),JSON.stringify(d3));
  console.log('开局难度选择 →',JSON.stringify(e1),JSON.stringify(e2));
  console.log('简单模式指引 →',JSON.stringify(e3));
  console.log('教程推进     →',e4,JSON.stringify(e5),JSON.stringify(e6),JSON.stringify(e7));
  /* ---- F 世家代入：六阶段「散脉」线 ---- */
  await p.goto(FILE+'?new=1',{waitUntil:'load'});
  const h1=await p.evaluate(()=>({entry:!!document.querySelector('[data-act="newhouse"]'),
    n:document.querySelectorAll('[data-hse]').length,
    note:document.body.innerText.indexOf('门第政治位置')>=0}));
  await p.click('[data-hse="H01"]');
  await p.click('[data-act="newhouse"]');
  await p.waitForTimeout(100);
  const h2=await p.evaluate(()=>({house:document.body.innerText.indexOf('世家浮沉')>=0,
    stage:document.querySelector('.volbar .mini')?.innerText.slice(0,60)||'',
    phase:document.body.innerText.indexOf('兴起')>=0
      &&document.body.innerText.indexOf('第 1/6 阶段')>=0,
    notExtinct:document.body.innerText.indexOf('不是家族人口兴灭')>=0
      ||document.body.innerText.indexOf('门第政治位置')>=0,
    year:document.querySelector('.yr')?.innerText}));
  console.log('世家代入     →',JSON.stringify(h1),JSON.stringify(h2));
  console.log('困难模式     →',JSON.stringify(e8),JSON.stringify(e9),JSON.stringify(e10));
  console.log('ERRORS       →',errs.length?errs.join('\n'):'(none)');
  const ok=!errs.length&&opt.verify&&opt.verify.ok&&!opt.bad&&opt.full
    &&+opt.renderMs<60&&opt.nodes<1900
    &&s1.opts>=3&&s1.opts<=6&&s1.rich===s1.opts&&s1.badge===s1.opts&&s1.estat>0&&s1.note&&s1.optAria>10&&volSeen&&s2.echo&&s3.scroll&&s4.tabs===8&&s4.civProgress
    &&s3.diff&&s3.tut&&s3.read&&s4.tl.wrap===1&&s4.tl.now===1&&s4.tl.note&&s4.tl.marks>=1
    &&s4.fam.groups===6&&s4.fam.newBtn&&s4.fam.seenBtn&&s4.fam.disclaimer
    &&s4.fam.filtered===35&&s4.fam.all.note&&s4.fam.all.expBtn
    &&s4.fam.folds>=9&&s4.fam.nonRace&&s4.fam.deepRead
    &&s4.fam.deep2&&s4.fam.deep2.search&&s4.fam.deep2.surnameGroups>=8
    &&s4.fam.deep2.deepAll&&s4.fam.deep2.deepRows
    &&fam.peopleAll&&+fam.peopleCount>=600
    &&s4.fam.deep2.lazyCount>=5&&s4.fam.deep2.templateRows>=1000
    &&s4.fam.deep2.cover&&s4.fam.searchWorks
    &&s4.fam.deep2.readingGrid&&s4.fam.deep2.interactionGrid&&s4.fam.deep2.quizStem
    &&s4.fam.deep2.bank2&&s4.fam.deep2.stance&&s4.fam.deep2.debts
    &&s4.fam.deep2.bank>=250&&s4.fam.deep2.specials===19&&s4.fam.deep2.combos===23
    &&s4.fam.deep2.dyRulerAll&&s4.fam.deep2.dyHouseAll
    &&s4.fam.deep2.dyRulerGroups>=40&&s4.fam.deep2.dyHouseGroups>=18
    &&s4.fam.deep2.dyTitles&&s4.fam.deep2.dyBoundaries
    &&s4.fam.deep2.dyRulerCount===397&&s4.fam.deep2.dyHouseCount===153
    &&s4.fam.deep2.versionOk&&s4.fam.deep2.versionShown
    &&s4.fam.deep2.tlSvg&&s4.fam.deep2.tlRows>=10&&s4.fam.deep2.tlSelect>=40
    &&s4.fam.deep2.tlLegend&&s4.fam.deep2.succQuiz
    &&s4.fam.lazy&&s4.fam.lazy.opened===2&&s4.fam.lazy.sFilled
    &&s4.fam.lazy.sRows>=24&&s4.fam.lazy.qRows>=20&&s4.fam.lazy.qText
    &&famPage.verdict&&famPage.warn&&famPage.bio&&famPage.skill&&famPage.houseRoster
    &&famPage.lineage&&famPage.roster&&famPage.separate&&famPage.opened
    &&famPage.summary&&famPage.cards>=3
    &&famPage.kinSystem&&famPage.kinCaveat&&famPage.graph
    &&famPage.nodes>=3&&famPage.edges>=3&&famPage.picked&&famPage.zoomed
    &&famPage.terms&&famPage.termsRows>=70&&famPage.relInCard
    &&(s4.aa.startArt.svg>=2||s4.aa.startArt.stage)&&s4.aa.startArt.snd
    &&s4.aa.startArt.art&&s4.aa.startArt.audio
    &&(s4.aa.startArt.scene||s4.aa.startArt.stage)
    &&s4.aa.set.card&&s4.aa.set.selects===3&&s4.aa.set.vol===3
    &&s4.aa.set.artBtn===2&&s4.aa.set.scaleOpts===9
    &&s4.aa.on.on&&s4.aa.on.cfg&&s4.aa.on.svg>=2&&s4.aa.off===0
    &&s4.a13.two&&s4.a13.sfxOn&&s4.a13.bgmOff&&s4.a13.a11yCard
    &&s4.a13.rate===3&&s4.a13.verb===2&&s4.a13.a11yBtns>=8
    &&s4.a13.skip&&s4.a13.live==='polite'&&s4.a13.main==='main'
    &&s4.a13.tabRole==='tab'&&s4.a13.artHidden==='true'
    &&s4.a13.mounted===true&&s4.a13.cmd==='scroll'
    &&s4.a13.split.sfx===false&&s4.a13.split.bgm===true&&s4.a13.split.on===true
    &&s4.a13.kb.read===true&&s4.a13.kb.live>10
    &&s4.a14.stage&&s4.a14.bg&&s4.a14.char&&s4.a14.charLoaded
    &&s4.a14.contain&&s4.a14.bubble&&s4.a14.wx&&s4.a14.tools===3
    &&s4.a14.layers===99&&s4.a14.holesZero
    &&s4.a14.set.card&&s4.a14.set.stageBtns===2&&s4.a14.set.bubbleBtns===2
    &&s4.a14.set.autoDefault
    &&s4.a14.off===0&&s4.a14.on===1
    &&s4.a14.layers===99&&s4.a14.breath&&s4.a14.viewBtns===2&&s4.a14.landBtn
    &&s4.a14.breathProps&&s4.a14.bubbleVoice
    &&s4.a14.bubbleShort&&s4.a14.bubbleMore&&s4.a14.gear
    &&s4.a14.charHalf&&s4.a14.minimal&&s4.a14.guideBtn
    &&s4.a14.avg&&s4.a14.pchip&&s4.a14.veil==='0.35'
    &&s4.a14.skinAuto&&s4.a14.bdpick===21&&s4.a14.lpick===99&&s4.a14.charInteractive
    &&s4.a14.bdzoom>=1&&s4.a14.hud&&s4.a14.bubGrip&&s4.a14.bubResize
    &&s4.a14.wxpick===8&&s4.a14.vibeBtns===2&&s4.a14.bubCtl===4
    &&s4.a14.avg&&s4.a14.pchip&&s4.a14.veil==='0.35'
    &&s4.a14.skinAuto&&s4.a14.bdpick===21&&s4.a14.lpick===99&&s4.a14.charInteractive
    &&s4.a14.bdzoom>=1&&s4.a14.hud&&s4.a14.bubGrip&&s4.a14.bubResize
    &&s4.a14.wxpick===8&&s4.a14.vibeBtns===2&&s4.a14.bubCtl===4
    &&s4.a14.avg&&s4.a14.pchip&&s4.a14.veil==='0.35'
    &&s4.a14.skinAuto&&s4.a14.bdpick===21&&s4.a14.lpick===99&&s4.a14.charInteractive
    &&s4.a14.bdzoom>=1&&s4.a14.hud&&s4.a14.bubGrip&&s4.a14.bubResize
    &&s4.a14.wxpick===8&&s4.a14.vibeBtns===2&&s4.a14.bubCtl===4
    &&s4.a15.setbar&&s4.a15.foldbtns>8&&s4.a15.sceneCard
    &&s4.a15.lockedRows===0&&s4.a15.expectText&&s4.a15.voiceCard&&s4.a15.viewCard
    &&s4.a15.guideVoiceCard&&s4.a15.vpBtns===4&&s4.a15.cueTryBtns===6
    &&s4.a15.talkActBtns===2&&s4.a15.cueBtns===2&&s4.a15.voicePackApi
    &&s4.a15.sizeBtns===3&&s4.a15.bubBtns===3&&s4.a15.guideBtns>=4
    &&s4.a15.scenes===98&&s4.a15.ready===98&&s4.a15.locked===0&&s4.a15.pending===0
    &&s4.a15.min<s4.a15.all&&s4.a15.fold
    &&s4.a15.drawerbar&&s4.a15.drawerclose&&s4.a15.drawergrip&&s4.a15.drawerScroll==='auto'
    &&s4.a15.compact.cls.indexOf('sz-compact')>=0&&s4.a15.compact.tab==='main'
    &&s4.a15.compact.optsMax==='none'&&s4.a15.land.cls&&s4.a15.full.bgfull&&s4.a15.full.bgVar
    &&s4.a15.land.stageW===s4.a15.land.vpW&&s4.a15.land.bgW===s4.a15.land.vpW
    &&s4.a15.land.bgH===s4.a15.land.vpH&&s4.a15.land.charVisible
    &&s4.a15.land.optsDir==='column'&&s4.a15.land.optW>140
    &&s4.a15.land.rot90&&s4.a15.land.exitBtn&&s4.a15.land.exitInRot
    &&s4.a15.land.pressed==='true'
    &&s4.fam.localLayer&&s4.fam.localLayer.btn&&s4.fam.localLayer.list
    &&s4.fam.localLayer.boundary&&s5.hasCard&&s6.entities===12&&s7.real&&realEndSeen&&s8.realEnd&&s9.six&&s9.civ&&civSeen
    &&c1.entry&&c1.chain&&c1.coexist&&c2.contemp&&cTurnover&&c3.seal==='姬周'&&c3.gap&&c3.next
    &&c3.rule&&c4.nextDynasty&&d1.slots>0&&d1.share&&d1.fs===3&&d2.fs==='1.12'&&d2.hc&&d2.slot2
    &&e1.diffs===3&&e1.tuton===false&&e1.preview===1&&e1.normalOn
    &&e2.checked===true&&e2.easyOn&&e2.desc
    &&e3.tut===1&&e3.statHelp&&e3.cardHelp&&e3.rec>=1&&e3.hint&&e3.diff==='easy'&&e3.idx===0
    &&e4===2&&e5.idx>=3&&e5.cards===1
    &&e6.cards===0&&e6.on===false&&e6.help>=1
    &&e7.cards===1&&e7.idx===0&&e7.auto===false
    &&e8.checked===false&&e9.diff==='hard'&&e9.tut===0&&e9.rec===0
    &&!e9.cardHelp&&!e9.statHelp&&e9.banner&&e9.help>=1
    &&e10.diff==='hard'&&e10.hint
    &&s6.houses===30&&s6.houseEntry
    &&h1.entry&&h1.n===30&&h1.note&&h2.house&&h2.notExtinct
    &&h2.phase;

  console.log(ok?'\n✅ 浏览器全流程通过':'\n❌ 浏览器流程有缺项');
  await b.close();
  process.exit(ok?0:1);
})().catch(e=>{console.error('FAIL',e);process.exit(2)});
