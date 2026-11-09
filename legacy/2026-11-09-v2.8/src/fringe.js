/* fringe.js —— 边界层：文本传统 / 未证实假说 / 史前可考
   纪律：文本真实存在 ≠ 文本所述为真；未证实假说不作任何肯定性表述；
        假说只在狂想档出现，且每张卡写清「无考古／文献／可重复证据支持」。 */
(function(W){
  'use strict';
  const D=W.data,F=D.fringe;
  const NO_EVIDENCE='无考古／文献／可重复证据支持。此为明确标注的虚构推演素材，不是史实，也不是学界认可的主张。';
  const TEXT_RULE='文本真实存在、成书年代可考，不等于文本所述内容为真；此条按文学／文本传统呈现，不计入史实。';

  function textsAt(S,seen){
    const y=S.year;
    return F.texts.filter(x=>!seen[x.id]&&y>=x.y0&&y<=x.y1);
  }
  function prehistory(){return F.prehistory;}
  function hypotheses(){return F.hypotheses;}
  /* 假说按「提出年代」是否已达决定可见，避免 19 世纪假说跑到公元前 */
  function hypothesisAt(S,seen,rnd){
    if(!W.reality.tier(S.reality).allow.hypothesis)return null;
    const pool=F.hypotheses.filter(x=>!seen[x.id]);
    if(!pool.length)return null;
    // 低权重：狂想档也只是偶尔出现，不淹没史实
    if(rnd()>.16)return null;
    return pool[Math.floor(rnd()*pool.length)];
  }
  function hostOf(u){
    try{return String(u).replace(/^https?:\/\//,'').split('/')[0].replace(/^www\./,'');}
    catch(e){return '出处见舆地页';}
  }
  function wrapText(x,S){
    const hosts=[...new Set(x.sources.map(s=>hostOf(s.url)))];
    return {
      t:x.title,x:x.summary,
      note:'【'+x.nature+' · 非史实】'+x.category+' · '+x.rawYear+'。'
        +TEXT_RULE+' 出处：'+(hosts.slice(0,2).join('、')||'见舆地页')+'。',
      src:'文本传统 · '+x.nature,
      isHist:false,isText:true,textMeta:x,
      o:[
        ['只作故事读，录入别册',{lore:3,cohesion:1}],
        ['拿它去核一条可考史事',{lore:5}],
        ['当实录写进编年',{lore:-3,cohesion:-1,_misread:true}]
      ]
    };
  }
  function wrapHypothesis(x,S){
    const hosts=[...new Set(x.sources.map(s=>hostOf(s.url)))];
    return {
      t:'［虚构推演］'+x.name,
      x:'主张：'+x.claim+'　学界地位：'+x.standing+'　证据状况：'+x.evidence,
      note:'【无证据 · 虚构推演】'+x.disclaimer+' 提出年代：'+x.proposed
        +'。出处（用于说明该说法的来源，非支持其成立）：'+(hosts.slice(0,2).join('、')||'见舆地页')+'。'
        +'此卡不进入史实计数、不写入史实编年。',
      src:'未证实假说 · '+x.standing,
      isHist:false,isHypothesis:true,hypMeta:x,
      o:[
        ['知道这是假说，收进「奇谈」别册',{lore:4}],
        ['只记「有人这样说过」这句话',{lore:2}],
        ['把它当史实录入编年',{lore:-6,cohesion:-2,_misread:true,_severe:true}]
      ]
    };
  }
  function wrapPre(x){
    return {
      t:x.title,x:x.summary,
      note:'【史前可考 · 有考古证据】'+x.rawYear+'。'+x.disclaimer
        +' 与「史前超文明」类无证据假说严格区分。',
      src:'史前可考 · 序章展示',
      isHist:true,isPre:true,preMeta:x,displayOnly:true,
      o:[['记入序章',{lore:3}],['略过',{lore:1}]]
    };
  }
  /* 误读统计：把小说／假说当史实，记一笔，不改写任何史实字段 */
  function recordMisread(S,o,cur){
    S.misread=S.misread||{text:0,hypothesis:0,severe:0};
    if(o.e._misread){
      if(cur.isHypothesis){S.misread.hypothesis++;if(o.e._severe)S.misread.severe++;}
      else S.misread.text++;
      return o.e._severe
        ?'【考据警告】未证实假说已明确标注无证据，不应写入史实编年。这一笔记为误读。'
        :'【考据提醒】小说／野史是文本传统，不等于史实。这一笔记为误读。';
    }
    return '';
  }
  W.fringe={NO_EVIDENCE:NO_EVIDENCE,TEXT_RULE:TEXT_RULE,
    textsAt:textsAt,prehistory:prehistory,hypotheses:hypotheses,hypothesisAt:hypothesisAt,
    wrapText:wrapText,wrapHypothesis:wrapHypothesis,wrapPre:wrapPre,
    recordMisread:recordMisread,hostOf:hostOf};
  if(typeof module!=='undefined'&&module.exports)module.exports=W.fringe;
})((typeof window!=='undefined'?window:globalThis).WQN=((typeof window!=='undefined'?window:globalThis).WQN||{}));
