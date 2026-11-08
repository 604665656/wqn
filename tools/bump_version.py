# -*- coding: utf-8 -*-
"""给下一轮写 pending；真正的递增由 build.js 在下次构建时消费。
用法：
  python3 tools/bump_version.py "v1.1 · 这一轮做了什么" "条目一" "条目二" ...
只写 pending，不直接改版本号——保证「一次内容更新 = 一次版本递增」。
"""
import json, os, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = os.path.join(ROOT, 'data', 'version.json')
args = sys.argv[1:]
if not args:
    print(__doc__)
    sys.exit(0)
v = json.load(open(P, encoding='utf8'))
v['pending'] = {'title': args[0], 'items': args[1:] or ['（本轮条目待补）']}
json.dump(v, open(P, 'w', encoding='utf8'), ensure_ascii=False, indent=1)
cur = v['version'].split('.')
nxt = cur[0] + '.' + str(int(cur[1]) + 1)
print('pending 已写入：', args[0])
print('下次 node build.js 会递增到 v' + nxt + '（build ' + str(v['build'] + 1) + '）')
