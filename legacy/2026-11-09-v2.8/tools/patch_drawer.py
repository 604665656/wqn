# -*- coding: utf-8 -*-
"""v1.6：极小极透气泡、设置独立抽屉（显眼关闭 + 可拖动）、舞台按键收进齿轮。"""
import os
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P=lambda *x:os.path.join(ROOT,*x)

p=P('src','ui.js');s=open(p,encoding='utf8').read()
def rep(old,new,tag,cnt=1):
    global s
    assert old in s,'缺锚点：'+tag
    s=s.replace(old,new,cnt);print(' ok',tag)

# 默认精简
rep("""  let STSIZE='normal',LANDSCAPE=0,BUB='light',SETMIN=0,SETFOLD={};""",
"""  let STSIZE='normal',LANDSCAPE=0,BUB='light',SETMIN=1,SETFOLD={},VMENU=0;""",'默认精简')

# stageTools：齿轮 + 收起的 viewtools + 常显声音
old="""  function stageTools(){
    const btn=(v,ic,lab)=>'<button class="vbtn" data-view="'+v+'" aria-label="'+lab
      +'" title="'+lab+'">'+ic+'</button>';
    return '<div class="viewtools" role="group" aria-label="视图按键">'
      +btn('landscape','▭','横屏布局')
      +btn('full','⛶','全屏并铺满背景')
      +btn('opts','≡','收起舞台，看全部选项')
      +'</div>'+sndBtn();
  }"""
new="""  function stageTools(){
    const btn=(v,ic,lab)=>'<button class="vbtn" data-view="'+v+'" aria-label="'+lab
      +'" title="'+lab+'">'+ic+'</button>';
    /* 三颗视图按键收进齿轮，默认只露一颗；DOM 仍在，键盘与读屏都能取到 */
    return '<button class="vgear'+(VMENU?' on':'')+'" data-vmenu aria-label="展开或收起视图按键" '
      +'title="视图按键" aria-expanded="'+(VMENU?'true':'false')+'">⚙</button>'
      +'<div class="viewtools" role="group" aria-label="视图按键">'
      +btn('landscape','▭','横屏布局')
      +btn('full','⛶','全屏并铺满背景')
      +btn('opts','≡','收起舞台，看全部选项')
      +'</div>'+sndBtn();
  }"""
rep(old,new,'stageTools 齿轮')

# 委托：齿轮 / 气泡展开 / 关闭设置 / 抽屉拖动
old2="""    const op=ev.target.closest&&ev.target.closest('[data-scene-open]');"""
new2="""    if(ev.target.closest&&ev.target.closest('[data-close-set]')){
      TAB='main';render();
      if(W.a11y&&W.a11y.announce)W.a11y.announce('已关闭设置，回到游戏');
      return;
    }
    const gear=ev.target.closest&&ev.target.closest('[data-vmenu]');
    if(gear){
      VMENU=VMENU?0:1;
      const wrap=gear.closest('.stage-tools');
      if(wrap)wrap.classList.toggle('vmopen',!!VMENU);
      gear.classList.toggle('on',!!VMENU);
      gear.setAttribute('aria-expanded',VMENU?'true':'false');
      return;
    }
    const bx=ev.target.closest&&ev.target.closest('[data-bubble-expand]');
    if(bx){
      const bub=bx.closest('.bubble');
      if(bub){
        const on=bub.classList.toggle('expanded');
        const say=bub.querySelector('.say');
        if(say)say.textContent=on?(bub.dataset.full||''):(bub.dataset.short||'');
        bx.textContent=on?'收':'…';
        bx.setAttribute('aria-label',on?'收起完整台词':'展开完整台词');
      }
      return;
    }
    const op=ev.target.closest&&ev.target.closest('[data-scene-open]');"""
rep(old2,new2,'委托新分支')

# KEEP 补两张，精简时也能看到关卡与音色
rep("""  const KEEP=['视 角','显 示','视 图','舞 台','朗 读'];""",
"""  const KEEP=['视 角','显 示','视 图','舞 台','朗 读','表 演 关 卡','人 声'];""",'KEEP')

# applySetCards：抽屉条 + 显眼关闭 + 拖动把手
old3="""    if(!panel.querySelector('.setbar')){
      const bar=document.createElement('div');bar.className='setbar';
      bar.innerHTML='<span>设置卡</span>'
        +'<button data-setmin="1" class="'+(SETMIN?'on':'')+'">精简</button>'
        +'<button data-setmin="0">全部</button>'
        +'<span class="mini">每张卡右上角可单独收起</span>';
      panel.insertBefore(bar,panel.firstChild);
    }"""
new3="""    if(!panel.querySelector('.drawerbar')){
      const head=document.createElement('div');head.className='drawerbar';
      head.innerHTML='<button class="drawerclose" data-close-set '
        +'aria-label="关闭设置并返回游戏">× 关闭设置 · 返回游戏</button>'
        +'<span class="drawergrip" data-grip aria-label="上下拖动可调整设置面板高度" '
        +'title="按住上下拖动">⠿ 拖动</span>'
        +'<span class="drawerver">'+VER()+'</span>';
      panel.insertBefore(head,panel.firstChild);
      /* 把手拖动：只改面板可视高度，不改任何游戏状态 */
      if(!head.dataset.bound){
        head.dataset.bound='1';
        const grip=head.querySelector('[data-grip]');
        let y0=0,h0=0,move=null;
        const down=e=>{y0=(e.touches?e.touches[0].clientY:e.clientY);
          h0=panel.getBoundingClientRect().height;
          move=e2=>{
            const y=(e2.touches?e2.touches[0].clientY:e2.clientY);
            const h=Math.max(280,Math.min(window.innerHeight*0.96,h0+y-y0));
            panel.style.height=h+'px';
            if(e2.cancelable)e2.preventDefault();
          };
          const up=()=>{document.removeEventListener('mousemove',move);
            document.removeEventListener('touchmove',move);
            document.removeEventListener('mouseup',up);
            document.removeEventListener('touchend',up);};
          document.addEventListener('mousemove',move);
          document.addEventListener('touchmove',move,{passive:false});
          document.addEventListener('mouseup',up);
          document.addEventListener('touchend',up);
        };
        grip.addEventListener('mousedown',down);
        grip.addEventListener('touchstart',down,{passive:true});
      }
    }
    if(!panel.querySelector('.setbar')){
      const bar=document.createElement('div');bar.className='setbar';
      bar.innerHTML='<span>设置卡</span>'
        +'<button data-setmin="1" class="'+(SETMIN?'on':'')+'">精简</button>'
        +'<button data-setmin="0">全部</button>'
        +'<span class="mini">默认精简；每张卡右上角可单独展开。内容长可直接上下拖动。</span>';
      const head=panel.querySelector('.drawerbar');
      if(head&&head.nextSibling)panel.insertBefore(bar,head.nextSibling);
      else panel.appendChild(bar);
    }"""
rep(old3,new3,'抽屉条与拖动')

# 设置面板加 setdrawer class
rep("""    h+='<div class="panel '+(TAB==='set'?'on':'')+'">'+hintFor('set',S)""",
"""    h+='<div class="panel '+(TAB==='set'?'on setdrawer':'')+'">'+hintFor('set',S)""",'setdrawer class')

# 设置页「视 图 · 清 爽」卡补一句抽屉说明
rep("""      +'<div class="mini">横屏／全屏／收起舞台三颗按键在舞台右上角；'
      +'设置卡可精简或单独收起；选项区没有高度上限，全部条目直接铺开。</div>'""",
"""      +'<div class="mini">设置已改成独立抽屉：顶部大按钮随时关闭返回，'
      +'把手可上下拖动调高度，内容长直接滑动。舞台三颗视图按键收进 ⚙ 齿轮，'
      +'设置卡默认精简、可单独展开；选项区没有高度上限，全部条目直接铺开。</div>'""",'视图卡说明')

# 气泡三档说明更透
rep("""        +'<button data-bubble-alpha="light" class="'+(BUB==='light'?'on':'')+'">更透</button>'""",
"""        +'<button data-bubble-alpha="light" class="'+(BUB==='light'?'on':'')+'">极透</button>'""",'极透档')

# 开局说明补 v1.6
rep("""      +'设置卡可收起，≡ 一键收舞台看全部选项。</div>';""",
"""      +'设置卡可收起，≡ 一键收舞台看全部选项。<br>'
      +'v1.6 起气泡更小更透、可点 … 展开全文；设置改成独立抽屉，'
      +'顶部有显眼的关闭按钮、把手可拖动，按键收进 ⚙ 齿轮。</div>';""",'开局说明')

open(p,'w',encoding='utf8').write(s);print('ui.js 补丁完成')

# ═══════════════ CSS ═══════════════
p=P('src','style.css');css=open(p,encoding='utf8').read()
if 'v1.6 抽屉与极透小气泡' not in css:
    css+=r"""

/* ===== v1.6 抽屉与极透小气泡 ===== */
/* 气泡：更透、更小，点 … 才展开全文 */
.stage .bubble{background:linear-gradient(180deg,rgba(255,250,238,.26),rgba(247,238,220,.22));
  backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);
  border-color:rgba(120,98,68,.26);box-shadow:0 1px 5px rgba(80,64,42,.06);
  padding:4px 7px;max-width:64%;font-size:calc(11px * var(--fs));line-height:1.35;
  border-radius:9px}
.stage .bubble .who{font-size:calc(9px * var(--fs));opacity:.72;margin-right:5px}
.stage .bubble .say{display:inline}
.stage .bubble:after{background:rgba(247,238,220,.34);border-color:rgba(120,98,68,.22)}
.stage .bubble.expanded{max-width:88%;font-size:calc(12px * var(--fs));
  background:linear-gradient(180deg,rgba(255,250,238,.46),rgba(247,238,220,.42))}
.bubble-more{font-family:inherit;font-size:calc(10px * var(--fs));line-height:1;
  padding:1px 4px;margin:0 0 0 4px;border-radius:7px;
  border:1px solid rgba(120,98,68,.32);background:rgba(255,255,255,.28);
  color:#6a5940;cursor:pointer;vertical-align:middle}
.bubble-voice{margin:-1px 0 0 4px;padding:1px 5px;font-size:calc(9px * var(--fs));
  background:rgba(255,255,255,.28);vertical-align:middle}
html.bub-light .stage .bubble{background:linear-gradient(180deg,rgba(255,250,238,.26),rgba(247,238,220,.22))}
html.bub-light .stage .bubble:after{background:rgba(247,238,220,.34)}
html.bub-normal .stage .bubble{background:linear-gradient(180deg,rgba(255,250,238,.62),rgba(247,238,220,.58))}
html.bub-normal .stage .bubble:after{background:rgba(247,238,220,.64)}
html.bub-solid .stage .bubble{background:linear-gradient(180deg,rgba(255,250,238,.96),rgba(247,238,220,.94))}
html.bgfull .stage .bubble{background:rgba(255,250,238,.34)}

/* 齿轮：三颗视图按键默认收起，只露一颗 */
.vgear{width:27px;height:27px;line-height:1;border-radius:50%;padding:0;
  border:1px solid rgba(120,98,68,.5);background:rgba(255,250,238,.88);
  color:#6a5940;font-size:14px;font-family:inherit;cursor:pointer;
  display:inline-flex;align-items:center;justify-content:center}
.vgear.on{color:#9a7434;border-color:#9a7434;background:rgba(255,248,228,.95)}
.stage-tools .viewtools{display:none}
.stage-tools.vmopen .viewtools{display:flex}

/* 独立设置抽屉 */
.panel.setdrawer{position:fixed;inset:0;z-index:30;margin:0;
  overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;
  background:rgba(16,14,11,.975);backdrop-filter:blur(6px);
  padding:0 12px calc(84px + env(safe-area-inset-bottom));
  border-left:1px solid var(--line)}
.drawerbar{position:sticky;top:0;z-index:3;display:flex;align-items:center;gap:8px;
  flex-wrap:wrap;padding:10px 0;margin:0 0 8px;
  background:rgba(16,14,11,.98);border-bottom:1px solid var(--line)}
.drawerclose{flex:1;min-width:190px;font-family:inherit;
  font-size:calc(14px * var(--fs));font-weight:600;letter-spacing:1px;
  padding:11px 14px;border-radius:12px;cursor:pointer;
  color:#f6ead0;background:#7a3a2a;border:2px solid var(--gold);
  box-shadow:0 2px 10px rgba(0,0,0,.35)}
.drawerclose:focus-visible{outline:3px solid var(--gold);outline-offset:2px}
.drawergrip{font-family:inherit;font-size:calc(11px * var(--fs));color:var(--dim);
  padding:6px 9px;border:1px dashed var(--line);border-radius:9px;
  cursor:ns-resize;touch-action:none;user-select:none}
.drawerver{font-size:calc(10px * var(--fs));color:var(--dim)}
.panel.setdrawer .setbar{position:sticky;top:60px;z-index:2;background:rgba(24,20,15,.96)}
.panel.setdrawer .card{margin-bottom:9px}
.panel.setdrawer .foldbtn{font-size:14px;padding:3px 9px}
@media (min-width:640px){
  .panel.setdrawer{left:auto;right:0;width:min(560px,92vw);
    border-left:2px solid var(--gold);box-shadow:-12px 0 32px rgba(0,0,0,.55)}
}
"""
    open(p,'w',encoding='utf8').write(css);print('style.css 已追加')
