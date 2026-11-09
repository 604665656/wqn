# 账号 TOY 全量梳理（2026-11-09）

数据源：`toy mylist --page 1/2 --json`，共 **26** 条，账号 `298813 许许许许许丶若辰`。
分类字段全部为 `GAME`；**没有任何 `COLLECTION` 类型的 Toy**。
`slug` 字段不返回，以 `url` 里的 `/toy/<slug>/index.html` 为准。

## 一、正式对外单品（PUBLIC + 有 URL）= 6 个

| # | 游戏 | Toy id | 线上地址 | 状态 | 水印 |
|---|---|---|---|---|---|
| 1 | 哈士喵的测试屋 | 53346815708160 | https://www.bilibili.com/toy/hashimiao-quiz-avg/index.html | published | 开 |
| 2 | 哈士喵勇闯魔法禁书目录（v0.81） | 52938462465024 | https://www.bilibili.com/toy/hsm-toaru/index.html | published | 开 |
| 3 | 杯雪 · 互动游戏集 | 52933429303296 | https://www.bilibili.com/toy/beixue/index.html | published | 开 |
| 4 | 喵琴师 · CatKeys · 哈士喵的钢琴 | 52490682767360 | https://www.bilibili.com/toy/n6ivNJRNYEx64flD/index.html | published | 开 |
| 5 | 音乐节奏游戏：嘶恍而过的青葱岁月 | 48607206049792 | https://www.bilibili.com/toy/yyjzshegdqcsy/index.html | published | 开 |
| 6 | 上下五千年 · 无尽编年（v4.2 更新） | 52499188812800 | https://www.bilibili.com/toy/wqn/index.html | **rejected**（本轮内容审核定位中） | 开 |

> 6 个都是「单 TOY」：一个 Toy = 一个游戏入口。`杯雪 · 互动游戏集` 虽含二十四关 / 七卷 / 四模式，
> 但在平台侧仍是一条 GAME 记录，不是合集。

## 二、合集（COLLECTION）= 0 个

平台枚举里有 `COLLECTION`，但账号里没有用它创建的 Toy。
若需要一个「一个链接进全部游戏」的统一入口，建议新建一个 `COLLECTION` 类型 Toy，
内容做成游戏大厅卡片页（6 张卡 → 各 Toy URL），这样：
- 更新说明 / 动态 / 专栏 / 公众号只需发这一个链接；
- 以后新增游戏只改合集页，不用重发所有渠道；
- 统计仍可在各单 Toy 的 `dyn_stat` 里分别看。

本轮尚未创建，等待确认后再做（涉及新建 Toy 与审核）。

## 三、诊断探针（LINK_ONLY，不对外）= 19 个

| 组 | 数量 | 用途 |
|---|---|---|
| 区间探针 P0–P7 | 8 | 11-07 / 11-09 wqn 内容审核恢复式区间定位 |
| 细探针 Q0–Q4 | 5 | 11-07 细分区间定位 |
| bxn0/1/2、bxl0、bxr0/1 | 6 | 11-08《杯雪》readB64 编码载荷定位 |

全部 `visibility=LINK_ONLY`，不出现在公开列表，不应写进对外更新说明；
因后台列表不显示名称，未做盲删，保留待确认 ID 清单后统一清理。

## 四、历史废弃 = 1 个

`52494088542208` 上下五千年·无尽编年：rejected、审核未通过、`url=null`、`watermark_enabled=false`，
是 11-07 首轮被驳回的旧记录，已由 `52499188812800` 取代。

## 五、对更新说明的影响

此前动态 / 专栏只写了本轮 3 款，**缺了杯雪、喵琴师、音乐节奏游戏** 3 个已上线游戏。
后续所有渠道（B站动态、B站专栏、微信公众号）统一带上「全部在线游戏」清单：
6 条链接 + 逐款玩法介绍 + 19 张操作截图的在线画廊。公众号版因正文不支持外链跳转，链接以纯文本给出，
并把合集 / 主游戏链接放到「阅读原文」。
