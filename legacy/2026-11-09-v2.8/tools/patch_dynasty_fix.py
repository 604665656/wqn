# -*- coding: utf-8 -*-
"""修正：新判读题占用 reading 类导致既有 106 道断言失败、dim 用了不存在的 DY、
       联动 need 白名单、logic 新断言的 ending 阶段与世家年代窗口。"""
import json, os
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D=os.path.join(ROOT,'data')

# 1 新题 kind/dim：reading 保持 106，dim 必须是已有维度 key
p=os.path.join(D,'reading_quiz.json');q=json.load(open(p,encoding='utf8'))
n=0
for x in q['items']:
    if x.get('tier')=='dynasty':
        x['kind']='ruler' if x['refId'].startswith('R_') else 'house'
        x['dim']='HI'
        x['badge']='辨帝王称谓' if x['kind']=='ruler' else '辨世家读法'
        n+=1
q['meta']['dynastyKinds']={'ruler':'辨帝王称谓（12 道）','house':'辨世家读法（12 道）'}
json.dump(q,open(p,'w',encoding='utf8'),ensure_ascii=False,indent=1)
print('题库字段修正',n,'道')

# 2 同步生成脚本（保证全链重建可复现）
p=os.path.join(ROOT,'tools','patch_dynasty_options.py');s=open(p,encoding='utf8').read()
s=s.replace("""      id='RQ%03d'%i,kind='reading',badge='帝王与世家 · '+cat,
      refId=tag,dim='DY',topic=topic,y0=-3000,y1=2026,""",
"""      id='RQ%03d'%i,
      kind=('ruler' if tag.startswith('R_') else 'house'),
      badge=('辨帝王称谓' if tag.startswith('R_') else '辨世家读法'),
      refId=tag,dim='HI',topic=topic,y0=-3000,y1=2026,""")
open(p,'w',encoding='utf8').write(s)
print('生成脚本已同步')

# 3 logic.test.js：needs 白名单
p=os.path.join(ROOT,'test','logic.test.js');s=open(p,encoding='utf8').read()
old="""    'local_mis','surname_note']);"""
new="""    'local_mis','surname_note','ruler','house','house_note']);"""
assert old in s;s=s.replace(old,new,1);print('needs 白名单已扩')

# 4 logic.test.js：世家终章循环加 ending 处理
old2="""  for(let i=0;i<60;i++){
    E.step();let st=E.state();
    if(st.phase==='volume')E.continueVolume();
    st=E.state();if(st.phase==='choice')E.choose(i%2);
    st=E.state();
    if(st.phase==='realend'){realEnd++;E.openScroll(true);E.backFromScroll();E.realEndContinue();}
  }
  assert.strictEqual(realEnd,1,'世家终章未触发');"""
new2="""  for(let i=0;i<60;i++){
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
  assert.strictEqual(realEnd,1,'世家终章未触发');"""
assert old2 in s;s=s.replace(old2,new2,1);print('世家终章循环已修')

# 5 logic.test.js：同期记录——普通局从 -5000 起步，60 笔未必走到世家兴起期
old3="""  for(let i=0;i<60;i++){
    E.step();let st=E.state();
    if(st.phase==='volume')E.continueVolume();
    st=E.state();if(st.phase==='choice')E.choose(i%3);
    const r=E.state().result;
    if(r&&r.msgs)maxMsgs=Math.max(maxMsgs,
      r.msgs.filter(m=>m.indexOf('同期在位')>=0||m.indexOf('同期名族')>=0).length);
  }
  assert.ok(maxMsgs<=2,'一笔出现超过 2 张同期卡');
  assert.ok(Object.keys(S.seenRuler||{}).length>0,'未记录同期在位');
  assert.ok(Object.keys(S.seenHouse||{}).length>0,'未记录同期名族');"""
new3="""  for(let i=0;i<60;i++){
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
  assert.ok(pm.some(m=>m.indexOf('血统凭证')>=0),'世家卡缺边界声明');"""
assert old3 in s;s=s.replace(old3,new3,1);print('同期记录断言已修')
open(p,'w',encoding='utf8').write(s)
print('全部修正完成')
