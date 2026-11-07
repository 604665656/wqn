/* build.js —— 把多文件源码合成为「一个可直接打开的 HTML」
   用法：node build.js
   产物：../wqn.html（同时复制到 dist/wqn.html） */
const fs=require('fs'),path=require('path');
const {pack,UNPACK,VERIFY}=require('./tools/pool.js');
const ROOT=__dirname;
const read=p=>fs.readFileSync(path.join(ROOT,p),'utf8');
const SRC=['src/rng.js','src/kinship.js','src/family.js','src/people.js','src/weave.js','src/real.js','src/civilization.js','src/succession.js','src/reality.js','src/difficulty.js','src/tutorial.js','src/geoclimate.js','src/fringe.js','src/atlas.js','src/consequences.js','src/options.js','src/engine.js','src/ui.js','src/main.js'];
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
  kinship:JSON.parse(read('data/kinship.json'))
};
/* 构建期字符串池：把逐条重复的长声明抽成一份，运行时先还原再跑各模块 */
const PACKED=pack(data);
/* 校验和：用原始数据算，浏览器还原后重算比对，确保压缩/解压零丢失 */
function fnv1a(str){
  var h=0x811c9dc5;
  for(var i=0;i<str.length;i++){h^=str.charCodeAt(i);h=(h*0x01000193)>>>0;}
  return h>>>0;
}
const RAWJSON=JSON.stringify(data);
const CHECK='window.__WQN_CHECK__={h:'+fnv1a(RAWJSON)+',n:'+RAWJSON.length+'};\n'+VERIFY+'\n';
const DATA='window.WQN=window.WQN||{};\n'
  +'window.__WQN_POOL__='+JSON.stringify(PACKED.pool)+';\n'
  +'window.WQN.data='+JSON.stringify(PACKED.packed)+';\n'
  +UNPACK+CHECK+'\n';
const SCRIPT=SRC.map(f=>'/* ===== '+f+' ===== */\n'+read(f)).join('\n\n');
let html=read('src/shell.html')
  .replace('/*__STYLE__*/',read('src/style.css'))
  .replace('/*__DATA__*/',DATA)
  .replace('/*__SCRIPT__*/',SCRIPT);
const out=path.join(ROOT,'..','wqn.html');
fs.writeFileSync(out,'\ufeff'+html,{encoding:'utf8'});
fs.mkdirSync(path.join(ROOT,'dist'),{recursive:true});
fs.writeFileSync(path.join(ROOT,'dist','wqn.html'),'\ufeff'+html,{encoding:'utf8'});
fs.writeFileSync(path.join(ROOT,'..','wqn.htm'),'\ufeff'+html,{encoding:'utf8'});
console.log('构建完成：'+out);
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
  +' · 时代 '+data.eras.length+' · 文明圈 '+Object.keys(data.regions).length);
console.log('  大小 '+(fs.statSync(out).size/1024).toFixed(1)+' KB'
  +' · 字符串池 '+PACKED.stats.entries+' 项 / '+PACKED.stats.refs+' 处引用，净省 '
  +(PACKED.stats.savedBytes/1024).toFixed(1)+' KB');
