# -*- coding: utf-8 -*-
"""二次修正：保留「出生时的双亲」快照，父母后来丧偶再配／离册不改孩子的出生记录；
   再配时清掉旧配偶的单向指针，避免 A→B→C→A 的悬空链。"""
import os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def rw(rel, fn):
    p = os.path.join(ROOT, rel)
    s = open(p, encoding='utf8').read()
    s2 = fn(s)
    assert s2 != s, rel
    open(p, 'w', encoding='utf8').write(s2)
    print('patched', rel)

def patch_kin(s):
    # 1 marry：清掉旧配偶的单向指针
    old = """  function marry(S,a,b,rnd){
    if(!a||!b||a.id===b.id)return null;
    a.spouse=b.id;b.spouse=a.id;"""
    new = """  function marry(S,a,b,rnd){
    if(!a||!b||a.id===b.id)return null;
    /* 再配之前，先解开双方旧配偶的单向指向，避免 A→B→C→A 悬空链。
       已经出生的孩子仍保留 parent/parent2，那是出生时的记录，不随再配改写。 */
    [a,b].forEach(p=>{
      const other=(S.fam||[]).find(x=>x.id===p.spouse);
      if(other&&other.id!==(p===a?b.id:a.id)&&other.spouse===p.id)other.spouse=null;
    });
    a.spouse=b.id;b.spouse=a.id;"""
    assert old in s, 'marry'
    s = s.replace(old, new, 1)

    # 2 attachBirth：写出生配偶快照
    old2 = """    babe.parent=a.id;babe.parent2=b.id;
    babe.gen=Math.max(a.gen||1,b.gen||1)+1;"""
    new2 = """    babe.parent=a.id;babe.parent2=b.id;
    /* 出生时的夫妇快照：日后父母丧偶再配、或一方离册，都不改写这条出生记录 */
    babe.birthPair=[a.id,b.id];
    babe.birthSpouseOK=true;
    babe.gen=Math.max(a.gen||1,b.gen||1)+1;"""
    assert old2 in s, 'attach snapshot'
    s = s.replace(old2, new2, 1)

    # 3 normalize：parent2 有效就保留，不要求「现在仍互为配偶」
    old3 = """      let b=p.parent2?m[p.parent2]:null;
      if(b&&a.spouse===b.id&&b.spouse===a.id)return;
      const live=livingSpouse(S,a);
      if(live&&(!b||b.id!==live.id)){b=live;fixed++;}
      else if(!b||b.id===a.id||a.spouse!==b.id){
        /* 找同代、无活配偶的另一位成年人补配 */
        const cand=fam.find(q=>q.id!==a.id&&q.gen===a.gen&&!livingSpouse(S,q));
        if(cand){
          a.spouse=cand.id;cand.spouse=a.id;
          a.gender=a.gender||'male';cand.gender=cand.gender||(a.gender==='male'?'female':'male');
          a.residence=a.residence||'virilocal';cand.residence=cand.residence||a.residence;
          b=cand;fixed++;
        }
      }
      if(b&&b.id!==a.id){p.parent2=b.id;}
      else{p.parent2=null;p.birthNote='旧档未记双亲，仅存一方';}"""
    new3 = """      let b=p.parent2?m[p.parent2]:null;
      /* parent2 已在册就保留：那可能是已故／离册的另一方，或后来再配的前配偶，
         都是出生时的真实记录，不该被「现在是否仍为夫妇」抹掉。 */
      if(b&&b.id!==a.id){p.birthPair=p.birthPair||[a.id,b.id];return;}
      const live=livingSpouse(S,a);
      if(live&&live.id!==a.id){b=live;fixed++;}
      else{
        /* 找同代、无活配偶的另一位成年人补配 */
        const cand=fam.find(q=>q.id!==a.id&&q.gen===a.gen&&!livingSpouse(S,q));
        if(cand){
          a.spouse=cand.id;cand.spouse=a.id;
          a.gender=a.gender||'male';cand.gender=cand.gender||(a.gender==='male'?'female':'male');
          a.residence=a.residence||'virilocal';cand.residence=cand.residence||a.residence;
          b=cand;fixed++;
        }
      }
      if(b&&b.id!==a.id){p.parent2=b.id;p.birthPair=[a.id,b.id];}
      else{p.parent2=null;p.birthNote='旧档未记双亲，仅存一方';}"""
    assert old3 in s, 'normalize'
    s = s.replace(old3, new3, 1)
    return s

rw('src/kinship.js', patch_kin)
print('二次修正完成')
