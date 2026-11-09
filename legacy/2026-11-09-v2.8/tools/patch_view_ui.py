# -*- coding: utf-8 -*-
"""v1.5：横屏／全屏按键、气泡透明度、呼吸动画、表演关卡锁、角色音色、
设置卡可隐藏、选项全显、背景全屏——UI 与 CSS 补丁。"""
import os
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P=lambda *x:os.path.join(ROOT,*x)

# ═══════════════════ ui.js ═══════════════════
p=P('src','ui.js');s=open(p,encoding='utf8').read()
def rep(old,new,tag,cnt=1):
    global s
    assert old in s,'缺锚点：'+tag
    s=s.replace(old,new,cnt);print(' ok',tag)

# 1 状态变量
rep("""  let ARTON=1;   /* v1.2 美术开关（仅本次会话，不写存档） */""",
"""  let ARTON=1;   /* v1.2 美术开关（仅本次会话，不写存档） */
  /* v1.5 视图：只改本机界面，不进存档、不进分享串、不影响同种子复盘 */
  let STSIZE='normal',LANDSCAPE=0,BUB='light',SETMIN=0,SETFOLD={};""",'state vars')

# 2 舞台工具条 + 视图委托 + 设置卡折叠，插在 artTopHTML 之前
anchor="  function artTopHTML(S,isStart){"
block=r"""  /* v1.5 舞台工具条：图标化，清爽；横屏 / 全屏 / 看全部选项三颗按键 */
  function stageTools(){
    const btn=(v,ic,lab)=>'<button class="vbtn" data-view="'+v+'" aria-label="'+lab
      +'" title="'+lab+'">'+ic+'</button>';
    return '<div class="viewtools" role="group" aria-label="视图按键">'
      +btn('landscape','▭','横屏布局')
      +btn('full','⛶','全屏并铺满背景')
      +btn('opts','≡','收起舞台，看全部选项')
      +'</div>'+sndBtn();
  }
  /* 一次性事件委托：开局页与游戏页都生效，重绘不重复注册 */
  function onViewClick(ev){
    if(typeof Element==='undefined'||!ev.target||!ev.target.closest)return;
    const b=ev.target.closest('[data-view],[data-stage-size],[data-bubble-alpha],'
      +'[data-setmin],[data-fold],[data-guide]');
    if(!b)return;
    const d=b.dataset;
    const say=t=>{if(W.a11y&&W.a11y.announce)W.a11y.announce(t);};
    if(d.guide){
      if(d.guide==='say'){
        const ok=W.stage&&W.stage.speakLine&&W.stage.speakLine();
        say(ok?'正在用角色音色念这一句':'此浏览器暂不支持语音朗读');
      }else if(d.guide==='cue'){
        const ok=W.stage&&W.stage.guideCue&&W.stage.guideCue(b.dataset.kind||'curious');
        say(ok?'已响一声语气音':'请先打开音效');
      }
      return;
    }
    if(d.view){
      if(d.view==='landscape'){
        LANDSCAPE=LANDSCAPE?0:1;
        /* 手机若锁定竖屏，接口会失败：如实提示，不假装已旋转 */
        try{
          const o=window.screen&&window.screen.orientation;
          if(LANDSCAPE&&o&&o.lock)o.lock('landscape').catch(()=>{});
          else if(!LANDSCAPE&&o&&o.unlock)o.unlock();
        }catch(e){}
        applyDisplay();
        say(LANDSCAPE?'已切横屏布局；若手机锁了竖屏，请在系统里解锁旋转':'已回到竖屏布局');
        return;
      }
      if(d.view==='full'){
        STSIZE='immersive';if(W.stage)W.stage.set('size','immersive');
        try{
          const de=document.documentElement;
          if(!document.fullscreenElement&&de.requestFullscreen)de.requestFullscreen().catch(()=>{});
          else if(document.fullscreenElement&&document.exitFullscreen)document.exitFullscreen().catch(()=>{});
        }catch(e){}
        render();say('已开沉浸：背景铺满整屏');return;
      }
      if(d.view==='opts'){
        STSIZE='compact';if(W.stage)W.stage.set('size','compact');
        render();
        setTimeout(()=>{const o=document.querySelector('.opts');
          if(o&&o.scrollIntoView)o.scrollIntoView({behavior:'smooth',block:'start'});},30);
        say('舞台已收起，全部选项直接铺开');return;
      }
    }
    if(d.stageSize){STSIZE=d.stageSize;if(W.stage)W.stage.set('size',STSIZE);render();return;}
    if(d.bubbleAlpha){BUB=d.bubbleAlpha;render();return;}
    if(d.setmin!==undefined){SETMIN=+d.setmin;render();return;}
    if(d.fold!==undefined){
      const k=d.fold;SETFOLD[k]=!SETFOLD[k];
      const c=document.querySelector('[data-set-card="'+k+'"]');
      if(c)c.classList.toggle('folded',!!SETFOLD[k]);
      return;
    }
  }
  if(typeof document!=='undefined')document.addEventListener('click',onViewClick);

  /* 设置页卡片：可单独收起、可精简隐藏；不改动生成 HTML，只做 DOM 后处理 */
  const KEEP=['视 角','显 示','视 图','舞 台','朗 读'];
  function applySetCards(){
    if(TAB!=='set'||typeof document==='undefined')return;
    const panel=document.querySelector('.panel.on');if(!panel)return;
    if(!panel.querySelector('.setbar')){
      const bar=document.createElement('div');bar.className='setbar';
      bar.innerHTML='<span>设置卡</span>'
        +'<button data-setmin="1" class="'+(SETMIN?'on':'')+'">精简</button>'
        +'<button data-setmin="0">全部</button>'
        +'<span class="mini">每张卡右上角可单独收起</span>';
      panel.insertBefore(bar,panel.firstChild);
    }
    panel.querySelectorAll('.card').forEach((c,i)=>{
      c.setAttribute('data-set-card',String(i));
      const t=c.querySelector('.tagline');
      if(t&&!c.querySelector('[data-fold]')){
        const b=document.createElement('button');
        b.className='foldbtn';b.dataset.fold=String(i);
        b.setAttribute('aria-label','收起或展开这张设置卡');b.title='收起／展开';
        b.textContent='−';t.appendChild(b);
      }
      const name=(t&&t.textContent||'').trim();
      const keep=KEEP.some(k=>name.indexOf(k)>=0);
      c.style.display=(SETMIN&&!keep)?'none':'';
      c.classList.toggle('folded',!!SETFOLD[String(i)]);
    });
  }
"""
assert anchor in s;s=s.replace(anchor,block+anchor,1);print(' ok 工具条/委托/设置卡')

# 3 两处 tools
rep("""W.stage.stageHTML(S,{tools:sndBtn()})""","""W.stage.stageHTML(S,{tools:stageTools()})""",'render tools')
rep("""W.stage.stageHTML(null,{tools:sndBtn()})""","""W.stage.stageHTML(null,{tools:stageTools()})""",'start tools')

# 4 开局说明补 v1.5
rep("""      +'表情动作随情境与天气变化，台词走气泡框；朗读仍默认关闭。</div>';""",
"""      +'表情动作随情境与天气变化，台词走气泡框；朗读仍默认关闭。<br>'
      +'v1.5 起有横屏／全屏按键、呼吸微表演、更透气泡与角色音色念句；'
      +'设置卡可收起，≡ 一键收舞台看全部选项。</div>';""",'start intro v1.5')

# 5 设置页舞台卡片整段替换
start=s.find("    /* ===== v1.4 AVG 舞 台 ===== */")
end=s.find("    /* ===== v1.2 声 与 色 ===== */",start)
assert start>0 and end>start
new=r"""    /* ===== v1.5 视 图 · 清 爽 ===== */
    const SG=W.stage,sg=SG?SG.status():{stage:true,bubble:true,layers:0,bg:false,
      size:'normal',scenes:[],ready:0,locked:0,pending:[]};
    const vp=(W.a11y&&W.a11y.guideVoices)?W.a11y.guideVoices():{total:0,zh:0,guide:false};
    h+='<div class="card"><div class="tagline">视 图 · 清 爽</div>'
      +'<div class="mini">横屏／全屏／收起舞台三颗按键在舞台右上角；'
      +'设置卡可精简或单独收起；选项区没有高度上限，全部条目直接铺开。</div>'
      +'<div class="switchrow"><span>横屏布局</span><div class="viewsel">'
        +'<button data-view="landscape" class="'+(LANDSCAPE?'on':'')+'">开</button>'
        +'<button data-view="landscape" class="'+(!LANDSCAPE?'on':'')+'">关</button></div></div>'
      +'<div class="switchrow"><span>舞台尺寸</span><div class="viewsel">'
        +'<button data-stage-size="compact" class="'+(STSIZE==='compact'?'on':'')+'">紧凑</button>'
        +'<button data-stage-size="normal" class="'+(STSIZE==='normal'?'on':'')+'">标准</button>'
        +'<button data-stage-size="immersive" class="'+(STSIZE==='immersive'?'on':'')+'">全屏</button></div></div>'
      +'<div class="switchrow"><span>气泡透度</span><div class="viewsel">'
        +'<button data-bubble-alpha="light" class="'+(BUB==='light'?'on':'')+'">更透</button>'
        +'<button data-bubble-alpha="normal" class="'+(BUB==='normal'?'on':'')+'">适中</button>'
        +'<button data-bubble-alpha="solid" class="'+(BUB==='solid'?'on':'')+'">实底</button></div></div>'
      +'<div class="mini" style="margin-top:6px">全屏档会把同一张背景板铺满整屏、角色与气泡浮在其上；'
      +'紧凑档把舞台压到一行，≡ 键直接滚到选项区。手机若锁定竖屏，横屏键只改布局、不会强行旋转系统。</div></div>';

    /* ===== v1.5 舞 台 · 哈 士 喵 ===== */
    h+='<div class="card"><div class="tagline">舞 台 · 哈 士 喵</div>'
      +'<div class="mini">角色层从纯品红实心源图抠出，'+sg.layers+' 层孔洞数均为 0，'
      +'叠在同一张暖米纸厚涂背景板上；同一个背景换角色，不再为每个表情多存整图。'
      +'角色带轻微呼吸与换层淡入，不是完全静态。</div>'
      +'<div class="switchrow"><span>显示舞台</span><div class="viewsel">'
        +'<button data-stage="1" class="'+(sg.stage?'on':'')+'">显示</button>'
        +'<button data-stage="0" class="'+(!sg.stage?'on':'')+'">隐藏</button></div></div>'
      +'<div class="switchrow"><span>气泡台词</span><div class="viewsel">'
        +'<button data-bubble="1" class="'+(sg.bubble?'on':'')+'">开</button>'
        +'<button data-bubble="0" class="'+(!sg.bubble?'on':'')+'">关</button></div></div>'
      +'<div class="mini" style="margin-top:6px">当前 '+sg.layers+' 层角色 / '
      +(sg.bg?'1 张背景板':'无背景板')+' · 天气：晴／雨／阴／夜／雪／风沙，每三笔一换，'
      +'全是离线 CSS 动画；晴天有合成鸟鸣、落雨有雨声，只在底噪设为「自动」时跟随天气。</div>'
      +'<div class="mini" style="color:var(--gold)">'+esc(SG?SG.verify:'')+'</div>'
      +'<div class="mini" style="color:var(--dim)">'+esc(SG?SG.note:'')+'</div>'
      +'<div class="mini" style="margin-top:6px">朗读默认关闭，文字全部留在画面上；'
      +'角色用完整 contain 显示，任何页签都不会把头顶、脚底或尾巴裁掉。</div></div>';

    /* ===== v1.5 表 演 关 卡 · 登 记 ===== */
    const scn=sg.scenes||[],readyN=sg.ready||0,lockN=sg.locked||0;
    let sceneRows='';
    scn.forEach(x=>{
      const ok=x.ready,tag=ok?'✓ 已就绪':'🔒 敬请期待';
      sceneRows+='<div class="scenerow'+(ok?'':' locked')+'"><b>'+esc(x.name)+'</b>'
        +'<span class="mini">'+esc(x.when)+'</span>'
        +'<em>'+tag+(ok?'':' · 缺 '+esc((x.missing||[]).join('／')))+'</em></div>';
    });
    h+='<div class="card"><div class="tagline">表 演 关 卡 · 登 记</div>'
      +'<div class="mini">共 '+scn.length+' 关，已解锁 '+readyN+' 关，'
      +'尚缺素材而锁住 '+lockN+' 关。锁住的关卡不会假装有表演，'
      +'游戏里自动回退到平静层，只在下表写「敬请期待」。</div>'
      +'<div class="mini" style="color:var(--gold);margin-top:6px">'
      +esc(sg.rule||'')+'</div>'
      +'<div class="mini" style="margin-top:4px">下一批待补 '+((sg.pending||[]).length)
      +' 层：'+esc((sg.pending||[]).join('、'))+'。每次请求最多产出 10 张图，'
      +'做满即停，下一轮开工第一件事就补。</div>'
      +'<details class="scenelist"><summary>展开查看全部 '+scn.length+' 关</summary>'
      +sceneRows+'</details></div>';

    /* ===== v1.5 人 声 · 角 色 音 色 ===== */
    h+='<div class="card"><div class="tagline">人 声 · 角 色 音 色</div>'
      +'<div class="mini">'+esc((sg.voicePack&&sg.voicePack.honest)||'')+'</div>'
      +'<div class="mini" style="margin-top:6px">'+esc((sg.voicePack&&sg.voicePack.notDubbing)||'')
      +'</div>'
      +'<div class="mini" style="margin-top:6px">本机可用语音 '+vp.total+' 个，'
      +'其中中文 '+vp.zh+' 个，'+(vp.guide?'已挑到偏明亮的音色':'未挑到偏明亮音色，回退默认中文语音')
      +'。朗读开关仍默认关闭；只有点气泡框的「念」或说「念这句」才会出声。</div>'
      +'<div class="switchrow"><span>试一句角色台词</span><div class="viewsel">'
        +'<button data-guide="say">念这句</button></div></div>'
      +'<div class="switchrow"><span>合成语气音</span><div class="viewsel">'
        +'<button data-guide="cue" data-kind="curious">好奇</button>'
        +'<button data-guide="cue" data-kind="happy">欢喜</button>'
        +'<button data-guide="cue" data-kind="hesitate">迟疑</button></div></div>'
      +'<div class="mini" style="color:var(--dim)">语气音不含字词、不是配音；'
      +'真要离线人声包得内嵌音频文件，体积与跨设备音色都不可控，本版不做。</div></div>';

"""
s=s[:start]+new+s[end:]
print(' ok 设置页四张新卡')

# 6 applyDisplay 扩展 + renderStart 末尾补调用
rep("""  function applyDisplay(){
    if(typeof document==='undefined')return;
    const r=document.documentElement;
    r.style.setProperty('--fs',FS===0?'1':FS===1?'1.12':'1.25');
    r.classList.toggle('hc',HC===1);
  }""",
"""  function applyDisplay(){
    if(typeof document==='undefined')return;
    const r=document.documentElement;
    r.style.setProperty('--fs',FS===0?'1':FS===1?'1.12':'1.25');
    r.classList.toggle('hc',HC===1);
    r.classList.toggle('landscape',LANDSCAPE===1);
    r.classList.toggle('bgfull',STSIZE==='immersive');
    r.classList.toggle('bub-light',BUB==='light');
    r.classList.toggle('bub-solid',BUB==='solid');
    if(W.stage){
      W.stage.set('size',STSIZE);
      try{const u=W.stage.bgURL&&W.stage.bgURL();
        if(u)r.style.setProperty('--stage-bg','url("'+u+'")');}catch(e){}
    }
    applySetCards();
  }""",'applyDisplay')
rep("""    if(W.a11y){W.a11y.mount();W.a11y.onRender(null);}
    app.querySelectorAll('[data-act]').forEach""",
"""    if(W.a11y){W.a11y.mount();W.a11y.onRender(null);}
    applyDisplay();
    app.querySelectorAll('[data-act]').forEach""",'start applyDisplay')

open(p,'w',encoding='utf8').write(s);print('ui.js 补丁完成')

# ═══════════════════ style.css ═══════════════════
p=P('src','style.css');css=open(p,encoding='utf8').read()
if 'v1.5 视图与清爽' not in css:
    css+=r"""

/* ===== v1.5 视图与清爽：横屏 / 全屏 / 呼吸 / 透气泡 / 设置卡 ===== */
.viewtools{display:flex;gap:4px;margin-right:5px}
.vbtn{width:27px;height:27px;line-height:1;border-radius:50%;padding:0;
  border:1px solid rgba(120,98,68,.5);background:rgba(255,250,238,.88);
  color:#6a5940;font-size:15px;font-family:inherit;cursor:pointer;
  display:inline-flex;align-items:center;justify-content:center}
.vbtn:focus-visible{outline:2px solid var(--gold);outline-offset:1px}
.stage-tools{display:flex;align-items:center;gap:5px}
.stage-tools .sndgroup{position:static;max-width:none;gap:3px}
.stage-tools .sndbtn span{display:none}          /* 工具条图标化，清爽 */
.stage-tools .sndbtn{width:27px;height:27px;padding:0;border-radius:50%;
  justify-content:center;background:rgba(255,250,238,.88);color:#6a5940;
  border-color:rgba(120,98,68,.45)}
.stage-tools .sndbtn.on{color:#9a7434;border-color:#9a7434;background:rgba(255,248,228,.95)}

/* 气泡更透；三档可调 */
.stage .bubble{background:linear-gradient(180deg,rgba(255,250,238,.58),rgba(247,238,220,.52));
  backdrop-filter:blur(7px);-webkit-backdrop-filter:blur(7px);
  border-color:rgba(120,98,68,.38);box-shadow:0 2px 8px rgba(80,64,42,.10)}
.stage .bubble:after{background:rgba(247,238,220,.62)}
html.bub-normal .stage .bubble{background:linear-gradient(180deg,rgba(255,250,238,.80),rgba(247,238,220,.76))}
html.bub-normal .stage .bubble:after{background:rgba(247,238,220,.80)}
html.bub-solid .stage .bubble{background:linear-gradient(180deg,rgba(255,250,238,.96),rgba(247,238,220,.94))}
html.bub-solid .stage .bubble:after{background:rgba(247,238,220,.95)}
.bubble-voice{float:right;margin:-2px 0 0 8px;font-family:inherit;font-size:calc(10px * var(--fs));
  padding:2px 7px;border-radius:10px;border:1px solid rgba(120,98,68,.45);
  background:rgba(255,255,255,.45);color:#6a5940;cursor:pointer}
.stage-tag{opacity:.72;font-weight:400}

/* 呼吸微表演：换层淡入 + 缓慢起伏，相位由固定散列给，不调用主随机数 */
.stage-char{animation:breathe 4.4s ease-in-out var(--breath-delay,0s) infinite,
  layerIn .42s ease-out both;transform-origin:50% 88%}
@keyframes breathe{
  0%,100%{transform:translateX(-50%) translateY(0) scale(1)}
  50%{transform:translateX(-50%) translateY(-4px) scale(1.014)}
}
@keyframes layerIn{from{opacity:.35}to{opacity:1}}

/* 三档舞台尺寸 */
.stage.sz-compact{height:112px}
.stage.sz-compact .stage-char{height:76%;bottom:2px}
.stage.sz-compact .stage .bubble,.stage.sz-compact .bubble{display:none}
.stage.sz-compact .wx{opacity:.55}
.stage.sz-compact .stage-tag{top:5px;left:6px}
.stage.sz-immersive{height:210px;background:transparent;border-color:transparent}
.stage.sz-immersive .stage-bg{display:none}
.stage.sz-immersive .stage-char{height:170px;max-width:72vw;bottom:8px}

/* 背景全屏：body 伪元素铺同一张背景板，UI 浮在其上 */
html.bgfull body{background:#e9dcc6}
html.bgfull body:before{content:"";position:fixed;inset:0;z-index:-1;
  background:var(--stage-bg) center 42%/cover no-repeat}
html.bgfull body:after{content:"";position:fixed;inset:0;z-index:-1;pointer-events:none;
  background:linear-gradient(180deg,rgba(24,20,15,.16),rgba(24,20,15,.52))}
html.bgfull .card{background:rgba(26,22,16,.80);backdrop-filter:blur(6px);
  -webkit-backdrop-filter:blur(6px)}
html.bgfull .tabs{background:rgba(16,14,11,.88)}
html.bgfull .stage .bubble{background:rgba(255,250,238,.62)}

/* 横屏布局：两栏、舞台压矮，选项更容易一屏看完 */
html.landscape .app{max-width:none;padding:8px 16px}
html.landscape .stage{height:150px}
html.landscape .stage-char{height:78%}
html.landscape .opts{display:grid;grid-template-columns:1fr 1fr;gap:8px}
html.landscape .head{margin-top:0}
@media (orientation:landscape) and (max-height:520px){
  .stage{height:142px}
  .opts{display:grid;grid-template-columns:1fr 1fr;gap:8px}
}

/* 选项全部铺开，不截断、不折叠 */
.opts{max-height:none!important;overflow:visible!important}
.opt .t,.opt .e,.opt .estat,.opt .basis,.opt .risk,.opt .note{
  white-space:normal;overflow:visible;text-overflow:clip;display:block}

/* 设置卡：精简 / 单独收起 */
.setbar{display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin:0 0 10px;
  padding:8px 10px;border:1px solid var(--line);border-radius:10px;
  background:rgba(255,248,228,.05);font-size:calc(12px * var(--fs))}
.setbar button{font-family:inherit;font-size:calc(11px * var(--fs));padding:3px 10px;
  border-radius:12px;border:1px solid var(--line);background:none;color:var(--ink);cursor:pointer}
.setbar button.on{color:var(--gold);border-color:var(--gold)}
.setbar .mini{flex:1;min-width:120px}
.foldbtn{float:right;font-family:inherit;font-size:12px;line-height:1;padding:1px 6px;
  border-radius:8px;border:1px solid var(--line);background:none;color:var(--dim);cursor:pointer}
.card.folded>:not(.tagline){display:none!important}
.card.folded{margin-bottom:6px}

/* 表演关卡表 */
.scenelist{margin-top:8px;border-top:1px dotted var(--line);padding-top:6px}
.scenelist summary{cursor:pointer;color:var(--gold);font-size:calc(12px * var(--fs))}
.scenerow{display:flex;flex-wrap:wrap;gap:6px;align-items:baseline;padding:5px 2px;
  border-bottom:1px dotted #3d3223;font-size:calc(12px * var(--fs))}
.scenerow b{min-width:120px;font-weight:600}
.scenerow .mini{flex:1;min-width:120px}
.scenerow em{font-style:normal;color:var(--gold);font-size:calc(11px * var(--fs))}
.scenerow.locked em{color:var(--dim)}
.scenerow.locked b{opacity:.72}

/* 新增天气：雪 / 风沙 */
.wx-snow i{position:absolute;top:-8%;width:6px;height:6px;border-radius:50%;
  background:rgba(255,255,255,.85);animation:snowFall 6s linear infinite}
.wx-snow i:nth-child(1){left:9%;animation-delay:.2s}
.wx-snow i:nth-child(2){left:24%;animation-delay:1.4s}
.wx-snow i:nth-child(3){left:39%;animation-delay:2.7s}
.wx-snow i:nth-child(4){left:56%;animation-delay:.9s}
.wx-snow i:nth-child(5){left:73%;animation-delay:3.4s}
.wx-snow i:nth-child(6){left:88%;animation-delay:2.1s}
@keyframes snowFall{0%{transform:translateY(-10px) translateX(0);opacity:0}
  15%{opacity:.9}100%{transform:translateY(300px) translateX(22px);opacity:0}}
.wx-dust{background:linear-gradient(180deg,rgba(196,170,126,.20),rgba(196,170,126,0) 70%)}
.wx-dust span{position:absolute;left:-30%;width:70%;height:42%;border-radius:50%;
  background:radial-gradient(ellipse,rgba(198,172,128,.30),rgba(198,172,128,0) 70%);
  animation:dustDrift 9s linear infinite}
.wx-dust span:nth-child(1){top:18%;animation-delay:0s}
.wx-dust span:nth-child(2){top:44%;animation-delay:3s}
.wx-dust span:nth-child(3){top:66%;animation-delay:6s}
@keyframes dustDrift{0%{transform:translateX(0)}100%{transform:translateX(210%)}}
@media (prefers-reduced-motion:reduce){
  .stage-char,.wx *,.wx,.wx-snow i,.wx-dust span{animation:none!important}
}
html.hc .stage .bubble{background:rgba(255,248,232,.86);border-color:#8a7550}
"""
    open(p,'w',encoding='utf8').write(css);print('style.css 已追加')
else:print('style.css 已追加（跳过）')
