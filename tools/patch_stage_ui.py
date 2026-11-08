# -*- coding: utf-8 -*-
"""v1.4：AVG 舞台接入 UI、设置页、事件与天气环境音。"""
import os
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# ── stage.js 支持外部工具条 ──
p=os.path.join(ROOT,'src','stage.js');s=open(p,encoding='utf8').read()
old="""    h+='<div class="stage-tag">'+esc(tag)+'</div>'
      +(opt.settings?'<button class="stage-mini" data-stage="toggle" aria-label="隐藏舞台">纯文字</button>':'')
      +'</div>';"""
new="""    h+='<div class="stage-tag">'+esc(tag)+'</div>'
      +(opt.tools?'<div class="stage-tools">'+opt.tools+'</div>':'')
      +(opt.settings?'<button class="stage-mini" data-stage="toggle" aria-label="隐藏舞台">纯文字</button>':'')
      +'</div>';"""
assert old in s;s=s.replace(old,new,1);open(p,'w',encoding='utf8').write(s)
print('stage.js 支持 tools')

# ── ui.js ──
p=os.path.join(ROOT,'src','ui.js');s=open(p,encoding='utf8').read()
def rep(old,new,tag,cnt=1):
    global s
    assert old in s,'未找到：'+tag;s=s.replace(old,new,cnt);print('  ok',tag)

# 1 render 顶部：main 页签用舞台
rep("""    let h=artTopHTML(S,false);""",
"""    let h;
    if(!ARTON)h='<div class="artwrap artbare">'+sndBtn()+'</div>';
    else if(TAB==='main'&&W.stage)h=W.stage.stageHTML(S,{tools:sndBtn()});
    else h=artTopHTML(S,false);""",'render top')

# 2 renderStart 顶部
rep("""    const startS={year:-5000,reg:START.reg,vol:{n:1},phase:'start'};
    let h=artTopHTML(startS,true);""",
"""    const startS={year:-5000,reg:START.reg,vol:{n:1},phase:'start'};
    let h=(ARTON&&W.stage)?W.stage.stageHTML(null,{tools:sndBtn()}):artTopHTML(startS,true);""",'start top')

# 3 开局说明补舞台一句
rep("""      +'v1.3 起音效与背景音可分别开关，另加朗读、语音控制与键盘操作（设置页可开）。</div>';""",
"""      +'v1.3 起音效与背景音可分别开关，另加朗读、语音控制与键盘操作（设置页可开）。<br>'
      +'v1.4 起改为单张暖米纸背景 + 可换的「哈士喵」角色层：完整露出不裁剪，'
      +'表情动作随情境与天气变化，台词走气泡框；朗读仍默认关闭。</div>';""",'start intro')

# 4 设置页：在「声 与 色」卡片之前插入「舞 台」卡片
rep("""    /* ===== v1.2 声 与 色 ===== */
    const AU2=AU(),st=AU2?AU2.status()""",
"""    /* ===== v1.4 AVG 舞 台 ===== */
    const SG=W.stage,sg=SG?SG.status():{stage:true,bubble:true,layers:0,bg:false};
    h+='<div class="card"><div class="tagline">舞 台 · 哈 士 喵</div>'
      +'<div class="mini">角色层从纯品红实心源图抠出，九层孔洞数均为 0，'
      +'叠在同一张暖米纸厚涂背景板上；同一个背景换角色，不再为每个表情多存整图。</div>'
      +'<div class="switchrow"><span>显示舞台</span><div class="viewsel">'
        +'<button data-stage="1" class="'+(sg.stage?'on':'')+'">显示</button>'
        +'<button data-stage="0" class="'+(!sg.stage?'on':'')+'">隐藏</button></div></div>'
      +'<div class="switchrow"><span>气泡台词</span><div class="viewsel">'
        +'<button data-bubble="1" class="'+(sg.bubble?'on':'')+'">开</button>'
        +'<button data-bubble="0" class="'+(!sg.bubble?'on':'')+'">关</button></div></div>'
      +'<div class="mini" style="margin-top:6px">当前 '+sg.layers+' 层角色 / '
      +(sg.bg?'1 张背景板':'无背景板')+' · 天气：晴／雨／阴／夜，每三笔一换，'
      +'太阳与飞鸟、雨丝、云层、星月都是离线 CSS 动画；晴天有合成鸟鸣、落雨有雨声，'
      +'只在底噪设为「自动」时跟随天气。</div>'
      +'<div class="mini" style="margin-top:6px;color:var(--gold)">'
      +esc(SG?SG.verify:'')+'</div>'
      +'<div class="mini" style="color:var(--dim)">'+esc(SG?SG.note:'')+'</div>'
      +'<div class="mini" style="color:var(--dim)">'+esc(SG?SG.method:'')+'</div>'
      +'<div class="mini" style="margin-top:6px">朗读默认关闭，文字全部留在画面上；'
      +'角色用完整 contain 显示，任何页签都不会把头顶、脚底或尾巴裁掉。</div></div>';

    /* ===== v1.2 声 与 色 ===== */
    const AU2=AU(),st=AU2?AU2.status()""",'stage card')

# 5 声与色卡片里「美术」段补一句舞台分工
rep("""      +'<div class="mini" style="margin-top:6px">时代色板 '+W.art.eras.length""",
"""      +'<div class="mini" style="margin-top:6px">主屏改由「舞 台」负责视觉；'
      +'这里的程序化插画用于其他页签与纯文字之外的氛围，两者互不联网。</div>'
      +'<div class="mini" style="margin-top:6px">时代色板 '+W.art.eras.length""",'art note')

# 6 事件绑定：舞台与气泡
rep("""    app.querySelectorAll('[data-art]').forEach(b=>b.addEventListener('click',()=>{
      ARTON=+b.dataset.art;cue('tap');render();
    }));""",
"""    app.querySelectorAll('[data-art]').forEach(b=>b.addEventListener('click',()=>{
      ARTON=+b.dataset.art;cue('tap');render();
    }));
    /* v1.4 舞台与气泡：只改本机显示设置，不动游戏状态 */
    app.querySelectorAll('[data-stage]').forEach(b=>b.addEventListener('click',()=>{
      if(W.stage)W.stage.set('stage',+b.dataset.stage);cue('tap');render();
    }));
    app.querySelectorAll('[data-bubble]').forEach(b=>b.addEventListener('click',()=>{
      if(W.stage)W.stage.set('bubble',+b.dataset.bubble);cue('tap');render();
    }));""",'stage bindings')

# 7 render 末尾天气环境音
rep("""    if(W.a11y){W.a11y.mount();W.a11y.onRender(S);}
    applyDisplay();""",
"""    if(W.a11y){W.a11y.mount();W.a11y.onRender(S);}
    if(W.stage&&ARTON&&TAB==='main')W.stage.audioWeather(S);
    applyDisplay();""",'weather audio')

# 8 renderStart 顶部工具组绑定（舞台里的 sndBtn）
rep("""    app.querySelectorAll('[data-snd]').forEach(b=>b.addEventListener('click',()=>{
      const a=b.dataset.snd,au=AU();if(!au)return;
      if(a==='toggle'){au.toggle();cue('tap');}""",
"""    if(W.stage&&ARTON)W.stage.audioWeather(null);
    app.querySelectorAll('[data-snd]').forEach(b=>b.addEventListener('click',()=>{
      const a=b.dataset.snd,au=AU();if(!au)return;
      if(a==='toggle'){au.toggle();cue('tap');}""",'start weather')

open(p,'w',encoding='utf8').write(s)
print('ui.js v1.4 补丁完成')

# ── style.css ──
p=os.path.join(ROOT,'src','style.css');css=open(p,encoding='utf8').read()
if 'v1.4 AVG 舞台' not in css:
    css+="""

/* ===== v1.4 AVG 舞台：单背景 + 角色层 + 天气动画 + 气泡框 ===== */
.stage{position:relative;width:100%;height:268px;margin:0 0 10px;border-radius:12px;
  overflow:hidden;border:1px solid var(--line);background:#e9dcc6;
  isolation:isolate}
.stage-bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;
  object-position:center 42%;display:block;z-index:0}
.stage-char{position:absolute;left:50%;bottom:6px;transform:translateX(-50%);
  height:88%;max-width:92%;width:auto;object-fit:contain;display:block;z-index:2;
  filter:drop-shadow(0 6px 8px rgba(90,74,52,.16));pointer-events:none}
.stage .bubble{position:absolute;left:10px;right:10px;bottom:8px;z-index:4;
  display:block;box-sizing:border-box;padding:9px 12px 10px;border-radius:12px;
  background:linear-gradient(180deg,rgba(255,250,238,.95),rgba(247,238,220,.94));
  border:1px solid rgba(120,98,68,.55);box-shadow:0 3px 10px rgba(80,64,42,.18);
  color:#3a3122;font-size:calc(12px * var(--fs));line-height:1.65}
.stage .bubble:after{content:"";position:absolute;left:34px;bottom:-7px;width:12px;height:12px;
  background:rgba(247,238,220,.94);border-right:1px solid rgba(120,98,68,.55);
  border-bottom:1px solid rgba(120,98,68,.55);transform:rotate(45deg)}
.stage .bubble .who{display:block;font-size:calc(10px * var(--fs));letter-spacing:.08em;
  color:#9a7434;margin-bottom:2px}
.stage .bubble .say{display:block}
.stage-tag{position:absolute;left:9px;top:9px;z-index:4;padding:3px 8px;border-radius:12px;
  background:rgba(255,250,238,.82);border:1px solid rgba(120,98,68,.35);
  color:#6a5940;font-size:calc(10px * var(--fs))}
.stage-tools{position:absolute;right:8px;top:8px;z-index:6}
.stage-tools .sndgroup{position:static;max-width:none}
.stage-tools .sndbtn{background:rgba(255,250,238,.9);color:#6a5940;border-color:rgba(120,98,68,.4)}
.stage-tools .sndbtn.on{color:#9a7434;border-color:#9a7434;background:rgba(255,248,228,.94)}
.stage-mini{position:absolute;right:10px;bottom:10px;z-index:5;font-family:inherit;
  font-size:calc(10px * var(--fs));padding:4px 8px;border-radius:12px;
  border:1px solid rgba(120,98,68,.45);background:rgba(255,250,238,.9);color:#6a5940;cursor:pointer}
/* 天气层 */
.wx{position:absolute;inset:0;z-index:1;pointer-events:none;overflow:hidden}
.wx-sun .halo{position:absolute;right:12%;top:-30px;width:150px;height:150px;border-radius:50%;
  background:radial-gradient(circle,rgba(255,236,178,.62),rgba(255,236,178,0) 68%);
  animation:sunPulse 7s ease-in-out infinite}
.wx-sun .birds{position:absolute;left:-30%;top:22%;width:52%;height:26%;
  animation:birdFly 17s linear infinite}
.wx-rain{background:repeating-linear-gradient(105deg,rgba(150,170,190,0) 0 13px,
  rgba(150,170,190,.34) 13px 14px,rgba(150,170,190,0) 14px 26px);
  animation:rainFall .75s linear infinite}
.wx-rain i{position:absolute;top:-10%;width:2px;height:26px;border-radius:2px;
  background:rgba(170,190,210,.6);animation:drop 1.5s linear infinite}
.wx-rain i:nth-child(1){left:18%;animation-delay:.1s}
.wx-rain i:nth-child(2){left:52%;animation-delay:.6s}
.wx-rain i:nth-child(3){left:81%;animation-delay:1.05s}
.wx-rain svg{position:absolute;left:8%;top:6%;width:56%;height:30%;opacity:.7;
  animation:cloudDrift 12s ease-in-out infinite alternate}
.wx-cloud svg{position:absolute;left:-18%;top:8%;width:120%;height:44%;
  animation:cloudDrift 14s ease-in-out infinite alternate}
.wx-night{background:linear-gradient(180deg,rgba(42,46,72,.30),rgba(42,46,72,0) 72%)}
.wx-night .moon{position:absolute;right:16%;top:14%;width:38px;height:38px;border-radius:50%;
  background:rgba(255,248,220,.88);box-shadow:0 0 22px rgba(255,246,210,.7)}
.wx-night i{position:absolute;width:2px;height:2px;border-radius:50%;background:#fff8dc;
  animation:twinkle 3s ease-in-out infinite}
.wx-night i:nth-child(2){left:12%;top:18%;animation-delay:.3s}
.wx-night i:nth-child(3){left:28%;top:9%;animation-delay:1.1s}
.wx-night i:nth-child(4){left:44%;top:26%;animation-delay:.7s}
.wx-night i:nth-child(5){left:62%;top:12%;animation-delay:1.8s}
.wx-night i:nth-child(6){left:76%;top:30%;animation-delay:.2s}
.wx-night i:nth-child(7){left:88%;top:16%;animation-delay:1.4s}
.wx-night i:nth-child(8){left:35%;top:36%;animation-delay:2.2s}
@keyframes sunPulse{0%,100%{opacity:.65;transform:scale(1)}50%{opacity:.95;transform:scale(1.08)}}
@keyframes birdFly{0%{transform:translateX(0)}100%{transform:translateX(250%)}}
@keyframes rainFall{0%{background-position:0 0}100%{background-position:-26px 52px}}
@keyframes drop{0%{transform:translateY(-40px);opacity:0}20%{opacity:.8}100%{transform:translateY(330px);opacity:0}}
@keyframes cloudDrift{0%{transform:translateX(0)}100%{transform:translateX(9%)}}
@keyframes twinkle{0%,100%{opacity:.35}50%{opacity:1}}
@media (prefers-reduced-motion:reduce){
  .wx *,.wx{animation:none!important}
}
@media (max-width:360px){.stage{height:236px}}
html.hc .stage{border-color:#8a7550}
html.hc .stage .bubble{background:#fff8e8;border-color:#8a7550;color:#241c12}
"""
    open(p,'w',encoding='utf8').write(css)
    print('style.css 已追加舞台样式')
else:print('style.css 已追加（跳过）')
