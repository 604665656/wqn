/* tutorial.js —— 新手教程状态机
   线性八步，跟着玩家动作自动推进；每一步也能手动「下一步」跳过。
   教程只解释玩法与界面，不写进史实编年、不改八维、不消耗主随机源。 */
(function(W){
  'use strict';
  const D=W.data,T=D.tutorial;
  const STEPS=T.steps;

  function fresh(S,on){
    return {
      on:!!on, idx:0, done:false, auto:true,
      tabs:{}, sawScroll:false, acked:{}, skipped:{},
      startedTurn:(S&&S.turn)||0
    };
  }
  /* 旧档迁移：没有 tutorial 字段时，按难度决定是否默认开；
     老局重看教程用纯手动翻页，避免 gate 瞬间全满足。 */
  function ensure(S){
    if(!S)return null;
    if(!S.tutorial||typeof S.tutorial!=='object'){
      const d=W.difficulty?W.difficulty.tier(S.difficulty):null;
      S.tutorial=fresh(S,!!(d&&d.tutorialDefault));
      S.tutorial.auto=false;             // 老档不自动弹教程
    }
    const t=S.tutorial;
    if(typeof t.idx!=='number')t.idx=0;
    if(!t.tabs)t.tabs={};
    if(!t.acked)t.acked={};
    if(!t.skipped)t.skipped={};
    if(typeof t.auto!=='boolean')t.auto=false;
    if(typeof t.sawScroll!=='boolean')t.sawScroll=false;
    if(t.idx>=STEPS.length)t.idx=STEPS.length-1;
    return t;
  }

  /* gate：这一步「做到了」没有。ack / done 永不自动满足，必须点按钮。 */
  function gateOK(step,S){
    const t=ensure(S);
    switch(step.gate){
      case 'ack':   return !!t.acked[step.id];
      /* 用「玩家真的选过几笔」判定，而不是 turn（step 开局就把 turn 推到 1 了） */
      case 'choice1':return (S.choices||[]).length>=1;
      case 'result': return (S.choices||[]).length>=2;
      case 'vol':    return (S.volLog||[]).length>=1;
      case 'tabs':   return !!t.tabs.civ&&!!t.tabs.geo;
      case 'scroll': return !!t.sawScroll;
      case 'done':   return false;
      default:       return false;
    }
  }
  const step=S=>STEPS[ensure(S).idx];
  const progress=S=>({idx:ensure(S).idx+1,total:STEPS.length});

  /* 每帧调用：只在「新手阶段」自动推进，一次最多一步。
     返回是否发生变化，让调用方决定要不要存档。 */
  function advance(S){
    const t=ensure(S);
    if(!t.on||t.done)return false;
    const cur=STEPS[t.idx];
    if(!cur)return false;
    /* 新手阶段按「开教程后走过多少笔」算；重看教程 auto=false，一律手动翻页 */
    const inNewGame=t.auto&&((S.turn||0)-(t.startedTurn||0))<=40;
    if(!inNewGame)return false;
    if(!gateOK(cur,S))return false;
    t.idx++;
    if(t.idx>=STEPS.length-1){
      /* 最后一步要玩家自己点「完成」，不自动收起 */
      t.idx=STEPS.length-1;
    }
    return true;
  }
  /* 手动下一步：跳过当前 gate，教程继续 */
  function next(S){
    const t=ensure(S);
    const cur=STEPS[t.idx];
    if(cur&&!gateOK(cur,S))t.skipped[cur.id]=1;
    if(t.idx<STEPS.length-1){t.idx++;return true;}
    t.done=true;t.on=false;return true;
  }
  function prev(S){
    const t=ensure(S);
    if(t.idx>0){t.idx--;t.done=false;t.on=true;return true;}
    return false;
  }
  function ack(S){
    const t=ensure(S),cur=STEPS[t.idx];
    if(cur)t.acked[cur.id]=1;
    return true;
  }
  function skip(S){
    const t=ensure(S);
    t.on=false;t.done=true;t.idx=STEPS.length-1;
    return true;
  }
  function reopen(S){
    S.tutorial=fresh(S,true);
    S.tutorial.auto=false;              // 重看一律手动翻页
    return S.tutorial;
  }
  function setOn(S,on){
    const t=ensure(S);
    /* 只切显示开关，不动 auto：新局开局时仍需按玩家动作自动推进 */
    if(on){t.on=true;t.done=false;}
    else{t.on=false;t.done=true;}
    return t;
  }
  /* 界面事件：切页签、看过收卷报告 */
  function noteTab(S,tab){
    const t=ensure(S);
    if(tab!=='civ'&&tab!=='geo')return false;
    if(t.tabs[tab])return false;
    t.tabs[tab]=1;return true;
  }
  function noteScroll(S){
    const t=ensure(S);
    if(t.sawScroll)return false;
    t.sawScroll=true;return true;
  }

  W.tutorial={STEPS:STEPS,meta:T.meta,fresh:fresh,ensure:ensure,
    step:step,progress:progress,gateOK:gateOK,advance:advance,
    next:next,prev:prev,ack:ack,skip:skip,reopen:reopen,setOn:setOn,
    noteTab:noteTab,noteScroll:noteScroll};
  if(typeof module!=='undefined'&&module.exports)module.exports=W.tutorial;
})((typeof window!=='undefined'?window:globalThis).WQN=((typeof window!=='undefined'?window:globalThis).WQN||{}));
