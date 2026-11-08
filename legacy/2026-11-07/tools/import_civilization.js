/* tools/import_civilization.js —— 把「文明内容」考据报告转成游戏数据
   用法：node tools/import_civilization.js <考据报告.md>
   产出：data/civilization.json / data/civ_sources.json
   注意：本报告的引用编号 [n] 与政治史报告独立，故另存 civ_sources，避免编号碰撞。 */
const fs=require('fs'),path=require('path');
const SRC=process.argv[2]||path.join(__dirname,'..','..','dr:5b10e4c72cd57cdcb4a3a9a4b79ed690','上下五千年无尽编年文明内容考据数据.md');
const OUT=path.join(__dirname,'..','data');
const lines=fs.readFileSync(SRC,'utf8').split('\n');

/* ---- 引用来源 ---- */
const sources={};
const refStart=lines.findIndex(l=>/^## 引用来源/.test(l));
if(refStart>=0){
  for(let i=refStart+1;i<lines.length;i++){
    const m=lines[i].match(/^\[(\d+)\]\s+(https?:\/\/\S+)/);
    if(!m)continue;
    let quote='';
    if(lines[i+1]&&lines[i+1].startsWith('> '))quote=lines[i+1].slice(2).trim();
    sources[m[1]]={url:m[2],quote:quote};
  }
}

/* ---- 年代解析 ---- */
function tokenYear(seg,wholeHasCentury){
  const hasC=/世纪/.test(seg),hasM=/千纪/.test(seg);
  const neg=/前/.test(seg)&&!/公元/.test(seg);
  const m=seg.match(/(\d+)/);
  if(!m)return null;
  const n=+m[1];
  if(hasM)return neg?[-n*1000,-(n-1)*1000-1]:[(n-1)*1000+1,n*1000];
  // 整串带「世纪」且本段只是「前N」「约N」这类小数 → 也按世纪
  if(hasC||(wholeHasCentury&&n<=30))return neg?[-n*100,-(n-1)*100-1]:[(n-1)*100+1,n*100];
  return neg?[-n,-n]:[n,n];
}
function parseYears(raw,precision){
  const t=raw.trim();
  const wholeHasC=/世纪/.test(t);
  const parts=t.split(/[—–]/).map(x=>x.trim()).filter(Boolean);
  const a=tokenYear(parts[0]||t,wholeHasC);
  const b=parts.length>1?tokenYear(parts[1],wholeHasC):a;
  if(!a||!b)return {y0:0,y1:0,precision:precision};
  let y0=Math.min(a[0],b[0]),y1=Math.max(a[1],b[1]);
  // 游戏触发窗口：约略/传说适当放宽，否则远古条目几乎永远遇不到
  const pad=precision==='legendary'?150:precision==='approximate'?60:
            precision==='range'?20:10;
  if(/约/.test(t))y0-=Math.max(pad,30);
  y0-=pad;y1+=pad;
  return {y0:y0,y1:y1,precision:precision};
}
function consensus(status){
  if(/传说|后世追述/.test(status))return 'legendary_retroactive';
  if(/争议/.test(status))return 'date_contested';
  return 'settled';
}
const DIM={'人物':'P','工艺技术':'T','文化':'C','商业':'B'};
const DIM_NAME={P:'人物',T:'工艺技术',C:'文化',B:'商业'};

let dim=null,region=null;
const items=[];
for(let i=0;i<lines.length;i++){
  const l=lines[i];
  const dh=l.match(/^## 维度：(.+?)\s*$/);
  if(dh){dim=DIM[dh[1].trim()]||null;region=null;continue;}
  if(/^## /.test(l)&&!/^## 维度/.test(l)){dim=null;region=null;continue;}
  const rh=l.match(/^### 文明圈：(\w+)/);
  if(rh){region=rh[1];continue;}
  if(!dim||!region)continue;
  const m=l.match(/^\|\s*([PTCB]\d{3})\s*\|([^|]*)\|([^|]*)\|([^|]*)\|([^|]*)\|([^|]*)\|([^|]*)\|([^|]*)\|\s*$/);
  if(!m)continue;
  const [_,id,rawYear,prec,category,title,summary,status,refsRaw]=m;
  const precision=(['exact','range','approximate','legendary'].indexOf(prec.trim())>=0)?prec.trim():'approximate';
  const ys=parseYears(rawYear,precision);
  const refs=[...refsRaw.matchAll(/\[(\d+)\]/g)].map(x=>x[1]);
  items.push({
    id:id,dim:dim,dimName:DIM_NAME[dim],region:region,
    y0:ys.y0,y1:ys.y1,precision:precision,
    rawYear:rawYear.trim(),category:category.trim(),
    title:title.trim(),summary:summary.trim(),
    status:status.trim(),consensus:consensus(status),
    refs:refs,
    sources:refs.map(n=>sources[n]).filter(Boolean)
  });
}

/* ---- 校验 ---- */
const ids=new Set(),bad=[];
for(const x of items){
  if(ids.has(x.id))bad.push('重复 id '+x.id);
  ids.add(x.id);
  if(!Number.isFinite(x.y0)||!Number.isFinite(x.y1)||x.y0>x.y1)bad.push('年代异常 '+x.id+' '+x.y0+'~'+x.y1);
  if(!x.title||!x.summary)bad.push('字段缺失 '+x.id);
  if(!x.sources.length)bad.push('无出处 '+x.id);
}
if(bad.length){console.error('校验失败:\n'+bad.slice(0,20).join('\n'));process.exit(1);}

const dimensions=[
  {key:'P',name:'人物',stat:'lore',desc:'真实历史名人：思想家、工匠、医家、航海者、商人与君主'},
  {key:'T',name:'工艺技术',stat:'craft',desc:'材料、农具、印刷、水利、天文、动力与通信'},
  {key:'C',name:'文化',stat:'lore',desc:'文字、典籍、思想、宗教、教育、艺术与出版'},
  {key:'B',name:'商业',stat:'wealth',desc:'货币、契约、商路、市舶、银行、公司与贸易体系'}
];
const stat={};
for(const d of dimensions)stat[d.key]=items.filter(x=>x.dim===d.key).length;
const byRegion={};
items.forEach(x=>byRegion[x.region]=(byRegion[x.region]||0)+1);

fs.writeFileSync(path.join(OUT,'civilization.json'),
  JSON.stringify({dimensions:dimensions,items:items},null,1),'utf8');
fs.writeFileSync(path.join(OUT,'civ_sources.json'),JSON.stringify(sources,null,1),'utf8');
console.log('条目',items.length,'· 出处',Object.keys(sources).length);
console.log('按维度',stat);
console.log('按文明圈',byRegion);
console.log('年代样例');
items.filter(x=>['P002','T006','C001','B001','T011','P036'].indexOf(x.id)>=0)
  .forEach(x=>console.log(' ',x.id,x.rawYear,'→',x.y0,'~',x.y1,x.precision,'|',x.title));
