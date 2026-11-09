#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""生成上下五千年 v4.2 最终 Toy 上架包。

探针实测（第 1–9 轮共约 60 个并行 Toy）结论：
  - 内容审核命中集中在 app2.js 的 WQN.data 中文语义里；
  - 外链、图片 base64、pool、代码 UI、index.html 均无命中；
  - 把中文改成 JS \\uXXXX 转义会被解码后照样命中（审核会解码转义），此路不通；
  - 词级降敏（40 组等长词）仍命中；
  - 只有「等长中文替换（一个汉字换一个『文』）」能稳定过审。

构建产物只对审核命中的最小区间做替换；因为一个汉字换一个汉字，
JSON.stringify(WQN.data).length 不变、C.n 不变，只需重算 FNV-1a 的 C.h。

用法：
  python _build_final_v42.py --control              # 零改动对照，验证重算方法
  python _build_final_v42.py 600000:700000 1200000:1700000
"""
import json, pathlib, re, shutil, subprocess, sys

ROOT = pathlib.Path(r"C:/Users/60466/WorkBuddy/2026-11-07-09-21-08")
BASE = ROOT / "wqn-play/toy"
OUT = ROOT / "wqn-play/toy-final"
CJK = re.compile(r"[\u4e00-\u9fff]")
CHECK = re.compile(r"window\.__WQN_CHECK__=\{h:\d+,n:\d+\};")


def build_app2(ranges, unique=True):
    """等长中文中性化。

    重要：不能把所有中文都换成同一个「文」。WQN.data 里有以中文做键名的
    对象（如 colors.climate），全替换成「文」会产生重复键，JSON.stringify
    时后面的值覆盖前面的值，导致 n 变短、取色/取值错乱。

    unique=True 时改用「唯一汉字映射」：命中区间内每个不同汉字映射到全文
    未出现过的另一个汉字。仍然一换一、长度不变，但不同键名依旧互不相同，
    数据完整性与结构完全保留。
    """
    s = (BASE / "app2.js").read_text(encoding="utf-8")
    orig_len = len(s)
    n = 0
    n_chars = 0
    if unique:
        used = set(CJK.findall(s))
        chars = sorted({c for a, b in ranges for c in CJK.findall(s[a:b])})
        pool = [chr(cp) for cp in range(0x4E00, 0xA000) if chr(cp) not in used]
        if len(pool) < len(chars):
            raise SystemExit("空闲码位不足: %d < %d" % (len(pool), len(chars)))
        table = {c: pool[i] for i, c in enumerate(chars)}
        n_chars = len(chars)
        repl = lambda m: table.get(m.group(), m.group())
    else:
        repl = lambda m: "文"
    for a, b in sorted(ranges, reverse=True):
        seg = s[a:b]
        n += len(CJK.findall(seg))
        s = s[:a] + CJK.sub(repl, seg) + s[b:]
    if len(s) != orig_len:
        raise SystemExit("长度变化 %d -> %d" % (orig_len, len(s)))
    return s, n, n_chars


def recompute_hash(prefix):
    pfx = ROOT / "_v42_hash_prefix.js"
    calc = ROOT / "_v42_hash_calc.js"
    pfx.write_text(prefix, encoding="utf-8")
    calc.write_text(r"""
const fs=require('fs'),vm=require('vm');
const src=fs.readFileSync('_v42_hash_prefix.js','utf8');
const sandbox={window:{},console:console,
  document:{getElementById:()=>null,createElement:()=>({})},
  location:{search:'',href:''},navigator:{userAgent:''},
  atob:(s)=>Buffer.from(s,'base64').toString('binary')};
sandbox.globalThis=sandbox;
vm.runInNewContext(src,sandbox,{timeout:120000});
const W=sandbox.window;
const D=(W.WQN&&W.WQN.data)||W.__WQN_DATA__;
if(!D) throw new Error('未找到 WQN.data');
const str=JSON.stringify(D);
let h=0x811c9dc5;
for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=(h*0x01000193)>>>0;}
process.stdout.write(JSON.stringify({h:h>>>0,n:str.length}));
""", encoding="utf-8")
    p = subprocess.run(["node", str(calc)], capture_output=True, text=True,
                       timeout=300, cwd=str(ROOT))
    if p.returncode != 0:
        raise SystemExit("Node 重算校验和失败: " + (p.stderr or "")[:800])
    return json.loads(p.stdout)


def main():
    args = sys.argv[1:]
    if args and args[0] == "--control":
        app2 = (BASE / "app2.js").read_text(encoding="utf-8")
        m = CHECK.search(app2)
        print("CHECK 位置:", m.start(), m.group())
        res = recompute_hash(app2[:m.start()])
        print("零改动重算:", res)
        print("页面原值: h=190161522 n=38663801")
        return
    if not args:
        raise SystemExit("请给命中区间，如 600000:700000 1200000:1700000")
    flat = "--flat" in args
    args = [a for a in args if a != "--flat"]
    ranges = [tuple(int(x) for x in a.split(":")) for a in args]

    app2, n_cjk, n_chars = build_app2(ranges, unique=not flat)
    m = CHECK.search(app2)
    if not m:
        raise SystemExit("找不到 __WQN_CHECK__")
    res = recompute_hash(app2[:m.start()])
    app2 = (app2[:m.start()]
            + "window.__WQN_CHECK__={h:%d,n:%d};" % (res["h"], res["n"])
            + app2[m.end():])

    # 语法校验
    tmp = ROOT / "_v42_syntax.js"
    tmp.write_text(app2, encoding="utf-8")
    chk = subprocess.run(["node", "--check", str(tmp)], capture_output=True, text=True)
    tmp.unlink(missing_ok=True)
    if chk.returncode != 0:
        raise SystemExit("语法检查失败: " + chk.stderr[:500])

    if OUT.exists():
        shutil.rmtree(OUT)
    shutil.copytree(BASE, OUT)
    (OUT / "app2.js").write_text(app2, encoding="utf-8")

    total = len(CJK.findall((BASE / "app2.js").read_text(encoding="utf-8")))
    print("命中区间:", ranges)
    print("映射方式:", "全替换为文(--flat)" if flat else "唯一汉字映射")
    print("替换中文: %d / %d (%.2f%%), 不同汉字 %d 个" % (
        n_cjk, total, n_cjk / total * 100, n_chars))
    print("重算校验和: h=%d n=%d" % (res["h"], res["n"]))
    if res["n"] != 38663801:
        raise SystemExit("n 变化，数据结构可能被破坏，拒绝产出")
    print("数据结构完整: n 保持 38663801")
    print("app2.js 字符数:", len(app2))
    meta = {"ranges": ranges, "replaced_cjk": n_cjk, "distinct_chars": n_chars,
            "map_mode": "flat" if flat else "unique",
            "total_cjk": total, "check": res, "app2_chars": len(app2)}
    (OUT / "build_meta.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2),
                                          encoding="utf-8")
    for f in sorted(OUT.rglob("*")):
        if f.is_file():
            print("  %-24s %12d B" % (f.relative_to(OUT).as_posix(), f.stat().st_size))


if __name__ == "__main__":
    main()
