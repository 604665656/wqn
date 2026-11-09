# -*- coding: utf-8 -*-
import os
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
p=os.path.join(ROOT,'src','style.css');css=open(p,encoding='utf8').read()
if 'v1.9 皮肤跟随系统' in css:
    print('已存在，跳过')
else:
    css+=r"""

/* ===== v1.9 皮肤跟随系统 / 场景与人物选择 / 互动动画 ===== */
html.skin-light{
  --bg:#f2e9d5;--paper:#fffaf0;--paper2:#efe2c8;--line:#c9b38c;
  --ink:#3a3122;--dim:#6b5940;--gold:#8d6a26;--green:#3f7a4a;--blue:#416a8a}
html.skin-light .card,html.skin-light .head,html.skin-light .volbar,
html.skin-light .st,html.skin-light .opt,html.skin-light .panel.on{
  background:#fffaf0;color:#3a3122}
html.skin-light .tierbar,html.skin-light .warnbar{background:linear-gradient(90deg,#f6ecd6,#fffaf0)}
html.skin-light .tabs{background:#f2e9d5ee}
html.skin-light .tabs button{color:#6b5940}
html.skin-light .tabs button.on{color:#8d6a26}
html.skin-light .mini,html.skin-light .s{color:#6b5940}
html.skin-light .opt,html.skin-light .card{border-color:#c9b38c}
html.skin-light .badge,html.skin-light button.pill{background:#f6ecd6;color:#5a4a32}
@media (prefers-color-scheme:light){
  html.skin-auto{
    --bg:#f2e9d5;--paper:#fffaf0;--paper2:#efe2c8;--line:#c9b38c;
    --ink:#3a3122;--dim:#6b5940;--gold:#8d6a26;--green:#3f7a4a;--blue:#416a8a}
  html.skin-auto .card,html.skin-auto .head,html.skin-auto .volbar,
  html.skin-auto .st,html.skin-auto .opt,html.skin-auto .panel.on{
    background:#fffaf0;color:#3a3122}
  html.skin-auto .tierbar,html.skin-auto .warnbar{background:linear-gradient(90deg,#f6ecd6,#fffaf0)}
  html.skin-auto .tabs{background:#f2e9d5ee}
  html.skin-auto .tabs button{color:#6b5940}
  html.skin-auto .tabs button.on{color:#8d6a26}
  html.skin-auto .mini,html.skin-auto .s{color:#6b5940}
  html.skin-auto .opt,html.skin-auto .card{border-color:#c9b38c}
  html.skin-auto .badge,html.skin-auto button.pill{background:#f6ecd6;color:#5a4a32}
}
html.skin-dark .stage-bg{filter:brightness(.82) saturate(.92)}
@media (prefers-color-scheme:dark){
  html.skin-auto .stage-bg{filter:brightness(.82) saturate(.92)}
}
html.skin-light .stage-bg,html.skin-light .stage-tools{filter:none}

/* 立绘可点可拖：位移用独立变量，不破坏 contain 与半身构图 */
.stage-char{
  transform:translateX(-50%) translate(var(--char-dx,0px),var(--char-dy,0px))!important;
  pointer-events:auto!important;cursor:grab;touch-action:none;
  transition:transform .18s ease,filter .18s ease}
html.avg .stage-char,html.landscape .stage-char,html.landscape.avg .stage-char{
  transform:translateX(-50%) translate(var(--char-dx,0px),var(--char-dy,0px))!important;
  pointer-events:auto!important}
.stage-char.ch-grab{transition:none;cursor:grabbing;
  filter:drop-shadow(0 14px 18px rgba(80,60,30,.32))}
.stage-char.ch-tap{animation:chTap .46s ease!important}
.stage-char.ch-drop{animation:chDrop .4s ease!important}
.stage-char.ch-perform{animation:chPerform .52s ease!important}
@keyframes chTap{0%{scale:1;translate:0 0}42%{scale:1.055;translate:0 -9px}100%{scale:1;translate:0 0}}
@keyframes chDrop{0%{scale:1.04;translate:0 -4px}60%{scale:.985;translate:0 3px}100%{scale:1;translate:0 0}}
@keyframes chPerform{0%{opacity:.72;scale:.985}45%{opacity:1;scale:1.02}100%{opacity:1;scale:1}}
html.rm .stage-char,html.rm .stage-bg{animation:none!important;transition:none!important}

/* 场景缩略图选择 */
.bdgrid{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:9px}
.bdpick{position:relative;display:flex;flex-direction:column;align-items:stretch;
  padding:4px;border-radius:10px;border:1px solid var(--line);
  background:var(--paper);color:var(--ink);font-family:inherit;cursor:pointer;
  font-size:calc(10px * var(--fs));overflow:hidden}
.bdpick img{width:100%;height:74px;object-fit:cover;border-radius:6px;display:block}
.bdpick span{display:block;margin-top:3px;font-weight:700}
.bdpick em{display:block;font-style:normal;color:var(--dim);font-size:calc(9px * var(--fs))}
.bdpick.on{border-color:var(--gold);box-shadow:0 0 0 2px rgba(201,162,39,.35)}
.bdpick.on em{color:var(--gold)}
.bdpick.locked{opacity:.55;cursor:not-allowed}
.bdpick.locked img{filter:grayscale(.65)}

/* 人物表演层选择 */
.layerlist{margin-top:8px}
.layerlist summary{cursor:pointer;color:var(--gold);font-size:calc(11px * var(--fs))}
.layergrid{display:grid;grid-template-columns:repeat(3,1fr);gap:5px;margin-top:7px}
.lpick{display:flex;flex-direction:column;gap:2px;padding:6px 5px;border-radius:8px;
  border:1px solid var(--line);background:var(--paper);color:var(--ink);
  font-family:inherit;font-size:calc(10px * var(--fs));cursor:pointer;text-align:left}
.lpick em{font-style:normal;color:var(--dim);font-size:calc(9px * var(--fs))}
.lpick.locked{opacity:.5;cursor:not-allowed}

/* 关卡表紧凑 + 已通关折到最后 */
.scenerow{display:flex;align-items:center;gap:6px;flex-wrap:nowrap;
  padding:4px 6px;margin:2px 0;border-radius:7px;
  background:var(--paper);border:1px solid var(--line);
  font-size:calc(10px * var(--fs));line-height:1.35}
.scenerow b{flex:0 0 auto;color:var(--ink);font-weight:700}
.scenerow .mini{flex:1 1 auto;min-width:0;overflow:hidden;
  text-overflow:ellipsis;white-space:nowrap;color:var(--dim)}
.scenerow em{flex:0 0 auto;font-style:normal;color:var(--gold);white-space:nowrap}
.scenerow.locked em{color:var(--red2)}
.scenedone{margin-top:6px;border-top:1px dashed var(--line);padding-top:6px}
.scenedone summary{cursor:pointer;color:var(--dim);font-size:calc(11px * var(--fs))}
.scenedone .scenerow{opacity:.72}
"""
    open(p,'w',encoding='utf8').write(css);print('style.css 已追加',len(css),'B')
