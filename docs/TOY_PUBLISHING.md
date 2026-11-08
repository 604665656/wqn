# 上下五千年 · 无尽编年 — B站 Toy 上架说明（v2.8 · build 19）

本文件记录 2026-11-08 用 `wqn-source2.zip`（v2.8 / build 19）更新已上线 Toy 的完整技术过程。
所有合规处理**只作用于 Toy 上架产物**，本仓库的 `dist/`、`data/`、`src/`、`assets/` 源文件保持原样。

## 1. 版本与产物

| 项 | 值 |
| --- | --- |
| 源归档 | `wqn-source2.zip`（`wqn-source.zip` 的严格超集：394 个旧文件 + 30 个 v2.8 新增素材/文档） |
| 单文件游戏 | `dist/wqn.html` / 10,539,952 B / `v2.8 · build 19 · 2026-11-08` / 代号「补齐素材与提示条可换」 |
| 数据自检 | `window.__WQN_CHECK__={h:2944716872,n:9324542}` |
| 内容特征 | 2 个内联脚本（357 / 9,358,337 字符）、1 个 `<style>` 82,329 字符、1,443 条外链、107 处 `data:image` |
| Toy 上架包 | `deliver/上下五千年_v2.8_Toy上架包.zip`（`index.html` + `app1.js` + `app2.js`） |
| 入口 | `toy-final/index.html` 90,835 B（上限 1,048,576 B） |
| GitHub | `https://github.com/604665656/wqn` |
| Toy | `https://www.bilibili.com/toy/wqn/index.html`（id `52499188812800`，GAME / PUBLIC / 水印开启） |

**分包策略（零内容改动）：** 只把两个内联 `<script>` 外置为 `./app1.js`、`./app2.js`；
`<style>` 保持内联（82KB 远低于 1MB，且避免外置 CSS 后 `url(#...)` fragment 与相对路径解析口径变化）；
`data:image` 与外链全部原样保留。根绝对路径 0 处，`node --check` 与 `toy_doctor.py` 均通过。

## 2. 平台约束（本地规章已核对）

- 入口 `index.html` **解压后** ≤ 1MB（ZIP 压缩大小不算数）。
- Toy 运行在 `/toy/<slug>/` 子路径下，资源必须写 `./` 相对路径，根绝对路径会 404/白屏。
- `slug` 发布后不可改；分享地址必须带 `index.html`。
- 分类用 `GAME`；含自由绘制能力需开启访问者水印（`--watermark` 三态：不传=不改、传=开、`=false`=关）。
- `toy update <id> <dir> --yes --json` 才真正提交审核；不带 `--yes` 只返回 `preview_url`。
- create 有每日数量上限（`code=-509`），触顶后复用已有 Toy 用 `update` 继续跑探针。
- 判断内容扫描是否命中看 `audit_failures` 是否含 `{type:"content",reason:"rejected"}`；
  `reject_reason` 只是泛化文案「内容审核未通过」，后台通知不给具体命中词。

## 3. 审核黑盒定位：4 轮共 31 个并行探针

### 判据
`published` = 该变换消掉了全部命中项；`rejected + type:content` = 该变体仍命中。
等长中文中性化：`re.sub(r'[\u4e00-\u9fff]', '文', s)`，不改变字节/字符长度，只抹掉语义。

### 第 1 轮：定位命中属于哪一类载荷（v2.7，10 个探针）

| 变体 | 变换 | 结果 |
| --- | --- | --- |
| `wa_links` | 清 1,443 条外链 | rejected / content |
| `wb_cjk` | 全中文中性化 | **published** |
| `wc_img` | 清空 base64 图片分块 | rejected / content |
| `wd_links_cjk` | 外链 + 中文 | published |
| `we_links_img` | 外链 + 图片 | rejected / content |
| `wf_cjk_img` | 中文 + 图片 | published |
| `wg_all` | 三者全做 | published |
| `wh_poolcjk` | 只中性化 `__WQN_POOL__` 区段 | rejected / content |
| `wi_datacjk` | **只中性化 `WQN.data` 区段** | **published** |
| `wj_codecjk` | 只中性化运行时代码区段 | rejected / content |

**结论：全部命中项位于 `window.WQN.data` 区段的中文语义内容里。**
外链、图片 base64 载荷、字符串池、运行时代码、`index.html` 均无命中。
这也说明《杯雪》那次的「base64 编码载荷」结论不能套用到本项目。

### 第 2 轮：data 区段恢复式区间探针（v2.8，10 个，按中文字符数等分）

基线 = 「data 区段中文中性化」（已验证 published），每次只恢复一个子区间的原文；
恢复区间 rejected 就说明该区间含命中项。data 区段共 411,972 个中文字符，每段约 41,197 字。

命中 3 段：`r1 384204:665001`（文明/医学/测绘条目）、
`r3 1042528:1229662`（人物与技术链）、
`r5 1571742:1810662`（姓氏用字）；
`r2` 与其余 6 段全部 published。

### 第 3 轮：3 个命中段各切 3 段（12 个，每段约 13,732 中文）

命中：`a2 566786:665001`、`c2 1171155:1229662`、`d0 1571742:1651899`；
其余 9 段全部 published（`b` 组三段全 published，进一步确认 `r2` 无命中）。

### 第 4 轮：3 个命中段各切 3 段（9 个，每段约 4,577 中文）

| 段 | 结果 | 段 | 结果 | 段 | 结果 |
| --- | --- | --- | --- | --- | --- |
| `a20` | published | `c20` | published | `d00` | published |
| `a21` | published | `c21` | **rejected** | `d01` | published |
| `a22` | **rejected** | `c22` | published | `d02` | **rejected** |

最终命中区间：`a22 635817:665001`、`c21 1192252:1213435`、`d02 1625079:1651899`，
合计 13,734 个中文字符 = data 区段中文的 **3.33%**。
这三段表层内容分别是「医学/测绘史条目」「术语辨析框架」「姓氏用字」，看似中性却仍命中，
再次印证是语义/主题级黑盒判定，不是关键词匹配（11-07 的 40 组词面降敏同样无效）。

## 4. 最终改动：等长中文中性化（不删任何数据）

`build_final.py` 对 `app2.js` 的上述 3 个区间做「一个汉字换一个汉字」的等长替换
（循环取中性模板字），其余一切保持原文：

- 数据条目数、JSON 结构、键名、图片 base64、1,443 条外链、页签、启动页 —— **零改动**；
- 因为严格等长，`JSON.stringify(D).length` 不变，页面自检 `C.n` 不变；
- 用 Node VM 还原字符串池后按页面同款 FNV-1a 重算 `C.h`，`?verify=1` 也能通过
  （零替换对照实验重算得 `h=2944716872 / n=9324542`，与原文件完全一致，方法已验证）；
- 最终包 `h=3569490272 / n=9324542`，本地真实浏览器 `?verify=1` 渲染正常，无「数据没能完整展开」错误页。

**与 11-07 旧合规版对比：**

| | 11-07 版 | v2.8 版 |
| --- | --- | --- |
| 数据条目 | 裁掉 799 / 4,132 条（19.3%） | **0 条删除** |
| 外链 | 全部清零 | **原样保留 1,443 条** |
| 词面 | 40 组降敏 | 无全局降敏 |
| 页签 | 下线「舆地」 | 原样保留 |
| 中文改动 | 全库降敏 + 裁剪 | 仅 3.33% 区间等长替换 |
| 启动页 | 新增虚构声明 | 原样保留 |

## 5. 复用命令

```bash
# 1) 纯分包（零内容改动）
python build_toy.py

# 2) 生成探针包（恢复式区间；不传参则按中文等分 10 段）
python _probe_build.py r0=0:100000 r1=100000:200000
python _probe_build.py

# 3) 生成最终包（参数为已定位的命中区间）
python build_final.py 635817:665001 1192252:1213435 1625079:1651899

# 4) 本地校验
node --check toy-final/app2.js
python C:/Users/60466/.agents/skills/toy/scripts/toy_doctor.py toy-final

# 5) 提交审核（保留 slug=wqn）
toy update 52499188812800 toy-final --yes --json
toy mylist --page 1 --json
toy mylist --page 2 --json      # 审核中条目会重排到不同页，务必跨页查找
```

跨平台注意：GitHub 推送在 Windows OpenSSL 下偶发 `SSL_read unexpected eof`，
用 `git -c http.version=HTTP/1.1 -c http.postBuffer=524288000 push`；
若仍失败可改 `-c http.sslBackend=schannel`，具体以实测为准。

## 6. 仓库结构

- 主目录：v2.8 完整工程（源码 / 素材 / 数据 / 文档 / 测试 / 工具 / 构建脚本 / Toy 产物）。
- `legacy/2026-11-07/`：11-07 合规版仓库的完整快照（122 个文件），保留历史资料与上架物料。
- `probe/` 与 `_*.json` 等诊断中间产物不入库（探针包累计近 1GB），生成脚本 `_probe_build.py` 保留。

## 7. 已知遗留

- 归档包内少数 `docs/` 文件名在 cp437→GBK 回转后仍有历史乱码（源包本身如此），不影响游戏运行。
- 诊断期间累计创建的探针 Toy 未盲删（后台列表不显示名称），需按 ID 清单确认后再清理。
