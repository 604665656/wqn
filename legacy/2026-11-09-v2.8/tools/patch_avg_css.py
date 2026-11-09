# -*- coding: utf-8 -*-
import os
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
p=os.path.join(ROOT,'src','style.css');css=open(p,encoding='utf8').read()
if 'v1.8 AVG 全屏舞台' in css:
    print('已存在，跳过')
else:
    css+=r"""

/* ===== v1.8 AVG 全屏舞台 / 统一透明度 / 进度弹窗 ===== */
html{--veil:.35}
html.avg .stage{position:fixed;inset:0;width:100vw;height:100vh;height:100dvh;
  margin:0;border:0;border-radius:0;z-index:0;overflow:hidden}
html.avg .stage-bg{object-position:center 36%}
html.avg .stage-char{position:fixed;left:50%;bottom:19vh;
  transform:translateX(-50%);height:66vh;max-width:92vw;
  width:auto;object-fit:contain;z-index:1}
html.avg .stage .bubble{position:fixed;left:3%;right:3%;
  bottom:calc(60px + env(safe-area-inset-bottom));
  z-index:35;width:auto;max-width:none;
  background:rgba(255,250,238,var(--veil));
  backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}
html.avg .stage .bubble.expanded{max-height:50vh;overflow-y:auto}
html.avg .stage-tools{z-index:37}
html.avg #app{position:relative;z-index:2;padding-top:0;background:transparent}
html.avg .panel.on{background:transparent;border:0;box-shadow:none;
  padding-top:40vh;margin-top:0;
  padding-bottom:calc(150px + env(safe-area-inset-bottom))}
/* 原指示条视觉收起，DOM 与读屏内容一字不删 */
html.avg .avg-slim{position:absolute!important;width:1px!important;height:1px!important;
  overflow:hidden!important;opacity:0!important;pointer-events:none!important;
  margin:0!important;padding:0!important;left:-9999px!important}

/* 顶部进度缩略条 */
html.avg .pchip{position:fixed;top:calc(6px + env(safe-area-inset-top));
  left:3%;right:3%;z-index:36}
.pchip-sum{width:100%;box-sizing:border-box;display:flex;align-items:center;gap:7px;
  padding:5px 9px;border-radius:10px;
  background:rgba(255,250,238,var(--veil));
  backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);
  border:1px solid rgba(120,98,68,.4);
  font-family:inherit;font-size:calc(11px * var(--fs));
  color:#2b2218;font-weight:600;cursor:pointer;text-align:left;
  text-shadow:0 1px 2px rgba(255,250,238,.98)}
.pchip-y{flex:0 0 auto;color:#8a6a30}
.pchip-v{flex:0 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;
  white-space:nowrap;opacity:.9}
.pchip-bars{flex:1 1 auto;display:flex;align-items:flex-end;
  justify-content:flex-end;gap:2px;height:14px;min-width:0}
.pchip-bars i{display:block;width:4px;border-radius:2px 2px 0 0;
  background:#9a7434;opacity:.85}
.pchip-go{flex:0 0 auto;font-size:calc(10px * var(--fs));color:#8a6a30}

/* 详情弹窗：与气泡共用同一透明度 */
.pchip-detail{display:none}
.pchip.open .pchip-detail{display:block;position:fixed;
  top:calc(48px + env(safe-area-inset-top));left:3%;right:3%;
  max-height:72vh;overflow-y:auto;overscroll-behavior:contain;
  z-index:39;padding:10px 12px 16px;border-radius:14px;
  background:rgba(255,250,238,var(--veil));
  backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);
  border:1px solid rgba(120,98,68,.45);
  box-shadow:0 8px 30px rgba(60,46,28,.22);color:#2b2218}
.veilbar{display:flex;align-items:center;gap:10px;position:sticky;top:-10px;
  padding:4px 0 8px;margin:0 0 8px;
  border-bottom:1px solid rgba(120,98,68,.35);
  background:rgba(255,250,238,.55);
  font-size:calc(11px * var(--fs));font-weight:600}
.veilclose{font-family:inherit;font-size:calc(13px * var(--fs));font-weight:700;
  padding:7px 12px;border-radius:10px;cursor:pointer;color:#fff8e8;
  background:#7a3a2a;border:2px solid var(--gold)}
.pchip-body .head,.pchip-body .tierbar,.pchip-body .volbar,
.pchip-body .stats,.pchip-body .mini.center{
  display:block!important;position:static!important;width:auto!important;
  height:auto!important;overflow:visible!important;opacity:1!important;
  pointer-events:auto!important;left:auto!important;
  margin:6px 0!important;padding:6px 8px!important;
  border-radius:8px;background:rgba(255,250,238,.45);
  color:#2b2218;font-size:calc(11px * var(--fs))}
.pchip-body .stats{display:grid!important;grid-template-columns:repeat(4,1fr);gap:5px}
.pchip-body .stats .st{background:rgba(255,250,238,.55);padding:5px;
  border-radius:7px;color:#2b2218}
.pchip-body .yr,.pchip-body .vt{color:#8a6a30}
.pchip-body .mini{color:#4a3d29!important}

/* 主面板卡片与选项：暖白半透 + 深字 + 浅色光晕，最透也读得清 */
html.avg .panel.on .card,
html.avg .panel.on .opt,
html.avg .panel.on .gather,
html.avg .panel.on .note,
html.avg .panel.on .warnbar{
  background:rgba(255,250,238,var(--veil));
  backdrop-filter:blur(7px);-webkit-backdrop-filter:blur(7px);
  border-color:rgba(120,98,68,.4);box-shadow:none}
html.avg .panel.on .card *,
html.avg .panel.on .opt *{
  text-shadow:0 1px 2px rgba(255,250,238,.96),0 0 3px rgba(255,250,238,.9)}
html.avg .panel.on h2,html.avg .panel.on .card,html.avg .panel.on .opt,
html.avg .panel.on .result,html.avg .panel.on .story,
html.avg .panel.on .mini,html.avg .panel.on .row,
html.avg .panel.on .optbody,html.avg .panel.on .note,
html.avg .panel.on .gather{color:#2b2218}
html.avg .panel.on .tagline{color:#7a5a20}
html.avg .panel.on .mini,html.avg .panel.on .s{color:#4a3d29!important}
html.avg .panel.on .gain,html.avg .panel.on .g{color:#2f6b3a!important}
html.avg .panel.on .cost,html.avg .panel.on .c{color:#9a3b28!important}
html.avg .panel.on .risk{color:#8a5a1e!important}
html.avg .panel.on .hr{border-color:rgba(120,98,68,.35)}
html.avg .panel.on .opt .badge{color:#fff8e8;text-shadow:none}
html.avg .panel.on .big{display:inline-block;width:calc(50% - 6px);
  vertical-align:top;padding:10px 6px;margin:0;
  font-size:calc(12px * var(--fs));letter-spacing:1px}
html.avg .panel.on .big.alt{margin-left:8px}

/* 长卡折叠成一行，点开看全文 */
html.avg .panel.on .card.longfold{position:relative;max-height:46px;
  overflow:hidden;padding-right:98px}
html.avg .panel.on .card.longfold.lfold-open{max-height:none;overflow:visible}
.longfold-btn{position:absolute;right:8px;top:8px;z-index:3;
  font-family:inherit;font-size:calc(10px * var(--fs));padding:3px 7px;
  border-radius:8px;border:1px solid rgba(120,98,68,.5);
  background:rgba(255,250,238,.9);color:#6a5940;cursor:pointer}
html.avg .panel.on .card.longfold .longfold-btn{text-shadow:none}

/* 设置页滑杆 */
.veilrow{display:flex;align-items:center;gap:8px}
.veilrow input[type=range]{flex:1;min-width:120px;accent-color:var(--gold)}
.veilrow b{font-size:calc(11px * var(--fs));color:var(--gold);min-width:38px}

/* ===== 横屏：明显的横向两栏，舞台固定在左 ===== */
html.landscape .stage{position:fixed!important;left:0;top:0;
  width:38vw!important;height:100vh!important;height:100dvh!important;
  margin:0;border:0;border-radius:0;z-index:0}
html.landscape .stage-char{position:absolute;left:50%;bottom:8vh;
  height:56vh;max-width:36vw;transform:translateX(-50%)}
html.landscape .stage .bubble{position:absolute;left:3%;right:3%;bottom:10px;z-index:6}
html.landscape #app{padding-left:38vw!important;padding-right:0}
html.landscape .panel.on{padding-top:8px!important;padding-bottom:110px}
html.landscape .pchip{left:calc(38vw + 2%);right:2%}
html.landscape .pchip.open .pchip-detail{left:calc(38vw + 2%);right:2%}
html.landscape .opts{grid-template-columns:1fr}
html.landscape .stage-tools{right:auto;left:8px}
@media (max-width:520px){
  html.landscape .stage{width:42vw!important}
  html.landscape #app{padding-left:42vw!important}
  html.landscape .pchip{left:calc(42vw + 2%)}
  html.landscape .pchip.open .pchip-detail{left:calc(42vw + 2%)}
}
"""
    open(p,'w',encoding='utf8').write(css)
    print('style.css 已追加',len(css),'B')
