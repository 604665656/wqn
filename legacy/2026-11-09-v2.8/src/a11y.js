/* a11y.js —— 朗读／语音控制／读屏友好（v1.3）
   纪律：全部走浏览器原生接口（speechSynthesis / SpeechRecognition），
        不联网、不上传任何语音、不加载外部资源、不写入游戏存档、不调用主随机数。
   降级：file:// 下部分浏览器不提供语音识别；此时如实提示，键盘与朗读仍可用。
   隐私：麦克风是否开启完全由用户点按决定；关闭后立即停止，不保留录音。 */
(function(W){
  'use strict';
  const KEY='wqn.a11y.v1',VPKEY='wqn.voicepack',TALKKEY='wqn.talkact';
  const DEF={read:false,autoRead:false,voice:false,rate:1,verbosity:'normal'};
  let cfg=load(),mounted=false,hooks={},lastKey='',
      ttsQueue=[],ttsIdx=0,ttsBusy=false,rec=null,recWanted=false,live=null;
  /* v2.2：声线档只是系统语音的音高/语速组合 + 合成语气音倍率，
     不是录音包、不加载任何音频文件。说话表演开关只管立绘动画。 */
  const PACKS=((W.data&&W.data.music)||{}).voicePacks||[];
  function loadStr(k,d){
    try{const v=globalThis.localStorage&&globalThis.localStorage.getItem(k);
      return (v===null||v===undefined||v==='')?d:v;}catch(e){return d;}
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
  }

  function load(){
    try{
      const raw=globalThis.localStorage&&globalThis.localStorage.getItem(KEY);
      if(raw)return Object.assign({},DEF,JSON.parse(raw));
    }catch(e){}
    return Object.assign({},DEF);
  }
  function save(){
    try{if(globalThis.localStorage)globalThis.localStorage.setItem(KEY,JSON.stringify(cfg));}
    catch(e){}
  }
  const hasTTS=()=>typeof globalThis.speechSynthesis!=='undefined'
    &&typeof globalThis.SpeechSynthesisUtterance!=='undefined';
  const SR=()=>globalThis.SpeechRecognition||globalThis.webkitSpeechRecognition||null;
  const hasVoice=()=>!!SR();
  const hasDoc=()=>typeof document!=='undefined';

  function liveNode(){
    if(!hasDoc())return null;
    live=live||document.getElementById('a11yLive');
    return live;
  }
  function announce(t){
    const n=liveNode();if(!n)return;
    try{n.textContent='';setTimeout(()=>{n.textContent=String(t||'');},30);}catch(e){}
  }
  function clean(s){
    return String(s||'').replace(/<[^>]*>/g,' ')
      .replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();
  }
  function voices(){
    if(!hasTTS())return [];
    try{return globalThis.speechSynthesis.getVoices()||[];}catch(e){return [];}
  }
  /* 角色音色档：优先挑中文里偏明亮的女声；不同设备可用音色不同，不打包音频文件 */
  function pickVoice(role){
    const vs=voices().filter(v=>/zh|cmn|Chinese/i.test(v.lang||v.name||''));
    if(!vs.length)return null;
    if(role==='guide'){
      const bright=vs.filter(v=>/female|女|Ting|Xiaoxiao|Yaoyao|Huihui|Mei|Sinji|Google 普通话/i
        .test(v.name||''));
      return bright[0]||vs[vs.length-1]||null;
    }
    return vs[0]||null;
  }
  function voiceInfo(){
    const all=voices(),zh=all.filter(v=>/zh|cmn|Chinese/i.test(v.lang||v.name||''));
    return {total:all.length,zh:zh.length,guide:!!pickVoice('guide')};
  }
  /* 长文本切成适合朗读的短段，避免某些引擎一次吞掉整段 */
  function splitText(t,max){
    max=max||160;
    /* 不用后行断言：部分移动端浏览器对 (?<=) 支持不全 */
    const src=String(t||''),parts=[];let buf='';
    for(let i=0;i<src.length;i++){
      buf+=src[i];
      if('。！？；\n'.indexOf(src[i])>=0){parts.push(buf);buf='';}
    }
    if(buf)parts.push(buf);
    const out=[];let cur='';
    parts.forEach(p=>{
      if((cur+p).length>max&&cur){out.push(cur);cur=p;}
      else cur+=p;
    });
    if(cur)out.push(cur);
    return out.slice(0,18);
  }
  /* v2.1：队列读完／出错／被取消时发一个事件，UI 据此把「停」复位成「念」。
     不再靠固定延时猜，避免「刚点停又立刻被定时器改回去」的竞态。 */
  function emitEnd(){
    try{if(typeof document!=='undefined'&&document.dispatchEvent)
      document.dispatchEvent(new CustomEvent('wqn:speakend'));}catch(e){}
  }
  function stopSpeak(){
    ttsQueue=[];ttsIdx=0;ttsBusy=false;
    try{if(hasTTS())globalThis.speechSynthesis.cancel();}catch(e){}
  }
  function speak(text,opt){
    opt=opt||{};
    /* opt.force：用户主动点「念这句」或语音命令时，不受全局朗读开关限制 */
    if((!cfg.read&&!opt.force)||!hasTTS())return false;
    const guide=opt.role==='guide',pk=pack(),mute=pk.key==='mute';
    const raw=clean(text);
    /* 「不出声」档只演不念：发一个空的开始事件让立绘做说话表演，不占语音队列 */
    if(mute){
      emit('wqn:speakstart',{text:raw,mood:opt.mood||'calm',silent:true,pack:pk.key});
      /* 静音档也演一小拍再收口，不然立绘只是闪一下 */
      setTimeout(()=>emit('wqn:speakend',{silent:true}),1400);
      return true;
    }
    stopSpeak();
    ttsQueue=splitText(raw,guide?90:(cfg.verbosity==='brief'?110:170));
    if(!ttsQueue.length)return false;
    emit('wqn:speakstart',{text:raw,mood:opt.mood||'calm',silent:false,pack:pk.key});
    const voice=pickVoice(opt.role),
          rate=Math.max(.6,Math.min(1.6,(opt.rate||(guide?0.92:cfg.rate))*pk.rate)),
          pitch=Math.max(.5,Math.min(1.8,(opt.pitch||(guide?1.22:1))*(guide?pk.pitch:1)));
    const next=()=>{
      if(!ttsBusy||ttsIdx>=ttsQueue.length){ttsBusy=false;emitEnd();return;}
      try{
        const u=new globalThis.SpeechSynthesisUtterance(ttsQueue[ttsIdx++]);
        u.lang='zh-CN';u.rate=rate;u.pitch=pitch;u.volume=1;
        if(voice)u.voice=voice;
        u.onend=next;u.onerror=()=>{ttsBusy=false;emitEnd();};
        globalThis.speechSynthesis.speak(u);
      }catch(e){ttsBusy=false;emitEnd();}
    };
    ttsBusy=true;next();
    return true;
  }
  /* 向导台词用角色音色念；不是配音包，是系统语音的音色档 */
  /* v2.2：第二参数可传字符串角色，也可传 {mood,rate,pitch} 选项 */
  function speakAs(text,opt){
    if(opt&&typeof opt==='object')
      return speak(text,Object.assign({role:'guide',force:true},opt));
    return speak(text,{role:opt||'guide',force:true});
  }
  /* v2.0：同一个「念」按钮再点一次必须能关掉，而不是从头再念一遍。
     返回 false 表示「这次是关掉」，true 表示「这次开始念」。 */
  function toggleSpeak(text,opt){
    if(ttsBusy){stopSpeak();return false;}
    return speak(text,opt||{});
  }
  function guideVoices(){return voiceInfo();}
  /* 从当前可见页签生成朗读稿：先年份卷次，再卡片正文，最后逐条读选项 */
  function screenText(mode){
    if(!hasDoc())return '';
    const panel=document.querySelector('.panel.on')||document.getElementById('app');
    if(!panel)return '';
    const parts=[];
    const one=sel=>{const e=panel.querySelector(sel);if(e)parts.push(clean(e.textContent));};
    one('.yr');one('.era');one('.vt');one('.tagline');
    panel.querySelectorAll('.card, .endcard, .tutcard').forEach(c=>{
      const t=clean(c.querySelector('h2')&&c.querySelector('h2').textContent);
      if(t)parts.push(t);
      const p=clean(c.querySelector('p.story')&&c.querySelector('p.story').textContent);
      if(p)parts.push(p);
      const st=clean(c.querySelector('.result')&&c.querySelector('.result').textContent);
      if(st)parts.push('结果：'+st);
      const g=clean(c.querySelector('.gather')&&c.querySelector('.gather').textContent);
      if(g)parts.push(g);
      const nt=clean(c.querySelector('.note')&&c.querySelector('.note').textContent);
      if(nt&&cfg.verbosity!=='brief')parts.push('说明：'+nt);
    });
    const opts=panel.querySelectorAll('.opt');
    if(opts.length&&mode!=='brief'){
      parts.push('共 '+opts.length+' 个选项。');
      opts.forEach((b,i)=>{
        const t=clean(b.querySelector('.t')&&b.querySelector('.t').textContent)
          ||clean(b.textContent);
        const e=clean(b.querySelector('.estat')&&b.querySelector('.estat').textContent);
        const r=clean(b.querySelector('.risk')&&b.querySelector('.risk').textContent);
        parts.push('选项 '+(i+1)+'：'+t+(e?'。'+e:'')+(r?'。'+r:''));
      });
    }
    const acts=[];
    panel.querySelectorAll('button.big, button[data-act]').forEach(b=>{
      const t=clean(b.textContent);if(t&&acts.indexOf(t)<0)acts.push(t);
    });
    if(acts.length)parts.push('可点：'+acts.slice(0,4).join('、')+'。');
    return parts.filter(Boolean).map(x=>x.length>160?(x.slice(0,80)+'，以下略'):x)
      .join('。').slice(0,1600);
  }
  function readScreen(mode){
    const t=screenText(mode);
    if(!t)return false;
    announce('开始朗读当前页面');
    return speak(t);
  }

  /* ---------- 语音命令：纯函数，便于测试 ---------- */
  const NUM={一:1,二:2,两:2,三:3,四:4,五:5,六:6,七:7,八:8,九:9,
    '1':1,'2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9};
  const TABMAP=[['推演','main'],['主页','main'],['编年','log'],['族谱','fam'],
    ['史海','sea'],['文明','civ'],['舆地','geo'],['卷轴','vol'],['设置','set']];
  function parseCommand(raw){
    let t=clean(raw).replace(/[，。！？、\s]/g,'');
    if(!t)return null;
    let m=t.match(/(?:选|第|选项|按|点)?([一二两三四五六七八九1-9])(?:个|项|条)?$/);
    if(m&&/^(选|第|选项|按|点|\d|一|二|两|三|四|五|六|七|八|九)/.test(t)){
      const i=NUM[m[1]];
      if(i)return {act:'choose',i:i};
    }
    if(/^(念这句|角色念|喵一句|用角色音色念|念一下)/.test(t))return {act:'guideSay'};
    if(/^(好奇|欢喜|迟疑|语气音)/.test(t))return {act:'guideCue',k:/欢喜/.test(t)?'happy':(/迟疑/.test(t)?'hesitate':'curious')};
    if(/^(继续|下一笔|往前|往下|下一步|推进)/.test(t))return {act:'next'};
    if(/^(收卷|报告|合卷|看报告)/.test(t))return {act:'scroll'};
    if(/^(续卷|再续|下一卷)/.test(t))return {act:'contvol'};
    if(/^(终章|结局|收束)/.test(t))return {act:'epilogue'};
    if(/^(更迭|换朝|下一朝)/.test(t))return {act:'nextdyn'};
    for(let i=0;i<TABMAP.length;i++){
      const nm=TABMAP[i][0];
      if(t===nm)return {act:'tab',t:TABMAP[i][1]};
      if(t.length>nm.length&&t.slice(-nm.length)===nm){
        const head=t.slice(0,-nm.length);
        if(/^(打开|切到|进入|转到|去|看|切|到|转)$/.test(head))
          return {act:'tab',t:TABMAP[i][1]};
      }
    }
    if(/^(朗读|读一遍|读当前|读屏幕|念一遍|读页面)/.test(t))return {act:'read'};
    /* 「停止语音」要先于「停」判断，否则会被当成停读 */
    if(/^(停止语音|关闭语音|别听了|语音关)/.test(t))return {act:'voice',v:false};
    if(/^(停|停止|别读|别念|安静|闭嘴)/.test(t))return {act:'stop'};
    if(/^(开音效|音效开)/.test(t))return {act:'sfx',v:true};
    if(/^(关音效|音效关)/.test(t))return {act:'sfx',v:false};
    if(/^(开背景|背景开|开配乐|配乐开)/.test(t))return {act:'bgm',v:true};
    if(/^(关背景|背景关|关配乐|配乐关)/.test(t))return {act:'bgm',v:false};
    if(/^(静音|全部静音|关声音|声音关)/.test(t))return {act:'mute'};
    if(/^(开声音|声音开|取消静音)/.test(t))return {act:'unmute'};
    if(/^(停止语音|关闭语音|别听了|语音关)/.test(t))return {act:'voice',v:false};
    if(/^(帮助|怎么用|命令|说明)/.test(t))return {act:'help'};
    return null;
  }
  function click(sel){
    if(!hasDoc())return false;
    const e=document.querySelector(sel);
    if(!e)return false;
    try{e.click();return true;}catch(e2){return false;}
  }
  const HELP='可用说法：选一／选二／第三个；继续；收卷；续卷；去族谱／文明／舆地／设置；朗读；念这句（角色音色）；好奇／欢喜／迟疑（语气音）；停；开音效／关背景；静音；停止语音。键盘：数字 1 到 9 选项，回车继续，左右键切页签，R 朗读，S 停读，V 语音开关，M 静音。';
  function exec(cmd){
    if(!cmd)return false;
    const A=W.audio;
    let ok=false,msg='';
    const act=a=>{ok=click('.panel.on [data-act="'+a+'"]')||click('[data-act="'+a+'"]');};
    switch(cmd.act){
      case 'choose':
        ok=click('.panel.on [data-i="'+String(cmd.i-1)+'"]');
        msg=ok?'已选第 '+cmd.i+' 项':'当前没有第 '+cmd.i+' 个选项';break;
      case 'next':act('next');msg=ok?'继续推演':'这一帧没有继续按钮';break;
      case 'scroll':act('scroll');msg=ok?'打开收卷报告':'这一帧没有收卷按钮';break;
      case 'contvol':act('contvol');msg=ok?'续下一卷':'这一帧没有续卷按钮';break;
      case 'epilogue':act('epilogue');msg=ok?'进入终章':'这一帧没有终章按钮';break;
      case 'nextdyn':act('nextdyn');msg=ok?'下一朝':'这一帧没有更迭按钮';break;
      case 'tab':
        ok=click('[data-t="'+cmd.t+'"]');msg=ok?'已切到该页签':'没找到这个页签';break;
      case 'read':
        if(cfg.read||ttsBusy){
          stopSpeak();set('read',false);set('autoRead',false);
          ok=true;msg='已停止朗读';
        }else{
          set('read',true);ok=readScreen();msg=ok?'开始朗读':'此浏览器不支持朗读';
        }
        break;
      case 'guideSay':
        ok=!!(W.stage&&W.stage.speakLine&&W.stage.speakLine());
        msg=ok?'用角色音色念这一句':'此浏览器暂不支持语音朗读';break;
      case 'guideCue':
        ok=!!(W.stage&&W.stage.guideCue&&W.stage.guideCue(cmd.k));
        msg=ok?'已响一声语气音':'此浏览器暂不支持合成音';break;
      case 'stop':stopSpeak();ok=true;msg='已停止朗读';break;
      case 'sfx':if(A){A.set('sfx',cmd.v);ok=true;}msg='音效'+(cmd.v?'已开':'已关');break;
      case 'bgm':if(A){A.set('bgm',cmd.v);ok=true;}msg='背景音'+(cmd.v?'已开':'已关');break;
      case 'mute':if(A){A.set('on',false);ok=true;}msg='已全部静音';break;
      case 'unmute':if(A){A.set('on',true);ok=true;}msg='声音已开';break;
      case 'voice':set('voice',!!cmd.v);ok=true;msg='语音控制'+(cmd.v?'已开':'已关');break;
      case 'help':announce(HELP);if(cfg.read&&hasTTS())speak(HELP,{rate:1.05});
        ok=true;msg='';break;   /* 别让通用短消息覆盖完整用法播报 */
      default:return false;
    }
    if(msg){announce(msg);if(cfg.read&&cmd.act!=='read'&&cmd.act!=='help')speak(msg,{rate:1.05});}
    if(hooks.onCommand)hooks.onCommand(cmd,ok);
    return ok;
  }

  /* ---------- 语音识别 ---------- */
  function stopRec(){
    recWanted=false;
    if(rec){try{rec.onend=null;rec.stop();}catch(e){}rec=null;}
    announce('语音控制已关闭，麦克风已停止');
  }
  function startRec(){
    const C=SR();if(!C){announce('此浏览器或本地文件环境不提供语音识别，可用键盘操作');return false;}
    try{
      if(rec){try{rec.stop();}catch(e){}}
      rec=new C();rec.lang='zh-CN';rec.continuous=true;rec.interimResults=false;
      rec.maxAlternatives=1;recWanted=true;
      rec.onresult=function(ev){
        for(let i=ev.resultIndex;i<ev.results.length;i++){
          if(!ev.results[i].isFinal)continue;
          const said=ev.results[i][0].transcript||'';
          const cmd=parseCommand(said);
          if(cmd)exec(cmd);
          else announce('没听懂：'+said+'。可以说「帮助」听用法');
        }
      };
      rec.onerror=function(ev){
        if(ev&&ev.error==='not-allowed'){stopRec();announce('麦克风权限被拒绝，已关闭语音控制');}
      };
      rec.onend=function(){
        if(recWanted){try{setTimeout(()=>{if(recWanted&&rec)rec.start();},350);}catch(e){}}
      };
      rec.start();announce('语音控制已开启，可以说「选一」「继续」「收卷」「帮助」');
      return true;
    }catch(e){rec=null;recWanted=false;announce('语音控制启动失败，可用键盘操作');return false;}
  }

  /* ---------- 键盘：读屏与运动不便时不必摸按钮 ---------- */
  function onKey(ev){
    if(!hasDoc()||!mounted)return;
    const k=ev.key,t=ev.target||{},tag=(t.tagName||'').toUpperCase();
    if(tag==='INPUT'||tag==='SELECT'||tag==='TEXTAREA'||t.isContentEditable)return;
    if(ev.ctrlKey||ev.metaKey||ev.altKey)return;
    let c=null;
    if(/^[1-9]$/.test(k))c={act:'choose',i:+k};
    else if(k==='Enter'||k===' ')c={act:'next'};
    else if(k==='ArrowRight'||k==='ArrowLeft'){
      const tabs=Array.prototype.slice.call(document.querySelectorAll('.tabs button'));
      const cur=tabs.findIndex(b=>b.classList.contains('on'));
      if(tabs.length){
        const nx=cur<0?0:(cur+(k==='ArrowRight'?1:tabs.length-1))%tabs.length;
        tabs[nx].click();announce('切到 '+clean(tabs[nx].textContent));
      }
      ev.preventDefault();return;
    }
    else if(k==='r'||k==='R')c={act:'read'};
    else if(k==='s'||k==='S')c={act:'stop'};
    else if(k==='v'||k==='V')c={act:'voice',v:!cfg.voice};
    else if(k==='m'||k==='M')c={act:'mute'};
    else if(k==='?'||k==='h'||k==='H')c={act:'help'};
    if(!c)return;
    ev.preventDefault();
    /* 回车若本帧没有「继续」，退而点续卷／收卷，避免空按 */
    if(c.act==='next'&&!document.querySelector('.panel.on [data-act="next"]')){
      const alt=['contvol','nextdyn','realend-cont','scroll-final'].filter(a=>
        document.querySelector('.panel.on [data-act="'+a+'"]'))[0];
      if(alt)c={act:alt==='contvol'?'contvol':alt==='nextdyn'?'nextdyn':'epilogue'};
    }
    lastKey=k;exec(c);
  }
  function mount(h){
    hooks=h||{};
    if(!hasDoc()||mounted)return;
    mounted=true;
    document.addEventListener('keydown',onKey);
    /* 不在加载时自动申请麦克风：必须由用户主动点开，权限才说得清 */
    if(cfg.voice)cfg.voice=false,save();
    announce('已就绪。按问号键可听键盘与语音用法');
  }
  /* render 后：自动朗读新的一笔（只在笔数／阶段变化时触发，不重复念） */
  let lastRenderKey='';
  function onRender(S){
    if(!mounted)return;
    const key=S?(S.turn+'|'+S.phase+'|'+(S.vol?S.vol.n:1)):'start';
    if(cfg.autoRead&&cfg.read&&hasTTS()&&key!==lastRenderKey){
      lastRenderKey=key;
      setTimeout(()=>readScreen('brief'),80);
    }
  }
  function set(k,v){
    if(!(k in DEF))return false;
    cfg[k]=v;save();
    if(k==='read'&&!v)stopSpeak();
    if(k==='voice'){
      if(v)startRec();else stopRec();
    }
    return true;
  }
  function status(){
    return {read:!!cfg.read,autoRead:!!cfg.autoRead,voice:!!cfg.voice,
      speaking:!!ttsBusy,
      rate:cfg.rate,verbosity:cfg.verbosity,tts:hasTTS(),voiceApi:hasVoice(),
      listening:!!(rec&&recWanted),mounted:mounted,ttsVoices:voiceInfo(),
      voicePack:voicePack,voicePackName:pack().name,talkAct:talkAct};
  }
  W.a11y={set:set,status:status,config:()=>Object.assign({},cfg),
    voicePacks:PACKS,pack:pack,setVoicePack:setVoicePack,
    setTalkAct:setTalkAct,talkAct:()=>talkAct,
    speak:speak,speakAs:speakAs,guideVoices:guideVoices,toggleSpeak:toggleSpeak,
    stopSpeak:stopSpeak,readScreen:readScreen,screenText:screenText,
    parseCommand:parseCommand,exec:exec,mount:mount,onRender:onRender,
    announce:announce,startRec:startRec,stopRec:stopRec,help:HELP,
    keys:'1-9 选项 · 回车继续 · 左右键切页签 · R 朗读 · S 停读 · V 语音 · M 静音 · ? 帮助',
    commands:'选一／选二／第三个；继续；收卷；续卷；去族谱／文明／舆地／设置；朗读；念这句；好奇／欢喜／迟疑；停；开音效／关背景；静音；停止语音；帮助',
    privacy:'语音识别用浏览器原生接口，不上传、不录音、不保存；关闭即停止麦克风。朗读与角色音色都走浏览器系统语音，不联网、不打包音频文件、不写入存档与分享串；不同设备音色不同。',
    disclaimer:'朗读与语音控制是辅助功能，不是史实内容；语音识别在浏览器不支持或本地文件限制时会自动降级，键盘操作始终可用。'};
  if(typeof module!=='undefined'&&module.exports)module.exports=W.a11y;
})((typeof window!=='undefined'?window:globalThis).WQN=((typeof window!=='undefined'?window:globalThis).WQN||{}));
