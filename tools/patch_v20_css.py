# -*- coding: utf-8 -*-
import os
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
p=os.path.join(ROOT,'src','style.css');css=open(p,encoding='utf8').read()
if 'v2.0 气泡拖放' in css:
    print('已存在，跳过')
else:
    css+=r"""

/* ===== v2.0 气泡拖放 / 全屏原稿预览 / emoji 速览 / 紧凑布局 ===== */
.stage .bubble{
  width:var(--bub-w,auto);height:var(--bub-h,auto);
  min-width:0;max-width:calc(100vw - 8px);
  transform:translate(var(--bub-dx,0px),var(--bub-dy,0px));
  transition:box-shadow .16s ease;
  overflow:visible}
.stage .bubble[style*="height"],.stage .bubble:has(.bubble-resize){}
.stage .bubble.bub-dragging{box-shadow:0 0 0 2px var(--gold),0 8px 22px #0005;z-index:20}
.pchip-detail{width:var(--bub-w,auto);height:var(--bub-h,auto);
  max-width:calc(100vw - 16px);overflow:auto}
.bubble-grip{display:inline-block;margin:0 4px 0 2px;color:var(--gold);
  font-size:calc(13px * var(--fs));cursor:grab;touch-action:none;
  user-select:none;-webkit-user-select:none;vertical-align:middle}
.bubble-grip:active{cursor:grabbing}
.bubble-resize{position:absolute;right:2px;bottom:2px;width:13px;height:13px;
  cursor:nwse-resize;touch-action:none;z-index:5;
  background:repeating-linear-gradient(135deg,transparent 0 3px,
    rgba(140,110,60,.72) 3px 5px,transparent 5px 8px)}
.bubble-voice.speaking{background:var(--red2);color:#fff6e8;border-color:var(--red2)}

/* 场景内 emoji 速览：把人口／职业／粮／聚／文／财压成一行 */
.stage-hud{position:absolute;left:8px;top:34px;z-index:5;display:flex;
  flex-wrap:wrap;gap:3px;max-width:62%}
.stage-hud span{display:inline-block;padding:2px 5px;border-radius:9px;
  font-size:calc(10px * var(--fs));line-height:1.3;white-space:nowrap;
  background:rgba(255,250,238,.72);border:1px solid rgba(120,98,68,.34);
  color:#4a3b26;backdrop-filter:blur(4px)}
html.skin-dark .stage-hud span,html.hc .stage-hud span{background:rgba(36,29,20,.82);color:#f2e4c4}
html.avg .stage-hud{top:calc(84px + env(safe-area-inset-top));left:10px}
html.landscape .stage-hud{top:36px}
@media (max-width:360px){.stage-hud span{font-size:calc(9px * var(--fs));padding:1px 4px}}

/* 缩略图右上全屏角标 */
.bdzoom{position:absolute;right:5px;top:5px;z-index:3;width:20px;height:20px;
  border-radius:6px;display:flex;align-items:center;justify-content:center;
  font-size:12px;line-height:1;background:rgba(255,250,238,.92);
  color:#6a5330;border:1px solid rgba(120,98,68,.4);cursor:zoom-in}
.bdpick.locked .bdzoom{display:none}

/* 全屏原稿预览：大图 = 当前选中场景，立绘可拖但不出方框 */
.sp-mask{position:fixed;inset:0;z-index:999;background:rgba(14,11,8,.86);
  display:flex;align-items:center;justify-content:center;padding:12px;
  backdrop-filter:blur(3px)}
.sp-box{position:relative;width:min(92vw,520px);height:min(84vh,760px);
  border:2px solid rgba(201,162,39,.7);border-radius:14px;overflow:hidden;
  background:#efe6d2;box-shadow:0 20px 60px #0009}
.sp-bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;
  pointer-events:none;user-select:none}
.sp-char{position:absolute;left:50%;bottom:6%;height:62%;width:auto;
  max-width:78%;object-fit:contain;transform:translate(-50%,0);
  pointer-events:auto;cursor:grab;touch-action:none;user-select:none;
  filter:drop-shadow(0 8px 14px rgba(70,55,30,.28))}
.sp-char.sp-grab{cursor:grabbing;filter:drop-shadow(0 16px 22px rgba(70,55,30,.4))}
.sp-bar{position:absolute;left:0;right:0;top:0;z-index:6;display:flex;
  align-items:center;gap:6px;flex-wrap:wrap;padding:7px 9px;
  background:rgba(24,20,15,.82);color:#f4e8cf;font-size:calc(11px * var(--fs))}
.sp-bar b{margin-right:auto;color:var(--gold);font-weight:600}
.sp-keys{display:flex;gap:4px;flex-wrap:wrap;max-width:70%}
.sp-keys button,.sp-bar>[data-sp-close]{font-family:inherit;cursor:pointer;
  border:1px solid rgba(201,162,39,.45);border-radius:14px;padding:3px 8px;
  background:rgba(255,250,238,.10);color:#f4e8cf;font-size:calc(10px * var(--fs))}
.sp-keys button.on{background:rgba(201,162,39,.34);border-color:var(--gold)}
.sp-bar>[data-sp-close]{background:rgba(184,71,47,.7);border-color:var(--red2)}
.sp-tip{position:absolute;left:8px;right:8px;bottom:8px;z-index:6;text-align:center;
  font-size:calc(10px * var(--fs));color:#5a4930;
  background:rgba(255,250,238,.74);border-radius:10px;padding:4px 8px}

/* 长按立绘的表情选择面板 */
.pose-picker{position:fixed;inset:0;z-index:1000;background:rgba(14,11,8,.32)}
.pp-inner{position:absolute;width:min(88vw,340px);max-height:70vh;overflow:auto;
  border:1px solid var(--line);border-radius:12px;padding:10px 12px;
  background:var(--paper);box-shadow:0 14px 40px #0008}
.pp-head{display:flex;align-items:center;justify-content:space-between;
  color:var(--gold);font-size:calc(12px * var(--fs));margin-bottom:8px}
.pp-head button{border:1px solid var(--line);border-radius:50%;width:24px;height:24px;
  background:transparent;color:var(--ink);cursor:pointer;font-family:inherit}
.pp-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:5px}
.pp-grid button{border:1px solid var(--line);border-radius:8px;padding:6px 3px;
  background:var(--paper2);color:var(--ink);font-family:inherit;
  font-size:calc(10px * var(--fs));cursor:pointer}
.pp-grid button:active{border-color:var(--gold);color:var(--gold)}

/* 设置页：气泡控制与环境音选择 */
.bubctl{display:grid;grid-template-columns:1fr 1fr;gap:5px 10px;margin-top:8px}
.bubctl label{display:flex;align-items:center;gap:5px;
  font-size:calc(10px * var(--fs));color:var(--dim)}
.bubctl input[type=range]{flex:1;min-width:60px;accent-color:var(--gold);cursor:pointer}
.bubctl b{min-width:30px;text-align:right;color:var(--gold);font-weight:400}
.wxgrid{display:grid;grid-template-columns:repeat(2,1fr);gap:5px;margin-top:8px}
.wxpick{display:flex;flex-direction:column;gap:2px;text-align:left;
  padding:6px 8px;border:1px solid var(--line);border-radius:9px;
  background:var(--paper);color:var(--ink);font-family:inherit;cursor:pointer}
.wxpick b{font-size:calc(11px * var(--fs));font-weight:600}
.wxpick em{font-style:normal;font-size:calc(9px * var(--fs));color:var(--dim)}
.wxpick.on{border-color:var(--gold);background:var(--paper2)}
.wxpick.on b{color:var(--gold)}
.wxpick.locked{opacity:.5;cursor:not-allowed}

/* 沉浸全屏：铺满的底图 = 当前选中场景板，不残留旧图 */
html.bgfull body:before{background:var(--stage-bg) center 42%/cover no-repeat}
html.bgfull .stage-bg{position:fixed;inset:0;width:100vw;height:100vh;
  object-fit:cover;z-index:-2;opacity:.96}

/* 首页与选项更紧凑：两行八维压成一行，选项留白收窄 */
html.minimal.avg .stats{grid-template-columns:repeat(8,1fr);gap:3px;margin:5px 0}
html.minimal.avg .st{padding:3px 2px;text-align:center;border-radius:6px}
html.minimal.avg .st b{font-size:calc(12px * var(--fs));line-height:1.25}
html.minimal.avg .st span{font-size:calc(9px * var(--fs));letter-spacing:0}
html.minimal.avg .st .bar{display:none}
html.minimal .card{padding:9px 10px;margin-top:7px}
html.minimal .head{padding:8px 10px}
html.minimal .yr{font-size:calc(21px * var(--fs))}
html.minimal .volbar{padding:7px 10px;margin-top:6px}
html.minimal .opts{gap:6px;margin-top:9px}
html.minimal .opt{padding:8px 10px;min-height:0;border-radius:9px}
html.minimal .opt.rich{padding:7px 10px 8px}
html.minimal .opt .t{font-size:calc(14px * var(--fs));line-height:1.35}
html.minimal .opt.rich .t{font-size:calc(13.5px * var(--fs));line-height:1.4}
html.minimal .opt.rich .badge{margin-bottom:3px}
html.minimal .opt.rich .basis{margin-top:3px}
html.minimal .opt.rich .estat{margin-top:3px;gap:2px 10px}
html.minimal .opt.rich .risk,html.minimal .opt.rich .req{margin-top:3px}
html.minimal .big{min-height:44px;padding:10px;margin-top:9px}
html.minimal .result{margin-top:9px;padding:8px 10px}

/* 浅色皮肤下新组件也翻成暖纸底深字 */
html.skin-light .wxpick,html.skin-light .pp-grid button,
html.skin-light .bubctl label,html.skin-light .sp-tip{background:#f6ecd6;color:#3a3122}
html.skin-light .wxpick.on{background:#e9d6ac}
html.skin-light .stage-hud span{background:rgba(255,250,238,.82);color:#4a3b26}
@media (prefers-color-scheme:light){
  html.skin-auto .wxpick,html.skin-auto .pp-grid button,
  html.skin-auto .bubctl label{background:#f6ecd6;color:#3a3122}
  html.skin-auto .wxpick.on{background:#e9d6ac}
}
html.rm .sp-char,html.rm .stage .bubble{transition:none!important;animation:none!important}
"""
    open(p,'w',encoding='utf8').write(css);print('style.css 已追加',len(css),'B')
