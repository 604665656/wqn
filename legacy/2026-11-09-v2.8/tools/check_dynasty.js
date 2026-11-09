const fs=require('fs'),path=require('path');const ROOT=path.join(__dirname,'..');
const J=f=>JSON.parse(fs.readFileSync(path.join(ROOT,'data',f),'utf8'));const cfg=J('config.json');
globalThis.WQN={data:{keys:cfg.keys,keyOrder:cfg.keyOrder,traits:cfg.traits,eras:cfg.eras,
 regions:cfg.regions,views:cfg.views,vol:cfg.vol,endings:cfg.endings,
 events:J('events.json'),templates:J('templates.json'),chains:J('chains.json'),
 history:J('history.json'),entities:J('entities.json'),sources:J('sources.json'),
 civilization:J('civilization.json'),civSources:J('civ_sources.json'),
 succession:J('succession.json'),geoclimate:J('geoclimate.json'),fringe:J('fringe.json'),
 atlas:J('atlas.json'),options:J('options.json'),layers:J('layers.json'),
 consequences:J('consequences.json'),localities:J('localities.json'),peoples:J('peoples.json'),
 deepdives:J('deepdives.json'),difficulty:J('difficulty.json'),tutorial:J('tutorial.json'),
 reading_quiz:J('reading_quiz.json'),kinship:J('kinship.json'),
 rulers:J('rulers.json'),houses:J('houses.json'),house_entities:J('house_entities.json'),
 version:J('version.json'),art:J('art.json'),music:J('music.json'),
 character:J('character.json'),asset_plan:J('asset_plan.json')}};
const store={};globalThis.localStorage={getItem:k=>store[k]||null,setItem:(k,v)=>store[k]=v,removeItem:k=>delete store[k]};
['rng','kinship','family','people','weave','real','civilization','succession','reality','difficulty','tutorial','geoclimate','fringe','atlas','consequences','dynasty','options','art','audio','a11y','stage','engine'].forEach(m=>require(path.join(ROOT,'src',m+'.js')));
const W=globalThis.WQN,E=W.engine,DY=W.dynasty,D=W.data;
let bad=0;const ck=(c,m)=>{if(!c){console.log('  ✗ '+m);bad++;}else console.log('  ✓ '+m);};

console.log('=== 数据 ===');
ck(D.rulers.rulers.length===397,'帝王 397 位');
ck(D.houses.houses.length===153,'世家 153 家');
ck(D.house_entities.entities.length===30,'可代入 30 家');
ck(D.rulers.rulers.filter(x=>x.layer==='legend').length>0,'传说层单列');
ck(D.rulers.rulers.some(x=>x.polity.indexOf('临朝与摄政')>=0),'称制／摄政单列');
ck(D.options.special.length===19,'联动 19 条');
ck(D.reading_quiz.items.length===312,'判读题 312 道');

console.log('=== 实体查找（12 王朝口径不变） ===');
ck(D.entities.entities.length===12,'entities.json 仍为 12');
ck(W.real.entityById('C01').name==='姬周','王朝实体可查');
ck(W.real.entityById('H01').name==='琅琊王氏','世家实体可查');
ck(W.real.isHouse('H01')&&!W.real.isHouse('C01'),'isHouse 正确');
ck(W.real.allEntities().length===42,'合并 42 实体');

console.log('=== 同期匹配 ===');
[[-5000,'huaxia'],[320,'huaxia'],[690,'huaxia'],[750,'aegean'],[1600,'aegean']].forEach(([y,reg])=>{
 const S={year:y,reg:reg,reality:'balanced'};
 const r=DY.rulersAt(S),h=DY.housesAt(S);
 console.log('  '+y+' / '+reg+' → 在位 '+(r.near.length?r.near[0].name+'（'+r.near[0].polity+'）':'—')
  +' / 名族 '+(h.near.length?h.near[0].name:'—'));
 ck(r.near.every(x=>x.layer!=='legend'),y+' 传说层不进同期池');
});
ck(DY.polityRulers('秦').length>=1,'更迭卡可取本朝纪年锚点');

console.log('=== 代入世家：六阶段走到终章 ===');
const S=E.freshEntity('H01','family','chk-house');E.setState(S);
ck(S.mode==='real'&&S.houseId==='H01','开局标记世家');
let realEnd=0;
for(let i=0;i<60;i++){
 E.step();let st=E.state();
 if(st.phase==='volume')E.continueVolume();
 st=E.state();if(st.phase==='choice')E.choose(i%2);
 st=E.state();if(st.phase==='realend'){realEnd++;E.openScroll(true);E.backFromScroll();E.realEndContinue();}
}
ck(realEnd===1,'世家终章触发 '+realEnd);
ck(Object.keys(S.seenRuler||{}).length>0,'长局见到同期在位');
ck(Object.keys(S.seenHouse||{}).length>0,'长局见到同期名族');
const sum=DY.summary(S);
console.log('  样本：帝王 '+sum.rulers+' / '+sum.rulerTotal+'，世家 '+sum.houses+' / '+sum.houseTotal);
const scroll=W.weave.scrollData(S,true);
ck(scroll.entity&&scroll.entity.isHouse===true,'收卷含世家六阶段');
ck(scroll.dynasty&&scroll.dynasty.rulers>=0,'收卷含帝王世家统计');

console.log('=== 普通局与复盘 ===');
const P=E.fresh('huaxia','family','chk-sim');E.setState(P);
for(let i=0;i<40;i++){E.step();let st=E.state();
 if(st.phase==='volume')E.continueVolume();st=E.state();if(st.phase==='choice')E.choose(i%3);}
ck(Object.keys(P.seenRuler||{}).length>0,'普通局也记录同期在位');
const a=E.fresh('huaxia','family','same-seed'),b=E.fresh('huaxia','family','same-seed');
for(const S2 of [a,b]){E.setState(S2);for(let i=0;i<20;i++){E.step();let st=E.state();
 if(st.phase==='volume')E.continueVolume();st=E.state();if(st.phase==='choice')E.choose(i%2);}}
ck(JSON.stringify(a.seenRuler)===JSON.stringify(b.seenRuler)
 &&JSON.stringify(a.seenHouse)===JSON.stringify(b.seenHouse),'同种子帝王世家记录一致');
ck(a.year===b.year&&a.score===b.score,'同种子年份与传承度一致');

console.log('=== v1.0 版本号 ===');
const V=D.version;
ck(/^\d+\.\d+$/.test(V.version)&&V.build===V.changelog.length,'版本号与 build／changelog 一致');
ck(!V.pending,'pending 已被构建消费');
ck(V.changelog.length>=1&&V.changelog[0].items.length>=5,'changelog 已记录本轮');
ck(V.changelog[0].version==='v'+V.version,'changelog 顶部版本与当前版本一致');
ck(E.fresh('huaxia','family','ver-chk').ver===V.version,'新档写入版本字段');
const old=Object.assign({},E.fresh('huaxia','family','ver-old'));delete old.ver;E.migrate(old);ck(old.ver===V.version,'旧档自动补版本字段');

console.log('=== v1.0 时间条 / 广域 / 继立题 ===');
const T=DY.timelineData('唐');
ck(!!T&&T.rows.length>=20,'唐时间条行数充足');
ck(T.rows.every(r=>r.cat&&r.y0<=r.y1),'时间条行字段完整');
ck(DY.polityNames().length>=40,'政权分组齐全');
ck(new Set(T.rows.map(r=>r.cat)).size>=3,'时间条有分色类别');
const HC={};D.houses.houses.forEach(x=>HC[x.region]=(HC[x.region]||0)+1);
ck(HC.indus>=10&&HC.meso>=10&&HC.nile>=5&&HC.steppe>=8&&HC.maya>=5,
  '非华夏圈世家密度：'+JSON.stringify(HC));
const succ=D.reading_quiz.items.filter(x=>x.kind==='succession');
ck(succ.length===24,'继立方式题 24 道');
ck(succ.every(x=>x.ok.indexOf('分层存疑')>=0&&x.bad.indexOf('直取常见误解')>=0),
  '继立题三档格式正确');
ck(D.options.special.some(x=>x.id==='SP_SUCCESSION')
  &&D.options.special.some(x=>x.id==='SP_HOUSE_PEER'),'两条新联动在册');

console.log('=== v1.2 声与色 ===');
ck(!!W.art&&!!W.audio,'美术与音乐模块已挂载');
ck(D.art.motifs.length===12&&Object.keys(D.art.scenes).length===8,'纹样 12 / 场景 8');
ck(D.music.scales.length===8&&Object.keys(D.music.cues).length===11,'调式 8 / 音效 11');
const ao={year:750,reg:'aegean',era:3,vol:2,label:'卷 2'};
ck(W.art.banner(ao)===W.art.banner(ao),'插画确定性');
ck(W.art.scene('ending',ao).indexOf('NaN')<0,'场景无 NaN');
console.log('=== v1.3 分路声音与无障碍 ===');
W.audio.set('on',false);W.audio.set('sfx',true);
ck(W.audio.status().sfx===true&&W.audio.status().bgm===false,'音效与背景音互不串扰');
W.audio.set('bgm',true);W.audio.set('sfx',false);
ck(W.audio.status().bgm===true&&W.audio.status().on===true,'只关音效时背景音仍在');
ck(!!W.a11y&&W.a11y.parseCommand('选三').i===3,'语音命令解析可用');
ck(!!W.a11y&&W.a11y.privacy.indexOf('不上传')>=0,'隐私说明在册');
console.log('=== v1.4 AVG 舞台 ===');
ck(!!W.stage&&Object.keys(D.character.layers).length===99,'舞台 99 层角色已挂载');
const _flat=v=>Array.isArray(v)?v.join(''):v;
ck(_flat(D.character.bg).indexOf('data:image/jpeg;base64,')===0,'背景板分块还原可用');
ck(W.stage.weatherOf({reg:'huaxia',turn:1,vol:{n:1},phase:'choice',cur:{}})===
   W.stage.weatherOf({reg:'huaxia',turn:1,vol:{n:1},phase:'choice',cur:{}}),'天气确定性');
ck(W.stage.poseOf({phase:'volume'},'sun').pose==='happy','卷末姿势贴合');
ck(W.audio.setWeather('rain')===true&&W.audio.getWeather()==='rain','天气环境音可切换');
console.log('=== v1.5 视图与关卡 ===');
ck(!!D.asset_plan&&D.asset_plan.scenes.length===98,'表演关卡表 98 关已挂载');
ck(W.stage.status().ready===98&&W.stage.status().locked===0,'98 关全就绪');
ck(!!W.a11y.speakAs&&!!W.audio.guideCue,'角色音色与语气音接口齐备');
ck(Object.keys(W.stage.SIZES).length===3,'三档舞台尺寸');
console.log(bad?'\n❌ '+bad+' 项失败':'\n✅ 全部自检通过');
process.exit(bad?1:0);
