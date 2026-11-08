/* consequences.js —— 抉择后果系统（第二层）
   上一轮：知识变成可打出的牌。这一轮：牌打出去之后继续活着。
     A 多轮决议   营建/工造/研习/交易类选中后挂 S.projects，后续笔出现「岁修→验收→放弃」
     B 职业反哺   族中已有该业，收益 ×1.25、权重 ×1.32，卡上写明
     C 考据分歧   已见的「断代争议/传说」条目与同维度通说配对，出互斥二择一
     D 跨维组合技 指定若干维度都见过，才出现高阶复合选项
     E 未走之路   每笔未选中的选项存进 S.roads，卷末与收卷报告可回看
   全部走传入的 rnd，确定性种子不受影响。不依赖 DOM，可在 node 里单测。 */
(function(W){
  'use strict';
  const D=W.data,C=D.consequences;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const KN={people:'丁',food:'粮',craft:'艺',lore:'文',might:'兵',cohesion:'聚',faith:'信',wealth:'财'};
  const fy=y=>y<0?'前'+Math.abs(y):String(y);

  function itemById(id){return D.civilization.items.find(x=>x.id===id);}
  function dimName(k){const d=D.civilization.dimensions.find(x=>x.key===k);return d?d.name:k;}
  function seenItems(S){
    const out=[];
    Object.keys(S.seenCiv||{}).forEach(id=>{const x=itemById(id);if(x)out.push(x);});
    return out;
  }
  function effText(e){
    const up=D.keyOrder.filter(k=>(e||{})[k]>0).map(k=>KN[k]+'+'+e[k]);
    const dn=D.keyOrder.filter(k=>(e||{})[k]<0).map(k=>KN[k]+'−'+Math.abs(e[k]));
    return up.concat(dn).join('　')||'无显效';
  }
  function baseOpt(o){
    return Object.assign({kind:'govern',badge:'续',badgeName:'续作',color:'#c9a227',
      gain:{},cost:{},risk:0,fail:{},basis:null,reqText:'',unlockIds:[],
      isSpecial:false,archetype:o.archetype,force:false},o);
  }

  /* ---------- A 工程：从普通原型挂起 ---------- */
  function projectFor(o,rnd){
    if(!o||!o.kind)return null;
    if(o.project||o.combo||o.debate)return null;
    if(['quiz','situation'].indexOf(o.kind)>=0)return null;
    const dims=(o.basis&&o.basis.dim)?[o.basis.dim]:(o.dims||[]);
    let pool=C.projects.filter(p=>p.kinds.indexOf(o.kind)>=0
      &&p.dims.some(d=>dims.indexOf(d)>=0));
    if(!pool.length)pool=C.projects.filter(p=>p.kinds.indexOf(o.kind)>=0);
    if(!pool.length)return null;
    return pool[Math.floor(rnd()*pool.length)]||pool[0];
  }
  function startProject(o,S,pid,basisTitle,rnd){
    S.projects=S.projects||{};
    /* 同时最多两个在办工程，避免整屏都是续作 */
    const active=Object.values(S.projects).filter(p=>p.stage<p.total);
    if(active.length>=2)return null;
    const key=pid+'_'+(S.turn||0);
    S.projects[key]={key:key,pid:pid,stage:0,total:C.projects.find(p=>p.id===pid).stages.length,
      title:basisTitle||'旧法',started:S.year,log:[]};
    return S.projects[key];
  }
  function projectExtras(S,rnd){
    const out=[];
    Object.values(S.projects||{}).forEach(p=>{
      if(p.stage>=p.total)return;
      const def=C.projects.find(x=>x.id===p.pid);if(!def)return;
      const st=def.stages[p.stage];if(!st)return;
      const text=String(st.text).replace(/\{title\}/g,p.title);
      const o=baseOpt({
        t:'【'+def.name+' · '+st.n+'】'+text,
        e:Object.assign({},st.eff,st.cost),
        gain:Object.assign({},st.eff),cost:Object.assign({},st.cost),
        risk:st.risk||0,fail:st.fail||{},
        kind:'build',badge:'续',badgeName:def.name+' · '+st.n,color:'#c9a227',
        archetype:'PROJ_'+p.key+'_'+p.stage,
        project:{key:p.key,pid:p.pid,stage:p.stage,stageName:st.n},
        reqText:'工程第 '+(p.stage+1)+'/'+p.total+' 笔 · '+p.title,
        basis:{title:p.title,dimName:'跨笔决议',rawYear:fy(p.started)+' 起'},
        force:true,_w:5.5
      });
      out.push(o);
    });
    /* 放弃：只在有在办工程时偶发出现，沉没代价明确写在卡上 */
    const active=Object.values(S.projects||{}).filter(p=>p.stage<p.total);
    if(active.length&&rnd()<.42){
      const p=active[Math.floor(rnd()*active.length)];
      const def=C.projects.find(x=>x.id===p.pid);
      if(def)out.push(baseOpt({
        t:'【'+def.name+' · 罢手】'+def.abandonText,
        e:Object.assign({},def.abandon),
        gain:{},cost:Object.assign({},def.abandon),
        kind:'risk',badge:'罢',badgeName:'中止工程',color:'#e07a6a',
        archetype:'PROJ_ABANDON_'+p.key,
        project:{key:p.key,pid:p.pid,stage:p.stage,abandon:true},
        reqText:'沉没代价 · 已投 '+p.stage+'/'+p.total+' 笔',
        _w:1.0
      }));
    }
    return out;
  }

  /* ---------- D 跨维度组合技 ----------
     79 维之后，要求「指定 3—4 个维度各见过一条」几乎不可能凑齐，
     组合技会变成摆设。改为「见闻足够广 + 命中其中至少两门」：
     既保留「博观之后才打得出高阶牌」的意思，也让它在长局里真的出现。
     同一笔最多放 2 个，按命中数、已用次数与确定性扰动排序。 */
  function comboExtras(seen,S,rnd){
    const dims={};seen.forEach(x=>{dims[x.dim]=(dims[x.dim]||0)+1;});
    const dimsTotal=Object.keys(dims).length;
    if(dimsTotal<3)return [];
    const cand=[];
    C.combos.forEach(cb=>{
      const hit=cb.need.filter(d=>dims[d]>=1).length;
      const sum=cb.need.reduce((s,d)=>s+(dims[d]||0),0);
      if(hit<2||sum<2)return;
      const used=(S.optUse||{})['COMBO_'+cb.id]||0;
      if(used>=2)return;
      cand.push({cb:cb,hit:hit,sum:sum,used:used,
        score:hit*10+sum-used*5+rnd()*.6});
    });
    cand.sort((a,b)=>b.score-a.score);
    /* 题库扩到 264 道后，高阶牌容易被三择一挤没：每笔只放 1 个，但权重显著抬高 */
    return cand.slice(0,1).map(({cb,hit})=>{
      const txt=String(cb.text).replace(/\{act\}/g,cb.act);
      return baseOpt({
        t:'【组合 · '+cb.name+'】'+txt,
        e:Object.assign({},cb.eff,cb.cost),
        gain:Object.assign({},cb.eff),cost:Object.assign({},cb.cost),
        risk:cb.risk||0,fail:cb.fail||{},
        kind:cb.kind,badge:cb.badge,badgeName:'组合技',color:'#b49ad9',
        archetype:'COMBO_'+cb.id,
        combo:cb.id,
        reqText:'广博见闻 · 已见 '+dimsTotal+' 维，命中相关 '+hit+'/'+cb.need.length+' 门'
          +'（不要求凑齐全部）',
        reqNote:cb.note,
        echo:cb.echo,
        _w:2.6+rnd()*.8
      });
    });
  }

  /* ---------- C 考据分歧：二择其一 ---------- */
  function debateExtras(seen,S,rnd){
    const disputed=seen.filter(x=>x.consensus==='date_contested'
      ||x.consensus==='legendary_retroactive');
    if(disputed.length<C.debate.minSeen)return [];
    if(rnd()>C.debate.chance)return [];
    const x=disputed[Math.floor(rnd()*disputed.length)];
    const settled=seen.find(y=>y.dim===x.dim&&y.consensus==='settled');
    const label=x.status||'断代有争议';
    return C.debate.options.map((op)=>baseOpt({
      t:'【分歧 · '+short(x.title)+'】'+op.t,
      e:Object.assign({},op.e),gain:Object.assign({},op.e),cost:{},
      kind:'quiz',badge:'辨',badgeName:'考据分歧',color:'#b49ad9',
      archetype:'DEBATE_'+x.id+'_'+op.id,
      debate:{item:x.id,title:x.title,status:label,choice:op.id,
        settled: settled?settled.title:null},
      reqText:C.debate.label+'　'+label+(settled?' · 通说〈'+short(settled.title)+'〉':' · 本维度无并列通说条目'),
      note:C.debate.disclaimer,
      _w:1.6
    }));
  }
  function short(s){return String(s).length>14?s.slice(0,13)+'…':s;}
  function quizData(){return D.reading_quiz||{items:[],meta:{}};}

  /* ---------- C2 辨其读法：把 106 则深读卡变成可答的考据题 ----------
     优先从「本局已见维度」里出题，答过的不再重复；一对互斥选项，
     正确项是分层存疑，错误项就是数据里明列的常见误解。
     只辨析读法，不判定史实，不改写任何条目。 */
  function readingExtras(S,rnd,seen){
    const Q=quizData();
    if(!Q.items||!Q.items.length)return [];
    const seenDims=new Set((seen||[]).map(x=>x.dim));
    const done=S.readingSeen||{};
    const pool=Q.items.filter(x=>!done[x.id]
      &&(x.y0===undefined||(S.year>=x.y0-120&&S.year<=x.y1+120)));
    if(!pool.length)return [];
    if(rnd()>(Q.meta.chance!==undefined?Q.meta.chance:.26))return [];
    const rel=pool.filter(x=>seenDims.has(x.dim)||x.kind!=='reading');
    const src=rel.length?rel:pool;
    /* 第五轮扩容的两类题按权重优先露面，否则会被 174 道老题稀释到几乎玩不到 */
    let tot=0,r=rnd()*src.reduce((a,x)=>a+((x.kind==='surname_origin'
      ||x.kind==='term_layer')?2.2:1),0),q=src[src.length-1];
    for(const x of src){
      r-=(x.kind==='surname_origin'||x.kind==='term_layer')?2.2:1;
      if(r<=0){q=x;break;}
    }
    const badge=q.badge||'辨其读法';
    const mk=(txt,eff,choice)=>baseOpt({
      t:'【'+badge+' · '+(q.kind==='reading'?dimName(q.dim):'互证与称谓')+'】'+txt,
      e:Object.assign({},eff),gain:Object.assign({},eff),cost:{},
      kind:'quiz',badge:'辨',badgeName:badge,color:'#b49ad9',
      archetype:'READ_'+q.id+'_'+choice,
      reading:{id:q.id,refId:q.refId||q.ddId,kind:q.kind||'reading',dim:q.dim,
               topic:q.topic,choice:choice,correct:choice==='ok',
               why:q.why,further:q.further,misread:q.misread,
               stance:choice==='ok'?(q.stanceOk||'suspend')
                 :choice==='mid'?(q.stanceMid||'settle'):null},
      reqText:q.stem+'　（'+q.rank+' · 只辨析读法，不判定史实）',
      reqNote:Q.meta.boundary,
      echo:choice==='ok'?q.okEcho:choice==='mid'?q.midEcho:q.badEcho,
      _w:1.3
    });
    return [mk(q.ok,q.okEff||{lore:6,cohesion:2},'ok'),
            mk(q.mid||'折中：先按通说落笔，异说另注',q.midEff||{lore:3,cohesion:1},'mid'),
            mk(q.bad,q.badEff||{lore:-2},'bad')];
  }

  /* ---------- F 族账：组合技失手留下的旧账，后续可清 ----------
     失手原本只扣一次数值就消失。这里让它在族谱里挂一笔，
     后面出现「清旧账」选项，清掉才给一点收尾加成。全为推演。 */
  function debtExtras(S,rnd){
    /* 跨代：上一代没收拾完的，由下一代当家之后才清；时间久远也可兜底清账，
       避免短局里永远不换代导致旧账悬空。全为推演。 */
    const debts=(S.famDebts||[]).filter(d=>!d.cleared
      &&(S.gen>(d.gen||0)||S.year-d.y>=150));
    if(!debts.length)return [];
    const d=debts[0];
    return [baseOpt({
      t:'【清账 · '+short(d.t)+'】把当年没成的那一笔重新收拾',
      e:{wealth:5,cohesion:5,lore:3,food:-4},
      gain:{wealth:5,cohesion:5,lore:3},cost:{food:-4},
      risk:.12,fail:{cohesion:-3,food:-2},
      kind:'govern',badge:'账',badgeName:'清旧账',color:'#c9a227',
      archetype:'DEBT_'+d.combo+'_'+d.y,
      debt:{y:d.y,combo:d.combo},
      reqText:'族谱旧账 · '+fy(d.y)+' 年那笔「'+short(d.t)+'」传到第 '+S.gen+' 代才收拾；'
        +'清账只是收拾自家决策，不改写已发生的史实',
      reqNote:'族账与清账均为游戏推演，不冒充任何真实制度。',
      echo:'上一代没收拾完的，这一代接着收拾完就算了。',
      force:true,_w:1.7
    })];
  }

  /* ---------- 主入口：给 options.generate 的额外池 ---------- */
  function extras(ev,S,rnd,seen){
    seen=seen||seenItems(S);
    let out=[];
    try{out=out.concat(projectExtras(S,rnd));}catch(e){}
    try{out=out.concat(comboExtras(seen,S,rnd));}catch(e){}
    try{out=out.concat(debateExtras(seen,S,rnd));}catch(e){}
    try{out=out.concat(readingExtras(S,rnd,seen));}catch(e){}
    try{out=out.concat(debtExtras(S,rnd));}catch(e){}
    /* 职业反哺：给已有同业的原型加收益与权重 */
    const jobs=S.jobs||{};
    out.forEach(o=>{
      if(o.project&&o.project.abandon)return;
      const job=C.projects.find(p=>p.id===(o.project||{}).pid);
      const jobName=job?job.job:null;
      if(jobName&&jobs[jobName]){
        Object.keys(o.gain||{}).forEach(k=>{o.gain[k]=Math.round(o.gain[k]*C.jobBoost.rate);});
        o.e=Object.assign({},o.gain,o.cost);
        o.reqText=(o.reqText?o.reqText+' · ':'')+C.jobBoost.label+'「'+jobName+'」· 收效↑';
        o._w=(o._w||1)*C.jobBoost.weight;
      }
    });
    return out;
  }
  /* 给普通原型也加职业反哺（在 options.weightOf 之后调用） */
  function jobBump(o,S){
    if(!o||!o.job)return o;
    const n=(S.jobs||{})[o.job]||0;
    if(!n||o.combo||o.project)return o;
    Object.keys(o.gain||{}).forEach(k=>{o.gain[k]=Math.round(o.gain[k]*C.jobBoost.rate);});
    o.e=Object.assign({},o.gain,o.cost||{});
    o.reqText=(o.reqText?o.reqText+' · ':'')+C.jobBoost.label+'「'+o.job+'」· 收效↑';
    return o;
  }
  function jobWeight(o,S,w){
    if(!o||!o.job)return w;
    const n=(S.jobs||{})[o.job]||0;
    return n?w*C.jobBoost.weight:w;
  }

  /* ---------- 选中之后：工程推进、立场、组合技账本 ---------- */
  function settle(o,S,rnd){
    const msgs=[],extra={};
    if(!o)return {msgs:msgs,extra:extra,started:null,finished:null,abandoned:null};
    /* 组合技失手 → 族谱挂一笔旧账，后续有「清账」支线 */
    if(o._riskFailed&&o.combo){
      S.famDebts=S.famDebts||[];
      S.famDebts.push({y:S.year,gen:S.gen||1,combo:o.combo,t:o.t,cleared:false});
      if(S.famDebts.length>6)S.famDebts=S.famDebts.slice(-6);
      msgs.push('【旧账】这一笔没成，族谱里记下一笔待收拾的账，往后有人会接着还。');
      S.mil.push({y:S.year,t:'旧账 · '+short(o.t)});
    }
    /* 工程续作 / 罢手 */
    if(o.project){
      const p=(S.projects||{})[o.project.key];
      const def=C.projects.find(x=>x.id===o.project.pid);
      if(!p||!def)return {msgs:msgs,extra:extra,started:null,finished:null,abandoned:null};
      if(o.project.abandon){
        delete S.projects[o.project.key];
        Object.keys(def.abandon).forEach(k=>{extra[k]=(extra[k]||0)+def.abandon[k];});
        msgs.push('【罢手】'+def.name+'中止，'+def.abandonText);
        S.mil.push({y:S.year,t:'工程中止 · '+def.name});
        return {msgs:msgs,extra:extra,started:null,finished:null,abandoned:def.name};
      }
      p.stage++;
      p.log.push({y:S.year,n:def.stages[p.stage-1].n});
      if(p.stage>=p.total){
        /* 验收完成：长期账本写回 + 里程碑 + 回响 */
        S.projectLedger=S.projectLedger||{};
        Object.keys(def.ledger).forEach(k=>{
          S.projectLedger[k]=clamp((S.projectLedger[k]||0)+def.ledger[k],0,C.ledgerCap);
        });
        S.completedProjects=S.completedProjects||[];
        S.completedProjects.push({name:def.name,from:p.started,to:S.year,title:p.title,
          note:def.ledgerNote});
        if(S.completedProjects.length>12)S.completedProjects=S.completedProjects.slice(-12);
        S.mil.push({y:S.year,t:'工程既成 · '+def.name+'（'+(S.year-p.started)+' 年 / '+p.total+' 笔）'});
        msgs.push('【工程既成】'+def.name+'走完 '+p.total+' 笔。'+def.ledgerNote);
        if(def.echo){S.optEcho=S.optEcho||[];S.optEcho.push({y:S.year,t:def.echo,kind:'build'});}
        delete S.projects[o.project.key];
        return {msgs:msgs,extra:extra,started:null,finished:def.name,abandoned:null};
      }
      msgs.push('【'+def.name+' · '+def.stages[p.stage-1].n+'】已记一笔，'
        +'还差 '+(p.total-p.stage)+' 笔才验收；中途可以罢手，但投入不会退回来。');
      return {msgs:msgs,extra:extra,started:null,finished:null,abandoned:null};
    }
    /* 考据分歧立场 */
    if(o.debate){
      S.stances=S.stances||[];
      S.stances.push({y:S.year,title:o.debate.title,status:o.debate.status,
        choice:o.debate.choice,settled:o.debate.settled});
      if(S.stances.length>20)S.stances=S.stances.slice(-20);
      S.quiz=S.quiz||{right:0,wrong:0};
      if(o.debate.choice==='suspend')S.quiz.right++;
      const op=C.debate.options.find(x=>x.id===o.debate.choice);
      if(op&&op.echo){S.optEcho=S.optEcho||[];S.optEcho.push({y:S.year,t:op.echo,kind:'quiz'});}
      msgs.push('【取舍】关于「'+o.debate.title+'」（'+o.debate.status+'），'
        +(o.debate.choice==='suspend'?'这一族把异说一并存下，不作定论。':'这一族按通说落笔，异说另注。')
        +C.debate.disclaimer);
      S.mil.push({y:S.year,t:'考据取舍 · '+o.debate.title});
      return {msgs:msgs,extra:extra,started:null,finished:null,abandoned:null};
    }
    /* 清旧账：只收拾自家决策，不改写已发生的史实 */
    if(o.debt){
      const head=(S.fam||[]).find(p=>p.id===S.ruler&&p.alive);
      S.famDebts=(S.famDebts||[]).map(d=>
        (d.y===o.debt.y&&d.combo===o.debt.combo)
          ?Object.assign({},d,{cleared:true,clearedBy:head?head.id:null,
            clearedByName:head?head.name:''}):d);
      S.clearedDebts=(S.clearedDebts||0)+1;
      msgs.push('【清账】'+fy(o.debt.y)+' 年那笔旧账收拾完了，族里把它从待办里划掉。');
      S.mil.push({y:S.year,t:'清账 · 旧账已了'});
      extra.wealth=(extra.wealth||0)+2;extra.cohesion=(extra.cohesion||0)+2;
      return {msgs:msgs,extra:extra,started:null,finished:null,abandoned:null};
    }
    /* 三择一判读：ok 记判读正确 + 存异说，mid 记按通说折中，bad 记误读。
       立场只影响后续条目出现概率，不改任何条目内容。 */
    if(o.reading){
      const r=o.reading;
      S.readingSeen=S.readingSeen||{};S.readingSeen[r.id]=1;
      S.readingByKind=S.readingByKind||{};
      S.readingByKind[r.kind]=(S.readingByKind[r.kind]||0)+1;
      S.readingStance=S.readingStance||{suspend:0,settle:0};
      S.readingLog=S.readingLog||[];
      S.readingLog.push({y:S.year,id:r.id,kind:r.kind,topic:r.topic,
        choice:r.choice,correct:r.choice==='ok'});
      if(S.readingLog.length>40)S.readingLog=S.readingLog.slice(-40);
      S.quiz=S.quiz||{right:0,wrong:0};
      if(r.choice==='ok'){
        S.quiz.right++;S.readingStance.suspend++;
        msgs.push('【判读】「'+r.topic+'」按分层存疑落笔：'+r.why);
        S.mil.push({y:S.year,t:'判读 · 辨明 '+r.topic});
      }else if(r.choice==='mid'){
        S.readingStance.settle++;
        msgs.push('【判读】「'+r.topic+'」先按通说落笔，异说另注；这一族没替后人定论。');
        S.mil.push({y:S.year,t:'判读 · 折中 '+r.topic});
      }else{
        S.quiz.wrong++;
        msgs.push('【判读】「'+r.misread+'」是这一册列出的常见误解，不宜直取为结论。'
          +'可往「'+r.further+'」再追一步。');
        S.mil.push({y:S.year,t:'判读 · 误取 '+r.topic});
      }
      const op=quizData().meta;
      if(op&&op.boundary)msgs.push('【边界】'+op.boundary);
      return {msgs:msgs,extra:extra,started:null,finished:null,abandoned:null};
    }
    /* 组合技：只记一笔，不改史实 */
    if(o.combo){
      const cb=C.combos.find(x=>x.id===o.combo);
      if(cb){
        S.mil.push({y:S.year,t:'组合技 · '+cb.name});
        msgs.push('【组合技】'+cb.name+'。'+cb.note);
      }
      return {msgs:msgs,extra:extra,started:null,finished:null,abandoned:null};
    }
    /* 普通原型：按概率挂起一个工程（不影响本次收益） */
    if(o.kind&&['quiz','situation','migrate'].indexOf(o.kind)<0&&rnd()<.34&&!o.isSpecial){
      const pid=projectFor(o,rnd);
      if(pid){
        const pr=startProject(o,S,pid.id,(o.basis&&o.basis.title)||o.seekingTitle||'旧法',rnd);
        if(pr){
          msgs.push('【立项】此事不是一笔能完的：「'+pr.title+'」已挂为「'+pid.name+'」，'
            +'往后还会出现岁修、验收与罢手。'+pid.intro);
          S.mil.push({y:S.year,t:'立项 · '+pid.name});
          return {msgs:msgs,extra:extra,started:pid.name,finished:null,abandoned:null};
        }
      }
    }
    return {msgs:msgs,extra:extra,started:null,finished:null,abandoned:null};
  }

  /* ---------- 长期账本：并入 engine.ledger() ---------- */
  function ledgerBonus(S){
    const out={};D.keyOrder.forEach(k=>out[k]=0);
    Object.keys(S.projectLedger||{}).forEach(k=>{if(out[k]!==undefined)out[k]+=S.projectLedger[k];});
    return out;
  }

  /* ---------- E 未走之路 ---------- */
  function recordRoads(S,idx,opts,year){
    if(!opts||opts.length<2)return;
    S.roads=S.roads||[];
    const vol=(S.vol&&S.vol.n)||1;
    opts.forEach((o,i)=>{
      if(i===idx)return;
      S.roads.push({y:year,vol:vol,t:o.t,kind:o.kind||'situation',
        gain:o.gain||{},cost:o.cost||{},risk:o.risk||0,
        basis:o.basis?o.basis.title:(o.seekingTitle||null),
        badge:o.badgeName||'应对',
        project:!!o.project,combo:!!o.combo,debate:!!o.debate});
    });
    if(S.roads.length>C.roads.keep)S.roads=S.roads.slice(-C.roads.keep);
  }
  function volumeRoads(S,volN,n){
    const all=(S.roads||[]).filter(r=>r.vol===volN);
    /* 优先挑「有依据 / 工程 / 组合 / 分歧」的，比纯情境更有回看价值 */
    const scored=all.map(r=>({r:r,s:(r.basis?3:0)+(r.project?2:0)+(r.combo?3:0)
      +(r.debate?2:0)+Object.keys(r.gain||{}).length*.4}));
    scored.sort((a,b)=>b.s-a.s);
    return scored.slice(0,n||C.roads.perVolume).map(x=>x.r);
  }
  function allRoads(S,n){return (S.roads||[]).slice(-(n||12)).reverse();}
  function stanceLine(S){
    const st=S.stances||[];if(!st.length)return '';
    const susp=st.filter(x=>x.choice==='suspend').length;
    return susp>=st.length/2
      ?'这一卷遇上的几处断代争议，族里多半把异说一并存下，没有替后人定论。'
      :'这一卷遇上断代争议，族里多按通说落笔，异说只作旁注。';
  }

  W.consequences={extras:extras,settle:settle,ledgerBonus:ledgerBonus,
    jobBump:jobBump,jobWeight:jobWeight,
    recordRoads:recordRoads,volumeRoads:volumeRoads,allRoads:allRoads,
    stanceLine:stanceLine,effText:effText,seenItems:seenItems,
    projectFor:projectFor,startProject:startProject,
    readingExtras:readingExtras,debtExtras:debtExtras,quizData:quizData,
    data:C};
  if(typeof module!=='undefined'&&module.exports)module.exports=W.consequences;
})((typeof window!=='undefined'?window:globalThis).WQN=((typeof window!=='undefined'?window:globalThis).WQN||{}));
