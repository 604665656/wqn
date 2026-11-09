# -*- coding: utf-8 -*-
"""生成 data/kinship.json：继嗣制 + 亲属称谓穷举。幂等（整份覆写，不追加）。

诚实边界：各文明圈的「继嗣制权重」是玩法近似，不是该文明全域断言。
印度河文字未破译、直接材料不足，明确写不可考；草原与中美洲城邦差异大，
只列史料可见的多种做法，不排他。入赘、收继、王室兄妹婚等按制度性称谓记录，
不作价值判断，也不倒灌进现代伦理。
"""
import json, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'data', 'kinship.json')

SYSTEMS = [
    dict(key='patrilineal', name='父系继嗣', short='父系',
         desc='按父方计世系、承祧与家产；本局族谱以父方为主线。',
         weight=dict(huaxia=.62, meso=.68, nile=.48, aegean=.72,
                     indus=.18, maya=.30, steppe=.34)),
    dict(key='matrilineal', name='母系继嗣', short='母系',
         desc='按母方计世系与承继；舅父常居监护之位，生父未必为族长。',
         weight=dict(huaxia=.08, meso=.06, nile=.22, aegean=.05,
                     indus=.12, maya=.18, steppe=.14)),
    dict(key='bilateral', name='双系并计', short='双系',
         desc='父方母方两系都记，承继与称法不偏一支；本局两条线同时入册。',
         weight=dict(huaxia=.20, meso=.20, nile=.20, aegean=.18,
                     indus=.60, maya=.38, steppe=.34)),
    dict(key='uxorilocal', name='从妻居 / 入赘', short='入赘',
         desc='夫就妻家居住，子女归妻方族册；本局标「赘婿」，不改写其本姓。',
         weight=dict(huaxia=.10, meso=.06, nile=.10, aegean=.05,
                     indus=.10, maya=.14, steppe=.18)),
]

# 关系称谓穷举：kind = blood 血亲 / affine 姻亲 / descent 继嗣制度 / household 同居
# path 描述从「本人」出发的推导链，供 kinship.js 计算，不写死到某个人。
TERMS = [
    # 己身与配偶
    dict(key='self',      term='本人',     kind='self',      path='self'),
    dict(key='husband',   term='夫',       kind='affine',    path='spouse:male'),
    dict(key='wife',      term='妻',       kind='affine',    path='spouse:female'),
    dict(key='spouse',    term='配偶',     kind='affine',    path='spouse'),
    dict(key='concubine', term='妾',       kind='affine',    path='spouse:secondary',
         note='历史制度性称谓，只作记载，不作价值判断'),
    dict(key='second_wife', term='继室 / 填房', kind='affine', path='spouse:later'),
    dict(key='uxorilocal_husband', term='赘婿', kind='affine', path='spouse:uxorilocal',
         note='从妻居的夫；本局只改居住与族册归属，不改其本姓'),
    # 上下两代
    dict(key='father',    term='父',       kind='blood',     path='parent:male'),
    dict(key='mother',    term='母',       kind='blood',     path='parent:female'),
    dict(key='stepfather',term='继父',     kind='affine',    path='parent:spouse:later:male'),
    dict(key='stepmother',term='继母',     kind='affine',    path='parent:spouse:later:female'),
    dict(key='adoptive_father', term='养父', kind='descent', path='parent:adoptive:male'),
    dict(key='adoptive_mother', term='养母', kind='descent', path='parent:adoptive:female'),
    dict(key='son',       term='子',       kind='blood',     path='child:male'),
    dict(key='daughter',  term='女',       kind='blood',     path='child:female'),
    dict(key='stepson',   term='继子',     kind='affine',    path='spouse:child:male'),
    dict(key='stepdaughter', term='继女',  kind='affine',    path='spouse:child:female'),
    dict(key='adopted_son', term='养子 / 嗣子', kind='descent', path='child:adoptive'),
    dict(key='heir',      term='嫡长 / 承祧子', kind='descent', path='child:heir'),
    # 同辈
    dict(key='elder_brother', term='兄',   kind='blood',     path='sibling:male:older'),
    dict(key='younger_brother', term='弟', kind='blood',     path='sibling:male:younger'),
    dict(key='elder_sister',  term='姊',   kind='blood',     path='sibling:female:older'),
    dict(key='younger_sister',term='妹',   kind='blood',     path='sibling:female:younger'),
    dict(key='half_sib',  term='同父异母 / 同母异父', kind='blood', path='sibling:half'),
    # 祖辈 / 孙辈
    dict(key='paternal_grandfather', term='祖父', kind='blood', path='parent:male:parent:male'),
    dict(key='paternal_grandmother', term='祖母', kind='blood', path='parent:male:parent:female'),
    dict(key='maternal_grandfather', term='外祖父', kind='blood', path='parent:female:parent:male'),
    dict(key='maternal_grandmother', term='外祖母', kind='blood', path='parent:female:parent:female'),
    dict(key='great_grandfather', term='曾祖父', kind='blood', path='grand:parent:male'),
    dict(key='great_grandmother', term='曾祖母', term_alt='曾祖母', kind='blood', path='grand:parent:female'),
    dict(key='grandson',  term='孙',       kind='blood',     path='child:child:male'),
    dict(key='granddaughter', term='孙女', kind='blood',     path='child:child:female'),
    dict(key='daughter_son', term='外孙', kind='blood',     path='child:female:child:male'),
    dict(key='daughter_daughter', term='外孙女', kind='blood', path='child:female:child:female'),
    # 父之兄弟姊妹 + 配偶（姑父就是这一类）
    dict(key='paternal_uncle_elder', term='伯父', kind='blood', path='parent:male:sibling:male:older'),
    dict(key='paternal_uncle_younger', term='叔父', kind='blood', path='parent:male:sibling:male:younger'),
    dict(key='paternal_aunt', term='姑母', kind='blood', path='parent:male:sibling:female'),
    dict(key='paternal_uncle_wife', term='伯母 / 叔母（婶）', kind='affine', path='paternal_uncle:spouse:female'),
    dict(key='paternal_aunt_husband', term='姑父', kind='affine', path='paternal_aunt:spouse:male',
         note='父之姊妹之夫；本局按实配关系推导，不假定存在'),
    # 母之兄弟姊妹 + 配偶
    dict(key='maternal_uncle', term='舅父', kind='blood', path='parent:female:sibling:male'),
    dict(key='maternal_aunt',  term='姨母', kind='blood', path='parent:female:sibling:female'),
    dict(key='maternal_uncle_wife', term='舅母（舅妈）', kind='affine', path='maternal_uncle:spouse:female'),
    dict(key='maternal_aunt_husband', term='姨父', kind='affine', path='maternal_aunt:spouse:male'),
    # 堂表 / 侄甥
    dict(key='paternal_cousin', term='堂兄弟姊妹', kind='blood', path='paternal_uncle:child'),
    dict(key='maternal_cousin_fu', term='姑表兄弟姊妹', kind='blood', path='paternal_aunt:child'),
    dict(key='maternal_cousin_jiu', term='舅表兄弟姊妹', kind='blood', path='maternal_uncle:child'),
    dict(key='maternal_cousin_yi', term='姨表兄弟姊妹', kind='blood', path='maternal_aunt:child'),
    dict(key='nephew',    term='侄',       kind='blood',     path='sibling:male:child:male'),
    dict(key='niece',     term='侄女',     kind='blood',     path='sibling:male:child:female'),
    dict(key='sister_son', term='甥',      kind='blood',     path='sibling:female:child:male'),
    dict(key='sister_daughter', term='甥女', kind='blood',   path='sibling:female:child:female'),
    # 配偶之血亲
    dict(key='father_in_law',  term='岳父', kind='affine', path='spouse:parent:male'),
    dict(key='mother_in_law',  term='岳母', kind='affine', path='spouse:parent:female'),
    dict(key='husband_father', term='翁（公公）', kind='affine', path='spouse:male:parent:male'),
    dict(key='husband_mother', term='姑（婆婆）', kind='affine', path='spouse:male:parent:female'),
    dict(key='wife_brother_elder', term='内兄 / 大舅子', kind='affine', path='spouse:female:sibling:male:older'),
    dict(key='wife_brother_younger', term='内弟 / 小舅子', kind='affine', path='spouse:female:sibling:male:younger'),
    dict(key='wife_sister', term='大姨子 / 小姨子', kind='affine', path='spouse:female:sibling:female'),
    dict(key='husband_brother', term='大伯子 / 小叔子', kind='affine', path='spouse:male:sibling:male'),
    dict(key='husband_sister', term='大姑子 / 小姑子', kind='affine', path='spouse:male:sibling:female'),
    # 同辈姻亲互称
    dict(key='brother_wife_elder', term='嫂', kind='affine', path='sibling:male:older:spouse:female'),
    dict(key='brother_wife_younger', term='弟媳（弟妇）', kind='affine', path='sibling:male:younger:spouse:female'),
    dict(key='sister_husband', term='姊夫 / 妹夫', kind='affine', path='sibling:female:spouse:male'),
    dict(key='co_sisters', term='妯娌', kind='affine', path='sibling:male:spouse:mutual',
         note='兄弟之妻互称'),
    dict(key='co_brothers_in_law', term='连襟', kind='affine', path='sibling:female:spouse:mutual',
         note='姊妹之夫互称'),
    dict(key='in_laws', term='亲家 / 亲家公 / 亲家母', kind='affine', path='child:spouse:parent'),
    # 继嗣制度用语
    dict(key='lineage_heir', term='宗子 / 嫡长', kind='descent', path='descent:primary'),
    dict(key='cadet',     term='庶支 / 旁支', kind='descent', path='descent:cadet'),
    dict(key='adoption',  term='过继 / 立嗣', kind='descent', path='descent:adoption'),
    dict(key='extinct',   term='绝嗣',       kind='descent', path='descent:extinct'),
    dict(key='virilocal', term='从夫居',     kind='household', path='residence:virilocal'),
    dict(key='uxorilocal',term='从妻居',     kind='household', path='residence:uxorilocal'),
    dict(key='neolocal',  term='另立新居',   kind='household', path='residence:neolocal'),
    dict(key='bilocal',   term='两可居',     kind='household', path='residence:bilocal'),
    dict(key='levirate',  term='收继婚（兄终弟及之婚俗）', kind='household',
         path='residence:levirate',
         note='部分游牧与古代社会可见的制度性记载；只作称谓，不推广到所有文明'),
]

CAVEAT = (
    '本局开局抽一种继嗣制，属推演设定，不是对该文明圈的全域断言。'
    '同一文明在不同时期、地域、阶层做法差别很大，父系、母系、双系、从妻居往往并存。'
    '印度河文字未破译，继嗣无直接材料，此处只作玩法近似并明确标注；'
    '草原与中美洲各城邦差异大，亦不排他。入赘、收继、妾、王室近亲婚等按历史制度性称谓记录，'
    '不作现代价值判断，也不倒灌进当代伦理。'
)

data = dict(
    meta=dict(
        title='亲属关系与继嗣制',
        version='1.0',
        note='关系称谓穷举表 + 按文明圈抽签的继嗣制；称谓由 kinship.js 从实际关系链推导，'
             '不写死到某个族人。',
        caveat=CAVEAT,
        limits='称谓以汉语亲属系统为主，用于本局读法；其他文明的本土称法不逐一对译，'
               '避免把汉语称谓当作当地制度的事实。',
        academic='通识级框架，域名级检索入口，不作学术引用；不指认任何真实家族世系。'
    ),
    systems=SYSTEMS,
    terms=TERMS,
    residences=[
        dict(key='virilocal', name='从夫居', note='妻就夫家；华夏、两河、地中海常见做法之一'),
        dict(key='uxorilocal', name='从妻居 / 入赘', note='夫就妻家；子女归妻方族册'),
        dict(key='neolocal', name='另立新居', note='夫妇另立门户，不并入任何一方族册'),
        dict(key='bilocal', name='两可居', note='依家计在两方之间流动'),
    ],
    note_by_region={
        'indus': '印度河文字未破译，继嗣与婚姻无直接文献；本局按双系近似，不可视为史实。',
        'maya': '玛雅各城邦差异大，王室与平民做法不同；本局只取可见的多种做法之一。',
        'steppe': '游牧社会有收继婚与服役婚记载，亦有父系谱系；两者并存，不排他。',
        'nile': '古埃及王室有近亲婚记载，平民未必同俗；本局不与任何具体王室攀附。',
        'aegean': '希腊罗马父家长制之外，斯巴达等地女性承产另有记载；不全域化。',
        'meso': '两河契约与嫁妆材料丰富，父系为主，但女性财产权另有条文；不简化。',
        'huaxia': '宗法以父系为主，但入赘、母系遗风、舅权在不同时期与地域都可见；不排他。',
    }
)

with open(OUT, 'w', encoding='utf8') as f:
    json.dump(data, f, ensure_ascii=False, indent=1)

print('kinship.json 写出', OUT)
print('  继嗣制', len(SYSTEMS), '· 称谓', len(TERMS), '类 · 居制', len(data['residences']))
