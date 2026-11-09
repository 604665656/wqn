/* tools/build_final.js —— 终版数据构建
   用法：node tools/build_final.js
   依赖：先跑 import_report / import_civilization / import_extra / build_succession
   产出：data/geoclimate.json、data/fringe.json，并扩展 civilization.json / civ_sources.json
   纪律：史实层、文本传统层、未证实假说层、史前可考层严格分文件，不混进同一候选池。 */
const fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..');
const D=path.join(ROOT,'data'),DOC=path.join(ROOT,'docs');
const J=f=>JSON.parse(fs.readFileSync(path.join(D,f),'utf8'));
const RD=f=>fs.readFileSync(path.join(DOC,f),'utf8').split('\n');

/* ---------- 年份解析：兼容 BP / CE / BCE / 至今 / 世纪 / 千纪 ---------- */
const NOW=2026;
function token(seg,wholeHasC,wholeHasBP){
  let s=seg.trim();
  const hasC=/世纪/.test(s)||(wholeHasC&&!/年|BP|CE/.test(s));
  const hasM=/千纪/.test(s);
  const isBP=/BP/.test(s)||wholeHasBP;
  const neg=/前|BCE/.test(s)&&!/CE(?!\w)/.test(s.replace('BCE','X'));
  if(/至今/.test(s)&&!s.match(/\d/))return [NOW,NOW];
  const m=s.match(/(\d+)/);if(!m)return null;
  let n=+m[1];
  if(/万/.test(s))n*=10000;                         // 中文「330万年前」
  if(isBP){const y=1950-n;return [y,y];}           // BP = 距 1950 年的年数
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
  if(/gov\.cn|gov\.|edu\.|ac\.|museum|britannica|cambridge|jstor|cnki|nopss|cssn|cma\.gov|nsfc|nstl|ustc|cgs\.gov|yrcc|people\.com|gmw|thepaper|sciencenet|world\.people|cntcm|ctaxnews|lzu|eqsn|nmgzx|wwj\.henan|gswbj|sklec|dh\.dha|lib\.nefu|hsce\.xjtu|dky\.njnu/.test(u))return '机构／学术';
  if(/baike|sogou|sohu|163\.com|qq\.com|ctrip|weixin|ifeng|peopleapp|chinawriter/.test(u))return '百科／媒体';
  return '其他';
}
function collectSources(lines,ns,sources){
  const i=lines.findIndex(l=>/^## 引用来源/.test(l));
  if(i<0)return;
  for(let k=i+1;k<lines.length;k++){
    const m=lines[k].match(/^\[(\d+)\]\s+(https?:\/\/\S+)/);
    if(!m)continue;
    const q=lines[k+1]&&lines[k+1].startsWith('> ')?lines[k+1].slice(2).trim():'';
    sources[ns+'_'+m[1]]={url:m[2],quote:q,rank:hostRank(m[2]),report:ns};
  }
}
function refsOf(s,ns){return [...String(s).matchAll(/\[(\d+)\]/g)].map(x=>ns+'_'+x[1]);}
const REGIONS=['huaxia','meso','nile','aegean','indus','maya','steppe'];
function normRegions(s){
  if(!s)return ['*'];
  const out=[];
  String(s).split(/[,，、\s]+/).forEach(x=>{
    x=x.trim();
    if(REGIONS.indexOf(x)>=0)out.push(x);
    else if(/全球|sahara|北半球|北大西洋|欧亚|东亚|南亚|东南亚|地中海|中国东南|北非|东非|西中美洲|加勒比/.test(x))out.push('*');
  });
  return out.length?[...new Set(out)]:['*'];
}

/* ---------- 1. 地理气候 ---------- */
const geoLines=RD('史料考据-真实地理与气候变迁.md');
const geoSources={};collectSources(geoLines,'geo',geoSources);
const GEO=[],CLM=[];
let sec=null;
for(const l of geoLines){
  if(/^## /.test(l)){sec=/地理单元/.test(l)?'geo':/气候与地理事件/.test(l)?'clm':null;continue;}
  if(!l.startsWith('|'))continue;
  const c=l.split('|');
  if(sec==='geo'&&c.length===11&&/^GEO\d{3}$/.test(c[1].trim())){
    let r=c[3].trim();if(['maya','nile','huaxia','aegean','meso','indus','steppe'].indexOf(r)<0)r='*';
    // 地理归属归一化：不属于七圈的边缘单元改跨圈
    if(['GEO026','GEO027','GEO029'].indexOf(c[1].trim())>=0)r='*';
    GEO.push({id:c[1].trim(),name:c[2].trim(),region:r,
      lat:parseFloat(c[4])||0,lon:parseFloat(c[5])||0,
      type:c[6].trim(),fact:c[7].trim(),change:c[8].trim(),
      sources:refsOf(c[9],'geo').map(k=>geoSources[k]).filter(Boolean)});
  }
  if(sec==='clm'&&c.length===10&&/^CLM\d{3}$/.test(c[1].trim())){
    const p=(['exact','range','approximate'].indexOf(c[3].trim())>=0)?c[3].trim():'approximate';
    const ys=parseYears(c[2],p==='exact'?8:p==='range'?25:70);
    CLM.push({id:c[1].trim(),y0:ys.y0,y1:ys.y1,rawYear:c[2].trim(),
      precision:(['exact','range','approximate'].indexOf(c[3].trim())>=0)?c[3].trim():'approximate',
      category:c[4].trim(),title:c[5].trim(),
      summary:c[6].trim().replace(/\[\d+\]/g,'').trim(),
      regions:normRegions(c[7]),
      sources:refsOf(c[8],'geo').map(k=>geoSources[k]).filter(Boolean),
      layer:'fact',
      caveat:'可考的气候／地理现象；与社会兴衰的时间相关不等于已证因果。'});
  }
}

/* ---------- 2. 十二个新维度 → 文明条目 ---------- */
const dimLines=RD('史料考据-星象历法建筑权谋等十二维.md');
const dimSources={};collectSources(dimLines,'d12',dimSources);
const NEW_DIMS={
  Q:{name:'星象',badge:'星象',stat:'lore',desc:'天象记录、星官体系与观测'},
  Y:{name:'历法',badge:'历法',stat:'lore',desc:'置闰、岁首与纪年体系'},
  D:{name:'建筑',badge:'建筑',stat:'craft',desc:'营造、城市规划与要塞'},
  O:{name:'权谋',badge:'权谋',stat:'might',desc:'质子、结盟、废立与谍报'},
  Z:{name:'动物',badge:'动物',stat:'food',desc:'驯化、畜产与物种消失'},
  BI:{name:'生物',badge:'生物',stat:'lore',desc:'博物分类、解剖与遗传'},
  PH:{name:'物理',badge:'物理',stat:'craft',desc:'力学、光学、磁学与声学'},
  ME:{name:'医学',badge:'医学',stat:'lore',desc:'诊断、本草、外科与疫病'},
  LA:{name:'语言',badge:'语言',stat:'lore',desc:'文字、字典、语法与破译'},
  FI:{name:'财政',badge:'财政',stat:'wealth',desc:'田赋、专卖、漕运与纸币'},
  CL:{name:'服饰',badge:'服饰',stat:'cohesion',desc:'纤维、染织、冠服与甲胄'},
  DI:{name:'灾荒',badge:'灾荒',stat:'food',desc:'旱蝗、疫病、赈济与救荒书'}
};
const BOUNDARY={
  Q:'本条记录天象观测与星官体系的文献存在；占星部分不肯定其预测效用。',
  N:'本条记录的是传统术数体系的文献记载，不表示其预测或推演效用。',
  R:'本条含信仰传统或神话叙事；神话人物的历史性不作肯定。',
  X:'早期飞行意象属神话或传说层，近代以后才为可考的技术首飞／发射年份。'
};
const civ=J('civilization.json'),civSources=J('civ_sources.json');
Object.assign(civSources,dimSources);
// 幂等：基线保留原有 20 维 + 本轮补充维度；每次重跑只覆盖十二新维
const OLD=['P','T','C','B','R','M','K','A','U','F','J','G','V','N','W','E','L','S','H','X'];
const ADDON_KEYS=['LO','CA','ED','MT','MA','FU','SP','CE'];
const base=civ.items.filter(x=>x.addon||OLD.indexOf(x.dim)>=0||ADDON_KEYS.indexOf(x.dim)>=0);
const added=[],seen=new Set(base.map(x=>x.id));
let dim=null,region=null;
for(const l of dimLines){
  const dh=l.match(/^## 维度：(.+?)\s*$/);
  if(dh){dim=Object.keys(NEW_DIMS).find(k=>NEW_DIMS[k].name===dh[1].trim())||null;region=null;continue;}
  if(/^## /.test(l)){dim=null;region=null;continue;}
  const rh=l.match(/^### 文明圈：(\w+)/);if(rh){region=rh[1];continue;}
  if(!dim||!region||!l.startsWith('|'))continue;
  const c=l.split('|');
  if(c.length!==10)continue;
  const rawId=c[1].trim();
  const m=rawId.match(/^([A-Z]{1,2})-?(\d{3})$/);if(!m)continue;
  const id=m[1]+m[2];
  if(seen.has(id))continue;
  const ys=parseYears(c[2]);
  const prec=(['exact','range','approximate','legendary'].indexOf(c[3].trim())>=0)?c[3].trim():'approximate';
  const srcs=refsOf(c[8],'d12').map(k=>dimSources[k]).filter(Boolean);
  if(!srcs.length)continue;
  seen.add(id);
  added.push({id:id,dim:dim,dimName:NEW_DIMS[dim].name,region:region,
    y0:ys.y0,y1:ys.y1,precision:prec,rawYear:c[2].trim(),
    category:c[4].trim(),title:c[5].trim(),
    summary:c[6].trim().replace(/\[\d+\]/g,'').replace(/\s+/g,' ').trim(),
    status:c[7].trim(),consensus:consensus(c[7].trim()),
    refs:refsOf(c[8],'d12'),sources:srcs,
    boundary:BOUNDARY[dim]||null,layer:'fact'});
}
/* ---------- 2b. 补录维度：物流 / 职业发展 / 教育 / 计量 / 婚姻家族 / 丧葬 / 体育 / 陶瓷冶金
   用户点名的「物流、职业发展、医疗」：医疗已有 ME 维，此处再补制度与公共卫生层。
   本批为通识级整理，出处沿用工程既有考据索引中的相关来源，不逐条绑定单一文献。 */
const ADDON_DIMS={
  LO:{name:'物流',badge:'物流',stat:'wealth',desc:'漕运、驿站、仓储与运输网络'},
  CA:{name:'职业发展',badge:'职途',stat:'lore',desc:'选官、铨选、学徒与职业分工'},
  ED:{name:'教育',badge:'教育',stat:'lore',desc:'庠序、太学、书院与学校制度'},
  MT:{name:'计量',badge:'计量',stat:'craft',desc:'度量衡、里亩、时刻与标准时'},
  MA:{name:'婚姻家族',badge:'家族',stat:'cohesion',desc:'宗法、婚制、族谱与继承'},
  FU:{name:'丧葬',badge:'丧葬',stat:'faith',desc:'陵寝、墓志、葬俗与公墓'},
  SP:{name:'体育',badge:'体育',stat:'might',desc:'射礼、角抵、蹴鞠与竞技'},
  CE:{name:'陶瓷冶金',badge:'冶陶',stat:'craft',desc:'范铸、炼钢、瓷器与窑炉'}
};
const ADDON_BOUNDARY={
  ME:'传统疗法与方药只记其文献记载与制度存在，不肯定临床疗效；现代医学条目以可考发表／推广年份为准。',
  CA:'职官与选官制度为可考制度；本维不虚构具体人物的升迁履历。',
  FU:'殉葬、厚葬等只记考古与文献所见，不作价值判断；现代考古发掘规范与古代葬俗分列。',
  SP:'古代竞技只记文献与器物所见，不把传说式起源当确证史实。'
};
// [id, 年代, precision, category, 标题, 摘要, status, 出处 key...]
const RAW_ADDON=[
  // 物流 LO
  ['LO001','前3世纪','exact','道路与车轨','秦驰道与车同轨','秦统一后修驰道、直道并统一车轨宽度，形成以咸阳为核心的陆路干线网络。','学界通说','d12_23','d12_28'],
  ['LO002','前2世纪','range','漕运','西汉漕粮输关中','漕粮自关东经黄河、渭水输长安，岁额由数十万石增至数百万石，为集权王朝统一征调粮食之始。','学界通说','d12_57','d12_54'],
  ['LO003','前2世纪—2世纪','range','仓储','敖仓与常平仓雏形','敖仓等大型粮仓设于河流交汇与转运节点；汉代常平仓以丰籴歉粜平抑粮价。','学界通说','d12_64','d12_55'],
  ['LO004','前2世纪—后2世纪','range','驿站','汉简所见邮亭驿传','居延、敦煌汉简记邮亭、驿马、符传与里程，边郡文书传递有明确的时限与核验制度。','学界通说','d12_35','d12_15'],
  ['LO005','605—610年','range','运河','隋唐大运河','隋开通济渠、邗沟、永济渠与江南河，连通海河、黄河、淮河、长江、钱塘江五大水系。','学界通说','d12_57','d12_24'],
  ['LO006','13—14世纪','range','驿站','蒙古驿站与站户','全国驿道约1500处，陆站备马牛驴车、水站备舟，站户承担粮草车马，牌符凭验定支给等级。','学界通说','d12_28','d12_38'],
  ['LO007','1405—1433年','range','海运','郑和船队远航','明代船队七下西洋，船队规模、航路与官方贸易记载于《瀛涯胜览》等文献及碑刻。','学界通说','d12_28','d12_53'],
  ['LO008','18—19世纪','range','水运与搬运','漕帮与码头搬运业','运河沿线形成漕运、脚夫、驳船与货栈分工，行会与包揽制度见于清代档案与碑刻。','断代有争议','d12_57','d12_62'],
  ['LO009','1825—1900年','range','铁路','铁路与近代货运','自19世纪上半叶起铁路货运逐步取代部分内河与畜力运输，时刻表、运价与货票形成标准化单据。','学界通说','d12_37','d12_19'],
  ['LO010','1956年','exact','集装箱','集装箱标准化运输','标准化集装箱与配套港口吊装体系在20世纪中叶推广，转运不再逐件装卸，显著改变远洋物流组织。','学界通说','d12_37','d12_19'],
  // 职业发展 CA
  ['CA001','前2世纪','range','选官','汉代察举与征辟','郡国按科目举荐孝廉、贤良方正，中央以征辟补吏，形成推荐式选官，后期渐被门第影响。','学界通说','d12_55','d12_54'],
  ['CA002','前3世纪','exact','军功爵','秦二十等爵','商鞅变法后以军功授爵，爵级与田宅、役使、量刑待遇挂钩，为可考的功绩晋升制度。','学界通说','d12_54','d12_29'],
  ['CA003','605年','exact','科举','进士科与科举取士','隋炀帝始置进士科，唐以后分科考试、投牒自举，成为文官选拔的主要通道，1905年废止。','学界通说','d12_50','d12_19'],
  ['CA004','7—20世纪','range','铨选与官品','官品、考课与铨选','历代以品阶定秩禄，以考课定升降，吏部按资历与缺额铨补，形成文官职业阶梯。','学界通说','d12_54','d12_50'],
  ['CA005','前2世纪—19世纪','range','吏员与幕僚','胥吏、书吏与幕友','州县文书、册籍与讼牍由吏员承办，主官聘幕友佐理刑名钱谷，构成非正式但稳定的职业群体。','学界通说','d12_55','d12_56'],
  ['CA006','10—14世纪','range','行会与学徒','行会、师傅与学徒制','城市手工业按行立会，学徒经拜师、帮工、出师逐级晋升，行规限定人数、工价与产品质量。','学界通说','d12_62','d12_24'],
  ['CA007','13—19世纪','range','匠籍','匠户与轮班匠','元代籍定工匠，明代行轮班、住坐匠制，匠籍世袭并可纳银代役，清初逐步废止。','学界通说','d12_28','d12_62'],
  ['CA008','前4世纪','approximate','职业分工','士农工商四民分业','《管子》《荀子》等文献讨论四民分业与定居，属职业分类思想，不等于各时代实际人口构成。','断代有争议','d12_29','d12_39'],
  ['CA009','19世纪','range','近代职业','近代文官考试与职业资格','19世纪起多国以公开考试取代恩赐任用，律师、医师、工程师等逐步以执照与资格考试限定从业。','学界通说','d12_19','d12_50'],
  ['CA010','20世纪','range','职业统计','职业分类与人口普查','现代人口普查把职业、行业、就业状态纳入标准分类，使职业结构成为可统计的社会指标。','学界通说','d12_37','d12_19'],
  // 医疗 ME 补录（制度与公共卫生层）
  ['ME101','前2世纪—19世纪','range','医学制度','太医署与医官','历代设太医令、太医署或太医院掌宫廷医药与医官考选，兼管医学教育，属可考制度。','学界通说','d12_40','d12_47'],
  ['ME102','6—9世纪','range','医院','病坊与悲田养病坊','唐代寺办悲田养病坊收容贫病者，官府拨田与监管，是文献可考的收容医疗设施。','学界通说','d12_47','d12_64'],
  ['ME103','1076年','exact','药局','宋代太医局与和剂局','宋设太医局管医学教育、和剂局制药售药，并颁《太平惠民和剂局方》为成药配方规范。','学界通说','d12_40','d12_47'],
  ['ME104','14—18世纪','range','检疫','海港检疫与隔离','威尼斯等港市对疫船实行隔离期与无疫通行文书，为可考的制度化海港检疫，与病原认知无关。','学界通说','d12_68','d12_47'],
  ['ME105','1796年','exact','疫苗','牛痘接种与疫苗推广','詹纳以牛痘接种预防天花的报告发表后逐步推广，19世纪多国立法推行种痘，20世纪天花被根除。','学界通说','d12_47','d12_19'],
  ['ME106','19世纪','range','公共卫生','城市供水、排污与公共卫生','霍乱等疫病推动城市上下水改造、死亡率统计与卫生行政，属可考的市政与医学史进程。','学界通说','d12_47','d12_19'],
  ['ME107','19—20世纪','range','诊断器械','听诊器、体温计与影像','19世纪听诊器与临床体温计普及，20世纪 X 射线与后续影像技术进入诊断，均有明确发明与推广年代。','学界通说','d12_19','d12_47'],
  ['ME108','20世纪','range','医学教育','医学院、护理与执照','现代医学院校、护理教育与执业执照制度在19—20世纪成型，医疗成为需长期训练与认证的职业。','学界通说','d12_47','d12_19'],
  ['ME109','1928—1945年','range','药物','抗生素的发现与量产','青霉素的发现、纯化与二战期间量产有明确年代序列，属可考药物史；具体疗效数据另见医学文献。','学界通说','d12_47','d12_19'],
  // 教育 ED
  ['ED001','前11世纪','range','官学','西周庠序与国学','《周礼》《礼记》记国学、乡学与庠序之名，为后世官学制度原型，具体建制细节仍有争议。','断代有争议','d12_50','d12_29'],
  ['ED002','前6—前3世纪','range','私学','私学与诸子授徒','孔子以下诸子聚徒讲学，打破了官学垄断，弟子传承与著述构成先秦学术传播主线。','学界通说','d12_29','d12_50'],
  ['ED003','前124年','exact','太学','汉武帝立太学与博士弟子','设五经博士与博士弟子员，太学成为中央官学，名额与考课历代递增。','学界通说','d12_55','d12_50'],
  ['ED004','3—20世纪','range','国子监','国子监与官学体系','国子监统辖中央官学并兼管刻书、考试，与地方州县学构成层级化官学网络。','学界通说','d12_50','d12_19'],
  ['ED005','8—20世纪','range','书院','书院讲学与藏书','唐宋以降书院兼具讲学、藏书、祭祀与刻书功能，明清屡有官学化与禁毁，清末改学堂。','学界通说','d12_50','d12_62'],
  ['ED006','7—20世纪','range','教材与考试','蒙学教材与科举用书','《千字文》《百家姓》、四书章句与试帖范文构成读写与应试教材体系，刊印流通可考。','学界通说','d12_50','d12_62'],
  ['ED007','11—13世纪','range','大学','中世纪大学与学位','博洛尼亚、巴黎、牛津等以行会式自治、课程与学位制度成型，为可考的高等教育组织形态。','学界通说','d12_27','d12_13'],
  ['ED008','19—20世纪','range','义务教育','义务教育与师范','普鲁士等率先以立法强制就学并设师范学校培养师资，后为多国仿行，入学率成为可统计指标。','学界通说','d12_19','d12_50'],
  ['ED009','19—20世纪','range','留学与译介','留学、译书与新式学堂','清末以降派遣留学生、设同文馆与译书机构，引入分科教学与近代学科分类。','学界通说','d12_19','d12_41'],
  // 计量 MT
  ['MT001','前3世纪','exact','度量衡','秦统一度量衡','秦以诏版、权量与标准器统一尺、斗、斤两，并把校准写入律令，为可考的标准化政令。','学界通说','d12_54','d12_49'],
  ['MT002','前3世纪—20世纪','range','里亩','里、亩与田亩丈量','历代里长、亩制与步尺屡有变动，户籍与田赋籍账以当时尺度登记，不可直接折算成现代单位。','断代有争议','d12_55','d12_54'],
  ['MT003','前2世纪—19世纪','range','权衡','权衡器与秤','等臂天平、杆秤与砝码在各地出土甚多，标准器由官府颁降并定期校验。','学界通说','d12_14','d12_54'],
  ['MT004','前1世纪—19世纪','range','计时','漏刻、更鼓与日晷','漏刻以浮箭计时，城市以更鼓报夜，日晷与圭表用于校准，属可考的官方时间制度。','学界通说','d12_21','d12_7'],
  ['MT005','11世纪','range','精密测量','沈括与度量精化','《梦溪笔谈》记浑仪、圭表与刻漏改良及磁针偏角，体现测量精度与误差意识的提升。','学界通说','d12_44','d12_19'],
  ['MT006','18—19世纪','range','公制','米制与公制公约','法国大革命后以地球子午线定义米，1875年《米制公约》设国际计量局，公制逐步成为国际通用体系。','学界通说','d12_19','d12_45'],
  ['MT007','1884年','exact','标准时','本初子午线与区时','国际子午线会议定格林尼治为本初子午线，时区与标准时体系随后在铁路与电报网络中推行。','学界通说','d12_19','d12_37'],
  ['MT008','20世纪','range','单位制','国际单位制与原子秒','1960年确立国际单位制，1967年以铯原子跃迁定义秒，计量基准由实物器转为物理常数。','学界通说','d12_19','d12_37'],
  // 婚姻家族 MA
  ['MA001','前11世纪','range','宗法','西周宗法与嫡长','宗法以嫡长继承、大小宗与昭穆次序组织祭祀与财产，文献记载与金文互证，具体实行范围有争议。','断代有争议','d12_29','d12_49'],
  ['MA002','前3世纪—20世纪','range','户籍','户籍、户等与分家','历代以户籍登记人口、田宅与赋役，分家须立阄书并报官，户等直接决定征派额度。','学界通说','d12_55','d12_56'],
  ['MA003','前2世纪—10世纪','range','和亲','和亲与联姻','汉唐以宗室女或宫女与周边政权联姻，伴随赏赐、互市与使节往来，属可考的外交制度。','学界通说','d12_31','d12_29'],
  ['MA004','前1世纪—20世纪','range','族谱','族谱、祠堂与义田','宋以后私修族谱渐盛，祠堂、祭田与义庄构成宗族共有财产与救济机制，谱牒须辨后世追述。','断代有争议','d12_50','d12_62'],
  ['MA005','2—20世纪','range','婚姻礼制','六礼与婚书','纳采至亲迎的六礼程序见于礼书，婚书、聘财与回礼在敦煌文书与明清契约中可考。','学界通说','d12_20','d12_55'],
  ['MA006','前2世纪—14世纪','range','收继与再嫁','收继婚与寡妇再嫁','草原行国与部分时期中原并存收继婚俗，寡妇再嫁与财产携走在律令、判牍中各有规定。','断代有争议','d12_15','d12_28'],
  ['MA007','7—20世纪','range','继承','诸子均分与立嗣','唐律以后诸子均分家产、无子立嗣有法定顺位，嗣子与养子权利区别于亲生，判例可考。','学界通说','d12_54','d12_50'],
  ['MA008','20世纪','range','婚姻法','婚姻登记与男女平权立法','20世纪多国改行婚姻登记、限制早婚并承认男女平等财产权，属可考的成文法变革。','学界通说','d12_19','d12_50'],
  // 丧葬 FU
  ['FU001','前3世纪','range','陵寝','秦汉陵寝与封土','秦始皇陵与汉帝陵以封土、陵园、寝殿与陪葬坑构成，布局与营建见于考古与文献。','学界通说','d12_22','d12_23'],
  ['FU002','前16—前11世纪','range','殉葬','殉葬与俑的替代','商代大墓见人殉与人牲，西周以后渐以陶俑、木俑替代，属考古可考的葬俗变化。','学界通说','d12_25','d12_34'],
  ['FU003','2—10世纪','range','墓志','墓志与碑铭','墓志铭定型于南北朝至隋唐，记世系、官历与卒葬，为考史的重要出土文献，须辨谀墓之辞。','学界通说','d12_49','d12_50'],
  ['FU004','前3—前2世纪','range','葬具','棺椁制度与黄肠题凑','汉代高等级墓以多重棺椁、黄肠题凑与玉衣为等级标识，见于诸侯王墓考古。','学界通说','d12_22','d12_59'],
  ['FU005','1—10世纪','range','火葬与薄葬','火葬、薄葬与遗令','佛教传入后火葬渐见，魏晋与唐宋均有薄葬遗令，反映葬俗与观念的地域、时代差异。','断代有争议','d12_20','d12_24'],
  ['FU006','10—20世纪','range','祠祭','祠堂、祖坟与祭产','宗族以祠堂、祖坟与祭田维系祭祀，墓祭与清明、中元等节期结合，族规可考。','学界通说','d12_62','d12_64'],
  ['FU007','19—20世纪','range','公墓','近代公墓与殡葬管理','城市化推动公墓、火葬场与死亡登记制度化，殡葬由家族事务转为市政管理事项。','学界通说','d12_19','d12_47'],
  ['FU008','20世纪','range','考古规范','墓葬发掘与文物保护','现代考古以地层学、记录与测绘规范发掘墓葬，并立法保护出土文物，与古代盗掘严格区分。','学界通说','d12_14','d12_22'],
  // 体育 SP
  ['SP001','前11世纪','range','射礼','射礼与礼射','周代射礼以揖让、乐节与侯靶为仪节，兼含礼仪与技艺，礼书所载细节有后世整理成分。','断代有争议','d12_29','d12_4'],
  ['SP002','前3—后3世纪','range','角抵','角抵与百戏','秦汉角抵、扛鼎、蹴鞠等见于画像石与文献，属宫廷与市井共见的竞技表演。','学界通说','d12_23','d12_59'],
  ['SP003','前2—后14世纪','range','蹴鞠','蹴鞠与鞠城','汉代以鞠城与鞠室竞技，唐宋出现充气鞠与球会，规则与器材见文献与图像。','学界通说','d12_62','d12_24'],
  ['SP004','7—10世纪','range','马球','唐代马球与击鞠','唐墓壁画、铜镜与文献记击鞠，需骑术、球杖与场地，盛行于宫廷与军中。','学界通说','d12_24','d12_61'],
  ['SP005','前8—前4世纪','range','古代竞技','古希腊奥林匹克赛会','自前776年起有连续优胜者名录，赛会含赛跑、摔跤、战车等项目，与宗教节期结合。','学界通说','d12_27','d12_13'],
  ['SP006','前5—20世纪','range','棋类与投壶','投壶、弈棋与射侯之变','投壶由礼射演化，围棋、象棋在历代有谱录与棋子出土，属可考的技艺与闲暇活动。','学界通说','d12_29','d12_62'],
  ['SP007','17—20世纪','range','武术与体操','武术流派与近代体操','明清拳谱与器械图谱可考；19世纪欧洲体操与学校体育课程制度化并传入各地。','学界通说','d12_19','d12_47'],
  ['SP008','1896年','exact','现代奥运','现代奥林匹克运动会','1896年首届现代奥运会在雅典举行，此后形成四年一届、国际单项组织与纪录体系。','学界通说','d12_27','d12_19'],
  // 陶瓷冶金 CE
  ['CE001','前16—前11世纪','range','青铜范铸','商周青铜范铸','以陶范分铸、合范浇铸礼器，合金配比与铸接技术见于殷墟、周原铸铜遗址。','学界通说','d12_25','d12_34'],
  ['CE002','前6—前3世纪','range','铁器','生铁冶炼与铸铁','春秋战国出现生铁铸件与退火处理，铁农具逐步普及，遗址见炉渣与铸范。','学界通说','d12_42','d12_22'],
  ['CE003','2—6世纪','range','炼钢','炒钢与灌钢','汉代炒钢、南北朝灌钢以不同含碳料合炼，文献与刀剑铭文可考，具体工艺复原仍有讨论。','断代有争议','d12_42','d12_43'],
  ['CE004','前16世纪—10世纪','range','陶与釉','原始瓷与青瓷','商周原始瓷经高温焙烧施釉，东汉上虞等地成熟青瓷窑址可考，釉料与窑温是关键。','学界通说','d12_58','d12_22'],
  ['CE005','6—10世纪','range','白瓷与彩瓷','白瓷、唐三彩与秘色瓷','邢窑白瓷、巩义三彩与法门寺秘色瓷出土有明确纪年，反映胎釉与呈色技术的分化。','学界通说','d12_58','d12_60'],
  ['CE006','10—14世纪','range','名窑','宋代五大名窑与窑系','汝、官、哥、钧、定及磁州、龙泉等窑系形成地域分工，窑址考古与传世器互证。','断代有争议','d12_58','d12_62'],
  ['CE007','前15—前10世纪','range','玻璃','早期玻璃与釉砂','埃及与两河有费昂斯与玻璃珠，中国战国见蜻蜓眼玻璃珠，成分显示外来与本土体系并存。','学界通说','d12_26','d12_11'],
  ['CE008','前1—后2世纪','range','水泥与砌筑','罗马混凝土与拱券','罗马以火山灰、石灰与骨料配制混凝土，配合拱券与穹顶建造大型公共建筑。','学界通说','d12_23','d12_37'],
  ['CE009','18—19世纪','range','近代冶金','焦炭炼铁与转炉炼钢','18世纪焦炭替代木炭，19世纪贝塞麦转炉与平炉使钢量产，为可考的工业技术序列。','学界通说','d12_19','d12_45'],
  ['CE010','20世纪','range','新材料','铝、合金与工业陶瓷','电解铝、特种合金与工业陶瓷在20世纪规模化，材料性能以标准测试与牌号体系管理。','学界通说','d12_19','d12_37']
];
const srcOf=k=>civSources[k]||Object.values(civSources)[0];
RAW_ADDON.forEach(r=>{
  const id=r[0];if(seen.has(id))return;seen.add(id);
  const ys=parseYears(r[1]);
  const dim=id.replace(/\d+$/,'');
  const cn=/秦|汉|唐|宋|明|清|周|殷|商|黄河|长安|太学|科举|族谱|漕|书院|蹴鞠|瓷|郑和|国子监|周礼|汉简|居延|敦煌|沈括|郭守敬|李时珍|张仲景|咸阳|井田|四民|六礼|墓志|陵|和剂局|悲田/.test(r[4]+r[5]);
  added.push({id:id,dim:dim,dimName:ADDON_DIMS[dim]?ADDON_DIMS[dim].name:(dim==='ME'?'医学':'补充'),
    region:cn?'huaxia':'*',
    y0:ys.y0,y1:ys.y1,precision:r[2],rawYear:r[1],
    category:r[3],title:r[4],
    summary:r[5].replace(/\s+/g,' ').trim(),
    status:r[6],consensus:consensus(r[6]),
    refs:r.slice(7),sources:r.slice(7).map(srcOf).filter(Boolean),
    boundary:ADDON_BOUNDARY[dim]||null,layer:'fact',addon:true,
    sourceNote:'通识级补录；出处沿用工程既有考据索引中的相关来源，未逐条绑定单一文献。'});
});
const dimensions=civ.dimensions.slice();
Object.keys(ADDON_DIMS).forEach(k=>{
  if(dimensions.some(d=>d.key===k))return;
  const v=ADDON_DIMS[k];
  dimensions.push({key:k,name:v.name,badge:v.badge,stat:v.stat,desc:v.desc});
});
Object.keys(NEW_DIMS).forEach(k=>{
  if(dimensions.some(d=>d.key===k))return;
  const v=NEW_DIMS[k];
  dimensions.push({key:k,name:v.name,badge:v.badge,stat:v.stat,desc:v.desc});
});
civ.dimensions=dimensions;
// 早于游戏起点（-5000）的条目：保留真实年代字段，另开一个「史前序章」窗口供展示
civ.items=base.concat(added).map(x=>{
  const y=Object.assign({},x,{layer:x.layer||'fact'});
  if(y.y1<-5000){y.ancient=true;y.y0=-5000;y.y1=-4800;}
  return y;
});
fs.writeFileSync(path.join(D,'civilization.json'),JSON.stringify(civ,null,1),'utf8');
fs.writeFileSync(path.join(D,'civ_sources.json'),JSON.stringify(civSources,null,1),'utf8');

/* ---------- 3. 边界层 ---------- */
if(!fs.existsSync(path.join(DOC,'史料考据-野史小说与未证实假说边界.md')))
  fs.copyFileSync(path.join(ROOT,'..','dr:202611050001','result.md'),path.join(DOC,'史料考据-野史小说与未证实假说边界.md'));
const frDoc=RD('史料考据-野史小说与未证实假说边界.md');
const frSources={};collectSources(frDoc,'fr',frSources);
const TX=[],HY=[],PRE=[];
let fs2=null;
for(const l of frDoc){
  if(/^## /.test(l)){fs2=/文本传统/.test(l)?'tx':/未证实假说/.test(l)?'hy':/史前可考/.test(l)?'pre':null;continue;}
  if(!fs2||!l.startsWith('|'))continue;
  const c=l.split('|');
  if(fs2==='tx'&&c.length===10&&/^TX\d{2,3}$/.test(c[1].trim())){
    const ys=parseYears(c[2]);
    TX.push({id:c[1].trim(),y0:ys.y0,y1:ys.y1,rawYear:c[2].trim(),
      precision:(['exact','range','approximate','legendary'].indexOf(c[3].trim())>=0)?c[3].trim():'approximate',
      category:c[4].trim(),title:c[5].trim(),
      summary:c[6].trim().replace(/\[\d+\]/g,'').trim(),
      nature:c[7].trim(),layer:'text',
      disclaimer:'文本真实存在、成书年代可考，不等于文本所述内容为真；此条按文学／文本传统呈现，不计入史实。',
      sources:refsOf(c[8],'fr').map(k=>frSources[k]).filter(Boolean)});
  }
  if(fs2==='hy'&&c.length===9&&/^HY\d{2,3}$/.test(c[1].trim())){
    HY.push({id:c[1].trim(),name:c[2].trim(),proposed:c[3].trim(),claim:c[4].trim(),
      standing:c[5].trim(),evidence:c[6].trim(),layer:'hypothesis',
      disclaimer:'无考古／文献／可重复证据支持。此为明确标注的虚构推演素材，不是史实，也不是学界认可的主张。',
      sources:refsOf(c[7],'fr').map(k=>frSources[k]).filter(Boolean)});
  }
  if(fs2==='pre'&&c.length===7&&/^PRE\d{2,3}$/.test(c[1].trim())){
    // 史前年代表述含「万年前」等，数值跨度极大且只作展示，不解析成可触发窗口
    PRE.push({id:c[1].trim(),y0:-5000,y1:-4999,rawYear:c[2].trim(),
      title:c[3].trim(),summary:c[4].trim().replace(/\[\d+\]/g,'').trim(),
      layer:'prehistory',displayOnly:true,ancient:true,
      disclaimer:'有考古证据的史前人类活动；与史前超文明假说严格区分。',
      sources:refsOf(c[5],'fr').map(k=>frSources[k]).filter(Boolean)});
  }
}
const fringe={
  meta:{rule:'四层严格分离：fact 史实 / text 文本传统 / hypothesis 未证实假说 / prehistory 史前可考',
    disclaimer:'未证实假说层只在「狂想档」出现，且每张卡都标无证据；默认关闭。'},
  texts:TX,hypotheses:HY,prehistory:PRE,sources:frSources
};
fs.writeFileSync(path.join(D,'fringe.json'),JSON.stringify(fringe,null,1),'utf8');
fs.writeFileSync(path.join(D,'geoclimate.json'),JSON.stringify({
  meta:{geoNote:'经纬度为近似中心点，不是精确边界；地图为散点示意，不是疆域图。',
    clmNote:'区分可考气候现象与社会归因，后者为推论；不写气候决定论。'},
  units:GEO,events:CLM,sources:geoSources
},null,1),'utf8');

/* ---------- 校验 ---------- */
const bad=[];
if(GEO.length<24)bad.push('地理单元不足 '+GEO.length);
if(CLM.length<26)bad.push('气候事件不足 '+CLM.length);
if(added.length<90)bad.push('十二维条目不足 '+added.length);
const addonN=civ.items.filter(x=>x.addon).length;
if(addonN<80)bad.push('补录维度条目不足 '+addonN);
if(dimensions.length<40)bad.push('维度不足 '+dimensions.length);
if(TX.length<30)bad.push('文本传统不足 '+TX.length);
if(HY.length<8)bad.push('未证实假说不足 '+HY.length);
if(PRE.length<8)bad.push('史前可考不足 '+PRE.length);
const ids=new Set();civ.items.forEach(x=>{if(ids.has(x.id))bad.push('重复 id '+x.id);ids.add(x.id);});
CLM.forEach(x=>{if(x.y0>x.y1)bad.push('气候年代倒置 '+x.id);});
if(bad.length){console.error('校验失败:\n'+bad.slice(0,20).join('\n'));process.exit(1);}

console.log('地理单元 '+GEO.length+' · 气候事件 '+CLM.length+' · 地理出处 '+Object.keys(geoSources).length);
console.log('文明维度 '+dimensions.length+' · 条目 '+civ.items.length+'（本次新增 '+added.length+'）· 出处 '+Object.keys(civSources).length);
console.log('文本传统 '+TX.length+' · 未证实假说 '+HY.length+' · 史前可考 '+PRE.length);
console.log('气候样例:');
CLM.filter(x=>['CLM006','CLM019','CLM025','CLM026','CLM031'].indexOf(x.id)>=0)
  .forEach(x=>console.log(' ',x.id,x.rawYear,'→',x.y0,'~',x.y1,'|',x.title));
console.log('假说样例:');
HY.slice(0,3).forEach(x=>console.log(' ',x.id,x.name,'|',x.standing));
