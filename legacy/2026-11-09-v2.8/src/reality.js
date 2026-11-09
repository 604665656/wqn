/* reality.js —— 真实性档位、玩法模式、时长与分层纪律
   核心原则：史实不可改；趣味来自抉择后果、收集、判读、家族命运与对照局，
            不来自把野史／假说伪装成历史。 */
(function(W){
  'use strict';
  const D=W.data;

  const LAYERS={
    fact:{name:'史实',color:'gold',desc:'有出处支撑的可考条目'},
    text:{name:'文本传统',color:'blue',desc:'野史、笔记、演义、小说：文本真实存在，但内容不等于史实'},
    hypothesis:{name:'未证实假说',color:'red',desc:'无考古／文献／可重复证据支持；纯虚构推演素材'},
    prehistory:{name:'史前可考',color:'green',desc:'有考古证据的史前人类活动'},
    fiction:{name:'虚构推演',color:'dim',desc:'程序化生成的游戏情境'}
  };

  const TIERS=[
    {key:'strict',name:'考据档',short:'考据',
      desc:'只进学界通说、有明确纪年或区间的史实；断代争议与传说层不进事件池。气候现象照常抵达，但不作社会归因。',
      allow:{fact:'settled',text:false,hypothesis:false},
      note:'最贴近「尽可能还原」。你会错过不少有意思的传说，但不会读到假的东西。'},
    {key:'balanced',name:'兼容档',short:'兼容',
      desc:'史实全开（争议与传说单独标注），野史小说以「文学文本·非史实」入池；未证实假说仍关闭。',
      allow:{fact:'all',text:true,hypothesis:false},
      note:'默认档。传说可「辨其传说」，小说可读不可信，史实仍不改写。'},
    {key:'wild',name:'狂想档',short:'狂想',
      desc:'额外开放史前超文明、古代宇航员等未证实假说，全部以红色醒目标「无证据·虚构推演」。',
      allow:{fact:'all',text:true,hypothesis:true},
      note:'明确是玩，不是学史。每张假说卡都写清学界地位与证据状况。'}
  ];
  const MODES=[
    {key:'chronicle',name:'编年',desc:'标准推进：史实与推演交织，卷末汇流，终章收卷',
      hist:1,clim:1,text:1,pressure:1,score:1},
    {key:'quiz',name:'考据',desc:'史实与文本传统密度翻倍，考据判读计分翻倍，专练辨伪与断代',
      hist:1.7,clim:.7,text:1.6,pressure:.7,score:1.8,quizBoost:true},
    {key:'collect',name:'鉴宝',desc:'文明条目与鉴宝卡高频出现，以收集完成度为主轴',
      hist:.8,clim:.6,text:1.2,pressure:.7,score:1.2,collectBoost:true},
    {key:'survive',name:'存续',desc:'地理气候压力翻倍，仓廪与族和衰减加快，家族求生',
      hist:.9,clim:2.1,text:.5,pressure:1.9,score:1.3,survive:true},
    {key:'sandbox',name:'沙盒',desc:'史实节点锁定不可改写，自由推演家族与分支，弱化终章',
      hist:1.2,clim:.8,text:1,pressure:.6,score:1,sandbox:true}
  ];
  const LENGTHS=[
    {key:'short',name:'短局',vol:4,maxVol:2,desc:'4 笔一卷，2 卷即收卷，约 8 笔一局'},
    {key:'standard',name:'标准',vol:12,maxVol:0,desc:'12 笔一卷，达成条件出终章'},
    {key:'long',name:'长卷',vol:12,maxVol:0,desc:'12 笔一卷，优先朝代长河连走六朝'},
    {key:'endless',name:'无尽',vol:12,maxVol:0,desc:'12 笔一卷，不触发随机终章，一直点下去'}
  ];
  const DENSITIES=[
    {key:0,name:'清淡',desc:'推演情境为主，史实点缀',w:.45},
    {key:1,name:'均衡',desc:'史实与推演各半',w:1},
    {key:2,name:'密集',desc:'史实为主，密集遇见可考条目',w:1.7},
    {key:3,name:'编年史',desc:'几乎每笔都是可考条目',w:2.6}
  ];
  const tier=k=>TIERS.find(x=>x.key===k)||TIERS[1];
  const mode=k=>MODES.find(x=>x.key===k)||MODES[0];
  const length=k=>LENGTHS.find(x=>x.key===k)||LENGTHS[1];
  const density=k=>DENSITIES[k]||DENSITIES[1];

  /* 档位过滤：一条文明／文本／假说能否进候选池 */
  function allowsFact(t,x){
    if(t.allow.fact==='settled')
      return x.consensus==='settled'&&x.precision!=='legendary'&&!x.ancient;
    return true;
  }
  function allows(t,layer,x){
    if(layer==='fact')return allowsFact(t,x);
    if(layer==='text')return !!t.allow.text;
    if(layer==='hypothesis')return !!t.allow.hypothesis;
    if(layer==='prehistory')return true;      // 序章展示，不进池
    return false;
  }
  function label(layer){return LAYERS[layer]||LAYERS.fiction;}
  /* 每档的醒目横幅文案 */
  function banner(S){
    const t=tier(S.reality),m=mode(S.modeKey),l=length(S.lengthKey);
    return t.name+' · '+m.name+' · '+l.name;
  }
  function disclaimer(S){
    const t=tier(S.reality);
    let s=t.note;
    if(t.key==='wild')s+=' 【本档含明确标注的未证实假说，不是史实】';
    return s;
  }
  W.reality={LAYERS:LAYERS,TIERS:TIERS,MODES:MODES,LENGTHS:LENGTHS,DENSITIES:DENSITIES,
    tier:tier,mode:mode,length:length,density:density,allows:allows,allowsFact:allowsFact,
    label:label,banner:banner,disclaimer:disclaimer};
  if(typeof module!=='undefined'&&module.exports)module.exports=W.reality;
})((typeof window!=='undefined'?window:globalThis).WQN=((typeof window!=='undefined'?window:globalThis).WQN||{}));
