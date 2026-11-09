/* family.js —— 家族世代与继承算法
   参考《王朝》开源项目的嫡长 / 兄终弟及 / 旁支过继分层，以及 Minerva / Life Sim 的世代模型。
   不依赖 DOM，可在 node 里单独跑逻辑测试。

   寿数模型（本轮修订）：一笔推演常跨数十至百余年，那是「编年跨过的岁月」，
   不是同一个人活过的年数。内部按约 25 年一代切成小段推进，每人有按出生年代
   估算的寿数，超过即凋零、由下一代接续；日志与族谱只显示人的实际年岁。 */
(function(W){
  'use strict';
  const D=W.data;
  const GEN_YEARS=25;          // 一代约 25 年

  function makeName(reg,gen,rnd,pick){
    const R=D.regions[reg];
    if(reg==='huaxia'||reg==='steppe')
      return pick(R.sur)+pick(R.giv)+(gen>2&&rnd()<.25?pick(['之','儿','生','公']):'');
    if(reg==='maya')return pick(R.sur)+'·'+pick(R.giv);
    return pick(R.giv)+(rnd()<.4?'·'+pick(R.sur):'');
  }
  function newPerson(reg,gen,role,rnd,pick){
    return {id:'p'+Math.floor(rnd()*1e9).toString(36),
      name:makeName(reg,gen,rnd,pick),gen:gen,
      age:role==='heir'?Math.floor(rnd()*8):Math.floor(18+rnd()*22),
      trait:pick(D.traits),alive:true,role:role||'member'};
  }
  /* 按出生年代估算寿数：越早越短，近现代显著变长；仓廪与信仰小幅修正。
     这是通识级人口史近似，不是个体寿命预测。 */
  function baseLife(born){
    if(born<-3000)return 38;
    if(born<-1000)return 43;
    if(born<500)return 48;
    if(born<1500)return 52;
    if(born<1800)return 56;
    if(born<1945)return 62;
    return 72;
  }
  function lifeAt(S,born,trait,rnd){
    const bonus=Math.round(((S.st.food||50)+(S.st.faith||50)-100)/28);
    const fit=(trait==='力健'||trait==='耐寒')?8:0;
    const jitter=Math.floor(rnd()*13)-6;
    return Math.max(26,Math.min(92,baseLife(born)+bonus+fit+jitter));
  }
  /* 旧档或新开局的人物若尚未带 born/life，就地补齐；顺带把异常大龄收敛回人的范围。 */
  function ensureLife(S,p,rnd){
    if(p.age>90)p.age=20+Math.floor(rnd()*22);
    if(typeof p.born!=='number')p.born=Math.round(S.year-p.age);
    if(typeof p.life!=='number')p.life=lifeAt(S,p.born,p.trait,rnd);
  }

  /* 继任顺位：嫡长(同代 heir) → 兄终弟及(同代) → 旁支过继(近支低代) → 绝嗣立新 */
  function succession(S,rnd,pick){
    const alive=S.fam.filter(p=>p.alive);
    if(!alive.length){
      /* 绝嗣立新＝旁支过继／重新立户，世代接续而非凭空加一代；
         只有真实生育（attachBirth）才会让世代 +1。 */
      const g=Math.max(1,...S.fam.map(x=>x.gen||1));
      const p=newPerson(S.reg,g,'ruler',rnd,pick);
      p.age=20+Math.floor(rnd()*12);
      p.born=Math.round(S.year-p.age);
      p.life=lifeAt(S,p.born,p.trait,rnd);
      S.fam.push(p);S.ruler=p.id;
      return {person:p,type:'绝嗣立新'};
    }
    const cur=S.fam.find(p=>p.id===S.ruler);
    const g=cur?cur.gen:alive[0].gen;
    const byAge=(a,b)=>b.age-a.age;
    let pool=alive.filter(p=>p.role==='heir'&&p.gen===g).sort(byAge);
    let type='嫡长继立';
    if(!pool.length){pool=alive.filter(p=>p.gen===g).sort(byAge);type='兄终弟及';}
    if(!pool.length){pool=alive.filter(p=>p.gen>g).sort((a,b)=>a.gen-b.gen||byAge(a,b));type='旁支过继';}
    if(!pool.length){pool=alive.slice().sort((a,b)=>b.gen-a.gen||byAge(a,b));type='旁支过继';}
    const p=pool[0];p.role='ruler';S.ruler=p.id;
    return {person:p,type:type,fromGen:g};
  }

  /* 添丁统一入口：先找一对已配对的夫妇，孩子挂双亲、世代按双亲 +1。
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
  function advanceFamily(S,years,rnd,pick){
    const span=Math.max(1,Math.round(years));
    // 把一笔跨过的百年切成若干「一代人」的小段，而不是把 150 年一次性加到一个人的年龄上
    const steps=Math.max(1,Math.min(8,Math.ceil(span/GEN_YEARS)));
    const slice=span/steps;
    let deaths=0,births=0;const succs=[];
    let birthBudget=4;                       // 每笔至多 4 名新生儿，防止家族膨胀
    const startGen=S.gen||1;                 // 本笔只记一次世代交接，避免跨百年的小段把代数刷爆

    if(span>GEN_YEARS*1.6&&S.log.length<400){
      S.log.push({y:S.year,t:'【岁月】此笔跨 '+span+' 年，家族已更替数代；编年只录其中一代人的事，并非一人活过百年。',k:'fam'});
    }
    for(let k=0;k<steps;k++){
      // 1 增岁与凋零：享年按寿数封顶，不按跨过的编年数
      S.fam.forEach(p=>{
        if(!p.alive)return;
        ensureLife(S,p,rnd);
        p.age=Math.round(p.age+slice);
        if(p.age>=p.life){
          p.age=p.life;
          p.alive=false;deaths++;
          if(S.log.length<400)S.log.push({y:S.year,t:'族人 '+p.name+'（第'+p.gen+'代）卒，享年约 '+p.age+' 岁。',k:'fam'});
        }
      });
      // 2 族长更替；只有真正交到下一代手里，在册世代才 +1
      if(!S.fam.some(p=>p.id===S.ruler&&p.alive)){
        const s=succession(S,rnd,pick);succs.push(s);
        S.log.push({y:S.year,t:'第 '+s.person.gen+' 代 '+s.person.name+'（'+s.person.trait+'）'+s.type+'，继为族长。',k:'fam'});
        S.mil.push({y:S.year,t:'族长更替 · '+s.person.name+' · '+s.type});
        S.chain='script';
      }
      // 3 新生儿：归入下一代，出生年与寿数当场定下
      /* 远古一笔跨百余年、每小段约 25 年，旧式「出生率」低于凋零率，
         长局在籍常只剩 1 人，族谱／技能／传承都读不出东西。
         每小段至少候补 1 名，成行概率略抬；上限仍由 birthBudget 与在籍裁剪控制。 */
      const want=Math.max(1,Math.min(birthBudget,
        Math.round(slice/GEN_YEARS*(0.9+S.st.people/70))));
      const head=S.fam.find(p=>p.id===S.ruler);
      for(let i=0;i<want;i++){
        if(rnd()<0.78+S.st.cohesion/300){
          const babe=spawn(S,rnd,pick,head);
          if(!babe)break;                 // 没有可生育夫妇，这一小段就不添丁
          S.fam.push(babe);births++;birthBudget--;
        }
      }
      /* 3.5 在籍保底：一支人若只剩一两位，族谱页就看不到技能与传承了。
         每笔至多补一名，不额外摇概率判定（沿用上面的 rnd 调用序列）。 */
      const nowAlive=S.fam.filter(p=>p.alive).length;
      if(!births&&nowAlive<3&&birthBudget>0){
        const head2=S.fam.find(p=>p.id===S.ruler)||S.fam.find(p=>p.alive);
        const babe=spawn(S,rnd,pick,head2);
        if(babe){S.fam.push(babe);births++;birthBudget--;}
      }
    }   /* 小段循环结束：每笔末再统一裁剪一次 */
    /* 每笔末保底：远古一笔跨百年，凋零快于出生，在籍若只剩一两人，
       族谱、族人技能与传承就都读不出东西了。先尝试由夫妇添丁补到 4 位；
       若连一对可生育夫妇都没有（极端绝嗣），补的是同代成年人并让他们配对，
       绝不凭空造「没有双亲的婴儿」。 */
    let finalAlive=S.fam.filter(p=>p.alive);
    let guard=0;
    while(finalAlive.length<4&&guard++<6){
      const head=finalAlive.find(p=>p.id===S.ruler)||finalAlive[0];
      /* 保底时放宽年龄窗口：只要还有一对在籍夫妇，就由他们添丁，
         而不是凭空补一个没有双亲的成年人。 */
      const couple=W.kinship?W.kinship.birthCouple(S,rnd,true):null;
      let babe=null;
      if(couple){
        const g=Math.max(couple.a.gen||1,couple.b.gen||1)+1;
        babe=newPerson(S.reg,g,'heir',rnd,pick);
        babe.age=Math.floor(rnd()*5);
        babe.born=Math.round(S.year-babe.age);
        babe.life=lifeAt(S,babe.born,babe.trait,rnd);
        if(!W.kinship.attachBirth(S,babe,couple.a,couple.b,rnd))babe=null;
        if(babe&&S.famPlaces&&couple.a){
          babe.place=S.famPlaces[couple.a.id]||couple.a.place||(head?head.place:null);
          if(babe.place)S.famPlaces[babe.id]=babe.place;
        }
      }
      if(!babe)babe=spawn(S,rnd,pick,head);
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
    }
    /* 每笔末统一裁剪一次（原来放在每个小段里，长局会反复全表扫描）。
       只保留在籍者 + 最近两位故去族长 + 「被在册者引用为双亲／配偶」的传递闭包，
       用 BFS 一次算完，O(n+e)。 */
    const idx=new Map(S.fam.map(p=>[p.id,p]));
    const al2=S.fam.filter(p=>p.alive);
    let keepAlive=null;
    if(al2.length>14){
      keepAlive=new Set(al2.sort((a,b)=>b.gen-a.gen||b.age-a.age)
        .slice(0,12).map(p=>p.id));
    }
    const keepDead=new Set(S.fam.filter(p=>!p.alive&&p.role==='ruler')
      .slice(-2).map(p=>p.id));
    /* BFS 只上溯 3 代（在籍者 → 双亲 → 祖父母 → 曾祖），
       足够推出姑父／舅母／岳父母／堂表，又不把整条祖先链全留在册。 */
    const queue=[],visited=new Set();
    S.fam.forEach(p=>{
      if((p.alive&&(!keepAlive||keepAlive.has(p.id)))||keepDead.has(p.id))
        queue.push({id:p.id,d:0});
    });
    let qi=0;
    while(qi<queue.length){
      const cur=queue[qi++];
      if(visited.has(cur.id))continue;visited.add(cur.id);
      if(cur.d>=3)continue;
      const p=idx.get(cur.id);if(!p)continue;
      const ids=[p.parent,p.parent2,p.spouse];
      const q=p.spouse?idx.get(p.spouse):null;
      if(q){ids.push(q.parent,q.parent2);}
      ids.forEach(id=>{
        if(!id||!idx.has(id)||visited.has(id))return;
        if(!idx.get(id).alive)keepDead.add(id);
        queue.push({id:id,d:cur.d+1});
      });
    }
    /* 故去者封顶 40 位，保留最近的（数组按时间追加，后段即近期） */
    if(keepDead.size>40){
      const recent=S.fam.filter(p=>!p.alive&&keepDead.has(p.id)).slice(-40)
        .map(p=>p.id);
      keepDead.clear();recent.forEach(id=>keepDead.add(id));
    }
    S.fam=S.fam.filter(p=>
      (p.alive&&(!keepAlive||keepAlive.has(p.id)))||keepDead.has(p.id));

    /* 在册世代由亲子链决定：取在籍族人的最大世代，不再让 S.gen 自己虚涨 */
    const liveG=S.fam.filter(p=>p.alive).map(p=>p.gen||1);
    if(liveG.length)S.gen=Math.max(1,...liveG);
    S.dead+=deaths;
    return {deaths:deaths,births:births,years:span,slices:steps,successions:succs};
  }

  W.family={GEN_YEARS:GEN_YEARS,baseLife:baseLife,lifeAt:lifeAt,ensureLife:ensureLife,
    makeName:makeName,newPerson:newPerson,succession:succession,advanceFamily:advanceFamily};
  if(typeof module!=='undefined'&&module.exports)module.exports=W.family;
})((typeof window!=='undefined'?window:globalThis).WQN=((typeof window!=='undefined'?window:globalThis).WQN||{}));
