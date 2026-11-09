# -*- coding: utf-8 -*-
"""v1.0：同步数量断言，补版本号／时间条／继立题／广域分布断言。"""
import os
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# ── check_dynasty.js ──
p=os.path.join(ROOT,'tools','check_dynasty.js');s=open(p,encoding='utf8').read()
for a,b in [("ck(D.houses.houses.length===97,'世家 97 家');","ck(D.houses.houses.length===153,'世家 153 家');"),
            ("ck(D.house_entities.entities.length===20,'可代入 20 家');","ck(D.house_entities.entities.length===30,'可代入 30 家');"),
            ("ck(D.options.special.length===17,'联动 17 条');","ck(D.options.special.length===19,'联动 19 条');"),
            ("ck(D.reading_quiz.items.length===288,'判读题 288 道');","ck(D.reading_quiz.items.length===312,'判读题 312 道');"),
            ("ck(W.real.allEntities().length===32,'合并 32 实体');","ck(W.real.allEntities().length===42,'合并 42 实体');")]:
    assert a in s,a;s=s.replace(a,b,1)
# 追加新自检
s=s.replace("""console.log(bad?'\\n❌ '+bad+' 项失败':'\\n✅ 全部自检通过');""",
"""console.log('=== v1.0 版本号 ===');
const V=D.version;
ck(V.version==='1.0'&&V.build===1,'版本基线 v1.0 build 1');
ck(!V.pending,'pending 已被构建消费');
ck(V.changelog.length===1&&V.changelog[0].items.length>=5,'changelog 已记录本轮');
ck(E.fresh('huaxia','family','ver-chk').ver==='1.0','新档写入版本字段');
const old={};E.migrate(old);ck(old.ver==='1.0','旧档自动补版本字段');

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

console.log(bad?'\\n❌ '+bad+' 项失败':'\\n✅ 全部自检通过');""")
open(p,'w',encoding='utf8').write(s)
print('check_dynasty.js 已更新')

# ── logic.test.js ──
p=os.path.join(ROOT,'test','logic.test.js');s=open(p,encoding='utf8').read()
for a,b in [
 ("'local_mis','surname_note','ruler','house','house_note']);","'local_mis','surname_note','ruler','house','house_note',\n    'succession','house_peer']);"),
 ("assert.strictEqual(O.special.length,17,'联动不是 17 条（14 + 帝王／世家 3 条）');","assert.strictEqual(O.special.length,19,'联动不是 19 条（17 + v1.0 两条）');"),
 ("assert.strictEqual(H.houses.length,97,'世家数不对');","assert.strictEqual(H.houses.length,153,'世家数不对');"),
 ("assert.strictEqual(HE.entities.length,20,'可代入世家数不对');","assert.strictEqual(HE.entities.length,30,'可代入世家数不对');"),
 ("assert.strictEqual(Q.items.length,288,'题库数不对');","assert.strictEqual(Q.items.length,312,'题库数不对');"),
 ("assert.strictEqual(O.special.length,17,'联动数不对');","assert.strictEqual(O.special.length,19,'联动数不对');"),
 ("['SP_RULER','SP_HOUSE','SP_GENEAL'].forEach(id=>","['SP_RULER','SP_HOUSE','SP_GENEAL','SP_SUCCESSION','SP_HOUSE_PEER'].forEach(id=>"),
]:
    assert a in s,a;s=s.replace(a,b,1)
# 追加 v1.0 断言组
mark="\n\nconsole.log(fails.length?"
assert mark in s
add="""
run('v1.0 版本号：自动递增、存档字段、界面注入、不刷号',()=>{
  const V=J('version.json'),E=W.engine;
  assert.strictEqual(V.version,'1.0','基线版本不是 v1.0');
  assert.strictEqual(V.build,1,'基线 build 不是 1');
  assert.strictEqual(V.pending,null,'pending 未被构建消费');
  assert.ok(V.changelog.length>=1&&V.changelog[0].items.length>=5,'changelog 缺本轮条目');
  assert.ok(V.scheme.indexOf('每轮内容更新')>=0,'缺递增规则说明');
  const S=E.fresh('huaxia','family','t-ver');
  assert.strictEqual(S.ver,'1.0','新档未写版本');
  const old={};E.migrate(old);
  assert.strictEqual(old.ver,'1.0','旧档未自动补版本');
  console.log('    样本：v1.0 build 1 · changelog '+V.changelog.length+' 条 · 旧档自动补字段');
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
  assert.ok(g.every(x=>!/\\{\\w+\\}/.test(x.t)),'选项残留占位符');
  console.log('    样本：312 道 / 继立题 24 道 · 联动 19 条 · 占位符零残留');
});
"""
s=s.replace(mark,add+mark,1)
open(p,'w',encoding='utf8').write(s)
print('logic.test.js 已更新')

# ── browser.test.js ──
p=os.path.join(ROOT,'test','browser.test.js');s=open(p,encoding='utf8').read()
for a,b in [
 ("&&s4.fam.deep2.specials===17&&s4.fam.deep2.combos===23","&&s4.fam.deep2.specials===19&&s4.fam.deep2.combos===23"),
 ("&&s4.fam.deep2.dyHouseCount===97","&&s4.fam.deep2.dyHouseCount===153"),
 ("&&s6.houses===20&&s6.houseEntry","&&s6.houses===30&&s6.houseEntry"),
 ("&&h1.entry&&h1.n===20&&h1.note","&&h1.entry&&h1.n===30&&h1.note"),
]:
    assert a in s,a;s=s.replace(a,b,1)
# 采集：版本 + 时间条
a="""        dyHouseCount:window.WQN&&window.WQN.data&&window.WQN.data.houses
          ?window.WQN.data.houses.houses.length:0"""
b="""        dyHouseCount:window.WQN&&window.WQN.data&&window.WQN.data.houses
          ?window.WQN.data.houses.houses.length:0,
        version:!!window.WQN_VERSION&&window.WQN_VERSION.version,
        versionShown:(document.querySelector('.panel.on')?.textContent||'').indexOf('v1.0')>=0,
        tlSvg:!!document.querySelector('.panel.on #dyTlSvg'),
        tlRows:document.querySelectorAll('.panel.on #dyTlSvg rect').length,
        tlSelect:document.querySelectorAll('.panel.on #dyTlPolity option').length,
        tlLegend:(document.querySelector('.panel.on')?.textContent||'').indexOf('图 例')>=0
          ||(document.querySelector('.panel.on')?.textContent||'').indexOf('图例')>=0,
        succQuiz:(document.querySelector('.panel.on')?.textContent||'').indexOf('辨继立方式')>=0"""
assert a in s;s=s.replace(a,b,1)
# 最终断言加采集
a2="""    &&s4.fam.deep2.dyRulerCount===397&&s4.fam.deep2.dyHouseCount===153"""
b2="""    &&s4.fam.deep2.dyRulerCount===397&&s4.fam.deep2.dyHouseCount===153
    &&s4.fam.deep2.version==='1.0'&&s4.fam.deep2.versionShown
    &&s4.fam.deep2.tlSvg&&s4.fam.deep2.tlRows>=10&&s4.fam.deep2.tlSelect>=40
    &&s4.fam.deep2.tlLegend&&s4.fam.deep2.succQuiz"""
assert a2 in s;s=s.replace(a2,b2,1)
open(p,'w',encoding='utf8').write(s)
print('browser.test.js 已更新')
