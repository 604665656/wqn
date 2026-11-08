# -*- coding: utf-8 -*-
"""把帝王／世家接进选项池与判读题库；同步浏览器测试的联动数断言。"""
import json, os
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D=os.path.join(ROOT,'data')

# ── 1. options.json：3 条新联动（14 → 17） ──
p=os.path.join(D,'options.json');o=json.load(open(p,encoding='utf8'))
new_specials=[
 dict(id='SP_RULER',kind='diplomacy',
   text='同期在位「{ruler}」之名传至，{act}',
   act='按彼此都能接受的仪节回书，只记同期，不称臣也不攀附',
   eff={'wealth':4,'lore':3,'cohesion':2},cost={'faith':-2},risk=0.17,
   fail={'wealth':-3,'cohesion':-2},req={},unlock=False,job='掌仪',
   echo='同期归同期，名号不是管辖。',weight=0.88,need='ruler'),
 dict(id='SP_HOUSE',kind='study',
   text='闻「{house}」以地望相标，{act}',
   act='先立一册记其里籍与年代，明写郡望不作血统凭证',
   eff={'lore':6,'cohesion':2},cost={'wealth':-3},risk=0.12,
   fail={'lore':-2},req={},unlock=False,job='掌谱',
   echo='名望可以记，血脉不能替人认。',weight=0.86,need='house'),
 dict(id='SP_GENEAL',kind='study',
   text='谱牒「{house}」与读法「{houseNote}」并置，{act}',
   act='两存其说，把「排序」与「世系」分开著录',
   eff={'lore':7,'cohesion':1},cost={'wealth':-2,'faith':-1},risk=0.14,
   fail={'lore':-3},req={},unlock=False,job='校雠',
   echo='排序是排序，世系是世系，一页放两栏。',weight=0.82,need='house_note'),
]
existing={x['id'] for x in o['special']}
o['special'].extend([x for x in new_specials if x['id'] not in existing])
o['meta']['dynastyNote']='帝王／世家联动只取同期锚点作填词与取舍，传说层不进依据池；不改写任何条目，不与本局推演族人攀附谱牒。'
json.dump(o,open(p,'w',encoding='utf8'),ensure_ascii=False,indent=1)
print('options.special',len(o['special']))

# ── 2. options.js：specialCtx 三个 need ──
p=os.path.join(ROOT,'src','options.js');s=open(p,encoding='utf8').read()
old="""    }else if(['price','risk','mineral','weather','specimen'].indexOf(need)>=0){"""
new="""    }else if(need==='ruler'){
      /* 同期在位君主：传说层不进依据池；按年代窗口取，填词带称谓 */
      const R=D.rulers||{rulers:[]};
      const pool=R.rulers.filter(x=>x.layer!=='legend'
        &&S.year>=x.y0-40&&S.year<=x.y1+40);
      const list=pool.length?pool:R.rulers.filter(x=>x.layer!=='legend');
      const x=list[Math.floor(rnd()*(list.length||1))];
      if(!x)return null;
      ctx.ruler=x.name+'（'+x.title+' · '+x.polity+'）';ctx.rulerId=x.id;
      ctx.basisId=x.id;ctx.basisDim='DY_R';
    }else if(need==='house'){
      /* 同期名族：地望不是血统凭证，卡面只作里籍与年代参照 */
      const H=D.houses||{houses:[]};
      const pool=H.houses.filter(x=>S.year>=x.y0-60&&S.year<=x.y1+60);
      const list=pool.length?pool:H.houses;
      const x=list[Math.floor(rnd()*(list.length||1))];
      if(!x)return null;
      ctx.house=x.name;ctx.houseId=x.id;ctx.basisId=x.id;ctx.basisDim='DY_H';
    }else if(need==='house_note'){
      const H=D.houses||{houses:[],notes:[]};
      const pool=H.houses.filter(x=>S.year>=x.y0-80&&S.year<=x.y1+80);
      const list=pool.length?pool:H.houses;
      const a=list[Math.floor(rnd()*(list.length||1))];
      const b=(H.notes||[])[Math.floor(rnd()*((H.notes||[]).length||1))];
      if(!a||!b)return null;
      ctx.house=a.name;ctx.houseNote=b.title;ctx.houseId=a.id;
      ctx.basisId=a.id;ctx.basisDim='DY_H';
    }else if(['price','risk','mineral','weather','specimen'].indexOf(need)>=0){"""
assert old in s;s=s.replace(old,new,1)
open(p,'w',encoding='utf8').write(s)
print('options.js specialCtx 已扩')

# ── 3. reading_quiz.json：24 道帝王／世家判读 ──
p=os.path.join(D,'reading_quiz.json');q=json.load(open(p,encoding='utf8'))
RULER_MIS=[
 ('帝号、庙号、谥号、年号','把「康熙」「贞观」「崇祯」当作帝王本名或庙号。','帝王称谓','R_N1'),
 ('称制与称帝','把吕后、萧太后、慈禧的临朝称制写成「女皇帝即位」。','帝王称谓','R_N2'),
 ('「皇帝」不是通称','把法老、可汗、哈里发、苏丹、天皇一律译作「皇帝」。','帝王称谓','R_N3'),
 ('传说帝王','把三皇五帝、夏代诸王写成有可考纪年的在位帝王。','帝王层位','R_N4'),
 ('并立政权','把三国、十六国、南北朝、辽宋夏金排成一条前后相续的帝系。','帝王层位','R_N5'),
 ('追尊与生前','把「清太祖」「元太祖」当作努尔哈赤、成吉思汗生前的帝号。','帝王称谓','R_N6'),
 ('两段在位','把明英宗正统／天顺、唐中宗两次即位算作两位帝王。','帝王层位','R_N7'),
 ('精确年表','把商周、埃及王表、玛雅长纪历换算当成精确无争议的在位年。','帝王层位','R_N8'),
 ('共和行政','把前841—前828「共和行政」写成某位周王在位。','帝王称谓','R_N9'),
 ('子婴称王','把秦子婴写成「秦三世皇帝」。','帝王称谓','R_N10'),
 ('武周单列','把武则天 690—705 的武周并入唐帝系不另标。','帝王层位','R_N11'),
 ('将军与天皇','把镰仓／江户幕府将军写成「日本皇帝」。','帝王称谓','R_N12'),
]
HOUSE_MIS=[
 ('郡望与血统','把「琅琊王氏」「清河崔氏」当作可逐代核实的生物学父系凭证。','世家读法','H_N1'),
 ('谱牒与氏族志','把《氏族志》《姓氏录》的门第排序当作谱牒真伪鉴定。','世家读法','H_N2'),
 ('四世三公','把「四世三公」「一门三阁老」当成世家定义而非仕宦统计。','世家读法','H_N3'),
 ('衰落与绝灭','把世家「散脉／衰落」写成这一姓的人全部消失。','世家读法','H_N4'),
 ('并立与分支','把南朝诸皇族、罗马 gens、伊斯兰诸朝排成单线相续。','世家读法','H_N5'),
 ('氏族与流派','把「桐城派」「晋商」「关陇集团」写成血缘家族。','世家读法','H_N6'),
 ('联姻与收养','把罗马过继、日本赐姓养子当作生物学世系改写。','世家读法','H_N7'),
 ('攀附本局','把本局推演族人改姓后写成某真实世家的后裔。','世家读法','H_N8'),
 ('五姓七望','把「五姓七望」当成六朝始终固定的一份官方名单。','世家读法','H_N9'),
 ('牛李党争','把「牛党／李党」当成两个姓氏集团的世仇。','世家读法','H_N10'),
 ('王莽族属','把新朝王莽直接归入琅琊王氏。','世家读法','H_N11'),
 ('玛雅与帝国','把帕伦克、科潘城邦君主写成「玛雅帝国皇帝」。','世家读法','H_N12'),
]
def mk(i,topic,bad,cat,tag,kind):
    return dict(
      id='RQ%03d'%i,
      kind=('ruler' if tag.startswith('R_') else 'house'),
      badge=('辨帝王称谓' if tag.startswith('R_') else '辨世家读法'),
      refId=tag,dim='HI',topic=topic,y0=-3000,y1=2026,
      stem='关于「'+topic+'」，下面哪一读法更稳妥？',
      ok='分层存疑：先分清称谓／制度／层位，再谈年代与谱系；对争议处再往「'+cat+'」的边界读法追一步',
      mid='折中：按通行称法记下，异说与层位另注一行',
      bad='直取常见误解：'+bad,
      why='帝王与世家条目是通识级框架锚点：只记某政权某时段在位、某地望某时段活跃，不作精确年表、不作血统凭证。',
      further='对照文明册「称谓与制度读法」「世家边界读法」两栏',
      misread=bad,rank='百科／媒体',
      okEff={'lore':6,'cohesion':2},midEff={'lore':3,'cohesion':1},badEff={'lore':-2},
      okEcho='称谓与层位先分清楚，这一笔才落得稳。',
      midEcho='先按通行说法记下，异说那句留着。',
      badEcho='把常见的误读当成了结论，编年里多一笔要回头擦的账。',
      stanceOk='suspend',stanceMid='settle',
      note='只辨析读法，不判定史实，不改写任何条目；帝王只作同期锚点，世家不作血统推断，本局族人不与真实世家攀附谱牒。　本条为通识框架锚点，不作学术引用。',
      tier='dynasty')
start=len(q['items'])+1
items=[]
for i,(t,b,c,tag) in enumerate(RULER_MIS):items.append(mk(start+i,t,b,c,tag,'ruler'))
for i,(t,b,c,tag) in enumerate(HOUSE_MIS):items.append(mk(start+len(RULER_MIS)+i,t,b,c,tag,'house'))
q['items'].extend(items)
q['meta']['count']=len(q['items'])
q['meta']['dynasty']='第十轮新增 24 道帝王／世家判读：误读项取自 rulers.json 与 houses.json 明列的边界读法，不另造史实断言；只辨读法，不改条目。'
json.dump(q,open(p,'w',encoding='utf8'),ensure_ascii=False,indent=1)
print('题库',len(q['items']),'（新增',len(items),'）')

# ── 4. browser.test.js：联动数 14 → 17 ──
p=os.path.join(ROOT,'test','browser.test.js');s=open(p,encoding='utf8').read()
old="""&&s4.fam.deep2.specials===14&&s4.fam.deep2.combos===23"""
new="""&&s4.fam.deep2.specials===17&&s4.fam.deep2.combos===23"""
assert old in s;s=s.replace(old,new,1)
open(p,'w',encoding='utf8').write(s)
print('浏览器断言已同步')
