# -*- coding: utf-8 -*-
"""v2.2：声线档、语气音包、朗读时立绘说话表演。"""
import os
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def ed(p,pairs,label):
    s=open(p,encoding='utf8').read()
    for a,b,tag in pairs:
        assert a in s,label+' 缺 '+tag
        s=s.replace(a,b,1);print(' ok',tag)
    open(p,'w',encoding='utf8').write(s)

# ---------- a11y.js ----------
ed(os.path.join(ROOT,'src','a11y.js'),[
("""  const KEY='wqn.a11y.v1';
  const DEF={read:false,autoRead:false,voice:false,rate:1,verbosity:'normal'};
  let cfg=load(),mounted=false,hooks={},lastKey='',
      ttsQueue=[],ttsIdx=0,ttsBusy=false,rec=null,recWanted=false,live=null;""",
"""  const KEY='wqn.a11y.v1',VPKEY='wqn.voicepack',TALKKEY='wqn.talkact';
  const DEF={read:false,autoRead:false,voice:false,rate:1,verbosity:'normal'};
  let cfg=load(),mounted=false,hooks={},lastKey='',
      ttsQueue=[],ttsIdx=0,ttsBusy=false,rec=null,recWanted=false,live=null;
  /* v2.2：声线档只是系统语音的音高/语速组合 + 合成语气音倍率，
     不是录音包、不加载任何音频文件。说话表演开关只管立绘动画。 */
  const PACKS=((W.data&&W.data.music)||{}).voicePacks||[];
  function loadStr(k,d){
    try{const v=globalThis.localStorage&&globalThis.localStorage.getItem(k);
      return v===null?d:v;}catch(e){return d;}
  }
  let voicePack=loadStr(VPKEY,'gentle'),talkAct=loadStr(TALKKEY,'1')!=='0';
  function pack(){
    return PACKS.filter(x=>x.key===voicePack)[0]||PACKS[0]||
      {key:'gentle',name:'温和',pitch:1.08,rate:0.88,cue:1.0};
  }
  function setVoicePack(k){
    if(!PACKS.filter(x=>x.key===k).length)return false;
    voicePack=k;
    try{if(globalThis.localStorage)globalThis.localStorage.setItem(VPKEY,k);}catch(e){}
    return true;
  }
  function setTalkAct(v){
    talkAct=!!v;
    try{if(globalThis.localStorage)globalThis.localStorage.setItem(TALKKEY,talkAct?'1':'0');}catch(e){}
    return talkAct;
  }
  function emit(kind,detail){
    try{if(hasDoc()&&document.dispatchEvent)
      document.dispatchEvent(new CustomEvent(kind,{detail:detail||{}}));}catch(e){}
  }""",'a11y 声线配置'),

("""  function speak(text,opt){
    opt=opt||{};
    /* opt.force：用户主动点「念这句」或语音命令时，不受全局朗读开关限制 */
    if((!cfg.read&&!opt.force)||!hasTTS())return false;
    const guide=opt.role==='guide';
    stopSpeak();
    ttsQueue=splitText(clean(text),guide?90:(cfg.verbosity==='brief'?110:170));
    if(!ttsQueue.length)return false;
    const voice=pickVoice(opt.role),rate=opt.rate||(guide?0.92:cfg.rate),
          pitch=opt.pitch||(guide?1.22:1);
    const next=()=>{""",
"""  function speak(text,opt){
    opt=opt||{};
    /* opt.force：用户主动点「念这句」或语音命令时，不受全局朗读开关限制 */
    if((!cfg.read&&!opt.force)||!hasTTS())return false;
    const guide=opt.role==='guide',pk=pack(),mute=pk.key==='mute';
    const raw=clean(text);
    /* 「不出声」档只演不念：发一个空的开始事件让立绘做说话表演，不占语音队列 */
    if(mute){
      emit('wqn:speakstart',{text:raw,mood:opt.mood||'calm',silent:true,pack:pk.key});
      emit('wqn:speakend',{silent:true});
      return true;
    }
    stopSpeak();
    ttsQueue=splitText(raw,guide?90:(cfg.verbosity==='brief'?110:170));
    if(!ttsQueue.length)return false;
    emit('wqn:speakstart',{text:raw,mood:opt.mood||'calm',silent:false,pack:pk.key});
    const voice=pickVoice(opt.role),
          rate=Math.max(.6,Math.min(1.6,(opt.rate||(guide?0.92:cfg.rate))*pk.rate)),
          pitch=Math.max(.5,Math.min(1.8,(opt.pitch||(guide?1.22:1))*(guide?pk.pitch:1)));
    const next=()=>{""",'speak 声线倍率与开始事件'),

("""      }catch(e){ttsBusy=false;}
    };
    ttsBusy=true;next();
    return true;
  }""",
"""      }catch(e){ttsBusy=false;emitEnd();}
    };
    ttsBusy=true;next();
    return true;
  }""",'catch 分支补结束事件'),

("""      listening:!!(rec&&recWanted),mounted:mounted,ttsVoices:voiceInfo()};""",
"""      listening:!!(rec&&recWanted),mounted:mounted,ttsVoices:voiceInfo(),
      voicePack:voicePack,voicePackName:pack().name,talkAct:talkAct};""",'status 声线字段'),

("""  W.a11y={set:set,status:status,config:()=>Object.assign({},cfg),""",
"""  W.a11y={set:set,status:status,config:()=>Object.assign({},cfg),
    voicePacks:PACKS,pack:pack,setVoicePack:setVoicePack,
    setTalkAct:setTalkAct,talkAct:()=>talkAct,""",'a11y 导出声线接口'),
],'a11y.js')

# ---------- audio.js ----------
ed(os.path.join(ROOT,'src','audio.js'),[
("""  function guideCue(kind){
    if(!cfg.on||!cfg.sfx||!avail())return false;
    resume();
    if(kind==='happy'){glide(520,880,0.16,0.07,'sine',0);glide(660,990,0.14,0.05,'sine',0.12);}
    else if(kind==='hesitate'){glide(430,320,0.24,0.05,'sine',0);}
    else {glide(470,730,0.13,0.06,'sine',0);}
    return true;
  }""",
"""  /* v2.2：六种合成非语言语气音，按声线档整体移调；不含字词，不是配音包 */
  function guideCue(kind,mul){
    if(!cfg.on||!cfg.sfx||!avail())return false;
    const k=mul||1;
    if(k<=0)return false;
    const f=(a,b,d,v,type,delay)=>glide(a*k,b*k,d,v,type,delay||0);
    resume();
    if(kind==='happy'){f(520,880,0.16,0.07,'sine',0);f(660,990,0.14,0.05,'sine',0.12);}
    else if(kind==='hesitate'){f(430,320,0.24,0.05,'sine',0);}
    else if(kind==='sad'){f(520,360,0.22,0.06,'sine',0);f(360,290,0.26,0.04,'sine',0.16);}
    else if(kind==='surprise'){f(390,920,0.09,0.08,'sine',0);f(820,680,0.11,0.05,'sine',0.09);}
    else if(kind==='calm'){f(460,510,0.18,0.045,'sine',0);}
    else {f(470,730,0.13,0.06,'sine',0);}
    return true;
  }""",'audio 六种语气音'),
("""    setWeather:setWeather,getWeather:()=>curWeather,guideCue:guideCue,""",
"""    setWeather:setWeather,getWeather:()=>curWeather,guideCue:guideCue,
    cueMoods:Object.keys((M.guideCues||{})).filter(x=>x!=='type'),""",'audio 导出情绪名'),
],'audio.js')

# ---------- ui.js ----------
p=os.path.join(ROOT,'src','ui.js');s=open(p,encoding='utf8').read()
def R(a,b,tag,cnt=1):
    global s
    assert a in s,'ui.js 缺 '+tag
    s=s.replace(a,b,cnt);print(' ok',tag)

R("""  let SPLONGT=0,SPMOVED=0,IS_PREVIEW=0;""",
"""  let SPLONGT=0,SPMOVED=0,IS_PREVIEW=0,TALKING=0,CUEON=1;
  try{CUEON=(JSON.parse(localStorage.getItem('wqn.ui2')||'{}').cue!==0)?1:0;}catch(e){}""",
 '说话表演状态')

R("""  function vibe(ms){""",
"""  /* v2.2：台词开口 / 收口，驱动立绘说话表演与一声合成语气音 */
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
  function vibe(ms){""",'说话表演函数')

# 事件监听：替换已有 speakend 监听
R("""    /* v2.1：朗读队列结束（含引擎不可用、被取消）统一把开关复位 */
    document.addEventListener('wqn:speakend',()=>{SAYING=0;syncSayBtn();});""",
"""    /* v2.1/v2.2：朗读开始驱动表演，结束（含引擎不可用、被取消）复位按钮与立绘 */
    document.addEventListener('wqn:speakstart',e=>talkBegin(e.detail||{}));
    document.addEventListener('wqn:speakend',()=>{
      SAYING=0;syncSayBtn();talkEnd();
    });""",'说话事件监听')

# 「念」按钮分支：把台词情绪传给 a11y
R("""          const ok=W.stage&&W.stage.speakLine&&W.stage.speakLine();
          SAYING=ok?1:0;syncSayBtn();""",
"""          const bub=document.querySelector('.stage .bubble'),
                full=bub?(bub.dataset.full||bub.querySelector('.say')?.textContent||''):'',
                mood=W.stage&&W.stage.talkMood?W.stage.talkMood(full):'calm';
          const ok=W.a11y&&W.a11y.speakAs?W.a11y.speakAs(full||'这一笔',{role:'guide',mood:mood})
            :(W.stage&&W.stage.speakLine&&W.stage.speakLine());
          SAYING=ok?1:0;syncSayBtn();""",'念按钮带情绪')

# 设置页新增「向导人声」卡，插在反馈卡之前
R("""    /* ===== v2.0 反 馈 · 震 动 与 长 按 ===== */""",
"""    /* ===== v2.2 向 导 人 声 · 声 线 与 表 演 ===== */
    const AX=W.a11y,VP=(AX&&AX.voicePacks)||[],curVP=AX&&AX.status?AX.status().voicePack:'gentle';
    h+='<div class="card"><div class="tagline">向 导 人 声 · 声 线 与 表 演</div>'
      +'<div class="mini">先说实话：这里没有配音素材包，也不联网加载音频。'
      +'「声线」是浏览器系统语音的音高／语速组合，「语气音」是 Web Audio 合成的非语言短音，'
      +'「说话表演」是朗读时立绘轻轻起伏。三者叠起来像在演，不是真人录音。</div>'
      +'<div class="wxgrid">'
      +VP.map(x=>'<button class="wxpick'+(x.key===curVP?' on':'')+'" data-voicepack="'+esc(x.key)+'"'
        +' aria-label="'+esc(x.name)+'：'+esc(x.note)+'"><b>'+esc(x.name)+'</b>'
        +'<em>'+esc(x.note)+'</em></button>').join('')
      +'</div>'
      +'<div class="switchrow"><span>朗读时立绘说话表演</span><div class="viewsel">'
      +'<button data-talkact="1" class="'+((AX&&AX.status&&AX.status().talkAct)?'on':'')+'">开</button>'
      +'<button data-talkact="0" class="'+((AX&&AX.status&&!AX.status().talkAct)?'on':'')+'">关</button></div></div>'
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

    /* ===== v2.0 反 馈 · 震 动 与 长 按 ===== */""",'设置页人声卡')

# click 分支
R("""    const vb=ev.target.closest&&ev.target.closest('[data-vibe]');""",
"""    const vp=ev.target.closest&&ev.target.closest('[data-voicepack]');
    if(vp){if(W.a11y&&W.a11y.setVoicePack)W.a11y.setVoicePack(vp.dataset.voicepack);
      applyDisplay();render();
      if(W.a11y&&W.a11y.announce)W.a11y.announce('向导声线已选'+vp.textContent.trim().split('\\n')[0]);
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
    const vb=ev.target.closest&&ev.target.closest('[data-vibe]');""",'人声 click 分支')

open(p,'w',encoding='utf8').write(s);print('ui.js 完成')
