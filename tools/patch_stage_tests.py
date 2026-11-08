# -*- coding: utf-8 -*-
"""v1.4：既有回归补 AVG 舞台、天气环境音与分块内嵌断言。"""
import os
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# ── 数据/模块挂载：logic.test.js 与 check_dynasty.js ──
for fn in ['test/logic.test.js','tools/check_dynasty.js']:
    p=os.path.join(ROOT,fn);s=open(p,encoding='utf8').read()
    if "character:J('character.json')" not in s:
        s=s.replace("""version:J('version.json'),art:J('art.json'),music:J('music.json')}};""",
                    """version:J('version.json'),art:J('art.json'),music:J('music.json'),
 character:J('character.json')}};""",1)
        # check_dynasty 的结尾是 }}}; 形式，单独兜底
        if "character:J('character.json')" not in s:
            s=s.replace("""version:J('version.json'),art:J('art.json'),music:J('music.json')}};""",
                        """version:J('version.json'),art:J('art.json'),music:J('music.json'),character:J('character.json')}};""",1)
    old="""'art','audio','a11y','engine'].forEach"""
    if old in s:s=s.replace(old,"""'art','audio','a11y','stage','engine'].forEach""",1)
    open(p,'w',encoding='utf8').write(s);print(fn,'已挂 character/stage')

# ── logic.test.js 追加 run ──
p=os.path.join(ROOT,'test','logic.test.js');s=open(p,encoding='utf8').read()
mark="\n\nconsole.log(fails.length?"
assert mark in s
add="""
run('v1.4 AVG 舞台：分块内嵌、天气确定性、姿势贴合与朗读默认关',()=>{
  const X=W.stage,C=W.data.character;
  assert.ok(X&&C,'舞台模块或角色数据未挂载');
  assert.strictEqual(Object.keys(C.layers).length,9,'角色层不是 9');
  const flat=v=>Array.isArray(v)?v.join(''):v;
  assert.ok(flat(C.bg).indexOf('data:image/jpeg;base64,')===0,'背景板 URI 不对');
  assert.ok(flat(C.layers.neutral).indexOf('data:image/webp;base64,')===0,'角色层 URI 不对');
  const S1={reg:'huaxia',turn:1,vol:{n:1},phase:'choice',cur:{opts:[]}};
  assert.strictEqual(X.weatherOf(S1),X.weatherOf(S1),'天气不确定');
  assert.strictEqual(X.poseOf(null,'sun'),'wave','开局姿势不对');
  assert.strictEqual(X.poseOf({phase:'choice',cur:{opts:[{debate:true}]}},'sun'),'think');
  assert.strictEqual(X.poseOf({phase:'choice',cur:{opts:[]}},'rain'),'rain');
  const h=X.stageHTML(S1,{tools:'<b>t</b>'});
  assert.ok(h.indexOf('stage-char')>=0&&h.indexOf('class="bubble"')>=0,'舞台结构不全');
  assert.ok(W.audio.getWeather&&W.audio.setWeather,'缺天气环境音接口');
  W.audio.setWeather('rain');assert.strictEqual(W.audio.getWeather(),'rain');
  const a=require('fs').readFileSync(require('path').join(ROOT,'src','a11y.js'),'utf8');
  assert.ok(/DEF=\\{read:false,autoRead:false/.test(a),'朗读未默认关闭');
  console.log('    样本：9 层 / 1 背景板 · 天气 4 类 · 姿势 9 种');
});
"""
s=s.replace(mark,add+mark,1);open(p,'w',encoding='utf8').write(s);print('logic.test.js 已扩展')

# ── check_dynasty.js 追加 ck ──
p=os.path.join(ROOT,'tools','check_dynasty.js');s=open(p,encoding='utf8').read()
s=s.replace("""console.log(bad?'\\n❌ '+bad+' 项失败':'\\n✅ 全部自检通过');""",
"""console.log('=== v1.4 AVG 舞台 ===');
ck(!!W.stage&&Object.keys(D.character.layers).length===9,'舞台 9 层角色已挂载');
const _flat=v=>Array.isArray(v)?v.join(''):v;
ck(_flat(D.character.bg).indexOf('data:image/jpeg;base64,')===0,'背景板分块还原可用');
ck(W.stage.weatherOf({reg:'huaxia',turn:1,vol:{n:1},phase:'choice',cur:{}})===
   W.stage.weatherOf({reg:'huaxia',turn:1,vol:{n:1},phase:'choice',cur:{}}),'天气确定性');
ck(W.stage.poseOf({phase:'volume'},'sun')==='happy','卷末姿势贴合');
ck(W.audio.setWeather('sun')===true&&W.audio.getWeather()==='sun','天气环境音可切换');
console.log(bad?'\\n❌ '+bad+' 项失败':'\\n✅ 全部自检通过');""",1)
open(p,'w',encoding='utf8').write(s);print('check_dynasty.js 已扩展')

# ── art_audio.test.js：底噪 6 → 7 ──
p=os.path.join(ROOT,'test','art_audio.test.js');s=open(p,encoding='utf8').read()
s=s.replace("""  assert.strictEqual(U.beds.length,6,'底噪不是 6');""",
            """  assert.strictEqual(U.beds.length,7,'底噪不是 7（v1.4 加鸟鸣）');""",1)
s=s.replace("""  assert.strictEqual(J('music.json').scales.length,8,'调式不是 8');""",
            """  assert.strictEqual(J('music.json').scales.length,8,'调式不是 8');""",1)
open(p,'w',encoding='utf8').write(s);print('art_audio.test.js 已改 beds')

# ── browser.test.js ──
p=os.path.join(ROOT,'test','browser.test.js');s=open(p,encoding='utf8').read()
old="""  const startArt=await p.evaluate(()=>({svg:document.querySelectorAll('.artwrap svg').length,
    scene:!!document.querySelector('.artscene'),snd:!!document.querySelector('[data-snd="toggle"]'),
    art:!!window.WQN.art,audio:!!window.WQN.audio}));"""
new="""  const startArt=await p.evaluate(()=>({svg:document.querySelectorAll('.artwrap svg').length,
    scene:!!document.querySelector('.artscene'),snd:!!document.querySelector('[data-snd="toggle"]'),
    art:!!window.WQN.art,audio:!!window.WQN.audio,
    stage:!!document.querySelector('.stage'),
    charLoaded:(()=>{const i=document.querySelector('.stage-char');return !!(i&&i.complete&&i.naturalWidth>0)})(),
    bubble:(document.querySelector('.bubble .say')?.textContent||'').length,
    pose:document.querySelector('.stage')?.dataset.pose,
    weather:document.querySelector('.stage')?.dataset.weather}));"""
assert old in s;s=s.replace(old,new,1)

# 在 v1.3 段之后插入 v1.4 采集
old2="""  await p.click('[data-t="main"]');
  s4.a13=Object.assign({},a13,{split:split,kb:kb});

  await p.reload({waitUntil:'load'});"""
new2="""  await p.click('[data-t="main"]');
  s4.a13=Object.assign({},a13,{split:split,kb:kb});

  /* ---- v1.4 AVG 舞台 ---- */
  const a14=await p.evaluate(()=>({
    stage:!!document.querySelector('.stage'),
    bg:(document.querySelector('.stage-bg')?.src||'').indexOf('data:image/jpeg;base64,')===0,
    char:(document.querySelector('.stage-char')?.src||'').indexOf('data:image/webp;base64,')===0,
    charLoaded:(()=>{const i=document.querySelector('.stage-char');return !!(i&&i.complete&&i.naturalWidth===480)})(),
    contain:(()=>{const i=document.querySelector('.stage-char');
      if(!i)return false;const r=i.getBoundingClientRect(),s=document.querySelector('.stage').getBoundingClientRect();
      return r.height<=s.height+1&&r.width<=s.width+1;})(),
    bubble:(document.querySelector('.bubble .say')?.textContent||'').length>4,
    wx:!!document.querySelector('.wx'),
    tools:document.querySelectorAll('.stage-tools [data-snd]').length,
    weather:document.querySelector('.stage')?.dataset.weather,
    pose:document.querySelector('.stage')?.dataset.pose,
    layers:Object.keys(window.WQN.data.character.layers).length,
    holesZero:JSON.stringify(window.WQN.data.character.meta.verify).indexOf('均为 0')>=0
  }));
  await p.click('[data-t="set"]');
  const a14set=await p.evaluate(()=>({
    card:document.body.innerText.indexOf('舞 台 · 哈 士 喵')>=0,
    stageBtns:document.querySelectorAll('[data-stage]').length,
    bubbleBtns:document.querySelectorAll('[data-bubble]').length,
    readDefault:window.WQN.a11y.status().read===false,
    autoDefault:window.WQN.a11y.status().autoRead===false}));
  await p.click('[data-stage="0"]');
  const a14off=await p.evaluate(()=>document.querySelectorAll('.stage').length);
  await p.click('[data-stage="1"]');
  const a14on=await p.evaluate(()=>document.querySelectorAll('.stage').length);
  s4.a14=Object.assign({},a14,{set:a14set,off:a14off,on:a14on});

  await p.reload({waitUntil:'load'});"""
assert old2 in s;s=s.replace(old2,new2,1)

old3="""    &&s4.aa.startArt.svg>=2&&s4.aa.startArt.scene&&s4.aa.startArt.snd
    &&s4.aa.startArt.art&&s4.aa.startArt.audio"""
new3="""    &&(s4.aa.startArt.svg>=2||s4.aa.startArt.stage)&&s4.aa.startArt.snd
    &&s4.aa.startArt.art&&s4.aa.startArt.audio
    &&(s4.aa.startArt.scene||s4.aa.startArt.stage)
    &&s4.aa.startArt.charLoaded&&s4.aa.startArt.bubble>4"""
assert old3 in s;s=s.replace(old3,new3,1)
old4="""    &&s4.a13.kb.read===true&&s4.a13.kb.live>10"""
new4="""    &&s4.a13.kb.read===true&&s4.a13.kb.live>10
    &&s4.a14.stage&&s4.a14.bg&&s4.a14.char&&s4.a14.charLoaded
    &&s4.a14.contain&&s4.a14.bubble&&s4.a14.wx&&s4.a14.tools===3
    &&s4.a14.layers===9&&s4.a14.holesZero
    &&s4.a14.set.card&&s4.a14.set.stageBtns===2&&s4.a14.set.bubbleBtns===2
    &&s4.a14.set.readDefault&&s4.a14.set.autoDefault
    &&s4.a14.off===0&&s4.a14.on===1"""
assert old4 in s;s=s.replace(old4,new4,1)
open(p,'w',encoding='utf8').write(s);print('browser.test.js 已扩展')

# ── review.test.js ──
p=os.path.join(ROOT,'test','review.test.js');s=open(p,encoding='utf8').read()
old="""    artHidden: document.querySelector('.artsvg')?.getAttribute('aria-hidden')"""
new="""    artHidden: document.querySelector('.artsvg')?.getAttribute('aria-hidden'),
    stage: !!document.querySelector('.stage'),
    stageBg: (document.querySelector('.stage-bg')?.src||'').indexOf('data:image/jpeg;base64,')===0,
    stageChar: (document.querySelector('.stage-char')?.src||'').indexOf('data:image/webp;base64,')===0,
    stageLayers: Object.keys(window.WQN.data.character.layers).length,
    bubble: (document.querySelector('.bubble .say')?.textContent||'').length>4"""
assert old in s;s=s.replace(old,new,1)
old2="""  ck(boot.live === 'polite' && boot.skip && boot.artHidden === 'true',
    '送审版保留读屏结构');"""
new2="""  ck(boot.live === 'polite' && boot.skip && boot.artHidden === 'true',
    '送审版保留读屏结构');
  ck(boot.stage && boot.stageBg && boot.stageChar && boot.stageLayers === 9 && boot.bubble,
    '送审版保留 AVG 舞台与角色层');"""
assert old2 in s;s=s.replace(old2,new2,1)
open(p,'w',encoding='utf8').write(s);print('review.test.js 已扩展')
