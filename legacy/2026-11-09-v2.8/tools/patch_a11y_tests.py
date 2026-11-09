# -*- coding: utf-8 -*-
"""v1.3：四套既有回归补分路声音、朗读、语音与读屏断言。"""
import os
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

for fn in ['test/logic.test.js','tools/check_dynasty.js']:
    p=os.path.join(ROOT,fn);s=open(p,encoding='utf8').read()
    old="""'art','audio','engine'].forEach"""
    assert old in s,fn;s=s.replace(old,"""'art','audio','a11y','engine'].forEach""",1)
    open(p,'w',encoding='utf8').write(s);print(fn,'已挂 a11y 模块')

# ── logic.test.js：追加 run ──
p=os.path.join(ROOT,'test','logic.test.js');s=open(p,encoding='utf8').read()
mark="\n\nconsole.log(fails.length?"
assert mark in s
add="""
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
"""
s=s.replace(mark,add+mark,1)
open(p,'w',encoding='utf8').write(s);print('logic.test.js 已扩展')

# ── check_dynasty.js：追加 ck ──
p=os.path.join(ROOT,'tools','check_dynasty.js');s=open(p,encoding='utf8').read()
s=s.replace("""console.log(bad?'\\n❌ '+bad+' 项失败':'\\n✅ 全部自检通过');""",
"""console.log('=== v1.3 分路声音与无障碍 ===');
W.audio.set('on',false);W.audio.set('sfx',true);
ck(W.audio.status().sfx===true&&W.audio.status().bgm===false,'音效与背景音互不串扰');
W.audio.set('bgm',true);W.audio.set('sfx',false);
ck(W.audio.status().bgm===true&&W.audio.status().on===true,'只关音效时背景音仍在');
ck(!!W.a11y&&W.a11y.parseCommand('选三').i===3,'语音命令解析可用');
ck(!!W.a11y&&W.a11y.privacy.indexOf('不上传')>=0,'隐私说明在册');
console.log(bad?'\\n❌ '+bad+' 项失败':'\\n✅ 全部自检通过');""",1)
open(p,'w',encoding='utf8').write(s);print('check_dynasty.js 已扩展')

# ── browser.test.js ──
p=os.path.join(ROOT,'test','browser.test.js');s=open(p,encoding='utf8').read()
old="""  s4.aa={startArt:startArt,set:setAA,on:aaOn,off:aaOff};

  await p.reload({waitUntil:'load'});"""
new="""  s4.aa={startArt:startArt,set:setAA,on:aaOn,off:aaOff};

  /* ---- v1.3 分路声音、朗读、语音、读屏 ---- */
  await p.click('[data-t="set"]');
  const a13=await p.evaluate(()=>({
    two:(document.querySelector('.panel.on')?.innerText||'').indexOf('两 路 独 立')>=0,
    sfxOn:!!document.querySelector('[data-snd="sfx-on"]'),
    bgmOff:!!document.querySelector('[data-snd="bgm-off"]'),
    a11yCard:(document.querySelector('.panel.on')?.innerText||'').indexOf('朗 读 · 语 音')>=0,
    rate:document.querySelectorAll('[data-rate]').length,
    verb:document.querySelectorAll('[data-verb]').length,
    a11yBtns:document.querySelectorAll('[data-a11y]').length,
    skip:!!document.querySelector('.skip'),
    live:document.getElementById('a11yLive')?.getAttribute('aria-live'),
    main:document.getElementById('app')?.getAttribute('role'),
    tabRole:document.querySelector('.tabs button')?.getAttribute('role'),
    artHidden:document.querySelector('.artsvg')?.getAttribute('aria-hidden'),
    optAria:(document.querySelector('[data-i]')?.getAttribute('aria-label')||'').length,
    mounted:window.WQN.a11y?.status().mounted,
    cmd:window.WQN.a11y?.parseCommand('收卷')?.act,
    split:window.WQN.audio?.status().sfx!==window.WQN.audio?.status().bgm
  }));
  /* 只开背景音，验证两路不会串；再点试读不报错 */
  await p.click('[data-snd="sfx-off"]');
  await p.click('[data-snd="bgm-on"]');
  const split=await p.evaluate(()=>({sfx:window.WQN.audio.status().sfx,
    bgm:window.WQN.audio.status().bgm,on:window.WQN.audio.status().on}));
  await p.click('[data-a11y="try"]');
  await p.evaluate(()=>document.dispatchEvent(new KeyboardEvent('keydown',{key:'?',bubbles:true})));
  await p.waitForTimeout(100);
  const kb=await p.evaluate(()=>({read:window.WQN.a11y.status().read,
    live:(document.getElementById('a11yLive')?.textContent||'').length}));
  await p.click('[data-t="main"]');
  s4.a13=Object.assign({},a13,{split:split,kb:kb});

  await p.reload({waitUntil:'load'});"""
assert old in s;s=s.replace(old,new,1)
old2="""    &&s4.aa.on.on&&s4.aa.on.cfg&&s4.aa.on.svg>=2&&s4.aa.off===0"""
new2="""    &&s4.aa.on.on&&s4.aa.on.cfg&&s4.aa.on.svg>=2&&s4.aa.off===0
    &&s4.a13.two&&s4.a13.sfxOn&&s4.a13.bgmOff&&s4.a13.a11yCard
    &&s4.a13.rate===3&&s4.a13.verb===2&&s4.a13.a11yBtns>=8
    &&s4.a13.skip&&s4.a13.live==='polite'&&s4.a13.main==='main'
    &&s4.a13.tabRole==='tab'&&s4.a13.artHidden==='true'&&s4.a13.optAria>10
    &&s4.a13.mounted===true&&s4.a13.cmd==='scroll'
    &&s4.a13.split.sfx===false&&s4.a13.split.bgm===true&&s4.a13.split.on===true
    &&s4.a13.kb.read===true&&s4.a13.kb.live>10"""
assert old2 in s;s=s.replace(old2,new2,1)
open(p,'w',encoding='utf8').write(s);print('browser.test.js 已扩展')

# ── review.test.js ──
p=os.path.join(ROOT,'test','review.test.js');s=open(p,encoding='utf8').read()
old="""    sndBtn: !!document.querySelector('[data-snd="toggle"]')"""
new="""    sndBtn: !!document.querySelector('[data-snd="toggle"]'),
    sfxBtn: !!document.querySelector('[data-snd="sfx"]'),
    bgmBtn: !!document.querySelector('[data-snd="bgm"]'),
    readBtn: !!document.querySelector('[data-read]'),
    a11y: !!window.WQN.a11y,
    live: document.getElementById('a11yLive')?.getAttribute('aria-live'),
    skip: !!document.querySelector('.skip'),
    artHidden: document.querySelector('.artsvg')?.getAttribute('aria-hidden')"""
assert old in s;s=s.replace(old,new,1)
old2="""  ck(boot.motifs === 12 && boot.scenes === 8 && boot.scales === 8 && boot.cues === 11,
    '送审版美术音乐数据未删减');"""
new2="""  ck(boot.motifs === 12 && boot.scenes === 8 && boot.scales === 8 && boot.cues === 11,
    '送审版美术音乐数据未删减');
  ck(boot.sfxBtn && boot.bgmBtn && boot.readBtn && boot.a11y,
    '送审版保留分路声音与朗读入口');
  ck(boot.live === 'polite' && boot.skip && boot.artHidden === 'true',
    '送审版保留读屏结构');"""
assert old2 in s;s=s.replace(old2,new2,1)
old3="""  const aaOn = await p.evaluate(() => window.WQN.audio.status().on);
  ck(aaOn === true, '送审版声音开关可用');"""
new3="""  const aaOn = await p.evaluate(() => window.WQN.audio.status().on);
  ck(aaOn === true, '送审版声音开关可用');
  await p.click('[data-snd="sfx"]');
  const sp = await p.evaluate(() => ({sfx:window.WQN.audio.status().sfx,
    bgm:window.WQN.audio.status().bgm}));
  ck(sp.sfx === false && sp.bgm === false, '送审版两路开关独立生效');
  await p.click('[data-snd="bgm"]');"""
assert old3 in s;s=s.replace(old3,new3,1)
open(p,'w',encoding='utf8').write(s);print('review.test.js 已扩展')
