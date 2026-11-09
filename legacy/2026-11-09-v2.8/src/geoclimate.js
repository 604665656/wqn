/* geoclimate.js —— 真实地理单元与气候变迁
   纪律：气候是「环境压力」，不是「王朝灭亡的原因」。
        卡片固定写明「与社会兴衰的时间相关不等于已证因果」。 */
(function(W){
  'use strict';
  const D=W.data,G=D.geoclimate;
  const CAVEAT='可考的气候／地理现象；与某政权兴衰的时间重合不等于已证因果，卡片不作决定论归因。';

  function unitsOf(region){
    return G.units.filter(u=>u.region===region||u.region==='*');
  }
  function unit(id){return G.units.find(u=>u.id===id)||null;}
  /* 当前年份、当前文明圈能抵达的气候事件；全球事件标「远闻」 */
  function candidates(S,seen){
    const y=S.year,reg=S.reg;
    return G.events.filter(x=>!seen[x.id]&&y>=x.y0&&y<=x.y1)
      .map(x=>({item:x,near:x.regions.indexOf(reg)>=0||x.regions.indexOf('*')>=0}));
  }
  function pick(S,seen,rnd){
    const cs=candidates(S,seen);if(!cs.length)return null;
    const m=W.reality.mode(S.modeKey),w=Math.max(.1,m.clim);
    let total=cs.reduce((a,b)=>a+(b.near?3:1)*w,0),r=rnd()*total,ch=cs[cs.length-1];
    for(const c of cs){r-=(c.near?3:1)*w;if(r<=0){ch=c;break;}}
    return ch;
  }
  /* 气候压力：只改仓廪／族和／人丁／货殖，不直接判定政权终结 */
  function pressure(x,mode){
    const p=mode.pressure||1,e={},c=x.category||'',t=x.title||'';
    const add=(k,v)=>{e[k]=Math.round(v*p);};
    if(/干旱|旱|荒漠|沙漠|盐渍|低水位|泛滥不足/.test(c+t)){add('food',-4);add('people',-1);add('wealth',-1);}
    else if(/洪|涝|水溢|海啸|海平面|改道|决口/.test(c+t)){add('food',-3);add('people',-2);add('cohesion',-1);}
    else if(/冷|冰期|火山|无夏|8\.2/.test(c+t)){add('food',-3);add('faith',1);}
    else if(/暖湿|湿润期|暖期|大暖期/.test(c+t)){add('food',3);add('people',1);}
    else if(/疫病|饥荒|大饥荒/.test(c+t)){add('people',-3);add('cohesion',-2);}
    else if(/变暖|海平面加速/.test(t)){add('food',-1);add('lore',2);}
    else {add('food',-1);add('cohesion',-1);}
    return e;
  }
  function wrap(ch,S){
    const x=ch.item,m=W.reality.mode(S.modeKey),e=pressure(x,m);
    const hosts=[...new Set(x.sources.map(s=>hostOf(s.url)))];
    const note='【气候／地理 · 可考现象】'+x.category+' · '+x.rawYear+'。'
      +'证据来自冰芯、树轮、湖芯、石笋、文献或器测记录（视条目而定）。'
      +'出处：'+(hosts.slice(0,2).join('、')||'见舆地页')+'。'+CAVEAT;
    return {
      t:x.title,x:x.summary,note:note,
      src:(ch.near?'本土 · ':'远闻 · ')+'气候／'+x.category,
      isHist:true,isClim:true,climMeta:x,
      pressure:e,
      o:[
        ['因势调整作息与仓廪',Object.assign({},e,{cohesion:(e.cohesion||0)+2,lore:1})],
        ['照旧例行事，只把异象记入册',{lore:4,cohesion:1}],
        ['迁往邻近地理单元',Object.assign({},e,{food:(e.food||0)+3,people:(e.people||0)-1,wealth:2})]
      ]
    };
  }
  function hostOf(u){
    try{return String(u).replace(/^https?:\/\//,'').split('/')[0].replace(/^www\./,'');}
    catch(e){return '出处见舆地页';}
  }
  /* 地图散点：等距圆柱投影到 0..1，UI 自己缩放 */
  function mapData(){
    return G.units.map(u=>({id:u.id,name:u.name,region:u.region,lat:u.lat,lon:u.lon,
      x:(u.lon+180)/360,y:(90-u.lat)/180,type:u.type,fact:u.fact,change:u.change}));
  }
  /* 开局地理修正：地形给基础八维一点真实底色（微小，不决定胜负） */
  function baseBias(region){
    const b={};
    const names=G.units.filter(u=>u.region===region).map(u=>u.name+u.type+u.fact).join('');
    if(/尼罗河|泛滥/.test(names)){b.food=3;b.faith=1;}
    if(/冲积平原|河谷/.test(names)){b.food=3;b.people=2;}
    if(/沙漠|荒漠|干旱|盆地/.test(names)){b.food=-2;b.wealth=2;}
    if(/草原|高原/.test(names)){b.might=2;b.food=-1;}
    if(/海|岛|半岛|季风/.test(names)){b.wealth=3;b.craft=1;}
    if(/山地|高山|喀斯特/.test(names)){b.cohesion=2;b.food=-1;}
    return b;
  }
  function timeline(S,seen){
    return G.events.filter(x=>seen[x.id]).sort((a,b)=>a.y0-b.y0);
  }
  W.geoclimate={CAVEAT:CAVEAT,unitsOf:unitsOf,unit:unit,candidates:candidates,
    pick:pick,pressure:pressure,wrap:wrap,hostOf:hostOf,mapData:mapData,
    baseBias:baseBias,timeline:timeline};
  if(typeof module!=='undefined'&&module.exports)module.exports=W.geoclimate;
})((typeof window!=='undefined'?window:globalThis).WQN=((typeof window!=='undefined'?window:globalThis).WQN||{}));
