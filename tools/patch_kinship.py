# -*- coding: utf-8 -*-
"""修复「二代没结婚，三代怎么来的」：
   1) 新生儿必须挂在一对已配对夫妇上，不许单亲凭空出生；
   2) 世代按 max(双亲.gen)+1 算，不再按 S.gen+1 乱标；
   3) 旧档单亲/错代自动校正；
   4) 关系图去掉指向自己的制度读法自环。
"""
import os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def rw(rel, fn):
    p = os.path.join(ROOT, rel)
    s = open(p, encoding='utf8').read()
    s2 = fn(s)
    assert s2 != s, rel + ' 没有改动'
    open(p, 'w', encoding='utf8').write(s2)
    print('patched', rel)

# ─────────────────────────── kinship.js ───────────────────────────
def patch_kin(s):
    # A. matchUnmarried：丧偶/配偶不在册者也允许再配
    old = """  /* 每笔给未婚在籍成年人配一次对；不额外制造人口，只连关系 */
  function matchUnmarried(S,rnd){
    const alive=(S.fam||[]).filter(p=>p.alive&&p.age>=16&&!p.spouse);
    if(alive.length<2)return 0;
    let n=0;
    for(let i=0;i+1<alive.length&&n<2;i+=2){
      const a=alive[i],b=alive[i+1];
      if(marry(S,a,b,rnd))n++;
    }
    return n;
  }
"""
    new = """  /* 配偶是否还在册且健在；用于判定「可再配」与「可生育夫妇」 */
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
  function birthCouple(S,rnd){
    const fam=S.fam||[];
    const okAge=p=>p.age>=16&&p.age<=Math.min(52,(p.life||60)-6);
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
"""
    assert old in s, 'kin A'
    s = s.replace(old, new, 1)

    # B. attachBirth：强制双亲 + gen 按双亲
    old2 = """  /* ---------- 新生儿：双亲与族册归属 ---------- */
  function attachBirth(S,babe,head,mate,rnd){
    if(!babe)return;
    if(!babe.gender)babe.gender=rnd()<.5?'male':'female';
    babe.parent=head?head.id:null;
    babe.parent2=mate?mate.id:(head&&head.spouse)||null;
    if(head)babe.fromName=head.name;
    babe.birthKin=system(S).key;
    babe.birthRes=head?head.residence:null;
    babe.skills=babe.skills||[];
    if(head&&head.uxorilocal)babe.viaUxorilocal=true;
    return babe;
  }
"""
    new2 = """  /* ---------- 新生儿：必须挂在一对夫妇上，世代按双亲算 ----------
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
      if(b&&a.spouse===b.id&&b.spouse===a.id)return;
      const live=livingSpouse(S,a);
      if(live&&(!b||b.id!==live.id)){b=live;fixed++;}
      else if(!b||b.id===a.id||a.spouse!==b.id){
        /* 找同代、无活配偶的另一位成年人补配 */
        const cand=fam.find(q=>q.id!==a.id&&q.gen===a.gen&&!livingSpouse(S,q));
        if(cand){
          a.spouse=cand.id;cand.spouse=a.id;
          a.gender=a.gender||'male';cand.gender=cand.gender||(a.gender==='male'?'female':'male');
          a.residence=a.residence||'virilocal';cand.residence=cand.residence||a.residence;
          b=cand;fixed++;
        }
      }
      if(b&&b.id!==a.id){p.parent2=b.id;}
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
"""
    assert old2 in s, 'kin B'
    s = s.replace(old2, new2, 1)

    # C. graph 过滤自环（庶支/旁支指向自己不该画成边）
    old3 = """      if(!ids.has(r.who)||r.who===p.id)return;"""
    assert old3 in s, 'kin C'
    # graph 已有该判断，改在 relationsOf 里把「指向自己的制度读法」去掉
    old4 = """    const sys=system(S);
    if(p.id===S.ruler)add('lineage_heir',p,'descent','本局 '+sys.short);
    else add('cadet',p,'descent','本局 '+sys.short+' 之旁支');"""
    new4 = """    const sys=system(S);
    /* 制度读法只写文字，不画成「自己连自己」的边 */
    out.push({key:p.id===S.ruler?'lineage_heir':'cadet',
      term:p.id===S.ruler?'宗子 / 嫡长':'庶支 / 旁支',who:null,whoName:'',
      kind:'descent',note:'本局 '+sys.short});"""
    assert old4 in s, 'kin C2'
    s = s.replace(old4, new4, 1)

    # D. 导出
    old5 = """  W.kinship={SYS:SYS,TERM:TERM,RES:RES,init:init,system:system,isMatri:isMatri,
    seedFamily:seedFamily,marry:marry,matchUnmarried:matchUnmarried,
    attachBirth:attachBirth,relationsOf:relationsOf,termCoverage:termCoverage,
    graph:graph,summary:summary,pushLog:pushLog};"""
    new5 = """  W.kinship={SYS:SYS,TERM:TERM,RES:RES,init:init,system:system,isMatri:isMatri,
    seedFamily:seedFamily,marry:marry,matchUnmarried:matchUnmarried,
    livingSpouse:livingSpouse,birthCouple:birthCouple,bookParent:bookParent,
    attachBirth:attachBirth,normalize:normalize,
    relationsOf:relationsOf,termCoverage:termCoverage,
    graph:graph,summary:summary,pushLog:pushLog};"""
    assert old5 in s, 'kin D'
    s = s.replace(old5, new5, 1)
    return s

rw('src/kinship.js', patch_kin)

# ─────────────────────────── family.js ───────────────────────────
def patch_fam(s):
    # 1 注入 spawn 辅助（放在 advanceFamily 之前）
    mark = "  function advanceFamily(S,years,rnd,pick){"
    helper = """  /* 添丁统一入口：先找一对已配对的夫妇，孩子挂双亲、世代按双亲 +1。
     没有可生育夫妇就不生——绝不允许「未婚生子」或「凭空单亲」。 */
  function spawn(S,rnd,pick,placeFrom){
    const K=W.kinship;
    const couple=K?K.birthCouple(S,rnd):null;
    if(!couple)return null;
    const g=Math.max(couple.a.gen||1,couple.b.gen||1)+1;
    const babe=newPerson(S.reg,g,'heir',rnd,pick);
    babe.age=Math.floor(rnd()*5);
    babe.born=Math.round(S.year-babe.age);
    babe.life=lifeAt(S,babe.born,babe.trait,rnd);
    if(!K.attachBirth(S,babe,couple.a,couple.b,rnd))return null;
    const bp=S.fam.find(p=>p.id===babe.bookParent)||couple.a;
    if(S.famPlaces&&bp){
      babe.place=S.famPlaces[bp.id]||bp.place||(placeFrom?placeFrom.place:null);
      if(babe.place)S.famPlaces[babe.id]=babe.place;
    }
    return babe;
  }
  function advanceFamily(S,years,rnd,pick){"""
    assert mark in s, 'fam spawn'
    s = s.replace(mark, helper, 1)

    # 2 主循环出生
    old = """      const head=S.fam.find(p=>p.id===S.ruler);
      for(let i=0;i<want;i++){
        if(rnd()<0.78+S.st.cohesion/300){
          const g=startGen+1;
          const babe=newPerson(S.reg,g,'heir',rnd,pick);
          babe.age=Math.floor(rnd()*5);
          babe.born=Math.round(S.year-babe.age);
          babe.life=lifeAt(S,babe.born,babe.trait,rnd);
          /* 传承与亲属：双亲、性别、族册归属由 kinship 按本局继嗣制写入 */
          if(W.kinship)W.kinship.attachBirth(S,babe,head,null,rnd);
          else{if(head){babe.parent=head.id;babe.fromName=head.name;}babe.skills=[];}
          /* 家族分布图：新生儿落在当家所在的地理单元；迁徙抉择会改写后代的落脚点 */
          if(S.famPlaces&&head){
            babe.place=S.famPlaces[head.id]||head.place||null;
            if(babe.place)S.famPlaces[babe.id]=babe.place;
          }
          S.fam.push(babe);births++;birthBudget--;
        }
      }"""
    new = """      const head=S.fam.find(p=>p.id===S.ruler);
      for(let i=0;i<want;i++){
        if(rnd()<0.78+S.st.cohesion/300){
          const babe=spawn(S,rnd,pick,head);
          if(!babe)break;                 // 没有可生育夫妇，这一小段就不添丁
          S.fam.push(babe);births++;birthBudget--;
        }
      }"""
    assert old in s, 'fam main birth'
    s = s.replace(old, new, 1)

    # 3 3.5 保底
    old2 = """      const nowAlive=S.fam.filter(p=>p.alive).length;
      if(!births&&nowAlive<3&&birthBudget>0){
        const g=startGen+1;
        const head2=S.fam.find(p=>p.id===S.ruler)||S.fam.find(p=>p.alive);
        const babe=newPerson(S.reg,g,'heir',rnd,pick);
        babe.age=Math.floor(rnd()*5);
        babe.born=Math.round(S.year-babe.age);
        babe.life=lifeAt(S,babe.born,babe.trait,rnd);
        if(W.kinship)W.kinship.attachBirth(S,babe,head2,null,rnd);
        else{if(head2){babe.parent=head2.id;babe.fromName=head2.name;}babe.skills=[];}
        if(S.famPlaces&&head2){
          babe.place=S.famPlaces[head2.id]||head2.place||null;
          if(babe.place)S.famPlaces[babe.id]=babe.place;
        }
        S.fam.push(babe);births++;birthBudget--;
      }"""
    new2 = """      const nowAlive=S.fam.filter(p=>p.alive).length;
      if(!births&&nowAlive<3&&birthBudget>0){
        const head2=S.fam.find(p=>p.id===S.ruler)||S.fam.find(p=>p.alive);
        const babe=spawn(S,rnd,pick,head2);
        if(babe){S.fam.push(babe);births++;birthBudget--;}
      }"""
    assert old2 in s, 'fam 3.5'
    s = s.replace(old2, new2, 1)

    # 4 末段保底：没有夫妇时补成年人，不造无双亲婴儿
    old3 = """    /* 每笔末保底：远古一笔跨百年，凋零快于出生，在籍若只剩一两人，
       族谱、族人技能与传承就都读不出东西了。补到至少 4 位在籍，
       仍归下一代、仍记父辈指针；不改写寿数与编年跨年。 */
    const finalAlive=S.fam.filter(p=>p.alive);
    if(finalAlive.length<4){
      const head=finalAlive.find(p=>p.id===S.ruler)||finalAlive[0];
      for(let i=finalAlive.length;i<4;i++){
        const babe=newPerson(S.reg,startGen+1,'heir',rnd,pick);
        babe.age=Math.floor(rnd()*5);
        babe.born=Math.round(S.year-babe.age);
        babe.life=lifeAt(S,babe.born,babe.trait,rnd);
        if(W.kinship)W.kinship.attachBirth(S,babe,head,null,rnd);
        else{if(head){babe.parent=head.id;babe.fromName=head.name;}babe.skills=[];}
        if(head){babe.place=head.place||null;
          if(babe.place&&S.famPlaces)S.famPlaces[babe.id]=babe.place;}
        S.fam.push(babe);births++;
      }
    }"""
    new3 = """    /* 每笔末保底：远古一笔跨百年，凋零快于出生，在籍若只剩一两人，
       族谱、族人技能与传承就都读不出东西了。先尝试由夫妇添丁补到 4 位；
       若连一对可生育夫妇都没有（极端绝嗣），补的是同代成年人并让他们配对，
       绝不凭空造「没有双亲的婴儿」。 */
    let finalAlive=S.fam.filter(p=>p.alive);
    let guard=0;
    while(finalAlive.length<4&&guard++<6){
      const head=finalAlive.find(p=>p.id===S.ruler)||finalAlive[0];
      const babe=spawn(S,rnd,pick,head);
      if(babe){S.fam.push(babe);births++;}
      else{
        const g=Math.max(1,...S.fam.map(p=>p.gen||1));
        const adult=newPerson(S.reg,g,'member',rnd,pick);
        adult.age=18+Math.floor(rnd()*18);
        adult.born=Math.round(S.year-adult.age);
        adult.life=lifeAt(S,adult.born,adult.trait,rnd);
        adult.gender=adult.gender||(rnd()<.5?'male':'female');
        adult.skills=[];adult.parent=null;adult.parent2=null;
        adult.birthNote='旧档／绝嗣补员：成年人入册，无双亲记载';
        S.fam.push(adult);births++;
        if(W.kinship)W.kinship.matchUnmarried(S,rnd);
      }
      finalAlive=S.fam.filter(p=>p.alive);
    }"""
    assert old3 in s, 'fam tail'
    s = s.replace(old3, new3, 1)
    return s

rw('src/family.js', patch_fam)

# ─────────────────────────── engine.js ───────────────────────────
def patch_eng(s):
    # 1 先成家后添丁
    old = """    F.advanceFamily(S,famYears,rnd,pick);
    /* 每笔给未婚在籍成年人连一次夫妇关系，关系图才有姻亲与姑父一类称谓 */
    if(W.kinship)W.kinship.matchUnmarried(S,rnd);"""
    new = """    /* 先成家后添丁：先把未婚／丧偶成年人配成对，再让家族添丁，
       这样每个新生儿都挂在一对真实夫妇上，不会出现「未婚有子」。 */
    if(W.kinship)W.kinship.matchUnmarried(S,rnd);
    F.advanceFamily(S,famYears,rnd,pick);"""
    assert old in s, 'eng order'
    s = s.replace(old, new, 1)

    # 2 旧档迁移末尾校正
    old2 = """    if(o.phase==='result'&&!o.result)o.result={o:{t:'（续卷）',e:{}},msgs:[]};
    return o;"""
    new2 = """    if(o.phase==='result'&&!o.result)o.result={o:{t:'（续卷）',e:{}},msgs:[]};
    /* 旧档曾出现单亲孩子、以及按 S.gen+1 错标的世代；按亲子链就地校正 */
    if(W.kinship){try{W.kinship.normalize(o);}catch(e){}}
    return o;"""
    assert old2 in s, 'eng normalize'
    s = s.replace(old2, new2, 1)
    return s

rw('src/engine.js', patch_eng)

# ─────────────────────────── ui.js ───────────────────────────
def patch_ui(s):
    # 1 顶栏世代显示当家的世代，与族谱卡一致
    old = """+'<div class="era">'+e.n+' · 第 '+S.turn+' 笔 · 第 '+S.gen+' 代</div></div>'"""
    new = """+'<div class="era">'+e.n+' · 第 '+S.turn+' 笔 · 第 '
      +(((S.fam||[]).find(p=>p.id===S.ruler)||{}).gen||S.gen)+' 代</div></div>'"""
    assert old in s, 'ui era'
    s = s.replace(old, new, 1)

    # 2 关系图说明补一句
    old2 = """+'<div class="mini">点一个圆点看此人全部称谓；金＝血亲，蓝＝姻亲，红＝继嗣，灰＝居制。'
        +'称谓由实际关系链推出，不是预先写死的名称。</div>'"""
    new2 = """+'<div class="mini">点一个圆点看此人全部称谓；金＝血亲，蓝＝姻亲，红＝继嗣，灰＝居制。'
        +'称谓由实际关系链推出，不是预先写死的名称；孩子只从已配对的夫妇出生，'
        +'世代按双亲 +1 计算。</div>'"""
    assert old2 in s, 'ui graph note'
    s = s.replace(old2, new2, 1)

    # 3 点选面板过滤指向自己的制度读法
    old3 = """        const rel=W.kinship.relationsOf(St,p);
        box.innerHTML='<b>'+esc(p.name)+'</b>（第 '+p.gen+' 代 · '"""
    new3 = """        const rel=W.kinship.relationsOf(St,p).filter(r=>r.who&&r.who!==p.id);
        box.innerHTML='<b>'+esc(p.name)+'</b>（第 '+p.gen+' 代 · '"""
    assert old3 in s, 'ui pick'
    s = s.replace(old3, new3, 1)

    # 4 族人卡称谓栏同样过滤自指
    old4 = """        const KR=KN.relationsOf(S,p);"""
    new4 = """        const KR=KN.relationsOf(S,p).filter(r=>r.who&&r.who!==p.id);"""
    assert old4 in s, 'ui card rel'
    s = s.replace(old4, new4, 1)
    return s

rw('src/ui.js', patch_ui)
print('全部补丁完成')
