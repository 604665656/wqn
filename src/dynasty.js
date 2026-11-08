/* dynasty.js —— 帝王全册与世家全册：同期匹配、所见记录、统计与边界读法
   数据来源：data/rulers.json（397 位君主）、data/houses.json（97 家名族）、
             data/house_entities.json（20 家可代入）
   纪律：帝王只作「某政权某时在位」的同期锚点；世家只作「某时段活跃」的
        并立参照。两者都不改写史实、不与本局推演族人攀附血缘、不把并立
        政权排成前后相续的单线。传说层不进同期依据池。 */
(function(W){
  'use strict';
  const D=W.data;
  const R=D.rulers||{rulers:[],notes:[],titles:[]},H=D.houses||{houses:[],notes:[]};
  const ALL_R=R.rulers||[],ALL_H=H.houses||[];
  const LAYER_LABEL={fact:'可考锚点',disputed:'存疑层',legend:'传说／后世追述'};
  const CONS_LABEL={settled:'学界通说',date_contested:'断代有争议',legend:'传说层'};

  /* 考据档只接纳可考且不争议；兼容档允许存疑但标出；狂想档也不放传说进同期卡 */
  function allowed(S,x){
    if(x.layer==='legend')return false;
    const tier=W.reality&&W.reality.tier?W.reality.tier(S.reality||'balanced'):null;
    if(tier&&tier.key==='strict'&&x.consensus!=='settled')return false;
    return true;
  }
  const inWindow=(x,y,pad)=>y>=(x.y0-(pad||0))&&y<=(x.y1+(pad||0));

  /* 同期在位：本圈优先，另补一条「远闻」；同一政权同年多人时只取窗口最贴合的 */
  function rulersAt(S,limit){
    const y=S.year,reg=S.reg,n=limit||2;
    /* ±40 年容差：帝王在位年多为约略区间，略放宽才能稳定给出同期锚点 */
    const near=ALL_R.filter(x=>x.region===reg&&inWindow(x,y,40)&&allowed(S,x));
    const far=ALL_R.filter(x=>x.region!==reg&&inWindow(x,y,40)&&allowed(S,x));
    near.sort((a,b)=>(b.y0-a.y0)||(a.y1-b.y1));
    far.sort((a,b)=>(b.y0-a.y0)||(a.y1-b.y1));
    return {near:near.slice(0,n),far:far.slice(0,1)};
  }
  /* 同期名族：世家时段跨度很大，用 ±60 年容差，避免一条都不出现 */
  function housesAt(S,limit){
    const y=S.year,reg=S.reg,n=limit||2;
    const near=ALL_H.filter(x=>x.region===reg&&inWindow(x,y,60));
    const far=ALL_H.filter(x=>x.region!==reg&&inWindow(x,y,60));
    near.sort((a,b)=>Math.abs(a.peak-y)-Math.abs(b.peak-y));
    far.sort((a,b)=>Math.abs(a.peak-y)-Math.abs(b.peak-y));
    return {near:near.slice(0,n),far:far.slice(0,1)};
  }
  /* 某一政权（如朝代长河的「姬周」）在位君主的首尾锚点，供更迭卡用 */
  function polityRulers(name){
    const list=ALL_R.filter(x=>x.polity.indexOf(name)>=0||name.indexOf(x.polity)>=0);
    if(!list.length)return [];
    const withY=list.filter(x=>typeof x.y0==='number'&&x.layer!=='legend');
    if(!withY.length)return [];
    const a=withY.reduce((p,c)=>c.y0<p.y0?c:p,withY[0]);
    const b=withY.reduce((p,c)=>c.y1>p.y1?c:p,withY[0]);
    return a.id===b.id?[a]:[a,b];
  }
  /* 每笔落定时记录所见；返回要插进结果卡的两行文本 */
  function record(S){
    S.seenRuler=S.seenRuler||{};S.seenHouse=S.seenHouse||{};
    const out=[];
    const rs=rulersAt(S),hs=housesAt(S);
    /* 一位帝王在位常跨多笔、一家名族活跃常跨数百年。若每笔都写一张同期卡，
       编年会被重复卡刷满、结果卡也会一次塞五六行。只输出「首次遇见」，
       每笔至多 1 位 + 1 家；已见者仍算同期，但不再重复落笔。 */
    const rc=rs.near.concat(rs.far),hc=hs.near.concat(hs.far);
    const r=rc.find(x=>!S.seenRuler[x.id]);
    if(r){
      const isFar=rs.far.indexOf(r)>=0;
      S.seenRuler[r.id]=1;
      out.push('【'+(isFar?'远闻 · ':'')+'同期在位】'+r.name+'（'+r.title+' · '+r.polity
        +' · '+r.rawYear+'）'+(r.consensus!=='settled'?'〔'+CONS_LABEL[r.consensus]+'〕':'')
        +'。仅记同期，不表示本局族人受其统治或与之有往来。');
    }
    const h=hc.find(x=>!S.seenHouse[x.id]);
    if(h){
      const isFar=hs.far.indexOf(h)>=0;
      S.seenHouse[h.id]=1;
      out.push('【'+(isFar?'远闻 · ':'')+'同期名族】'+h.name
        +(h.alias?'（'+h.alias+'）':'')+' · '+h.category+' · '+h.rawYear
        +'。地望是社会身份标签，不作血统凭证；与本局推演族人无谱牒关系。');
    }
    return out;
  }
  function summary(S){
    return {
      rulers:Object.keys(S.seenRuler||{}).length,rulerTotal:ALL_R.length,
      houses:Object.keys(S.seenHouse||{}).length,houseTotal:ALL_H.length,
      seenRulers:ALL_R.filter(x=>(S.seenRuler||{})[x.id]),
      seenHouses:ALL_H.filter(x=>(S.seenHouse||{})[x.id])
    };
  }
  /* 按组分桶，供全册折叠懒加载 */
  function rulerGroups(){
    const g={};ALL_R.forEach(x=>{(g[x.polity]=g[x.polity]||[]).push(x);});return g;
  }
  function houseGroups(){
    const g={};ALL_H.forEach(x=>{(g[x.category]=g[x.category]||[]).push(x);});return g;
  }
  /* v1.0 帝王在位时间条：按政权给出可画区间，并把继立／层位异常分色。
     只画「某政权某时段在位」，不把并立政权排成前后相续。 */
  function timelineCat(x){
    const t=(x.succession||'')+(x.note||'');
    if(x.layer==='legend'||x.consensus==='legend')return 'legend';
    if(x.layer==='disputed')return 'disputed';
    if(/摄政|称制|听政|临朝|共治|共和|傀儡|并立|流亡/.test(t))return 'regency';
    if(/被废|被弑|禅让|内禅|复辟|篡立|短期|两度|退位|自缢/.test(t))return 'broken';
    if(/旁支|入继|养子|过继|推举|忽里勒台|指定|拥立/.test(t))return 'collateral';
    return 'normal';
  }
  const TL_LABEL={legend:'传说／后世追述',disputed:'存疑层',regency:'摄政·共治·并立',
    broken:'废立·内禅·复辟',collateral:'旁支·推举·过继',normal:'可考在位'};
  function timelineData(polity){
    const list=ALL_R.filter(x=>x.polity===polity);
    if(!list.length)return null;
    const withY=list.filter(x=>typeof x.y0==='number');
    if(!withY.length)return null;
    const y0=Math.min.apply(null,withY.map(x=>x.y0));
    const y1=Math.max.apply(null,withY.map(x=>x.y1));
    return {polity:polity,from:y0,to:y1,
      rows:list.slice().sort((a,b)=>(a.y0||0)-(b.y0||0)).map(x=>({
        id:x.id,name:x.name,title:x.title,y0:x.y0,y1:x.y1,raw:x.rawYear,
        cat:timelineCat(x),succ:x.succession||'',note:x.note||''})),
      label:TL_LABEL};
  }
  function polityNames(){
    const seen={};ALL_R.forEach(x=>{seen[x.polity]=1;});return Object.keys(seen);
  }
  W.dynasty={ALL_R:ALL_R,ALL_H:ALL_H,R:R,H:H,
    timelineData:timelineData,timelineCat:timelineCat,TL_LABEL:TL_LABEL,
    polityNames:polityNames,
    LAYER_LABEL:LAYER_LABEL,CONS_LABEL:CONS_LABEL,
    rulersAt:rulersAt,housesAt:housesAt,polityRulers:polityRulers,
    record:record,summary:summary,rulerGroups:rulerGroups,houseGroups:houseGroups};
  if(typeof module!=='undefined'&&module.exports)module.exports=W.dynasty;
})((typeof window!=='undefined'?window:globalThis).WQN=((typeof window!=='undefined'?window:globalThis).WQN||{}));
