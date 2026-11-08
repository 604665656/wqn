/* real.js —— 真实血脉代入：考据史事池 + 十二实体六阶段
   数据来源：data/history.json（72 条考据史事 + 3 条传说层）
             data/entities.json（12 个实体的「建立→扩张→鼎盛→转折→衰落→终结」）
   纪律：史实节点与出处原样呈现；玩家抉择是推演，明确标注，不改写史实。 */
(function(W){
  'use strict';
  const D=W.data;
  const PHASE_STEPS=6;                 // 每阶段 6 笔
  const TOTAL_STEPS=PHASE_STEPS*6;     // 一局 36 笔走完六阶段
  const PHASE_EFFECTS={
    '建立':{people:8,cohesion:10,food:5},
    '扩张':{might:10,wealth:8,food:5,people:4},
    '鼎盛':{lore:10,craft:9,wealth:8,cohesion:6},
    '分裂或转折':{cohesion:-12,might:-6,people:-4},
    '衰落':{food:-8,wealth:-8,might:-8,cohesion:-8,people:-6},
    '终结':{cohesion:-10,people:-6}
  };
  const PRECISION_LABEL={exact:'有明确纪年',range:'年代区间',approximate:'约略年代',legendary:'传说或后世追述'};
  const CONSENSUS_LABEL={settled:'学界通说',date_contested:'断代有争议',
    legendary_retroactive:'传说／后世追述',entity_definition_contested:'实体边界有争议'};

  const entityById=id=>D.entities.entities.find(e=>e.id===id)||null;
  const byName=n=>D.entities.entities.find(e=>e.name===n)||null;

  /* 年份按阶段锚点分段线性插值：短命王朝（秦 14 年）也能完整走完六阶段 */
  function yearAt(ent,turn){
    const idx=Math.min(5,Math.floor(turn/PHASE_STEPS));
    const local=turn-idx*PHASE_STEPS;
    const from=ent.phases[idx].year;
    const to=idx<5?ent.phases[idx+1].year:ent.phases[5].year;
    return Math.round(from+(to-from)*local/PHASE_STEPS);
  }
  function phaseIdxAt(turn){return Math.min(5,Math.floor(turn/PHASE_STEPS));}
  function progress(S){
    if(!S.entity)return '';
    const e=entityById(S.entity.id),i=Math.max(0,Math.min(5,S.entity.phaseIdx));
    const p=e.phases[i];
    return e.name+' · '+p.phase+'（'+p.label+'） · 第 '+(i+1)+'/6 阶段';
  }
  function phaseEvent(S){
    const e=entityById(S.entity.id),i=Math.min(5,S.entity.phaseIdx),p=e.phases[i];
    const eff=PHASE_EFFECTS[p.phase]||{};
    const plabel=PRECISION_LABEL[p.precision]||'约略年代';
    const note='史实节点：'+p.event+'（'+p.label+'，'+plabel+'）。'
      +'阶段态势与以下抉择为游戏推演，不改变史实；终结原因见收卷报告。';
    return {
      t:'〔'+p.phase+'〕'+e.name,
      x:p.event+'。'+p.note,
      note:note,
      src:'真实血脉 · '+p.phase,
      isHist:false,isPhase:true,phase:p.phase,phaseLabel:p.label,
      entityName:e.name,precision:p.precision,
      o:[
        ['顺其势，记入编年',{cohesion:3,lore:4}],
        ['力图挽回，另作布置',{might:4,wealth:3,cohesion:-3}]
      ]
    };
  }
  /* 真实史事：72 条按年份窗口进入；本圈=本土，其余=远闻 */
  function historyCandidates(S){
    const y=S.year,reg=S.reg;
    return D.history.events.filter(h=>!S.usedReal[h.id]&&y>=h.y0&&y<=h.y1)
      .map(h=>Object.assign({},h,{near:h.region===reg}));
  }
  function wrapHistory(h){
    const srcText=h.cite||'见考据报告引用来源';
    const links=h.sources.length?'　出处：'+h.sources.map(s=>s.url).join('；'):'';
    return {
      t:h.title,
      x:h.summary,
      note:'【'+h.status+' · '+PRECISION_LABEL[h.precision]+'】'+srcText+links
        +'。以下抉择为游戏推演，非史实记载。',
      src:(h.near?'史实 · ':'远闻 · ')+h.circle,
      isHist:true,realMeta:{id:h.id,status:h.status,consensus:h.consensus,
        precision:h.precision,circle:h.circle,y0:h.y0,y1:h.y1,
        cite:h.cite,sources:h.sources},
      o:[
        ['录其事，存其异说',{lore:6,wealth:2}],
        ['以事为鉴，不改旧例',{cohesion:5,food:2}]
      ]
    };
  }
  function endingCard(S){
    const e=entityById(S.entity.id),p=e.phases[5];
    const ALIAS={'罗马共和国→罗马帝国':'西罗马'};
    const d=D.entities.disputes[e.name]||D.entities.disputes[ALIAS[e.name]]||null;
    return {name:e.name,year:p.label,phaseEvent:p.event,reason:p.note,
      dispute:d?d.alternatives:null,disputeReason:d?d.reason:null,
      word:'编年走到 '+p.label+'，'+e.name+'作为独立政治实体的历史到此为止。'
        +'这不是游戏随机判定的终点，是史料里写着的年份。'};
  }
  W.real={PHASE_STEPS:PHASE_STEPS,TOTAL_STEPS:TOTAL_STEPS,
    PHASE_EFFECTS:PHASE_EFFECTS,PRECISION_LABEL:PRECISION_LABEL,CONSENSUS_LABEL:CONSENSUS_LABEL,
    entityById:entityById,byName:byName,yearAt:yearAt,phaseIdxAt:phaseIdxAt,
    progress:progress,phaseEvent:phaseEvent,historyCandidates:historyCandidates,
    wrapHistory:wrapHistory,endingCard:endingCard};
  if(typeof module!=='undefined'&&module.exports)module.exports=W.real;
})((typeof window!=='undefined'?window:globalThis).WQN=((typeof window!=='undefined'?window:globalThis).WQN||{}));
