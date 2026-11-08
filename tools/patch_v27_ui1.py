# -*- coding: utf-8 -*-
"""v2.7 ui.js 补丁 1：左右分栏状态、统一旋转 chrome、向导台词、tapChar"""
import os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
p = os.path.join(ROOT, 'src', 'ui.js')
s = open(p, encoding='utf8').read()


def U(a, b, tag, cnt=1):
    global s
    assert a in s, '缺 ' + tag
    s = s.replace(a, b, cnt)
    print(' ok', tag)


# 1) 状态与 helper，插在 charEl 之前
U("  function charEl(){return document.querySelector('.stage-char');}",
  r"""  /* ---------- v2.7 横向画布：左右分栏 / 统一旋转 / 向导台词 ---------- */
  let SPLIT=47,FLIP=0,TAP_N=0,SPLITDRAG=null,GUIDET=null;
  try{
    const sv=JSON.parse(localStorage.getItem('wqn.split')||'{}');
    if(typeof sv.split==='number')SPLIT=Math.max(35,Math.min(65,Math.round(sv.split)));
    if(sv.flip===1)FLIP=1;
  }catch(e){}
  function saveSplit(){
    try{localStorage.setItem('wqn.split',JSON.stringify({split:SPLIT,flip:FLIP}));}catch(e){}
  }
  function applySplit(){
    const r=document.documentElement;
    r.style.setProperty('--split',SPLIT);
    r.classList.toggle('stage-flip',FLIP===1);
    const lab=document.querySelector('[data-split-val]');
    if(lab)lab.textContent=SPLIT+'%';
    const f=document.querySelector('[data-flip]');
    if(f)f.setAttribute('aria-pressed',FLIP?'true':'false');
  }
  /* rot90 时把 body 级的页签与退出条移入旋转容器：横过来看全部正着，
     不再出现「一半正一半倒」。render 的 innerHTML 会冲掉它们，故每次重绘后补建。 */
  function rotChrome(){
    const app=$('app');if(!app)return;
    let tabs=document.getElementById('tabs');
    if(!tabs){tabs=document.createElement('div');tabs.id='tabs';tabs.className='tabs';
      tabs.setAttribute('role','tablist');}
    if(tabs.parentElement!==app)app.appendChild(tabs);
    const hint=document.getElementById('landHint');
    if(hint&&hint.parentElement!==app)app.appendChild(hint);
  }
  function unrotChrome(){
    const app=$('app'),body=document.body;
    ['tabs','landHint'].forEach(id=>{
      const e=document.getElementById(id);
      if(e&&app&&e.parentElement===app)body.appendChild(e);
    });
  }
  /* CSS rotate(90deg)：容器水平 u = 屏幕 Δy，容器垂直 v = -屏幕 Δx。
     不换算的话手指往右拖、猫却往上下跑，就是 iPhone 上「难拖动」的主因。 */
  function rotDelta(dx,dy){return ROT90?{u:dy,v:-dx}:{u:dx,v:dy};}
  function guideLines(){return (D.character&&D.character.guideLines)||{};}
  function showGuideLine(){
    const G=guideLines();
    let S={};try{S=(E&&E.state)?E.state():{};}catch(e){}
    let g='idle';
    if(TAB==='fam')g='fam';
    else if(TAB==='log'||TAB==='vol')g='vol';
    else if(['volume','ending','scroll','turnover','realend'].indexOf(S.phase)>=0)g='vol';
    else if(document.querySelector('.stage[data-weather="rain"],.stage[data-weather="sun"]'))g='weather';
    else if(document.querySelector('.panel.on .quiz,.panel.on .readq'))g='read';
    else if(document.querySelector('.panel.on .opt .gain,.panel.on .opt .g'))g='work';
    const arr=(G[g]&&G[g].length)?G[g]:(G.idle||[]);
    if(!arr.length)return;
    const item=arr[(TAP_N++)%arr.length];
    const el=document.getElementById('guideBubble');
    if(el){
      el.textContent=item.t;
      el.classList.remove('show');void el.offsetWidth;el.classList.add('show');
      clearTimeout(GUIDET);
      GUIDET=setTimeout(()=>{if(el.isConnected)el.classList.remove('show');},3200);
    }
    /* 语音包接口：entries[id] 命中就交给 W.guideVoice；否则朗读开启时代念，再否则只出短音。
       后续把语音按 id 内嵌进 voicePack.entries 并置 enabled=true 即可，无需改界面。 */
    const VP=(D.character&&D.character.voicePack)||{};
    const src=VP.entries&&VP.entries[item.voice];
    if(VP.enabled&&src&&W.guideVoice&&W.guideVoice.play){
      try{W.guideVoice.play(item.voice,src,item.t);}catch(e){}
    }else if(W.a11y&&W.a11y.status&&W.a11y.status().read&&W.a11y.speak){
      try{W.a11y.speak(item.t);}catch(e){}
    }
    if(W.a11y&&W.a11y.announce)W.a11y.announce('向导：'+item.t);
  }
  function charEl(){return document.querySelector('.stage-char');}""",
  '状态与 helper')

# 2) 点猫出一句台词
U("""  function tapChar(){
    vibe(18);""",
  """  function tapChar(){
    vibe(18);showGuideLine();""",
  'tapChar 台词')

# 3) showLandHint 挂到旋转容器
U("""    document.body.appendChild(el);
  }
  function hideLandHint(){""",
  """    (ROT90&&$('app')?$('app'):document.body).appendChild(el);
  }
  function hideLandHint(){""",
  'showLandHint 目标')

# 4) applyLandscape：进出时搬 chrome
U("""    ROT90=wantRot90();
    applyDisplay();syncLandBtn();""",
  """    ROT90=wantRot90();
    if(ROT90)rotChrome();else unrotChrome();
    applySplit();
    applyDisplay();syncLandBtn();""",
  'applyLandscape chrome')

# 5) 物理方向翻转时同步搬 chrome
U("""      if(want!==ROT90){ROT90=want;applyDisplay();syncLandBtn();""",
  """      if(want!==ROT90){ROT90=want;if(ROT90)rotChrome();else unrotChrome();
        applyDisplay();syncLandBtn();""",
  'watchOrientation chrome')

# 6) render 两处 innerHTML 之后补建
assert s.count('app.innerHTML=h;') == 2, 'innerHTML 写入点数量异常'
s = s.replace('app.innerHTML=h;', 'app.innerHTML=h;if(ROT90)rotChrome();', 2)
print(' ok render 两处补建')

open(p, 'w', encoding='utf8').write(s)
print('ui.js 补丁 1 完成')
