# -*- coding: utf-8 -*-
"""tools/import_depth2.py —— 第二轮「知识深度 + 宽度」补齐（幂等）

必须在 import_depth.py 之后运行（import_depth.py 会全量重写四个数据文件）。

做四件事：
1 姓氏 40 → 121、人群 33 → 67、边界读法 12 → 26；
2 地方史 116 → 174（29 地各补「人物与著述」「互证与辨误」）；
3 深读卡 38 → 106（补齐此前 47 个未覆盖维度 + 5 个新维度 + 若干补强）；
4 civilization 85 维 / 1141 条 → 90 维 / 1306 条：
   - 45 个「每维仅 6 条」的薄维度各补 3 条，region 刻意偏向史料稀薄的文明圈；
   - 新增 5 维（交换网络 ×2、自然基底 ×2、认知方法 ×1），各 6 条；
   - options.json 的 dimKind 与 archetypes 同步登记。

诚实边界（写进各文件 meta，界面可见）：
- 本轮全部条目为「通识级框架锚点」：sources 只给域名级检索入口、quote 留空、
  rank 从实标注，不伪造引文，不用于学术引用；断代与归属存疑一律标 date_contested。
- 姓氏不作血统／遗传推断；人群是语言／文化—历史共同体，不作离散生物种族分类；
- 地方史不作疆界、领土、主权判断；传说族源不进史实依据池。
- 「难度 / 真实性档位 / 玩法 / 时长 / 史料密度」一律不受本轮数据扩充影响。
"""
import json, os, sys, collections

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
from import_depth2_data import SURNAMES
from import_depth2_data2 import PEOPLES, NOTES, LOCAL_EXTRA
from import_depth2_data3 import THIN, DEEP, NEWDIMS

def load(name):
    with open(os.path.join(ROOT, 'data', name), encoding='utf8') as f:
        return json.load(f)

def save(name, obj):
    with open(os.path.join(ROOT, 'data', name), 'w', encoding='utf8') as f:
        json.dump(obj, f, ensure_ascii=False, indent=1)

def src():
    return [
      dict(url='https://www.britannica.com/', quote='', rank='百科／媒体',
           note='域名级检索入口，非具体引文页；本轮未逐条附引文'),
      dict(url='https://www.cssn.cn/', quote='', rank='机构／学术',
           note='域名级检索入口，非具体引文页；本轮未逐条附引文'),
    ]

def precision(raw, summary=''):
    if '约' in raw or '—' in raw or '起' in raw:
        return 'range'
    return 'exact'

def consensus(raw, summary):
    soft = ('争议', '假说', '未定', '存疑', '仍有', '多途', '不等', '不宜', '不能', '不等于', '层累', '追述')
    if '约' in raw or any(k in summary for k in soft):
        return 'date_contested'
    return 'settled'

def mk(iid, title, raw, y0, y1, summary, category, region='*', boundary='', extra=None):
    assert -10000 <= y0 <= y1 <= 2026, (iid, y0, y1)
    c = consensus(raw, summary)
    o = dict(id=iid, title=title, rawYear=raw, y0=y0, y1=y1,
             category=category, summary=summary, boundary=boundary,
             region=region, precision=precision(raw, summary),
             consensus=c,
             status='断代有争议' if c == 'date_contested' else '学界通说',
             sources=src(), layer='fact', tier='depth2')
    if extra:
        o.update(extra)
    return o

def main():
    # ── 幂等清理：只删本脚本自己加过的东西 ──
    civ = load('civilization.json')
    civ['items'] = [x for x in civ['items'] if x.get('tier') != 'depth2']
    civ['dimensions'] = [d for d in civ['dimensions'] if d.get('tier') != 'depth2']
    opt = load('options.json')
    NEWKEYS = [d[0] for d in NEWDIMS]
    for a in opt['archetypes']:
        a['dims'] = [k for k in a['dims'] if k not in NEWKEYS]
    opt['dimKind'] = {k: v for k, v in opt['dimKind'].items() if k not in NEWKEYS}

    peo = load('peoples.json')
    peo['surnames'] = [x for x in peo['surnames'] if x.get('tier') != 'depth2']
    peo['peoples'] = [x for x in peo['peoples'] if x.get('tier') != 'depth2']
    peo['notes'] = [x for x in peo['notes'] if x.get('tier') != 'depth2']
    loc = load('localities.json')
    loc['items'] = [x for x in loc['items'] if x.get('tier') != 'depth2']
    dd = load('deepdives.json')
    dd['items'] = [x for x in dd['items'] if x.get('tier') != 'depth2']

    # ── 1 姓氏 / 人群 / 边界读法 ──
    n = len(peo['surnames'])
    assert n == 40, '姓氏基数异常: %d' % n
    for cat, rows in SURNAMES.items():
        for t, raw, y0, y1, summary, c, *rest in rows:
            region = rest[0] if len(rest) > 0 else 'huaxia'
            contested = rest[1] if len(rest) > 1 else False
            boundary = rest[2] if len(rest) > 2 else ''
            n += 1
            x = mk('SU%03d' % n, t, raw, y0, y1, summary, c, region, boundary)
            x['group'] = cat
            if contested:
                x['consensus'] = 'date_contested'
                x['status'] = '断代有争议'
            peo['surnames'].append(x)
    n = len(peo['peoples'])
    assert n == 33, '人群基数异常: %d' % n
    for t, raw, y0, y1, summary, cat, region, contested, *bnd in PEOPLES:
        n += 1
        fallback = '人群为语言／文化—历史共同体，不作离散生物种族分类，不推断血统。'
        x = mk('PE%03d' % n, t, raw, y0, y1, summary, cat, region,
               (bnd[0] if bnd else fallback) + ' ' + fallback)
        if contested:
            x['consensus'] = 'date_contested'
            x['status'] = '断代有争议'
        peo['peoples'].append(x)
    n = len(peo['notes'])
    assert n == 12, '边界读法基数异常: %d' % n
    for title, text in NOTES:
        n += 1
        peo['notes'].append(dict(id='PN%02d' % n, title=title, text=text, tier='depth2'))
    peo['meta']['depth2'] = (
        '第二轮深度补齐：姓氏 40→%d（按得姓方式／姓与氏制度／姓源流／复姓／改姓赐姓／'
        '非汉姓体系／谱牒与攀附七组），人群 33→%d，边界读法 12→%d。'
        % (len(peo['surnames']), len(peo['peoples']), len(peo['notes'])))
    peo['meta']['density2'] = (
        '本轮刻意补了非汉姓体系与语言群体，但各文明圈的存世文献密度本就不均；'
        '条数差异是来源限制，不作跨文明知识量比较。')
    save('peoples.json', peo)

    # ── 2 地方史：每地补 2 类 ──
    assert len(loc['items']) == 116, '地方史基数异常'
    for gid, t1, raw1, y0a, y1a, s1, t2, raw2, y0b, y1b, s2 in LOCAL_EXTRA:
        loc['items'].append(mk('%s_L05' % gid, t1, raw1, y0a, y1a, s1,
                              '人物与著述', '*',
                              '文本成书与传抄层须分读，不把后起叙述倒灌进所叙年代。',
                              {'geoId': gid}))
        loc['items'].append(mk('%s_L06' % gid, t2, raw2, y0b, y1b, s2,
                              '互证与辨误', '*',
                              '只列读法与互证方法，不作疆界、领土或主权判断。',
                              {'geoId': gid}))
    loc['meta']['depth2'] = ('第二轮：29 地各补「人物与著述」「互证与辨误」两条，'
                             '116→%d 条，每地 6 条。' % len(loc['items']))
    loc['meta']['count'] = len(loc['items'])
    save('localities.json', loc)

    # ── 3 深读卡 ──
    assert len(dd['items']) == 38, '深读卡基数异常'
    n = len(dd['items'])
    for dim, topic, misread, dispute, further in DEEP:
        n += 1
        dd['items'].append(dict(
            id='DD%03d' % n, dim=dim, topic=topic, misread=misread,
            dispute=dispute, further=further, rank='百科／媒体',
            note='深读卡为通识级辨析框架，不是具体条目的专门考据结论；'
                 '「分歧」栏只列争论类型，不替学界下判定，不判定史实。',
            tier='depth2'))
    dd['meta']['depth2'] = ('第二轮：补齐此前 47 个未覆盖维度并加 5 个新维度，'
                            '38→%d 则，90 个维度均有至少一则深读卡。' % len(dd['items']))
    dd['meta']['count'] = len(dd['items'])
    save('deepdives.json', dd)

    # ── 4 civilization：薄维度补强 + 5 个新维度 ──
    # 第五轮扩容的 SC 条目与第八轮的 KP 人物条目都由各自的脚本管理，
    # 本轮脚本临时移出再放回，从任意已扩容状态重跑全链都不会误判基数。
    EXTERNAL = ('SC', 'KP')
    scaled = [x for x in civ['items'] if x['id'].startswith(EXTERNAL)]
    civ['items'] = [x for x in civ['items'] if not x['id'].startswith(EXTERNAL)]
    base_items = len(civ['items'])
    assert base_items == 1141, '文明条目基数异常: %d' % base_items
    dim_names = {d['key']: d['name'] for d in civ['dimensions']}
    existing = collections.Counter(x['dim'] for x in civ['items'])
    assert all(existing[k] == 6 for k in THIN), '薄维度清单与实际不符'

    added = 0
    for dim, rows in THIN.items():
        for i, (t, raw, y0, y1, summary, region) in enumerate(rows, 1):
            seq = existing[dim] + i
            civ['items'].append(dict(
                mk('%s%03d' % (dim, seq), t, raw, y0, y1, summary,
                   dim_names[dim], region,
                   '通识级框架锚点；出处为域名级检索入口，不用于学术引用。'),
                dim=dim, dimName=dim_names[dim], refs=['1', '2'],
                category=dim_names[dim]))
            added += 1

    for key, name, stat, family, desc, rows in NEWDIMS:
        civ['dimensions'].append(dict(key=key, name=name, badge=name, stat=stat,
                                      desc=desc, family=family, tier='depth2'))
        for i, (t, raw, y0, y1, summary, region) in enumerate(rows, 1):
            civ['items'].append(dict(
                mk('%s%03d' % (key, i), t, raw, y0, y1, summary, name, region,
                   '通识级框架锚点；出处为域名级检索入口，不用于学术引用。'),
                dim=key, dimName=name, refs=['1', '2'], category=name))
            added += 1

    civ['meta']['depth2'] = dict(
        added='2026-11-06', dimensions=5, items=added,
        note='第二轮深度与宽度检查：45 个「每维仅 6 条」的薄维度各补 3 条（共 135 条），'
             'region 刻意偏向 indus / maya / nile / meso / steppe / aegean 以改善覆盖不均；'
             '另新增 5 维 30 条，补「交换网络」「自然基底」「认知方法」三个偏薄大类。',
        boundary='本轮全部为通识级框架锚点：sources 只给域名级检索入口、quote 留空、'
                 '不伪造引文、不用于学术引用；存疑一律标 date_contested。'
                 '不改写原有 1141 条中的任何一条。',
        width='宽度检查结论见 docs/知识深度与宽度检查（第二轮）.md；'
              '仍刻意不补：2026 年后、不可考假说当史实、虚构人物混写、无玩法接口的名录。')
    civ['items'].extend(scaled)
    save('civilization.json', civ)

    # ── 5 options.json：登记新维度 ──
    DIM_KIND = {'PY': 'trade', 'RS': 'trade', 'GM': 'craft', 'WO': 'study', 'BC': 'study'}
    opt['dimKind'].update(DIM_KIND)
    for key, kind in DIM_KIND.items():
        cands = [a for a in opt['archetypes'] if a['kind'] == kind]
        for a in cands[:2]:
            if key not in a['dims']:
                a['dims'].append(key)
    opt.setdefault('meta', {})['depth2Note'] = (
        'PY/RS/GM/WO/BC 五维已登记 dimKind 并挂入对应原型；'
        '本轮只加知识条目，不改任何选项数值、难度或史实。')
    save('options.json', opt)

    # ── 汇总 ──
    dims = collections.Counter(d['family'] for d in civ['dimensions'])
    reg = collections.Counter(x['region'] for x in civ['items'])
    thin_after = [k for k, v in collections.Counter(x['dim'] for x in civ['items']).items() if v < 8]
    print('姓氏 %d · 人群 %d · 边界读法 %d · 地方史 %d · 深读卡 %d'
          % (len(peo['surnames']), len(peo['peoples']), len(peo['notes']),
             len(loc['items']), len(dd['items'])))
    print('文明条目 %d → %d（+%d），维度 %d，大类 %s'
          % (base_items, len(civ['items']), len(civ['items']) - base_items,
             len(civ['dimensions']), dict(dims)))
    print('文明圈:', dict(reg))
    print('补强后仍 <8 条的维度:', thin_after)
    dd_cover = set(x['dim'] for x in dd['items'])
    print('深读卡未覆盖维度:', [d['key'] for d in civ['dimensions'] if d['key'] not in dd_cover])

if __name__ == '__main__':
    main()
