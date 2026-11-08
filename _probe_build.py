#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""v2.8 内容审核黑盒定位：恢复式区间探针包生成。

只读 toy/ 产物，在 probe/<name>/ 下生成变体；不修改 dist/、data/、src/ 源文件。

第一轮（v2.7，10 个并行探针）已证实：
  * 全中文中性化                -> published（安全基线）
  * 只中性化 WQN.data 区段中文  -> published
  * 只中性化 pool / code 区段    -> rejected
  * 只清外链 / 只清图片 base64  -> rejected
  => 全部命中项位于 window.WQN.data 区段的中文语义内容中，与外链、图片载荷、
     pool 字符串、运行时代码无关。且 index.html 原文无命中。

因此第二轮用「恢复式区间探针」：以「data 区段中文中性化」为基线，
每次只把 data 区段的一个子区间恢复成原文。
  * published => 该子区间无命中
  * rejected (type:content) => 该子区间内有命中项
多个命中区间可一次并行全部找出。

用法：
  python _probe_build.py            # 生成 10 段等分恢复探针
  python _probe_build.py s0=1000:2000 s1=2000:3000   # 自定义区间
"""
import json
import pathlib
import re
import shutil
import sys

ROOT = pathlib.Path(__file__).resolve().parent
BASE = ROOT / "toy"
OUT = ROOT / "probe"

CJK = re.compile(r"[\u4e00-\u9fff]")
POOL_START_MARK = "window.__WQN_POOL__=["
DATA_START_MARK = "\nwindow.WQN.data="
RESTORE_MARK = "/* 构建期字符串池还原"


def regions(s):
    p = s.index(POOL_START_MARK)
    d = s.index(DATA_START_MARK, p)
    r = s.index(RESTORE_MARK, d)
    return {"pool": (p, d), "data": (d, r), "code": (r, len(s))}


def neutralize(s):
    return CJK.sub("文", s)


def restore_build(app2, a, b):
    """data 区段中文中性化，仅 [a,b) 保留原文（其余区段完全不动）。"""
    d0, d1 = regions(app2)["data"]
    a = max(a, d0)
    b = min(b, d1)
    if b <= a:
        raise SystemExit("恢复区间不在 data 区段内: %d:%d" % (a, b))
    seg = app2[d0:d1]
    seg2 = (neutralize(seg[:a - d0]) + seg[a - d0:b - d0]
            + neutralize(seg[b - d0:]))
    return app2[:d0] + seg2 + app2[d1:]


def build(variants):
    app2_src = (BASE / "app2.js").read_text(encoding="utf-8")
    app1_src = (BASE / "app1.js").read_text(encoding="utf-8")
    html_src = (BASE / "index.html").read_text(encoding="utf-8")
    d0, d1 = regions(app2_src)["data"]
    print("data 区段: %d .. %d （%d 字符）" % (d0, d1, d1 - d0))
    OUT.mkdir(exist_ok=True)
    manifest = {}
    for name, spec in variants.items():
        a, b = (int(x) for x in spec.split(":"))
        d = OUT / name
        if d.exists():
            shutil.rmtree(d)
        d.mkdir(parents=True)
        a2 = restore_build(app2_src, a, b)
        (d / "app1.js").write_text(app1_src, encoding="utf-8")
        (d / "app2.js").write_text(a2, encoding="utf-8")
        (d / "index.html").write_text(html_src, encoding="utf-8")
        restored = len(CJK.findall(app2_src[a:b]))
        manifest[name] = {"restore": [a, b], "restored_cjk": restored,
                          "app2": (d / "app2.js").stat().st_size}
        print("%-8s restore %9d:%-9d 恢复中文 %6d 字  app2=%d B"
              % (name, a, b, restored, manifest[name]["app2"]))
    (OUT / "manifest.json").write_text(
        json.dumps({"data_region": [d0, d1], "variants": manifest},
                   ensure_ascii=False, indent=2), encoding="utf-8")


def auto_variants(n=10):
    """按「中文字符数」等分 data 区段，避免大片 base64 图片块造成空探针。"""
    s = (BASE / "app2.js").read_text(encoding="utf-8")
    d0, d1 = regions(s)["data"]
    pos = [m.start() for m in CJK.finditer(s, d0, d1)]
    print("data 区段中文字符 %d 个，按数量等分为 %d 段" % (len(pos), n))
    per = len(pos) // n
    out = {}
    for i in range(n):
        lo = i * per
        hi = len(pos) if i == n - 1 else (i + 1) * per
        a = d0 if i == 0 else pos[lo]
        b = d1 if i == n - 1 else pos[hi]
        out["r%d" % i] = "%d:%d" % (a, b)
    return out


if __name__ == "__main__":
    if len(sys.argv) > 1:
        vs = {}
        for arg in sys.argv[1:]:
            name, spec = arg.split("=", 1)
            vs[name] = spec
    else:
        vs = auto_variants(10)
    build(vs)
