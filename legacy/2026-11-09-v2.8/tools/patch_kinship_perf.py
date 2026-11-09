# -*- coding: utf-8 -*-
"""把「保留双亲闭包」从每小段的 40 轮全表扫描，改成每笔末一次 BFS（O(n+e)）。"""
import os, re
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
p = os.path.join(ROOT, 'src', 'family.js')
s = open(p, encoding='utf8').read()

# 1 抽出小段循环里的裁剪段，整体删除
start = s.index('      // 4 在籍上限：保留最新两代')
end_marker = '      S.fam=S.fam.filter(p=>p.alive||keepDead.has(p.id));\n    }\n'
end = s.index(end_marker, start) + len(end_marker)
block = s[start:end]
s = s[:start] + s[end:]

# 2 在每笔末（保底之后、S.dead 之前）插入一次性裁剪
anchor = "    /* 在册世代由亲子链决定：取在籍族人的最大世代，不再让 S.gen 自己虚涨 */"
assert anchor in s, 'anchor'
new_tail = """    /* 每笔末统一裁剪一次（原来放在每个小段里，长局会反复全表扫描）。
       只保留在籍者 + 最近两位故去族长 + 「被在册者引用为双亲／配偶」的传递闭包，
       用 BFS 一次算完，O(n+e)。 */
    const idx=new Map(S.fam.map(p=>[p.id,p]));
    const al2=S.fam.filter(p=>p.alive);
    let keepAlive=null;
    if(al2.length>14){
      keepAlive=new Set(al2.sort((a,b)=>b.gen-a.gen||b.age-a.age)
        .slice(0,12).map(p=>p.id));
    }
    const keepDead=new Set(S.fam.filter(p=>!p.alive&&p.role==='ruler')
      .slice(-2).map(p=>p.id));
    const queue=[];
    S.fam.forEach(p=>{
      if(p.alive&&(!keepAlive||keepAlive.has(p.id)))queue.push(p.id);
      else if(keepDead.has(p.id))queue.push(p.id);
    });
    let qi=0;
    while(qi<queue.length){
      const p=idx.get(queue[qi++]);if(!p)continue;
      const ids=[p.parent,p.parent2,p.spouse];
      const q=p.spouse?idx.get(p.spouse):null;
      if(q){ids.push(q.parent,q.parent2);}
      ids.forEach(id=>{
        if(!id||!idx.has(id))return;
        if(!keepDead.has(id)&&!idx.get(id).alive){
          keepDead.add(id);queue.push(id);
        }
      });
    }
    S.fam=S.fam.filter(p=>
      (p.alive&&(!keepAlive||keepAlive.has(p.id)))||keepDead.has(p.id));

""" + anchor
s = s.replace(anchor, new_tail, 1)
open(p, 'w', encoding='utf8').write(s)
print('family.js BFS 裁剪完成，删除原段', len(block), '字符')
