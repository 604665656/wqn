"""三款游戏 Toy 纯分包构建：零内容改动，只把内联 <script> 外置为 appN.js。
<style> 一律保持内联，避免 url(#...) SVG fragment / 相对路径解析口径变化。
源 ZIP 解压出来的文件只读，不做任何修改。
"""
import pathlib, re, shutil, json

ROOT = pathlib.Path(r"C:/Users/60466/WorkBuddy/2026-11-07-09-21-08")

JOBS = [
    dict(key="hsm-v081", src=ROOT / "hsm-v081/src/哈士喵发布包/index.html",
         out=ROOT / "hsm-v081/toy", assets=None),
    dict(key="quizavg", src=ROOT / "quizavg/toy_src/index.html",
         out=ROOT / "quizavg/toy", assets=None),
    dict(key="wqn-play", src=ROOT / "wqn-play/src/dist/wqn.html",
         out=ROOT / "wqn-play/toy", assets=ROOT / "wqn-play/src/assets"),
]

SCRIPT_RE = re.compile(r"<script(?![^>]*\ssrc=)([^>]*)>(.*?)</script>", re.S | re.I)
STYLE_RE = re.compile(r"<style([^>]*)>(.*?)</style>", re.S | re.I)


def build(job):
    src, out = job["src"], job["out"]
    if out.exists():
        shutil.rmtree(out)
    out.mkdir(parents=True)

    s = src.read_text(encoding="utf-8")
    orig_len = len(s)
    bodies = []

    def repl(m):
        attr, body = m.group(1), m.group(2)
        if "application/json" in attr or "application/ld+json" in attr:
            raise SystemExit("%s: 出现 JSON 类型内联脚本，需要专门处理 DATA 回填" % job["key"])
        bodies.append(body)
        return '<script src="./app%d.js"></script>' % len(bodies)

    html, n = SCRIPT_RE.subn(repl, s)
    if n == 0:
        raise SystemExit("%s: 没有找到内联脚本" % job["key"])
    if len(bodies) != n:
        raise SystemExit("%s: 脚本计数不一致" % job["key"])

    styles = STYLE_RE.findall(html)
    for idx, body in enumerate(bodies, 1):
        (out / ("app%d.js" % idx)).write_text(body, encoding="utf-8")
    (out / "index.html").write_text(html, encoding="utf-8")

    # 脚本里是否引用外部 assets 目录
    joined = "\n".join(bodies)
    asset_refs = len(re.findall(r"assets/", joined))
    copied = 0
    if job["assets"] and job["assets"].is_dir() and asset_refs:
        shutil.copytree(job["assets"], out / "assets")
        copied = sum(1 for p in (out / "assets").rglob("*") if p.is_file())

    bad_abs = (html.count('src="/') + html.count('href="/')
               + html.count("src='/") + html.count("href='/"))
    entry_size = (out / "index.html").stat().st_size
    meta = dict(key=job["key"], source=src.as_posix(), source_bytes=src.stat().st_size,
                source_chars=orig_len, entry_bytes=entry_size, scripts=n,
                styles=len(styles), style_bytes=sum(len(b) for _, b in styles),
                app_bytes=[len(b) for b in bodies], asset_refs=asset_refs,
                assets_copied=copied, root_abs_refs=bad_abs,
                data_image=html.count("data:image"), url_fragment=len(re.findall(r"url\(#", html)))
    (out / "build_meta.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(meta, ensure_ascii=False))
    if entry_size > 1024 * 1024:
        raise SystemExit("%s: 入口超过 1MB" % job["key"])
    if bad_abs:
        raise SystemExit("%s: 存在根绝对路径引用" % job["key"])
    return meta


metas = [build(j) for j in JOBS]
print("ALL_OK", len(metas))
