/* ui.js —— 渲染与交互（唯一碰 DOM 的模块） */
(function(W){
  'use strict';
  const D=W.data,E=W.engine,WV=W.weave,F=W.family;
  const FAMORDER=['自然基底','物质生产','社会组织','符号与意义','交换网络','认知方法'];
  let CIVEXP=false;
  let ARTON=1;   /* v1.2 美术开关（仅本次会话，不写存档） */
  /* v1.5 视图：只改本机界面，不进存档、不进分享串、不影响同种子复盘 */
  let STSIZE='normal',LANDSCAPE=0,BUB='veil',SETMIN=1,SETFOLD={},VMENU=0,MINIMAL=1;
  /* v1.8：VEIL = 所有气泡／弹窗／选项卡的底色不透明度百分比，默认 35；
     AVGON = 背景全屏、角色常驻、选项浮在其上的文字冒险式舞台 */
  let VEIL=35,AVGON=1,SKIN='auto';
  const PRESET={light:15,veil:35,normal:60,solid:95};
  /* v1.9：皮肤默认跟随系统；已通关关卡只记在本机，不进存档／分享串／主随机数 */
  let PERFORMED=[],PERFSEED='',CHAROFF={x:0,y:0},PERFT=0,DRAG=null;
  /* v2.0：震动反馈、场景音效手选、气泡自定义、长按表情、全屏预览 */
  let VIBE=1,WXSOUND='auto',BUBCFG={dx:0,dy:0,w:0,h:0},BUBDRAG=null,
      LONGT=0,LONGFIRED=0,POSEPANEL=null,PREVIEW=null,SPDRAG=null,SPOFF={x:0,y:0},SAYING=0;
  /* v2.1：全屏预览里立绘也能短按震动 / 长按选表情 */
  let SPLONGT=0,SPMOVED=0,IS_PREVIEW=0,TALKING=0,CUEON=1;
  /* v2.4：待机微表演调度（固定散列）与横屏手动标记 */
  let IDLET=0,IDLEKEY='',IDLESTEP=0,LAND_MANUAL=0;
  /* v2.6：物理竖屏时把画布转成横向。ROT90 只在 LANDSCAPE=1 且
     innerWidth<innerHeight 时为真；手机真的横过来会自动去掉。 */
  let ROT90=0,LAST_TALL=0;
  function wantRot90(){
    const w=window.innerWidth||document.documentElement.clientWidth,
          h=window.innerHeight||document.documentElement.clientHeight;
    return (LANDSCAPE===1&&w<h)?1:0;
  }
  /* iOS Safari 收起地址栏 / 弹出键盘都会发 resize，但宽高并未越过高矮分界。
     只在「竖↔横」关系真的翻转时重算，否则地址栏一收一放会让画布反复重旋。 */
  function tallFlipped(){
    const w=window.innerWidth||document.documentElement.clientWidth,
          h=window.innerHeight||document.documentElement.clientHeight;
    const tall=w<h?1:0;
    if(tall===LAST_TALL)return false;
    LAST_TALL=tall;return true;
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
  }
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
  }
  try{CUEON=(JSON.parse(localStorage.getItem('wqn.ui2')||'{}').cue!==0)?1:0;}catch(e){}
  try{const c=JSON.parse(localStorage.getItem('wqn.charoff')||'{}');
    CHAROFF={x:+c.x||0,y:+c.y||0};}catch(e){}
  try{const c=JSON.parse(localStorage.getItem('wqn.ui2')||'{}');
    VIBE=c.vibe===undefined?1:!!c.vibe;
    WXSOUND=c.wx||'auto';
    BUBCFG={dx:+c.dx||0,dy:+c.dy||0,w:+c.w||0,h:+c.h||0};}catch(e){}
  /* v2.1：朗读按钮状态统一由 SAYING 驱动，重绘后也能对上当前 DOM */
  function syncSayBtn(){
    const b=document.querySelector('.bubble-voice[data-guide="say"]');
    if(!b)return;
    const on=!!SAYING;
    b.textContent=on?'停':'念';
    b.setAttribute('aria-label',on?'停止朗读':'用角色音色念这句');
    b.classList.toggle('speaking',on);
  }
  function saveUI2(){
    try{localStorage.setItem('wqn.ui2',JSON.stringify({
      vibe:VIBE?1:0,wx:WXSOUND,dx:BUBCFG.dx,dy:BUBCFG.dy,w:BUBCFG.w,h:BUBCFG.h}));}catch(e){}
  }
  /* v2.2：台词开口 / 收口，驱动立绘说话表演与一声合成语气音 */
  function talkBegin(d){
    const ax=W.a11y;
    TALKING=1;
    if(ax&&ax.talkAct&&ax.talkAct()){
      const ch=charEl();if(ch)ch.classList.add('ch-talking');
      const sp=document.querySelector('#scenePreview .sp-char');
      if(sp)sp.classList.add('ch-talking');
    }
    if(CUEON&&W.audio&&d&&!d.silent){
      const pk=ax&&ax.pack?ax.pack():{cue:1};
      W.audio.guideCue(d.mood||'calm',pk.cue||1);
    }
  }
  function talkEnd(){
    TALKING=0;
    [charEl(),document.querySelector('#scenePreview .sp-char')].forEach(c=>{
      if(c)c.classList.remove('ch-talking');
    });
  }
  function cueToggle(){
    CUEON=CUEON?0:1;
    try{const c=JSON.parse(localStorage.getItem('wqn.ui2')||'{}');
      c.cue=CUEON;localStorage.setItem('wqn.ui2',JSON.stringify(c));}catch(e){}
    return CUEON;
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
    /* 不覆盖 CSS 的 -50%，否则立绘初始不居中、拖动时会跳一下 */
    SPOFF={x:0,y:0};if(ch)ch.style.transform='translate(-50%,0px)';
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
    el.addEventListener('click',e=>{if(e.target===el)closePosePanel();});
    POSEPANEL=el;
    const r=im.getBoundingClientRect();
    im.style.left=Math.max(8,Math.min(window.innerWidth-r.width-8,cx-r.width/2))+'px';
    im.style.top=Math.max(8,Math.min(window.innerHeight-r.height-8,cy-40))+'px';
    vibe(14);
  }
  function closePosePanel(){
    if(POSEPANEL&&POSEPANEL.parentNode)POSEPANEL.parentNode.removeChild(POSEPANEL);
    POSEPANEL=null;
  }
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
  /* ---------- v2.7 横向画布：左右分栏 / 统一旋转 / 向导台词 ---------- */
  let SPLIT=47,FLIP=0,TAP_N=0,SPLITDRAG=null,GUIDET=null;
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
  }
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
    if(hint&&HINTFOLLOW&&hint.parentElement!==app)app.appendChild(hint);
  }
  function unrotChrome(){
    const app=$('app'),body=document.body;
    ['tabs','landHint'].forEach(id=>{
      const e=document.getElementById(id);
      if(e&&app&&e.parentElement===app)body.appendChild(e);
    });
    applyHint();
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
    vibe(18);showGuideLine();
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
  }
  let TAB='main',CIVF='*',FS=0,HC=0,
      ATL={polity:true,climate:true,pop:true,family:true,local:false},
      START={reg:'huaxia',view:'family',entity:'C01',chainRegion:'huaxia',house:'H01',
        reality:'balanced',modeKey:'chronicle',lengthKey:'standard',density:1,
        difficulty:'normal',tutorialOn:false,tutManual:false};
  const $=id=>document.getElementById(id);
  /* 版本号：只标识这一份可玩文件；旧存档载入后自动补当前版本字段 */
  const VER=()=>{const v=D.version||{};return 'v'+(v.version||'0')
    +' · build '+(v.build||1)+(v.date?' · '+v.date:'')};
  /* v1.2 声与色：插画是程序化 SVG 几何装饰，声音是离线实时合成。
     两者都不调用主随机数、不写存档，不影响同种子复盘。 */
  const AU=()=>W.audio;
  const sndOn=()=>!!(AU()&&AU().status().on);
  function artOpts(S,label){
    return {year:S.year,reg:S.reg,era:E.eraIdx(S.year),
      vol:(S.vol&&S.vol.n)||1,hc:HC===1,label:label||'',w:360};
  }
  function sndBtn(){
    if(!W.art)return '';
    const A=AU(),st=A?A.status():{sfx:false,bgm:false,on:false},
          R=W.a11y?W.a11y.status():{read:false,tts:false};
    const one=(attr,val,ic,txt,on,title)=>'<button class="sndbtn mini'+(on?' on':'')+'" '
      +attr+'="'+val+'" aria-pressed="'+(on?'true':'false')+'" title="'+title+'" '
      +'aria-label="'+title+'">'+W.art.icon(ic,14,'currentColor')+'<span>'+txt+'</span></button>';
    return '<div class="sndgroup" role="group" aria-label="声音与朗读快捷开关">'
      +one('data-snd','sfx','note','音效',st.sfx,'音效：'+(st.sfx?'已开，点此关':'已关，点此开'))
      +one('data-snd','bgm','sound','背景',st.bgm,'背景音：'+(st.bgm?'已开，点此关':'已关，点此开'))
      +one('data-snd','toggle','mute','静音',!st.on,'全部静音／恢复全部声音')
      +one('data-read','1','brush',(R.read?'停读':'朗读'),R.read,
        (R.read?'朗读中：点此停止并关闭朗读':'朗读当前页面'+(R.tts?'':'（此浏览器不支持）')))
      +'</div>';
  }
  /* v1.5 舞台工具条：图标化，清爽；横屏 / 全屏 / 看全部选项三颗按键 */
  function stageTools(){
    const btn=(v,ic,lab)=>'<button class="vbtn" data-view="'+v+'" aria-label="'+lab
      +'" title="'+lab+'">'+ic+'</button>';
    /* v2.4：横屏键单独露出。之前三颗全藏在齿轮里且默认收起，
       用户反复说「点横屏完全横不了」，第一层原因是根本找不到按钮。 */
    return '<button class="vbtn vland'+(LANDSCAPE?' on':'')+'" data-view="landscape" '
      +'aria-label="'+(LANDSCAPE?'退出横屏，回到竖向布局':'切换横向布局')+'" '
      +'title="'+(LANDSCAPE?'退出横屏':'横屏布局')+'" '
      +'aria-pressed="'+(LANDSCAPE?'true':'false')+'">'+(LANDSCAPE?'▯':'▭')+'</button>'
      +'<button class="vgear'+(VMENU?' on':'')+'" data-vmenu aria-label="展开或收起视图按键" '
      +'title="视图按键" aria-expanded="'+(VMENU?'true':'false')+'">⚙</button>'
      +'<button class="vbtn vguide'+(MINIMAL?'':' on')+'" data-minimal '
      +'aria-label="显示或隐藏主页指引" title="显示／隐藏主页指引" '
      +'aria-pressed="'+(!MINIMAL?'true':'false')+'">?</button>'
      +'<div class="viewtools" role="group" aria-label="视图按键">'
      +btn('full','⛶','全屏并铺满背景')
      +btn('opts','≡','收起舞台，看全部选项')
      +'</div>'+sndBtn();
  }
  /* 一次性事件委托：开局页与游戏页都生效，重绘不重复注册 */
  function onViewClick(ev){
    if(typeof Element==='undefined'||!ev.target||!ev.target.closest)return;
    if(ev.target.closest&&ev.target.closest('[data-close-set]')){
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
    const mn=ev.target.closest&&ev.target.closest('[data-minimal]');
    if(mn){MINIMAL=MINIMAL?0:1;applyDisplay();return;}
    const cf=ev.target.closest&&ev.target.closest('button[data-charfit]');
    if(cf){if(W.stage)W.stage.set('charfit',cf.dataset.charfit);render();return;}
    const zp=ev.target.closest&&ev.target.closest('[data-scene-preview]');
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
    if(ppp){
      const k=ppp.dataset.posePick;
      performLayer(k,1200);
      /* 全屏原稿预览里选的表情，预览立绘同步换上，不是只改主舞台 */
      if(PREVIEW&&W.stage&&W.stage.layerURL){
        const sp=document.querySelector('#scenePreview .sp-char');
        const u=W.stage.layerURL(k);
        if(sp&&u)sp.src=u;
      }
      closePosePanel();vibe(12);return;
    }
    const vp=ev.target.closest&&ev.target.closest('[data-voicepack]');
    if(vp){if(W.a11y&&W.a11y.setVoicePack)W.a11y.setVoicePack(vp.dataset.voicepack);
      applyDisplay();render();
      if(W.a11y&&W.a11y.announce)W.a11y.announce('向导声线已选'+vp.textContent.trim().split('\n')[0]);
      return;}
    const ta=ev.target.closest&&ev.target.closest('[data-talkact]');
    if(ta){if(W.a11y&&W.a11y.setTalkAct)W.a11y.setTalkAct(+ta.dataset.talkact);
      if(!+ta.dataset.talkact)talkEnd();
      render();return;}
    const cu=ev.target.closest&&ev.target.closest('[data-cue]');
    if(cu){cueToggle();render();return;}
    const ct=ev.target.closest&&ev.target.closest('[data-cue-try]');
    if(ct){if(W.audio){const pk=W.a11y&&W.a11y.pack?W.a11y.pack():{cue:1};
      W.audio.guideCue(ct.dataset.cueTry,pk.cue||1);}return;}
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
    const sk=ev.target.closest&&ev.target.closest('button[data-skin]');
    if(sk){SKIN=sk.dataset.skin;applyDisplay();render();return;}
    const bd=ev.target.closest&&ev.target.closest('button[data-backdrop]');
    if(bd){
      const ok=W.stage&&W.stage.set('backdrop',bd.dataset.backdrop,E.state&&E.state());
      if(!ok){if(W.a11y&&W.a11y.announce)W.a11y.announce('这个场景还没到进度');return;}
      applyDisplay();render();return;
    }
    const lp=ev.target.closest&&ev.target.closest('button[data-layer-preview]');
    if(lp){performLayer(lp.dataset.layerPreview,900);return;}
    const pt=ev.target.closest&&ev.target.closest('[data-pat]');
    if(pt){tapChar();return;}
    const pc=ev.target.closest&&ev.target.closest('[data-pchip]');
    if(pc){
      const chip=pc.closest('.pchip');if(chip)chip.classList.toggle('open');
      return;
    }
    const pcc=ev.target.closest&&ev.target.closest('[data-pchip-close]');
    if(pcc){
      const chip=pcc.closest('.pchip');if(chip)chip.classList.remove('open');
      return;
    }
    const af=ev.target.closest&&ev.target.closest('[data-avgfold]');
    if(af){
      const box=af.closest('.avgfold');
      if(box){const on=box.classList.toggle('open');
        af.textContent=on?'收起依据与说明':'▸ 依据与说明 · 点开看全文';}
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
    const op=ev.target.closest&&ev.target.closest('[data-scene-open]');
    if(op){
      const det=op.closest('[data-scene-details]');
      if(det){
        const host=det.querySelector('.scene-host'),tpl=det.querySelector('.scene-tpl');
        if(host&&tpl&&!host.childNodes.length)host.appendChild(tpl.content.cloneNode(true));
      }
      return;
    }
    /* v2.4：提示条按钮不在下面那组属性里，必须先处理，
       否则会被 if(!b)return 提前拦掉，「知道了」点了没反应。 */
    const lex=ev.target.closest&&ev.target.closest('[data-land-exit]');
    if(lex){applyLandscape(false,true);return;}
    const lhc=ev.target.closest&&ev.target.closest('[data-landhint-close]');
    if(lhc){hideLandHint();return;}
    const b=ev.target.closest('[data-view],[data-stage-size],[data-bubble-alpha],'
      +'[data-setmin],[data-fold],[data-guide],[data-landscape],'
      +'[data-flip],[data-split-reset],'
      +'[data-hint-mode],[data-hint-follow],[data-hint-reset]');
    if(!b)return;
    const d=b.dataset;
    const say=t=>{if(W.a11y&&W.a11y.announce)W.a11y.announce(t);};
    if(d.guide){
      if(d.guide==='say'){
        /* v2.0：同一个按钮就是开关。只要本轮朗读还活着，再点必定停，
           绝不重新 cancel 后从头念一遍。 */
        const ax=W.a11y;
        if(SAYING){
          if(ax&&ax.stopSpeak)ax.stopSpeak();
          SAYING=0;syncSayBtn();say('已停止朗读');
        }else{
          const bub=document.querySelector('.stage .bubble'),
                full=bub?(bub.dataset.full||bub.querySelector('.say')?.textContent||''):'',
                mood=W.stage&&W.stage.talkMood?W.stage.talkMood(full):'calm';
          const ok=W.a11y&&W.a11y.speakAs?W.a11y.speakAs(full||'这一笔',{role:'guide',mood:mood})
            :(W.stage&&W.stage.speakLine&&W.stage.speakLine());
          SAYING=ok?1:0;syncSayBtn();
          say(SAYING?'正在用角色音色念这一句，再点一次停止':'此浏览器暂不支持语音朗读');
          /* 念完 / 引擎不可用 / 被取消：由 wqn:speakend 统一复位，不用猜延时 */
        }
        vibe(SAYING?12:0);
      }else if(d.guide==='cue'){
        const ok=W.stage&&W.stage.guideCue&&W.stage.guideCue(b.dataset.kind||'curious');
        say(ok?'已响一声语气音':'请先打开音效');
      }
      return;
    }
    if(d.hintMode!==undefined){
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
    if(d.flip!==undefined){
      FLIP=FLIP?0:1;applySplit();saveSplit();render();return;
    }
    if(d.splitReset!==undefined){
      SPLIT=47;FLIP=0;applySplit();saveSplit();render();return;
    }
    if(d.landscape!==undefined){
      applyLandscape(+d.landscape?1:0,true);
      return;
    }
    if(d.view){
      if(d.view==='landscape'){
        applyLandscape(!LANDSCAPE,true);
        return;
      }
      if(d.view==='full'){
        STSIZE='immersive';if(W.stage)W.stage.set('size','immersive');
        if(TAB==='set')TAB='main';
        try{
          const de=document.documentElement;
          if(!document.fullscreenElement&&de.requestFullscreen)de.requestFullscreen().catch(()=>{});
          else if(document.fullscreenElement&&document.exitFullscreen)document.exitFullscreen().catch(()=>{});
        }catch(e){}
        applyDisplay();render();say('已开沉浸：当前场景铺满整屏');return;
      }
      if(d.view==='opts'){
        STSIZE='compact';if(W.stage)W.stage.set('size','compact');
        if(TAB==='set')TAB='main';
        render();
        setTimeout(()=>{const o=document.querySelector('.opts');
          if(o&&o.scrollIntoView)o.scrollIntoView({behavior:'smooth',block:'start'});},30);
        say('舞台已收起，全部选项直接铺开');return;
      }
    }
    if(d.stageSize){
      STSIZE=d.stageSize;if(W.stage)W.stage.set('size',STSIZE);
      if(TAB==='set')TAB='main';   /* 改完立刻回主屏看得到，不在设置页空等 */
      render();say('舞台已切到'+({compact:'紧凑',normal:'标准',immersive:'全屏'}[STSIZE]||STSIZE)+'档');
      return;
    }
    if(d.bubbleAlpha){
      BUB=d.bubbleAlpha;
      if(PRESET[d.bubbleAlpha]!==undefined)VEIL=PRESET[d.bubbleAlpha];
      applyDisplay();render();return;
    }
    if(d.setmin!==undefined){SETMIN=+d.setmin;render();return;}
    if(d.fold!==undefined){
      const k=d.fold;SETFOLD[k]=!SETFOLD[k];
      const c=document.querySelector('[data-set-card="'+k+'"]');
      if(c)c.classList.toggle('folded',!!SETFOLD[k]);
      return;
    }
  }
  if(typeof document!=='undefined'){
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
    /* v2.0 气泡拖放：左右不出屏、上下不限、与工具条等组件互斥 */
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
    /* v2.4：手机真的横过来时自动适配；减少动效下不排待机表演 */
    watchOrientation();
    applySplit();applyHint();
    /* v2.6：Esc 永远能退出横屏，不依赖找得到那颗小按钮 */
    document.addEventListener('keydown',e=>{
      if(e.key==='Escape'&&LANDSCAPE){applyLandscape(false,true);}
    });
    /* v2.1/v2.2：朗读开始驱动表演，结束（含引擎不可用、被取消）复位按钮与立绘 */
    document.addEventListener('wqn:speakstart',e=>talkBegin(e.detail||{}));
    document.addEventListener('wqn:speakend',()=>{
      SAYING=0;syncSayBtn();talkEnd();
    });
    document.addEventListener('pointerdown',e=>{
      const t=e.target;
      /* 全屏原稿预览里的立绘：可拖，但不出方框 */
      const spc=t&&t.closest&&t.closest('.sp-char');
      if(spc){
        const r0=spc.getBoundingClientRect();
        SPDRAG={el:spc,x:e.clientX,y:e.clientY,
          left0:r0.left,top0:r0.top,w:r0.width,h:r0.height};
        SPMOVED=0;IS_PREVIEW=1;
        spc.classList.add('sp-grab');
        clearTimeout(SPLONGT);
        SPLONGT=setTimeout(()=>{
          if(!SPDRAG||SPMOVED)return;
          SPMOVED=1;IS_PREVIEW=1;
          spc.classList.remove('sp-grab');
          openPosePanel(e.clientX,e.clientY);
        },560);
        return;
      }
      /* v2.8 提示条拖柄：左右不出屏，上下不限但至少留一截可见 */
      const hgrip=t&&t.closest&&t.closest('[data-hint-drag]');
      if(hgrip){
        const el=document.getElementById('landHint');if(!el)return;
        HINTDRAG={el:el,x:e.clientX,y:e.clientY,x0:HINTPOS.x,y0:HINTPOS.y};
        hgrip.classList.add('on');
        try{hgrip.setPointerCapture(e.pointerId);}catch(err){}
        return;
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
      /* 立绘本身不接指针，避免挡住教程卡、选项与工具条；改按坐标命中（竖屏兜底） */
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
      if(HINTDRAG){
        const d=rotDelta(e.clientX-HINTDRAG.x,e.clientY-HINTDRAG.y);
        const vw=window.innerWidth||390,vh=window.innerHeight||844;
        HINTPOS.x=Math.max(-vw/2+56,Math.min(vw/2-56,HINTDRAG.x0+d.u));
        HINTPOS.y=Math.max(-vh+56,Math.min(vh-56,HINTDRAG.y0+d.v));
        applyHint();return;
      }
      if(SPLITDRAG){
        const d=rotDelta(e.clientX-SPLITDRAG.x,e.clientY-SPLITDRAG.y);
        const cw=ROT90?(window.innerHeight||844):(window.innerWidth||390);
        const delta=d.u/Math.max(1,cw)*100;
        SPLIT=Math.max(35,Math.min(65,Math.round(
          FLIP?SPLITDRAG.split0+delta:SPLITDRAG.split0-delta)));
        applySplit();return;
      }
      if(SPDRAG){
        const dd=Math.abs(e.clientX-SPDRAG.x)+Math.abs(e.clientY-SPDRAG.y);
        if(dd>4){SPMOVED=1;clearTimeout(SPLONGT);}
        const c=SPDRAG.el,box=c.parentElement&&c.parentElement.getBoundingClientRect();
        if(!box)return;
        /* 目标左上角 = 按下时的左上角 + 累计位移，四边都钳在方框内 */
        let nl=SPDRAG.left0+(e.clientX-SPDRAG.x),
            nt=SPDRAG.top0+(e.clientY-SPDRAG.y);
        nl=Math.max(box.left+6,Math.min(box.right-6-SPDRAG.w,nl));
        nt=Math.max(box.top+6,Math.min(box.bottom-6-SPDRAG.h,nt));
        const dx=nl-SPDRAG.left0,dy=nt-SPDRAG.top0;
        SPOFF={x:dx,y:dy};
        c.style.transform='translate(calc(-50% + '+dx+'px),'+dy+'px)';return;
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
      if(Math.abs(dx)+Math.abs(dy)>(DRAG.fromHit?3:4)){DRAG.moved=true;clearTimeout(LONGT);}
      /* 旋转画布里必须把屏幕位移换成容器位移，否则拖起来跟手方向不对 */
      const rd=rotDelta(dx,dy);
      const limX=DRAG.fromHit?180:140,limY=DRAG.fromHit?150:120;
      CHAROFF.x=Math.max(-limX,Math.min(limX,DRAG.dx+rd.u));
      CHAROFF.y=Math.max(-limY,Math.min(limY,DRAG.dy+rd.v));
      const r=document.documentElement;
      r.style.setProperty('--char-dx',CHAROFF.x+'px');
      r.style.setProperty('--char-dy',CHAROFF.y+'px');
    });
    const endDrag=()=>{
      clearTimeout(LONGT);clearTimeout(SPLONGT);
      if(HINTDRAG){
        const g=HINTDRAG.el.querySelector('[data-hint-drag]');
        if(g)g.classList.remove('on');
        HINTDRAG=null;saveHint();return;
      }
      if(SPLITDRAG){
        SPLITDRAG.el.classList.remove('on');SPLITDRAG=null;
        document.documentElement.classList.remove('dragging-char');
        saveSplit();return;
      }
      if(SPDRAG){
        const c=SPDRAG.el,moved=SPMOVED;
        c.classList.remove('sp-grab');
        if(!moved){
          /* 短按：轻震 + 弹一下，不弹表情面板 */
          vibe(18);
          c.classList.remove('sp-bounce');void c.offsetWidth;c.classList.add('sp-bounce');
          setTimeout(()=>c.classList.remove('sp-bounce'),420);
        }
        SPDRAG=null;IS_PREVIEW=0;return;
      }
      if(BUBDRAG){BUBDRAG.el.classList.remove('bub-dragging');
        BUBDRAG=null;saveUI2();return;}
      if(!DRAG)return;
      const ch=DRAG.el,moved=DRAG.moved;DRAG=null;
      document.documentElement.classList.remove('dragging-char');
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
      const sp=ev.target&&ev.target.closest&&ev.target.closest('input[data-split]');
      if(sp){
        SPLIT=Math.max(35,Math.min(65,+sp.value||47));
        applySplit();saveSplit();return;
      }
      const br=ev.target&&ev.target.closest&&ev.target.closest('input[data-bub]');
      if(br){
        const k=br.dataset.bub,v=+br.value||0;
        BUBCFG[k]=v;bubApply();saveUI2();
        const lab=document.querySelector('[data-bub-val="'+k+'"]');
        if(lab)lab.textContent=v+(k==='w'?'px':k==='h'?'px':'');
        return;
      }
    });
    document.addEventListener('input',ev=>{
      const r=ev.target&&ev.target.closest&&ev.target.closest('input[data-veil]');
      if(!r)return;
      VEIL=Math.max(10,Math.min(100,+r.value||35));
      const lab=document.querySelector('[data-veil-val]');
      if(lab)lab.textContent=VEIL+'%';
      applyDisplay();
    });
  }

  /* v1.8 AVG 全屏舞台：只在主页开启；把长指示收进一条可点开的进度缩略条，
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
      if(!/同\s*期\s*人\s*物|本\s*朝\s*所\s*见|年\s*代\s*窗\s*口|下\s*一\s*朝/.test(tl.textContent))return;
      card.classList.add('longfold');
      const b=document.createElement('button');
      b.className='longfold-btn';b.dataset.longfold='1';b.textContent='▸ 展开全文';
      b.setAttribute('aria-label','展开这一卡的完整内容');
      card.insertBefore(b,tl.nextSibling);
    });
    /* 长依据／说明收进一个可展开块，主卡只留标题与正文，点开看全文 */
    panel.querySelectorAll('.card').forEach(card=>{
      if(card.querySelector('.avgfold')||card.classList.contains('longfold'))return;
      const extras=[...card.children].filter(c=>c.matches&&
        c.matches('.note,.gather,.mini,.details,.volgrid,.hr,.lens'));
      if(extras.length<1)return;
      const box=document.createElement('div');box.className='avgfold';
      const btn=document.createElement('button');btn.className='avgfold-btn';
      btn.dataset.avgfold='1';btn.textContent='▸ 依据与说明 · 点开看全文';
      btn.setAttribute('aria-label','展开这一卡的依据与说明');
      box.appendChild(btn);
      extras.forEach(x=>box.appendChild(x));
      card.appendChild(box);
    });
  }

  /* v1.7 主页极简：简单模式、教程进行中、以及任何需要指引的状态自动让位，
     否则会把难度提示与教程卡一起收掉，等于把该给的帮助藏了。 */
  function minimalActive(){
    let S=null;try{S=E.state&&E.state();}catch(e){}
    /* 非普通难度要留着难度横幅：极简不能把「我选了哪一档」这条也收掉 */
    const needGuide=!!(S&&(S.difficulty!=='normal'||S.tutorialOn||S.tutOn));
    return MINIMAL===1&&!needGuide;
  }
  function applyMinimal(){
    if(TAB!=='main'||typeof document==='undefined'||!minimalActive())return;
    const app=document.getElementById('app');if(!app)return;
    app.querySelectorAll('.tierbar,.head .badge').forEach(x=>x.classList.add('min-hide'));
    app.querySelectorAll('.volbar,.stats').forEach(x=>x.classList.add('min-slim'));
    app.querySelectorAll('.mini.center').forEach(x=>{
      if(/新手指引|打开指引|帮助/.test(x.textContent||''))x.classList.add('min-hide');
    });
    app.querySelectorAll('.stage-tag').forEach(x=>x.classList.add('min-hide'));
    document.querySelectorAll('.tabs').forEach(x=>x.classList.add('tabs-min'));
  }

  /* 设置页卡片：可单独收起、可精简隐藏；不改动生成 HTML，只做 DOM 后处理 */
  const KEEP=['视 角','显 示','视 图','舞 台','朗 读','表 演 关 卡','人 声'];
  function applySetCards(){
    if(TAB!=='set'||typeof document==='undefined')return;
    const panel=document.querySelector('.panel.on');if(!panel)return;
    if(!panel.querySelector('.drawerbar')){
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
  function artTopHTML(S,isStart){
    if(!W.art)return '<div class="artwrap artbare">'+sndBtn()+'</div>';
    if(!ARTON)return '<div class="artwrap artbare">'+sndBtn()+'</div>';
    let kind='choice';
    if(isStart)kind='opening';
    else if(S.phase==='volume')kind='volume';
    else if(S.phase==='ending'||S.phase==='scroll')kind='ending';
    else if(S.phase==='turnover'||S.phase==='realend')kind='turnover';
    else if(TAB==='fam')kind='family';
    else if(TAB==='geo')kind='atlas';
    else if(TAB==='civ'||TAB==='sea'||TAB==='vol'||TAB==='set')kind='civ';
    const special=isStart||['volume','ending','scroll','turnover','realend'].indexOf(S.phase)>=0
      ||['fam','geo','civ','sea','vol','set'].indexOf(TAB)>=0;
    const lab=isStart?'第一堆篝火':(S.phase==='volume'?'卷末 · 汇流':
      S.phase==='ending'||S.phase==='scroll'?'终章 · 收卷':
      S.phase==='turnover'||S.phase==='realend'?'更迭':'卷 '+(S.vol?S.vol.n:1));
    const svg=special?W.art.scene(kind,artOpts(S,lab)):W.art.banner(artOpts(S,lab));
    return '<div class="artwrap">'+svg+sndBtn()+'</div>';
  }
  function cue(name){if(AU())AU().cue(name);}
  /* v1.0 帝王在位时间条：横轴为该政权自身的年份区间，一行一位，
     行色按「可考／旁支推举／摄政共治／废立复辟／存疑／传说」分。
     只画区间与继立口径，不宣称精确边界、不把并立政权排成一条线。 */
  let TLZ=1;
  const TLCOLOR={normal:'#c9a227',collateral:'#7fb3d5',regency:'#8e7cc3',
    broken:'#c96a6a',disputed:'#8f8067',legend:'#5d574c'};
  function dyTimelineSVG(polity){
    const DY=W.dynasty,d=DY?DY.timelineData(polity):null;
    if(!d)return '<div class="mini">此政权暂无可画纪年锚点。</div>';
    const W0=760,L=152,R=18,TOP=18,ROW=17;
    const H=TOP+d.rows.length*ROW+30;
    const span=Math.max(1,d.to-d.from);
    const X=y=>L+(y-d.from)/span*(W0-L-R);
    let o='<svg id="dyTlSvg" viewBox="0 0 '+W0+' '+H+'" '
      +'style="width:760px;min-width:100%;height:'+H+'px;background:#15110c;border-radius:8px" '
      +'xmlns="http://www.w3.org/2000/svg">';
    /* 年份刻度 */
    for(let i=0;i<=4;i++){
      const y=d.from+span*i/4,x=X(y);
      o+='<line x1="'+x.toFixed(1)+'" y1="'+TOP+'" x2="'+x.toFixed(1)+'" y2="'
        +(TOP+d.rows.length*ROW)+'" stroke="#3a3122" stroke-width="1"/>'
        +'<text x="'+x.toFixed(1)+'" y="'+(H-8)+'" fill="#8f8067" font-size="10" '
        +'text-anchor="middle" font-family="sans-serif">'
        +(y<0?'前'+Math.round(-y):'公'+Math.round(y))+'</text>';
    }
    d.rows.forEach((r,i)=>{
      const yy=TOP+i*ROW+2,x0=X(r.y0),x1=Math.max(x0+3,X(r.y1));
      const col=TLCOLOR[r.cat]||TLCOLOR.normal;
      const dash=(r.cat==='legend'||r.cat==='disputed')?' stroke-dasharray="3,2"':'';
      o+='<text x="4" y="'+(yy+9)+'" fill="#d8c9a8" font-size="10" '
        +'font-family="sans-serif">'+esc(r.name.length>11?r.name.slice(0,11)+'…':r.name)+'</text>'
        +'<line x1="'+L+'" y1="'+(yy+6)+'" x2="'+(W0-R)+'" y2="'+(yy+6)
        +'" stroke="#241d13" stroke-width="1"/>'
        +'<rect x="'+x0.toFixed(1)+'" y="'+yy+'" width="'+(x1-x0).toFixed(1)
        +'" height="11" rx="2" fill="'+col+'"'+dash+' opacity="0.88">'
        +'<title>'+esc(r.name+' · '+r.raw+' · '+(r.succ||'继立未详')
          +(r.note?' · '+r.note:''))+'</title></rect>';
    });
    o+='</svg>';
    return o;
  }
  function dyTimelineLegend(){
    const DY=W.dynasty;if(!DY)return '';
    return '<div class="mini" style="margin-top:6px">图例：'
      +Object.keys(DY.TL_LABEL).map(k=>'<span style="color:'+TLCOLOR[k]+'">■ '
        +esc(DY.TL_LABEL[k])+'</span>').join('　')
      +'<br>虚线为传说／存疑层。条长只表示年代窗口，不表示权力强弱；'
      +'共治、废立、追尊、并立已在色别里分开，不排成前后相续的帝系。</div>';
  }
  const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const cleanText=s=>String(s||'').replace(/\s+/g,' ').trim();
  /* 静态片段缓存：姓氏 1295 条、判读 264 道、深读 106 则每次 render 重拼字符串很贵。
     数据恒定，只有「已答标记」随 S.readingLog 变；按版本缓存，每个 key 只留一份。 */
  let KINZ=1;
  const HTMLC={},LAZYOPEN=new Set();
  function cacheHTML(key,ver,build){
    const e=HTMLC[key];
    if(e&&e.ver===ver)return e.html;
    const html=build();HTMLC[key]={ver:ver,html:html};return html;
  }
  function readVer(S){
    const r=S.readingLog||[];
    return r.length+':'+(r.length?r[r.length-1].id+'/'+(r[r.length-1].choice||''):'-');
  }
  function lensLine(S){
    // 只读不摇随机数：渲染次数再多也不改 rngState，保证种子可复现
    const person=W.civilization.lens(S);
    if(person&&S.turn%2===0)return person;
    const V=D.views[S.view];
    let s=V.line[(S.turn+S.echo.length)%V.line.length];
    if(S.echo.length&&S.turn%3===0)s+=' 旧例里还留着「'+S.echo[S.turn%S.echo.length]+'」。';
    return s;
  }
  function statGrid(st,S){
    let h='<div class="stats">';
    D.keyOrder.forEach(k=>h+='<div class="st" title="'+esc(W.difficulty.statHelp[k]||D.keys[k])+'"><span>'+D.keys[k]+'</span><b>'+st[k]+'</b><div class="bar"><i style="width:'+st[k]+'%"></i></div></div>');
    h+='</div>';
    /* 简单模式：把八维逐条讲清楚，而不是只给八个缩写 */
    if(S&&W.difficulty&&W.difficulty.hints(S)>=2){
      h+='<details class="fold" '+(S.turn<3?'open':'')+'><summary>八 维 是 什 么 · 点 开 看 解 释</summary>'
        +D.keyOrder.map(k=>'<div class="mini"><b>'+D.keys[k]+'</b>　'+esc(W.difficulty.statHelp[k]||'')+'</div>').join('')
        +'<div class="mini" style="color:var(--dim)">这些数是这一支人的处境，不是分数；没有「赢」的标准答案。</div></details>';
    }
    return h;
  }
  /* 教程卡：全局浮在所有页签之上，切页签也能看到进度 */
  function tutorialHTML(S){
    const T=W.tutorial,t=T.ensure(S);
    if(!t||!t.on)return '';
    const st=T.step(S),pr=T.progress(S),ok=T.gateOK(st,S);
    const last=st.gate==='ack'||pr.idx===pr.total;
    return '<div class="tutcard"><div class="tuthead"><b>新 手 教 程 · '+pr.idx+' / '+pr.total+'</b>'
      +'<span class="mini">'+esc(T.meta.subtitle)+'</span></div>'
      +'<div class="tutbar"><i style="width:'+Math.round(pr.idx/pr.total*100)+'%"></i></div>'
      +'<div class="tagline" style="margin-top:8px">'+esc(st.title)+'</div>'
      +'<div class="mini" style="margin-top:5px">'+esc(st.body)+'</div>'
      +'<div class="note" style="margin-top:7px"><b>小提示：</b>'+esc(st.tip)+'</div>'
      +'<div class="mini" style="margin-top:6px;color:var(--gold)">'+esc(st.act)
      +(ok&&!last?'　✓ 这一步你做到了':'')+'</div>'
      +'<div class="tutbtns">'
      +(pr.idx>1?'<button data-tut="prev">上一步</button>':'')
      +'<button data-tut="next" class="on">'+(pr.idx===1?'知 道 了':pr.idx===pr.total?'完 成':'下一步 ▸')+'</button>'
      +'<button data-tut="skip">跳过教程</button></div>'
      +'<div class="mini" style="color:var(--dim);margin-top:5px">教程只讲玩法与界面，不改写史实；可在设置页随时重看。</div></div>';
  }
  /* 简单模式在每个非推演阶段补一句「这一步在做什么」 */
  const PHASE_HELP={
    result:'这一笔已落，点「继续推演」让岁月往前走；也可以「随时收卷」先看一份报告。',
    volume:'卷末汇流：岔路在这一笔收回到同一条时间线上。「再续一卷」继续，「就此收卷」出报告。',
    ending:'走到终章了。终章不是失败，只是这一局的一个落点；仍可「再续余编」。',
    realend:'真实血脉按考据年表走到了终结之年；终结原因的学界不同口径也列在卡上。',
    turnover:'朝代更迭卡：前朝终结年、过渡期、下一朝建立事件都写在这里，间朝如实留白。',
    scroll:'这是一份收卷报告：八维终值、所见条目、族谱、旧例、里程碑与地方史。合上后还能继续推演。'
  };
  function hintFor(tab,S){
    if(!W.difficulty||W.difficulty.hints(S)<2)return '';
    const m={civ:'文明册按六大知识类分组；点「本轮新增」看新维度，底下有深读卡与人群姓氏册。',
      geo:'舆图可缩放、拖动、拖年份滑杆；点「地方志」图层再点绿点，看该地四条本地史锚点。',
      vol:'卷轴页是本局编年时间轴：卷界、史事、迁徙、工程一屏看完。',
      set:'设置页管字号、对比度、存档槽、导出与分享串；也能重看新手教程。',
      log:'编年页按时间倒序列出这一局走过的事，史实标「史海可考」，其余标「推演」。',
      fam:'族谱页看在籍与凋零、本族称法（推演）与落脚地；人不会活过百年，跨年的是世代。',
      sea:'史海页列出已亲历的可考史事、旧例与得名；每条都带出处标记。'};
    return m[tab]?'<div class="hintbar">指引 · '+esc(m[tab])+'</div>':'';
  }
  function stanceLabel(S){
    const st=S.readingStance||{},a=st.suspend||0,b=st.settle||0;
    if(a+b<2)return '尚未成形';
    return a>b?'偏存异说（'+a+' : '+b+'）':b>a?'偏按通说（'+b+' : '+a+'）':'两持（'+a+' : '+b+'）';
  }
  function tutorialStat(S){
    const t=W.tutorial.ensure(S),n=W.tutorial.STEPS.length;
    return (t.on?'进行中 · ':'')+Math.min(n,t.idx+1)+' / '+n+' 步';
  }
  function scrollHTML(S,final){
    const d=WV.scrollData(S,final),f=E.fmtYear,sh=E.fmtShort;
    let h='<div class="endcard"><div class="tagline">'+(final?'终 卷 · 就 此 收 笔':'随 时 收 卷')+'</div>'
      +'<div class="seal">卷 终</div><h2>'+(final?'这一卷，合上了':'此局至此，先记一笔')+'</h2>'
      +'<div class="w">'+f(-5000)+' 起，至 '+f(d.to)+'。<br>共 '+d.turn+' 笔、'+d.vol+' 卷，第 '+d.gen+' 代，传承度 '+d.score+'。</div>'
      +(d.ending?'<div class="note"><b>终章：</b>'+d.ending.name+' · '+d.ending.why+'</div>':'')
      +(d.realEnd?'<div class="note"><b>真实终章：</b>'+esc(d.realEnd.name)+' · '+esc(d.realEnd.year)+'<br>'+esc(d.realEnd.reason)
        +(d.realEnd.dispute?'<br><span style="color:var(--dim)">学界另有口径：'+esc(d.realEnd.dispute)+'</span>':'')+'</div>':'')
      +'<div class="note"><b>总评：</b>'+d.verdict+'</div>'
      +'<button class="big" data-act="backscroll">合 上 卷 · 继 续 推 演</button>'
      +'<button class="big alt" data-act="restart">另 起 一 局</button>'
      +'<div class="mini center" style="margin-top:10px;color:var(--dim)">此卷记于 '
      +esc(VER())+'　·　版本只标识文件，不是史实纪年</div></div>';
    h+='<div class="card"><div class="tagline">八 维 终 值</div>'+statGrid(d.st)+'</div>';
    if(d.chain){
      h+='<div class="card"><div class="tagline">朝 代 长 河 · '+d.chain.entities.length+' 朝</div>'
        +'<div class="mini">'+esc(d.chain.title)+'　'+E.fmtShort(d.chain.from)+' — '+E.fmtShort(d.chain.to)+'</div>';
      d.chain.entities.forEach((x,i)=>{
        h+='<div class="row"><span class="y">'+(i+1)+'</span><b>'+esc(x.name)+'</b> '
          +(x.visited?'<span class="s">已历</span>':'<span class="s">未至</span>')
          +' <span class="s">'+E.fmtShort(x.from)+'—'+E.fmtShort(x.to)+' · '+esc(x.transition)+'</span>'
          +(x.gap?'<div class="mini">间朝：'+esc(x.gap.name)+'（'+x.gap.years+' 年）</div>':'')
          +'</div>';
      });
      h+='<div class="hr"></div><div class="mini">'+esc(d.chain.classification)+'</div></div>';
    }
    if(d.entity){
      h+='<div class="card"><div class="tagline">'
        +(d.entity.isHouse?'世 家 浮 沉 · 六 阶 段':'真 实 血 脉 · 六 阶 段')
        +'</div><div class="mini">'+esc(d.entity.name)
        +(d.entity.isHouse
          ?'　兴起 → 扩张 → 鼎盛 → 转折 → 衰落 → 散脉。六阶段为通识级框架锚点，'
           +'「散脉」指门第政治位置消退，不是家族人口消失；本局族人不与其攀附血缘。'
          :'　建立 → 扩张 → 鼎盛 → 转折 → 衰落 → 终结。节点按考据年表，阶段态势与抉择为游戏推演。')
        +'</div>';
      d.entity.phases.forEach(p=>{
        h+='<div class="row"><span class="y">'+esc(p.label)+'</span><b>'+esc(p.phase)+'</b>'
          +'<div class="mini">'+esc(p.event)+'</div>'
          +(p.phase==='终结'?'<div class="mini" style="color:var(--gold)">终结原因：'+esc(d.entity.endReason)+'</div>':'')
          +'</div>';
      });
      if(d.entity.dispute)h+='<div class="note"><b>终结原因的不同解释：</b>'+esc(d.entity.dispute.alternatives||'')+'</div>';
      h+='</div>';
    }
    if(d.civ){
      h+='<div class="card"><div class="tagline">文 明 册 · '+d.civ.seen.length+' / '+d.civ.total+'</div>';
      d.civ.byDim.forEach(x=>h+='<div class="row"><b>'+x.name+'</b> <span class="s">'+x.got+' / '+x.total+'</span></div>');
      h+='<div class="hr"></div><div class="volgrid">'
        +'<div>考据判读<b>'+(S.quiz?S.quiz.right:0)+' 对 / '+(S.quiz?S.quiz.wrong:0)+' 误</b></div>'
        +'<div>鉴宝卡<b>'+Object.keys(S.treasureSeen||{}).length+' / '+D.civilization.treasures.length+'</b></div>'
        +(d.dynasty?'<div>同期在位<b>'+d.dynasty.rulers+' / '+d.dynasty.rulerTotal+'</b></div>'
          +'<div>同期名族<b>'+d.dynasty.houses+' / '+d.dynasty.houseTotal+'</b></div>':'')
        +'<div>人物生平<b>'+Object.keys(S.bioSeen||{}).length+' / '+D.civilization.biographies.length+'</b></div>'
        +'<div>家族跨朝<b>'+(S.famLog?S.famLog.length:0)+' 朝</b></div>'
        +'<div>已历气候<b>'+Object.keys(S.climateSeen||{}).length+' / '+D.geoclimate.events.length+'</b></div>'
        +'<div>文本别册<b>'+Object.keys(S.fringeSeen||{}).length+'</b></div>'
        +'<div>误读记录<b>'+((S.misread?S.misread.text+S.misread.hypothesis:0))+'</b></div>'
        +'<div>真实性档位<b>'+esc(W.reality.tier(S.reality).short)+'</b></div>'
        +'<div>难度档位<b>'+esc(W.difficulty.tier(S.difficulty).short)+'</b></div>'
        +'<div>新手教程<b>'+esc(tutorialStat(S))+'</b></div>'
        +'<div>判读合计<b>'+Object.keys(S.readingSeen||{}).length+' / '
        +D.reading_quiz.items.length+' 则</b></div>'
        +'<div>读法 / 互证 / 称谓<b>'
        +(S.readingByKind?(S.readingByKind.reading||0):0)+' / '
        +(S.readingByKind?(S.readingByKind.local||0):0)+' / '
        +((S.readingByKind?(S.readingByKind.surname||0)+(S.readingByKind.people||0):0))+'</b></div>'
        +'<div>本族读法倾向<b>'+esc(stanceLabel(S))+'</b></div>'
        +'<div>族谱旧账<b>'+((S.famDebts||[]).filter(x=>!x.cleared).length)
        +' 笔待清 · '+(S.clearedDebts||0)+' 笔已了</b></div>'
        +'<div>本局族人<b>'+W.people.summary(S).total+' 人 / '
        +W.people.summary(S).generations+' 代</b></div>'
        +'<div>亲习技能 / 生平笔数<b>'+W.people.summary(S).skills+' 项 / '
        +W.people.summary(S).skillLog+' 笔</b></div>'
        +'<div>遇真实人物<b>'+W.people.summary(S).realPeople+' 位 / 全册 '
        +D.civilization.items.filter(x=>x.dim==='P').length+' 位</b></div>'
        +'<div>继嗣制<b>'+esc(W.kinship?W.kinship.summary(S).systemName:'—')+'</b></div>'
        +'<div>夫妇 / 赘婿<b>'+(W.kinship?W.kinship.summary(S).marriages:0)+' 对 / '
        +(W.kinship?W.kinship.summary(S).uxorilocal:0)+' 位</b></div>'
        +'<div>亲属称谓<b>'+(W.kinship?W.kinship.summary(S).termsPresent:0)+' / '
        +(W.kinship?W.kinship.summary(S).termsTotal:0)+' 类</b></div>'
        +'</div><div class="mini" style="color:var(--dim)">族人生平、技能、传承与亲属关系均为本局推演，'
        +'不是史实人物履历；史册对照另见族谱页，不攀附血缘。</div><div class="hr"></div>';
    h+='<div class="note"><b>分层纪律：</b>史实 / 文本传统 / 未证实假说 / 史前可考四层严格分离。'
      +'本局档位 '+esc(W.reality.tier(S.reality).name)+'；'
      +(S.reality==='wild'?'曾开放未证实假说，但每张卡均标注无证据，未写入史实编年。'
        :'未证实假说全程未开放。')
      +'气候现象只作环境压力，不作王朝兴衰归因。</div>';
      d.civ.byDim.forEach(x=>{
        const list=d.civ.seen.filter(v=>v.dimName===x.name);
        if(!list.length)return;
        h+='<div class="tagline">'+x.name+'</div>';
        list.forEach(v=>h+='<div class="row"><span class="y">'+esc(v.rawYear)+'</span>'+esc(v.title)
          +' <span class="s">'+esc(v.category)+' · '+esc(v.status)+'</span></div>');
      });
      h+='<div class="hr"></div><div class="mini">条目逐条带出处与年代可信度；完整出处索引见工程 data/civ_sources.json。</div></div>';
    }
    h+='<div class="card"><div class="tagline">所 历 史 事 · '+d.hist.length+'</div>';
    h+=d.hist.length?d.hist.map(x=>'<div class="row"><span class="y">'+sh(x.y0)+'</span><b>'+esc(x.title)+'</b> <span class="s">'+x.source+'</span></div>').join(''):'<div class="mini">一桩可考之事也未亲历，倒是走出了一条全然自己的路。</div>';
    h+='</div>';
    h+='<div class="card"><div class="tagline">族 谱 · 在籍 '+d.alive.length+' / 凋零 '+d.dead+'</div>';
    if(S.clanName)h+='<div class="mini" style="color:var(--gold)">本族称法（推演）：'
      +esc(S.clanName)+' · 得姓多源，不作血缘断言。</div>';
    h+=d.alive.map(p=>'<div class="row"><span class="y">'+p.gen+'代</span><b>'+esc(p.name)+'</b> <span class="s">'+p.trait+'</span>'+(p.id===S.ruler?' <span style="color:var(--gold)">〔当家〕</span>':'')+'</div>').join('');
    h+='<div class="hr"></div><div class="mini">历任当家：'+(d.rulers.map(p=>esc(p.name)+(p.alive?'':'（已故）')).join(' → ')||'—')+'</div></div>';
    const locN=Object.keys(S.localSeen||{}).length,peoN=Object.keys(S.peopleSeen||{}).length;
    if(locN||peoN)h+='<div class="card"><div class="tagline">地 方 与 人 群 · 本 局 所 见</div>'
      +'<div class="mini">引用地方史锚点 '+locN+' 条、人群／姓氏条目 '+peoN+' 条'
      +'（全册地方史 '+D.localities.items.length+' 条 / 姓氏 '+D.peoples.surnames.length
      +' 条 / 人群 '+D.peoples.peoples.length+' 条）。</div>'
      +'<div class="mini" style="color:var(--dim)">'+esc(D.peoples.meta.disclaimer)+'</div>'
      +'<div class="mini">'+esc(D.localities.meta.boundary)+'</div></div>';
    h+='<div class="card"><div class="tagline">旧 例 · '+d.tags.length+' 则</div>';
    h+=d.tags.length?d.tags.map(t=>'<span class="pill">'+esc(t)+' ×'+d.tagCounts[t]+'</span>').join(''):'<div class="mini">尚无。</div>';
    const comp=E.completedProjects(),pled=E.projectLedger(),prj=E.projects();
    if(comp.length||Object.keys(pled).length||prj.length){
      h+='<div class="hr"></div><div class="tagline">跨 笔 决 议 · 工 程 账</div>';
      comp.forEach(p=>h+='<div class="row"><span class="y">'+E.fmtShort(p.from)+'</span><b>'+esc(p.name)+'</b>'
        +'<span class="s">至 '+E.fmtShort(p.to)+'</span><div class="mini">'+esc(p.note)+'</div></div>');
      prj.forEach(p=>{
        const def=D.consequences.projects.find(x=>x.id===p.pid);
        h+='<div class="row"><b>'+esc(def?def.name:p.pid)+'</b><span class="s">在办 '+p.stage+'/'+p.total+' 笔</span></div>';
      });
      if(Object.keys(pled).length)h+='<div class="mini" style="margin-top:6px">长期账本：'
        +D.keyOrder.filter(k=>pled[k]).map(k=>D.keys[k]+' 衰减 −'+Math.round(pled[k]*100)+'%').join('　')
        +'（推演，不是史实产出）</div>';
    }
    const roads=E.allRoads(10);
    if(roads.length){
      h+='<div class="hr"></div><div class="tagline">未 走 之 路 · 近 '+roads.length+' 条</div>';
      roads.forEach(x=>h+='<div class="row"><span class="y">'+E.fmtShort(x.y)+'</span>'
        +esc(x.t.length>40?x.t.slice(0,39)+'…':x.t)
        +'<div class="mini">'+esc(W.consequences.effText(x.gain))
        +(x.basis?' · 依据 '+esc(x.basis):'')+'</div></div>');
      h+='<div class="mini" style="color:var(--dim)">'+esc(D.consequences.roads.disclaimer)+'</div>';
    }
    const sts=E.stances();
    if(sts.length){
      h+='<div class="hr"></div><div class="tagline">考 据 取 舍 · '+sts.length+' 处</div>';
      sts.slice(-6).reverse().forEach(x=>h+='<div class="row"><span class="y">'+E.fmtShort(x.y)+'</span>'
        +esc(x.title)+' <span class="s">'+esc(x.status)+' · '
        +(x.choice==='suspend'?'存其异说':'从其通说')+'</span></div>');
      h+='<div class="mini" style="color:var(--dim)">'+esc(D.consequences.debate.disclaimer)+'</div>';
    }
    h+='<div class="hr"></div><div class="tagline">里 程 碑 · '+d.mil.length+'</div>';
    h+=d.mil.length?d.mil.slice().reverse().slice(0,30).map(m=>'<div class="row"><span class="y">'+sh(m.y)+'</span>'+esc(m.t)+'</div>').join(''):'<div class="mini">尚无可记。</div>';
    h+='</div>';
    return h;
  }
  /* 本局编年时间轴：卷界 / 史事 / 迁徙 / 工程 / 当前，横向一屏看完这一局 */
  function timelineHTML(S){
    const from=(S.log&&S.log.length&&S.log[0].y)||-5000,to=Math.max(S.year,from+1);
    const span=Math.max(1,to-from);
    const pct=y=>Math.max(0,Math.min(100,(y-from)/span*100));
    const vols=(S.volLog||[]).map(v=>v.to).filter(y=>y>=from&&y<=to);
    const marks=[];
    const scan=(arr)=>(arr||[]).forEach(l=>{
      if(!l||l.y<from||l.y>to||!l.t)return;
      let kind=null;
      if(l.t.indexOf('【家族 · 推演】')===0||l.t.indexOf('家族迁徙')>=0)kind='fam';
      else if(l.t.indexOf('工程')>=0||l.t.indexOf('立项')>=0||l.t.indexOf('研习')>=0)kind='work';
      else if(/亲历|终章|更迭|阶段|入新纪|文明 ·|气候 ·|立例/.test(l.t))kind='hist';
      if(kind)marks.push({y:l.y,kind:kind,t:l.t});
    });
    scan(S.log);scan(S.mil);
    const color={fam:'#f0be6e',work:'#b49ad9',hist:'#7fc7a0'};
    let h='<div class="card"><div class="tagline">本 局 编 年 时 间 轴</div>'
      +'<div class="mini">左端 '+E.fmtShort(from)+'，右端 '+E.fmtShort(to)+'（本局当前年份）。'
      +'绿点＝亲历史事／更迭，橙点＝家族迁徙，紫点＝工程节点，竖线＝卷界。'
      +'位置按年份线性排布；远古一笔跨百年，故点位疏密不表示事件频率。</div>'
      +'<div class="tlwrap"><div class="tlbase"></div>';
    vols.forEach(y=>{h+='<i class="tlvol" style="left:'+pct(y)+'%"></i>';});
    marks.slice(-46).forEach(m=>{
      h+='<i class="tlmark" style="left:'+pct(m.y)+'%;background:'+color[m.kind]+'" title="'
        +esc(E.fmtShort(m.y)+' '+m.t.slice(0,40))+'"></i>';
    });
    h+='<i class="tlnow" style="left:'+pct(to)+'%"></i></div>'
      +'<div class="tlrow"><span>'+E.fmtShort(from)+'</span><span style="color:var(--gold)">'
      +E.fmtShort(to)+' · 当前</span></div>'
      +'<div class="mini" style="margin-top:6px">共 '+vols.length+' 道卷界、'+marks.length+' 个可标节点，'
      +'第 '+(S.vol?S.vol.n:1)+' 卷。轴只按本局已发生的编年绘制，不补写未至之世。</div></div>';
    return h;
  }
  function volumeHTML(S){
    const r=S.volEnd||{},f=E.fmtYear;
    let h='<div class="endcard"><div class="tagline">卷 末 · 汇 流</div><div class="seal">'+WV.volTitle(r.n)+'</div>'
      +'<h2>卷 '+r.n+' 毕</h2><div class="w">'+f(r.from)+' — '+f(r.to)+'　共 '+r.picks+' 笔</div>'
      +'<div class="gather"><b>汇流：</b>'+r.echo+(r.gain?'<br>（'+WV.keyNames[r.top]+'+'+r.gain+'，带入下一卷）':'')+'</div></div>';
    h+='<div class="card"><div class="tagline">本 卷 得 失</div><div class="volgrid">';
    const items=[['亲历史事',r.hist.length+' 桩'],['新立旧例',r.newTags.length+' 则'],
      ['分支后续',r.chains+' 次'],['族中凋零',r.dead+' 人'],
      ['世代递进',r.gen+' 代'],['史事回响',r.histCount+' 桩']];
    items.forEach(x=>h+='<div>'+x[0]+'<b>'+x[1]+'</b></div>');
    h+='</div><div class="hr"></div><div class="mini">八维增减：'
      +D.keyOrder.filter(k=>r.diff[k]).map(k=>D.keys[k]+(r.diff[k]>0?'+':'')+r.diff[k]).join('　')+'</div>';
    if(r.newTags.length)h+='<div style="margin-top:10px">'+r.newTags.map(t=>'<span class="pill">'+esc(t)+'</span>').join('')+'</div>';
    if(r.hist.length)h+='<div class="hr"></div><div class="mini">'+r.hist.slice(0,8).map(t=>'· '+esc(t)).join('<br>')+'</div>';
    if((r.jobs&&r.jobs.length)||(r.optEcho&&r.optEcho.length)){
      h+='<div class="hr"></div><div class="tagline">这 一 卷 的 行 当 与 回 响</div>';
      if(r.jobs&&r.jobs.length)h+='<div class="mini">族中业：'+r.jobs.map(j=>'<span class="pill">'+esc(j)+'</span>').join('')+'</div>';
      if(r.optEcho&&r.optEcho.length)h+='<div class="mini" style="margin-top:6px">'
        +r.optEcho.map(x=>'· '+esc(x.t)).join('<br>')+'</div>';
    }
    if((r.projects&&r.projects.length)||(r.completed&&r.completed.length)){
      h+='<div class="hr"></div><div class="tagline">跨 笔 决 议 · 还 没 完 的 事</div>';
      (r.projects||[]).forEach(p=>h+='<div class="row"><b>'+esc(p.name)+'</b> <span class="s">'
        +p.stage+'/'+p.total+' 笔 · 起于 '+E.fmtShort(p.from)+'</span>'
        +'<div class="mini">'+esc(p.title)+'　往后还会出现岁修、验收，也可罢手。</div></div>');
      (r.completed||[]).forEach(p=>h+='<div class="mini" style="color:var(--gold)">· '+esc(p.name)
        +' 已验收（'+E.fmtShort(p.from)+'—'+E.fmtShort(p.to)+'），长期增益写入账本。</div>');
    }
    if(r.roads&&r.roads.length){
      h+='<div class="hr"></div><div class="tagline">'+esc(D.consequences.roads.label)+'</div>';
      r.roads.forEach(x=>h+='<div class="row"><span class="y">'+E.fmtShort(x.y)+'</span>'
        +'<b>'+esc(x.t.length>44?x.t.slice(0,43)+'…':x.t)+'</b> <span class="s">'+esc(x.badge)+'</span>'
        +'<div class="mini">当时预估：'+esc(W.consequences.effText(x.gain))
        +(x.risk?' · 失手 '+Math.round(x.risk*100)+'%':'')
        +(x.basis?' · 依据 '+esc(x.basis):'')+'</div></div>');
      h+='<div class="mini" style="color:var(--dim)">'+esc(D.consequences.roads.disclaimer)+'</div>';
    }
    h+='</div><div class="card"><button class="big" data-act="contvol">再 续 一 卷 ▸</button>'
      +'<button class="big alt" data-act="scroll-final">就 此 收 卷</button></div>';
    return h;
  }
  function endingHTML(S){
    const e=S.ending;
    return '<div class="endcard"><div class="tagline">终 章</div><div class="seal">'+esc(e.name)+'</div>'
      +'<h2>'+esc(e.why)+'</h2><div class="w">'+esc(e.word)+'</div>'
      +'<div class="note"><b>总评：</b>'+WV.verdict(S)+'</div>'
      +'<button class="big" data-act="scroll-final">就 此 收 卷</button>'
      +'<button class="big alt" data-act="epilogue">再 续 余 编（不结束）</button></div>';
  }
  function realEndHTML(S){
    const r=S.realEnd||{};
    let h='<div class="endcard"><div class="tagline">'+(S.mode==='succession'?'长 河 终 章':'真 实 终 章')+'</div>'
      +'<div class="seal">'+esc(r.name||'')+'</div>'
      +'<h2>'+esc(r.year||'')+'</h2>'
      +'<div class="w">'+esc(r.word||'')+'</div>'
      +'<div class="note"><b>史实节点：</b>'+esc(r.phaseEvent||'')+'</div>'
      +'<div class="note"><b>终结原因：</b>'+esc(r.reason||'')+'</div>';
    if(r.dispute)h+='<div class="note"><b>学界不同口径：</b>'+esc(r.dispute)+'</div>';
    h+='<div class="note"><b>总评：</b>'+WV.verdict(S)+'</div>'
      +'<button class="big" data-act="scroll-final">就 此 收 卷</button>'
      +'<button class="big alt" data-act="realend-cont">续 为 遗 民（余编）</button></div>';
    return h;
  }
  function turnoverHTML(S){
    const r=S.turnover||{},f=E.fmtYear,sh=E.fmtShort;
    let h='<div class="endcard"><div class="tagline">朝 代 更 迭 · 第 '+r.idx+' / '+r.total+' 朝</div>'
      +'<div class="seal">'+esc(r.name)+'</div>'
      +'<h2>'+sh(r.from)+' — '+sh(r.to)+'</h2>'
      +'<div class="w">'+esc(r.name)+' 的六阶段走完了。<br>'
      +'终结年 '+sh(r.to)+'，不是随机判定，是考据年表里的节点。</div>'
      +'<div class="note"><b>终结原因：</b>'+esc(r.endReason)+'</div>'
      +'<div class="note"><b>过渡类型（整理口径）：</b>'+esc(r.transition)+'</div>';
    if(r.dispute)h+='<div class="note"><b>学界不同口径：</b>'+esc(r.dispute)+'</div>';
    if(r.gap)h+='<div class="gather"><b>间朝 · '+esc(r.gap.name)+'（'+r.gap.years+' 年）：</b>'
      +esc(r.gap.note)+'</div>';
    h+='</div>';
    h+='<div class="card"><div class="tagline">本 朝 所 见 · '+r.seenCount+' 条</div><div class="volgrid">';
    Object.keys(r.byDim||{}).forEach(k=>h+='<div>'+esc(k)+'<b>'+r.byDim[k]+'</b></div>');
    if(!Object.keys(r.byDim||{}).length)h+='<div class="mini">这一朝尚未遇见可考条目。</div>';
    h+='</div>';
    if(r.people&&r.people.length)h+='<div class="hr"></div><div class="mini">同期人物：'+r.people.map(p=>esc(p)).join('、')+'。</div>';
    const DY=W.dynasty,PR=DY?DY.polityRulers(r.name||''):[];
    if(PR.length)h+='<div class="hr"></div><div class="mini"><b>本朝纪年锚点：</b>'
      +PR.map(x=>esc(x.name)+'（'+esc(x.title)+' · '+esc(x.rawYear)+'）').join('　→　')
      +'<br><span style="color:var(--dim)">仅取首尾可考在位者，非完整帝表；'
      +'同年并立、追尊与摄政另标，不排成单线相续。</span></div>';
    h+='<div class="mini" style="margin-top:8px;color:var(--dim)">同期口径：人物与政权仅表示年代窗口重叠，'
      +'不表示隶属该政权，亦不表示在其治下任职。</div>';
    if(r.next){
      h+='<div class="hr"></div><div class="tagline">下 一 朝</div>'
        +'<div class="row"><span class="y">'+sh(r.next.startYear)+'</span><b>'+esc(r.next.name)+'</b>'
        +'<div class="mini">'+esc(r.next.event)+'</div></div>';
    }
    h+='<div class="hr"></div><div class="mini">'+esc(r.classification)+'</div>';
    if(r.tail)h+='<div class="note"><b>链尾说明：</b>'+esc(r.tail)+'</div>';
    h+='</div><div class="card">'
      +'<button class="big" data-act="nextdyn">'+(r.last?'收 束 长 河 ▸':'入 '+esc(r.next?r.next.name:'下一朝')+' ▸')+'</button>'
      +'<button class="big alt" data-act="scroll-final">就 此 收 卷</button></div>';
    return h;
  }
  /* 同期人物：按本局年份与年代窗口重叠筛真实人物，纯展示、不摇随机数、不改史实 */
  function contemporaries(S){
    const y=S.year,all=D.civilization.items.filter(x=>x.dim==='P'&&x.layer!=='framework');
    const sorted=all.slice().sort((a,b)=>Math.abs(a.y0-y)-Math.abs(b.y0-y));
    const hit=sorted.filter(x=>x.y0<=y+20&&x.y1>=y-20).slice(0,3);
    if(!hit.length){
      const near=sorted.slice(0,2);
      if(!near.length)return '';
      let hh='<div class="card" style="margin-top:10px;padding:13px"><div class="tagline">同 期 人 物 · '
        +'本年前后暂无年代窗口重叠者</div>'
        +'<div class="mini">册中距本年最近的可考人物：</div>';
      near.forEach(x=>{hh+='<div class="row"><b>'+esc(x.title)+'</b> <span class="s">'
        +esc(x.rawYear)+'</span><div class="mini">'+esc(x.summary)+'</div></div>';});
      hh+='<div class="mini" style="color:var(--dim)">只作年代参照，不表示与本年或本局有关。</div></div>';
      return hh;
    }
    let h='<div class="card" style="margin-top:10px;padding:13px"><div class="tagline">同 期 人 物 · '
      +'年代窗口与本年重叠</div>';
    hit.forEach(x=>{
      h+='<div class="row"><b>'+esc(x.title)+'</b> <span class="s">'+esc(x.rawYear)
        +' · '+esc(x.category)+'</span><div class="mini">'+esc(x.summary)+'</div>'
        +(x.consensus==='date_contested'?'<div class="mini" style="color:var(--gold)">断代有争议</div>':'')
        +'</div>';
    });
    h+='<div class="mini" style="color:var(--dim)">只表示年代窗口重叠，不表示隶属本局政权、'
      +'不与本局推演族人有关，也不据此改写任何人物生平。</div></div>';
    return h;
  }
  function mainHTML(S){
    if(S.phase==='scroll')return scrollHTML(S,S.scroll.final);
    if(S.phase==='volume')return volumeHTML(S);
    if(S.phase==='ending')return endingHTML(S);
    if(S.phase==='realend')return realEndHTML(S);
    if(S.phase==='turnover')return turnoverHTML(S);
    if(S.phase==='choice'){
      const ev=S.cur;
      let h='<div class="card"><div class="tagline"><span class="src">'+ev.src+'</span>'+(ev.isHist?'史海可考':'推演分支')+'</div>'
        +'<h2>'+esc(ev.t)+'</h2><p class="story">'+esc(ev.x)+'</p>'
        +'<div class="lens">'+lensLine(S)+'</div>';
      if(S.mode==='succession'&&S.chainState){
        const co=W.succession.contemporaries(S,ev);
        if(co.length)h+='<div class="mini" style="margin:8px 0;color:var(--gold)">同期政权：'
          +co.map(x=>esc(x.name)).join('、')
          +(ev.isCiv?'<br><span style="color:var(--dim);font-size:10px">年代窗口重叠，不表示人物隶属该政权或在其治下任职</span>':'')
          +'</div>';
      }
      const noteCls=ev.isHypothesis?'note red':'note';
      const noteTitle=ev.isHypothesis?'无证据 · 虚构推演'
        :ev.isText?'文本传统 · 非史实'
        :ev.isClim?'气候／地理 · 可考现象'
        :ev.isCiv?'考据标注':ev.isHist?'史海钩沉':'说明';
      if(ev.note)h+='<div class="'+noteCls+'"><b>'+noteTitle+'：</b>'+esc(ev.note)+'</div>';
      if(ev.isHypothesis)h+='<div class="fringecard"><b style="color:var(--red2)">⚠ 此卡不是史实</b>'
        +'<div class="mini">'+esc(W.fringe.NO_EVIDENCE)+'</div></div>';
      if(ev.isClim&&ev.pressure){
        const ps=Object.keys(ev.pressure).filter(k=>ev.pressure[k]);
        h+='<div class="mini" style="color:var(--blue);margin-top:6px">环境压力（推演）：'
          +ps.map(k=>D.keys[k]+(ev.pressure[k]>0?'+':'')+ev.pressure[k]).join('、')
          +'　'+esc(W.geoclimate.CAVEAT)+'</div>';
      }
      if(ev.quiz)h+='<div class="gather"><b>考据题：</b>此条在数据中标记为「传说／后世追述」。'
        +'辨其类别可得文脉，断为确证史实则会记一笔误判。</div>';
      if(ev.bio){
        h+='<div class="card" style="margin-top:10px;padding:13px"><div class="tagline">人 物 生 平 · 四 段</div>'
          +'<div class="row"><b>'+esc(ev.bio.name)+'</b> <span class="s">生 '+esc(ev.bio.born)+' · 活动 '+esc(ev.bio.active)+'</span>'
          +'<div class="mini">著述／事迹：'+esc(ev.bio.work)+'</div>'
          +'<div class="mini">身后影响：'+esc(ev.bio.legacy)+'</div></div></div>';
      }
      if(ev.treasure){
        const t=ev.treasure;
        h+='<div class="card" style="margin-top:10px;padding:13px"><div class="tagline">鉴 宝 卡 · '+esc(t.name)+'</div>'
          +'<div class="volgrid">'
          +'<div>年代<b>'+esc(t.rawYear)+'</b></div>'
          +'<div>材质<b>'+esc(t.material)+'</b></div>'
          +'<div>出土／传世<b>'+esc(t.provenance)+'</b></div>'
          +'<div>现藏<b>'+esc(t.museum)+'</b></div>'
          +'</div><div class="mini" style="margin-top:8px">鉴定要点：'+esc(t.points)+'</div>'
          +'<div class="mini">断代／真伪争议：'+esc(t.dispute)+'</div></div>';
      }
      if(ev.isCiv&&ev.civMeta&&ev.civMeta.sources&&ev.civMeta.sources.length){
        const q=ev.civMeta.sources.find(s=>s.quote);
        if(q)h+='<div class="mini" style="margin-top:8px;color:#8f8067">出处引文（'
          +esc(W.civilization.RANK_LABEL[q.rank]||'出处')+'）：'+esc(q.quote.slice(0,90))
          +(q.quote.length>90?'…':'')+'</div>';
      }
      const HN=W.difficulty?W.difficulty.hints(S):1;
      const recIdx=HN>=2?W.difficulty.recommend(ev.opts):-1;
      h+='<div class="opts">';
      ev.opts.forEach((o,i)=>{
        const custom=!!(o.project||o.combo||o.debate||o.force);
        const K=custom?{name:o.badgeName||'应对',color:o.color||'#8fa3ad'}
          :((W.options&&W.options.KIND[o.kind])||{name:o.badgeName||'应对',badge:o.badge||'应',color:o.color||'#8fa3ad'});
        const gain=D.keyOrder.filter(k=>(o.gain||{})[k]>0)
          .map(k=>D.keys[k]+'+'+o.gain[k]).join('　');
        const cost=D.keyOrder.filter(k=>(o.cost||{})[k]<0)
          .map(k=>D.keys[k]+'−'+Math.abs(o.cost[k])).join('　');
        let extra='';
        if(o.basis)extra+='<span class="basis">依据 · '+esc(o.basis.title)
          +(o.basis.dimName?'（'+esc(o.basis.dimName)+'）':'')
          +(o.basis.rawYear?' · '+esc(o.basis.rawYear):'')+'</span>';
        else if(o.seeking)extra+='<span class="basis seek">寻访 · '+esc(o.seekingTitle||'未见之学')+'（选中即录入文明册）</span>';
        else if(o.isSpecial)extra+='<span class="basis">据本局舆地／同期数据生成</span>';
        if(o.project&&!o.project.abandon)extra+='<span class="basis seek">跨笔决议 · 选中后继续推进，'
          +'验收才有长期增益；也可在后续笔里罢手</span>';
        if(o.combo)extra+='<span class="basis">组合技 · 需多条不同维度知识同时在册</span>';
        if(o.debate)extra+='<span class="basis">考据分歧 · 两条互斥，选一条即作取舍</span>';
        const risk=o.risk?'<span class="risk">⚠ '+esc(W.options.riskLine(o))+'</span>':'';
        const req=o.reqText?'<span class="req">'+esc(o.reqText)+'</span>':'';
        const note=(o.reqNote||o.note)?'<span class="req" style="color:#a9c8dc">'
          +esc(o.reqNote||o.note)+'</span>':'';
        const estat=(gain||cost)?'<span class="estat">'
          +(gain?'<i class="gain">'+esc(gain)+'</i>':'')
          +(cost?'<i class="cost">'+esc(cost)+'</i>':'')+'</span>':'';
        const rec=(i===recIdx)?'<span class="rec">新手建议 · 只按「收益减代价」算的一条参考，没有标准答案</span>':'';
        const ariaTxt='选项 '+(i+1)+'：'+cleanText(o.t)
          +(gain?'，收益 '+cleanText(gain):'')+(cost?'，代价 '+cleanText(cost):'')
          +(o.risk?'，有失手可能':'')+(recIdx===i?'，新手建议':'');
        h+='<button class="opt rich'+(i===recIdx?' suggested':'')+'" data-i="'+i
          +'" aria-label="'+esc(ariaTxt)+'"><span class="k">'+(i+1)+'</span>'
          +'<span class="optbody"><span class="badge" style="--c:'+esc(K.color)+'">'+esc(K.name)+'</span>'
          +'<span class="t">'+esc(o.t)+'</span>'+rec+extra+estat+risk+req+note+'</span></button>';
      });
      let tail='<div class="mini" style="margin-top:8px">选项由已见知识、八维态势、地理气候与同期政权生成；'
        +'代价／风险／前置／跨笔决议都写在卡上；史实条目只作依据，抉择与后果均为游戏推演。</div>';
      if(HN>=2){
        const CH=W.difficulty.cardHelp;
        tail+='<details class="fold" '+(S.turn<2?'open':'')+'><summary>怎 么 读 这 些 卡 · 简 单 模 式 逐 条 解 释</summary>'
          +['gain','cost','risk','basis','req','project','recommend'].map(k=>
            '<div class="mini"><b>'+esc({gain:'绿色收益',cost:'红色代价',risk:'⚠ 失手',
              basis:'依据',req:'前置',project:'跨笔决议',recommend:'新手建议'}[k])+'：</b>'
            +esc(CH[k])+'</div>').join('')
          +'<div class="mini" style="color:var(--dim)">卡上数字已被难度调整过，你看到的就是真正会发生的；'
          +'难度不改史实。</div></details>';
      }
      return h+tail+'</div></div>';
    }
    const r=S.result||{o:{t:'（续卷）',e:{}},msgs:[]};
    return '<div class="card"><div class="tagline">已 落 笔</div><h2>'+esc(r.o.t)+'</h2>'
      +'<div class="result">'+E.effDesc(r.o.e)+(r.msgs.length?'<br>'+r.msgs.join(' '):'')+'</div>'
      +'<p class="story" style="margin-top:12px">'+E.fmtYear(S.year)+'，这一笔已入编年。再往前，岁月不等人。</p>'
      +contemporaries(S)
      +'<button class="big" data-act="next">继 续 推 演 ▸</button>'
      +'<button class="big alt" data-act="scroll">随 时 收 卷</button></div>';
  }
  function render(){
    const S=E.state(),app=$('app');
    if(!S){renderStart(app);return;}
    /* 已通关：只按本局种子记在本机，用于设置页把打过的关卡折到最后 */
    if(W.stage){
      try{const w=W.stage.weatherOf(S),p=W.stage.poseOf(S,w,{});
        if(p&&p.scene)markDone(S.seed,p.scene);}catch(e){}
    }
    /* 教程跟着玩家动作推进，只在状态变化时存档 */
    if(W.tutorial){
      let dirty=false;
      if(S.phase==='scroll'&&W.tutorial.noteScroll(S))dirty=true;
      if(W.tutorial.advance(S))dirty=true;
      if(dirty)E.save();
    }
    const e=D.eras[E.eraIdx(S.year)],V=D.views[S.view],R=D.regions[S.reg];
    let h;
    if(!ARTON)h='<div class="artwrap artbare">'+sndBtn()+'</div>';
    else if(TAB==='main'&&W.stage)h=W.stage.stageHTML(S,{tools:stageTools(),vmenu:VMENU});
    else h=artTopHTML(S,false);
    h+='<div class="head"><div><div class="yr">'+E.fmtYear(S.year)+'</div>'
      +'<div class="era">'+e.n+' · 第 '+S.turn+' 笔 · 第 '
      +(((S.fam||[]).find(p=>p.id===S.ruler)||{}).gen||S.gen)+' 代</div></div>'
      +'<div class="badge">'+R.n+'<br><span style="color:var(--dim);font-size:10px">'+V.n+'视角</span></div></div>';
    const vn=S.vol?S.vol.n:1,vp=Math.min(100,Math.round(S.volTurn/E.volLen()*100));
    const realTag=(S.mode==='real'&&S.entity)
      ?'<div class="mini" style="color:var(--gold);margin-top:5px">'
        +(S.houseId?'世家浮沉 · ':'真实血脉 · ')+esc(W.real.progress(S))
        +(S.houseId?'（门第政治位置，不作家族人口兴灭）':'')+'</div>'
      :(S.mode==='succession'&&S.chainState)
        ?'<div class="mini" style="color:var(--gold);margin-top:5px">朝代长河 · '+esc(W.succession.progress(S))+'</div>':'';
    const RT=W.reality.tier(S.reality),MD=W.reality.mode(S.modeKey);
    h+='<div class="'+(S.reality==='wild'?'warnbar':'tierbar')+'"><b>'+esc(W.reality.banner(S))+'</b>'
      +'<div class="mini">'+esc(RT.desc)+'</div>'
      +(S.reality==='wild'?'<div class="mini" style="color:var(--red2)">本档含明确标注的未证实假说，不是史实。</div>':'')
      +'<div class="mini" style="color:var(--gold);margin-top:4px">难度：'
      +esc(W.difficulty.banner(S))+' · '+esc(W.difficulty.tier(S.difficulty).desc)+'</div></div>';
    h+=tutorialHTML(S);
    if(!(S.tutorial&&S.tutorial.on))
      h+='<div class="mini center" style="margin:6px 0"><button data-help="1" class="pill">？ 打开新手指引</button></div>';
    h+='<div class="volbar"><div class="vt">卷 '+vn+' ·〈'+WV.volTitle(vn)+'〉· 第 '+Math.min(S.volTurn,E.volLen())+'/'+E.volLen()+' 笔'
      +(S.ended?' <span style="color:var(--red2)">· 终章已至</span>':'')+'</div>'
      +realTag
      +'<div class="vbar"><i style="width:'+vp+'%"></i></div>'
      +'<div class="mini">下一节点：'+WV.nextNode(S)+'</div></div>';
    h+=statGrid(S.st,S);

    const HH=W.difficulty?W.difficulty.hints(S):1;
    const phaseHint=(HH>=2&&S.phase!=='choice'&&PHASE_HELP[S.phase])
      ?'<div class="hintbar">这一步在做什么 · '+esc(PHASE_HELP[S.phase])+'</div>':'';
    h+='<div class="panel '+(TAB==='main'?'on':'')+'">'+phaseHint+mainHTML(S)
      +'<div class="mini center" style="margin-top:10px">传承度 '+Math.round(S.score)
      +' · 文明册 '+Object.keys(S.seenCiv||{}).length+'/'+D.civilization.items.length
      +'（'+D.civilization.dimensions.length+' 维）'
      +' · 已录史实 '+Object.keys(S.used).length+'/'+D.events.filter(x=>x.kind==='history').length
      +' · 族中在籍 '+E.aliveFam(S).length+' 人</div></div>';

    h+='<div class="panel '+(TAB==='log'?'on':'')+'">'+hintFor('log',S)+'<div class="card"><div class="tagline">编 年 · 近事</div>';
    const lg=S.log.slice(-40).reverse();
    h+=lg.length?lg.map(l=>'<div class="row"><span class="y">'+E.fmtShort(l.y)+'</span>'+esc(l.t)+'</div>').join(''):'<div class="mini">尚无笔墨。</div>';
    h+='</div></div>';

    /* ===== 亲属关系与继嗣制：开局不一定父系 ===== */
    const KN=W.kinship;
    if(KN){
      const sys=KN.system(S),KSS=KN.summary(S);
      h+='<div class="panel '+(TAB==='fam'?'on':'')+'">'+hintFor('fam',S)
        +'<div class="card"><div class="tagline">继 嗣 制 · 本 局 '+esc(sys.short)+'</div>'
        +'<div class="note"><b>'+esc(sys.name)+'：</b>'+esc(sys.desc)+'</div>'
        +'<div class="mini" style="color:var(--gold);margin-top:6px">本局夫妇 '+KSS.marriages
        +' 对 · 赘婿 '+KSS.uxorilocal+' 位 · 已推出称谓 '+KSS.termsPresent+' / '+KSS.termsTotal
        +' 类 · 女承祧当家 '+(KSS.femaleHeads?'是':'否')+'</div>'
        +'<div class="mini" style="color:var(--dim);margin-top:6px">'+esc((D.kinship.meta||{}).caveat||'')
        +'</div>'
        +'<div class="mini" style="color:var(--gold);margin-top:6px">'+esc(S.kinNote||'')+'</div>'
        +'<div class="mini" style="color:var(--dim)">'+esc((D.kinship.meta||{}).limits||'')+'</div></div>';
      /* 亲属关系图：节点按代分层，边按血亲/姻亲/继嗣着色，点节点看称谓 */
      const G=KN.graph(S);
      const maxGen=Math.max(1,...G.nodes.map(n=>n.gen));
      const layers={};G.nodes.forEach(n=>{(layers[n.gen]=layers[n.gen]||[]).push(n);});
      const pos={};
      Object.keys(layers).forEach(g=>{
        const arr=layers[g];
        arr.forEach((n,i)=>{pos[n.id]={x:arr.length===1?180:40+i*(300/(arr.length-1)),
          y:36+(Number(g)-1)*78};});
      });
      const GH=36+maxGen*78+34;
      const vb=(180-180/KINZ)+' '+(GH/2-GH/2/KINZ)+' '+(360/KINZ)+' '+(GH/KINZ);
      const COL={blood:'#c9a227',affine:'#6fa8c8',descent:'#b85c5c',
        household:'#8a8a8a',self:'#e8dcc2'};
      h+='<div class="card"><div class="tagline">亲 属 关 系 图 · '+G.nodes.length
        +' 人 / '+G.edges.length+' 条关系</div>'
        +'<div class="mini">点一个圆点看此人全部称谓；金＝血亲，蓝＝姻亲，红＝继嗣，灰＝居制。'
        +'称谓由实际关系链推出，不是预先写死的名称；孩子只从已配对的夫妇出生，'
        +'世代按双亲 +1 计算。</div>'
        +'<div style="margin:8px 0"><button data-kinzoom="+" class="pill">＋ 放大</button> '
        +'<button data-kinzoom="-" class="pill">－ 缩小</button> '
        +'<button data-kinzoom="0" class="pill">复位</button></div>'
        +'<svg id="kinGraph" data-gh="'+GH+'" viewBox="'+vb+'" style="width:100%;height:auto;background:#171512;'
        +'border:1px solid #3a342a;border-radius:6px;touch-action:none"><g id="kinScene">';
      G.edges.forEach(e=>{
        const a=pos[e.a],b=pos[e.b];if(!a||!b)return;
        h+='<line class="kge" data-a="'+esc(e.a)+'" data-b="'+esc(e.b)+'" '
          +'x1="'+a.x+'" y1="'+a.y+'" x2="'+b.x+'" y2="'+b.y+'" '
          +'stroke="'+(COL[e.kind]||'#8a8a8a')+'" stroke-width="1" opacity=".55"/>';
      });
      G.nodes.forEach(n=>{
        const q=pos[n.id];if(!q)return;
        const fill=n.alive?'#2a2620':'#1d1b18';
        const ring=n.ruler?'#c9a227':(n.gender==='female'?'#b87fa0':'#6fa8c8');
        h+='<g class="kgn" data-id="'+esc(n.id)+'" style="cursor:pointer">'
          +'<circle cx="'+q.x+'" cy="'+q.y+'" r="15" fill="'+fill+'" stroke="'+ring
          +'" stroke-width="'+(n.ruler?2.4:1.3)+'"/>'
          +'<text x="'+q.x+'" y="'+(q.y+3.5)+'" text-anchor="middle" font-size="9" '
          +'fill="#e8dcc2">'+esc(n.name.slice(0,3))+'</text>'
          +'<text x="'+q.x+'" y="'+(q.y+27)+'" text-anchor="middle" font-size="8" '
          +'fill="#8a8070">'+n.gen+'代</text></g>';
      });
      h+='</g></svg><div id="kinPick" class="mini" style="margin-top:8px;color:var(--gold)">'
        +'点圆点查看此人的夫妻、父母、姑父、舅母、连襟等称谓。</div></div>';
      /* 称谓穷举册：75 类，标出本局已出现的 */
      const COV=KN.termCoverage(S);
      h+='<div class="card"><div class="tagline">亲 属 称 谓 穷 举 · '+COV.length
        +' 类 · 本局已见 '+COV.filter(x=>x.present).length+' 类</div>'
        +'<div class="mini">含夫妻、入赘／赘婿、姑父、舅父、姨父、伯母、妯娌、连襟、'
        +'岳父母、翁姑、堂表、侄甥、过继立嗣等。未出现的只表示本局尚未形成该关系链。</div>'
        +'<details class="fold" data-lz="K:terms"><summary>展开全部 '+COV.length
        +' 类称谓</summary><div class="lazy-body">点开时载入……</div>'
        +'<template data-lz-tpl="K:terms">';
      COV.forEach(t=>{
        h+='<div class="row"><b>'+esc(t.term)+'</b> <span class="s">'
          +esc(t.kind)+(t.present?' · <span style="color:var(--gold)">✓ 本局已见</span>':'')
          +'</span>'+(t.note?'<div class="mini">'+esc(t.note)+'</div>':'')+'</div>';
      });
      h+='</template></details></div>';
    }else{
      h+='<div class="panel '+(TAB==='fam'?'on':'')+'">'+hintFor('fam',S);
    }
    /* 族谱在籍卡从这一张开始；上面的 panel 已经打开，不再重复开 panel */
    if(KN){
      h+='<div class="card"><div class="tagline">族 谱 · 在籍</div>';
    }else{
      h+='<div class="card"><div class="tagline">族 谱 · 在籍</div>';
    }

    if(S.clanName)h+='<div class="note" style="margin-top:8px"><b>本族称法（推演）：</b>'
      +esc(S.clanName)+'<div class="mini">得姓多源；这只是本局这一支人在册的称法，'
      +'不表示与任何历史家族有血缘关系，也不作血统纯正推断。</div></div>';
    const PE=W.people;
    const al=E.aliveFam(S).sort((a,b)=>b.gen-a.gen||b.age-a.age);
    /* 故去的两位族长也留一张卡：传承不能只看在籍的人 */
    const gone=(S.fam||[]).filter(p=>!p.alive&&p.role==='ruler').slice(-2);
    const roster=al.concat(gone);
    const ps=PE.summary(S);
    h+='<div class="mini" style="color:var(--gold);margin-top:6px">在册 '+ps.total+' 人（在籍 '
      +ps.alive+' · 累计凋零 '+ps.dead+'）/ '+ps.generations+' 代 · 亲习技能 '+ps.skills+' 项 · 抉择记入生平 '+ps.skillLog+' 笔'
      +' · 有父辈可考 '+ps.withParent+' 人 · 遇真实人物 '+ps.realPeople+' 位</div>';
    h+='<div class="note" style="border-left-color:var(--red2);margin-top:8px"><b>先看这一句：</b>'
      +'下面每一位都是<b>本局推演生成的人物，不是历史名人</b>。'
      +'卡片里的「同名检索」只是姓名用字巧合；真实人物另在页末「史册对照」分栏，两下不混写、不攀附血缘。</div>';
    const personCard=p=>{
      const sk=PE.skillsOf(S,p),lin=PE.lineageOf(S,p),hc=PE.historyCheck(S,p);
      let c='<details class="fold"><summary><b>'+esc(p.name)+'</b> <span class="s">第 '
        +(p.gen||1)+' 代 · 约 '+p.age+' 岁 · '+esc(p.trait||'—')+'</span>'
        +(p.id===S.ruler?' <span style="color:var(--gold)">〔当家〕</span>':'')
        +(p.alive?'':' <span style="color:var(--dim)">〔已故〕</span>')+'</summary>';
      /* 生平（推演） */
      c+='<div class="tagline">生 平 · 推 演 小 传</div>';
      c+=PE.bioOf(S,p).map(t=>'<div class="mini">'+esc(t)+'</div>').join('');
      /* 技能 */
      c+='<div class="tagline">族 人 技 能</div>';
      c+=sk.real.length?'<div class="mini">亲习：'+sk.real.map(j=>'<span class="pill">'+esc(j)+'</span>').join('')
        +'　<span style="color:var(--dim)">由抉择写回</span></div>'
        :'<div class="mini">暂无由抉择写回的亲习技能。</div>';
      if(sk.inherited.length)c+='<div class="mini">承袭：'
        +sk.inherited.map(j=>'<span class="pill">'+esc(j)+'</span>').join('')
        +'　<span style="color:var(--dim)">只表示族里有人做过，不代表本人亲习</span></div>';
      /* 传承 */
      c+='<div class="tagline">传 承</div>';
      c+='<div class="mini">第 '+(lin.generation||1)+' 代 · '
        +(lin.parent?'承自 <b>'+esc(lin.parent.name)+'</b>（第 '+lin.parent.gen+' 代）'
          :p.parent?'承自 <b>'+esc(lin.parentName)+'</b>（已不在册，仅存其名）'
                   :'开局一支人，无父辈可考')+'</div>';
      c+='<div class="mini">承自内容：'+esc(lin.from.join('、')||'—')+'</div>';
      c+='<div class="mini">名下子嗣 '+lin.children.length+' 人'+(lin.heir?('，在籍 '+lin.heir+' 人'):'')
        +(lin.children.length?'：'+lin.children.slice(0,5).map(x=>esc(x.name)).join('、'):'')+'</div>';
      if(lin.rules.length)c+='<div class="mini" style="color:var(--gold)">继立：'
        +lin.rules.map(r=>esc(E.fmtShort(r.y)+' '+r.t.replace('族长更替 · ',''))).join('　')+'</div>';
      if(lin.debts.length)c+='<div class="mini" style="color:var(--gold)">了结族谱旧账 '
        +lin.debts.length+' 笔（推演）</div>';
      /* 亲属称谓：由实际关系链推出，姑父、舅母、连襟等都在这里 */
      if(KN){
        const KR=KN.relationsOf(S,p).filter(r=>r.who&&r.who!==p.id);
        c+='<div class="tagline">亲 属 称 谓 · '+KR.length+' 条（由关系链推出）</div>';
        c+=KR.length?KR.slice(0,18).map(r=>'<div class="mini"><b>'+esc(r.term)+'</b> · '
          +esc(r.whoName)+' <span class="s">'+esc(r.kind)+'</span>'
          +(r.note?'<span style="color:var(--dim)"> '+esc(r.note)+'</span>':'')+'</div>').join('')
          +(KR.length>18?'<div class="mini" style="color:var(--dim)">另有 '
            +(KR.length-18)+' 条，见上方关系图点选。</div>':'')
          :'<div class="mini">尚无可从在册关系链推出的称谓。</div>';
      }
      /* 是不是历史名人 */
      c+='<div class="tagline" style="color:var(--red2)">是 不 是 历 史 名 人</div>';
      c+='<div class="note" style="border-left-color:var(--red2)"><b>'+esc(hc.verdict)+'</b>'
        +'<div class="mini">'+esc(hc.disclaimer)+'</div></div>';
      if(hc.sameName.length){
        c+='<div class="mini" style="color:var(--gold)">同名用字检索（册中确有此人，但不是本局族人）：</div>';
        c+=hc.sameName.map(x=>'<div class="row"><b>'+esc(x.title)+'</b> <span class="s">'
          +esc(x.rawYear||'')+'</span><div class="mini">'+esc(x.why)+' · '
          +esc(String(x.summary||'').slice(0,46))+'</div></div>').join('');
      }else c+='<div class="mini">姓名用字与册中人物无重合。</div>';
      c+='</details>';
      return c;
    };
    h+=roster.map(personCard).join('');
    const jobs=Object.keys(S.jobs||{});
    if(jobs.length)h+='<div class="hr"></div><div class="tagline">族 中 业 · 由 抉 择 而 来</div>'
      +'<div class="mini">'+jobs.map(j=>'<span class="pill">'+esc(j)+' ×'+S.jobs[j]+'</span>').join('')
      +'　<span style="color:var(--dim)">这些行当由选项写回，不是史实人物履历。</span></div>';
    const debts=(S.famDebts||[]);
    if(debts.length){
      h+='<div class="hr"></div><div class="tagline">族 谱 旧 账 · 由 失 手 的 组 合 技 留 下</div>';
      h+=debts.map(d=>'<div class="row"><span class="y">'+E.fmtShort(d.y)+'</span><b>'
        +esc(d.t.slice(0,26))+'</b> <span class="s">'
        +(d.cleared?'<span style="color:var(--gold)">已了</span>':'待清')+'</span></div>').join('');
      h+='<div class="mini" style="color:var(--dim)">旧账与清账都是本局推演，'
        +'不是史实记载；清账只收拾自家决策，不改写已发生的事。</div>';
    }
    if((S.optEcho||[]).length)h+='<div class="mini" style="margin-top:6px">近事回响：'
      +esc(S.optEcho[S.optEcho.length-1].t)+'</div>';
    const fd=E.famDistribution(S),mgs=E.famMigrations();
    if(fd.length){
      h+='<div class="hr"></div><div class="tagline">落 脚 地 · 见 舆 地 页 家 族 分 布 图</div>'
        +'<div class="mini">'+fd.map(d=>'<span class="pill">'+esc(d.name)+' '+d.count+' 人'
          +(d.ruler?' · 当家':'')+'</span>').join('')+'</div>';
      if(mgs.length)h+='<div class="mini" style="margin-top:6px;color:var(--gold)">迁徙足迹：'
        +mgs.slice(-3).map(m=>E.fmtShort(m.y)+' '+esc(m.fromName)+' → '+esc(m.toName)
          +'（'+m.count+' 人）').join('　')+'</div>';
      h+='<div class="mini" style="color:var(--dim)">落脚地取自已考据地理单元，迁徙由抉择写回；'
        +'这是本局推演，不是史实人口分布。</div>';
    }
    h+='<div class="hr"></div><div class="mini">累计凋零 '+S.dead+' 人。继任顺位：嫡长 → 兄终弟及 → 旁支过继 → 绝嗣立新。</div>'
      +'<div class="note" style="margin-top:8px"><b>关于年岁：</b>一笔推演常跨数十至百余年，那是编年跨过的岁月，'
      +'不是同一个人活过的年数。家族按约 '+F.GEN_YEARS+' 年一代接续，寿数按出生年代估算：'
      +'远古约 35–45 岁，古典约 45–55 岁，近现代约 65–80 岁；仓廪与信仰略有增减。'
      +'所以这里不会出现百岁古人。</div></div>';
    /* 史册对照：真正遇见的史实人物，与推演族人分栏 */
    const RR=W.people.realRoster(S);
    h+='<div class="card"><div class="tagline">史 册 对 照 · 本 局 遇 见 的 真 实 人 物 · '
      +RR.length+' 位</div>'
      +'<div class="note"><b>这一栏才是史实人物。</b>上面族谱里的每一位都是推演生成的人物，'
      +'两下分栏，不混写、不攀附血缘；人物生平只录可考梗概，争议与传说层另标。</div>';
    if(!RR.length)h+='<div class="mini">尚未遇见人物条目。继续推演，按年代窗口会陆续抵达。</div>';
    else RR.slice().reverse().forEach(x=>{
      h+='<details class="fold"><summary><b>'+esc(x.name)+'</b> <span class="s">'
        +esc(x.rawYear||'')+'</span></summary>';
      if(x.bio){
        h+='<div class="mini"><b>生卒／时代：</b>'+esc(x.bio.born)+'　'+esc(x.bio.active)+'</div>'
          +'<div class="mini"><b>事迹：</b>'+esc(x.bio.work)+'</div>'
          +'<div class="mini"><b>身后影响：</b>'+esc(x.bio.legacy)+'</div>';
      }else h+='<div class="mini">'+esc(x.summary)+'</div>';
      const urls=[...new Set((x.sources||[]).map(z=>z.url).filter(Boolean))].slice(0,2);
      if(urls.length)h+='<div class="mini" style="color:var(--dim)">出处：'+esc(urls.join('　'))+'</div>';
      h+='<div class="mini" style="color:var(--dim)">史实人物；与本局推演族人无血缘关系。</div></details>';
    });
    h+='</div>';
    /* 名族对照：真实世家另栏，明确「不攀附」——与史册对照同一条边界 */
    const DYH=W.dynasty?W.dynasty.summary(S):null;
    if(DYH){
      h+='<div class="card"><div class="tagline">名 族 对 照 · 本 局 所 遇 世 家 · '
        +DYH.houses+' / '+DYH.houseTotal+'</div>'
        +'<div class="note"><b>这一栏是真实世家，上面族谱是推演生成的人物。</b>'
        +'两下分栏：不攀附谱牒、不推断血统、不把郡望当血缘凭证；'
        +'同一时期并立的名族不排成前后相续。</div>';
      if(!DYH.seenHouses.length)h+='<div class="mini">尚未遇见同期名族。继续推演，按年代窗口会陆续抵达。</div>';
      else DYH.seenHouses.slice().reverse().slice(0,18).forEach(x=>{
        h+='<details class="fold"><summary><b>'+esc(x.name)+'</b> <span class="s">'
          +esc(x.alias||x.category)+' · '+esc(x.rawYear)+'</span></summary>'
          +'<div class="mini"><b>势力中心：</b>'+esc(x.seat)+'　<b>类目：</b>'+esc(x.category)+'</div>'
          +'<div class="mini"><b>兴起：</b>'+esc(x.rise)+'</div>'
          +'<div class="mini"><b>鼎盛：</b>'+esc(x.peakEvent)+'</div>'
          +'<div class="mini"><b>散脉：</b>'+esc(x.fall)+'</div>'
          +(x.figures&&x.figures.length?'<div class="mini"><b>相关人物：</b>'+esc(x.figures.join('、'))+'</div>':'')
          +'<div class="mini" style="color:var(--gold)">'+esc(x.boundary)+'</div>'
          +'<div class="mini" style="color:var(--dim)">真实世家条目；与本局推演族人无谱牒关系。</div></details>';
      });
      if(DYH.seenHouses.length>18)h+='<div class="mini">…另有 '
        +(DYH.seenHouses.length-18)+' 家，见文明册全册。</div>';
      h+='<div class="mini" style="color:var(--gold)">本局同期在位君主 '
        +DYH.rulers+' / '+DYH.rulerTotal+' 位，见文明册「帝王全册」。</div></div>';
    }
    if(S.famLog&&S.famLog.length){
      h+='<div class="card"><div class="tagline">一 家 人 · 贯 穿 朝 代</div>'
        +'<div class="mini">同一支人随改朝换代延续；以下每朝一句为游戏推演，不是史实记载。</div>';
      S.famLog.slice().reverse().forEach(f=>{
        h+='<div class="row"><span class="y">'+E.fmtShort(f.year)+'</span><b>'+esc(f.dynasty)+'</b>'
          +(f.name&&f.name!=='—'?' <span class="s">当家 '+esc(f.name)+'</span>':'')
          +'<div class="mini">'+esc(f.text)+'　在籍 '+f.alive+' 人 · 第 '+f.gen+' 代</div></div>';
      });
      h+='</div>';
    }
    h+='<div class="card"><div class="tagline">旧 例 账 本</div><div class="mini">'
      +'旧例不只回响在文案里，会真实改写每笔的族和衰减、仓廪与文脉增速。</div>';
    const L=E.ledgerNow();
    h+='<div class="volgrid" style="margin-top:8px">';
    D.keyOrder.filter(k=>L[k]).forEach(k=>h+='<div>'+D.keys[k]+'<b>+'+L[k]+'</b></div>');
    if(!D.keyOrder.some(k=>L[k]))h+='<div class="mini">尚无旧例入账。</div>';
    h+='</div><div class="mini" style="margin-top:8px">已立旧例 '+Object.keys(S.tags||{}).length+' 则；'
      +'旧例越多，族和衰减越慢。</div></div>';
    h+='<div class="card"><div class="tagline">里 程 碑</div>';
    const ml=S.mil.slice(-24).reverse();
    h+=ml.length?ml.map(m=>'<div class="row"><span class="y">'+E.fmtShort(m.y)+'</span>'+esc(m.t)+'</div>').join(''):'<div class="mini">尚无可记。</div>';
    h+='</div></div>';

    h+='<div class="panel '+(TAB==='sea'?'on':'')+'">'+hintFor('sea',S)+'<div class="card"><div class="tagline">已 历 之 史</div>';
    const hs=D.events.filter(x=>S.used[x.id]);
    h+=hs.length?hs.slice().reverse().map(x=>'<div class="row"><span class="y">'+E.fmtShort(x.y0)+'</span><b>'+esc(x.title)+'</b> <span class="s">'+x.source+'</span><div class="mini">'+esc(x.note)+'</div></div>').join(''):'<div class="mini">还未亲历可考之事。</div>';
    h+='</div><div class="card"><div class="tagline">旧 例 · 已得之名</div>';
    const tk=Object.keys(S.tags);
    h+=tk.length?tk.map(t=>'<span class="pill">'+esc(t)+' ×'+S.tags[t]+'</span>').join(''):'<div class="mini">尚无。</div>';
    h+='<div class="hr"></div><div class="mini">史事为通识级概述，来自外置 events.json，可自行替换；带「推演／远闻」标记者为虚构情境。</div></div></div>';

    /* 文明册：20 维、解锁树、鉴宝卡、生平、引文分级 */
    const CV=W.civilization,prog=CV.progress(S),seen=CV.seenItems(S);
    const allSeen=Object.keys(S.seenCiv||{}).length;
    /* 预建索引：原先每个键都 find 一次 90 维数组，文明页 render 白白多跑几万次比较 */
    const dimIdx={};D.civilization.dimensions.forEach(d=>dimIdx[d.key]=d);
    const isNewDim=k=>{const d=dimIdx[k];
      return !!(d&&(d.tier==='frontier24'||d.tier==='depth'||d.tier==='depth2'));};
    const newCount=prog.filter(p=>isNewDim(p.key)).length;
    const shownDims=CIVF==='*'?prog
      :CIVF==='__new'?prog.filter(p=>isNewDim(p.key))
      :CIVF==='__seen'?prog.filter(p=>p.seen>0)
      :prog.filter(p=>p.key===CIVF);
    const famOf=k=>{const d=dimIdx[k];return d?d.family:'其他';};
    /* 只生成当前页签的重内容：文明册有 1295 条姓氏与 264 道判读，
       非本页签时不拼进 DOM，切页签时 render 会即时生成 */
    if(TAB==='civ'){
    h+='<div class="panel '+(TAB==='civ'?'on':'')+'">'+hintFor('civ',S)+'<div class="card"><div class="tagline">文 明 册 · '+prog.length+' 维 · '+FAMORDER.length+' 大类 · 已见 '+allSeen+' / '+D.civilization.items.length+'</div>'
      +'<div class="mini">逐条来自考据数据，带年代、可信度、出处与引文；术数／神话／飞行意象另附边界声明。'
      +'维度按知识大类分组，主归类不排斥跨类；第七类「边界与分层」（文本传统／未证实假说／史前可考）不设维度，见舆地页与档位说明。</div>'
      +'<div style="margin-top:10px"><button data-dim="*" class="pill '+(CIVF==='*'?'on':'')+'">全部</button> '
      +'<button data-dim="__new" class="pill '+(CIVF==='__new'?'on':'')+'">本轮新增 '+newCount+' 维</button> '
      +'<button data-dim="__seen" class="pill '+(CIVF==='__seen'?'on':'')+'">仅已见</button></div>';
    FAMORDER.forEach(f=>{
      const arr=prog.filter(p=>famOf(p.key)===f);
      if(!arr.length)return;
      h+='<div class="famgroup"><div class="mini">'+esc(f)+' · '+arr.length+' 维</div>';
      arr.forEach(p=>h+='<button data-dim="'+p.key+'" class="pill '+(CIVF===p.key?'on':'')+'">'
        +esc(p.badge)+(isNewDim(p.key)?' <span style="color:var(--gold)">新</span>':'')+'</button> ');
      h+='</div>';
    });
    h+='<div class="mini" style="margin-top:8px;color:var(--dim)">标「新」的 '+newCount
      +' 维为通识级锚点，出处为域名级检索入口，未逐条附引文，见工程 meta.frontier24。</div></div>';
    const dimsToShow=(CIVF==='*'&&!CIVEXP)
      ?(function(){const base=shownDims.slice(0,4);
          const sd=shownDims.filter(p=>p.seen>0&&base.indexOf(p)<0);
          return base.concat(sd).slice(0,12);})()
      :shownDims;
    h+='<div class="card"><div class="tagline">维 度 进 度 · '+shownDims.length+' 维</div>'
      +'<div class="mini">共 '+prog.length+' 维，当前显示 '+dimsToShow.length+' 维'
      +(CIVF==='*'?'（基础 4 维 + 已见维度）':'（当前筛选）')
      +'。点上方大类下的按钮可筛看某一维。</div>'
      +'<button data-exp="1" class="pill '+(CIVEXP?'on':'')+'" style="margin-top:8px">'
      +(CIVEXP?'收 起 全 部 维 度':'展 开 全 部 '+prog.length+' 维')+'</button>';
    dimsToShow.forEach(p=>{
      h+='<div style="margin-top:9px"><div class="vt">'+p.name+' <span style="color:var(--dim);font-size:11px">'+p.seen+' / '+p.total+'（'+p.rate+'%）</span></div>'
        +'<div class="vbar"><i style="width:'+p.rate+'%"></i></div>'
        +'<div class="mini">'+p.desc+'</div></div>';
    });
    h+='<div class="hr"></div><div class="volgrid">'
      +'<div>考据判读<b>'+(S.quiz?S.quiz.right:0)+' 对 / '+(S.quiz?S.quiz.wrong:0)+' 误</b></div>'
      +'<div>鉴宝卡<b>'+Object.keys(S.treasureSeen||{}).length+' / '+D.civilization.treasures.length+'</b></div>'
      +'<div>人物生平<b>'+Object.keys(S.bioSeen||{}).length+' / '+D.civilization.biographies.length+'</b></div>'
      +'<div>解锁树<b>'+D.civilization.unlocks.length+' 条</b></div>'
      +'<div>判读 · 读法<b>'+(S.readingByKind?S.readingByKind.reading||0:0)+' / 106 则</b></div>'
      +'<div>判读 · 互证<b>'+(S.readingByKind?S.readingByKind.local||0:0)+' / 29 则</b></div>'
      +'<div>判读 · 称谓<b>'+((S.readingByKind?(S.readingByKind.surname||0)+(S.readingByKind.people||0):0))+' / 39 则</b></div>'
      +'<div>本族读法倾向<b>'+esc(stanceLabel(S))+'</b></div>'
      +'<div>联动 / 组合技<b>'+D.options.special.length+' 条 / '
      +D.consequences.combos.length+' 个</b></div>'
      +'<div>族谱旧账<b>'+((S.famDebts||[]).filter(x=>!x.cleared).length)
      +' 笔待清 · '+(S.clearedDebts||0)+' 笔已了</b></div>'
      +'</div><div class="mini" style="color:var(--gold)">'+esc(D.reading_quiz.meta.note)
      +'　'+esc(D.reading_quiz.meta.interaction2||'')+'</div></div>';
    const lens=CV.lens(S);
    if(lens)h+='<div class="card"><div class="tagline">人 物 视 角</div><div class="lens">'+esc(lens)+'</div>'
      +'<div class="mini">叙事以最近遇见的真实人物为镜，只改口吻，不改写其生平。</div></div>';
    const list=seen.filter(x=>{
      if(CIVF==='*'||CIVF==='__seen')return true;
      if(CIVF==='__new')return isNewDim(x.dim);
      return x.dim===CIVF;
    });
    h+='<div class="card"><div class="tagline">所 见 条 目 · '+list.length+'</div>';
    if(!list.length)h+='<div class="mini">尚未遇见。继续推演，条目按年代窗口与前置解锁抵达；本土标「史实」，其余文明圈标「远闻」。</div>';
    else list.slice().reverse().slice(0,24).forEach(x=>{
      const ranks=[...new Set(x.sources.map(s=>CV.RANK_LABEL[s.rank]||'出处'))].join('／');
      const u=CV.unlockInfo(x);
      const q=x.sources.find(s=>s.quote);
      h+='<div class="row"><span class="y">'+esc(x.rawYear)+'</span><b>'+esc(x.title)+'</b>'
        +'<div class="mini">'+esc(x.dimName)+'／'+esc(x.category)+' · '+esc(x.status)+' · '+CV.PRECISION_LABEL[x.precision]
        +(x.region===S.reg?' · 本土':' · 远闻')+' · '+ranks+'</div>'
        +'<div class="mini">'+esc(x.summary)+'</div>'
        +(x.boundary?'<div class="mini" style="color:var(--red2)">'+esc(x.boundary)+'</div>':'')
        +(u?'<div class="mini">前置：'+u.requires.map(r=>{const z=CV.byId[r];return esc(z?z.title:r);}).join('、')+'</div>':'')
        +(q?'<div class="mini" style="color:#8f8067">引文：'+esc(q.quote.slice(0,70))+(q.quote.length>70?'…':'')+'</div>':'')
        +'<div class="mini" style="word-break:break-all;color:#8f8067">出处：'
        +x.sources.slice(0,2).map(s=>esc(CV.hostOf(s.url))).join('、')+'</div></div>';
    });
    if(list.length>24)h+='<div class="mini">…另有 '+(list.length-24)+' 条，见收卷报告。</div>';
    h+='<div class="hr"></div><div class="mini">共 '+D.civilization.items.length+' 条考据条目、'
      +Object.keys(D.civSources).length+' 条出处索引（机构／学术与百科／媒体分级）。'
      +'传说与断代争议条目单独标注，不与确证史实混列。</div>';
    /* 深读卡：按当前筛选的维度挑，三段式「误解／分歧／延伸」 */
    const DD=D.deepdives,ddKeys=new Set((CIVF==='*'||CIVF==='__new'||CIVF==='__seen')
      ?Object.keys(S.seenCiv||{}).map(id=>{const z=CV.byId[id];return z?z.dim:null;}).filter(Boolean)
      :[CIVF]);
    const dds=DD.items.filter(x=>ddKeys.size?ddKeys.has(x.dim):true).slice(0,6);
    /* 本局所见维度命中不足时，补几条通识深读，避免这一栏空落落 */
    const ddPool=dds.concat(DD.items.filter(x=>dds.indexOf(x)<0)).slice(0,6);
    h+='<div class="card"><div class="tagline">深 读 卡 · 全册 '+DD.items.length+' 则</div>'
      +'<div class="mini">'+esc(DD.meta.note)+'</div>';
    ddPool.forEach(x=>{
      const dim=CV.dimByKey?CV.dimByKey[x.dim]:null;
      h+='<details class="fold"><summary>'+esc(x.topic)+' <span class="s">'
        +esc(dim?dim.name:x.dim)+' · '+esc(x.rank)+'</span></summary>'
        +'<div class="mini"><b>常见误解：</b>'+esc(x.misread)+'</div>'
        +'<div class="mini"><b>分歧所在：</b>'+esc(x.dispute)+'</div>'
        +'<div class="mini"><b>延伸方向：</b>'+esc(x.further)+'</div>'
        +'<div class="mini" style="color:var(--dim)">'+esc(x.note)+'</div></details>';
    });
    const ddCover=new Set(DD.items.map(x=>x.dim)).size;
    h+='<details class="fold" data-lz="D:all"><summary>全 册 深 读 · '+DD.items.length+' 则 / 覆盖 '
      +ddCover+' / '+D.civilization.dimensions.length+' 维 · 点 开 逐 条 看</summary>'
      +'<div class="lazy-body">点开时载入……</div><template data-lz-tpl="D:all">'
      +cacheHTML('D:all',readVer(S),()=>DD.items.map(x=>{
        const q=D.reading_quiz.items.find(z=>z.ddId===x.id);
        const rec=(S.readingLog||[]).filter(z=>z.id===(q?q.id:'')).pop();
        const mark=!rec?'':(rec.choice==='ok'?' <span style="color:var(--gold)">✓ 已辨</span>'
          :rec.choice==='mid'?' <span style="color:var(--gold)">· 折中</span>'
          :' <span style="color:var(--red2)">× 曾误取</span>');
        return '<div class="row"><b>'+esc(x.topic)+'</b>'+mark
          +'<span class="s">'+esc(x.dim)+' · '+esc(x.rank)+'</span>'
          +'<div class="mini">误解：'+esc(x.misread)+'</div>'
          +'<div class="mini">分歧：'+esc(x.dispute)+'</div>'
          +'<div class="mini">延伸：'+esc(x.further)+'</div>'
          +(q?'<div class="mini" style="color:var(--gold)">读法题：'+esc(q.stem)
            +'<br>稳妥：'+esc(q.ok)+'<br>折中：'+esc(q.mid||'先按通说落笔，异说另注')
            +'<br>误读：'+esc(q.bad)+'</div>':'')
          +'</div>';
      }).join(''))
      +'</template></details>';
    const QK=D.reading_quiz;
    const qKinds=[['local','辨其互证 · 地方史'],['surname','辨其称谓 · 姓氏边界'],
                  ['people','辨其称谓 · 人群他称与术语'],
                  ['surname_origin','辨其共祖 · 姓氏扩容'],
                  ['term_layer','辨其层位 · 术语锚点'],
                  ['ruler','辨帝王称谓 · 帝王全册'],
                  ['house','辨世家读法 · 世家全册'],
                  ['succession','辨继立方式 · 帝王与制度']];
    h+='<div class="mini" style="color:var(--gold);margin-top:6px">互 证 与 称 谓 题 库 · 判 读 '
      +QK.items.length+' 道 / '+(qKinds.length+1)+' 类 · 按类点开</div>';
    qKinds.forEach(([k,label])=>{
      const arr=QK.items.filter(x=>x.kind===k);
      if(!arr.length)return;
      h+='<details class="fold" data-lz="Q:'+k+'"><summary>'+esc(label)+' · '+arr.length
        +' 道</summary><div class="lazy-body">点开时载入 '+arr.length+' 道……</div>'
        +'<template data-lz-tpl="Q:'+k+'">';
      h+=cacheHTML('Q:'+k,readVer(S),()=>arr.map(q=>{
        const rec=(S.readingLog||[]).filter(z=>z.id===q.id).pop();
        const mark=rec?(rec.choice==='ok'?' <span style="color:var(--gold)">✓ 已辨</span>'
          :rec.choice==='mid'?' <span style="color:var(--gold)">· 折中</span>'
          :' <span style="color:var(--red2)">× 曾误取</span>'):'';
        return '<div class="row"><b>'+esc(q.topic)+'</b>'+mark
          +'<div class="mini">'+esc(q.stem)+'</div>'
          +'<div class="mini">稳妥：'+esc(q.ok)+'</div>'
          +'<div class="mini">折中：'+esc(q.mid||'')+'</div>'
          +'<div class="mini">误读：'+esc(q.bad)+'</div></div>';
      }).join(''))
        +'</template></details>';
    });
    h+='<div class="mini" style="color:var(--dim)">'+esc(QK.meta.boundary)
      +'　'+esc(QK.meta.scaleNote||'')+'</div>';
    h+='<div class="mini" style="color:var(--dim)">'+esc(DD.meta.boundary)
      +'　'+esc(DD.meta.depth2||'')+'</div></div>';
    /* 人群与姓氏谱系：默认折叠，不作生物种族分类 */
    const PP=D.peoples;
    h+='<div class="card"><div class="tagline">人 群 与 姓 氏 谱 系</div>'
      +'<div class="note" style="border-left-color:var(--red2)"><b>'+esc(PP.meta.subtitle)
      +'：</b>'+esc(PP.meta.disclaimer)+'</div>'
      +'<div class="mini">'+esc(PP.meta.note)+'　'+esc(PP.meta.density)+'</div>';
    h+='<input id="ppSearch" class="ppsearch" placeholder="筛一筛：姓氏 / 人群 / 帝王 / 世家 / 关键词">'
      +'<div class="mini" style="color:var(--gold)">'+esc(PP.meta.density2||'')+'</div>'
      +'<div id="ppCount" class="mini" style="color:var(--gold)"></div>'
      +'<div id="ppList">';
    const rowOf=x=>'<div class="row pp-row"><span class="y">'+esc(x.rawYear)+'</span><b>'+esc(x.title)+'</b>'
      +'<span class="s">'+esc(x.category)+' · '+esc(x.consensus==='date_contested'?'断代有争议':'学界通说')+'</span>'
      +'<div class="mini">'+esc(x.summary)+'</div>'
      +(x.boundary?'<div class="mini" style="color:var(--gold)">'+esc(x.boundary)+'</div>':'')+'</div>';
    const fold=(title,arr,lzKey)=>{
      if(!arr.length)return '';
      const body=cacheHTML('F:'+title,'s'+arr.length,()=>arr.map(rowOf).join(''));
      /* 一律放 template 点开才载入：1295 条姓氏若全进 DOM，文明页 render 会明显卡 */
      return '<details class="fold pp-group" data-lz="'+lzKey+'"><summary>'+esc(title)
        +' · '+arr.length+' 条</summary><div class="lazy-body">点开时载入 '
        +arr.length+' 条……</div><template data-lz-tpl="'+lzKey+'">'
        +body+'</template></details>';
    };
    const sg={};PP.surnames.forEach(x=>{const k=x.group||'既有锚点（本轮前已收录）';(sg[k]=sg[k]||[]).push(x);});
    Object.keys(sg).forEach((k,i)=>h+=fold('姓 氏 · '+k,sg[k],'S:'+i));
    const pg={};PP.peoples.forEach(x=>{const k=x.category||'其他';(pg[k]=pg[k]||[]).push(x);});
    Object.keys(pg).forEach((k,i)=>h+=fold('人 群 · '+k,pg[k],'P:'+i));
    h+=fold('边 界 与 读 法',PP.notes.map(x=>({rawYear:'',title:x.title,category:'边界',
      consensus:'settled',summary:x.text,boundary:''})),'N:0');
    h+='</div><div class="mini" style="color:var(--dim)">全册 '+PP.surnames.length+' 条姓氏、'
      +PP.peoples.length+' 条人群、'+PP.notes.length+' 条边界读法；大组点开才载入，检索时会全量筛，'
      +'不作生物种族分类，也不作血统推断。</div>'
      +'<div class="mini" style="color:var(--gold)">'+esc(PP.meta.scaleNote||'')+'</div></div></div>';
    /* 人物全册：647 位可考姓名按时代分桶，懒加载，已见标金（仍在文明册 panel 内） */
    const PALL=D.civilization.items.filter(x=>x.dim==='P');
    const seg=y=>y<-3000?'传说 / 远古（不作可考纪年）'
      :y<-1000?('前'+Math.ceil(-y/100)+'世纪以前')
      :y<-500?('前'+Math.ceil(-y/100)+'—前'+Math.ceil(-(y+500)/100)+'世纪')
      :y<1?('前'+Math.ceil(-y/100)+'世纪—公元元年前后')
      :y<1000?('公元'+Math.ceil(y/100)+'世纪')
      :y<1500?('公元'+Math.ceil(y/100)+'世纪')
      :y<1800?('公元'+Math.ceil(y/100)+'世纪')
      :('公元'+Math.ceil(y/100)+'世纪—近现代');
    const PB={};PALL.forEach(x=>{const k=seg(x.y0);(PB[k]=PB[k]||[]).push(x);});
    const PKEYS=Object.keys(PB);
    h+='<div class="card"><div class="tagline">人 物 全 册 · '+PALL.length
      +' 位可考姓名 · '+PKEYS.length+' 个时段</div>'
      +'<div class="mini">逐条带年代窗口、类目与一句梗概；新增条目为通识级锚点，'
      +'域名级检索入口、未逐条附引文、不作学术引用。传说层与断代争议单独标注，'
      +'不与本局推演族人攀附血缘。</div>'
      +'<details class="fold" data-lz="CIV:pall"><summary>展开全册 '+PALL.length
      +' 位（按时代分组，点开载入）</summary><div class="lazy-body">点开时载入……</div>'
      +'<template data-lz-tpl="CIV:pall">';
    /* 647 条每次 render 重拼太贵；只有「本局已见数量」变化时才重算 */
    h+=cacheHTML('CIV:pall','seen'+Object.keys(S.seenCiv||{}).length,()=>{
      let out='';
      PKEYS.forEach(k=>{
        out+='<details class="fold"><summary>'+esc(k)+' · '+PB[k].length+' 位</summary>';
        PB[k].forEach(x=>{
          const seen=!!(S.seenCiv||{})[x.id];
          out+='<div class="row"><b>'+esc(x.title)+'</b> <span class="s">'+esc(x.rawYear)
            +(seen?' · <span style="color:var(--gold)">✓ 本局已见</span>':'')+'</span>'
            +'<div class="mini">'+esc(x.summary)+'</div>'
            +(x.consensus==='date_contested'?'<div class="mini" style="color:var(--gold)">断代有争议</div>':'')
            +(x.layer==='framework'?'<div class="mini" style="color:var(--red2)">传说 / 后世追述，不作史实</div>':'')
            +'</div>';
        });
        out+='</details>';
      });
      return out;
    });
    h+='</template></details></div>';
    /* 帝王全册与世家全册：按组折叠懒加载，已见标金，检索并入 ppSearch */
    const DY=W.dynasty,DR=D.rulers,DH=D.houses;
    if(DY){
      const seenR=S.seenRuler||{},seenH=S.seenHouse||{};
      const dyRow=(x,kind)=>{
        const seen=kind==='r'?(seenR[x.id]):(seenH[x.id]);
        const layer=x.layer==='legend'?'传说／后世追述':x.layer==='disputed'?'存疑层':'可考锚点';
        let out='<div class="row dy-row pp-row"><span class="y">'+esc(x.rawYear)+'</span><b>'
          +esc(kind==='r'?x.name:x.name)+'</b>'
          +(seen?' <span style="color:var(--gold)">✓ 本局已见</span>':'')
          +'<span class="s">'
          +(kind==='r'?esc(x.title)+' · '+esc(x.polity):esc(x.category)+(x.alias?' · '+esc(x.alias):''))
          +' · '+layer+(x.consensus==='date_contested'?' · 断代有争议':'')+'</span>';
        if(kind==='r'){
          out+='<div class="mini">'+(x.succession?'继立：'+esc(x.succession)+'　':'')
            +esc(x.note||'')+'</div>';
        }else{
          out+='<div class="mini"><b>兴起：</b>'+esc(x.rise)+'　<b>鼎盛：</b>'+esc(x.peakEvent)+'</div>'
            +'<div class="mini"><b>散脉：</b>'+esc(x.fall)+'</div>'
            +'<div class="mini" style="color:var(--gold)">'+esc(x.boundary)+'</div>';
        }
        return out+'</div>';
      };
      const dyFold=(title,arr,key,kind)=>{
        if(!arr.length)return '';
        const body=cacheHTML('DY:'+key,'seen'+Object.keys(seenR).length
          +'_'+Object.keys(seenH).length,()=>arr.map(x=>dyRow(x,kind)).join(''));
        return '<details class="fold dy-group" data-lz="'+key+'"><summary>'+esc(title)
          +' · '+arr.length+' 条</summary><div class="lazy-body">点开时载入 '
          +arr.length+' 条……</div><template data-lz-tpl="'+key+'">'+body+'</template></details>';
      };
      const RG=DY.rulerGroups(),HG=DY.houseGroups();
      h+='<div id="dyList">';
      h+='<div class="card"><div class="tagline">帝 王 全 册 · '+DR.rulers.length
        +' 位 · '+Object.keys(RG).length+' 个政权</div>'
        +'<div class="note" style="border-left-color:var(--red2)"><b>帝王不是「统治整个文明圈」：</b>'
        +'每条只记「某政权某时段在位」；并立政权、摄政称制、追尊、被废与复辟都单独标注。'
        +'传说层不进同期依据池。</div>'
        +'<div class="mini">'+esc(DR.meta.note)+'</div>'
        +'<div class="mini" style="color:var(--gold)">本局已见 '
        +Object.keys(seenR).length+' / '+DR.rulers.length+' 位。</div>';
      h+='<details class="fold"><summary>称 谓 与 制 度 读 法 · '+DR.titles.length
        +' 条</summary>'+DR.titles.map(t=>'<div class="row"><b>'+esc(t.name)
        +'</b><div class="mini">'+esc(t.note)+'</div></div>').join('')+'</details>';
      h+='<details class="fold"><summary>边 界 读 法 · '+DR.notes.length
        +' 条</summary>'+DR.notes.map(t=>'<div class="row"><b>'+esc(t.title)
        +'</b><div class="mini">'+esc(t.text)+'</div></div>').join('')+'</details>';
      /* v1.0 在位时间条：默认选本局文明圈第一个有锚点的政权 */
      const PN=DY.polityNames();
      /* 默认选本圈中「非传说且条目最多」的政权，避免一开就是 6 行传说层 */
      const cand=PN.map(k=>({k:k,d:DY.timelineData(k)}))
        .filter(o=>o.d&&o.d.rows.length>=8&&o.d.rows.some(r=>r.cat!=='legend')
          &&RG[o.k]&&RG[o.k].some(x=>x.region===S.reg))
        .sort((a,b)=>b.d.rows.length-a.d.rows.length);
      const defP=(cand[0]&&cand[0].k)||PN.find(k=>k==='唐')
        ||PN.find(k=>DY.timelineData(k))||PN[0];
      h+='<div class="card" style="margin-top:8px"><div class="tagline">帝 王 在 位 时 间 条 · '
        +'按政权画区间</div>'
        +'<div class="viewsel" style="flex-wrap:wrap;margin-bottom:6px">'
        +'<select id="dyTlPolity" style="background:#1d1811;color:var(--ink);border:1px solid var(--line);'
        +'border-radius:8px;padding:6px;font-family:inherit;font-size:12px">'
        +PN.map(k=>'<option value="'+esc(k)+'"'+(k===defP?' selected':'')+'>'
          +esc(k)+' · '+(RG[k]||[]).length+' 位</option>').join('')+'</select>'
        +'<button class="pill" data-dytl="out">－</button>'
        +'<button class="pill" data-dytl="reset">复位</button>'
        +'<button class="pill" data-dytl="in">＋</button></div>'
        +'<div id="dyTlWrap" style="overflow-x:auto">'+dyTimelineSVG(defP)+'</div>'
        +dyTimelineLegend()+'</div>';
      Object.keys(RG).forEach((k,i)=>h+=dyFold('帝 王 · '+k,RG[k],'R:'+i,'r'));
      h+='<div class="mini" style="color:var(--dim)">'+esc(DR.meta.sources)
        +'　'+esc(DR.meta.boundary)+'</div></div>';
      h+='<div class="card"><div class="tagline">世 家 全 册 · '+DH.houses.length
        +' 家 · '+Object.keys(HG).length+' 类　<span style="color:var(--dim);font-size:10px">'
        +esc(VER())+'</span></div>'
        +'<div class="note" style="border-left-color:var(--red2)"><b>郡望不等于血统凭证：</b>'
        +esc(DH.meta.boundary)+'</div>'
        +'<div class="mini">'+esc(DH.meta.note)+'</div>'
        +'<div class="mini" style="color:var(--gold)">本局已见 '
        +Object.keys(seenH).length+' / '+DH.houses.length+' 家；'
        +'另有 '+D.house_entities.entities.length+' 家可在开局代入浮沉。</div>';
      h+='<details class="fold"><summary>世 家 边 界 读 法 · '+DH.notes.length
        +' 条</summary>'+DH.notes.map(t=>'<div class="row"><b>'+esc(t.title)
        +'</b><div class="mini">'+esc(t.text)+'</div></div>').join('')+'</details>';
      Object.keys(HG).forEach((k,i)=>h+=dyFold('世 家 · '+k,HG[k],'H:'+i,'h'));
      h+='<div class="mini" style="color:var(--dim)">'+esc(DH.meta.sources)
        +'　'+esc(DH.meta.excluded)+'</div></div>';
      h+='</div>';
    }
    h+='</div>';   /* 关闭文明册 panel（人物全册之后才收口） */
    }else{h+='<div class="panel"></div>';}

    /* 舆地：可缩放历史舆图 + 真实地理、气候变迁、史前序章与边界层 */
    const GC=W.geoclimate,FG=W.fringe,T=W.reality.tier(S.reality);
    const mine=GC.unitsOf(S.reg),AM=D.atlas.meta,LM=D.layers.meta;
    const LB=[['polity','政权'],['climate','气候'],['pop','人口热力'],['family','家族'],['local','地方志']];
    h+='<div class="panel '+(TAB==='geo'?'on':'')+'">'+hintFor('geo',S)+'<div class="card"><div class="tagline">历 史 舆 图 · 五 层 可 叠 加</div>'
      +'<div class="note" style="border-left-color:var(--red2)"><b>'+esc(AM.title)+'：</b>'
      +esc(AM.disclaimer)+'</div>'
      +'<div class="mini" style="margin-top:6px">'+esc(AM.precise)+'</div>'
      +'<div class="mini">'+esc(LM.climateNote)+'</div>'
      +'<div class="mini">'+esc(LM.populationNote)+'</div>'
      +'<div class="mini">'+esc(LM.familyNote)+'</div>'
      +'<div class="mini" style="color:var(--gold)">'+esc(D.localities.meta.boundary)+'</div>'
      +'<div class="layerbar">'+LB.map(x=>'<button data-layer="'+x[0]+'" class="'+(ATL[x[0]]?'on':'')+'">'
        +(ATL[x[0]]?'✓ ':'＋ ')+x[1]+'</button>').join('')+'</div>'
      +'<div class="maptools">'
      +'<button data-atlas="in">＋ 放大</button><button data-atlas="out">－ 缩小</button>'
      +'<button data-atlas="reset">复 位</button><button data-atlas="follow">回到本局年份</button>'
      +'</div>'
      +'<div class="yearbar"><span>年 份</span>'
      +'<input type="range" id="atlasYear" min="-3100" max="2026" step="1" value="'+Math.max(-3100,Math.min(2026,S.year))+'">'
      +'<b id="atlasYearLabel">'+E.fmtYear(S.year)+'</b></div>'
      +'<div class="mapbox atlasbox"><canvas id="atlasCanvas"></canvas></div>'
      +'<div class="mini" style="margin-top:8px">滚轮／双指缩放、按住拖动平移；'
      +'点选圆点为地理单元（开启地方志时变绿）、白点为城址、金圈为家族据点、彩椭圆为气候影响区。'
      +'横轴经度 −180°→180°，纵轴纬度 90°→−90°。'+esc(LM.zoom)+'</div>'
      +'<div id="atlasPick" class="note" style="margin-top:8px">点一下地图上的点位，可查看该地说明。</div>'
      +'<div id="atlasList" class="card" style="margin-top:8px;padding:10px"></div>'
      +'</div>';
    h+='<div class="card"><div class="tagline">本 圈 地 理 单 元 · '+mine.length+'</div>';
    mine.forEach(u=>h+='<div class="row"><span class="y">'+u.lat.toFixed(0)+'°, '+u.lon.toFixed(0)+'°</span>'
      +'<b>'+esc(u.name)+'</b> <span class="s">'+esc(u.type)+'</span>'
      +'<div class="mini">'+esc(u.fact)+'</div>'
      +(u.change!=='稳定'?'<div class="mini" style="color:var(--gold)">可考变化：'+esc(u.change)+'</div>':'')
      +'</div>');
    h+='</div>';
    const seenClim=GC.timeline(S,S.climateSeen||{});
    h+='<div class="card"><div class="tagline">气 候 与 地 理 编 年 · 已历 '+seenClim.length+' / '+D.geoclimate.events.length+'</div>'
      +'<div class="mini">'+esc(D.geoclimate.meta.clmNote)+'</div>'
      +'<div class="note" style="margin-top:8px">'+esc(GC.CAVEAT)+'</div>';
    (seenClim.length?seenClim:D.geoclimate.events.slice(0,10)).forEach(x=>{
      h+='<div class="row"><span class="y">'+esc(x.rawYear)+'</span><b>'+esc(x.title)+'</b>'
        +(S.climateSeen&&S.climateSeen[x.id]?' <span style="color:var(--gold)">〔已历〕</span>':'')
        +'<div class="mini">'+esc(x.category)+' · '+esc(x.summary.slice(0,70))+'…</div></div>';
    });
    h+='<div class="hr"></div><div class="mini">共 '+D.geoclimate.events.length+' 条，覆盖全新世大暖期、非洲湿润期、4.2千年事件、'
      +'小冰期、坦博拉喷发、黄河铜瓦厢改道、近现代变暖与海平面上升。逐条标证据类型与区域异质性。</div></div>';

    /* 史前序章：有考古证据的对照面 */
    h+='<div class="card"><div class="tagline">史 前 序 章 · 有 考 古 证 据 · '+D.fringe.prehistory.length+'</div>'
      +'<div class="mini">这些是真正可考的史前人类活动，与「史前超文明」类无证据假说严格分开。'
      +'年代早于本局起点，只在序章陈列，不按年份触发。</div>';
    D.fringe.prehistory.forEach(p=>h+='<div class="row"><span class="y">'+esc(p.rawYear)+'</span>'
      +'<b>'+esc(p.title)+'</b><div class="mini">'+esc(p.summary)+'</div></div>');
    h+='</div>';

    /* 边界层：文本传统 / 未证实假说 */
    h+='<div class="card"><div class="tagline">文 本 传 统 与 边 界 层</div>'
      +'<div class="mini">四层严格分离：史实 / 文本传统 / 未证实假说 / 史前可考。'
      +'当前档位 <b style="color:var(--gold)">'+esc(T.name)+'</b>：'
      +'文本传统'+(T.allow.text?'已开放（标非史实）':'关闭')+'，'
      +'未证实假说'+(T.allow.hypothesis?'已开放（红色警示）':'关闭')+'。</div>'
      +'<div class="note" style="margin-top:8px"><b>核心纪律：</b>文本真实存在、成书年代可考，'
      +'不等于文本所述事件、人物或技术为真。野史、笔记、志怪、演义、小说都归这一层。</div>';
    const tx=D.fringe.texts.slice(0,8);
    tx.forEach(x=>h+='<div class="row"><span class="y">'+esc(x.rawYear)+'</span><b>'+esc(x.title)+'</b>'
      +' <span class="s">'+esc(x.nature)+'</span>'
      +'<div class="mini">'+esc(x.summary.slice(0,62))+'…</div></div>');
    h+='<div class="hr"></div><div class="mini">共 '+D.fringe.texts.length+' 条文本传统，含《山海经》《竹书纪年》今本问题、'
      +'《战国策》拟作辞令、《三国演义》《西游记》、荷马史诗与特洛伊问题、《古文尚书》辨伪等。</div></div>';
    if(T.allow.hypothesis){
      h+='<div class="card fringecard"><div class="tagline" style="color:var(--red2)">未 证 实 假 说 · 狂 想 档 专 属</div>'
        +'<div class="mini" style="color:var(--red2)">'+esc(FG.NO_EVIDENCE)+'</div>';
      D.fringe.hypotheses.forEach(x=>h+='<div class="row"><b>'+esc(x.name)+'</b>'
        +' <span class="s">'+esc(x.standing)+'</span>'
        +'<div class="mini">'+esc(x.evidence)+'</div></div>');
      h+='<div class="mini" style="margin-top:8px">这些说法的「提出年代」与「文本来源」可考，'
        +'但主张本身无证据；游戏只把它们当虚构推演素材，不计入史实、不写入史实编年。</div></div>';
    }else{
      h+='<div class="card"><div class="tagline">未 证 实 假 说 · 当 前 关 闭</div>'
        +'<div class="mini">亚特兰蒂斯、姆大陆、史前超文明、古代宇航员、金字塔外星说等 '
        +D.fringe.hypotheses.length+' 条，'+esc(FG.NO_EVIDENCE)
        +' 想玩可在开局或设置里切到「狂想档」，届时每张卡都会红色醒目标注。</div></div>';
    }
    h+='<div class="card"><div class="tagline">误 读 记 录</div><div class="volgrid">'
      +'<div>把小说当史实<b>'+(S.misread?S.misread.text:0)+'</b></div>'
      +'<div>把假说当史实<b>'+(S.misread?S.misread.hypothesis:0)+'</b></div>'
      +'<div>其中严重误读<b>'+(S.misread?S.misread.severe:0)+'</b></div>'
      +'<div>已见气候事件<b>'+seenClim.length+'</b></div>'
      +'</div><div class="mini" style="margin-top:8px">误读只记一笔并扣文脉，不改写任何史实字段；'
      +'这是把「辨伪」做成玩法，而不是把假的混进真的。</div></div></div>';

    h+='<div class="panel '+(TAB==='vol'?'on':'')+'">'+hintFor('vol',S)+timelineHTML(S)
      +'<div class="card"><div class="tagline">历 卷 · 汇 流</div>';
    h+=S.volLog.length?S.volLog.slice().reverse().map(v=>'<div class="row"><span class="y">卷'+v.n+'</span><b>〈'+WV.volTitle(v.n)+'〉</b> '+E.fmtShort(v.from)+'—'+E.fmtShort(v.to)
      +'<div class="mini">'+esc(v.echo)+'</div></div>').join(''):'<div class="mini">尚无合拢之卷。每 '+E.volLen()+' 笔汇流一次。</div>';
    if(S.endLog.length)h+='<div class="hr"></div><div class="tagline">终 章</div>'+S.endLog.slice().reverse().map(x=>'<div class="row"><span class="y">'+E.fmtShort(x.y)+'</span>'+esc(x.t)+'</div>').join('');
    if(S.mode==='succession'&&S.chainState){
      const sum=W.succession.chainSummary(S);
      h+='<div class="hr"></div><div class="tagline">朝 代 长 河 · '+sum.length+' 朝</div>';
      sum.forEach((x,i)=>{
        h+='<div class="row"><span class="y">'+(i+1)+'</span><b>'+esc(x.name)+'</b> '
          +(x.current?'<span style="color:var(--gold)">〔当前〕</span>':x.visited?'<span class="s">已历</span>':'<span class="s">未至</span>')
          +'<div class="mini">'+E.fmtShort(x.from)+' — '+E.fmtShort(x.to)+' · '+esc(x.transition)+'</div></div>';
      });
    }
    /* 平行时间轴：同年横看并立政权，不硬串成单线 */
    h+='<div class="card"><div class="tagline">平 行 时 间 轴 · 政 权 条 带</div>'
      +'<div class="mini">同一年里多个政权并立，是常态。条带按考据年表起止绘制；'
      +'重叠即并列，不表示前后相续。本视图为纪年条带，非疆域地图（数据未含经纬度）。</div>';
    const ents=D.entities.entities.slice().sort((a,b)=>a.startYear-b.startYear);
    const xmin=Math.min(...ents.map(x=>x.startYear)),xmax=Math.max(...ents.map(x=>x.endYear));
    const pct=y=>Math.max(0,Math.min(100,Math.round((y-xmin)/(xmax-xmin)*100)));
    ents.forEach(x=>{
      const L=pct(x.startYear),Wd=Math.max(1,pct(x.endYear)-L);
      h+='<div style="margin-top:8px"><div class="mini">'+esc(x.name)+' <span style="color:var(--dim)">'
        +E.fmtShort(x.startYear)+'—'+E.fmtShort(x.endYear)+'</span></div>'
        +'<div style="position:relative;height:9px;background:#3a3022;border-radius:5px;margin-top:4px">'
        +'<i style="position:absolute;left:'+L+'%;width:'+Wd+'%;height:9px;background:linear-gradient(90deg,var(--red),var(--gold));border-radius:5px"></i>'
        +'</div></div>';
    });
    h+='<div class="mini" style="margin-top:10px">时间范围 '+E.fmtShort(xmin)+' — '+E.fmtShort(xmax)
      +'。左端 '+E.fmtShort(xmin)+'，右端 '+E.fmtShort(xmax)+'。</div></div>';
    /* 近现代锚点：不伪造六阶段考据年表，只列已考据的可考节点 */
    const modern=D.history.events.filter(x=>x.y0>=1600).sort((a,b)=>a.y0-b.y0);
    h+='<div class="card"><div class="tagline">近 现 代 可 考 锚 点 · 到 '+2026+'</div>'
      +'<div class="mini">朝代长河的六阶段考据年表止于 1644 年。以下为 data/history.json 中已考据的近现代节点，'
      +'<b>未</b>据此虚构清／民国／当代的「建立→鼎盛→终结」六阶段实体。</div>';
    modern.forEach(x=>h+='<div class="row"><span class="y">'+E.fmtShort(x.y0)+'</span><b>'+esc(x.title)+'</b>'
      +'<div class="mini">'+esc(x.summary.slice(0,64))+'…</div>'
      +'<div class="mini" style="color:#8f8067">'+esc(x.cite||x.source)+'</div></div>');
    h+='<div class="hr"></div><div class="mini">2026 年之后的事件不作自动外推。</div></div>';
    h+='<button class="big alt" data-act="scroll">生 成 收 卷 报 告</button>'
      +'<button class="big alt" data-act="exportpng">导 出 收 卷 长 图</button></div></div>';

    h+='<div class="panel '+(TAB==='set'?'on setdrawer':'')+'">'+hintFor('set',S)+'<div class="card"><div class="tagline">视 角</div><div class="viewsel">';
    Object.keys(D.views).forEach(k=>h+='<button data-view="'+k+'" class="'+(S.view===k?'on':'')+'">'+D.views[k].n+'</button>');
    h+='</div><div class="mini">随时可换，只改叙事口吻与「顺势」一途，不打断编年。</div></div>';
    h+='<div class="card"><div class="tagline">本 局 种 子</div><div class="mini">'
      +'<span style="color:var(--gold)">'+esc(S.seed)+'</span><br>确定性随机：同一种子 + 同一串选择 + 同一档位配置，必得同一局。</div></div>';
    const DT=W.difficulty.tier(S.difficulty);
    h+='<div class="card"><div class="tagline">难 度 与 新 手 教 程</div>'
      +'<div class="row"><b>'+esc(DT.name)+'</b> <span class="s">本局锁定</span>'
      +'<div class="mini">'+esc(DT.desc)+'</div>'
      +'<div class="mini" style="color:var(--dim)">难度写进存档与分享串，保证复盘一致；'
      +'要换难度请「另起一局」。难度只改推演数值与指引，不改史实。</div></div>'
      +'<div class="viewsel" style="flex-wrap:wrap;margin-top:8px">'
      +'<button data-tut="reopen">重 看 新 手 教 程</button>'
      +'<button data-tut="on">开 启 指 引</button>'
      +'<button data-tut="off">收 起 指 引</button></div>'
      +'<div class="mini" style="margin-top:6px">教程共 '+W.tutorial.STEPS.length+' 步；'
      +'「收起」只关教程卡，不改难度、不改八维、不动史实。'
      +'当前：'+(S.tutorial&&S.tutorial.on?'教程进行中':'教程已收起')+'。</div></div>';

    /* 局中切换：只影响后续事件池，不改写已发生的史实 */
    const RT2=W.reality;
    h+='<div class="card"><div class="tagline">局 中 调 档</div>'
      +'<div class="mini">切换只影响「此后还会遇见什么」，已发生的史实、编年与抉择一笔不改。'
      +'分享串会带上档位配置，复盘仍可对上。</div>'
      +'<div class="hr"></div><div class="tagline">真 实 性</div><div class="viewsel" style="flex-wrap:wrap">';
    RT2.TIERS.forEach(t=>h+='<button data-live-tier="'+t.key+'" class="'+(S.reality===t.key?'on':'')+'">'+t.short+'</button>');
    h+='</div><div class="mini" style="margin-top:5px">'+esc(RT2.tier(S.reality).desc)+'</div>'
      +'<div class="hr"></div><div class="tagline">玩 法</div><div class="viewsel" style="flex-wrap:wrap">';
    RT2.MODES.forEach(m=>h+='<button data-live-mode="'+m.key+'" class="'+(S.modeKey===m.key?'on':'')+'">'+m.name+'</button>');
    h+='</div><div class="mini" style="margin-top:5px">'+esc(RT2.mode(S.modeKey).desc)+'</div>'
      +'<div class="hr"></div><div class="tagline">时 长</div><div class="viewsel" style="flex-wrap:wrap">';
    RT2.LENGTHS.forEach(l=>h+='<button data-live-len="'+l.key+'" class="'+(S.lengthKey===l.key?'on':'')+'">'+l.name+'</button>');
    h+='</div><div class="mini" style="margin-top:5px">'+esc(RT2.length(S.lengthKey).desc)+'</div>'
      +'<div class="hr"></div><div class="tagline">史 料 密 度</div><div class="viewsel" style="flex-wrap:wrap">';
    RT2.DENSITIES.forEach(d=>h+='<button data-live-dens="'+d.key+'" class="'+(S.density===d.key?'on':'')+'">'+d.name+'</button>');
    h+='</div></div>';
    h+='<div class="card"><div class="tagline">存 档 槽 · '+E.SLOT_MAX+' 个</div>';
    const sl=E.slots();
    sl.forEach((v,n)=>{
      h+='<div class="row">'+(v?'<span class="y">槽'+(n+1)+'</span><b>'+esc(v.name)+'</b>'
        +' <span class="s">'+E.fmtShort(v.year)+' · '+v.turn+' 笔 · '+v.mode+'</span>'
        +(n===S.slot?' <span style="color:var(--gold)">〔当前〕</span>':'')
        +'<div style="margin-top:6px"><button class="pill" data-slot="'+n+'">载入</button> '
        +'<button class="pill" data-del="'+n+'">清空</button></div>'
        :'<span class="y">槽'+(n+1)+'</span><span class="s">空</span>'
        +'<div style="margin-top:6px"><button class="pill" data-save="'+n+'">存入本局</button></div>')+'</div>';
    });
    h+='<div class="hr"></div><div class="mini">自动存档写入当前槽；导出／导入可整体搬走全部槽位。</div>'
      +'<button class="big alt" data-act="exportall">导 出 全 部 存 档</button>'
      +'<button class="big alt" data-act="importall">导 入 存 档</button></div>';

    h+='<div class="card"><div class="tagline">分 享 与 对 照 局</div><div class="mini">'
      +'分享串 = 种子 + 每笔选择序号。同种子、不同选择可并排看分岔在哪。</div>'
      +'<div class="note" style="word-break:break-all;font-size:11px">'+esc(E.shareString())+'</div>'
      +'<button class="big alt" data-act="copyshare">复 制 分 享 串</button>'
      +'<button class="big alt" data-act="replay">载 入 对 照 局</button>';
    const g=E.getGhost();
    if(g){
      h+='<div class="hr"></div><div class="tagline">对 照 局 · 差 异</div><div class="volgrid">'
        +'<div>年份<b>'+E.fmtShort(S.year)+' / '+E.fmtShort(g.year)+'</b></div>'
        +'<div>笔数<b>'+S.turn+' / '+g.turn+'</b></div>'
        +'<div>传承度<b>'+Math.round(S.score)+' / '+Math.round(g.score)+'</b></div>'
        +'<div>文明条目<b>'+Object.keys(S.seenCiv||{}).length+' / '+Object.keys(g.seenCiv||{}).length+'</b></div>'
        +'</div><div class="mini">左为本局，右为对照局。旧例差异：'
        +Object.keys(S.tags||{}).filter(t=>!g.tags||!g.tags[t]).slice(0,6).map(t=>esc(t)).join('、')
        +' ｜ 对照独有：'+Object.keys(g.tags||{}).filter(t=>!S.tags||!S.tags[t]).slice(0,6).map(t=>esc(t)).join('、')
        +'</div><button class="big alt" data-act="clearghost">清 除 对 照</button>';
    }
    h+='</div>';

    h+='<div class="card"><div class="tagline">显 示</div><div class="viewsel">'
      +'<button data-fs="0" class="'+(FS===0?'on':'')+'">标准</button>'
      +'<button data-fs="1" class="'+(FS===1?'on':'')+'">大字</button>'
      +'<button data-fs="2" class="'+(FS===2?'on':'')+'">超大</button></div>'
      +'<div class="viewsel" style="margin-top:8px">'
      +'<button data-hc="0" class="'+(HC===0?'on':'')+'">常规对比度</button>'
      +'<button data-hc="1" class="'+(HC===1?'on':'')+'">高对比度</button></div>'
      +'<div class="mini">手机竖屏优化；设置仅存于本次会话。</div></div>';

    /* ===== v1.5 视 图 · 清 爽 ===== */
    const SG=W.stage,sg=SG?SG.status():{stage:true,bubble:true,layers:0,bg:false,
      size:'normal',scenes:[],ready:0,locked:0,pending:[]};
    const vpack=(W.a11y&&W.a11y.guideVoices)?W.a11y.guideVoices():{total:0,zh:0,guide:false};
    h+='<div class="card"><div class="tagline">视 图 · 清 爽</div>'
      +'<div class="mini">设置已改成独立抽屉：顶部大按钮随时关闭返回，'
      +'把手可上下拖动调高度，内容长直接滑动。主页默认极简：档位长说明、'
      +'新手指引入口、视角徽章与舞台角标都收起，八维与卷进度压成细条；'
      +'齿轮旁的「指引」一键恢复。选项区没有高度上限，全部条目直接铺开。</div>'
      +'<div class="switchrow"><span>主页</span><div class="viewsel">'
        +'<button data-minimal class="'+(MINIMAL?'on':'')+'">极简</button>'
        +'<button data-minimal class="'+(!MINIMAL?'on':'')+'">显示指引</button></div></div>'
      +'<div class="switchrow"><span>立绘构图</span><div class="viewsel">'
        +'<button data-charfit="full" class="'+(sg.charfit==='full'?'on':'')+'">全身</button>'
        +'<button data-charfit="half" class="'+(sg.charfit==='half'?'on':'')+'">半身</button>'
        +'<button data-charfit="auto" class="'+(sg.charfit==='auto'?'on':'')+'">自动</button></div></div>'
      +'<div class="switchrow"><span>皮肤</span><div class="viewsel">'
        +'<button data-skin="auto" class="'+(SKIN==='auto'?'on':'')+'">跟随系统</button>'
        +'<button data-skin="light" class="'+(SKIN==='light'?'on':'')+'">暖纸</button>'
        +'<button data-skin="dark" class="'+(SKIN==='dark'?'on':'')+'">夜色</button></div></div>'
      +'<div class="mini" style="margin-top:4px">默认跟随系统深浅色；也可锁定暖纸或夜色。'
      +'AVG 全屏时皮肤会轻微调整背景板明暗，文字对比度始终优先。</div>'
      +'<div class="switchrow"><span>AVG 全屏舞台</span><div class="viewsel">'
        +'<button data-avg="1" class="'+(AVGON?'on':'')+'">开</button>'
        +'<button data-avg="0" class="'+(!AVGON?'on':'')+'">关</button></div></div>'
      +'<div class="mini" style="margin-top:6px">开：背景铺满整屏、向导常驻，选项与对话框半透浮在其上，'
      +'滚动选项时也不会看不到哈士喵；关：回到原来的上下分栏。</div>'
      +'<div class="switchrow"><span>所有气泡 / 弹窗 底色</span><div class="veilrow">'
        +'<input type="range" min="10" max="100" step="5" value="'+VEIL+'" data-veil '
        +'aria-label="气泡与弹窗底色不透明度"><b data-veil-val>'+VEIL+'%</b></div></div>'
      +'<div class="mini">默认 35%（底色不透明度，越接近 10 越透）。气泡、进度弹窗、选项卡共用这一个值；'
      +'文字始终实色加深色描边与浅色光晕，最透档也看得清。下面三档是快捷预设。</div>'
      +'<div class="mini" style="margin-top:6px">半身档把立绘放大、下半身落进横向气泡后面，'
      +'透过半透明气泡仍看得见角色；这是构图性放大，角色层本身完整无裁切。'
      +'自动档在开局、卷末、更迭、终章用全身，抉择与结果用半身。</div>'
      +'<div class="switchrow"><span>横屏布局</span><div class="viewsel">'
        +'<button data-landscape="1" class="'+(LANDSCAPE?'on':'')+'">开</button>'
        +'<button data-landscape="0" class="'+(!LANDSCAPE?'on':'')+'">关</button></div></div>'
      +'<div class="switchrow"><span>舞台尺寸</span><div class="viewsel">'
        +'<button data-stage-size="compact" class="'+(STSIZE==='compact'?'on':'')+'">紧凑</button>'
        +'<button data-stage-size="normal" class="'+(STSIZE==='normal'?'on':'')+'">标准</button>'
        +'<button data-stage-size="immersive" class="'+(STSIZE==='immersive'?'on':'')+'">全屏</button></div></div>'
      +'<div class="switchrow"><span>气泡透度</span><div class="viewsel">'
        +'<button data-bubble-alpha="light" class="'+(BUB==='light'?'on':'')+'">极透</button>'
        +'<button data-bubble-alpha="veil" class="'+(BUB==='veil'?'on':'')+'">半透</button>'
        +'<button data-bubble-alpha="solid" class="'+(BUB==='solid'?'on':'')+'">实底</button></div></div>'
      +'<div class="mini" style="margin-top:6px">全屏档会把同一张背景板铺满整屏、角色与气泡浮在其上；'
      +'紧凑档把舞台压到一行，≡ 键直接滚到选项区。手机若锁定竖屏，横屏键只改布局、不会强行旋转系统。'
      +'气泡是扁平横条，半透能透出背景与立绘，文字带浅色描边保证看清。</div></div>';

    /* ===== v2.7 横 向 画 布 · 左 右 分 栏 ===== */
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

    /* ===== v2.8 横 向 画 布 · 提 示 条 ===== */
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
      +'<div class="mini" style="margin-top:6px">默认精简小胶囊、固定在屏幕上永远正着，'
      +'不再是竖着拿手机时那一整块竖排说明；页签仍随画布一起横过来。'
      +'按住 ⠿ 可拖动，左右不出屏。'
      +'选「隐藏」后仍可按 Esc、点本页「横屏布局 → 关」或回主页点 ▯ 退出，不会换不回去。'
      +'这些只存本机，不进存档与分享串。</div>'
      +'<div class="switchrow" style="margin-top:6px"><span>当前横屏布局</span><div class="viewsel">'
      +'<button data-landscape="0">关 · 退出横屏</button></div></div></div>';

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

    /* ===== v1.9 场 景 · 预 览 可 选 ===== */
    const BDL=SG&&SG.backdropList?SG.backdropList(S):[];
    const curBD=BDL.filter(x=>x.current)[0];
    h+='<div class="card"><div class="tagline">场 景 · 预 览 可 选</div>'
      +'<div class="mini">'+BDL.length+' 张同画风背景板随进度开放。点缩略图直接换，'
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
      +'不表示本局所在地域、不改写史实、不进存档与分享串。</div></div>';

    /* ===== v2.0 气 泡 · 摆 放 与 大 小 ===== */
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

    /* ===== v2.2 向 导 人 声 · 声 线 与 表 演 ===== */
    const VPX=W.a11y,VP=(VPX&&VPX.voicePacks)||[],curVP=VPX&&VPX.status?VPX.status().voicePack:'gentle';
    h+='<div class="card"><div class="tagline">向 导 人 声 · 声 线 与 表 演</div>'
      +'<div class="mini">先说实话：这里没有配音素材包，也不联网加载音频。'
      +'「声线」是浏览器系统语音的音高／语速组合，「语气音」是 Web Audio 合成的非语言短音，'
      +'「说话表演」是朗读时立绘轻轻起伏。三者叠起来像在演，不是真人录音。</div>'
      +'<div class="wxgrid">'
      +VP.map(x=>'<button class="vppick'+(x.key===curVP?' on':'')+'" data-voicepack="'+esc(x.key)+'"'
        +' aria-label="'+esc(x.name)+'：'+esc(x.note)+'"><b>'+esc(x.name)+'</b>'
        +'<em>'+esc(x.note)+'</em></button>').join('')
      +'</div>'
      +'<div class="switchrow"><span>朗读时立绘说话表演</span><div class="viewsel">'
      +'<button data-talkact="1" class="'+((VPX&&VPX.status&&VPX.status().talkAct)?'on':'')+'">开</button>'
      +'<button data-talkact="0" class="'+((VPX&&VPX.status&&!VPX.status().talkAct)?'on':'')+'">关</button></div></div>'
      +'<div class="switchrow"><span>开口语气音</span><div class="viewsel">'
      +'<button data-cue="1" class="'+(CUEON?'on':'')+'">开</button>'
      +'<button data-cue="0" class="'+(!CUEON?'on':'')+'">关</button></div></div>'
      +'<div class="mini" style="margin-top:6px">六种语气按台词文字自动挑：'
      +'好奇 / 欢喜 / 迟疑 / 低落 / 惊讶 / 平静；点下面可试听。'
      +'选「不出声」只做立绘表演与字幕，适合静音场合。</div>'
      +'<div class="pp-grid" style="margin-top:6px">'
      +((W.audio&&W.audio.cueMoods)||['curious','happy','hesitate','sad','surprise','calm'])
        .map(x=>'<button data-cue-try="'+esc(x)+'">'+esc(({
          curious:'好奇',happy:'欢喜',hesitate:'迟疑',sad:'低落',surprise:'惊讶',calm:'平静'}[x])||x)+'</button>').join('')
      +'</div><div class="mini" style="margin-top:6px">声线、语气与表演开关只存本机，'
      +'不进存档与分享串，不影响史实、难度与同种子复盘。</div></div>';

    /* ===== v2.0 反 馈 · 震 动 与 长 按 ===== */
    h+='<div class="card"><div class="tagline">反 馈 · 震 动 与 长 按</div>'
      +'<div class="switchrow"><span>点击立绘震动</span><div class="viewsel">'
      +'<button data-vibe="1" class="'+(VIBE?'on':'')+'">开</button>'
      +'<button data-vibe="0" class="'+(!VIBE?'on':'')+'">关</button></div></div>'
      +'<div class="mini" style="margin-top:6px">点一下向导有一下轻震；'
      +'长按立绘约半秒会弹出已开放的表情层，选一个就演一拍。'
      +'长按与拖动互斥：手指一动就只当拖动，不会误弹面板。'
      +'浏览器不支持震动时静默跳过，不会报错。</div></div>';

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

    /* ===== v1.5 表 演 关 卡 · 登 记 ===== */
    const scn=sg.scenes||[],readyN=sg.ready||0,lockN=sg.locked||0;
    perfLoad(S.seed);
    let sceneRows='',doneRows='';
    scn.forEach(x=>{
      const ok=x.ready,tag=ok?'✓ 已就绪':'🔒 敬请期待';
      const row='<div class="scenerow'+(ok?'':' locked')+'"><b>'+esc(x.name)+'</b>'
        +'<span class="mini">'+esc(x.when)+'</span>'
        +'<em>'+tag+(ok?'':' · 缺 '+esc((x.missing||[]).join('／')))+'</em></div>';
      if(PERFORMED.indexOf(x.key)>=0)doneRows+=row;else sceneRows+=row;
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
      +((D.asset_plan&&D.asset_plan.rejectedBatch)?
        '<div class="mini" style="margin-top:4px;color:var(--red2)">'
        +esc(D.asset_plan.rejectedBatch.reason)+'　'+esc(D.asset_plan.rejectedBatch.action)
        +'　'+esc(D.asset_plan.rejectedBatch.next)+'</div>':'')
      +'<div class="mini" style="margin-top:4px">每行压成一行；本局已演过的关卡'
      +'折到最末尾，不占前面位置。</div>'
      +'<details class="scenelist" data-scene-details><summary data-scene-open>'
      +'展开查看待演 '+scn.filter(x=>PERFORMED.indexOf(x.key)<0).length+' 关</summary>'
      +'<template class="scene-tpl">'+sceneRows+'</template>'
      +'<div class="scene-host"></div></details>'
      +(doneRows?'<details class="scenedone"><summary>已通关 '
        +PERFORMED.filter(k=>scn.some(x=>x.key===k)).length+' 关 · 点开看</summary>'
        +doneRows+'</details>':'')
      +'</div>';

    /* ===== v1.5 人 声 · 角 色 音 色 ===== */
    h+='<div class="card"><div class="tagline">人 声 · 角 色 音 色</div>'
      +'<div class="mini">'+esc((sg.voicePack&&sg.voicePack.honest)||'')+'</div>'
      +'<div class="mini" style="margin-top:6px">'+esc((sg.voicePack&&sg.voicePack.notDubbing)||'')
      +'</div>'
      +'<div class="mini" style="margin-top:6px">本机可用语音 '+vpack.total+' 个，'
      +'其中中文 '+vpack.zh+' 个，'+(vpack.guide?'已挑到偏明亮的音色':'未挑到偏明亮音色，回退默认中文语音')
      +'。朗读开关仍默认关闭；只有点气泡框的「念」或说「念这句」才会出声。</div>'
      +'<div class="switchrow"><span>试一句角色台词</span><div class="viewsel">'
        +'<button data-guide="say">念这句</button></div></div>'
      +'<div class="switchrow"><span>合成语气音</span><div class="viewsel">'
        +'<button data-guide="cue" data-kind="curious">好奇</button>'
        +'<button data-guide="cue" data-kind="happy">欢喜</button>'
        +'<button data-guide="cue" data-kind="hesitate">迟疑</button></div></div>'
      +'<div class="mini" style="color:var(--dim)">语气音不含字词、不是配音；'
      +'真要离线人声包得内嵌音频文件，体积与跨设备音色都不可控，本版不做。</div></div>';

    /* ===== v1.2 声 与 色 ===== */
    const AU2=AU(),st=AU2?AU2.status():{on:false,volume:0.45,scale:'auto',bed:'auto',score:'auto',available:false},
      SL=(AU2&&AU2.scales)||[],SC=(AU2&&AU2.scores)||[],BD=(AU2&&AU2.beds)||[];
    h+='<div class="card"><div class="tagline">声 与 色 · '
      +W.art.icon('brush',14,'var(--gold)')+W.art.icon('note',14,'var(--gold)')+'</div>'
      +'<div class="mini">插画是离线 SVG 几何装饰，声音是浏览器实时合成；'
      +'都不加载外部图片或音频文件，不联网，也不写进存档与分享串。</div>'
      +'<div class="hr"></div><div class="tagline">音 乐 · 两 路 独 立</div>'
      +'<div class="mini">音效是落笔、判读、汇流等短音；背景音是底噪与缓慢曲目。'
      +'两者可分别开关，互不影响；「全部静音」一次关掉两路。</div>'
      +'<div class="switchrow"><span>音效</span><div class="viewsel">'
        +'<button data-snd="sfx-on" class="'+(st.sfx?'on':'')+'">开</button>'
        +'<button data-snd="sfx-off" class="'+(!st.sfx?'on':'')+'">关</button>'
        +'<button data-snd="try">试听</button></div></div>'
      +'<div class="switchrow"><span>背景音</span><div class="viewsel">'
        +'<button data-snd="bgm-on" class="'+(st.bgm?'on':'')+'">开</button>'
        +'<button data-snd="bgm-off" class="'+(!st.bgm?'on':'')+'">关</button>'
        +'<button data-snd="auto">按本局配乐</button></div></div>'
      +'<div class="viewsel" style="margin-top:8px">'
        +'<button data-snd="off">全部静音</button>'
        +'<button data-snd="on">全部开启</button></div>'
      +'<div class="mini" style="margin-top:6px">当前：音效 '+(st.sfx?'开':'关')
      +' / 背景音 '+(st.bgm?'开':'关')+' · '
      +(st.available?'浏览器支持合成':'此浏览器无合成接口，自动静音')
      +' · '+esc(st.scaleName||'自动调式')+' / '+esc(st.scoreName||'自动曲目')
      +' / '+esc(st.bedName||'无底噪')+'</div>'
      +'<div class="viewsel" style="margin-top:8px"><span class="mini">音量</span>'
      +[['轻',0.25],['中',0.45],['响',0.7]].map(x=>'<button data-vol="'+x[1]
        +'" class="'+(Math.abs(st.volume-x[1])<0.01?'on':'')+'">'+x[0]+'</button>').join('')+'</div>'
      +'<div class="selgrid">'
      +'<label>调式<select data-snd-sel="scale">'
        +'<option value="auto"'+(st.scale==='auto'?' selected':'')+'>自动（随文明圈与时代）</option>'
        +SL.map(x=>'<option value="'+x.key+'"'+(st.scale===x.key?' selected':'')
          +'>'+esc(x.name)+'</option>').join('')+'</select></label>'
      +'<label>曲目<select data-snd-sel="score">'
        +'<option value="auto"'+(st.score==='auto'?' selected':'')+'>自动</option>'
        +SC.map(x=>'<option value="'+x.key+'"'+(st.score===x.key?' selected':'')
          +'>'+esc(x.name)+'</option>').join('')+'</select></label>'
      +'<label>底噪<select data-snd-sel="bed">'
        +'<option value="auto"'+(st.bed==='auto'?' selected':'')+'>自动</option>'
        +BD.map(x=>'<option value="'+x.key+'"'+(st.bed===x.key?' selected':'')
          +'>'+esc(x.name)+'</option>').join('')+'</select></label>'
      +'</div>'
      +'<div class="mini" style="margin-top:6px">'+esc((D.music.meta||{}).discipline||'')
      +'</div><div class="mini" style="color:var(--dim)">'+esc(AU2?AU2.disclaimer:'')+'</div>'
      +'<div class="hr"></div><div class="tagline">美 术</div>'
      +'<div class="viewsel"><button data-art="1" class="'+(ARTON?'on':'')+'">显示插画</button>'
      +'<button data-art="0" class="'+(!ARTON?'on':'')+'">纯文字</button></div>'
      +'<div class="mini" style="margin-top:6px">主屏改由「舞 台」负责视觉；'
      +'这里的程序化插画用于其他页签与纯文字之外的氛围，两者互不联网。</div>'
      +'<div class="mini" style="margin-top:6px">时代色板 '+W.art.eras.length
      +' 套 · 几何纹样 '+W.art.motifs.length+' 种 · 场景 '+Object.keys(W.art.scenes).length
      +' 类；同一参数必得同一张图，切卷与换时代自动换色换纹。</div>'
      +'<div class="mini" style="color:var(--dim)">'+esc(W.art.note)+'</div>'
      +'<div class="mini" style="color:var(--dim)">'+esc(W.art.paletteNote)+'</div>'
      +'<div class="mini" style="color:var(--gold)">'
      +esc((D.art.meta||{}).method||'')+'</div></div>';

    /* ===== v1.3 朗读 · 语音控制 · 读屏友好 ===== */
    const AX=W.a11y,ax=AX?AX.status():{read:false,autoRead:false,voice:false,rate:1,
      verbosity:'normal',tts:false,voiceApi:false,listening:false};
    const axOn=(k,v)=>'<button data-a11y="'+k+'" class="'+(v?'on':'')+'">'+(v?'开':'关')+'</button>';
    h+='<div class="card"><div class="tagline">朗 读 · 语 音 · 读 屏 友 好</div>'
      +'<div class="mini">用浏览器原生接口实现，不联网、不上传语音、不写存档。'
      +'朗读把当前页与全部选项念出来；语音控制只在你主动开启后才使用麦克风。</div>'
      +'<div class="switchrow"><span>朗读功能</span><div class="viewsel">'
        +axOn('read-on',ax.read)+axOn('read-off',!ax.read)
        +'<button data-a11y="try">试读本页</button>'
        +'<button data-a11y="stop">停读</button></div></div>'
      +'<div class="switchrow"><span>自动朗读新一笔</span><div class="viewsel">'
        +axOn('auto-on',ax.autoRead)+axOn('auto-off',!ax.autoRead)+'</div></div>'
      +'<div class="switchrow"><span>语速</span><div class="viewsel">'
        +[['慢',0.85],['中',1],['快',1.25]].map(x=>'<button data-rate="'+x[1]
          +'" class="'+(Math.abs(ax.rate-x[1])<0.01?'on':'')+'">'+x[0]+'</button>').join('')
        +'</div></div>'
      +'<div class="switchrow"><span>详略</span><div class="viewsel">'
        +'<button data-verb="brief" class="'+(ax.verbosity==='brief'?'on':'')+'">简</button>'
        +'<button data-verb="normal" class="'+(ax.verbosity==='normal'?'on':'')+'">全</button>'
        +'</div></div>'
      +'<div class="hr"></div><div class="tagline">语 音 控 制</div>'
      +'<div class="switchrow"><span>麦克风听令</span><div class="viewsel">'
        +axOn('voice-on',ax.voice)+axOn('voice-off',!ax.voice)+'</div></div>'
      +'<div class="mini" style="margin-top:6px">可用性：朗读接口 '
        +(ax.tts?'可用':'不可用')+' · 语音识别接口 '+(ax.voiceApi?'可用':'不可用')
      +(ax.voiceApi?'':'（本地文件或此浏览器不提供，键盘操作始终可用）')
      +' · 当前'+(ax.listening?'正在听':'未开启')+'</div>'
      +'<div class="mini" style="margin-top:6px;color:var(--gold)">可以说：'
      +esc(AX?AX.commands:'')+'</div>'
      +'<div class="mini" style="margin-top:4px">键盘：'+esc(AX?AX.keys:'')+'</div>'
      +'<div class="mini" style="margin-top:6px">读屏说明：插画已标为纯装饰自动跳过；'
      +'页签、选项与按钮都有文字标签；操作结果会写入实时播报区。</div>'
      +'<div class="mini" style="color:var(--dim)">'+esc(AX?AX.privacy:'')+'</div>'
      +'<div class="mini" style="color:var(--dim)">'+esc(AX?AX.disclaimer:'')+'</div></div>';

    h+='<div class="card"><div class="tagline">这 一 局</div><div class="mini">'
      +(S.mode==='sim'?'起点：公元前 5000 年的 '+R.n+'。'
        :S.mode==='real'?'起点：'+E.fmtYear(S.entity?W.real.entityById(S.entity.id).startYear:-5000)+' '+D.regions[S.reg].n+'，代入一个真实实体。'
        :'起点：'+E.fmtYear(D.succession.chains[S.chainState.region].from)+'，朝代长河连走 '
          +D.succession.chains[S.chainState.region].entities.length+' 朝。')+'<br>'
      +'每 '+E.volLen()+' 笔为一卷，卷末汇流并可收卷；'
      +(S.mode==='succession'?'每朝一卷，卷末出更迭卡，链尾为长河终章。'
        :'达成血脉／编年／立例／文脉／散族任一条件即出终章。')+'<br>'
      +'文明条目 '+D.civilization.items.length+' 条 / '+D.civilization.dimensions.length+' 维，'
      +'出处 '+Object.keys(D.civSources).length+' 条，考据史事 '+D.history.events.length+' 条。<br>'
      +'史实、约略年代、断代争议、传说追述分层标注；推演抉择不改写史实。<br>'
      +'帝王全册 '+D.rulers.rulers.length+' 位 / 世家全册 '+D.houses.houses.length
      +' 家（可代入 '+D.house_entities.entities.length+' 家），本局已见在位君主 '
      +Object.keys(S.seenRuler||{}).length+' 位、同期名族 '+Object.keys(S.seenHouse||{}).length+' 家。<br>'
      +'文件版本 '+esc(VER())+'　·　本档起于 '+(S.ver?'v'+esc(S.ver):'旧档（已补当前版本）')
      +'　·　'+esc((D.version||{}).scheme||'')+'</div>'
      +'<button class="big alt" data-act="restart">另 起 一 局</button></div></div>';

    app.innerHTML=h;if(ROT90)rotChrome();applyHint();
    /* v2.6：横屏每次重绘都确认退出条还在；横屏键本身也一直是高亮 toggle，双保险。 */
    if(LANDSCAPE)showLandHint();
    /* v2.1：重绘后按 SAYING 重新贴一次按钮状态；
       念完由 400ms 定时器统一复位，重绘不擅自改状态 */
    scheduleIdle();
    if(SAYING){
      const ax=W.a11y;
      /* 只在确实没在播报时复位；念到一半切页签，按钮仍保持「停」 */
      if(ax&&ax.status&&!ax.status().speaking)SAYING=0;
      syncSayBtn();
    }
    const tabs=$('tabs');
    const TS=[['main','推演'],['log','编年'],['fam','族谱'],['sea','史海'],['civ','文明'],['geo','舆地'],['vol','卷轴'],['set','设置']];
    tabs.innerHTML=TS.map(t=>'<button role="tab" aria-selected="'+(TAB===t[0]?'true':'false')
      +'" data-t="'+t[0]+'" class="'+(TAB===t[0]?'on':'')+'">'+t[1]+'</button>').join('');
    tabs.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{
      TAB=b.dataset.t;
      if(W.tutorial){W.tutorial.noteTab(E.state(),TAB);E.save();}
      render();window.scrollTo(0,0);
    }));
    app.querySelectorAll('[data-i]').forEach(b=>b.addEventListener('click',()=>{
      const t=(b.textContent||'');
      /* 判读题三档走各自的短音，其余按「落笔」 */
      if(t.indexOf('分层存疑')>=0)cue('quizOk');
      else if(t.indexOf('按通行')>=0||t.indexOf('按通说')>=0)cue('quizMid');
      else if(t.indexOf('常见误解')>=0||t.indexOf('直取')>=0)cue('quizBad');
      else cue('choose');
      E.choose(+b.dataset.i);render();
    }));
    /* 第五轮：姓氏 1295 条 + 题库 264 道，大列表放 template 里按需载入，
       避免每次 render 都把上千行插进可见 DOM。检索时先全量载入再筛。
       优化轮：记住展开过的组，切页签／重渲染后自动恢复，不再「点开又合上」。 */
    const fillLazy=d=>{
      const body=d.querySelector('.lazy-body'),tpl=d.querySelector('template[data-lz-tpl]');
      if(body&&tpl&&!body.dataset.filled){body.innerHTML=tpl.innerHTML;body.dataset.filled='1';}
    };
    const lazyEls=Array.prototype.slice.call(app.querySelectorAll('details[data-lz]'));
    lazyEls.forEach(d=>{
      const k=d.dataset.lz;
      if(LAZYOPEN.has(k)){d.open=true;fillLazy(d);}
      d.addEventListener('toggle',function(){
        if(d.open){LAZYOPEN.add(k);fillLazy(d);}else LAZYOPEN.delete(k);
      });
    });
    /* 亲属关系图：点节点看称谓、高亮相关边；＋／－／复位改 viewBox 缩放 */
    const kinSvg=document.getElementById('kinGraph');
    if(kinSvg&&W.kinship){
      const GH0=+(kinSvg.dataset.gh||200);
      const applyZoom=()=>{
        const H=GH0;
        kinSvg.setAttribute('viewBox',
          (180-180/KINZ)+' '+(H/2-H/2/KINZ)+' '+(360/KINZ)+' '+(H/KINZ));
      };
      app.querySelectorAll('[data-kinzoom]').forEach(b=>b.addEventListener('click',()=>{
        const z=b.dataset.kinzoom;
        KINZ=z==='0'?1:Math.max(.6,Math.min(2.6,KINZ+(z==='+'?.25:-.25)));
        applyZoom();
      }));
      kinSvg.querySelectorAll('.kgn').forEach(g=>g.addEventListener('click',()=>{
        const id=g.dataset.id,St=E.state();
        kinSvg.querySelectorAll('.kgn').forEach(x=>x.classList.toggle('dim',x.dataset.id!==id));
        kinSvg.querySelectorAll('.kge').forEach(l=>l.classList.toggle('on',
          l.dataset.a===id||l.dataset.b===id));
        const p=(St.fam||[]).find(x=>x.id===id);
        const box=document.getElementById('kinPick');
        if(!p||!box)return;
        const rel=W.kinship.relationsOf(St,p).filter(r=>r.who&&r.who!==p.id);
        box.innerHTML='<b>'+esc(p.name)+'</b>（第 '+p.gen+' 代 · '
          +(p.gender==='female'?'女':p.gender==='male'?'男':'未记')+'）　'
          +rel.length+' 条称谓<br>'+(rel.length?rel.map(r=>esc(r.term)+'·'+esc(r.whoName)).join('　')
            :'尚无可从在册关系链推出的称谓。');
      }));
    }
    const fillAll=()=>lazyEls.forEach(d=>{d.open=true;fillLazy(d);});
    /* v1.0 帝王在位时间条：切换政权重画，＋／－ 只改 SVG 显示宽度，横向可滚动 */
    const tlSel=document.getElementById('dyTlPolity'),tlWrap=document.getElementById('dyTlWrap');
    const tlResize=z=>{const g=document.getElementById('dyTlSvg');
      if(g)g.style.width=(760*z)+'px';};
    if(tlSel&&tlWrap){
      tlSel.addEventListener('change',()=>{
        TLZ=1;tlWrap.innerHTML=dyTimelineSVG(tlSel.value);tlResize(1);
      });
      app.querySelectorAll('[data-dytl]').forEach(b=>b.addEventListener('click',()=>{
        const a=b.dataset.dytl;
        TLZ=a==='reset'?1:Math.max(0.6,Math.min(4,TLZ+(a==='in'?0.25:-0.25)));
        tlResize(TLZ);
      }));
    }
    const ppIn=document.getElementById('ppSearch');
    if(ppIn)ppIn.addEventListener('input',()=>{
      const q=ppIn.value.trim();
      if(q)fillAll();
      /* 清空检索：收起全部组；已载入内容留在 body 里，下次点开不用重拼 */
      else lazyEls.forEach(d=>{d.open=false;LAZYOPEN.delete(d.dataset.lz);});
      /* 优化轮：1295 条姓氏全量匹配时一次显示上千行，手机既卡又没法看。
         只露前 60 条，写明总数；条目一条没删，清空检索仍可逐组翻。 */
      const MAXSHOW=60;let shown=0,total=0;
      document.querySelectorAll('#ppList .pp-row, #dyList .dy-row').forEach(r=>{
        const hit=!q||r.textContent.indexOf(q)>=0;
        if(hit)total++;
        const show=hit&&(!q||shown<MAXSHOW);
        if(show)shown++;
        r.style.display=show?'':'none';
      });
      document.querySelectorAll('#ppList .pp-group').forEach(g=>{
        if(q)g.open=true;
        const vis=Array.prototype.some.call(g.querySelectorAll('.pp-row'),
          r=>r.style.display!=='none');
        g.style.display=vis?'':'none';
      });
      const cnt=document.getElementById('ppCount');
      if(cnt)cnt.textContent=q?('匹配 '+total+' 条 · 显示前 '+shown+' 条'
        +(total>shown?'（换个关键词可继续筛；全部条目仍在各组中）':'')):'';
    });
    /* 教程卡与「？ 指引」按钮 */
    app.querySelectorAll('[data-tut]').forEach(b=>b.addEventListener('click',()=>{
      const S2=E.state(),T=W.tutorial,a=b.dataset.tut;
      if(a==='next'){
        const st=T.step(S2);
        if(st&&(st.gate==='ack'||T.progress(S2).idx===T.STEPS.length))T.ack(S2);
        T.next(S2);
      }else if(a==='prev')T.prev(S2);
      else if(a==='skip')T.skip(S2);
      else if(a==='reopen'){T.reopen(S2);TAB='main';}
      else if(a==='on')T.reopen(S2);
      else if(a==='off')T.setOn(S2,false);
      E.save();render();
    }));
    app.querySelectorAll('[data-help]').forEach(b=>b.addEventListener('click',()=>{
      W.tutorial.reopen(E.state());E.save();TAB='main';render();window.scrollTo(0,0);
    }));
    app.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>{E.setView(b.dataset.view);render();}));
    app.querySelectorAll('[data-dim]').forEach(b=>b.addEventListener('click',()=>{CIVF=b.dataset.dim;CIVEXP=false;render();}));
    app.querySelectorAll('[data-exp]').forEach(b=>b.addEventListener('click',()=>{CIVEXP=!CIVEXP;render();}));
    app.querySelectorAll('[data-slot]').forEach(b=>b.addEventListener('click',()=>{if(E.useSlot(+b.dataset.slot)){TAB='main';render();}}));
    app.querySelectorAll('[data-save]').forEach(b=>b.addEventListener('click',()=>{E.saveSlot(+b.dataset.save);render();}));
    app.querySelectorAll('[data-del]').forEach(b=>b.addEventListener('click',()=>{E.delSlot(+b.dataset.del);render();}));
    app.querySelectorAll('[data-live-tier]').forEach(b=>b.addEventListener('click',()=>{E.configure({reality:b.dataset.liveTier});render();}));
    app.querySelectorAll('[data-live-mode]').forEach(b=>b.addEventListener('click',()=>{E.configure({modeKey:b.dataset.liveMode});render();}));
    app.querySelectorAll('[data-live-len]').forEach(b=>b.addEventListener('click',()=>{E.configure({lengthKey:b.dataset.liveLen});render();}));
    app.querySelectorAll('[data-live-dens]').forEach(b=>b.addEventListener('click',()=>{E.configure({density:+b.dataset.liveDens});render();}));
    app.querySelectorAll('[data-fs]').forEach(b=>b.addEventListener('click',()=>{FS=+b.dataset.fs;applyDisplay();render();}));
    app.querySelectorAll('[data-hc]').forEach(b=>b.addEventListener('click',()=>{HC=+b.dataset.hc;applyDisplay();render();}));
    /* v1.2 声与色：按钮 + 三个下拉；改设置只重绘本页，不动游戏状态 */
    if(W.stage&&ARTON)W.stage.audioWeather(null);
    app.querySelectorAll('[data-snd]').forEach(b=>b.addEventListener('click',()=>{
      const a=b.dataset.snd,au=AU();if(!au)return;
      if(a==='toggle'){au.toggle();cue('tap');}
      else if(a==='on'){au.set('on',true);cue('tap');}
      else if(a==='off'){au.set('on',false);}
      else if(a==='sfx'){au.set('sfx',!au.status().sfx);cue('tap');}
      else if(a==='bgm'){au.set('bgm',!au.status().bgm);cue('tap');}
      else if(a==='sfx-on'){au.set('sfx',true);cue('tap');}
      else if(a==='sfx-off'){au.set('sfx',false);}
      else if(a==='bgm-on'){au.set('bgm',true);cue('tap');}
      else if(a==='bgm-off'){au.set('bgm',false);}
      else if(a==='try'){au.set('sfx',true);cue('gather');}
      else if(a==='auto'){
        const z=au.autoFor(S.reg,E.eraIdx(S.year));
        au.set('score',z.score);au.set('scale',z.scale);au.set('bed',z.bed);
        au.set('bgm',true);cue('study');
      }
      render();
    }));
    /* v1.3 朗读与语音：只改本机辅助设置，不碰游戏状态 */
    app.querySelectorAll('[data-read]').forEach(b=>b.addEventListener('click',()=>{
      const ax=W.a11y;if(!ax)return;
      const st=ax.status();
      if(st.read||st.speaking){
        ax.stopSpeak();ax.set('read',false);ax.set('autoRead',false);
        if(ax.announce)ax.announce('已停止朗读');
      }else{ax.set('read',true);ax.readScreen();}
      render();
    }));
    app.querySelectorAll('[data-a11y]').forEach(b=>b.addEventListener('click',()=>{
      const ax=W.a11y,k=b.dataset.a11y;if(!ax)return;
      if(k==='read-on')ax.set('read',true);
      else if(k==='read-off')ax.set('read',false);
      else if(k==='auto-on')ax.set('autoRead',true);
      else if(k==='auto-off')ax.set('autoRead',false);
      else if(k==='voice-on')ax.set('voice',true);
      else if(k==='voice-off')ax.set('voice',false);
      else if(k==='try'){if(!ax.status().read)ax.set('read',true);ax.readScreen();}
      else if(k==='stop')ax.stopSpeak();
      render();
    }));
    app.querySelectorAll('[data-rate]').forEach(b=>b.addEventListener('click',()=>{
      if(W.a11y)W.a11y.set('rate',+b.dataset.rate);render();
    }));
    app.querySelectorAll('[data-verb]').forEach(b=>b.addEventListener('click',()=>{
      if(W.a11y)W.a11y.set('verbosity',b.dataset.verb);render();
    }));
    app.querySelectorAll('[data-vol]').forEach(b=>b.addEventListener('click',()=>{
      if(AU())AU().set('volume',+b.dataset.vol);cue('tap');render();
    }));
    app.querySelectorAll('[data-snd-sel]').forEach(el=>el.addEventListener('change',()=>{
      if(AU())AU().set(el.dataset.sndSel,el.value);cue('tap');render();
    }));
    app.querySelectorAll('[data-art]').forEach(b=>b.addEventListener('click',()=>{
      ARTON=+b.dataset.art;cue('tap');render();
    }));
    /* v1.4 舞台与气泡：只改本机显示设置，不动游戏状态 */
    app.querySelectorAll('[data-stage]').forEach(b=>b.addEventListener('click',()=>{
      const on=+b.dataset.stage;
      if(W.stage)W.stage.set('stage',on);
      if(on)TAB='main';   /* 点「显示」立刻回到主屏看得到，不在设置页空等 */
      cue('tap');render();
    }));
    app.querySelectorAll('[data-bubble]').forEach(b=>b.addEventListener('click',()=>{
      if(W.stage)W.stage.set('bubble',+b.dataset.bubble);cue('tap');render();
    }));
    /* 五层可缩放历史舆图：每次渲染重建 canvas，重新挂载 */
    const AT=W.atlas,acv=document.getElementById('atlasCanvas');
    if(acv&&AT){
      AT.mount(acv,{year:S.year,layers:ATL,
        family:{dist:E.famDistribution(S),migrations:E.famMigrations()},
        onPick:function(p){
          const box=document.getElementById('atlasPick');if(!box)return;
          const kind={city:'城址锚点（现代经纬度近似）',unit:'地理单元（近似中心点）',
            family:'本局家族据点（推演）',climate:'气候影响区示意（非实测边界）'}[p?p.type:'']||'点位';
          let html=p?'<b>'+esc(p.name)+'</b>　'+esc(p.detail)
            +'<div class="mini">'+p.lat.toFixed(2)+'°, '+p.lon.toFixed(2)+'° · '+kind+'</div>'
            :'点一下地图上的点位，可查看该地说明。';
          /* 点中地理单元且地方志层开启 → 展开该单元的全部本地史锚点 */
          if(p&&p.type==='unit'&&p.localOn&&p.id){
            const ls=D.localities.items.filter(function(x){return x.geoId===p.id;});
            if(ls.length){
              html+='<div class="hr"></div><div class="tagline">本 地 方 志 · '+ls.length+' 条</div>';
              html+=ls.map(function(x){
                return '<div class="row"><span class="y">'+esc(x.rawYear)+'</span><b>'+esc(x.title)+'</b>'
                  +'<span class="s">'+esc(x.category)+'</span>'
                  +'<div class="mini">'+esc(x.summary)+'</div>'
                  +'<div class="mini" style="color:var(--gold)">'+esc(x.boundary)+'</div>'
                  +(x.consensus==='date_contested'?'<div class="mini">断代有争议</div>':'')+'</div>';
              }).join('');
              html+='<div class="mini" style="color:var(--dim)">'+esc(D.localities.meta.boundary)+'</div>';
            }
          }
          box.innerHTML=html;
        },
        onList:function(o){
          const box=document.getElementById('atlasList');if(!box)return;
          let t='';
          /* 1 政权 */
          if(o.layers.polity){
            t+='<div class="tagline">政 权 · '+E.fmtYear(o.year)+' · '+o.polities.length+' 个并立</div>';
            t+='<div class="mini">并立政权同时显示，不排成前后相续单线；虚线仅示核心区，不是国界。</div>';
            t+=o.polities.length?o.polities.map(function(p){
              return '<div class="row"><b>'+esc(p.name)+'</b> <span class="s">'
                +E.fmtShort(p.from)+' — '+E.fmtShort(p.to)+'</span>'
                +'<div class="mini">'+esc(p.note)+'</div></div>';
            }).join(''):'<div class="mini">该年份本图未收录示意政权。</div>';
          }
          /* 2 气候 */
          if(o.layers.climate){
            t+='<div class="hr"></div><div class="tagline">气 候 · 同期 '+o.climate.length+' 条'
              +'（全球性 '+o.climateGlobal+' 条）</div>';
            t+='<div class="mini">'+esc(D.layers.meta.climateNote)+'</div>';
            t+=o.climate.length?o.climate.slice(0,6).map(function(c){
              return '<div class="row"><span class="y">'+esc(c.rawYear)+'</span><b>'+esc(c.title)+'</b>'
                +'<span class="s">'+esc(c.category)+'</span>'
                +'<div class="mini">'+esc(c.summary.slice(0,58))+'…</div>'
                +'<div class="mini" style="color:var(--red2)">'+esc(c.caveat)+'</div></div>';
            }).join(''):'<div class="mini">该年份无标注气候事件。</div>';
            if(o.climate.length>6)t+='<div class="mini">…另有 '+(o.climate.length-6)+' 条，见下方气候编年。</div>';
          }
          /* 3 人口热力 */
          if(o.layers.pop){
            t+='<div class="hr"></div><div class="tagline">人 口 重 心 · '+esc(o.popEra)+'</div>';
            t+='<div class="mini">'+esc(D.layers.meta.populationNote)+'</div>';
            t+='<div class="mini" style="margin-top:4px">相对权重较高的地理单元：'
              +o.popTop.map(function(p){return esc(p.name)+' '+Math.round(p.w*100)+'%';}).join('　')
              +'（百分比只是示意权重，不是人口占比）</div>';
          }
          /* 4 家族分布 */
          if(o.layers.family){
            t+='<div class="hr"></div><div class="tagline">本 局 家 族 分 布 · '+o.family.length+' 处</div>';
            t+='<div class="mini">'+esc(D.layers.meta.familyNote)+'</div>';
            t+=o.family.length?o.family.map(function(d){
              return '<div class="row"><b>'+esc(d.name)+'</b> <span class="s">'+d.count+' 人'
                +(d.ruler?' · 当家在此':'')+'</span></div>';
            }).join(''):'<div class="mini">族中暂无在籍落脚点。</div>';
            if(o.migrations.length)t+='<div class="mini" style="margin-top:6px;color:var(--gold)">迁徙足迹：'
              +o.migrations.slice(-4).map(function(m){
                return E.fmtShort(m.y)+' '+esc(m.fromName)+' → '+esc(m.toName)+'（'+m.count+' 人）';
              }).join('　')+'</div>';
          }
          /* 5 地方志：本圈 + 全球性，按当前年份窗口筛选，不作边界主张 */
          if(o.layers.local){
            const LS=D.localities.items.filter(function(x){
              return (x.region===S.reg||x.region==='*')&&o.year>=x.y0-120&&o.year<=x.y1+120;
            }).sort(function(a,b){return a.y0-b.y0;});
            t+='<div class="hr"></div><div class="tagline">地 方 志 · '+E.fmtYear(o.year)
              +' 前后可见 '+LS.length+' 条（全册 '+D.localities.items.length+' 条 / '+new Set(D.localities.items.map(function(v){return v.geoId;})).size+' 地 · 每地 6 类）</div>';
            t+='<div class="mini">'+esc(D.localities.meta.boundary)+'</div>';
            t+=LS.length?LS.slice(0,10).map(function(x){
              const u=D.atlas.units.find(function(v){return v.id===x.geoId;});
              return '<div class="row"><span class="y">'+esc(x.rawYear)+'</span><b>'+esc(x.title)+'</b>'
                +'<span class="s">'+esc(u?u.name:x.geoId)+' · '+esc(x.category)+'</span>'
                +'<div class="mini">'+esc(x.summary.slice(0,54))+'…</div></div>';
            }).join(''):'<div class="mini">该年份窗口内暂无已收录的本圈地方史锚点，拖动年份滑杆再试。</div>';
            if(LS.length>10)t+='<div class="mini">…另有 '+(LS.length-10)+' 条，点地图上的单元圆点可看该地全部六类。</div>';
            t+='<div class="mini" style="margin-top:4px;color:var(--dim)">'
              +esc(D.localities.meta.density)+'</div>';
          }
          if(o.routes.length)t+='<div class="mini" style="margin-top:6px;color:var(--gold)">同期航线：'
            +o.routes.map(function(r){return esc(r.name);}).join('、')+'（简化示意，非精确航迹）</div>';
          box.innerHTML=t;
        }});
      const yr=document.getElementById('atlasYear');
      if(yr)yr.addEventListener('input',function(){
        const v=+yr.value;AT.setYear(v,false);
        const lb=document.getElementById('atlasYearLabel');if(lb)lb.textContent=E.fmtYear(v);
      });
    }
    app.querySelectorAll('[data-layer]').forEach(b=>b.addEventListener('click',function(){
      if(!AT)return;
      const k=b.dataset.layer;
      ATL[k]=!ATL[k];
      AT.setLayers(ATL);
      const names={polity:'政权',climate:'气候',pop:'人口热力',family:'家族',local:'地方志'};
      b.className=ATL[k]?'on':'';
      b.textContent=(ATL[k]?'✓ ':'＋ ')+names[k];
    }));
    app.querySelectorAll('[data-atlas]').forEach(b=>b.addEventListener('click',function(){
      if(!AT)return;
      const a=b.dataset.atlas;
      if(a==='in')AT.zoom(1.35);
      else if(a==='out')AT.zoom(1/1.35);
      else if(a==='reset')AT.reset();
      else if(a==='follow'){
        AT.followGame();
        const y2=document.getElementById('atlasYear'),lb=document.getElementById('atlasYearLabel');
        if(y2)y2.value=Math.max(-3100,Math.min(2026,AT.getYear()));
        if(lb)lb.textContent=E.fmtYear(AT.getYear());
      }
    }));
    app.querySelectorAll('[data-act]').forEach(b=>b.addEventListener('click',()=>{
      const a=b.dataset.act;
      const CUE={next:'tap',contvol:'gather',epilogue:'ending',nextdyn:'turnover',
        'scroll-final':'ending',scroll:'ending','realend-cont':'turnover',
        backscroll:'tap',restart:'tap'};
      cue(CUE[a]||'tap');
      if(a==='next')E.step();
      else if(a==='contvol')E.continueVolume();
      else if(a==='epilogue')E.epilogue();
      else if(a==='realend-cont')E.realEndContinue();
      else if(a==='nextdyn')E.nextDynasty();
      else if(a==='scroll'){E.openScroll(false);TAB='main';}
      else if(a==='scroll-final'){E.openScroll(true);TAB='main';}
      else if(a==='backscroll')E.backFromScroll();
      else if(a==='restart'){E.restart();TAB='main';}
      else if(a==='exportall')download('wqn-saves.json',E.exportAll(),'application/json');
      else if(a==='importall')pickFile(txt=>{if(E.importAll(txt)){TAB='main';render();}else alert('存档格式不对，或不是本游戏导出的文件。');});
      else if(a==='copyshare')copyText(E.shareString());
      else if(a==='replay'){
        const s=window.prompt('粘贴分享串（WQN1. 开头），生成同种子对照局：','');
        if(s){const g=E.replay(s.trim());if(!g)alert('分享串无法解析。');render();}
      }
      else if(a==='clearghost'){E.clearGhost();render();}
      else if(a==='exportpng')exportScrollPNG(E.state());
      render();
    }));
    if(W.a11y){W.a11y.mount();W.a11y.onRender(S);}
    if(W.stage&&ARTON&&TAB==='main')W.stage.audioWeather(S);
    applyDisplay();
  }
  /* v2.4：横屏统一入口。布局一定生效；系统旋转只是尽力尝试，失败如实说。 */
  function showLandHint(){
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
  }
  function hideLandHint(){
    const el=document.getElementById('landHint');
    if(el&&el.parentNode)el.parentNode.removeChild(el);
  }
  function applyLandscape(on,manual){
    if(manual)LAND_MANUAL=1;
    LANDSCAPE=on?1:0;
    LAST_TALL=(window.innerWidth||0)<(window.innerHeight||0)?1:0;
    ROT90=wantRot90();
    if(ROT90)rotChrome();else unrotChrome();
    applySplit();applyHint();
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
  }
  /* 手机真的横过来时自动适配，不覆盖用户手动关掉的布局 */
  function watchOrientation(){
    /* v2.6：不再自动替用户开/关横屏（那也会造成「我没点怎么变了」的困惑）。
       只在横屏已开启时，按物理方向重算是否还需要旋转画布：
       手机真横过来 → 去掉 rot90，用原生横向布局；转回竖屏 → 重新旋成横向。 */
    const onChange=()=>{
      if(!LANDSCAPE)return;
      /* 先记下当前高矮关系；iOS 地址栏变化不越界，直接忽略 */
      if(!tallFlipped())return;
      const want=wantRot90();
      if(want!==ROT90){ROT90=want;if(ROT90)rotChrome();else unrotChrome();
        applyHint();applyDisplay();syncLandBtn();
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
  }
  function applyDisplay(){
    if(typeof document==='undefined')return;
    const r=document.documentElement;
    r.style.setProperty('--fs',FS===0?'1':FS===1?'1.12':'1.25');
    r.classList.toggle('hc',HC===1);
    r.classList.toggle('landscape',LANDSCAPE===1);
    r.classList.toggle('rot90',ROT90===1);
    r.classList.toggle('bgfull',STSIZE==='immersive');
    if(W.stage){
      W.stage.set('size',STSIZE);
      try{const u=W.stage.bgURL&&W.stage.bgURL();
        if(u)r.style.setProperty('--stage-bg','url("'+u+'")');}catch(e){}
    }
    r.classList.toggle('bub-light',BUB==='light');
    r.classList.toggle('bub-veil',BUB==='veil');
    r.classList.toggle('bub-normal',BUB==='normal');
    r.classList.toggle('bub-solid',BUB==='solid');
    r.classList.toggle('minimal',minimalActive());
    r.classList.toggle('skin-auto',SKIN==='auto');
    r.classList.toggle('skin-light',SKIN==='light');
    r.classList.toggle('skin-dark',SKIN==='dark');
    r.setAttribute('data-skin',SKIN);
    r.style.setProperty('--char-dx',CHAROFF.x+'px');
    r.style.setProperty('--char-dy',CHAROFF.y+'px');
    r.style.setProperty('--veil',(VEIL/100).toFixed(2));
    bubApply();
    r.classList.toggle('avg',avgActive());
    applySetCards();
    applyMinimal();
    applyAvg();
    applyStageVisual();
    /* v2.0：沉浸全屏铺的底图始终是当前选中场景，不残留旧板 */
    try{if(W.stage&&W.stage.bgURL){
      const u=W.stage.bgURL();if(u)r.style.setProperty('--stage-bg','url("'+u+'")');}}catch(e){}
  }
  function download(name,text,mime){
    try{
      const blob=new Blob([text],{type:mime||'text/plain;charset=utf-8'});
      const a=document.createElement('a');a.href=URL.createObjectURL(blob);
      a.download=name;document.body.appendChild(a);a.click();
      setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},600);
    }catch(e){alert('浏览器不支持下载，可改用「复制分享串」。');}
  }
  function pickFile(cb){
    const i=document.createElement('input');i.type='file';i.accept='.json,application/json';
    i.onchange=()=>{const f=i.files&&i.files[0];if(!f)return;
      const r=new FileReader();r.onload=()=>cb(String(r.result));r.readAsText(f,'utf-8');};
    i.click();
  }
  function copyText(t){
    try{
      if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(t);}
      else{const ta=document.createElement('textarea');ta.value=t;document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();}
      alert('分享串已复制。');
    }catch(e){window.prompt('手动复制分享串：',t);}
  }
  /* 收卷长图：canvas 逐行排版，离线生成 PNG */
  function exportScrollPNG(S){
    const d=WV.scrollData(S,true);
    const lines=[];
    const push=(t,sz)=>lines.push({t:String(t||''),sz:sz||14});
    push('上下五千年 · 无尽编年　收卷',22);
    push(E.fmtYear(-5000)+' — '+E.fmtYear(d.to)+'　共 '+d.turn+' 笔 / '+d.vol+' 卷',15);
    push('传承度 '+d.score+'　第 '+d.gen+' 代　'+d.verdict,13);
    push('档位 '+W.reality.banner(S)+'　史料密度 '+W.reality.density(S.density).name,12);
    push('',10);
    push('【舆地】已历气候 '+Object.keys(S.climateSeen||{}).length+' / '+D.geoclimate.events.length,16);
    push(W.geoclimate.CAVEAT.slice(0,46),11);
    push('地理单元 '+D.geoclimate.units.length+' 个，经纬度为近似中心点，非疆域图',11);
    push('',10);
    if(d.chain){push('【朝代长河】'+d.chain.title,16);
      d.chain.entities.forEach((x,i)=>push((i+1)+'. '+x.name+'　'+E.fmtShort(x.from)+'—'+E.fmtShort(x.to),13));}
    if(d.entity){push('【真实血脉】'+d.entity.name,16);
      d.entity.phases.forEach(p=>push(p.phase+'　'+p.label+'　'+p.event,12));}
    push('',10);
    push('【八维终值】',16);
    push(D.keyOrder.map(k=>D.keys[k]+' '+d.st[k]).join('　'),13);
    push('',10);
    push('【文明册】'+d.civ.seen.length+' / '+d.civ.total,16);
    d.civ.byDim.forEach(x=>push(x.name+'　'+x.got+' / '+x.total,13));
    push('',10);
    push('【所见史事】'+d.hist.length,16);
    d.hist.slice(0,18).forEach(x=>push(E.fmtShort(x.y0)+'　'+x.title,12));
    push('',10);
    push('【族谱】在籍 '+d.alive.length+'　凋零 '+d.dead,16);
    d.alive.slice(0,10).forEach(p=>push(p.gen+'代　'+p.name+'　'+p.trait,12));
    push('',10);
    push('史实为通识级考据整理，推演抉择不改写史实。',11);
    try{
      const CW=760,pad=28,lh=26,H=pad*2+lines.reduce((a,l)=>a+(l.sz>=20?38:l.sz>=16?30:lh),0);
      const cv=document.createElement('canvas');cv.width=CW;cv.height=Math.max(H,400);
      const c=cv.getContext('2d');
      c.fillStyle='#14110e';c.fillRect(0,0,CW,cv.height);
      c.strokeStyle='#4a3c2a';c.strokeRect(10,10,CW-20,cv.height-20);
      let y=pad+18;
      lines.forEach(l=>{
        c.fillStyle=l.sz>=20?'#c9a227':l.sz>=16?'#e8dcc2':'#ddd0b4';
        c.font=l.sz+'px "WenQuanYi Micro Hei",sans-serif';
        c.fillText(l.t.slice(0,52),pad,y);
        y+=l.sz>=20?38:l.sz>=16?30:lh;
      });
      const a=document.createElement('a');a.href=cv.toDataURL('image/png');
      a.download='wqn-收卷.png';document.body.appendChild(a);a.click();
      setTimeout(()=>a.remove(),600);
    }catch(e){alert('当前浏览器无法生成长图，可改用「导出全部存档」保存文字数据。');}
  }
  function renderStart(app){
    const cached=E.load();
    const startS={year:-5000,reg:START.reg,vol:{n:1},phase:'start'};
    let h=(ARTON&&W.stage)?W.stage.stageHTML(null,{tools:stageTools(),vmenu:VMENU}):artTopHTML(startS,true);
    h+='<div class="title"><h1>上下五千年</h1><p>分 卷 编 年 · 从 第 一 堆 篝 火 点 起</p></div>';
    h+='<div class="mini center" style="margin:-4px 0 10px;color:var(--dim)">'
      +'本版加入离线合成音乐与程序化几何插画：右上角可开关，设置页可调调式、底噪与音量。'
      +'全部不联网、不读写存档，关闭后不产生任何音频节点。'
      +'v1.3 起音效与背景音可分别开关，另加朗读、语音控制与键盘操作（设置页可开）。<br>'
      +'v1.4 起改为单张暖米纸背景 + 可换的「哈士喵」角色层：完整露出不裁剪，'
      +'表情动作随情境与天气变化，台词走气泡框；朗读仍默认关闭。<br>'
      +'v1.5 起有横屏／全屏按键、呼吸微表演、更透气泡与角色音色念句；'
      +'设置卡可收起，≡ 一键收舞台看全部选项。<br>'
      +'v1.6 起气泡更小更透、可点 … 展开全文；设置改成独立抽屉，'
      +'顶部有显眼的关闭按钮、把手可拖动，按键收进 ⚙ 齿轮。<br>'
      +'v1.7 起主页默认极简、气泡改成扁平横条半透，立绘可切全身／半身，'
      +'半身时下半身落进气泡后面仍看得见。<br>'
      +'v1.8 起背景全屏、向导常驻，选项半透浮在画面上；顶部进度条点开看完整读数，'
      +'所有气泡与弹窗的底色浓淡在设置页一把滑杆调，默认 35%。<br>'
      +'v1.9 起九张场景板与人物表演层随进度开放、点缩略图可换；'
      +'点一下向导或拖动它都有动画，选项悬停与选中也会换表演；'
      +'皮肤默认跟随系统，已通关关卡折到最后。<br>'
      +'v2.0 起点缩略图右上 ⤢ 可全屏看原稿、立绘拖动不出方框；'
      +'长按立绘选表情、点一下有震动反馈（可关）；'
      +'天气／场景环境音能手选且随进度开放；'
      +'气泡可拖可缩放、左右不出屏、组件互斥；'
      +'「念」再点一次就停；人口与职业改用场景内 emoji 速览，主页与选项更紧凑。</div>';
    h+='<div class="card"><p class="intro">你不是在读一段写好的历史。<br>你是某一支人、某一座城、某一个人，<br>从公元前 5000 年一直点下去。<br><span style="color:var(--gold)">每 '+E.volLen()+' 笔汇成一卷，卷卷可收；<br>也终有走到终章的那一日。</span></p>'
      +'<div class="mini center">国内外史事以「本土 / 远闻」同时抵达；'
      +D.civilization.dimensions.length+' 维 / '+D.civilization.items.length+' 条文明条目按六大知识类组织，'
      +'另有地方志 '+D.localities.items.length+' 条、姓氏 '+D.peoples.surnames.length
      +' 条、人群 '+D.peoples.peoples.length+' 条与深读卡 '+D.deepdives.items.length+' 则，'
      +'从书写、典籍、地图测绘、刑狱、户籍、情报、蒙学、日常器用、性别史、育幼、生业、地力、专榷、行旅、档案、论辩、典藏、赈济、传媒、知识产权到精神与心理，按年代登场；'
      +'越过今日之后，进入明确标注的虚构推演。</div></div>';
    if(cached){
      h+='<div class="card"><div class="tagline">旧 卷 尚 在</div><div class="mini">'+E.fmtYear(cached.year)+' · '+D.regions[cached.reg].n
        +' · 第 '+cached.turn+' 笔 · 卷 '+(cached.vol?cached.vol.n:1)+' · '+D.views[cached.view].n+'视角</div>'
        +'<button class="big" data-act="resume">续 接 旧 卷</button></div>';
    }
    /* 难度与新手教程：放在最前面，第一次玩不会迷路 */
    const DF=W.difficulty,TT=W.tutorial,curD=DF.tier(START.difficulty);
    h+='<div class="card"><div class="tagline">新 手 教 程 · 与 难 度</div>'
      +'<div class="mini">难度只改推演数值与指引多少（危机触发线属推演层，会间接影响某一笔遇到什么），'
      +'<b style="color:var(--gold)">不改任何史实</b>：史实条目、年代、出处、可信度、舆图、玩法档位与史料密度一律照旧。</div>'
      +'<div class="viewsel" style="margin-top:9px">';
    DF.DIFFS.forEach(d=>h+='<button data-diff="'+d.key+'" class="'+(START.difficulty===d.key?'on':'')+'">'+d.name+'</button>');
    h+='</div><div class="note" style="margin-top:8px"><b>'+esc(curD.name)+'：</b>'
      +esc(curD.desc)+'<div class="mini" style="margin-top:4px">'+esc(curD.note)+'</div></div>'
      +'<div class="tuton" style="margin-top:9px"><label><input type="checkbox" data-tuton="1" '
      +(START.tutorialOn?'checked':'')+'> 开启新手教程（'+TT.STEPS.length+' 步，跟着点一遍就会玩）</label>'
      +'<div class="mini">简单模式默认开启，且全程多一层逐卡指引与「新手建议」；普通／困难默认关闭，可随时打开。</div></div>'
      +'<details class="fold" style="margin-top:8px"><summary>先 看 一 眼 教 程 讲 什 么 · '+TT.STEPS.length+' 步</summary>'
      +TT.STEPS.map((x,i)=>'<div class="row"><span class="y">'+(i+1)+'</span><b>'+esc(x.title)+'</b>'
        +'<div class="mini">'+esc(x.body)+'</div></div>').join('')
      +'<div class="mini" style="color:var(--dim)">'+esc(TT.meta.note)+'</div></details></div>';
    h+='<div class="card"><div class="tagline">择 一 文 明 圈</div><div class="sel">';
    Object.keys(D.regions).forEach(k=>h+='<button data-reg="'+k+'" class="'+(START.reg===k?'on':'')+'">'+D.regions[k].n+'<div class="mini" style="color:var(--dim);margin-top:4px">'+D.regions[k].d+'</div></button>');
    h+='</div><div class="tagline">择 一 视 角</div><div class="viewsel">';
    Object.keys(D.views).forEach(k=>h+='<button data-v="'+k+'" class="'+(START.view===k?'on':'')+'">'+D.views[k].n+'</button>');
    h+='</div><button class="big" data-act="newgame">点 燃 第 一 堆 篝 火</button></div>';

    /* 真实性与玩法：把「还原」和「好玩」的选择权交给玩家 */
    const RT=W.reality;
    h+='<div class="card"><div class="tagline">真 实 性 档 位 · 由 你 定</div>'
      +'<div class="mini">史实永远不改；档位只决定哪些「非史实」内容允许入场。'
      +'趣味来自抉择后果、收集、判读与家族命运，不来自把传说伪装成历史。</div>';
    RT.TIERS.forEach(t=>{
      h+='<button data-tier="'+t.key+'" class="'+(START.reality===t.key?'on':'')+'" '
        +'style="display:block;width:100%;text-align:left;margin-top:8px;padding:10px;border:1px solid '
        +(START.reality===t.key?'var(--gold)':'var(--line)')+';border-radius:10px;background:'
        +(START.reality===t.key?'#33291a':'#1d1811')+';color:var(--ink);font-family:inherit">'
        +'<b style="color:var(--gold)">'+t.name+'</b> <span class="mini">'+t.short+'</span>'
        +'<div class="mini" style="margin-top:5px">'+t.desc+'</div>'
        +'<div class="mini" style="color:var(--blue);margin-top:4px">'+t.note+'</div></button>';
    });
    h+='<div class="hr"></div><div class="tagline">玩 法 模 式</div><div class="viewsel" style="flex-wrap:wrap">';
    RT.MODES.forEach(m=>h+='<button data-mode="'+m.key+'" class="'+(START.modeKey===m.key?'on':'')+'">'+m.name+'</button>');
    h+='</div><div class="mini" style="margin-top:6px">'
      +esc(RT.mode(START.modeKey).desc)+'</div>';
    h+='<div class="hr"></div><div class="tagline">局 时 长</div><div class="viewsel" style="flex-wrap:wrap">';
    RT.LENGTHS.forEach(l=>h+='<button data-len="'+l.key+'" class="'+(START.lengthKey===l.key?'on':'')+'">'+l.name+'</button>');
    h+='</div><div class="mini" style="margin-top:6px">'+esc(RT.length(START.lengthKey).desc)+'</div>';
    h+='<div class="hr"></div><div class="tagline">史 料 密 度</div><div class="viewsel" style="flex-wrap:wrap">';
    RT.DENSITIES.forEach(d=>h+='<button data-dens="'+d.key+'" class="'+(START.density===d.key?'on':'')+'">'+d.name+'</button>');
    h+='</div><div class="mini" style="margin-top:6px">'+esc(RT.density(START.density).desc)
      +'　（只改史实出现频率，不改任何史实内容）</div></div>';
    const ent=D.entities.entities.find(x=>x.id===START.entity)||D.entities.entities[0];
    h+='<div class="card"><div class="tagline">或 · 代 入 真 实 血 脉</div>'
      +'<div class="mini">从考据年表的「建立」之年入局，沿建立 → 扩张 → 鼎盛 → 转折 → 衰落 → 终结六阶段走完一个真实王朝／家族／文明。'
      +'史实节点与出处原样呈现，抉择仍属推演；人物、工艺、文化、商业会以「文明」条目同时抵达。</div>'
      +'<div class="sel" style="margin-top:10px">';
    D.entities.entities.forEach(e=>{
      h+='<button data-ent="'+e.id+'" class="'+(ent.id===e.id?'on':'')+'">'+esc(e.name)
        +'<div class="mini" style="color:var(--dim);margin-top:4px">'+E.fmtShort(e.startYear)+' — '+E.fmtShort(e.endYear)+' · '+D.regions[e.region].n+'</div></button>';
    });
    h+='</div><button class="big" data-act="newreal">代 入 '+esc(ent.name)+' ▸</button></div>';
    const chRegions=W.succession.available();
    const co=W.succession.coexisting();
    const ch=D.succession.chains[START.chainRegion]||D.succession.chains[chRegions[0]]
      ||{region:'huaxia',title:'朝代更迭',entities:[],from:-5000,to:2026,totalTurns:0};
    h+='<div class="card"><div class="tagline">或 · 朝 代 长 河（连 续 更 迭）</div>'
      +'<div class="mini">一局连走多个真实王朝，前朝终结自动接下一朝；间朝单独标出。'
      +'真实人物按其活动年代随朝代登场，每朝一卷、卷末出更迭卡。</div>';
    if(chRegions.length){
      h+='<div class="viewsel" style="margin-top:10px">';
      chRegions.forEach(k=>h+='<button data-chain="'+k+'" class="'+(ch.region===k?'on':'')+'">'+D.regions[k].n+'</button>');
      h+='</div>';
      h+='<div class="mini" style="margin-top:8px">'+esc(ch.title)+'：';
      ch.entities.forEach((e,i)=>{
        if(i)h+=' <span style="color:var(--dim)">→</span> ';
        h+=esc(e.name);
      });
      h+='<br>'+E.fmtShort(ch.from)+' — '+E.fmtShort(ch.to)+'，共 '+ch.entities.length+' 朝、'+ch.totalTurns+' 笔。</div>';
      h+='<button class="big" data-act="newchain">走 一 遍 朝 代 长 河 ▸</button>';
    }
    h+='<div class="hr"></div><div class="mini">其他文明圈暂不排成线性王朝链：'
      +Object.keys(co).map(k=>D.regions[k].n+'（'+co[k].entities.length+' 个政权'+(co[k].entities.length>1?'纪年互相重叠':'')+'）').join('、')
      +'。政权并立时硬串成「前后相续」会失真，故只列并存，不伪造更迭。</div></div>';
    /* 世家代入：六阶段走门第政治位置的浮沉，复用真实血脉的年表机制 */
    const HE=D.house_entities.entities;
    const hEnt=HE.find(x=>x.id===START.house)||HE[0];
    h+='<div class="card"><div class="tagline">或 · 代 入 世 家 浮 沉</div>'
      +'<div class="mini">从「兴起」之期入局，走兴起 → 扩张 → 鼎盛 → 转折 → 衰落 → 散脉六阶段。'
      +'这是<b>门第政治位置</b>的浮沉，不是家族人口兴灭；六阶段为通识级框架锚点，'
      +'不作精确纪年。抉择仍属推演，本局族人不与真实世家攀附谱牒。</div>'
      +'<div class="sel" style="margin-top:10px">';
    HE.forEach(e=>{
      h+='<button data-hse="'+e.id+'" class="'+(hEnt.id===e.id?'on':'')+'">'+esc(e.name)
        +'<div class="mini" style="color:var(--dim);margin-top:4px">'+E.fmtShort(e.startYear)
        +' — '+E.fmtShort(e.endYear)+' · '+D.regions[e.region].n+'</div></button>';
    });
    h+='</div><div class="mini" style="color:var(--gold);margin-top:6px">'
      +esc(D.house_entities.meta.boundary)+'</div>'
      +'<button class="big" data-act="newhouse">代 入 '+esc(hEnt.name)+' ▸</button></div>';
    h+='<div class="mini center" style="margin-top:14px;color:var(--gold)">'
      +VER()+'　·　'+esc((D.version||{}).codename||'')+'</div>';
    h+='<div class="mini center" style="margin-top:6px">版本只标识这一份文件；'
      +'每次内容更新自动 +0.1，旧存档刷新后自动补版本字段，不影响续玩。</div>';
    h+='<div class="mini center" style="margin-top:14px">单文件 · 无联网 · 自动存档于本机<br>'
      +D.civilization.dimensions.length+' 维 / '+D.civilization.items.length+' 条文明条目 · '
      +D.geoclimate.units.length+' 地理单元 / '+D.geoclimate.events.length+' 气候事件 · '
      +D.fringe.texts.length+' 文本传统 / '+D.fringe.hypotheses.length+' 未证实假说（默认关闭）</div>';
    app.innerHTML=h;if(ROT90)rotChrome();applyHint();$('tabs').innerHTML='';
    const rerender=()=>renderStart(app);
    app.querySelectorAll('[data-reg]').forEach(b=>b.addEventListener('click',()=>{START.reg=b.dataset.reg;rerender();}));
    app.querySelectorAll('[data-v]').forEach(b=>b.addEventListener('click',()=>{START.view=b.dataset.v;rerender();}));
    app.querySelectorAll('[data-ent]').forEach(b=>b.addEventListener('click',()=>{START.entity=b.dataset.ent;rerender();}));
    app.querySelectorAll('[data-chain]').forEach(b=>b.addEventListener('click',()=>{START.chainRegion=b.dataset.chain;rerender();}));
    app.querySelectorAll('[data-hse]').forEach(b=>b.addEventListener('click',()=>{START.house=b.dataset.hse;rerender();}));
    app.querySelectorAll('[data-tier]').forEach(b=>b.addEventListener('click',()=>{START.reality=b.dataset.tier;rerender();}));
    app.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',()=>{START.modeKey=b.dataset.mode;rerender();}));
    app.querySelectorAll('[data-len]').forEach(b=>b.addEventListener('click',()=>{START.lengthKey=b.dataset.len;rerender();}));
    app.querySelectorAll('[data-dens]').forEach(b=>b.addEventListener('click',()=>{START.density=+b.dataset.dens;rerender();}));
    app.querySelectorAll('[data-diff]').forEach(b=>b.addEventListener('click',()=>{
      START.difficulty=b.dataset.diff;
      if(!START.tutManual)START.tutorialOn=W.difficulty.tier(START.difficulty).tutorialDefault;
      rerender();
    }));
    app.querySelectorAll('[data-tuton]').forEach(b=>b.addEventListener('change',()=>{
      START.tutorialOn=b.checked;START.tutManual=true;rerender();
    }));
    const startCfg=()=>E.configure({reality:START.reality,modeKey:START.modeKey,
      lengthKey:START.lengthKey,density:START.density,difficulty:START.difficulty});
    /* 开局教程开关：fresh 已按难度给默认值，这里按玩家勾选覆盖 */
    const applyTut=()=>{const S=E.state();if(!S||!W.tutorial)return;
      W.tutorial.setOn(S,!!START.tutorialOn);
      if(!START.tutorialOn){S.tutorial.done=true;S.tutorial.idx=W.tutorial.STEPS.length-1;}
    };
    app.querySelectorAll('[data-snd]').forEach(b=>b.addEventListener('click',()=>{
      const a=b.dataset.snd,au=AU();if(!au)return;
      if(a==='toggle'){au.toggle();cue('tap');}
      else if(a==='sfx'){au.set('sfx',!au.status().sfx);cue('tap');}
      else if(a==='bgm'){au.set('bgm',!au.status().bgm);cue('tap');}
      rerender();
    }));
    app.querySelectorAll('[data-read]').forEach(b=>b.addEventListener('click',()=>{
      const ax=W.a11y;if(!ax)return;
      const st=ax.status();
      if(st.read||st.speaking){
        ax.stopSpeak();ax.set('read',false);ax.set('autoRead',false);
        if(ax.announce)ax.announce('已停止朗读');
      }else{ax.set('read',true);ax.readScreen();}
      rerender();
    }));
    if(W.a11y){W.a11y.mount();W.a11y.onRender(null);}
    applyDisplay();
    app.querySelectorAll('[data-act]').forEach(b=>b.addEventListener('click',()=>{
      const a=b.dataset.act;
      cue('tap');
      if(a==='newgame'){startCfg();E.fresh(START.reg,START.view);applyTut();E.step();TAB='main';render();}
      else if(a==='newreal'){startCfg();E.freshEntity(START.entity,START.view);applyTut();E.step();TAB='main';render();}
      else if(a==='newchain'){startCfg();E.freshSuccession(START.chainRegion,START.view);applyTut();E.step();TAB='main';render();}
      else if(a==='newhouse'){startCfg();E.freshEntity(START.house,START.view);applyTut();E.step();TAB='main';render();}
      else if(a==='resume'){
        const c=E.load();
        if(c){E.setState(c);TAB='main';render();}
      }
    }));
  }
  W.ui={render:render,renderStart:renderStart,setTab:t=>{TAB=t;},getTab:()=>TAB,
    setStart:(k,v)=>{START[k]=v;},getStart:()=>START};
  if(typeof module!=='undefined'&&module.exports)module.exports=W.ui;
})((typeof window!=='undefined'?window:globalThis).WQN=((typeof window!=='undefined'?window:globalThis).WQN||{}));
