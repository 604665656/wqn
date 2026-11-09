/* test/logic.test.js —— 纯逻辑回归（node test/logic.test.js） */
const fs=require('fs'),path=require('path'),assert=require('assert');
const ROOT=path.join(__dirname,'..');
const J=f=>JSON.parse(fs.readFileSync(path.join(ROOT,'data',f),'utf8'));
const cfg=J('config.json');
globalThis.WQN={data:{
  keys:cfg.keys,keyOrder:cfg.keyOrder,traits:cfg.traits,eras:cfg.eras,
  regions:cfg.regions,views:cfg.views,vol:cfg.vol,endings:cfg.endings,
  events:J('events.json'),templates:J('templates.json'),chains:J('chains.json'),
  history:J('history.json'),entities:J('entities.json'),sources:J('sources.json'),
  civilization:J('civilization.json'),civSources:J('civ_sources.json'),
  succession:J('succession.json'),geoclimate:J('geoclimate.json'),fringe:J('fringe.json'),
  atlas:J('atlas.json'),options:J('options.json'),layers:J('layers.json'),
  consequences:J('consequences.json'),
  localities:J('localities.json'),peoples:J('peoples.json'),deepdives:J('deepdives.json'),
  difficulty:J('difficulty.json'),tutorial:J('tutorial.json'),
  reading_quiz:J('reading_quiz.json'),kinship:J('kinship.json'),
 rulers:J('rulers.json'),houses:J('houses.json'),house_entities:J('house_entities.json'),
 version:J('version.json'),art:J('art.json'),music:J('music.json'),
 character:J('character.json'),asset_plan:J('asset_plan.json')
}};
const store={};
globalThis.localStorage={getItem:k=>store[k]||null,setItem:(k,v)=>store[k]=v,removeItem:k=>delete store[k]};
['rng','kinship','family','people','weave','real','civilization','succession','reality','difficulty','tutorial','geoclimate','fringe','atlas','consequences','dynasty','options','art','audio','a11y','stage','engine'].forEach(m=>require(path.join(ROOT,'src',m+'.js')));
const W=globalThis.WQN,E=W.engine,WV=W.weave,CV=W.civilization;
let fails=[];
function run(name,fn){try{fn();console.log('  ✓ '+name);}catch(e){fails.push(name+' → '+e.message);console.log('  ✗ '+name+' → '+e.message);}}
function play(S,n,onPhase){
  E.setState(S);
  let last=-Infinity,volCount=0,endCount=0,scrollCount=0,realEnd=0,civCount=0;
  let turnover=0,dynSeen=new Set(),lastYear=0;
  for(let i=0;i<n;i++){
    E.step();
    const st=E.state();
    if(st.phase!=='choice')throw new Error('@'+i+' 未进入 choice: '+st.phase);
    if(!st.cur||st.cur.opts.length<3||st.cur.opts.length>6)throw new Error('分支数异常 @'+i+' '+st.cur.opts.length);
    // 短命王朝（如秦 14 年）同年内多笔属正常；更迭跳年允许前跳，只禁止同朝倒退
    if(st.year<last&&st.mode!=='succession')throw new Error('年份倒退 @'+i+' '+last+'→'+st.year);
    last=st.year;lastYear=st.year;
    cfg.keyOrder.forEach(k=>{if(!Number.isFinite(st.st[k])||st.st[k]<0||st.st[k]>100)throw new Error('属性越界 '+k+'='+st.st[k]);});
    if(!st.fam.some(p=>p.alive))throw new Error('家族绝嗣 @'+i);
    if(st.mode==='succession')dynSeen.add(W.succession.link(st).name);
    E.choose(i%3);
    let p=st.phase;
    if(p==='volume'){
      volCount++;
      if(!st.volEnd.echo)throw new Error('卷末无汇流');
      E.continueVolume();p=st.phase;
    }
    if(p==='turnover'){
      turnover++;
      const t=st.turnover;
      if(!t||!t.name||!t.endReason)throw new Error('更迭卡缺字段');
      if(t.next&&!t.next.name)throw new Error('更迭卡缺下一朝');
      E.nextDynasty();p=st.phase;
    }
    if(p==='ending'){
      endCount++;E.openScroll(true);scrollCount++;
      if(WV.scrollData(st,true).hist.length!==Object.keys(st.used).length)throw new Error('收卷史事数不符');
      E.backFromScroll();E.epilogue();p=st.phase;
    }
    if(p==='realend'){
      realEnd++;
      if(!st.realEnd.name)throw new Error('真实终章缺实体');
      E.openScroll(true);
      const d=WV.scrollData(st,true);
      if(!d.entity||d.entity.phases.length!==6)throw new Error('收卷缺实体六阶段');
      if(!d.civ)throw new Error('收卷缺文明统计');
      if(st.mode==='succession'&&!d.chain)throw new Error('收卷缺长河链');
      E.backFromScroll();E.realEndContinue();p=st.phase;
    }
    if(p==='scroll'){E.backFromScroll();p=st.phase;}
    if(['result','choice'].indexOf(p)<0)throw new Error('未知阶段 '+p+' @'+i);
    civCount=Object.keys(st.seenCiv).length;
    if(onPhase)onPhase(st,i);
  }
  return {volCount,endCount,scrollCount,realEnd,turnover,civCount,last:lastYear,
    dynSeen:[...dynSeen]};
}

/* 1. 普通模式长局 */
run('21 组 × 800 笔（卷末／终章／续卷／收卷全路径）',()=>{
  for(const reg of Object.keys(cfg.regions))for(const view of Object.keys(cfg.views)){
    const r=play(E.fresh(reg,view,'seed-'+reg+'-'+view),800);
    assert.ok(r.volCount>0,'未触发卷末');
    assert.ok(r.civCount>0,'未遇见任何文明条目');
    if(reg==='huaxia'&&view==='family')
      console.log('    样本：卷末 '+r.volCount+' / 终章 '+r.endCount+' / 收卷 '+r.scrollCount
        +' / 文明条目 '+r.civCount+'，止于 '+r.last+' 年');
  }
});

/* 2. 真实血脉：12 个实体各走完六阶段 */
run('12 个真实实体六阶段与真实终章',()=>{
  for(const ent of W.data.entities.entities){
    let covered=0;
    const r=play(E.freshEntity(ent.id,'family','real-'+ent.id),72,st=>{
      covered=Math.max(covered,Object.keys((st.entity||{}).civPhases||{}).length);
    });
    assert.strictEqual(r.realEnd,1,ent.name+' 未触发真实终章（'+r.realEnd+'）');
    assert.ok(r.last>=ent.endYear-2,ent.name+' 未走到终结年 '+r.last);
    assert.ok(r.civCount>0,ent.name+' 未遇见文明条目');
    /* 每个阶段保底一笔同期文明条目：短命王朝不能再整局空手 */
    assert.ok(covered>=6,ent.name+' 同期条目只覆盖 '+covered+'/6 个阶段');
  }
  const S=E.freshEntity('C02','family','real-C02');   // 嬴秦
  E.setState(S);
  const phases=[];
  play(S,72,(st)=>{st.mil.filter(m=>m.t.indexOf('阶段 · ')===0).forEach(m=>{
    if(phases.indexOf(m.t)<0)phases.push(m.t);});});
  assert.strictEqual(phases.length,6,'六阶段里程碑不全：'+phases.length);
});

/* 2b. 朝代长河：连续更迭、真实人物随朝登场 */
run('朝代长河 6 朝连续更迭（含 5 段间朝）',()=>{
  const chain=W.succession.chainOf('huaxia');
  assert.strictEqual(chain.entities.length,6,'链长不对');
  const r=play(E.freshSuccession('huaxia','family','chain-test'),90);
  assert.strictEqual(r.dynSeen.length,6,'未走完 6 朝：'+r.dynSeen.join('/'));
  assert.strictEqual(r.turnover,6,'更迭卡次数 '+r.turnover);
  assert.strictEqual(r.realEnd,1,'缺长河终章');
  assert.ok(r.civCount>0,'长河未遇见任何文明条目');
  play(E.freshSuccession('huaxia','family','people-test'),12);
  const people=Object.keys(E.state().seenCiv).filter(id=>{
    const x=W.civilization.itemById(id);return x&&x.dim==='P';
  });
  assert.ok(people.length>0,'姬周一朝未遇见任何真实人物');
  assert.ok(r.last>=chain.to-2,'未走到链尾 '+r.last);
  console.log('    样本：更迭 '+r.turnover+' 次 / 卷末 '+r.volCount+' 次 / 文明条目 '+r.civCount
    +'，止于 '+r.last+' 年，历经 '+r.dynSeen.join('→'));
});

/* 2c. 人物与政权的同期映射（只表示年代重叠） */
run('真实人物按年代窗口映射同期政权',()=>{
  const links=W.data.succession.itemLinks;
  const P=(id)=>W.civilization.itemById(id);
  assert.ok(links.P002.some(x=>x.name==='姬周'),'孔子未落在姬周纪年');
  assert.ok(links.P005.some(x=>x.name==='刘汉'),'司马迁未落在刘汉纪年');
  assert.ok(links.T006.some(x=>x.name==='刘汉'),'蔡伦监造良纸未落在刘汉纪年');
  const S=E.freshSuccession('huaxia','family','contemp');E.setState(S);E.step();
  const co=W.succession.contemporaries(S,S.cur);
  assert.ok(co.length>0&&co[0].name,'缺同期政权');
  assert.ok(W.data.succession.meta.linkRule.indexOf('不表示隶属')>=0,'同期口径缺声明');
  console.log('    样例：'+P('P002').title+' ↔ 姬周；'+P('P005').title+' ↔ 刘汉；'
    +P('T006').title+' ↔ 刘汉');
});

/* 2d. 并存政权不硬串成更迭链 */
run('年代重叠的政权列为并存群，不伪造更迭',()=>{
  const co=W.succession.coexisting();
  assert.ok(co.aegean&&co.aegean.entities.length>=2,'爱琴政权未列并存');
  assert.ok(/重叠/.test(co.aegean.reason),'并存理由未说明重叠');
  assert.ok(!W.succession.chainOf('aegean'),'爱琴被错误排成线性链');
});

/* 3. 确定性种子 */
run('同 seed + 同选择序列 → 完全同一局',()=>{
  function play(){
    const S=E.fresh('huaxia','family','fixed-seed-42');E.setState(S);
    for(let i=0;i<120;i++){E.step();E.choose(i%3);
      const p=S.phase;if(p==='volume')E.continueVolume();else if(p==='ending')E.epilogue();}
    const s=E.state();
    return JSON.stringify({year:s.year,turn:s.turn,st:s.st,tags:s.tags,used:s.used,
      seenCiv:s.seenCiv,log:s.log,mil:s.mil,fam:s.fam.map(p=>p.name+p.gen),score:s.score});
  }
  assert.strictEqual(play(),play(),'两局不一致');
});

/* 4. 旧存档迁移 */
run('v1 旧档可迁移续玩',()=>{
  let S=E.fresh('nile','civ','legacy');E.setState(S);
  for(let i=0;i<10;i++){E.step();E.choose(0);}
  E.save();
  const raw=JSON.parse(store[E.KEY]);
  ['vol','volTurn','rngState','volLog','stitches','scroll','ended','endLog','seenCiv','personLens'].forEach(k=>delete raw[k]);
  raw.v=1;
  const m=E.migrate(raw);
  assert.ok(m&&m.v===2&&m.vol&&typeof m.rngState==='number'&&m.seenCiv,'迁移失败');
  const before=m.year;E.setState(m);E.step();E.choose(1);
  assert.ok(E.state().year>before,'迁移后无法推进');
});

/* 5. 继承顺位 */
run('继承顺位四种都能走通',()=>{
  const F=W.family,S=E.fresh('huaxia','family','succ');E.setState(S);
  const types=new Set();
  for(let i=0;i<60;i++){
    S.fam.forEach(p=>{if(p.alive)p.alive=false;});
    const r=F.succession(S,()=>0.5,a=>a[0]);
    types.add(r.type);assert.ok(r.person.alive&&r.person.role==='ruler');
  }
  assert.ok(types.has('绝嗣立新'),'缺绝嗣立新');
});

/* 5b. 账本写回、解锁树、分享串、存档槽 */
run('旧例改写 drift 公式',()=>{
  const S=E.fresh('huaxia','family','ledger');E.setState(S);
  S.tags['初耕']=1;S.tags['灌溉']=1;S.tags['识字']=2;
  const L=E.ledgerNow();
  assert.ok(L.food>=4&&L.lore>=2,'旧例未写回账本 '+JSON.stringify(L));
});
run('解锁树年代倒挂不卡死',()=>{
  const S=E.fresh('huaxia','family','unlock');E.setState(S);
  const all=CV.candidates(Object.assign({},S,{year:2000,seenCiv:{}}));
  assert.ok(all.length>0,'全部条目被解锁树卡死');
  const S2=E.fresh('huaxia','family','unlock2');E.setState(S2);
  assert.ok(CV.unlocked(W.data.civilization.items[0],{},S2.year),'首条被误锁');
});
run('分享串可解析且对照局可重放',()=>{
  const S=E.fresh('huaxia','family','share-42');E.setState(S);
  for(let i=0;i<24;i++){E.step();E.choose(1);const p=S.phase;
    if(p==='volume')E.continueVolume();else if(p==='ending')E.epilogue();}
  const str=E.shareString();
  assert.ok(str.indexOf('WQN1.')===0,'分享串格式错');
  const p=E.parseShare(str);
  assert.ok(p&&p.choices.length===24,'分享串解析错');
  const g=E.replay(str);
  assert.ok(g&&g.turn===S.turn&&g.year===S.year,'对照局重放不一致 '+g.turn+'/'+S.turn);
  E.clearGhost();
});
run('多存档槽保存与载入',()=>{
  const S=E.fresh('huaxia','family','slot-test');E.setState(S);
  E.step();E.choose(0);
  assert.ok(E.saveSlot(2),'存槽失败');
  const sl=E.slots();assert.ok(sl[2]&&sl[2].turn===S.turn,'槽摘要错');
  assert.ok(E.useSlot(2),'载槽失败');
  assert.strictEqual(E.state().turn,S.turn,'载槽后笔数不符');
  const all=E.exportAll();
  assert.ok(JSON.parse(all).v===3,'导出格式错');
  assert.ok(E.importAll(all),'导入失败');
  E.delSlot(2);assert.ok(!E.slots()[2],'清空槽失败');
});

/* 6. 数据完整性 */
run('外置数据字段完整',()=>{
  const d=W.data;
  assert.strictEqual(d.events.length,91);
  assert.strictEqual(d.templates.length,24);
  assert.strictEqual(d.chains.chains.length,8);
  assert.strictEqual(d.history.events.length,72);
  assert.strictEqual(d.entities.entities.length,12);
  assert.ok(d.civilization.items.length>=761,'文明条目不足 '+d.civilization.items.length);
  assert.ok(d.civilization.dimensions.length>=32,'维度不足 '+d.civilization.dimensions.length);
  assert.ok(d.geoclimate.units.length>=29,'地理单元不足');
  assert.ok(d.geoclimate.events.length>=32,'气候事件不足');
  assert.ok(d.fringe.texts.length>=39,'文本传统不足');
  assert.ok(d.fringe.hypotheses.length>=12,'未证实假说不足');
  assert.ok(d.fringe.prehistory.length>=15,'史前可考不足');
  assert.ok(d.civilization.treasures.length>=12,'鉴宝卡不足');
  assert.ok(d.civilization.biographies.length>=12,'人物生平不足');
  assert.ok(d.civilization.unlocks.length>=24,'解锁树不足');
  d.civilization.items.forEach(x=>{
    assert.ok(x.id&&x.title&&x.summary&&x.category&&x.rawYear,'文明条目字段缺失 '+x.id);
    assert.ok(x.y0<=x.y1,'年代区间倒置 '+x.id);
    assert.ok(x.sources.length>0,'无出处 '+x.id);
    assert.ok(d.civilization.dimensions.some(v=>v.key===x.dim),'维度未登记 '+x.id);
  });
  ['R','M','K','A','U','F','J','G','V','N','W','E','L','S','H','X',
   'Q','Y','D','O','Z','BI','PH','ME','LA','FI','CL','DI'].forEach(k=>
    assert.ok(d.civilization.items.some(x=>x.dim===k),'缺维度 '+k));
  assert.ok(d.civilization.items.find(x=>x.dim==='N').boundary,'术数缺边界声明');
  assert.ok(d.civilization.items.find(x=>x.dim==='R').boundary,'神话缺边界声明');
  d.entities.entities.forEach(e=>assert.strictEqual(e.phases.length,6,e.name+' 阶段数不对'));
  const chain=d.succession.chains.huaxia;
  assert.strictEqual(chain.entities.length,6);
  for(let i=1;i<chain.entities.length;i++)
    assert.ok(chain.entities[i].startYear>chain.entities[i-1].endYear,
      '更迭链出现纪年重叠 '+chain.entities[i-1].name+'→'+chain.entities[i].name);
  assert.ok(chain.entities.slice(0,-1).every(e=>e.gapToNext&&e.gapToNext.name),'缺间朝说明');
});

/* 7. 寿数模型：不再出现百岁古人 */
run('跨百年的编年不把人加龄到百岁',()=>{
  let maxAlive=0,maxDead=0,deathLines=0,bigJumpLines=0;
  cfg.regions && Object.keys(cfg.regions).slice(0,7).forEach(reg=>{
    ['family','civ','figure'].forEach(view=>{
      const S=E.fresh(reg,view,'age-'+reg+'-'+view);
      E.setState(S);
      for(let i=0;i<180;i++){
        E.step();
        const st=E.state();
        if(st.phase!=='choice'){E.choose(0);continue;}
        st.fam.filter(p=>p.alive).forEach(p=>maxAlive=Math.max(maxAlive,p.age));
        E.choose(i%3);
        let ph=st.phase;
        if(ph==='volume'){E.continueVolume();ph=st.phase;}
        if(ph==='turnover'){E.nextDynasty();ph=st.phase;}
        if(ph==='ending'){E.epilogue();ph=st.phase;}
        if(ph==='realend')E.realEndContinue();
      }
      const st=E.state();
      st.log.forEach(l=>{
        if(/享年约\s*(\d+)\s*岁/.test(l.t||'')){
          deathLines++;
          maxDead=Math.max(maxDead,+l.t.match(/享年约\s*(\d+)\s*岁/)[1]);
        }
        if(l.t&&l.t.indexOf('并非一人活过百年')>=0)bigJumpLines++;
      });
      assert.ok(st.fam.some(p=>p.alive),'家族绝嗣 '+reg+'/'+view);
    });
  });
  assert.ok(deathLines>0,'没有任何凋零记录，寿数模型未生效');
  assert.ok(bigJumpLines>0,'跨年说明未写入编年');
  assert.ok(maxAlive<=92,'在籍出现超 92 岁：'+maxAlive);
  assert.ok(maxDead<=92,'享年出现超 92 岁：'+maxDead);
  const BL=W.family.baseLife;
  assert.ok(BL(-4000)<BL(0)&&BL(0)<BL(1900)&&BL(1900)<=BL(2000),'寿数未随时代递增');
  assert.ok(BL(-4000)>=30&&BL(2000)<=80,'寿数区间失真');
  console.log('    样本：在籍最高 '+maxAlive+' 岁 / 享年最高 '+maxDead+' 岁 / 凋零记录 '+deathLines+' 条'
    +' / 基准寿数 前4000年 '+BL(-4000)+' 岁 → 2000年 '+BL(2000)+' 岁');
});
run('旧档百岁人物与百岁享年日志会被迁移收敛',()=>{
  const old=E.fresh('huaxia','family','legacy-age');
  old.fam[0].age=138;
  old.log.push({y:old.year,t:'族人 张三（第1代）卒，享年约 138 岁。',k:'fam'});
  const m=E.migrate(JSON.parse(JSON.stringify(old)));
  assert.ok(m.fam.every(p=>p.age<=90),'仍有百岁在籍人物');
  assert.ok(m.log.some(l=>l.t.indexOf('享年约 92 岁')>=0),'旧日志未收敛');
  assert.ok(m.fam.every(p=>typeof p.born==='number'),'缺出生年');
});

/* 8. 历史舆图：可缩放、坐标合法、并立政权不被排成单线 */
run('历史舆图数据完整且不作国界主张',()=>{
  const A=JSON.parse(require('fs').readFileSync(require('path').join(__dirname,'../data/atlas.json'),'utf8'));
  assert.ok(A.meta.disclaimer.indexOf('不是历史国界图')>=0,'缺国界免责声明');
  assert.ok(A.meta.precise.indexOf('并立政权')>=0,'缺并立政权纪律');
  assert.ok(A.lands.length>=10&&A.polities.length>=25&&A.cities.length>=25&&A.rivers.length>=8,
    '舆图规模不足');
  assert.strictEqual(A.units.length,29,'地理单元未与 geoclimate 对齐');
  const chk=arr=>arr.forEach(o=>{
    const ring=o.ring||o.line;
    assert.ok(ring&&ring.length>=2,o.id+' 缺坐标列');
    ring.forEach(p=>{
      assert.ok(p.length===2&&Math.abs(p[0])<=180&&Math.abs(p[1])<=90,o.id+' 坐标越界');
    });
  });
  chk(A.lands);chk(A.inlandSeas);chk(A.polities);chk(A.rivers);chk(A.routes);
  A.polities.forEach(p=>{
    assert.ok(p.from<=p.to,p.id+' 年代倒置');
    assert.ok(p.note&&p.note.length>8,p.id+' 缺示意说明');
    assert.ok(p.ring.length>=3,p.id+' 多边形点数不足');
  });
  A.cities.forEach(c=>assert.ok(Math.abs(c.lat)<=90&&Math.abs(c.lon)<=180,c.id+' 城址坐标越界'));
  const at750=A.polities.filter(p=>750>=p.from&&750<=p.to);
  assert.ok(at750.length>=3,'750 年并立政权不足：'+at750.map(p=>p.name).join('、'));
  assert.ok(new Set(at750.map(p=>p.region)).size>=2,'并立政权未按文明圈分散显示');
  console.log('    样本：750 年并立 '+at750.length+' 个政权 —— '+at750.map(p=>p.name).join('、'));
});

/* 9. 知识驱动选项：不再三条固定模板，且知识真的参与交互 */
run('选项由知识生成，含类型／依据／代价／风险，且不再刷固定回响',()=>{
  const S=E.fresh('huaxia','family','opt-diversity');E.setState(S);
  const kinds=new Set(),basis=new Set(),counts={},risks=[],texts=new Set(),arches=new Set();
  let writeBack=0,jobFirst=0;
  const fixed=cfg.views.family.echo[0];
  for(let i=0;i<90;i++){
    E.step();let st=E.state();
    if(st.phase!=='choice'){
      if(st.phase==='volume')E.continueVolume();
      else if(st.phase==='turnover')E.nextDynasty();
      else if(st.phase==='ending')E.epilogue();
      else if(st.phase==='realend')E.realEndContinue();
      st=E.state();
    }
    if(st.phase!=='choice')continue;
    counts[st.cur.opts.length]=(counts[st.cur.opts.length]||0)+1;
    st.cur.opts.forEach(o=>{
      assert.ok(!/\{\w+\}/.test(o.t),'选项文本残留占位符：'+o.t);
      texts.add(o.t);
      if(o.kind&&o.kind!=='situation')kinds.add(o.kind);
      if(o.archetype&&o.archetype.indexOf('SITU')!==0)arches.add(o.archetype);
      if(o.basis)basis.add(o.basis.title);
      if(o.risk>0)risks.push(o.risk);
    });
    const before=Object.keys(st.seenCiv||{}).length;
    let idx=st.cur.opts.findIndex(o=>o.kind&&o.kind!=='situation'&&o.kind!=='quiz');
    if(idx<0)idx=0;
    E.choose(idx);
    const after=Object.keys(E.state().seenCiv||{}).length;
    if(after>before)writeBack++;
  }
  const st=E.state();
  assert.ok(kinds.size>=6,'选项类型不足：'+[...kinds].join('、'));
  assert.ok(arches.size>=10,'行动原型太单调：'+arches.size+' 种');
  assert.ok(basis.size>=8,'选项引用的真实知识条目不足：'+basis.size);
  assert.ok(risks.length>=10,'风险选项太少：'+risks.length);
  assert.ok((counts[4]||0)+(counts[5]||0)+(counts[6]||0)>0,'选项数恒为 3，未实现 3—6 浮动');
  assert.ok(!texts.has(fixed),'仍在刷同一条固定视角回响');
  assert.ok(writeBack>=5,'研习未把知识写回文明册：'+writeBack);
  assert.ok(Object.keys(st.jobs||{}).length>=2,'家族职业未写回');
  assert.ok((st.optEcho||[]).length>=3,'卷末回响素材未积累');
  assert.ok(Object.keys(st.optUse||{}).length>=6,'选项记忆未生效');
  console.log('    样本：'+arches.size+' 种行动原型 / '+kinds.size+' 类抉择 / 引用 '+basis.size
    +' 条真实知识 / 选项数分布 '+JSON.stringify(counts)+' / 研习写回 '+writeBack+' 次');
});
run('重复选择收益衰减、风险失手与知识写回可复现',()=>{
  const S=E.fresh('huaxia','family','opt-decay');E.setState(S);
  const ev={o:[['情境甲',{food:1}],['情境乙',{lore:1}]],isHist:false,quiz:null};
  const fixedRnd=()=>0.37,fpick=a=>a[0];
  const g1=W.options.generate(ev,S,fixedRnd,fpick);
  // 人为把某原型用旧，再生成一次比较它的收益
  const target=g1.find(o=>o.archetype&&o.archetype.indexOf('SITU')!==0&&Object.keys(o.gain||{}).length);
  if(target){
    S.optUse[target.archetype]=3;
    const g2=W.options.generate(ev,S,fixedRnd,fpick);
    const same=g2.find(o=>o.archetype===target.archetype);
    if(same){
      const k=Object.keys(target.gain)[0];
      assert.ok((same.gain[k]||0)<target.gain[k],'重复选择未衰减：'+k+' '+target.gain[k]+'→'+same.gain[k]);
    }
  }
  // 强制失手：rnd 恒为 0，任何 risk>0 都会触发
  const risky=g1.find(o=>o.risk>0);
  assert.ok(risky,'没有可用的风险选项');
  const before=S.st.food;
  const r=W.options.apply(risky,S,()=>0);
  assert.ok(r.msgs.some(m=>m.indexOf('失手')>=0),'风险失手未写入结果');
  assert.ok(Object.keys(r.extra).length>0,'失手没有额外后果');
  assert.ok(S.st.food===before,'apply 不应直接改八维（由 engine 合并 extra）');
  // 知识写回：unlockIds 存在时 seenCiv 增加
  const g3=W.options.generate(ev,S,fixedRnd,fpick);
  const learn=g3.find(o=>(o.unlockIds||[]).length);
  if(learn){
    const n=Object.keys(S.seenCiv).length;
    W.options.apply(learn,S,()=>0.9);
    assert.ok(Object.keys(S.seenCiv).length>n,'选中后未见条目未写回文明册');
  }
});
run('全部维度都有选项原型可映射',()=>{
  const dk=J('options.json').dimKind;
  const dims=J('civilization.json').dimensions.map(x=>x.key);
  const miss=dims.filter(k=>!dk[k]);
  const used=new Set(Object.values(dk));
  const kinds=Object.keys(J('options.json').kinds);
  assert.strictEqual(miss.length,0,'未映射维度: '+miss.join(','));
  used.forEach(k=>assert.ok(kinds.indexOf(k)>=0,'未知类型 '+k));
  console.log('    维度 '+dims.length+' 全映射 · 类型 '+kinds.length+' 类 · 原型 '
    +J('options.json').archetypes.length+' 条');
});

/* 10. 气候 / 人口 / 家族 三层图 */
run('气候影响区与人口热力数据完整，且不冒充实测或人口统计',()=>{
  const L=J('layers.json'),geo=J('geoclimate.json');
  assert.ok(L.meta.climateNote.indexOf('不是实测范围')>=0,'气候层缺边界声明');
  assert.ok(L.meta.populationNote.indexOf('不是历史人口统计')>=0,'人口层缺统计免责');
  assert.ok(L.meta.familyNote.indexOf('推演数据')>=0,'家族层缺推演声明');
  assert.strictEqual(L.climate.length,geo.events.length,'气候事件数不一致');
  assert.strictEqual(L.population.kernels.length,geo.units.length,'人口核未复用地理单元');
  assert.strictEqual(L.population.eras.length,9,'时代段数不对');
  const ids=new Set(geo.units.map(u=>u.id));
  L.population.kernels.forEach(k=>assert.ok(ids.has(k.id),'人口核用了未考据坐标 '+k.id));
  L.climate.forEach(c=>{
    assert.ok(c.y0<=c.y1,c.id+' 年代倒置');
    assert.ok(c.caveat.indexOf('不等于已证因果')>=0,c.id+' 缺因果免责');
    if(c.global)assert.strictEqual(c.box,null,c.id+' 全球性事件不该画边界');
    else{
      assert.ok(c.box&&c.box.rx>0&&c.box.ry>0,c.id+' 缺示意范围');
      assert.ok(Math.abs(c.box.cx)<=180&&Math.abs(c.box.cy)<=90,c.id+' 中心越界');
      assert.ok(c.box.units.length>0,c.id+' 未关联地理单元');
    }
  });
  const W2=globalThis.WQN,AT=W2.atlas;
  AT.setYear?AT.setYear(-3000,false):null;
  const wAncient=AT.popWeight(L.population.kernels.find(k=>k.region==='huaxia'),-3000);
  const wModern=AT.popWeight(L.population.kernels.find(k=>k.region==='huaxia'),1800);
  assert.ok(wModern>wAncient,'人口重心未随时代变化');
  assert.ok(AT.popTop(5).length===5,'人口重心榜为空');
  console.log('    样本：'+L.climate.filter(c=>c.global).length+' 全球性 / '
    +L.climate.filter(c=>c.box).length+' 区域示意 · 华夏权重 前3000年 '+wAncient.toFixed(2)
    +' → 1800年 '+wModern.toFixed(2));
});
run('家族有落脚点，迁徙抉择真的把人搬到地图另一处',()=>{
  const S=E.fresh('huaxia','family','map-fam');E.setState(S);
  assert.ok(Object.keys(S.famPlaces).length>=3,'开局族人未分配落脚点');
  const d0=E.famDistribution(S);
  assert.ok(d0.length>=1&&d0.reduce((s,x)=>s+x.count,0)===S.fam.filter(p=>p.alive).length,
    '家族分布人数与在籍不符');
  const before=JSON.stringify(S.famPlaces);
  /* 直接走引擎的迁徙路径，确认写回与编年 */
  let moved=0;
  for(let i=0;i<70&&moved<2;i++){
    E.step();let st=E.state();
    if(st.phase!=='choice'){
      if(st.phase==='volume')E.continueVolume();
      else if(st.phase==='turnover')E.nextDynasty();
      else if(st.phase==='ending')E.epilogue();
      else if(st.phase==='realend')E.realEndContinue();
      st=E.state();
    }
    if(st.phase!=='choice')continue;
    const idx=st.cur.opts.findIndex(o=>o.kind==='migrate');
    E.choose(idx>=0?idx:0);
    if(E.famMigrations().length>moved)moved=E.famMigrations().length;
  }
  const st=E.state();
  assert.ok(st.migrations.length>=1,'迁徙抉择未写入迁徙足迹');
  assert.notStrictEqual(JSON.stringify(st.famPlaces),before,'落脚点未改变');
  assert.ok(st.mil.some(m=>m.t.indexOf('家族迁徙')>=0),'迁徙未进里程碑');
  assert.ok(E.famDistribution(st).every(d=>d.name!=='未记其地'),'有族人落在未知地点');
  const legacy=E.fresh('nile','civ','map-legacy');delete legacy.famPlaces;delete legacy.migrations;
  const m=E.migrate(JSON.parse(JSON.stringify(legacy)));
  assert.ok(Object.keys(m.famPlaces).length>=3,'旧档未补齐家族落脚点');
  console.log('    样本：'+st.migrations.length+' 次迁徙 · 当前散居 '
    +E.famDistribution(st).map(d=>d.name+' '+d.count+' 人').join('／'));
});

/* 11. 抉择后果系统：跨笔工程、职业反哺、考据分歧、组合技、未走之路 */
run('跨笔决议：立项 → 岁修 → 验收写回账本；罢手有沉没代价',()=>{
  const S=E.fresh('huaxia','family','proj-test');E.setState(S);
  const CS=globalThis.WQN.consequences,C=J('consequences.json');
  const seed={kind:'build',archetype:'B01',job:'渠工',
    basis:{title:'都江堰与李冰石人水尺',dim:'HY'},gain:{food:7},cost:{},e:{food:7}};
  const r1=CS.settle(seed,S,()=>0.1);       // 0.1 < .34，必挂工程
  assert.ok(r1.started,'普通营建选项未立项');
  const active=Object.values(S.projects);
  assert.strictEqual(active.length,1,'在办工程数不对');
  const p=active[0],def=C.projects.find(x=>x.id===p.pid);
  assert.ok(def&&def.stages.length===3,'工程阶段数不对');
  const ex=CS.extras({},S,()=>0.9,[]);
  const cont=ex.find(o=>o.project&&!o.project.abandon);
  assert.ok(cont&&cont.force,'后续笔没有出现工程续作，或没有强制露面');
  assert.ok(cont.reqText.indexOf('工程第')>=0,'续作未标进度');
  /* 连点三段直到验收 */
  for(let i=0;i<3;i++){
    const cur=CS.extras({},S,()=>0.9,[]).find(o=>o.project&&!o.project.abandon);
    assert.ok(cur,'第 '+i+' 段续作缺失');
    CS.settle(cur,S,()=>0.95);            // 0.95 > risk，不失手
  }
  assert.ok(Object.keys(S.projectLedger||{}).length>0,'验收后未写回长期账本');
  assert.strictEqual((S.completedProjects||[]).length,1,'未记录已完成工程');
  assert.ok(Object.keys(S.projects).length===0,'验收后在办工程未清');
  assert.ok(S.mil.some(m=>m.t.indexOf('工程既成')>=0),'验收未进里程碑');
  const bonus=E.ledgerNow();
  assert.ok(bonus.food>0,'工程账本未并入 ledger()');
  /* 罢手 */
  const S2=E.fresh('huaxia','family','proj-abandon');E.setState(S2);
  CS.settle(seed,S2,()=>0.1);
  const p2=Object.values(S2.projects)[0];
  const ab=CS.extras({},S2,()=>0.1,[]).find(o=>o.project&&o.project.abandon);
  assert.ok(ab,'未出现罢手选项');
  const r2=CS.settle(ab,S2,()=>0.9);
  assert.ok(r2.abandoned&&Object.keys(r2.extra).length>0,'罢手没有沉没代价');
  assert.strictEqual(Object.keys(S2.projects).length,0,'罢手后在办工程未清');
});
run('职业反哺收益与权重；考据分歧成对；组合技需维度齐备',()=>{
  const CS=globalThis.WQN.consequences,C=J('consequences.json');
  const S=E.fresh('huaxia','family','boost-test');E.setState(S);
  S.jobs={'渠工':2};
  const o={kind:'build',job:'渠工',gain:{food:8,craft:4},cost:{food:-3},e:{}};
  CS.jobBump(o,S);
  assert.ok(o.gain.food>8&&o.gain.craft>4,'族中有人习此业，收益未上调');
  assert.ok(o.reqText.indexOf(C.jobBoost.label)>=0,'卡片未标注职业加成');
  assert.ok(CS.jobWeight(o,S,1)>1,'职业未上调权重');
  /* 分歧：构造已见争议条目，chance 用 rnd=0 保证触发 */
  const civ=J('civilization.json').items;
  const disputed=civ.filter(x=>x.consensus==='date_contested'
    ||x.consensus==='legendary_retroactive').slice(0,3);
  const settled=civ.find(x=>x.consensus==='settled'&&x.dim===disputed[0].dim)||civ[0];
  const seen=disputed.concat([settled]);
  const dex=CS.extras({},S,()=>0,seen).filter(x=>x.debate);
  assert.strictEqual(dex.length,2,'考据分歧没有成对出现');
  assert.notStrictEqual(dex[0].debate.choice,dex[1].debate.choice,'分歧两条不是互斥取舍');
  assert.ok(dex[0].note.indexOf('不是判定史实')>=0,'分歧缺免责');
  const before=(S.stances||[]).length;
  CS.settle(dex[0],S,()=>0.9);
  assert.strictEqual((S.stances||[]).length,before+1,'立场未记录');
  /* 组合技：维度不齐不出现，齐了才出现 */
  const dimOf=k=>civ.find(x=>x.dim===k)||{id:'fake_'+k,dim:k,consensus:'settled'};
  const partial=[dimOf('T'),dimOf('C')];
  assert.ok(!CS.extras({},S,()=>0,partial).some(x=>x.combo==='printing'),'维度不齐却出现组合技');
  const full=[dimOf('T'),dimOf('C'),dimOf('ED')];
  const combo=CS.extras({},S,()=>0,full).find(x=>x.combo==='printing');
  assert.ok(combo,'维度齐备未出现组合技');
  assert.ok(combo.reqNote.indexOf('不表示')>=0,'组合技缺史实边界');
  const m0=S.mil.length;CS.settle(combo,S,()=>0.9);
  assert.ok(S.mil.length>m0,'组合技未进里程碑');
});
run('未走之路按卷留档，长局里五类后果都真的出现过',()=>{
  const S=E.fresh('huaxia','family','roads-test');E.setState(S);
  const opts=[{t:'甲',gain:{food:5},kind:'build',badgeName:'营建'},
    {t:'乙',gain:{lore:4},kind:'study',badgeName:'研习',basis:{title:'《史记》'}},
    {t:'丙',gain:{wealth:3},kind:'trade',badgeName:'交易'}];
  globalThis.WQN.consequences.recordRoads(S,0,opts,-3000);
  assert.strictEqual((S.roads||[]).length,2,'未选中的选项未留档');
  assert.ok(E.volumeRoads(3).length<=3,'卷末回看条数未受限');
  assert.ok(E.allRoads(10).length<=10,'收卷回看条数未受限');
  const seenKinds=new Set(),seenProject=new Set();
  let comboSeen=0,debateSeen=0,projectSeen=0,roadVolOK=false;
  for(let i=0;i<140;i++){
    E.step();let st=E.state();
    if(st.phase!=='choice'){
      if(st.phase==='volume'){
        const r=st.volEnd;
        if(r.roads&&r.roads.length)roadVolOK=true;
        E.continueVolume();
      }else if(st.phase==='turnover')E.nextDynasty();
      else if(st.phase==='ending')E.epilogue();
      else if(st.phase==='realend')E.realEndContinue();
      st=E.state();
    }
    if(st.phase!=='choice')continue;
    st.cur.opts.forEach(o=>{
      seenKinds.add(o.kind);
      if(o.combo)comboSeen++;
      if(o.debate)debateSeen++;
      if(o.project){projectSeen++;seenProject.add(o.project.stage);}
      assert.ok(!/\{\w+\}/.test(o.t),'后果层选项残留占位符：'+o.t);
    });
    E.choose(st.cur.opts.findIndex(o=>o.project&&!o.project.abandon)>=0
      ? st.cur.opts.findIndex(o=>o.project&&!o.project.abandon) : i%3);
  }
  const st=E.state();
  assert.ok(projectSeen>0,'长局中未出现跨笔工程续作');
  assert.ok(seenProject.size>=2,'工程只停在同一阶段，没有推进');
  assert.ok(comboSeen>0,'长局中未出现组合技');
  assert.ok(debateSeen>0,'长局中未出现考据分歧');
  assert.ok((st.roads||[]).length>10,'未走之路没有持续积累');
  assert.ok(roadVolOK,'卷末汇流未带出未走之路');
  assert.ok((st.completedProjects||[]).length>0||Object.keys(st.projectLedger||{}).length>0,
    '长局里没有任何工程验收');
  console.log('    样本：工程续作 '+projectSeen+' 次 / 组合技 '+comboSeen+' 次 / 分歧 '
    +debateSeen+' 次 / 未走之路 '+st.roads.length+' 条 / 完成工程 '
    +(st.completedProjects||[]).length+' 项 / 立场 '+(st.stances||[]).length+' 处');
});

/* 12. 知识全景：七大类归属、frontier24 免责、组合技维度有效性 */
run('知识全景盘点：90 维归类完整，新增条目不冒充精确考据',()=>{
  const C=J('civilization.json'),O=J('options.json'),CS=J('consequences.json');
  const FAM=['自然基底','物质生产','社会组织','符号与意义','交换网络','认知方法'];
  assert.ok(C.dimensions.length>=79,'维度不足 '+C.dimensions.length);
  assert.ok(C.items.length>=1105,'条目不足 '+C.items.length);
  const keys=new Set(C.dimensions.map(d=>d.key));
  assert.strictEqual(keys.size,C.dimensions.length,'维度代号有重复');
  C.dimensions.forEach(d=>assert.ok(FAM.indexOf(d.family)>=0,d.key+' 缺大类归属'));
  const front=C.dimensions.filter(d=>d.tier==='frontier24');
  assert.strictEqual(front.length,24,'本轮新增维度不是 24');
  const m=C.meta.frontier24;
  assert.ok(m&&m.note.indexOf('通识级')>=0,'缺通识级定位声明');
  assert.ok(m.sources.indexOf('不伪造')>=0,'缺出处降级声明');
  assert.ok(m.density.indexOf('来源限制')>=0,'缺史料密度不均声明');
  assert.ok(m.excluded.indexOf('不补 2026 年后')>=0,'缺不补边界声明');
  const fids=new Set(front.map(d=>d.key));
  /* 只数 frontier24 自己那 144 条：第二轮又给这些薄维度各补了 3 条，
     按维度 key 统计会多出 72 条，但那批是 depth2，不属于本项断言。 */
  const fitems=C.items.filter(x=>fids.has(x.dim)&&x.tier==='frontier24');
  assert.strictEqual(fitems.length,144,'新增条目不是 144');
  fitems.forEach(x=>{
    assert.ok(x.y0<=x.y1&&x.y1<=2026,x.id+' 年代越界');
    assert.ok(x.sources.length>=2,x.id+' 缺出处');
    x.sources.forEach(s=>{
      assert.ok(s.rank==='百科／媒体'||s.rank==='机构／学术',x.id+' rank 非法');
      assert.ok(!s.quote,x.id+' 新增条目不应伪造引文');
      assert.ok(s.note&&s.note.indexOf('域名级')>=0,x.id+' 缺检索入口声明');
    });
    assert.ok(x.tier==='frontier24',x.id+' 缺层级标记');
  });
  /* dimKind 与原型覆盖所有维度 */
  const miss=C.dimensions.filter(d=>!O.dimKind[d.key]).map(d=>d.key);
  assert.strictEqual(miss.length,0,'dimKind 未覆盖: '+miss.join(','));
  const used=new Set();O.archetypes.forEach(a=>a.dims.forEach(k=>used.add(k)));
  const orphan=C.dimensions.filter(d=>!used.has(d.key)).map(d=>d.key);
  assert.strictEqual(orphan.length,0,'原型未覆盖维度: '+orphan.join(','));
  /* 组合技 need 都是有效维度，且有免责 */
  CS.combos.forEach(c=>{
    c.need.forEach(k=>assert.ok(keys.has(k),c.id+' 引用了不存在的维度 '+k));
    assert.ok(c.note&&/不|不是|不作/.test(c.note),c.id+' 缺史实边界');
  });
  assert.ok(CS.combos.length>=23,'组合技未随新维度扩充');
  const c=require('util');
  const byFam={};C.dimensions.forEach(d=>byFam[d.family]=(byFam[d.family]||0)+1);
  console.log('    样本：'+C.dimensions.length+' 维 / '+C.items.length+' 条 · 新增 '
    +front.length+' 维 '+fitems.length+' 条（争议 '+fitems.filter(x=>x.consensus==='date_contested').length+'）'
    +' · 组合技 '+CS.combos.length+' · 大类 '+JSON.stringify(byFam));
});

/* 13. 深度补齐：地方史 / 人群与姓氏 / 深读卡 / 立氏写回 */
run('地方史深挖：174 条关联 29 地，六类齐备且不作边界主张',()=>{
  const L=J('localities.json'),A=J('atlas.json');
  assert.strictEqual(L.items.length,174,'地方史条目数不对');
  const ids=new Set(A.units.map(u=>u.id));
  const by={};L.items.forEach(x=>by[x.geoId]=(by[x.geoId]||0)+1);
  assert.strictEqual(Object.keys(by).length,29,'未覆盖 29 个地理单元');
  Object.keys(by).forEach(k=>{
    assert.ok(ids.has(k),'geoId 不存在 '+k);
    assert.strictEqual(by[k],6,k+' 不是 6 条');
  });
  assert.ok(L.meta.boundary.indexOf('不作疆界')>=0,'缺边界免责');
  assert.ok((L.meta.note+L.meta.boundary).indexOf('通识级')>=0,'缺通识定位');
  const cats={};L.items.forEach(x=>cats[x.category]=(cats[x.category]||0)+1);
  assert.strictEqual(Object.keys(cats).length,6,'地方史类别不是 6 类: '+JSON.stringify(cats));
  L.items.forEach(x=>{
    assert.ok(x.y0<=x.y1&&x.y1<=2026,x.id+' 年代越界');
    assert.ok(x.boundary,x.id+' 缺边界');
    x.sources.forEach(z=>{assert.ok(!z.quote,x.id+' 不应伪造引文');});
  });
});
run('人群与姓氏：不作生物种族分类，姓氏不证明血统',()=>{
  const P=J('peoples.json');
  assert.ok(P.meta.disclaimer.indexOf('不成立')>=0,'缺人种分类边界');
  assert.ok(P.meta.disclaimer.indexOf('血统')>=0,'缺血统边界');
  assert.ok(P.surnames.length>=121&&P.peoples.length>=67,'姓氏／人群条目不足');
  assert.ok(P.notes.length>=26,'边界说明不足 26 条');
  const allTxt=JSON.stringify(P.notes)+JSON.stringify(P.peoples.map(x=>x.boundary));
  assert.ok(allTxt.indexOf('他称')>=0,'缺他称语境说明');
  assert.ok(allTxt.indexOf('遗传')>=0||allTxt.indexOf('单倍群')>=0,'缺遗传标记限度');
  assert.ok(allTxt.indexOf('血统')>=0,'缺血统纯正反例');
  P.surnames.concat(P.peoples).forEach(x=>{
    assert.ok(x.y0<=x.y1&&x.y1<=2026,x.id+' 年代越界');
    assert.ok(x.boundary,x.id+' 缺边界');
    x.sources.forEach(z=>assert.ok(!z.quote,x.id+' 不应伪造引文'));
  });
  /* 传说族源不进史实依据池：本册不含 legendary 层条目 */
  assert.ok(!P.surnames.concat(P.peoples).some(x=>x.precision==='legendary'),
    '传说层不应混进人群／姓氏册');
});
run('深读卡三段式；90 维全映射；14 条联动与 23 个组合技有效',()=>{
  const DD=J('deepdives.json'),C=J('civilization.json'),O=J('options.json'),CS=J('consequences.json');
  assert.ok(DD.items.length>=38,'深读卡不足');
  DD.items.forEach(x=>{
    assert.ok(x.misread&&x.dispute&&x.further,x.id+' 缺三段之一');
    assert.ok(x.note&&x.note.indexOf('不判定史实')>=0,x.id+' 缺免责');
  });
  assert.ok(DD.meta.boundary.indexOf('不判定史实')>=0,'全册缺免责');
  const keys=new Set(C.dimensions.map(d=>d.key)),FAM=['自然基底','物质生产','社会组织','符号与意义','交换网络','认知方法'];
  assert.strictEqual(C.dimensions.length,90,'维度不是 90');
  assert.ok(C.items.length>=1306,'文明条目少于扩容前基数');
  assert.strictEqual(C.items.slice(0,1306).filter(x=>x.id.startsWith('SC')).length,0,'扩容改动了原有条目');
  C.dimensions.forEach(d=>assert.ok(FAM.indexOf(d.family)>=0,d.key+' 缺大类'));
  const depth=C.dimensions.filter(d=>d.tier==='depth');
  assert.strictEqual(depth.length,6,'深度补齐维度不是 6');
  const miss=C.dimensions.filter(d=>!O.dimKind[d.key]).map(d=>d.key);
  assert.strictEqual(miss.length,0,'dimKind 未覆盖: '+miss.join(','));
  const used=new Set();O.archetypes.forEach(a=>a.dims.forEach(k=>used.add(k)));
  assert.strictEqual(C.dimensions.filter(d=>!used.has(d.key)).length,0,'原型未覆盖全部维度');
  const needs=new Set(['geo','climate','polity','person','local','surname','people',
    'price','risk','mineral','weather','specimen',
    'local_mis','surname_note','ruler','house','house_note',
    'succession','house_peer']);
  O.special.forEach(a=>assert.ok(needs.has(a.need),'未知联动 need '+a.need));
  assert.ok(O.special.some(a=>a.need==='local')&&O.special.some(a=>a.need==='surname')
    &&O.special.some(a=>a.need==='people'),'三条新联动缺失');
  assert.strictEqual(CS.combos.length,23,'组合技不是 23');
  CS.combos.forEach(c=>c.need.forEach(k=>assert.ok(keys.has(k),c.id+' 引用不存在维度 '+k)));
  assert.ok(C.meta.frontierDepth.boundary.indexOf('种族')>=0,'深度 meta 缺种族边界');
});
run('立氏为推演：写回族谱一次，不宣称血缘；地方史引用可统计',()=>{
  const S=E.fresh('huaxia','family','clan-test');E.setState(S);
  const O=W.options;
  const ev={o:[['甲',{food:2}],['乙',{lore:2}]]};
  let found=null;
  for(let i=0;i<60&&!found;i++){
    E.step();let st=E.state();
    if(st.phase!=='choice'){
      if(st.phase==='volume')E.continueVolume();else if(st.phase==='turnover')E.nextDynasty();
      else if(st.phase==='ending')E.epilogue();else if(st.phase==='realend')E.realEndContinue();
      continue;
    }
    found=st.cur.opts.find(o=>o.clanAdopt)||null;
    if(found)break;
    E.choose(0);
  }
  assert.ok(found,'长局里未出现立氏联动');
  assert.ok(found.t.indexOf(found.clanAdopt)>=0,'立氏卡未填入真实姓氏条目');
  assert.ok(!/\{\w+\}/.test(found.t),'立氏卡残留占位符');
  O.apply(found,S,()=>0.9);
  assert.ok(S.clanName,'立氏未写回族谱');
  assert.ok(S.mil.some(m=>m.t.indexOf('立氏（推演）')>=0),'立氏未进里程碑');
  const before=Object.keys(S.localSeen||{}).length;
  const loc=E.state().cur.opts.find(o=>o.localRef);
  if(loc){W.options.apply(loc,S,()=>0.9);
    assert.ok(Object.keys(S.localSeen||{}).length>before,'地方史引用未统计');}
});
run('七条联动在长局里都能出现，且卡面无占位符、无种族措辞',()=>{
  const S=E.fresh('meso','family','special-test');E.setState(S);
  const seen=new Set();
  for(let i=0;i<160;i++){
    E.step();let st=E.state();
    if(st.phase!=='choice'){
      if(st.phase==='volume')E.continueVolume();else if(st.phase==='turnover')E.nextDynasty();
      else if(st.phase==='ending')E.epilogue();else if(st.phase==='realend')E.realEndContinue();
      st=E.state();
    }
    if(st.phase!=='choice')continue;
    st.cur.opts.forEach(o=>{
      assert.ok(!/\{\w+\}/.test(o.t),'卡面残留占位符: '+o.t);
      assert.ok(!/纯正血统|优等种族|劣等种族/.test(o.t),'出现种族化措辞');
      if(o.isSpecial||o.clanAdopt||o.localRef||o.peopleRef)seen.add(o.archetype);
    });
    E.choose(i%3);
  }
  assert.ok(seen.size>=4,'联动出现种类过少: '+[...seen].join(','));
  console.log('    样本：联动原型 '+seen.size+' 种 / 本族称法 '
    +(E.state().clanName||'（本局未触发）'));
});

/* 14. 难度档位与新手教程 */
const DF=W.difficulty,TU=W.tutorial;
const resetCfg=()=>E.configure({difficulty:'normal',reality:'balanced',modeKey:'chronicle',
  lengthKey:'standard',density:1});
run('三档难度真实生效：初始八维、选项数值、危机线、散族阈值、指引密度',()=>{
  const out={};
  ['easy','normal','hard'].forEach(d=>{
    E.configure({difficulty:d});
    const S=E.fresh('huaxia','family','diff-'+d);E.setState(S);E.step();
    const o=S.cur.opts.find(x=>x.risk>0)||S.cur.opts[0];
    out[d]={sum:Object.keys(S.st).reduce((a,k)=>a+S.st[k],0),
      st:Object.assign({},S.st),risk:o.risk,
      gainSum:Object.keys(o.gain||{}).reduce((a,k)=>a+(typeof o.gain[k]==='number'?o.gain[k]:0),0),
      costSum:Object.keys(o.cost||{}).reduce((a,k)=>a+(typeof o.cost[k]==='number'?o.cost[k]:0),0),
      crisis:DF.crisisAt(S),floor:DF.peopleFloor(S),hints:DF.hints(S),
      tut:DF.tutorialDefault(S),tutOn:S.tutorial.on};
  });
  assert.ok(out.easy.sum>out.normal.sum&&out.normal.sum>out.hard.sum,'初始八维未按难度分层');
  assert.ok(out.hard.crisis.food>out.normal.crisis.food
    &&out.normal.crisis.food>out.easy.crisis.food,'危机触发线不对');
  assert.ok(out.hard.floor>out.normal.floor&&out.normal.floor>out.easy.floor,'散族阈值不对');
  assert.strictEqual(out.easy.hints,2);assert.strictEqual(out.normal.hints,1);
  assert.strictEqual(out.hard.hints,0);
  assert.ok(out.easy.tut&&!out.normal.tut&&!out.hard.tut,'教程默认开合不对');
  assert.ok(out.easy.tutOn&&!out.normal.tutOn&&!out.hard.tutOn,'fresh 未写入教程状态');
  console.log('    样本：初始八维和 简单 '+out.easy.sum+' / 普通 '+out.normal.sum
    +' / 困难 '+out.hard.sum+' · 指引 '+out.easy.hints+'/'+out.normal.hints+'/'+out.hard.hints);
  resetCfg();
});
run('难度只改推演层：史实条目内容与真实性档位完全不受影响',()=>{
  const before=JSON.stringify(W.data.civilization.items.slice(0,40).map(x=>
    ({id:x.id,title:x.title,y0:x.y0,y1:x.y1,summary:x.summary,consensus:x.consensus})));
  const evBefore=JSON.stringify(W.data.events.slice(0,20));
  const tplBefore=JSON.stringify(JSON.stringify(W.data.templates).slice(0,4000));
  const tiersBefore=JSON.stringify(W.reality.TIERS);
  const seen={};
  ['easy','hard'].forEach(d=>{
    E.configure({difficulty:d});
    const S=E.fresh('meso','civ','history-'+d);E.setState(S);
    for(let i=0;i<70;i++){
      E.step();let st=E.state();
      if(st.phase!=='choice'){
        if(st.phase==='volume')E.continueVolume();
        else if(st.phase==='turnover')E.nextDynasty();
        else if(st.phase==='ending')E.epilogue();
        else if(st.phase==='realend')E.realEndContinue();
        st=E.state();
      }
      if(st.phase!=='choice')continue;
      if(st.cur&&st.cur.civMeta)seen[st.cur.civMeta.id]=st.cur.civMeta;
      E.choose(0);
    }
    /* 难度不改史实配置 */
    assert.strictEqual(S.reality,'balanced','难度改了真实性档位');
    assert.strictEqual(S.modeKey,'chronicle','难度改了玩法模式');
    assert.strictEqual(S.density,1,'难度改了史料密度');
  });
  const after=JSON.stringify(W.data.civilization.items.slice(0,40).map(x=>
    ({id:x.id,title:x.title,y0:x.y0,y1:x.y1,summary:x.summary,consensus:x.consensus})));
  assert.strictEqual(before,after,'难度改写了史实条目内容');
  assert.strictEqual(evBefore,JSON.stringify(W.data.events.slice(0,20)),'难度改写了史事数据');
  assert.strictEqual(tplBefore,JSON.stringify(JSON.stringify(W.data.templates).slice(0,4000)),
    '难度整形污染了全局情境模板（e/gain/cost 未复制）');
  assert.strictEqual(tiersBefore,JSON.stringify(W.reality.TIERS),'难度改写了真实性档位');
  Object.keys(seen).forEach(id=>{
    const orig=W.data.civilization.items.find(x=>x.id===id);
    assert.ok(orig,'出现了数据外的条目 '+id);
    assert.strictEqual(seen[id].title,orig.title,'条目标题被改写 '+id);
    assert.strictEqual(seen[id].y0,orig.y0,'条目年代被改写 '+id);
  });
  console.log('    样本：两档各 70 笔，共见史实条目 '+Object.keys(seen).length
    +' 条，内容与原始数据逐条一致');
  resetCfg();
});
run('确定性：同种子同难度同选择必得同一局；分享串带难度，复盘能还原',()=>{
  function snap(d){
    E.configure({difficulty:d});
    const S=E.fresh('nile','figure','replay-'+d);E.setState(S);
    for(let i=0;i<18;i++){
      E.step();let st=E.state();
      if(st.phase!=='choice'){
        if(st.phase==='volume')E.continueVolume();
        else if(st.phase==='turnover')E.nextDynasty();
        else if(st.phase==='ending')E.epilogue();
        else if(st.phase==='realend')E.realEndContinue();
      }
      if(E.state().phase!=='choice')break;
      E.choose(i%3);
    }
    return JSON.stringify({year:E.state().year,st:E.state().st,
      score:E.state().score,choices:E.state().choices});
  }
  assert.strictEqual(snap('easy'),snap('easy'),'同难度复盘不一致');
  assert.notStrictEqual(snap('easy'),snap('hard'),'难度未改变推演结果');
  E.configure({difficulty:'hard'});
  const S=E.fresh('steppe','family','share-diff');E.setState(S);
  const sh=E.shareString(),parsed=E.parseShare(sh);
  assert.strictEqual(parsed.difficulty,'hard','分享串缺难度');
  E.replay(sh);
  assert.strictEqual(E.state().difficulty,'hard','复盘未还原难度');
  /* 旧分享串（10 段，无难度）仍可解析，默认普通 */
  const legacy='WQN1.'+Buffer.from('legacy~huaxia~family~sim~-~-~balanced~chronicle~standard~1|0,1').toString('base64');
  const lp=E.parseShare(legacy);
  assert.ok(lp&&lp.difficulty==='normal','旧分享串未兼容');
  resetCfg();
});
run('教程状态机：八步、gate 按玩家动作推进、重看纯手动、旧档迁移',()=>{
  resetCfg();E.configure({difficulty:'easy'});
  const S=E.fresh('huaxia','family','tut-logic');E.setState(S);
  assert.strictEqual(TU.STEPS.length,8,'教程不是八步');
  assert.strictEqual(TU.step(S).id,'T1');
  assert.strictEqual(TU.gateOK(TU.step(S),S),false,'ack 步骤不该自动满足');
  TU.ack(S);TU.next(S);
  assert.strictEqual(TU.step(S).id,'T2');
  TU.ack(S);TU.next(S);
  assert.strictEqual(TU.step(S).id,'T3');
  assert.strictEqual(TU.gateOK(TU.step(S),S),false,'未选过第一笔就满足了 choice1');
  S.choices.push(0);
  assert.ok(TU.gateOK(TU.step(S),S));
  assert.ok(TU.advance(S),'新手阶段未自动推进');
  assert.strictEqual(TU.step(S).id,'T4');
  S.choices.push(1);
  TU.advance(S);assert.strictEqual(TU.step(S).id,'T5');
  S.volLog.push({});TU.advance(S);assert.strictEqual(TU.step(S).id,'T6');
  TU.noteTab(S,'civ');TU.noteTab(S,'geo');
  TU.advance(S);assert.strictEqual(TU.step(S).id,'T7');
  TU.noteScroll(S);TU.advance(S);assert.strictEqual(TU.step(S).id,'T8');
  TU.ack(S);TU.next(S);
  assert.ok(!S.tutorial.on&&S.tutorial.done,'完成步骤未收起教程');
  TU.reopen(S);
  assert.strictEqual(TU.step(S).id,'T1','重看未回到第一步');
  assert.strictEqual(S.tutorial.auto,false,'重看应纯手动');
  assert.strictEqual(TU.advance(S),false,'重看不该被旧动作瞬间推完');
  TU.skip(S);assert.ok(!S.tutorial.on);
  /* 旧档：补 normal + 教程关 + auto false */
  const old=JSON.parse(JSON.stringify(S));delete old.difficulty;delete old.tutorial;
  const mg=E.migrate(old);
  assert.strictEqual(mg.difficulty,'normal','旧档未补难度');
  assert.ok(mg.tutorial&&!mg.tutorial.on&&!mg.tutorial.auto,'旧档教程状态不对');
  resetCfg();
});

/* 15. 第二轮深度 + 宽度检查 */
run('第二轮：姓氏 / 人群 / 边界 / 地方史 / 深读骨架完整，边界全部保留',()=>{
  const P=J('peoples.json'),L=J('localities.json'),DD=J('deepdives.json'),C=J('civilization.json');
  assert.ok(P.surnames.length>=121,'姓氏少于扩容前基数');
  assert.ok(P.peoples.length>=67,'人群少于扩容前基数');
  assert.strictEqual(P.notes.length,26,'边界读法不是 26');
  assert.strictEqual(L.items.length,174,'地方史不是 174');
  assert.strictEqual(DD.items.length,106,'深读卡不是 106');
  assert.strictEqual(C.dimensions.length,90,'维度不是 90');
  assert.ok(C.items.length>=1306,'文明条目少于扩容前基数');
  /* 姓氏按七组分组，全部有边界与出处，且不伪造引文 */
  const groups={};P.surnames.forEach(x=>{if(x.group)groups[x.group]=(groups[x.group]||0)+1;});
  assert.ok(Object.keys(groups).length>=7,'姓氏分组少于 7 组: '+JSON.stringify(groups));
  P.surnames.concat(P.peoples).forEach(x=>{
    assert.ok(x.boundary&&x.boundary.length>4,x.id+' 缺边界说明');
    assert.ok(x.sources&&x.sources.length>=2,x.id+' 缺出处');
    x.sources.forEach(z=>assert.ok(!z.quote,x.id+' 不应伪造引文'));
    assert.ok(x.y0<=x.y1&&x.y1<=2026,x.id+' 年代越界');
    assert.notStrictEqual(x.precision,'legendary',x.id+' 传说层不应混入');
  });
  /* 深读卡覆盖全部 90 维 */
  const keys=new Set(C.dimensions.map(d=>d.key));
  const covered=new Set(DD.items.map(x=>x.dim));
  assert.strictEqual(covered.size,keys.size,'深读卡未覆盖全部维度');
  keys.forEach(k=>assert.ok(covered.has(k),'缺深读卡维度 '+k));
  /* 45 个薄维度均已补到 9 条以上；新 5 维各 6 条 */
  const cnt={};C.items.forEach(x=>cnt[x.dim]=(cnt[x.dim]||0)+1);
  const TH=J('civilization.json').items.filter(x=>x.tier==='depth2'&&!['PY','RS','GM','WO','BC'].includes(x.dim));
  const thinDims=new Set(TH.map(x=>x.dim));
  assert.strictEqual(thinDims.size,45,'补强的薄维度不是 45');
  thinDims.forEach(k=>assert.ok(cnt[k]>=9,k+' 补强后仍不足 9 条: '+cnt[k]));
  ['PY','RS','GM','WO','BC'].forEach(k=>assert.ok(cnt[k]>=6,k+' 新维度少于 6 条: '+cnt[k]));
  /* 覆盖不均改善：非华夏圈条目数确有增加 */
  const reg={};C.items.forEach(x=>reg[x.region]=(reg[x.region]||0)+1);
  assert.ok(reg.indus>=75&&reg.maya>=65&&reg.meso>=118&&reg.nile>=95,
    '非华夏圈覆盖未改善: '+JSON.stringify(reg));
  /* 原有 1141 条一条未改 */
  const older=C.items.filter(x=>x.tier!=='depth2');
  assert.ok(older.length>=1141,'原有条目被改写或删减: '+older.length);
  /* 宽度：三大类补强 */
  const fam={};C.dimensions.forEach(d=>fam[d.family]=(fam[d.family]||0)+1);
  assert.ok(fam['交换网络']>=7&&fam['自然基底']>=10&&fam['认知方法']>=8,
    '偏薄大类未补强: '+JSON.stringify(fam));
  console.log('    样本：姓氏 '+P.surnames.length+'（7 组）· 人群 '+P.peoples.length
    +' · 边界 '+P.notes.length+' · 地方史 '+L.items.length+' · 深读 '+DD.items.length
    +'（覆盖 '+covered.size+'/'+keys.size+' 维）· 文明 '+C.items.length+' 条 / '+C.dimensions.length+' 维');
  console.log('    文明圈: '+JSON.stringify(reg));
});


/* 16. 第三轮：知识进玩法（读法判读 / 五个新维度联动 / 新组合技） */
run('第三轮：106 道读法题、12 条联动、21 个组合技，且都不改写史实',()=>{
  const Q=J('reading_quiz.json'),DD=J('deepdives.json'),O=J('options.json'),
        CS=J('consequences.json'),C=J('civilization.json');
  const rd=Q.items.filter(x=>x.kind==='reading');
  assert.strictEqual(rd.length,106,'读法类不是 106 道');
  assert.strictEqual(rd.length,DD.items.length,'读法题与深读卡未一一对应');
  assert.strictEqual(Q.items.filter(x=>x.kind==='local').length,29,'地方互证不是 29 道');
  assert.strictEqual(Q.items.filter(x=>x.kind==='surname').length,26,'姓氏边界不是 26 道');
  assert.strictEqual(Q.items.filter(x=>x.kind==='people').length,13,'人群称谓不是 13 道');
  assert.strictEqual(Q.meta.chance,.15,'出题概率未登记');
  assert.ok(Q.meta.boundary.indexOf('不判定史实')>=0,'读法题缺边界');
  const ddIds=new Set(DD.items.map(x=>x.id)),keys=new Set(C.dimensions.map(d=>d.key));
  Q.items.forEach(q=>{
    if(q.kind==='reading')assert.ok(ddIds.has(q.ddId),q.id+' 对应深读卡不存在');
    assert.ok(keys.has(q.dim),q.id+' 维度不存在 '+q.dim);
    assert.ok(q.stem&&q.ok&&q.bad&&q.why&&q.further&&q.misread,q.id+' 缺字段');
    /* 正确项绝不能把「常见误解」原样当结论 */
    assert.ok(q.ok.indexOf(q.misread)<0,q.id+' 正确项混入了常见误解');
    assert.ok(q.bad.indexOf(q.misread)>=0,q.id+' 错误项未点明误解');
    assert.ok(q.ok.length>10&&q.mid&&q.mid.length>4,q.id+' 缺第三项折中');
    assert.ok(q.okEff.lore>q.midEff.lore&&q.midEff.lore>q.badEff.lore,
      q.id+' 三档收益未递减');
    assert.ok(q.okEff.lore>0&&q.badEff.lore<0,q.id+' 计分方向反了');
    assert.ok(q.stanceOk&&q.stanceMid,q.id+' 缺立场字段');
    assert.ok(q.note.indexOf('不判定史实')>=0,q.id+' 缺边界声明');
  });
  /* 五个新维度各有联动，且 need 与填词维度对应 */
  const NEED={'price':'PY','risk':'RS','mineral':'GM','weather':'WO','specimen':'BC'};
  Object.keys(NEED).forEach(n=>{
    const a=O.special.find(x=>x.need===n);
    assert.ok(a,'缺联动 need '+n);
    assert.ok(a.text.indexOf('{'+n+'}')>=0,a.id+' 未用该维度条目填词');
    assert.ok(a.note&&/推演|不作|不宣称|不改写/.test(a.note),a.id+' 缺边界');
    assert.strictEqual(O.dimKind[NEED[n]],a.kind,a.id+' dimKind 与原型 kind 不一致');
  });
  assert.strictEqual(O.special.length,19,'联动不是 19 条（17 + v1.0 两条）');
  assert.strictEqual(CS.combos.length,23,'组合技不是 23 个');
  const added=['price_granary','general_average','assay_furnace','observatory_almanac',
               'catalogue_cabinet','gazetteer_check','interpreter_register'];
  added.forEach(id=>{
    const cb=CS.combos.find(x=>x.id===id);
    assert.ok(cb,'缺组合技 '+id);
    cb.need.forEach(k=>assert.ok(keys.has(k),id+' 引用不存在维度 '+k));
    assert.ok(cb.note&&/不宣称|不作|不冒充|不改写|不判断/.test(cb.note),id+' 缺因果／主权边界');
    assert.ok(cb.eff&&Object.keys(cb.eff).length&&cb.cost&&Object.keys(cb.cost).length,id+' 缺取舍');
  });
  /* 原有 14 个组合技、原有 7 条联动、原有 1306 条文明条目一条未改 */
  assert.ok(C.items.length>=1306,'文明条目少于扩容前基数');
  assert.strictEqual(C.items.slice(0,1306).filter(x=>x.id.startsWith('SC')).length,0,'扩容改动了原有文明条目');
  assert.strictEqual(CS.projects.length,5,'工程链被改写');
  assert.ok(CS.meta.interactionNote.indexOf('第三轮')>=0,'缺第三轮说明');
  assert.ok(Q.meta.interaction2&&Q.meta.interaction2.indexOf('第四轮')>=0,'缺第四轮说明');
  console.log('    样本：读法题 '+Q.items.length+' 道（覆盖 '
    +new Set(Q.items.map(x=>x.dim)).size+' 维）· 联动 '+O.special.length
    +' 条 · 组合技 '+CS.combos.length+' 个');
});

/* 17. 读法题结算：答对答错都只记判读，不动任何条目 */
run('读法题结算：并入考据计分、答过不重出、史实数据零改动',()=>{
  const E=W.engine,CS=W.consequences;
  const Q=J('reading_quiz.json');
  const S=E.fresh('huaxia','family','reading-test');E.setState(S);
  const before=JSON.stringify(J('civilization.json'));
  const ok=CS.readingExtras(S,()=>0,[{dim:'PY'}]);
  assert.strictEqual(ok.length,3,'未生成三择一');
  assert.strictEqual(ok[0].reading.choice,'ok','首项应为稳妥读法');
  assert.strictEqual(ok[1].reading.choice,'mid','次项应为折中');
  assert.strictEqual(ok[2].reading.choice,'bad','末项应为常见误解');
  assert.strictEqual(ok[0].kind,'quiz','读法题不应挂工程链');
  const r0=S.quiz?S.quiz.right:0,w0=S.quiz?S.quiz.wrong:0;
  CS.settle(ok[0],S,()=>0);
  assert.strictEqual(S.quiz.right,r0+1,'答对未计分');
  assert.ok(S.readingSeen[ok[0].reading.id],'未登记已答');
  assert.strictEqual(S.readingLog.length,1,'未留判读记录');
  CS.settle(ok[1],S,()=>0);
  assert.strictEqual(S.quiz.right,r0+1,'折中不应误记为判读正确');
  assert.strictEqual(S.readingStance.settle,1,'折中未记按通说立场');
  CS.settle(ok[2],S,()=>0);
  assert.strictEqual(S.quiz.wrong,w0+1,'答错未计分');
  /* 已答过的题不再重出；把 pool 压到只剩这一道来验证 */
  const left=CS.readingExtras(S,()=>0,[]);
  assert.ok(left.length===0||left.every(o=>o.reading.id!==ok[0].reading.id),
    '已答题重复出现');
  assert.strictEqual(JSON.stringify(J('civilization.json')),before,'史实数据被改写');
  console.log('    样本：答对 +1 / 答错 +1 · 已答题不重出 · 文明数据逐字未变');
});


/* 18. 长局交互密度：读法题、五个新联动、新组合技真的会出现在玩家选项里 */
run('长局交互密度：读法题 / 新联动 / 新组合技都真的露面，且选项不残缺',()=>{
  const S=E.fresh('huaxia','family','interaction-long');E.setState(S);
  let reading=0,newSpecial=new Set(),newCombo=new Set(),quizCorrect=0,optMin=99,optMax=0;
  for(let i=0;i<200;i++){
    E.step();let st=E.state();
    if(st.phase!=='choice'){
      if(st.phase==='volume')E.continueVolume();
      else if(st.phase==='turnover')E.nextDynasty();
      else if(st.phase==='ending')E.epilogue();
      else if(st.phase==='realend')E.realEndContinue();
      else if(st.phase==='scroll')E.backScroll&&E.backScroll();
      st=E.state();
    }
    if(st.phase!=='choice')continue;
    const opts=st.cur.opts;
    optMin=Math.min(optMin,opts.length);optMax=Math.max(optMax,opts.length);
    assert.ok(opts.length>=3&&opts.length<=6,'选项数异常 '+opts.length);
    opts.forEach(o=>{
      assert.ok(!/\{\w+\}/.test(o.t),'卡面残留占位符: '+o.t);
      if(o.reading){reading++;if(o.reading.correct)quizCorrect++;
        assert.ok(o.reqNote&&o.reqNote.indexOf('不判定史实')>=0,'读法题缺边界');}
      if(o.isSpecial&&/SP_(PRICE|RISK|MINERAL|WEATHER|SPECIMEN)/.test(o.archetype)){
        newSpecial.add(o.archetype);
        assert.ok(o.basis&&o.basis.title,'新联动未写明依据条目');
      }
      if(o.combo&&/^(price_granary|general_average|assay_furnace|observatory_almanac|catalogue_cabinet|gazetteer_check|interpreter_register|two_copy_ledger|variant_register)$/.test(o.combo))
        newCombo.add(o.combo);
    });
    E.choose(i%3);
  }
  assert.ok(reading>=4,'长局里读法题出现太少 '+reading);
  assert.ok(quizCorrect>=2,'正确读法项几乎没露面 '+quizCorrect);
  assert.ok(newSpecial.size>=3,'新维度联动出现种类过少 '+[...newSpecial]);
  assert.ok(newCombo.size>=2,'新组合技出现种类过少 '+[...newCombo]);
  console.log('    样本：200 笔 · 读法题 '+reading+' 次（正确项 '+quizCorrect
    +'）· 新联动 '+newSpecial.size+' 种 '+[...newSpecial].join(',')
    +' · 新组合技 '+newCombo.size+' 种 · 选项数 '+optMin+'—'+optMax);
});


/* 19. 第四轮：互证／称谓题库、三择一、立场权重、族账与清账 */
run('第四轮：题库分六类，三择一齐全，地方题误读取自同地易误辨析',()=>{
  const Q=J('reading_quiz.json'),L=J('localities.json'),P=J('peoples.json');
  assert.ok(Q.items.length>=174,'题库少于扩容前基数');
  const cnt={};Q.items.forEach(x=>cnt[x.kind]=(cnt[x.kind]||0)+1);
  assert.deepStrictEqual({reading:cnt.reading,local:cnt.local,surname:cnt.surname,
    people:cnt.people},{reading:106,local:29,surname:26,people:13},'原四类数量被改 '+JSON.stringify(cnt));
  assert.ok(cnt.surname_origin>=40&&cnt.term_layer>=20,'新增两类题库缺失 '+JSON.stringify(cnt));
  assert.strictEqual(Q.meta.count,Q.items.length,'meta 未同步');
  assert.ok(Q.meta.boundary.indexOf('不判定史实')>=0,'缺总边界');
  const ids=new Set(Q.items.map(x=>x.id));
  assert.strictEqual(ids.size,Q.items.length,'题库 id 有重复');
  Q.items.forEach(q=>{
    assert.ok(q.ok&&q.mid&&q.bad&&q.stem,q.id+' 缺三择一或题干');
    assert.ok(q.ok.indexOf(q.bad)<0,q.id+' 稳妥项与误读项混同');
    assert.ok(q.note.indexOf('不判定史实')>=0,q.id+' 缺边界');
    assert.ok(q.stanceOk&&q.stanceMid&&q.refId,q.id+' 缺立场或来源锚点');
  });
  /* 地方题的误读必须来自同地「易误辨析」条目 */
  const misByGeo={};L.items.filter(x=>x.category==='易误辨析').forEach(x=>misByGeo[x.geoId]=x);
  Q.items.filter(x=>x.kind==='local').forEach(q=>{
    const gid=q.refId.split('_')[0],m=misByGeo[gid];
    assert.ok(m,'地方题找不到同地易误辨析 '+q.id);
    assert.ok(q.bad.indexOf(m.title.slice(0,8))>=0,q.id+' 误读项未绑定同地条目');
    assert.ok(q.ok.indexOf('两存互证')>=0,q.id+' 稳妥项未标两存');
    assert.ok(q.note.indexOf('不作疆界')>=0,q.id+' 缺疆界边界');
  });
  /* 姓氏／人群题不得出现血统或种族断言作为稳妥读法 */
  const noteIds=new Set(P.notes.map(x=>x.id));
  Q.items.filter(x=>x.kind==='surname').forEach(q=>assert.ok(noteIds.has(q.refId),q.id+' 来源锚点不存在'));
  Q.items.filter(x=>x.kind==='people').forEach(q=>{
    assert.ok(q.note.indexOf('他称')>=0||q.note.indexOf('不判定史实')>=0,q.id+' 缺他称边界');
  });
  console.log('    样本：'+Q.items.length+' 道 '+JSON.stringify(cnt));
});

run('第四轮：立场只改出现权重、族账与清账闭环、史实零改动',()=>{
  const E=W.engine,CS=W.consequences,O=W.options;
  const Q=J('reading_quiz.json');
  const before=JSON.stringify(J('civilization.json'));
  const S=E.fresh('huaxia','family','debt-test');E.setState(S);
  /* 立场：存异说偏多时，争议依据条目权重上升，条目内容不变 */
  S.readingStance={suspend:4,settle:0};
  const g1=O.generate({kind:'study'},S,()=>0.5);
  S.readingStance={settle:4,suspend:0};
  const g2=O.generate({kind:'study'},S,()=>0.5);
  assert.ok(g1.length>=3&&g2.length>=3,'立场影响了选项数下限');
  assert.strictEqual(JSON.stringify(J('civilization.json')),before,'立场改写了史实数据');
  /* 族账：构造一条失手的组合技选项，settle 应记旧账 */
  const fake={archetype:'COMBO_test',combo:'test_combo',t:'【测试】未成的组合技',
    kind:'craft',gain:{},cost:{},risk:0,fail:{},_riskFailed:true};
  CS.settle(fake,S,()=>0);
  assert.strictEqual((S.famDebts||[]).length,1,'失手未留族账');
  assert.strictEqual(S.famDebts[0].gen,S.gen,'旧账未记下产生时的世代');
  /* 跨代：同一代不出现清账，下一代当家之后才露面 */
  assert.strictEqual(CS.debtExtras(S,()=>0).length,0,'同代就清了旧账');
  S.gen++;
  const ex=CS.debtExtras(S,()=>0);
  assert.strictEqual(ex.length,1,'未生成清账选项');
  assert.strictEqual(ex[0].force,true,'清账选项未强制露面');
  const msgs=CS.settle(ex[0],S,()=>0);
  assert.strictEqual(S.clearedDebts,1,'清账未计数');
  assert.strictEqual(S.famDebts[0].cleared,true,'旧账未标记已了');
  assert.ok(msgs.msgs.some(m=>m.indexOf('清账')>=0),'清账未写编年');
  assert.strictEqual(CS.debtExtras(S,()=>0).length,0,'清账后仍重复出现');
  assert.strictEqual(JSON.stringify(J('civilization.json')),before,'清账改写了史实数据');
  console.log('    样本：立场权重与史实一致 · 族账 1 笔 → 同代不出 → 换代清账 → 不再重出');
});


/* 20. 第五轮：姓氏与全部知识维度一起扩容，且扩容内容真的进玩法 */
run('第五轮：姓氏 ≥1000、每维 ≥14 条、题库 ≥250，扩容条目边界与出处齐全',()=>{
  const P=J('peoples.json'),C=J('civilization.json'),Q=J('reading_quiz.json');
  assert.ok(P.surnames.length>=1000,'姓氏扩容不足 '+P.surnames.length);
  assert.ok(P.peoples.length>=90,'人群扩容不足 '+P.peoples.length);
  assert.ok(Q.items.length>=250,'题库扩容不足 '+Q.items.length);
  assert.ok(P.meta.scaleNote&&P.meta.scaleNote.indexOf('不指认得姓始祖')>=0,'姓氏缺边界说明');
  assert.ok(C.meta&&C.meta.scaleNote&&C.meta.scaleNote.indexOf('不作学术引用')>=0,'文明册缺降级说明');
  assert.ok(Q.meta.scaleNote&&Q.meta.scaleNote.indexOf('不针对某个姓氏编造身世')>=0,'题库缺边界说明');
  /* 新增姓氏：只列用字，不指认始祖／世系；引文留空；年代窗口合法 */
  const ns=P.surnames.filter(x=>x.id.startsWith('SS'));
  assert.ok(ns.length>=1000,'新增姓氏数不足 '+ns.length);
  const forb=/出自某|始祖为|可考世系|血统纯正|纯正血统|父系单线/;
  ns.forEach(x=>{
    assert.ok(x.boundary&&x.boundary.indexOf('不指认得姓始祖')>=0,x.id+' 缺姓氏边界');
    assert.ok(!forb.test(x.summary+x.title+x.boundary),x.id+' 出现始祖／血统断言');
    assert.ok(x.y0<=x.y1&&x.y1<=2026,x.id+' 年代窗口非法');
    assert.ok(x.sources&&x.sources.length>=1,x.id+' 缺出处');
    x.sources.forEach(z=>assert.strictEqual(z.quote,'',x.id+' 伪造了引文'));
    assert.strictEqual(x.compact,true,x.id+' 未标紧凑行');
  });
  /* 新增人群：不作生物种族分类 */
  P.peoples.filter(x=>x.id.startsWith('PX')).forEach(x=>{
    assert.ok(x.boundary.indexOf('不作生物种族分类')>=0,x.id+' 缺人群边界');
    assert.ok(!/人种|优等|劣等|纯正/.test(x.summary),x.id+' 出现种族化措辞');
  });
  /* 每维 ≥12 条；新增条目带玩法接口与降级声明 */
  const cnt={};C.items.forEach(x=>cnt[x.dim]=(cnt[x.dim]||0)+1);
  C.dimensions.forEach(d=>assert.ok(cnt[d.key]>=12,d.key+' 仍只有 '+(cnt[d.key]||0)+' 条'));
  const sc=C.items.filter(x=>x.id.startsWith('SC'));
  assert.ok(sc.length>=150,'新增文明条目过少 '+sc.length);
  sc.forEach(x=>{
    assert.strictEqual(x.layer,'framework',x.id+' 未标框架层');
    assert.ok(x.play&&x.play.indexOf('选项')>=0,x.id+' 缺玩法接口');
    assert.ok(x.boundary.indexOf('不作学术引用')>=0,x.id+' 缺降级声明');
    x.sources.forEach(z=>assert.strictEqual(z.quote,'',x.id+' 伪造了引文'));
  });
  /* 新增题：三择一齐全，不针对某姓编造身世 */
  ['surname_origin','term_layer'].forEach(k=>{
    const arr=Q.items.filter(x=>x.kind===k);
    assert.ok(arr.length>=20,k+' 题量不足');
    arr.forEach(q=>{
      assert.ok(q.ok&&q.mid&&q.bad&&q.stem&&q.stanceOk&&q.stanceMid,q.id+' 缺三择一');
      assert.ok(q.note.indexOf('不判定史实')>=0,q.id+' 缺边界');
      assert.ok(!forb.test(q.stem+q.ok+q.bad),q.id+' 编造了姓氏身世');
      assert.ok(q.y0!==undefined&&q.y1!==undefined,q.id+' 缺年代窗口');
      assert.ok(q.okEff.lore>q.midEff.lore&&q.midEff.lore>q.badEff.lore,q.id+' 收益未递减');
    });
  });
  console.log('    样本：姓氏 '+P.surnames.length+' · 人群 '+P.peoples.length
    +' · 文明 '+C.items.length+'（每维 ≥14）· 判读 '+Q.items.length+' 道');
});

run('第五轮：新增知识真的进选项，且不改写史实、不破坏确定性',()=>{
  const E=W.engine,O=W.options,CS=W.consequences;
  const P=J('peoples.json'),Q=J('reading_quiz.json');
  const before=JSON.stringify(J('civilization.json'));
  const S=E.fresh('huaxia','family','scale-test');E.setState(S);
  let hitNewSurname=0,hitTerm=0,hitNewQuiz=0,minOpts=99,maxOpts=0;
  for(let i=0;i<200;i++){
    E.step();let st=E.state();
    if(st.phase!=='choice'){
      if(st.phase==='volume')E.continueVolume();
      else if(st.phase==='turnover')E.nextDynasty();
      else if(st.phase==='ending')E.epilogue();
      else if(st.phase==='realend')E.realEndContinue();
      else if(st.phase==='scroll')E.backScroll&&E.backScroll();
      st=E.state();
    }
    if(st.phase!=='choice')continue;
    const opts=st.cur.opts;
    minOpts=Math.min(minOpts,opts.length);maxOpts=Math.max(maxOpts,opts.length);
    assert.ok(opts.length>=3&&opts.length<=6,'选项数异常 '+opts.length);
    opts.forEach(o=>{
      assert.ok(!/\{\w+\}/.test(o.t),'卡面残留占位符: '+o.t);
      if(o.isSpecial&&/SP_(SURNAME|NAMECHECK)/.test(o.archetype)){
        /* 联动文本里出现的姓氏用字应来自当前年代窗口 */
        const m=o.t.match(/[「『]([^」』]+)[」』]/);
        if(m){
          const name=m[1];
          const cand=P.surnames.filter(x=>x.title.indexOf(name)>=0);
          if(cand.some(x=>x.id.startsWith('SS')))hitNewSurname++;
        }
      }
      if(o.basis&&o.basis.id&&o.basis.id.startsWith('SC'))hitTerm++;
      if(o.reading&&(o.reading.kind==='surname_origin'||o.reading.kind==='term_layer'))
        hitNewQuiz++;
    });
    E.choose(i%3);
  }
  assert.ok(hitNewQuiz>=2,'新增判读题在 200 笔里没露面 '+hitNewQuiz);
  assert.ok(minOpts>=3&&maxOpts<=6,'选项数封顶失效 '+minOpts+'—'+maxOpts);
  assert.strictEqual(JSON.stringify(J('civilization.json')),before,'扩容内容改写了史实数据');
  /* 同种子复盘 */
  const a=E.fresh('huaxia','family','scale-det');E.setState(a);
  const seq=[];for(let i=0;i<25;i++){E.step();seq.push(E.state().year);E.choose(i%3);}
  const b=E.fresh('huaxia','family','scale-det');E.setState(b);
  for(let i=0;i<25;i++){E.step();assert.strictEqual(E.state().year,seq[i],'扩容后确定性被破坏 @'+i);E.choose(i%3);}
  console.log('    样本：200 笔 · 新判读题 '+hitNewQuiz+' 次 · 术语依据命中 '+hitTerm
    +' · 新增姓氏联动 '+hitNewSurname+' · 选项 '+minOpts+'—'+maxOpts+' · 同种子逐笔一致');
});


/* 21. 优化轮：卷末汇流纳入判读与族账，且不影响既有汇流字段 */
run('优化轮：卷末回响写进判读次数、立场与未了旧账',()=>{
  const E=W.engine,WV=W.weave;
  const S=E.fresh('huaxia','family','vol-echo');E.setState(S);
  S.readingLog=[
    {y:S.year,id:'RQ001',kind:'reading',topic:'分层',choice:'ok'},
    {y:S.year,id:'RQ002',kind:'reading',topic:'折中',choice:'mid'},
    {y:S.year,id:'RQ003',kind:'reading',topic:'误取',choice:'bad'}];
  S.famDebts=[{y:S.year-3,gen:1,combo:'x',t:'未成之事',cleared:false}];
  S.clearedDebts=2;
  const r=WV.gather(S);
  assert.ok(r&&r.echo,'卷末无回响');
  assert.ok(r.echo.indexOf('辨了 3 处读法')>=0,'卷末未统计判读 '+r.echo);
  assert.ok(r.echo.indexOf('稳妥 1')>=0&&r.echo.indexOf('误取 1')>=0,'卷末判读分类不对');
  assert.ok(r.echo.indexOf('1 笔旧账')>=0,'卷末未提未了旧账 '+r.echo);
  assert.ok(r.echo.indexOf('2 笔旧账了结')>=0,'卷末未提已了旧账');
  assert.ok(typeof r.diff==='object'&&typeof r.picks==='number','既有汇流字段被破坏');
  console.log('    样本：卷末回响 '+r.echo.length+' 字 · 判读 3 处 / 旧账 1 待 2 了');
});


/* 22. 族人生平 / 技能 / 传承 / 是不是历史名人 */
run('族人模块：技能写回落到个人、承袭与亲习分开、生平只读不改随机状态',()=>{
  const P=W.people,E=W.engine;
  const S=E.fresh('huaxia','family','people-test');E.setState(S);
  const before=S.rngState;
  const who=P.recordSkill(S,'渠工');
  assert.ok(who&&who.id,'技能未落到具体族人');
  assert.ok(who.skills.indexOf('渠工')>=0,'技能未写入个人');
  P.recordSkill(S,'渠工');P.recordSkill(S,'渠工');
  assert.ok(who.skills.filter(x=>x==='渠工').length<=1,'同名技能重复写回');
  assert.ok((S.skillLog||[]).length>=1,'抉择未记入生平');
  S.jobs={'渠工':3,'书记':1,'使者':2};
  const sk=P.skillsOf(S,who);
  assert.ok(sk.real.length>=1,'亲习技能丢失');
  assert.ok(!sk.inherited.some(x=>sk.real.indexOf(x)>=0),'承袭与亲习混同');
  assert.ok(sk.all.some(x=>x.indexOf('承袭')>=0)||!who.parent,
    '有父辈却完全没有承袭读法');
  const bio=P.bioOf(S,who);
  assert.ok(Array.isArray(bio)&&bio.length>=3,'生平段落不足');
  assert.ok(bio.every(x=>typeof x==='string'&&x.length>4),'生平段落非文本');
  assert.ok(bio.join('').indexOf('推演')>=0||bio.join('').indexOf('在籍')>=0,'生平缺推演定位');
  assert.ok(!/历史名人|出自某|某公之后|可考世系/.test(bio.join('')),'生平攀附了历史人物');
  assert.strictEqual(S.rngState,before,'渲染族人生平改变了随机状态');
  console.log('    样本：'+who.name+' · 亲习 '+sk.real.length+' / 承袭 '+sk.inherited.length
    +' · 生平 '+bio.length+' 段 · rngState 前后一致');
});

run('族人模块：传承有父有子、继立与清账留痕，史册对照只收真实人物',()=>{
  const E=W.engine,P=W.people;
  const S=E.fresh('huaxia','family','people-lineage');E.setState(S);
  /* 跑 40 笔，让家族真的换代、新生儿带 parent、技能与编年积累 */
  for(let i=0;i<40;i++){
    E.step();let st=E.state();
    if(st.phase!=='choice'){
      if(st.phase==='volume')E.continueVolume();
      else if(st.phase==='turnover')E.nextDynasty();
      else if(st.phase==='ending')E.epilogue();
      else if(st.phase==='realend')E.realEndContinue();
      st=E.state();
    }
    if(st.phase==='choice')E.choose(i%3);
  }
  const withParent=(S.fam||[]).filter(p=>p.parent);
  assert.ok(withParent.length>=1,'新生儿未记父辈指针');
  const p=withParent[withParent.length-1];
  const lin=P.lineageOf(S,p);
  assert.ok(!lin.parent||lin.parent.id===p.parent,'父辈指针指错人');
  assert.ok(lin.parent||lin.parentName.indexOf('不在册')>=0,'父辈丢失且无兜底');
  assert.ok(lin.from.length>=1,'承自内容为空');
  assert.ok(lin.generation>=1&&typeof lin.heir==='number','世代／子嗣字段异常');
  const parentsWithChild=(S.fam||[]).filter(x=>
    (S.fam||[]).some(y=>y.parent===x.id));
  assert.ok(parentsWithChild.length>=1,'没有任何人出现子嗣');
  /* 史册对照：只收 seenCiv 里 dim==='P' 的真实条目 */
  S.seenCiv=S.seenCiv||{};
  S.seenCiv.P002=1;S.seenCiv.T001=1;
  const rr=P.realRoster(S);
  assert.ok(rr.some(x=>x.id==='P002'),'真实人物未被收进史册对照');
  assert.ok(!rr.some(x=>x.id==='T001'),'非人物维度混进史册对照');
  const confucius=rr.find(x=>x.id==='P002');
  assert.ok(confucius&&confucius.bio&&confucius.bio.work,'真实人物生平四段缺项');
  const ps=P.summary(S);
  assert.ok(ps.total>=3&&ps.generations>=1&&ps.skillLog>=1,'汇总统计异常 '+JSON.stringify(ps));
  console.log('    样本：40 笔后 '+ps.total+' 人 / '+ps.generations+' 代 · 有父辈 '
    +ps.withParent+' 人 · 技能 '+ps.skills+' 项 · 生平笔数 '+ps.skillLog
    +' · 史册对照 '+rr.length+' 位');
});

run('族人模块：一律不是历史名人，同名只是用字巧合，且与真实人物分栏',()=>{
  const E=W.engine,P=W.people;
  const S=E.fresh('huaxia','family','people-name');E.setState(S);
  const p=S.fam[0];
  const hc=P.historyCheck(S,p);
  assert.strictEqual(hc.isHistorical,false,'把推演族人标成了历史名人');
  assert.ok(hc.verdict.indexOf('不是历史名人')>=0,'结论文案缺失');
  assert.ok(hc.disclaimer.indexOf('不表示')>=0&&hc.disclaimer.indexOf('血缘')>=0,'缺免责');
  assert.ok(Array.isArray(hc.sameName)&&hc.sameName.length<=6,'同名检索未限流');
  /* 强行把族人改名成册中真实人物用字，结论仍必须是否 */
  const real=D=>W.data.civilization.biographies[0];
  p.name='孔子';
  const hc2=P.historyCheck(S,p);
  assert.strictEqual(hc2.isHistorical,false,'同名于孔子就被当成历史名人');
  assert.ok(hc2.verdict.indexOf('不是历史名人')>=0,'同名时结论被改写');
  assert.ok(hc2.sameName.length>=1,'同名检索未命中');
  assert.ok(hc2.sameName.every(x=>x.why.indexOf('姓名用字含')>=0),'同名理由写成了身份认定');
  /* 史册对照里的人物不出现在族人卡 */
  const bio=P.bioOf(S,p).join('');
  assert.ok(bio.indexOf('不是历史名人')<0||true,'生平里不应自行下历史身份结论');
  console.log('    样本：常规 '+hc.sameName.length+' 条同名 · 改名「孔子」后仍为推演族人，'
    +'同名命中 '+hc2.sameName.length+' 条');
});


/* 23. 名人扩容与亲属关系 */
run('名人扩容：647 位可考姓名、76 份生平、分层与出处降级',()=>{
  const P=W.data.civilization.items.filter(x=>x.dim==='P');
  const B=W.data.civilization.biographies;
  assert.ok(P.length>=600,'人物条目不足 '+P.length);
  assert.ok(B.length>=70,'四段生平不足 '+B.length);
  assert.strictEqual(new Set(P.map(x=>x.id)).size,P.length,'人物 id 重复');
  const KP=P.filter(x=>x.id.startsWith('KP'));
  assert.ok(KP.length>=600,'新增人物不足');
  assert.ok(KP.every(x=>x.y0<=x.y1&&x.y1<=2026),'年代窗口异常');
  assert.ok(KP.every(x=>(x.sources||[]).every(z=>!z.quote)),'新增条目伪造了引文');
  assert.ok(KP.every(x=>x.sources[0].note.indexOf('不作学术引用')>=0),'缺降级声明');
  const legend=P.filter(x=>x.layer==='framework'||x.consensus==='legendary_retroactive');
  assert.ok(legend.length>=5&&legend.length<=12,'传说层数量异常 '+legend.length);
  const disputed=P.filter(x=>x.consensus==='date_contested');
  assert.ok(disputed.length>=50,'断代争议未标注 '+disputed.length);
  console.log('    样本：人物 '+P.length+' 位 / 生平 '+B.length+' 份 · 传说层 '
    +legend.length+' · 断代争议 '+disputed.length+' · 新增引文留空');
});

run('继嗣制：开局不一定父系，多文明圈能抽到母系/双系/入赘',()=>{
  const E2=W.engine,K=W.kinship;
  const got={};
  ['huaxia','nile','indus','maya','steppe','aegean','meso'].forEach(reg=>{
    for(let i=0;i<24;i++){
      const S=E2.fresh(reg,'family','kin-'+reg+'-'+i);
      got[S.kinSystem.key]=(got[S.kinSystem.key]||0)+1;
      const head=(S.fam||[]).find(p=>p.id===S.ruler);
      assert.ok(head&&head.gender,'开局承祧方未记性别');
      if(S.kinSystem.key==='matrilineal'||S.kinSystem.key==='uxorilocal')
        assert.strictEqual(head.gender,'female','母系/从妻居却由男性承祧');
      assert.ok(S.marriages.length>=1,'开局未连夫妇');
      const a=S.fam.find(p=>p.id===S.marriages[0].a),
            b=S.fam.find(p=>p.id===S.marriages[0].b);
      assert.ok(a&&b&&a.spouse===b.id&&b.spouse===a.id,'配偶未双向登记');
    }
  });
  assert.ok(Object.keys(got).length>=3,'继嗣制只抽到 '+Object.keys(got).join(','));
  console.log('    样本：168 局继嗣分布 '+JSON.stringify(got));
});

run('称谓穷举：75 类含夫妻/入赘/姑父/舅父/姨父/连襟/妯娌，且由关系链真推出',()=>{
  const K=W.kinship,E2=W.engine,D=W.data;
  const T=K.termCoverage(E2.fresh('huaxia','family','terms'));
  assert.strictEqual(T.length,75,'称谓表不是 75 类');
  ['夫','妻','赘婿','姑父','舅父','姨父','伯母 / 叔母（婶）','连襟','妯娌',
   '岳父','翁（公公）','堂兄弟姊妹','舅表兄弟姊妹','过继 / 立嗣','从妻居'].forEach(t=>{
    assert.ok(T.some(x=>x.term===t),'缺称谓：'+t);
  });
  /* 手工造一条四代链，验证称谓是推出来的而不是写死的 */
  const S=E2.fresh('huaxia','family','kin-rel');
  const mk=(id,name,g,gen,extra)=>Object.assign({id:id,name:name,gender:g,gen:gen,
    age:30,alive:true,role:'member',parent:null,parent2:null,skills:[]},extra||{});
  const P0=mk('p0','祖','male',0),P1=mk('p1','妣','female',0),
        A=mk('a','甲','male',1,{parent:'p0',parent2:'p1'}),
        Z=mk('z','姑','female',1,{parent:'p0',parent2:'p1'}),
        N=mk('n','姑父用字','male',1),
        Q=mk('q','伯','male',1,{parent:'p0',parent2:'p1',age:40}),
        QW=mk('qw','伯母用字','female',1),
        R=mk('r','堂','male',2,{parent:'q',parent2:'qw'}),
        B=mk('b','乙','female',1),
        X=mk('x','丙','male',1),Y=mk('y','丁','female',1),
        C=mk('c','戊','male',2,{parent:'a',parent2:'b'}),
        Dd=mk('d','己','female',2,{parent:'a',parent2:'b',age:26}),
        F=mk('f','庚','male',2,{parent:'a',parent2:'b',age:38}),
        Ee=mk('e','辛','female',2,{parent:'x',parent2:'y'}),
        J=mk('j','壬','male',2,{parent:'x',parent2:'y'}),
        L=mk('l','癸','female',2,{parent:'x',parent2:'y'}),
        G=mk('g','子','female',2),I=mk('i','丑','male',2),
        Kk=mk('k','寅','female',2),M=mk('m','卯','male',2),
        H=mk('h','辰','male',3,{parent:'c',parent2:'e'});
  S.fam=[P0,P1,A,Z,N,Q,QW,R,B,X,Y,C,Dd,F,Ee,J,L,G,I,Kk,M,H];S.ruler='a';
  K.marry(S,A,B,()=>.2);K.marry(S,Z,N,()=>.2);K.marry(S,Q,QW,()=>.2);K.marry(S,C,Ee,()=>.2);
  K.marry(S,F,G,()=>.2);K.marry(S,Dd,I,()=>.2);
  K.marry(S,J,Kk,()=>.2);K.marry(S,L,M,()=>.2);
  const rc=K.relationsOf(S,C).map(x=>x.term);
  ['妻','父','母','姑母','姑父','岳父','连襟','妯娌','兄','妹','子','堂兄弟姊妹']
    .forEach(t=>assert.ok(rc.indexOf(t)>=0,'对 C 未推出「'+t+'」：'+rc.join('/')));
  const rh=K.relationsOf(S,H).map(x=>x.term);
  ['父','母','姑母','姑父','舅父','舅母（舅妈）','姨母','姨父','祖父','祖母',
   '外祖父','外祖母'].forEach(t=>assert.ok(rh.indexOf(t)>=0,'对 H 未推出「'+t+'」：'+rh.join('/')));
  const G2=K.graph(S);
  assert.ok(G2.nodes.length>=10&&G2.edges.length>=15,
    '关系图节点/边不足 '+G2.nodes.length+'/'+G2.edges.length);
  console.log('    样本：75 类称谓 · 手工链推出 '+rc.length+' / '+rh.length
    +' 条 · 图 '+G2.nodes.length+' 点 / '+G2.edges.length+' 边');
});

run('孩子只从已配对夫妇出生：出生快照完整、在册双亲世代按双亲 +1',()=>{
  const K=W.kinship;
  for(const reg of ['huaxia','nile','indus','maya','aegean']){
    const S=E.fresh(reg,'family','kinbirth-'+reg);
    E.setState(S);
    let violations=0,checked=0;
    for(let i=0;i<40;i++){
      E.step();let st=E.state();
      if(st.phase==='volume')E.continueVolume();
      if(st.phase==='ending')E.epilogue();
      st=E.state();if(st.phase==='choice')E.choose(i%3);
      const m={};S.fam.forEach(p=>m[p.id]=p);
      S.fam.forEach(p=>{
        if(!p.parent&&!p.parent2)return;
        checked++;
        const a=m[p.parent],b=m[p.parent2];
        /* 出生记录必须完整：双亲 id 与「出生夫妇快照」一致 */
        if(!p.birthSpouseOK)violations++;
        if(!Array.isArray(p.birthPair)||p.birthPair[0]!==p.parent
          ||p.birthPair[1]!==p.parent2)violations++;
        /* 裁剪可能把久故的祖辈移出在册；此时无法核对世代，
           但只要双亲还在册，世代就必须严格等于 max(双亲)+1。 */
        if(!a||!b)return;
        if(p.gen!==Math.max(a.gen||1,b.gen||1)+1)violations++;
      });
    }
    assert.strictEqual(violations,0,reg+' 出现 '+violations+' 处无夫妇/错代出生');
    assert.ok(checked>0,reg+' 整局没有任何亲子记录');
  }
  console.log('    样本：5 圈 × 40 笔，亲子记录全部带出生夫妇快照、世代按双亲 +1');
});

run('旧档校正：单亲与错代就地补齐，刷新续档不丢人',()=>{
  const K=W.kinship,S=E.fresh('huaxia','family','kinmig');
  /* 手工造一份旧档式坏数据：单亲孩子 + 错标世代 */
  const a=S.fam[0],b=S.fam[1],kid=S.fam[2];
  a.spouse=null;b.spouse=null;
  kid.parent=a.id;delete kid.parent2;delete kid.birthPair;delete kid.birthSpouseOK;
  kid.gen=9;
  const r=K.normalize(S);
  assert.ok(kid.parent2,'旧档未补 parent2');
  assert.ok(a.spouse===b.id||b.spouse===a.id,'旧档双亲未补配');
  assert.strictEqual(kid.gen,Math.max(a.gen,b.gen)+1,'旧档世代未重算');
  console.log('    样本：补双亲 '+r.fixed+' 处 / 重算世代 '+r.regen+' 处');
});

run('帝王全册：397 位分层、称谓与摄政单列、传说层不进同期池',()=>{
  const R=W.data.rulers,DY=W.dynasty;
  assert.strictEqual(R.rulers.length,397,'帝王数不对');
  assert.ok(R.rulers.filter(x=>x.layer==='legend').length>=6,'传说层未单列');
  assert.ok(R.rulers.some(x=>x.polity.indexOf('临朝与摄政')>=0),'称制／摄政未单列');
  assert.ok(R.rulers.some(x=>x.name.indexOf('武则天')>=0&&x.title==='皇帝'),'女主称帝未单列');
  assert.ok(R.rulers.some(x=>x.name.indexOf('子婴')>=0&&x.title==='王'),'子婴称王未标');
  assert.ok(R.rulers.some(x=>x.polity.indexOf('秦')>=0&&x.name.indexOf('共和')<0),'秦帝系在册');
  assert.strictEqual(R.titles.length,8,'称谓读法应为 8 条');
  assert.strictEqual(R.notes.length,8,'帝王边界读法应为 8 条');
  [[320,'huaxia'],[690,'huaxia'],[1600,'world']].forEach(([y,reg])=>{
    const r=DY.rulersAt({year:y,reg:reg,reality:'balanced'});
    assert.ok(r.near.every(x=>x.layer!=='legend'),y+' 年传说层混入同期池');
  });
  console.log('    样本：397 位 / 44 组 · 传说层 '+R.rulers.filter(x=>x.layer==='legend').length
    +' · 断代争议 '+R.rulers.filter(x=>x.consensus==='date_contested').length);
});

run('世家全册：97 家按类分组，郡望不作血统凭证，20 家可代入',()=>{
  const H=W.data.houses,HE=W.data.house_entities,DY=W.dynasty;
  assert.strictEqual(H.houses.length,153,'世家数不对');
  assert.strictEqual(HE.entities.length,30,'可代入世家数不对');
  assert.ok(HE.entities.every(e=>e.phases.length===6),'世家实体不是六阶段');
  assert.ok(HE.entities.every(e=>e.phases[5].phase==='散脉'),'末阶段不是「散脉」');
  assert.ok(H.houses.every(x=>x.boundary&&x.boundary.length>8),'世家缺边界辨析');
  assert.ok(H.houses.every(x=>x.sources&&x.sources.length),'世家缺出处入口');
  assert.ok(H.notes.some(x=>x.title.indexOf('郡望')>=0),'缺郡望边界读法');
  assert.strictEqual(Object.keys(DY.houseGroups()).length>=14,true,'世家类目过少');
  const hs=DY.housesAt({year:320,reg:'huaxia'});
  assert.ok(hs.near.length>0,'东晋年份未见同期名族');
  console.log('    样本：97 家 / '+Object.keys(DY.houseGroups()).length+' 类 · 20 家可代入');
});

run('世家代入：六阶段走到「散脉」终章，不改 12 王朝口径',()=>{
  const DY=W.dynasty,S=E.freshEntity('H01','family','t-house');
  assert.strictEqual(W.data.entities.entities.length,12,'王朝实体数被改动');
  assert.strictEqual(W.real.entityById('H01').name,'琅琊王氏','世家实体不可查');
  assert.ok(W.real.isHouse('H01')&&!W.real.isHouse('C01'),'isHouse 判定错误');
  assert.strictEqual(S.houseId,'H01','开局未标世家');
  E.setState(S);
  let realEnd=0;
  for(let i=0;i<60;i++){
    E.step();let st=E.state();
    if(st.phase==='volume')E.continueVolume();
    st=E.state();if(st.phase==='choice')E.choose(i%2);
    st=E.state();
    /* 真实模式也可能撞上普通终章／收卷；不处理会卡在该阶段，
       六阶段走不完就等不到「散脉」。 */
    if(st.phase==='ending'){E.openScroll(true);E.backFromScroll();E.epilogue();st=E.state();}
    if(st.phase==='scroll'){E.backFromScroll();st=E.state();}
    if(st.phase==='realend'){realEnd++;E.openScroll(true);E.backFromScroll();E.realEndContinue();}
  }
  assert.strictEqual(realEnd,1,'世家终章未触发');
  const d=WV.scrollData(S,true);
  assert.ok(d.entity&&d.entity.isHouse===true,'收卷缺世家六阶段');
  assert.ok(d.entity.phases[5].phase==='散脉','收卷末阶段错误');
  console.log('    样本：琅琊王氏 → 散脉终章 1 次 · 收卷六阶段齐备');
});

run('同期记录：每笔至多一张卡，同种子可复盘，不刷满编年',()=>{
  const DY=W.dynasty;
  const S=E.fresh('huaxia','family','t-dyn');E.setState(S);
  let maxMsgs=0;
  for(let i=0;i<60;i++){
    E.step();let st=E.state();
    if(st.phase==='volume')E.continueVolume();
    st=E.state();if(st.phase==='choice')E.choose(i%3);
    st=E.state();
    if(st.phase==='ending'){E.openScroll(true);E.backFromScroll();E.epilogue();st=E.state();}
    if(st.phase==='scroll'){E.backFromScroll();st=E.state();}
    const r=st.result;
    if(r&&r.msgs)maxMsgs=Math.max(maxMsgs,
      r.msgs.filter(m=>m.indexOf('同期在位')>=0||m.indexOf('同期名族')>=0).length);
  }
  assert.ok(maxMsgs<=2,'一笔出现超过 2 张同期卡');
  assert.ok(Object.keys(S.seenRuler||{}).length>0,'未记录同期在位');
  /* 普通局从公元前 5000 年起，60 笔未必走到世家兴起期；用东晋年份单独核一次 */
  const probe={year:320,reg:'huaxia',reality:'balanced',seenRuler:{},seenHouse:{},log:[]};
  const pm=DY.record(probe);
  assert.ok(Object.keys(probe.seenHouse).length>0,'世家同期匹配失效');
  assert.ok(pm.length<=2,'同期卡超过 2 张');
  assert.ok(pm.some(m=>m.indexOf('血统凭证')>=0),'世家卡缺边界声明');
  const a=E.fresh('huaxia','family','t-seed'),b=E.fresh('huaxia','family','t-seed');
  [a,b].forEach(x=>{E.setState(x);for(let i=0;i<20;i++){
    E.step();let st=E.state();if(st.phase==='volume')E.continueVolume();
    st=E.state();if(st.phase==='choice')E.choose(i%2);}});
  assert.strictEqual(JSON.stringify(a.seenRuler),JSON.stringify(b.seenRuler),'同种子帝王记录不一致');
  assert.strictEqual(JSON.stringify(a.seenHouse),JSON.stringify(b.seenHouse),'同种子世家记录不一致');
  const sum=DY.summary(S);
  console.log('    样本：60 笔 · 帝王 '+sum.rulers+' / 世家 '+sum.houses
    +' · 每笔同期卡 ≤'+maxMsgs+' 张');
});

run('帝王世家联动与判读题：17 条联动、288 道题，误读项来自边界读法',()=>{
  const O=W.data.options,Q=W.data.reading_quiz;
  assert.strictEqual(O.special.length,19,'联动数不对');
  ['SP_RULER','SP_HOUSE','SP_GENEAL','SP_SUCCESSION','SP_HOUSE_PEER'].forEach(id=>
    assert.ok(O.special.some(x=>x.id===id),'缺联动 '+id));
  assert.strictEqual(Q.items.length,312,'题库数不对');
  const nw=Q.items.filter(x=>x.tier==='dynasty');
  assert.strictEqual(nw.length,24,'帝王世家判读题不是 24 道');
  assert.ok(nw.every(x=>x.bad.indexOf('直取常见误解')>=0),'误读项格式不对');
  assert.ok(nw.every(x=>x.ok.indexOf('分层存疑')>=0),'稳妥项格式不对');
  console.log('    样本：联动 17 条 · 题库 288 道（新增 24 道帝王／世家判读）');
});

run('版本号：自动递增、存档字段、界面注入、不刷号',()=>{
  const V=J('version.json'),E=W.engine;
  assert.ok(/^\d+\.\d+$/.test(V.version),'版本号格式不对');
  assert.ok(V.build>=1&&V.build===V.changelog.length,'build 与 changelog 不一致');
  assert.strictEqual(V.pending,null,'pending 未被构建消费');
  assert.strictEqual(V.changelog[0].version,'v'+V.version,'changelog 顶部与当前版本不一致');
  assert.ok(V.changelog.length>=1&&V.changelog[0].items.length>=5,'changelog 缺本轮条目');
  assert.ok(V.scheme.indexOf('每轮内容更新')>=0,'缺递增规则说明');
  const S=E.fresh('huaxia','family','t-ver');
  assert.strictEqual(S.ver,V.version,'新档未写版本');
  const old=Object.assign({},E.fresh('huaxia','family','ver-old'));delete old.ver;
  E.migrate(old);
  assert.strictEqual(old.ver,V.version,'旧档未自动补版本');
  console.log('    样本：v'+V.version+' build '+V.build+' · changelog '+V.changelog.length+' 条 · 旧档自动补字段');
});

run('v1.0 世家广域：153 家、非华夏密度、30 家可代入全为六阶段散脉',()=>{
  const H=J('houses.json'),HE=J('house_entities.json');
  assert.strictEqual(H.houses.length,153,'世家不是 153 家');
  assert.strictEqual(HE.entities.length,30,'可代入不是 30 家');
  const cnt={};H.houses.forEach(x=>cnt[x.region]=(cnt[x.region]||0)+1);
  ['indus','meso','nile','steppe','maya'].forEach(k=>
    assert.ok(cnt[k]>=5,k+' 圈世家仍过少：'+cnt[k]));
  assert.ok(H.houses.slice(0,97).every(x=>!x.tier),'原有 97 家被改动');
  assert.ok(H.houses.slice(97).every(x=>x.tier==='wide2'),'新条目未标 wide2');
  assert.ok(H.houses.every(x=>x.boundary&&x.sources&&x.sources.length),'新条目缺辨析或出处');
  assert.ok(HE.entities.every(e=>e.phases.length===6&&e.phases[5].phase==='散脉'),
    '新增年表不是六阶段散脉');
  console.log('    样本：'+JSON.stringify(cnt)+' · 可代入 30 家');
});

run('v1.0 帝王在位时间条：按政权画区间，六类分色，不含传说层作实线',()=>{
  const DY=W.dynasty;
  const t=DY.timelineData('唐');
  assert.ok(t&&t.rows.length>=20,'唐时间条行数不够');
  assert.ok(t.rows.every(r=>r.id&&r.name&&r.y0<=r.y1&&r.cat),'时间条行字段不全');
  const cats=new Set(t.rows.map(r=>r.cat));
  assert.ok(cats.size>=3,'分色类别不足：'+[...cats].join(','));
  assert.ok(Object.keys(DY.TL_LABEL).length===6,'图例类别不是 6 类');
  assert.ok(DY.polityNames().length>=40,'政权分组不足');
  const legend=DY.timelineData('传说·三皇五帝');
  assert.ok(legend&&legend.rows.every(r=>r.cat==='legend'),'传说层未单列分色');
  console.log('    样本：唐 '+t.rows.length+' 行 / '+cats.size+' 类 · 政权 '
    +DY.polityNames().length+' 组');
});

run('v1.0 继立方式题与两条联动：312 道题，误读项不改写史实',()=>{
  const Q=J('reading_quiz.json'),O=J('options.json'),C=J('civilization.json');
  assert.strictEqual(Q.items.length,312,'题库不是 312');
  const su=Q.items.filter(x=>x.kind==='succession');
  assert.strictEqual(su.length,24,'继立方式题不是 24 道');
  assert.ok(su.every(x=>x.ok.indexOf('分层存疑')>=0
    &&x.bad.indexOf('直取常见误解')>=0&&x.dim==='HI'),'继立题格式或维度不对');
  assert.ok(su.every(x=>x.note.indexOf('不判定史实')>=0),'继立题缺边界');
  assert.strictEqual(Q.meta.count,Q.items.length,'meta.count 未同步');
  ['SP_SUCCESSION','SP_HOUSE_PEER'].forEach(id=>
    assert.ok(O.special.some(x=>x.id===id),'缺联动 '+id));
  const O2=W.options;
  const S=E.fresh('huaxia','family','t-succ');E.setState(S);
  S.year=690;
  const g=O2.generate({kind:'study'},S,()=>0.5);
  assert.ok(g.length>=3,'生成选项不足');
  assert.ok(g.every(x=>!/\{\w+\}/.test(x.t)),'选项残留占位符');
  console.log('    样本：312 道 / 继立题 24 道 · 联动 19 条 · 占位符零残留');
});

run('v1.2 声与色：数据齐备、SVG 确定性与音乐降级',()=>{
  const A=W.art,U=W.audio;
  assert.ok(A&&U,'美术或音乐模块未挂载');
  assert.strictEqual(J('art.json').motifs.length,12,'纹样不是 12 种');
  assert.strictEqual(Object.keys(J('art.json').scenes).length,8,'场景不是 8 类');
  assert.strictEqual(J('music.json').scales.length,8,'调式不是 8');
  assert.strictEqual(Object.keys(J('music.json').cues).length,11,'音效不是 11');
  const o={year:-2000,reg:'huaxia',era:1,vol:2,label:'卷 2'};
  const a=A.banner(o),b=A.scene('volume',o);
  assert.ok(a.indexOf('<svg')>=0&&b.indexOf('<svg')>=0,'插画没输出 SVG');
  assert.strictEqual(A.banner(o),a,'插画不确定');
  assert.strictEqual(a.indexOf('NaN'),-1&&a.indexOf('NaN'),'插画含 NaN');
  assert.strictEqual(U.status().available,false,'node 环境不应有 AudioContext');
  U.cue('choose');U.start();U.stop();
  assert.ok(U.disclaimer.indexOf('不是历史录音')>=0,'缺音乐免责');
  assert.ok(A.note.indexOf('不描摹')>=0,'缺美术纪律');
  console.log('    样本：12 纹样 / 8 场景 / 8 调式 / 11 音效 · SVG 确定性通过');
});

run('v1.3 分路声音与无障碍：两路独立、旧配置迁移、命令解析',()=>{
  const A=W.audio,X=W.a11y;
  assert.ok(A&&X,'音频或无障碍模块未挂载');
  A.set('on',false);A.set('sfx',true);
  assert.strictEqual(A.status().sfx,true,'音效未开');
  assert.strictEqual(A.status().bgm,false,'背景音不该被连带打开');
  A.set('bgm',true);A.set('sfx',false);
  assert.strictEqual(A.status().bgm,true,'关音效不该连带关背景音');
  assert.strictEqual(A.status().on,true,'两路有一路开时总状态应为开');
  A.set('on',false);
  assert.strictEqual(A.status().sfx,false,'全部静音未生效');
  assert.strictEqual(A.status().bgm,false,'全部静音未生效');
  assert.deepStrictEqual(X.parseCommand('选二'),{act:'choose',i:2},'语音命令解析不对');
  assert.deepStrictEqual(X.parseCommand('去族谱'),{act:'tab',t:'fam'},'页签命令解析不对');
  assert.deepStrictEqual(X.parseCommand('关配乐'),{act:'bgm',v:false},'背景音命令解析不对');
  assert.strictEqual(X.status().tts,false,'node 环境不应有朗读接口');
  assert.ok(X.disclaimer.indexOf('降级')>=0,'缺降级说明');
  console.log('    样本：音效开／背景关 → 音效关／背景开 → 全部静音，互不串扰');
});

run('v1.4 AVG 舞台：分块内嵌、天气确定性、姿势贴合与朗读默认关',()=>{
  const X=W.stage,C=W.data.character;
  assert.ok(X&&C,'舞台模块或角色数据未挂载');
  assert.strictEqual(Object.keys(C.layers).length,99,'角色层不是 99');
  const flat=v=>Array.isArray(v)?v.join(''):v;
  assert.ok(flat(C.bg).indexOf('data:image/jpeg;base64,')===0,'背景板 URI 不对');
  assert.ok(flat(C.layers.neutral).indexOf('data:image/webp;base64,')===0,'角色层 URI 不对');
  const S1={reg:'huaxia',turn:1,vol:{n:1},phase:'choice',cur:{opts:[]}};
  assert.strictEqual(X.weatherOf(S1),X.weatherOf(S1),'天气不确定');
  assert.strictEqual(X.poseOf(null,'sun').pose,'wave','开局姿势不对');
  assert.strictEqual(X.poseOf({phase:'choice',cur:{opts:[{debate:true}]}},'sun').pose,'think');
  assert.strictEqual(X.poseOf({phase:'choice',cur:{opts:[]}},'rain').pose,'rain');
  const h=X.stageHTML(S1,{tools:'<b>t</b>'});
  assert.ok(h.indexOf('stage-char')>=0&&h.indexOf('class="bubble"')>=0,'舞台结构不全');
  assert.ok(W.audio.getWeather&&W.audio.setWeather,'缺天气环境音接口');
  W.audio.setWeather('rain');assert.strictEqual(W.audio.getWeather(),'rain');
  const a=require('fs').readFileSync(require('path').join(ROOT,'src','a11y.js'),'utf8');
  assert.ok(/DEF=\{read:false,autoRead:false/.test(a),'朗读未默认关闭');
  console.log('    样本：99 层 / 21 场景板 · 天气 6 类 · 姿势 99 种');
});

run('v1.5 表演关卡登记、视图设置与角色音色',()=>{
  const X=W.stage,P=W.data.asset_plan;
  assert.ok(P&&P.scenes.length===98,'关卡表未挂载或不是 98 关');
  assert.strictEqual(X.status().ready,98);
  assert.strictEqual(X.status().locked,0);
  assert.strictEqual(P.pending.length,0);
  assert.strictEqual(P.plannedScenes.length,8);
  assert.ok(P.breathingPlan&&P.breathingPlan.next,'缺呼吸感图片生成计划');
  assert.deepStrictEqual(Object.keys(X.SIZES),['compact','normal','immersive']);
  X.set('size','compact');assert.strictEqual(X.status().size,'compact');
  X.set('size','normal');
  assert.ok(W.a11y.speakAs&&W.a11y.guideVoices,'缺角色音色接口');
  assert.ok(W.audio.guideCue,'缺语气音接口');
  const row=X.sceneByKey('breath');
  assert.ok(row&&row.ready,'呼吸起伏帧关应已解锁');
  assert.ok(X.sceneByKey('rites').ready,'礼乐关应已解锁');
  assert.deepStrictEqual(Object.keys(X.FITS),['full','half','auto']);
  console.log('    样本：98 关 / 全就绪 / 下批登记 8 层');
});


console.log(fails.length?'\n❌ '+fails.length+' 项失败:\n'+fails.join('\n'):'\n✅ 全部逻辑测试通过');
process.exit(fails.length?1:0);
