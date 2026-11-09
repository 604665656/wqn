# -*- coding: utf-8 -*-
"""v2.6：治「点了横屏还是竖屏，还换不回去」。
   1) 物理竖屏时把整个游戏画布 rotate 90deg，给出肉眼可见的横向画面；
   2) 退出时补 exitFullscreen + orientation.unlock（v2.4 提前 return 漏掉了）；
   3) 常驻、显眼的「退出横屏」入口 + 按钮 on 状态 + Esc。
"""
import os
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# ---------------- ui.js ----------------
p=os.path.join(ROOT,'src','ui.js');s=open(p,encoding='utf8').read()
def U(a,b,tag,cnt=1):
    global s
    assert a in s,'ui.js 缺 '+tag
    s=s.replace(a,b,cnt);print(' ok',tag)

U("""  let IDLET=0,IDLEKEY='',IDLESTEP=0,LAND_MANUAL=0;""",
"""  let IDLET=0,IDLEKEY='',IDLESTEP=0,LAND_MANUAL=0;
  /* v2.6：物理竖屏时把画布转成横向。ROT90 只在 LANDSCAPE=1 且
     innerWidth<innerHeight 时为真；手机真的横过来会自动去掉。 */
  let ROT90=0;
  function wantRot90(){
    const w=window.innerWidth||document.documentElement.clientWidth,
          h=window.innerHeight||document.documentElement.clientHeight;
    return (LANDSCAPE===1&&w<h)?1:0;
  }
  /* 横屏键是同一个开关：状态、文案、aria 都要跟着变，否则用户不知道再点哪里退出 */
  function syncLandBtn(){
    document.querySelectorAll('[data-view="landscape"]').forEach(btn=>{
      btn.classList.toggle('on',!!LANDSCAPE);
      btn.setAttribute('aria-pressed',LANDSCAPE?'true':'false');
      const lab=LANDSCAPE?'退出横屏，回到竖向布局':'切换横向布局';
      btn.setAttribute('aria-label',lab);btn.title=lab;
      btn.textContent=LANDSCAPE?'▯':'▭';
    });
  }""",'状态与按钮同步')

U("""  function showLandHint(){
    let el=document.getElementById('landHint');
    if(el)return;
    el=document.createElement('div');el.id='landHint';
    el.setAttribute('role','status');
    el.innerHTML='<b>横向</b><span>网页改不了系统旋转；解锁竖屏锁定后横过来，画面自动铺满。</span>'
      +'<button data-landhint-close aria-label="关闭提示">×</button>';
    document.body.appendChild(el);
    /* 小 chip 6 秒后自动收起，不长期占位置 */
    setTimeout(hideLandHint,6000);
  }""",
"""  function showLandHint(){
    let el=document.getElementById('landHint');
    if(el){el.style.display='flex';return;}
    el=document.createElement('div');el.id='landHint';
    el.setAttribute('role','status');
    /* v2.6：常驻，不自动消失。之前 6 秒收起后用户就找不到退出入口了，
       这正是「还换不回去」的一半原因。放进 #app 才能跟着旋转画布一起转。 */
    el.innerHTML='<b>横向画布</b>'
      +'<span>已把画面转成横向，把手机横过来看；网页改不了系统方向。</span>'
      +'<button data-land-exit class="lh-exit" aria-label="退出横屏，回到竖向布局">退出横屏</button>'
      +'<button data-landhint-close aria-label="收起这条说明">×</button>';
    (document.getElementById('app')||document.body).appendChild(el);
  }""",'常驻退出条')

old="""  function applyLandscape(on,manual){
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
    /* 文案不再假装「已旋转」，只说布局已切。
       say() 是 onViewClick 内部的局部函数，这里在模块层，必须走 a11y 播报。 */
    if(W.a11y&&W.a11y.announce)
      W.a11y.announce('已切横向布局：舞台铺开、选项并排。手机若锁了竖屏，'
        +'网页改不了系统方向，关闭竖屏锁定后横过来即可自动适配。');
  }"""
new="""  function applyLandscape(on,manual){
    if(manual)LAND_MANUAL=1;
    LANDSCAPE=on?1:0;
    ROT90=wantRot90();
    applyDisplay();syncLandBtn();
    /* v2.6：退出时补两件以前漏掉的清理 —— 提前 return 把这两行跳过了，
       结果布局切回竖屏但页面还卡在全屏/方向锁里，用户就是「换不回去」。 */
    try{
      if(document.fullscreenElement&&document.exitFullscreen)
        document.exitFullscreen().catch(()=>{});
      const o=window.screen&&window.screen.orientation;
      if(o&&o.unlock)o.unlock();
    }catch(e){}
    if(!on){
      hideLandHint();
      if(W.a11y&&W.a11y.announce)W.a11y.announce('已退出横屏，回到竖向布局');
      return;
    }
    showLandHint();
    /* 不再请求全屏、不再 lock 系统方向：v2.6 用 CSS 旋转画布，
       不依赖系统授权，也就不会留下「退不出去」的副作用。 */
    if(W.a11y&&W.a11y.announce)
      W.a11y.announce(ROT90
        ?'已切横向画布：画面已转成横向，把手机横过来看；点「退出横屏」可还原。'
        :'已切横向布局：舞台铺满、选项在左、立绘在右；点「退出横屏」可还原。');
  }"""
assert old in s,'ui.js 缺 applyLandscape 原文'
s=s.replace(old,new,1);print(' ok applyLandscape')

old="""  function watchOrientation(){
    if(!window.matchMedia)return;
    const mq=window.matchMedia('(orientation: landscape)');
    const onChange=()=>{
      if(LAND_MANUAL)return;
      if(mq.matches&&!LANDSCAPE){LANDSCAPE=1;applyDisplay();}
      else if(!mq.matches&&LANDSCAPE){LANDSCAPE=0;applyDisplay();hideLandHint();}
    };
    if(mq.addEventListener)mq.addEventListener('change',onChange);
    else if(mq.addListener)mq.addListener(onChange);
  }"""
new="""  function watchOrientation(){
    /* v2.6：不再自动替用户开/关横屏（那也会造成「我没点怎么变了」的困惑）。
       只在横屏已开启时，按物理方向重算是否还需要旋转画布：
       手机真横过来 → 去掉 rot90，用原生横向布局；转回竖屏 → 重新旋成横向。 */
    const onChange=()=>{
      if(!LANDSCAPE)return;
      const want=wantRot90();
      if(want!==ROT90){ROT90=want;applyDisplay();syncLandBtn();
        if(W.a11y&&W.a11y.announce)
          W.a11y.announce(want?'手机竖着，已把画面转成横向':'手机已横过来，画布已转正');}
    };
    if(window.matchMedia){
      const mq=window.matchMedia('(orientation: landscape)');
      if(mq.addEventListener)mq.addEventListener('change',onChange);
      else if(mq.addListener)mq.addListener(onChange);
    }
    window.addEventListener('resize',onChange);   /* 有些 WebView 只给 resize */
    window.addEventListener('orientationchange',onChange);
  }"""
assert old in s,'ui.js 缺 watchOrientation 原文'
s=s.replace(old,new,1);print(' ok watchOrientation')

U("""    r.classList.toggle('landscape',LANDSCAPE===1);
    r.classList.toggle('bgfull',STSIZE==='immersive');""",
"""    r.classList.toggle('landscape',LANDSCAPE===1);
    r.classList.toggle('rot90',ROT90===1);
    r.classList.toggle('bgfull',STSIZE==='immersive');""",'applyDisplay 加 rot90')

# stageTools 横屏键带 on 状态
U("""    return btn('landscape','▭','横屏布局')
      +'<button class="vgear'""",
"""    return '<button class="vbtn vland'+(LANDSCAPE?' on':'')+'" data-view="landscape" '
      +'aria-label="'+(LANDSCAPE?'退出横屏，回到竖向布局':'切换横向布局')+'" '
      +'title="'+(LANDSCAPE?'退出横屏':'横屏布局')+'" '
      +'aria-pressed="'+(LANDSCAPE?'true':'false')+'">'+(LANDSCAPE?'▯':'▭')+'</button>'
      +'<button class="vgear'""",'横屏键 toggle 化')

# 事件：退出按钮、Esc
U("""    const lhc=ev.target.closest&&ev.target.closest('[data-landhint-close]');
    if(lhc){hideLandHint();return;}""",
"""    const lex=ev.target.closest&&ev.target.closest('[data-land-exit]');
    if(lex){applyLandscape(false,true);return;}
    const lhc=ev.target.closest&&ev.target.closest('[data-landhint-close]');
    if(lhc){hideLandHint();return;}""",'退出按钮事件')

U("""    /* v2.4：手机真的横过来时自动适配；减少动效下不排待机表演 */
    watchOrientation();""",
"""    /* v2.4：手机真的横过来时自动适配；减少动效下不排待机表演 */
    watchOrientation();
    /* v2.6：Esc 永远能退出横屏，不依赖找得到那颗小按钮 */
    document.addEventListener('keydown',e=>{
      if(e.key==='Escape'&&LANDSCAPE){applyLandscape(false,true);}
    });""",'Esc 退出')
open(p,'w',encoding='utf8').write(s);print('ui.js 完成')

# ---------------- style.css ----------------
p=os.path.join(ROOT,'src','style.css');s=open(p,encoding='utf8').read()
# 排除 #landHint，否则放进 #app 后会被隐藏
s=s.replace("""html.landscape #app > *:not(.panel):not(.stage):not(.pchip):not(.artwrap){display:none!important}""",
"""html.landscape #app > *:not(.panel):not(.stage):not(.pchip):not(.artwrap):not(#landHint){display:none!important}""",1)
s+="""
/* ==================================================================
   v2.6 物理竖屏下的「真横向画布」
   网页改不了手机系统方向，那就把整个游戏容器转 90deg：
   容器宽=屏幕长边、高=短边，旋转后正好铺满竖屏视口。
   用户把手机横过来看到的就是正的横向画面；再转回竖屏会自动重旋。
   transform 会创建包含块，内部所有 position:fixed 自动相对旋转容器，
   所以只需把 v2.5 那套 vw/dvh 换成百分比，命中测试由浏览器负责。
   ================================================================== */
html.landscape.rot90 #app{position:fixed!important;left:0!important;top:0!important;
  right:auto!important;bottom:auto!important;
  width:100dvh!important;height:100dvw!important;
  max-width:none!important;margin:0!important;padding:0!important;
  transform-origin:0 0;
  transform:rotate(90deg) translateY(-100%)!important;
  z-index:3;overflow:hidden;pointer-events:none}
html.landscape.rot90 .stage{width:100%!important;height:100%!important;
  left:0!important;top:0!important;right:auto!important;bottom:auto!important}
html.landscape.rot90 .stage-char,
html.landscape.rot90.avg .stage-char{right:2%!important;bottom:2%!important;
  left:auto!important;top:auto!important;
  height:82%!important;max-width:46%!important;
  transform:translate(var(--char-dx,0px),var(--char-dy,0px))!important}
html.landscape.rot90 .stage .bubble{left:2%!important;right:52%!important;
  top:2%!important;bottom:auto!important;max-height:9%!important}
html.landscape.rot90 .stage-tools{top:2%!important;right:1.5%!important;
  left:auto!important;max-width:46%!important}
html.landscape.rot90 #app > .panel.on{left:2%!important;top:13%!important;
  bottom:9%!important;width:47%!important;right:auto!important}
html.landscape.rot90 .tabs{left:0!important;right:0!important;bottom:0!important;
  top:auto!important;height:9%!important;min-height:34px}
html.landscape.rot90 .pchip{right:2%!important;left:auto!important;
  width:44%!important;top:9%!important;bottom:auto!important}
html.landscape.rot90 .pchip.open .pchip-detail{right:2%!important;left:auto!important;width:44%!important}
html.landscape.rot90 #landHint{position:absolute!important;
  right:2%!important;left:auto!important;top:auto!important;bottom:11%!important;
  width:44%!important;max-width:44%!important;
  padding:5px 8px!important;font-size:10px!important;line-height:1.4!important;
  pointer-events:auto!important;z-index:101}
/* 横屏键已开启时高亮，用户一眼知道「再点这里退出」 */
.vland.on{background:#fff3cf!important;border-color:var(--gold)!important;
  color:#6a4d16!important;box-shadow:0 0 0 2px rgba(190,150,60,.35)}
#landHint .lh-exit{flex:none;pointer-events:auto;
  background:#c8a55a!important;color:#2b2218!important;
  border:1px solid #a8863f!important;border-radius:7px;
  padding:5px 10px!important;font-size:11px!important;font-weight:700}
html.skin-dark #landHint .lh-exit{background:#b9974f!important;color:#241a10!important}
"""
open(p,'w',encoding='utf8').write(s);print('style.css 完成')
