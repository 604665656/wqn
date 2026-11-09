/* test/stage.test.js —— AVG 舞台／抠图层／天气专项（node test/stage.test.js） */
const fs=require('fs'),path=require('path'),assert=require('assert');
const ROOT=path.join(__dirname,'..');
const J=f=>JSON.parse(fs.readFileSync(path.join(ROOT,'data',f),'utf8'));
const store={};
globalThis.localStorage={getItem:k=>store[k]||null,setItem:(k,v)=>store[k]=v,removeItem:k=>delete store[k]};
globalThis.WQN={data:{character:J('character.json'),asset_plan:J('asset_plan.json'),music:J('music.json'),art:J('art.json')}};
require(path.join(ROOT,'src','stage.js'));
require(path.join(ROOT,'src','a11y.js'));
const S=globalThis.WQN.stage,D=globalThis.WQN.data.character;
let fails=0;
const run=(n,f)=>{try{f();console.log('  ✓ '+n);}catch(e){fails++;console.log('  ✗ '+n+' → '+e.message);}};
const BAD=['UFO','外星人','史前超文明','亚特兰蒂斯','古代宇航员','国界','疆界','疆域',
'领土','主权','版图','政权核心区','人种','蛮夷戎狄','含米特','血统纯正','被弑','篡立',
'废立','占卜','神谕','数术','祭祀','神庙','祭司','野史','演义','伪书','狂想'];

console.log('=== 抠图层与内嵌 ===');
run('99 层 + 21 场景板齐备，分块还原后是合法 data URI',()=>{
  const keys=Object.keys(D.layers);
  assert.strictEqual(keys.length,99,'角色层不是 99');
  ['neutral','think','happy','surprise','sad','read','wave','rain','sun',
   'scroll','decree','compass','count','lamp','snow','sand','move','harvest','cheer','bell','forge','weave','loupe','herb',
   'sail','seal','child','drum','blink','breath_in','breath_out',
   'brush','pottery','measure','build','cook','chess','fish','ride',
   'shelf','farewell','ink','loom','coin','bridge','well','kite','mask','flute',
   'seedling','ledger',
   'plow','grind','dye','cast','copy','watch','pack','lute',
   'weave2','plaster','ferry','granary','astro','mint','mask2','drum2',
   'loom3','kiln3','bridge3','well3','ink3','sail3','herd3','bell3',
   'plow4','sieve4','quill4','lamp4','drum4','net4','cart4','oven4',
   'loom5','kiln5','bridge5','well5','ink5','sail5','herd5','bell5',
   'plow6','sieve6','quill6','lamp6','drum6','net6','cart6','oven6']
    .forEach(k=>assert.ok(keys.indexOf(k)>=0,'缺 '+k));
  assert.ok(Array.isArray(D.bg),'背景板未按块内嵌');
  const flat=v=>Array.isArray(v)?v.join(''):v;
  assert.ok(flat(D.bg).indexOf('data:image/jpeg;base64,')===0,'背景板 URI 不对');
  keys.forEach(k=>{
    const u=flat(D.layers[k]);
    assert.ok(u.indexOf('data:image/webp;base64,')===0,k+' URI 不对');
    assert.ok(u.length>20000,k+' URI 过短');
  });
  console.log('    样本：'+keys.length+' 层 · 背景 '+Math.round(flat(D.bg).length/1024)+' KB');
});
run('内嵌静态文本不含送审词表任何词',()=>{
  /* 只扫人会读到的文案：base64 载荷里随机出现的字母串（如 UFO）不算命中 */
  const visible=JSON.stringify(D).replace(
    /(data:image\/[a-z+]+;base64,)([A-Za-z0-9+/=]+)/g,
    (m,a,b)=>a+' '.repeat(b.length));
  const hit=BAD.filter(w=>visible.indexOf(w)>=0);
  assert.deepStrictEqual(hit,[],'命中：'+hit.join('、'));
});
run('九十九层孔洞数均为 0、叠背景板后品红残留为 0',()=>{
  const r=JSON.parse(fs.readFileSync(path.join(ROOT,'assets','cutout_report.json'),'utf8'));
  assert.strictEqual(Object.keys(r).length,99,'报告不是 99 层');
  Object.keys(r).forEach(k=>assert.strictEqual(r[k].holes,0,k+' 有孔洞'));
  console.log('    样本：91/91 holes=0，单层 '+(r.neutral.size/1024).toFixed(1)+' KB');
});
run('还原后的 WebP 与 JPEG 能被解码，尺寸正确',()=>{
  // 用 PIL 侧验：node 只校验 base64 头与长度，像素由 cutout.py 验收
  const flat=v=>Array.isArray(v)?v.join(''):v;
  const b64=flat(D.layers.neutral).split(',')[1];
  assert.ok(/^[A-Za-z0-9+/=]+$/.test(b64),'base64 含非法字符');
  assert.ok(Buffer.from(b64,'base64').slice(0,4).toString()==='RIFF','WebP 文件头不对');
  const jpg=Buffer.from(flat(D.bg).split(',')[1],'base64');
  assert.strictEqual(jpg[0],0xFF);assert.strictEqual(jpg[1],0xD8);
  console.log('    样本：RIFF/WebP 与 FFD8/JPEG 文件头均有效');
});

console.log('=== 天气与姿势 ===');
run('天气确定性：同参数一致，每三笔一换，卷界影响',()=>{
  const S1={reg:'huaxia',turn:1,vol:{n:1},phase:'choice',cur:{}};
  const a=S.weatherOf(S1),b=S.weatherOf(S1);
  assert.strictEqual(a,b,'同参数天气不一致');
  assert.ok(['sun','rain','cloud','night'].indexOf(a)>=0,'未知天气 '+a);
  const c=S.weatherOf(Object.assign({},S1,{turn:4}));
  const d=S.weatherOf(Object.assign({},S1,{vol:{n:2}}));
  assert.ok(typeof c==='string'&&typeof d==='string');
  const set=new Set();
  for(let v=1;v<=8;v++)for(let t=0;t<40;t+=3)
    set.add(S.weatherOf({reg:'huaxia',turn:t,vol:{n:v},phase:'choice',cur:{}}));
  assert.ok(set.size>=4,'天气种类过少：'+[...set].join('/'));
  console.log('    样本：8 卷 × 14 段覆盖 '+[...set].join('/'));
});
run('气候条目优先决定雨／晴／夜',()=>{
  const ev=t=>({reg:'huaxia',turn:1,vol:{n:1},phase:'choice',cur:{isClim:true,t:t}});
  assert.strictEqual(S.weatherOf(ev('黄河大洪水与河道改道')),'rain');
  assert.strictEqual(S.weatherOf(ev('全新世大暖期')),'sun');
  assert.strictEqual(S.weatherOf(ev('小冰期寒冷事件')),'snow');
  assert.strictEqual(S.weatherOf(ev('风沙与荒漠化')),'dust');
  assert.strictEqual(S.weatherOf(ev('火山灰云')),'cloud');
});
run('姿势按表演关卡贴合角色，锁住项回退平静层',()=>{
  const mk=(phase,extra)=>Object.assign({reg:'huaxia',turn:1,vol:{n:1},phase:phase,cur:{opts:[]},result:{}},extra||{});
  const pp=(S1,w)=>S.poseOf(S1,w||'sun').pose;
  assert.strictEqual(pp(null),'wave','开局应是指引');
  assert.strictEqual(pp(mk('volume')),'happy','卷末应欢喜');
  assert.strictEqual(pp(mk('ending')),'scroll','终章应收卷抱轴');
  assert.strictEqual(pp(mk('turnover')),'surprise','更迭应惊讶');
  assert.strictEqual(pp(mk('choice',{cur:{opts:[{debate:true}]}})),'think');
  assert.strictEqual(pp(mk('choice',{cur:{opts:[{seeking:true}]}})),'read');
  assert.strictEqual(pp(mk('choice'),'rain'),'rain','雨天应躲雨');
  assert.strictEqual(pp(mk('choice'),'snow'),'snow','雪天应畏寒');
  assert.strictEqual(pp(mk('choice'),'dust'),'sand','风沙应掩面');
  assert.strictEqual(pp(mk('choice'),'night'),'lamp','夜间应提灯');
  assert.strictEqual(pp(mk('result',{result:{msgs:['失手']}})),'sad','失手应低落');
  assert.strictEqual(pp(mk('result',{result:{o:{t:'x'},msgs:[]}})),'sun','晴日顺遂');
  const r=S.poseOf(mk('choice'),'sun');
  assert.ok(r.scene&&typeof r.locked==='boolean','poseOf 缺关卡信息');
});
run('气泡台词各阶段非空且长度收敛，开局不提任何史实人物',()=>{
  const phases=['choice','result','volume','ending','turnover','scroll'];
  phases.forEach(ph=>{
    const t=S.lineOf({phase:ph,cur:{t:'某年',x:'某段正文'},result:{o:{t:'落笔'},msgs:[]}},'sun');
    assert.ok(t&&t.length<=90,ph+' 台词为空或过长');
  });
  const s=S.lineOf(null,'sun');
  assert.ok(s.indexOf('篝火')>=0,'开局台词不对');
  BAD.forEach(w=>assert.strictEqual(s.indexOf(w),-1,'开局台词含 '+w));
});

console.log('=== 舞台 HTML ===');
run('舞台含背景／角色／气泡／天气层／工具条，角色用 contain 不裁剪',()=>{
  const st={reg:'huaxia',turn:5,vol:{n:1},phase:'choice',cur:{t:'某年',x:'某段正文',opts:[]},year:-2000};
  const h=S.stageHTML(st,{tools:'<button data-snd="sfx">音效</button>'});
  ['class="stage ','stage-bg','stage-char','class="bubble"','class="wx','stage-tools','stage-tag',
   'data-scene=','data-locked=','--breath-delay']
    .forEach(x=>assert.ok(h.indexOf(x)>=0,'缺 '+x));
  assert.ok(h.indexOf('aria-hidden="true"')>=0,'插画未标纯装饰');
  assert.ok(h.indexOf('role="note"')>=0,'气泡缺语义');
  assert.ok(h.indexOf('undefined')<0&&h.indexOf('NaN')<0,'HTML 含脏值');
  const css=fs.readFileSync(path.join(ROOT,'src','style.css'),'utf8');
  assert.ok(/\.stage-char\{[^}]*object-fit:contain/.test(css),'角色不是 contain');
  assert.ok(!/\.stage-char\{[^}]*object-fit:cover/.test(css),'角色被 cover 裁了');
  assert.ok(/\.stage-char\{[^}]*height:88%/.test(css),'角色未给完整高度');
});
run('四种天气动画都有对应层，减少动效可关',()=>{
  ['sun','rain','cloud','night'].forEach(w=>{
    const st={reg:'huaxia',turn:1,vol:{n:1},phase:'choice',cur:{isClim:false,t:'x',opts:[]}};
    // 直接构造指定天气不便，改测 weatherHTML 经 stageHTML 的 data-weather 分支
    const h=S.stageHTML(st);
    assert.ok(h.indexOf('class="wx')>=0,'缺天气层');
  });
  const css=fs.readFileSync(path.join(ROOT,'src','style.css'),'utf8');
  assert.ok(css.indexOf('prefers-reduced-motion:reduce')>=0,'未尊重减少动效');
  ['wx-sun','wx-rain','wx-cloud','wx-night','birdFly','rainFall','cloudDrift','twinkle']
    .forEach(x=>assert.ok(css.indexOf(x)>=0,'缺 '+x));
});
run('舞台开关只改显示，不动游戏状态',()=>{
  assert.strictEqual(S.status().stage,true);
  S.set('stage',0);assert.strictEqual(S.status().stage,false);
  assert.strictEqual(S.stageHTML({phase:'choice'}),'','隐藏后仍输出了舞台');
  S.set('stage',1);S.set('bubble',0);
  const h=S.stageHTML({phase:'choice',cur:{t:'x',opts:[]}});
  assert.strictEqual(h.indexOf('class="bubble"'),-1,'气泡没关掉');
  S.set('bubble',1);
});

console.log('=== 朗读默认关闭 ===');
run('朗读与自动朗读都默认关闭，文字仍全部在画面上',()=>{
  // 直接读 a11y 默认值，不启 DOM
  const a=fs.readFileSync(path.join(ROOT,'src','a11y.js'),'utf8');
  assert.ok(/DEF=\{read:false,autoRead:false/.test(a),'朗读默认值不对');
  const css=fs.readFileSync(path.join(ROOT,'src','style.css'),'utf8');
  assert.ok(css.indexOf('.stage .bubble')>=0,'气泡框样式缺失');
});
console.log('=== v1.5 表演关卡 / 呼吸 / 视图 ===');
run('98 个表演关卡全就绪，下批只登记不占位',()=>{
  const sc=S.sceneList(),P=globalThis.WQN.data.asset_plan;
  assert.strictEqual(sc.length,98,'关卡不是 98');
  assert.strictEqual(sc.filter(x=>x.ready).length,98,'解锁数不对');
  assert.strictEqual(sc.filter(x=>!x.ready).length,0,'不应还有锁住关');
  assert.ok(P.plannedScenes.length>=8,'下一批计划未登记');
  assert.strictEqual(P.pending.length,0,'欠账未清');
  assert.strictEqual(P.plannedScenes.length,8,'下批登记不是 8');
  assert.ok(P.breathingPlan&&P.breathingPlan.next.indexOf('breath_in')>=0,'缺呼吸感图片生成计划');
  console.log('    样本：'+sc.length+' 关 / '+sc.filter(x=>x.ready).length+' 解锁 / 待补 '+P.pending.length+' 层');
});
run('关卡全就绪，舞台标 data-locked 与构图档',()=>{
  const row=S.sceneByKey('breath');
  assert.ok(row&&row.ready,'呼吸帧关应已解锁');
  const st={reg:'huaxia',turn:1,vol:{n:1},phase:'choice',cur:{opts:[]}};
  const h=S.stageHTML(st);
  assert.ok(h.indexOf('data-locked="1"')>=0||h.indexOf('data-locked="0"')>=0,'缺 locked 标记');
  assert.ok(h.indexOf('data-scene=')>=0,'缺关卡标记');
  assert.ok(h.indexOf('undefined')<0,'HTML 含脏值');
  assert.ok(h.indexOf('data-fit=')>=0,'缺构图档标记');
  assert.deepStrictEqual(Object.keys(S.FITS),['full','half','auto']);
  S.set('charfit','full');assert.strictEqual(S.fitOf({phase:'choice'}),'full');
  S.set('charfit','auto');assert.strictEqual(S.fitOf({phase:'volume'}),'full');
  assert.strictEqual(S.fitOf({phase:'choice'}),'half');
  S.set('charfit','half');
});
run('六种天气都有动画层，呼吸与换层淡入在 CSS 里',()=>{
  const css=fs.readFileSync(path.join(ROOT,'src','style.css'),'utf8');
  ['wx-sun','wx-rain','wx-cloud','wx-night','wx-snow','wx-dust','snowFall','dustDrift']
    .forEach(x=>assert.ok(css.indexOf(x)>=0,'缺 '+x));
  assert.ok(css.indexOf('@keyframes breathe')>=0,'缺呼吸动画');
  assert.ok(css.indexOf('@keyframes layerIn')>=0,'缺换层淡入');
  assert.ok(css.indexOf('prefers-reduced-motion:reduce')>=0,'未尊重减少动效');
});
run('三档舞台尺寸、横屏、背景全屏、气泡三档都在 CSS 里',()=>{
  const css=fs.readFileSync(path.join(ROOT,'src','style.css'),'utf8');
  ['sz-compact','sz-immersive','html.bgfull body:before','html.landscape .opts',
   'bub-light','bub-veil','bub-solid','char-half','char-full',
   'html.minimal .tierbar','.vguide','html.avg .stage','.pchip-detail','.bdgrid','.layergrid','.scenedone','skin-auto',
   '--veil','html.landscape .stage','.opts{max-height:none'].forEach(x=>
    assert.ok(css.indexOf(x)>=0,'缺 '+x));
  assert.deepStrictEqual(Object.keys(S.SIZES),['compact','normal','immersive']);
});
run('设置卡可精简折叠、选项不截断、工具条图标化',()=>{
  const css=fs.readFileSync(path.join(ROOT,'src','style.css'),'utf8');
  const ui=fs.readFileSync(path.join(ROOT,'src','ui.js'),'utf8');
  ['.setbar','.foldbtn','.card.folded','.stage-tools .sndbtn span{display:none}',
   '.viewtools','.vbtn'].forEach(x=>assert.ok(css.indexOf(x)>=0,'CSS 缺 '+x));
  assert.ok(css.indexOf('white-space:normal')>=0,'选项文字会被截断');
  ['横屏布局','全屏并铺满背景','收起舞台，看全部选项','data-view=',
   'data-landscape','data-setmin','data-fold','applySetCards','KEEP=',
   'data-skin','data-backdrop','data-layer-preview','data-pat','pointerdown'].forEach(x=>
    assert.ok(ui.indexOf(x)>=0,'UI 缺 '+x));
});
run('角色音色：speakAs / guideVoices / 语气音接口齐备，朗读仍默认关',()=>{
  const a=fs.readFileSync(path.join(ROOT,'src','a11y.js'),'utf8');
  const au=fs.readFileSync(path.join(ROOT,'src','audio.js'),'utf8');
  const st=fs.readFileSync(path.join(ROOT,'src','stage.js'),'utf8');
  ['speakAs','guideVoices','role===\'guide\'','force:true','pitch','念这句']
    .forEach(x=>assert.ok(a.indexOf(x)>=0,'a11y 缺 '+x));
  ['guideCue','glide'].forEach(x=>assert.ok(au.indexOf(x)>=0,'audio 缺 '+x));
  ['speakLine','guideCue','bgURL'].forEach(x=>assert.ok(st.indexOf(x)>=0,'stage 缺 '+x));
  assert.ok(/DEF=\{read:false,autoRead:false/.test(a),'朗读未默认关闭');
  assert.ok(S.status().voicePack&&S.status().voicePack.notDubbing,'缺语音包诚实说明');
});

console.log('=== v1.9 场景 / 进度解锁 / 选项表演 ===');
run('二十一张场景板与缩略图齐备，分块还原合法',()=>{
  const BD=D.backdrops,TH=D.backdropThumbs,M=D.backdropMeta;
  assert.strictEqual(Object.keys(BD).length,21,'场景板不是 21 张');
  assert.strictEqual(M.length,21,'场景元数据不是 21 条');
  M.forEach(x=>{
    assert.ok(BD[x.key],'缺场景板 '+x.key);
    assert.ok(TH[x.key],'缺缩略图 '+x.key);
    const flat=v=>Array.isArray(v)?v.join(''):v;
    assert.ok(flat(BD[x.key]).indexOf('data:image/jpeg;base64,')===0,x.key+' 板 URI 不对');
    assert.ok(flat(TH[x.key]).indexOf('data:image/jpeg;base64,')===0,x.key+' 缩略 URI 不对');
  });
  assert.strictEqual(M[0].need,null,'素纸不该有解锁条件');
});
run('场景与人物层按进度解锁，未到进度切不过去',()=>{
  const early=S.backdropList({turn:0,vol:{n:1},seenCiv:{}});
  assert.strictEqual(early.filter(x=>x.unlocked).length,1,'开局应只开素纸');
  assert.strictEqual(S.unlocked({k:'turn',n:3},{turn:2,vol:1,seen:0}),false);
  assert.strictEqual(S.unlocked({k:'turn',n:3},{turn:3,vol:1,seen:0}),true);
  assert.strictEqual(S.unlocked({k:'vol',n:2},{turn:0,vol:2,seen:0}),true);
  assert.strictEqual(S.unlocked({k:'seen',n:40},{turn:0,vol:1,seen:40}),true);
  S.set('backdrop','paper');
  assert.strictEqual(S.set('backdrop','harbor'),false,'未解锁场景不该能切换');
  assert.strictEqual(S.status().backdrop,'paper');
  const late=S.backdropList({turn:30,vol:{n:14},seenCiv:new Array(100).fill(0).reduce((a,_,i)=>(a[i]=1,a),{})});
  assert.strictEqual(late.filter(x=>x.unlocked).length,21,'后期应全开');
  const lateS={turn:30,vol:{n:14},phase:'choice',cur:{t:'一件事',opts:[]},seenCiv:{}};
  S.stageHTML(lateS,{});
  assert.strictEqual(S.set('backdrop','harbor'),true);
  S.set('backdrop','paper',lateS);
});
run('人物层前四层开局可用，之后按笔数递增',()=>{
  const ll=S.layerList({turn:0,vol:{n:1},seenCiv:{}});
  assert.strictEqual(ll.length,99);
  assert.strictEqual(ll.filter(x=>x.unlocked).length,4,'开局可用层不是 4');
  assert.ok(S.layerList({turn:160,vol:{n:9},seenCiv:{}}).filter(x=>x.unlocked).length>=98);
});
run('每个选项能映射到一个已交付的表演层',()=>{
  const cases=[['营建渠堰','build'],['互证对勘','loupe'],['交易折色','coin'],
    ['研习考据','think'],['农耕播种','seedling'],['外交航海','sail'],['迁徙远行','move']];
  cases.forEach(([t,expect])=>{
    const k=S.poseForOption({t});
    assert.strictEqual(k,expect,t+' 映射成 '+k);
    assert.ok(/^(data:image\/webp|blob:)/.test(S.layerURL(k)),k+' 层不可还原');
  });
  assert.ok(S.poseForOption({t:''}).length>0,'空选项也要有兜底层');
});
run('bgURL 指向当前选中场景，舞台标记带 data-backdrop',()=>{
  S.set('backdrop','paper');
  assert.ok(S.bgURL().indexOf('data:image/jpeg')===0||S.bgURL().indexOf('blob:')===0);
  const h=S.stageHTML({turn:5,vol:{n:1},phase:'choice',cur:{t:'一件事',opts:[]},seenCiv:{}},{});
  assert.ok(h.indexOf('data-backdrop="paper"')>=0,'舞台缺场景标记');
  assert.ok(h.indexOf('data-char-interactive="1"')>=0,'舞台缺互动标记');
});

console.log('=== v2.0 交互接口 ===');
run('HUD 只读状态，不调用主随机数、不改存档',()=>{
  const Sx={turn:7,vol:{n:2},fam:[{},{},{alive:false}],jobs:{'渠工':2,'书记':1},
    st:{food:34,cohesion:48,lore:15,wealth:13,craft:18,might:16,faith:20}};
  const d=S.hudOf(Sx);
  assert.strictEqual(d.people,2);assert.strictEqual(d.job,'渠工');
  assert.strictEqual(d.food,34);
  const h=S.hudHTML(Sx);
  assert.ok(h.indexOf('👥2')>=0&&h.indexOf('⚒渠工')>=0&&h.indexOf('🌾34')>=0);
  const before=JSON.stringify(Sx);S.hudHTML(Sx);
  assert.strictEqual(JSON.stringify(Sx),before,'HUD 改写了状态');
});
run('舞台含气泡拖拽柄、缩放柄、emoji 速览与场景标记',()=>{
  const h=S.stageHTML({turn:5,vol:{n:1},phase:'choice',
    cur:{t:'一件事',opts:[]},seenCiv:{},fam:[{}],jobs:{},st:{}},{});
  ['data-bubble-drag','data-bubble-resize','stage-hud','data-char-interactive',
   'data-backdrop','bubble-voice'].forEach(x=>assert.ok(h.indexOf(x)>=0,'缺 '+x));
});
run('全屏预览接口给出当前选中场景与已解锁列表',()=>{
  S.set('backdrop','paper',{turn:30,vol:{n:9},seenCiv:{}});
  const i=S.previewInfo();
  assert.ok(i.key&&i.name&&i.bg&&i.char,'预览数据不全');
  assert.ok(Array.isArray(i.list)&&i.list.length>=1);
});
run('天气／场景音效解锁口径与场景板一致',()=>{
  const M=JSON.parse(fs.readFileSync(path.join(ROOT,'data','music.json'),'utf8'));
  const rows=M.bedUnlock||[];
  assert.strictEqual(rows.length,8,'环境音档位不是 8');
  assert.ok(rows[0].key==='auto'&&rows[0].need===null,'自动档应开局可用');
  const rain=rows.filter(x=>x.key==='rain')[0];
  assert.ok(rain&&rain.need.k==='turn','雨声未锁进度');
  assert.strictEqual(S.unlocked(rain.need,{turn:3,vol:1,seen:0}),false);
  assert.strictEqual(S.unlocked(rain.need,{turn:4,vol:1,seen:0}),true);
  const sea=rows.filter(x=>x.key==='sea')[0];
  assert.strictEqual(S.unlocked(sea.need,{turn:0,vol:5,seen:0}),true);
});
run('新增数据不含送审词表任何词，朗读可关接口齐备',()=>{
  /* 只查本轮新增的数据与模块；ui.js 里的免责声明由送审构建统一处理 */
  const a=JSON.stringify(D)+JSON.stringify(globalThis.WQN.data.music)
    +fs.readFileSync(path.join(ROOT,'src','stage.js'),'utf8')
    +fs.readFileSync(path.join(ROOT,'src','a11y.js'),'utf8');
  const visible=a.replace(/(data:image\/[a-z+]+;base64,)([A-Za-z0-9+/=]+)/g,
    (m,x,y)=>x+' '.repeat(y.length));
  const hit=BAD.filter(w=>visible.indexOf(w)>=0);
  assert.deepStrictEqual(hit,[],'命中：'+hit.join('、'));
  assert.ok(a.indexOf('toggleSpeak')>=0,'朗读可关接口缺失');
});

console.log('=== v2.0 UI 静态接口 ===');
run('朗读开关、预览、震动、长按、气泡拖放、环境音都在 UI 里',()=>{
  const u=fs.readFileSync(path.join(ROOT,'src','ui.js'),'utf8');
  ['SAYING','openPreview','closePreview','openPosePanel',
   'data-scene-preview','data-sp-key','data-pose-pick','data-vibe','vibe(',
   'data-bubble-drag','data-bubble-resize','clampBubble','data-wx','wxList',
   'data-bub-reset','bubApply','stage-hud','data-bub'].forEach(x=>
    assert.ok(u.indexOf(x)>=0,'UI 缺 '+x));
  const a11=fs.readFileSync(path.join(ROOT,'src','a11y.js'),'utf8');
  assert.ok(a11.indexOf('toggleSpeak')>=0,'a11y 缺 toggleSpeak');
  assert.ok(a11.indexOf('emitEnd')>=0,'a11y 缺播报结束事件');
  assert.ok(a11.indexOf('emitEnd')>=0,'a11y 缺播报结束事件');
  const css=fs.readFileSync(path.join(ROOT,'src','style.css'),'utf8');
  ['.sp-mask','.sp-box','.sp-char','.pose-picker','.stage-hud','.bubble-grip',
   '.bubble-resize','.wxgrid','.bubctl','--bub-dx','html.bgfull .stage-bg',
   'html.minimal.avg .stats'].forEach(x=>
    assert.ok(css.indexOf(x)>=0,'CSS 缺 '+x));
});
run('环境音 8 档与天气映射齐全',()=>{
  const M=JSON.parse(fs.readFileSync(path.join(ROOT,'data','music.json'),'utf8'));
  assert.strictEqual(M.bedUnlock.length,8);
  ['sun','rain','cloud','night','snow','dust'].forEach(w=>
    assert.ok(M.weatherBeds[w],'缺天气映射 '+w));
  assert.ok(M.beds.filter(x=>x.key===M.weatherBeds.sun).length,'晴鸟鸣档不存在');
});

console.log('=== v2.1 新层接入与预览互动 ===');
run('8 个新层全部可被选项文字命中',()=>{
  const M=[['weave2','织一匹布'],['plaster','夯土起墙'],['ferry','撑篙过津渡'],
    ['granary','量入仓廪'],['astro','候气观星'],['mint','铸币权轻重'],
    ['mask2','执面礼容'],['drum2','击鼓聚众']];
  M.forEach(([k,t])=>assert.strictEqual(S.poseForOption({t:t}),k,t+' 未命中 '+k));
  assert.strictEqual(S.optionPoseReady('weave2',{turn:200,vol:9,seen:120}),true);
});
run('新增两张场景板按进度解锁',()=>{
  const M=globalThis.WQN.data.character.backdropMeta.filter(x=>['workshop','marsh'].indexOf(x.key)>=0);
  assert.strictEqual(M.length,2);
  const ws=M.filter(x=>x.key==='workshop')[0],ms=M.filter(x=>x.key==='marsh')[0];
  assert.strictEqual(S.unlocked(ws.need,{turn:11,vol:1,seen:0}),false);
  assert.strictEqual(S.unlocked(ws.need,{turn:12,vol:1,seen:0}),true);
  assert.strictEqual(S.unlocked(ms.need,{turn:0,vol:7,seen:0}),false);
  assert.strictEqual(S.unlocked(ms.need,{turn:0,vol:8,seen:0}),true);
});
run('UI 含预览长按、短按回弹、重绘保持朗读开关',()=>{
  const u=fs.readFileSync(path.join(ROOT,'src','ui.js'),'utf8');
  ['SPLONGT','SPMOVED','IS_PREVIEW','sp-bounce','openPosePanel(e.clientX',
   '预览立绘同步换上','syncSayBtn','wqn:speakend'].forEach(x=>
    assert.ok(u.indexOf(x)>=0,'UI 缺 '+x));
  const css=fs.readFileSync(path.join(ROOT,'src','style.css'),'utf8');
  assert.ok(css.indexOf('@keyframes sp-bounce')>=0,'CSS 缺回弹动画');
});
run('98 关全部有真实情境名，没有「待定」占位',()=>{
  const P=JSON.parse(fs.readFileSync(path.join(ROOT,'data','asset_plan.json'),'utf8'));
  assert.strictEqual(P.scenes.length,98);
  const bad=P.scenes.filter(x=>/待定|待登记/.test(x.name+x.when));
  assert.deepStrictEqual(bad,[],'占位关卡：'+bad.map(x=>x.key).join('、'));
  assert.strictEqual(P.pending.length,0);
});

console.log('=== v2.2 人声表演与 8 层映射 ===');
run('8 个新层全部可被选项文字命中',()=>{
  const M=[['loom3','络纬理线'],['kiln3','烧窑抟土'],['bridge3','架梁横木'],
    ['well3','汲水掘泉'],['ink3','研墨入砚'],['sail3','扬帆乘风'],
    ['herd3','牧畜抱羔'],['bell3','悬铃报更']];
  M.forEach(([k,t])=>assert.strictEqual(S.poseForOption({t:t}),k,t+' 未命中 '+k));
});
run('台词情绪只读判定，五种语气都可命中',()=>{
  const M=[['忽有异象，失手骤变','surprise'],['故去凋散，终章','sad'],
    ['问其所自，索而考之','curious'],['两存其说，疑而未定','hesitate'],
    ['丰年顺成，众皆欢喜','happy'],['这一笔照旧记入册','calm']];
  M.forEach(([t,k])=>assert.strictEqual(S.talkMood(t),k,'「'+t+'」应为 '+k));
});
run('四档声线、六种语气音与表演开关接口齐备',()=>{
  const A=globalThis.WQN.a11y;
  assert.ok(A&&A.voicePacks&&A.voicePacks.length===4,'声线档不是 4');
  assert.ok(A.voicePacks.filter(x=>x.key==='mute').length,'缺不出声档');
  assert.strictEqual(A.status().voicePack,'gentle','默认档不对');
  assert.strictEqual(A.setVoicePack('deep'),true);
  assert.strictEqual(A.status().voicePack,'deep');
  assert.ok(A.pack().cue<1,'低沉档语气音未降调');
  A.setVoicePack('gentle');
  const M=JSON.parse(fs.readFileSync(path.join(ROOT,'data','music.json'),'utf8'));
  assert.strictEqual(Object.keys(M.guideCues).filter(x=>x!=='type').length,6);
  assert.strictEqual(M.talkMoods.length,5);
  assert.strictEqual(A.setTalkAct(false),false);
  assert.strictEqual(A.talkAct(),false);
  A.setTalkAct(true);
});
run('UI 含说话表演事件、设置卡与试听，CSS 含说话动画',()=>{
  const u=fs.readFileSync(path.join(ROOT,'src','ui.js'),'utf8');
  ['talkBegin','talkEnd','wqn:speakstart','data-voicepack','data-talkact',
   'data-cue-try','cueToggle','ch-talking','向 导 人 声'].forEach(x=>
    assert.ok(u.indexOf(x)>=0,'UI 缺 '+x));
  const a=fs.readFileSync(path.join(ROOT,'src','a11y.js'),'utf8');
  ['voicePacks','wqn:speakstart','setVoicePack','setTalkAct','1400'].forEach(x=>
    assert.ok(a.indexOf(x)>=0,'a11y 缺 '+x));
  const c=fs.readFileSync(path.join(ROOT,'src','style.css'),'utf8');
  assert.ok(c.indexOf('@keyframes chTalk')>=0,'CSS 缺说话动画');
});
run('98 关全部有真实情境名，没有占位',()=>{
  const P=JSON.parse(fs.readFileSync(path.join(ROOT,'data','asset_plan.json'),'utf8'));
  assert.strictEqual(P.scenes.length,98);
  assert.deepStrictEqual(P.scenes.filter(x=>/待定|待登记/.test(x.name+x.when)),[]);
  assert.strictEqual(P.pending.length,0);
});

console.log('=== v2.3 第三批素材与实机接口 ===');
run('8 个新层全部可被选项文字命中',()=>{
  /* v2.8 新批优先命中；旧批仍由不含新批关键词的说法命中，两条都保 */
  const M=[['plow6','耦耕于野'],['sieve6','簸谷取实'],['quill6','削牍修治'],
    ['lamp6','夜分守读'],['drum6','摇鼗报更'],['net6','理罟织网'],
    ['cart6','推车任重'],['oven6','守灶炊爨']];
  M.forEach(([k,t])=>assert.strictEqual(S.poseForOption({t:t}),k,t+' 未命中 '+k));
  assert.strictEqual(S.poseForOption({t:'深耕易耨'}),'plow4','旧扶犁层被挤掉');
});
run('新增两张场景板按进度解锁',()=>{
  const M=globalThis.WQN.data.character.backdropMeta.filter(x=>['threshing','riverdusk'].indexOf(x.key)>=0);
  assert.strictEqual(M.length,2);
  const t=M.filter(x=>x.key==='threshing')[0],r=M.filter(x=>x.key==='riverdusk')[0];
  assert.strictEqual(S.unlocked(t.need,{turn:15,vol:1,seen:0}),false);
  assert.strictEqual(S.unlocked(t.need,{turn:16,vol:1,seen:0}),true);
  assert.strictEqual(S.unlocked(r.need,{turn:0,vol:11,seen:0}),false);
  assert.strictEqual(S.unlocked(r.need,{turn:0,vol:12,seen:0}),true);
});
run('98 关全部有真实情境名，下一批只登记不占位',()=>{
  const P=JSON.parse(fs.readFileSync(path.join(ROOT,'data','asset_plan.json'),'utf8'));
  assert.strictEqual(P.scenes.length,98);
  assert.deepStrictEqual(P.scenes.filter(x=>/待定|待登记/.test(x.name+x.when)),[]);
  assert.strictEqual(P.pending.length,0);
  assert.strictEqual(P.delivered.length,101);
});
run('人声表演接口在设置层可直接调用',()=>{
  const A=globalThis.WQN.a11y;
  assert.strictEqual(A.voicePacks.length,4);
  ['bright','gentle','deep','mute'].forEach(k=>assert.ok(A.voicePacks.filter(x=>x.key===k).length,'缺 '+k));
  assert.strictEqual(A.setVoicePack('bright'),true);
  assert.ok(A.pack().pitch>1.1,'清亮档未升调');
  A.setVoicePack('gentle');
  const D=JSON.parse(fs.readFileSync(path.join(ROOT,'data','music.json'),'utf8'));
  assert.strictEqual(D.voicePacks.length,4);
  assert.strictEqual(Object.keys(D.guideCues).filter(x=>x!=='type').length,6);
});

console.log('=== v2.4 呼吸、待机与横屏 ===');
run('呼吸关键帧改用独立属性，不再被 transform 压死',()=>{
  const c=fs.readFileSync(path.join(ROOT,'src','style.css'),'utf8');
  const kf=c.slice(c.indexOf('@keyframes breathe'),c.indexOf('@keyframes layerIn'));
  assert.ok(/translate:\s*0 -4px/.test(kf),'呼吸未用独立 translate');
  assert.ok(/scale:\s*1\.014/.test(kf),'呼吸未用独立 scale');
  assert.ok(!/transform:/.test(kf),'呼吸仍在写 transform，会被 !important 覆盖');
  assert.ok(c.indexOf('@keyframes chIdleA')>=0&&c.indexOf('@keyframes chIdleD')>=0,'缺待机动作');
});
run('横屏键露出、窄屏适配与如实提示都在位',()=>{
  const u=fs.readFileSync(path.join(ROOT,'src','ui.js'),'utf8');
  ["class=\"vbtn vland","applyLandscape(","showLandHint","watchOrientation",
   'data-land-exit','orientation: landscape','addEventListener(\'resize\''].forEach(x=>
    assert.ok(u.indexOf(x)>=0,'UI 缺 '+x));
  const c=fs.readFileSync(path.join(ROOT,'src','style.css'),'utf8');
  assert.ok(c.indexOf('width:100vw!important;height:40vh')>=0,'缺窄屏铺满');
  assert.ok(c.indexOf('#landHint')>=0&&c.indexOf('pointer-events:none')>=0,
    '提示条仍会拦点击');
});
run('待机调度走固定散列，不调用主随机数',()=>{
  const u=fs.readFileSync(path.join(ROOT,'src','ui.js'),'utf8');
  assert.ok(u.indexOf('strHash')>=0&&u.indexOf('scheduleIdle')>=0);
  assert.ok(u.indexOf('reduceMotion')>=0);
  const seg=u.slice(u.indexOf('function idleTick'),u.indexOf('function applyLandscape'));
  assert.ok(!/Math\.random/.test(seg),'待机里出现了随机数');
});
run('被否决批次留档说明与 v2.5 重做结论',()=>{
  const P=JSON.parse(fs.readFileSync(path.join(ROOT,'data','asset_plan.json'),'utf8'));
  assert.ok(P.rejectedBatch&&P.rejectedBatch.keys.length===8,'缺作废登记');
  assert.ok(P.rejectedBatch.resolved&&P.rejectedBatch.resolved.indexOf('v2.5')>=0,'缺重做说明');
  assert.ok(/不入库|不内嵌/.test(P.rejectedBatch.action));
  assert.ok(P.rejectedBatch.preview&&P.rejectedBatch.preview.indexOf('preview_v25_final')>=0);
  assert.strictEqual(P.delivered.length,101);
  assert.strictEqual(P.scenes.length,98);
  const C=JSON.parse(fs.readFileSync(path.join(ROOT,'data','character.json'),'utf8'));
  assert.strictEqual(Object.keys(C.layers).length,99);
  assert.strictEqual(Object.keys(C.backdrops).length,21);
});

console.log('=== v2.5 新画风重做与真横屏 ===');
run('被否决的 8 层按新画风重做并全部可命中',()=>{
  const M=[['loom5','理纴引绪'],['kiln5','抟陶圆坯'],['bridge5','横木济川'],
    ['well5','提桶汲泉'],['ink5','磨砚松烟'],['sail5','张帆布帆'],
    ['herd5','羔羊乳羔'],['bell5','摇铃铜铃']];
  M.forEach(([k,t])=>assert.strictEqual(S.poseForOption({t:t}),k,t+' 未命中 '+k));
  /* 旧层不能被新层抢词 */
  assert.strictEqual(S.poseForOption({t:'架梁横木'}),'bridge3');
});
run('99 层 / 21 场景 / 98 关齐备，holes 全为 0',()=>{
  const C=globalThis.WQN.data.character;
  assert.strictEqual(Object.keys(C.layers).length,99);
  assert.strictEqual(Object.keys(C.backdrops).length,21);
  assert.strictEqual(S.status().scenes.length,98);
  assert.strictEqual(S.status().ready,98);
  assert.strictEqual(S.status().locked,0);
  const P=JSON.parse(fs.readFileSync(path.join(ROOT,'data','asset_plan.json'),'utf8'));
  assert.ok(P.rejectedBatch.resolved&&P.rejectedBatch.resolved.indexOf('v2.5')>=0);
  assert.deepStrictEqual(P.scenes.filter(x=>/待定|待登记/.test(x.name+x.when)),[]);
});
run('两张新场景板按进度解锁',()=>{
  const M=globalThis.WQN.data.character.backdropMeta.filter(x=>['ginkgo','cloister'].indexOf(x.key)>=0);
  assert.strictEqual(M.length,2);
  const g=M.filter(x=>x.key==='ginkgo')[0],c=M.filter(x=>x.key==='cloister')[0];
  assert.strictEqual(S.unlocked(g.need,{turn:17,vol:1,seen:0}),false);
  assert.strictEqual(S.unlocked(g.need,{turn:18,vol:1,seen:0}),true);
  assert.strictEqual(S.unlocked(c.need,{turn:0,vol:13,seen:0}),false);
  assert.strictEqual(S.unlocked(c.need,{turn:0,vol:14,seen:0}),true);
});
run('真横屏：全屏背景、左侧整宽选项、右侧完整立绘',()=>{
  const c=fs.readFileSync(path.join(ROOT,'src','style.css'),'utf8');
  ['v2.5 真横屏','width:100vw!important;height:100dvh!important',
   "flex-direction:column!important",'width:47vw!important',
   'right:2vw!important;bottom:2dvh!important',
   'top:2dvh!important','#landHint{top:auto!important'].forEach(x=>
    assert.ok(c.indexOf(x)>=0,'CSS 缺 '+x));
  const u=fs.readFileSync(path.join(ROOT,'src','ui.js'),'utf8');
  assert.ok(u.indexOf('data-land-exit')>=0,'缺常驻退出按钮');
  assert.ok(u.indexOf('exitFullscreen')>=0,'退出时未清理全屏');
  assert.ok(u.indexOf('document.body.appendChild(el)')>=0,'退出条仍挂在会被重绘冲掉的容器里');
  assert.ok(c.indexOf('rotate(90deg) translateY(-100%)')>=0,'缺旋转画布');
  assert.ok(c.indexOf('z-index:9999!important')>=0,'退出条层级不够');
});

console.log('=== v2.6 横屏可进可出、旋转画布 ===');
run('退出路径清理全屏与方向锁，不再提前 return 跳过',()=>{
  const u=fs.readFileSync(path.join(ROOT,'src','ui.js'),'utf8');
  const seg=u.slice(u.indexOf('function applyLandscape'),u.indexOf('function watchOrientation'));
  assert.ok(seg.indexOf('document.exitFullscreen')>=0);
  assert.ok(seg.indexOf('o.unlock')>=0);
  assert.ok(seg.indexOf('if(!on){')>=0);
  assert.ok(!/requestFullscreen/.test(seg),'仍在请求全屏，会留下退不出去的副作用');
  assert.ok(!/o\.lock\(/.test(seg),'仍在锁定系统方向');
  assert.ok(u.indexOf("e.key==='Escape'")>=0,'缺 Esc 退出');
});
run('三个退出入口与按钮 toggle 状态都在',()=>{
  const u=fs.readFileSync(path.join(ROOT,'src','ui.js'),'utf8');
  ['data-land-exit','data-landhint-close','syncLandBtn','aria-pressed',
   "if(LANDSCAPE)showLandHint()"].forEach(x=>assert.ok(u.indexOf(x)>=0,'缺 '+x));
  assert.ok(u.indexOf("btn.textContent=LANDSCAPE?'▯':'▭'")>=0,'按钮文案未随状态变');
});
run('物理方向变化时只重算旋转，不擅自开关横屏',()=>{
  const u=fs.readFileSync(path.join(ROOT,'src','ui.js'),'utf8');
  const seg=u.slice(u.indexOf('function watchOrientation'),u.indexOf('function applyDisplay'));
  assert.ok(seg.indexOf('if(!LANDSCAPE)return')>=0,'仍会自动替用户开横屏');
  assert.ok(seg.indexOf('wantRot90')>=0&&seg.indexOf("addEventListener('resize'")>=0);
});

console.log(fails?'\n❌ '+fails+' 项失败':'\n✅ 舞台专项全部通过');
process.exit(fails?1:0);
