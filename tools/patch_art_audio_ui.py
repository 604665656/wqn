# -*- coding: utf-8 -*-
"""v1.2：把程序化美术与离线合成音乐接进界面。"""
import os
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
p=os.path.join(ROOT,'src','ui.js');s=open(p,encoding='utf8').read()
def rep(old,new,tag,cnt=1):
    global s
    assert old in s,'未找到：'+tag;s=s.replace(old,new,cnt);print('  ok',tag)

# A 变量 + 助手
rep("""  let CIVEXP=false;""",
"""  let CIVEXP=false;
  let ARTON=1;   /* v1.2 美术开关（仅本次会话，不写存档） */""",'ARTON')

rep("""  const VER=()=>{const v=D.version||{};return 'v'+(v.version||'0')
    +' · build '+(v.build||1)+(v.date?' · '+v.date:'')};""",
"""  const VER=()=>{const v=D.version||{};return 'v'+(v.version||'0')
    +' · build '+(v.build||1)+(v.date?' · '+v.date:'')};
  /* v1.2 声与色：插画是程序化 SVG 几何装饰，声音是离线实时合成。
     两者都不调用主随机数、不写存档，不影响同种子复盘。 */
  const AU=()=>W.audio;
  const sndOn=()=>!!(AU()&&AU().status().on);
  function artOpts(S,label){
    return {year:S.year,reg:S.reg,era:E.eraIdx(S.year),
      vol:(S.vol&&S.vol.n)||1,hc:HC===1,label:label||'',w:360};
  }
  function sndBtn(){
    if(!W.art)return '';
    const on=sndOn(),nm=on?'声音已开 · 点此静音':'声音已关 · 点此开启';
    return '<button class="sndbtn'+(on?' on':'')+'" data-snd="toggle" title="'+nm+'">'
      +W.art.icon(on?'sound':'mute',15,'currentColor')
      +'<span>'+(on?'声开':'声关')+'</span></button>';
  }
  function artTopHTML(S,isStart){
    if(!W.art)return '<div class="artwrap artbare">'+sndBtn()+'</div>';
    if(!ARTON)return '<div class="artwrap artbare">'+sndBtn()+'</div>';
    let kind='choice';
    if(isStart)kind='opening';
    else if(S.phase==='volume')kind='volume';
    else if(S.phase==='ending'||S.phase==='scroll')kind='ending';
    else if(S.phase==='turnover'||S.phase==='realend')kind='turnover';
    else if(TAB==='fam')kind='family';
    else if(TAB==='geo')kind='atlas';
    else if(TAB==='civ'||TAB==='sea'||TAB==='vol'||TAB==='set')kind='civ';
    const special=isStart||['volume','ending','scroll','turnover','realend'].indexOf(S.phase)>=0
      ||['fam','geo','civ','sea','vol','set'].indexOf(TAB)>=0;
    const lab=isStart?'第一堆篝火':(S.phase==='volume'?'卷末 · 汇流':
      S.phase==='ending'||S.phase==='scroll'?'终章 · 收卷':
      S.phase==='turnover'||S.phase==='realend'?'更迭':'卷 '+(S.vol?S.vol.n:1));
    const svg=special?W.art.scene(kind,artOpts(S,lab)):W.art.banner(artOpts(S,lab));
    return '<div class="artwrap">'+svg+sndBtn()+'</div>';
  }
  function cue(name){if(AU())AU().cue(name);}""",'helpers')

# B render() 顶部插画
rep("""    let h='<div class="head"><div><div class="yr">'+E.fmtYear(S.year)+'</div>'""",
"""    let h=artTopHTML(S,false);
    h+='<div class="head"><div><div class="yr">'+E.fmtYear(S.year)+'</div>'""",'render top')

# C 设置页：声与色卡片，插在「显 示」卡片之后
rep("""      +'<div class="mini">手机竖屏优化；设置仅存于本次会话。</div></div>';

    h+='<div class="card"><div class="tagline">这 一 局</div><div class="mini">'""",
"""      +'<div class="mini">手机竖屏优化；设置仅存于本次会话。</div></div>';

    /* ===== v1.2 声 与 色 ===== */
    const AU2=AU(),st=AU2?AU2.status():{on:false,volume:0.45,scale:'auto',bed:'auto',score:'auto',available:false};
    h+='<div class="card"><div class="tagline">声 与 色 · '
      +W.art.icon('brush',14,'var(--gold)')+W.art.icon('note',14,'var(--gold)')+'</div>'
      +'<div class="mini">插画是离线 SVG 几何装饰，声音是浏览器实时合成；'
      +'都不加载外部图片或音频文件，不联网，也不写进存档与分享串。</div>'
      +'<div class="hr"></div><div class="tagline">音 乐</div>'
      +'<div class="viewsel"><button data-snd="on" class="'+(st.on?'on':'')+'">开启</button>'
      +'<button data-snd="off" class="'+(!st.on?'on':'')+'">静音</button>'
      +'<button data-snd="try">试听一段</button>'
      +'<button data-snd="auto">按本局配乐</button></div>'
      +'<div class="mini" style="margin-top:6px">当前：'+(st.on?'已开':'已关')
      +' · '+(st.available?'浏览器支持合成':'此浏览器无合成接口，自动静音')
      +' · '+esc(st.scaleName||'自动调式')+' / '+esc(st.scoreName||'自动曲目')
      +' / '+esc(st.bedName||'无底噪')+'</div>'
      +'<div class="viewsel" style="margin-top:8px"><span class="mini">音量</span>'
      +[['轻',0.25],['中',0.45],['响',0.7]].map(x=>'<button data-vol="'+x[1]
        +'" class="'+(Math.abs(st.volume-x[1])<0.01?'on':'')+'">'+x[0]+'</button>').join('')+'</div>'
      +'<div class="selgrid">'
      +'<label>调式<select data-snd-sel="scale">'
        +'<option value="auto"'+(st.scale==='auto'?' selected':'')+'>自动（随文明圈与时代）</option>'
        +AU2.scales.map(x=>'<option value="'+x.key+'"'+(st.scale===x.key?' selected':'')
          +'>'+esc(x.name)+'</option>').join('')+'</select></label>'
      +'<label>曲目<select data-snd-sel="score">'
        +'<option value="auto"'+(st.score==='auto'?' selected':'')+'>自动</option>'
        +AU2.scores.map(x=>'<option value="'+x.key+'"'+(st.score===x.key?' selected':'')
          +'>'+esc(x.name)+'</option>').join('')+'</select></label>'
      +'<label>底噪<select data-snd-sel="bed">'
        +'<option value="auto"'+(st.bed==='auto'?' selected':'')+'>自动</option>'
        +AU2.beds.map(x=>'<option value="'+x.key+'"'+(st.bed===x.key?' selected':'')
          +'>'+esc(x.name)+'</option>').join('')+'</select></label>'
      +'</div>'
      +'<div class="mini" style="margin-top:6px">'+esc((D.music.meta||{}).discipline||'')
      +'</div><div class="mini" style="color:var(--dim)">'+esc(AU2?AU2.disclaimer:'')+'</div>'
      +'<div class="hr"></div><div class="tagline">美 术</div>'
      +'<div class="viewsel"><button data-art="1" class="'+(ARTON?'on':'')+'">显示插画</button>'
      +'<button data-art="0" class="'+(!ARTON?'on':'')+'">纯文字</button></div>'
      +'<div class="mini" style="margin-top:6px">时代色板 '+W.art.eras.length
      +' 套 · 几何纹样 '+W.art.motifs.length+' 种 · 场景 '+Object.keys(W.art.scenes).length
      +' 类；同一参数必得同一张图，切卷与换时代自动换色换纹。</div>'
      +'<div class="mini" style="color:var(--dim)">'+esc(W.art.note)+'</div>'
      +'<div class="mini" style="color:var(--dim)">'+esc(W.art.paletteNote)+'</div>'
      +'<div class="mini" style="margin-top:6px;color:var(--gold)">'
      +esc((D.art.meta||{}).method||'')+'</div></div>';

    h+='<div class="card"><div class="tagline">这 一 局</div><div class="mini">'""",'settings card')

# D 选项点击 cue（含判读题三档）
rep("""    app.querySelectorAll('[data-i]').forEach(b=>b.addEventListener('click',()=>{E.choose(+b.dataset.i);render();}));""",
"""    app.querySelectorAll('[data-i]').forEach(b=>b.addEventListener('click',()=>{
      const t=(b.textContent||'');
      /* 判读题三档走各自的短音，其余按「落笔」 */
      if(t.indexOf('分层存疑')>=0)cue('quizOk');
      else if(t.indexOf('按通行')>=0||t.indexOf('按通说')>=0)cue('quizMid');
      else if(t.indexOf('常见误解')>=0||t.indexOf('直取')>=0)cue('quizBad');
      else cue('choose');
      E.choose(+b.dataset.i);render();
    }));""",'choose cue')

# E 声音/美术事件绑定（插在 data-hc 之后）
rep("""    app.querySelectorAll('[data-hc]').forEach(b=>b.addEventListener('click',()=>{HC=+b.dataset.hc;applyDisplay();render();}));""",
"""    app.querySelectorAll('[data-hc]').forEach(b=>b.addEventListener('click',()=>{HC=+b.dataset.hc;applyDisplay();render();}));
    /* v1.2 声与色：按钮 + 三个下拉；改设置只重绘本页，不动游戏状态 */
    app.querySelectorAll('[data-snd]').forEach(b=>b.addEventListener('click',()=>{
      const a=b.dataset.snd,au=AU();if(!au)return;
      if(a==='toggle'){au.toggle();cue('tap');}
      else if(a==='on'){au.set('on',true);cue('tap');}
      else if(a==='off'){au.set('on',false);}
      else if(a==='try'){au.set('on',true);cue('gather');}
      else if(a==='auto'){
        const z=au.autoFor(S.reg,E.eraIdx(S.year));
        au.set('score',z.score);au.set('scale',z.scale);au.set('bed',z.bed);
        au.set('on',true);cue('study');
      }
      render();
    }));
    app.querySelectorAll('[data-vol]').forEach(b=>b.addEventListener('click',()=>{
      if(AU())AU().set('volume',+b.dataset.vol);cue('tap');render();
    }));
    app.querySelectorAll('[data-snd-sel]').forEach(el=>el.addEventListener('change',()=>{
      if(AU())AU().set(el.dataset.sndSel,el.value);cue('tap');render();
    }));
    app.querySelectorAll('[data-art]').forEach(b=>b.addEventListener('click',()=>{
      ARTON=+b.dataset.art;cue('tap');render();
    }));""",'sound bindings')

# F data-act 委托加音效映射
rep("""    app.querySelectorAll('[data-act]').forEach(b=>b.addEventListener('click',()=>{
      const a=b.dataset.act;
      if(a==='next')E.step();""",
"""    app.querySelectorAll('[data-act]').forEach(b=>b.addEventListener('click',()=>{
      const a=b.dataset.act;
      const CUE={next:'tap',contvol:'gather',epilogue:'ending',nextdyn:'turnover',
        'scroll-final':'ending',scroll:'ending','realend-cont':'turnover',
        backscroll:'tap',restart:'tap'};
      cue(CUE[a]||'tap');
      if(a==='next')E.step();""",'act cue')

# G renderStart 顶部插画 + 绑定
rep("""    let h='<div class="title"><h1>上下五千年</h1><p>分 卷 编 年 · 从 第 一 堆 篝 火 点 起</p></div>';""",
"""    const startS={year:-5000,reg:START.reg,vol:{n:1},phase:'start'};
    let h=artTopHTML(startS,true);
    h+='<div class="title"><h1>上下五千年</h1><p>分 卷 编 年 · 从 第 一 堆 篝 火 点 起</p></div>';
    h+='<div class="mini center" style="margin:-4px 0 10px;color:var(--dim)">'
      +'本版加入离线合成音乐与程序化几何插画：右上角可开关，设置页可调调式、底噪与音量。'
      +'全部不联网、不读写存档，关闭后不产生任何音频节点。</div>';""",'start art')

rep("""    app.querySelectorAll('[data-act]').forEach(b=>b.addEventListener('click',()=>{
      const a=b.dataset.act;
      if(a==='newgame'){startCfg();E.fresh(START.reg,START.view);applyTut();E.step();TAB='main';render();}""",
"""    app.querySelectorAll('[data-snd]').forEach(b=>b.addEventListener('click',()=>{
      if(b.dataset.snd==='toggle'&&AU()){AU().toggle();cue('tap');rerender();}
    }));
    app.querySelectorAll('[data-act]').forEach(b=>b.addEventListener('click',()=>{
      const a=b.dataset.act;
      cue('tap');
      if(a==='newgame'){startCfg();E.fresh(START.reg,START.view);applyTut();E.step();TAB='main';render();}""",'start bind')

open(p,'w',encoding='utf8').write(s)
print('ui.js v1.2 补丁完成')
