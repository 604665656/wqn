/* tools/import_extra.js —— 合并四份额外考据报告，扩展文明维度
   用法：node tools/import_extra.js
   产出（覆盖写）：data/civilization.json / data/civ_sources.json
   说明：各报告引用编号独立，合并时加 r1_/r2_/r3_/r4_ 命名空间避免碰撞。 */
const fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..','..');
const D=path.join(__dirname,'..','data');
const J=f=>JSON.parse(fs.readFileSync(path.join(D,f),'utf8'));
const REPORTS=[
  {key:'r1',path:'dr:10/历史页游跨文明考据数据清单.md'},
  {key:'r2',path:'dr:0103afbdab46bcec14c7f7a82ab64b69/result.md'},
  {key:'r3',path:'dr:20261105/history_codices.md'},
  {key:'r4',path:'dr:3f37d6e53f5b8716bdad014f5b24ed9f/历史考据数据清单.md'}
];
const DIM_NAME={
  P:'人物',T:'工艺技术',C:'文化',B:'商业',
  R:'神话宗教',M:'数学',K:'化学',A:'考古',U:'音乐',F:'美术',J:'鉴宝',
  G:'植物',V:'美食',N:'数术',W:'军事',E:'娱乐',L:'法律',S:'做生意',H:'航海',X:'飞天'
};
const DIM_STAT={
  P:'lore',T:'craft',C:'lore',B:'wealth',
  R:'faith',M:'lore',K:'craft',A:'lore',U:'cohesion',F:'cohesion',J:'wealth',
  G:'food',V:'food',N:'lore',W:'might',E:'cohesion',L:'cohesion',S:'wealth',H:'wealth',X:'craft'
};
const DIM_BADGE={
  P:'人物',T:'工艺',C:'文化',B:'商业',
  R:'神话宗教',M:'数学',K:'化学',A:'考古',U:'音乐',F:'美术',J:'鉴宝',
  G:'植物',V:'美食',N:'数术',W:'军事',E:'娱乐',L:'法律',S:'做生意',H:'航海',X:'飞天'
};
/* 术数 / 神话 / 飞天意象的额外边界声明 */
const BOUNDARY={
  N:'本条记录的是传统术数体系的文献记载，不表示其预测或推演效用。',
  R:'本条含信仰传统或神话叙事；神话人物的历史性不作肯定，与可考历史事件分层呈现。',
  X:'早期飞行意象属神话或传说层，近代以后才为可考的技术首飞／发射年份。'
};

/* ---- 年代解析（沿用既有规则，并兼容「约前14世纪—前11世纪」这类写法） ---- */
function tokenYear(seg,wholeHasCentury){
  const hasC=/世纪/.test(seg),hasM=/千纪/.test(seg);
  const neg=/前/.test(seg)&&!/公元/.test(seg);
  const m=seg.match(/(\d+)/);
  if(!m)return null;
  const n=+m[1];
  if(hasM)return neg?[-n*1000,-(n-1)*1000-1]:[(n-1)*1000+1,n*1000];
  if(hasC||(wholeHasCentury&&n<=30))return neg?[-n*100,-(n-1)*100-1]:[(n-1)*100+1,n*100];
  return neg?[-n,-n]:[n,n];
}
function parseYears(raw,precision){
  const t=raw.trim(),wholeHasC=/世纪/.test(t);
  const parts=t.split(/[—–]/).map(x=>x.trim()).filter(Boolean);
  const a=tokenYear(parts[0]||t,wholeHasC),b=parts.length>1?tokenYear(parts[1],wholeHasC):a;
  if(!a||!b)return {y0:0,y1:0};
  let y0=Math.min(a[0],b[0]),y1=Math.max(a[1],b[1]);
  const pad=precision==='legendary'?150:precision==='approximate'?60:precision==='range'?20:10;
  if(/约/.test(t))y0-=Math.max(pad,30);
  y0-=pad;y1+=pad;
  return {y0:y0,y1:y1};
}
function consensus(status){
  if(/传说|后世追述/.test(status))return 'legendary_retroactive';
  if(/争议/.test(status))return 'date_contested';
  return 'settled';
}
function hostRank(url){
  const u=String(url).toLowerCase();
  if(/gov\.cn|gov\.|edu\.|ac\.|org|museum|britannica|cambridge|jstor|cnki|nopss|cssn|kaogu|wenwu|unesco/.test(u))return '机构／学术';
  if(/baike\.baidu|wikipedia|sogou|sohu|163\.com|qq\.com|thepaper|people\.com\.cn|xinhuanet|news\.cn/.test(u))return '百科／媒体';
  return '其他';
}

const base=J('civilization.json');
const oldSources=J('civ_sources.json');
const sources=Object.assign({},oldSources);
// 幂等：基线只取原有四维，重复运行不会把已合并的新维度再累加一次
const items=base.items.filter(x=>['P','T','C','B'].indexOf(x.dim)>=0).slice();
const seenIds=new Set(items.map(x=>x.id));
const treasures=[],biographies=[],unlocks=[];
let added=0,skipped=0;

for(const R of REPORTS){
  const file=path.join(ROOT,R.path);
  if(!fs.existsSync(file)){console.error('缺报告 '+file);process.exit(1);}
  const lines=fs.readFileSync(file,'utf8').split('\n');
  /* 引用来源：只看 ## 引用来源 之后 */
  const ri=lines.findIndex(l=>/^## 引用来源/.test(l));
  if(ri>=0)for(let i=ri+1;i<lines.length;i++){
    const m=lines[i].match(/^\[(\d+)\]\s+(https?:\/\/\S+)/);
    if(!m)continue;
    let quote=lines[i+1]&&lines[i+1].startsWith('> ')?lines[i+1].slice(2).trim():'';
    sources[R.key+'_'+m[1]]={url:m[2],quote:quote,rank:hostRank(m[2]),report:R.key};
  }
  let dim=null,region=null,section=null;
  for(let i=0;i<lines.length;i++){
    const l=lines[i];
    const dh=l.match(/^## 维度：(.+?)\s*$/);
    if(dh){
      const name=dh[1].trim();
      dim=Object.keys(DIM_NAME).find(k=>DIM_NAME[k]===name)||null;
      section='dim';region=null;continue;
    }
    if(/^## /.test(l)){
      if(/鉴宝卡/.test(l)){section='treasure';dim=null;region=null;continue;}
      if(/人物生平四段/.test(l)){section='bio';dim=null;region=null;continue;}
      if(/技术解锁树/.test(l)){section='unlock';dim=null;region=null;continue;}
      section=null;dim=null;region=null;continue;
    }
    const rh=l.match(/^### 文明圈：(\w+)/);
    if(rh){region=rh[1];continue;}
    const cells=l.split('|');
    /* 主表 8 列 → 10 段 */
    if(section==='dim'&&dim&&region&&cells.length===10){
      const id=cells[1].trim();
      if(!/^[A-Z]{1,2}\d{3}$/.test(id))continue;
      if(seenIds.has(id)){skipped++;continue;}
      const rawYear=cells[2].trim(),prec=cells[3].trim(),
            category=cells[4].trim(),title=cells[5].trim(),
            summary=cells[6].trim(),status=cells[7].trim(),refsRaw=cells[8].trim();
      const precision=(['exact','range','approximate','legendary'].indexOf(prec)>=0)?prec:'approximate';
      const ys=parseYears(rawYear,precision);
      const refs=[...refsRaw.matchAll(/\[(\d+)\]/g)].map(x=>R.key+'_'+x[1]);
      const srcs=refs.map(n=>sources[n]).filter(Boolean);
      if(!title||!summary||!srcs.length){skipped++;continue;}
      seenIds.add(id);
      items.push({id:id,dim:dim,dimName:DIM_NAME[dim],region:region,
        y0:ys.y0,y1:ys.y1,precision:precision,rawYear:rawYear,
        category:category,title:title,
        // summary 里可能内嵌 [n]，去掉以免与 sources 混淆
        summary:summary.replace(/\[\d+\]/g,'').replace(/\s+/g,' ').trim(),
        status:status,consensus:consensus(status),
        refs:refs,sources:srcs,
        boundary:BOUNDARY[dim]||null});
      added++;continue;
    }
    /* 鉴宝卡 9 列 → 11 段 */
    if(section==='treasure'&&cells.length===11&&/^[A-Z]{1,2}\d{3}$/.test(cells[1].trim())){
      const refs=[...cells[9].matchAll(/\[(\d+)\]/g)].map(x=>R.key+'_'+x[1]);
      treasures.push({id:cells[1].trim(),name:cells[2].trim(),rawYear:cells[3].trim(),
        material:cells[4].trim(),provenance:cells[5].trim(),museum:cells[6].trim(),
        points:cells[7].trim(),dispute:cells[8].trim(),
        sources:refs.map(n=>sources[n]).filter(Boolean)});continue;
    }
    /* 人物生平 7 列 → 9 段 */
    if(section==='bio'&&cells.length===9&&/^P\d{3}$/.test(cells[1].trim())){
      const refs=[...cells[7].matchAll(/\[(\d+)\]/g)].map(x=>R.key+'_'+x[1]);
      biographies.push({id:cells[1].trim(),name:cells[2].trim(),born:cells[3].trim(),
        active:cells[4].trim(),work:cells[5].trim(),legacy:cells[6].trim(),
        sources:refs.map(n=>sources[n]).filter(Boolean)});continue;
    }
    /* 解锁树 3 列 → 5 段 */
    if(section==='unlock'&&cells.length===5&&/^[A-Z]{1,2}\d{3}$/.test(cells[1].trim())){
      unlocks.push({id:cells[1].trim(),
        requires:cells[2].trim().split(/[,，]/).map(x=>x.trim()).filter(x=>x&&x!=='无'),
        note:cells[3].trim()});continue;
    }
  }
}

/* ---- 维度表：原 4 维 + 新 16 维 ---- */
const dimensions=Object.keys(DIM_NAME).map(k=>({
  key:k,name:DIM_NAME[k],badge:DIM_BADGE[k],stat:DIM_STAT[k],
  desc:(base.dimensions.find(d=>d.key===k)||{}).desc||
    ({R:'信仰传统、神话叙事与宗教制度',M:'记数、几何、代数与近代数学',
      K:'材料工艺与近代化学学科',A:'遗址发现、出土物与断代方法',
      U:'乐器、乐律、记谱与录音',F:'材料、技法、体裁与流派',
      J:'器物、材质、现藏与断代争议',G:'驯化、引种、本草与育种',
      V:'食物、技法、礼制与食品工业',N:'传统术数体系（不作效用肯定）',
      W:'兵制、装备、筑城与军制',E:'博弈、竞技、游艺与影像娱乐',
      L:'成文法、刑律、判例与国际法',S:'经营形态、字号、账簿与售卖',
      H:'舟船、航路、导航与现代航运',X:'飞行意象、航空与航天'})[k]||''
}));

/* ---- 校验 ---- */
const bad=[];
const ids=new Set();
for(const x of items){
  if(ids.has(x.id))bad.push('重复 id '+x.id);ids.add(x.id);
  if(!Number.isFinite(x.y0)||!Number.isFinite(x.y1)||x.y0>x.y1)bad.push('年代异常 '+x.id+' '+x.y0+'~'+x.y1);
  if(!x.title||!x.summary)bad.push('字段缺失 '+x.id);
  if(!x.sources||!x.sources.length)bad.push('无出处 '+x.id);
}
if(bad.length){console.error('校验失败:\n'+bad.slice(0,25).join('\n'));process.exit(1);}

fs.writeFileSync(path.join(D,'civilization.json'),JSON.stringify({
  dimensions:dimensions,items:items,treasures:treasures,
  biographies:biographies,unlocks:unlocks
},null,1),'utf8');
fs.writeFileSync(path.join(D,'civ_sources.json'),JSON.stringify(sources,null,1),'utf8');

const byDim={};items.forEach(x=>byDim[x.dim]=(byDim[x.dim]||0)+1);
const byRegion={};items.forEach(x=>byRegion[x.region]=(byRegion[x.region]||0)+1);
console.log('合并完成：基线 '+items.length+' 条（含新增 '+added+' 条，跳过 '+skipped+'）＝ 合计 '+items.length+' 条');
console.log('维度',Object.keys(byDim).length,'→',JSON.stringify(byDim));
console.log('文明圈',JSON.stringify(byRegion));
console.log('鉴宝卡 '+treasures.length+' · 人物生平 '+biographies.length+' · 解锁树 '+unlocks.length);
console.log('出处 '+Object.keys(sources).length+'（新增 '+Object.keys(sources).filter(k=>k.indexOf('r')===0&&k.indexOf('_')>0).length+'）');
const ranks={};Object.values(sources).forEach(s=>ranks[s.rank||'既有']=(ranks[s.rank||'既有']||0)+1);
console.log('出处分级',JSON.stringify(ranks));
