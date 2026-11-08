# -*- coding: utf-8 -*-
"""v2.0：全屏场景预览、天气音效可选且随进度解锁、震动反馈、长按选表情、
气泡拖拽/缩放与组件互斥、朗读可关、emoji 状态条与更紧凑布局。"""
import os
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
p=os.path.join(ROOT,'src','ui.js');s=open(p,encoding='utf8').read()
def R(old,new,tag,cnt=1):
    global s
    assert old in s,'ui.js 缺 '+tag
    s=s.replace(old,new,cnt);print(' ok',tag)

# ---------- 1. 状态与新函数 ----------
R("""  let PERFORMED=[],PERFSEED='',CHAROFF={x:0,y:0},PERFT=0,DRAG=null;
  try{const c=JSON.parse(localStorage.getItem('wqn.charoff')||'{}');
    CHAROFF={x:+c.x||0,y:+c.y||0};}catch(e){}""",
"""  let PERFORMED=[],PERFSEED='',CHAROFF={x:0,y:0},PERFT=0,DRAG=null;
  /* v2.0：震动反馈、场景音效手选、气泡自定义、长按表情、全屏预览 */
  let VIBE=1,WXSOUND='auto',BUBCFG={dx:0,dy:0,w:0,h:0},BUBDRAG=null,
      LONGT=0,LONGFIRED=0,POSEPANEL=null,PREVIEW=null,SPDRAG=null,SPOFF={x:0,y:0};
  try{const c=JSON.parse(localStorage.getItem('wqn.charoff')||'{}');
    CHAROFF={x:+c.x||0,y:+c.y||0};}catch(e){}
  try{const c=JSON.parse(localStorage.getItem('wqn.ui2')||'{}');
    VIBE=c.vibe===undefined?1:!!c.vibe;
    WXSOUND=c.wx||'auto';
    BUBCFG={dx:+c.dx||0,dy:+c.dy||0,w:+c.w||0,h:+c.h||0};}catch(e){}
  function saveUI2(){
    try{localStorage.setItem('wqn.ui2',JSON.stringify({
      vibe:VIBE?1:0,wx:WXSOUND,dx:BUBCFG.dx,dy:BUBCFG.dy,w:BUBCFG.w,h:BUBCFG.h}));}catch(e){}
  }
  function vibe(ms){
    if(!VIBE)return false;
    try{if(navigator.vibrate)return navigator.vibrate(ms||18);}catch(e){}
    return false;
  }
  function bubApply(){
    const r=document.documentElement;if(!r)return;
    r.style.setProperty('--bub-dx',BUBCFG.dx+'px');
    r.style.setProperty('--bub-dy',BUBCFG.dy+'px');
    r.style.setProperty('--bub-w',BUBCFG.w?BUBCFG.w+'px':'auto');
    r.style.setProperty('--bub-h',BUBCFG.h?BUBCFG.h+'px':'auto');
  }
  function bubReset(){BUBCFG={dx:0,dy:0,w:0,h:0};bubApply();saveUI2();}
  /* 场景／天气音效：与场景板共用一套进度解锁口径 */
  function wxList(S){
    const rows=((W.data.music||{}).bedUnlock)||[],SG=W.stage;
    return rows.map(x=>({key:x.key,name:x.name,note:x.note,need:x.need||null,
      needText:SG?SG.needText(x.need):'开局可用',
      unlocked:SG?SG.unlocked(x.need,SG.progress(S)):true,
      current:WXSOUND===x.key}));
  }
  /* 全屏原稿预览：大图就是当前选中的场景板，立绘可拖但不出方框 */
  function openPreview(key){
    const SG=W.stage;if(!SG||!SG.previewInfo)return;
    let S=null;try{S=E.state&&E.state();}catch(e){}
    const rows=SG.backdropList(S),
      row=rows.filter(x=>x.key===key&&x.unlocked)[0]
        ||rows.filter(x=>x.current)[0]||rows.filter(x=>x.unlocked)[0];
    if(!row)return;
    if(key&&row.unlocked)SG.set('backdrop',row.key,S);
    let el=document.getElementById('scenePreview');
    if(!el){el=document.createElement('div');el.id='scenePreview';
      el.className='sp-mask';document.body.appendChild(el);}
    el.innerHTML='<div class="sp-box">'
      +'<img class="sp-bg" alt="" aria-hidden="true">'
      +'<img class="sp-char" alt="向导立绘，按住拖动，不会拖出方框" aria-hidden="true">'
      +'<div class="sp-bar"><b>原稿预览 · '+esc(row.name)+'</b>'
      +'<span class="sp-keys">'+rows.filter(x=>x.unlocked).map(x=>
          '<button data-sp-key="'+esc(x.key)+'" class="'+(x.key===row.key?'on':'')+'">'
          +esc(x.name)+'</button>').join('')+'</span>'
      +'<button data-sp-close aria-label="关闭全屏预览">× 关闭</button></div>'
      +'<div class="sp-tip">按住立绘拖动，四周留边、不出方框；点上方场景名可换背景</div>'
      +'</div>';
    const bg=el.querySelector('.sp-bg'),ch=el.querySelector('.sp-char');
    if(bg)bg.src=SG.bgURL();
    if(ch)ch.src=SG.layerURL('neutral')||SG.layerURL(SG.status().scenes.length?'neutral':'neutral');
    SPOFF={x:0,y:0};if(ch)ch.style.transform='translate(0px,0px)';
    PREVIEW=row.key;
    if(W.a11y&&W.a11y.announce)W.a11y.announce('已全屏预览'+row.name);
  }
  function closePreview(){
    const el=document.getElementById('scenePreview');
    if(el&&el.parentNode)el.parentNode.removeChild(el);
    PREVIEW=null;
  }
  /* 长按立绘：弹出已解锁表演层供选 */
  function openPosePanel(cx,cy){
    const SG=W.stage;if(!SG)return;
    let S=null;try{S=E.state&&E.state();}catch(e){}
    const rows=(SG.layerList?SG.layerList(S):[]).filter(x=>x.unlocked);
    if(POSEPANEL&&POSEPANEL.parentNode)POSEPANEL.parentNode.removeChild(POSEPANEL);
    const el=document.createElement('div');el.className='pose-picker';
    const im=document.createElement('div');im.className='pp-inner';
    im.innerHTML='<div class="pp-head"><b>选个表情 · 已开放 '+rows.length+' 层</b>'
      +'<button data-pp-close aria-label="关闭表情选择">×</button></div>'
      +'<div class="pp-grid">'+rows.map(x=>
        '<button data-pose-pick="'+esc(x.key)+'">'+esc(x.name)+'</button>').join('')+'</div>'
      +'<div class="mini">长按立绘可随时叫出；选完自动演一拍。</div>';
    el.appendChild(im);document.body.appendChild(el);
    POSEPANEL=el;
    const r=im.getBoundingClientRect();
    im.style.left=Math.max(8,Math.min(window.innerWidth-r.width-8,cx-r.width/2))+'px';
    im.style.top=Math.max(8,Math.min(window.innerHeight-r.height-8,cy-40))+'px';
    vibe(14);
  }
  function closePosePanel(){
    if(POSEPANEL&&POSEPANEL.parentNode)POSEPANEL.parentNode.removeChild(POSEPANEL);
    POSEPANEL=null;
  }""",'状态与函数')

# ---------- 2. click 委托新增分支 ----------
R("""    const sk=ev.target.closest&&ev.target.closest('button[data-skin]');""",
"""    const zp=ev.target.closest&&ev.target.closest('[data-scene-preview]');
    if(zp){openPreview(zp.dataset.scenePreview);return;}
    const spc=ev.target.closest&&ev.target.closest('[data-sp-close]');
    if(spc){closePreview();return;}
    const spk=ev.target.closest&&ev.target.closest('[data-sp-key]');
    if(spk){
      const k=spk.dataset.spKey,SG=W.stage;
      let S=null;try{S=E.state&&E.state();}catch(e){}
      if(SG&&SG.set('backdrop',k,S)){applyDisplay();openPreview(k);}
      return;
    }
    const ppc=ev.target.closest&&ev.target.closest('[data-pp-close]');
    if(ppc){closePosePanel();return;}
    const ppp=ev.target.closest&&ev.target.closest('[data-pose-pick]');
    if(ppp){performLayer(ppp.dataset.posePick,1200);closePosePanel();vibe(12);return;}
    const vb=ev.target.closest&&ev.target.closest('[data-vibe]');
    if(vb){VIBE=+vb.dataset.vibe?1:0;saveUI2();applyDisplay();render();
      if(W.a11y&&W.a11y.announce)W.a11y.announce(VIBE?'已开震动反馈':'已关震动反馈');return;}
    const wxs=ev.target.closest&&ev.target.closest('[data-wx]');
    if(wxs){
      let S=null;try{S=E.state&&E.state();}catch(e){}
      const row=wxList(S).filter(x=>x.key===wxs.dataset.wx)[0];
      if(!row||!row.unlocked){if(W.a11y&&W.a11y.announce)
        W.a11y.announce('这段环境音还没到进度');return;}
      WXSOUND=wxs.dataset.wx;saveUI2();
      if(W.audio)W.audio.set('bed',WXSOUND==='auto'?'auto':WXSOUND);
      applyDisplay();render();
      if(W.a11y&&W.a11y.announce)W.a11y.announce('环境音已选'+row.name);return;
    }
    const br=ev.target.closest&&ev.target.closest('[data-bub-reset]');
    if(br){bubReset();render();
      if(W.a11y&&W.a11y.announce)W.a11y.announce('气泡位置与大小已复位');return;}
    const sk=ev.target.closest&&ev.target.closest('button[data-skin]');""",'click 新分支')

# ---------- 3. data-guide="say" 改为可关 ----------
R("""      if(d.guide==='say'){
        const ok=W.stage&&W.stage.speakLine&&W.stage.speakLine();
        say(ok?'正在用角色音色念这一句':'此浏览器暂不支持语音朗读');
      }else if(d.guide==='cue'){""",
"""      if(d.guide==='say'){
        const ax=W.a11y,was=ax&&ax.status?!!ax.status().speaking:false;
        const ok=W.stage&&W.stage.speakLine&&W.stage.speakLine();
        const now=ax&&ax.status?!!ax.status().speaking:false;
        say(now?'正在用角色音色念这一句，再点一次停止':
            (was?'已停止朗读':'此浏览器暂不支持语音朗读'));
        const btn=document.querySelector('.bubble-voice[data-guide="say"]');
        if(btn){btn.textContent=now?'停':'念';
          btn.setAttribute('aria-label',now?'停止朗读':'用角色音色念这句');
          btn.classList.toggle('speaking',!!now);}
        vibe(now?12:0);
      }else if(d.guide==='cue'){""",'朗读 toggle')

# ---------- 4. applyDisplay ----------
R("""    r.style.setProperty('--veil',(VEIL/100).toFixed(2));""",
"""    r.style.setProperty('--veil',(VEIL/100).toFixed(2));
    bubApply();""",'applyDisplay 气泡变量')

R("""    applyAvg();
    applyStageVisual();
  }""",
"""    applyAvg();
    applyStageVisual();
    /* v2.0：沉浸全屏铺的底图始终是当前选中场景，不残留旧板 */
    try{if(W.stage&&W.stage.bgURL){
      const u=W.stage.bgURL();if(u)r.style.setProperty('--stage-bg','url("'+u+'")');}}catch(e){}
  }""",'applyDisplay 同步全屏底图')

# ---------- 5. 场景卡：文案与放大角标 ----------
R("""      +'<div class="mini">九张同画风背景板随进度开放。点缩略图直接换，'
      +'未到进度的写明条件、点了也不会切。当前：<b>'+esc(curBD?curBD.name:'素纸')+'</b>。</div>'
      +'<div class="bdgrid">'
      +BDL.map(x=>'<button class="bdpick'+(x.current?' on':'')+(x.unlocked?'':' locked')
        +'" data-backdrop="'+esc(x.key)+'"'+(x.unlocked?'':' aria-disabled="true"')
        +' aria-label="'+esc(x.name)+'：'+esc(x.unlocked?'可切换':x.needText)+'">'
        +'<img src="'+esc(uriOf(x.thumb))+'" alt="" aria-hidden="true">'
        +'<span>'+esc(x.name)+'</span><em>'+esc(x.unlocked?(x.current?'当前':'可切换'):x.needText)+'</em></button>').join('')
      +'</div>'
      +'<div class="mini" style="margin-top:6px">场景只是美术底色，不表示本局所在地域、'
      +'不改写史实、不进存档与分享串。</div></div>';""",
"""      +'<div class="mini">'+BDL.length+' 张同画风背景板随进度开放。点缩略图直接换，'
      +'点右上 ⤢ 看全屏原稿；未到进度的写明条件、点了也不会切。'
      +'当前：<b>'+esc(curBD?curBD.name:'素纸')+'</b>。</div>'
      +'<div class="bdgrid">'
      +BDL.map(x=>'<button class="bdpick'+(x.current?' on':'')+(x.unlocked?'':' locked')
        +'" data-backdrop="'+esc(x.key)+'"'+(x.unlocked?'':' aria-disabled="true"')
        +' aria-label="'+esc(x.name)+'：'+esc(x.unlocked?'可切换':x.needText)+'">'
        +'<img src="'+esc(uriOf(x.thumb))+'" alt="" aria-hidden="true">'
        +(x.unlocked?'<span class="bdzoom" data-scene-preview="'+esc(x.key)+'" '
          +'aria-label="全屏预览'+esc(x.name)+'">⤢</span>':'')
        +'<span>'+esc(x.name)+'</span><em>'+esc(x.unlocked?(x.current?'当前':'可切换'):x.needText)+'</em></button>').join('')
      +'</div>'
      +'<div class="mini" style="margin-top:6px">全屏预览里能按住立绘拖动、不会拖出方框；'
      +'主页点「全屏」沉浸时铺满的也是当前选中这张。场景只是美术底色，'
      +'不表示本局所在地域、不改写史实、不进存档与分享串。</div></div>';""",'场景卡放大角标')

# ---------- 6. 设置页新卡 ----------
R("""    /* ===== v1.9 人 物 · 表 演 层（随进度开放） ===== */""",
"""    /* ===== v2.0 气 泡 · 摆 放 与 大 小 ===== */
    h+='<div class="card"><div class="tagline">气 泡 · 摆 放 与 大 小</div>'
      +'<div class="mini">气泡左上 ⠿ 按住拖动、右下角斜纹按住调宽高；'
      +'进度弹窗共用这组宽高。组件互斥：拖到工具条／速览／进度条上会自动让开；'
      +'左右始终留在屏内，上下不限（至少留一截可见，免得拖丢）。</div>'
      +'<div class="bubctl">'
      +'<label>宽 <input type="range" min="160" max="390" step="10" value="'+(BUBCFG.w||300)
        +'" data-bub="w"><b data-bub-val="w">'+(BUBCFG.w||'默认')+'</b></label>'
      +'<label>高 <input type="range" min="26" max="220" step="6" value="'+(BUBCFG.h||36)
        +'" data-bub="h"><b data-bub-val="h">'+(BUBCFG.h||'默认')+'</b></label>'
      +'<label>横 <input type="range" min="-160" max="160" step="4" value="'+BUBCFG.dx
        +'" data-bub="dx"><b data-bub-val="dx">'+BUBCFG.dx+'</b></label>'
      +'<label>纵 <input type="range" min="-260" max="260" step="4" value="'+BUBCFG.dy
        +'" data-bub="dy"><b data-bub-val="dy">'+BUBCFG.dy+'</b></label>'
      +'</div><button class="pill" data-bub-reset>复位气泡</button></div>';

    /* ===== v2.0 场 景 音 · 环 境 音（随进度解锁） ===== */
    const WXL=wxList(S),curWX=WXL.filter(x=>x.current)[0];
    h+='<div class="card"><div class="tagline">场 景 音 · 环 境 音</div>'
      +'<div class="mini">底噪不再只能「自动跟随天气」：这里可手选一段，'
      +'未到进度的写明条件、点了不会切。当前：<b>'+esc(curWX?curWX.name:'跟随天气')+'</b>。'
      +'手选后天气变化不再覆盖；选回「跟随天气」才自动切。</div>'
      +'<div class="wxgrid">'
      +WXL.map(x=>'<button class="wxpick'+(x.current?' on':'')+(x.unlocked?'':' locked')
        +'" data-wx="'+esc(x.key)+'"'+(x.unlocked?'':' aria-disabled="true"')
        +' aria-label="'+esc(x.name)+'：'+esc(x.unlocked?x.note:x.needText)+'">'
        +'<b>'+esc(x.name)+'</b><em>'+esc(x.unlocked?x.note:x.needText)+'</em></button>').join('')
      +'</div><div class="mini" style="margin-top:6px">只改本机环境音，不进存档与分享串，'
      +'不影响史实、难度与同种子复盘。</div></div>';

    /* ===== v2.0 反 馈 · 震 动 与 长 按 ===== */
    h+='<div class="card"><div class="tagline">反 馈 · 震 动 与 长 按</div>'
      +'<div class="switchrow"><span>点击立绘震动</span><div class="viewsel">'
      +'<button data-vibe="1" class="'+(VIBE?'on':'')+'">开</button>'
      +'<button data-vibe="0" class="'+(!VIBE?'on':'')+'">关</button></div></div>'
      +'<div class="mini" style="margin-top:6px">点一下向导有一下轻震；'
      +'长按立绘约半秒会弹出已开放的表情层，选一个就演一拍。'
      +'长按与拖动互斥：手指一动就只当拖动，不会误弹面板。'
      +'浏览器不支持震动时静默跳过，不会报错。</div></div>';

    /* ===== v1.9 人 物 · 表 演 层（随进度开放） ===== */""",'设置页三张新卡')

# ---------- 7. pointer 段整体替换 ----------
R("""    /* 人物点击与拖动：只用指针位移，不改游戏状态 */
    document.addEventListener('pointerdown',e=>{
      const t=e.target;
      /* 立绘本身不接指针，避免挡住教程卡、选项与工具条；改按坐标命中 */
      if(t&&t.closest&&t.closest('button,a,input,select,textarea,summary,'
        +'[data-tut],[data-pchip],[data-i],.opt,.tabs,.stage-tools,.bubble,.panel.on'))return;
      const ch=charEl();if(!ch)return;
      const r=ch.getBoundingClientRect();
      if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)return;
      DRAG={el:ch,x:e.clientX,y:e.clientY,dx:CHAROFF.x,dy:CHAROFF.y,moved:false};
      ch.classList.add('ch-grab');
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
    document.addEventListener('input',ev=>{""",
"""    /* v2.0 气泡拖放：左右不出屏、上下不限、与工具条等组件互斥 */
    const bubEl=()=>document.querySelector('.stage .bubble')||document.querySelector('.pchip-detail');
    function overlap(a,b){return !(a.right<b.left||a.left>b.right||a.bottom<b.top||a.top>b.bottom);}
    function clampBubble(el,dx,dy){
      const cur=el.getBoundingClientRect(),
        ax=dx-BUBCFG.dx,ay=dy-BUBCFG.dy;
      let left=cur.left+ax,top=cur.top+ay,
          right=cur.right+ax,bottom=cur.bottom+ay;
      const W=window.innerWidth||390,H=window.innerHeight||844;
      if(left<4){dx+=4-left;left+=4-left;right+=4-left;}
      if(right>W-4){const d=right-(W-4);dx-=d;left-=d;right-=d;}
      /* 互斥：撞上工具条／速览／进度条／进度弹窗就自动让开 */
      const others=['.stage-tools','.stage-hud','.stage-tag','.pchip','.pchip-detail']
        .map(q=>document.querySelector(q)).filter(x=>x&&x!==el);
      for(let pass=0;pass<3;pass++){
        let moved=false;
        others.forEach(o=>{
          const r=o.getBoundingClientRect();
          const c={left:left,top:top,right:right,bottom:bottom};
          if(!overlap(c,r))return;
          const down=r.bottom-top+6,up=bottom-r.top+6;
          const d=down<=up?down:-up;
          dy+=d;top+=d;bottom+=d;moved=true;
        });
        if(!moved)break;
      }
      /* 上下不限，但至少留一截在视口里，免得拖丢找不回来 */
      if(top>H-26){const d=top-(H-26);dy-=d;top-=d;bottom-=d;}
      if(bottom<26){const d=26-bottom;dy+=d;top+=d;bottom+=d;}
      return {dx:dx,dy:dy};
    }
    document.addEventListener('pointerdown',e=>{
      const t=e.target;
      /* 全屏原稿预览里的立绘：可拖，但不出方框 */
      const spc=t&&t.closest&&t.closest('.sp-char');
      if(spc){
        SPDRAG={el:spc,x:e.clientX,y:e.clientY,dx:SPOFF.x,dy:SPOFF.y};
        spc.classList.add('sp-grab');return;
      }
      /* 气泡拖拽 / 缩放手柄 */
      const grip=t&&t.closest&&t.closest('[data-bubble-drag]'),
            rz=t&&t.closest&&t.closest('[data-bubble-resize]');
      if(grip||rz){
        const el=bubEl();if(!el)return;
        BUBDRAG={mode:grip?'drag':'resize',el:el,x:e.clientX,y:e.clientY,
          dx:BUBCFG.dx,dy:BUBCFG.dy,w:BUBCFG.w||el.getBoundingClientRect().width,
          h:BUBCFG.h||el.getBoundingClientRect().height};
        el.classList.add('bub-dragging');return;
      }
      /* 立绘本身不接指针，避免挡住教程卡、选项与工具条；改按坐标命中 */
      if(t&&t.closest&&t.closest('button,a,input,select,textarea,summary,'
        +'[data-tut],[data-pchip],[data-i],.opt,.tabs,.stage-tools,.bubble,.panel.on'))return;
      const ch=charEl();if(!ch)return;
      const r=ch.getBoundingClientRect();
      if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)return;
      DRAG={el:ch,x:e.clientX,y:e.clientY,dx:CHAROFF.x,dy:CHAROFF.y,moved:false};
      ch.classList.add('ch-grab');
      LONGFIRED=0;clearTimeout(LONGT);
      LONGT=setTimeout(()=>{
        if(!DRAG||DRAG.moved)return;
        LONGFIRED=1;DRAG=null;ch.classList.remove('ch-grab');
        openPosePanel(e.clientX,e.clientY);
      },560);
    });
    document.addEventListener('pointermove',e=>{
      if(SPDRAG){
        const c=SPDRAG.el,box=c.parentElement&&c.parentElement.getBoundingClientRect();
        if(!box)return;
        const r=c.getBoundingClientRect(),
          ddx=e.clientX-SPDRAG.x,ddy=e.clientY-SPDRAG.y;
        let nx=SPDRAG.dx+ddx,ny=SPDRAG.dy+ddy;
        const baseL=r.left-ddx,baseT=r.top-ddy;
        /* 限制在方框内：立绘四边都留在 sp-box 里 */
        const minX=box.left+6-baseL,maxX=box.right-6-(baseL+r.width);
        const minY=box.top+6-baseT,maxY=box.bottom-6-(baseT+r.height);
        nx=Math.max(minX,Math.min(maxX,nx));
        ny=Math.max(minY,Math.min(maxY,ny));
        SPOFF={x:nx,y:ny};c.style.transform='translate('+nx+'px,'+ny+'px)';return;
      }
      if(BUBDRAG){
        const ddx=e.clientX-BUBDRAG.x,ddy=e.clientY-BUBDRAG.y;
        if(BUBDRAG.mode==='drag'){
          const c=clampBubble(BUBDRAG.el,BUBDRAG.dx+ddx,BUBDRAG.dy+ddy);
          BUBCFG.dx=c.dx;BUBCFG.dy=c.dy;
        }else{
          const W=window.innerWidth||390;
          BUBCFG.w=Math.max(160,Math.min(Math.min(390,W-12),Math.round(BUBDRAG.w+ddx)));
          BUBCFG.h=Math.max(26,Math.min(220,Math.round(BUBDRAG.h+ddy)));
        }
        bubApply();return;
      }
      if(!DRAG)return;
      const dx=e.clientX-DRAG.x,dy=e.clientY-DRAG.y;
      if(Math.abs(dx)+Math.abs(dy)>4){DRAG.moved=true;clearTimeout(LONGT);}
      CHAROFF.x=Math.max(-140,Math.min(140,DRAG.dx+dx));
      CHAROFF.y=Math.max(-120,Math.min(120,DRAG.dy+dy));
      const r=document.documentElement;
      r.style.setProperty('--char-dx',CHAROFF.x+'px');
      r.style.setProperty('--char-dy',CHAROFF.y+'px');
    });
    const endDrag=()=>{
      clearTimeout(LONGT);
      if(SPDRAG){SPDRAG.el.classList.remove('sp-grab');SPDRAG=null;return;}
      if(BUBDRAG){BUBDRAG.el.classList.remove('bub-dragging');
        BUBDRAG=null;saveUI2();return;}
      if(!DRAG)return;
      const ch=DRAG.el,moved=DRAG.moved;DRAG=null;
      if(LONGFIRED){LONGFIRED=0;return;}
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
    /* 设置页四个滑杆：气泡宽／高／横／纵 */
    document.addEventListener('input',ev=>{
      const br=ev.target&&ev.target.closest&&ev.target.closest('input[data-bub]');
      if(br){
        const k=br.dataset.bub,v=+br.value||0;
        BUBCFG[k]=v;bubApply();saveUI2();
        const lab=document.querySelector('[data-bub-val="'+k+'"]');
        if(lab)lab.textContent=v+(k==='w'?'px':k==='h'?'px':'');
        return;
      }
    });
    document.addEventListener('input',ev=>{""",'pointer 与气泡拖放')

# ---------- 8. tapChar 加震动 ----------
R("""  function tapChar(){
    const ch=charEl();if(!ch)return;""",
"""  function tapChar(){
    vibe(18);
    const ch=charEl();if(!ch)return;""",'点击震动')

# ---------- 9. 开局说明 ----------
R("""      +'皮肤默认跟随系统，已通关关卡折到最后。</div>';""",
"""      +'皮肤默认跟随系统，已通关关卡折到最后。<br>'
      +'v2.0 起点缩略图右上 ⤢ 可全屏看原稿、立绘拖动不出方框；'
      +'长按立绘选表情、点一下有震动反馈（可关）；'
      +'天气／场景环境音能手选且随进度开放；'
      +'气泡可拖可缩放、左右不出屏、组件互斥；'
      +'「念」再点一次就停；人口与职业改用场景内 emoji 速览，主页与选项更紧凑。</div>';""",
 '开局说明 v2.0')

open(p,'w',encoding='utf8').write(s);print('ui.js 完成')
