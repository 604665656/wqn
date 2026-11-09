# -*- coding: utf-8 -*-
"""发布前文案自查：扫描 HTML 产物里可能被内容审核误判的词。
用法：
  python3 tools/audit_copy.py ../wqn.html            # 完整版（预期有命中）
  python3 tools/audit_copy.py ../wqn-review.html     # 送审版（预期归零）
  python3 tools/audit_copy.py ../wqn-review.html --strict   # 有命中则退出码 1

说明：命中不等于违规。多数是「不作……判断」这类免责句，反而把词送进机审；
      送审版的处理方式见 data/review_rules.json 与 docs/发布审核整改对照表.md。
"""
import re, sys, os, collections

GROUPS = collections.OrderedDict([
    ('未证实推演层', ['外星人', '史前超文明', '亚特兰蒂斯', '古代宇航员', 'UFO', '飞碟', '狂想']),
    ('政治范围与地图', ['国界', '疆界', '疆域', '领土', '主权', '版图', '政权核心区']),
    ('旧分类与文献他称', ['人种', '蛮夷戎狄', '含米特', '血统纯正', '纯正']),
    ('君主政争表述', ['被弑', '弑君', '篡立', '废立', '毒杀', '自缢']),
    ('推算与信仰措辞', ['占卜', '神谕', '预言', '谶纬', '风水', '命理', '数术', '祭祀', '神庙', '祭司']),
    ('后世叙事文本', ['野史', '演义', '戏说', '伪书']),
])
# 「边界 / 血统 / 神话 / 宗教 / 假说」等属中性学术用语，不列入拦截，避免过度整改。


def visible_text(html):
    """只审「人会读到的文案」：把内嵌图片的 base64 载荷替换成等长空格。
    否则 WebP/JPEG 编码里随机出现的字母串（例如 UFO）会被当成敏感词误报，
    而且会把真正写在正文里的命中淹没在二进制噪声里。"""
    return re.sub(r'(data:image/[a-z+]+;base64,)([A-Za-z0-9+/=]+)',
                  lambda m: m.group(1) + ' ' * len(m.group(2)), html)


def audit(path):
    raw = open(path, 'rb').read().decode('utf-8-sig', 'replace')
    text = visible_text(raw)
    out = collections.OrderedDict()
    total = 0
    for g, words in GROUPS.items():
        rows = []
        for w in words:
            n = text.count(w)
            if n:
                rows.append((w, n))
                # 取第一处上下文，方便人工判断是不是免责句
                i = text.find(w)
                ctx = re.sub(r'\s+', ' ', text[max(0, i - 34):i + 34])
                rows[-1] = (w, n, ctx)
                total += n
        out[g] = rows
    return out, total, len(raw.encode('utf8'))


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(0)
    p = sys.argv[1]
    strict = '--strict' in sys.argv
    out, total, size = audit(p)
    print('文件：%s　（%.1f KB）' % (os.path.basename(p), size / 1024))
    print('-' * 68)
    for g, rows in out.items():
        if not rows:
            print('  %-14s 0 处  ✓' % g)
        else:
            print('  %-14s %d 处' % (g, sum(r[1] for r in rows)))
            for w, n, ctx in rows[:4]:
                print('      %-10s ×%-4d 例：…%s…' % (w, n, ctx))
    print('-' * 68)
    print('合计命中：%d 处' % total)
    if strict and total:
        print('❌ strict 模式：仍有命中，请检查 data/review_rules.json 的 pairs')
        sys.exit(1)
    if strict:
        print('✅ strict 模式：全部归零')
    else:
        print('提示：完整版有命中属正常；送审版应加 --strict 复检。')


if __name__ == '__main__':
    main()
