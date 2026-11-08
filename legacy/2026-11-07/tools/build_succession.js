/* tools/build_succession.js —— 构建朝代更迭链与「人物同期政权」映射
   用法：node tools/build_succession.js
   产出：data/succession.json
   纪律：只有政权纪年首尾不重叠的文明圈才构成线性更迭链；
        年代重叠的政权归为「并存政权群」，不硬串成一条王朝线。 */
const fs=require('fs'),path=require('path');
const D=path.join(__dirname,'..','data');
const J=f=>JSON.parse(fs.readFileSync(path.join(D,f),'utf8'));
const ent=J('entities.json').entities;
const civ=J('civilization.json').items;

/* 间朝：相邻实体之间的空档。名称取通识年表，明确标注数据未逐条收录该段政权 */
const GAPS={
  'C01|C02':{name:'战国晚期（周祀已绝，秦未称帝）',note:'周王室前 256 年失王畿，秦前 221 年方称帝；此段本数据未收录统一政权。'},
  'C02|C03':{name:'楚汉之际',note:'秦前 207 年失中央统治权，汉前 202 年建立；期间为战争与诸侯并立。'},
  'C03|C04':{name:'三国两晋南北朝至隋',note:'220—618 年间政权并立、更迭频繁，本数据未逐朝收录。'},
  'C04|C05':{name:'五代十国',note:'907—960 年间中原政权快速更替，本数据未逐朝收录。'},
  'C05|C06':{name:'元朝',note:'1279—1368 年为元统治期，本数据未建立该政权六阶段年表。'}
};
/* 终结类型的整理口径：从终结原因归纳，不是史料原文分类 */
const TRANS={
  'C01':'兼并','C02':'战争与起义','C03':'权臣代立','C04':'藩镇代立',
  'C05':'军事征服','C06':'内乱与外患','C07':'男嗣断绝','C08':'帝国解体',
  'C09':'将领废帝','C10':'外征摧毁','C11':'殖民接管','C12':'战败解体'
};

const chains={},coexisting={};
for(const region of [...new Set(ent.map(e=>e.region))]){
  const list=ent.filter(e=>e.region===region).sort((a,b)=>a.startYear-b.startYear);
  if(!list.length)continue;
  let overlaps=0;
  for(let i=1;i<list.length;i++)if(list[i].startYear<=list[i-1].endYear)overlaps++;
  if(list.length<2||overlaps>0){
    coexisting[region]={reason:list.length<2?'该文明圈当前只有一个实体年表':'政权纪年互相重叠，不构成首尾相续的王朝链',
      entities:list.map(e=>({id:e.id,name:e.name,startYear:e.startYear,endYear:e.endYear}))};
    continue;
  }
  const links=[];
  for(let i=0;i<list.length;i++){
    const e=list[i],next=list[i+1]||null;
    links.push({
      id:e.id,name:e.name,startYear:e.startYear,endYear:e.endYear,
      phases:e.phases,endReason:e.phases[5].note,
      transition:TRANS[e.id]||'政权终结',
      gapToNext:next?{
        from:e.endYear,to:next.startYear,years:next.startYear-e.endYear,
        ...(GAPS[e.id+'|'+next.id]||{name:'间朝',note:'本数据未逐条收录该段政权。'})
      }:null
    });
  }
  chains[region]={
    region:region,title:'华夏王朝更迭长河',
    intro:'按考据年表首尾相续排列。终结年与建立年取自史料节点，间朝为本数据未逐朝收录的过渡期。',
    classification:'过渡类型与终结类型为整理口径，非史料原文分类；间朝名称取通识年表。',
    entities:links,
    totalTurns:links.length*6,
    from:links[0].startYear,to:links[links.length-1].endYear,
    tail:'朱明 1644 年之后尚有清及近现代，本数据未继续建立六阶段实体年表，链止于此。'
  };
}

/* 人物 / 条目与实体纪年的同期映射：只表示年代窗口重叠，不表示隶属或仕宦 */
const itemLinks={},entityLinks={};
for(const x of civ){
  const same=ent.filter(e=>e.region===x.region);
  const hit=same.filter(e=>x.y0<=e.endYear&&x.y1>=e.startYear)
    .map(e=>({id:e.id,name:e.name,startYear:e.startYear,endYear:e.endYear}));
  if(hit.length)itemLinks[x.id]=hit;
  hit.forEach(h=>{(entityLinks[h.id]=entityLinks[h.id]||[]).push(x.id);});
}

const out={
  meta:{
    description:'朝代更迭链与同期政权映射',
    rule:'仅当同文明圈实体纪年首尾不重叠时才构成线性更迭链；重叠者列为并存政权群。',
    linkRule:'itemLinks 仅表示年代窗口重叠，不表示隶属该政权；亦不表示人物在其治下任职。',
    generatedFrom:['entities.json','civilization.json']
  },
  chains:chains,coexisting:coexisting,
  itemLinks:itemLinks,entityLinks:entityLinks
};
fs.writeFileSync(path.join(D,'succession.json'),JSON.stringify(out,null,1),'utf8');
for(const [k,v] of Object.entries(chains))
  console.log('链',k,v.entities.length+' 朝',v.from+'→'+v.to,'共 '+v.totalTurns+' 笔，间朝 '+v.entities.filter(e=>e.gapToNext).length+' 段');
console.log('并存政权群',Object.keys(coexisting).map(k=>k+':'+coexisting[k].entities.length).join(' '));
console.log('同期映射',Object.keys(itemLinks).length,'条条目；被映射实体',Object.keys(entityLinks).length,'个');
