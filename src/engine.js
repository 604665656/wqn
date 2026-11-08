/* engine.js —— 状态机、事件选择、存档迁移
   史事与模板全部来自 WQN.data（外置 JSON），不再写死在代码里。 */
(function(W){
  'use strict';
  const D=W.data, F=W.family, WV=W.weave, R=W.rng;
  const KEY='wqn_save_v2', OLDKEY='wqn_save_v1';
  let S=null;
  /* 开局配置：由界面 configure() 设定，随存档一起走，保证复盘一致 */
  let CONFIG={reality:'balanced',modeKey:'chronicle',lengthKey:'standard',density:1,
    difficulty:'normal'};
  function configure(o){CONFIG=Object.assign({},CONFIG,o||{});if(S)Object.assign(S,CONFIG);return CONFIG;}
  function getConfig(){return Object.assign({},CONFIG);}
  /* 卷长随时长档变化；旧档迁移时按存档里的 lengthKey 还原 */
  function volLenOf(o){return W.reality.length(o&&o.lengthKey).vol;}
  function volLen(){return volLenOf(S);}
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  /* ---- 家族分布图：族人落脚点来自已考据地理单元，迁徙抉择改写 ---- */
  function geoUnits(reg){
    return D.layers.population.kernels.filter(u=>u.region===reg||u.region==='*');
  }
  function unitById(id){return D.layers.population.kernels.find(u=>u.id===id);}
  function unitName(id){const u=unitById(id);return u?u.name:'未记其地';}
  function assignFamPlaces(S){
    const us=geoUnits(S.reg),all=D.layers.population.kernels;
    const pool=us.length?us:all;
    S.famPlaces=S.famPlaces||{};
    S.migrations=S.migrations||[];
    S.fam.forEach((p,i)=>{
      if(!S.famPlaces[p.id]){
        /* 开局一支人聚在相邻两三处，迁徙抉择之后才散开，图上能看出「分房」 */
        const u=pool[Math.min(Math.floor(i/2),pool.length-1)];
        S.famPlaces[p.id]=u.id;p.place=u.id;
      }else p.place=S.famPlaces[p.id];
    });
    /* 清掉已不在族谱里的人，避免地图越点越脏 */
    const alive=new Set(S.fam.map(p=>p.id));
    Object.keys(S.famPlaces).forEach(id=>{if(!alive.has(id))delete S.famPlaces[id];});
  }
  function famDistribution(S){
    const out={};
    S.famPlaces=S.famPlaces||{};
    const fallback=(geoUnits(S.reg)[0]||D.layers.population.kernels[0]);
    S.fam.filter(p=>p.alive).forEach(p=>{
      let id=S.famPlaces[p.id]||p.place;
      if(!id||!unitById(id)){          // 新生儿或旧档缺登记，就地补到本圈地理单元
        id=fallback.id;
        S.famPlaces[p.id]=id;p.place=id;
      }
      if(!out[id])out[id]={unit:id,name:unitName(id),count:0,ruler:false,gens:[]};
      out[id].count++;out[id].gens.push(p.gen);
      if(p.id===S.ruler)out[id].ruler=true;
    });
    return Object.values(out).sort((a,b)=>b.count-a.count);
  }
  function migrateFamily(S,opt){
    const alive=S.fam.filter(p=>p.alive);
    if(!alive.length)return '';
    const all=D.layers.population.kernels;
    let target=null;
    /* 特殊选项（据舆地某单元之势）指定了目的地 */
    if(opt&&opt.geoTarget){
      target=all.find(u=>u.name===opt.geoTarget)
        ||all.find(u=>u.name.indexOf(opt.geoTarget)>=0||opt.geoTarget.indexOf(u.name)>=0);
    }
    const cur=S.famPlaces[S.ruler]||alive[0].place;
    if(!target){
      const other=all.filter(u=>u.id!==cur);
      /* 优先本圈／邻近圈，别一迁就跨半个地球 */
      const near=other.filter(u=>{const a=unitById(cur);return a&&Math.abs(u.lat-a.lat)<25&&Math.abs(u.lon-a.lon)<60;});
      const pool=near.length?near:other;
      target=pool[Math.floor(rnd()*pool.length)];
    }
    if(!target||target.id===cur)return '';
    /* 分一支人走：约半数在籍族人迁到新落脚点，当家随行 */
    const movers=alive.filter((p,i)=>i%2===0||p.id===S.ruler);
    movers.forEach(p=>{S.famPlaces[p.id]=target.id;p.place=target.id;});
    const rec={y:S.year,from:cur,fromName:unitName(cur),to:target.id,toName:target.name,
      count:movers.length,why:opt&&opt.t?opt.t.slice(0,34):'分房迁徙'};
    S.migrations.push(rec);
    if(S.migrations.length>40)S.migrations=S.migrations.slice(-40);
    S.mil.push({y:S.year,t:'家族迁徙 · '+rec.fromName+' → '+rec.toName+'（'+rec.count+' 人）'});
    return '【家族 · 推演】一支 '+rec.count+' 人自「'+rec.fromName+'」迁往「'+rec.toName+'」，'
      +'已在家族分布图与族谱中记下。';
  }
  function rnd(){const r=R.next(S.rngState);S.rngState=r[1];return r[0];}
  function pick(a){return a[Math.floor(rnd()*a.length)];}
  function state(){return S;}
  function setState(o){S=o;return S;}
  function save(){
    try{
      localStorage.setItem(KEY,JSON.stringify(S));
      if(S&&typeof S.slot==='number')
        localStorage.setItem('wqn_slot_'+S.slot,JSON.stringify({ts:Date.now(),S:S}));
    }catch(e){}
  }
  function load(){
    try{
      let a=localStorage.getItem(KEY);
      if(!a){a=localStorage.getItem(OLDKEY);}
      if(!a)return null;
      return migrate(JSON.parse(a));
    }catch(e){return null;}
  }
  function migrate(o){
    if(!o||typeof o!=='object')return null;
    if(!o.rngState)o.rngState=R.hashSeed(o.seed||('legacy-'+o.turn));
    if(!o.seed)o.seed='legacy';
    o.v=2;
    if(!o.tags)o.tags={};
    if(!o.used)o.used={};
    if(!o.log)o.log=[];
    if(!o.mil)o.mil=[];
    if(!o.echo)o.echo=[];
    /* 版本补写不依赖族谱：即便旧档字段不全，也要先标上当前文件版本 */
    if(!o.ver)o.ver=(D.version?D.version.version:'0');
    if(!o.fam||!o.fam.length)return null;
    if(typeof o.dead!=='number')o.dead=0;
    if(typeof o.gen!=='number')o.gen=1;
    if(typeof o.score!=='number')o.score=0;
    if(!o.vol||typeof o.vol.n!=='number'){
      const vl=volLenOf(o),vt=(o.turn||0)%vl;
      o.vol={n:Math.floor((o.turn||0)/vl)+1,startYear:o.year,
        startSt:Object.assign({},o.st),startTags:Object.assign({},o.tags),
        startLog:Math.max(0,o.log.length-vt),startMil:o.mil.length,
        startDead:o.dead,startGen:o.gen};
    }
    if(typeof o.volTurn!=='number')o.volTurn=(o.turn||0)%volLenOf(o);
    if(typeof o.ended!=='boolean')o.ended=false;
    if(!o.endLog)o.endLog=[];
    if(!o.volLog)o.volLog=[];
    if(!o.stitches)o.stitches=[];
    if(!o.scroll)o.scroll={final:false};
    if(!o.mode)o.mode='sim';
    if(!o.entity)o.entity=null;
    if(!o.usedReal)o.usedReal={};
    if(!o.realEnd)o.realEnd=null;
    if(!o.seenCiv)o.seenCiv={};
    if(!o.seenRuler)o.seenRuler={};
    if(!o.seenHouse)o.seenHouse={};
    if(typeof o.houseId==='undefined')o.houseId=null;
    if(!o.personLens)o.personLens=null;
    if(!o.chainState)o.chainState=null;
    if(!o.turnover)o.turnover=null;
    if(!o.choices)o.choices=[];
    if(!o.famLog)o.famLog=[];
    if(!o.quiz)o.quiz={right:0,wrong:0};
    if(!o.bioSeen)o.bioSeen={};
    if(!o.treasureSeen)o.treasureSeen={};
    if(typeof o.slot!=='number')o.slot=0;
    if(!o.reality)o.reality='balanced';
    if(!o.modeKey)o.modeKey='chronicle';
    if(!o.lengthKey)o.lengthKey='standard';
    if(typeof o.density!=='number')o.density=1;
    if(!o.difficulty)o.difficulty='normal';
    if(W.tutorial)W.tutorial.ensure(o);
    if(!o.climateSeen)o.climateSeen={};
    if(!o.fringeSeen)o.fringeSeen={};
    if(!o.misread)o.misread={text:0,hypothesis:0,severe:0};
    if(!o.ancientSeen)o.ancientSeen={};
    if(!o.optUse)o.optUse={};
    if(!o.jobs)o.jobs={};
    if(!o.optEcho)o.optEcho=[];
    if(!o.famPlaces)o.famPlaces={};
    if(!o.migrations)o.migrations=[];
    ['projects','projectLedger','stances'].forEach(k=>{if(!o[k]||Array.isArray(o[k]))o[k]={};});
    ['completedProjects','roads'].forEach(k=>{if(!Array.isArray(o[k]))o[k]=[];});
    /* 旧档没有落脚点：就地按本圈地理单元补齐，续玩立刻能在家族分布图上看到 */
    if(D.layers&&Object.keys(o.famPlaces).length===0){
      const us=geoUnits(o.reg),all=D.layers.population.kernels,pool=us.length?us:all;
      o.fam.forEach((p,i)=>{
        const u=pool[Math.min(Math.floor(i/2),pool.length-1)];
        o.famPlaces[p.id]=u.id;p.place=u.id;
      });
    }
    /* 旧版 cur.opts 没有 kind/basis 等字段，用独立随机源重建，刷新后立刻用上新选项；
       不消耗主 rngState，也不动全局状态，存档续玩与复盘序列都保持干净。 */
    if(o.phase==='choice'&&o.cur&&Array.isArray(o.cur.opts)&&o.cur.opts.length
      &&!o.cur.opts[0].kind&&W.options){
      let rs=o.rngState;
      const trnd=()=>{const r=R.next(rs);rs=r[1];return r[0];};
      const tpick=a=>a[Math.floor(trnd()*a.length)];
      try{o.cur.opts=W.options.generate(o.cur,o,trnd,tpick);}catch(e){/* 旧卡保持原样 */}
    }
    // 旧版把「一笔跨过的百年」直接加到个人年龄上，出现过百岁古人。迁移时收敛回人的范围。
    if(Array.isArray(o.fam))o.fam.forEach(p=>{
      if(p.alive&&p.age>90)p.age=20+Math.abs(String(p.id||'x').split('').reduce((a,c)=>a+c.charCodeAt(0),0))%22;
      if(typeof p.born!=='number')p.born=Math.round(o.year-p.age);
      delete p.life;                       // 由新寿数模型按出生年代重算
    });
    if(Array.isArray(o.log))o.log.forEach(l=>{
      if(l&&typeof l.t==='string')l.t=l.t.replace(/享年约\s*(\d+)\s*岁/g,
        (m,n)=>'享年约 '+Math.max(1,Math.min(92,+n))+' 岁');
    });
    if(o.mode==='succession'&&(!o.chainState||!W.succession.chainOf(o.chainState.region))){o.mode='real';o.chainState=null;}
    if(o.mode==='real'&&o.entity&&typeof o.entity.phaseIdx!=='number')o.entity.phaseIdx=0;
    if(o.mode==='real'&&o.entity&&!o.entity.civPhases)o.entity.civPhases={};
    if(['choice','result','volume','ending','realend','turnover','scroll'].indexOf(o.phase)<0)o.phase='result';
    if(o.phase==='choice'&&!o.cur)o.phase='result';
    if(o.phase==='result'&&!o.result)o.result={o:{t:'（续卷）',e:{}},msgs:[]};
    /* 旧档曾出现单亲孩子、以及按 S.gen+1 错标的世代；按亲子链就地校正 */
    if(W.kinship){try{W.kinship.normalize(o);}catch(e){}}
    return o;
  }
  function fresh(region,view,seedStr){
    const seed=seedStr||('s'+Date.now()+'-'+Math.floor(Math.random()*1e9));
    const tmp={reg:region,view:view,year:-5000,era:0,turn:0,
      st:Object.assign({},D.regions[region].base),
      tags:{},used:{},log:[],mil:[],echo:[],
      fam:[],ruler:null,gen:2,dead:0,
      chain:null,cur:null,phase:'result',result:null,score:0,seed:seed,
      rngState:R.hashSeed(seed),
      vol:null,volTurn:0,volEnd:null,volLog:[],stitches:[],
      ended:false,ending:null,endLog:[],scroll:{final:false},scrollReturn:'result',
      mode:'sim',entity:null,usedReal:{},realEnd:null,
      seenCiv:{},personLens:null,chainState:null,turnover:null,
      seenRuler:{},seenHouse:{},houseId:null,
      ver:(D.version?D.version.version:'0'),
      choices:[],famLog:[],quiz:{right:0,wrong:0},bioSeen:{},treasureSeen:{},slot:0,
      reality:CONFIG.reality,modeKey:CONFIG.modeKey,lengthKey:CONFIG.lengthKey,
      density:CONFIG.density,difficulty:CONFIG.difficulty||'normal',
      climateSeen:{},fringeSeen:{},ancientSeen:{},
      misread:{text:0,hypothesis:0,severe:0},
      optUse:{},jobs:{},optEcho:[],famPlaces:{},migrations:[],
      projects:{},projectLedger:{},completedProjects:[],roads:[],stances:[]};
    S=tmp;
    // 真实地理底色：地形给八维一点微小修正，不决定胜负
    const bias=W.geoclimate.baseBias(region);
    D.keyOrder.forEach(k=>{if(bias[k])tmp.st[k]=clamp(tmp.st[k]+bias[k],0,100);});
    // 难度只调初始八维，不碰史实；教程按难度默认开合
    if(W.difficulty)W.difficulty.applyStart(tmp,tmp.st);
    if(W.tutorial)tmp.tutorial=W.tutorial.fresh(tmp,
      W.difficulty?W.difficulty.tutorialDefault(tmp):false);
    const f0=F.newPerson(region,1,'ruler',rnd,pick);f0.age=22;
    const f1=F.newPerson(region,1,'member',rnd,pick);f1.age=20;
    const f2=F.newPerson(region,2,'heir',rnd,pick);f2.age=3;
    tmp.fam=[f0,f1,f2];tmp.ruler=f0.id;
    /* 亲属系统：开局抽继嗣制，承祧方不一定为父系；并把开局三人连成夫妇与子 */
    if(W.kinship){W.kinship.init(tmp,rnd);W.kinship.seedFamily(tmp,rnd);}
    assignFamPlaces(tmp);
    WV.newVolume(tmp,1);
    tmp.log.push({y:tmp.year,t:'第一堆篝火点起。'+D.regions[region].n+'，'+D.views[view].p+'自此记年。'
      +'【'+W.reality.banner(tmp)+'】'+W.reality.disclaimer(tmp),k:'era'});
    tmp.mil.push({y:tmp.year,t:'开局 · '+D.regions[region].n});
    return tmp;
  }
  /* 代入真实家族 / 王朝 / 文明：从「建立」之年入局，六阶段按考据年表推进 */
  function freshEntity(entityId,view,seedStr){
    const ent=W.real.entityById(entityId);
    if(!ent)throw new Error('未知真实实体：'+entityId);
    const t=fresh(ent.region,view,seedStr);
    const house=W.real.isHouse(ent.id);
    t.mode='real';
    t.houseId=house?ent.id:null;
    t.entity={id:ent.id,name:ent.name,phaseIdx:-1,phaseChanged:true,
      endedShown:false,civPhases:{}};
    t.year=ent.startYear;t.era=0;
    t.log=[{y:t.year,t:house
      ?('代入世家浮沉：'+ent.name+'。自 '+fmtYear(ent.startYear)
        +' 兴起之期入局，六阶段按通识级框架年表展开；'
        +'这是门第政治位置的浮沉，不是家族人口兴灭，也不表示本局族人是其成员。')
      :('代入真实血脉：'+ent.name+'。自 '+fmtYear(ent.startYear)
        +' 建立之年入局，此后六阶段按考据年表展开。'),k:'era'}];
    t.mil=[{y:t.year,t:'入局 · '+ent.name+(house?'（世家浮沉）':'（真实血脉）')}];
    // 建立阶段的史实态势
    const eff=W.real.PHASE_EFFECTS['建立']||{};
    D.keyOrder.forEach(k=>{if(eff[k])
      t.st[k]=clamp(t.st[k]+Math.round(eff[k]*(house?0.6:1)),0,100);});
    return t;
  }
  /* 朝代长河：一局连续走完某文明圈的全部首尾相续政权 */
  function freshSuccession(region,view,seedStr){
    const c=W.succession.chainOf(region);
    if(!c)throw new Error('该文明圈没有线性更迭链：'+region);
    const first=c.entities[0];
    const t=fresh(W.real.entityById(first.id).region,view,seedStr);
    t.mode='succession';
    t.chainState={region:region,idx:0,entityTurn:0,total:c.totalTurns};
    t.entity={id:first.id,name:first.name,phaseIdx:-1,phaseChanged:true,endedShown:false};
    t.year=first.startYear;t.era=0;
    t.log=[{y:t.year,t:'朝代长河 · '+c.title+'。自 '+fmtYear(first.startYear)+' '+first.name
      +'建立之年入局，一局连走 '+c.entities.length+' 朝。',k:'era'}];
    t.mil=[{y:t.year,t:'入长河 · '+first.name+'（第 1/'+c.entities.length+' 朝）'}];
    recordFamily(first.name,0);
    return t;
  }
  const eraIdx=y=>{for(let i=0;i<D.eras.length;i++)if(y>=D.eras[i].from&&y<D.eras[i].to)return i;return D.eras.length-1;};
  const eraOf=()=>D.eras[eraIdx(S.year)];
  const stepSize=()=>{const e=eraOf();return e.step+Math.floor(rnd()*e.jit);};
  const fmtYear=y=>y<0?'公元前 '+(-y)+' 年':(y===0?'公元 1 年':'公元 '+y+' 年');
  const fmtShort=y=>y<0?'前'+(-y):'公'+y;
  const aliveFam=(o)=>(o||S).fam.filter(p=>p.alive);
  /* 旧例账本：每则旧例不只是文案回响，真实改写 drift 系数 */
  const TAG_RULES={
    '初耕':{food:2},'灌溉':{food:2,people:1},'识字':{lore:2,cohesion:1},
    '立册':{lore:2,cohesion:1},'藏书':{lore:2},'远客':{wealth:2},'丝路':{wealth:2,craft:1},
    '造纸':{lore:2,craft:1},'活字':{lore:2},'火药':{might:2,craft:1},
    '铁器':{food:1,craft:2,might:1},'都江堰':{food:2},'科举':{lore:2,cohesion:2},
    '市舶':{wealth:2},'交子':{wealth:2},'乐律':{cohesion:2,lore:1},
    '法典':{cohesion:2,lore:1},'航海':{wealth:2,craft:1},'罗盘':{wealth:1,craft:2},
    '祠祀':{faith:2,cohesion:1},'立碑':{lore:1,cohesion:1},'结盟':{cohesion:2,might:1},
    '筑城':{might:2,cohesion:1},'通商':{wealth:2},'行会':{wealth:1,craft:1}
  };
  function ledger(){
    const out={};D.keyOrder.forEach(k=>out[k]=0);
    Object.keys(S.tags||{}).forEach(t=>{
      const r=TAG_RULES[t],n=Math.min(3,S.tags[t]||1);
      if(r)D.keyOrder.forEach(k=>out[k]+=(r[k]||0)*n);
      else out.cohesion+=n;   // 未列名的旧例一律折算为族和
    });
    /* 跨笔工程验收后的长期增益，与旧例共用同一套衰减账本 */
    if(W.consequences){
      const B=W.consequences.ledgerBonus(S);
      D.keyOrder.forEach(k=>{out[k]+=(B[k]||0)*12;});
    }
    return out;
  }
  function drift(years){
    const st=S.st,ei=eraIdx(S.year),k=clamp(years/30,.4,3);
    const L=ledger(),tagN=Object.keys(S.tags||{}).length;
    const M=W.reality.mode(S.modeKey),DF=W.difficulty?W.difficulty.drift(S):1;
    /* 玩法 pressure × 难度 drift：难度只改岁月衰减，不改史实频率 */
    const P=(M.pressure||1)*DF;
    // 旧例越多，族和衰减越慢；存续模式与困难档放大衰减
    const decay=clamp((1.6-tagN*.06)*P,.4,3.2);
    st.food+=Math.round((L.food*0.5)-S.st.people/60*k+rnd()*3-1-(P>1.4?1:0));
    st.people+=Math.round((st.food>45?2:st.food<18?-2:0)*k+rnd()*2-1+(L.people*.3));
    st.craft+=Math.round((ei>=5?1.4:.6)*k+rnd()*2-1+L.craft*.5);
    st.lore+=Math.round((.5+L.lore*.5)*k+rnd()*2-1+(L.lore*.3));
    st.cohesion+=Math.round((rnd()*3-decay)*k+L.cohesion*.4);
    st.wealth+=Math.round((.5+L.wealth*.5)*k+rnd()*2-1);
    st.might+=Math.round((rnd()*2-1.2)*k+L.might*.4);
    st.faith+=Math.round((rnd()*2-1.1)*k+L.faith*.4);
    D.keyOrder.forEach(x=>st[x]=clamp(Math.round(st[x]),0,100));
  }
  function fill(s){
    const e=eraOf();
    return String(s).replace(/\{n\}/g,pick(e.nouns)).replace(/\{a\}/g,pick(e.acts))
      .replace(/\{d\}/g,pick(e.nouns))
      .replace(/\{place\}/g,pick(['东邻','西市','河对岸','山南','旧堡','海隅','北原','邑中']))
      .replace(/\{-\}/g,S.echo.length?S.echo[S.echo.length-1]:'旧年');
  }
  function toEv(src,o){
    return Object.assign({},src,{o:src.options.map(x=>[x.t,x.e||{}]),kind:src.kind||'tpl'});
  }
  function histCandidates(){
    const y=S.year;
    return D.events.filter(h=>!S.used[h.id]&&y>=h.y0&&y<=h.y1&&
      (h.regions.indexOf('*')>=0||h.regions.indexOf(S.reg)>=0));
  }
  function tplCandidates(){
    const ei=eraIdx(S.year);
    return D.templates.filter(t=>!t.eras||t.eras.indexOf(ei)>=0);
  }
  function wrapHist(h){
    const far=h.regions.indexOf('*')>=0&&h.topic==='远闻';
    return {t:h.title,x:h.text,note:h.note,
      src:(far?'远闻 · ':'')+h.topic,isHist:h.kind==='history',
      o:h.options.map(x=>[x.t,x.e||{}])};
  }
  function wrapTpl(t){
    return {t:fill(t.title),x:fill(t.text),
      note:'此为程序化生成的推演情境，非具体史实。',
      src:'推演 · 日常',isHist:false,o:t.options.map(x=>[x.t,x.e||{}])};
  }
  function wrapChain(c,tag){
    return {t:c.title,x:c.text,
      note:tag==='crisis'?'由当前族群处境触发的推演情境。':'由此前某个选择引出的后续，非史实条目。',
      src:tag==='crisis'?'存续之秋':'分支后续',isHist:false,
      o:c.options.map(x=>[x.t,x.e||{}])};
  }
  /* 实体同期文明条目：与「朝代长河人物随朝登场」对称，
     真实血脉也能稳定见到同期人物／工艺／文化／商业，不靠随机撞概率。
     没有 entityLinks 的实体（如莫卧儿）退化为按年代窗口 + 区域取池。 */
  function entityCivPool(S){
    const ids=D.succession.entityLinks[S.entity.id]||[];
    const t0=W.reality.tier(S.reality);
    const seen=S.seenCiv||{},ent=W.real.entityById(S.entity.id);
    const allows=x=>W.reality.allows(t0,x.layer||'fact',x);
    const unseen=D.civilization.items.filter(x=>!seen[x.id]&&allows(x));
    /* 三层兜底：本实体关联未见 → 年代窗口内未见 → 本实体关联重访。
       知识驱动选项的「研习写回」会大量消耗未见池，不兜底的话短朝后期会整阶段空手。 */
    let pool=ids.length?unseen.filter(x=>ids.indexOf(x.id)>=0):[];
    if(!pool.length&&ent){
      pool=unseen.filter(x=>x.y0<=ent.endYear+40&&x.y1>=ent.startYear-40
        &&(x.region===S.reg||x.region==='*'));
    }
    if(!pool.length&&ids.length)pool=D.civilization.items.filter(x=>ids.indexOf(x.id)>=0&&allows(x));
    return pool;
  }
  function pickEvent(){
    // 0 真实血脉 / 朝代长河：史实阶段 > 同期文明条目 > 考据史事 > 通用情境
    if(S.mode==='real'||S.mode==='succession'){
      if(S.entity.phaseChanged){
        S.entity.phaseChanged=false;
        const ev=W.real.phaseEvent(S);
        if(S.mode==='succession'){
          const l=W.succession.link(S);
          ev.src='朝代长河 · '+l.name+' · '+ev.phase;
          ev.t='〔'+l.name+' · '+ev.phase+'〕';
          ev.note=ev.note.replace('史实节点：','史实节点：')+' 本朝为更迭链第 '
            +(S.chainState.idx+1)+' 站；阶段态势与抉择为游戏推演。';
        }
        return ev;
      }
      /* 真实血脉：每个六笔阶段保底一笔同期条目，避免短命王朝一局都遇不到 */
      if(S.mode==='real'){
        S.entity.civPhases=S.entity.civPhases||{};
        const ph=S.entity.phaseIdx,force=!S.entity.civPhases[ph];
        if(force||rnd()<.42){
          const pool=entityCivPool(S);
          if(pool.length){
            const x=pool[Math.floor(rnd()*pool.length)];
            S.entity.civPhases[ph]=1;
            const ev=W.civilization.wrap({item:x,near:x.region===S.reg});
            ev.src='真实血脉 · 同期 '+x.dimName;
            ev.note=(ev.note?ev.note+' ':'')+'年代窗口与本实体重叠，'
              +'不表示人物隶属该政权或在其治下任职；抉择为游戏推演。';
            return ev;
          }
        }
      }
      const rh=W.real.historyCandidates(S);
      if(rh.length&&rnd()>=.22){
        const h=rh[Math.floor(rnd()*rh.length)];
        S.usedReal[h.id]=1;
        return W.real.wrapHistory(h);
      }
    }
    // 0.5 文明四维度：真实人物 / 工艺技术 / 文化 / 商业
    //     长河的「非节点笔」优先挑本朝同期条目，让真实人物随朝代登场
    if(S.mode==='succession'&&!W.succession.nodeTurn(S)){
      // 本朝同期条目：按政权纪年归属取池，不再拿离散采样年去碰人物那几十年的窗口
      const l=W.succession.link(S);
      const ids=D.succession.entityLinks[l.id]||[];
      const t0=W.reality.tier(S.reality);
      let pool=D.civilization.items.filter(x=>ids.indexOf(x.id)>=0&&!S.seenCiv[x.id]
        &&W.reality.allows(t0,x.layer||'fact',x));
      // 每朝前两笔文明条目优先让同期真实人物登场
      if(S.chainState.entityTurn<=4){
        const people=pool.filter(x=>x.dim==='P');
        if(people.length)pool=people;
      }
      if(pool.length){
        const x=pool[Math.floor(rnd()*pool.length)];
        return W.civilization.wrap({item:x,near:x.region===S.reg});
      }
    }
    const M=W.reality.mode(S.modeKey),T=W.reality.tier(S.reality);
    // 0.6 真实地理与气候：环境压力，不作王朝兴衰归因
    const cl=W.geoclimate.pick(S,S.climateSeen,rnd);
    if(cl&&rnd()<.26)return W.geoclimate.wrap(cl,S);
    // 0.7 文本传统（野史／笔记／演义／小说）：兼容档以上，明确标非史实
    if(T.allow.text){
      const tx=W.fringe.textsAt(S,S.fringeSeen);
      if(tx.length&&rnd()<.13*M.text){
        const x=tx[Math.floor(rnd()*tx.length)];
        return W.fringe.wrapText(x,S);
      }
    }
    // 0.8 未证实假说：仅狂想档，低权重，全程红色警示
    if(T.allow.hypothesis){
      const hy=W.fringe.hypothesisAt(S,S.fringeSeen,rnd);
      if(hy)return W.fringe.wrapHypothesis(hy,S);
    }
    const cv=W.civilization.pick(S,rnd);
    const civP=clamp((S.mode==='succession'?.34:.46)*M.hist*W.reality.density(S.density).w,0,.92);
    if(cv&&rnd()<civP)return W.civilization.wrap(cv);
    // 1 链式后续：上一笔的 divert
    if(S.chain){
      const c=D.chains.chains.find(x=>x.id===S.chain);
      S.chain=null;
      if(c)return wrapChain(c,'chain');
    }
    // 2 存续危机：触发线由难度决定，史实层不受影响
    const CA=W.difficulty?W.difficulty.crisisAt(S):{food:12,people:10,cohesion:12};
    if(S.st.food<=CA.food||S.st.people<=CA.people||S.st.cohesion<=CA.cohesion)
      return wrapChain(pick(D.chains.crises),'crisis');
    // 3 史实：本土与远闻同时抵达
    const hs=histCandidates();
    if(hs.length){
      const urgent=hs.filter(h=>h.y1-S.year<=stepSize()*2);
      if(urgent.length||rnd()>=.14){
        const pool=urgent.length?urgent:hs;
        const h=pool[Math.floor(rnd()*pool.length)];
        S.used[h.id]=1;
        return wrapHist(h);
      }
    }
    // 4 通用模板：无尽分支的底盘
    const ts=tplCandidates();
    let r=rnd()*ts.reduce((a,b)=>a+(b.weight||1),0),ch=ts[0];
    for(let i=0;i<ts.length;i++){r-=ts[i].weight||1;if(r<=0){ch=ts[i];break;}}
    return wrapTpl(ch);
  }
  function effDesc(e){
    const a=[];
    D.keyOrder.forEach(k=>{if(e[k])a.push(D.keys[k]+(e[k]>0?'+':'−')+Math.abs(e[k]));});
    if(e.tag)a.push('得「'+e.tag+'」');
    if(e.chain)a.push('另有后续');
    return a.length?a.join(' · '):'无显效，只留一笔';
  }
  function buildOpts(ev){
    /* 旧版是「两条写死模板 + 一条永远相同的视角回响」凑满三条，长局越点越单调。
       现在交给知识驱动生成器：已见条目、八维、地理气候、同期政权共同决定 3—5 条岔路。 */
    return W.options.generate(ev,S,rnd,pick);
  }
  function applyEff(e){
    const msgs=[];
    D.keyOrder.forEach(k=>{if(e[k])S.st[k]=clamp(S.st[k]+e[k],0,100);});
    if(e.tag){
      const isNew=!S.tags[e.tag];
      S.tags[e.tag]=(S.tags[e.tag]||0)+1;
      msgs.push(isNew?'此事得名「'+e.tag+'」，写入旧例。':'「'+e.tag+'」又添一笔。');
      if(isNew)S.mil.push({y:S.year,t:'立例 · '+e.tag});
    }
    if(e.chain)S.chain=e.chain;
    return msgs;
  }
  function choose(i){
    if(S.phase!=='choice'||!S.cur)return;
    const o=S.cur.opts[i];if(!o)return;
    S.choices.push(i);
    /* 未走之路：把这一笔被放弃的选项留档，卷末与收卷报告可回看 */
    if(W.consequences)W.consequences.recordRoads(S,i,S.cur.opts,S.year);
    const msgs=applyEff(o.e);
    /* 知识驱动选项的后果：风险判定、意外改写、研习写回、家族职业、卷末回响 */
    const OA=W.options.apply(o,S,rnd);
    OA.msgs.forEach(m=>msgs.push(m));
    Object.keys(OA.extra||{}).forEach(k=>{
      if(D.keyOrder.indexOf(k)>=0)S.st[k]=clamp(S.st[k]+OA.extra[k],0,100);
    });
    if(OA.migrate){
      const note=migrateFamily(S,{t:o.t,geoTarget:OA.geoTarget});
      if(note)msgs.push(note);
    }
    // 边界层登记：气候／文本／假说分别计数，误读单独记账，不写进史实编年
    if(S.cur.isClim&&S.cur.climMeta){
      const x=S.cur.climMeta;
      S.climateSeen[x.id]=1;
      msgs.push('【气候】'+x.title+' 已录入舆地编年。'+W.geoclimate.CAVEAT);
      S.mil.push({y:S.year,t:'气候 · '+x.category+'／'+x.title});
    }
    if(S.cur.isText&&S.cur.textMeta){
      const x=S.cur.textMeta;
      S.fringeSeen[x.id]=1;
      msgs.push('【文本传统】'+x.title+' 录入别册（'+x.nature+'，非史实）。');
    }
    if(S.cur.isHypothesis&&S.cur.hypMeta){
      const x=S.cur.hypMeta;
      S.fringeSeen[x.id]=1;
      msgs.push('【奇谈别册】'+x.name+'（'+x.standing+'，无证据）。');
    }
    if(S.cur.isText||S.cur.isHypothesis){
      const warn=W.fringe.recordMisread(S,o,S.cur);
      if(warn)msgs.push(warn);
    }
    if(S.cur.isPre&&S.cur.preMeta)S.ancientSeen[S.cur.preMeta.id]=1;
    if(S.cur.isPhase&&W.real.PHASE_EFFECTS[S.cur.phase]){
      const pe=W.real.PHASE_EFFECTS[S.cur.phase];
      D.keyOrder.forEach(k=>{if(pe[k])S.st[k]=clamp(S.st[k]+pe[k],0,100);});
      msgs.push('【史实阶段态势】'+S.cur.phase+'：'
        +D.keyOrder.filter(k=>pe[k]).map(k=>D.keys[k]+(pe[k]>0?'+':'')+pe[k]).join('、')+'。');
      S.mil.push({y:S.year,t:'阶段 · '+S.entity.name+' '+S.cur.phase+'（'+S.cur.phaseLabel+'）'});
    }
    if(S.cur.isCiv&&S.cur.civMeta){
      const x=S.cur.civMeta;
      S.seenCiv[x.id]=1;
      if(x.dim==='P')S.personLens=x.id;
      msgs.push('【'+x.dimName+'】'+x.title+' 已录入文明册（'+W.civilization.PRECISION_LABEL[x.precision]+'）。');
      S.mil.push({y:S.year,t:'文明 · '+x.dimName+'／'+x.title});
      if(o.e._quiz){
        S.quiz=(S.quiz||{right:0,wrong:0});
        if(o.e._correct){
          S.quiz.right++;S.score+=6;
          msgs.push('【考据】辨为「传说或后世追述」，判读正确，文脉另记一笔。');
          S.mil.push({y:S.year,t:'考据 · 辨传说 '+x.title});
        }else{
          S.quiz.wrong++;
          msgs.push('【考据】此条在数据中标记为传说／后世追述，不宜断为确证史实。');
          S.mil.push({y:S.year,t:'考据 · 误断 '+x.title});
        }
      }
      if(S.cur.bio){S.bioSeen=S.bioSeen||{};S.bioSeen[S.cur.bio.id]=1;}
      if(S.cur.treasure){S.treasureSeen=S.treasureSeen||{};S.treasureSeen[S.cur.treasure.id]=1;}
    }
    /* 帝王与世家：按年代窗口落一笔「同期在位／同期名族」。
       只记同期，不与推演族人攀附，也不改写任何史实条目。 */
    if(W.dynasty){
      const dmsgs=W.dynasty.record(S);
      dmsgs.forEach(m=>{
        msgs.push(m);
        if(S.log.length<400)S.log.push({y:S.year,t:m,k:'dyn'});
      });
    }
    S.echo.push(o.t);if(S.echo.length>6)S.echo.shift();
    if(S.cur.isHist)S.mil.push({y:S.year,t:'亲历 · '+S.cur.t});
    S.log.push({y:S.year,t:'【'+S.cur.t+'】择「'+o.t+'」：'+effDesc(o.e),k:'choice'});
    S.result={o:o,msgs:msgs};
    S.score+=2+(S.cur.isHist?8:0)+(o.e.tag?3:0);
    WV.stitch(S,o,S.cur);
    S.volTurn++;
    // 长河由更迭链决定终点，随机终章不打断朝代相续
    const LEN=W.reality.length(S.lengthKey),MD=W.reality.mode(S.modeKey);
    const noEnd=S.lengthKey==='endless'||MD.sandbox||S.mode==='succession';
    const E=noEnd?null:WV.checkEnding(S);
    if(S.mode==='real'&&!S.entity.endedShown&&S.turn>=W.real.TOTAL_STEPS){
      S.entity.endedShown=true;
      S.phase='realend';S.realEnd=W.real.endingCard(S);
      S.mil.push({y:S.year,t:'真实终章 · '+S.entity.name+'（'+S.realEnd.year+'）'});
      S.log.push({y:S.year,t:'【真实终章】'+S.entity.name+'：'+S.realEnd.reason,k:'era'});
    }else if(E){
      S.phase='ending';S.ending=E;S.ended=true;
      S.endLog.push({y:S.year,t:E.name+' · '+E.why});
      S.mil.push({y:S.year,t:'终章 · '+E.name});
      S.log.push({y:S.year,t:'【终章】'+E.name+'：'+E.why+'。',k:'era'});
    }else if(S.volTurn>=volLen()){
      S.phase='volume';S.volEnd=WV.gather(S);
      S.volLog.push(S.volEnd);
      S.shortEnd=!!(LEN.maxVol&&S.vol.n>=LEN.maxVol);
      S.mil.push({y:S.year,t:'卷 '+S.vol.n+' 毕 · '+WV.volTitle(S.vol.n)});
      S.log.push({y:S.year,t:'卷 '+S.vol.n+'「'+WV.volTitle(S.vol.n)+'」至此汇流，共 '+volLen()+' 笔。',k:'era'});
    }else S.phase='result';
    save();
  }
  function step(){
    if(S.phase==='choice'&&!S.cur)S.phase='result';
    if(S.phase!=='result')return;
    const isReal=S.mode==='real'&&!(S.entity&&S.entity.endedShown),
          isChain=S.mode==='succession'&&!(S.entity&&S.entity.endedShown),
          prevEra=eraIdx(S.year);
    let dt,famYears;
    if(isChain){
      const prevYear=S.year;
      S.chainState.entityTurn++;
      S.turn++;
      S.year=W.succession.yearAt(S);
      if(S.year===0)S.year=1;
      // 更迭跳年（如 220 → 618）允许年份前跳；同朝内保持不倒退
      if(S.year<prevYear&&S.chainState.entityTurn>1)S.year=prevYear;
      const np=W.succession.phaseIdx(S);
      S.entity.phaseChanged=(np!==S.entity.phaseIdx);
      S.entity.phaseIdx=np;
      dt=Math.max(1,Math.min(30,Math.abs(S.year-prevYear)));
      famYears=Math.min(14,dt+3);
    }else if(isReal){
      const ent=W.real.entityById(S.entity.id),prevYear=S.year;
      S.turn++;
      S.year=W.real.yearAt(ent,Math.min(S.turn-1,W.real.TOTAL_STEPS-1));
      if(S.year===0)S.year=1;
      const np=W.real.phaseIdxAt(S.turn-1);
      S.entity.phaseChanged=(np!==S.entity.phaseIdx);
      S.entity.phaseIdx=np;
      dt=Math.max(1,Math.abs(S.year-prevYear));
      famYears=Math.min(16,dt+4);   // 真实血脉的主角是实体，虚构族人只作陪衬
    }else{
      dt=stepSize();const first=(S.turn===0);
      S.year+=dt;if(S.year>=0&&S.year<1)S.year=1;if(S.year===0)S.year=1;
      S.turn++;
      famYears=first?6:dt;
    }
    /* 先成家后添丁：先把未婚／丧偶成年人配成对，再让家族添丁，
       这样每个新生儿都挂在一对真实夫妇上，不会出现「未婚有子」。 */
    if(W.kinship)W.kinship.matchUnmarried(S,rnd);
    F.advanceFamily(S,famYears,rnd,pick);
    drift(dt);
    const ei=eraIdx(S.year);
    if(ei!==prevEra){
      S.era=ei;S.st.lore=clamp(S.st.lore+4,0,100);S.st.craft=clamp(S.st.craft+3,0,100);
      S.mil.push({y:S.year,t:'入新纪 · '+D.eras[ei].n});
      S.log.push({y:S.year,t:'时代推移，进入「'+D.eras[ei].n+'」。',k:'era'});
    }
    const ev=pickEvent();ev.opts=buildOpts(ev);
    S.cur=ev;S.phase='choice';S.result=null;
    S.score+=Math.round(S.st.people+S.st.lore+S.st.craft)/20;
    save();
  }
  function continueVolume(){
    if(S.phase!=='volume')return;
    if(S.shortEnd){
      S.shortEnd=false;S.ended=true;
      S.ending={name:'短卷收束',why:'短局两卷已毕，就此合卷；史实未改，来日可另起一局。'};
      S.phase='ending';
      S.endLog.push({y:S.year,t:S.ending.name+' · '+S.ending.why});
      S.mil.push({y:S.year,t:'终章 · '+S.ending.name});
      S.log.push({y:S.year,t:'【终章】'+S.ending.name+'：'+S.ending.why,k:'era'});
      save();return;
    }
    WV.newVolume(S,S.vol.n+1);
    S.log.push({y:S.year,t:'卷 '+S.vol.n+'「'+WV.volTitle(S.vol.n)+'」启。',k:'era'});
    if(S.mode==='succession'&&!S.entity.endedShown&&S.chainState.entityTurn>=W.succession.STEPS_PER_ENTITY){
      // 每朝正好一卷：卷末之后先出更迭卡，再由玩家点入下一朝
      S.phase='turnover';S.turnover=W.succession.turnoverCard(S);
      S.log.push({y:S.year,t:'【更迭】'+S.turnover.name+' 终（'+S.turnover.to+' 年），'
        +(S.turnover.last?'长河至此':'待入 '+S.turnover.next.name)+'。',k:'era'});
    }else{
      S.phase='result';S.result={o:{t:'续卷',e:{}},msgs:[]};
    }
    save();
  }
  /* 家族贯穿六朝：改朝换代对同一支人意味着什么（明确为推演） */
  const DYNASTY_FAMILY=[
    '受封于王畿之外，族谱始有可记之名。',
    '郡县推行，旧籍散佚，族人迁于新县。',
    '复立户籍，族中有人应征为吏。',
    '应举入仕，一支南迁，谱牒分房。',
    '弃田就市，族中始有经商者。',
    '修谱立祠，把前几朝的旧例重录一遍。'
  ];
  function recordFamily(dyn,idx){
    const al=aliveFam(),r=al.find(p=>p.id===S.ruler);
    const dist=famDistribution(S);
    const rec={year:S.year,dynasty:dyn,idx:idx,
      name:r?r.name:'—',gen:S.gen,alive:al.length,dead:S.dead,
      places:dist.map(d=>d.name+' '+d.count+' 人'),
      text:DYNASTY_FAMILY[Math.min(idx,DYNASTY_FAMILY.length-1)]};
    S.famLog.push(rec);
    S.log.push({y:S.year,t:'【家族 · 推演】'+dyn+'：'+rec.text
      +'（在籍 '+rec.alive+' 人，第 '+rec.gen+' 代'+(r?'，当家 '+r.name:'')
      +(rec.places.length?'，散居 '+rec.places.join('／'):'')+'）',k:'fam'});
    return rec;
  }
  function nextDynasty(){
    if(S.phase!=='turnover')return;
    if(W.succession.isLast(S)){
      S.entity.endedShown=true;
      S.phase='realend';S.realEnd=W.real.endingCard(S);
      S.mil.push({y:S.year,t:'长河终章 · '+S.entity.name+'（'+S.realEnd.year+'）'});
      S.log.push({y:S.year,t:'【长河终章】'+W.succession.chainOf(S.chainState.region).tail,k:'era'});
    }else{
      const c=W.succession.chainOf(S.chainState.region);
      S.chainState.idx++;
      const nx=c.entities[S.chainState.idx];
      S.chainState.entityTurn=0;
      S.entity={id:nx.id,name:nx.name,phaseIdx:-1,phaseChanged:true,endedShown:false};
      S.year=nx.startYear;
      S.mil.push({y:S.year,t:'更迭 · 入 '+nx.name+'（第 '+(S.chainState.idx+1)+'/'+c.entities.length+' 朝）'});
      S.log.push({y:S.year,t:'【更迭】'+fmtShort(S.year)+' '+nx.name+' 建立：'+nx.phases[0].event,k:'era'});
      // 改朝对家族：族和受损、文脉续存，旧籍散而复录
      S.st.cohesion=clamp(S.st.cohesion-4,0,100);
      S.st.lore=clamp(S.st.lore+3,0,100);
      recordFamily(nx.name,S.chainState.idx);
      S.phase='result';S.result={o:{t:'入 '+nx.name,e:{}},msgs:[]};
    }
    save();
  }
  function epilogue(){
    if(S.phase!=='ending')return;
    S.phase='result';S.result={o:{t:'余编',e:{}},msgs:[]};
    S.log.push({y:S.year,t:'终章之后，仍有人往前走。此后为余编。',k:'era'});
    save();
  }
  function realEndContinue(){
    if(S.phase!=='realend')return;
    S.phase='result';S.result={o:{t:'遗民余编',e:{}},msgs:[]};
    S.log.push({y:S.year,t:'实体已终，遗民仍往前走。此后为余编，不再有阶段节点。',k:'era'});
    save();
  }
  function openScroll(final){
    S.scrollReturn=S.phase;
    S.scroll={final:!!final,at:S.year};
    S.phase='scroll';save();
  }
  function backFromScroll(){
    S.phase=(['result','choice','volume','ending','realend','turnover'].indexOf(S.scrollReturn)>=0)?S.scrollReturn:'result';
    if(S.phase==='result'&&!S.result)S.result={o:{t:'（合上卷）',e:{}},msgs:[]};
    if(S.phase==='choice'&&!S.cur)S.phase='result';
    save();
  }
  function setView(v){if(D.views[v]){S.view=v;save();}}
  function restart(){try{localStorage.removeItem(KEY);localStorage.removeItem(OLDKEY);}catch(e){}S=null;}

  /* ---- 多存档槽 ---- */
  const SLOT_MAX=4;
  const slotKey=n=>'wqn_slot_'+n;
  function slots(){
    const out=[];
    for(let n=0;n<SLOT_MAX;n++){
      try{
        const o=JSON.parse(localStorage.getItem(slotKey(n))||'null');
        out.push(o&&o.S?{n:n,ts:o.ts,year:o.S.year,turn:o.S.turn,
          mode:o.S.mode,reg:o.S.reg,view:o.S.view,
          name:o.S.entity?o.S.entity.name:(o.S.chainState?D.regions[o.S.chainState.region].n:D.regions[o.S.reg].n)}:null);
      }catch(e){out.push(null);}
    }
    return out;
  }
  function useSlot(n){
    try{
      const o=JSON.parse(localStorage.getItem(slotKey(n))||'null');
      if(!o||!o.S)return false;
      const m=migrate(o.S);if(!m)return false;
      m.slot=n;S=m;save();return true;
    }catch(e){return false;}
  }
  function saveSlot(n){
    if(!S)return false;
    S.slot=n;
    try{localStorage.setItem(slotKey(n),JSON.stringify({ts:Date.now(),S:S}));save();return true;}
    catch(e){return false;}
  }
  function delSlot(n){try{localStorage.removeItem(slotKey(n));}catch(e){}}
  function exportAll(){
    const pack={v:3,ts:Date.now(),current:S,slots:{}};
    for(let n=0;n<SLOT_MAX;n++)try{const v=localStorage.getItem(slotKey(n));if(v)pack.slots[n]=JSON.parse(v);}catch(e){}
    return JSON.stringify(pack);
  }
  function importAll(str){
    try{
      const p=JSON.parse(str);
      if(!p||p.v!==3||!p.current)return false;
      for(let n=0;n<SLOT_MAX;n++)try{
        if(p.slots[n])localStorage.setItem(slotKey(n),JSON.stringify(p.slots[n]));
        else localStorage.removeItem(slotKey(n));
      }catch(e){}
      const m=migrate(p.current);if(!m)return false;
      S=m;save();return true;
    }catch(e){return false;}
  }
  /* ---- 分享串与对照局 ---- */
  function shareString(){
    if(!S)return '';
    const head=[S.seed,S.reg,S.view,S.mode,
      S.entity?S.entity.id:'-',S.chainState?S.chainState.region:'-',
      S.reality,S.modeKey,S.lengthKey,S.density,S.difficulty||'normal'].join('~');
    const raw=head+'|'+S.choices.join(',');
    try{return 'WQN1.'+btoa(unescape(encodeURIComponent(raw)));}
    catch(e){return 'WQN1.'+raw;}
  }
  function parseShare(str){
    try{
      if(String(str).indexOf('WQN1.')!==0)return null;
      const raw=decodeURIComponent(escape(atob(str.slice(5))));
      const [head,ch]=raw.split('|');
      const a=head.split('~');
      const [seed,reg,view,mode,entityId,chainRegion]=a;
      if(!seed||!D.regions[reg]||!D.views[view])return null;
      return {seed:seed,reg:reg,view:view,mode:mode,entityId:entityId,
        chainRegion:chainRegion,
        reality:a[6]||'balanced',modeKey:a[7]||'chronicle',
        lengthKey:a[8]||'standard',density:a[9]!==undefined?+a[9]:1,
        difficulty:a[10]||'normal',
        choices:ch?ch.split(',').map(Number):[]};
    }catch(e){return null;}
  }
  /* 重放一份对照局：同种子、按分享串的选择序列走，不改当前局 */
  let ghost=null;
  function replay(str){
    const p=parseShare(str);if(!p)return null;
    const keep=S,keepCfg=Object.assign({},CONFIG);
    let g;
    try{
      configure({reality:p.reality,modeKey:p.modeKey,lengthKey:p.lengthKey,
        density:p.density,difficulty:p.difficulty});
      if(p.mode==='succession'&&W.succession.chainOf(p.chainRegion))g=freshSuccession(p.chainRegion,p.view,p.seed);
      else if(p.mode==='real'&&p.entityId&&W.real.entityById(p.entityId))g=freshEntity(p.entityId,p.view,p.seed);
      else g=fresh(p.reg,p.view,p.seed);
      S=g;
      for(let i=0;i<p.choices.length;i++){
        if(S.phase!=='result')break;
        step();
        if(S.phase!=='choice')break;
        choose(p.choices[i]);
        let ph=S.phase;
        if(ph==='volume'){continueVolume();ph=S.phase;}
        if(ph==='turnover'){nextDynasty();ph=S.phase;}
        if(ph==='ending'){epilogue();}
        else if(ph==='realend'){realEndContinue();}
      }
    }catch(e){S=keep;configure(keepCfg);return null;}
    ghost=S;
    S=keep;configure(keepCfg);
    return ghost;
  }
  function getGhost(){return ghost;}
  function clearGhost(){ghost=null;}
  function ledgerNow(){return S?ledger():{};}
  W.engine={KEY:KEY,SLOT_MAX:SLOT_MAX,state:state,setState:setState,save:save,load:load,migrate:migrate,
    configure:configure,getConfig:getConfig,volLen:volLen,
    slots:slots,useSlot:useSlot,saveSlot:saveSlot,delSlot:delSlot,
    exportAll:exportAll,importAll:importAll,
    shareString:shareString,parseShare:parseShare,replay:replay,
    getGhost:getGhost,clearGhost:clearGhost,ledgerNow:ledgerNow,
    fresh:fresh,freshEntity:freshEntity,freshSuccession:freshSuccession,
    choose:choose,step:step,
    continueVolume:continueVolume,nextDynasty:nextDynasty,
    epilogue:epilogue,realEndContinue:realEndContinue,
    openScroll:openScroll,backFromScroll:backFromScroll,setView:setView,restart:restart,
    eraIdx:eraIdx,fmtYear:fmtYear,fmtShort:fmtShort,effDesc:effDesc,stepSize:stepSize,
    aliveFam:aliveFam,pickEvent:pickEvent,buildOpts:buildOpts,
    famDistribution:famDistribution,famMigrations:()=>(S?S.migrations||[]:[]),
    geoUnitName:unitName,geoUnits:geoUnits,
    projects:()=>(S?Object.values(S.projects||{}):[]),
    completedProjects:()=>(S?S.completedProjects||[]:[]),
    projectLedger:()=>(S?S.projectLedger||{}:{}),
    volumeRoads:n=>W.consequences.volumeRoads(S,S.vol?S.vol.n:1,n),
    allRoads:n=>W.consequences.allRoads(S,n),
    stances:()=>(S?S.stances||[]:[]),
    util:{rnd:rnd,pick:pick,clamp:clamp,fill:fill}};
  if(typeof module!=='undefined'&&module.exports)module.exports=W.engine;
})((typeof window!=='undefined'?window:globalThis).WQN=((typeof window!=='undefined'?window:globalThis).WQN||{}));
