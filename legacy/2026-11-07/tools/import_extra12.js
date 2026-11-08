/* tools/import_extra12.js —— 导入「物流 / 职业发展 / 公共卫生 / 农业 / 矿冶 / 能源 / 教育 / 思想 / 史学 / 通信 / 婚姻 / 体育」12 维
   用法：node tools/import_extra12.js
   幂等：以 srcReport==='x12' 为标记，重复运行先移除旧导入再追加，不触碰任何其他来源的条目。
   出处纪律：主报告 [1]~[17] + 补遗 [18]~[49]；补遗中明确「待核」的 8 条不给假 URL，
            而是标 sourcePending，考据档排除、其余档位标注「出处待核」。 */
const fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..');
const D=path.join(ROOT,'data'),DOC=path.join(ROOT,'docs');
const J=f=>JSON.parse(fs.readFileSync(path.join(D,f),'utf8'));
const RD=f=>fs.readFileSync(path.join(DOC,f),'utf8').split('\n');
const NOW=2026;

/* ---------- 年份解析（与 build_final.js 同口径） ---------- */
function token(seg,wholeHasC,wholeHasBP){
  let s=seg.trim();
  const hasC=/世纪/.test(s)||(wholeHasC&&!/年|BP|CE/.test(s));
  const hasM=/千纪/.test(s),isBP=/BP/.test(s)||wholeHasBP;
  const neg=/前|BCE/.test(s)&&!/CE(?!\w)/.test(s.replace('BCE','X'));
  if(/至今/.test(s)&&!s.match(/\d/))return [NOW,NOW];
  const m=s.match(/(\d+)/);if(!m)return null;
  let n=+m[1];if(/万/.test(s))n*=10000;
  if(isBP){const y=1950-n;return [y,y];}
  if(/至今/.test(s))return [n,NOW];
  if(hasM)return neg?[-n*1000,-(n-1)*1000-1]:[(n-1)*1000+1,n*1000];
  if(hasC)return neg?[-n*100,-(n-1)*100-1]:[(n-1)*100+1,n*100];
  return neg?[-n,-n]:[n,n];
}
function parseYears(raw,padBase){
  const t=String(raw).trim(),wholeHasC=/世纪/.test(t),wholeHasBP=/BP/.test(t);
  const parts=t.split(/[—–]/).map(x=>x.trim()).filter(Boolean);
  const a=token(parts[0]||t,wholeHasC,wholeHasBP);
  const b=parts.length>1?token(parts[1],wholeHasC,wholeHasBP):a;
  if(!a||!b)return {y0:-5000,y1:NOW};
  let y0=Math.min(a[0],b[0]),y1=Math.max(a[1],b[1]);
  const pad=padBase||(t.indexOf('约')>=0?60:20);
  return {y0:y0-pad,y1:y1+pad};
}
function consensus(s){
  if(/传说|后世追述/.test(s))return 'legendary_retroactive';
  if(/争议/.test(s))return 'date_contested';
  return 'settled';
}
function hostRank(url){
  const u=String(url).toLowerCase();
  if(!u||u==='待核')return '待核';
  if(/gov\.cn|gov\.|edu\.|ac\.|museum|britannica|org|cnki|nopss|cssn|cma\.|nsfc|nstl|people|gmw|thepaper|sciencenet|court|ccdi|neac|sport\.gov|mct\.gov|xuexi|cnr|worldhistory|ebsco|ntmofa|zgsyb|chinacourt|bjcourt|studytimes|wuhai/.test(u))return '机构／学术';
  if(/baike|sogou|sohu|163\.com|qq\.com|weixin|ifeng|huanqiu|guoxue|peopleapp/.test(u))return '百科／媒体';
  return '其他';
}
function refsOf(s){return [...String(s).matchAll(/\[(\d+)\]/g)].map(x=>+x[1]);}

/* ---------- 1. 汇总出处 ---------- */
const main=RD('史料考据-物流职业医疗等十二维.md');
const extra=RD('引用来源补遗-18至49.md');
function collect(lines,out){
  for(let i=0;i<lines.length;i++){
    const m=lines[i].match(/^\[(\d+)\]\s+(.+)$/);
    if(!m)continue;
    const n=+m[1],raw=m[2].trim();
    const q=(lines[i+1]&&lines[i+1].startsWith('> '))?lines[i+1].slice(2).trim():'';
    const pending=(raw==='待核'||!/^https?:\/\//.test(raw));
    out[n]={url:pending?'':raw,quote:q,rank:hostRank(raw),pending:pending,report:'x12'};
  }
}
const SRC={};collect(main,SRC);collect(extra,SRC);

/* ---------- 2. 维度映射 ---------- */
const civ=J('civilization.json'),civSources=J('civ_sources.json');
// 报告前缀 → 游戏维度 key（MT 与已有「计量」撞 key，改立 MM 矿冶与材料）
const MAP={LO:'LO',CA:'CA',PU:'PU',AG:'AG',MT:'MM',EN:'EN',
  ED:'ED',ID:'ID',HI:'HI',CM:'CM',MA:'MA',SP:'SP'};
const NEW_DIMS={
  PU:{name:'公共卫生与照护',badge:'公卫',stat:'faith',desc:'检疫、病坊、照护与预防制度'},
  AG:{name:'农业',badge:'农业',stat:'food',desc:'耕作、农具、灌溉与农书'},
  MM:{name:'矿冶与材料',badge:'矿冶',stat:'craft',desc:'陶瓷、玻璃、金属与新材料'},
  EN:{name:'能源与动力',badge:'动力',stat:'craft',desc:'畜力、水力、风力、蒸汽与电力'},
  ID:{name:'思想哲学',badge:'思想',stat:'lore',desc:'诸子、希腊哲学、理学与启蒙'},
  HI:{name:'史学',badge:'史学',stat:'lore',desc:'史官、纪传编年、方志与金石'},
  CM:{name:'通信邮驿',badge:'通信',stat:'wealth',desc:'符节、邮亭、电报与互联网'}
};
const BOUND={
  PU:'本条记录制度、机构与照护实践，不评价疗效，也不等同于现代医学结论。',
  MM:'材料与工艺按考古及文献可考年代记录；传说层不计入史实。',
  EN:'动力技术按可考应用年代记录，不把神话意象写成实用机械。',
  MA:'婚制与继承按文献及律令可考年代记录；不同时代与地域差异很大，不作通例。',
  SP:'竞技按可考文献与考古记录；传说性起源单独标注。'
};
const REGIONS=['huaxia','meso','nile','aegean','indus','maya','steppe'];
/* 本批报告未写「文明圈」小节，按条目内容的地理线索推断展示口径。
   这是「本土／远闻」的权重归类，不是史实归属断言，条目里留 regionSource 说明。 */
function inferRegion(text){
  if(/奥林匹亚|古希腊|希腊|雅典|斯巴达|罗马|亚里士多德/.test(text))return 'aegean';
  if(/尼罗|埃及|法老|金字塔/.test(text))return 'nile';
  if(/两河|苏美尔|巴比伦|楔形/.test(text))return 'meso';
  if(/印度河|哈拉帕|摩亨佐/.test(text))return 'indus';
  if(/玛雅|尤卡坦/.test(text))return 'maya';
  if(/那达慕|站赤|草原|蒙古|匈奴|游牧|急递铺/.test(text))return 'steppe';
  return 'huaxia';
}

/* ---------- 3. 解析 72 条 ---------- */
const rows=[];let dim=null,region=null;
for(const l of main){
  const dh=l.match(/^## 维度：(.+?)\s*$/);
  if(dh){
    const hit=Object.keys(MAP).find(k=>{
      const names={LO:'物流',CA:'职业发展',PU:'公共卫生与照护',AG:'农业',MT:'矿冶与材料',
        EN:'能源与动力',ED:'教育',ID:'思想哲学',HI:'史学',CM:'通信邮驿',MA:'婚姻家庭',SP:'体育竞技'};
      return names[k]===dh[1].trim();
    });
    dim=hit||null;region=null;continue;
  }
  if(/^## /.test(l)){dim=null;region=null;continue;}
  const rh=l.match(/^### 文明圈：(\w+)/);if(rh){region=rh[1];continue;}
  if(!dim||!l.startsWith('|'))continue;
  const c=l.split('|');if(c.length!==10)continue;
  const m=c[1].trim().match(/^([A-Z]{1,2})-?(\d{3})$/);if(!m)continue;
  const rawPref=m[1],key=MAP[rawPref];
  if(!key)continue;
  const showRegion=region&&REGIONS.indexOf(region)>=0
    ? region : inferRegion(c[5].trim()+' '+c[6].trim());
  const ys=parseYears(c[2]);
  const prec=(['exact','range','approximate','legendary'].indexOf(c[3].trim())>=0)?c[3].trim():'approximate';
  const nums=refsOf(c[8]);
  const sources=nums.map(n=>SRC[n]).filter(Boolean);
  rows.push({rawId:c[1].trim(),prefix:key,region:showRegion,regionInferred:!region,
    y0:ys.y0,y1:ys.y1,rawYear:c[2].trim(),precision:prec,
    category:c[4].trim(),title:c[5].trim(),
    summary:c[6].trim().replace(/\[\d+\]/g,'').replace(/\s+/g,' ').trim(),
    status:c[7].trim(),consensus:consensus(c[7].trim()),
    refs:nums.map(n=>'x12_'+n),sources:sources,
    sourcePending:nums.some(n=>!SRC[n]||SRC[n].pending),
    missing:nums.filter(n=>!SRC[n])});
}

/* ---------- 4. 合并（幂等） ---------- */
Object.keys(SRC).forEach(n=>{civSources['x12_'+n]=SRC[n];});
const base=civ.items.filter(x=>x.srcReport!=='x12');
// 每个前缀取现有最大编号，续号避免撞 id
const maxNo={};
base.forEach(x=>{
  const m=String(x.id).match(/^([A-Z]{1,2})(\d{3})$/);
  if(m)maxNo[m[1]]=Math.max(maxNo[m[1]]||0,+m[2]);
});
const dims=civ.dimensions.slice();
Object.keys(NEW_DIMS).forEach(k=>{
  if(dims.some(d=>d.key===k))return;
  const v=NEW_DIMS[k];
  dims.push({key:k,name:v.name,badge:v.badge,stat:v.stat,desc:v.desc});
});
const dimName={};dims.forEach(d=>dimName[d.key]=d.name);
const added=[];
rows.forEach(r=>{
  maxNo[r.prefix]=(maxNo[r.prefix]||0)+1;
  const no=maxNo[r.prefix];
  const id=r.prefix+String(no).padStart(3,'0');
  const y={id:id,dim:r.prefix,dimName:dimName[r.prefix]||r.prefix,region:r.region,
    y0:r.y0,y1:r.y1,precision:r.precision,rawYear:r.rawYear,
    category:r.category,title:r.title,summary:r.summary,
    status:r.status,consensus:r.consensus,
    refs:r.refs,sources:r.sources,
    sourcePending:r.sourcePending||false,
    regionSource:r.regionInferred?'按条目内容推断的展示归类，非史实归属':'报告标注',
    boundary:BOUND[r.prefix]||null,layer:'fact',srcReport:'x12'};
  if(y.y1<-5000){y.ancient=true;y.y0=-5000;y.y1=-4800;}
  added.push(y);
});
civ.dimensions=dims;
civ.items=base.concat(added);
fs.writeFileSync(path.join(D,'civilization.json'),JSON.stringify(civ,null,1),'utf8');
fs.writeFileSync(path.join(D,'civ_sources.json'),JSON.stringify(civSources,null,1),'utf8');

/* ---------- 5. 校验 ---------- */
const bad=[];
if(rows.length!==72)bad.push('报告条目数 '+rows.length+' ≠ 72');
const missingAll=rows.flatMap(r=>r.missing);
if(missingAll.length)bad.push('来源编号未定义: '+[...new Set(missingAll)].join(','));
const ids=new Set();civ.items.forEach(x=>{if(ids.has(x.id))bad.push('重复 id '+x.id);ids.add(x.id);});
const pend=added.filter(x=>x.sourcePending).length;
if(bad.length){console.error('校验失败:\n'+bad.slice(0,20).join('\n'));process.exit(1);}
console.log('导入 '+added.length+' 条 · 维度 '+dims.length+' · 总条目 '+civ.items.length);
console.log('出处 '+Object.keys(SRC).length+' 条（其中待核 '+Object.values(SRC).filter(s=>s.pending).length
  +'）· 标为出处待核的条目 '+pend+' 条');
console.log('新增维度: '+Object.keys(NEW_DIMS).map(k=>k+' '+NEW_DIMS[k].name).join('、'));
console.log('并入已有维度: LO 物流 / CA 职业发展 / ED 教育 / MA 婚姻家族 / SP 体育');
