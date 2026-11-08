/* audio.js —— 离线实时合成音乐与音效（Web Audio，零音频文件、零网络）
   纪律：调式只是常见的音阶组织方式，用于氛围；不宣称是历史曲目、
        礼制用乐、乐律制度或考古复原录音。默认静音，音效与背景音可分别开关。
   确定性：旋律与环境音参数由固定散列生成，不调用游戏主随机数，
        不写入存档、不参与分享串，同种子仍逐笔可复盘。 */
(function(W){
  'use strict';
  const D=W.data,M=D.music||{},SCALES=M.scales||[],BEDS=M.beds||[],
        CUES=M.cues||{},SCORES=M.scores||{},DEFR=M.regionDefaults||{},
        DEFE=M.eraDefaults||{},ER=(D.art&&D.art.eras)||[];
  const KEY='wqn.audio.v1';
  /* v1.3：音效（短音）与背景音（底噪＋曲目）两路独立。
     on 是派生状态：两路都关即全静音，不再单独存一个可写的主开关语义。 */
  const DEF={on:false,sfx:false,bgm:false,
    volume:M.volumeDefault===undefined?0.45:M.volumeDefault,
    scale:'auto',bed:'auto',score:'auto'};
  let cfg=load(),ctx=null,master=null,bedNodes=[],bedTimer=null,
      scoreTimer=null,scoreStep=0,hidden=false,lastCue='',curWeather='sun';

  function load(){
    let o={};
    try{
      const raw=globalThis.localStorage&&globalThis.localStorage.getItem(KEY);
      if(raw)o=JSON.parse(raw)||{};
    }catch(e){}
    const c=Object.assign({},DEF,o);
    /* 旧配置只有 on：按原状态迁移，保持「原本静音就仍静音」 */
    if(!('sfx' in o)&&!('bgm' in o))c.sfx=c.bgm=!!c.on;
    c.on=!!(c.sfx||c.bgm);
    return c;
  }
  function syncOn(){cfg.on=!!(cfg.sfx||cfg.bgm);}
  function save(){
    try{if(globalThis.localStorage)globalThis.localStorage.setItem(KEY,JSON.stringify(cfg));}
    catch(e){}
  }
  function hash(s){
    let h=0x811c9dc5;const t=String(s);
    for(let i=0;i<t.length;i++){h^=t.charCodeAt(i);h=(h*0x01000193)>>>0;}
    return h>>>0;
  }
  function avail(){return !!(globalThis.AudioContext||globalThis.webkitAudioContext);}
  function ensure(){
    if(ctx)return ctx;
    const AC=globalThis.AudioContext||globalThis.webkitAudioContext;
    if(!AC)return null;
    try{
      ctx=new AC();
      master=ctx.createGain();
      master.gain.value=cfg.on?cfg.volume:0;
      master.connect(ctx.destination);
    }catch(e){ctx=null;master=null;}
    return ctx;
  }
  function resume(){
    const c=ensure();if(!c)return false;
    if(c.state==='suspended'){try{c.resume();}catch(e){}}
    return true;
  }
  /* 音量与开关只动 master 节点，不反复创建振荡器 */
  function applyVol(){
    if(!master||!ctx)return;
    const t=ctx.currentTime,v=cfg.on?cfg.volume:0;
    try{master.gain.cancelScheduledValues(t);master.gain.setTargetAtTime(v,t,0.04);}catch(e){}
  }
  function tone(semi,dur,wave,peak,delay,base){
    const c=ensure();if(!c||!cfg.on||hidden)return;
    try{
      const t=c.currentTime+(delay||0),osc=c.createOscillator(),g=c.createGain();
      const f=(base||261.63)*Math.pow(2,(semi||0)/12);
      osc.type=wave||'sine';osc.frequency.setValueAtTime(f,t);
      g.gain.setValueAtTime(0.0001,t);
      g.gain.exponentialRampToValueAtTime(Math.max(0.0002,peak||0.12),t+0.012);
      g.gain.exponentialRampToValueAtTime(0.0001,t+Math.max(0.05,dur||0.2));
      osc.connect(g);g.connect(master);
      osc.start(t);osc.stop(t+Math.max(0.06,dur||0.2)+0.03);
    }catch(e){}
  }
  function cue(name){
    const q=CUES[name];if(!q||!cfg.on||!cfg.sfx||!avail())return;
    lastCue=name||'';
    resume();
    const sc=scale(),base=sc.base||261.63,notes=q.notes||[0],dur=q.dur||0.2;
    notes.forEach((s,i)=>tone(s,dur,q.wave||'sine',(q.gain||0.12)*0.8,i*(dur*0.72),base));
  }
  /* v1.5 非语言语气音：滑音短鸣，不含字词、不假装配音、不联网 */
  function glide(f0,f1,dur,peak,wave,delay){
    if(!ctx||!master)return;
    try{
      const t=ctx.currentTime+(delay||0),osc=ctx.createOscillator(),g=ctx.createGain();
      osc.type=wave||'sine';
      osc.frequency.setValueAtTime(f0,t);
      osc.frequency.exponentialRampToValueAtTime(Math.max(40,f1),t+dur);
      g.gain.setValueAtTime(0.0001,t);
      g.gain.exponentialRampToValueAtTime(Math.max(0.0002,peak||0.06),t+0.02);
      g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
      osc.connect(g);g.connect(master);osc.start(t);osc.stop(t+dur+0.04);
    }catch(e){}
  }
  /* v2.2：六种合成非语言语气音，按声线档整体移调；不含字词，不是配音包 */
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
  }
  function scale(){
    if(cfg.scale&&cfg.scale!=='auto'){
      const f=SCALES.filter(x=>x.key===cfg.scale)[0];if(f)return f;
    }
    return SCALES[0]||{semitones:[0,2,4,7,9],base:261.63};
  }
  function score(){
    if(cfg.score&&cfg.score!=='auto'){
      const f=SCORES.filter(x=>x.key===cfg.score)[0];if(f)return f;
    }
    return SCORES[0]||{scale:'pentatonic',tempo:60,pattern:[0,1,2,3]};
  }
  function bed(){
    if(cfg.bed&&cfg.bed!=='auto'){
      const f=BEDS.filter(x=>x.key===cfg.bed)[0];if(f)return f;
    }
    /* v1.4：底噪设为「自动」时按舞台天气挑环境音，不覆盖玩家手选 */
    const wb=(M.weatherBeds||{})[curWeather];
    if(wb){const f=BEDS.filter(x=>x.key===wb)[0];if(f)return f;}
    return BEDS[1]||BEDS[0]||{type:'none'};
  }
  function setWeather(w){
    if(!w||w===curWeather)return false;
    const old=curWeather;curWeather=w;
    if(cfg.on&&cfg.bgm&&cfg.bed==='auto')startBed();
    return old!==w;
  }
  function autoFor(reg,era){
    const e=ER[era|0]&&ER[era|0].key;
    return {score:(DEFR[reg]||DEFE[e]||'chronicle'),
      scale:(SCORES.filter(x=>x.key===(DEFR[reg]||DEFE[e]))[0]||{}).scale||'auto',
      bed:e==='voyage'||reg==='aegean'?'sea':e==='neolithic'?'fire':
          e==='industry'||e==='modern'?'wind':'wind'};
  }
  function stopBed(){
    if(bedTimer){clearInterval(bedTimer);bedTimer=null;}
    bedNodes.forEach(n=>{try{n.stop?n.stop():n.disconnect&&n.disconnect();}catch(e){}});
    bedNodes=[];
  }
  function noiseBuffer(c){
    const b=c.createBuffer(1,Math.floor(c.sampleRate*2),c.sampleRate),d=b.getChannelData(0);
    let x=hash('wqn-noise')||7;
    for(let i=0;i<d.length;i++){x=(x*1664525+1013904223)>>>0;d[i]=(x/2147483648-1)*0.7;}
    return b;
  }
  function startBed(){
    const c=ensure();if(!c||!cfg.on||!cfg.bgm)return;
    const b=bed();stopBed();
    if(!b||b.type==='none')return;
    try{
      if(b.type==='noise'){
        const src=c.createBufferSource();src.buffer=noiseBuffer(c);src.loop=true;
        const lp=c.createBiquadFilter();lp.type='lowpass';lp.frequency.value=b.cutoff||600;
        const g=c.createGain();g.gain.value=b.gain||0.04;
        const lfo=c.createOscillator(),lg=c.createGain();
        lfo.frequency.value=b.lfo||0.08;lg.gain.value=(b.gain||0.04)*0.55;
        lfo.connect(lg);lg.connect(g.gain);
        src.connect(lp);lp.connect(g);g.connect(master);
        src.start();lfo.start();bedNodes=[src,lfo,lp,g,lg];
      }else if(b.type==='crackle'){
        const g=c.createGain();g.gain.value=0;g.connect(master);bedNodes=[g];
        let i=0;
        bedTimer=setInterval(()=>{
          if(!cfg.on||hidden||!ctx)return;
          i++;const r=(hash('cr'+i)%1000)/1000;
          if(r>0.72)tone(0,0.035,'square',0.028,0,180+r*900);
        },170);
      }else if(b.type==='chirp'){
        /* 晴天鸟鸣：两三个短促滑音一组，间隔疏落，全为合成示意音 */
        const g=c.createGain();g.gain.value=0;g.connect(master);bedNodes=[g];
        let i=0;
        bedTimer=setInterval(()=>{
          if(!cfg.on||hidden||!ctx||!cfg.bgm)return;
          i++;const r=(hash('bd'+i)%1000)/1000;
          if(r>0.58){
            const base=1400+Math.floor(r*900);
            [0,0.09,0.18].forEach((d,k)=>{
              const osc=c.createOscillator(),gg=c.createGain(),t=c.currentTime+d;
              osc.type='sine';osc.frequency.setValueAtTime(base+k*180,t);
              osc.frequency.exponentialRampToValueAtTime(base+k*180+420,t+0.07);
              gg.gain.setValueAtTime(0.0001,t);
              gg.gain.exponentialRampToValueAtTime(0.032,t+0.012);
              gg.gain.exponentialRampToValueAtTime(0.0001,t+0.085);
              osc.connect(gg);gg.connect(master);osc.start(t);osc.stop(t+0.1);
            });
          }
        },620);
      }else{
        const g=c.createGain();g.gain.value=0;g.connect(master);bedNodes=[g];
        let i=0;
        bedTimer=setInterval(()=>{
          if(!cfg.on||hidden||!ctx)return;
          i++;const r=(hash('pu'+i)%1000)/1000;
          if(r>0.62)tone(0,0.10,'sine',0.022,0,120+r*260);
        },340);
      }
    }catch(e){stopBed();}
  }
  function stopScore(){if(scoreTimer){clearInterval(scoreTimer);scoreTimer=null;}scoreStep=0;}
  function startScore(){
    const c=ensure();if(!c||!cfg.on||!cfg.bgm)return;
    const sc=score(),s=scale();stopScore();
    if(!sc||!s)return;
    const beat=Math.max(260,Math.round(60000/(sc.tempo||60)));
    scoreTimer=setInterval(()=>{
      if(!cfg.on||hidden||!ctx)return;
      const p=sc.pattern||[0,1,2,3],semi=s.semitones||[0,2,4,7];
      const k=p[scoreStep%p.length];
      tone(semi[k%semi.length],Math.min(0.65,beat/1000*0.9),'sine',0.055,0,s.base||261.63);
      if(scoreStep%4===0)tone((semi[0]||0)-12,Math.min(1.1,beat/1000*2),'triangle',0.032,0,s.base||261.63);
      scoreStep++;
    },beat);
  }
  function startAll(){
    if(!cfg.on)return false;
    if(!resume())return false;
    applyVol();
    if(cfg.bgm){startBed();startScore();}else{stopBed();stopScore();}
    return true;
  }
  function stopAll(){stopBed();stopScore();}
  function set(k,v){
    if(!(k in DEF))return false;
    /* 总开关保留兼容：开＝两路都开，关＝两路都关 */
    if(k==='on'){
      const on=!!v;
      cfg.sfx=cfg.bgm=on;syncOn();save();
      if(on)startAll();else{stopAll();applyVol();}
      return true;
    }
    if(k==='sfx'||k==='bgm'){
      cfg[k]=!!v;syncOn();save();
      if(!cfg.on){stopAll();applyVol();return true;}
      if(!resume())return true;
      applyVol();
      if(k==='bgm'){
        if(cfg.bgm){startBed();startScore();}else{stopBed();stopScore();}
      }
      /* 只切音效时不重启背景循环；只切背景音时短音开关不受影响 */
      return true;
    }
    cfg[k]=v;save();
    if(k==='volume')applyVol();
    else if(k==='bed'){if(cfg.on&&cfg.bgm)startBed();}
    else if(k==='scale'||k==='score'){if(cfg.on&&cfg.bgm)startScore();}
    return true;
  }
  function status(){
    return {on:!!cfg.on,sfx:!!cfg.sfx,bgm:!!cfg.bgm,
      volume:cfg.volume,scale:cfg.scale,bed:cfg.bed,
      score:cfg.score,available:avail(),ctx:ctx?(ctx.state||'created'):'none',
      lastCue:lastCue,scaleName:scale().name||'',scoreName:score().name||'',
      bedName:bed().name||''};
  }
  function bindVisibility(){
    if(typeof document==='undefined'||!globalThis.addEventListener)return;
    try{
      document.addEventListener('visibilitychange',()=>{
        hidden=!!document.hidden;
        if(!ctx)return;
        if(hidden){try{ctx.suspend();}catch(e){}}
        else if(cfg.on){try{ctx.resume();applyVol();}catch(e){}}
      });
    }catch(e){}
  }
  bindVisibility();

  W.audio={set:set,status:status,cue:cue,start:startAll,stop:stopAll,
    toggle:()=>set('on',!(cfg.sfx||cfg.bgm)),autoFor:autoFor,scales:SCALES,beds:BEDS,
    setWeather:setWeather,getWeather:()=>curWeather,guideCue:guideCue,
    cueMoods:Object.keys((M.guideCues||{})).filter(x=>x!=='type'),
    scores:SCORES,cues:CUES,config:()=>Object.assign({},cfg),
    disclaimer:M.disclaimer||'',note:(M.meta||{}).discipline||''};
  if(typeof module!=='undefined'&&module.exports)module.exports=W.audio;
})((typeof window!=='undefined'?window:globalThis).WQN=((typeof window!=='undefined'?window:globalThis).WQN||{}));
