/* ui.js —— 渲染与交互（唯一碰 DOM 的模块） */
(function(W){
  'use strict';
  const D=W.data,E=W.engine,WV=W.weave,F=W.family;
  const FAMORDER=['自然基底','物质生产','社会组织','符号与意义','交换网络','认知方法'];
  let CIVEXP=false;
  let TAB='main',CIVF='*',FS=0,HC=0,
      ATL={polity:true,climate:true,pop:true,family:true,local:false},
      START={reg:'huaxia',view:'family',entity:'C01',chainRegion:'huaxia',
        reality:'balanced',modeKey:'chronicle',lengthKey:'standard',density:1,
        difficulty:'normal',tutorialOn:false,tutManual:false};
  const $=id=>document.getElementById(id);
  const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;');
  /* 静态片段缓存：姓氏 1295 条、判读 264 道、深读 106 则每次 render 重拼字符串很贵。
     数据恒定，只有「已答标记」随 S.readingLog 变；按版本缓存，每个 key 只留一份。 */
  let KINZ=1;
  const HTMLC={},LAZYOPEN=new Set();
  function cacheHTML(key,ver,build){
    const e=HTMLC[key];
    if(e&&e.ver===ver)return e.html;
    const html=build();HTMLC[key]={ver:ver,html:html};return html;
  }
  function readVer(S){
    const r=S.readingLog||[];
    return r.length+':'+(r.length?r[r.length-1].id+'/'+(r[r.length-1].choice||''):'-');
  }
  function lensLine(S){
    // 只读不摇随机数：渲染次数再多也不改 rngState，保证种子可复现
    const person=W.civilization.lens(S);
    if(person&&S.turn%2===0)return person;
    const V=D.views[S.view];
    let s=V.line[(S.turn+S.echo.length)%V.line.length];
    if(S.echo.length&&S.turn%3===0)s+=' 旧例里还留着「'+S.echo[S.turn%S.echo.length]+'」。';
    return s;
  }
  function statGrid(st,S){
    let h='<div class="stats">';
    D.keyOrder.forEach(k=>h+='<div class="st" title="'+esc(W.difficulty.statHelp[k]||D.keys[k])+'"><span>'+D.keys[k]+'</span><b>'+st[k]+'</b><div class="bar"><i style="width:'+st[k]+'%"></i></div></div>');
    h+='</div>';
    /* 简单模式：把八维逐条讲清楚，而不是只给八个缩写 */
    if(S&&W.difficulty&&W.difficulty.hints(S)>=2){
      h+='<details class="fold" '+(S.turn<3?'open':'')+'><summary>八 维 是 什 么 · 点 开 看 解 释</summary>'
        +D.keyOrder.map(k=>'<div class="mini"><b>'+D.keys[k]+'</b>　'+esc(W.difficulty.statHelp[k]||'')+'</div>').join('')
        +'<div class="mini" style="color:var(--dim)">这些数是这一支人的处境，不是分数；没有「赢」的标准答案。</div></details>';
    }
    return h;
  }
  /* 教程卡：全局浮在所有页签之上，切页签也能看到进度 */
  function tutorialHTML(S){
    const T=W.tutorial,t=T.ensure(S);
    if(!t||!t.on)return '';
    const st=T.step(S),pr=T.progress(S),ok=T.gateOK(st,S);
    const last=st.gate==='ack'||pr.idx===pr.total;
    return '<div class="tutcard"><div class="tuthead"><b>新 手 教 程 · '+pr.idx+' / '+pr.total+'</b>'
      +'<span class="mini">'+esc(T.meta.subtitle)+'</span></div>'
      +'<div class="tutbar"><i style="width:'+Math.round(pr.idx/pr.total*100)+'%"></i></div>'
      +'<div class="tagline" style="margin-top:8px">'+esc(st.title)+'</div>'
      +'<div class="mini" style="margin-top:5px">'+esc(st.body)+'</div>'
      +'<div class="note" style="margin-top:7px"><b>小提示：</b>'+esc(st.tip)+'</div>'
      +'<div class="mini" style="margin-top:6px;color:var(--gold)">'+esc(st.act)
      +(ok&&!last?'　✓ 这一步你做到了':'')+'</div>'
      +'<div class="tutbtns">'
      +(pr.idx>1?'<button data-tut="prev">上一步</button>':'')
      +'<button data-tut="next" class="on">'+(pr.idx===1?'知 道 了':pr.idx===pr.total?'完 成':'下一步 ▸')+'</button>'
      +'<button data-tut="skip">跳过教程</button></div>'
      +'<div class="mini" style="color:var(--dim);margin-top:5px">教程只讲玩法与界面，不改写史实；可在设置页随时重看。</div></div>';
  }
  /* 简单模式在每个非推演阶段补一句「这一步在做什么」 */
  const PHASE_HELP={
    result:'这一笔已落，点「继续推演」让岁月往前走；也可以「随时收卷」先看一份报告。',
    volume:'卷末汇流：岔路在这一笔收回到同一条时间线上。「再续一卷」继续，「就此收卷」出报告。',
    ending:'走到终章了。终章不是失败，只是这一局的一个落点；仍可「再续余编」。',
    realend:'真实血脉按考据年表走到了终结之年；终结原因的学界不同口径也列在卡上。',
    turnover:'朝代更迭卡：前朝终结年、过渡期、下一朝建立事件都写在这里，间朝如实留白。',
    scroll:'这是一份收卷报告：八维终值、所见条目、族谱、旧例、里程碑与地方史。合上后还能继续推演。'
  };
  function hintFor(tab,S){
    if(!W.difficulty||W.difficulty.hints(S)<2)return '';
    const m={civ:'文明册按六大知识类分组；点「本轮新增」看新维度，底下有深读卡与人群姓氏册。',
      geo:'舆图可缩放、拖动、拖年份滑杆；点「地方志」图层再点绿点，看该地四条本地史锚点。',
      vol:'卷轴页是本局编年时间轴：卷界、史事、迁徙、工程一屏看完。',
      set:'设置页管字号、对比度、存档槽、导出与分享串；也能重看新手教程。',
      log:'编年页按时间倒序列出这一局走过的事，史实标「史海可考」，其余标「推演」。',
      fam:'族谱页看在籍与凋零、本族称法（推演）与落脚地；人不会活过百年，跨年的是世代。',
      sea:'史海页列出已亲历的可考史事、旧例与得名；每条都带出处标记。'};
    return m[tab]?'<div class="hintbar">指引 · '+esc(m[tab])+'</div>':'';
  }
  function stanceLabel(S){
    const st=S.readingStance||{},a=st.suspend||0,b=st.settle||0;
    if(a+b<2)return '尚未成形';
    return a>b?'偏存异说（'+a+' : '+b+'）':b>a?'偏按通说（'+b+' : '+a+'）':'两持（'+a+' : '+b+'）';
  }
  function tutorialStat(S){
    const t=W.tutorial.ensure(S),n=W.tutorial.STEPS.length;
    return (t.on?'进行中 · ':'')+Math.min(n,t.idx+1)+' / '+n+' 步';
  }
  function scrollHTML(S,final){
    const d=WV.scrollData(S,final),f=E.fmtYear,sh=E.fmtShort;
    let h='<div class="endcard"><div class="tagline">'+(final?'终 卷 · 就 此 收 笔':'随 时 收 卷')+'</div>'
      +'<div class="seal">卷 终</div><h2>'+(final?'这一卷，合上了':'此局至此，先记一笔')+'</h2>'
      +'<div class="w">'+f(-5000)+' 起，至 '+f(d.to)+'。<br>共 '+d.turn+' 笔、'+d.vol+' 卷，第 '+d.gen+' 代，传承度 '+d.score+'。</div>'
      +(d.ending?'<div class="note"><b>终章：</b>'+d.ending.name+' · '+d.ending.why+'</div>':'')
      +(d.realEnd?'<div class="note"><b>真实终章：</b>'+esc(d.realEnd.name)+' · '+esc(d.realEnd.year)+'<br>'+esc(d.realEnd.reason)
        +(d.realEnd.dispute?'<br><span style="color:var(--dim)">学界另有口径：'+esc(d.realEnd.dispute)+'</span>':'')+'</div>':'')
      +'<div class="note"><b>总评：</b>'+d.verdict+'</div>'
      +'<button class="big" data-act="backscroll">合 上 卷 · 继 续 推 演</button>'
      +'<button class="big alt" data-act="restart">另 起 一 局</button></div>';
    h+='<div class="card"><div class="tagline">八 维 终 值</div>'+statGrid(d.st)+'</div>';
    if(d.chain){
      h+='<div class="card"><div class="tagline">朝 代 长 河 · '+d.chain.entities.length+' 朝</div>'
        +'<div class="mini">'+esc(d.chain.title)+'　'+E.fmtShort(d.chain.from)+' — '+E.fmtShort(d.chain.to)+'</div>';
      d.chain.entities.forEach((x,i)=>{
        h+='<div class="row"><span class="y">'+(i+1)+'</span><b>'+esc(x.name)+'</b> '
          +(x.visited?'<span class="s">已历</span>':'<span class="s">未至</span>')
          +' <span class="s">'+E.fmtShort(x.from)+'—'+E.fmtShort(x.to)+' · '+esc(x.transition)+'</span>'
          +(x.gap?'<div class="mini">间朝：'+esc(x.gap.name)+'（'+x.gap.years+' 年）</div>':'')
          +'</div>';
      });
      h+='<div class="hr"></div><div class="mini">'+esc(d.chain.classification)+'</div></div>';
    }
    if(d.entity){
      h+='<div class="card"><div class="tagline">真 实 血 脉 · 六 阶 段</div><div class="mini">'+esc(d.entity.name)
        +'　建立 → 扩张 → 鼎盛 → 转折 → 衰落 → 终结。节点按考据年表，阶段态势与抉择为游戏推演。</div>';
      d.entity.phases.forEach(p=>{
        h+='<div class="row"><span class="y">'+esc(p.label)+'</span><b>'+esc(p.phase)+'</b>'
          +'<div class="mini">'+esc(p.event)+'</div>'
          +(p.phase==='终结'?'<div class="mini" style="color:var(--gold)">终结原因：'+esc(d.entity.endReason)+'</div>':'')
          +'</div>';
      });
      if(d.entity.dispute)h+='<div class="note"><b>终结原因的不同解释：</b>'+esc(d.entity.dispute.alternatives||'')+'</div>';
      h+='</div>';
    }
    if(d.civ){
      h+='<div class="card"><div class="tagline">文 明 册 · '+d.civ.seen.length+' / '+d.civ.total+'</div>';
      d.civ.byDim.forEach(x=>h+='<div class="row"><b>'+x.name+'</b> <span class="s">'+x.got+' / '+x.total+'</span></div>');
      h+='<div class="hr"></div><div class="volgrid">'
        +'<div>考据判读<b>'+(S.quiz?S.quiz.right:0)+' 对 / '+(S.quiz?S.quiz.wrong:0)+' 误</b></div>'
        +'<div>鉴宝卡<b>'+Object.keys(S.treasureSeen||{}).length+' / '+D.civilization.treasures.length+'</b></div>'
        +'<div>人物生平<b>'+Object.keys(S.bioSeen||{}).length+' / '+D.civilization.biographies.length+'</b></div>'
        +'<div>家族跨朝<b>'+(S.famLog?S.famLog.length:0)+' 朝</b></div>'
        +'<div>已历气候<b>'+Object.keys(S.climateSeen||{}).length+' / '+D.geoclimate.events.length+'</b></div>'
        +'<div>文本别册<b>'+Object.keys(S.fringeSeen||{}).length+'</b></div>'
        +'<div>误读记录<b>'+((S.misread?S.misread.text+S.misread.hypothesis:0))+'</b></div>'
        +'<div>真实性档位<b>'+esc(W.reality.tier(S.reality).short)+'</b></div>'
        +'<div>难度档位<b>'+esc(W.difficulty.tier(S.difficulty).short)+'</b></div>'
        +'<div>新手教程<b>'+esc(tutorialStat(S))+'</b></div>'
        +'<div>判读合计<b>'+Object.keys(S.readingSeen||{}).length+' / '
        +D.reading_quiz.items.length+' 则</b></div>'
        +'<div>读法 / 互证 / 称谓<b>'
        +(S.readingByKind?(S.readingByKind.reading||0):0)+' / '
        +(S.readingByKind?(S.readingByKind.local||0):0)+' / '
        +((S.readingByKind?(S.readingByKind.surname||0)+(S.readingByKind.people||0):0))+'</b></div>'
        +'<div>本族读法倾向<b>'+esc(stanceLabel(S))+'</b></div>'
        +'<div>族谱旧账<b>'+((S.famDebts||[]).filter(x=>!x.cleared).length)
        +' 笔待清 · '+(S.clearedDebts||0)+' 笔已了</b></div>'
        +'<div>本局族人<b>'+W.people.summary(S).total+' 人 / '
        +W.people.summary(S).generations+' 代</b></div>'
        +'<div>亲习技能 / 生平笔数<b>'+W.people.summary(S).skills+' 项 / '
        +W.people.summary(S).skillLog+' 笔</b></div>'
        +'<div>遇真实人物<b>'+W.people.summary(S).realPeople+' 位 / 全册 '
        +D.civilization.items.filter(x=>x.dim==='P').length+' 位</b></div>'
        +'<div>继嗣制<b>'+esc(W.kinship?W.kinship.summary(S).systemName:'—')+'</b></div>'
        +'<div>夫妇 / 赘婿<b>'+(W.kinship?W.kinship.summary(S).marriages:0)+' 对 / '
        +(W.kinship?W.kinship.summary(S).uxorilocal:0)+' 位</b></div>'
        +'<div>亲属称谓<b>'+(W.kinship?W.kinship.summary(S).termsPresent:0)+' / '
        +(W.kinship?W.kinship.summary(S).termsTotal:0)+' 类</b></div>'
        +'</div><div class="mini" style="color:var(--dim)">族人生平、技能、传承与亲属关系均为本局推演，'
        +'不是史实人物履历；史册对照另见族谱页，不攀附血缘。</div><div class="hr"></div>';
    h+='<div class="note"><b>分层纪律：</b>史实 / 文本传统 / 未证实假说 / 史前可考四层严格分离。'
      +'本局档位 '+esc(W.reality.tier(S.reality).name)+'；'
      +(S.reality==='wild'?'曾开放未证实假说，但每张卡均标注无证据，未写入史实编年。'
        :'未证实假说全程未开放。')
      +'气候现象只作环境压力，不作王朝兴衰归因。</div>';
      d.civ.byDim.forEach(x=>{
        const list=d.civ.seen.filter(v=>v.dimName===x.name);
        if(!list.length)return;
        h+='<div class="tagline">'+x.name+'</div>';
        list.forEach(v=>h+='<div class="row"><span class="y">'+esc(v.rawYear)+'</span>'+esc(v.title)
          +' <span class="s">'+esc(v.category)+' · '+esc(v.status)+'</span></div>');
      });
      h+='<div class="hr"></div><div class="mini">条目逐条带出处与年代可信度；完整出处索引见工程 data/civ_sources.json。</div></div>';
    }
    h+='<div class="card"><div class="tagline">所 历 史 事 · '+d.hist.length+'</div>';
    h+=d.hist.length?d.hist.map(x=>'<div class="row"><span class="y">'+sh(x.y0)+'</span><b>'+esc(x.title)+'</b> <span class="s">'+x.source+'</span></div>').join(''):'<div class="mini">一桩可考之事也未亲历，倒是走出了一条全然自己的路。</div>';
    h+='</div>';
    h+='<div class="card"><div class="tagline">族 谱 · 在籍 '+d.alive.length+' / 凋零 '+d.dead+'</div>';
    if(S.clanName)h+='<div class="mini" style="color:var(--gold)">本族称法（推演）：'
      +esc(S.clanName)+' · 得姓多源，不作血缘断言。</div>';
    h+=d.alive.map(p=>'<div class="row"><span class="y">'+p.gen+'代</span><b>'+esc(p.name)+'</b> <span class="s">'+p.trait+'</span>'+(p.id===S.ruler?' <span style="color:var(--gold)">〔当家〕</span>':'')+'</div>').join('');
    h+='<div class="hr"></div><div class="mini">历任当家：'+(d.rulers.map(p=>esc(p.name)+(p.alive?'':'（已故）')).join(' → ')||'—')+'</div></div>';
    const locN=Object.keys(S.localSeen||{}).length,peoN=Object.keys(S.peopleSeen||{}).length;
    if(locN||peoN)h+='<div class="card"><div class="tagline">地 方 与 人 群 · 本 局 所 见</div>'
      +'<div class="mini">引用地方史锚点 '+locN+' 条、人群／姓氏条目 '+peoN+' 条'
      +'（全册地方史 '+D.localities.items.length+' 条 / 姓氏 '+D.peoples.surnames.length
      +' 条 / 人群 '+D.peoples.peoples.length+' 条）。</div>'
      +'<div class="mini" style="color:var(--dim)">'+esc(D.peoples.meta.disclaimer)+'</div>'
      +'<div class="mini">'+esc(D.localities.meta.boundary)+'</div></div>';
    h+='<div class="card"><div class="tagline">旧 例 · '+d.tags.length+' 则</div>';
    h+=d.tags.length?d.tags.map(t=>'<span class="pill">'+esc(t)+' ×'+d.tagCounts[t]+'</span>').join(''):'<div class="mini">尚无。</div>';
    const comp=E.completedProjects(),pled=E.projectLedger(),prj=E.projects();
    if(comp.length||Object.keys(pled).length||prj.length){
      h+='<div class="hr"></div><div class="tagline">跨 笔 决 议 · 工 程 账</div>';
      comp.forEach(p=>h+='<div class="row"><span class="y">'+E.fmtShort(p.from)+'</span><b>'+esc(p.name)+'</b>'
        +'<span class="s">至 '+E.fmtShort(p.to)+'</span><div class="mini">'+esc(p.note)+'</div></div>');
      prj.forEach(p=>{
        const def=D.consequences.projects.find(x=>x.id===p.pid);
        h+='<div class="row"><b>'+esc(def?def.name:p.pid)+'</b><span class="s">在办 '+p.stage+'/'+p.total+' 笔</span></div>';
      });
      if(Object.keys(pled).length)h+='<div class="mini" style="margin-top:6px">长期账本：'
        +D.keyOrder.filter(k=>pled[k]).map(k=>D.keys[k]+' 衰减 −'+Math.round(pled[k]*100)+'%').join('　')
        +'（推演，不是史实产出）</div>';
    }
    const roads=E.allRoads(10);
    if(roads.length){
      h+='<div class="hr"></div><div class="tagline">未 走 之 路 · 近 '+roads.length+' 条</div>';
      roads.forEach(x=>h+='<div class="row"><span class="y">'+E.fmtShort(x.y)+'</span>'
        +esc(x.t.length>40?x.t.slice(0,39)+'…':x.t)
        +'<div class="mini">'+esc(W.consequences.effText(x.gain))
        +(x.basis?' · 依据 '+esc(x.basis):'')+'</div></div>');
      h+='<div class="mini" style="color:var(--dim)">'+esc(D.consequences.roads.disclaimer)+'</div>';
    }
    const sts=E.stances();
    if(sts.length){
      h+='<div class="hr"></div><div class="tagline">考 据 取 舍 · '+sts.length+' 处</div>';
      sts.slice(-6).reverse().forEach(x=>h+='<div class="row"><span class="y">'+E.fmtShort(x.y)+'</span>'
        +esc(x.title)+' <span class="s">'+esc(x.status)+' · '
        +(x.choice==='suspend'?'存其异说':'从其通说')+'</span></div>');
      h+='<div class="mini" style="color:var(--dim)">'+esc(D.consequences.debate.disclaimer)+'</div>';
    }
    h+='<div class="hr"></div><div class="tagline">里 程 碑 · '+d.mil.length+'</div>';
    h+=d.mil.length?d.mil.slice().reverse().slice(0,30).map(m=>'<div class="row"><span class="y">'+sh(m.y)+'</span>'+esc(m.t)+'</div>').join(''):'<div class="mini">尚无可记。</div>';
    h+='</div>';
    return h;
  }
  /* 本局编年时间轴：卷界 / 史事 / 迁徙 / 工程 / 当前，横向一屏看完这一局 */
  function timelineHTML(S){
    const from=(S.log&&S.log.length&&S.log[0].y)||-5000,to=Math.max(S.year,from+1);
    const span=Math.max(1,to-from);
    const pct=y=>Math.max(0,Math.min(100,(y-from)/span*100));
    const vols=(S.volLog||[]).map(v=>v.to).filter(y=>y>=from&&y<=to);
    const marks=[];
    const scan=(arr)=>(arr||[]).forEach(l=>{
      if(!l||l.y<from||l.y>to||!l.t)return;
      let kind=null;
      if(l.t.indexOf('【家族 · 推演】')===0||l.t.indexOf('家族迁徙')>=0)kind='fam';
      else if(l.t.indexOf('工程')>=0||l.t.indexOf('立项')>=0||l.t.indexOf('研习')>=0)kind='work';
      else if(/亲历|终章|更迭|阶段|入新纪|文明 ·|气候 ·|立例/.test(l.t))kind='hist';
      if(kind)marks.push({y:l.y,kind:kind,t:l.t});
    });
    scan(S.log);scan(S.mil);
    const color={fam:'#f0be6e',work:'#b49ad9',hist:'#7fc7a0'};
    let h='<div class="card"><div class="tagline">本 局 编 年 时 间 轴</div>'
      +'<div class="mini">左端 '+E.fmtShort(from)+'，右端 '+E.fmtShort(to)+'（本局当前年份）。'
      +'绿点＝亲历史事／更迭，橙点＝家族迁徙，紫点＝工程节点，竖线＝卷界。'
      +'位置按年份线性排布；远古一笔跨百年，故点位疏密不表示事件频率。</div>'
      +'<div class="tlwrap"><div class="tlbase"></div>';
    vols.forEach(y=>{h+='<i class="tlvol" style="left:'+pct(y)+'%"></i>';});
    marks.slice(-46).forEach(m=>{
      h+='<i class="tlmark" style="left:'+pct(m.y)+'%;background:'+color[m.kind]+'" title="'
        +esc(E.fmtShort(m.y)+' '+m.t.slice(0,40))+'"></i>';
    });
    h+='<i class="tlnow" style="left:'+pct(to)+'%"></i></div>'
      +'<div class="tlrow"><span>'+E.fmtShort(from)+'</span><span style="color:var(--gold)">'
      +E.fmtShort(to)+' · 当前</span></div>'
      +'<div class="mini" style="margin-top:6px">共 '+vols.length+' 道卷界、'+marks.length+' 个可标节点，'
      +'第 '+(S.vol?S.vol.n:1)+' 卷。轴只按本局已发生的编年绘制，不补写未至之世。</div></div>';
    return h;
  }
  function volumeHTML(S){
    const r=S.volEnd||{},f=E.fmtYear;
    let h='<div class="endcard"><div class="tagline">卷 末 · 汇 流</div><div class="seal">'+WV.volTitle(r.n)+'</div>'
      +'<h2>卷 '+r.n+' 毕</h2><div class="w">'+f(r.from)+' — '+f(r.to)+'　共 '+r.picks+' 笔</div>'
      +'<div class="gather"><b>汇流：</b>'+r.echo+(r.gain?'<br>（'+WV.keyNames[r.top]+'+'+r.gain+'，带入下一卷）':'')+'</div></div>';
    h+='<div class="card"><div class="tagline">本 卷 得 失</div><div class="volgrid">';
    const items=[['亲历史事',r.hist.length+' 桩'],['新立旧例',r.newTags.length+' 则'],
      ['分支后续',r.chains+' 次'],['族中凋零',r.dead+' 人'],
      ['世代递进',r.gen+' 代'],['史事回响',r.histCount+' 桩']];
    items.forEach(x=>h+='<div>'+x[0]+'<b>'+x[1]+'</b></div>');
    h+='</div><div class="hr"></div><div class="mini">八维增减：'
      +D.keyOrder.filter(k=>r.diff[k]).map(k=>D.keys[k]+(r.diff[k]>0?'+':'')+r.diff[k]).join('　')+'</div>';
    if(r.newTags.length)h+='<div style="margin-top:10px">'+r.newTags.map(t=>'<span class="pill">'+esc(t)+'</span>').join('')+'</div>';
    if(r.hist.length)h+='<div class="hr"></div><div class="mini">'+r.hist.slice(0,8).map(t=>'· '+esc(t)).join('<br>')+'</div>';
    if((r.jobs&&r.jobs.length)||(r.optEcho&&r.optEcho.length)){
      h+='<div class="hr"></div><div class="tagline">这 一 卷 的 行 当 与 回 响</div>';
      if(r.jobs&&r.jobs.length)h+='<div class="mini">族中业：'+r.jobs.map(j=>'<span class="pill">'+esc(j)+'</span>').join('')+'</div>';
      if(r.optEcho&&r.optEcho.length)h+='<div class="mini" style="margin-top:6px">'
        +r.optEcho.map(x=>'· '+esc(x.t)).join('<br>')+'</div>';
    }
    if((r.projects&&r.projects.length)||(r.completed&&r.completed.length)){
      h+='<div class="hr"></div><div class="tagline">跨 笔 决 议 · 还 没 完 的 事</div>';
      (r.projects||[]).forEach(p=>h+='<div class="row"><b>'+esc(p.name)+'</b> <span class="s">'
        +p.stage+'/'+p.total+' 笔 · 起于 '+E.fmtShort(p.from)+'</span>'
        +'<div class="mini">'+esc(p.title)+'　往后还会出现岁修、验收，也可罢手。</div></div>');
      (r.completed||[]).forEach(p=>h+='<div class="mini" style="color:var(--gold)">· '+esc(p.name)
        +' 已验收（'+E.fmtShort(p.from)+'—'+E.fmtShort(p.to)+'），长期增益写入账本。</div>');
    }
    if(r.roads&&r.roads.length){
      h+='<div class="hr"></div><div class="tagline">'+esc(D.consequences.roads.label)+'</div>';
      r.roads.forEach(x=>h+='<div class="row"><span class="y">'+E.fmtShort(x.y)+'</span>'
        +'<b>'+esc(x.t.length>44?x.t.slice(0,43)+'…':x.t)+'</b> <span class="s">'+esc(x.badge)+'</span>'
        +'<div class="mini">当时预估：'+esc(W.consequences.effText(x.gain))
        +(x.risk?' · 失手 '+Math.round(x.risk*100)+'%':'')
        +(x.basis?' · 依据 '+esc(x.basis):'')+'</div></div>');
      h+='<div class="mini" style="color:var(--dim)">'+esc(D.consequences.roads.disclaimer)+'</div>';
    }
    h+='</div><div class="card"><button class="big" data-act="contvol">再 续 一 卷 ▸</button>'
      +'<button class="big alt" data-act="scroll-final">就 此 收 卷</button></div>';
    return h;
  }
  function endingHTML(S){
    const e=S.ending;
    return '<div class="endcard"><div class="tagline">终 章</div><div class="seal">'+esc(e.name)+'</div>'
      +'<h2>'+esc(e.why)+'</h2><div class="w">'+esc(e.word)+'</div>'
      +'<div class="note"><b>总评：</b>'+WV.verdict(S)+'</div>'
      +'<button class="big" data-act="scroll-final">就 此 收 卷</button>'
      +'<button class="big alt" data-act="epilogue">再 续 余 编（不结束）</button></div>';
  }
  function realEndHTML(S){
    const r=S.realEnd||{};
    let h='<div class="endcard"><div class="tagline">'+(S.mode==='succession'?'长 河 终 章':'真 实 终 章')+'</div>'
      +'<div class="seal">'+esc(r.name||'')+'</div>'
      +'<h2>'+esc(r.year||'')+'</h2>'
      +'<div class="w">'+esc(r.word||'')+'</div>'
      +'<div class="note"><b>史实节点：</b>'+esc(r.phaseEvent||'')+'</div>'
      +'<div class="note"><b>终结原因：</b>'+esc(r.reason||'')+'</div>';
    if(r.dispute)h+='<div class="note"><b>学界不同口径：</b>'+esc(r.dispute)+'</div>';
    h+='<div class="note"><b>总评：</b>'+WV.verdict(S)+'</div>'
      +'<button class="big" data-act="scroll-final">就 此 收 卷</button>'
      +'<button class="big alt" data-act="realend-cont">续 为 遗 民（余编）</button></div>';
    return h;
  }
  function turnoverHTML(S){
    const r=S.turnover||{},f=E.fmtYear,sh=E.fmtShort;
    let h='<div class="endcard"><div class="tagline">朝 代 更 迭 · 第 '+r.idx+' / '+r.total+' 朝</div>'
      +'<div class="seal">'+esc(r.name)+'</div>'
      +'<h2>'+sh(r.from)+' — '+sh(r.to)+'</h2>'
      +'<div class="w">'+esc(r.name)+' 的六阶段走完了。<br>'
      +'终结年 '+sh(r.to)+'，不是随机判定，是考据年表里的节点。</div>'
      +'<div class="note"><b>终结原因：</b>'+esc(r.endReason)+'</div>'
      +'<div class="note"><b>过渡类型（整理口径）：</b>'+esc(r.transition)+'</div>';
    if(r.dispute)h+='<div class="note"><b>学界不同口径：</b>'+esc(r.dispute)+'</div>';
    if(r.gap)h+='<div class="gather"><b>间朝 · '+esc(r.gap.name)+'（'+r.gap.years+' 年）：</b>'
      +esc(r.gap.note)+'</div>';
    h+='</div>';
    h+='<div class="card"><div class="tagline">本 朝 所 见 · '+r.seenCount+' 条</div><div class="volgrid">';
    Object.keys(r.byDim||{}).forEach(k=>h+='<div>'+esc(k)+'<b>'+r.byDim[k]+'</b></div>');
    if(!Object.keys(r.byDim||{}).length)h+='<div class="mini">这一朝尚未遇见可考条目。</div>';
    h+='</div>';
    if(r.people&&r.people.length)h+='<div class="hr"></div><div class="mini">同期人物：'+r.people.map(p=>esc(p)).join('、')+'。</div>';
    h+='<div class="mini" style="margin-top:8px;color:var(--dim)">同期口径：人物与政权仅表示年代窗口重叠，'
      +'不表示隶属该政权，亦不表示在其治下任职。</div>';
    if(r.next){
      h+='<div class="hr"></div><div class="tagline">下 一 朝</div>'
        +'<div class="row"><span class="y">'+sh(r.next.startYear)+'</span><b>'+esc(r.next.name)+'</b>'
        +'<div class="mini">'+esc(r.next.event)+'</div></div>';
    }
    h+='<div class="hr"></div><div class="mini">'+esc(r.classification)+'</div>';
    if(r.tail)h+='<div class="note"><b>链尾说明：</b>'+esc(r.tail)+'</div>';
    h+='</div><div class="card">'
      +'<button class="big" data-act="nextdyn">'+(r.last?'收 束 长 河 ▸':'入 '+esc(r.next?r.next.name:'下一朝')+' ▸')+'</button>'
      +'<button class="big alt" data-act="scroll-final">就 此 收 卷</button></div>';
    return h;
  }
  /* 同期人物：按本局年份与年代窗口重叠筛真实人物，纯展示、不摇随机数、不改史实 */
  function contemporaries(S){
    const y=S.year,all=D.civilization.items.filter(x=>x.dim==='P'&&x.layer!=='framework');
    const sorted=all.slice().sort((a,b)=>Math.abs(a.y0-y)-Math.abs(b.y0-y));
    const hit=sorted.filter(x=>x.y0<=y+20&&x.y1>=y-20).slice(0,3);
    if(!hit.length){
      const near=sorted.slice(0,2);
      if(!near.length)return '';
      let hh='<div class="card" style="margin-top:10px;padding:13px"><div class="tagline">同 期 人 物 · '
        +'本年前后暂无年代窗口重叠者</div>'
        +'<div class="mini">册中距本年最近的可考人物：</div>';
      near.forEach(x=>{hh+='<div class="row"><b>'+esc(x.title)+'</b> <span class="s">'
        +esc(x.rawYear)+'</span><div class="mini">'+esc(x.summary)+'</div></div>';});
      hh+='<div class="mini" style="color:var(--dim)">只作年代参照，不表示与本年或本局有关。</div></div>';
      return hh;
    }
    let h='<div class="card" style="margin-top:10px;padding:13px"><div class="tagline">同 期 人 物 · '
      +'年代窗口与本年重叠</div>';
    hit.forEach(x=>{
      h+='<div class="row"><b>'+esc(x.title)+'</b> <span class="s">'+esc(x.rawYear)
        +' · '+esc(x.category)+'</span><div class="mini">'+esc(x.summary)+'</div>'
        +(x.consensus==='date_contested'?'<div class="mini" style="color:var(--gold)">断代有争议</div>':'')
        +'</div>';
    });
    h+='<div class="mini" style="color:var(--dim)">只表示年代窗口重叠，不表示隶属本局政权、'
      +'不与本局推演族人有关，也不据此改写任何人物生平。</div></div>';
    return h;
  }
  function mainHTML(S){
    if(S.phase==='scroll')return scrollHTML(S,S.scroll.final);
    if(S.phase==='volume')return volumeHTML(S);
    if(S.phase==='ending')return endingHTML(S);
    if(S.phase==='realend')return realEndHTML(S);
    if(S.phase==='turnover')return turnoverHTML(S);
    if(S.phase==='choice'){
      const ev=S.cur;
      let h='<div class="card"><div class="tagline"><span class="src">'+ev.src+'</span>'+(ev.isHist?'史海可考':'推演分支')+'</div>'
        +'<h2>'+esc(ev.t)+'</h2><p class="story">'+esc(ev.x)+'</p>'
        +'<div class="lens">'+lensLine(S)+'</div>';
      if(S.mode==='succession'&&S.chainState){
        const co=W.succession.contemporaries(S,ev);
        if(co.length)h+='<div class="mini" style="margin:8px 0;color:var(--gold)">同期政权：'
          +co.map(x=>esc(x.name)).join('、')
          +(ev.isCiv?'<br><span style="color:var(--dim);font-size:10px">年代窗口重叠，不表示人物隶属该政权或在其治下任职</span>':'')
          +'</div>';
      }
      const noteCls=ev.isHypothesis?'note red':'note';
      const noteTitle=ev.isHypothesis?'无证据 · 虚构推演'
        :ev.isText?'文本传统 · 非史实'
        :ev.isClim?'气候／地理 · 可考现象'
        :ev.isCiv?'考据标注':ev.isHist?'史海钩沉':'说明';
      if(ev.note)h+='<div class="'+noteCls+'"><b>'+noteTitle+'：</b>'+esc(ev.note)+'</div>';
      if(ev.isHypothesis)h+='<div class="fringecard"><b style="color:var(--red2)">⚠ 此卡不是史实</b>'
        +'<div class="mini">'+esc(W.fringe.NO_EVIDENCE)+'</div></div>';
      if(ev.isClim&&ev.pressure){
        const ps=Object.keys(ev.pressure).filter(k=>ev.pressure[k]);
        h+='<div class="mini" style="color:var(--blue);margin-top:6px">环境压力（推演）：'
          +ps.map(k=>D.keys[k]+(ev.pressure[k]>0?'+':'')+ev.pressure[k]).join('、')
          +'　'+esc(W.geoclimate.CAVEAT)+'</div>';
      }
      if(ev.quiz)h+='<div class="gather"><b>考据题：</b>此条在数据中标记为「传说／后世追述」。'
        +'辨其类别可得文脉，断为确证史实则会记一笔误判。</div>';
      if(ev.bio){
        h+='<div class="card" style="margin-top:10px;padding:13px"><div class="tagline">人 物 生 平 · 四 段</div>'
          +'<div class="row"><b>'+esc(ev.bio.name)+'</b> <span class="s">生 '+esc(ev.bio.born)+' · 活动 '+esc(ev.bio.active)+'</span>'
          +'<div class="mini">著述／事迹：'+esc(ev.bio.work)+'</div>'
          +'<div class="mini">身后影响：'+esc(ev.bio.legacy)+'</div></div></div>';
      }
      if(ev.treasure){
        const t=ev.treasure;
        h+='<div class="card" style="margin-top:10px;padding:13px"><div class="tagline">鉴 宝 卡 · '+esc(t.name)+'</div>'
          +'<div class="volgrid">'
          +'<div>年代<b>'+esc(t.rawYear)+'</b></div>'
          +'<div>材质<b>'+esc(t.material)+'</b></div>'
          +'<div>出土／传世<b>'+esc(t.provenance)+'</b></div>'
          +'<div>现藏<b>'+esc(t.museum)+'</b></div>'
          +'</div><div class="mini" style="margin-top:8px">鉴定要点：'+esc(t.points)+'</div>'
          +'<div class="mini">断代／真伪争议：'+esc(t.dispute)+'</div></div>';
      }
      if(ev.isCiv&&ev.civMeta&&ev.civMeta.sources&&ev.civMeta.sources.length){
        const q=ev.civMeta.sources.find(s=>s.quote);
        if(q)h+='<div class="mini" style="margin-top:8px;color:#8f8067">出处引文（'
          +esc(W.civilization.RANK_LABEL[q.rank]||'出处')+'）：'+esc(q.quote.slice(0,90))
          +(q.quote.length>90?'…':'')+'</div>';
      }
      const HN=W.difficulty?W.difficulty.hints(S):1;
      const recIdx=HN>=2?W.difficulty.recommend(ev.opts):-1;
      h+='<div class="opts">';
      ev.opts.forEach((o,i)=>{
        const custom=!!(o.project||o.combo||o.debate||o.force);
        const K=custom?{name:o.badgeName||'应对',color:o.color||'#8fa3ad'}
          :((W.options&&W.options.KIND[o.kind])||{name:o.badgeName||'应对',badge:o.badge||'应',color:o.color||'#8fa3ad'});
        const gain=D.keyOrder.filter(k=>(o.gain||{})[k]>0)
          .map(k=>D.keys[k]+'+'+o.gain[k]).join('　');
        const cost=D.keyOrder.filter(k=>(o.cost||{})[k]<0)
          .map(k=>D.keys[k]+'−'+Math.abs(o.cost[k])).join('　');
        let extra='';
        if(o.basis)extra+='<span class="basis">依据 · '+esc(o.basis.title)
          +(o.basis.dimName?'（'+esc(o.basis.dimName)+'）':'')
          +(o.basis.rawYear?' · '+esc(o.basis.rawYear):'')+'</span>';
        else if(o.seeking)extra+='<span class="basis seek">寻访 · '+esc(o.seekingTitle||'未见之学')+'（选中即录入文明册）</span>';
        else if(o.isSpecial)extra+='<span class="basis">据本局舆地／同期数据生成</span>';
        if(o.project&&!o.project.abandon)extra+='<span class="basis seek">跨笔决议 · 选中后继续推进，'
          +'验收才有长期增益；也可在后续笔里罢手</span>';
        if(o.combo)extra+='<span class="basis">组合技 · 需多条不同维度知识同时在册</span>';
        if(o.debate)extra+='<span class="basis">考据分歧 · 两条互斥，选一条即作取舍</span>';
        const risk=o.risk?'<span class="risk">⚠ '+esc(W.options.riskLine(o))+'</span>':'';
        const req=o.reqText?'<span class="req">'+esc(o.reqText)+'</span>':'';
        const note=(o.reqNote||o.note)?'<span class="req" style="color:#a9c8dc">'
          +esc(o.reqNote||o.note)+'</span>':'';
        const estat=(gain||cost)?'<span class="estat">'
          +(gain?'<i class="gain">'+esc(gain)+'</i>':'')
          +(cost?'<i class="cost">'+esc(cost)+'</i>':'')+'</span>':'';
        const rec=(i===recIdx)?'<span class="rec">新手建议 · 只按「收益减代价」算的一条参考，没有标准答案</span>':'';
        h+='<button class="opt rich'+(i===recIdx?' suggested':'')+'" data-i="'+i+'"><span class="k">'+(i+1)+'</span>'
          +'<span class="optbody"><span class="badge" style="--c:'+esc(K.color)+'">'+esc(K.name)+'</span>'
          +'<span class="t">'+esc(o.t)+'</span>'+rec+extra+estat+risk+req+note+'</span></button>';
      });
      let tail='<div class="mini" style="margin-top:8px">选项由已见知识、八维态势、地理气候与同期政权生成；'
        +'代价／风险／前置／跨笔决议都写在卡上；史实条目只作依据，抉择与后果均为游戏推演。</div>';
      if(HN>=2){
        const CH=W.difficulty.cardHelp;
        tail+='<details class="fold" '+(S.turn<2?'open':'')+'><summary>怎 么 读 这 些 卡 · 简 单 模 式 逐 条 解 释</summary>'
          +['gain','cost','risk','basis','req','project','recommend'].map(k=>
            '<div class="mini"><b>'+esc({gain:'绿色收益',cost:'红色代价',risk:'⚠ 失手',
              basis:'依据',req:'前置',project:'跨笔决议',recommend:'新手建议'}[k])+'：</b>'
            +esc(CH[k])+'</div>').join('')
          +'<div class="mini" style="color:var(--dim)">卡上数字已被难度调整过，你看到的就是真正会发生的；'
          +'难度不改史实。</div></details>';
      }
      return h+tail+'</div></div>';
    }
    const r=S.result||{o:{t:'（续卷）',e:{}},msgs:[]};
    return '<div class="card"><div class="tagline">已 落 笔</div><h2>'+esc(r.o.t)+'</h2>'
      +'<div class="result">'+E.effDesc(r.o.e)+(r.msgs.length?'<br>'+r.msgs.join(' '):'')+'</div>'
      +'<p class="story" style="margin-top:12px">'+E.fmtYear(S.year)+'，这一笔已入编年。再往前，岁月不等人。</p>'
      +contemporaries(S)
      +'<button class="big" data-act="next">继 续 推 演 ▸</button>'
      +'<button class="big alt" data-act="scroll">随 时 收 卷</button></div>';
  }
  function render(){
    const S=E.state(),app=$('app');
    if(!S){renderStart(app);return;}
    /* 教程跟着玩家动作推进，只在状态变化时存档 */
    if(W.tutorial){
      let dirty=false;
      if(S.phase==='scroll'&&W.tutorial.noteScroll(S))dirty=true;
      if(W.tutorial.advance(S))dirty=true;
      if(dirty)E.save();
    }
    const e=D.eras[E.eraIdx(S.year)],V=D.views[S.view],R=D.regions[S.reg];
    let h='<div class="head"><div><div class="yr">'+E.fmtYear(S.year)+'</div>'
      +'<div class="era">'+e.n+' · 第 '+S.turn+' 笔 · 第 '
      +(((S.fam||[]).find(p=>p.id===S.ruler)||{}).gen||S.gen)+' 代</div></div>'
      +'<div class="badge">'+R.n+'<br><span style="color:var(--dim);font-size:10px">'+V.n+'视角</span></div></div>';
    const vn=S.vol?S.vol.n:1,vp=Math.min(100,Math.round(S.volTurn/E.volLen()*100));
    const realTag=(S.mode==='real'&&S.entity)
      ?'<div class="mini" style="color:var(--gold);margin-top:5px">真实血脉 · '+esc(W.real.progress(S))+'</div>'
      :(S.mode==='succession'&&S.chainState)
        ?'<div class="mini" style="color:var(--gold);margin-top:5px">朝代长河 · '+esc(W.succession.progress(S))+'</div>':'';
    const RT=W.reality.tier(S.reality),MD=W.reality.mode(S.modeKey);
    h+='<div class="'+(S.reality==='wild'?'warnbar':'tierbar')+'"><b>'+esc(W.reality.banner(S))+'</b>'
      +'<div class="mini">'+esc(RT.desc)+'</div>'
      +(S.reality==='wild'?'<div class="mini" style="color:var(--red2)">本档含明确标注的未证实假说，不是史实。</div>':'')
      +'<div class="mini" style="color:var(--gold);margin-top:4px">难度：'
      +esc(W.difficulty.banner(S))+' · '+esc(W.difficulty.tier(S.difficulty).desc)+'</div></div>';
    h+=tutorialHTML(S);
    if(!(S.tutorial&&S.tutorial.on))
      h+='<div class="mini center" style="margin:6px 0"><button data-help="1" class="pill">？ 打开新手指引</button></div>';
    h+='<div class="volbar"><div class="vt">卷 '+vn+' ·〈'+WV.volTitle(vn)+'〉· 第 '+Math.min(S.volTurn,E.volLen())+'/'+E.volLen()+' 笔'
      +(S.ended?' <span style="color:var(--red2)">· 终章已至</span>':'')+'</div>'
      +realTag
      +'<div class="vbar"><i style="width:'+vp+'%"></i></div>'
      +'<div class="mini">下一节点：'+WV.nextNode(S)+'</div></div>';
    h+=statGrid(S.st,S);

    const HH=W.difficulty?W.difficulty.hints(S):1;
    const phaseHint=(HH>=2&&S.phase!=='choice'&&PHASE_HELP[S.phase])
      ?'<div class="hintbar">这一步在做什么 · '+esc(PHASE_HELP[S.phase])+'</div>':'';
    h+='<div class="panel '+(TAB==='main'?'on':'')+'">'+phaseHint+mainHTML(S)
      +'<div class="mini center" style="margin-top:10px">传承度 '+Math.round(S.score)
      +' · 文明册 '+Object.keys(S.seenCiv||{}).length+'/'+D.civilization.items.length
      +'（'+D.civilization.dimensions.length+' 维）'
      +' · 已录史实 '+Object.keys(S.used).length+'/'+D.events.filter(x=>x.kind==='history').length
      +' · 族中在籍 '+E.aliveFam(S).length+' 人</div></div>';

    h+='<div class="panel '+(TAB==='log'?'on':'')+'">'+hintFor('log',S)+'<div class="card"><div class="tagline">编 年 · 近事</div>';
    const lg=S.log.slice(-40).reverse();
    h+=lg.length?lg.map(l=>'<div class="row"><span class="y">'+E.fmtShort(l.y)+'</span>'+esc(l.t)+'</div>').join(''):'<div class="mini">尚无笔墨。</div>';
    h+='</div></div>';

    /* ===== 亲属关系与继嗣制：开局不一定父系 ===== */
    const KN=W.kinship;
    if(KN){
      const sys=KN.system(S),KSS=KN.summary(S);
      h+='<div class="panel '+(TAB==='fam'?'on':'')+'">'+hintFor('fam',S)
        +'<div class="card"><div class="tagline">继 嗣 制 · 本 局 '+esc(sys.short)+'</div>'
        +'<div class="note"><b>'+esc(sys.name)+'：</b>'+esc(sys.desc)+'</div>'
        +'<div class="mini" style="color:var(--gold);margin-top:6px">本局夫妇 '+KSS.marriages
        +' 对 · 赘婿 '+KSS.uxorilocal+' 位 · 已推出称谓 '+KSS.termsPresent+' / '+KSS.termsTotal
        +' 类 · 女承祧当家 '+(KSS.femaleHeads?'是':'否')+'</div>'
        +'<div class="mini" style="color:var(--dim);margin-top:6px">'+esc((D.kinship.meta||{}).caveat||'')
        +'</div>'
        +'<div class="mini" style="color:var(--gold);margin-top:6px">'+esc(S.kinNote||'')+'</div>'
        +'<div class="mini" style="color:var(--dim)">'+esc((D.kinship.meta||{}).limits||'')+'</div></div>';
      /* 亲属关系图：节点按代分层，边按血亲/姻亲/继嗣着色，点节点看称谓 */
      const G=KN.graph(S);
      const maxGen=Math.max(1,...G.nodes.map(n=>n.gen));
      const layers={};G.nodes.forEach(n=>{(layers[n.gen]=layers[n.gen]||[]).push(n);});
      const pos={};
      Object.keys(layers).forEach(g=>{
        const arr=layers[g];
        arr.forEach((n,i)=>{pos[n.id]={x:arr.length===1?180:40+i*(300/(arr.length-1)),
          y:36+(Number(g)-1)*78};});
      });
      const GH=36+maxGen*78+34;
      const vb=(180-180/KINZ)+' '+(GH/2-GH/2/KINZ)+' '+(360/KINZ)+' '+(GH/KINZ);
      const COL={blood:'#c9a227',affine:'#6fa8c8',descent:'#b85c5c',
        household:'#8a8a8a',self:'#e8dcc2'};
      h+='<div class="card"><div class="tagline">亲 属 关 系 图 · '+G.nodes.length
        +' 人 / '+G.edges.length+' 条关系</div>'
        +'<div class="mini">点一个圆点看此人全部称谓；金＝血亲，蓝＝姻亲，红＝继嗣，灰＝居制。'
        +'称谓由实际关系链推出，不是预先写死的名称；孩子只从已配对的夫妇出生，'
        +'世代按双亲 +1 计算。</div>'
        +'<div style="margin:8px 0"><button data-kinzoom="+" class="pill">＋ 放大</button> '
        +'<button data-kinzoom="-" class="pill">－ 缩小</button> '
        +'<button data-kinzoom="0" class="pill">复位</button></div>'
        +'<svg id="kinGraph" data-gh="'+GH+'" viewBox="'+vb+'" style="width:100%;height:auto;background:#171512;'
        +'border:1px solid #3a342a;border-radius:6px;touch-action:none"><g id="kinScene">';
      G.edges.forEach(e=>{
        const a=pos[e.a],b=pos[e.b];if(!a||!b)return;
        h+='<line class="kge" data-a="'+esc(e.a)+'" data-b="'+esc(e.b)+'" '
          +'x1="'+a.x+'" y1="'+a.y+'" x2="'+b.x+'" y2="'+b.y+'" '
          +'stroke="'+(COL[e.kind]||'#8a8a8a')+'" stroke-width="1" opacity=".55"/>';
      });
      G.nodes.forEach(n=>{
        const q=pos[n.id];if(!q)return;
        const fill=n.alive?'#2a2620':'#1d1b18';
        const ring=n.ruler?'#c9a227':(n.gender==='female'?'#b87fa0':'#6fa8c8');
        h+='<g class="kgn" data-id="'+esc(n.id)+'" style="cursor:pointer">'
          +'<circle cx="'+q.x+'" cy="'+q.y+'" r="15" fill="'+fill+'" stroke="'+ring
          +'" stroke-width="'+(n.ruler?2.4:1.3)+'"/>'
          +'<text x="'+q.x+'" y="'+(q.y+3.5)+'" text-anchor="middle" font-size="9" '
          +'fill="#e8dcc2">'+esc(n.name.slice(0,3))+'</text>'
          +'<text x="'+q.x+'" y="'+(q.y+27)+'" text-anchor="middle" font-size="8" '
          +'fill="#8a8070">'+n.gen+'代</text></g>';
      });
      h+='</g></svg><div id="kinPick" class="mini" style="margin-top:8px;color:var(--gold)">'
        +'点圆点查看此人的夫妻、父母、姑父、舅母、连襟等称谓。</div></div>';
      /* 称谓穷举册：75 类，标出本局已出现的 */
      const COV=KN.termCoverage(S);
      h+='<div class="card"><div class="tagline">亲 属 称 谓 穷 举 · '+COV.length
        +' 类 · 本局已见 '+COV.filter(x=>x.present).length+' 类</div>'
        +'<div class="mini">含夫妻、入赘／赘婿、姑父、舅父、姨父、伯母、妯娌、连襟、'
        +'岳父母、翁姑、堂表、侄甥、过继立嗣等。未出现的只表示本局尚未形成该关系链。</div>'
        +'<details class="fold" data-lz="K:terms"><summary>展开全部 '+COV.length
        +' 类称谓</summary><div class="lazy-body">点开时载入……</div>'
        +'<template data-lz-tpl="K:terms">';
      COV.forEach(t=>{
        h+='<div class="row"><b>'+esc(t.term)+'</b> <span class="s">'
          +esc(t.kind)+(t.present?' · <span style="color:var(--gold)">✓ 本局已见</span>':'')
          +'</span>'+(t.note?'<div class="mini">'+esc(t.note)+'</div>':'')+'</div>';
      });
      h+='</template></details></div>';
    }else{
      h+='<div class="panel '+(TAB==='fam'?'on':'')+'">'+hintFor('fam',S);
    }
    /* 族谱在籍卡从这一张开始；上面的 panel 已经打开，不再重复开 panel */
    if(KN){
      h+='<div class="card"><div class="tagline">族 谱 · 在籍</div>';
    }else{
      h+='<div class="card"><div class="tagline">族 谱 · 在籍</div>';
    }

    if(S.clanName)h+='<div class="note" style="margin-top:8px"><b>本族称法（推演）：</b>'
      +esc(S.clanName)+'<div class="mini">得姓多源；这只是本局这一支人在册的称法，'
      +'不表示与任何历史家族有血缘关系，也不作血统纯正推断。</div></div>';
    const PE=W.people;
    const al=E.aliveFam(S).sort((a,b)=>b.gen-a.gen||b.age-a.age);
    /* 故去的两位族长也留一张卡：传承不能只看在籍的人 */
    const gone=(S.fam||[]).filter(p=>!p.alive&&p.role==='ruler').slice(-2);
    const roster=al.concat(gone);
    const ps=PE.summary(S);
    h+='<div class="mini" style="color:var(--gold);margin-top:6px">在册 '+ps.total+' 人（在籍 '
      +ps.alive+' · 累计凋零 '+ps.dead+'）/ '+ps.generations+' 代 · 亲习技能 '+ps.skills+' 项 · 抉择记入生平 '+ps.skillLog+' 笔'
      +' · 有父辈可考 '+ps.withParent+' 人 · 遇真实人物 '+ps.realPeople+' 位</div>';
    h+='<div class="note" style="border-left-color:var(--red2);margin-top:8px"><b>先看这一句：</b>'
      +'下面每一位都是<b>本局推演生成的人物，不是历史名人</b>。'
      +'卡片里的「同名检索」只是姓名用字巧合；真实人物另在页末「史册对照」分栏，两下不混写、不攀附血缘。</div>';
    const personCard=p=>{
      const sk=PE.skillsOf(S,p),lin=PE.lineageOf(S,p),hc=PE.historyCheck(S,p);
      let c='<details class="fold"><summary><b>'+esc(p.name)+'</b> <span class="s">第 '
        +(p.gen||1)+' 代 · 约 '+p.age+' 岁 · '+esc(p.trait||'—')+'</span>'
        +(p.id===S.ruler?' <span style="color:var(--gold)">〔当家〕</span>':'')
        +(p.alive?'':' <span style="color:var(--dim)">〔已故〕</span>')+'</summary>';
      /* 生平（推演） */
      c+='<div class="tagline">生 平 · 推 演 小 传</div>';
      c+=PE.bioOf(S,p).map(t=>'<div class="mini">'+esc(t)+'</div>').join('');
      /* 技能 */
      c+='<div class="tagline">族 人 技 能</div>';
      c+=sk.real.length?'<div class="mini">亲习：'+sk.real.map(j=>'<span class="pill">'+esc(j)+'</span>').join('')
        +'　<span style="color:var(--dim)">由抉择写回</span></div>'
        :'<div class="mini">暂无由抉择写回的亲习技能。</div>';
      if(sk.inherited.length)c+='<div class="mini">承袭：'
        +sk.inherited.map(j=>'<span class="pill">'+esc(j)+'</span>').join('')
        +'　<span style="color:var(--dim)">只表示族里有人做过，不代表本人亲习</span></div>';
      /* 传承 */
      c+='<div class="tagline">传 承</div>';
      c+='<div class="mini">第 '+(lin.generation||1)+' 代 · '
        +(lin.parent?'承自 <b>'+esc(lin.parent.name)+'</b>（第 '+lin.parent.gen+' 代）'
          :p.parent?'承自 <b>'+esc(lin.parentName)+'</b>（已不在册，仅存其名）'
                   :'开局一支人，无父辈可考')+'</div>';
      c+='<div class="mini">承自内容：'+esc(lin.from.join('、')||'—')+'</div>';
      c+='<div class="mini">名下子嗣 '+lin.children.length+' 人'+(lin.heir?('，在籍 '+lin.heir+' 人'):'')
        +(lin.children.length?'：'+lin.children.slice(0,5).map(x=>esc(x.name)).join('、'):'')+'</div>';
      if(lin.rules.length)c+='<div class="mini" style="color:var(--gold)">继立：'
        +lin.rules.map(r=>esc(E.fmtShort(r.y)+' '+r.t.replace('族长更替 · ',''))).join('　')+'</div>';
      if(lin.debts.length)c+='<div class="mini" style="color:var(--gold)">了结族谱旧账 '
        +lin.debts.length+' 笔（推演）</div>';
      /* 亲属称谓：由实际关系链推出，姑父、舅母、连襟等都在这里 */
      if(KN){
        const KR=KN.relationsOf(S,p).filter(r=>r.who&&r.who!==p.id);
        c+='<div class="tagline">亲 属 称 谓 · '+KR.length+' 条（由关系链推出）</div>';
        c+=KR.length?KR.slice(0,18).map(r=>'<div class="mini"><b>'+esc(r.term)+'</b> · '
          +esc(r.whoName)+' <span class="s">'+esc(r.kind)+'</span>'
          +(r.note?'<span style="color:var(--dim)"> '+esc(r.note)+'</span>':'')+'</div>').join('')
          +(KR.length>18?'<div class="mini" style="color:var(--dim)">另有 '
            +(KR.length-18)+' 条，见上方关系图点选。</div>':'')
          :'<div class="mini">尚无可从在册关系链推出的称谓。</div>';
      }
      /* 是不是历史名人 */
      c+='<div class="tagline" style="color:var(--red2)">是 不 是 历 史 名 人</div>';
      c+='<div class="note" style="border-left-color:var(--red2)"><b>'+esc(hc.verdict)+'</b>'
        +'<div class="mini">'+esc(hc.disclaimer)+'</div></div>';
      if(hc.sameName.length){
        c+='<div class="mini" style="color:var(--gold)">同名用字检索（册中确有此人，但不是本局族人）：</div>';
        c+=hc.sameName.map(x=>'<div class="row"><b>'+esc(x.title)+'</b> <span class="s">'
          +esc(x.rawYear||'')+'</span><div class="mini">'+esc(x.why)+' · '
          +esc(String(x.summary||'').slice(0,46))+'</div></div>').join('');
      }else c+='<div class="mini">姓名用字与册中人物无重合。</div>';
      c+='</details>';
      return c;
    };
    h+=roster.map(personCard).join('');
    const jobs=Object.keys(S.jobs||{});
    if(jobs.length)h+='<div class="hr"></div><div class="tagline">族 中 业 · 由 抉 择 而 来</div>'
      +'<div class="mini">'+jobs.map(j=>'<span class="pill">'+esc(j)+' ×'+S.jobs[j]+'</span>').join('')
      +'　<span style="color:var(--dim)">这些行当由选项写回，不是史实人物履历。</span></div>';
    const debts=(S.famDebts||[]);
    if(debts.length){
      h+='<div class="hr"></div><div class="tagline">族 谱 旧 账 · 由 失 手 的 组 合 技 留 下</div>';
      h+=debts.map(d=>'<div class="row"><span class="y">'+E.fmtShort(d.y)+'</span><b>'
        +esc(d.t.slice(0,26))+'</b> <span class="s">'
        +(d.cleared?'<span style="color:var(--gold)">已了</span>':'待清')+'</span></div>').join('');
      h+='<div class="mini" style="color:var(--dim)">旧账与清账都是本局推演，'
        +'不是史实记载；清账只收拾自家决策，不改写已发生的事。</div>';
    }
    if((S.optEcho||[]).length)h+='<div class="mini" style="margin-top:6px">近事回响：'
      +esc(S.optEcho[S.optEcho.length-1].t)+'</div>';
    const fd=E.famDistribution(S),mgs=E.famMigrations();
    if(fd.length){
      h+='<div class="hr"></div><div class="tagline">落 脚 地 · 见 舆 地 页 家 族 分 布 图</div>'
        +'<div class="mini">'+fd.map(d=>'<span class="pill">'+esc(d.name)+' '+d.count+' 人'
          +(d.ruler?' · 当家':'')+'</span>').join('')+'</div>';
      if(mgs.length)h+='<div class="mini" style="margin-top:6px;color:var(--gold)">迁徙足迹：'
        +mgs.slice(-3).map(m=>E.fmtShort(m.y)+' '+esc(m.fromName)+' → '+esc(m.toName)
          +'（'+m.count+' 人）').join('　')+'</div>';
      h+='<div class="mini" style="color:var(--dim)">落脚地取自已考据地理单元，迁徙由抉择写回；'
        +'这是本局推演，不是史实人口分布。</div>';
    }
    h+='<div class="hr"></div><div class="mini">累计凋零 '+S.dead+' 人。继任顺位：嫡长 → 兄终弟及 → 旁支过继 → 绝嗣立新。</div>'
      +'<div class="note" style="margin-top:8px"><b>关于年岁：</b>一笔推演常跨数十至百余年，那是编年跨过的岁月，'
      +'不是同一个人活过的年数。家族按约 '+F.GEN_YEARS+' 年一代接续，寿数按出生年代估算：'
      +'远古约 35–45 岁，古典约 45–55 岁，近现代约 65–80 岁；仓廪与信仰略有增减。'
      +'所以这里不会出现百岁古人。</div></div>';
    /* 史册对照：真正遇见的史实人物，与推演族人分栏 */
    const RR=W.people.realRoster(S);
    h+='<div class="card"><div class="tagline">史 册 对 照 · 本 局 遇 见 的 真 实 人 物 · '
      +RR.length+' 位</div>'
      +'<div class="note"><b>这一栏才是史实人物。</b>上面族谱里的每一位都是推演生成的人物，'
      +'两下分栏，不混写、不攀附血缘；人物生平只录可考梗概，争议与传说层另标。</div>';
    if(!RR.length)h+='<div class="mini">尚未遇见人物条目。继续推演，按年代窗口会陆续抵达。</div>';
    else RR.slice().reverse().forEach(x=>{
      h+='<details class="fold"><summary><b>'+esc(x.name)+'</b> <span class="s">'
        +esc(x.rawYear||'')+'</span></summary>';
      if(x.bio){
        h+='<div class="mini"><b>生卒／时代：</b>'+esc(x.bio.born)+'　'+esc(x.bio.active)+'</div>'
          +'<div class="mini"><b>事迹：</b>'+esc(x.bio.work)+'</div>'
          +'<div class="mini"><b>身后影响：</b>'+esc(x.bio.legacy)+'</div>';
      }else h+='<div class="mini">'+esc(x.summary)+'</div>';
      const urls=[...new Set((x.sources||[]).map(z=>z.url).filter(Boolean))].slice(0,2);
      if(urls.length)h+='<div class="mini" style="color:var(--dim)">出处：'+esc(urls.join('　'))+'</div>';
      h+='<div class="mini" style="color:var(--dim)">史实人物；与本局推演族人无血缘关系。</div></details>';
    });
    h+='</div>';
    if(S.famLog&&S.famLog.length){
      h+='<div class="card"><div class="tagline">一 家 人 · 贯 穿 朝 代</div>'
        +'<div class="mini">同一支人随改朝换代延续；以下每朝一句为游戏推演，不是史实记载。</div>';
      S.famLog.slice().reverse().forEach(f=>{
        h+='<div class="row"><span class="y">'+E.fmtShort(f.year)+'</span><b>'+esc(f.dynasty)+'</b>'
          +(f.name&&f.name!=='—'?' <span class="s">当家 '+esc(f.name)+'</span>':'')
          +'<div class="mini">'+esc(f.text)+'　在籍 '+f.alive+' 人 · 第 '+f.gen+' 代</div></div>';
      });
      h+='</div>';
    }
    h+='<div class="card"><div class="tagline">旧 例 账 本</div><div class="mini">'
      +'旧例不只回响在文案里，会真实改写每笔的族和衰减、仓廪与文脉增速。</div>';
    const L=E.ledgerNow();
    h+='<div class="volgrid" style="margin-top:8px">';
    D.keyOrder.filter(k=>L[k]).forEach(k=>h+='<div>'+D.keys[k]+'<b>+'+L[k]+'</b></div>');
    if(!D.keyOrder.some(k=>L[k]))h+='<div class="mini">尚无旧例入账。</div>';
    h+='</div><div class="mini" style="margin-top:8px">已立旧例 '+Object.keys(S.tags||{}).length+' 则；'
      +'旧例越多，族和衰减越慢。</div></div>';
    h+='<div class="card"><div class="tagline">里 程 碑</div>';
    const ml=S.mil.slice(-24).reverse();
    h+=ml.length?ml.map(m=>'<div class="row"><span class="y">'+E.fmtShort(m.y)+'</span>'+esc(m.t)+'</div>').join(''):'<div class="mini">尚无可记。</div>';
    h+='</div></div>';

    h+='<div class="panel '+(TAB==='sea'?'on':'')+'">'+hintFor('sea',S)+'<div class="card"><div class="tagline">已 历 之 史</div>';
    const hs=D.events.filter(x=>S.used[x.id]);
    h+=hs.length?hs.slice().reverse().map(x=>'<div class="row"><span class="y">'+E.fmtShort(x.y0)+'</span><b>'+esc(x.title)+'</b> <span class="s">'+x.source+'</span><div class="mini">'+esc(x.note)+'</div></div>').join(''):'<div class="mini">还未亲历可考之事。</div>';
    h+='</div><div class="card"><div class="tagline">旧 例 · 已得之名</div>';
    const tk=Object.keys(S.tags);
    h+=tk.length?tk.map(t=>'<span class="pill">'+esc(t)+' ×'+S.tags[t]+'</span>').join(''):'<div class="mini">尚无。</div>';
    h+='<div class="hr"></div><div class="mini">史事为通识级概述，来自外置 events.json，可自行替换；带「推演／远闻」标记者为虚构情境。</div></div></div>';

    /* 文明册：20 维、解锁树、鉴宝卡、生平、引文分级 */
    const CV=W.civilization,prog=CV.progress(S),seen=CV.seenItems(S);
    const allSeen=Object.keys(S.seenCiv||{}).length;
    /* 预建索引：原先每个键都 find 一次 90 维数组，文明页 render 白白多跑几万次比较 */
    const dimIdx={};D.civilization.dimensions.forEach(d=>dimIdx[d.key]=d);
    const isNewDim=k=>{const d=dimIdx[k];
      return !!(d&&(d.tier==='frontier24'||d.tier==='depth'||d.tier==='depth2'));};
    const newCount=prog.filter(p=>isNewDim(p.key)).length;
    const shownDims=CIVF==='*'?prog
      :CIVF==='__new'?prog.filter(p=>isNewDim(p.key))
      :CIVF==='__seen'?prog.filter(p=>p.seen>0)
      :prog.filter(p=>p.key===CIVF);
    const famOf=k=>{const d=dimIdx[k];return d?d.family:'其他';};
    /* 只生成当前页签的重内容：文明册有 1295 条姓氏与 264 道判读，
       非本页签时不拼进 DOM，切页签时 render 会即时生成 */
    if(TAB==='civ'){
    h+='<div class="panel '+(TAB==='civ'?'on':'')+'">'+hintFor('civ',S)+'<div class="card"><div class="tagline">文 明 册 · '+prog.length+' 维 · '+FAMORDER.length+' 大类 · 已见 '+allSeen+' / '+D.civilization.items.length+'</div>'
      +'<div class="mini">逐条来自考据数据，带年代、可信度、出处与引文；术数／神话／飞行意象另附边界声明。'
      +'维度按知识大类分组，主归类不排斥跨类；第七类「边界与分层」（文本传统／未证实假说／史前可考）不设维度，见舆地页与档位说明。</div>'
      +'<div style="margin-top:10px"><button data-dim="*" class="pill '+(CIVF==='*'?'on':'')+'">全部</button> '
      +'<button data-dim="__new" class="pill '+(CIVF==='__new'?'on':'')+'">本轮新增 '+newCount+' 维</button> '
      +'<button data-dim="__seen" class="pill '+(CIVF==='__seen'?'on':'')+'">仅已见</button></div>';
    FAMORDER.forEach(f=>{
      const arr=prog.filter(p=>famOf(p.key)===f);
      if(!arr.length)return;
      h+='<div class="famgroup"><div class="mini">'+esc(f)+' · '+arr.length+' 维</div>';
      arr.forEach(p=>h+='<button data-dim="'+p.key+'" class="pill '+(CIVF===p.key?'on':'')+'">'
        +esc(p.badge)+(isNewDim(p.key)?' <span style="color:var(--gold)">新</span>':'')+'</button> ');
      h+='</div>';
    });
    h+='<div class="mini" style="margin-top:8px;color:var(--dim)">标「新」的 '+newCount
      +' 维为通识级锚点，出处为域名级检索入口，未逐条附引文，见工程 meta.frontier24。</div></div>';
    const dimsToShow=(CIVF==='*'&&!CIVEXP)
      ?(function(){const base=shownDims.slice(0,4);
          const sd=shownDims.filter(p=>p.seen>0&&base.indexOf(p)<0);
          return base.concat(sd).slice(0,12);})()
      :shownDims;
    h+='<div class="card"><div class="tagline">维 度 进 度 · '+shownDims.length+' 维</div>'
      +'<div class="mini">共 '+prog.length+' 维，当前显示 '+dimsToShow.length+' 维'
      +(CIVF==='*'?'（基础 4 维 + 已见维度）':'（当前筛选）')
      +'。点上方大类下的按钮可筛看某一维。</div>'
      +'<button data-exp="1" class="pill '+(CIVEXP?'on':'')+'" style="margin-top:8px">'
      +(CIVEXP?'收 起 全 部 维 度':'展 开 全 部 '+prog.length+' 维')+'</button>';
    dimsToShow.forEach(p=>{
      h+='<div style="margin-top:9px"><div class="vt">'+p.name+' <span style="color:var(--dim);font-size:11px">'+p.seen+' / '+p.total+'（'+p.rate+'%）</span></div>'
        +'<div class="vbar"><i style="width:'+p.rate+'%"></i></div>'
        +'<div class="mini">'+p.desc+'</div></div>';
    });
    h+='<div class="hr"></div><div class="volgrid">'
      +'<div>考据判读<b>'+(S.quiz?S.quiz.right:0)+' 对 / '+(S.quiz?S.quiz.wrong:0)+' 误</b></div>'
      +'<div>鉴宝卡<b>'+Object.keys(S.treasureSeen||{}).length+' / '+D.civilization.treasures.length+'</b></div>'
      +'<div>人物生平<b>'+Object.keys(S.bioSeen||{}).length+' / '+D.civilization.biographies.length+'</b></div>'
      +'<div>解锁树<b>'+D.civilization.unlocks.length+' 条</b></div>'
      +'<div>判读 · 读法<b>'+(S.readingByKind?S.readingByKind.reading||0:0)+' / 106 则</b></div>'
      +'<div>判读 · 互证<b>'+(S.readingByKind?S.readingByKind.local||0:0)+' / 29 则</b></div>'
      +'<div>判读 · 称谓<b>'+((S.readingByKind?(S.readingByKind.surname||0)+(S.readingByKind.people||0):0))+' / 39 则</b></div>'
      +'<div>本族读法倾向<b>'+esc(stanceLabel(S))+'</b></div>'
      +'<div>联动 / 组合技<b>'+D.options.special.length+' 条 / '
      +D.consequences.combos.length+' 个</b></div>'
      +'<div>族谱旧账<b>'+((S.famDebts||[]).filter(x=>!x.cleared).length)
      +' 笔待清 · '+(S.clearedDebts||0)+' 笔已了</b></div>'
      +'</div><div class="mini" style="color:var(--gold)">'+esc(D.reading_quiz.meta.note)
      +'　'+esc(D.reading_quiz.meta.interaction2||'')+'</div></div>';
    const lens=CV.lens(S);
    if(lens)h+='<div class="card"><div class="tagline">人 物 视 角</div><div class="lens">'+esc(lens)+'</div>'
      +'<div class="mini">叙事以最近遇见的真实人物为镜，只改口吻，不改写其生平。</div></div>';
    const list=seen.filter(x=>{
      if(CIVF==='*'||CIVF==='__seen')return true;
      if(CIVF==='__new')return isNewDim(x.dim);
      return x.dim===CIVF;
    });
    h+='<div class="card"><div class="tagline">所 见 条 目 · '+list.length+'</div>';
    if(!list.length)h+='<div class="mini">尚未遇见。继续推演，条目按年代窗口与前置解锁抵达；本土标「史实」，其余文明圈标「远闻」。</div>';
    else list.slice().reverse().slice(0,24).forEach(x=>{
      const ranks=[...new Set(x.sources.map(s=>CV.RANK_LABEL[s.rank]||'出处'))].join('／');
      const u=CV.unlockInfo(x);
      const q=x.sources.find(s=>s.quote);
      h+='<div class="row"><span class="y">'+esc(x.rawYear)+'</span><b>'+esc(x.title)+'</b>'
        +'<div class="mini">'+esc(x.dimName)+'／'+esc(x.category)+' · '+esc(x.status)+' · '+CV.PRECISION_LABEL[x.precision]
        +(x.region===S.reg?' · 本土':' · 远闻')+' · '+ranks+'</div>'
        +'<div class="mini">'+esc(x.summary)+'</div>'
        +(x.boundary?'<div class="mini" style="color:var(--red2)">'+esc(x.boundary)+'</div>':'')
        +(u?'<div class="mini">前置：'+u.requires.map(r=>{const z=CV.byId[r];return esc(z?z.title:r);}).join('、')+'</div>':'')
        +(q?'<div class="mini" style="color:#8f8067">引文：'+esc(q.quote.slice(0,70))+(q.quote.length>70?'…':'')+'</div>':'')
        +'<div class="mini" style="word-break:break-all;color:#8f8067">出处：'
        +x.sources.slice(0,2).map(s=>esc(CV.hostOf(s.url))).join('、')+'</div></div>';
    });
    if(list.length>24)h+='<div class="mini">…另有 '+(list.length-24)+' 条，见收卷报告。</div>';
    h+='<div class="hr"></div><div class="mini">共 '+D.civilization.items.length+' 条考据条目、'
      +Object.keys(D.civSources).length+' 条出处索引（机构／学术与百科／媒体分级）。'
      +'传说与断代争议条目单独标注，不与确证史实混列。</div>';
    /* 深读卡：按当前筛选的维度挑，三段式「误解／分歧／延伸」 */
    const DD=D.deepdives,ddKeys=new Set((CIVF==='*'||CIVF==='__new'||CIVF==='__seen')
      ?Object.keys(S.seenCiv||{}).map(id=>{const z=CV.byId[id];return z?z.dim:null;}).filter(Boolean)
      :[CIVF]);
    const dds=DD.items.filter(x=>ddKeys.size?ddKeys.has(x.dim):true).slice(0,6);
    /* 本局所见维度命中不足时，补几条通识深读，避免这一栏空落落 */
    const ddPool=dds.concat(DD.items.filter(x=>dds.indexOf(x)<0)).slice(0,6);
    h+='<div class="card"><div class="tagline">深 读 卡 · 全册 '+DD.items.length+' 则</div>'
      +'<div class="mini">'+esc(DD.meta.note)+'</div>';
    ddPool.forEach(x=>{
      const dim=CV.dimByKey?CV.dimByKey[x.dim]:null;
      h+='<details class="fold"><summary>'+esc(x.topic)+' <span class="s">'
        +esc(dim?dim.name:x.dim)+' · '+esc(x.rank)+'</span></summary>'
        +'<div class="mini"><b>常见误解：</b>'+esc(x.misread)+'</div>'
        +'<div class="mini"><b>分歧所在：</b>'+esc(x.dispute)+'</div>'
        +'<div class="mini"><b>延伸方向：</b>'+esc(x.further)+'</div>'
        +'<div class="mini" style="color:var(--dim)">'+esc(x.note)+'</div></details>';
    });
    const ddCover=new Set(DD.items.map(x=>x.dim)).size;
    h+='<details class="fold" data-lz="D:all"><summary>全 册 深 读 · '+DD.items.length+' 则 / 覆盖 '
      +ddCover+' / '+D.civilization.dimensions.length+' 维 · 点 开 逐 条 看</summary>'
      +'<div class="lazy-body">点开时载入……</div><template data-lz-tpl="D:all">'
      +cacheHTML('D:all',readVer(S),()=>DD.items.map(x=>{
        const q=D.reading_quiz.items.find(z=>z.ddId===x.id);
        const rec=(S.readingLog||[]).filter(z=>z.id===(q?q.id:'')).pop();
        const mark=!rec?'':(rec.choice==='ok'?' <span style="color:var(--gold)">✓ 已辨</span>'
          :rec.choice==='mid'?' <span style="color:var(--gold)">· 折中</span>'
          :' <span style="color:var(--red2)">× 曾误取</span>');
        return '<div class="row"><b>'+esc(x.topic)+'</b>'+mark
          +'<span class="s">'+esc(x.dim)+' · '+esc(x.rank)+'</span>'
          +'<div class="mini">误解：'+esc(x.misread)+'</div>'
          +'<div class="mini">分歧：'+esc(x.dispute)+'</div>'
          +'<div class="mini">延伸：'+esc(x.further)+'</div>'
          +(q?'<div class="mini" style="color:var(--gold)">读法题：'+esc(q.stem)
            +'<br>稳妥：'+esc(q.ok)+'<br>折中：'+esc(q.mid||'先按通说落笔，异说另注')
            +'<br>误读：'+esc(q.bad)+'</div>':'')
          +'</div>';
      }).join(''))
      +'</template></details>';
    const QK=D.reading_quiz;
    const qKinds=[['local','辨其互证 · 地方史'],['surname','辨其称谓 · 姓氏边界'],
                  ['people','辨其称谓 · 人群他称与术语'],
                  ['surname_origin','辨其共祖 · 姓氏扩容'],
                  ['term_layer','辨其层位 · 术语锚点']];
    h+='<div class="mini" style="color:var(--gold);margin-top:6px">互 证 与 称 谓 题 库 · 判 读 '
      +QK.items.length+' 道 / '+(qKinds.length+1)+' 类 · 按类点开</div>';
    qKinds.forEach(([k,label])=>{
      const arr=QK.items.filter(x=>x.kind===k);
      if(!arr.length)return;
      h+='<details class="fold" data-lz="Q:'+k+'"><summary>'+esc(label)+' · '+arr.length
        +' 道</summary><div class="lazy-body">点开时载入 '+arr.length+' 道……</div>'
        +'<template data-lz-tpl="Q:'+k+'">';
      h+=cacheHTML('Q:'+k,readVer(S),()=>arr.map(q=>{
        const rec=(S.readingLog||[]).filter(z=>z.id===q.id).pop();
        const mark=rec?(rec.choice==='ok'?' <span style="color:var(--gold)">✓ 已辨</span>'
          :rec.choice==='mid'?' <span style="color:var(--gold)">· 折中</span>'
          :' <span style="color:var(--red2)">× 曾误取</span>'):'';
        return '<div class="row"><b>'+esc(q.topic)+'</b>'+mark
          +'<div class="mini">'+esc(q.stem)+'</div>'
          +'<div class="mini">稳妥：'+esc(q.ok)+'</div>'
          +'<div class="mini">折中：'+esc(q.mid||'')+'</div>'
          +'<div class="mini">误读：'+esc(q.bad)+'</div></div>';
      }).join(''))
        +'</template></details>';
    });
    h+='<div class="mini" style="color:var(--dim)">'+esc(QK.meta.boundary)
      +'　'+esc(QK.meta.scaleNote||'')+'</div>';
    h+='<div class="mini" style="color:var(--dim)">'+esc(DD.meta.boundary)
      +'　'+esc(DD.meta.depth2||'')+'</div></div>';
    /* 人群与姓氏谱系：默认折叠，不作生物种族分类 */
    const PP=D.peoples;
    h+='<div class="card"><div class="tagline">人 群 与 姓 氏 谱 系</div>'
      +'<div class="note" style="border-left-color:var(--red2)"><b>'+esc(PP.meta.subtitle)
      +'：</b>'+esc(PP.meta.disclaimer)+'</div>'
      +'<div class="mini">'+esc(PP.meta.note)+'　'+esc(PP.meta.density)+'</div>';
    h+='<input id="ppSearch" class="ppsearch" placeholder="筛一筛：姓氏 / 人群 / 关键词">'
      +'<div class="mini" style="color:var(--gold)">'+esc(PP.meta.density2||'')+'</div>'
      +'<div id="ppCount" class="mini" style="color:var(--gold)"></div>'
      +'<div id="ppList">';
    const rowOf=x=>'<div class="row pp-row"><span class="y">'+esc(x.rawYear)+'</span><b>'+esc(x.title)+'</b>'
      +'<span class="s">'+esc(x.category)+' · '+esc(x.consensus==='date_contested'?'断代有争议':'学界通说')+'</span>'
      +'<div class="mini">'+esc(x.summary)+'</div>'
      +(x.boundary?'<div class="mini" style="color:var(--gold)">'+esc(x.boundary)+'</div>':'')+'</div>';
    const fold=(title,arr,lzKey)=>{
      if(!arr.length)return '';
      const body=cacheHTML('F:'+title,'s'+arr.length,()=>arr.map(rowOf).join(''));
      /* 一律放 template 点开才载入：1295 条姓氏若全进 DOM，文明页 render 会明显卡 */
      return '<details class="fold pp-group" data-lz="'+lzKey+'"><summary>'+esc(title)
        +' · '+arr.length+' 条</summary><div class="lazy-body">点开时载入 '
        +arr.length+' 条……</div><template data-lz-tpl="'+lzKey+'">'
        +body+'</template></details>';
    };
    const sg={};PP.surnames.forEach(x=>{const k=x.group||'既有锚点（本轮前已收录）';(sg[k]=sg[k]||[]).push(x);});
    Object.keys(sg).forEach((k,i)=>h+=fold('姓 氏 · '+k,sg[k],'S:'+i));
    const pg={};PP.peoples.forEach(x=>{const k=x.category||'其他';(pg[k]=pg[k]||[]).push(x);});
    Object.keys(pg).forEach((k,i)=>h+=fold('人 群 · '+k,pg[k],'P:'+i));
    h+=fold('边 界 与 读 法',PP.notes.map(x=>({rawYear:'',title:x.title,category:'边界',
      consensus:'settled',summary:x.text,boundary:''})),'N:0');
    h+='</div><div class="mini" style="color:var(--dim)">全册 '+PP.surnames.length+' 条姓氏、'
      +PP.peoples.length+' 条人群、'+PP.notes.length+' 条边界读法；大组点开才载入，检索时会全量筛，'
      +'不作生物种族分类，也不作血统推断。</div>'
      +'<div class="mini" style="color:var(--gold)">'+esc(PP.meta.scaleNote||'')+'</div></div></div>';
    /* 人物全册：647 位可考姓名按时代分桶，懒加载，已见标金（仍在文明册 panel 内） */
    const PALL=D.civilization.items.filter(x=>x.dim==='P');
    const seg=y=>y<-3000?'传说 / 远古（不作可考纪年）'
      :y<-1000?('前'+Math.ceil(-y/100)+'世纪以前')
      :y<-500?('前'+Math.ceil(-y/100)+'—前'+Math.ceil(-(y+500)/100)+'世纪')
      :y<1?('前'+Math.ceil(-y/100)+'世纪—公元元年前后')
      :y<1000?('公元'+Math.ceil(y/100)+'世纪')
      :y<1500?('公元'+Math.ceil(y/100)+'世纪')
      :y<1800?('公元'+Math.ceil(y/100)+'世纪')
      :('公元'+Math.ceil(y/100)+'世纪—近现代');
    const PB={};PALL.forEach(x=>{const k=seg(x.y0);(PB[k]=PB[k]||[]).push(x);});
    const PKEYS=Object.keys(PB);
    h+='<div class="card"><div class="tagline">人 物 全 册 · '+PALL.length
      +' 位可考姓名 · '+PKEYS.length+' 个时段</div>'
      +'<div class="mini">逐条带年代窗口、类目与一句梗概；新增条目为通识级锚点，'
      +'域名级检索入口、未逐条附引文、不作学术引用。传说层与断代争议单独标注，'
      +'不与本局推演族人攀附血缘。</div>'
      +'<details class="fold" data-lz="CIV:pall"><summary>展开全册 '+PALL.length
      +' 位（按时代分组，点开载入）</summary><div class="lazy-body">点开时载入……</div>'
      +'<template data-lz-tpl="CIV:pall">';
    /* 647 条每次 render 重拼太贵；只有「本局已见数量」变化时才重算 */
    h+=cacheHTML('CIV:pall','seen'+Object.keys(S.seenCiv||{}).length,()=>{
      let out='';
      PKEYS.forEach(k=>{
        out+='<details class="fold"><summary>'+esc(k)+' · '+PB[k].length+' 位</summary>';
        PB[k].forEach(x=>{
          const seen=!!(S.seenCiv||{})[x.id];
          out+='<div class="row"><b>'+esc(x.title)+'</b> <span class="s">'+esc(x.rawYear)
            +(seen?' · <span style="color:var(--gold)">✓ 本局已见</span>':'')+'</span>'
            +'<div class="mini">'+esc(x.summary)+'</div>'
            +(x.consensus==='date_contested'?'<div class="mini" style="color:var(--gold)">断代有争议</div>':'')
            +(x.layer==='framework'?'<div class="mini" style="color:var(--red2)">传说 / 后世追述，不作史实</div>':'')
            +'</div>';
        });
        out+='</details>';
      });
      return out;
    });
    h+='</template></details></div>';
    h+='</div>';   /* 关闭文明册 panel（人物全册之后才收口） */
    }else{h+='<div class="panel"></div>';}

    /* 舆地：可缩放历史舆图 + 真实地理、气候变迁、史前序章与边界层 */
    const GC=W.geoclimate,FG=W.fringe,T=W.reality.tier(S.reality);
    const mine=GC.unitsOf(S.reg),AM=D.atlas.meta,LM=D.layers.meta;
    const LB=[['polity','政权'],['climate','气候'],['pop','人口热力'],['family','家族'],['local','地方志']];
    h+='<div class="panel '+(TAB==='geo'?'on':'')+'">'+hintFor('geo',S)+'<div class="card"><div class="tagline">历 史 舆 图 · 五 层 可 叠 加</div>'
      +'<div class="note" style="border-left-color:var(--red2)"><b>'+esc(AM.title)+'：</b>'
      +esc(AM.disclaimer)+'</div>'
      +'<div class="mini" style="margin-top:6px">'+esc(AM.precise)+'</div>'
      +'<div class="mini">'+esc(LM.climateNote)+'</div>'
      +'<div class="mini">'+esc(LM.populationNote)+'</div>'
      +'<div class="mini">'+esc(LM.familyNote)+'</div>'
      +'<div class="mini" style="color:var(--gold)">'+esc(D.localities.meta.boundary)+'</div>'
      +'<div class="layerbar">'+LB.map(x=>'<button data-layer="'+x[0]+'" class="'+(ATL[x[0]]?'on':'')+'">'
        +(ATL[x[0]]?'✓ ':'＋ ')+x[1]+'</button>').join('')+'</div>'
      +'<div class="maptools">'
      +'<button data-atlas="in">＋ 放大</button><button data-atlas="out">－ 缩小</button>'
      +'<button data-atlas="reset">复 位</button><button data-atlas="follow">回到本局年份</button>'
      +'</div>'
      +'<div class="yearbar"><span>年 份</span>'
      +'<input type="range" id="atlasYear" min="-3100" max="2026" step="1" value="'+Math.max(-3100,Math.min(2026,S.year))+'">'
      +'<b id="atlasYearLabel">'+E.fmtYear(S.year)+'</b></div>'
      +'<div class="mapbox atlasbox"><canvas id="atlasCanvas"></canvas></div>'
      +'<div class="mini" style="margin-top:8px">滚轮／双指缩放、按住拖动平移；'
      +'点选圆点为地理单元（开启地方志时变绿）、白点为城址、金圈为家族据点、彩椭圆为气候影响区。'
      +'横轴经度 −180°→180°，纵轴纬度 90°→−90°。'+esc(LM.zoom)+'</div>'
      +'<div id="atlasPick" class="note" style="margin-top:8px">点一下地图上的点位，可查看该地说明。</div>'
      +'<div id="atlasList" class="card" style="margin-top:8px;padding:10px"></div>'
      +'</div>';
    h+='<div class="card"><div class="tagline">本 圈 地 理 单 元 · '+mine.length+'</div>';
    mine.forEach(u=>h+='<div class="row"><span class="y">'+u.lat.toFixed(0)+'°, '+u.lon.toFixed(0)+'°</span>'
      +'<b>'+esc(u.name)+'</b> <span class="s">'+esc(u.type)+'</span>'
      +'<div class="mini">'+esc(u.fact)+'</div>'
      +(u.change!=='稳定'?'<div class="mini" style="color:var(--gold)">可考变化：'+esc(u.change)+'</div>':'')
      +'</div>');
    h+='</div>';
    const seenClim=GC.timeline(S,S.climateSeen||{});
    h+='<div class="card"><div class="tagline">气 候 与 地 理 编 年 · 已历 '+seenClim.length+' / '+D.geoclimate.events.length+'</div>'
      +'<div class="mini">'+esc(D.geoclimate.meta.clmNote)+'</div>'
      +'<div class="note" style="margin-top:8px">'+esc(GC.CAVEAT)+'</div>';
    (seenClim.length?seenClim:D.geoclimate.events.slice(0,10)).forEach(x=>{
      h+='<div class="row"><span class="y">'+esc(x.rawYear)+'</span><b>'+esc(x.title)+'</b>'
        +(S.climateSeen&&S.climateSeen[x.id]?' <span style="color:var(--gold)">〔已历〕</span>':'')
        +'<div class="mini">'+esc(x.category)+' · '+esc(x.summary.slice(0,70))+'…</div></div>';
    });
    h+='<div class="hr"></div><div class="mini">共 '+D.geoclimate.events.length+' 条，覆盖全新世大暖期、非洲湿润期、4.2千年事件、'
      +'小冰期、坦博拉喷发、黄河铜瓦厢改道、近现代变暖与海平面上升。逐条标证据类型与区域异质性。</div></div>';

    /* 史前序章：有考古证据的对照面 */
    h+='<div class="card"><div class="tagline">史 前 序 章 · 有 考 古 证 据 · '+D.fringe.prehistory.length+'</div>'
      +'<div class="mini">这些是真正可考的史前人类活动，与「史前超文明」类无证据假说严格分开。'
      +'年代早于本局起点，只在序章陈列，不按年份触发。</div>';
    D.fringe.prehistory.forEach(p=>h+='<div class="row"><span class="y">'+esc(p.rawYear)+'</span>'
      +'<b>'+esc(p.title)+'</b><div class="mini">'+esc(p.summary)+'</div></div>');
    h+='</div>';

    /* 边界层：文本传统 / 未证实假说 */
    h+='<div class="card"><div class="tagline">文 本 传 统 与 边 界 层</div>'
      +'<div class="mini">四层严格分离：史实 / 文本传统 / 未证实假说 / 史前可考。'
      +'当前档位 <b style="color:var(--gold)">'+esc(T.name)+'</b>：'
      +'文本传统'+(T.allow.text?'已开放（标非史实）':'关闭')+'，'
      +'未证实假说'+(T.allow.hypothesis?'已开放（红色警示）':'关闭')+'。</div>'
      +'<div class="note" style="margin-top:8px"><b>核心纪律：</b>文本真实存在、成书年代可考，'
      +'不等于文本所述事件、人物或技术为真。野史、笔记、志怪、演义、小说都归这一层。</div>';
    const tx=D.fringe.texts.slice(0,8);
    tx.forEach(x=>h+='<div class="row"><span class="y">'+esc(x.rawYear)+'</span><b>'+esc(x.title)+'</b>'
      +' <span class="s">'+esc(x.nature)+'</span>'
      +'<div class="mini">'+esc(x.summary.slice(0,62))+'…</div></div>');
    h+='<div class="hr"></div><div class="mini">共 '+D.fringe.texts.length+' 条文本传统，含《山海经》《竹书纪年》今本问题、'
      +'《战国策》拟作辞令、《三国演义》《西游记》、荷马史诗与特洛伊问题、《古文尚书》辨伪等。</div></div>';
    if(T.allow.hypothesis){
      h+='<div class="card fringecard"><div class="tagline" style="color:var(--red2)">未 证 实 假 说 · 狂 想 档 专 属</div>'
        +'<div class="mini" style="color:var(--red2)">'+esc(FG.NO_EVIDENCE)+'</div>';
      D.fringe.hypotheses.forEach(x=>h+='<div class="row"><b>'+esc(x.name)+'</b>'
        +' <span class="s">'+esc(x.standing)+'</span>'
        +'<div class="mini">'+esc(x.evidence)+'</div></div>');
      h+='<div class="mini" style="margin-top:8px">这些说法的「提出年代」与「文本来源」可考，'
        +'但主张本身无证据；游戏只把它们当虚构推演素材，不计入史实、不写入史实编年。</div></div>';
    }else{
      h+='<div class="card"><div class="tagline">未 证 实 假 说 · 当 前 关 闭</div>'
        +'<div class="mini">亚特兰蒂斯、姆大陆、史前超文明、古代宇航员、金字塔外星说等 '
        +D.fringe.hypotheses.length+' 条，'+esc(FG.NO_EVIDENCE)
        +' 想玩可在开局或设置里切到「狂想档」，届时每张卡都会红色醒目标注。</div></div>';
    }
    h+='<div class="card"><div class="tagline">误 读 记 录</div><div class="volgrid">'
      +'<div>把小说当史实<b>'+(S.misread?S.misread.text:0)+'</b></div>'
      +'<div>把假说当史实<b>'+(S.misread?S.misread.hypothesis:0)+'</b></div>'
      +'<div>其中严重误读<b>'+(S.misread?S.misread.severe:0)+'</b></div>'
      +'<div>已见气候事件<b>'+seenClim.length+'</b></div>'
      +'</div><div class="mini" style="margin-top:8px">误读只记一笔并扣文脉，不改写任何史实字段；'
      +'这是把「辨伪」做成玩法，而不是把假的混进真的。</div></div></div>';

    h+='<div class="panel '+(TAB==='vol'?'on':'')+'">'+hintFor('vol',S)+timelineHTML(S)
      +'<div class="card"><div class="tagline">历 卷 · 汇 流</div>';
    h+=S.volLog.length?S.volLog.slice().reverse().map(v=>'<div class="row"><span class="y">卷'+v.n+'</span><b>〈'+WV.volTitle(v.n)+'〉</b> '+E.fmtShort(v.from)+'—'+E.fmtShort(v.to)
      +'<div class="mini">'+esc(v.echo)+'</div></div>').join(''):'<div class="mini">尚无合拢之卷。每 '+E.volLen()+' 笔汇流一次。</div>';
    if(S.endLog.length)h+='<div class="hr"></div><div class="tagline">终 章</div>'+S.endLog.slice().reverse().map(x=>'<div class="row"><span class="y">'+E.fmtShort(x.y)+'</span>'+esc(x.t)+'</div>').join('');
    if(S.mode==='succession'&&S.chainState){
      const sum=W.succession.chainSummary(S);
      h+='<div class="hr"></div><div class="tagline">朝 代 长 河 · '+sum.length+' 朝</div>';
      sum.forEach((x,i)=>{
        h+='<div class="row"><span class="y">'+(i+1)+'</span><b>'+esc(x.name)+'</b> '
          +(x.current?'<span style="color:var(--gold)">〔当前〕</span>':x.visited?'<span class="s">已历</span>':'<span class="s">未至</span>')
          +'<div class="mini">'+E.fmtShort(x.from)+' — '+E.fmtShort(x.to)+' · '+esc(x.transition)+'</div></div>';
      });
    }
    /* 平行时间轴：同年横看并立政权，不硬串成单线 */
    h+='<div class="card"><div class="tagline">平 行 时 间 轴 · 政 权 条 带</div>'
      +'<div class="mini">同一年里多个政权并立，是常态。条带按考据年表起止绘制；'
      +'重叠即并列，不表示前后相续。本视图为纪年条带，非疆域地图（数据未含经纬度）。</div>';
    const ents=D.entities.entities.slice().sort((a,b)=>a.startYear-b.startYear);
    const xmin=Math.min(...ents.map(x=>x.startYear)),xmax=Math.max(...ents.map(x=>x.endYear));
    const pct=y=>Math.max(0,Math.min(100,Math.round((y-xmin)/(xmax-xmin)*100)));
    ents.forEach(x=>{
      const L=pct(x.startYear),Wd=Math.max(1,pct(x.endYear)-L);
      h+='<div style="margin-top:8px"><div class="mini">'+esc(x.name)+' <span style="color:var(--dim)">'
        +E.fmtShort(x.startYear)+'—'+E.fmtShort(x.endYear)+'</span></div>'
        +'<div style="position:relative;height:9px;background:#3a3022;border-radius:5px;margin-top:4px">'
        +'<i style="position:absolute;left:'+L+'%;width:'+Wd+'%;height:9px;background:linear-gradient(90deg,var(--red),var(--gold));border-radius:5px"></i>'
        +'</div></div>';
    });
    h+='<div class="mini" style="margin-top:10px">时间范围 '+E.fmtShort(xmin)+' — '+E.fmtShort(xmax)
      +'。左端 '+E.fmtShort(xmin)+'，右端 '+E.fmtShort(xmax)+'。</div></div>';
    /* 近现代锚点：不伪造六阶段考据年表，只列已考据的可考节点 */
    const modern=D.history.events.filter(x=>x.y0>=1600).sort((a,b)=>a.y0-b.y0);
    h+='<div class="card"><div class="tagline">近 现 代 可 考 锚 点 · 到 '+2026+'</div>'
      +'<div class="mini">朝代长河的六阶段考据年表止于 1644 年。以下为 data/history.json 中已考据的近现代节点，'
      +'<b>未</b>据此虚构清／民国／当代的「建立→鼎盛→终结」六阶段实体。</div>';
    modern.forEach(x=>h+='<div class="row"><span class="y">'+E.fmtShort(x.y0)+'</span><b>'+esc(x.title)+'</b>'
      +'<div class="mini">'+esc(x.summary.slice(0,64))+'…</div>'
      +'<div class="mini" style="color:#8f8067">'+esc(x.cite||x.source)+'</div></div>');
    h+='<div class="hr"></div><div class="mini">2026 年之后的事件不作自动外推。</div></div>';
    h+='<button class="big alt" data-act="scroll">生 成 收 卷 报 告</button>'
      +'<button class="big alt" data-act="exportpng">导 出 收 卷 长 图</button></div></div>';

    h+='<div class="panel '+(TAB==='set'?'on':'')+'">'+hintFor('set',S)+'<div class="card"><div class="tagline">视 角</div><div class="viewsel">';
    Object.keys(D.views).forEach(k=>h+='<button data-view="'+k+'" class="'+(S.view===k?'on':'')+'">'+D.views[k].n+'</button>');
    h+='</div><div class="mini">随时可换，只改叙事口吻与「顺势」一途，不打断编年。</div></div>';
    h+='<div class="card"><div class="tagline">本 局 种 子</div><div class="mini">'
      +'<span style="color:var(--gold)">'+esc(S.seed)+'</span><br>确定性随机：同一种子 + 同一串选择 + 同一档位配置，必得同一局。</div></div>';
    const DT=W.difficulty.tier(S.difficulty);
    h+='<div class="card"><div class="tagline">难 度 与 新 手 教 程</div>'
      +'<div class="row"><b>'+esc(DT.name)+'</b> <span class="s">本局锁定</span>'
      +'<div class="mini">'+esc(DT.desc)+'</div>'
      +'<div class="mini" style="color:var(--dim)">难度写进存档与分享串，保证复盘一致；'
      +'要换难度请「另起一局」。难度只改推演数值与指引，不改史实。</div></div>'
      +'<div class="viewsel" style="flex-wrap:wrap;margin-top:8px">'
      +'<button data-tut="reopen">重 看 新 手 教 程</button>'
      +'<button data-tut="on">开 启 指 引</button>'
      +'<button data-tut="off">收 起 指 引</button></div>'
      +'<div class="mini" style="margin-top:6px">教程共 '+W.tutorial.STEPS.length+' 步；'
      +'「收起」只关教程卡，不改难度、不改八维、不动史实。'
      +'当前：'+(S.tutorial&&S.tutorial.on?'教程进行中':'教程已收起')+'。</div></div>';

    /* 局中切换：只影响后续事件池，不改写已发生的史实 */
    const RT2=W.reality;
    h+='<div class="card"><div class="tagline">局 中 调 档</div>'
      +'<div class="mini">切换只影响「此后还会遇见什么」，已发生的史实、编年与抉择一笔不改。'
      +'分享串会带上档位配置，复盘仍可对上。</div>'
      +'<div class="hr"></div><div class="tagline">真 实 性</div><div class="viewsel" style="flex-wrap:wrap">';
    RT2.TIERS.forEach(t=>h+='<button data-live-tier="'+t.key+'" class="'+(S.reality===t.key?'on':'')+'">'+t.short+'</button>');
    h+='</div><div class="mini" style="margin-top:5px">'+esc(RT2.tier(S.reality).desc)+'</div>'
      +'<div class="hr"></div><div class="tagline">玩 法</div><div class="viewsel" style="flex-wrap:wrap">';
    RT2.MODES.forEach(m=>h+='<button data-live-mode="'+m.key+'" class="'+(S.modeKey===m.key?'on':'')+'">'+m.name+'</button>');
    h+='</div><div class="mini" style="margin-top:5px">'+esc(RT2.mode(S.modeKey).desc)+'</div>'
      +'<div class="hr"></div><div class="tagline">时 长</div><div class="viewsel" style="flex-wrap:wrap">';
    RT2.LENGTHS.forEach(l=>h+='<button data-live-len="'+l.key+'" class="'+(S.lengthKey===l.key?'on':'')+'">'+l.name+'</button>');
    h+='</div><div class="mini" style="margin-top:5px">'+esc(RT2.length(S.lengthKey).desc)+'</div>'
      +'<div class="hr"></div><div class="tagline">史 料 密 度</div><div class="viewsel" style="flex-wrap:wrap">';
    RT2.DENSITIES.forEach(d=>h+='<button data-live-dens="'+d.key+'" class="'+(S.density===d.key?'on':'')+'">'+d.name+'</button>');
    h+='</div></div>';
    h+='<div class="card"><div class="tagline">存 档 槽 · '+E.SLOT_MAX+' 个</div>';
    const sl=E.slots();
    sl.forEach((v,n)=>{
      h+='<div class="row">'+(v?'<span class="y">槽'+(n+1)+'</span><b>'+esc(v.name)+'</b>'
        +' <span class="s">'+E.fmtShort(v.year)+' · '+v.turn+' 笔 · '+v.mode+'</span>'
        +(n===S.slot?' <span style="color:var(--gold)">〔当前〕</span>':'')
        +'<div style="margin-top:6px"><button class="pill" data-slot="'+n+'">载入</button> '
        +'<button class="pill" data-del="'+n+'">清空</button></div>'
        :'<span class="y">槽'+(n+1)+'</span><span class="s">空</span>'
        +'<div style="margin-top:6px"><button class="pill" data-save="'+n+'">存入本局</button></div>')+'</div>';
    });
    h+='<div class="hr"></div><div class="mini">自动存档写入当前槽；导出／导入可整体搬走全部槽位。</div>'
      +'<button class="big alt" data-act="exportall">导 出 全 部 存 档</button>'
      +'<button class="big alt" data-act="importall">导 入 存 档</button></div>';

    h+='<div class="card"><div class="tagline">分 享 与 对 照 局</div><div class="mini">'
      +'分享串 = 种子 + 每笔选择序号。同种子、不同选择可并排看分岔在哪。</div>'
      +'<div class="note" style="word-break:break-all;font-size:11px">'+esc(E.shareString())+'</div>'
      +'<button class="big alt" data-act="copyshare">复 制 分 享 串</button>'
      +'<button class="big alt" data-act="replay">载 入 对 照 局</button>';
    const g=E.getGhost();
    if(g){
      h+='<div class="hr"></div><div class="tagline">对 照 局 · 差 异</div><div class="volgrid">'
        +'<div>年份<b>'+E.fmtShort(S.year)+' / '+E.fmtShort(g.year)+'</b></div>'
        +'<div>笔数<b>'+S.turn+' / '+g.turn+'</b></div>'
        +'<div>传承度<b>'+Math.round(S.score)+' / '+Math.round(g.score)+'</b></div>'
        +'<div>文明条目<b>'+Object.keys(S.seenCiv||{}).length+' / '+Object.keys(g.seenCiv||{}).length+'</b></div>'
        +'</div><div class="mini">左为本局，右为对照局。旧例差异：'
        +Object.keys(S.tags||{}).filter(t=>!g.tags||!g.tags[t]).slice(0,6).map(t=>esc(t)).join('、')
        +' ｜ 对照独有：'+Object.keys(g.tags||{}).filter(t=>!S.tags||!S.tags[t]).slice(0,6).map(t=>esc(t)).join('、')
        +'</div><button class="big alt" data-act="clearghost">清 除 对 照</button>';
    }
    h+='</div>';

    h+='<div class="card"><div class="tagline">显 示</div><div class="viewsel">'
      +'<button data-fs="0" class="'+(FS===0?'on':'')+'">标准</button>'
      +'<button data-fs="1" class="'+(FS===1?'on':'')+'">大字</button>'
      +'<button data-fs="2" class="'+(FS===2?'on':'')+'">超大</button></div>'
      +'<div class="viewsel" style="margin-top:8px">'
      +'<button data-hc="0" class="'+(HC===0?'on':'')+'">常规对比度</button>'
      +'<button data-hc="1" class="'+(HC===1?'on':'')+'">高对比度</button></div>'
      +'<div class="mini">手机竖屏优化；设置仅存于本次会话。</div></div>';

    h+='<div class="card"><div class="tagline">这 一 局</div><div class="mini">'
      +(S.mode==='sim'?'起点：公元前 5000 年的 '+R.n+'。'
        :S.mode==='real'?'起点：'+E.fmtYear(S.entity?W.real.entityById(S.entity.id).startYear:-5000)+' '+D.regions[S.reg].n+'，代入一个真实实体。'
        :'起点：'+E.fmtYear(D.succession.chains[S.chainState.region].from)+'，朝代长河连走 '
          +D.succession.chains[S.chainState.region].entities.length+' 朝。')+'<br>'
      +'每 '+E.volLen()+' 笔为一卷，卷末汇流并可收卷；'
      +(S.mode==='succession'?'每朝一卷，卷末出更迭卡，链尾为长河终章。'
        :'达成血脉／编年／立例／文脉／散族任一条件即出终章。')+'<br>'
      +'文明条目 '+D.civilization.items.length+' 条 / '+D.civilization.dimensions.length+' 维，'
      +'出处 '+Object.keys(D.civSources).length+' 条，考据史事 '+D.history.events.length+' 条。<br>'
      +'史实、约略年代、断代争议、传说追述分层标注；推演抉择不改写史实。'
      +'</div><button class="big alt" data-act="restart">另 起 一 局</button></div></div>';

    app.innerHTML=h;
    const tabs=$('tabs');
    const TS=[['main','推演'],['log','编年'],['fam','族谱'],['sea','史海'],['civ','文明'],['geo','舆地'],['vol','卷轴'],['set','设置']];
    tabs.innerHTML=TS.map(t=>'<button data-t="'+t[0]+'" class="'+(TAB===t[0]?'on':'')+'">'+t[1]+'</button>').join('');
    tabs.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{
      TAB=b.dataset.t;
      if(W.tutorial){W.tutorial.noteTab(E.state(),TAB);E.save();}
      render();window.scrollTo(0,0);
    }));
    app.querySelectorAll('[data-i]').forEach(b=>b.addEventListener('click',()=>{E.choose(+b.dataset.i);render();}));
    /* 第五轮：姓氏 1295 条 + 题库 264 道，大列表放 template 里按需载入，
       避免每次 render 都把上千行插进可见 DOM。检索时先全量载入再筛。
       优化轮：记住展开过的组，切页签／重渲染后自动恢复，不再「点开又合上」。 */
    const fillLazy=d=>{
      const body=d.querySelector('.lazy-body'),tpl=d.querySelector('template[data-lz-tpl]');
      if(body&&tpl&&!body.dataset.filled){body.innerHTML=tpl.innerHTML;body.dataset.filled='1';}
    };
    const lazyEls=Array.prototype.slice.call(app.querySelectorAll('details[data-lz]'));
    lazyEls.forEach(d=>{
      const k=d.dataset.lz;
      if(LAZYOPEN.has(k)){d.open=true;fillLazy(d);}
      d.addEventListener('toggle',function(){
        if(d.open){LAZYOPEN.add(k);fillLazy(d);}else LAZYOPEN.delete(k);
      });
    });
    /* 亲属关系图：点节点看称谓、高亮相关边；＋／－／复位改 viewBox 缩放 */
    const kinSvg=document.getElementById('kinGraph');
    if(kinSvg&&W.kinship){
      const GH0=+(kinSvg.dataset.gh||200);
      const applyZoom=()=>{
        const H=GH0;
        kinSvg.setAttribute('viewBox',
          (180-180/KINZ)+' '+(H/2-H/2/KINZ)+' '+(360/KINZ)+' '+(H/KINZ));
      };
      app.querySelectorAll('[data-kinzoom]').forEach(b=>b.addEventListener('click',()=>{
        const z=b.dataset.kinzoom;
        KINZ=z==='0'?1:Math.max(.6,Math.min(2.6,KINZ+(z==='+'?.25:-.25)));
        applyZoom();
      }));
      kinSvg.querySelectorAll('.kgn').forEach(g=>g.addEventListener('click',()=>{
        const id=g.dataset.id,St=E.state();
        kinSvg.querySelectorAll('.kgn').forEach(x=>x.classList.toggle('dim',x.dataset.id!==id));
        kinSvg.querySelectorAll('.kge').forEach(l=>l.classList.toggle('on',
          l.dataset.a===id||l.dataset.b===id));
        const p=(St.fam||[]).find(x=>x.id===id);
        const box=document.getElementById('kinPick');
        if(!p||!box)return;
        const rel=W.kinship.relationsOf(St,p).filter(r=>r.who&&r.who!==p.id);
        box.innerHTML='<b>'+esc(p.name)+'</b>（第 '+p.gen+' 代 · '
          +(p.gender==='female'?'女':p.gender==='male'?'男':'未记')+'）　'
          +rel.length+' 条称谓<br>'+(rel.length?rel.map(r=>esc(r.term)+'·'+esc(r.whoName)).join('　')
            :'尚无可从在册关系链推出的称谓。');
      }));
    }
    const fillAll=()=>lazyEls.forEach(d=>{d.open=true;fillLazy(d);});
    const ppIn=document.getElementById('ppSearch');
    if(ppIn)ppIn.addEventListener('input',()=>{
      const q=ppIn.value.trim();
      if(q)fillAll();
      /* 清空检索：收起全部组；已载入内容留在 body 里，下次点开不用重拼 */
      else lazyEls.forEach(d=>{d.open=false;LAZYOPEN.delete(d.dataset.lz);});
      /* 优化轮：1295 条姓氏全量匹配时一次显示上千行，手机既卡又没法看。
         只露前 60 条，写明总数；条目一条没删，清空检索仍可逐组翻。 */
      const MAXSHOW=60;let shown=0,total=0;
      document.querySelectorAll('#ppList .pp-row').forEach(r=>{
        const hit=!q||r.textContent.indexOf(q)>=0;
        if(hit)total++;
        const show=hit&&(!q||shown<MAXSHOW);
        if(show)shown++;
        r.style.display=show?'':'none';
      });
      document.querySelectorAll('#ppList .pp-group').forEach(g=>{
        if(q)g.open=true;
        const vis=Array.prototype.some.call(g.querySelectorAll('.pp-row'),
          r=>r.style.display!=='none');
        g.style.display=vis?'':'none';
      });
      const cnt=document.getElementById('ppCount');
      if(cnt)cnt.textContent=q?('匹配 '+total+' 条 · 显示前 '+shown+' 条'
        +(total>shown?'（换个关键词可继续筛；全部条目仍在各组中）':'')):'';
    });
    /* 教程卡与「？ 指引」按钮 */
    app.querySelectorAll('[data-tut]').forEach(b=>b.addEventListener('click',()=>{
      const S2=E.state(),T=W.tutorial,a=b.dataset.tut;
      if(a==='next'){
        const st=T.step(S2);
        if(st&&(st.gate==='ack'||T.progress(S2).idx===T.STEPS.length))T.ack(S2);
        T.next(S2);
      }else if(a==='prev')T.prev(S2);
      else if(a==='skip')T.skip(S2);
      else if(a==='reopen'){T.reopen(S2);TAB='main';}
      else if(a==='on')T.reopen(S2);
      else if(a==='off')T.setOn(S2,false);
      E.save();render();
    }));
    app.querySelectorAll('[data-help]').forEach(b=>b.addEventListener('click',()=>{
      W.tutorial.reopen(E.state());E.save();TAB='main';render();window.scrollTo(0,0);
    }));
    app.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>{E.setView(b.dataset.view);render();}));
    app.querySelectorAll('[data-dim]').forEach(b=>b.addEventListener('click',()=>{CIVF=b.dataset.dim;CIVEXP=false;render();}));
    app.querySelectorAll('[data-exp]').forEach(b=>b.addEventListener('click',()=>{CIVEXP=!CIVEXP;render();}));
    app.querySelectorAll('[data-slot]').forEach(b=>b.addEventListener('click',()=>{if(E.useSlot(+b.dataset.slot)){TAB='main';render();}}));
    app.querySelectorAll('[data-save]').forEach(b=>b.addEventListener('click',()=>{E.saveSlot(+b.dataset.save);render();}));
    app.querySelectorAll('[data-del]').forEach(b=>b.addEventListener('click',()=>{E.delSlot(+b.dataset.del);render();}));
    app.querySelectorAll('[data-live-tier]').forEach(b=>b.addEventListener('click',()=>{E.configure({reality:b.dataset.liveTier});render();}));
    app.querySelectorAll('[data-live-mode]').forEach(b=>b.addEventListener('click',()=>{E.configure({modeKey:b.dataset.liveMode});render();}));
    app.querySelectorAll('[data-live-len]').forEach(b=>b.addEventListener('click',()=>{E.configure({lengthKey:b.dataset.liveLen});render();}));
    app.querySelectorAll('[data-live-dens]').forEach(b=>b.addEventListener('click',()=>{E.configure({density:+b.dataset.liveDens});render();}));
    app.querySelectorAll('[data-fs]').forEach(b=>b.addEventListener('click',()=>{FS=+b.dataset.fs;applyDisplay();render();}));
    app.querySelectorAll('[data-hc]').forEach(b=>b.addEventListener('click',()=>{HC=+b.dataset.hc;applyDisplay();render();}));
    /* 五层可缩放历史舆图：每次渲染重建 canvas，重新挂载 */
    const AT=W.atlas,acv=document.getElementById('atlasCanvas');
    if(acv&&AT){
      AT.mount(acv,{year:S.year,layers:ATL,
        family:{dist:E.famDistribution(S),migrations:E.famMigrations()},
        onPick:function(p){
          const box=document.getElementById('atlasPick');if(!box)return;
          const kind={city:'城址锚点（现代经纬度近似）',unit:'地理单元（近似中心点）',
            family:'本局家族据点（推演）',climate:'气候影响区示意（非实测边界）'}[p?p.type:'']||'点位';
          let html=p?'<b>'+esc(p.name)+'</b>　'+esc(p.detail)
            +'<div class="mini">'+p.lat.toFixed(2)+'°, '+p.lon.toFixed(2)+'° · '+kind+'</div>'
            :'点一下地图上的点位，可查看该地说明。';
          /* 点中地理单元且地方志层开启 → 展开该单元的全部本地史锚点 */
          if(p&&p.type==='unit'&&p.localOn&&p.id){
            const ls=D.localities.items.filter(function(x){return x.geoId===p.id;});
            if(ls.length){
              html+='<div class="hr"></div><div class="tagline">本 地 方 志 · '+ls.length+' 条</div>';
              html+=ls.map(function(x){
                return '<div class="row"><span class="y">'+esc(x.rawYear)+'</span><b>'+esc(x.title)+'</b>'
                  +'<span class="s">'+esc(x.category)+'</span>'
                  +'<div class="mini">'+esc(x.summary)+'</div>'
                  +'<div class="mini" style="color:var(--gold)">'+esc(x.boundary)+'</div>'
                  +(x.consensus==='date_contested'?'<div class="mini">断代有争议</div>':'')+'</div>';
              }).join('');
              html+='<div class="mini" style="color:var(--dim)">'+esc(D.localities.meta.boundary)+'</div>';
            }
          }
          box.innerHTML=html;
        },
        onList:function(o){
          const box=document.getElementById('atlasList');if(!box)return;
          let t='';
          /* 1 政权 */
          if(o.layers.polity){
            t+='<div class="tagline">政 权 · '+E.fmtYear(o.year)+' · '+o.polities.length+' 个并立</div>';
            t+='<div class="mini">并立政权同时显示，不排成前后相续单线；虚线仅示核心区，不是国界。</div>';
            t+=o.polities.length?o.polities.map(function(p){
              return '<div class="row"><b>'+esc(p.name)+'</b> <span class="s">'
                +E.fmtShort(p.from)+' — '+E.fmtShort(p.to)+'</span>'
                +'<div class="mini">'+esc(p.note)+'</div></div>';
            }).join(''):'<div class="mini">该年份本图未收录示意政权。</div>';
          }
          /* 2 气候 */
          if(o.layers.climate){
            t+='<div class="hr"></div><div class="tagline">气 候 · 同期 '+o.climate.length+' 条'
              +'（全球性 '+o.climateGlobal+' 条）</div>';
            t+='<div class="mini">'+esc(D.layers.meta.climateNote)+'</div>';
            t+=o.climate.length?o.climate.slice(0,6).map(function(c){
              return '<div class="row"><span class="y">'+esc(c.rawYear)+'</span><b>'+esc(c.title)+'</b>'
                +'<span class="s">'+esc(c.category)+'</span>'
                +'<div class="mini">'+esc(c.summary.slice(0,58))+'…</div>'
                +'<div class="mini" style="color:var(--red2)">'+esc(c.caveat)+'</div></div>';
            }).join(''):'<div class="mini">该年份无标注气候事件。</div>';
            if(o.climate.length>6)t+='<div class="mini">…另有 '+(o.climate.length-6)+' 条，见下方气候编年。</div>';
          }
          /* 3 人口热力 */
          if(o.layers.pop){
            t+='<div class="hr"></div><div class="tagline">人 口 重 心 · '+esc(o.popEra)+'</div>';
            t+='<div class="mini">'+esc(D.layers.meta.populationNote)+'</div>';
            t+='<div class="mini" style="margin-top:4px">相对权重较高的地理单元：'
              +o.popTop.map(function(p){return esc(p.name)+' '+Math.round(p.w*100)+'%';}).join('　')
              +'（百分比只是示意权重，不是人口占比）</div>';
          }
          /* 4 家族分布 */
          if(o.layers.family){
            t+='<div class="hr"></div><div class="tagline">本 局 家 族 分 布 · '+o.family.length+' 处</div>';
            t+='<div class="mini">'+esc(D.layers.meta.familyNote)+'</div>';
            t+=o.family.length?o.family.map(function(d){
              return '<div class="row"><b>'+esc(d.name)+'</b> <span class="s">'+d.count+' 人'
                +(d.ruler?' · 当家在此':'')+'</span></div>';
            }).join(''):'<div class="mini">族中暂无在籍落脚点。</div>';
            if(o.migrations.length)t+='<div class="mini" style="margin-top:6px;color:var(--gold)">迁徙足迹：'
              +o.migrations.slice(-4).map(function(m){
                return E.fmtShort(m.y)+' '+esc(m.fromName)+' → '+esc(m.toName)+'（'+m.count+' 人）';
              }).join('　')+'</div>';
          }
          /* 5 地方志：本圈 + 全球性，按当前年份窗口筛选，不作边界主张 */
          if(o.layers.local){
            const LS=D.localities.items.filter(function(x){
              return (x.region===S.reg||x.region==='*')&&o.year>=x.y0-120&&o.year<=x.y1+120;
            }).sort(function(a,b){return a.y0-b.y0;});
            t+='<div class="hr"></div><div class="tagline">地 方 志 · '+E.fmtYear(o.year)
              +' 前后可见 '+LS.length+' 条（全册 '+D.localities.items.length+' 条 / '+new Set(D.localities.items.map(function(v){return v.geoId;})).size+' 地 · 每地 6 类）</div>';
            t+='<div class="mini">'+esc(D.localities.meta.boundary)+'</div>';
            t+=LS.length?LS.slice(0,10).map(function(x){
              const u=D.atlas.units.find(function(v){return v.id===x.geoId;});
              return '<div class="row"><span class="y">'+esc(x.rawYear)+'</span><b>'+esc(x.title)+'</b>'
                +'<span class="s">'+esc(u?u.name:x.geoId)+' · '+esc(x.category)+'</span>'
                +'<div class="mini">'+esc(x.summary.slice(0,54))+'…</div></div>';
            }).join(''):'<div class="mini">该年份窗口内暂无已收录的本圈地方史锚点，拖动年份滑杆再试。</div>';
            if(LS.length>10)t+='<div class="mini">…另有 '+(LS.length-10)+' 条，点地图上的单元圆点可看该地全部六类。</div>';
            t+='<div class="mini" style="margin-top:4px;color:var(--dim)">'
              +esc(D.localities.meta.density)+'</div>';
          }
          if(o.routes.length)t+='<div class="mini" style="margin-top:6px;color:var(--gold)">同期航线：'
            +o.routes.map(function(r){return esc(r.name);}).join('、')+'（简化示意，非精确航迹）</div>';
          box.innerHTML=t;
        }});
      const yr=document.getElementById('atlasYear');
      if(yr)yr.addEventListener('input',function(){
        const v=+yr.value;AT.setYear(v,false);
        const lb=document.getElementById('atlasYearLabel');if(lb)lb.textContent=E.fmtYear(v);
      });
    }
    app.querySelectorAll('[data-layer]').forEach(b=>b.addEventListener('click',function(){
      if(!AT)return;
      const k=b.dataset.layer;
      ATL[k]=!ATL[k];
      AT.setLayers(ATL);
      const names={polity:'政权',climate:'气候',pop:'人口热力',family:'家族',local:'地方志'};
      b.className=ATL[k]?'on':'';
      b.textContent=(ATL[k]?'✓ ':'＋ ')+names[k];
    }));
    app.querySelectorAll('[data-atlas]').forEach(b=>b.addEventListener('click',function(){
      if(!AT)return;
      const a=b.dataset.atlas;
      if(a==='in')AT.zoom(1.35);
      else if(a==='out')AT.zoom(1/1.35);
      else if(a==='reset')AT.reset();
      else if(a==='follow'){
        AT.followGame();
        const y2=document.getElementById('atlasYear'),lb=document.getElementById('atlasYearLabel');
        if(y2)y2.value=Math.max(-3100,Math.min(2026,AT.getYear()));
        if(lb)lb.textContent=E.fmtYear(AT.getYear());
      }
    }));
    app.querySelectorAll('[data-act]').forEach(b=>b.addEventListener('click',()=>{
      const a=b.dataset.act;
      if(a==='next')E.step();
      else if(a==='contvol')E.continueVolume();
      else if(a==='epilogue')E.epilogue();
      else if(a==='realend-cont')E.realEndContinue();
      else if(a==='nextdyn')E.nextDynasty();
      else if(a==='scroll'){E.openScroll(false);TAB='main';}
      else if(a==='scroll-final'){E.openScroll(true);TAB='main';}
      else if(a==='backscroll')E.backFromScroll();
      else if(a==='restart'){E.restart();TAB='main';}
      else if(a==='exportall')download('wqn-saves.json',E.exportAll(),'application/json');
      else if(a==='importall')pickFile(txt=>{if(E.importAll(txt)){TAB='main';render();}else alert('存档格式不对，或不是本游戏导出的文件。');});
      else if(a==='copyshare')copyText(E.shareString());
      else if(a==='replay'){
        const s=window.prompt('粘贴分享串（WQN1. 开头），生成同种子对照局：','');
        if(s){const g=E.replay(s.trim());if(!g)alert('分享串无法解析。');render();}
      }
      else if(a==='clearghost'){E.clearGhost();render();}
      else if(a==='exportpng')exportScrollPNG(E.state());
      render();
    }));
    applyDisplay();
  }
  function applyDisplay(){
    if(typeof document==='undefined')return;
    const r=document.documentElement;
    r.style.setProperty('--fs',FS===0?'1':FS===1?'1.12':'1.25');
    r.classList.toggle('hc',HC===1);
  }
  function download(name,text,mime){
    try{
      const blob=new Blob([text],{type:mime||'text/plain;charset=utf-8'});
      const a=document.createElement('a');a.href=URL.createObjectURL(blob);
      a.download=name;document.body.appendChild(a);a.click();
      setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},600);
    }catch(e){alert('浏览器不支持下载，可改用「复制分享串」。');}
  }
  function pickFile(cb){
    const i=document.createElement('input');i.type='file';i.accept='.json,application/json';
    i.onchange=()=>{const f=i.files&&i.files[0];if(!f)return;
      const r=new FileReader();r.onload=()=>cb(String(r.result));r.readAsText(f,'utf-8');};
    i.click();
  }
  function copyText(t){
    try{
      if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(t);}
      else{const ta=document.createElement('textarea');ta.value=t;document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();}
      alert('分享串已复制。');
    }catch(e){window.prompt('手动复制分享串：',t);}
  }
  /* 收卷长图：canvas 逐行排版，离线生成 PNG */
  function exportScrollPNG(S){
    const d=WV.scrollData(S,true);
    const lines=[];
    const push=(t,sz)=>lines.push({t:String(t||''),sz:sz||14});
    push('上下五千年 · 无尽编年　收卷',22);
    push(E.fmtYear(-5000)+' — '+E.fmtYear(d.to)+'　共 '+d.turn+' 笔 / '+d.vol+' 卷',15);
    push('传承度 '+d.score+'　第 '+d.gen+' 代　'+d.verdict,13);
    push('档位 '+W.reality.banner(S)+'　史料密度 '+W.reality.density(S.density).name,12);
    push('',10);
    push('【舆地】已历气候 '+Object.keys(S.climateSeen||{}).length+' / '+D.geoclimate.events.length,16);
    push(W.geoclimate.CAVEAT.slice(0,46),11);
    push('地理单元 '+D.geoclimate.units.length+' 个，经纬度为近似中心点，非疆域图',11);
    push('',10);
    if(d.chain){push('【朝代长河】'+d.chain.title,16);
      d.chain.entities.forEach((x,i)=>push((i+1)+'. '+x.name+'　'+E.fmtShort(x.from)+'—'+E.fmtShort(x.to),13));}
    if(d.entity){push('【真实血脉】'+d.entity.name,16);
      d.entity.phases.forEach(p=>push(p.phase+'　'+p.label+'　'+p.event,12));}
    push('',10);
    push('【八维终值】',16);
    push(D.keyOrder.map(k=>D.keys[k]+' '+d.st[k]).join('　'),13);
    push('',10);
    push('【文明册】'+d.civ.seen.length+' / '+d.civ.total,16);
    d.civ.byDim.forEach(x=>push(x.name+'　'+x.got+' / '+x.total,13));
    push('',10);
    push('【所见史事】'+d.hist.length,16);
    d.hist.slice(0,18).forEach(x=>push(E.fmtShort(x.y0)+'　'+x.title,12));
    push('',10);
    push('【族谱】在籍 '+d.alive.length+'　凋零 '+d.dead,16);
    d.alive.slice(0,10).forEach(p=>push(p.gen+'代　'+p.name+'　'+p.trait,12));
    push('',10);
    push('史实为通识级考据整理，推演抉择不改写史实。',11);
    try{
      const CW=760,pad=28,lh=26,H=pad*2+lines.reduce((a,l)=>a+(l.sz>=20?38:l.sz>=16?30:lh),0);
      const cv=document.createElement('canvas');cv.width=CW;cv.height=Math.max(H,400);
      const c=cv.getContext('2d');
      c.fillStyle='#14110e';c.fillRect(0,0,CW,cv.height);
      c.strokeStyle='#4a3c2a';c.strokeRect(10,10,CW-20,cv.height-20);
      let y=pad+18;
      lines.forEach(l=>{
        c.fillStyle=l.sz>=20?'#c9a227':l.sz>=16?'#e8dcc2':'#ddd0b4';
        c.font=l.sz+'px "WenQuanYi Micro Hei",sans-serif';
        c.fillText(l.t.slice(0,52),pad,y);
        y+=l.sz>=20?38:l.sz>=16?30:lh;
      });
      const a=document.createElement('a');a.href=cv.toDataURL('image/png');
      a.download='wqn-收卷.png';document.body.appendChild(a);a.click();
      setTimeout(()=>a.remove(),600);
    }catch(e){alert('当前浏览器无法生成长图，可改用「导出全部存档」保存文字数据。');}
  }
  function renderStart(app){
    const cached=E.load();
    let h='<div class="title"><h1>上下五千年</h1><p>分 卷 编 年 · 从 第 一 堆 篝 火 点 起</p></div>';
    h+='<div class="card"><p class="intro">你不是在读一段写好的历史。<br>你是某一支人、某一座城、某一个人，<br>从公元前 5000 年一直点下去。<br><span style="color:var(--gold)">每 '+E.volLen()+' 笔汇成一卷，卷卷可收；<br>也终有走到终章的那一日。</span></p>'
      +'<div class="mini center">国内外史事以「本土 / 远闻」同时抵达；'
      +D.civilization.dimensions.length+' 维 / '+D.civilization.items.length+' 条文明条目按六大知识类组织，'
      +'另有地方志 '+D.localities.items.length+' 条、姓氏 '+D.peoples.surnames.length
      +' 条、人群 '+D.peoples.peoples.length+' 条与深读卡 '+D.deepdives.items.length+' 则，'
      +'从书写、典籍、地图测绘、刑狱、户籍、情报、蒙学、日常器用、性别史、育幼、生业、地力、专榷、行旅、档案、论辩、典藏、赈济、传媒、知识产权到精神与心理，按年代登场；'
      +'越过今日之后，进入明确标注的虚构推演。</div></div>';
    if(cached){
      h+='<div class="card"><div class="tagline">旧 卷 尚 在</div><div class="mini">'+E.fmtYear(cached.year)+' · '+D.regions[cached.reg].n
        +' · 第 '+cached.turn+' 笔 · 卷 '+(cached.vol?cached.vol.n:1)+' · '+D.views[cached.view].n+'视角</div>'
        +'<button class="big" data-act="resume">续 接 旧 卷</button></div>';
    }
    /* 难度与新手教程：放在最前面，第一次玩不会迷路 */
    const DF=W.difficulty,TT=W.tutorial,curD=DF.tier(START.difficulty);
    h+='<div class="card"><div class="tagline">新 手 教 程 · 与 难 度</div>'
      +'<div class="mini">难度只改推演数值与指引多少（危机触发线属推演层，会间接影响某一笔遇到什么），'
      +'<b style="color:var(--gold)">不改任何史实</b>：史实条目、年代、出处、可信度、舆图、玩法档位与史料密度一律照旧。</div>'
      +'<div class="viewsel" style="margin-top:9px">';
    DF.DIFFS.forEach(d=>h+='<button data-diff="'+d.key+'" class="'+(START.difficulty===d.key?'on':'')+'">'+d.name+'</button>');
    h+='</div><div class="note" style="margin-top:8px"><b>'+esc(curD.name)+'：</b>'
      +esc(curD.desc)+'<div class="mini" style="margin-top:4px">'+esc(curD.note)+'</div></div>'
      +'<div class="tuton" style="margin-top:9px"><label><input type="checkbox" data-tuton="1" '
      +(START.tutorialOn?'checked':'')+'> 开启新手教程（'+TT.STEPS.length+' 步，跟着点一遍就会玩）</label>'
      +'<div class="mini">简单模式默认开启，且全程多一层逐卡指引与「新手建议」；普通／困难默认关闭，可随时打开。</div></div>'
      +'<details class="fold" style="margin-top:8px"><summary>先 看 一 眼 教 程 讲 什 么 · '+TT.STEPS.length+' 步</summary>'
      +TT.STEPS.map((x,i)=>'<div class="row"><span class="y">'+(i+1)+'</span><b>'+esc(x.title)+'</b>'
        +'<div class="mini">'+esc(x.body)+'</div></div>').join('')
      +'<div class="mini" style="color:var(--dim)">'+esc(TT.meta.note)+'</div></details></div>';
    h+='<div class="card"><div class="tagline">择 一 文 明 圈</div><div class="sel">';
    Object.keys(D.regions).forEach(k=>h+='<button data-reg="'+k+'" class="'+(START.reg===k?'on':'')+'">'+D.regions[k].n+'<div class="mini" style="color:var(--dim);margin-top:4px">'+D.regions[k].d+'</div></button>');
    h+='</div><div class="tagline">择 一 视 角</div><div class="viewsel">';
    Object.keys(D.views).forEach(k=>h+='<button data-v="'+k+'" class="'+(START.view===k?'on':'')+'">'+D.views[k].n+'</button>');
    h+='</div><button class="big" data-act="newgame">点 燃 第 一 堆 篝 火</button></div>';

    /* 真实性与玩法：把「还原」和「好玩」的选择权交给玩家 */
    const RT=W.reality;
    h+='<div class="card"><div class="tagline">真 实 性 档 位 · 由 你 定</div>'
      +'<div class="mini">史实永远不改；档位只决定哪些「非史实」内容允许入场。'
      +'趣味来自抉择后果、收集、判读与家族命运，不来自把传说伪装成历史。</div>';
    RT.TIERS.forEach(t=>{
      h+='<button data-tier="'+t.key+'" class="'+(START.reality===t.key?'on':'')+'" '
        +'style="display:block;width:100%;text-align:left;margin-top:8px;padding:10px;border:1px solid '
        +(START.reality===t.key?'var(--gold)':'var(--line)')+';border-radius:10px;background:'
        +(START.reality===t.key?'#33291a':'#1d1811')+';color:var(--ink);font-family:inherit">'
        +'<b style="color:var(--gold)">'+t.name+'</b> <span class="mini">'+t.short+'</span>'
        +'<div class="mini" style="margin-top:5px">'+t.desc+'</div>'
        +'<div class="mini" style="color:var(--blue);margin-top:4px">'+t.note+'</div></button>';
    });
    h+='<div class="hr"></div><div class="tagline">玩 法 模 式</div><div class="viewsel" style="flex-wrap:wrap">';
    RT.MODES.forEach(m=>h+='<button data-mode="'+m.key+'" class="'+(START.modeKey===m.key?'on':'')+'">'+m.name+'</button>');
    h+='</div><div class="mini" style="margin-top:6px">'
      +esc(RT.mode(START.modeKey).desc)+'</div>';
    h+='<div class="hr"></div><div class="tagline">局 时 长</div><div class="viewsel" style="flex-wrap:wrap">';
    RT.LENGTHS.forEach(l=>h+='<button data-len="'+l.key+'" class="'+(START.lengthKey===l.key?'on':'')+'">'+l.name+'</button>');
    h+='</div><div class="mini" style="margin-top:6px">'+esc(RT.length(START.lengthKey).desc)+'</div>';
    h+='<div class="hr"></div><div class="tagline">史 料 密 度</div><div class="viewsel" style="flex-wrap:wrap">';
    RT.DENSITIES.forEach(d=>h+='<button data-dens="'+d.key+'" class="'+(START.density===d.key?'on':'')+'">'+d.name+'</button>');
    h+='</div><div class="mini" style="margin-top:6px">'+esc(RT.density(START.density).desc)
      +'　（只改史实出现频率，不改任何史实内容）</div></div>';
    const ent=D.entities.entities.find(x=>x.id===START.entity)||D.entities.entities[0];
    h+='<div class="card"><div class="tagline">或 · 代 入 真 实 血 脉</div>'
      +'<div class="mini">从考据年表的「建立」之年入局，沿建立 → 扩张 → 鼎盛 → 转折 → 衰落 → 终结六阶段走完一个真实王朝／家族／文明。'
      +'史实节点与出处原样呈现，抉择仍属推演；人物、工艺、文化、商业会以「文明」条目同时抵达。</div>'
      +'<div class="sel" style="margin-top:10px">';
    D.entities.entities.forEach(e=>{
      h+='<button data-ent="'+e.id+'" class="'+(ent.id===e.id?'on':'')+'">'+esc(e.name)
        +'<div class="mini" style="color:var(--dim);margin-top:4px">'+E.fmtShort(e.startYear)+' — '+E.fmtShort(e.endYear)+' · '+D.regions[e.region].n+'</div></button>';
    });
    h+='</div><button class="big" data-act="newreal">代 入 '+esc(ent.name)+' ▸</button></div>';
    const chRegions=W.succession.available();
    const co=W.succession.coexisting();
    const ch=D.succession.chains[START.chainRegion]||D.succession.chains[chRegions[0]]
      ||{region:'huaxia',title:'朝代更迭',entities:[],from:-5000,to:2026,totalTurns:0};
    h+='<div class="card"><div class="tagline">或 · 朝 代 长 河（连 续 更 迭）</div>'
      +'<div class="mini">一局连走多个真实王朝，前朝终结自动接下一朝；间朝单独标出。'
      +'真实人物按其活动年代随朝代登场，每朝一卷、卷末出更迭卡。</div>';
    if(chRegions.length){
      h+='<div class="viewsel" style="margin-top:10px">';
      chRegions.forEach(k=>h+='<button data-chain="'+k+'" class="'+(ch.region===k?'on':'')+'">'+D.regions[k].n+'</button>');
      h+='</div>';
      h+='<div class="mini" style="margin-top:8px">'+esc(ch.title)+'：';
      ch.entities.forEach((e,i)=>{
        if(i)h+=' <span style="color:var(--dim)">→</span> ';
        h+=esc(e.name);
      });
      h+='<br>'+E.fmtShort(ch.from)+' — '+E.fmtShort(ch.to)+'，共 '+ch.entities.length+' 朝、'+ch.totalTurns+' 笔。</div>';
      h+='<button class="big" data-act="newchain">走 一 遍 朝 代 长 河 ▸</button>';
    }
    h+='<div class="hr"></div><div class="mini">其他文明圈暂不排成线性王朝链：'
      +Object.keys(co).map(k=>D.regions[k].n+'（'+co[k].entities.length+' 个政权'+(co[k].entities.length>1?'纪年互相重叠':'')+'）').join('、')
      +'。政权并立时硬串成「前后相续」会失真，故只列并存，不伪造更迭。</div></div>';
    h+='<div class="mini center" style="margin-top:14px">单文件 · 无联网 · 自动存档于本机<br>'
      +D.civilization.dimensions.length+' 维 / '+D.civilization.items.length+' 条文明条目 · '
      +D.geoclimate.units.length+' 地理单元 / '+D.geoclimate.events.length+' 气候事件 · '
      +D.fringe.texts.length+' 文本传统 / '+D.fringe.hypotheses.length+' 未证实假说（默认关闭）</div>';
    app.innerHTML=h;$('tabs').innerHTML='';
    const rerender=()=>renderStart(app);
    app.querySelectorAll('[data-reg]').forEach(b=>b.addEventListener('click',()=>{START.reg=b.dataset.reg;rerender();}));
    app.querySelectorAll('[data-v]').forEach(b=>b.addEventListener('click',()=>{START.view=b.dataset.v;rerender();}));
    app.querySelectorAll('[data-ent]').forEach(b=>b.addEventListener('click',()=>{START.entity=b.dataset.ent;rerender();}));
    app.querySelectorAll('[data-chain]').forEach(b=>b.addEventListener('click',()=>{START.chainRegion=b.dataset.chain;rerender();}));
    app.querySelectorAll('[data-tier]').forEach(b=>b.addEventListener('click',()=>{START.reality=b.dataset.tier;rerender();}));
    app.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',()=>{START.modeKey=b.dataset.mode;rerender();}));
    app.querySelectorAll('[data-len]').forEach(b=>b.addEventListener('click',()=>{START.lengthKey=b.dataset.len;rerender();}));
    app.querySelectorAll('[data-dens]').forEach(b=>b.addEventListener('click',()=>{START.density=+b.dataset.dens;rerender();}));
    app.querySelectorAll('[data-diff]').forEach(b=>b.addEventListener('click',()=>{
      START.difficulty=b.dataset.diff;
      if(!START.tutManual)START.tutorialOn=W.difficulty.tier(START.difficulty).tutorialDefault;
      rerender();
    }));
    app.querySelectorAll('[data-tuton]').forEach(b=>b.addEventListener('change',()=>{
      START.tutorialOn=b.checked;START.tutManual=true;rerender();
    }));
    const startCfg=()=>E.configure({reality:START.reality,modeKey:START.modeKey,
      lengthKey:START.lengthKey,density:START.density,difficulty:START.difficulty});
    /* 开局教程开关：fresh 已按难度给默认值，这里按玩家勾选覆盖 */
    const applyTut=()=>{const S=E.state();if(!S||!W.tutorial)return;
      W.tutorial.setOn(S,!!START.tutorialOn);
      if(!START.tutorialOn){S.tutorial.done=true;S.tutorial.idx=W.tutorial.STEPS.length-1;}
    };
    app.querySelectorAll('[data-act]').forEach(b=>b.addEventListener('click',()=>{
      const a=b.dataset.act;
      if(a==='newgame'){startCfg();E.fresh(START.reg,START.view);applyTut();E.step();TAB='main';render();}
      else if(a==='newreal'){startCfg();E.freshEntity(START.entity,START.view);applyTut();E.step();TAB='main';render();}
      else if(a==='newchain'){startCfg();E.freshSuccession(START.chainRegion,START.view);applyTut();E.step();TAB='main';render();}
      else if(a==='resume'){
        const c=E.load();
        if(c){E.setState(c);TAB='main';render();}
      }
    }));
  }
  W.ui={render:render,renderStart:renderStart,setTab:t=>{TAB=t;},getTab:()=>TAB,
    setStart:(k,v)=>{START[k]=v;},getStart:()=>START};
  if(typeof module!=='undefined'&&module.exports)module.exports=W.ui;
})((typeof window!=='undefined'?window:globalThis).WQN=((typeof window!=='undefined'?window:globalThis).WQN||{}));
