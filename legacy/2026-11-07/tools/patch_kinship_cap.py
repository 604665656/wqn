# -*- coding: utf-8 -*-
"""BFS 上溯限 3 代、故去者封顶 40 位，避免祖先链无限堆积拖慢长局。"""
import os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
p = os.path.join(ROOT, 'src', 'family.js')
s = open(p, encoding='utf8').read()

old = """    const keepDead=new Set(S.fam.filter(p=>!p.alive&&p.role==='ruler')
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
      (p.alive&&(!keepAlive||keepAlive.has(p.id)))||keepDead.has(p.id));"""

new = """    const keepDead=new Set(S.fam.filter(p=>!p.alive&&p.role==='ruler')
      .slice(-2).map(p=>p.id));
    /* BFS 只上溯 3 代（在籍者 → 双亲 → 祖父母 → 曾祖），
       足够推出姑父／舅母／岳父母／堂表，又不把整条祖先链全留在册。 */
    const queue=[],visited=new Set();
    S.fam.forEach(p=>{
      if((p.alive&&(!keepAlive||keepAlive.has(p.id)))||keepDead.has(p.id))
        queue.push({id:p.id,d:0});
    });
    let qi=0;
    while(qi<queue.length){
      const cur=queue[qi++];
      if(visited.has(cur.id))continue;visited.add(cur.id);
      if(cur.d>=3)continue;
      const p=idx.get(cur.id);if(!p)continue;
      const ids=[p.parent,p.parent2,p.spouse];
      const q=p.spouse?idx.get(p.spouse):null;
      if(q){ids.push(q.parent,q.parent2);}
      ids.forEach(id=>{
        if(!id||!idx.has(id)||visited.has(id))return;
        if(!idx.get(id).alive)keepDead.add(id);
        queue.push({id:id,d:cur.d+1});
      });
    }
    /* 故去者封顶 40 位，保留最近的（数组按时间追加，后段即近期） */
    if(keepDead.size>40){
      const recent=S.fam.filter(p=>!p.alive&&keepDead.has(p.id)).slice(-40)
        .map(p=>p.id);
      keepDead.clear();recent.forEach(id=>keepDead.add(id));
    }
    S.fam=S.fam.filter(p=>
      (p.alive&&(!keepAlive||keepAlive.has(p.id)))||keepDead.has(p.id));"""

assert old in s, 'cap block'
s = s.replace(old, new, 1)
open(p, 'w', encoding='utf8').write(s)
print('闭包封顶完成')
