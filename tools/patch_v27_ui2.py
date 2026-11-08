# -*- coding: utf-8 -*-
"""v2.7 ui.js 补丁 2：拖动优化（旋转坐标换算/热区/capture）、分栏滑杆与互换、boot"""
import os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
p = os.path.join(ROOT, 'src', 'ui.js')
s = open(p, encoding='utf8').read()


def U(a, b, tag, cnt=1):
    global s
    assert a in s, '缺 ' + tag
    s = s.replace(a, b, cnt)
    print(' ok', tag)


# ---------- pointerdown：分割条 + 猫专用热区 ----------
U("""        el.classList.add('bub-dragging');return;
      }
      /* 立绘本身不接指针，避免挡住教程卡、选项与工具条；改按坐标命中 */""",
  """        el.classList.add('bub-dragging');return;
      }
      /* v2.7 可拖分割条：调左右占比 */
      const sgrip=t&&t.closest&&t.closest('#splitGrip');
      if(sgrip){
        sgrip.classList.add('on');
        SPLITDRAG={el:sgrip,x:e.clientX,y:e.clientY,split0:SPLIT};
        document.documentElement.classList.add('dragging-char');
        try{sgrip.setPointerCapture(e.pointerId);}catch(err){}
        return;
      }
      /* v2.7 猫专用热区：命中明确 + touch-action:none + pointer capture，
         iOS 上手指不会被系统滚动手势抢走，也不再靠旋转后的 AABB 猜位置。 */
      const chit=t&&t.closest&&t.closest('#charHit');
      if(chit){
        const ch=charEl();if(!ch)return;
        DRAG={el:ch,x:e.clientX,y:e.clientY,dx:CHAROFF.x,dy:CHAROFF.y,
              moved:false,fromHit:1};
        ch.classList.add('ch-grab');
        document.documentElement.classList.add('dragging-char');
        try{chit.setPointerCapture(e.pointerId);}catch(err){}
        LONGFIRED=0;clearTimeout(LONGT);
        LONGT=setTimeout(()=>{
          if(!DRAG||DRAG.moved)return;
          LONGFIRED=1;DRAG=null;ch.classList.remove('ch-grab');
          document.documentElement.classList.remove('dragging-char');
          openPosePanel(e.clientX,e.clientY);
        },560);
        return;
      }
      /* 立绘本身不接指针，避免挡住教程卡、选项与工具条；改按坐标命中（竖屏兜底） */""",
  'pointerdown 新分支')

# ---------- pointermove：分栏拖动 + 旋转坐标换算 ----------
U("""    document.addEventListener('pointermove',e=>{
      if(SPDRAG){""",
  """    document.addEventListener('pointermove',e=>{
      if(SPLITDRAG){
        const d=rotDelta(e.clientX-SPLITDRAG.x,e.clientY-SPLITDRAG.y);
        const cw=ROT90?(window.innerHeight||844):(window.innerWidth||390);
        const delta=d.u/Math.max(1,cw)*100;
        SPLIT=Math.max(35,Math.min(65,Math.round(
          FLIP?SPLITDRAG.split0+delta:SPLITDRAG.split0-delta)));
        applySplit();return;
      }
      if(SPDRAG){""",
  'pointermove 分栏')

U("""      if(!DRAG)return;
      const dx=e.clientX-DRAG.x,dy=e.clientY-DRAG.y;
      if(Math.abs(dx)+Math.abs(dy)>4){DRAG.moved=true;clearTimeout(LONGT);}
      CHAROFF.x=Math.max(-140,Math.min(140,DRAG.dx+dx));
      CHAROFF.y=Math.max(-120,Math.min(120,DRAG.dy+dy));""",
  """      if(!DRAG)return;
      const dx=e.clientX-DRAG.x,dy=e.clientY-DRAG.y;
      if(Math.abs(dx)+Math.abs(dy)>(DRAG.fromHit?3:4)){DRAG.moved=true;clearTimeout(LONGT);}
      /* 旋转画布里必须把屏幕位移换成容器位移，否则拖起来跟手方向不对 */
      const rd=rotDelta(dx,dy);
      const limX=DRAG.fromHit?180:140,limY=DRAG.fromHit?150:120;
      CHAROFF.x=Math.max(-limX,Math.min(limX,DRAG.dx+rd.u));
      CHAROFF.y=Math.max(-limY,Math.min(limY,DRAG.dy+rd.v));""",
  'pointermove 猫拖动换算')

# ---------- endDrag 清理 ----------
U("""    const endDrag=()=>{
      clearTimeout(LONGT);clearTimeout(SPLONGT);
      if(SPDRAG){""",
  """    const endDrag=()=>{
      clearTimeout(LONGT);clearTimeout(SPLONGT);
      if(SPLITDRAG){
        SPLITDRAG.el.classList.remove('on');SPLITDRAG=null;
        document.documentElement.classList.remove('dragging-char');
        saveSplit();return;
      }
      if(SPDRAG){""",
  'endDrag 分栏清理')

U("""      if(!DRAG)return;
      const ch=DRAG.el,moved=DRAG.moved;DRAG=null;
      if(LONGFIRED){LONGFIRED=0;return;}""",
  """      if(!DRAG)return;
      const ch=DRAG.el,moved=DRAG.moved;DRAG=null;
      document.documentElement.classList.remove('dragging-char');
      if(LONGFIRED){LONGFIRED=0;return;}""",
  'endDrag 猫清理')

# ---------- input：分栏滑杆 ----------
U("""    document.addEventListener('input',ev=>{
      const br=ev.target&&ev.target.closest&&ev.target.closest('input[data-bub]');""",
  """    document.addEventListener('input',ev=>{
      const sp=ev.target&&ev.target.closest&&ev.target.closest('input[data-split]');
      if(sp){
        SPLIT=Math.max(35,Math.min(65,+sp.value||47));
        applySplit();saveSplit();return;
      }
      const br=ev.target&&ev.target.closest&&ev.target.closest('input[data-bub]');""",
  'input 分栏滑杆')

# ---------- onViewClick：互换与复位 ----------
U("""    const b=ev.target.closest('[data-view],[data-stage-size],[data-bubble-alpha],'
      +'[data-setmin],[data-fold],[data-guide],[data-landscape]');""",
  """    const b=ev.target.closest('[data-view],[data-stage-size],[data-bubble-alpha],'
      +'[data-setmin],[data-fold],[data-guide],[data-landscape],'
      +'[data-flip],[data-split-reset]');""",
  'onViewClick 选择器')

U("""    if(d.landscape!==undefined){""",
  """    if(d.flip!==undefined){
      FLIP=FLIP?0:1;applySplit();saveSplit();render();return;
    }
    if(d.splitReset!==undefined){
      SPLIT=47;FLIP=0;applySplit();saveSplit();render();return;
    }
    if(d.landscape!==undefined){""",
  'onViewClick 互换分支')

# ---------- 设置页新卡片 ----------
U("""    /* ===== v1.5 舞 台 · 哈 士 喵 ===== */""",
  """    /* ===== v2.7 横 向 画 布 · 左 右 分 栏 ===== */
    h+='<div class="card"><div class="tagline">横 向 画 布 · 左 右 分 栏</div>'
      +'<div class="mini">默认猫在左、字在右；滑杆调两侧占比，横屏时也能直接拖画面中间那条细线。'
      +'横着拿手机时页签、退出条、工具条与画面一起横向，不再一半正一半倒。</div>'
      +'<div class="switchrow"><span>文字区占比</span><div class="veilrow">'
      +'<input type="range" min="35" max="65" step="1" value="'+SPLIT+'" data-split '
      +'aria-label="横向画布文字区占比"><b data-split-val>'+SPLIT+'%</b></div></div>'
      +'<div class="switchrow"><span>左右互换</span><div class="viewsel">'
      +'<button data-flip="1" aria-pressed="'+(FLIP?'true':'false')+'" class="'+(FLIP?'on':'')+'">'
      +(FLIP?'字左猫右 · 当前':'一键互换')+'</button>'
      +'<button data-split-reset class="pill">复位</button></div></div>'
      +'<div class="mini">点哈士喵会多说一句，台词按情境分 7 组轮换；'
      +'语音包接口已留好，后续挂上条目即可发声，当前仍是文字气泡配合系统朗读。</div></div>';

    /* ===== v1.5 舞 台 · 哈 士 喵 ===== */""",
  '设置页新卡片')

# ---------- boot 里应用一次 ----------
U("""    watchOrientation();
    /* v2.6：Esc 永远能退出横屏，不依赖找得到那颗小按钮 */""",
  """    watchOrientation();
    applySplit();
    /* v2.6：Esc 永远能退出横屏，不依赖找得到那颗小按钮 */""",
  'boot applySplit')

open(p, 'w', encoding='utf8').write(s)
print('ui.js 补丁 2 完成')
