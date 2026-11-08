# -*- coding: utf-8 -*-
import os
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
p=os.path.join(ROOT,'test','logic.test.js');s=open(p,encoding='utf8').read()
old="""  reading_quiz:J('reading_quiz.json'),kinship:J('kinship.json')"""
new="""  reading_quiz:J('reading_quiz.json'),kinship:J('kinship.json'),
 rulers:J('rulers.json'),houses:J('houses.json'),house_entities:J('house_entities.json')"""
assert old in s;s=s.replace(old,new,1)
old2="""['rng','kinship','family','people','weave','real','civilization','succession','reality','difficulty','tutorial','geoclimate','fringe','atlas','consequences','options','engine']"""
new2="""['rng','kinship','family','people','weave','real','civilization','succession','reality','difficulty','tutorial','geoclimate','fringe','atlas','consequences','dynasty','options','engine']"""
assert old2 in s;s=s.replace(old2,new2,1)

mark="\n\nconsole.log(fails.length?"
assert mark in s
add="""
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
  assert.strictEqual(H.houses.length,97,'世家数不对');
  assert.strictEqual(HE.entities.length,20,'可代入世家数不对');
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
    const r=E.state().result;
    if(r&&r.msgs)maxMsgs=Math.max(maxMsgs,
      r.msgs.filter(m=>m.indexOf('同期在位')>=0||m.indexOf('同期名族')>=0).length);
  }
  assert.ok(maxMsgs<=2,'一笔出现超过 2 张同期卡');
  assert.ok(Object.keys(S.seenRuler||{}).length>0,'未记录同期在位');
  assert.ok(Object.keys(S.seenHouse||{}).length>0,'未记录同期名族');
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
  assert.strictEqual(O.special.length,17,'联动数不对');
  ['SP_RULER','SP_HOUSE','SP_GENEAL'].forEach(id=>
    assert.ok(O.special.some(x=>x.id===id),'缺联动 '+id));
  assert.strictEqual(Q.items.length,288,'题库数不对');
  const nw=Q.items.filter(x=>x.tier==='dynasty');
  assert.strictEqual(nw.length,24,'帝王世家判读题不是 24 道');
  assert.ok(nw.every(x=>x.bad.indexOf('直取常见误解')>=0),'误读项格式不对');
  assert.ok(nw.every(x=>x.ok.indexOf('分层存疑')>=0),'稳妥项格式不对');
  console.log('    样本：联动 17 条 · 题库 288 道（新增 24 道帝王／世家判读）');
});
"""
s=s.replace(mark,add+mark,1)
open(p,'w',encoding='utf8').write(s)
print('逻辑测试已补全')
