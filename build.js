/* build.js —— 把多文件源码合成为「一个可直接打开的 HTML」
   用法：node build.js
   产物：../wqn.html（同时复制到 dist/wqn.html） */
const fs=require('fs'),path=require('path');
const {pack,UNPACK,VERIFY}=require('./tools/pool.js');
const ROOT=__dirname;
const REVIEW=process.argv.indexOf('--review')>=0;
const read=p=>fs.readFileSync(path.join(ROOT,p),'utf8');
/* ---------- 版本号：由 data/version.json 的 pending 驱动自动递增 ----------
   每轮内容更新前写一次 pending；首次 build 消费它：minor +0.1、build +1、
   写 changelog、清空 pending；同一轮重复 build 不再递增，避免刷号。 */
const VP=path.join(ROOT,'data','version.json');
const V=JSON.parse(fs.readFileSync(VP,'utf8'));
if(V.pending&&V.pending.title){
  const first=!(V.changelog&&V.changelog.length);
  const parts=String(V.version).split('.');
  const major=parseInt(parts[0],10)||1,minor=parseInt(parts[1],10)||0;
  if(!first){
    /* 1.9 之后进位成 2.0，不写成 1.10 */
    const nm=minor+1;
    V.version=nm>=10?(major+1)+'.0':major+'.'+nm;
  }
  V.build=first?1:(V.build||0)+1;
  V.date=new Date(Date.now()+8*3600*1000).toISOString().slice(0,10);
  V.changelog=V.changelog||[];
  /* 代号也从本轮 pending 同步，避免 HTML 头一直显示十几轮前的旧代号 */
  V.codename=String(V.pending.title).replace(/^v[\d.]+\s*·\s*/,'').trim()||V.codename;
  V.changelog.unshift({version:'v'+V.version,build:V.build,date:V.date,
    title:V.pending.title,items:V.pending.items||[]});
  V.pending=null;
  fs.writeFileSync(VP,JSON.stringify(V,null,1),'utf8');
  /* 同步 docs/版本记录.md：当前版本头 + 变更日志顶部，避免文档停在旧号 */
  try{
    const DP=path.join(ROOT,'docs','版本记录.md');
    if(fs.existsSync(DP)){
      const top=V.changelog[0],codeName=String(top.title).replace(/^v[\d.]+\s*·\s*/,'');
      let d=fs.readFileSync(DP,'utf8');
      d=d.replace(/\*\*v[\d.]+ · build \d+ · [\d-]+\*\*\n代号：\*\*[^\n]*\*\*/,
        '**v'+V.version+' · build '+V.build+' · '+V.date+'**\n代号：**'+codeName+'**');
      const entry='### v'+V.version+' · build '+V.build+' · '+V.date+' · '+codeName+'\n\n'
        +(top.items||[]).map(x=>'- '+x).join('\n')+'\n\n';
      d=d.replace('## 变更日志\n\n','## 变更日志\n\n'+entry);
      fs.writeFileSync(DP,d,'utf8');
    }
  }catch(e){}
  console.log('版本递增 → v'+V.version+' (build '+V.build+')');
}else{
  console.log('版本保持 → v'+V.version+' (build '+(V.build||1)+')');
}
const SRC=['src/rng.js','src/kinship.js','src/family.js','src/people.js','src/weave.js','src/real.js','src/civilization.js','src/succession.js','src/reality.js','src/difficulty.js','src/tutorial.js','src/geoclimate.js','src/fringe.js','src/atlas.js','src/consequences.js','src/dynasty.js','src/options.js','src/art.js','src/audio.js','src/a11y.js','src/stage.js','src/engine.js','src/ui.js','src/main.js'];
const data={
  keys:JSON.parse(read('data/config.json')).keys,
  keyOrder:JSON.parse(read('data/config.json')).keyOrder,
  traits:JSON.parse(read('data/config.json')).traits,
  eras:JSON.parse(read('data/config.json')).eras,
  regions:JSON.parse(read('data/config.json')).regions,
  views:JSON.parse(read('data/config.json')).views,
  vol:JSON.parse(read('data/config.json')).vol,
  endings:JSON.parse(read('data/config.json')).endings,
  events:JSON.parse(read('data/events.json')),
  templates:JSON.parse(read('data/templates.json')),
  chains:JSON.parse(read('data/chains.json')),
  history:JSON.parse(read('data/history.json')),
  entities:JSON.parse(read('data/entities.json')),
  sources:JSON.parse(read('data/sources.json')),
  civilization:JSON.parse(read('data/civilization.json')),
  civSources:JSON.parse(read('data/civ_sources.json')),
  succession:JSON.parse(read('data/succession.json')),
  geoclimate:JSON.parse(read('data/geoclimate.json')),
  fringe:JSON.parse(read('data/fringe.json')),
  atlas:JSON.parse(read('data/atlas.json')),
  options:JSON.parse(read('data/options.json')),
  layers:JSON.parse(read('data/layers.json')),
  consequences:JSON.parse(read('data/consequences.json')),
  difficulty:JSON.parse(read('data/difficulty.json')),
  tutorial:JSON.parse(read('data/tutorial.json')),
  localities:JSON.parse(read('data/localities.json')),
  peoples:JSON.parse(read('data/peoples.json')),
  deepdives:JSON.parse(read('data/deepdives.json')),
  reading_quiz:JSON.parse(read('data/reading_quiz.json')),
  version:V,
  kinship:JSON.parse(read('data/kinship.json')),
  rulers:JSON.parse(read('data/rulers.json')),
  houses:JSON.parse(read('data/houses.json')),
  house_entities:JSON.parse(read('data/house_entities.json')),
  art:JSON.parse(read('data/art.json')),
  music:JSON.parse(read('data/music.json')),
  character:JSON.parse(read('data/character.json')),
  asset_plan:JSON.parse(read('data/asset_plan.json'))
};
/* ---------- 送审版（--review）：过滤必须发生在字符串池与校验和之前 ----------
   否则运行时「数据长度与构建时不一致」自检会拦下启动。
   只改中文措辞与展示层，不动年代、人物、出处、可信度与分层纪律。
   注意：免责句本身含「领土／主权」等词，反而会被机审命中，故一并中性化。 */
const RULES=JSON.parse(read('data/review_rules.json'));
function sanitizeValue(v){
  if(typeof v==='string'){
    let out=v;
    RULES.pairs.forEach(p=>{out=out.split(p[0]).join(p[1]);});
    return out;
  }
  if(Array.isArray(v))return v.map(sanitizeValue);
  if(v&&typeof v==='object'){
    const o={};Object.keys(v).forEach(k=>o[k]=sanitizeValue(v[k]));return o;
  }
  return v;
}
function sanitizeData(d){
  if(RULES.dropHypotheses&&d.fringe){
    d.fringe.hypotheses=[];
    d.fringe.meta=Object.assign({},d.fringe.meta,RULES.fringeMeta);
  }
  if(RULES.dropItemPatterns&&d.civilization){
    const rx=new RegExp(RULES.dropItemPatterns.join('|'));
    d.civilization.items=d.civilization.items.filter(x=>!rx.test(
      (x.title||'')+(x.summary||'')+(x.note||'')));
  }
  if(RULES.dropPolityShapes&&d.atlas){
    d.atlas.polities=[];
    d.atlas.meta=Object.assign({},d.atlas.meta,{
      title:'地理点与年代条带示意（送审版）',
      disclaimer:'只保留自然地理轮廓、河流与点状地名；不勾画任何政权范围或界线。年代与地名仅为历史索引，不含任何范围表达。'});
  }
  if(RULES.dropRoutes&&d.atlas)d.atlas.routes=[];
  if(d.options)d.options.meta=Object.assign({},d.options.meta,
    {reviewNote:'送审版：联动与选项文案按合规词表中性化，收益与失手公式不变。'});
}
function sanitizeText(t){
  let out=t;
  /* 先按原始字面删除档位，再做词表替换；顺序反了会改名后匹配不到 */
  if(RULES.dropWildTier){
    out=out.replace(/\n\s*\{key:'wild',name:'狂想档'[\s\S]*?note:'[^']*'\}/,'');
  }
  RULES.pairs.forEach(p=>{out=out.split(p[0]).join(p[1]);});
  return out;
}
if(REVIEW){
  sanitizeData(data);
  console.log('送审过滤：假说层 '+data.fringe.hypotheses.length+' 条 · 政权范围 '
    +data.atlas.polities.length+' 块 · 航线 '+data.atlas.routes.length+' 条 · 文明条目 '
    +data.civilization.items.length+' 条');
}
const CLEAN=REVIEW?sanitizeValue(data):data;
/* 构建期字符串池：把逐条重复的长声明抽成一份，运行时先还原再跑各模块 */
const PACKED=pack(CLEAN);
/* 校验和：用过滤后的数据算，浏览器还原后重算比对，确保压缩／解压零丢失 */
function fnv1a(str){
  var h=0x811c9dc5;
  for(var i=0;i<str.length;i++){h^=str.charCodeAt(i);h=(h*0x01000193)>>>0;}
  return h>>>0;
}
const RAWJSON=JSON.stringify(CLEAN);
const CHECK='window.__WQN_CHECK__={h:'+fnv1a(RAWJSON)+',n:'+RAWJSON.length+'};\n'+VERIFY+'\n';
const DATA='window.WQN=window.WQN||{};\n'
  +'window.WQN_VERSION='+JSON.stringify({version:V.version,build:V.build,
      date:V.date,codename:V.codename+(REVIEW?' · 送审合规层':'')})+';\n'
  +(REVIEW?'window.WQN_REVIEW=true;\n':'')
  +'window.__WQN_POOL__='+JSON.stringify(PACKED.pool)+';\n'
  +'window.WQN.data='+JSON.stringify(PACKED.packed)+';\n'
  +UNPACK+CHECK+'\n';
let SCRIPT=SRC.map(f=>'/* ===== '+f+' ===== */\n'+read(f)).join('\n\n');
if(REVIEW)SCRIPT=sanitizeText(SCRIPT);
let html=read('src/shell.html')
  .split('/*__VERSION__*/').join('v'+V.version+' · build '+V.build+' · '+V.date)
  .replace('/*__STYLE__*/',read('src/style.css'))
  .replace('/*__DATA__*/',DATA)
  .replace('/*__SCRIPT__*/',SCRIPT);
/* 标题保持与提交表单一致，审核标签只放在注释与版本代号里，避免被当成测试稿 */
if(REVIEW)html=html.replace('</head>',
  '<!-- 送审合规版：过滤规则见 data/review_rules.json，整改对照见 docs/发布审核整改对照表.md -->\n</head>');
const out=REVIEW?path.join(ROOT,'..','wqn-review.html'):path.join(ROOT,'..','wqn.html');
fs.writeFileSync(out,'\ufeff'+html,{encoding:'utf8'});
/* v2.6：借鉴 vite-plugin-singlefile 的 file:// 能力清单，每次构建后立刻自检。
   任何外链 / 动态分片 / cookie / History API 都直接让构建失败，不等到用户白屏才发现。 */
const OFFLINE=require('./tools/check_offline.js');
const offlineResult=OFFLINE.check(html,path.basename(out));
if(OFFLINE.report(offlineResult))process.exit(1);
if(!REVIEW){
  fs.mkdirSync(path.join(ROOT,'dist'),{recursive:true});
  fs.writeFileSync(path.join(ROOT,'dist','wqn.html'),'\ufeff'+html,{encoding:'utf8'});
  fs.writeFileSync(path.join(ROOT,'..','wqn.htm'),'\ufeff'+html,{encoding:'utf8'});
}
console.log('构建完成：'+out+(REVIEW?'【送审版】':'')+'　v'+V.version+' (build '+V.build+')');
console.log('  通识史事 '+data.events.length+' · 模板 '+data.templates.length
  +' · 链式 '+data.chains.chains.length+' · 危机 '+data.chains.crises.length
  +' · 考据史事 '+data.history.events.length+'（传说层 '+data.history.legends.length+'）'
  +' · 真实实体 '+data.entities.entities.length
  +' · 文明条目 '+data.civilization.items.length
  +'（人物 '+data.civilization.dimensions.map(d=>d.key).join('/')+'）'
  +' · 出处 '+(Object.keys(data.sources).length+Object.keys(data.civSources).length)
  +' · 更迭链 '+Object.values(data.succession.chains).map(c=>c.entities.length+'朝').join('/')
  +' · 地理 '+data.geoclimate.units.length+' 单元 / 气候 '+data.geoclimate.events.length+' 事件'
  +' · 文本传统 '+data.fringe.texts.length+' / 未证实假说 '+data.fringe.hypotheses.length
  +' · 工程链 '+data.consequences.projects.length+' / 组合技 '+data.consequences.combos.length
  +' · 气候影响区 '+data.layers.climate.length+' / 人口核 '+data.layers.population.kernels.length
  +' · 选项原型 '+data.options.archetypes.length+' / 联动 '+data.options.special.length
  +' · 舆图 '+data.atlas.lands.length+' 陆块 / '+data.atlas.polities.length+' 政权核心区 / '
  +data.atlas.cities.length+' 城址 / '+data.atlas.rivers.length+' 河流'
  +' · 难度 '+data.difficulty.diffs.length+' 档 / 教程 '+data.tutorial.steps.length+' 步'
  +' · 地方史 '+data.localities.items.length+' / 姓氏 '+data.peoples.surnames.length
  +' / 人群 '+data.peoples.peoples.length+' / 深读 '+data.deepdives.items.length
  +' · 维度 '+data.civilization.dimensions.length
  +' · 帝王 '+data.rulers.rulers.length+' 位 / '+data.rulers.notes.length+' 条称谓读法'
  +' · 世家 '+data.houses.houses.length+' 家（可代入 '+data.house_entities.entities.length+' 家）'
  +' · 时代 '+data.eras.length+' · 文明圈 '+Object.keys(data.regions).length
  +' · 舞台 '+Object.keys(data.character.layers).length+' 角色层 / '
  +Object.keys(data.character.backdrops).length+' 背景板（离线内嵌）'
  +' · 表演关卡 '+data.asset_plan.scenes.length+' 关 / 待补 '+data.asset_plan.pending.length+' 层'
  +' / 下批登记 '+data.asset_plan.plannedScenes.length+' 层'
  +' · 美术 '+data.art.motifs.length+' 纹样 / '+Object.keys(data.art.scenes).length+' 场景'
  +' · 音乐 '+data.music.scales.length+' 调式 / '+data.music.scores.length+' 曲目 / '
  +Object.keys(data.music.cues).length+' 音效');
console.log('  大小 '+(fs.statSync(out).size/1024).toFixed(1)+' KB'
  +' · 字符串池 '+PACKED.stats.entries+' 项 / '+PACKED.stats.refs+' 处引用，净省 '
  +(PACKED.stats.savedBytes/1024).toFixed(1)+' KB');
