# -*- coding: utf-8 -*-
"""tools/import_interaction2.py —— 第四轮：把「只读的册」变成可玩的判读与互证（幂等）

必须在 import_interaction.py 之后运行（那个脚本会全量重写 reading_quiz.json）。

前一轮：106 道「辨其读法」把深读卡带进选项。
本轮检查发现还有三册只展开读、不能玩：
  - 地方史 174 条里的「互证与辨误」29 条
  - 姓氏／人群边界读法 26 条
  - 人群称谓里的他称／旧术语／法律身份 13 条
另外三项玩家侧的问题：考据题只有二择一、立场不留痕、组合技失手扣完数值就没了。

做五件事：
1 reading_quiz.json   106 → 174 道，分 reading / local / surname / people 四类；
                      每题补第三项「折中」与 stance 字段
2 options.json        +2 条联动（地方互证 / 得姓辨析），special 12 → 14
3 consequences.json   +2 个组合技，combos 21 → 23
4 src/*.js            三择一、立场写回并影响争议条目权重、族账与清账支线
5 UI                  分类判读进度、立场、族谱旧账、收卷报告

诚实边界：
- 题目只辨析读法，不判定史实，不改写任何文明条目／地方史／姓氏／人群／深读卡；
  误读项一律来自同批数据里明列的「易误辨析」或边界读法，不另造史实断言。
- 立场只改「哪类条目更常出现」的权重，不改条目的年代、内容、可信度与出处。
- 族账与清账全为推演，不冒充任何真实制度；清账不改变已发生的史实。
- 不写 2026 年后、不引入未证实假说、不改难度／真实性档位／玩法／时长／史料密度。
"""
import json, os

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

# 26 条边界读法各自对应的「常见误读」：只反转该条自己否定的那句话，不新增史实
SURNAME_BAD = {
 'PN01':'把人群按体质划成几个界限清晰的「人种」类型',
 'PN02':'同姓即可推定共祖，据姓氏认亲',
 'PN03':'把得姓归成一条单线起源，忽略多途并行',
 'PN04':'把族谱上溯部分当作连续实录',
 'PN05':'把文献里的「蛮夷戎狄」直接当成价值判断或族属定名',
 'PN06':'把语系分类当成人群／体质分类',
 'PN07':'把政治联盟名当成前后相续的血缘族群',
 'PN08':'把部落名当作固定不变的人群单位',
 'PN09':'用群体遗传频率反推某个人的谱系与身份',
 'PN10':'用「血统纯正」解释王朝兴衰',
 'PN11':'把不同社会排成进化等级的高低',
 'PN12':'把传说族源写成可考帝王年表',
 'PN13':'把姓氏传承当作 Y 染色体谱系的同义词',
 'PN14':'认为同姓必共祖、异姓必不同族',
 'PN15':'把郡望当作一支人自古居于某地且共出一祖的证明',
 'PN16':'把始迁祖以上的谱系当成可核世系',
 'PN17':'语言转用即等于人群被替换',
 'PN18':'把 barbarian 一类他称沿用为对该人群的定性',
 'PN19':'把传说族源放进正式史实依据池',
 'PN20':'改姓即改写其族属与出身',
 'PN21':'用现代国籍、籍贯、族属、姓氏互相倒推',
 'PN22':'把姓、氏、名、字、号混成一层来认人',
 'PN23':'把罗马字拼写差异当成不同人或不同家族',
 'PN24':'用颅骨测量一类的旧类型学给人划分等第',
 'PN25':'用 20 世纪民族识别分类倒灌历史文献称谓',
 'PN26':'把游戏里「立氏」的一支人认作真实历史家族的后裔',
}

# 人群称谓题：按 category 给出该类最典型的误读，题面仍绑定具体条目
PEOPLE_BAD = {
 '自称':'把「华夏」当成自古不变的生物／血统共同体',
 '他称':'把文献中的外部称谓当作该人群的自称与本质',
 '文献他称':'把「蛮族」一类记录者用语当成客观族属描述',
 '学术术语史':'把语言学史术语当成实体人群名单',
 '旧分类':'沿用已被否定的旧分类，并据之推断人群高低',
 '法律身份':'把公民权一类的法律身份当成语言或血缘身份',
 '政治联盟':'把联盟名当成连续不断的单一族群',
}

BOUNDARY = ('只辨析读法，不判定史实，不改写任何条目；'
            '两种选项都是游戏推演里的取舍态度，不改变数据中的可信度标注。')

def quiz_item(iid, kind, badge, dim, topic, stem, ok, mid, bad,
              why, further, misread, rank, okEff, midEff, badEff,
              okEcho, midEcho, badEcho, refId, note=BOUNDARY):
    return dict(
        id=iid, kind=kind, badge=badge, refId=refId, dim=dim, topic=topic,
        stem=stem, ok=ok, mid=mid, bad=bad,
        why=why, further=further, misread=misread, rank=rank,
        okEff=okEff, midEff=midEff, badEff=badEff,
        okEcho=okEcho, midEcho=midEcho, badEcho=badEcho,
        stanceOk='suspend', stanceMid='settle',
        note=note, tier='interaction2')

# ══════════════════════════════════════════════════════════════
# 2 新联动
# ══════════════════════════════════════════════════════════════
SPECIAL = [
 dict(id='SP_CROSSCHECK', kind='study',
      text='拿「{local}」与「{local2}」两下对读，{act}',
      act='一份记水道、一份记称谓，合不上的先两存，不硬断',
      eff={'lore': 7, 'cohesion': 3}, cost={'wealth': -3}, risk=.17,
      fail={'lore': -4, 'cohesion': -2}, req={}, unlock=False, job='校雠',
      echo='两种纸说的不是一回事时，先别急着替它们和好。',
      weight=1.06, need='local_mis',
      note='互证是读法，不作疆界、领土或主权判断；本选项为推演，不冒充真实方志。'),
 dict(id='SP_NAMECHECK', kind='inherit',
      text='核「{surname}」与「{nameNote}」之例，{act}',
      act='把得姓多源、音译异写各记一行，同姓不硬并为一族',
      eff={'cohesion': 6, 'lore': 5}, cost={'faith': -2}, risk=.13,
      fail={'cohesion': -3, 'lore': -2}, req={}, unlock=False, job='谱牒',
      echo='名册上并在一起的，未必是一家；分开记着反倒清楚。',
      weight=1.04, need='surname_note',
      note='姓氏不作血统推断，谱牒多有层累；本选项为推演，不攀附真实家族。'),
]

# ══════════════════════════════════════════════════════════════
# 3 新组合技
# ══════════════════════════════════════════════════════════════
COMBOS = [
 dict(id='two_copy_ledger', name='两存底册', need=['LH','AR','HI','BK'],
      text='地方史、档案、史学与文献流传都在册，{act}',
      act='同一件事抄两份，各注明所据，异处不抹平',
      eff={'lore': 12, 'cohesion': 4}, cost={'wealth': -5, 'food': -2},
      risk=.2, fail={'lore': -6, 'cohesion': -2}, kind='study', badge='合',
      echo='抹平一处异文容易，往后想找回它才难。',
      note='为游戏组合，不冒充任何真实目录、方志或校勘制度，不作疆界判断。'),
 dict(id='variant_register', name='异写对勘', need=['SN','PE','SW','RG'],
      text='姓氏、人群、书写与户籍都见过了，{act}',
      act='把音译、避讳、转写造成的异写并列，注明各自出处',
      eff={'lore': 10, 'cohesion': 6}, cost={'wealth': -4, 'faith': -2},
      risk=.22, fail={'lore': -5, 'cohesion': -3}, kind='inherit', badge='合',
      echo='写法不同未必是人不同，但也不能凭读音就并成一人。',
      note='为游戏组合；姓氏不作血统推断，人群不作生物种族分类，不改写真实户籍制度。'),
]

def main():
    # ── 幂等清理 ──
    Q = load('reading_quiz.json')
    Q['items'] = [x for x in Q['items'] if x.get('tier') != 'interaction2']
    assert len(Q['items']) == 106, '读法题基数异常: %d' % len(Q['items'])
    L = load('localities.json')
    P = load('peoples.json')
    O = load('options.json')
    CS = load('consequences.json')
    SIDS = [x['id'] for x in SPECIAL]
    CIDS = [x['id'] for x in COMBOS]
    O['special'] = [x for x in O['special'] if x['id'] not in SIDS]
    CS['combos'] = [x for x in CS['combos'] if x['id'] not in CIDS]

    # ── 1 给既有 106 道补 kind / 第三项 / stance ──
    for i, q in enumerate(Q['items']):
        q['kind'] = 'reading'
        q['badge'] = '辨其读法'
        q['refId'] = q['ddId']
        q['mid'] = '折中：先按通说落笔，异说另注（' + clip(q['why'], 22) + '）'
        q['midEff'] = {'lore': 3, 'cohesion': 1}
        q['midEcho'] = '这一族先把能落笔的记下，争不清楚的那几页留作旁注。'
        q['stanceOk'] = 'suspend'
        q['stanceMid'] = 'settle'

    # ── 2 地方互证 29 道：误读项取自同地「易误辨析」条目 ──
    byGeo = {}
    for x in L['items']:
        byGeo.setdefault(x['geoId'], {})[x['category']] = x
    n = 106
    for gid in sorted(byGeo):
        g = byGeo[gid]
        cross = g.get('互证与辨误')
        mis = g.get('易误辨析')
        src = g.get('人物与著述')
        if not cross or not mis:
            continue
        n += 1
        bad = '直取：把' + clip(mis['title'], 22) + '当成可考实况（' + clip(mis['boundary'], 20) + '）'
        ok = '两存互证：' + clip(cross['summary'], 46) + '；先核〈' + clip(src['title'], 14) + '〉的文本层'
        Q['items'].append(quiz_item(
            'RQ%03d' % n, 'local', '辨其互证', 'LH', cross['title'],
            '关于「' + clip(cross['title'], 20) + '」，两下对不上时哪一读法更稳妥？',
            ok, '折中：先按一路文书落笔，另一路另注，暂不合并',
            bad,
            cross['summary'], cross['boundary'], bad,
            cross.get('rank', '百科／媒体') if 'rank' in cross else '百科／媒体',
            {'lore': 6, 'cohesion': 2}, {'lore': 3, 'cohesion': 1}, {'lore': -2},
            '这一地把两份旧牍都留下了，没有替它们和好。',
            '先抄能落笔的一份，另一份压在夹页里。',
            '把后世称谓倒推成同期实况，编年里多了一笔要回头擦的账。',
            cross['id'],
            note=BOUNDARY + '　地方史不作疆界、领土或主权判断。'))

    # ── 3 姓氏边界 26 道 ──
    for x in P['notes']:
        n += 1
        bad = SURNAME_BAD.get(x['id'], '把这一条边界读法反转过来当作结论')
        Q['items'].append(quiz_item(
            'RQ%03d' % n, 'surname', '辨其称谓', 'SN', x['title'],
            '关于「' + clip(x['title'], 20) + '」，下面哪一读法更稳妥？',
            '分层存疑：' + clip(x['text'], 46),
            '折中：先按常见用法记下，边界另注一行',
            '直取常见误解：' + bad,
            x['text'], '把姓、氏、籍、译写与身份分层再读', bad,
            '百科／媒体',
            {'lore': 6, 'cohesion': 2}, {'lore': 3, 'cohesion': 1}, {'lore': -2},
            '名册上这一行，族里没敢替后人认亲。',
            '先记常用的称法，边界那句留着。',
            '把误读当成了结论，谱上多了一笔要回头擦的账。',
            x['id'],
            note=BOUNDARY + '　姓氏不作血统推断，人群不作生物种族分类。'))

    # ── 4 人群称谓 13 道 ──
    allowed = ('自称', '他称', '文献他称', '学术术语史', '旧分类', '法律身份', '政治联盟')
    # 固定 13 道：第五轮扩容人群后，这一层的题量不随数据增长而漂移
    for x in [y for y in P['peoples'] if y['category'] in allowed][:13]:
        n += 1
        bad = '直取常见误解：' + PEOPLE_BAD.get(x['category'], '把该类标签当成实体人群') \
              + '（' + clip(x['title'], 16) + '）'
        Q['items'].append(quiz_item(
            'RQ%03d' % n, 'people', '辨其称谓', 'PE', x['title'],
            '关于「' + clip(x['title'], 20) + '」，这个称谓该怎么读？',
            '按原语境分层：' + clip(x['summary'], 44),
            '折中：先按文献旧称记下，现代分类另注',
            bad,
            x['summary'], x.get('boundary', ''), bad,
            '百科／媒体',
            {'lore': 6, 'cohesion': 2}, {'lore': 3, 'cohesion': 1}, {'lore': -2},
            '这一族把记录者的立场也一并记下了。',
            '旧称照抄，读法另写一行。',
            '把外部称谓当成了本质，编年里多了一笔要回头擦的账。',
            x['id'],
            note=BOUNDARY + '　文献他称按原语境标注，不沿用为价值判断。'))

    Q['meta']['chance'] = .15   # 题库扩到 264 道后再降频，给工程／组合技留位置
    Q['meta']['count'] = len(Q['items'])
    Q['meta']['kinds'] = dict(
        reading=dict(name='辨其读法', source='deepdives.json', count=106),
        local=dict(name='辨其互证', source='localities.json／互证与辨误', count=29),
        surname=dict(name='辨其称谓', source='peoples.json／边界读法', count=26),
        people=dict(name='辨其称谓', source='peoples.json／他称与术语史', count=len(Q['items']) - 161))
    Q['meta']['interaction2'] = (
        '第四轮：题库 106→%d 道，分 reading/local/surname/people 四类；'
        '每题三择一（分层存疑／折中／常见误解），前两项写入 S.readingStance，'
        '只改后续条目出现权重，不改任何史实内容。' % len(Q['items']))
    Q['meta']['boundary'] = BOUNDARY + (
        ' 第四轮新增题目的误读项均取自同批数据里明列的「易误辨析」或边界读法，'
        '不另造史实断言；地方史不作疆界判断，姓氏不作血统推断。')
    save('reading_quiz.json', Q)

    # ── 5 联动 ──
    O['special'] += SPECIAL
    O.setdefault('meta', {})['interaction2Note'] = (
        '第四轮新增 SP_CROSSCHECK / SP_NAMECHECK：地方互证与得姓辨析；'
        '两存与异写并列均为推演读法，不作疆界判断、不作血统推断。')
    save('options.json', O)

    # ── 6 组合技 ──
    CS['combos'] += COMBOS
    CS.setdefault('meta', {})['interaction2Note'] = (
        '第四轮新增 2 个组合技（共 %d 个）：两存底册 / 异写对勘；'
        '均挂地方史与姓氏层，沿用「已见 ≥3 维 + 命中相关 ≥2 门」门槛。'
        '另：组合技失手会在族谱留下「旧账」，后续可出现清账支线，全为推演。'
        % len(CS['combos']))
    save('consequences.json', CS)

    cnt = {}
    for x in Q['items']:
        cnt[x['kind']] = cnt.get(x['kind'], 0) + 1
    print('题库 %d 道 %s' % (len(Q['items']), cnt))
    print('special %d 条 · combos %d 个' % (len(O['special']), len(CS['combos'])))

if __name__ == '__main__':
    main()
