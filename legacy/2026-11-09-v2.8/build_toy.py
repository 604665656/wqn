#!/usr/bin/env python3
"""把 dist/wqn.html（v2.8 · build 19）拆成 B站 Toy 上架包。

原则：**零内容改动**——只做平台强制的分包，不裁剪任何数据条目、不替换词面、
不删页签、不动外链。若内容审核驳回，再用并行探针定位最小必要改动。

  * 两个内联 <script>（357 字符 + 9,358,337 字符）→ ./app1.js / ./app2.js
  * <style>（82,329 字符）**保持内联**：只有 82KB，远低于 1MB 入口上限，
    内联可避免外置 CSS 后 url(#...) fragment 与相对路径解析口径变化
  * 107 个 data:image URI 都在 app2.js 里，保持原样不动
  * 入口 index.html 只剩骨架 + 内联样式 + 相对脚本引用

只写 toy/ 产物，dist/ 与 src/、data/ 源文件一个字不改。
用法： python build_toy.py
"""
import pathlib
import re
import shutil

ROOT = pathlib.Path(__file__).resolve().parent
SRC = ROOT / "dist" / "wqn.html"
OUT = ROOT / "toy"

if not SRC.exists():
    raise SystemExit("找不到 dist/wqn.html，请先跑 node build.js")

s = SRC.read_text(encoding="utf-8")
print("源文件：%s / %d B" % (SRC.name, SRC.stat().st_size))

if OUT.exists():
    shutil.rmtree(OUT)
OUT.mkdir(parents=True)

# ---------- 外置内联脚本（style 保持内联，理由见文件头） ----------
script_no = [0]


def script_repl(m):
    script_no[0] += 1
    fn = "app%d.js" % script_no[0]
    (OUT / fn).write_text(m.group(2), encoding="utf-8")
    return '<script src="./%s"></script>' % fn


s, nj = re.subn(
    r"<script(?![^>]*\ssrc=)([^>]*)>(.*?)</script>", script_repl, s, flags=re.S | re.I
)
print("外置脚本块：%d" % nj)
if nj != 2:
    raise SystemExit("预期 2 个内联脚本，实得 %d 个，构建中止" % nj)

(OUT / "index.html").write_text(s, encoding="utf-8")
size = (OUT / "index.html").stat().st_size
print("入口 index.html：%d B（上限 1,048,576 B）" % size)
if size > 1048576:
    raise SystemExit("入口超过 1MB，构建中止")

# ---------- 自检 ----------
bad_abs = re.findall(r'(?:src|href)\s*=\s*["\']/(?!/)', s)
svg_frag = len(re.findall(r"url\(#", s))
print("根绝对路径：%d / 保留 SVG fragment 引用：%d / 内联 data:image：%d"
      % (len(bad_abs), svg_frag, s.count("data:image")))
for f in sorted(OUT.rglob("*")):
    if f.is_file():
        print("  %-14s %10d B" % (f.name, f.stat().st_size))
print("产物：%d 个文件 / %d B"
      % (sum(1 for f in OUT.rglob("*") if f.is_file()),
         sum(f.stat().st_size for f in OUT.rglob("*") if f.is_file())))
print("内容改动：0（纯分包）")
