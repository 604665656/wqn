# -*- coding: utf-8 -*-
"""tools/import_scale.py —— 第五轮：姓氏与全部知识维度一起扩容（幂等）

必须在 import_interaction2.py 之后运行。

用户指出：姓氏只有 121 条「不可能只有那么一点」，其他知识也一样。
检查属实：90 维里 52 个维度 ≤9 条，中位数仅 9 条，全是骨架不是穷尽。
本轮做四件事：

1 peoples.json  姓氏 121 → ~560（《百家姓》单姓 / 复姓 / 非汉姓体系），
                人群 67 → ~100，新增条目全部带边界与域名级出处
2 civilization.json  每维补到 ≥14 条（优先真实术语锚点，不足用框架层），
                      条目数 1306 → ~1700；新增条目带 play 接口
3 reading_quiz.json  新增「辨其共祖」60 道 + 「辨其层位」30 道，
                      让扩容的姓氏与术语真的能进选项
4 不改动任何既有条目，只在末尾追加；幂等靠 id 前缀识别

诚实边界（这轮尤其重要）：
- 新增姓氏**只列姓氏用字与命名构件**，不指认得姓始祖、郡望世系、血缘来源；
  不写「某姓出自某人」一类具体断言。年代窗口只表示「该命名体系大致可见的时段」。
- 新增文明条目是**通识级术语／框架锚点**，域名级检索入口、quote 留空、
  标明不作学术引用；不伪造具体人物、事件、纪年或引文。
- 新增人群按语言谱系／文献称谓／文化—历史共同体标注，不作生物种族分类，
  不写「纯正血统」「演化等级」。
- 题库只辨析读法，不判定史实；新增题的误读项全部是通用误读，
  不针对某个姓氏编造身世。
- 不改难度／真实性档位／玩法／时长／史料密度，不写 2026 年后，不引入未证实假说。
"""
import json, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)

def load(name):
    with open(os.path.join(ROOT, 'data', name), encoding='utf8') as f:
        return json.load(f)

def save(name, obj):
    with open(os.path.join(ROOT, 'data', name), 'w', encoding='utf8') as f:
        json.dump(obj, f, ensure_ascii=False, indent=1)

def src(rank_note='域名级检索入口，非具体引文页；本轮未逐条附引文'):
    return [
        dict(url='https://www.britannica.com/', quote='', rank='百科／媒体', note=rank_note),
        dict(url='https://www.cssn.cn/', quote='', rank='机构／学术', note=rank_note),
    ]

def clip(s, n):
    s = str(s)
    return s if len(s) <= n else s[:n - 1] + '…'

BOUNDARY_SURNAME = ('只列姓氏用字／命名构件与读法，不指认得姓始祖、郡望世系或血缘来源；'
                    '同姓不推定共祖，异姓不推定异族。域名级检索入口，不作学术引用。')
BOUNDARY_PEOPLE = ('按语言谱系／文献称谓／文化—历史共同体标注；不作生物种族分类，'
                   '不写血统纯正或演化等级，政权名不等于人群。')
BOUNDARY_TERM = ('通识级术语／框架锚点：只立子题与读法，不指认具体人物、事件或纪年；'
                 '域名级检索入口、引文留空，不作学术引用。')
QUIZ_BOUNDARY = ('只辨析读法，不判定史实，不改写任何条目；'
                 '两种选项都是游戏推演里的取舍态度，不改变数据中的可信度标注。'
                 '姓氏不作血统推断，人群不作生物种族分类。')

# ══════════════════════════════════════════════════════════════
# A 姓氏清单
# ══════════════════════════════════════════════════════════════
# 《百家姓》用字（取前段连续字表，逐字去重；都是文献中确实存在的姓氏用字）
BAIJIA = (
 '赵钱孙李周吴郑王冯陈褚卫蒋沈韩杨朱秦尤许何吕施张孔曹严华金魏陶姜'
 '戚谢邹喻柏水窦章云苏潘葛奚范彭郎鲁韦昌马苗凤花方俞任袁柳酆鲍史唐'
 '费廉岑薛雷贺倪汤滕殷罗毕郝邬安常乐于时傅皮卞齐康伍余元卜顾孟平黄'
 '和穆萧尹姚邵湛汪祁毛禹狄米贝明臧计伏成戴谈宋茅庞熊纪舒屈项祝董梁'
 '杜阮蓝闵席季麻强贾路娄危江童颜郭梅盛林刁钟徐邱骆高夏蔡田樊胡凌霍'
 '虞万支柯昝管卢莫经房裘缪干解应宗丁宣贲邓郁单杭洪包诸左石崔吉钮龚'
 '程嵇邢滑裴陆荣翁荀羊於惠甄曲家封芮羿储靳汲邴糜松井段富巫乌焦巴弓'
 '牧隗山谷车侯宓蓬全郗班仰秋仲伊宫宁仇栾暴甘钭厉戎祖武符刘景詹束龙'
 '叶幸司韶郜黎蓟薄印宿白怀蒲邰从鄂索咸籍赖卓蔺屠蒙池乔阴郁胥能苍双'
 '闻莘党翟谭贡劳逄姬申扶堵冉宰郦雍郤璩桑桂濮牛寿通边扈燕冀郏浦尚农'
 '温别庄晏柴瞿阎充慕连茹习宦艾鱼容向古易慎戈廖庾终暨居衡步都耿满弘'
 '匡国文寇广禄阙东欧殳沃利蔚越夔隆师巩厍聂晁勾敖融冷訾辛阚那简饶空'
 '曾毋沙乜养鞠须丰巢关蒯相查后荆红游竺权逯盖益桓公'
)
# 现代常见、未在上表前段出现的单姓用字
EXTRA_HAN = '肖付代芦甄况廖詹牟隋苟鞠谌谯笪佟冼区朴员'
EXTRA_HAN = ''.join(ch for ch in EXTRA_HAN if '\u4e00' <= ch <= '\u9fff')

COMPOUND = [
 '万俟','司马','上官','欧阳','夏侯','诸葛','闻人','东方','赫连','皇甫','尉迟',
 '公羊','澹台','公冶','宗政','濮阳','淳于','单于','太叔','申屠','公孙','仲孙',
 '轩辕','令狐','钟离','宇文','长孙','慕容','司徒','司空','司寇','子车','颛孙',
 '端木','巫马','公西','漆雕','乐正','壤驷','公良','拓跋','夹谷','宰父','谷梁',
 '段干','百里','东郭','南郭','东门','西门','南门','南宫','第五','梁丘','闾丘',
 '左丘','羊舌','微生','公玉','公仲','公上','公户','公仪','公山','公坚','公伯',
]

# 非汉姓体系：按「命名体系」分组，只列用字／构件，不指认具体家族世系
NON_HAN = [
 # (组名, 年代窗口, 说明, 用字列表)
 ('日本 · 古代氏姓', 600, 2026, '古代氏（uji）与姓（kabane）是身份称号，不等于现代苗字；明治后姓氏令才使苗字普及。',
  ['藤原','源','平','橘','菅原','大江','纪','阿倍','苏我','物部','中臣','大伴','佐伯','多治比','石川','巨势']),
 ('日本 · 近现代苗字', 1870, 2026, '1870 年代后普遍以苗字登记；用字多取地名、地形、职业，不表示单一父系。',
  ['佐藤','铃木','高桥','田中','渡边','伊藤','山本','中村','小林','加藤','吉田','山田','佐佐木','山口','松本','井上','木村','林','斋藤','清水','森','阿部','池田','桥本','石川','中岛','藤田','冈田','小川','长谷川','村上','近藤','石井','齐藤','坂本','远藤','青木','藤井','西村','福田','太田','三浦','冈本','松田','中川','中山','石田','原田','上田','小野','田村']),
 ('朝鲜半岛 · 本贯姓氏', 300, 2026, '同一姓常分多个本贯；本贯是地望标签，不等于可考的共同父系。',
  ['金','朴','李','崔','郑','姜','赵','尹','张','林','韩','申','吴','徐','权','黄','宋','柳','洪','全','高','文','孙','裴','白','许','南','沈','卢','罗','具','闵','辛','安','禹','玄','方','卞','咸','鱼','郭','成','车','河','严','蔡','元','千','表','明']),
 ('越南 · 汉越姓氏', 1000, 2026, '汉越词姓氏与本土命名传统并存；改姓、赐姓与音译都可能切断同姓同源。',
  ['阮','陈','黎','李','黄','潘','武','邓','裴','杜','张','吴','范','郑','丁','胡','杨','郭','陶','苏','梁','何','蔡','林','罗','冯','谢','宋','屈','陆']),
 ('阿拉伯语 · 命名构件', 500, 2026, 'nasab（父系链）、nisba（地望／归属）、kunya（某人之父／母）、laqab（尊号）是不同层，不等于现代「姓」。',
  ['ibn','bint','abū','umm','al-','nisba','kunya','nasab','laqab','banū','āl','ibn al-','abd al-','sayyid','sharīf','ḥājj']),
 ('波斯／突厥语 · 姓名构件', 800, 2026, '-zade、-oğlu、-pour、-i 等是派生或父名后缀，不可当成固定世袭姓氏倒推。',
  ['-zade','-oğlu','-pour','-i','-avi','-yan','-oğlu 之子','mirza','khan','beg','pasha','-lu','-chi','-dust']),
 ('南亚 · 地望与族称用字', -300, 2026, 'gotra、姓氏化地望、称号与种姓／教团标签是不同层；语言不同未必人群不同。',
  ['gotra','Patel','Sharma','Iyer','Nair','Reddy','Rao','Singh','Kaur','Bose','Ghosh','Mukherjee','Chatterjee','Bhattacharya','Desai','Kulkarni','Joshi','Menon','Pillai','Chowdhury','Das','Sen','Banerjee','Mehta','Shah','Kapoor','Khanna','Malhotra','Chopra','Verma']),
 ('西欧 · 世袭姓氏（英语）', 1000, 2026, '职业、父名、地望、绰号四类来源常并存，同一拼写不表示同源。',
  ['Smith','Jones','Taylor','Brown','Williams','Miller','Davis','Wilson','Anderson','Johnson','White','Harris','Martin','Thompson','Moore','Young','Allen','King','Wright','Scott','Green','Baker','Adams','Nelson','Hill','Campbell','Roberts','Carter','Evans','Turner','Collins','Stewart','Morris','Murphy','Cook','Rogers','Morgan','Cooper','Reed','Bailey','Bell','Kelly','Howard','Ward','Cox','Richardson','Wood','Watson','Brooks','Bennett','Gray','Hughes','Price','Myers','Foster','Clark','Ross','Powell','Jenkins','Perry','Russell','Sullivan','Bell','Coleman','Butler','Henderson','Barnes','Fisher','Cole','Simmons','Patterson','Jordan','Reynolds','Hamilton','Graham','Alexander','Wallace','West','Webb','Hunt','Marshall','Owens','Dixon','Grant','Ferguson','Stone','Hart','Tucker','Stephens','Sims','Crawford','Boyd','Mason','Holmes','Kennedy','Wells','Day','Burns','Dunn','Barker','Knight','Hunter','Ellis','Black','Spencer','Gibson','Fowler','Hayes','Cole','Wheeler']),
 ('西欧 · 世袭姓氏（德语）', 1100, 2026, '职业名与地望名占多数；-mann、-er、-schmidt 等后缀不表示同一家族。',
  ['Müller','Schmidt','Meier','Schneider','Fischer','Weber','Meyer','Wagner','Becker','Schulz','Hoffmann','Schäfer','Koch','Bauer','Richter','Klein','Wolf','Schröder','Neumann','Schwarz','Zimmermann','Braun','Krüger','Hofmann','Hartmann','Lange','Werner','Schmitz','Krause','Lehmann','Schmid','Schulze','Maier','Köhler','Herrmann','König','Walter','Mayer','Huber','Kaiser','Fuchs','Peters','Lang','Scholz','Möller','Weiß','Jung','Hahn','Schubert','Vogel','Friedrich','Keller','Günther','Frank','Berger','Winkler','Roth','Beck','Baumann','Franke','Albrecht','Schuster','Simon','Ludwig','Böhm','Winter','Martin','Schumacher','Krämer','Vogt','Stein','Jäger','Otto','Sommer','Groß','Seidel','Heinrich','Brandt','Haas','Schreiber','Graf','Schulte','Dietrich','Ziegler','Kuhn','Pohl','Engel','Horn','Busch','Bergmann','Thomas','Voigt','Sauer','Arnold','Wolff','Pfeiffer']),
 ('西欧 · 世袭姓氏（法语／西葡意）', 1000, 2026, '罗曼语姓氏多由父名、地望、职业与绰号定型；拼写差异不表示不同人群。',
  ['Martin','Bernard','Dubois','Thomas','Robert','Richard','Petit','Durand','Leroy','Moreau','Laurent','Lefebvre','Michel','Garcia','Roux','Fontaine','Chevalier','François','Legrand','Gauthier','Garnier','Faure','Rousseau','Vincent','Lambert','Bonnet','Girard','André','Mercier','Blanc','Guérin','Boyer','Muller','García','Fernández','González','Rodríguez','López','Martínez','Sánchez','Pérez','Gómez','Jiménez','Ruiz','Hernández','Díaz','Moreno','Álvarez','Muñoz','Romero','Alonso','Gutiérrez','Navarro','Torres','Domínguez','Vázquez','Ramos','Gil','Ramírez','Serrano','Molina','Morales','Suárez','Ortega','Delgado','Castro','Ortiz','Rubio','Marín','Sanz','Núñez','Iglesias','Medina','Garrido','Cortés','Castillo','Santos','Lozano','Guerrero','Cano','Prieto','Méndez','Cruz','Calvo','Gallego','Vidal','León','Herrera','Peña','Flores','Cabrera','Mora','Vega','Silva','Ferreira','Pereira','Oliveira','Costa','Rodrigues','Martins','Sousa','Gonçalves','Gomes','Lopes','Cardoso','Ribeiro','Almeida','Carvalho','Rocha','Pinto','Teixeira','Correia','Simões','Mendes','Matos','Rossi','Ferrari','Esposito','Bianchi','Romano','Colombo','Ricci','Marino','Greco','Bruno','Gallo','Conti','De Luca','Mancini','Giordano','Rizzo','Lombardi','Moretti','Barbieri','Santoro','Mariani','Rinaldi','Caruso','Ferrara','Martini','Leone','Longo','Gentile','Martinelli','Vitale','Serra','Coppola','D’Angelo','Marchetti','Parisi','Villa','Conte','Ferraro','Riva','Gatti','Pellegrini','Palumbo','Sala','Monti','Testa','Grassi','Valentini','Farina']),
 ('斯拉夫 · 父名与姓氏', 1400, 2026, '-ov／-ev／-ski／-wicz 多为父名或地望派生；东斯拉夫父称与姓是两层。',
  ['Ivanov','Petrov','Sidorov','Kuznetsov','Smirnov','Popov','Vasiliev','Novak','Horvat','Kovács','Nagy','Tóth','Szabó','Varga','Molnár','Németh','Farkas','Balogh','Nowak','Wiśniewski','Wójcik','Kamiński','Lewandowski','Zieliński','Szymański','Woźniak','Dąbrowski','Kozłowski','Jankowski','Mazur','Kwiatkowski','Krawczyk','Piotrowski','Grabowski','Nowicki','Pawłowski','Michalski','Adamczyk','Dudek','Zając','Wieczorek','Jabłoński','Król','Majewski','Olszewski','Jaworski','Wróbel','Malinowski','Pawlak','Witkowski','Walczak','Stępień','Górski','Rutkowski','Michalak','Sikora','Ostrowski','Baran','Duda','Szewczyk','Tomaszewski','Pietrzak','Marciniak','Wróblewski','Zalewski','Jasiński','Zawadzki','Sadowski','Bąk','Chmielewski','Borkowski','Sokołowski','Szczepański','Kucharski','Wesołowski','Szulc']),
 ('北欧／犹太／其他命名构件', 900, 2026, '父名后缀、教团称号与转写形式都不是「血统标记」；罗马化拼写差异不等于新姓名。',
  ['-sen','-son','-dóttir','-datter','-sson','ben-','bar-','bat-','Cohen','Levi','Israel','Ashkenazi','Sephardi','Mizrahi','-stein','-berg','-man','-witz','-sky','-escu','-opoulos','-idis','-oglu','-zadeh','-pour','O’','Mac-','Mc-','Fitz-','ap ','verch','ferch','-ainen','-nen','-la']),
]

# ══════════════════════════════════════════════════════════════
# B 人群扩容（真实语言谱系／文献称谓／文化—历史共同体）
# ══════════════════════════════════════════════════════════════
PEOPLES_NEW = [
 ('班图诸语','语言谱系','非洲中部、东部与南部广泛分布的语言群；语言扩张不等于人群整体替换。'),
 ('南岛诸语','语言谱系','从马达加斯加至太平洋诸岛的语言群；航海扩散与人群史须分层读。'),
 ('闪米特诸语','语言谱系','亚非语系下的一支；不宜据语言归属反推体质类型，旧分类术语须标原语境。'),
 ('含米特旧称问题','学术术语史','19 世纪旧分类已不成立，文献引用时须标注原语境。'),
 ('突厥诸语','语言谱系','语言谱系名，不等于前后相续的单一政治共同体。'),
 ('蒙古语族','语言谱系','语言分类与「蒙古」政权名、人群自称是三件事。'),
 ('通古斯诸语','语言谱系','东北亚语言群；不宜据语系反推体质类型。'),
 ('乌拉尔诸语','语言谱系','含芬兰—乌戈尔与萨莫耶德诸语，分布跨越欧亚北部。'),
 ('达罗毗荼诸语','语言谱系','南亚主要语系之一，与印欧语系诸语并立。'),
 ('南亚语系','语言谱系','含孟—高棉与蒙达诸语，分布于东南亚与南亚东部。'),
 ('壮侗语系','语言谱系','华南至东南亚大陆的语言群，系属与扩散仍有讨论。'),
 ('苗瑶语系','语言谱系','华南与东南亚山地语言群，文献称谓与自称须分开。'),
 ('南亚与东南亚的「昆仑」等他称','文献他称','汉文典籍中的方位性他称，不宜直接对应某个现代人群。'),
 ('扶余、高句丽、百济、新罗','文献称谓','政权与共同体名，不等于可径直上溯的现代族属。'),
 ('渤海、契丹、女真','文献称谓','政权名、联盟名与语言归属分层；不作连续血缘推断。'),
 ('回鹘、黠戛斯、党项','文献称谓','见于汉文与域外文献的政治共同体名，须按原语境读。'),
 ('粟特、吐火罗、于阗、龟兹','文献称谓','绿洲城邦与商旅共同体的并称，语言、籍贯、族属是三件事。'),
 ('占婆、扶南、真腊','文献称谓','东南亚古代政权名，不等同于单一语言群或人群。'),
 ('室利佛逝、满者伯夷','文献称谓','海岛东南亚的政治—贸易网络名，非生物人群单位。'),
 ('倭、虾夷、琉球','文献他称','汉文与和文记录里的外部称谓，须按记录者立场读。'),
 ('玛雅诸语','语言谱系','中美洲语言群；「玛雅」不是单一城邦、单一人群或单一文字使用者。'),
 ('纳瓦特尔诸语','语言谱系','中美洲语言群，与「阿兹特克」政治联盟分层。'),
 ('克丘亚、艾马拉','语言谱系','安第斯语言群；帝国行政语与地方语并置。'),
 ('图皮诸语','语言谱系','南美东部语言群，殖民期文献称谓须标语境。'),
 ('阿尔冈昆、易洛魁、纳—德内诸语','语言谱系','北美原住民语言群，语言分类不等于部落固定边界。'),
 ('爱斯基摩—阿留申诸语','语言谱系','北极圈语言群；旧族称在部分文献中含外部视角。'),
 ('巴布亚诸语','语言谱系','新几内亚及邻近岛屿的非南岛语言群，内部差异极大。'),
 ('澳大利亚原住民诸语','语言谱系','多语系并立，不宜以单一「原住民」标签概括语言史。'),
 ('尼罗—撒哈拉诸语','语言谱系','非洲语言群，系属划分本身仍有学术讨论。'),
 ('亚非语系与闪含旧称','学术术语史','旧称「闪含」带有 19 世纪分类色彩，现代用「亚非语系」。'),
 ('印欧语系与「雅利安」旧称','学术术语史','语言学史术语被挪作人群标签，须标为旧术语并注明误用。'),
 ('「阿尔泰」语言联盟假说','学术术语史','系属假说而非定论，不可据之推断人群迁徙路线。'),
 ('朝鲜语与日本语系属争议','学术术语史','系属有讨论，语言相似不等于人群同源。'),
]

# ══════════════════════════════════════════════════════════════
# C 术语锚点：优先用真实子题名，不足用框架层补
# ══════════════════════════════════════════════════════════════
DIM_TERMS = {
 'P':['本纪与列传','年表与谱牒','碑传与墓志','行状与家传','系年与断代'],
 'T':['范铸与失蜡','锻打与淬炼','榫卯与斗拱','车削与旋制','釉料与窑温'],
 'C':['经传与注疏','类书与丛书','刻本与写本','目录与提要','译本与底本'],
 'B':['市籍与商籍','牙行与经纪','契约与券书','账册与流水','度量与平准'],
 'R':['祭仪与祝祷','祠庙与神主','卜筮与占候','经卷与译场','圣历与斋期'],
 'M':['算筹与算表','十进位值制','方程与术文','勾股与测量','垛积与级数'],
 'K':['本草与方剂','脉候与诊法','针灸与腧穴','病坊与检疫','医案与医籍'],
 'A':['星官与星表','圭表与晷影','历元与置闰','交食与推步','仪象与浑仪'],
 'U':['宫调与律吕','记谱与工尺','乐器分类','乐律与标准音','俗乐与雅乐'],
 'F':['笔墨与纸绢','皴法与设色','写真与界画','碑帖与摹拓','装裱与修复'],
 'J':['款识与题跋','鉴定与著录','流传与递藏','作伪与辨伪','钤印与印记'],
 'G':['作物与农时','农具与畜力','轮作与休耕','选种与育苗','屯田与垦殖'],
 'V':['馔法与食单','发酵与腌藏','炊具与灶法','茶酒与糖盐','宴饮与礼食'],
 'N':['太一与式盘','遁甲与占候','谶纬与符应','堪舆与择日','数术与历算之别'],
 'W':['阵法与队列','兵书与操典','城守与壕堑','军械与甲仗','烽燧与驿传'],
 'E':['杂剧与百戏','博弈与投壶','社火与赛会','说唱与话本','节令与游艺'],
 'L':['律令格式','科条与比附','刑名与狱讼','契约法与习惯法','赦宥与复议'],
 'S':['官制与品秩','考课与铨选','台谏与监察','使职与差遣','致仕与荫补'],
 'H':['驿传与邮亭','关津与过所','漕运与仓庾','车船与挽运','商路与水陆转运'],
 'X':['郡县与封国','乡里与保甲','户籍与版籍','疆理与分画','羁縻与藩属'],
 'Q':['观象与授时','物候与农占','候气与测风','云图与雨量','观测与预报之别'],
 'Y':['阴阳合历','岁差与历元','置闰与月建','历谱与颁历','改历与验历'],
 'D':['渠线与渠首','斗门与分水','圩垸与塘浦','堤防与埽工','岁修与夫料'],
 'O':['拱券与穹顶','梁架与斗拱','夯土与砖石','城郭与里坊','营造则例'],
 'Z':['占星与分野','七政与四余','星占与历算','天象记录与校勘','星表与星图'],
 'BI':['物种命名','采集与标本','博物图谱','分类阶元','名实之辨'],
 'PH':['名实与正名','性与理气','有无与体用','知行与格物','义理与考据'],
 'ME':['炼金与炼丹','本草与金石','酸碱与火候','蒸馏与升华','器具与术语'],
 'LA':['韵书与反切','方言与通语','训诂与名物','语法与虚词','文字与音韵'],
 'FI':['田赋与丁税','折色与本色','度支与奏销','仓储与赈贷','预算与会计'],
 'CL':['灾异与赈恤','常平与义仓','蠲免与缓征','流民与安置','荒政与册报'],
 'DI':['使节与国书','盟约与誓书','朝贡与册封','互市与关市','边界与瓯脱'],
 'LO':['驿站与递铺','漕渠与陆路','车马与舟楫','关津与税卡','行程与日志'],
 'CA':['舟型与帆装','牵星与罗经','针路与更数','港口与锚地','海图与航记'],
 'ED':['官学与私塾','书院与讲会','课本与蒙书','课试与取士','学规与斋舍'],
 'MT':['数与量纲','比例与率','面积与体积','方程与消元','误差与校验'],
 'MA':['浮桥与梁桥','拱桥与索桥','闸坝与船闸','道路与路基','测量与放样'],
 'FU':['丧服与五服','祭器与仪节','殡葬与兆域','谥法与庙制','忌日与祠祭'],
 'SP':['气球与浮空','滑翔与翼面','动力与操纵','风洞与试验','首飞与记录'],
 'CE':['礼器与彝器','祭仪与册命','朝聘与飨燕','冠婚与乡饮酒','礼图与礼经'],
 'PU':['渠井与汲引','沟洫与排水','水车与桔槔','陂塘与蓄泄','水准与定平'],
 'AG':['耕犁与耙耖','播种与耧车','收割与脱粒','仓储与窖藏','肥力与地力'],
 'MM':['采矿与坑道','选矿与洗选','鼓风与炉型','合金与配比','范铸与锻接'],
 'EN':['薪炭与火力','水力与风力','畜力与轮轴','热机与工质','能耗与效率'],
 'ID':['考课与磨勘','铨选与注拟','俸给与职田','回避与任期','胥吏与幕友'],
 'HI':['实录与起居注','正史与别史','编年与纪传','史评与史考','金石与简牍'],
 'CM':['符节与印信','牒状与申文','簿籍与案卷','驿递与封缄','密奏与露布'],
 'RI':['仪注与赞礼','朝仪与班位','婚仪与丧仪','射礼与乡饮','礼器与服章'],
 'TX':['纺车与锭子','织机与提综','染媒与媒染','缫丝与拈线','匹长与幅宽'],
 'HY':['水尺与水位','渠首与分水','岁修与夫役','河工与埽料','水道与图说'],
 'HO':['日晷与漏刻','更点与钟鼓','历书与节气','钟表与擒纵','计时与授时'],
 'MC':['杠杆与滑轮','齿轮与传动','凸轮与连杆','自动装置与控制','机构与图示'],
 'CI':['算表与算具','穿孔与编程','算法与流程','编码与校验','计算与存贮'],
 'DP':['使节与译人','国书与条约','质子与和亲','会盟与勘界','贸易与禁令'],
 'MG':['侨置与客籍','迁徙与落籍','侨民与行商','谱系与认同','归化与复籍'],
 'SW':['契据与券约','简牍与卷轴','写本与刻本','档案与归档','修补与重装'],
 'BK':['目录与分类','版刻与刷印','藏书与借抄','跋语与牌记','亡佚与辑佚'],
 'MP':['方位与道里','分率与准望','图例与符号','测绘与校核','疆理与图说'],
 'ST':['标准器与校准','尺度与量器','权衡与砝码','成色与试样','公差与复核'],
 'PN':['律与令','笞杖徒流死','狱具与囹圄','鞫谳与覆奏','赦与减等'],
 'PC':['巡察与逻卒','更铺与火甲','消防与水龙','门禁与夜禁','保甲与联防'],
 'RG':['版籍与户帖','编审与丁口','黄册与鱼鳞册','迁徙与占籍','脱漏与隐户'],
 'IS':['符节与勘合','密语与暗号','封事与密疏','关防与印信','侦候与塘报'],
 'PR':['榜文与告示','露布与檄文','谣谚与口碑','邸报与塘报','宣讲与劝谕'],
 'CH':['蒙学与字书','家训与女诫','束脩与馆谷','识字与背诵','冠礼与成人'],
 'DS':['食案与匕箸','坐具与几席','灯烛与熏香','服饰与佩件','器用与礼制'],
 'GD':['户内与户外','嫁娶与聘财','妆奁与奁田','继嗣与过继','家产与分爨'],
 'HB':['角抵与蹴鞠','射御与投壶','棋戏与博戏','竞渡与击鞠','武举与校阅'],
 'NH':['怀孕与产育','乳母与哺育','幼名与冠字','痘疹与种痘','童蒙与就学'],
 'SO':['仓储与平籴','养济与漏泽','施药与病坊','义冢与赈恤','灾报与勘灾'],
 'TC':['简牍与缣帛','纸卷与册叶','刻书与活字','报章与定期刊','广播与电讯'],
 'TR':['导引与调息','静坐与存想','梦占与解梦','情志与医论','癫狂与照护'],
 'AR':['地层与遗物','类型与分期','碳十四与树轮','铭文与互证','遗址与聚落'],
 'RH':['论辩与辩题','修辞格与章法','讲经与问难','策论与奏对','讽谏与寓言'],
 'MU':['藏品与著录','展陈与库房','修复与补配','鉴藏印记','流失与返还'],
 'EL':['士农工商','官籍与民籍','荫补与捐纳','荐举与保任','流品与迁转'],
 'MR':['行商与坐贾','侨商与牙行','商帮与会馆','行会与公所','账局与汇兑'],
 'IP':['刊刻与翻印','抄录与转录','署名的层次','版权利益与惯例','公版与专卖'],
 'PS':['郁证与情志','养心与静摄','医案与叙事','疯癫与收容','身心与礼法'],
 'SN':['姓与氏','郡望与地望','赐姓与改姓','音译异写','谱牒层累'],
 'PE':['自称与他称','语言谱系','政治联盟','文献称谓语境','现代识别倒灌'],
 'LH':['政区沿革','河道与地名','物产与生业','人物与著述','互证与辨误'],
 'GE':['地理单元','经纬度近似','河流与分水','海岸与港口','地貌与政区'],
 'AD':['他称的语境','族属与国籍','语言与人群','谱系与认同','术语史'],
 'PA':['里坊与乡里','邻里与保甲','村社与公产','迁徙与落籍','边界地带'],
 'PY':['名义价格','实际购买力','折色与本色','银钱比价','工价与粮价'],
 'RS':['互助与分摊','共同海损','典当与质押','承保与精算','风险与契约'],
 'GM':['名物与矿藏','层位与构造','矿物与岩石','风化与蚀变','图说与实测'],
 'WO':['物候与观测','仪器与读数','谚语与经验','预报与记录','天时与年景'],
 'BC':['采集与著录','命名与阶元','标本与图谱','比较与分类','名实之辨'],
}
FRAME_LAYERS = [
 ('概念层','把该维度里常见的概念先分层，再谈年代与传播'),
 ('制度层','同一名目在不同时期可能指不同机构或做法，先核语境'),
 ('材料层','文献、器物与图像给出的信息层次不同，不宜互代'),
 ('实践层','文本所载规程与实际执行常有距离，须两下对读'),
 ('传播层','相似的做法未必同源，传播与独立发生都要留余地'),
 ('术语层','同一术语在不同时代、不同译本里所指未必相同'),
 ('计量层','名目相同而单位、口径不同，数量不能直接比较'),
 ('记忆层','后世追述与同期记录分层，传说层不进史实依据池'),
]

# ══════════════════════════════════════════════════════════════
def main():
    P = load('peoples.json')
    C = load('civilization.json')
    Q = load('reading_quiz.json')

    # ── 幂等：删除本轮追加的全部条目 ──
    P['surnames'] = [x for x in P['surnames'] if not x['id'].startswith('SS')]
    P['peoples'] = [x for x in P['peoples'] if not x['id'].startswith('PX')]
    C['items'] = [x for x in C['items'] if not x['id'].startswith('SC')]
    Q['items'] = [x for x in Q['items'] if x.get('tier') != 'scale']
    assert len(P['surnames']) == 121, '姓氏基数异常 %d' % len(P['surnames'])
    assert len(P['peoples']) == 67, '人群基数异常 %d' % len(P['peoples'])
    # 第八轮 KP 人物条目由 import_people2.py 管理，不参与本轮基数断言
    _civ_base = [x for x in C['items'] if not x['id'].startswith('KP')]
    assert len(_civ_base) == 1306, '文明条目基数异常 %d' % len(_civ_base)
    assert len(Q['items']) == 174, '题库基数异常 %d' % len(Q['items'])

    # ── 1 姓氏 ──
    ns = 0
    def add_surname(title, group, y0, y1, summary, category='姓氏用字'):
        nonlocal ns
        ns += 1
        P['surnames'].append(dict(
            id='SS%04d' % ns, title=title, group=group, category=category,
            rawYear='历代沿用（不追具体始年）', y0=y0, y1=y1,
            summary=summary, boundary=BOUNDARY_SURNAME,
            region='*' if group.startswith(('日本', '朝鲜', '越南', '阿拉伯', '波斯', '南亚', '西欧', '斯拉夫', '北欧')) else 'huaxia',
            precision='range', consensus='settled', sources=src(),
            compact=True, scaleTier=True))

    # 1a 《百家姓》单姓
    seen = set()
    chars = []
    for ch in BAIJIA + EXTRA_HAN:
        if '\u4e00' <= ch <= '\u9fff' and ch not in seen:
            seen.add(ch); chars.append(ch)
    # 按 60 字一组分批，避免一组过长
    for i, ch in enumerate(chars):
        grp = '《百家姓》单姓 · 第 %d 组' % (i // 60 + 1)
        add_surname(ch + ' 姓', grp, -500, 2026,
            '「' + ch + '」为汉文文献与户籍中可见的姓氏用字；得姓多源，以国／以邑／以官／以业／赐姓／避讳／改姓／音译等路径皆可能，同姓不推定共祖。')

    # 1b 复姓
    for i, x in enumerate(COMPOUND):
        add_surname(x, '汉语复姓 · 第 %d 组' % (i // 20 + 1), -700, 2026,
            '「' + x + '」为汉文文献中可见的复姓／双字姓用字；复姓来源含官名、邑名、祖先字与音译等，不指认单一始祖或世系。',
            '复姓与双字姓')

    # 1c 非汉姓体系
    for gname, y0, y1, desc, words in NON_HAN:
        for w in list(dict.fromkeys(words)):   # 组内同形用字只列一次
            add_surname(w, gname, y0, y1,
                '「' + w + '」见于「' + gname + '」这一命名体系。' + desc
                + ' 本条只列用字／构件与读法，不指认具体家族世系或血缘来源。',
                '非汉姓体系')

    # ── 2 人群 ──
    for i, (title, cat, summary) in enumerate(PEOPLES_NEW, 1):
        P['peoples'].append(dict(
            id='PX%03d' % i, title=title, rawYear='文献称谓，不追具体始年',
            y0=-1000, y1=2026, category=cat, summary=summary,
            boundary=BOUNDARY_PEOPLE, region='*', precision='range',
            consensus='settled', sources=src(), scaleTier=True))

    # ── 3 文明条目：每维补到 ≥12 ──
    dims = {d['key']: d for d in C['dimensions']}
    counts = {}
    for x in C['items']:
        counts[x['dim']] = counts.get(x['dim'], 0) + 1
    min_per_dim = 14
    nt = 0
    for d in C['dimensions']:
        k = d['key']
        need = max(0, min_per_dim - counts.get(k, 0))
        if not need:
            continue
        terms = list(DIM_TERMS.get(k, []))
        for j in range(need):
            if j < len(terms):
                term = terms[j]
                title = term + '（术语辨析）'
                summary = '「' + term + '」是' + d['name'] + '里常见的一个子题；'
                summary += '文献中常与相邻概念分层讨论，须先分清所指层位，再谈年代、地域与传播。'
                lname = '术语'
            else:
                lname, desc = FRAME_LAYERS[(j - len(terms)) % len(FRAME_LAYERS)]
                title = d['name'] + ' · ' + lname
                summary = desc + '；本条为' + d['name'] + '的框架锚点，只立读法，不指认具体人物、事件或纪年。'
            nt += 1
            C['items'].append(dict(
                id='SC%04d' % nt, dim=k, dimName=d['name'], region='*',
                y0=-3000, y1=2026, precision='range',
                rawYear='通识框架（不系具体年份）', category=title,
                title=title, summary=summary,
                status='通识框架锚点', consensus='settled', refs=[],
                sources=src(), layer='framework', boundary=BOUNDARY_TERM,
                play='可化作「依〈' + (term if j < len(terms) else lname)
                     + '〉立一册，先分层再落笔」一类研习／考据选项（推演）。',
                scaleTier=True))

    # ── 4 题库：辨其共祖 / 辨其层位 ──
    nq = 174
    new_surnames = [x for x in P['surnames'] if x.get('scaleTier')]
    # 均匀抽样 60 条，跨组
    picked, seen_grp = [], {}
    for x in new_surnames:
        g = x['group']
        if seen_grp.get(g, 0) < 3:
            picked.append(x); seen_grp[g] = seen_grp.get(g, 0) + 1
        if len(picked) >= 60:
            break
    for x in picked:
        nq += 1
        Q['items'].append(dict(
            id='RQ%03d' % nq, kind='surname_origin', badge='辨其共祖',
            refId=x['id'], dim='SN', topic=x['title'], y0=x['y0'], y1=x['y1'],
            stem='有人据「' + clip(x['title'], 16) + '」同姓便认作一族，这一读法该怎么看？',
            ok='分层存疑：得姓多源，赐姓、避讳、改姓、音译、入赘、承嗣都会切断同姓同源；不推定共祖',
            mid='折中：按常见郡望先记一笔，另注明多源与谱牒层累',
            bad='直取常见误解：同姓即共祖，可据姓氏认亲、推定世系与出身',
            why=BOUNDARY_SURNAME, further='把姓、氏、籍、译写与身份分层再读',
            misread='同姓即共祖，可据姓氏认亲',
            rank='百科／媒体',
            okEff={'lore': 6, 'cohesion': 2}, midEff={'lore': 3, 'cohesion': 1},
            badEff={'lore': -2},
            okEcho='名册上这一行，族里没敢替后人认亲。',
            midEcho='先记常用的称法，边界那句留着。',
            badEcho='把误读当成了结论，谱上多了一笔要回头擦的账。',
            stanceOk='suspend', stanceMid='settle',
            note=QUIZ_BOUNDARY + '　不指认该姓的始祖、郡望或世系。', tier='scale'))

    term_items = [x for x in C['items'] if x.get('scaleTier')]
    step = max(1, len(term_items) // 30)
    for x in term_items[::step][:30]:
        nq += 1
        Q['items'].append(dict(
            id='RQ%03d' % nq, kind='term_layer', badge='辨其层位',
            refId=x['id'], dim=x['dim'], topic=x['title'], y0=x['y0'], y1=x['y1'],
            stem='看到「' + clip(x['title'], 22) + '」这一子题，下面哪一读法更稳妥？',
            ok='分层存疑：先分清术语所指的概念、制度与实践层位，再谈年代与传播',
            mid='折中：按常见用法记下，层位与异说另注一行',
            bad='直取常见误解：把术语直接当成某一具体人物、事件或确证纪年',
            why=BOUNDARY_TERM, further='核该维度的同期文献与器物材料',
            misread='把术语直接当成某一具体人物、事件或确证纪年',
            rank='百科／媒体',
            okEff={'lore': 6, 'cohesion': 2}, midEff={'lore': 3, 'cohesion': 1},
            badEff={'lore': -2},
            okEcho='名目先分层，往后的账才好对。',
            midEcho='先按常见说法落笔，层位那句留着。',
            badEcho='把名目当成了实事，编年里多了一笔要回头擦的账。',
            stanceOk='suspend', stanceMid='settle',
            note=QUIZ_BOUNDARY + '　本条为通识框架锚点，不作学术引用。', tier='scale'))

    # ── 5 meta 更新 ──
    P['meta']['scaleNote'] = (
        '第五轮：姓氏 121 → %d 条（《百家姓》单姓 %d / 汉语复姓 %d / 非汉姓体系若干），'
        '人群 67 → %d 条。新增条目只列姓氏用字与命名构件，不指认得姓始祖、郡望世系或血缘来源；'
        '年代窗口只表示命名体系大致可见的时段，不追具体始年。'
        '全部为通识级锚点，域名级检索入口、引文留空、不作学术引用。'
        % (len(P['surnames']), len(chars), len(COMPOUND), len(P['peoples'])))
    P['meta']['density2'] = (
        '本轮扩容说明：姓氏册按组折叠，检索框可跨全部条目筛选；'
        '不作生物种族分类，不作血统纯正推断。')
    C.setdefault('meta', {})['scaleNote'] = (
        '第五轮：每维补到 ≥12 条，新增 %d 条通识级术语／框架锚点（frame layer）。'
        '优先用真实子题名，不足部分用「概念／制度／材料／实践／传播」等框架层补齐；'
        '只立读法与玩法接口，不指认具体人物、事件或纪年，不作学术引用。' % nt)
    Q['meta']['count'] = len(Q['items'])
    kinds = {}
    for x in Q['items']:
        kinds[x['kind']] = kinds.get(x['kind'], 0) + 1
    Q['meta']['kinds'].update(dict(
        surname_origin=dict(name='辨其共祖', source='peoples.json／新增姓氏', count=kinds.get('surname_origin', 0)),
        term_layer=dict(name='辨其层位', source='civilization.json／术语锚点', count=kinds.get('term_layer', 0))))
    Q['meta']['scaleNote'] = (
        '第五轮：题库 174 → %d 道，新增「辨其共祖」（姓氏扩容进玩法）与'
        '「辨其层位」（术语锚点进玩法）两类。三择一结构不变；'
        '新增题不针对某个姓氏编造身世，只辨析同姓共祖这一类通用误读。' % len(Q['items']))

    save('peoples.json', P)
    save('civilization.json', C)
    save('reading_quiz.json', Q)
    print('姓氏 121 → %d（百家姓 %d / 复姓 %d）· 人群 67 → %d'
          % (len(P['surnames']), len(chars), len(COMPOUND), len(P['peoples'])))
    print('文明条目总数 %d（本轮新增 %d，不含第八轮 KP 人物；每维 ≥%d）'
          % (len(C['items']), nt, min_per_dim))
    print('判读题库 174 → %d %s' % (len(Q['items']), kinds))

if __name__ == '__main__':
    main()
