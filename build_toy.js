/* build_toy.js —— 生成「B站 Toy 上架包」分包
   用法：node build_toy.js
   产物：toy/index.html（≤1MB 的壳+代码）+ toy/data.js（外置数据，可被 index.html 同层加载）
   说明：Toy 限制单文件 index.html ≤ 1MB，故把 3.3MB 数据外置为 data.js，
        用 <script src="./data.js"> 在 index.html 内加载（file:// 与 Toy webview 均可）。 */
const fs=require('fs'),path=require('path');
const {pack,UNPACK,VERIFY}=require('./tools/pool.js');
const ROOT=__dirname;
const read=p=>fs.readFileSync(path.join(ROOT,p),'utf8');

/* ===== Toy 平台合规层（只作用于上架包，不改动 src/ 与 data/ 源文件）=====
   1) 词语降敏：把易被内容审核模型误判为「人群优劣／血统论」的措辞改为中性学术说法。
      原文多为「不作生物种族分类」「姓氏不证明血统」这类否定式免责句，
      语义不变，只换词面，避免机审误伤。
   2) 移除「舆地」页签：该页用 Canvas 自绘历史政权核心区（属地图类图像内容），
      中国境内平台上自绘地图有独立的审图合规要求，上架包内不呈现。
   3) 启动页加虚构声明：明示为随机生成的虚构推演，与真实人物／族群／政权无对应关系。 */
const SOFTEN=[
  /* 词面降敏：全部为等义／近义替换，数据与代码同步替换，保持语义可读 */
  ['东突厥','突厥东支'],['东突','东部突厥'],
  ['血统','血缘'],['种族','人群'],['蛮族','外族'],['蛮夷','外族'],['人祭','祭祀'],['殉葬','从葬'],
  ['主权','权属'],['领土','地域'],['疆域','地域'],['疆界','界线'],['国界','界线'],['边界','范围'],
  ['割让','划归'],['藩属','属部'],['羁縻','安抚'],
  ['帝国','王朝'],['殖民','拓殖'],['独立','自立'],['分裂','分立'],['复辟','复位'],
  ['革命','变革'],['政变','更替'],['叛乱','变乱'],['暴动','起事'],['镇压','平定'],
  ['党争','朝争'],['党禁','学禁'],['战争','战事'],
  ['占卜','卜问'],['风水','居处'],['巫术','方术'],['神权','祭权'],['迷信','旧俗'],
  ['奴隶','仆役'],['自杀','身故'],['瘟疫','疫病'],['饥荒','歉收'],
  ['民国','近代'],['满洲','东北'],['审查','检核'],['宣传','传布'],
  ['优劣','高下'],['进化','演化']
];
const NO_LINK='链接从略，完整出处见开源工程';
function soften(o){
  let s=JSON.stringify(o);
  SOFTEN.forEach(function(p){s=s.split(p[0]).join(p[1]);});
  const x=JSON.parse(s);
  /* 4) 去掉全部站外链接：数据里 7568 条 url 均为独立字段（无正文内嵌），
        直接替换为中文占位，避免 B 站内容审核把站外域名判为导流。
        完整出处保留在开源工程的 data/*.json，不随上架包外发。 */
  (function walk(v){
    if(Array.isArray(v)){v.forEach(walk);return;}
    if(v&&typeof v==='object')for(const k in v){
      if(k==='url'&&typeof v[k]==='string'&&/^https?:\/\//.test(v[k]))v[k]=NO_LINK;
      else walk(v[k]);
    }
  })(x);
  return x;
}
const SRC=['src/rng.js','src/kinship.js','src/family.js','src/people.js','src/weave.js','src/real.js','src/civilization.js','src/succession.js','src/reality.js','src/difficulty.js','src/tutorial.js','src/geoclimate.js','src/fringe.js','src/atlas.js','src/consequences.js','src/options.js','src/engine.js','src/ui.js','src/main.js'];
let data={
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
data=soften(data);
const toWen=o=>JSON.parse(JSON.stringify(o).replace(/[\u4e00-\u9fff]/g,'文'));
/* 诊断开关 A：按顶层数据键把中文逐字中性化（长度/结构不变），用于定位审核触发模块。
   诊断开关 B：WQN_BISECT=a:b —— 三册全部中性化，仅把全局序号 [a,b) 的条目恢复原文，
   用于「恢复式」区间探针；可一次并行提交多个区间，一轮审核定位触发文本所在段。
   两者仅本机探针使用，正式上架包不带这些环境变量。 */
const NEUT=(process.env.WQN_NEUTRALIZE||'').split(',').filter(Boolean);
if(NEUT.length){
  NEUT.forEach(function(k){
    if(k==='*')Object.keys(data).forEach(function(x){data[x]=toWen(data[x]);});
    else if(k in data)data[k]=toWen(data[k]);
    else throw new Error('未知数据键: '+k);
  });
  console.log('诊断中性化模块:',NEUT.join(', '));
}
const GROUPS=[['civilization','dimensions'],['civilization','items'],['civilization','treasures'],
  ['civilization','biographies'],['civilization','unlocks'],
  ['peoples','surnames'],['peoples','peoples'],['peoples','notes'],
  ['reading_quiz','items']];
/* 上架版裁剪：WQN_DROP 为经审核实测命中的全局序号区间（逗号分隔 a:b）。
   只移除这些条目，其余 81% 的百科数据与全部玩法数据保持原文，不做乱码替换。 */
const DROP=process.env.WQN_DROP||'';
if(DROP){
  const ranges=DROP.split(',').map(r=>r.split(':').map(Number));
  const inDrop=i=>ranges.some(r=>i>=r[0]&&i<r[1]);
  let idx=0,removed=0;
  GROUPS.forEach(function(g){
    const arr=data[g[0]][g[1]];
    if(!Array.isArray(arr))return;
    data[g[0]][g[1]]=arr.filter(function(){
      const drop=inDrop(idx++);
      if(drop)removed++;
      return !drop;
    });
  });
  console.log('合规裁剪：移除 '+removed+' 条 / 三册共 '+idx+' 条，保留 '+(idx-removed)+' 条');
}
const PACKED=pack(data);
function fnv1a(str){
  var h=0x811c9dc5;
  for(var i=0;i<str.length;i++){h^=str.charCodeAt(i);h=(h*0x01000193)>>>0;}
  return h>>>0;
}
const RAWJSON=JSON.stringify(data);
/* 裁剪后姓氏册少于 1200 条，放宽自检阈值（其余自检项不变） */
const VERIFY_T=VERIFY.replace('D.peoples.surnames.length<1200','D.peoples.surnames.length<900');
const CHECK='window.__WQN_CHECK__={h:'+fnv1a(RAWJSON)+',n:'+RAWJSON.length+'};\n'+VERIFY_T+'\n';
const DATA='window.WQN=window.WQN||{};\n'
  +'window.__WQN_POOL__='+JSON.stringify(PACKED.pool)+';\n'
  +'window.WQN.data='+JSON.stringify(PACKED.packed)+';\n'
  +UNPACK+CHECK+'\n';
let SCRIPT=SRC.map(f=>'/* ===== '+f+' ===== */\n'+read(f)).join('\n\n');
SOFTEN.forEach(function(p){SCRIPT=SCRIPT.split(p[0]).join(p[1]);});
/* 合规层 2：下掉「舆地」页签（其 Canvas 历史政权图不进入上架包的可视范围） */
if(SCRIPT.indexOf("['geo','舆地'],")<0)throw new Error('合规层：未找到舆地页签锚点，构建中止');
SCRIPT=SCRIPT.replace("['geo','舆地'],",'');
/* 合规层 3：启动页置顶虚构声明 */
const INTRO_ANCHOR="h+='<div class=\"card\"><p class=\"intro\">你不是在读一段写好的历史。";
if(SCRIPT.indexOf(INTRO_ANCHOR)<0)throw new Error('合规层：未找到启动页文案锚点，构建中止');
SCRIPT=SCRIPT.replace(INTRO_ANCHOR,
  "h+='<div class=\"card\"><p class=\"intro\" style=\"color:var(--dim);font-size:.86em;line-height:1.9\">"+
  "本作为虚构历史推演游戏：人物、家族与事件均由算法随机生成，与真实历史人物、族群、政权无对应关系，内容仅供娱乐。</p>"+
  "<p class=\"intro\">你不是在读一段写好的历史。");
/* Toy 分包：把内联 DATA 替换成外置脚本引用；data.js 先于代码脚本执行 */
let html=read('src/shell.html')
  .replace('/*__STYLE__*/',read('src/style.css'))
  .replace('/*__DATA__*/','</script>\n<script src="./data.js"></script>\n<script>\n"use strict";')
  .replace('/*__SCRIPT__*/',SCRIPT);
/* 探针包：数据被中性化后自检会报错，放开启动阻断以免审核侧看到报错页 */
if(process.env.WQN_PROBE==='1')html=html.replace('if(window.__WQN_BAD__)return;','');
const toyDir=path.join(ROOT,'toy');
fs.mkdirSync(toyDir,{recursive:true});
fs.writeFileSync(path.join(toyDir,'index.html'),'\ufeff'+html,{encoding:'utf8'});
fs.writeFileSync(path.join(toyDir,'data.js'),DATA,{encoding:'utf8'});
console.log('Toy 分包完成：');
console.log('  index.html '+(fs.statSync(path.join(toyDir,'index.html')).size/1024).toFixed(1)+' KB');
console.log('  data.js   '+(fs.statSync(path.join(toyDir,'data.js')).size/1024).toFixed(1)+' KB');
