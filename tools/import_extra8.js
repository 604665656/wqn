/* tools/import_extra8.js —— 导入「礼制 / 纺织 / 水利 / 计时 / 机械 / 计算 / 外交 / 移民」八维
   用法：node tools/import_extra8.js
   幂等：srcReport==='x8'。
   本批报告是单张九列表，第 9 列 interaction 是「这条知识能变成什么选项」，
   原样存入条目的 play 字段，供 src/options.js 的生成器使用。 */
const fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..');
const D=path.join(ROOT,'data'),DOC=path.join(ROOT,'docs');
const J=f=>JSON.parse(fs.readFileSync(path.join(D,f),'utf8'));
const RD=f=>fs.readFileSync(path.join(DOC,f),'utf8').split('\n');
const NOW=2026;

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
function parseYears(raw){
  const t=String(raw).trim(),wholeHasC=/世纪/.test(t),wholeHasBP=/BP/.test(t);
  const parts=t.split(/[—–-]/).map(x=>x.trim()).filter(Boolean);
  const a=token(parts[0]||t,wholeHasC,wholeHasBP);
  const b=parts.length>1?token(parts[1],wholeHasC,wholeHasBP):a;
  if(!a||!b)return {y0:-5000,y1:NOW};
  let y0=Math.min(a[0],b[0]),y1=Math.max(a[1],b[1]);
  const pad=t.indexOf('约')>=0?60:20;
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
  if(/gov\.cn|gov\.|edu\.|ac\.|museum|britannica|org|cssn|court|ccdi|people|gmw|thepaper|cnr|xuexi|sport\.gov|mct\.gov|worldhistory|ebsco|ntmofa|metmuseum|si\.edu|loc\.gov/.test(u))return '机构／学术';
  if(/baike|sogou|sohu|163\.com|qq\.com|weixin|ifeng|huanqiu|guoxue/.test(u))return '百科／媒体';
  return '其他';
}
function refsOf(s){return [...String(s).matchAll(/\[(\d+)\]/g)].map(x=>+x[1]);}
function inferRegion(text){
  if(/奥林匹亚|古希腊|希腊|雅典|斯巴达|迈锡尼|萨摩斯|安提基特拉|罗马|亚里士多德/.test(text))return 'aegean';
  if(/尼罗|埃及|法老|金字塔|阿玛arna/.test(text))return 'nile';
  if(/两河|苏美尔|巴比伦|楔形|赫梯|亚述|腓尼基|提尔/.test(text))return 'meso';
  if(/印度河|哈拉帕|摩亨佐/.test(text))return 'indus';
  if(/玛雅|阿兹特克|安第斯|印加|尤卡坦/.test(text))return 'maya';
  if(/草原|蒙古|匈奴|突厥|游牧|可汗/.test(text))return 'steppe';
  return 'huaxia';
}

/* ---------- 出处 ---------- */
const LS=RD('史料考据-礼制纺织水利等八维.md'),SRC={};
for(let i=0;i<LS.length;i++){
  const m=LS[i].match(/^\[(\d+)\]\s+(.+)$/);if(!m)continue;
  const raw=m[2].trim(),q=(LS[i+1]&&LS[i+1].startsWith('> '))?LS[i+1].slice(2).trim():'';
  const pending=(raw==='待核'||!/^https?:\/\//.test(raw));
  SRC[+m[1]]={url:pending?'':raw,quote:q,rank:hostRank(raw),pending:pending,report:'x8'};
}

/* ---------- 维度 ---------- */
const DIMS={
  RI:{name:'礼仪与礼制',badge:'礼制',stat:'faith',desc:'祭祀、朝仪、冠婚丧祭礼与礼书'},
  TX:{name:'纺织与染整',badge:'纺织',stat:'craft',desc:'纺车、织机、提花、染料与织物贸易'},
  HY:{name:'水利与水工',badge:'水利',stat:'food',desc:'渠系、陂塘、闸坝、治河与城市给排水'},
  HO:{name:'计时与钟表',badge:'计时',stat:'lore',desc:'日晷、漏刻、机械钟与标准时'},
  MC:{name:'机械与自动化',badge:'机械',stat:'craft',desc:'齿轮传动、自动装置、机床与流水线'},
  CI:{name:'计算与信息',badge:'计算',stat:'lore',desc:'算筹、机械计算器、计算机与算法'},
  DP:{name:'外交与条约',badge:'外交',stat:'wealth',desc:'会盟、使节、朝贡、条约与国际组织'},
  MG:{name:'移民与侨民',badge:'移民',stat:'people',desc:'屯垦、南渡、海外移民与离散社群'}
};
const BOUND={
  RI:'礼制按礼书与考古可考年代记录；文本理想与实际施行常有距离，不作通例。',
  HO:'古代计时精度与授时制度按文献及遗物可考年代记录，不与现代计量等同。',
  CI:'早期计算工具与现代计算机之间不存在直接传承链，按各自可考年代分别记录。',
  DP:'条约与疆界条款按文本可考年代记录，不用于现代边界主张。'
};
const REGIONS=['huaxia','meso','nile','aegean','indus','maya','steppe'];

/* ---------- 解析 ---------- */
const rows=[];let region=null;
for(const l of LS){
  const rh=l.match(/^###\s*文明圈：(\w+)/);if(rh){region=rh[1];continue;}
  if(!l.startsWith('|'))continue;
  const c=l.split('|');if(c.length!==11)continue;
  const m=c[1].trim().match(/^([A-Z]{2})(\d{2})$/);if(!m)continue;
  const key=m[1];if(!DIMS[key])continue;
  const ys=parseYears(c[2]);
  const prec=(['exact','range','approximate','legendary'].indexOf(c[3].trim())>=0)?c[3].trim():'approximate';
  const nums=refsOf(c[8]);
  const sources=nums.map(n=>SRC[n]).filter(Boolean);
  rows.push({prefix:key,rawId:c[1].trim(),region:(region&&REGIONS.indexOf(region)>=0)
      ?region:inferRegion(c[5].trim()+' '+c[6].trim()),regionInferred:!(region&&REGIONS.indexOf(region)>=0),
    y0:ys.y0,y1:ys.y1,rawYear:c[2].trim(),precision:prec,
    category:c[4].trim(),title:c[5].trim(),
    summary:c[6].trim().replace(/\[\d+\]/g,'').replace(/\s+/g,' ').trim(),
    status:c[7].trim(),consensus:consensus(c[7].trim()),
    play:c[9].trim(),                          // ★ 游戏交互提示
    refs:nums.map(n=>'x8_'+n),sources:sources,
    sourcePending:nums.some(n=>!SRC[n]||SRC[n].pending),
    missing:nums.filter(n=>!SRC[n])});
}

/* ---------- 合并 ---------- */
const civ=J('civilization.json'),civSources=J('civ_sources.json');
Object.keys(SRC).forEach(n=>{civSources['x8_'+n]=SRC[n];});
const base=civ.items.filter(x=>x.srcReport!=='x8');
const maxNo={};
base.forEach(x=>{const m=String(x.id).match(/^([A-Z]{1,2})(\d{3})$/);
  if(m)maxNo[m[1]]=Math.max(maxNo[m[1]]||0,+m[2]);});
const dims=civ.dimensions.slice();
Object.keys(DIMS).forEach(k=>{if(dims.some(d=>d.key===k))return;
  const v=DIMS[k];dims.push({key:k,name:v.name,badge:v.badge,stat:v.stat,desc:v.desc});});
const dimName={};dims.forEach(d=>dimName[d.key]=d.name);
const added=[];
rows.forEach(r=>{
  maxNo[r.prefix]=(maxNo[r.prefix]||0)+1;
  const id=r.prefix+String(maxNo[r.prefix]).padStart(3,'0');
  const y={id:id,dim:r.prefix,dimName:dimName[r.prefix]||r.prefix,region:r.region,
    y0:r.y0,y1:r.y1,precision:r.precision,rawYear:r.rawYear,
    category:r.category,title:r.title,summary:r.summary,
    status:r.status,consensus:r.consensus,
    refs:r.refs,sources:r.sources,sourcePending:r.sourcePending||false,
    regionSource:r.regionInferred?'按条目内容推断的展示归类，非史实归属':'报告标注',
    play:r.play,boundary:BOUND[r.prefix]||null,layer:'fact',srcReport:'x8'};
  if(y.y1<-5000){y.ancient=true;y.y0=-5000;y.y1=-4800;}
  added.push(y);
});
civ.dimensions=dims;civ.items=base.concat(added);
fs.writeFileSync(path.join(D,'civilization.json'),JSON.stringify(civ,null,1),'utf8');
fs.writeFileSync(path.join(D,'civ_sources.json'),JSON.stringify(civSources,null,1),'utf8');

/* ---------- 校验 ---------- */
const bad=[];
if(rows.length!==48)bad.push('报告条目数 '+rows.length+' ≠ 48');
const miss=rows.flatMap(r=>r.missing);
if(miss.length)bad.push('来源编号未定义: '+[...new Set(miss)].join(','));
if(added.some(x=>!x.play))bad.push('有条目缺 interaction / play');
const ids=new Set();civ.items.forEach(x=>{if(ids.has(x.id))bad.push('重复 id '+x.id);ids.add(x.id);});
if(bad.length){console.error('校验失败:\n'+bad.slice(0,20).join('\n'));process.exit(1);}
console.log('导入 '+added.length+' 条 · 维度 '+dims.length+' · 总条目 '+civ.items.length);
console.log('出处 '+Object.keys(SRC).length+' 条 · 带 play 的条目 '+added.filter(x=>x.play).length+' 条');
console.log('新增维度: '+Object.keys(DIMS).map(k=>k+' '+DIMS[k].name).join('、'));
