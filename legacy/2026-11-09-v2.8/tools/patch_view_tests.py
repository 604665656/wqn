# -*- coding: utf-8 -*-
"""v1.5：19 层、30 关、视图按键、呼吸、角色音色的回归断言。"""
import os
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P=lambda *x:os.path.join(ROOT,*x)

# ── 挂载 asset_plan ──
for fn in ['test/logic.test.js','test/stage.test.js','tools/check_dynasty.js']:
    p=P(fn);s=open(p,encoding='utf8').read()
    if "asset_plan:J('asset_plan.json')" not in s and "asset_plan:J('asset_plan.json')" not in s:
        # logic / dynasty
        if "character:J('character.json')" in s:
            s=s.replace("character:J('character.json')",
                        "character:J('character.json'),asset_plan:J('asset_plan.json')",1)
        # stage.test.js 用的是 WQN.data 直接赋值
        if "character:J('character.json')" in s:
            pass
    open(p,'w',encoding='utf8').write(s)
    print(fn,'asset_plan 检查')

# stage.test.js 单独挂（它的 globalThis.WQN.data 写法不同）
p=P('test','stage.test.js');s=open(p,encoding='utf8').read()
s=s.replace("""globalThis.WQN={data:{character:J('character.json'),music:J('music.json'),art:J('art.json')}};""",
"""globalThis.WQN={data:{character:J('character.json'),music:J('music.json'),art:J('art.json'),
  asset_plan:J('asset_plan.json')}};""",1)
open(p,'w',encoding='utf8').write(s);print('stage.test.js 已挂')

# ── poseOf 返回对象：所有断言加 .pose ──
for fn in ['test/stage.test.js','test/logic.test.js','tools/check_dynasty.js']:
    p=P(fn);s=open(p,encoding='utf8').read()
    import re
    # 只改与字符串比较的 poseOf 调用
    for obj in ['S.poseOf','X.poseOf','W.stage.poseOf']:
        pat=re.compile(r'('+re.escape(obj)+r'\([^;]*?\))(\s*(?:===|==)\s*[\'"])')
        s,n=pat.subn(r'\1.pose\2',s)
        if n:print(fn,obj,'→ .pose ×',n)
    # 形态：assert.strictEqual(S.poseOf(...),'wave',...)
    for obj in ['S.poseOf','X.poseOf','W.stage.poseOf']:
        pat=re.compile(r'('+re.escape(obj)+r'\([^,]*?\)),\s*([\'"])([a-z]+)\2')
        s,n=pat.subn(r'\1.pose, \2\3\2',s)
        if n:print(fn,obj,'strictEqual → .pose ×',n)
    open(p,'w',encoding='utf8').write(s)

# ── 数值 9 → 19 ──
for fn in ['test/logic.test.js','test/browser.test.js','test/review.test.js','tools/check_dynasty.js']:
    p=P(fn);s=open(p,encoding='utf8').read()
    s=s.replace("Object.keys(C.layers).length,9,'角色层不是 9'","Object.keys(C.layers).length,19,'角色层不是 19'")
    s=s.replace("Object.keys(D.character.layers).length===9,'舞台 9 层角色已挂载'",
                "Object.keys(D.character.layers).length===19,'舞台 19 层角色已挂载'")
    s=s.replace("s4.a14.layers===9","s4.a14.layers===19")
    s=s.replace("boot.stageLayers === 9","boot.stageLayers === 19")
    open(p,'w',encoding='utf8').write(s);print(fn,'9→19')

# ── stage.test.js 全面扩容 ──
p=P('test','stage.test.js');s=open(p,encoding='utf8').read()
s=s.replace("""  assert.strictEqual(keys.length,9,'角色层不是 9');
  ['neutral','think','happy','surprise','sad','read','wave','rain','sun']
    .forEach(k=>assert.ok(keys.indexOf(k)>=0,'缺 '+k));""",
"""  assert.strictEqual(keys.length,19,'角色层不是 19');
  ['neutral','think','happy','surprise','sad','read','wave','rain','sun',
   'scroll','decree','compass','count','lamp','snow','sand','move','harvest','cheer']
    .forEach(k=>assert.ok(keys.indexOf(k)>=0,'缺 '+k));""",1)
s=s.replace("""  assert.strictEqual(Object.keys(r).length,9,'报告不是 9 层');""",
            """  assert.strictEqual(Object.keys(r).length,19,'报告不是 19 层');""",1)
s=s.replace("""  console.log('    样本：9/9 holes=0，单层 '+(r.neutral.size/1024).toFixed(1)+' KB');""",
            """  console.log('    样本：19/19 holes=0，单层 '+(r.neutral.size/1024).toFixed(1)+' KB');""",1)
s=s.replace("""run('9 层 + 1 背景板齐备，分块还原后是合法 data URI'""",
            """run('19 层 + 1 背景板齐备，分块还原后是合法 data URI'""",1)
s=s.replace("""run('九层孔洞数均为 0、叠背景板后品红残留为 0'""",
            """run('十九层孔洞数均为 0、叠背景板后品红残留为 0'""",1)
s=s.replace("""  assert.ok(set.size>=3,'天气种类过少：'+[...set].join('/'));
  console.log('    样本：8 卷 × 14 段覆盖 '+[...set].join('/'));""",
"""  assert.ok(set.size>=4,'天气种类过少：'+[...set].join('/'));
  console.log('    样本：8 卷 × 14 段覆盖 '+[...set].join('/'));""",1)
s=s.replace("""    const h=S.stageHTML(st);
    assert.ok(h.indexOf('class=\"wx')>=0,'缺天气层');""",
"""    const h=S.stageHTML(st);
    assert.ok(h.indexOf('class=\"wx')>=0,'缺天气层');""",1)

# 追加 v1.5 段
mark="\nconsole.log(fails?"
assert mark in s
add=r"""
console.log('=== v1.5 表演关卡 / 呼吸 / 视图 ===');
run('30 个表演关卡：19 解锁、11 锁住，锁住项列明缺哪几层',()=>{
  const sc=S.sceneList(),P=globalThis.WQN.data.asset_plan;
  assert.strictEqual(sc.length,30,'关卡不是 30');
  assert.strictEqual(sc.filter(x=>x.ready).length,19,'解锁数不对');
  assert.strictEqual(sc.filter(x=>!x.ready).length,11,'锁住数不对');
  sc.filter(x=>!x.ready).forEach(x=>assert.ok(x.missing.length>0,x.key+' 没列缺层'));
  assert.strictEqual(P.pending.length,12,'待补层不是 12');
  assert.ok(P.breathingPlan&&P.breathingPlan.next.indexOf('breath_in')>=0,'缺呼吸感图片生成计划');
  console.log('    样本：'+sc.length+' 关 / 待补 '+P.pending.length+' 层');
});
run('锁住的关卡回退平静层，并在舞台上标 data-locked',()=>{
  const row=S.sceneByKey('rites');
  assert.ok(row&&!row.ready,'礼乐关未锁');
  const st={reg:'huaxia',turn:1,vol:{n:1},phase:'choice',cur:{opts:[]}};
  const h=S.stageHTML(st);
  assert.ok(h.indexOf('data-locked="1"')>=0||h.indexOf('data-locked="0"')>=0,'缺 locked 标记');
  assert.ok(h.indexOf('data-scene=')>=0,'缺关卡标记');
  assert.ok(h.indexOf('undefined')<0,'HTML 含脏值');
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
   'bub-light','bub-solid','bub-normal','.opts{max-height:none'].forEach(x=>
    assert.ok(css.indexOf(x)>=0,'缺 '+x));
  assert.deepStrictEqual(Object.keys(S.SIZES),['compact','normal','immersive']);
});
run('设置卡可精简折叠、选项不截断、工具条图标化',()=>{
  const css=fs.readFileSync(path.join(ROOT,'src','style.css'),'utf8');
  const ui=fs.readFileSync(path.join(ROOT,'src','ui.js'),'utf8');
  ['.setbar','.foldbtn','.card.folded','.stage-tools .sndbtn span{display:none}',
   '.viewtools','.vbtn'].forEach(x=>assert.ok(css.indexOf(x)>=0,'CSS 缺 '+x));
  assert.ok(css.indexOf('white-space:normal')>=0,'选项文字会被截断');
  ['data-view="landscape"','data-view="full"','data-view="opts"',
   'data-setmin','data-fold','applySetCards','KEEP='].forEach(x=>
    assert.ok(ui.indexOf(x)>=0,'UI 缺 '+x));
});
run('角色音色：speakAs / guideVoices / 语气音接口齐备，朗读仍默认关',()=>{
  const a=fs.readFileSync(path.join(ROOT,'src','a11y.js'),'utf8');
  const au=fs.readFileSync(path.join(ROOT','src','audio.js').replace("','","','"),'utf8') ;
});
"""
# 上面最后一段有笔误，替换成正确版本
add=add.replace("""run('角色音色：speakAs / guideVoices / 语气音接口齐备，朗读仍默认关',()=>{
  const a=fs.readFileSync(path.join(ROOT,'src','a11y.js'),'utf8');
  const au=fs.readFileSync(path.join(ROOT','src','audio.js').replace("','","','"),'utf8') ;
});""",
"""run('角色音色：speakAs / guideVoices / 语气音接口齐备，朗读仍默认关',()=>{
  const a=fs.readFileSync(path.join(ROOT,'src','a11y.js'),'utf8');
  const au=fs.readFileSync(path.join(ROOT,'src','audio.js'),'utf8');
  const st=fs.readFileSync(path.join(ROOT,'src','stage.js'),'utf8');
  ['speakAs','guideVoices','role===\\'guide\\'','force:true','pitch','念这句']
    .forEach(x=>assert.ok(a.indexOf(x)>=0,'a11y 缺 '+x));
  ['guideCue','glide'].forEach(x=>assert.ok(au.indexOf(x)>=0,'audio 缺 '+x));
  ['speakLine','guideCue','bgURL'].forEach(x=>assert.ok(st.indexOf(x)>=0,'stage 缺 '+x));
  assert.ok(/DEF=\\{read:false,autoRead:false/.test(a),'朗读未默认关闭');
  assert.ok(S.status().voicePack&&S.status().voicePack.notDubbing,'缺语音包诚实说明');
});""")
s=s.replace(mark,add+mark,1)
open(p,'w',encoding='utf8').write(s);print('stage.test.js 扩容完成')

# ── logic.test.js 追加 v1.5 run ──
p=P('test','logic.test.js');s=open(p,encoding='utf8').read()
mark="\n\nconsole.log(fails.length?"
assert mark in s
add=r"""
run('v1.5 表演关卡登记、视图设置与角色音色',()=>{
  const X=W.stage,P=W.data.asset_plan;
  assert.ok(P&&P.scenes.length===30,'关卡表未挂载或不是 30 关');
  assert.strictEqual(X.status().ready,19);
  assert.strictEqual(X.status().locked,11);
  assert.strictEqual(P.pending.length,12);
  assert.ok(P.breathingPlan&&P.breathingPlan.next,'缺呼吸感图片生成计划');
  assert.deepStrictEqual(Object.keys(X.SIZES),['compact','normal','immersive']);
  X.set('size','compact');assert.strictEqual(X.status().size,'compact');
  X.set('size','normal');
  assert.ok(W.a11y.speakAs&&W.a11y.guideVoices,'缺角色音色接口');
  assert.ok(W.audio.guideCue,'缺语气音接口');
  const row=X.sceneByKey('rites');
  assert.ok(row&&!row.ready&&row.missing.indexOf('bell')>=0,'礼乐关未锁或未列缺层');
  console.log('    样本：30 关 / 19 解锁 / 11 锁住 / 待补 12 层');
});
"""
s=s.replace(mark,add+mark,1);open(p,'w',encoding='utf8').write(s);print('logic.test.js 已扩展')

# ── check_dynasty.js 追加 ──
p=P('tools','check_dynasty.js');s=open(p,encoding='utf8').read()
s=s.replace("""console.log(bad?'\\n❌ '+bad+' 项失败':'\\n✅ 全部自检通过');""",
"""console.log('=== v1.5 视图与关卡 ===');
ck(!!D.asset_plan&&D.asset_plan.scenes.length===30,'表演关卡表 30 关已挂载');
ck(W.stage.status().ready===19&&W.stage.status().locked===11,'19 解锁 / 11 锁住');
ck(!!W.a11y.speakAs&&!!W.audio.guideCue,'角色音色与语气音接口齐备');
ck(Object.keys(W.stage.SIZES).length===3,'三档舞台尺寸');
console.log(bad?'\\n❌ '+bad+' 项失败':'\\n✅ 全部自检通过');""",1)
open(p,'w',encoding='utf8').write(s);print('check_dynasty 已扩展')

# ── browser.test.js：a14 扩容 + a15 段 ──
p=P('test','browser.test.js');s=open(p,encoding='utf8').read()
s=s.replace("""    holesZero:JSON.stringify(window.WQN.data.character.meta.verify).indexOf('均为 0')>=0
  }));""",
"""    holesZero:JSON.stringify(window.WQN.data.character.meta.verify).indexOf('均为 0')>=0,
    breath:getComputedStyle(document.querySelector('.stage-char')).animationName.indexOf('breathe')>=0,
    viewBtns:document.querySelectorAll('.viewtools .vbtn').length,
    bubbleVoice:!!document.querySelector('[data-guide="say"]')
  }));""",1)
old="""  await p.click('[data-stage="0"]');
  const a14off=await p.evaluate(()=>document.querySelectorAll('.stage').length);
  await p.click('[data-stage="1"]');
  const a14on=await p.evaluate(()=>document.querySelectorAll('.stage').length);
  s4.a14=Object.assign({},a14,{set:a14set,off:a14off,on:a14on});"""
new="""  await p.click('[data-stage="0"]');
  const a14off=await p.evaluate(()=>document.querySelectorAll('.stage').length);
  await p.click('[data-stage="1"]');
  const a14on=await p.evaluate(()=>document.querySelectorAll('.stage').length);
  s4.a14=Object.assign({},a14,{set:a14set,off:a14off,on:a14on});

  /* ---- v1.5 视图 / 关卡 / 音色 ---- */
  await p.click('[data-t="set"]');
  const a15set=await p.evaluate(()=>({
    setbar:!!document.querySelector('.setbar'),
    foldbtns:document.querySelectorAll('[data-fold]').length,
    sceneCard:document.body.textContent.indexOf('表 演 关 卡')>=0,
    lockedRows:document.querySelectorAll('.scenerow.locked').length,
    expectText:document.body.textContent.indexOf('敬请期待')>=0,
    voiceCard:document.body.textContent.indexOf('人 声 · 角 色 音 色')>=0,
    viewCard:document.body.textContent.indexOf('视 图 · 清 爽')>=0,
    sizeBtns:document.querySelectorAll('[data-stage-size]').length,
    bubBtns:document.querySelectorAll('[data-bubble-alpha]').length,
    guideBtns:document.querySelectorAll('[data-guide]').length,
    scenes:window.WQN.stage.status().scenes.length,
    ready:window.WQN.stage.status().ready,
    locked:window.WQN.stage.status().locked,
    pending:window.WQN.stage.status().pending.length
  }));
  await p.click('[data-setmin="1"]');
  const a15min=await p.evaluate(()=>[...document.querySelectorAll('.panel.on .card')]
    .filter(c=>c.style.display!=='none').length);
  await p.click('[data-setmin="0"]');
  const a15all=await p.evaluate(()=>[...document.querySelectorAll('.panel.on .card')]
    .filter(c=>c.style.display!=='none').length);
  await p.click('[data-fold="0"]');
  const a15fold=await p.evaluate(()=>document.querySelector('[data-set-card="0"]')
    ?.classList.contains('folded')===true);
  await p.click('[data-stage-size="compact"]');
  const a15compact=await p.evaluate(()=>({
    cls:document.querySelector('.stage')?.className||'',
    tab:window.WQN.ui.getTab(),
    optsMax:getComputedStyle(document.querySelector('.opts')).maxHeight
  }));
  await p.click('[data-view="landscape"]');
  const a15land=await p.evaluate(()=>document.documentElement.classList.contains('landscape'));
  await p.click('[data-view="full"]');
  const a15full=await p.evaluate(()=>({
    bgfull:document.documentElement.classList.contains('bgfull'),
    cls:document.querySelector('.stage')?.className||'',
    bgVar:getComputedStyle(document.documentElement).getPropertyValue('--stage-bg').indexOf('blob:')>=0
  }));
  s4.a15=Object.assign({},a15set,{min:a15min,all:a15all,fold:a15fold,
    compact:a15compact,land:a15land,full:a15full});"""
assert old in s;s=s.replace(old,new,1)
old2="""    &&s4.a14.off===0&&s4.a14.on===1"""
new2="""    &&s4.a14.off===0&&s4.a14.on===1
    &&s4.a14.layers===19&&s4.a14.breath&&s4.a14.viewBtns===3&&s4.a14.bubbleVoice
    &&s4.a15.setbar&&s4.a15.foldbtns>8&&s4.a15.sceneCard
    &&s4.a15.lockedRows===11&&s4.a15.expectText&&s4.a15.voiceCard&&s4.a15.viewCard
    &&s4.a15.sizeBtns===3&&s4.a15.bubBtns===3&&s4.a15.guideBtns>=4
    &&s4.a15.scenes===30&&s4.a15.ready===19&&s4.a15.locked===11&&s4.a15.pending===12
    &&s4.a15.min<s4.a15.all&&s4.a15.fold
    &&s4.a15.compact.cls.indexOf('sz-compact')>=0&&s4.a15.compact.tab==='main'
    &&s4.a15.compact.optsMax==='none'&&s4.a15.land&&s4.a15.full.bgfull&&s4.a15.full.bgVar"""
assert old2 in s;s=s.replace(old2,new2,1)
open(p,'w',encoding='utf8').write(s);print('browser.test.js 已扩展')

# ── review.test.js ──
p=P('test','review.test.js');s=open(p,encoding='utf8').read()
s=s.replace("""    bubble: (document.querySelector('.bubble .say')?.textContent||'').length>4,""",
"""    bubble: (document.querySelector('.bubble .say')?.textContent||'').length>4,
    viewBtns: document.querySelectorAll('.viewtools .vbtn').length,
    scenes: window.WQN.stage.status().scenes.length,
    locked: window.WQN.stage.status().locked,
    breath: getComputedStyle(document.querySelector('.stage-char')).animationName.indexOf('breathe')>=0,""",1)
s=s.replace("""  ck(boot.stage && boot.stageBg && boot.stageChar && boot.stageLayers === 19 && boot.bubble,
    '送审版保留 AVG 舞台与角色层');""",
"""  ck(boot.stage && boot.stageBg && boot.stageChar && boot.stageLayers === 19 && boot.bubble,
    '送审版保留 AVG 舞台与角色层');
  ck(boot.viewBtns === 3 && boot.scenes === 30 && boot.locked === 11 && boot.breath,
    '送审版保留横屏全屏按键、表演关卡与呼吸微表演');""",1)
open(p,'w',encoding='utf8').write(s);print('review.test.js 已扩展')

# ── art_audio.test.js ──
p=P('test','art_audio.test.js');s=open(p,encoding='utf8').read()
s=s.replace("""  assert.strictEqual(U.beds.length,7,'底噪不是 7（v1.4 加鸟鸣）');""",
"""  assert.strictEqual(U.beds.length,7,'底噪不是 7（v1.4 加鸟鸣）');
  assert.ok(typeof U.guideCue==='function','缺 v1.5 合成语气音接口');""",1)
open(p,'w',encoding='utf8').write(s);print('art_audio.test.js 已扩展')

# ── a11y.test.js ──
p=P('test','a11y.test.js');s=open(p,encoding='utf8').read()
mark="\nconsole.log(fails?"
if mark in s:
    add=r"""
run('v1.5 角色音色档与语气音命令',()=>{
  const A=globalThis.WQN.a11y;
  assert.ok(typeof A.speakAs==='function','缺 speakAs');
  assert.ok(typeof A.guideVoices==='function','缺 guideVoices');
  assert.ok(A.status().ttsVoices,'status 缺可用音色统计');
  const c1=A.parseCommand('念这句'),c2=A.parseCommand('好奇');
  assert.ok(c1&&c1.act==='guideSay','念这句未解析');
  assert.ok(c2&&c2.act==='guideCue'&&c2.k==='curious','语气音命令未解析');
  assert.ok(/DEF=\{read:false,autoRead:false/.test(
    require('fs').readFileSync(require('path').join(ROOT,'src','a11y.js'),'utf8')),'朗读未默认关闭');
});
"""
    s=s.replace(mark,add+mark,1);open(p,'w',encoding='utf8').write(s);print('a11y.test.js 已扩展')
else:print('a11y.test.js 标记未找到，跳过')
