# -*- coding: utf-8 -*-
"""v2.4：呼吸真动起来、待机微表演、横屏按钮可用且如实提示。
   本轮不新增任何人物层：上一批生成稿被否决，全部作废。"""
import os
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# ---------------- style.css ----------------
p=os.path.join(ROOT,'src','style.css');s=open(p,encoding='utf8').read()
CSS_DONE='v2.4：必须用独立' in s
def R(a,b,tag,cnt=1):
    global s
    if CSS_DONE:print(' skip',tag);return
    assert a in s,'style.css 缺 '+tag
    s=s.replace(a,b,cnt);print(' ok',tag)

# 1) 呼吸改用独立属性，避开 transform 的 !important
R("""@keyframes breathe{
  0%,100%{transform:translateX(-50%) translateY(0) scale(1)}
  50%{transform:translateX(-50%) translateY(-4px) scale(1.014)}
}""",
"""@keyframes breathe{
  /* v2.4：必须用独立 translate/scale 属性。写 transform 会被后面
     「可点可拖」那条 transform:...!important 整个压死，呼吸看着完全不动。 */
  0%,100%{translate:0 0;scale:1}
  50%{translate:0 -4px;scale:1.014}
}""",'呼吸关键帧')

# 2) 预览立绘也呼吸
R("""/* v2.1：全屏预览里短按立绘的回弹反馈 */""",
"""/* v2.4：全屏预览里的向导静止时也呼吸，与主舞台同一节奏 */
.sp-char{animation:breathe 4.4s ease-in-out infinite;transform-origin:50% 88%}

/* v2.4：待机微表演。四种轻动作都只用独立属性，不碰 transform 的拖动位移；
   由固定散列调度，不调用主随机数，同种子节奏一致。 */
.stage-char.ch-idle-a,.sp-char.ch-idle-a{animation:chIdleA .9s ease-in-out!important}
.stage-char.ch-idle-b,.sp-char.ch-idle-b{animation:chIdleB .9s ease-in-out!important}
.stage-char.ch-idle-c,.sp-char.ch-idle-c{animation:chIdleC 1.1s ease-in-out!important}
.stage-char.ch-idle-d,.sp-char.ch-idle-d{animation:chIdleD .9s ease-in-out!important}
@keyframes chIdleA{0%,100%{rotate:0deg}30%{rotate:-1.2deg}65%{rotate:.8deg}}
@keyframes chIdleB{0%,100%{translate:0 0;scale:1}35%{translate:0 -6px;scale:1.02}70%{translate:0 1px;scale:.995}}
@keyframes chIdleC{0%,100%{scale:1}45%{scale:1.028}}
@keyframes chIdleD{0%,100%{rotate:0deg;translate:0 0}40%{rotate:1.1deg;translate:2px 0}75%{rotate:-.6deg;translate:-1px 0}}
html.rm .stage-char.ch-idle-a,html.rm .stage-char.ch-idle-b,
html.rm .stage-char.ch-idle-c,html.rm .stage-char.ch-idle-d,
html.rm .sp-char{animation:none!important}

/* v2.1：全屏预览里短按立绘的回弹反馈 */""",'待机微表演样式')

# 3) 横屏窄屏适配：原来 38vw 在 390px 手机上只有 148px，看着像没切
old="""@media (max-width:520px){
  html.landscape .stage{width:42vw!important}
  html.landscape #app{padding-left:42vw!important}
  html.landscape .pchip{left:calc(42vw + 2%)}
  html.landscape .pchip.open .pchip-detail{left:calc(42vw + 2%)}
}"""
new="""@media (max-width:520px){
  /* v2.4：窄屏下改成「舞台铺满上半屏、内容在下、选项两列」的横向布局。
     原先 42vw 只有一百多像素，点了像没反应，这是用户反复说横屏不了的原因之一。 */
  html.landscape .stage{width:100vw!important;height:40vh!important;height:40dvh!important;
    top:0;left:0;right:0}
  html.landscape .stage-char{height:34vh;bottom:3vh;max-width:72vw}
  html.landscape #app{padding-left:0!important;padding-top:40vh!important;padding-top:40dvh!important}
  html.landscape .panel.on{padding-top:8px!important;padding-bottom:90px}
  html.landscape .opts{grid-template-columns:1fr 1fr}
  html.landscape .pchip{left:2%!important;right:2%;top:calc(40dvh + 6px);bottom:auto}
  html.landscape .pchip.open .pchip-detail{left:2%!important;right:2%}
  html.landscape .stage .bubble{left:3%;right:3%;bottom:8px}
}"""
if not CSS_DONE:
    assert old in s,'style.css 缺窄屏横屏块'
    s=s.replace(old,new,1);print(' ok 横屏窄屏适配')
else:print(' skip 横屏窄屏适配')

# 4) 横屏提示条
if not CSS_DONE:s+="""
/* v2.4：横屏提示条。网页不能强制旋转手机系统，必须如实说明。 */
#landHint{position:fixed;left:8px;right:8px;top:8px;z-index:99;
  display:flex;align-items:center;gap:8px;padding:9px 11px;
  border:1px solid var(--line);border-radius:10px;
  background:rgba(255,248,228,.96);color:#4a3c28;
  font-size:calc(11px * var(--fs));line-height:1.5;
  box-shadow:0 6px 18px rgba(60,45,25,.18)}
#landHint b{color:var(--gold)}
#landHint button{margin-left:auto;flex:none;border:0;border-radius:6px;
  padding:4px 9px;background:#e8dcc2;color:#4a3c28;cursor:pointer;
  font-family:inherit;font-size:inherit}
html.skin-dark #landHint{background:rgba(38,34,28,.96);color:#e8dcc2}
html.skin-dark #landHint button{background:#4a4234;color:#e8dcc2}
"""
if not CSS_DONE:open(p,'w',encoding='utf8').write(s)
print('style.css 完成')

# ---------------- ui.js ----------------
p=os.path.join(ROOT,'src','ui.js');s=open(p,encoding='utf8').read()
def U(a,b,tag,cnt=1):
    global s
    assert a in s,'ui.js 缺 '+tag
    s=s.replace(a,b,cnt);print(' ok',tag)

# 状态与工具函数
U("""  let SPLONGT=0,SPMOVED=0,IS_PREVIEW=0,TALKING=0,CUEON=1;""",
"""  let SPLONGT=0,SPMOVED=0,IS_PREVIEW=0,TALKING=0,CUEON=1;
  /* v2.4：待机微表演调度（固定散列）与横屏手动标记 */
  let IDLET=0,IDLEKEY='',IDLESTEP=0,LAND_MANUAL=0;
  function strHash(x){
    let h=2166136261;x=String(x||'');
    for(let i=0;i<x.length;i++){h^=x.charCodeAt(i);h=Math.imul(h,16777619);}
    return h>>>0;
  }
  function reduceMotion(){
    return document.documentElement.classList.contains('rm')||
      !!(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }
  const IDLECLS=['ch-idle-a','ch-idle-b','ch-idle-c','ch-idle-d'];
  function idleTick(){
    const ch=charEl();
    if(ch&&!/ch-talking|ch-tap|ch-grab|ch-drop|ch-perform/.test(ch.className)){
      const S=E.state&&E.state(),seed=strHash((S&&S.seed||0)+'|'+(S&&S.turn||0));
      const k=IDLECLS[(seed+IDLESTEP)%IDLECLS.length];
      IDLECLS.forEach(c=>ch.classList.remove(c));
      void ch.offsetWidth;ch.classList.add(k);
      setTimeout(()=>{if(ch)ch.classList.remove(k);},920);
    }
    IDLESTEP++;
    const S2=E.state&&E.state(),b=strHash((S2&&S2.seed||0)+'#'+(S2&&S2.turn||0));
    IDLET=setTimeout(idleTick,5200+((b>>>3)+IDLESTEP*137)%3600);
  }
  function scheduleIdle(){
    let S=null;try{S=E.state&&E.state();}catch(e){}
    if(!S||reduceMotion())return;
    const key=(S.seed||0)+'|'+(S.turn||0);
    if(key===IDLEKEY&&IDLET)return;
    IDLEKEY=key;IDLESTEP=0;clearTimeout(IDLET);
    const b=strHash(key);
    IDLET=setTimeout(idleTick,1800+((b>>>5)%2600));
  }""",'待机调度')

# 横屏统一入口
U("""  function applyDisplay(){""",
"""  /* v2.4：横屏统一入口。布局一定生效；系统旋转只是尽力尝试，失败如实说。 */
  function showLandHint(){
    let el=document.getElementById('landHint');
    if(el)return;
    el=document.createElement('div');el.id='landHint';
    el.setAttribute('role','status');
    el.innerHTML='<b>已切横向布局</b><span>网页不能强制旋转手机系统。'
      +'若想真正横屏，请关闭系统「竖屏锁定」后把手机横过来，画面会自动铺满。</span>'
      +'<button data-landhint-close aria-label="关闭提示">知道了</button>';
    document.body.appendChild(el);
  }
  function hideLandHint(){
    const el=document.getElementById('landHint');
    if(el&&el.parentNode)el.parentNode.removeChild(el);
  }
  function applyLandscape(on,manual){
    if(manual)LAND_MANUAL=1;
    LANDSCAPE=on?1:0;
    applyDisplay();
    if(W.a11y&&W.a11y.announce)
      W.a11y.announce(on?'已切换横向布局':'已回到竖向布局');
    if(!on){hideLandHint();return;}
    showLandHint();
    /* 全屏 + 锁定必须发生在用户手势里；file:// 与非全屏下大多会失败 */
    try{
      const de=document.documentElement;
      const go=()=>{
        try{
          const o=window.screen&&window.screen.orientation;
          if(o&&o.lock&&LANDSCAPE)o.lock('landscape').catch(()=>{});
          else if(o&&o.unlock&&!LANDSCAPE)o.unlock();
        }catch(e){}
      };
      if(de.requestFullscreen&&!document.fullscreenElement){
        const r=de.requestFullscreen();
        if(r&&r.then)r.then(go).catch(go);else go();
      }else go();
    }catch(e){}
    /* 文案不再假装「已旋转」，只说布局已切 */
    say('已切横向布局：舞台铺开、选项并排。手机若锁了竖屏，网页改不了系统方向，'
      +'关闭竖屏锁定后横过来即可自动适配。');
  }
  /* 手机真的横过来时自动适配，不覆盖用户手动关掉的布局 */
  function watchOrientation(){
    if(!window.matchMedia)return;
    const mq=window.matchMedia('(orientation: landscape)');
    const onChange=()=>{
      if(LAND_MANUAL)return;
      if(mq.matches&&!LANDSCAPE){LANDSCAPE=1;applyDisplay();}
      else if(!mq.matches&&LANDSCAPE){LANDSCAPE=0;applyDisplay();hideLandHint();}
    };
    if(mq.addEventListener)mq.addEventListener('change',onChange);
    else if(mq.addListener)mq.addListener(onChange);
  }
  function applyDisplay(){""",'横屏统一入口')

# stageTools：横屏键单独露出，不再只藏齿轮
U("""    /* 三颗视图按键收进齿轮，默认只露一颗；DOM 仍在，键盘与读屏都能取到 */
    return '<button class="vgear'""",
"""    /* v2.4：横屏键单独露出。之前三颗全藏在齿轮里且默认收起，
       用户反复说「点横屏完全横不了」，第一层原因是根本找不到按钮。 */
    return btn('landscape','▭','横屏布局')
      +'<button class="vgear'""",'横屏键露出')
U("""      +'<div class="viewtools" role="group" aria-label="视图按键">'
      +btn('landscape','▭','横屏布局')
      +btn('full','⛶','全屏并铺满背景')""",
"""      +'<div class="viewtools" role="group" aria-label="视图按键">'
      +btn('full','⛶','全屏并铺满背景')""",'齿轮内去掉重复横屏键')

# onViewClick 的 landscape 分支
old="""      if(d.view==='landscape'){
        LANDSCAPE=LANDSCAPE?0:1;
        /* 手机若锁定竖屏，接口会失败：如实提示，不假装已旋转 */
        let rotated=false;
        try{
          const o=window.screen&&window.screen.orientation;
          if(LANDSCAPE&&o&&o.lock){
            o.lock('landscape').then(()=>{rotated=true;}).catch(()=>{
              say('系统不允许网页强制旋转；已切为横向两栏布局。若要真横屏，请关闭系统竖屏锁定后把手机横过来。');
            });
          }else if(!LANDSCAPE&&o&&o.unlock)o.unlock();
        }catch(e){}
        applyDisplay();
        say(LANDSCAPE?'已切横向两栏布局：舞台在左、内容在右。手机若锁了竖屏，网页不能强制旋转，请在系统里解锁':'已回到竖屏布局');
        return;
      }"""
new="""      if(d.view==='landscape'){
        applyLandscape(!LANDSCAPE,true);
        return;
      }"""
assert old in s,'ui.js 缺横屏分支'
s=s.replace(old,new,1);print(' ok 横屏分支')

# data-landscape 设置页分支
old="""    if(d.landscape!==undefined){
      LANDSCAPE=+d.landscape?1:0;applyDisplay();
      say(LANDSCAPE?'已切横屏布局；若手机锁了竖屏，请在系统里解锁旋转':'已回到竖屏布局');
      return;
    }"""
new="""    if(d.landscape!==undefined){
      applyLandscape(+d.landscape?1:0,true);
      return;
    }
    const lhc=ev.target.closest&&ev.target.closest('[data-landhint-close]');
    if(lhc){hideLandHint();return;}"""
assert old in s,'ui.js 缺设置页横屏分支'
s=s.replace(old,new,1);print(' ok 设置页横屏分支')

# mount 时监听方向
U("""    /* v2.1/v2.2：朗读开始驱动表演，结束（含引擎不可用、被取消）复位按钮与立绘 */""",
"""    /* v2.4：手机真的横过来时自动适配；减少动效下不排待机表演 */
    watchOrientation();
    /* v2.1/v2.2：朗读开始驱动表演，结束（含引擎不可用、被取消）复位按钮与立绘 */""",'方向监听')

# render 末尾挂 scheduleIdle（替换之前那段重绘同步）
U("""    if(SAYING){
      const ax=W.a11y;""",
"""    scheduleIdle();
    if(SAYING){
      const ax=W.a11y;""",'render 挂待机调度')
open(p,'w',encoding='utf8').write(s);print('ui.js 完成')
