/* tools/build_layers.js —— 生成气候影响区与人口热力数据 data/layers.json
   用法：node tools/build_layers.js

   纪律（写进产物 meta）：
   1. 气候事件的「影响区」不是实测边界。geoclimate.json 只标了文明圈与 '*'，
      本脚本按该圈**已考据地理单元的近似中心点**求包围盒画示意椭圆；
      '*' 为全球性现象，只作全图淡色提示 + 文字，不画假边界。
   2. 人口热力**不是历史人口栅格统计**，也没有逐朝人口数字。
      它是「相对聚集重心示意」：核坐标全部复用 geoclimate.json 的 29 个地理单元，
      按时代给各文明圈一个通识级相对权重，只表达「重心往哪边偏」，
      不能读成人口数量、密度值或跨文明人口比较。
   3. 家族分布图用的是玩家本局的推演数据（S.famPlaces / S.migrations），
      与史实人口无关，界面须明确标注。
*/
const fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..');
const J=f=>JSON.parse(fs.readFileSync(path.join(ROOT,'data',f),'utf8'));
const geo=J('geoclimate.json'),cfg=J('config.json');
const UNITS=geo.units,REG=['huaxia','meso','nile','aegean','indus','maya','steppe'];

/* ---------- 1 气候影响区 ---------- */
const CLIM_COLOR={
  '暖湿':'#e0a44a','暖期':'#e0a44a','暖异常':'#e0a44a','变暖':'#e5b45c','湿润':'#5fb8a0',
  '冷干':'#7fa8d0','冷期':'#7fa8d0','冷湿':'#8fb0d8','干冷':'#7fa8d0','干旱':'#d08a5a',
  '干旱化':'#d08a5a','干旱压力':'#d08a5a','干湿迁移':'#c7a06a',
  '海平面':'#5fa8c8','海平面上升':'#5fa8c8','水位异常':'#5fa8c8','水文异常':'#5fa8c8',
  '水文节律':'#5fa8c8','河流改道':'#5fa8c8','洪旱灾害':'#c98f6a','洪涝饥荒':'#c98f6a',
  '火山气候':'#b48ad0','季风异常':'#8fb8a0','季风演化':'#8fb8a0','ENSO异常':'#8fb8a0',
  '疫病':'#c07a7a','盐渍化':'#c0a070','聚落变迁':'#a0b078'
};
function bboxOf(regions){
  if(!regions||regions.indexOf('*')>=0)return null;
  const us=UNITS.filter(u=>regions.indexOf(u.region)>=0);
  if(!us.length)return null;
  const lons=us.map(u=>u.lon),lats=us.map(u=>u.lat);
  const x0=Math.min(...lons),x1=Math.max(...lons),y0=Math.min(...lats),y1=Math.max(...lats);
  // 外扩一点，避免单点时椭圆退化；这是示意缓冲，不是实测范围
  const padLon=Math.max(4,(x1-x0)*.18),padLat=Math.max(3,(y1-y0)*.22);
  return {cx:(x0+x1)/2,cy:(y0+y1)/2,
    rx:(x1-x0)/2+padLon,ry:(y1-y0)/2+padLat,
    units:us.map(u=>u.id)};
}
const climate=geo.events.map(e=>{
  const box=bboxOf(e.regions);
  return {id:e.id,title:e.title,category:e.category,rawYear:e.rawYear,
    y0:e.y0,y1:e.y1,precision:e.precision,summary:e.summary,
    regions:e.regions,global:!box,box:box,
    color:CLIM_COLOR[e.category]||'#9fb0b8',
    caveat:e.caveat||'可考的气候／地理现象；与社会兴衰的时间相关不等于已证因果。',
    rank:(e.sources||[]).some(s=>s.rank==='机构／学术')?'机构／学术':'百科／媒体'};
});

/* ---------- 2 人口聚集核（时代相对权重，示意） ---------- */
/* 每格是「该时代该圈的相对聚集程度 0—1」，只用于配色深浅，不是人数。
   依据：通识级历史人口地理（农业起源多中心 → 古典帝国核心区 → 中古欧亚城市带
   → 大航海后大西洋沿岸上升 → 工业与当代城市化）。无逐朝数字，故不造数字。 */
const ERA_W={
  '-5000':{huaxia:.42,meso:.72,nile:.70,aegean:.30,indus:.66,maya:.18,steppe:.22},
  '-3000':{huaxia:.55,meso:.86,nile:.88,aegean:.40,indus:.82,maya:.24,steppe:.28},
  '-1000':{huaxia:.78,meso:.74,nile:.72,aegean:.76,indus:.80,maya:.36,steppe:.34},
  '1':    {huaxia:.92,meso:.66,nile:.70,aegean:.90,indus:.82,maya:.40,steppe:.36},
  '500':  {huaxia:.88,meso:.78,nile:.62,aegean:.72,indus:.86,maya:.48,steppe:.44},
  '1500': {huaxia:.94,meso:.60,nile:.56,aegean:.92,indus:.84,maya:.50,steppe:.40},
  '1800': {huaxia:.96,meso:.52,nile:.54,aegean:1.0,indus:.78,maya:.44,steppe:.34},
  '1945': {huaxia:.94,meso:.62,nile:.64,aegean:.94,indus:.88,maya:.58,steppe:.42},
  '2026': {huaxia:.92,meso:.72,nile:.74,aegean:.86,indus:.94,maya:.68,steppe:.50}
};
const eras=cfg.eras.map(e=>({id:String(e.from),name:e.n,from:e.from,
  weights:ERA_W[String(e.from)]||ERA_W['1']}));
/* 单元类型微调：河谷／冲积平原／三角洲更易聚集，荒漠／高原则降低。 */
function typeAdj(t){
  if(/冲积|河谷|三角洲|平原|盆地|流域/.test(t))return 1.18;
  if(/沙漠|荒漠|高原|山地|苔原/.test(t))return .72;
  if(/海岸|岛屿|港口/.test(t))return 1.06;
  return 1;
}
const kernels=UNITS.map(u=>({id:u.id,name:u.name,lon:u.lon,lat:u.lat,
  region:u.region,type:u.type,adj:Math.round(typeAdj(u.type)*100)/100,
  fact:u.fact}));
function eraAt(y){
  let hit=eras[0];
  eras.forEach(e=>{if(y>=e.from)hit=e;});
  return hit;
}
function weightAt(kernel,y){
  const e=eraAt(y);
  // 时代之间线性插值，避免年份滑杆拉动时热力跳变
  const i=eras.indexOf(e),next=eras[Math.min(i+1,eras.length-1)];
  let w=e.weights[kernel.region]||.4;
  if(next!==e&&next.from>e.from){
    const t=Math.max(0,Math.min(1,(y-e.from)/(next.from-e.from)));
    w=w+(next.weights[kernel.region]-w)*t;
  }
  return Math.max(0,Math.min(1,w*kernel.adj));
}

/* ---------- 3 家族分布（结构说明，实际数据在存档里） ---------- */
const layers={
  meta:{
    title:'气候 · 人口 · 家族 三层图',
    climateNote:'气候影响区按本工程已考据的地理单元近似中心点勾画，是示意椭圆，不是实测范围；'
      +'全球性事件只作全图提示，不画边界。气候只作环境压力，时间重合不等于已证因果。',
    populationNote:'人口热力不是历史人口统计，没有逐朝人口数字。核坐标全部复用本工程 29 个地理单元，'
      +'按时代给各文明圈一个通识级相对权重，只表达「相对聚集重心往哪偏」，'
      +'不能读成人口数量、密度值或跨文明人口比较。',
    familyNote:'家族分布是玩家本局的推演数据：族人被分配到本圈地理单元，迁徙抉择会改写他们的落脚点。'
      +'与真实历史人口无关，也不是史实人物履历。',
    zoom:'三层共用同一张可缩放画布：滚轮／双指缩放、拖动平移、年份滑杆；图层可单独开关或叠加。',
    sources:[
      '本工程 data/geoclimate.json（29 地理单元 / 32 气候事件，逐条带出处）',
      '本工程 data/config.json（9 个时代分界）',
      '本工程 data/atlas.json（陆块、河流、城址锚点）'
    ]
  },
  climate:climate,
  population:{eras:eras,kernels:kernels,
    legend:[{t:'低',c:'#2d4a63'},{t:'中',c:'#c98f48'},{t:'高',c:'#e8d06a'}]},
  colors:{climate:CLIM_COLOR}
};
fs.writeFileSync(path.join(ROOT,'data','layers.json'),JSON.stringify(layers,null,1),'utf8');

/* ---------- 自检 ---------- */
const bad=[];
layers.climate.forEach(c=>{
  if(c.y0>c.y1)bad.push(c.id+' 年代倒置');
  if(c.box&&(Math.abs(c.box.cx)>180||Math.abs(c.box.cy)>90))bad.push(c.id+' 中心越界');
  if(c.box&&(c.box.rx<=0||c.box.ry<=0||c.box.rx>180||c.box.ry>90))bad.push(c.id+' 半径异常');
});
layers.population.kernels.forEach(k=>{
  if(Math.abs(k.lon)>180||Math.abs(k.lat)>90)bad.push(k.id+' 核坐标越界');
});
eras.forEach(e=>REG.forEach(r=>{if(typeof e.weights[r]!=='number')bad.push(e.name+' 缺 '+r+' 权重');}));
if(bad.length){console.error('校验失败:\n'+bad.join('\n'));process.exit(1);}
console.log('layers.json：气候影响区 '+climate.length+' 条（全球性 '
  +climate.filter(c=>c.global).length+' / 区域示意 '+climate.filter(c=>c.box).length+'）'
  +' · 人口核 '+kernels.length+' 个 · 时代 '+eras.length+' 段');
console.log('权重自检：前3000年华夏 '+weightAt(kernels.find(k=>k.region==='huaxia')||kernels[0],-3000).toFixed(2)
  +' → 1800年 '+weightAt(kernels.find(k=>k.region==='huaxia')||kernels[0],1800).toFixed(2));
