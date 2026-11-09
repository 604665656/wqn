/* civilization.js —— 文明维度系统（20 维）
   数据：data/civilization.json（563 条考据条目 + 12 鉴宝卡 + 12 人物生平 + 70 条解锁树）
   纪律：条目事实与出处原样呈现；抉择只写回玩家八维，不改写史实。
        术数、神话、早期飞行意象另附边界声明；传说层可「辨其传说」。 */
(function(W){
  'use strict';
  const D=W.data;
  const C=D.civilization;
  const PRECISION_LABEL={exact:'有明确纪年',range:'年代区间',approximate:'约略年代',legendary:'传说或后世追述'};
  const CONSENSUS_LABEL={settled:'学界通说',date_contested:'断代有争议',legendary_retroactive:'传说／后世追述'};
  const RANK_LABEL={'机构／学术':'机构／学术','百科／媒体':'百科／媒体','其他':'其他',undefined:'出处'};

  const byId={};C.items.forEach(x=>byId[x.id]=x);
  const dimByKey={};C.dimensions.forEach(d=>dimByKey[d.key]=d);
  const unlockBy={};C.unlocks.forEach(u=>unlockBy[u.id]=u);
  const treasureBy={};C.treasures.forEach(t=>treasureBy[t.id]=t);
  /* 人物生平：按姓名宽松匹配到条目 id */
  const bioByItem={};
  C.biographies.forEach(b=>{
    const hit=C.items.find(x=>x.title.indexOf(b.name)>=0)||C.items.find(x=>b.name.indexOf(x.title)>=0);
    bioByItem[hit?hit.id:b.id]=b;
  });

  function hostOf(u){
    try{return String(u).replace(/^https?:\/\//,'').split('/')[0].replace(/^www\./,'');}
    catch(e){return '出处见文明页';}
  }
  function itemById(id){return byId[id]||null;}
  function dimensionOf(key){return dimByKey[key]||null;}

  /* 八维写回：维度主属性 + 门类微调 */
  function effect(item){
    const e={},c=item.category||'',d=dimByKey[item.dim];
    const add=(k,v)=>{e[k]=(e[k]||0)+v;};
    add(d?d.stat:'lore',5);
    if(/农业|水利|农具|耕作|灌溉|作物|驯化|食物|酿造/.test(c))add('food',4);
    else if(/冶金|机械|动力|交通|航海|造船|建筑|材料|合金|釉|火药|飞行|航空/.test(c)){add('craft',2);add('wealth',2);}
    else if(/天文|历法|医学|数学|记数|几何|代数|测算|断代|测年/.test(c))add('lore',3);
    else if(/宗教|信仰|祭祀|神话|创世|经典/.test(c))add('faith',3);
    else if(/货币|账簿|契约|经营|字号|市集|拍卖|典当|广告|贸易|商路/.test(c)){add('wealth',3);add('craft',1);}
    else if(/兵|军|阵|城防|甲|弩|火器|水师/.test(c))add('might',4);
    else if(/乐|律|音|谱|画|塑|书|陶|瓷|玉|石刻|写本|鉴|藏/.test(c))add('cohesion',3);
    else if(/法|律令|刑|判|条约|宪/.test(c)){add('cohesion',3);add('lore',1);}
    else add('cohesion',2);
    return e;
  }

  /* 解锁：前置条目必须已见过（引用不存在的前置视为满足，避免卡死） */
  function unlocked(x,seen,year){
    const u=unlockBy[x.id];
    if(!u||!u.requires.length)return true;
    return u.requires.every(r=>{
      const p=byId[r];
      if(!p)return true;                       // 引用不存在，不卡死
      if(p.y1>x.y0)return true;                // 数据里前置晚于目标，视为无效依赖
      return !!seen[r]||year>=p.y1;            // 已见过，或前置年代已过
    });
  }
  function unlockInfo(x){
    const u=unlockBy[x.id];
    return u&&u.requires.length?{requires:u.requires,note:u.note}:null;
  }
  function candidates(S){
    const y=S.year,seen=S.seenCiv||{},t=W.reality.tier(S.reality);
    const m=W.reality.mode(S.modeKey),dens=W.reality.density(S.density).w;
    return C.items.filter(x=>!seen[x.id]&&!x.displayOnly&&y>=x.y0&&y<=x.y1
        &&unlocked(x,seen,y)&&W.reality.allows(t,x.layer||'fact',x))
      .map(x=>({item:x,near:x.region===S.reg,
        weight:(x.region===S.reg?3:1)*(x.precision==='legendary'?.35:1)*dens
          *(m.collectBoost?1.5:1)*(x.ancient?.6:1)}));
  }
  function pick(S,rnd){
    const cs=candidates(S);
    if(!cs.length)return null;
    let total=cs.reduce((a,b)=>a+b.weight,0),r=rnd()*total,ch=cs[cs.length-1];
    for(const c of cs){r-=c.weight;if(r<=0){ch=c;break;}}
    return ch;
  }
  /* 传说层玩法：给出「辨其传说」的第三选项，选对才算读懂史料 */
  function quiz(item){
    if(item.precision!=='legendary'&&item.consensus!=='legendary_retroactive')return null;
    return {q:'这一条应归为哪一类？',
      a:'传说或后世追述',
      wrong:['有明确纪年的确证史实','断代有争议但可考'],
      reward:{lore:5,cohesion:2}};
  }
  function wrap(ch){
    const x=ch.item;
    const hosts=[...new Set(x.sources.map(s=>hostOf(s.url)))];
    const ranks=[...new Set(x.sources.map(s=>RANK_LABEL[s.rank]||'出处'))];
    const dim=dimByKey[x.dim];
    let note='【'+x.status+' · '+PRECISION_LABEL[x.precision]+'】'
      +x.dimName+'／'+x.category+' · '+x.rawYear+'。'
      +'出处：'+(hosts.slice(0,2).join('、')||'见文明页')
      +(x.sources.length>2?' 等 '+x.sources.length+' 条':'')
      +'（'+ranks.join('／')+'；完整引文见文明页）。';
    if(x.boundary)note+=' '+x.boundary;
    const u=unlockInfo(x);
    if(u)note+=' 前置：'+u.requires.map(r=>byId[r]?byId[r].title:r).join('、')+'。'+u.note;
    note+=' 以下抉择为游戏推演，不改变史实。';
    const o=[
      ['取其法，录于册',effect(x)],
      ['只记其事，不轻改旧例',{lore:3,cohesion:2}]
    ];
    const q=quiz(x);
    if(q){
      o.push(['辨其传说：'+q.q+' → '+q.a,Object.assign({},q.reward,{_quiz:true,_correct:true})]);
      o.push(['断为确证史实',{lore:-2,_quiz:true,_correct:false}]);
    }
    const bio=bioByItem[x.id],tre=treasureBy[x.id];
    return {
      t:x.title,x:x.summary,note:note,
      src:(ch.near?'史实 · ':'远闻 · ')+(dim?dim.badge:x.dimName)+'／'+x.category,
      isHist:true,isCiv:true,civMeta:x,
      quiz:q,bio:bio||null,treasure:tre||null,
      o:o.slice(0,4)
    };
  }
  function progress(S){
    const seen=S.seenCiv||{};
    return C.dimensions.map(d=>{
      const total=C.items.filter(x=>x.dim===d.key).length;
      const got=C.items.filter(x=>x.dim===d.key&&seen[x.id]).length;
      return {key:d.key,name:d.name,badge:d.badge,desc:d.desc,seen:got,total:total,
        rate:total?Math.round(got/total*100):0};
    });
  }
  function seenItems(S,dimKey){
    const seen=S.seenCiv||{};
    return C.items.filter(x=>seen[x.id]&&(!dimKey||x.dim===dimKey));
  }
  function lens(S){
    const p=S.personLens?itemById(S.personLens):null;
    if(!p)return null;
    const b=bioByItem[p.id];
    return '此时，'+p.title+'（'+p.category+'，'+(b?b.active:p.rawYear)+'）正在这一段的年月里。'
      +(b?'身后：'+b.legacy.slice(0,26)+'……':'')+' 旧例里也留着你们自己走过的人。';
  }
  function sourcesOf(x){return x.sources||[];}
  W.civilization={PRECISION_LABEL:PRECISION_LABEL,CONSENSUS_LABEL:CONSENSUS_LABEL,
    RANK_LABEL:RANK_LABEL,itemById:itemById,dimensionOf:dimensionOf,
    effect:effect,unlocked:unlocked,unlockInfo:unlockInfo,
    candidates:candidates,pick:pick,wrap:wrap,quiz:quiz,
    progress:progress,seenItems:seenItems,lens:lens,hostOf:hostOf,
    sourcesOf:sourcesOf,byId:byId,dimByKey:dimByKey,treasureBy:treasureBy,bioByItem:bioByItem};
  if(typeof module!=='undefined'&&module.exports)module.exports=W.civilization;
})((typeof window!=='undefined'?window:globalThis).WQN=((typeof window!=='undefined'?window:globalThis).WQN||{}));
