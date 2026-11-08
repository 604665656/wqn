/* options.js —— 知识驱动选项生成器
   把「收集册」变成「可打出的牌」：选项由已见过的真实知识条目、八维态势、
   地理气候、同期政权、家族职业与卷数共同生成；带代价、风险、前置、后果写回。
   不依赖 DOM，可在 node 里单独跑逻辑测试。所有随机都走传入的 rnd，保证种子可复现。 */
(function(W){
  'use strict';
  const D=W.data,O=D.options;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const KIND=O.kinds,ARCH=O.archetypes,SPECIAL=O.special;

  function fmtYear(y){return y<0?'前'+Math.abs(y):String(y);}
  function itemById(id){return D.civilization.items.find(x=>x.id===id);}
  function dimName(k){const d=D.civilization.dimensions.find(x=>x.key===k);return d?d.name:k;}

  /* ---------- 当前局的「知识资本」 ---------- */
  function seenItems(S){
    const out=[];
    Object.keys(S.seenCiv||{}).forEach(id=>{
      const x=itemById(id);
      if(x&&x.y0<=S.year+80)out.push(x);
    });
    return out;
  }
  function unseenItems(S){
    return D.civilization.items.filter(x=>!(S.seenCiv||{})[x.id]
      &&x.y0<=S.year+140&&x.y1>=S.year-160&&x.layer!=='hypothesis');
  }
  function countSeenDim(seen,dims){
    return seen.filter(x=>dims.indexOf(x.dim)>=0).length;
  }

  /* ---------- 态势权重：让选项池随局面变，而不是每次一样 ---------- */
  function situation(S){
    const st=S.st||{};
    const need=k=>clamp((45-(st[k]||50))/40,.6,1.6);   // 哪项弱，哪项的选项更容易出现
    return {
      food:need('food'),people:need('people'),craft:need('craft'),lore:need('lore'),
      might:need('might'),cohesion:need('cohesion'),faith:need('faith'),wealth:need('wealth'),
      crisis:(st.food<=18||st.people<=15||st.cohesion<=18)?1.5:1,
      volume:1+Math.min(.5,((S.vol&&S.vol.n)||1)-1)*.06
    };
  }
  function weightOf(a,seen,S,rnd){
    let w=a.weight||1;
    const sit=situation(S);
    Object.keys(a.eff||{}).forEach(k=>{w*=1+(sit[k]-1)*.55;});
    if((a.req||{}).crisis&&sit.crisis>1)w*=1.4;
    if(a.kind==='risk'&&sit.crisis>1)w*=.7;             // 越是存续之秋越少孤注一掷
    if(a.kind==='study'&&(S.st.lore||50)>70)w*=.8;
    if(a.kind==='build'&&(S.st.food||50)<25)w*=1.35;
    w*=sit.volume;
    const used=(S.optUse||{})[a.id]||0;
    w*=Math.pow(.85,Math.min(used,4));                   // 老用同一类，渐渐让位给别的
    return Math.max(.05,w)*(0.85+rnd()*.3);              // 轻微抖动，同局面也不完全一样
  }
  function reqOK(a,seen,S){
    const r=a.req||{};let ok=true;
    if(r.seenDim&&countSeenDim(seen,a.dims)<r.seenDim)return false;
    Object.keys(r).forEach(k=>{
      if(k==='seenDim'||typeof r[k]!=='number')return;
      if(((S.st||{})[k]||0)<r[k])ok=false;      // 只读，不往共享原型上写标记
    });
    return ok;
  }

  /* ---------- 填词：把真实数据写进选项文本 ---------- */
  function fill(text,ctx){
    return String(text).replace(/\{(\w+)\}/g,(m,k)=>ctx[k]!==undefined?ctx[k]:m);
  }
  function specialCtx(S,need,rnd,pick){
    const A=D.atlas||{},ctx={};
    if(need==='geo'){
      const us=(A.units||[]).filter(u=>u.region===S.reg||u.region==='*');
      const u=(us.length?us:(A.units||[]))[Math.floor(rnd()*((us.length?us:(A.units||[])).length||1))];
      if(!u)return null;ctx.geo=u.name;
    }else if(need==='climate'){
      const es=(D.geoclimate.events||[]).filter(e=>S.year>=e.y0-40&&S.year<=e.y1+40);
      const e=(es.length?es:(D.geoclimate.events||[]))[Math.floor(rnd()*((es.length?es:(D.geoclimate.events||[])).length||1))];
      if(!e)return null;ctx.climate=e.title||e.name;
    }else if(need==='polity'){
      const ps=(A.polities||[]).filter(p=>S.year>=p.from&&S.year<=p.to);
      const p=ps[Math.floor(rnd()*(ps.length||1))];
      if(!p)return null;ctx.polity=p.name;
    }else if(need==='person'){
      const ps=D.civilization.items.filter(x=>x.dim==='P'&&x.y0<=S.year&&x.y1>=S.year-120);
      const p=ps[Math.floor(rnd()*(ps.length||1))];
      if(!p)return null;ctx.person=p.title;
    }else if(need==='local'){
      /* 地方史：只取本圈且年代窗口覆盖当前年份的锚点，找不到就退到本圈全部 */
      const L=D.localities||{items:[]};
      const mine=L.items.filter(x=>x.region===S.reg||x.region==='*');
      const now=mine.filter(x=>S.year>=x.y0-80&&S.year<=x.y1+80);
      const pool=now.length?now:mine;
      const x=pool[Math.floor(rnd()*(pool.length||1))];
      if(!x)return null;
      ctx.local=x.title;ctx.localGeo=x.geoId||'';ctx.localId=x.id;
    }else if(need==='surname'){
      const P=D.peoples||{surnames:[]};
      const pool=P.surnames.filter(x=>S.year>=x.y0-200&&S.year<=x.y1+200);
      const x=(pool.length?pool:P.surnames)[Math.floor(rnd()*((pool.length?pool:P.surnames).length||1))];
      if(!x)return null;
      ctx.surname=x.title;ctx.surnameId=x.id;
    }else if(need==='people'){
      const P=D.peoples||{peoples:[]};
      const pool=P.peoples.filter(x=>S.year>=x.y0-200&&S.year<=x.y1+200);
      const x=(pool.length?pool:P.peoples)[Math.floor(rnd()*((pool.length?pool:P.peoples).length||1))];
      if(!x)return null;
      ctx.people=x.title;ctx.peopleId=x.id;
    }else if(need==='local_mis'){
      /* 第四轮：同地「互证与辨误」+「人物与著述」两条对读 */
      const L=D.localities||{items:[]};
      const cross=(L.items||[]).filter(x=>x.category==='互证与辨误');
      const x=cross[Math.floor(rnd()*(cross.length||1))];
      if(!x)return null;
      const src=(L.items||[]).find(z=>z.geoId===x.geoId&&z.category==='人物与著述');
      ctx.local=x.title;ctx.local2=src?src.title:'同地旧牍';ctx.localId=x.id;
    }else if(need==='surname_note'){
      /* 第四轮：一条姓氏 + 一条边界读法并置 */
      const P=D.peoples||{},su=(P.surnames||[]).filter(
        x=>S.year>=x.y0-200&&S.year<=x.y1+200),no=P.notes||[];
      const pool=su.length?su:(P.surnames||[]);
      const a=pool[Math.floor(rnd()*(pool.length||1))],b=no[Math.floor(rnd()*(no.length||1))];
      if(!a||!b)return null;
      ctx.surname=a.title;ctx.nameNote=b.title;ctx.surnameId=a.id;ctx.nameNoteId=b.id;
    }else if(['price','risk','mineral','weather','specimen'].indexOf(need)>=0){
      /* 第三轮：五个新维度从收集册带进选项，填词取自同期真实条目 */
      const dim={price:'PY',risk:'RS',mineral:'GM',weather:'WO',specimen:'BC'}[need];
      const all=D.civilization.items.filter(x=>x.dim===dim);
      const now=all.filter(x=>S.year>=x.y0-120&&S.year<=x.y1+120);
      const pool=now.length?now:all;
      const x=pool[Math.floor(rnd()*(pool.length||1))];
      if(!x)return null;
      ctx[need]=x.title;ctx[need+'Id']=x.id;ctx.basisId=x.id;ctx.basisDim=dim;
    }
    ctx.year=fmtYear(S.year);
    return ctx;
  }

  /* ---------- 由原型 + 依据条目造一条选项 ---------- */
  function makeOpt(a,basis,S,rnd,ctx,isSpecial,seeking){
    const used=(S.optUse||{})[a.id]||0;
    const decay=Math.pow(O.decayRate,Math.min(used,3));
    const e={};
    Object.keys(a.eff||{}).forEach(k=>{
      e[k]=(e[k]||0)+Math.round((a.eff[k]||0)*decay);
    });
    Object.keys(a.cost||{}).forEach(k=>{e[k]=(e[k]||0)+(a.cost[k]||0);});
    const base=Object.assign({},ctx||{},{
      title:basis?basis.title:(ctx&&ctx.title)||'',
      dim:basis?dimName(basis.dim):'',
      year:fmtYear(S.year),
      act:a.act||''          // 原型文本里的 {act} 也要填，不能留占位符
    });
    const text=seeking?'闻「{title}」而未得其详，{act}':a.text;
    let t=fill(text,base)
      .replace(/\{act\}/g,a.act||'').replace(/\{title\}/g,base.title)
      .replace(/\{dim\}/g,base.dim).replace(/\{year\}/g,base.year)
      .replace(/\{geo\}/g,base.geo||'').replace(/\{climate\}/g,base.climate||'')
      .replace(/\{polity\}/g,base.polity||'').replace(/\{person\}/g,base.person||'')
      .replace(/\{local\}/g,base.local||'').replace(/\{surname\}/g,base.surname||'')
      .replace(/\{people\}/g,base.people||'')
      .replace(/\{\w+\}/g,'');   // 兜底：任何未填的占位符都不允许出现在玩家看到的文本里
    if(used>=2)t+=' · 旧法再用，收效渐薄';
    const k=KIND[a.kind]||KIND.govern;
    const o={
      t:t,e:e,kind:a.kind,badge:k.badge,badgeName:k.name,color:k.color,
      cost:a.cost||{},gain:Object.keys(a.eff||{}).reduce((m,x)=>{m[x]=Math.round((a.eff[x]||0)*decay);return m;},{}),
      risk:a.risk||0,fail:a.fail||{},seeking:!!seeking,
      seekingTitle:seeking?(basis?basis.title:''):'',
      geoTarget:(ctx&&ctx.geo)||null,
      basis:basis?{id:basis.id,title:basis.title,dim:basis.dim,dimName:dimName(basis.dim),rawYear:basis.rawYear||''}:null,
      play:basis&&basis.play?basis.play:null,
      reqText:reqText(a,used),archetype:a.id,
      unlockIds:[],job:a.job||null,echo:a.echo||null,
      isSpecial:!!isSpecial,
      /* 立氏为推演：选中后写回 S.clanName，不宣称真实血缘 */
      clanAdopt:isSpecial&&a.id==='SP_SURNAME'?(ctx&&ctx.surname)||'':null,
      localRef:isSpecial&&a.id==='SP_LOCAL'?(ctx&&ctx.local)||'':null,
      peopleRef:isSpecial&&a.id==='SP_PEOPLE'?(ctx&&ctx.people)||'':null
    };
    /* 知识写回：选中后引见一条同维度未见条目 */
    if(a.unlock==='dim'){
      const pool=unseenItems(S).filter(x=>a.dims.indexOf(x.dim)>=0
        &&(!basis||x.id!==basis.id));
      if(pool.length){
        const x=pool[Math.floor(rnd()*pool.length)];
        o.unlockIds.push(x.id);o.unlockTitle=x.title;
      }
    }
    /* 意外改写：卡面不预告，结果里才揭示；生成时就算定，保证可复现 */
    if(a.surprise&&rnd()<O.surpriseRate){
      const roll=rnd();
      if(roll<.4){o._surprise={kind:'double',text:'【意外】此事竟比预想顺遂，一桩收成翻倍。'};}
      else if(roll<.75){o._surprise={kind:'bonus',text:'【意外】路上另有收获，文脉与货殖各添一笔。',extra:{lore:3,wealth:3}};}
      else{o._surprise={kind:'twist',text:'【意外】险些失手，代价却比预想更重；好在人还在。',cost:{food:-2,cohesion:-2}};}
    }
    return o;
  }
  function reqText(a,used){
    const r=a.req||{},bits=[];
    if(r.seenDim)bits.push('需见过 '+r.seenDim+' 条相关知识');
    Object.keys(r).forEach(k=>{
      if(k==='seenDim'||typeof r[k]!=='number')return;
      bits.push('需'+({food:'仓廪',people:'人丁',craft:'百工',lore:'文脉',might:'兵势',cohesion:'族和',faith:'祭祀',wealth:'货殖'}[k]||k)+' ≥ '+r[k]);
    });
    if(used)bits.push('已用 '+used+' 次');
    return bits.join(' · ');
  }

  /* ---------- 主入口 ---------- */
  function generate(ev,S,rnd,pick){
    /* 题型卡与边界层卡保持原有选项结构，只补展示字段 */
    const raw=(ev.o||[]).map(x=>({t:x[0],e:x[1]||{}}));
    const keepAsIs=ev.quiz||((ev.isClim||ev.isText||ev.isHypothesis)&&raw.length>=3);
    if(keepAsIs){
      const kept=raw.map(o=>Object.assign({},o,{
        kind:'situation',badge:'应',badgeName:'应对',color:'#8fa3ad',
        cost:{},gain:Object.keys(o.e||{}).reduce((m,k)=>{if(o.e[k]>0)m[k]=o.e[k];return m;},{}),
        risk:0,fail:{},basis:null,reqText:'',unlockIds:[],isSpecial:false
      }));
      if(W.difficulty)W.difficulty.shapeOpts(kept,S);
      return kept;
    }

    const seen=seenItems(S),unseen=unseenItems(S);
    const pool=[];
    /* 1 情境本选项：最多留 2 条，保证叙事连贯，但不再靠固定回响凑数 */
    raw.slice(0,2).forEach((o,i)=>{
      pool.push(Object.assign({},o,{
        kind:'situation',badge:'应',badgeName:'应对',color:'#8fa3ad',
        cost:Object.keys(o.e||{}).reduce((m,k)=>{if(o.e[k]<0)m[k]=o.e[k];return m;},{}),
        gain:Object.keys(o.e||{}).reduce((m,k)=>{if(o.e[k]>0)m[k]=o.e[k];return m;},{}),
        risk:0,fail:{},basis:null,reqText:'',unlockIds:[],archetype:'SITU'+i,
        _w:1.15,isSpecial:false
      }));
    });
    /* 2 知识行动：按原型 × 已见条目生成 */
    ARCH.forEach(a=>{
      if(!reqOK(a,seen,S))return;
      const matched=seen.filter(x=>a.dims.indexOf(x.dim)>=0);
      let basis=null;
      if(matched.length)basis=matched[Math.floor(rnd()*matched.length)];
      else if(!(a.req||{}).seenDim&&unseen.length){
        /* 无前置的原型可以「派人寻访」未见条目，选中即写回文明册 */
        const cand=unseen.filter(x=>a.dims.indexOf(x.dim)>=0);
        if(cand.length)basis=cand[Math.floor(rnd()*cand.length)];
      }
      if(!basis&&(a.req||{}).seenDim)return;
      if(!basis)return;
      const seeking=!(S.seenCiv||{})[basis.id];
      const o=makeOpt(a,basis,S,rnd,{},false,seeking);
      if(seeking){
        o.unlockIds.push(basis.id);o.unlockTitle=basis.title;
        o.basis=null;                       // 尚未见过，不能冒充「依据」
      }
      o._w=W.consequences.jobWeight(o,S,weightOf(a,seen,S,rnd));
      W.consequences.jobBump(o,S);
      pool.push(o);
    });
    /* 3 地理／气候／并立政权／同期人物联动 */
    SPECIAL.forEach(a=>{
      const ctx=specialCtx(S,a.need,rnd,pick);
      if(!ctx)return;
      const o=makeOpt(a,null,S,rnd,ctx,true,false);
      o.archetype=a.id;o._w=weightOf(a,seen,S,rnd);
      /* 新联动也写明「依据哪一条真实知识」，并附边界声明 */
      if(ctx.basisId){
        const bx=itemById(ctx.basisId);
        if(bx)o.basis={id:bx.id,title:bx.title,dim:bx.dim,
          dimName:dimName(bx.dim),rawYear:bx.rawYear||''};
      }
      if(a.note)o.reqNote=a.note;
      pool.push(o);
    });
    /* 3.5 后果层：跨笔工程、职业反哺、考据分歧、跨维组合技 */
    if(W.consequences){
      const ex=W.consequences.extras(ev,S,rnd,seen);
      ex.forEach(o=>pool.push(o));
    }

    /* 3.8 立场只改「哪类条目更常出现」，不改条目内容、年代与可信度。
       存异说偏多 → 断代争议条目权重上升；按通说偏多 → 通说条目略升。 */
    const st=S.readingStance||{},susp=st.suspend||0,sett=st.settle||0;
    if(susp+sett>=2){
      pool.forEach(o=>{
        if(!o.basis||!o.basis.id)return;
        const bx=itemById(o.basis.id);if(!bx)return;
        const disputed=bx.consensus==='date_contested'
          ||bx.consensus==='legendary_retroactive';
        const mul=disputed?(susp>sett?1.3:.9):(sett>susp?1.16:.95);
        o._w=(o._w||1)*mul;
        if(mul>1.05)o.reqText=(o.reqText?o.reqText+' · ':'')+'本族读法倾向';
      });
    }
    /* 4 加权抽 3—5 条，不重复原型；情境选项优先保留其一 */
    const want=O.optCount[Math.floor(rnd()*O.optCount.length)];
    const chosen=[],usedId=new Set();
    const situ=pool.filter(o=>o.kind==='situation');
    if(situ.length&&rnd()<.72){
      const s=situ[Math.floor(rnd()*situ.length)];
      chosen.push(s);usedId.add(s.archetype);
    }
    /* 工程续作与分歧对强制露面：否则跨笔决议会被加权抽掉，链条断掉 */
    const forced=pool.filter(o=>o.force&&!usedId.has(o.archetype)).slice(0,2);
    forced.forEach(o=>{usedId.add(o.archetype);chosen.push(o);});
    let guard=0;
    while(chosen.length<want&&guard++<200){
      const alive=pool.filter(o=>!usedId.has(o.archetype));
      if(!alive.length)break;
      let tot=alive.reduce((s,o)=>s+(o._w||1),0),r=rnd()*tot,hit=alive[alive.length-1];
      for(let i=0;i<alive.length;i++){r-=alive[i]._w||1;if(r<=0){hit=alive[i];break;}}
      usedId.add(hit.archetype);chosen.push(hit);
    }
    /* 保底三条：用还没选过的情境选项或原型补齐 */
    if(chosen.length<3){
      pool.forEach(o=>{if(chosen.length<3&&!usedId.has(o.archetype)){usedId.add(o.archetype);chosen.push(o);}});
    }
    /* 分歧对一旦出现其一，另一半也一起进来，才叫「二择其一」 */
    chosen.filter(o=>o.debate).forEach(o=>{
      const pair=pool.find(x=>x.debate&&x.debate.item===o.debate.item
        &&x.debate.choice!==o.debate.choice&&!usedId.has(x.archetype));
      if(pair){usedId.add(pair.archetype);chosen.push(pair);}
    });
    /* 判读三择一：一旦露面就把另外两项一起带进来，
       否则会出现「没有稳妥读法」或「没有误读项」的残缺考题。 */
    chosen.filter(o=>o.reading).forEach(o=>{
      if(chosen.length>=6)return;
      pool.filter(x=>x.reading&&x.reading.id===o.reading.id
        &&!usedId.has(x.archetype)).forEach(x=>{
        if(chosen.length>=6)return;
        usedId.add(x.archetype);chosen.push(x);
      });
    });
    /* 封顶 6 条：优先保留情境、成对项、强制项与工程续作 */
    if(chosen.length>6){
      for(let i=chosen.length-1;i>0&&chosen.length>6;i--){
        const o=chosen[i];
        if(o.reading||o.debate||o.force||o.project||o.kind==='situation')continue;
        chosen.splice(i,1);
      }
    }
    /* 轻度打乱，但情境选项放首位 */
    for(let i=chosen.length-1;i>1;i--){
      const j=1+Math.floor(rnd()*i);
      const tmp=chosen[i];chosen[i]=chosen[j];chosen[j]=tmp;
    }
    chosen.forEach(o=>{delete o._w;});
    /* 难度整形放在生成末尾：卡面与结算读同一份 e / gain / cost / risk，
       保证简单与困难看到的数字就是真正会发生的数字。 */
    if(W.difficulty)W.difficulty.shapeOpts(chosen,S);
    return chosen;
  }

  /* ---------- 选中之后：风险、意外、知识写回、职业、回响 ---------- */
  function apply(o,S,rnd){
    const msgs=[],extra={};
    if(!o||!o.archetype)return {msgs:msgs,extra:extra,unlockIds:[],job:null,echo:null};
    S.optUse=S.optUse||{};S.optUse[o.archetype]=(S.optUse[o.archetype]||0)+1;
    const used=S.optUse[o.archetype];

    /* 风险：失手则另走一套后果 */
    if(o.risk>0&&rnd()<o.risk){
      o._riskFailed=true;   /* 后果层据此把组合技失手记为族谱旧账 */
      Object.keys(o.fail||{}).forEach(k=>{extra[k]=(extra[k]||0)+o.fail[k];});
      msgs.push('【失手】'+String(Math.round(o.risk*100))+'% 的风险落在了这一笔上，'
        +'原本的打算只换来一串要收拾的账。');
    }else if(o.risk>0&&rnd()<.28){
      msgs.push('【险过】这一笔本有 '+String(Math.round(o.risk*100))+'% 失手之虞，竟平安落了地。');
    }
    /* 意外改写：卡面不预告 */
    if(o._surprise){
      const sp=o._surprise;
      msgs.push(sp.text);
      if(sp.kind==='double'){
        const ks=Object.keys(o.gain||{});
        if(ks.length){const k=ks[Math.floor(rnd()*ks.length)];extra[k]=(extra[k]||0)+(o.gain[k]||0);}
      }
      if(sp.extra)Object.keys(sp.extra).forEach(k=>{extra[k]=(extra[k]||0)+sp.extra[k];});
      if(sp.cost)Object.keys(sp.cost).forEach(k=>{extra[k]=(extra[k]||0)+sp.cost[k];});
    }
    /* 知识写回 */
    (o.unlockIds||[]).forEach(id=>{
      const x=itemById(id);if(!x)return;
      const isNew=!(S.seenCiv||{})[id];
      S.seenCiv=S.seenCiv||{};S.seenCiv[id]=1;
      if(isNew){
        msgs.push('【研习】'+x.title+' 录入文明册（'+dimName(x.dim)
          +(x.rawYear?'，'+x.rawYear:'')+'）。');
        S.mil=S.mil||[];S.mil.push({y:S.year,t:'研习 · '+dimName(x.dim)+'／'+x.title});
      }
    });
    /* 本族称法：推演，不攀附真实家族，明确写入编年一次 */
    if(o.clanAdopt&&!S.clanName){
      S.clanName=o.clanAdopt;
      msgs.push('【立氏 · 推演】本族自此以「'+o.clanAdopt+'」一类称法入册；'
        +'得姓多源，这只是游戏里的一支人，不表示与任何历史家族有血缘关系。');
      S.mil=S.mil||[];S.mil.push({y:S.year,t:'立氏（推演） · '+o.clanAdopt});
    }
    /* 地方史引用记一笔，供收卷报告统计 */
    if(o.localRef){S.localSeen=S.localSeen||{};S.localSeen[o.localRef]=1;}
    if(o.peopleRef){S.peopleSeen=S.peopleSeen||{};S.peopleSeen[o.peopleRef]=1;}
    /* 家族职业 */
    if(o.job){
      S.jobs=S.jobs||{};S.jobs[o.job]=(S.jobs[o.job]||0)+1;
      if(S.jobs[o.job]===1)msgs.push('【族中业】自此有人以「'+o.job+'」为业，写进族谱。');
      /* 把「族中业」落到具体族人身上，族谱页才看得到谁习了什么、传给谁 */
      const who=W.people&&W.people.recordSkill(S,o.job);
      if(who)msgs.push('【族谱】'+who.name+' 习「'+o.job+'」，记入其生平（推演）。');
    }
    /* 卷末回响素材 */
    if(o.echo){
      S.optEcho=S.optEcho||[];S.optEcho.push({y:S.year,t:o.echo,kind:o.kind});
      if(S.optEcho.length>24)S.optEcho=S.optEcho.slice(-24);
    }
    if(used>=3)msgs.push('【旧法】同一路数已用 '+used+' 次，边际渐薄；往后的岔路该换一条了。');
    /* 后果层：跨笔工程推进 / 罢手、考据立场、组合技；并回传额外八维 */
    if(W.consequences){
      const CS=W.consequences.settle(o,S,rnd);
      CS.msgs.forEach(m=>msgs.push(m));
      Object.keys(CS.extra||{}).forEach(k=>{extra[k]=(extra[k]||0)+CS.extra[k];});
    }
    /* 迁徙类选项由 engine 改写 S.famPlaces / S.migrations，地图上的家族点才会真的移动 */
    return {msgs:msgs,extra:extra,unlockIds:o.unlockIds||[],job:o.job,echo:o.echo,
      migrate:(o.kind==='migrate'),geoTarget:o.geoTarget||null};
  }
  /* 给 UI 用的一行风险文案 */
  function riskLine(o){
    if(!o||!o.risk)return '';
    const pct=Math.round(o.risk*100);
    const f=Object.keys(o.fail||{}).filter(k=>o.fail[k]).map(k=>
      ({food:'粮',people:'丁',craft:'艺',lore:'文',might:'兵',cohesion:'聚',faith:'信',wealth:'财'}[k]||k)
      +'−'+Math.abs(o.fail[k])).join('、');
    return '失手 '+pct+'%'+(f?' → '+f:'');
  }
  W.options={generate:generate,apply:apply,riskLine:riskLine,seenItems:seenItems,
    unseenItems:unseenItems,reqText:reqText,situation:situation,KIND:KIND};
  if(typeof module!=='undefined'&&module.exports)module.exports=W.options;
})((typeof window!=='undefined'?window:globalThis).WQN=((typeof window!=='undefined'?window:globalThis).WQN||{}));
