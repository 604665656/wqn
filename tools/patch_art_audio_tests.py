# -*- coding: utf-8 -*-
"""v1.2：把美术音乐断言接进四套既有回归。"""
import os
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# ── logic.test.js ──
p=os.path.join(ROOT,'test','logic.test.js');s=open(p,encoding='utf8').read()
old=""" rulers:J('rulers.json'),houses:J('houses.json'),house_entities:J('house_entities.json'),
 version:J('version.json')
}};"""
new=""" rulers:J('rulers.json'),houses:J('houses.json'),house_entities:J('house_entities.json'),
 version:J('version.json'),art:J('art.json'),music:J('music.json')
}};"""
assert old in s;s=s.replace(old,new,1)
old2="""'consequences','dynasty','options','engine'].forEach"""
new2="""'consequences','dynasty','options','art','audio','engine'].forEach"""
assert old2 in s;s=s.replace(old2,new2,1)
mark="\n\nconsole.log(fails.length?"
assert mark in s
add="""
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
"""
s=s.replace(mark,add+mark,1)
open(p,'w',encoding='utf8').write(s);print('logic.test.js 已扩展')

# ── check_dynasty.js ──
p=os.path.join(ROOT,'tools','check_dynasty.js');s=open(p,encoding='utf8').read()
old=""" rulers:J('rulers.json'),houses:J('houses.json'),house_entities:J('house_entities.json'),
 version:J('version.json')}};"""
new=""" rulers:J('rulers.json'),houses:J('houses.json'),house_entities:J('house_entities.json'),
 version:J('version.json'),art:J('art.json'),music:J('music.json')}};"""
assert old in s;s=s.replace(old,new,1)
old2="""'consequences','dynasty','options','engine'].forEach"""
new2="""'consequences','dynasty','options','art','audio','engine'].forEach"""
assert old2 in s;s=s.replace(old2,new2,1)
s=s.replace("""console.log(bad?'\\n❌ '+bad+' 项失败':'\\n✅ 全部自检通过');""",
"""console.log('=== v1.2 声与色 ===');
ck(!!W.art&&!!W.audio,'美术与音乐模块已挂载');
ck(D.art.motifs.length===12&&Object.keys(D.art.scenes).length===8,'纹样 12 / 场景 8');
ck(D.music.scales.length===8&&Object.keys(D.music.cues).length===11,'调式 8 / 音效 11');
const ao={year:750,reg:'aegean',era:3,vol:2,label:'卷 2'};
ck(W.art.banner(ao)===W.art.banner(ao),'插画确定性');
ck(W.art.scene('ending',ao).indexOf('NaN')<0,'场景无 NaN');
console.log(bad?'\\n❌ '+bad+' 项失败':'\\n✅ 全部自检通过');""",1)
open(p,'w',encoding='utf8').write(s);print('check_dynasty.js 已扩展')

# ── browser.test.js ──
p=os.path.join(ROOT,'test','browser.test.js');s=open(p,encoding='utf8').read()
old="""  const s4={tabs:await p.evaluate(()=>document.querySelectorAll('.tabs button').length),
    civProgress:civProgress,tl:tl,fam:fam};

  await p.reload({waitUntil:'load'});"""
new="""  const s4={tabs:await p.evaluate(()=>document.querySelectorAll('.tabs button').length),
    civProgress:civProgress,tl:tl,fam:fam};

  /* ---- v1.2 声与色：开局插画、设置面板、按本局配乐 ---- */
  const startArt=await p.evaluate(()=>({svg:document.querySelectorAll('.artwrap svg').length,
    scene:!!document.querySelector('.artscene'),snd:!!document.querySelector('[data-snd="toggle"]'),
    art:!!window.WQN.art,audio:!!window.WQN.audio}));
  await p.click('[data-t="set"]');
  const setAA=await p.evaluate(()=>({
    card:(document.querySelector('.panel.on')?.innerText||'').indexOf('声 与 色')>=0,
    selects:document.querySelectorAll('[data-snd-sel]').length,
    vol:document.querySelectorAll('[data-vol]').length,
    artBtn:document.querySelectorAll('[data-art]').length,
    scaleOpts:document.querySelectorAll('[data-snd-sel="scale"] option').length}));
  await p.click('[data-snd="auto"]');
  const aaOn=await p.evaluate(()=>({on:window.WQN.audio.status().on,
    cfg:window.WQN.audio.config(),svg:document.querySelectorAll('.artwrap svg').length}));
  await p.click('[data-art="0"]');
  const aaOff=await p.evaluate(()=>document.querySelectorAll('.artwrap .artsvg').length);
  await p.click('[data-art="1"]');
  await p.click('[data-t="main"]');
  const aa={startArt:startArt,set:setAA,on:aaOn,off:aaOff};

  await p.reload({waitUntil:'load'});"""
assert old in s;s=s.replace(old,new,1)
# s4 挂 aa
s=s.replace("""    civProgress:civProgress,tl:tl,fam:fam};""",
            """    civProgress:civProgress,tl:tl,fam:fam,aa:null};""",1)
s=s.replace("""  const aa={startArt:startArt,set:setAA,on:aaOn,off:aaOff};

  await p.reload""",
            """  s4.aa={startArt:startArt,set:setAA,on:aaOn,off:aaOff};

  await p.reload""",1)
old3="""    &&s4.fam.localLayer&&s4.fam.localLayer.btn&&s4.fam.localLayer.list"""
new3="""    &&s4.aa.startArt.svg>=2&&s4.aa.startArt.scene&&s4.aa.startArt.snd
    &&s4.aa.startArt.art&&s4.aa.startArt.audio
    &&s4.aa.set.card&&s4.aa.set.selects===3&&s4.aa.set.vol===3
    &&s4.aa.set.artBtn===2&&s4.aa.set.scaleOpts===9
    &&s4.aa.on.on&&s4.aa.on.cfg&&s4.aa.on.svg>=2&&s4.aa.off===0
    &&s4.fam.localLayer&&s4.fam.localLayer.btn&&s4.fam.localLayer.list"""
assert old3 in s;s=s.replace(old3,new3,1)
open(p,'w',encoding='utf8').write(s);print('browser.test.js 已扩展')

# ── review.test.js ──
p=os.path.join(ROOT,'test','review.test.js');s=open(p,encoding='utf8').read()
old="""    houses: window.WQN.data.houses.houses.length,
    verify: window.__WQN_VERIFY__ && window.__WQN_VERIFY__.ok"""
new="""    houses: window.WQN.data.houses.houses.length,
    verify: window.__WQN_VERIFY__ && window.__WQN_VERIFY__.ok,
    art: !!window.WQN.art,
    audio: !!window.WQN.audio,
    motifs: window.WQN.data.art.motifs.length,
    scenes: Object.keys(window.WQN.data.art.scenes).length,
    scales: window.WQN.data.music.scales.length,
    cues: Object.keys(window.WQN.data.music.cues).length,
    svg: document.querySelectorAll('.artwrap svg').length,
    sndBtn: !!document.querySelector('[data-snd="toggle"]')"""
assert old in s;s=s.replace(old,new,1)
old2="""  ck(boot.civ === 2199 && boot.quiz === 312 && boot.houses === 153, '考据内容未删减');"""
new2="""  ck(boot.civ === 2199 && boot.quiz === 312 && boot.houses === 153, '考据内容未删减');
  ck(boot.art && boot.audio && boot.svg >= 2 && boot.sndBtn, '送审版保留美术与音乐界面');
  ck(boot.motifs === 12 && boot.scenes === 8 && boot.scales === 8 && boot.cues === 11,
    '送审版美术音乐数据未删减');"""
assert old2 in s;s=s.replace(old2,new2,1)
# 在开局前点一次声音开关
old3="""  console.log('=== 送审版可玩性 ===');
  await p.click('[data-reg="huaxia"]');"""
new3="""  console.log('=== 送审版可玩性 ===');
  await p.click('[data-snd="toggle"]');
  const aaOn = await p.evaluate(() => window.WQN.audio.status().on);
  ck(aaOn === true, '送审版声音开关可用');
  await p.click('[data-reg="huaxia"]');"""
assert old3 in s;s=s.replace(old3,new3,1)
open(p,'w',encoding='utf8').write(s);print('review.test.js 已扩展')
