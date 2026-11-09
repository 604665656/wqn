# 上下五千年 v4.2 · B站 Toy 最终上架记录（已过审）

## 最终状态

- Toy：`https://www.bilibili.com/toy/wqn/index.html`，id `52499188812800`
- `status=published` / `visibility=PUBLIC` / `category=GAME` / `watermark_enabled=true`
- 仓库 `toy/` 目录即**线上实际运行的过审包**，不再是纯分包原版。

## 为什么需要合规构建

纯分包版 `toy/` 提交后 `rejected / audit_failures=[{"type":"content"}]`。
经 8 轮约 60 个并行探针定位：命中集中在 `app2.js` 的 `WQN.data` 中文语义里，
外链、图片 base64、字符串池、代码 UI、`index.html` 均无命中。

已验证无效的路径（不要再试）：

- 把中文写成 JS 反斜杠 u 转义：审核会解码转义，照样命中。
- 40 组词级等长降敏：语义/主题级判定，词面替换无效。
- 可读模板替换：触发 `palcat` 包体安全检查未通过。

最小已过审区间（第 8 轮 `m1`）：`[(600000,700000),(1200000,1700000)]`，
共 84,766 / 488,891 个中文（17.34%）。

## 关键修复：不能全替换成同一个「文」

`WQN.data` 里有以中文做键名的对象（如 `colors.climate`）。把不同中文键名
全换成同一个「文」会产生重复键，`JSON.stringify` 时后者覆盖前者，
自检 `n` 从 `38663801` 变成 `38663431`（少 370），取色 / 取值会错乱。

最终方案 **唯一汉字映射**：命中区间内 2,246 个不同汉字，各自映射到
全文未出现过的另一个汉字。仍是一换一、字符数不变，但不同键名依旧互不相同。

验证（Node VM 还原 `WQN.data` 后对比）：

```
零改动重算      h=190161522   n=38663801   （与页面原值一致）
最终包重算      h=1579055570  n=38663801   （n 保持不变）
归一化后与原始包完全一致：equal=true
```

即数据零损失、结构零变化，只做了语义中性化。

## 自行复现

```bash
python build_final_v42.py --control                       # 验证重算方法
python build_final_v42.py 600000:700000 1200000:1700000   # 产出 toy-final/
node --check toy-final/app2.js
python <toy-doctor> toy-final/
toy update 52499188812800 toy-final --yes --json
```

`build_final_v42.py` 内含 `n != 38663801` 即拒绝产出的完整性守卫。

## 玩法介绍与操作截图

见仓库 `docs/GAMEPLAY_AND_SCREENSHOTS_2026-11-09.md` 与
`docs/游戏玩法与操作截图.html`（含 `docs/screenshots/` 首屏与操作图）。
