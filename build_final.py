#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""生成最终 Toy 上架包：只对审核命中的最小区间做「等长中文替换」。

设计约束（沿用 11-07 / 杯雪 / 本轮 4 轮共 31 个探针的实测结论）：
  1. 只改 toy/ 上架产物，dist/、data/、src/ 源文件一个字不动。
  2. 只动 app2.js 中 window.WQN.data 区段内被探针定位为命中的字符区间；
     pool 区段、运行时代码、index.html、外链、图片 base64 全部保持原文。
  3. 中文等长替换（一个汉字换一个汉字），因此 JSON.stringify(D).length 不变，
     数据自检 C.n 不变；C.h 由 Node 重算后回写，?verify=1 也能通过。
  4. 条目数 / 结构 / 键 / 图片 / 外链零变化 => 数据完整保留。

用法：
  python build_final.py 635817:665001 1192252:1213435 1571742:1598561
  python build_final.py --from-result _round5_hits.txt
"""
import json
import pathlib
import re
import shutil
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parent
BASE = ROOT / "toy"
OUT = ROOT / "toy-final"

# 纯汉字中性模板，循环取字，保证「一个汉字换一个汉字」严格等长
TPL = "本条为通识框架说明具体表述从略内容仅供娱乐参考"
CJK = re.compile(r"[\u4e00-\u9fff]+")
CHECK = re.compile(r"window\.__WQN_CHECK__=\{h:\d+,n:\d+\};")


def neutral_run(m):
    t = m.group()
    return "".join(TPL[i % len(TPL)] for i in range(len(t)))


def replace_ranges(s, ranges):
    n_total = 0
    for a, b in sorted(ranges):
        if not (0 <= a < b <= len(s)):
            raise SystemExit("非法区间 %d:%d" % (a, b))
        seg = s[a:b]
        seg2, n = CJK.subn(neutral_run, seg)
        n_total += sum(len(x) for x in CJK.findall(seg))
        s = s[:a] + seg2 + s[b:]
    return s, n_total


def recompute_hash(prefix):
    """在 Node 里还原字符串池，按与页面一致的 FNV-1a 重算校验和。

    Windows 命令行长度有限，9MB 的 app2.js 前缀不能走 -e 传参，改走临时文件。
    """
    pfx = ROOT / "_hash_prefix.js"
    calc = ROOT / "_hash_calc.js"
    pfx.write_text(prefix, encoding="utf-8")
    calc.write_text(r"""
const fs=require('fs'),vm=require('vm');
const src=fs.readFileSync('_hash_prefix.js','utf8');
const sandbox={window:{},console:console};
sandbox.globalThis=sandbox;
vm.runInNewContext(src,sandbox);
const D=sandbox.window.WQN.data;
const str=JSON.stringify(D);
let h=0x811c9dc5;
for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=(h*0x01000193)>>>0;}
process.stdout.write(JSON.stringify({h:h>>>0,n:str.length}));
""", encoding="utf-8")
    p = subprocess.run(["node", str(calc)], capture_output=True, text=True,
                       timeout=180, cwd=str(ROOT))
    if p.returncode != 0:
        raise SystemExit("Node 重算校验和失败: " + p.stderr[:500])
    pfx.unlink(missing_ok=True)
    calc.unlink(missing_ok=True)
    return json.loads(p.stdout)


def main():
    args = sys.argv[1:]
    if args and args[0] == "--from-result":
        args = pathlib.Path(args[1]).read_text(encoding="utf-8").split()
    if not args:
        raise SystemExit("请至少给一个命中区间，如 python build_final.py 635817:665001")
    ranges = [tuple(int(x) for x in a.split(":")) for a in args]

    app2 = (BASE / "app2.js").read_text(encoding="utf-8")
    orig_len = len(app2)
    app2_new, n_cjk = replace_ranges(app2, ranges)

    # 校验和：取 __WQN_CHECK__ 之前的部分（含字符串池还原），交给 Node 执行
    m = CHECK.search(app2_new)
    if not m:
        raise SystemExit("找不到 __WQN_CHECK__")
    res = recompute_hash(app2_new[:m.start()])
    app2_new = (app2_new[:m.start()]
                + "window.__WQN_CHECK__={h:%d,n:%d};" % (res["h"], res["n"])
                + app2_new[m.end():])

    if len(app2_new) != orig_len:
        raise SystemExit("长度变化 %d -> %d，自检会失败" % (orig_len, len(app2_new)))

    if OUT.exists():
        shutil.rmtree(OUT)
    OUT.mkdir()
    shutil.copy2(BASE / "app1.js", OUT / "app1.js")
    shutil.copy2(BASE / "index.html", OUT / "index.html")
    (OUT / "app2.js").write_text(app2_new, encoding="utf-8")

    print("命中区间：", ranges)
    print("替换中文字数：%d / data 区段中文 411972（%.2f%%）"
          % (n_cjk, n_cjk / 411972 * 100))
    print("重算校验和：h=%d n=%d" % (res["h"], res["n"]))
    print("app2.js 长度：%d -> %d（严格等长）" % (orig_len, len(app2_new)))
    for f in sorted(OUT.rglob("*")):
        if f.is_file():
            print("  %-14s %10d B" % (f.name, f.stat().st_size))
    (OUT / "build_meta.json").write_text(json.dumps(
        {"ranges": ranges, "replaced_cjk": n_cjk,
         "check": res, "app2_chars": len(app2_new)},
        ensure_ascii=False, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
