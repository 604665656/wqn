/* people.js —— 族人生平 / 技能 / 传承 / 史册对照
   纯逻辑、无 DOM，可在 node 里单独测；不调用主 rnd()，只从 person.id 派生，
   因此给旧档补字段也不会改变 rngState，同种子复盘逐笔一致。

   最重要的边界：本局族人一律是推演生成的人物，**不是历史名人**。
   这里做的是「同名用字检索」与「本局遇见的真实人物」分栏对照，
   不把族人写成某位历史人物，也不推断任何血缘、世系或攀附关系。 */
(function(W){
  'use strict';
  const D=W.data;

  /* ---------- 派生哈希：不消耗随机状态，旧档稳定 ---------- */
  function h32(s){
    let h=0x811c9dc5;s=String(s);
    for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=(h*0x01000193)>>>0;}
    return h>>>0;
  }
  const u=(s)=>h32(s)/4294967296;
  const pick=(arr,k)=>{k=k%arr.length;return arr[k<0?k+arr.length:k];};

  /* ---------- 技能：真实写回 + 承袭 ---------- */
  /* 选项写回时落到具体族人身上；旧档没有 p.skills 的，按 id 从「族中业」派生一条承袭，
     标清来源，不冒充这个人真的做过该业。 */
  function recordSkill(S,job){
    if(!job||!S)return null;
    const alive=(S.fam||[]).filter(p=>p.alive);
    if(!alive.length)return null;
    const head=alive.find(p=>p.id===S.ruler)||alive[0];
    /* 一半落在当家，一半按年份派给其他在籍者；用派生值，不摇主 rng */
    const person=(u((S.year||0)+':'+head.id+':'+job)<.55)
      ?head:pick(alive,Math.floor(u((S.year||0)+'#'+job)*alive.length));
    person.skills=person.skills||[];
    if(person.skills.indexOf(job)<0&&person.skills.length<8)person.skills.push(job);
    S.skillLog=S.skillLog||[];
    S.skillLog.push({y:S.year,who:person.id,name:person.name,job:job});
    if(S.skillLog.length>60)S.skillLog=S.skillLog.slice(-60);
    return person;
  }

  function skillsOf(S,p){
    const real=(p.skills||[]).slice();
    const jobs=Object.keys(S.jobs||{});
    const inherited=[];
    /* 承袭只给「父辈有业、本人未亲习」的读法：派生出 1—2 条，明确标为承袭 */
    if(jobs.length&&p.parent){
      const n=1+(u(p.id+'#inherit')>.62?1:0);
      for(let i=0;i<n;i++){
        const j=pick(jobs,Math.floor(u(p.id+'#'+i)*jobs.length));
        if(real.indexOf(j)<0&&inherited.indexOf(j)<0)inherited.push(j);
      }
    }
    return {real:real,inherited:inherited,
      all:real.concat(inherited.map(x=>x+'（承袭）'))};
  }

  /* ---------- 传承：父 / 子 / 承自 / 旧账 / 继立 ---------- */
  function lineageOf(S,p){
    const fam=S.fam||[];
    const parent=fam.find(x=>x.id===p.parent);
    const children=fam.filter(x=>x.parent===p.id);
    const parentName=parent?parent.name:(p.fromName||'（父辈已不在册）');
    /* 承自：性情、落脚地、称法、业。用派生值决定「是否承其性情」，不摇 rng */
    const from=[];
    if(parent){
      from.push('本族称法（推演）');
      if(p.place&&parent.place===p.place)from.push('落脚地 '+placeName(S,p.place));
      if(u(p.id+'#trait')<.38)from.push('性情「'+parent.trait+'」');
      const ps=(parent.skills||[]);
      if(ps.length)from.push('父辈之业「'+ps[0]+'」');
    }else if(p.parent)from.push('父辈 '+parentName+' 已不在册，仅存其名（推演）');
    else from.push('开局一支人，无父辈可考（推演）');
    /* 接过的旧账：清账结算时会写 clearedBy */
    const debts=(S.famDebts||[]).filter(d=>d.cleared&&d.clearedBy===p.id);
    /* 继立记录：从里程碑里抽带其名的更替 */
    const rules=(S.mil||[]).filter(m=>m.t.indexOf('族长更替 · '+p.name)===0)
      .map(m=>({y:m.y,t:m.t}));
    return {parent:parent||null,parentName:parentName,children:children,from:from,
      debts:debts,rules:rules,
      generation:p.gen||1,
      heir:children.filter(c=>c.alive).length};
  }

  function placeName(S,id){
    const u0=(S.famPlaces&&S.famPlaces[id])||id;
    const g=(D.geoclimate&&D.geoclimate.units||[]).find(x=>x.id===u0)
      ||(D.layers&&D.layers.population&&D.layers.population.kernels||[]).find(x=>x.id===u0);
    return g?(g.name||u0):u0;
  }

  /* ---------- 生平（推演小传） ---------- */
  function bioOf(S,p){
    const F=W.family,lines=[];
    /* ensureLife 需要 rnd；这里只读不补，避免渲染改随机状态。
       缺 born/life 的旧档用年岁与当前年回推一个只读估值。 */
    const born=typeof p.born==='number'?p.born:Math.round((S.year||0)-(p.age||30));
    const life=typeof p.life==='number'?p.life:null;
    const yr=y=>y<0?('前'+Math.abs(y)+'年'):(y+'年');
    lines.push('第 '+(p.gen||1)+' 代，约 '+yr(born)+' 生；'
      +(p.alive?('在籍约 '+p.age+' 岁'+(life?('，按当时条件估寿约 '+life+' 岁'):''))
              :('卒于约 '+yr(born+(p.age||life||45))+'，享年约 '+(p.age||life||45)+' 岁'))+'。');
    lines.push('性情「'+(p.trait||'—')+'」；'
      +(p.id===S.ruler?'现为当家。':p.role==='heir'?'在册为继承人。':'在册为族人。')
      +(p.place?'落脚于 '+placeName(S,p.place)+'（本局推演的落脚地）。':''));
    const sk=skillsOf(S,p);
    lines.push(sk.real.length
      ? '亲习之业：'+sk.real.join('、')+'（由本局抉择写回，不是史实履历）。'
      : '尚无由抉择写回的亲习之业。');
    if(sk.inherited.length)
      lines.push('承袭之业：'+sk.inherited.join('、')+'：只表示族里有人做过，不表示本人亲习。');
    /* 编年里提到其名的族人条目 */
    const mine=(S.log||[]).filter(l=>l.k==='fam'&&typeof l.t==='string'
      &&l.t.indexOf(p.name)>=0).slice(-3);
    if(mine.length)lines.push('族中编年提到此人的近事：'+mine.map(l=>l.t).join('　'));
    const mineJobs=(S.skillLog||[]).filter(x=>x.who===p.id).slice(-3);
    if(mineJobs.length)lines.push('亲历的抉择：'+mineJobs.map(x=>yr(x.y)+' 习「'+x.job+'」').join('　')+'。');
    const lin=lineageOf(S,p);
    if(lin.parent)lines.push('承自 '+lin.parent.name+'（第 '+lin.parent.gen+' 代）：'+lin.from.join('、')+'。');
    else if(p.parent)lines.push('承自 '+lin.parentName+'：父辈已不在册，仅存其名。');
    if(lin.children.length)lines.push('名下子嗣 '+lin.children.length+' 人'+(lin.heir?('，在籍 '+lin.heir+' 人'):'')+'。');
    if(lin.rules.length)lines.push('继立：'+lin.rules.map(r=>r.t.replace('族长更替 · ','')).join('；')+'。');
    if(lin.debts.length)lines.push('由本人了结的族谱旧账 '+lin.debts.length+' 笔（全为推演）。');
    return lines;
  }

  /* ---------- 是不是历史名人 ---------- */
  /* 结论恒定：本局族人是推演生成的人物，不是史实人物。
     只做「姓名用字是否与册中人物重合」的检索，并明确同名不等于同一人。 */
  function historyCheck(S,p){
    const name=String(p.name||'');
    const chars=[...new Set(name.replace(/[·「」『』\s]/g,'').split(''))];
    const roster=D.civilization.items.filter(x=>x.dim==='P');
    const bios=D.civilization.biographies||[];
    const same=[];
    roster.forEach(x=>{
      const t=String(x.title||'').replace(/（[^）]*）/g,'');
      const hit=chars.filter(c=>c&&t.indexOf(c)>=0);
      if(hit.length)same.push({title:x.title,why:'姓名用字含「'+hit.join('、')+'」',
        rawYear:x.rawYear,summary:x.summary});
    });
    bios.forEach(x=>{
      const hit=chars.filter(c=>c&&String(x.name||'').indexOf(c)>=0);
      if(hit.length&&!same.some(s=>s.title.indexOf(x.name)>=0))
        same.push({title:x.name,why:'姓名用字含「'+hit.join('、')+'」',
          rawYear:x.born||'',summary:x.work||''});
    });
    return {
      isHistorical:false,
      verdict:'不是历史名人 · 本局推演族人',
      sameName:same.slice(0,6),
      disclaimer:'同名只是用字巧合；本局族人不等于册中任何历史人物，'
        +'不表示该人物生平、不与任何真实家族攀附血缘，也不作血统推断。'
    };
  }

  /* ---------- 史册对照：本局真正遇见的史实人物 ---------- */
  function realRoster(S){
    const seen=S.seenCiv||{},bios=D.civilization.biographies||[];
    const out=D.civilization.items.filter(x=>x.dim==='P'&&seen[x.id]).map(x=>{
      const bare=String(x.title).replace(/（[^）]*）/g,'');
      /* 双向包含：兼容「伊本·西那（阿维森纳）」一类带异译的姓名 */
      const b=bios.find(z=>z.name===x.title
        ||z.name===bare
        ||bare.indexOf(z.name)>=0
        ||String(z.name).indexOf(bare)>=0
        ||String(x.title).indexOf(z.name)>=0);
      return {
        id:x.id,name:x.title,rawYear:x.rawYear,summary:x.summary,
        bio:b?{born:b.born,active:b.active,work:b.work,legacy:b.legacy}:null,
        sources:x.sources||[]
      };
    });
    return out;
  }

  /* ---------- 汇总（收卷报告用） ---------- */
  function summary(S){
    const fam=S.fam||[],alive=fam.filter(p=>p.alive);
    const skills=new Set();fam.forEach(p=>(p.skills||[]).forEach(j=>skills.add(j)));
    const gens=new Set(fam.map(p=>p.gen||1));
    /* 世代以游戏在册的 S.gen 为准：fam 会因长局裁剪只剩最新一两代，
       直接数 fam 里的 gen 会显示「1 代」，与顶栏第 N 代对不上。 */
    return {alive:alive.length,total:fam.length,
      generations:Math.max(1,...gens),span:gens.size,
      dead:S.dead||0,
      skills:skills.size,skillLog:(S.skillLog||[]).length,
      realPeople:realRoster(S).length,
      withParent:fam.filter(p=>p.parent).length};
  }

  W.people={h32:h32,u:u,recordSkill:recordSkill,skillsOf:skillsOf,
    lineageOf:lineageOf,bioOf:bioOf,historyCheck:historyCheck,
    realRoster:realRoster,summary:summary,placeName:placeName};
  if(typeof module!=='undefined'&&module.exports)module.exports=W.people;
})((typeof window!=='undefined'?window:globalThis).WQN=((typeof window!=='undefined'?window:globalThis).WQN||{}));
