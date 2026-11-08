/* difficulty.js —— 难度档位（与真实性档位／玩法／时长／密度正交）
   只改「推演层」的数值与指引，不改史实条目、年代、出处、可信度与出现与否。
   难度写进存档与分享串，保证同种子 + 同难度 + 同选择序列可复盘。 */
(function(W){
  'use strict';
  const D=W.data,C=D.difficulty;
  const DIFFS=C.diffs;
  const tier=k=>DIFFS.find(x=>x.key===k)||DIFFS[1];
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const statKeys=()=>D.keyOrder;

  /* 开局初始八维；简单略宽裕、困难略紧，clamp 在 0—100 */
  function applyStart(S,st){
    const d=tier(S.difficulty);
    if(!d.startBonus)return st;
    statKeys().forEach(k=>{st[k]=clamp(st[k]+d.startBonus,0,100);});
    return st;
  }

  /* 统一给一批选项「整形」：收益／代价／风险各按难度缩放。
     放在 generate() 末尾，保证卡面（estat/risk）与结算（apply/applyEff）读的是同一份数据。
     只处理八维数值键；tag / chain / _quiz 等非数值字段原样保留。 */
  function shapeOpts(opts,S){
    const d=tier(S&&S.difficulty);
    if(!opts||!opts.length)return opts;
    const isStat=k=>statKeys().indexOf(k)>=0;
    const scale=(o,pos,neg)=>{
      Object.keys(o||{}).forEach(k=>{
        if(!isStat(k)||typeof o[k]!=='number')return;
        const m=o[k]>=0?pos:neg;
        o[k]=Math.round(o[k]*m);
      });
    };
    opts.forEach(o=>{
      /* 关键：generate 里的 e / gain / cost 可能直接引用 data/events.json、
         templates.json 的静态模板对象。必须先复制再缩放，否则难度会把
         全局史料模板数值改写，既破坏「同种子复盘」，也等于改了史实数据。 */
      const e=Object.assign({},o.e||{}),gain=Object.assign({},o.gain||{}),
            cost=Object.assign({},o.cost||{}),fail=Object.assign({},o.fail||{});
      /* e = 收益 + 代价的合成值；gain / cost 分列，用于卡面与账本 */
      scale(e,d.gain,d.cost);
      scale(gain,d.gain,d.cost);
      scale(cost,d.gain,d.cost);
      scale(fail,d.gain,d.cost);        // 失手后果通常是负值
      o.e=e;o.gain=gain;o.cost=cost;o.fail=fail;
      if(o.risk>0)o.risk=clamp(+(o.risk*d.risk).toFixed(3),0,.6);
      if(o._surprise){
        const sp=Object.assign({},o._surprise);
        if(sp.extra)sp.extra=Object.assign({},sp.extra);
        if(sp.cost)sp.cost=Object.assign({},sp.cost);
        scale(sp.extra,d.gain,d.cost);
        scale(sp.cost,d.gain,d.cost);
        o._surprise=sp;
      }
    });
    return opts;
  }

  /* 岁月衰减倍率；与玩法模式 pressure 相乘，不叠加到史实频率上 */
  function drift(S){return tier(S&&S.difficulty).drift;}
  /* 存续危机触发线：简单更晚、困难更早 */
  function crisisAt(S){return tier(S&&S.difficulty).crisisAt;}
  /* 散族终章阈值（weave.checkEnding 里读） */
  function peopleFloor(S){return tier(S&&S.difficulty).peopleFloor;}
  /* 指引密度：0 收起 / 1 基础 / 2 逐卡 + 推荐 + 术语 */
  function hints(S){return tier(S&&S.difficulty).hints;}
  function tutorialDefault(S){return tier(S&&S.difficulty).tutorialDefault;}
  function banner(S){return tier(S&&S.difficulty).name;}

  /* 新手建议：只按「收益减代价再扣风险」找一条参考，不碰考据题与分歧对。
     明确只是参考，不宣称存在标准答案。 */
  function recommend(opts){
    if(!opts||opts.length<2)return -1;
    let best=-1,bs=-Infinity;
    opts.forEach((o,i)=>{
      if(o.quiz||o._quiz||o.debate||o.reading||o.seeking)return;
      let s=0;
      Object.keys(o.gain||{}).forEach(k=>{if(typeof o.gain[k]==='number')s+=o.gain[k];});
      Object.keys(o.cost||{}).forEach(k=>{if(typeof o.cost[k]==='number')s+=o.cost[k];});
      s-=(o.risk||0)*12;
      if(s>bs){bs=s;best=i;}
    });
    return best;
  }

  W.difficulty={DIFFS:DIFFS,tier:tier,applyStart:applyStart,shapeOpts:shapeOpts,
    drift:drift,crisisAt:crisisAt,peopleFloor:peopleFloor,hints:hints,
    tutorialDefault:tutorialDefault,banner:banner,recommend:recommend,
    statHelp:C.statHelp,cardHelp:C.cardHelp,meta:C.meta};
  if(typeof module!=='undefined'&&module.exports)module.exports=W.difficulty;
})((typeof window!=='undefined'?window:globalThis).WQN=((typeof window!=='undefined'?window:globalThis).WQN||{}));
