# -*- coding: utf-8 -*-
"""tools/import_interaction.py —— 第三轮：让「新增的知识」真正参与玩法（幂等）

前两轮把知识堆到 90 维 / 1306 条、姓氏 121、地方史 174、深读 106，
但检查发现：深读卡只读不能玩、5 个新维度（PY/RS/GM/WO/BC）只是收集册条目、
姓氏／人群／地方史也只有三条泛用联动。这一轮补三件事：

1 data/reading_quiz.json  106 道「辨其读法」考据题（由深读卡三段式确定性生成）
2 options.json             +5 条 special 联动（价格／风险／矿物／气象／标本）
3 consequences.json        +7 个组合技（14 → 21），全部挂新维度或地方／姓氏层

边界纪律：
- 读法题只辨析「怎么读」，不判定史实、不改写任何文明条目或深读卡；
  错误项就是数据里明列的「常见误解」，选错只扣文脉并留一句提示。
- 联动与组合技文本一律标推演，不宣称技术／制度之间存在史实因果链。
- 不写 2026 年后、不引入未证实假说、不改难度／真实性档位／玩法／时长／史料密度。
- 全部走确定性种子，同 seed + 同选择序列仍得同一局。
"""
import json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)

def load(name):
    with open(os.path.join(ROOT, 'data', name), encoding='utf8') as f:
        return json.load(f)

def save(name, obj):
    with open(os.path.join(ROOT, 'data', name), 'w', encoding='utf8') as f:
        json.dump(obj, f, ensure_ascii=False, indent=1)

def clip(s, n):
    s = str(s)
    return s if len(s) <= n else s[:n - 1] + '…'

# ══════════════════════════════════════════════════════════════
# 1 读法判读题库：106 道，与 deepdives.json 一一对应
# ══════════════════════════════════════════════════════════════
QUIZ_META = dict(
    title='辨其读法 · 深读卡考据题',
    added='2026-11-06', chance=0.26,
    note='题目由 deepdives.json 的「常见误解／分歧所在／延伸方向」三段确定性生成，'
         '与 106 则深读卡一一对应。选「分层存疑」记判读正确，选「直取误解」记误读。',
    boundary='只辨析读法，不判定史实，不改写任何文明条目、地方史或深读卡；'
             '两种选项都是游戏推演里的取舍态度，不改变数据中的可信度标注。'
             '深读卡本身是通识级辨析框架，不作学术引用。',
    scoring='并入既有 S.quiz（考据判读 对／误），另记 S.readingSeen；'
            '考据玩法与真实性档位的计分加成照旧生效。',
)

def build_quiz(dd):
    out = []
    for x in dd['items']:
        ok = '分层存疑：' + clip(x['dispute'], 44) + '；再往「' + clip(x['further'], 20) + '」追一步'
        bad = '直取常见误解：' + clip(x['misread'], 40)
        out.append(dict(
            id='RQ' + x['id'][2:],          # DD001 → RQ001
            ddId=x['id'], dim=x['dim'], topic=x['topic'],
            stem='关于「' + clip(x['topic'], 22) + '」，下面哪一读法更稳妥？',
            ok=ok, bad=bad,
            why=x['dispute'], further=x['further'], misread=x['misread'],
            rank=x.get('rank', '百科／媒体'),
            okEff={'lore': 6, 'cohesion': 2},
            badEff={'lore': -2},
            okEcho='争不清楚的那几页，这一族先把层分清楚，没有替后人下断语。',
            badEcho='把常见的误读当成了结论，编年里多了一笔要回头擦的账。',
            note=QUIZ_META['boundary'],
        ))
    return dict(meta=QUIZ_META, items=out)

# ══════════════════════════════════════════════════════════════
# 2 五条新联动：把 PY / RS / GM / WO / BC 从收集册带进选项
# ══════════════════════════════════════════════════════════════
SPECIAL = [
 dict(id='SP_PRICE', kind='trade',
      text='核「{price}」所见之价，{act}',
      act='把这一季的折色、工价与粮价并写一册，先问用的是哪种钱',
      eff={'wealth': 6, 'lore': 3}, cost={'food': -2}, risk=.16,
      fail={'wealth': -4, 'lore': -2}, req={}, unlock=False, job='估值',
      echo='同是一石粮，用银、用钱、用券记下来，账就不是一本账。',
      weight=1.05, need='price',
      note='名义价格与实际购买力不同层；本选项为推演，不改写真实价格史。'),
 dict(id='SP_RISK', kind='trade',
      text='依「{risk}」之例，{act}',
      act='与同路人先立一份分摊之约，写明谁担哪一段、失了怎么补',
      eff={'wealth': 5, 'cohesion': 4}, cost={'wealth': -3}, risk=.18,
      fail={'cohesion': -3, 'wealth': -2}, req={}, unlock=False, job='承保',
      echo='先把最坏那一笔写清楚，余下的路反倒好走。',
      weight=1.05, need='risk',
      note='互助习惯与精算保单是不同层；本选项为推演，不宣称现代保险已出现。'),
 dict(id='SP_MINERAL', kind='craft',
      text='按「{mineral}」所记辨一处矿脉，{act}',
      act='只记层位、颜色与可采之状，不把名物当矿藏图',
      eff={'craft': 6, 'wealth': 3}, cost={'food': -3, 'might': -2}, risk=.2,
      fail={'craft': -3, 'food': -2}, req={}, unlock=False, job='辨矿',
      echo='石头不会自己说话，先把看见的和听来的分两行写。',
      weight=1.02, need='mineral',
      note='古典矿物名物不等于近代地质学；本选项为推演，不作矿藏判断。'),
 dict(id='SP_WEATHER', kind='study',
      text='参「{weather}」定这一季农时，{act}',
      act='物候、仪器读数与旧谚各记一行，不把一次观测当年景定论',
      eff={'food': 6, 'lore': 3}, cost={'wealth': -2}, risk=.17,
      fail={'food': -4, 'lore': -2}, req={}, unlock=False, job='候气',
      echo='天时只给个大概，账要留着来年再对。',
      weight=1.08, need='weather',
      note='观测、记录与预报是三种实践；本选项为推演，不作气候因果断言。'),
 dict(id='SP_SPECIMEN', kind='study',
      text='依「{specimen}」给新见之物立一名，{act}',
      act='先描其形、记其地与采集之人，名号暂附注不改旧目',
      eff={'lore': 6, 'craft': 2}, cost={'wealth': -2}, risk=.14,
      fail={'lore': -3}, req={}, unlock=False, job='掌目',
      echo='名是拿来找得到的，不是拿来把万物排成一条队。',
      weight=1.04, need='specimen',
      note='采集、命名与分类阶元不同层；本选项为推演，不改写真实分类史。'),
]

# ══════════════════════════════════════════════════════════════
# 3 六个新组合技：把新维度、地方史、姓氏层接进后果网
# ══════════════════════════════════════════════════════════════
COMBOS = [
 dict(id='price_granary', name='平准与常平', need=['PY','FI','EL'],
      text='价格、财政与赈济三事都在册，{act}',
      act='丰年籴、歉年粜，先把斗斛与折色定死再开仓',
      eff={'food': 11, 'wealth': 5, 'cohesion': 4},
      cost={'wealth': -6, 'food': -3}, risk=.22,
      fail={'food': -6, 'cohesion': -2}, kind='govern', badge='合',
      echo='仓里的账和市上的价，得用同一把斗才对得上。',
      note='为游戏组合，不宣称三者之间存在史实因果链，也不冒充任何真实常平制度。'),
 dict(id='general_average', name='共损立约', need=['RS','H','B'],
      text='分摊、航海与商货都已见过，{act}',
      act='立一纸共损之约：为救船弃的货，由同航各家按值分摊',
      eff={'wealth': 10, 'cohesion': 5}, cost={'wealth': -4, 'faith': -2},
      risk=.24, fail={'wealth': -5, 'cohesion': -3}, kind='trade', badge='合',
      echo='风浪不认谁的货，约却得先写在前头。',
      note='共同海损是海商习惯，与现代保险不同层；本组合为推演，不作法制史断言。'),
 dict(id='assay_furnace', name='辨矿设冶', need=['GM','MM','CE'],
      text='矿物认知、矿冶与陶瓷冶金凑齐了，{act}',
      act='先辨层位与胎釉，再定炉温与配料，各记一册不相混',
      eff={'craft': 12, 'wealth': 4}, cost={'food': -5, 'might': -3},
      risk=.2, fail={'craft': -6, 'wealth': -2}, kind='craft', badge='合',
      echo='认得石头，还得认得火候，两本账缺一本都成不了器。',
      note='为游戏组合，不宣称名物、冶炼与烧造之间存在单线传承。'),
 dict(id='observatory_almanac', name='候气授时', need=['WO','Q','Y'],
      text='气象、星象与历法都在册，{act}',
      act='把物候、夜观与历谱并作一表，注明哪些是测的、哪些是推的',
      eff={'lore': 12, 'food': 5}, cost={'wealth': -5, 'faith': -2},
      risk=.19, fail={'lore': -6, 'food': -3}, kind='study', badge='合',
      echo='天上那本历和地里那本候，对不上时先别急着改历。',
      note='观测、占候与历算属不同实践层；本组合为推演，不作天文学史定论。'),
 dict(id='catalogue_cabinet', name='立目编藏', need=['BC','BK','MU'],
      text='博物、书籍与收藏修复都见过了，{act}',
      act='给新收之物立目：出处、形制、修补处各占一行，异名并存',
      eff={'lore': 11, 'craft': 4, 'cohesion': 3},
      cost={'wealth': -5, 'food': -2}, risk=.16,
      fail={'lore': -5, 'craft': -2}, kind='study', badge='合',
      echo='修过的地方要写明，不然后人会把补配当成原样。',
      note='为游戏组合，不冒充任何真实目录或馆藏制度。'),
 dict(id='gazetteer_check', name='方志互勘', need=['LH','HI','AR','MP'],
      text='地方史、史学、档案与测绘四路都在册，{act}',
      act='拿本地旧牍、官文书与旧图互勘，合不上的先两存不硬断',
      eff={'lore': 13, 'cohesion': 4}, cost={'wealth': -6, 'food': -3},
      risk=.21, fail={'lore': -7, 'cohesion': -2}, kind='study', badge='合',
      echo='一地的旧账，得让几种纸自己互相吵完才算数。',
      note='只列互证读法，不作疆界、领土或主权判断，也不冒充真实方志。'),
 dict(id='interpreter_register', name='通译立籍', need=['SN','PE','AD','RG'],
      text='姓氏、人群、接触与户籍都见过了，{act}',
      act='并居诸称各依旧俗入册，音译异写另注，不按字面归并',
      eff={'cohesion': 9, 'lore': 6, 'wealth': 3},
      cost={'faith': -3, 'might': -2}, risk=.23,
      fail={'cohesion': -5, 'lore': -3}, kind='diplomacy', badge='合',
      echo='名写错了不要紧，硬把两家人并成一家才要紧。',
      note='为游戏组合；姓氏不作血统推断，人群不作生物种族分类，不改写真实户籍制度。'),
]

def main():
    # ── 幂等：先删本脚本加过的东西 ──
    dd = load('deepdives.json')
    opt = load('options.json')
    cs = load('consequences.json')
    SIDS = [x['id'] for x in SPECIAL]
    CIDS = [x['id'] for x in COMBOS]
    opt['special'] = [x for x in opt['special'] if x['id'] not in SIDS]
    cs['combos'] = [x for x in cs['combos'] if x['id'] not in CIDS]

    # ── 1 读法题库 ──
    quiz = build_quiz(dd)
    assert len(quiz['items']) == len(dd['items']) == 106, '读法题与深读卡数量不齐'
    save('reading_quiz.json', quiz)

    # ── 2 联动 ──
    opt['special'] += SPECIAL
    opt.setdefault('meta', {})['interactionNote'] = (
        '第三轮：新增 price / risk / mineral / weather / specimen 五条联动，'
        '把 PY/RS/GM/WO/BC 五个新维度从收集册带进选项；'
        '所有联动文本为推演，不改写真实技术史或制度史。')
    save('options.json', opt)

    # ── 3 组合技 ──
    cs['combos'] += COMBOS
    meta = cs.setdefault('meta', {})
    meta['interactionNote'] = (
        '第三轮新增 7 个组合技（共 %d 个）：平准与常平 / 共损立约 / 辨矿设冶 / '
        '候气授时 / 立目编藏 / 方志互勘 / 通译立籍。'
        '全部挂新维度或地方史、姓氏层，沿用「已见 ≥3 维 + 命中相关 ≥2 门」门槛，'
        '不宣称任何技术或制度之间的史实因果链。' % len(cs['combos']))
    save('consequences.json', cs)

    print('读法判读题 %d 道（覆盖 %d 维）' %
          (len(quiz['items']), len({x['dim'] for x in quiz['items']})))
    print('special %d 条 · combos %d 个' % (len(opt['special']), len(cs['combos'])))

if __name__ == '__main__':
    main()
