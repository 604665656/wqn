# -*- coding: utf-8 -*-
"""v1.9：场景可选 + 进度解锁、皮肤跟随系统、人物点击拖动动画、选项表演、关卡紧凑与已通关折叠。"""
import os
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
p=os.path.join(ROOT,'src','ui.js');s=open(p,encoding='utf8').read()
def R(old,new,tag,cnt=1):
    global s
    assert old in s,'ui.js 缺 '+tag;s=s.replace(old,new,cnt);print(' ok',tag)

R("""  let VEIL=35,AVGON=1;
  const PRESET={light:15,veil:35,normal:60,solid:95};""",
"""  let VEIL=35,AVGON=1,SKIN='auto';
  const PRESET={light:15,veil:35,normal:60,solid:95};
  /* v1.9：皮肤默认跟随系统；已通关关卡只记在本机，不进存档／分享串／主随机数 */
  let PERFORMED=[],PERFSEED='',CHAROFF={x:0,y:0},PERFT=0,DRAG=null;
  try{const c=JSON.parse(localStorage.getItem('wqn.charoff')||'{}');
    CHAROFF={x:+c.x||0,y:+c.y||0};}catch(e){}
  function perfLoad(seed){
    if(seed===PERFSEED)return;
    PERFSEED=seed;PERFORMED=[];
    try{const raw=localStorage.getItem('wqn.done.'+seed);
      if(raw)PERFORMED=JSON.parse(raw)||[];}catch(e){}
  }
  function markDone(seed,key){
    perfLoad(seed);
    if(!key||PERFORMED.indexOf(key)>=0)return;
    PERFORMED.push(key);
    try{localStorage.setItem('wqn.done.'+seed,JSON.stringify(PERFORMED.slice(-200)));}catch(e){}
  }
  function uriOf(v){return Array.isArray(v)?v.join(''):String(v||'');}
  function charEl(){return document.querySelector('.stage-char');}
  function performLayer(k,ms){
    const ch=charEl();if(!ch||!W.stage)return;
    const u=W.stage.layerURL&&W.stage.layerURL(k);if(!u)return;
    if(!ch.dataset.base)ch.dataset.base=ch.src;
    ch.src=u;ch.classList.add('ch-perform');
    clearTimeout(PERFT);
    if(ms>0)PERFT=setTimeout(restoreChar,ms);
  }
  function restoreChar(){
    const ch=charEl();if(!ch)return;
    if(ch.dataset.base)ch.src=ch.dataset.base;
    ch.classList.remove('ch-perform');
  }
  function tapChar(){
    const ch=charEl();if(!ch)return;
    ch.classList.remove('ch-tap');void ch.offsetWidth;ch.classList.add('ch-tap');
    if(W.audio&&W.audio.guideCue)W.audio.guideCue('curious');
    if(W.stage){performLayer('happy',620);setTimeout(restoreChar,640);}
    setTimeout(()=>ch.classList.remove('ch-tap'),520);
  }
  function applyStageVisual(){
    const bg=document.querySelector('.stage-bg');
    if(bg&&W.stage&&W.stage.bgURL){
      const u=W.stage.bgURL();if(u&&bg.getAttribute('src')!==u)bg.setAttribute('src',u);
    }
  }""",'状态与互动函数')

# click 委托新分支
R("""    const pc=ev.target.closest&&ev.target.closest('[data-pchip]');""",
"""    const sk=ev.target.closest&&ev.target.closest('button[data-skin]');
    if(sk){SKIN=sk.dataset.skin;applyDisplay();render();return;}
    const bd=ev.target.closest&&ev.target.closest('button[data-backdrop]');
    if(bd){
      const ok=W.stage&&W.stage.set('backdrop',bd.dataset.backdrop);
      if(!ok){if(W.a11y&&W.a11y.announce)W.a11y.announce('这个场景还没到进度');return;}
      applyDisplay();render();return;
    }
    const lp=ev.target.closest&&ev.target.closest('button[data-layer-preview]');
    if(lp){performLayer(lp.dataset.layerPreview,900);return;}
    const pt=ev.target.closest&&ev.target.closest('[data-pat]');
    if(pt){tapChar();return;}
    const pc=ev.target.closest&&ev.target.closest('[data-pchip]');""",'click 新分支')

# applyDisplay 扩展
R("""    r.classList.toggle('minimal',minimalActive());
    r.style.setProperty('--veil',(VEIL/100).toFixed(2));""",
"""    r.classList.toggle('minimal',minimalActive());
    r.classList.toggle('skin-auto',SKIN==='auto');
    r.classList.toggle('skin-light',SKIN==='light');
    r.classList.toggle('skin-dark',SKIN==='dark');
    r.setAttribute('data-skin',SKIN);
    r.style.setProperty('--char-dx',CHAROFF.x+'px');
    r.style.setProperty('--char-dy',CHAROFF.y+'px');
    r.style.setProperty('--veil',(VEIL/100).toFixed(2));""",'applyDisplay 皮肤与偏移')

R("""    applySetCards();
    applyMinimal();
    applyAvg();
  }""",
"""    applySetCards();
    applyMinimal();
    applyAvg();
    applyStageVisual();
  }""",'applyStageVisual 调用')

# render 开头记录已表演关卡
R("""  function render(){
    const S=E.state(),app=$('app');
    if(!S){renderStart(app);return;}""",
"""  function render(){
    const S=E.state(),app=$('app');
    if(!S){renderStart(app);return;}
    /* 已通关：只按本局种子记在本机，用于设置页把打过的关卡折到最后 */
    if(W.stage){
      try{const w=W.stage.weatherOf(S),p=W.stage.poseOf(S,w,{});
        if(p&&p.scene)markDone(S.seed,p.scene);}catch(e){}
    }""",'render 记录已通关')

# 设置页：视图卡加皮肤；随后新增场景卡与人物层卡
R("""      +'<div class="switchrow"><span>AVG 全屏舞台</span><div class="viewsel">'""",
"""      +'<div class="switchrow"><span>皮肤</span><div class="viewsel">'
        +'<button data-skin="auto" class="'+(SKIN==='auto'?'on':'')+'">跟随系统</button>'
        +'<button data-skin="light" class="'+(SKIN==='light'?'on':'')+'">暖纸</button>'
        +'<button data-skin="dark" class="'+(SKIN==='dark'?'on':'')+'">夜色</button></div></div>'
      +'<div class="mini" style="margin-top:4px">默认跟随系统深浅色；也可锁定暖纸或夜色。'
      +'AVG 全屏时皮肤会轻微调整背景板明暗，文字对比度始终优先。</div>'
      +'<div class="switchrow"><span>AVG 全屏舞台</span><div class="viewsel">'""",'视图卡皮肤')

R("""    /* ===== v1.5 表 演 关 卡 · 登 记 ===== */""",
"""    /* ===== v1.9 场 景 · 预 览 可 选 ===== */
    const BDL=SG&&SG.backdropList?SG.backdropList(S):[];
    const curBD=BDL.filter(x=>x.current)[0];
    h+='<div class="card"><div class="tagline">场 景 · 预 览 可 选</div>'
      +'<div class="mini">九张同画风背景板随进度开放。点缩略图直接换，'
      +'未到进度的写明条件、点了也不会切。当前：<b>'+esc(curBD?curBD.name:'素纸')+'</b>。</div>'
      +'<div class="bdgrid">'
      +BDL.map(x=>'<button class="bdpick'+(x.current?' on':'')+(x.unlocked?'':' locked')
        +'" data-backdrop="'+esc(x.key)+'"'+(x.unlocked?'':' aria-disabled="true"')
        +' aria-label="'+esc(x.name)+'：'+esc(x.unlocked?'可切换':x.needText)+'">'
        +'<img src="'+esc(uriOf(x.thumb))+'" alt="" aria-hidden="true">'
        +'<span>'+esc(x.name)+'</span><em>'+esc(x.unlocked?(x.current?'当前':'可切换'):x.needText)+'</em></button>').join('')
      +'</div>'
      +'<div class="mini" style="margin-top:6px">场景只是美术底色，不表示本局所在地域、'
      +'不改写史实、不进存档与分享串。</div></div>';

    /* ===== v1.9 人 物 · 表 演 层（随进度开放） ===== */
    const LL=SG&&SG.layerList?SG.layerList(S):[];
    const openL=LL.filter(x=>x.unlocked).length;
    h+='<div class="card"><div class="tagline">人 物 · 表 演 层</div>'
      +'<div class="mini">'+LL.length+' 层表演随进度开放，当前已开 '+openL+' 层。'
      +'点已开放的层看一次表演；未开放的写明条件。'
      +'游戏里自动表演仍按情境取层，不受这里的手工预览影响。</div>'
      +'<button class="pill" data-pat aria-label="拍拍向导，看一次小动画">✋ 拍拍向导</button>'
      +'<details class="layerlist"><summary>展开人物层 '+LL.length+' 项</summary>'
      +'<div class="layergrid">'
      +LL.map(x=>'<button class="lpick'+(x.unlocked?'':' locked')+'" data-layer-preview="'
        +esc(x.key)+'"'+(x.unlocked?'':' aria-disabled="true"')+'>'+esc(x.name)
        +'<em>'+esc(x.unlocked?'可预览':x.needText)+'</em></button>').join('')
      +'</div></details></div>';

    /* ===== v1.5 表 演 关 卡 · 登 记 ===== */""",'场景卡与人物层卡')

# 关卡表：紧凑 + 已通关折到最后
R("""    const scn=sg.scenes||[],readyN=sg.ready||0,lockN=sg.locked||0;
    let sceneRows='';
    scn.forEach(x=>{
      const ok=x.ready,tag=ok?'✓ 已就绪':'🔒 敬请期待';
      sceneRows+='<div class="scenerow'+(ok?'':' locked')+'"><b>'+esc(x.name)+'</b>'
        +'<span class="mini">'+esc(x.when)+'</span>'
        +'<em>'+tag+(ok?'':' · 缺 '+esc((x.missing||[]).join('／')))+'</em></div>';
    });""",
"""    const scn=sg.scenes||[],readyN=sg.ready||0,lockN=sg.locked||0;
    perfLoad(S.seed);
    let sceneRows='',doneRows='';
    scn.forEach(x=>{
      const ok=x.ready,tag=ok?'✓ 已就绪':'🔒 敬请期待';
      const row='<div class="scenerow'+(ok?'':' locked')+'"><b>'+esc(x.name)+'</b>'
        +'<span class="mini">'+esc(x.when)+'</span>'
        +'<em>'+tag+(ok?'':' · 缺 '+esc((x.missing||[]).join('／')))+'</em></div>';
      if(PERFORMED.indexOf(x.key)>=0)doneRows+=row;else sceneRows+=row;
    });""",'关卡行分组')

R("""      +'<details class="scenelist" data-scene-details><summary data-scene-open>'
      +'展开查看全部 '+scn.length+' 关</summary>'
      +'<template class="scene-tpl">'+sceneRows+'</template>'
      +'<div class="scene-host"></div></details></div>';""",
"""      +'<div class="mini" style="margin-top:4px">每行压成一行；本局已演过的关卡'
      +'折到最末尾，不占前面位置。</div>'
      +'<details class="scenelist" data-scene-details><summary data-scene-open>'
      +'展开查看待演 '+scn.filter(x=>PERFORMED.indexOf(x.key)<0).length+' 关</summary>'
      +'<template class="scene-tpl">'+sceneRows+'</template>'
      +'<div class="scene-host"></div></details>'
      +(doneRows?'<details class="scenedone"><summary>已通关 '
        +PERFORMED.filter(k=>scn.some(x=>x.key===k)).length+' 关 · 点开看</summary>'
        +doneRows+'</details>':'')
      +'</div>';""",'已通关折叠')

# document 监听：指针拖动 + 选项悬停表演
R("""  if(typeof document!=='undefined'){
    document.addEventListener('click',onViewClick);
    document.addEventListener('input',ev=>{""",
"""  if(typeof document!=='undefined'){
    document.addEventListener('click',onViewClick);
    /* 选项立绘表演：悬停／聚焦预览，点下保持一拍再收回 */
    const optAt=t=>{
      const o=t&&t.closest&&t.closest('.panel.on .opt[data-i]');
      if(!o)return null;
      let S=null;try{S=E.state&&E.state();}catch(e){}
      const opts=(S&&S.cur&&S.cur.opts)||[];
      return opts[+o.dataset.i]||null;
    };
    const showOpt=t=>{
      const it=optAt(t);if(!it||!W.stage)return;
      performLayer(W.stage.poseForOption(it),0);
    };
    ['mouseover','focusin'].forEach(ev=>document.addEventListener(ev,e=>showOpt(e.target),true));
    ['mouseout','focusout'].forEach(ev=>document.addEventListener(ev,e=>{
      const o=e.target&&e.target.closest&&e.target.closest('.panel.on .opt[data-i]');
      if(o)restoreChar();
    },true));
    document.addEventListener('click',e=>{
      const it=optAt(e.target);
      if(it&&W.stage)performLayer(W.stage.poseForOption(it),1000);
    },true);
    /* 人物点击与拖动：只用指针位移，不改游戏状态 */
    document.addEventListener('pointerdown',e=>{
      const ch=e.target&&e.target.closest&&e.target.closest('.stage-char');
      if(!ch)return;
      DRAG={el:ch,x:e.clientX,y:e.clientY,dx:CHAROFF.x,dy:CHAROFF.y,moved:false};
      ch.classList.add('ch-grab');
      try{ch.setPointerCapture(e.pointerId);}catch(err){}
    });
    document.addEventListener('pointermove',e=>{
      if(!DRAG)return;
      const dx=e.clientX-DRAG.x,dy=e.clientY-DRAG.y;
      if(Math.abs(dx)+Math.abs(dy)>4)DRAG.moved=true;
      CHAROFF.x=Math.max(-140,Math.min(140,DRAG.dx+dx));
      CHAROFF.y=Math.max(-120,Math.min(120,DRAG.dy+dy));
      const r=document.documentElement;
      r.style.setProperty('--char-dx',CHAROFF.x+'px');
      r.style.setProperty('--char-dy',CHAROFF.y+'px');
    });
    const endDrag=()=>{
      if(!DRAG)return;
      const ch=DRAG.el,moved=DRAG.moved;DRAG=null;
      if(ch){
        ch.classList.remove('ch-grab');
        if(moved){ch.classList.remove('ch-drop');void ch.offsetWidth;ch.classList.add('ch-drop');
          setTimeout(()=>ch.classList.remove('ch-drop'),420);}
        else tapChar();
      }
      try{localStorage.setItem('wqn.charoff',JSON.stringify(CHAROFF));}catch(e){}
    };
    document.addEventListener('pointerup',endDrag);
    document.addEventListener('pointercancel',endDrag);
    document.addEventListener('input',ev=>{""",'指针与选项监听')

# 开局说明补 v1.9
R("""      +'所有气泡与弹窗的底色浓淡在设置页一把滑杆调，默认 35%。</div>';""",
"""      +'所有气泡与弹窗的底色浓淡在设置页一把滑杆调，默认 35%。<br>'
      +'v1.9 起九张场景板与人物表演层随进度开放、点缩略图可换；'
      +'点一下向导或拖动它都有动画，选项悬停与选中也会换表演；'
      +'皮肤默认跟随系统，已通关关卡折到最后。</div>';""",'开局说明')

open(p,'w',encoding='utf8').write(s);print('ui.js 完成')
