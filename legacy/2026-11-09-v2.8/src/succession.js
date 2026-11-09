/* succession.js —— 朝代更迭长河与「真实人物同期政权」
   数据来源：data/succession.json（由 tools/build_succession.js 从实体年表生成）
   纪律：只有纪年首尾不重叠的政权才排成线性更迭链；重叠者列为并存政权群，
        不硬串成一条王朝线。人物与政权只表示年代窗口重叠，不表示隶属或仕宦。 */
(function(W){
  'use strict';
  const D=W.data;
  const STEPS_PER_ENTITY=12;   // 每朝 12 笔 = 一卷：6 阶段各 1 笔节点 + 1 笔文明/史事
  const available=()=>Object.keys(D.succession.chains);
  const chainOf=r=>D.succession.chains[r]||null;
  const coexisting=()=>D.succession.coexisting||{};

  function link(S){
    const c=chainOf(S.chainState.region);
    return c?c.entities[S.chainState.idx]:null;
  }
  function isLast(S){
    const c=chainOf(S.chainState.region);
    return S.chainState.idx>=c.entities.length-1;
  }
  function progress(S){
    const c=chainOf(S.chainState.region),l=link(S);
    if(!c||!l)return '';
    const stage=Math.max(1,Math.min(6,Math.ceil(S.chainState.entityTurn/2)));
    return l.name+' · 第 '+(S.chainState.idx+1)+'/'+c.entities.length+' 朝 · 阶段 '+stage+'/6';
  }
  /* 每朝 12 笔：奇数笔=阶段节点年，偶数笔=区间内插值年，保证单调不倒退 */
  function yearAt(S){
    const l=link(S),t=S.chainState.entityTurn;
    if(!l)return S.year;
    const stage=Math.min(5,Math.floor((t-1)/2));
    const p=l.phases[stage],nx=l.phases[Math.min(5,stage+1)];
    if((t-1)%2===0)return p.year;
    let y=(p.y1&&p.y1>p.year)?p.y1:p.year+1;
    if(nx&&nx.year>p.year)y=Math.min(y,nx.year-1);
    return Math.max(p.year,y);
  }
  function phaseIdx(S){
    return Math.min(5,Math.floor((S.chainState.entityTurn-1)/2));
  }
  function nodeTurn(S){return (S.chainState.entityTurn-1)%2===0;}

  /* 同期政权：当前朝 + 该条目的年代重叠政权（人物不标隶属） */
  function contemporaries(S,cur){
    const out=[],c=chainOf(S.chainState.region);
    if(c){
      const l=link(S);
      if(l)out.push({name:l.name,note:'当前政权纪年'});
    }
    if(cur&&cur.isCiv&&cur.civMeta){
      const hits=D.succession.itemLinks[cur.civMeta.id]||[];
      hits.forEach(h=>{
        if(!out.some(o=>o.id===h.id))out.push({id:h.id,name:h.name,note:'年代窗口重叠'});
      });
    }
    return out;
  }
  function entityItems(entityId){
    const ids=D.succession.entityLinks[entityId]||[];
    return D.civilization.items.filter(x=>ids.indexOf(x.id)>=0);
  }
  function seenInEntity(S){
    const l=link(S);if(!l)return [];
    const ids=D.succession.entityLinks[l.id]||[];
    return D.civilization.items.filter(x=>ids.indexOf(x.id)>=0&&S.seenCiv&&S.seenCiv[x.id]);
  }
  /* 更迭卡：终结 → 间朝 → 下一朝 */
  function turnoverCard(S){
    const c=chainOf(S.chainState.region),l=link(S),last=isLast(S),next=last?null:c.entities[S.chainState.idx+1];
    const seen=seenInEntity(S);
    const byDim={};
    seen.forEach(x=>byDim[x.dimName]=(byDim[x.dimName]||0)+1);
    const people=seen.filter(x=>x.dim==='P').map(x=>x.title);
    const dispute=D.entities.disputes[l.name]||null;
    return {
      region:c.region,chainTitle:c.title,
      idx:S.chainState.idx+1,total:c.entities.length,
      name:l.name,from:l.startYear,to:l.endYear,
      endReason:l.endReason,transition:l.transition,
      gap:l.gapToNext,next:next?{name:next.name,startYear:next.startYear,
        event:next.phases[0].event,label:next.phases[0].label}:null,
      dispute:dispute?dispute.alternatives:null,
      seenCount:seen.length,byDim:byDim,people:people,
      tail:last?c.tail:null,
      classification:c.classification,last:last
    };
  }
  function chainSummary(S){
    const c=chainOf(S.chainState.region);
    if(!c)return null;
    return c.entities.map((e,i)=>({name:e.name,from:e.startYear,to:e.endYear,
      visited:i<S.chainState.idx+(S.chainState.entityTurn>0?1:0),
      current:i===S.chainState.idx,transition:e.transition}));
  }
  W.succession={STEPS_PER_ENTITY:STEPS_PER_ENTITY,
    available:available,chainOf:chainOf,coexisting:coexisting,
    link:link,isLast:isLast,progress:progress,yearAt:yearAt,
    phaseIdx:phaseIdx,nodeTurn:nodeTurn,
    contemporaries:contemporaries,entityItems:entityItems,
    seenInEntity:seenInEntity,turnoverCard:turnoverCard,chainSummary:chainSummary};
  if(typeof module!=='undefined'&&module.exports)module.exports=W.succession;
})((typeof window!=='undefined'?window:globalThis).WQN=((typeof window!=='undefined'?window:globalThis).WQN||{}));
