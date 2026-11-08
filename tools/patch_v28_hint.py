# -*- coding: utf-8 -*-
"""v2.8：横向画布提示条三档可换、可关、可拖、可透；默认精简。"""
import os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
p = os.path.join(ROOT, 'src', 'ui.js')
s = open(p, encoding='utf8').read()


def U(a, b, tag, cnt=1):
    global s
    assert a in s, '缺 ' + tag
    s = s.replace(a, b, cnt)
    print(' ok', tag)


# 1) 状态与 helper
U("""  let SPLIT=47,FLIP=0,TAP_N=0,SPLITDRAG=null,GUIDET=null;""",
  """  let SPLIT=47,FLIP=0,TAP_N=0,SPLITDRAG=null,GUIDET=null;
  /* v2.8 横向画布提示条：三档（完整 / 精简 / 隐藏）、跟随画布、
     位置可拖。只改本机显示，不进存档、不进分享串。 */
  let HINTMODE='min',HINTFOLLOW=0,HINTPOS={x:0,y:0},HINTDRAG=null;
  try{
    const hv=JSON.parse(localStorage.getItem('wqn.hint')||'{}');
    if(['full','min','off'].indexOf(hv.mode)>=0)HINTMODE=hv.mode;
    if(hv.follow===1)HINTFOLLOW=1;
    if(typeof hv.x==='number'&&typeof hv.y==='number')
      HINTPOS={x:Math.max(-260,Math.min(260,Math.round(hv.x))),
               y:Math.max(-600,Math.min(600,Math.round(hv.y)))};
  }catch(e){}
  function saveHint(){
    try{localStorage.setItem('wqn.hint',JSON.stringify(
      {mode:HINTMODE,follow:HINTFOLLOW,x:HINTPOS.x,y:HINTPOS.y}));}catch(e){}
  }
  function applyHint(){
    const r=document.documentElement;
    r.classList.remove('hint-full','hint-min','hint-off','hint-follow');
    r.classList.add('hint-'+HINTMODE);
    if(HINTFOLLOW)r.classList.add('hint-follow');
    r.style.setProperty('--lh-dx',-HINTPOS.x+'px');
    r.style.setProperty('--lh-dy',-HINTPOS.y+'px');
    /* 跟随画布时移进旋转容器，否则固定在视口（永远正着、够大、点得中） */
    const el=document.getElementById('landHint'),app=$('app');
    if(el&&app){
      const want=(HINTFOLLOW&&ROT90);
      if(want&&el.parentElement!==app)app.appendChild(el);
      if(!want&&el.parentElement!==document.body)document.body.appendChild(el);
    }
    document.querySelectorAll('[data-hint-mode]').forEach(b=>{
      b.classList.toggle('on',b.getAttribute('data-hint-mode')===HINTMODE);
      b.setAttribute('aria-pressed',b.getAttribute('data-hint-mode')===HINTMODE?'true':'false');
    });
    const f=document.querySelector('[data-hint-follow]');
    if(f){f.classList.toggle('on',!!HINTFOLLOW);
      f.setAttribute('aria-pressed',HINTFOLLOW?'true':'false');}
  }""",
  '状态与 applyHint')

# 2) rotChrome/unrotChrome 里 landHint 服从 HINTFOLLOW
U("""    const hint=document.getElementById('landHint');
    if(hint&&hint.parentElement!==app)app.appendChild(hint);
  }""",
  """    const hint=document.getElementById('landHint');
    if(hint&&HINTFOLLOW&&hint.parentElement!==app)app.appendChild(hint);
  }""",
  'rotChrome')

U("""    ['tabs','landHint'].forEach(id=>{
      const e=document.getElementById(id);
      if(e&&app&&e.parentElement===app)body.appendChild(e);
    });""",
  """    ['tabs','landHint'].forEach(id=>{
      const e=document.getElementById(id);
      if(e&&app&&e.parentElement===app)body.appendChild(e);
    });
    applyHint();""",
  'unrotChrome')

# 3) showLandHint 重写：三档 + 拖柄 + 复位
U("""  function showLandHint(){
    let el=document.getElementById('landHint');
    if(el){el.style.display='flex';return;}
    el=document.createElement('div');el.id='landHint';
    el.setAttribute('role','status');
    /* v2.6：常驻，不自动消失。之前 6 秒收起后用户就找不到退出入口了，
       这正是「还换不回去」的一半原因。放进 #app 才能跟着旋转画布一起转。 */
    el.innerHTML='<b>横向画布</b>'
      +'<span>已把画面转成横向，把手机横过来看；网页改不了系统方向。</span>'
      +'<button data-land-exit class="lh-exit" aria-label="退出横屏，回到竖向布局">退出横屏</button>';
    /* v2.6：退出条固定在视口、不跟随画布旋转，所以永远正着、够大、点得中。
       挂在 body 也不会被 render() 的 app.innerHTML 重绘冲掉。 */
    (ROT90&&$('app')?$('app'):document.body).appendChild(el);
  }""",
  """  function showLandHint(){
    if(HINTMODE==='off'){
      const old=document.getElementById('landHint');
      if(old&&old.parentNode)old.parentNode.removeChild(old);
      applyHint();return;
    }
    let el=document.getElementById('landHint');
    if(!el){
      el=document.createElement('div');el.id='landHint';
      el.setAttribute('role','status');
      /* v2.8：三档可换、拖柄可移动；常驻不自动消失，退出口永远在。
         精简档默认，竖着拿手机时不再是一整块竖排说明。 */
      el.innerHTML='<b>横向画布</b>'
        +'<span class="lh-note">已把画面转成横向，把手机横过来看；网页改不了系统方向。</span>'
        +'<span class="lh-grip" data-hint-drag aria-label="按住拖动提示条" title="按住拖动">⠿</span>'
        +'<button data-land-exit class="lh-exit" aria-label="退出横屏，回到竖向布局">退出横屏</button>';
    }
    el.style.display='';
    const want=(HINTFOLLOW&&ROT90&&$('app'))?$('app'):document.body;
    if(el.parentElement!==want)want.appendChild(el);
    applyHint();
  }""",
  'showLandHint 重写')

# 4) applyLandscape / watchOrientation 里同步 applyHint
U("""    if(ROT90)rotChrome();else unrotChrome();
    applySplit();
    applyDisplay();syncLandBtn();""",
  """    if(ROT90)rotChrome();else unrotChrome();
    applySplit();applyHint();
    applyDisplay();syncLandBtn();""",
  'applyLandscape applyHint')

U("""      if(want!==ROT90){ROT90=want;if(ROT90)rotChrome();else unrotChrome();
        applyDisplay();syncLandBtn();""",
  """      if(want!==ROT90){ROT90=want;if(ROT90)rotChrome();else unrotChrome();
        applyHint();applyDisplay();syncLandBtn();""",
  'watchOrientation applyHint')

# 5) render 两处补建后同步 hint
s = s.replace('app.innerHTML=h;if(ROT90)rotChrome();',
              'app.innerHTML=h;if(ROT90)rotChrome();applyHint();', 2)
print(' ok render 两处 applyHint')

# 6) pointerdown：提示条拖柄（放在气泡手柄之前）
U("""      /* 气泡拖拽 / 缩放手柄 */""",
  """      /* v2.8 提示条拖柄：左右不出屏，上下不限但至少留一截可见 */
      const hgrip=t&&t.closest&&t.closest('[data-hint-drag]');
      if(hgrip){
        const el=document.getElementById('landHint');if(!el)return;
        HINTDRAG={el:el,x:e.clientX,y:e.clientY,x0:HINTPOS.x,y0:HINTPOS.y};
        hgrip.classList.add('on');
        try{hgrip.setPointerCapture(e.pointerId);}catch(err){}
        return;
      }
      /* 气泡拖拽 / 缩放手柄 */""",
  'pointerdown 提示拖柄')

# 7) pointermove：提示条拖动（旋转换算）
U("""    document.addEventListener('pointermove',e=>{
      if(SPLITDRAG){""",
  """    document.addEventListener('pointermove',e=>{
      if(HINTDRAG){
        const d=rotDelta(e.clientX-HINTDRAG.x,e.clientY-HINTDRAG.y);
        const vw=window.innerWidth||390,vh=window.innerHeight||844;
        HINTPOS.x=Math.max(-vw/2+56,Math.min(vw/2-56,HINTDRAG.x0+d.u));
        HINTPOS.y=Math.max(-vh+56,Math.min(vh-56,HINTDRAG.y0+d.v));
        applyHint();return;
      }
      if(SPLITDRAG){""",
  'pointermove 提示拖动')

# 8) endDrag 清理
U("""    const endDrag=()=>{
      clearTimeout(LONGT);clearTimeout(SPLONGT);
      if(SPLITDRAG){""",
  """    const endDrag=()=>{
      clearTimeout(LONGT);clearTimeout(SPLONGT);
      if(HINTDRAG){
        const g=HINTDRAG.el.querySelector('[data-hint-drag]');
        if(g)g.classList.remove('on');
        HINTDRAG=null;saveHint();return;
      }
      if(SPLITDRAG){""",
  'endDrag 提示清理')

# 9) input：透明度滑杆已存在，无需新增；加设置页事件委托
U("""    const b=ev.target.closest('[data-view],[data-stage-size],[data-bubble-alpha],'
      +'[data-setmin],[data-fold],[data-guide],[data-landscape],'
      +'[data-flip],[data-split-reset]');""",
  """    const b=ev.target.closest('[data-view],[data-stage-size],[data-bubble-alpha],'
      +'[data-setmin],[data-fold],[data-guide],[data-landscape],'
      +'[data-flip],[data-split-reset],'
      +'[data-hint-mode],[data-hint-follow],[data-hint-reset]');""",
  'onViewClick 选择器')

U("""    if(d.flip!==undefined){""",
  """    if(d.hintMode!==undefined){
      HINTMODE=d.hintMode;saveHint();
      if(LANDSCAPE)showLandHint();else applyHint();
      render();return;
    }
    if(d.hintFollow!==undefined){
      HINTFOLLOW=HINTFOLLOW?0:1;saveHint();applyHint();
      if(LANDSCAPE)showLandHint();render();return;
    }
    if(d.hintReset!==undefined){
      HINTPOS={x:0,y:0};HINTMODE='min';HINTFOLLOW=0;
      saveHint();applyHint();if(LANDSCAPE)showLandHint();render();return;
    }
    if(d.flip!==undefined){""",
  'onViewClick 提示分支')

# 10) 设置页新卡片
U("""    /* ===== v1.5 舞 台 · 哈 士 喵 ===== */""",
  """    /* ===== v2.8 横 向 画 布 · 提 示 条 ===== */
    h+='<div class="card"><div class="tagline">横 向 画 布 · 提 示 条</div>'
      +'<div class="mini">竖着拿手机时，那一整块说明会被转成竖排大字。'
      +'这里可换样式、关掉、拖动，底色透明度跟随「所有气泡 / 弹窗 底色」。</div>'
      +'<div class="switchrow"><span>提示样式</span><div class="viewsel">'
      +'<button data-hint-mode="min" class="'+(HINTMODE==='min'?'on':'')+'">精简（推荐）</button>'
      +'<button data-hint-mode="full" class="'+(HINTMODE==='full'?'on':'')+'">完整说明</button>'
      +'<button data-hint-mode="off" class="'+(HINTMODE==='off'?'on':'')+'">隐藏</button></div></div>'
      +'<div class="switchrow"><span>跟随画布旋转</span><div class="viewsel">'
      +'<button data-hint-follow="1" class="'+(HINTFOLLOW?'on':'')+'">'
      +(HINTFOLLOW?'已跟随':'固定在屏幕')+'</button>'
      +'<button data-hint-reset class="pill">复位</button></div></div>'
      +'<div class="mini" style="margin-top:6px">按住提示条上的 ⠿ 可拖动，左右不出屏；'
      +'选「隐藏」后仍可点工具条 ▯ 或按 Esc 退出横屏，不会换不回去。'
      +'这些只存本机，不进存档与分享串。</div></div>';

    /* ===== v1.5 舞 台 · 哈 士 喵 ===== */""",
  '设置页提示条卡片')

# 11) boot 应用一次
U("""    watchOrientation();
    applySplit();""",
  """    watchOrientation();
    applySplit();applyHint();""",
  'boot applyHint')

open(p, 'w', encoding='utf8').write(s)
print('ui.js v2.8 提示条补丁完成')
