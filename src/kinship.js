/* kinship.js —— 继嗣制、婚姻、亲属称谓与关系图
   纯逻辑、无 DOM。称谓一律从实际关系链推导，不写死到某个族人。

   核心：开局不一定父系。按文明圈的史料可见做法抽一种继嗣制
   （父系 / 母系 / 双系 / 从妻居入赘），并据此决定开局承祧方、
   子女入哪一支族册、谁为「赘婿」。制度是玩法近似，不是该文明全域断言。 */
(function(W){
  'use strict';
  const D=W.data,K=D.kinship||{systems:[],terms:[],residences:[],meta:{},note_by_region:{}};

  const SYS={},TERM={},RES={};
  K.systems.forEach(s=>SYS[s.key]=s);
  K.terms.forEach(t=>TERM[t.key]=t);
  K.residences.forEach(r=>RES[r.key]=r);

  function pickWeighted(list,rnd){
    let sum=0;list.forEach(x=>sum+=Math.max(0,x.w||0));
    if(sum<=0)return list[0];
    let r=rnd()*sum;
    for(const x of list){r-=Math.max(0,x.w||0);if(r<=0)return x;}
    return list[list.length-1];
  }

  /* ---------- 开局：抽继嗣制，承祧方不一定是父 ---------- */
  function init(S,rnd){
    if(S.kinSystem&&SYS[S.kinSystem.key||S.kinSystem])return S.kinSystem;
    const reg=S.reg||'huaxia';
    const cand=K.systems.map(s=>({key:s.key,w:(s.weight||{})[reg]||0}));
    const chosen=pickWeighted(cand,rnd);
    const s=SYS[chosen.key]||K.systems[0];
    S.kinSystem={key:s.key,name:s.name,short:s.short,desc:s.desc,region:reg};
    S.kinNote=(K.note_by_region||{})[reg]||'';
    S.marriages=S.marriages||[];
    S.kinLog=S.kinLog||[];
    return S.kinSystem;
  }
  function system(S){
    const k=S&&S.kinSystem&&S.kinSystem.key;
    if(k&&SYS[k])return SYS[k];
    /* 旧档兜底：无字段时按文明圈给一个默认，不摇随机 */
    const reg=(S&&S.reg)||'huaxia';
    const fallback=(SYS[reg==='nile'?'matrilineal':reg==='indus'?'bilateral':'patrilineal']
      ||K.systems[0]);
    if(S&&!S.kinSystem)S.kinSystem={key:fallback.key,name:fallback.name,
      short:fallback.short,desc:fallback.desc,region:reg};
    return fallback;
  }
  function isMatri(S){const k=system(S).key;return k==='matrilineal'||k==='uxorilocal';}

  /* ---------- 性别与开局三人 ---------- */
  function seedFamily(S,rnd){
    const mat=isMatri(S);
    const fam=S.fam||[];
    if(!fam.length)return;
    /* 承祧方性别随制度：母系/从妻居由女性当家；父系由男性；双系两者皆可 */
    const head=fam.find(p=>p.id===S.ruler)||fam[0];
    head.gender=mat?'female':(system(S).key==='bilateral'?(rnd()<.5?'female':'male'):'male');
    const others=fam.filter(p=>p.id!==head.id);
    others.forEach((p,i)=>{p.gender=(i===0)
      ?(head.gender==='female'?'male':'female')
      :(rnd()<.5?'male':'female');});
    /* 开局配一对夫妇：第 1 位与第 2 位；第 3 位为其子 */
    if(others.length){
      const a=head,b=others[0];
      marry(S,a,b,rnd);
      const child=others[1];
      if(child){attachBirth(S,child,a,b,rnd);}
    }
    pushLog(S,'开局定继嗣：'+system(S).short+'；承祧方 '+head.name
      +'（'+(head.gender==='female'?'女':'男')+'）。这不是该文明圈的全域断言。');
  }

  function pushLog(S,t){
    S.kinLog=S.kinLog||[];
    S.kinLog.push({y:S.year,t:t});
    if(S.kinLog.length>80)S.kinLog=S.kinLog.slice(-80);
    if(S.mil)S.mil.push({y:S.year,t:'亲属 · '+t});
  }

  /* ---------- 婚姻：夫妇、入赘、居制 ---------- */
  function marry(S,a,b,rnd){
    if(!a||!b||a.id===b.id)return null;
    /* 再配之前，先解开双方旧配偶的单向指向，避免 A→B→C→A 悬空链。
       已经出生的孩子仍保留 parent/parent2，那是出生时的记录，不随再配改写。 */
    [a,b].forEach(p=>{
      const other=(S.fam||[]).find(x=>x.id===p.spouse);
      if(other&&other.id!==(p===a?b.id:a.id)&&other.spouse===p.id)other.spouse=null;
    });
    a.spouse=b.id;b.spouse=a.id;
    if(!a.gender)a.gender=rnd()<.5?'male':'female';
    if(!b.gender)b.gender=a.gender==='male'?'female':'male';
    const sys=system(S);
    let res;
    if(sys.key==='uxorilocal')res='uxorilocal';
    else if(sys.key==='matrilineal')res=(rnd()<.6?'uxorilocal':'bilocal');
    else if(sys.key==='bilateral')res=(rnd()<.5?'neolocal':'bilocal');
    else res=(rnd()<.8?'virilocal':'neolocal');
    a.residence=res;b.residence=res;
    /* 赘婿：从妻居时，夫方标 uxorilocal，妻方为户主 */
    const wife=(a.gender==='female')?a:b;
    const husband=(a.gender==='male')?a:b;
    if(res==='uxorilocal'){
      husband.uxorilocal=true;wife.householdHead=true;
    }else{wife.householdHead=false;husband.uxorilocal=false;}
    S.marriages=S.marriages||[];
    S.marriages.push({y:S.year,a:a.id,b:b.id,an:a.name,bn:b.name,res:res});
    if(S.marriages.length>80)S.marriages=S.marriages.slice(-80);
    pushLog(S,a.name+' 与 '+b.name+' 配为夫妇，'
      +(RES[res]?RES[res].name:res)+(res==='uxorilocal'
        ?'；'+husband.name+' 为赘婿，子女入 '+wife.name+' 一支族册':'')+'。');
    return {a:a,b:b,res:res};
  }

  /* 配偶是否还在册且健在；用于判定「可再配」与「可生育夫妇」 */
  function livingSpouse(S,p){
    if(!p||!p.spouse)return null;
    const q=(S.fam||[]).find(x=>x.id===p.spouse);
    return (q&&q.alive)?q:null;
  }
  /* 每笔给未婚／丧偶在籍成年人配一次对；不额外制造人口，只连关系 */
  function matchUnmarried(S,rnd){
    const alive=(S.fam||[]).filter(p=>p.alive&&p.age>=16&&!livingSpouse(S,p));
    if(alive.length<2)return 0;
    let n=0;
    for(let i=0;i+1<alive.length&&n<2;i+=2){
      const a=alive[i],b=alive[i+1];
      if(marry(S,a,b,rnd))n++;
    }
    return n;
  }

  /* ---------- 可生育夫妇：孩子只从夫妇来 ---------- */
  /* 优先取「世代最高」的一对，让代际真的往下走；同代时优先适龄、其次当家。
     没有现成夫妇但有两位成年人时，现场配一对；一个成年人都没有则返回 null。 */
  function birthCouple(S,rnd,relaxed){
    const fam=S.fam||[];
    /* 远古估寿约 38 岁只是通识级近似，不等于人人 32 岁后不能育；
       窗口放到至少 45 岁，保底添丁时（relaxed）只看是否一对在籍夫妇。 */
    const okAge=p=>relaxed
      ?p.age>=16
      :(p.age>=16&&p.age<=Math.max(45,Math.min(60,(p.life||50)-2)));
    const pairs=[];
    fam.forEach(a=>{
      if(!a.alive||!okAge(a))return;
      const b=livingSpouse(S,a);
      if(!b||!b.alive||!okAge(b)||a.id>b.id)return;   // a.id>b.id 去重
      if(b.spouse!==a.id)return;
      pairs.push({a:a,b:b});
    });
    if(pairs.length){
      pairs.sort((x,y)=>{
        const gx=Math.max(x.a.gen||1,x.b.gen||1),gy=Math.max(y.a.gen||1,y.b.gen||1);
        if(gy!==gx)return gy-gx;                       // 世代高者优先
        const rx=x.a.id===S.ruler||x.b.id===S.ruler?1:0;
        const ry=y.a.id===S.ruler||y.b.id===S.ruler?1:0;
        if(rx!==ry)return rx-ry;
        return (y.a.age+y.b.age)-(x.a.age+x.b.age);
      });
      return pairs[0];
    }
    /* 无现成夫妇：从在籍成年人里配一对，配成才生 */
    const adults=fam.filter(p=>p.alive&&p.age>=16&&!livingSpouse(S,p));
    if(adults.length>=2){
      const a=adults[0],b=adults[1];
      if(marry(S,a,b,rnd))return {a:a,b:b};
    }
    return null;
  }

  /* 族册归属方：母系／从妻居取母，父系取父，双系取年长者 */
  function bookParent(S,a,b){
    const k=system(S).key;
    if(k==='matrilineal'||k==='uxorilocal')
      return (a.gender==='female')?a:b;
    if(k==='bilateral')return (a.age>=b.age)?a:b;
    return (a.gender==='male')?a:b;
  }

  /* ---------- 新生儿：必须挂在一对夫妇上，世代按双亲算 ----------
     旧版这里允许 mate=null、parent2 取 head.spouse（可能为空），
     于是族长一更替就冒出「单亲孩子」；且 gen 用 S.gen+1，
     出现「1 代夫妇生出 3 代孩子」。两处一并修掉。 */
  function attachBirth(S,babe,a,b,rnd){
    if(!babe||!a||!b)return null;
    if(!babe.gender)babe.gender=rnd()<.5?'male':'female';
    /* 双亲必须互为配偶；不是就现场补配，补不成则拒绝这个孩子 */
    if(a.spouse!==b.id||b.spouse!==a.id){
      if(!marry(S,a,b,rnd))return null;
    }
    babe.parent=a.id;babe.parent2=b.id;
    /* 出生时的夫妇快照：日后父母丧偶再配、或一方离册，都不改写这条出生记录 */
    babe.birthPair=[a.id,b.id];
    babe.birthSpouseOK=true;
    babe.gen=Math.max(a.gen||1,b.gen||1)+1;
    const bp=bookParent(S,a,b);
    babe.fromName=bp?bp.name:(a.name||'');
    babe.bookParent=bp?bp.id:null;
    babe.birthKin=system(S).key;
    babe.birthRes=bp?bp.residence:null;
    babe.skills=babe.skills||[];
    if(bp&&bp.uxorilocal)babe.viaUxorilocal=true;
    return babe;
  }

  /* ---------- 旧档校正：补双亲、重算世代 ---------- */
  function normalize(S){
    const fam=S.fam||[];
    if(!fam.length)return {fixed:0,regen:0};
    const m={};fam.forEach(p=>m[p.id]=p);
    let fixed=0,regen=0;
    /* 1 补 parent2：优先用 parent 的在册配偶；否则同代找一位配给 parent */
    fam.forEach(p=>{
      if(!p.parent)return;
      const a=m[p.parent];
      if(!a){p.parent=null;p.parent2=null;p.birthNote='旧档父辈已不在册';return;}
      let b=p.parent2?m[p.parent2]:null;
      /* parent2 已在册就保留：那可能是已故／离册的另一方，或后来再配的前配偶，
         都是出生时的真实记录，不该被「现在是否仍为夫妇」抹掉。 */
      if(b&&b.id!==a.id){p.birthPair=p.birthPair||[a.id,b.id];return;}
      const live=livingSpouse(S,a);
      if(live&&live.id!==a.id){b=live;fixed++;}
      else{
        /* 找同代、无活配偶的另一位成年人补配 */
        const cand=fam.find(q=>q.id!==a.id&&q.gen===a.gen&&!livingSpouse(S,q));
        if(cand){
          a.spouse=cand.id;cand.spouse=a.id;
          a.gender=a.gender||'male';cand.gender=cand.gender||(a.gender==='male'?'female':'male');
          a.residence=a.residence||'virilocal';cand.residence=cand.residence||a.residence;
          b=cand;fixed++;
        }
      }
      if(b&&b.id!==a.id){p.parent2=b.id;p.birthPair=[a.id,b.id];}
      else{p.parent2=null;p.birthNote='旧档未记双亲，仅存一方';}
    });
    /* 2 世代按双亲 +1 重算，两轮迭代让祖孙链也稳下来 */
    for(let round=0;round<2;round++){
      fam.forEach(p=>{
        const a=p.parent?m[p.parent]:null,b=p.parent2?m[p.parent2]:null;
        if(!a&&!b)return;
        const g=Math.max(a?a.gen||1:0,b?b.gen||1:0)+1;
        if(g>=1&&p.gen!==g){p.gen=g;regen++;}
      });
    }
    if(fixed||regen){
      S.kinLog=S.kinLog||[];
      S.kinLog.push({y:S.year,t:'【旧档校正】补记双亲 '+fixed+' 处、按亲子链重算世代 '
        +regen+' 处；此后孩子只从已配对的夫妇出生。'});
    }
    return {fixed:fixed,regen:regen};
  }

  /* ---------- 关系推导 ---------- */
  function byId(S){const m={};(S.fam||[]).forEach(p=>m[p.id]=p);return m;}
  const nm=p=>p?p.name:'（已不在册）';
  const genderOf=p=>p&&p.gender?p.gender:'unknown';

  function siblingsOf(S,p,m){
    if(!p)return [];
    const ids=new Set([p.parent,p.parent2].filter(Boolean));
    if(!ids.size)return [];
    return (S.fam||[]).filter(x=>x.id!==p.id&&x.gen===p.gen
      &&([x.parent,x.parent2].some(q=>q&&ids.has(q))));
  }
  function childrenOf(S,p,m){
    if(!p)return [];
    return (S.fam||[]).filter(x=>x.id!==p.id
      &&(x.parent===p.id||x.parent2===p.id));
  }

  function relationsOf(S,p){
    const m=byId(S),out=[],seen=new Set();
    const add=(key,who,kind,note)=>{
      if(!who)return;
      const t=TERM[key]||{term:key};
      const sig=t.term+'|'+who.id;
      if(seen.has(sig))return;seen.add(sig);
      out.push({key:key,term:t.term,who:who.id,whoName:nm(who),
        kind:kind||t.kind,note:note||t.note||''});
    };
    /* 配偶 */
    const sp=p.spouse?m[p.spouse]:null;
    if(sp){
      add(genderOf(p)==='female'?'husband':'wife',sp,'affine',
        p.residence==='uxorilocal'?'从妻居 / 入赘':undefined);
      if(p.residence==='uxorilocal')add('uxorilocal_husband',sp,'affine');
    }
    /* 双亲 */
    const par=p.parent?m[p.parent]:null,par2=p.parent2?m[p.parent2]:null;
    const parents=[par,par2].filter(Boolean);
    parents.forEach(q=>{
      add(genderOf(q)==='female'?'mother':'father',q,'blood');
      /* 祖辈 */
      [q.parent,q.parent2].filter(Boolean).forEach(g=>{
        const gg=m[g];if(!gg)return;
        const paternal=(genderOf(q)==='male');
        add(paternal?(genderOf(gg)==='male'?'paternal_grandfather':'paternal_grandmother')
                    :(genderOf(gg)==='male'?'maternal_grandfather':'maternal_grandmother'),
            gg,'blood');
      });
    });
    /* 子女 */
    const ch=childrenOf(S,p,m);
    ch.forEach(c=>{
      add(genderOf(c)==='female'?'daughter':'son',c,'blood');
      if(c.role==='heir')add('heir',c,'descent');
      /* 孙辈：外孙与孙区分 */
      const cg=childrenOf(S,c,m);
      cg.forEach(g=>{
        if(genderOf(c)==='female')
          add(genderOf(g)==='female'?'daughter_daughter':'daughter_son',g,'blood');
        else add(genderOf(g)==='female'?'granddaughter':'grandson',g,'blood');
      });
      /* 亲家 */
      if(c.spouse&&m[c.spouse]){
        [m[c.spouse].parent,m[c.spouse].parent2].filter(Boolean).forEach(x=>{
          if(m[x])add('in_laws',m[x],'affine');
        });
      }
    });
    /* 同辈 */
    const sib=siblingsOf(S,p,m);
    const elder=x=>x.age>p.age;
    sib.forEach(s=>{
      const male=genderOf(s)==='male';
      add(male?(elder(s)?'elder_brother':'younger_brother')
              :(elder(s)?'elder_sister':'younger_sister'),s,'blood');
      /* 嫂 / 弟媳 / 姊夫 / 妹夫 */
      if(s.spouse&&m[s.spouse])
        add(male?(elder(s)?'brother_wife_elder':'brother_wife_younger')
                :'sister_husband',m[s.spouse],'affine');
      /* 侄 / 甥 */
      childrenOf(S,s,m).forEach(c=>{
        if(male)add(genderOf(c)==='female'?'niece':'nephew',c,'blood');
        else add(genderOf(c)==='female'?'sister_daughter':'sister_son',c,'blood');
      });
    });
    /* 伯叔姑舅姨 + 其配偶（姑父、舅母、姨父…）+ 堂表 */
    parents.forEach(q=>{
      siblingsOf(S,q,m).forEach(u=>{
        const male=genderOf(u)==='male';
        const paternal=(genderOf(q)==='male');
        if(paternal){
          add(male?(u.age>q.age?'paternal_uncle_elder':'paternal_uncle_younger')
                  :'paternal_aunt',u,'blood');
          if(u.spouse&&m[u.spouse])
            add(male?'paternal_uncle_wife':'paternal_aunt_husband',m[u.spouse],'affine');
        }else{
          add(male?'maternal_uncle':'maternal_aunt',u,'blood');
          if(u.spouse&&m[u.spouse])
            add(male?'maternal_uncle_wife':'maternal_aunt_husband',m[u.spouse],'affine');
        }
        childrenOf(S,u,m).forEach(c=>{
          add(paternal?(male?'paternal_cousin':'maternal_cousin_fu')
                      :(male?'maternal_cousin_jiu':'maternal_cousin_yi'),c,'blood');
        });
      });
    });
    /* 配偶之血亲与同辈姻亲 */
    if(sp){
      [sp.parent,sp.parent2].filter(Boolean).forEach(q=>{
        const x=m[q];if(!x)return;
        add(genderOf(p)==='female'
          ?(genderOf(x)==='male'?'husband_father':'husband_mother')
          :(genderOf(x)==='male'?'father_in_law':'mother_in_law'),x,'affine');
      });
      siblingsOf(S,sp,m).forEach(u=>{
        const male=genderOf(u)==='male';
        if(genderOf(p)==='female')
          add(male?(u.age>sp.age?'husband_brother':'husband_brother'):'husband_sister',u,'affine');
        else add(male?(u.age>sp.age?'wife_brother_elder':'wife_brother_younger')
                    :'wife_sister',u,'affine');
      });
    }
    /* 连襟 / 妯娌：本人与同辈的配偶互称 */
    sib.forEach(s=>{
      if(!s.spouse||!m[s.spouse]||!sp)return;
      if(genderOf(s)==='female')add('co_brothers_in_law',m[s.spouse],'affine','姊妹之夫互称');
      else add('co_sisters',m[s.spouse],'affine','兄弟之妻互称');
    });
    /* 继嗣制度读法 */
    const sys=system(S);
    /* 制度读法只写文字，不画成「自己连自己」的边 */
    out.push({key:p.id===S.ruler?'lineage_heir':'cadet',
      term:p.id===S.ruler?'宗子 / 嫡长':'庶支 / 旁支',who:null,whoName:'',
      kind:'descent',note:'本局 '+sys.short});
    if(p.residence&&RES[p.residence])
      out.push({key:p.residence,term:RES[p.residence].name,who:p.id,
        whoName:nm(p),kind:'household',note:RES[p.residence].note});
    if(p.uxorilocal)
      out.push({key:'uxorilocal',term:'赘婿',who:p.id,whoName:nm(p),
        kind:'affine',note:'从妻居的夫；本局只改居住与族册归属，不改其本姓'});
    return out;
  }

  /* 穷举册：全表称谓 × 本局是否出现 */
  function termCoverage(S){
    const live=(S.fam||[]).filter(p=>p.alive);
    const got=new Set();
    live.forEach(p=>relationsOf(S,p).forEach(r=>got.add(r.key)));
    return K.terms.map(t=>({key:t.key,term:t.term,kind:t.kind,
      note:t.note||'',present:got.has(t.key)}));
  }

  /* ---------- 关系图 ---------- */
  function graph(S){
    const fam=(S.fam||[]).slice(-16);
    const ids=new Set(fam.map(p=>p.id));
    const nodes=fam.map(p=>({id:p.id,name:p.name,gen:p.gen||1,
      gender:p.gender||'unknown',alive:!!p.alive,ruler:p.id===S.ruler,
      age:p.age||0,trait:p.trait||''}));
    const edges=[],seen=new Set();
    fam.forEach(p=>relationsOf(S,p).forEach(r=>{
      if(!ids.has(r.who)||r.who===p.id)return;
      const sig=[p.id,r.who].sort().join('|')+'|'+r.term;
      if(seen.has(sig))return;seen.add(sig);
      edges.push({a:p.id,b:r.who,term:r.term,kind:r.kind});
    }));
    return {nodes:nodes,edges:edges,system:system(S)};
  }

  function summary(S){
    const live=(S.fam||[]).filter(p=>p.alive);
    let rels=0;live.forEach(p=>rels+=relationsOf(S,p).length);
    const cov=termCoverage(S);
    return {system:system(S).short,systemName:system(S).name,
      marriages:(S.marriages||[]).length,
      uxorilocal:live.filter(p=>p.uxorilocal).length,
      relations:rels,termsTotal:K.terms.length,
      termsPresent:cov.filter(x=>x.present).length,
      femaleHeads:live.filter(p=>p.id===S.ruler&&p.gender==='female').length,
      logs:(S.kinLog||[]).length};
  }

  W.kinship={SYS:SYS,TERM:TERM,RES:RES,init:init,system:system,isMatri:isMatri,
    seedFamily:seedFamily,marry:marry,matchUnmarried:matchUnmarried,
    livingSpouse:livingSpouse,birthCouple:birthCouple,bookParent:bookParent,
    attachBirth:attachBirth,normalize:normalize,
    relationsOf:relationsOf,termCoverage:termCoverage,
    graph:graph,summary:summary,pushLog:pushLog};
  if(typeof module!=='undefined'&&module.exports)module.exports=W.kinship;
})((typeof window!=='undefined'?window:globalThis).WQN=((typeof window!=='undefined'?window:globalThis).WQN||{}));
