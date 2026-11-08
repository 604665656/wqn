# -*- coding: utf-8 -*-
"""v1.8：AVG 全屏舞台、统一透明度滑杆、进度缩略弹窗、朗读开关修复、横屏强化。"""
import os
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P=lambda *x:os.path.join(ROOT,*x)

# ═══════════════ ui.js ═══════════════
p=P('src','ui.js');s=open(p,encoding='utf8').read()
def R(old,new,tag,cnt=1):
    global s
    assert old in s,'ui.js 缺 '+tag;s=s.replace(old,new,cnt);print(' ok',tag)

R("""  let STSIZE='normal',LANDSCAPE=0,BUB='veil',SETMIN=1,SETFOLD={},VMENU=0,MINIMAL=1;""",
"""  let STSIZE='normal',LANDSCAPE=0,BUB='veil',SETMIN=1,SETFOLD={},VMENU=0,MINIMAL=1;
  /* v1.8：VEIL = 所有气泡／弹窗／选项卡的底色不透明度百分比，默认 35；
     AVGON = 背景全屏、角色常驻、选项浮在其上的文字冒险式舞台 */
  let VEIL=35,AVGON=1;
  const PRESET={light:15,veil:35,normal:60,solid:95};""",'变量')

# 朗读按钮：状态化文案
R("""      +one('data-read','1','brush','朗读',R.read,'朗读当前页面'+(R.tts?'':'（此浏览器不支持）'))""",
"""      +one('data-read','1','brush',(R.read?'停读':'朗读'),R.read,
        (R.read?'朗读中：点此停止并关闭朗读':'朗读当前页面'+(R.tts?'':'（此浏览器不支持）')))""",'朗读按钮文案')

# 委托新分支
R("""    const op=ev.target.closest&&ev.target.closest('[data-scene-open]');""",
"""    const pc=ev.target.closest&&ev.target.closest('[data-pchip]');
    if(pc){
      const chip=pc.closest('.pchip');if(chip)chip.classList.toggle('open');
      return;
    }
    const pcc=ev.target.closest&&ev.target.closest('[data-pchip-close]');
    if(pcc){
      const chip=pcc.closest('.pchip');if(chip)chip.classList.remove('open');
      return;
    }
    const lf=ev.target.closest&&ev.target.closest('[data-longfold]');
    if(lf){
      const card=lf.closest('.card');
      if(card){
        const on=card.classList.toggle('lfold-open');
        lf.textContent=on?'收起':'▸ 展开全文';
        lf.setAttribute('aria-label',on?'收起这一卡':'展开这一卡的完整内容');
      }
      return;
    }
    const av=ev.target.closest&&ev.target.closest('button[data-avg]');
    if(av){AVGON=+av.dataset.avg?1:0;applyDisplay();render();return;}
    const op=ev.target.closest&&ev.target.closest('[data-scene-open]');""",'委托新分支')

# 透度三档改为滑杆预设
R("""    if(d.bubbleAlpha){BUB=d.bubbleAlpha;render();return;}""",
"""    if(d.bubbleAlpha){
      BUB=d.bubbleAlpha;
      if(PRESET[d.bubbleAlpha]!==undefined)VEIL=PRESET[d.bubbleAlpha];
      applyDisplay();render();return;
    }""",'透度预设')

# 横屏：明确提示 + lock 失败兜底
R("""        try{
          const o=window.screen&&window.screen.orientation;
          if(LANDSCAPE&&o&&o.lock)o.lock('landscape').catch(()=>{});
          else if(!LANDSCAPE&&o&&o.unlock)o.unlock();
        }catch(e){}
        applyDisplay();
        say(LANDSCAPE?'已切横屏布局；若手机锁了竖屏，请在系统里解锁旋转':'已回到竖屏布局');""",
"""        let rotated=false;
        try{
          const o=window.screen&&window.screen.orientation;
          if(LANDSCAPE&&o&&o.lock){
            o.lock('landscape').then(()=>{rotated=true;}).catch(()=>{
              say('系统不允许网页强制旋转；已切为横向两栏布局。若要真横屏，请关闭系统竖屏锁定后把手机横过来。');
            });
          }else if(!LANDSCAPE&&o&&o.unlock)o.unlock();
        }catch(e){}
        applyDisplay();
        say(LANDSCAPE?'已切横向两栏布局：舞台在左、内容在右。手机若锁了竖屏，网页不能强制旋转，请在系统里解锁':'已回到竖屏布局');""",'横屏提示')

# applyDisplay 增加 veil / avg / applyAvg
R("""    r.classList.toggle('minimal',minimalActive());
    applySetCards();
    applyMinimal();
  }""",
"""    r.classList.toggle('minimal',minimalActive());
    r.style.setProperty('--veil',(VEIL/100).toFixed(2));
    r.classList.toggle('avg',avgActive());
    applySetCards();
    applyMinimal();
    applyAvg();
  }""",'applyDisplay 扩展')

# 新增 applyAvg（放在 applyMinimal 之前）
R("""  /* v1.7 主页极简：简单模式、教程进行中、以及任何需要指引的状态自动让位，""",
"""  /* v1.8 AVG 全屏舞台：只在主页开启；把长指示收进一条可点开的进度缩略条，
     原元素视觉收起但 DOM 与读屏内容一个字不删，点开弹窗看完整详情。 */
  function avgActive(){
    if(!AVGON||TAB!=='main'||typeof document==='undefined')return false;
    let S=null;try{S=E.state&&E.state();}catch(e){}
    return !!S;
  }
  function applyAvg(){
    if(typeof document==='undefined')return;
    const app=document.getElementById('app');if(!app)return;
    if(!avgActive())return;
    /* 进度缩略条：年份 + 卷次 + 八维微条，点击开弹窗 */
    let chip=app.querySelector('.pchip');
    if(!chip){
      chip=document.createElement('div');chip.className='pchip';
      chip.innerHTML='<button class="pchip-sum" data-pchip aria-label="打开本局进度与详情">'
        +'<span class="pchip-y"></span><span class="pchip-v"></span>'
        +'<span class="pchip-bars"></span><span class="pchip-go">▸ 详情</span></button>'
        +'<div class="pchip-detail"><div class="veilbar">'
        +'<button class="veilclose" data-pchip-close aria-label="关闭详情">× 关闭详情</button>'
        +'<span>本局进度 · 完整读数</span></div><div class="pchip-body"></div></div>';
      app.insertBefore(chip,app.firstChild);
    }
    const yr=app.querySelector('.yr'),vt=app.querySelector('.volbar .vt');
    chip.querySelector('.pchip-y').textContent=yr?yr.textContent.trim():'';
    chip.querySelector('.pchip-v').textContent=vt?vt.textContent.trim():'';
    const bars=chip.querySelector('.pchip-bars');bars.innerHTML='';
    app.querySelectorAll('.stats .st').forEach(st=>{
      const k=st.querySelector('span'),v=st.querySelector('b');
      if(!k||!v)return;
      const one=document.createElement('i');
      one.title=k.textContent.trim()+' '+v.textContent.trim();
      one.style.height=Math.max(3,Math.min(14,+v.textContent/6))+'px';
      bars.appendChild(one);
    });
    /* 详情区：clone 原指示条，保留原意 */
    const body=chip.querySelector('.pchip-body');body.innerHTML='';
    app.querySelectorAll('.head,.tierbar,.volbar,.stats,.mini.center').forEach(el=>{
      const c=el.cloneNode(true);c.removeAttribute('id');
      c.classList.remove('avg-slim','min-hide','min-slim');
      body.appendChild(c);
    });
    /* 原指示条视觉收起（不 display:none，innerText 与读屏仍在） */
    app.querySelectorAll('.head,.tierbar,.volbar,.stats,.mini.center')
      .forEach(x=>x.classList.add('avg-slim'));
    /* 长卡（同期人物、本朝所见等）折叠成一行，点开看全文 */
    const panel=app.querySelector('.panel.on');
    if(panel)panel.querySelectorAll('.card').forEach(card=>{
      const tl=card.querySelector('.tagline');if(!tl)return;
      if(card.classList.contains('longfold'))return;
      if(!/同\\s*期\\s*人\\s*物|本\\s*朝\\s*所\\s*见|年\\s*代\\s*窗\\s*口|下\\s*一\\s*朝/.test(tl.textContent))return;
      card.classList.add('longfold');
      const b=document.createElement('button');
      b.className='longfold-btn';b.dataset.longfold='1';b.textContent='▸ 展开全文';
      b.setAttribute('aria-label','展开这一卡的完整内容');
      card.insertBefore(b,tl.nextSibling);
    });
  }

  /* v1.7 主页极简：简单模式、教程进行中、以及任何需要指引的状态自动让位，""",'applyAvg')

# 设置页：AVG 开关 + 透明度滑杆（插到视图卡说明之后）
R("""      +'<div class="mini" style="margin-top:6px">半身档把立绘放大、下半身落进横向气泡后面，'""",
"""      +'<div class="switchrow"><span>AVG 全屏舞台</span><div class="viewsel">'
        +'<button data-avg="1" class="'+(AVGON?'on':'')+'">开</button>'
        +'<button data-avg="0" class="'+(!AVGON?'on':'')+'">关</button></div></div>'
      +'<div class="mini" style="margin-top:6px">开：背景铺满整屏、向导常驻，选项与对话框半透浮在其上，'
      +'滚动选项时也不会看不到哈士喵；关：回到原来的上下分栏。</div>'
      +'<div class="switchrow"><span>所有气泡 / 弹窗 底色</span><div class="veilrow">'
        +'<input type="range" min="10" max="100" step="5" value="'+VEIL+'" data-veil '
        +'aria-label="气泡与弹窗底色不透明度"><b data-veil-val>'+VEIL+'%</b></div></div>'
      +'<div class="mini">默认 35%（底色不透明度，越接近 10 越透）。气泡、进度弹窗、选项卡共用这一个值；'
      +'文字始终实色加深色描边与浅色光晕，最透档也看得清。下面三档是快捷预设。</div>'
      +'<div class="mini" style="margin-top:6px">半身档把立绘放大、下半身落进横向气泡后面，'""",'设置页 AVG 与滑杆')

# 两处朗读 click → toggle
OLD_READ="""      const ax=W.a11y;if(!ax)return;
      if(!ax.status().read){ax.set('read',true);}
      ax.readScreen();render();"""
NEW_READ="""      const ax=W.a11y;if(!ax)return;
      const st=ax.status();
      if(st.read||st.speaking){
        ax.stopSpeak();ax.set('read',false);ax.set('autoRead',false);
        if(ax.announce)ax.announce('已停止朗读');
      }else{ax.set('read',true);ax.readScreen();}
      render();"""
assert s.count(OLD_READ)==1,'read 块1';R(OLD_READ,NEW_READ,'朗读 toggle 1')
OLD_READ2="""      const ax=W.a11y;if(!ax)return;
      if(!ax.status().read)ax.set('read',true);
      ax.readScreen();rerender();"""
NEW_READ2="""      const ax=W.a11y;if(!ax)return;
      const st=ax.status();
      if(st.read||st.speaking){
        ax.stopSpeak();ax.set('read',false);ax.set('autoRead',false);
        if(ax.announce)ax.announce('已停止朗读');
      }else{ax.set('read',true);ax.readScreen();}
      rerender();"""
assert s.count(OLD_READ2)==1,'read 块2';R(OLD_READ2,NEW_READ2,'朗读 toggle 2')

# input 监听（滑杆实时生效，不 render，避免打断拖动）
R("""  if(typeof document!=='undefined')document.addEventListener('click',onViewClick);""",
"""  if(typeof document!=='undefined'){
    document.addEventListener('click',onViewClick);
    document.addEventListener('input',ev=>{
      const r=ev.target&&ev.target.closest&&ev.target.closest('input[data-veil]');
      if(!r)return;
      VEIL=Math.max(10,Math.min(100,+r.value||35));
      const lab=document.querySelector('[data-veil-val]');
      if(lab)lab.textContent=VEIL+'%';
      applyDisplay();
    });
  }""",'input 监听')

# 开局说明补 v1.8
R("""      +'半身时下半身落进气泡后面仍看得见。</div>';""",
"""      +'半身时下半身落进气泡后面仍看得见。<br>'
      +'v1.8 起背景全屏、向导常驻，选项半透浮在画面上；顶部进度条点开看完整读数，'
      +'所有气泡与弹窗的底色浓淡在设置页一把滑杆调，默认 35%。</div>';""",'开局说明')

open(p,'w',encoding='utf8').write(s);print('ui.js 完成')

# ═══════════════ a11y.js ═══════════════
p=P('src','a11y.js');a=open(p,encoding='utf8').read()
old="""    return {read:!!cfg.read,autoRead:!!cfg.autoRead,voice:!!cfg.voice,
      rate:cfg.rate,verbosity:cfg.verbosity,tts:hasTTS(),voiceApi:hasVoice(),"""
new="""    return {read:!!cfg.read,autoRead:!!cfg.autoRead,voice:!!cfg.voice,
      speaking:!!ttsBusy,
      rate:cfg.rate,verbosity:cfg.verbosity,tts:hasTTS(),voiceApi:hasVoice(),"""
assert old in a;a=a.replace(old,new,1)
# 语音命令「朗读」与键盘 R 也改开关，避免另一条路径还是从头念
old2="""      case 'read':ok=readScreen();msg=ok?'开始朗读':'朗读未开启或此浏览器不支持';break;"""
new2="""      case 'read':
        if(cfg.read||ttsBusy){
          stopSpeak();set('read',false);set('autoRead',false);
          ok=true;msg='已停止朗读';
        }else{
          set('read',true);ok=readScreen();msg=ok?'开始朗读':'此浏览器不支持朗读';
        }
        break;"""
assert old2 in a;a=a.replace(old2,new2,1)
open(p,'w',encoding='utf8').write(a);print('a11y.js 完成')
