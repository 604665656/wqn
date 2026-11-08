/* tools/import_report.js —— 把考据报告转成游戏数据（可重复运行）
   用法：node tools/import_report.js <考据报告.md>
   产出：data/history.json / data/entities.json / data/sources.json
   说明：报告中的年代按「公元前 N 年」书写；游戏内部沿用 -N 表示公元前 N 年、
        且无公元 0 年（0 由引擎归一为 1），因此跨前后计算需用 astro(y)=y<0?y+1:y。 */
const fs=require('fs'),path=require('path');
const SRC=process.argv[2]||path.join(__dirname,'..','..','dr:1018','result.md');
const OUT=path.join(__dirname,'..','data');
const md=fs.readFileSync(SRC,'utf8');
const lines=md.split('\n');

/* ---- 引用来源 ---- */
const sources={};
for(let i=0;i<lines.length;i++){
  const m=lines[i].match(/^\[(\d+)\]\s+(https?:\/\/\S+)/);
  if(m){
    let quote='';
    if(lines[i+1]&&lines[i+1].startsWith('> '))quote=lines[i+1].slice(2).trim();
    sources[m[1]]={url:m[2],quote:quote};
  }
}

/* ---- 年代解析 ---- */
function centuryRange(bc,n){
  return bc?[-n*100,-(n-1)*100-1]:[(n-1)*100+1,n*100];
}
function parseYears(raw){
  const precision=/exact/.test(raw)?'exact':/legendary/.test(raw)?'legendary':
    /approximate/.test(raw)?'approximate':'range';
  let t=raw.replace(/（[^）]*）/g,'').replace(/约/g,'').replace(/年以后/g,'年').trim();
  // 「前10—前9世纪」→「前10世纪—前9世纪」，避免只匹配到后半段
  if(/世纪/.test(t)&&/[—–]/.test(t)){
    t=t.replace(/^((?:前)?\d+)([—–])((?:前)?\d+世纪)$/,'$1世纪$2$3');
  }
  if(/世纪/.test(t)){
    const nums=[];const re=/(前)?(\d+)\s*世纪/g;let m;
    while((m=re.exec(t)))nums.push({bc:!!m[1],n:+m[2]});
    if(!nums.length)return {y0:0,y1:0,precision:'approximate'};
    const a=centuryRange(nums[0].bc,nums[0].n);
    const b=nums.length>1?centuryRange(nums[1].bc,nums[1].n):a;
    return {y0:a[0],y1:nums.length>1?b[1]:a[1],precision:precision==='exact'?'approximate':precision};
  }
  const parts=t.split(/[—–]/).map(x=>x.trim()).filter(Boolean);
  const one=p=>{const bc=/前/.test(p);const n=parseInt(p.replace(/[^\d]/g,''),10);return isNaN(n)?0:(bc?-n:n);};
  const y0=one(parts[0]||t);
  const y1=parts.length>1?one(parts[1]):y0;
  return {y0:Math.min(y0,y1),y1:Math.max(y0,y1),precision:precision};
}
function consensus(status){
  if(/传说|后世追述/.test(status))return 'legendary_retroactive';
  if(/争议/.test(status))return 'date_contested';
  return 'settled';
}
function splitCol(col){
  const parts=col.split(/[；;]/);
  const status=(parts[0]||'学界通说').trim();
  const rest=(parts.slice(1).join('；')||'').trim();
  const refs=[...rest.matchAll(/\[(\d+)\]/g)].map(m=>m[1]);
  const cite=rest.replace(/\[\d+\]/g,'').replace(/[\s、,，;；]+$/,'').trim();
  return {status:status,consensus:consensus(status),cite:cite,refs:refs};
}

/* ---- 七文明圈事件 ---- */
const CIRCLES=[
  {key:'huaxia',re:/^## 二、华夏/,report:'华夏·黄河'},
  {key:'meso',re:/^## 三、两河/,report:'两河·新月沃地'},
  {key:'nile',re:/^## 四、尼罗/,report:'尼罗·埃及'},
  {key:'aegean',re:/^## 五、爱琴/,report:'爱琴—地中海/罗马'},
  {key:'indus',re:/^## 六、印度河/,report:'印度河—南亚'},
  {key:'maya',re:/^## 七、中美洲/,report:'中美洲'},
  {key:'steppe',re:/^## 八、欧亚草原/,report:'欧亚草原'}
];
function sectionBounds(re){
  const start=lines.findIndex(l=>re.test(l));
  if(start<0)return [-1,-1];
  let end=lines.length;
  for(let i=start+1;i<lines.length;i++)if(/^## /.test(lines[i])){end=i;break;}
  return [start,end];
}
const events=[],legends=[];
for(const c of CIRCLES){
  const [a,b]=sectionBounds(c.re);
  if(a<0)throw new Error('未找到章节 '+c.report);
  for(let i=a;i<b;i++){
    const l=lines[i];
    const m=l.match(/^\|\s*([EL]\d{3})\s*\|([^|]*)\|([^|]*)\|([^|]*)\|([^|]*)\|\s*$/);
    if(!m)continue;
    const [_,id,yr,title,summary,col]=m;
    const ys=parseYears(yr.trim()),meta=splitCol(col.trim());
    const obj={id:id,region:c.key,circle:c.report,
      y0:ys.y0,y1:ys.y1,precision:ys.precision,
      status:meta.status,consensus:meta.consensus,
      title:title.trim(),summary:summary.trim(),
      cite:meta.cite,refs:meta.refs,
      sources:meta.refs.map(n=>sources[n]).filter(Boolean)};
    if(id[0]==='L')legends.push(obj);else events.push(obj);
  }
}

/* ---- 十二实体六阶段 ---- */
const ENTITY_RE=/^### 9\.\d+\s+(.+)$/;
const entityNames=[];
for(let i=0;i<lines.length;i++){
  const m=lines[i].match(ENTITY_RE);
  if(m)entityNames.push({name:m[1].trim(),line:i});
}
const REG_OF={
  '姬周':'huaxia','嬴秦':'huaxia','刘汉':'huaxia','李唐':'huaxia','赵宋':'huaxia','朱明':'huaxia',
  '美第奇家族':'aegean','哈布斯堡王朝':'aegean','罗马共和国→罗马帝国':'aegean',
  '阿拔斯王朝':'meso','莫卧儿帝国':'indus','奥斯曼帝国':'aegean'
};
const entities=[];
for(let k=0;k<entityNames.length;k++){
  const {name,line}=entityNames[k];
  const end=k+1<entityNames.length?entityNames[k+1].line:lines.findIndex((l,i)=>i>line&&/^## 十、/.test(l));
  const phases=[];
  for(let i=line;i<end&&i<lines.length;i++){
    const m=lines[i].match(/^\|\s*(建立|扩张|鼎盛|分裂或转折|衰落|终结)\s*\|([^|]*)\|([^|]*)\|([^|]*)\|([^|]*)\|\s*$/);
    if(!m)continue;
    const ys=parseYears(m[2].trim());
    phases.push({phase:m[1],label:m[2].trim(),year:ys.y0,y1:ys.y1,
      precision:m[3].trim()||ys.precision,
      event:m[4].trim(),note:m[5].trim()});
  }
  if(phases.length!==6)throw new Error(name+' 阶段数='+phases.length);
  entities.push({id:'C'+String(k+1).padStart(2,'0'),name:name,
    type:/家族|王朝|共和国|帝国/.test(name)?'dynasty':'polity',
    region:REG_OF[name]||'huaxia',
    startYear:phases[0].year,endYear:phases[5].year,phases:phases});
}

/* ---- 终结争议 ---- */
const disputes={};
const sec=lines.findIndex(l=>/^## 十、/.test(l));
if(sec>=0){
  for(let i=sec;i<lines.length;i++){
    const m=lines[i].match(/^\|\s*([^|]+?)\s*\|\s*([^|]*?)\s*\|\s*([^|]*?)\s*\|\s*([^|]*?)\s*\|\s*$/);
    if(m&&!/^\|/.test(m[1])&&m[1]!=='entity'&&!/^---/.test(m[1])){
      disputes[m[1].trim()]={year:m[2].trim(),reason:m[3].trim(),alternatives:m[4].trim()};
    }
  }
}

fs.writeFileSync(path.join(OUT,'history.json'),JSON.stringify({events,legends},null,1),'utf8');
fs.writeFileSync(path.join(OUT,'entities.json'),JSON.stringify({entities,disputes},null,1),'utf8');
fs.writeFileSync(path.join(OUT,'sources.json'),JSON.stringify(sources,null,1),'utf8');
console.log('史实',events.length,'· 传说',legends.length,'· 实体',entities.length,
  '· 争议',Object.keys(disputes).length,'· 出处',Object.keys(sources).length);
console.log('实体样例：',entities.slice(0,3).map(e=>e.name+'['+e.startYear+','+e.endYear+']').join(' '));
console.log('年代样例：',events.slice(0,3).map(e=>e.id+':'+e.y0+'~'+e.y1+' '+e.precision).join(' | '));
