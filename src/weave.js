/* weave.js —— 分卷、终章、里程碑、收卷报告
   借鉴 ink 的 weave：分支(stitch)各自走，到卷末必汇于一处(gather)，
   汇流结果写回下一卷起点。这样「无限分支」有节奏，也真的会收束。 */
(function(W){
  'use strict';
  const D=W.data, V=D.vol, KN={
    people:'人丁',food:'仓廪',craft:'百工',lore:'文脉',
    might:'兵势',cohesion:'族和',faith:'祭祀',wealth:'货殖'
  };
  function volTitle(n){return V.titles[Math.min(n-1,V.titles.length-1)]||('第'+n+'卷');}
  function newVolume(S,n){
    S.vol={n:n,startYear:S.year,startSt:Object.assign({},S.st),
      startTags:Object.assign({},S.tags),startLog:S.log.length,
      startMil:S.mil.length,startDead:S.dead,startGen:S.gen};
    S.volTurn=0;S.stitches=[];
  }
  function stitch(S,o,ev){
    S.stitches=S.stitches||[];
    S.stitches.push({t:o.t,e:o.e||{},tag:(o.e||{}).tag||null,
      chain:(o.e||{}).chain||null,hist:!!ev.isHist,title:ev.t});
  }
  /* 卷末 gather：把散开的分支收成一句回响 + 一处写回 */
  function gather(S){
    const st=S.stitches||[],sum={};
    D.keyOrder.forEach(k=>sum[k]=0);
    let chains=0,hist=0;
    st.forEach(x=>{
      D.keyOrder.forEach(k=>{if(x.e[k])sum[k]+=x.e[k];});
      if(x.chain)chains++;if(x.hist)hist++;
    });
    const top=D.keyOrder.slice().sort((a,b)=>sum[b]-sum[a])[0];
    const gain=sum[top]>0?3:0;
    const title=volTitle(S.vol?S.vol.n:1);
    let echo;
    if(hist>=4)echo='这一卷岔路虽多，末了都汇进史海里——'+hist+' 桩可考之事，把这一族人钉在了大年月上。';
    else if(chains>=3)echo='选下去的每一步都又牵出新的一步，像渠分了又合；到卷末，水仍归同一条。';
    else if(gain)echo='十几笔各奔东西，算下来，最后都落在'+KN[top]+'上。它带着这一卷的分量，进到下一卷。';
    else echo='这一卷没往哪一处偏。岔开，又平平地合回来，也算是种走法。';
    /* 选项留下的行当与回响，也在卷末汇进来，让抉择不只是八维数字 */
    const echoes=(S.optEcho||[]).slice(-3);
    if(echoes.length)echo+='　'+echoes.map(x=>x.t).join('');
    /* 考据立场的口径也汇进来：这一族对断代争议是「存异」还是「从通说」 */
    const stLine=W.consequences?W.consequences.stanceLine(S):'';
    if(stLine)echo+='　'+stLine;
    /* 本卷判读与族账也汇进来：抉择不只落在八维上，还留下读法倾向与未了的旧账 */
    const v=S.vol||{};
    const rl=(S.readingLog||[]).filter(x=>x.y>=(v.startYear||S.year));
    if(rl.length){
      const ok=rl.filter(x=>x.choice==='ok').length,
            bad=rl.filter(x=>x.choice==='bad').length,mid=rl.length-ok-bad;
      echo+='　这一卷辨了 '+rl.length+' 处读法（稳妥 '+ok+'／折中 '+mid+'／误取 '+bad+'）；'
        +(ok>=bad?'争不清楚的那几页，族里多半把异说一并存下。'
                 :'误取的那几笔，往后还得回头擦。');
    }
    const debts=(S.famDebts||[]).filter(d=>!d.cleared);
    if(debts.length)echo+='　族谱上还挂着 '+debts.length+' 笔旧账，得等下一代人来收拾。';
    if(S.clearedDebts)echo+='　已有 '+S.clearedDebts+' 笔旧账了结。';
    if(gain){S.st[top]=Math.min(100,S.st[top]+gain);}
    const logs=S.log.slice(v.startLog||0),mil=S.mil.slice(v.startMil||0);
    const diff={};D.keyOrder.forEach(k=>diff[k]=S.st[k]-(v.startSt? v.startSt[k]||0:0));
    return {n:v.n||1,title:title,from:v.startYear||S.year,to:S.year,
      picks:logs.filter(l=>l.k==='choice').length,
      hist:mil.filter(m=>m.t.indexOf('亲历 · ')===0).map(m=>m.t.slice(5)),
      fam:logs.filter(l=>l.k==='fam').map(l=>l.t),
      mil:mil.map(m=>m.t),
      newTags:Object.keys(S.tags).filter(t=>!(v.startTags||{})[t]),
      dead:S.dead-(v.startDead||0),gen:S.gen-(v.startGen||1),
      diff:diff,echo:echo,top:top,gain:gain,chains:chains,histCount:hist,
      optEcho:echoes,jobs:Object.keys(S.jobs||{}),
      roads:(W.consequences?W.consequences.volumeRoads(S,S.vol?S.vol.n:1,3):[]),
      projects:(S.projects?Object.values(S.projects).filter(p=>p.stage<p.total).map(p=>({
        name:(W.consequences.data.projects.find(x=>x.id===p.pid)||{}).name||p.pid,
        stage:p.stage,total:p.total,title:p.title,from:p.started})) :[]),
      completed:(S.completedProjects||[]).slice(-2)};
  }
  function metricValue(S,m){
    if(m==='tags')return Object.keys(S.tags).length;
    if(m==='gen')return S.gen;
    if(m==='year')return S.year;
    if(m==='score')return S.score;
    if(m==='people')return S.st.people;   // 八维「人丁」，非在籍人数，否则开局三人即触发
    return 0;
  }
  function checkEnding(S){
    if(S.ended)return null;
    for(const e of D.endings){
      const v=metricValue(S,e.metric);
      const goal=e.metric==='people'&&W.difficulty?W.difficulty.peopleFloor(S):e.goal;
      if(e.metric==='people'?v<=goal:v>=goal)return e;
    }
    return null;
  }
  function endProgress(S){
    const a=D.endings.map(e=>{
      const goal=e.goal;
      let p;
      if(e.metric==='people')p=Math.min(.99,(35-S.st.people)/30);
      else if(e.metric==='year')p=(S.year+5000)/(goal+5000);
      else p=metricValue(S,e.metric)/goal;
      return [e.name.replace('之终',''),Math.max(0,p)];
    });
    a.sort((x,y)=>y[1]-x[1]);
    return a[0][0]+'之终 '+Math.min(99,Math.round(a[0][1]*100))+'%';
  }
  function nextNode(S){
    if(S.mode==='succession'&&S.chainState){
      const c=D.succession.chains[S.chainState.region];
      if(!c)return '朝代长河';
      const l=c.entities[S.chainState.idx];
      const left=Math.max(0,D.succession.STEPS_PER_ENTITY-S.chainState.entityTurn);
      if(S.entity&&S.entity.endedShown)return '长河终章已至 · 可收卷';
      return l.name+' 还剩 '+left+' 笔 · 第 '+(S.chainState.idx+1)+'/'+c.entities.length+' 朝';
    }
    if(S.mode==='real'&&S.entity){
      const e=D.entities.entities.find(x=>x.id===S.entity.id);
      if(!e)return '真实血脉';
      if(S.entity.endedShown)return '真实终章已至 · 可收卷或续为遗民';
      const i=Math.max(0,Math.min(5,S.entity.phaseIdx));
      const nx=e.phases[Math.min(5,i+1)];
      return '下一阶段：'+nx.phase+'（'+nx.label+'） · 卷末还差 '+Math.max(0,V.len-S.volTurn)+' 笔';
    }
    if(S.ended)return '终章已至 · 此后为余编';
    return '卷末汇流（还差 '+Math.max(0,V.len-S.volTurn)+' 笔） · '+endProgress(S);
  }
  function verdict(S){
    const order=D.keyOrder.slice();
    const top=order.sort((a,b)=>S.st[b]-S.st[a]).slice(0,2);
    const low=order.slice().sort((a,b)=>S.st[a]-S.st[b])[0];
    return '这一局偏在'+KN[top[0]]+'与'+KN[top[1]]+'，'+KN[low]+'始终薄些。'
      +'史海可考者 '+Object.keys(S.used).length+' 桩，旧例 '+Object.keys(S.tags).length+' 则，'
      +'在籍 '+S.fam.filter(p=>p.alive).length+' 人，凋零 '+S.dead+' 人。';
  }
  function scrollData(S,final){
    return {final:final,from:-5000,to:S.year,turn:S.turn,
      vol:S.vol?S.vol.n:1,gen:S.gen,score:Math.round(S.score),
      st:Object.assign({},S.st),verdict:verdict(S),
      hist:D.events.filter(x=>S.used[x.id]),
      alive:S.fam.filter(p=>p.alive).sort((a,b)=>b.gen-a.gen||b.age-a.age),
      rulers:S.fam.filter(p=>p.role==='ruler'),
      tags:Object.keys(S.tags),tagCounts:Object.assign({},S.tags),
      mil:S.mil.slice(),dead:S.dead,ending:S.ending||null,
      realEnd:S.realEnd||null,
      chain:(S.mode==='succession'&&S.chainState)?(function(){
        const c=D.succession.chains[S.chainState.region];
        return c?{title:c.title,region:c.region,classification:c.classification,
          from:c.from,to:c.to,
          entities:c.entities.map((e,i)=>({name:e.name,from:e.startYear,to:e.endYear,
            transition:e.transition,visited:i<=S.chainState.idx,
            gap:e.gapToNext?{name:e.gapToNext.name,years:e.gapToNext.years}:null}))}:null;
      })():null,
      civ:(function(){
        if(!D.civilization)return null;
        const seen=D.civilization.items.filter(x=>S.seenCiv&&S.seenCiv[x.id]);
        return {total:D.civilization.items.length,
          seen:seen,
          byDim:D.civilization.dimensions.map(d=>({name:d.name,
            got:seen.filter(x=>x.dim===d.key).length,
            total:D.civilization.items.filter(x=>x.dim===d.key).length}))};
      })(),
      entity:((S.mode==='real'||S.mode==='succession')&&S.entity)?(function(){
        const HOUSE=(D.house_entities&&D.house_entities.entities)||[];
        const e=D.entities.entities.find(x=>x.id===S.entity.id)
          ||HOUSE.find(x=>x.id===S.entity.id);
        const DP=D.entities.disputes||{};
        return e?{name:e.name,phases:e.phases,isHouse:!!S.houseId,
          endReason:e.phases[5].note,
          dispute:DP[e.name]||null}:null;
      })():null,
      dynasty:(W.dynasty)?W.dynasty.summary(S):null,
      volLog:S.volLog||[]};
  }
  W.weave={volTitle:volTitle,newVolume:newVolume,stitch:stitch,gather:gather,
    checkEnding:checkEnding,endProgress:endProgress,nextNode:nextNode,
    verdict:verdict,scrollData:scrollData,keyNames:KN};
  if(typeof module!=='undefined'&&module.exports)module.exports=W.weave;
})((typeof window!=='undefined'?window:globalThis).WQN=((typeof window!=='undefined'?window:globalThis).WQN||{}));
