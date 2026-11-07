/* build_toy.js —— 生成「B站 Toy 上架包」分包
   用法：node build_toy.js
   产物：toy/index.html（≤1MB 的壳+代码）+ toy/data.js（外置数据，可被 index.html 同层加载）
   说明：Toy 限制单文件 index.html ≤ 1MB，故把 3.3MB 数据外置为 data.js，
        用 <script src="./data.js"> 在 index.html 内加载（file:// 与 Toy webview 均可）。 */
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
const PACKED=pack(data);
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
/* Toy 分包：把内联 DATA 替换成外置脚本引用；data.js 先于代码脚本执行 */
let html=read('src/shell.html')
  .replace('/*__STYLE__*/',read('src/style.css'))
  .replace('/*__DATA__*/','</script>\n<script src="./data.js"></script>\n<script>\n"use strict";')
  .replace('/*__SCRIPT__*/',SCRIPT);
const toyDir=path.join(ROOT,'toy');
fs.mkdirSync(toyDir,{recursive:true});
fs.writeFileSync(path.join(toyDir,'index.html'),'\ufeff'+html,{encoding:'utf8'});
fs.writeFileSync(path.join(toyDir,'data.js'),DATA,{encoding:'utf8'});
console.log('Toy 分包完成：');
console.log('  index.html '+(fs.statSync(path.join(toyDir,'index.html')).size/1024).toFixed(1)+' KB');
console.log('  data.js   '+(fs.statSync(path.join(toyDir,'data.js')).size/1024).toFixed(1)+' KB');
