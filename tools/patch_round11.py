# -*- coding: utf-8 -*-
"""v1.0：帝王在位时间条、2 条联动、24 道继立方式判读题。
   幂等：联动按 id 去重、判读题按 id 去重，可重复运行。"""
import json, os
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D=os.path.join(ROOT,'data')

# ── 1. options.json +2 联动 ──
p=os.path.join(D,'options.json');o=json.load(open(p,encoding='utf8'))
NEW=[
 dict(id='SP_SUCCESSION',kind='study',
   text='闻「{ruler}」以「{succ}」继立，{act}',
   act='只录其继立口径，把法理继统与血统相承分作两栏',
   eff={'lore':6,'cohesion':2},cost={'wealth':-2},risk=0.13,
   fail={'lore':-2},req={},unlock=False,job='掌故',
   echo='继统是继统，血脉是血脉，一页放两栏。',weight=0.84,need='succession'),
 dict(id='SP_HOUSE_PEER',kind='diplomacy',
   text='「{houseA}」与「{houseB}」并见于时，{act}',
   act='两存其谱，各记里籍与年代，不排成前后相续',
   eff={'lore':5,'wealth':3},cost={'cohesion':-2},risk=0.15,
   fail={'lore':-3},req={},unlock=False,job='通谱',
   echo='并立的那几家，本来就不在一条线上。',weight=0.82,need='house_peer'),
]
have={x['id'] for x in o['special']}
o['special'].extend([x for x in NEW if x['id'] not in have])
o['meta']['round11']='v1.0 新增「继立辨读」「世家并立对读」两条联动；填词取自 rulers.json 的 succession 字段与同期并立名族，不改写条目。'
json.dump(o,open(p,'w',encoding='utf8'),ensure_ascii=False,indent=1)
print('options.special',len(o['special']))

# ── 2. options.js specialCtx +2 ──
p=os.path.join(ROOT,'src','options.js');s=open(p,encoding='utf8').read()
old="""    }else if(['price','risk','mineral','weather','specimen'].indexOf(need)>=0){"""
new="""    }else if(need==='succession'){
      /* v1.0：继立方式只作「法理继统」的读法依据，不写成血统相承 */
      const R=D.rulers||{rulers:[]};
      const pool=R.rulers.filter(x=>x.layer!=='legend'&&x.succession
        &&S.year>=x.y0-60&&S.year<=x.y1+60);
      const list=pool.length?pool:R.rulers.filter(x=>x.layer!=='legend'&&x.succession);
      const x=list[Math.floor(rnd()*(list.length||1))];
      if(!x)return null;
      ctx.ruler=x.name;ctx.succ=x.succession;ctx.polity=x.polity;
      ctx.rulerId=x.id;ctx.basisId=x.id;ctx.basisDim='DY_R';
    }else if(need==='house_peer'){
      /* v1.0：两家同期并立名族，明确「不排成前后相续」 */
      const H=D.houses||{houses:[]};
      const pool=H.houses.filter(x=>S.year>=x.y0-80&&S.year<=x.y1+80);
      const list=pool.length?pool:H.houses;
      const i=Math.floor(rnd()*(list.length||1));
      const a=list[i],b=list[(i+1+Math.floor(rnd()*Math.max(1,list.length-1)))%list.length];
      if(!a||!b||a.id===b.id)return null;
      ctx.houseA=a.name;ctx.houseB=b.name;
      ctx.houseAId=a.id;ctx.houseBId=b.id;
      ctx.basisId=a.id;ctx.basisDim='DY_H';
    }else if(['price','risk','mineral','weather','specimen'].indexOf(need)>=0){"""
assert old in s;s=s.replace(old,new,1);open(p,'w',encoding='utf8').write(s)
print('options.js specialCtx +2')

# ── 3. reading_quiz.json +24 道继立方式题 ──
p=os.path.join(D,'reading_quiz.json');q=json.load(open(p,encoding='utf8'))
TOPICS=[
 ('嫡长与宗法','把「嫡长子继承」写成所有朝代都实际执行过的固定规则。'),
 ('兄终弟及','把宋太宗继立直接写成无争议的兄终弟及。'),
 ('旁支入继','把汉文帝、宋英宗、明世宗的入继写成正常父死子继。'),
 ('过继与养子','把罗马过继、郭威养子柴荣写成生物学父子相承。'),
 ('禅让（形式）','把魏晋、隋唐朝代更替的「禅让」写成自愿让渡。'),
 ('忽里勒台推举','把蒙古大汗写成严格父死子继的世袭帝王。'),
 ('内禅与太上皇','把乾隆禅位后写成实权立即完全移交。'),
 ('复辟与两段在位','把明英宗正统／天顺算作两位帝王。'),
 ('追尊与生号','把「清太祖」「元太祖」当作生前帝号。'),
 ('被废与废立','把汉少帝、海陵王、宋前废帝写成正常终位的帝王。'),
 ('共治与共和行政','把前841—前828 共和行政写成某位周王在位。'),
 ('四帝共治','把戴克里先时期的罗马写成一位皇帝统治全境。'),
 ('女主称帝与称制','把吕后、慈禧的临朝称制写成正式称帝。'),
 ('幼主与摄政','把顺治初多尔衮、同治初垂帘写成摄政者即帝位。'),
 ('绝嗣与立新','把世家「绝嗣」写成整个姓氏的人群消失。'),
 ('并立争位','把十六国、南北朝、五代十国并立政权排成一条帝系。'),
 ('萨利克法与分支继统','把瓦卢瓦转波旁写成简单的父死子继。'),
 ('宗法分封与同姓','把姬姓诸侯国写成可逐代核实的单一父系谱。'),
 ('荫叙与科举','把门阀「累世为官」写成不经选官制度的世袭职位。'),
 ('特拉托阿尼','把阿兹特克三方联盟统治者写成「皇帝」。'),
 ('panaca 王室支系','把印加 panaca 当成现代意义的血缘家族。'),
 ('哈里发推举与世袭','把四大哈里发与倭马亚朝写成同一种继立制度。'),
 ('单于与可汗推举','把匈奴、突厥可汗写成固定嫡长世袭。'),
 ('将军与天皇并立','把幕府将军写成取代天皇的「日本皇帝」。'),
]
def mk(i,topic,bad):
    return dict(
      id='RQ%03d'%i,kind='succession',badge='辨继立方式',
      refId='SC_%02d'%(i-1),dim='HI',topic=topic,y0=-3000,y1=2026,
      stem='关于「'+topic+'」，下面哪一读法更稳妥？',
      ok='分层存疑：先分清「法理继统／职位名号／生物学世系」三层，'
         '再谈年代与谱系；对争议处往「帝王称谓与制度读法」追一步',
      mid='折中：按通行称法记下，异说与继立口径另注一行',
      bad='直取常见误解：'+bad,
      why='继立方式属制度史：同一称谓在不同政权、不同时段含义不同；'
          '收养、推举、内禅、复辟、共治都改变法理所属，不等于改写血缘，也不等于确证纪年。',
      further='对照文明册「称谓与制度读法」「世家边界读法」与帝王时间条图例',
      misread=bad,rank='百科／媒体',
      okEff={'lore':6,'cohesion':2},midEff={'lore':3,'cohesion':1},badEff={'lore':-2},
      okEcho='继统与血脉先分清楚，这一笔才落得稳。',
      midEcho='先按通行说法记下，继立口径那句留着。',
      badEcho='把常见的误读当成了结论，编年里多一笔要回头擦的账。',
      stanceOk='suspend',stanceMid='settle',
      note='只辨析读法，不判定史实，不改写任何条目；继立方式不作血统推断，本局族人不与真实世家攀附谱牒。　本条为通识框架锚点，不作学术引用。',
      tier='succession')
haveq={x['id'] for x in q['items']}
start=max(int(x['id'][2:]) for x in q['items'])+1
add=[]
for i,(t,b) in enumerate(TOPICS):
    x=mk(start+i,t,b)
    if x['id'] not in haveq:add.append(x)
q['items'].extend(add)
q['meta']['count']=len(q['items'])
q['meta']['succession']='v1.0 新增 24 道「继立方式」判读：误读项取自 rulers.json 的 succession 字段标注与帝王／世家边界读法，不另造史实断言。'
q['meta']['kinds']['succession']={'name':'辨继立方式','source':'rulers.json／继立方式 + 帝王称谓读法','count':24}
json.dump(q,open(p,'w',encoding='utf8'),ensure_ascii=False,indent=1)
print('题库',len(q['items']),'（新增',len(add),'）')

# ── 4. dynasty.js：时间条数据 ──
p=os.path.join(ROOT,'src','dynasty.js');s=open(p,encoding='utf8').read()
old="""  W.dynasty={ALL_R:ALL_R,ALL_H:ALL_H,R:R,H:H,"""
new="""  /* v1.0 帝王在位时间条：按政权给出可画区间，并把继立／层位异常分色。
     只画「某政权某时段在位」，不把并立政权排成前后相续。 */
  function timelineCat(x){
    const t=(x.succession||'')+(x.note||'');
    if(x.layer==='legend'||x.consensus==='legend')return 'legend';
    if(x.layer==='disputed')return 'disputed';
    if(/摄政|称制|听政|临朝|共治|共和|傀儡|并立|流亡/.test(t))return 'regency';
    if(/被废|被弑|禅让|内禅|复辟|篡立|短期|两度|退位|自缢/.test(t))return 'broken';
    if(/旁支|入继|养子|过继|推举|忽里勒台|指定|拥立/.test(t))return 'collateral';
    return 'normal';
  }
  const TL_LABEL={legend:'传说／后世追述',disputed:'存疑层',regency:'摄政·共治·并立',
    broken:'废立·内禅·复辟',collateral:'旁支·推举·过继',normal:'可考在位'};
  function timelineData(polity){
    const list=ALL_R.filter(x=>x.polity===polity);
    if(!list.length)return null;
    const withY=list.filter(x=>typeof x.y0==='number');
    if(!withY.length)return null;
    const y0=Math.min.apply(null,withY.map(x=>x.y0));
    const y1=Math.max.apply(null,withY.map(x=>x.y1));
    return {polity:polity,from:y0,to:y1,
      rows:list.slice().sort((a,b)=>(a.y0||0)-(b.y0||0)).map(x=>({
        id:x.id,name:x.name,title:x.title,y0:x.y0,y1:x.y1,raw:x.rawYear,
        cat:timelineCat(x),succ:x.succession||'',note:x.note||''})),
      label:TL_LABEL};
  }
  function polityNames(){
    const seen={};ALL_R.forEach(x=>{seen[x.polity]=1;});return Object.keys(seen);
  }
  W.dynasty={ALL_R:ALL_R,ALL_H:ALL_H,R:R,H:H,
    timelineData:timelineData,timelineCat:timelineCat,TL_LABEL:TL_LABEL,
    polityNames:polityNames,"""
assert old in s;s=s.replace(old,new,1);open(p,'w',encoding='utf8').write(s)
print('dynasty.js 时间条数据已加')
