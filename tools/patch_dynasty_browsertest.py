# -*- coding: utf-8 -*-
import os
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
p=os.path.join(ROOT,'test','browser.test.js');s=open(p,encoding='utf8').read()
def rep(old,new,tag):
    global s
    assert old in s,tag+' 未找到';s=s.replace(old,new,1);print('  ok',tag)

# 1 族谱页：名族对照
rep("""          roster:txt.indexOf('史 册 对 照')>=0,""",
    """          roster:txt.indexOf('史 册 对 照')>=0,
          houseRoster:txt.indexOf('名 族 对 照')>=0,""",'famPage houseRoster')

# 2 文明页：帝王／世家全册采集
rep("""        combos:window.WQN&&window.WQN.data&&window.WQN.data.consequences
          ?window.WQN.data.consequences.combos.length:0""",
    """        combos:window.WQN&&window.WQN.data&&window.WQN.data.consequences
          ?window.WQN.data.consequences.combos.length:0,
        dyRulerAll:(document.querySelector('.panel.on')?.textContent||'').indexOf('帝 王 全 册')>=0,
        dyHouseAll:(document.querySelector('.panel.on')?.textContent||'').indexOf('世 家 全 册')>=0,
        dyRulerGroups:document.querySelectorAll('.panel.on details[data-lz^="R:"]').length,
        dyHouseGroups:document.querySelectorAll('.panel.on details[data-lz^="H:"]').length,
        dyTitles:(document.querySelector('.panel.on')?.textContent||'').indexOf('称 谓 与 制 度 读 法')>=0,
        dyBoundaries:(document.querySelector('.panel.on')?.textContent||'').indexOf('世 家 边 界 读 法')>=0,
        dyRulerCount:window.WQN&&window.WQN.data&&window.WQN.data.rulers
          ?window.WQN.data.rulers.rulers.length:0,
        dyHouseCount:window.WQN&&window.WQN.data&&window.WQN.data.houses
          ?window.WQN.data.houses.houses.length:0""",'civ dynasty')

# 3 开局页：世家入口
rep("""  const s6=await p.evaluate(()=>({entities:document.querySelectorAll('[data-ent]').length,
    civCount:document.body.innerText.match(/文明条目\\s*(\\d+)/)?.[1]}));""",
    """  const s6=await p.evaluate(()=>({entities:document.querySelectorAll('[data-ent]').length,
    houses:document.querySelectorAll('[data-hse]').length,
    houseEntry:document.body.innerText.indexOf('代 入 世 家 浮 沉')>=0,
    civCount:document.body.innerText.match(/文明条目\\s*(\\d+)/)?.[1]}));""",'s6 house')

# 4 末尾新增：世家代入实测（放在困难模式之后，独立 goto，不影响前面状态）
old="""  console.log('困难模式     →',JSON.stringify(e8),JSON.stringify(e9),JSON.stringify(e10));"""
new="""  /* ---- F 世家代入：六阶段「散脉」线 ---- */
  await p.goto(FILE+'?new=1',{waitUntil:'load'});
  const h1=await p.evaluate(()=>({entry:!!document.querySelector('[data-act="newhouse"]'),
    n:document.querySelectorAll('[data-hse]').length,
    note:document.body.innerText.indexOf('门第政治位置')>=0}));
  await p.click('[data-hse="H01"]');
  await p.click('[data-act="newhouse"]');
  await p.waitForTimeout(100);
  const h2=await p.evaluate(()=>({house:document.body.innerText.indexOf('世家浮沉')>=0,
    stage:document.querySelector('.volbar .mini')?.innerText.slice(0,60)||'',
    notExtinct:document.body.innerText.indexOf('不是家族人口兴灭')>=0
      ||document.body.innerText.indexOf('门第政治位置')>=0,
    year:document.querySelector('.yr')?.innerText}));
  console.log('世家代入     →',JSON.stringify(h1),JSON.stringify(h2));
  console.log('困难模式     →',JSON.stringify(e8),JSON.stringify(e9),JSON.stringify(e10));"""
rep(old,new,'F house test')

# 5 最终断言
old2="""    &&famPage.verdict&&famPage.warn&&famPage.bio&&famPage.skill"""
new2="""    &&famPage.verdict&&famPage.warn&&famPage.bio&&famPage.skill&&famPage.houseRoster"""
assert old2 in s;s=s.replace(old2,new2,1);print('  ok ok-expr fam')
old3="""    &&s4.fam.deep2.bank>=250&&s4.fam.deep2.specials===17&&s4.fam.deep2.combos===23"""
new3="""    &&s4.fam.deep2.bank>=250&&s4.fam.deep2.specials===17&&s4.fam.deep2.combos===23
    &&s4.fam.deep2.dyRulerAll&&s4.fam.deep2.dyHouseAll
    &&s4.fam.deep2.dyRulerGroups>=40&&s4.fam.deep2.dyHouseGroups>=18
    &&s4.fam.deep2.dyTitles&&s4.fam.deep2.dyBoundaries
    &&s4.fam.deep2.dyRulerCount===397&&s4.fam.deep2.dyHouseCount===97"""
assert old3 in s;s=s.replace(old3,new3,1);print('  ok ok-expr civ')
old4="""    &&e10.diff==='hard'&&e10.hint;"""
new4="""    &&e10.diff==='hard'&&e10.hint
    &&s6.houses===20&&s6.houseEntry
    &&h1.entry&&h1.n===20&&h1.note&&h2.house&&h2.notExtinct
    &&h2.stage.indexOf('兴起')>=0;"""
assert old4 in s;s=s.replace(old4,new4,1);print('  ok ok-expr house')
open(p,'w',encoding='utf8').write(s)
print('浏览器测试已补全')
