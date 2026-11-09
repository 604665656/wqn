# 上下五千年 v4.2 可玩版 · TOY 上架说明（2026-11-09）

## 交付包
`上下五千年_可玩版.zip`：63,233,460 B / 54 条目，解压后 51 文件 / 91,818,705 B。
- `dist/wqn.html` 39,957,115 B（主站，Toy 上架源）
- `dist/wqn-review.html` 39,946,182 B（审阅版）
- `dist/wqn-embed.html` 7,208,960 B（嵌入版）
- `assets/layers/*.webp` 49 张图层资源

标题均为 `上下五千年 · 无尽编年 · v4.2 · build 33 · 2026-11-09`。

## 分包
`_build_all.py` 统一纯分包，零内容改动：
- 2 个内联 `<script>`（357 + 38,734,910 字符）→ `app1.js` / `app2.js`
- `<style>` 84,785 字符保持内联
- 入口 `index.html` 93,614 B
- 脚本内出现 9 处 `assets/` 引用，因此把 47 个被引用的图层文件一并复制进 `toy/assets/`
- 0 根绝对路径引用；264 处 `data:image` 与 171 段长 base64 全部保留
- 全文 1446 个 http 外链，按「不动源文件」原则未做裁剪

## 校验
- `node --check app1.js` / `app2.js` 均通过
- `toy_doctor.py --require-root-index` 通过，仅 1 条 contenthash 建议 WARN（不阻断）
- 复用命令：`toy update 52499188812800 toy --yes --json`

## 打包上架 ZIP
本仓库已含 `toy/` 完整产物，不再重复存一份大 ZIP。需要时：
```bash
python -m zipfile -c 上下五千年_v4.2_Toy上架包.zip toy/*
```

## 历史
- 11-07 合规版（裁 799 条）→ `legacy/2026-11-07/`
- 11-08 v2.8 build 19（1.11% 等长中文中性化 + 校验和重算）→ `legacy/2026-11-09-v2.8/`
- 本次 v4.2 为完整新版，主目录内容全部替换，未沿用任何旧版裁剪。
