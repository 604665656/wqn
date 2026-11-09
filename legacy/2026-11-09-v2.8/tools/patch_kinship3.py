# -*- coding: utf-8 -*-
"""三次修正：
   1) 裁剪时保留「所有在册者的双亲」传递闭包，父辈不再莫名离册；
   2) S.gen 改为跟随在籍族人的实际世代，不再靠计数器虚涨到几十代；
   3) summary / UI 的世代口径统一按亲子链。"""
import os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def rw(rel, fn):
    p = os.path.join(ROOT, rel)
    s = open(p, encoding='utf8').read()
    s2 = fn(s)
    assert s2 != s, rel
    open(p, 'w', encoding='utf8').write(s2)
    print('patched', rel)

def patch_fam(s):
    # 1 succession：绝嗣立新不再用 S.gen++ 凭空跳代
    old = """    if(!alive.length){
      S.gen++;
      const p=newPerson(S.reg,S.gen,'ruler',rnd,pick);"""
    new = """    if(!alive.length){
      /* 绝嗣立新的世代也按在册族人的实际世代 +1，不靠 S.gen 计数器虚跳 */
      const g=Math.max(1,...S.fam.map(x=>x.gen||1))+1;
      const p=newPerson(S.reg,g,'ruler',rnd,pick);"""
    assert old in s, 'succession'
    s = s.replace(old, new, 1)

    # 2 去掉 genBumped 那段（S.gen 改由末尾同步）
    old2 = """      if(!S.fam.some(p=>p.id===S.ruler&&p.alive)){
        const s=succession(S,rnd,pick);succs.push(s);
        // 约三成机会真正把「在册世代」交到下一代手里；其余只是同辈／旁支暂摄
        if(!genBumped&&s.type!=='绝嗣立新'&&s.person.gen>startGen&&rnd()<0.3){
          S.gen=startGen+1;genBumped=true;
        }
        S.log.push("""
    new2 = """      if(!S.fam.some(p=>p.id===S.ruler&&p.alive)){
        const s=succession(S,rnd,pick);succs.push(s);
        S.log.push("""
    assert old2 in s, 'genBumped'
    s = s.replace(old2, new2, 1)
    # 清掉不再使用的变量声明
    s = s.replace("    let genBumped=false;\n", "")

    # 3 裁剪：保留所有在册者双亲的传递闭包
    old3 = """      /* 保留双亲链两层 + 配偶 + 配偶的双亲：姑父、舅母、岳父母一类称谓
         必须能从实际链上推出来，不能把相关的人裁掉。 */
      let keepDead=new Set(S.fam.filter(p=>!p.alive&&p.role==='ruler').slice(-2).map(p=>p.id));
      for(let round=0;round<2;round++){
        const add=[];
        S.fam.filter(p=>keepDead.has(p.id)||p.alive).forEach(p=>{
          [p.parent,p.parent2,p.spouse].filter(Boolean).forEach(id=>add.push(id));
          if(p.spouse){const q=S.fam.find(x=>x.id===p.spouse);
            if(q)[q.parent,q.parent2].filter(Boolean).forEach(id=>add.push(id));}
        });
        add.forEach(id=>keepDead.add(id));
      }
      S.fam=S.fam.filter(p=>p.alive||keepDead.has(p.id));"""
    new3 = """      /* 保留「所有在册者的双亲／配偶」的传递闭包：
         只要某个孩子还在册，他的父母就不能被裁成「已不在册」，
         否则关系图会凭空少掉父或母，看起来又像单亲生子。
         只保留被引用的人，孤立的故去者照常清掉，不会无限累积。 */
      let keepDead=new Set(S.fam.filter(p=>!p.alive&&p.role==='ruler')
        .slice(-2).map(p=>p.id));
      let changed=true,guard=0;
      while(changed&&guard++<40){
        changed=false;
        S.fam.forEach(p=>{
          if(!(p.alive||keepDead.has(p.id)))return;
          const ids=[p.parent,p.parent2,p.spouse].filter(Boolean);
          const q=(S.fam||[]).find(x=>x.id===p.spouse);
          if(q)ids.push(q.parent,q.parent2);
          ids.forEach(id=>{
            if(id&&!keepDead.has(id)){keepDead.add(id);changed=true;}
          });
        });
      }
      S.fam=S.fam.filter(p=>p.alive||keepDead.has(p.id));"""
    assert old3 in s, 'keepDead'
    s = s.replace(old3, new3, 1)

    # 4 末尾：S.gen 跟随在籍实际世代
    old4 = """    S.dead+=deaths;
    return {deaths:deaths,births:births,years:span,slices:steps,successions:succs};"""
    new4 = """    /* 在册世代由亲子链决定：取在籍族人的最大世代，不再让 S.gen 自己虚涨 */
    const liveG=S.fam.filter(p=>p.alive).map(p=>p.gen||1);
    if(liveG.length)S.gen=Math.max(1,...liveG);
    S.dead+=deaths;
    return {deaths:deaths,births:births,years:span,slices:steps,successions:succs};"""
    assert old4 in s, 'S.gen sync'
    s = s.replace(old4, new4, 1)
    return s

rw('src/family.js', patch_fam)

def patch_people(s):
    old = """    return {alive:alive.length,total:fam.length,
      generations:Math.max(S.gen||1,...gens),span:gens.size,"""
    new = """    return {alive:alive.length,total:fam.length,
      generations:Math.max(1,...gens),span:gens.size,"""
    assert old in s, 'people summary'
    s = s.replace(old, new, 1)
    return s

rw('src/people.js', patch_people)
print('三次修正完成')
