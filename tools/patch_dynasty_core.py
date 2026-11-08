# -*- coding: utf-8 -*-
"""把帝王／世家接进引擎、真实血脉、收卷与构建。"""
import os
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def rw(rel,fn):
    p=os.path.join(ROOT,rel);s=open(p,encoding='utf8').read();s2=fn(s)
    assert s2!=s,rel+' 未改动';open(p,'w',encoding='utf8').write(s2);print('patched',rel)

# ───────── real.js：entityById 合并 house_entities ─────────
def real(s):
    old="""  const entityById=id=>D.entities.entities.find(e=>e.id===id)||null;
  const byName=n=>D.entities.entities.find(e=>e.name===n)||null;"""
    new="""  /* 世家代入复用六阶段年表：实体表仍是 12 个王朝，世家另册，互不混写。
     这样既有「12 个真实实体」的统计与测试口径都不变。 */
  const HOUSE=(D.house_entities&&D.house_entities.entities)||[];
  const entityById=id=>D.entities.entities.find(e=>e.id===id)
    ||HOUSE.find(e=>e.id===id)||null;
  const byName=n=>D.entities.entities.find(e=>e.name===n)
    ||HOUSE.find(e=>e.name===n)||null;
  const isHouse=id=>!!HOUSE.find(e=>e.id===id);
  const allEntities=()=>D.entities.entities.concat(HOUSE);"""
    assert old in s,'real 1';s=s.replace(old,new,1)
    old2="""    const d=D.entities.disputes[e.name]||D.entities.disputes[ALIAS[e.name]]||null;"""
    new2="""    const DP=D.entities.disputes||{};
    const d=DP[e.name]||DP[ALIAS[e.name]]||null;"""
    assert old2 in s,'real 2';s=s.replace(old2,new2,1)
    # 世家终章措辞：不是「独立政治实体」，而是「政治地位」
    old3="""      word:'编年走到 '+p.label+'，'+e.name+'作为独立政治实体的历史到此为止。'
        +'这不是游戏随机判定的终点，是史料里写着的年份。'};"""
    new3="""      word:isHouse(e.id)
        ?('编年走到 '+p.label+'，'+e.name+'作为显要门第的政治位置到此为止。'
          +'这不是家族人口消失，也不作精确终结年；六阶段是通识级框架锚点。')
        :('编年走到 '+p.label+'，'+e.name+'作为独立政治实体的历史到此为止。'
          +'这不是游戏随机判定的终点，是史料里写着的年份。')};"""
    assert old3 in s,'real 3';s=s.replace(old3,new3,1)
    old4="""    entityById:entityById,byName:byName,yearAt:yearAt,phaseIdxAt:phaseIdxAt,"""
    new4="""    entityById:entityById,byName:byName,isHouse:isHouse,allEntities:allEntities,
    HOUSE:HOUSE,yearAt:yearAt,phaseIdxAt:phaseIdxAt,"""
    assert old4 in s,'real 4';s=s.replace(old4,new4,1)
    return s
rw('src/real.js',real)

# ───────── engine.js ─────────
def eng(s):
    # 1 fresh 状态
    old="""      seenCiv:{},personLens:null,chainState:null,turnover:null,"""
    new="""      seenCiv:{},personLens:null,chainState:null,turnover:null,
      seenRuler:{},seenHouse:{},houseId:null,"""
    assert old in s,'eng fresh';s=s.replace(old,new,1)
    # 2 migrate 补字段
    old2="""    if(!o.seenCiv)o.seenCiv={};"""
    new2="""    if(!o.seenCiv)o.seenCiv={};
    if(!o.seenRuler)o.seenRuler={};
    if(!o.seenHouse)o.seenHouse={};
    if(typeof o.houseId==='undefined')o.houseId=null;"""
    assert old2 in s,'eng migrate';s=s.replace(old2,new2,1)
    # 3 freshEntity 支持世家
    old3="""    const t=fresh(ent.region,view,seedStr);
    t.mode='real';
    t.entity={id:ent.id,name:ent.name,phaseIdx:-1,phaseChanged:true,
      endedShown:false,civPhases:{}};
    t.year=ent.startYear;t.era=0;
    t.log=[{y:t.year,t:'代入真实血脉：'+ent.name+'。自 '+fmtYear(ent.startYear)
      +' 建立之年入局，此后六阶段按考据年表展开。',k:'era'}];
    t.mil=[{y:t.year,t:'入局 · '+ent.name+'（真实血脉）'}];"""
    new3="""    const t=fresh(ent.region,view,seedStr);
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
    t.mil=[{y:t.year,t:'入局 · '+ent.name+(house?'（世家浮沉）':'（真实血脉）')}];"""
    assert old3 in s,'eng freshEntity';s=s.replace(old3,new3,1)
    # 4 freshEntity 的「建立」态势：世家阶段名不同，PHASE_EFFECTS 取不到，给个温和默认
    old4="""    const eff=W.real.PHASE_EFFECTS['建立'];
    D.keyOrder.forEach(k=>{if(eff[k])t.st[k]=clamp(t.st[k]+eff[k],0,100);});
    return t;"""
    new4="""    const eff=W.real.PHASE_EFFECTS['建立']||{};
    D.keyOrder.forEach(k=>{if(eff[k])
      t.st[k]=clamp(t.st[k]+Math.round(eff[k]*(house?0.6:1)),0,100);});
    return t;"""
    assert old4 in s,'eng eff';s=s.replace(old4,new4,1)
    # 5 choose 里插同期记录
    old5="""    S.echo.push(o.t);if(S.echo.length>6)S.echo.shift();"""
    new5="""    /* 帝王与世家：按年代窗口落一笔「同期在位／同期名族」。
       只记同期，不与推演族人攀附，也不改写任何史实条目。 */
    if(W.dynasty){
      const dmsgs=W.dynasty.record(S);
      dmsgs.forEach(m=>{
        msgs.push(m);
        if(S.log.length<400)S.log.push({y:S.year,t:m,k:'dyn'});
      });
    }
    S.echo.push(o.t);if(S.echo.length>6)S.echo.shift();"""
    assert old5 in s,'eng record';s=s.replace(old5,new5,1)
    return s
rw('src/engine.js',eng)

# ───────── weave.js：收卷报告 ─────────
def weave(s):
    old="""      entity:((S.mode==='real'||S.mode==='succession')&&S.entity)?(function(){
        const e=D.entities.entities.find(x=>x.id===S.entity.id);
        return e?{name:e.name,phases:e.phases,
          endReason:e.phases[5].note,
          dispute:D.entities.disputes[e.name]||null}:null;
      })():null,"""
    new="""      entity:((S.mode==='real'||S.mode==='succession')&&S.entity)?(function(){
        const HOUSE=(D.house_entities&&D.house_entities.entities)||[];
        const e=D.entities.entities.find(x=>x.id===S.entity.id)
          ||HOUSE.find(x=>x.id===S.entity.id);
        const DP=D.entities.disputes||{};
        return e?{name:e.name,phases:e.phases,isHouse:!!S.houseId,
          endReason:e.phases[5].note,
          dispute:DP[e.name]||null}:null;
      })():null,
      dynasty:(W.dynasty)?W.dynasty.summary(S):null,"""
    assert old in s,'weave';s=s.replace(old,new,1)
    return s
rw('src/weave.js',weave)

# ───────── build.js：注入数据与模块 ─────────
def build(s):
    old="""const SRC=['src/rng.js','src/kinship.js','src/family.js','src/people.js','src/weave.js','src/real.js','src/civilization.js','src/succession.js','src/reality.js','src/difficulty.js','src/tutorial.js','src/geoclimate.js','src/fringe.js','src/atlas.js','src/consequences.js','src/options.js','src/engine.js','src/ui.js','src/main.js'];"""
    new="""const SRC=['src/rng.js','src/kinship.js','src/family.js','src/people.js','src/weave.js','src/real.js','src/civilization.js','src/succession.js','src/reality.js','src/difficulty.js','src/tutorial.js','src/geoclimate.js','src/fringe.js','src/atlas.js','src/consequences.js','src/dynasty.js','src/options.js','src/engine.js','src/ui.js','src/main.js'];"""
    assert old in s,'build src';s=s.replace(old,new,1)
    old2="""  kinship:JSON.parse(read('data/kinship.json'))
};"""
    new2="""  kinship:JSON.parse(read('data/kinship.json')),
  rulers:JSON.parse(read('data/rulers.json')),
  houses:JSON.parse(read('data/houses.json')),
  house_entities:JSON.parse(read('data/house_entities.json'))
};"""
    assert old2 in s,'build data';s=s.replace(old2,new2,1)
    old3="""  +' · 维度 '+data.civilization.dimensions.length
  +' · 时代 '+data.eras.length+' · 文明圈 '+Object.keys(data.regions).length);"""
    new3="""  +' · 维度 '+data.civilization.dimensions.length
  +' · 帝王 '+data.rulers.rulers.length+' 位 / '+data.rulers.notes.length+' 条称谓读法'
  +' · 世家 '+data.houses.houses.length+' 家（可代入 '+data.house_entities.entities.length+' 家）'
  +' · 时代 '+data.eras.length+' · 文明圈 '+Object.keys(data.regions).length);"""
    assert old3 in s,'build log';s=s.replace(old3,new3,1)
    return s
rw('build.js',build)
print('核心补丁完成')
