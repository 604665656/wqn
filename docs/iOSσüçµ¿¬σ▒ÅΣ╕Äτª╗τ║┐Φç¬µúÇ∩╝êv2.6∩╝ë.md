# v2.6 · iOS 假横屏与离线自检

> 当前 **v2.6 · build 17**。这轮回的是你那句「可以做假横屏啊，针对 ios 等」。

## 一、方向确认：不跟系统较劲了

`screen.orientation.lock()` 是 Limited availability：Android Chrome 支持，**iOS Safari、桌面 Chrome/Safari 全不支持**。之前那版一边请求全屏、一边尝试锁方向，iOS 上两件都失败，于是「点了横屏还是竖屏」；退出时又因为提前 `return` 漏掉清理，变成「还换不回去」。

v2.6 的做法：**把整个游戏容器 `rotate(90deg)` 成横向画布**。容器宽 = 屏幕长边、高 = 短边，旋转后正好铺满竖屏视口；把手机横过来看，画面就是正的横向 AVG。全程不请求任何系统权限，系统锁不锁竖屏都不影响。

## 二、「换不回去」其实是三个 bug 叠一起

| # | 问题 | 修法 |
| --- | --- | --- |
| ① | `applyLandscape(false)` 里 `if(!on){hideLandHint();return;}` 提前返回，跳过了 `exitFullscreen` 与 `orientation.unlock` | 清理提到分支之前；不再请求全屏、不再锁方向，也就没有残留 |
| ② | 提示条 6 秒自动收起，而且挂在 `#app` 内，每次 `render()` 的 `innerHTML` 重绘会把它冲掉 | 常驻不消失；横屏键本身也改成带高亮的 toggle；`render()` 末尾补建 |
| ③ | 退出条跟着画布一起转，被挤成 **40×371** 的竖条；实测按钮包围盒中心 `elementFromPoint` 命中的是别的按钮（`selfHit=false`），真实触摸会打偏 | 固定在视口、不随旋转、`z-index:9999`、最小 88px 宽；实测 `selfHit=true` |

现在有四个出口：常驻「退出横屏」按钮、横屏键再点一次、`Esc`、点提示条上的 × 收起说明。**再点横屏键不再是「从头开始」**，它是真 toggle，`aria-pressed` 与按钮图形（▭ / ▯）同步。

**两个握持姿态各留一个「正着」的出口**，这点特意做过取舍：退出条固定在视口、不随画布旋转，所以你**竖着拿手机**时它是正的、够大、点得中（实测 `selfHit=true`）；**横过来看**时它侧躺，但旋转画布内的横屏键 ▯ 恰好转正并高亮，点它一样退出。不用为了找按钮把手机转回来。

## 三、iOS 专项

- **文字不自动放大**：整个容器旋转时 iOS 会按「设备横屏」放大文字，布局会炸 → 锁 `-webkit-text-size-adjust:100%` 与 `text-size-adjust:100%`
- **防误触**：`touch-action:manipulation`、`-webkit-touch-callout:none`，禁止双击缩放干扰旋转后的命中
- **视口单位回退**：`100vh/100vw` 在前、`100dvh/100dvw` 在后，照顾 iOS Safari 15.4 之前
- **安全区**：物理顶部刘海旋转后落在容器左边缘、Home Indicator 落在右边缘，左侧文字区／气泡用 `env(safe-area-inset-top)`、右侧工具条／立绘用 `env(safe-area-inset-bottom)` 避开
- **地址栏不抖**：iOS 收起地址栏会发 `resize` 但不改变宽高关系；`tallFlipped()` 只在竖↔横关系真的翻转时放行重算，避免画布反复重旋
- **物理方向变化不再替用户开关横屏**：已开启时只重算要不要 `rot90`；手机真横过来去掉旋转用原生横向布局，转回竖屏自动重旋

### 实机验证

iPhone SE 375×667 / iPhone 14 390×844 / iPhone Pro Max 428×926 / iPad 竖屏 820×1180，iPhone Safari UA、`isMobile+hasTouch`、**真实 `touchscreen.tap`** 逐项通过：`rot90` 生效、`textAdjust=100%`、`fullscreen=false`、退出条在 body 且命中、地址栏收放稳定、触摸退出与 toggle 退出全通、零报错。截图见 `assets/ui_v26_ios_chromium.png`。

**要如实说**：本环境**没有安装 WebKit 二进制**，跑不了真 iOS Safari 内核；上述是 Chromium 的 iPhone 模拟实测，WebKit 四项在脚本里明确标 `SKIP`，没有假装通过。真机上的最终手感仍需你在 iPhone 上确认一次。

## 四、顺带落了调研报告里 P0 的一条

新增 `tools/check_offline.js`，借鉴 `vite-plugin-singlefile` 的 `file://` 能力清单，**每次构建写盘后立刻自检**：

- 禁外链脚本 / 样式 / CSS 图 / `@import` / `iframe`
- 禁动态 `import(`、`fetch(`、`XMLHttpRequest`、`document.cookie`、`history.pushState`、`serviceWorker.register`
- 必须有数据校验和、版本号、字符串池、离线提示

任何一条命中直接 `process.exit(1)`，不等到用户白屏才发现。新增第九套回归 `test/offline.test.js`，里面还专门做了「故意注入外链必须被拦下」的自测，确认规则本身不是摆设。

**P0 其余四条**（叙事中间格式、回想／自动播放／跳过、audio Transport、错答固定散列复现）与 P1 两条本轮**没动**，仍在 `docs/开源方案借鉴调研.md` 里排队。

## 五、边界与验证

- 史实、2199 条考据条目、帝王世家、91 层角色、19 张场景板、90 关、存档与分享串**一字未改**；同种子仍逐笔可复盘，旧存档刷新自动续上。
- 假横屏只是 CSS 布局层，不改任何游戏状态、不进存档、不进分享串。
- 送审版同步带全部改动，`audit_copy --strict` 六类 **0 命中**；离线自检对完整版与送审版都通过。
- 九套回归全绿、浏览器零报错；v2.6 横屏专项与 iOS 专项均通过。

## 六、下一轮

按调研报告的 P0 清单继续：先做「叙事中间格式 + 纯函数编译器」（不动运行时），再补回想页与自动播放／跳过。版本号会照旧自动递增到 v2.7。
