# -*- coding: utf-8 -*-
"""v1.7 UI/CSS 部分（stage.js 已由 patch_flat_stage.py 改好，这里只动 ui.js / style.css）。"""
import os
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P=lambda *x:os.path.join(ROOT,*x)

p=P('src','ui.js');s=open(p,encoding='utf8').read()
def urep(old,new,tag,cnt=1):
    global s
    assert old in s,'ui.js 缺 '+tag;s=s.replace(old,new,cnt);print(' ok',tag)

if "MINIMAL=1" not in s:
    urep("  let STSIZE='normal',LANDSCAPE=0,BUB='light',SETMIN=1,SETFOLD={},VMENU=0;",
         "  let STSIZE='normal',LANDSCAPE=0,BUB='veil',SETMIN=1,SETFOLD={},VMENU=0,MINIMAL=1;",'默认半透+极简')

urep("""      +'title="视图按键" aria-expanded="'+(VMENU?'true':'false')+'">⚙</button>'
      +'<div class="viewtools" role="group" aria-label="视图按键">'""",
"""      +'title="视图按键" aria-expanded="'+(VMENU?'true':'false')+'">⚙</button>'
      +'<button class="vbtn vguide'+(MINIMAL?'':' on')+'" data-minimal '
      +'aria-label="显示或隐藏主页指引" title="显示／隐藏主页指引" '
      +'aria-pressed="'+(!MINIMAL?'true':'false')+'">指引</button>'
      +'<div class="viewtools" role="group" aria-label="视图按键">'""",'指引按钮')

urep("""    const op=ev.target.closest&&ev.target.closest('[data-scene-open]');""",
"""    const mn=ev.target.closest&&ev.target.closest('[data-minimal]');
    if(mn){MINIMAL=MINIMAL?0:1;applyDisplay();return;}
    const cf=ev.target.closest&&ev.target.closest('[data-charfit]');
    if(cf){if(W.stage)W.stage.set('charfit',cf.dataset.charfit);render();return;}
    const op=ev.target.closest&&ev.target.closest('[data-scene-open]');""",'委托新分支')

urep("""  /* 设置页卡片：可单独收起、可精简隐藏；不改动生成 HTML，只做 DOM 后处理 */""",
"""  /* v1.7 主页极简：只收起指示／说明／徽章，八维与卷进度压扁但不隐藏 */
  function applyMinimal(){
    if(TAB!=='main'||typeof document==='undefined')return;
    const app=document.getElementById('app');if(!app)return;
    app.querySelectorAll('.tierbar,.head .badge').forEach(x=>x.classList.add('min-hide'));
    app.querySelectorAll('.volbar,.stats').forEach(x=>x.classList.add('min-slim'));
    app.querySelectorAll('.mini.center').forEach(x=>{
      if(/新手指引|打开指引|帮助/.test(x.textContent||''))x.classList.add('min-hide');
    });
    app.querySelectorAll('.stage-tag').forEach(x=>x.classList.add('min-hide'));
    document.querySelectorAll('.tabs').forEach(x=>x.classList.add('tabs-min'));
  }

  /* 设置页卡片：可单独收起、可精简隐藏；不改动生成 HTML，只做 DOM 后处理 */""",'applyMinimal')

urep("""    applySetCards();
  }
  function download""",
"""    r.classList.toggle('bub-light',BUB==='light');
    r.classList.toggle('bub-veil',BUB==='veil');
    r.classList.toggle('bub-normal',BUB==='normal');
    r.classList.toggle('bub-solid',BUB==='solid');
    r.classList.toggle('minimal',MINIMAL===1);
    applySetCards();
    applyMinimal();
  }
  function download""",'applyDisplay 类')

urep("""      +'把手可上下拖动调高度，内容长直接滑动。舞台三颗视图按键收进 ⚙ 齿轮，'
      +'设置卡默认精简、可单独展开；选项区没有高度上限，全部条目直接铺开。</div>'""",
"""      +'把手可上下拖动调高度，内容长直接滑动。主页默认极简：档位长说明、'
      +'新手指引入口、视角徽章与舞台角标都收起，八维与卷进度压成细条；'
      +'齿轮旁的「指引」一键恢复。选项区没有高度上限，全部条目直接铺开。</div>'
      +'<div class="switchrow"><span>主页</span><div class="viewsel">'
        +'<button data-minimal class="'+(MINIMAL?'on':'')+'">极简</button>'
        +'<button data-minimal class="'+(!MINIMAL?'on':'')+'">显示指引</button></div></div>'
      +'<div class="switchrow"><span>立绘构图</span><div class="viewsel">'
        +'<button data-charfit="full" class="'+(sg.charfit==='full'?'on':'')+'">全身</button>'
        +'<button data-charfit="half" class="'+(sg.charfit==='half'?'on':'')+'">半身</button>'
        +'<button data-charfit="auto" class="'+(sg.charfit==='auto'?'on':'')+'">自动</button></div></div>'
      +'<div class="mini" style="margin-top:6px">半身档把立绘放大、下半身落进横向气泡后面，'
      +'透过半透明气泡仍看得见角色；这是构图性放大，角色层本身完整无裁切。'
      +'自动档在开局、卷末、更迭、终章用全身，抉择与结果用半身。</div>'""",'视图卡新增两档')

urep("""        +'<button data-bubble-alpha="light" class="'+(BUB==='light'?'on':'')+'">极透</button>'
        +'<button data-bubble-alpha="normal" class="'+(BUB==='normal'?'on':'')+'">适中</button>'
        +'<button data-bubble-alpha="solid" class="'+(BUB==='solid'?'on':'')+'">实底</button></div></div>'""",
"""        +'<button data-bubble-alpha="light" class="'+(BUB==='light'?'on':'')+'">极透</button>'
        +'<button data-bubble-alpha="veil" class="'+(BUB==='veil'?'on':'')+'">半透</button>'
        +'<button data-bubble-alpha="solid" class="'+(BUB==='solid'?'on':'')+'">实底</button></div></div>'""",'透度三档')

urep("""      +'紧凑档把舞台压到一行，≡ 键直接滚到选项区。手机若锁定竖屏，横屏键只改布局、不会强行旋转系统。</div></div>';""",
"""      +'紧凑档把舞台压到一行，≡ 键直接滚到选项区。手机若锁定竖屏，横屏键只改布局、不会强行旋转系统。'
      +'气泡是扁平横条，半透能透出背景与立绘，文字带浅色描边保证看清。</div></div>';""",'视图卡说明')

urep("""      +'半身时下半身落进气泡后面仍看得见。</div>';""",
"""      +'半身时下半身落进气泡后面仍看得见。</div>';""",'开局说明占位') if False else None

# 开局说明：在 v1.6 那句后追加
old="""      +'顶部有显眼的关闭按钮、把手可拖动，按键收进 ⚙ 齿轮。</div>';"""
new="""      +'顶部有显眼的关闭按钮、把手可拖动，按键收进 ⚙ 齿轮。<br>'
      +'v1.7 起主页默认极简、气泡改成扁平横条半透，立绘可切全身／半身，'
      +'半身时下半身落进气泡后面仍看得见。</div>';"""
if old in s:urep(old,new,'开局说明')
else:print(' 开局说明锚点已变，跳过')

open(p,'w',encoding='utf8').write(s);print('ui.js 完成')

# ═══════════════ CSS ═══════════════
p=P('src','style.css');css=open(p,encoding='utf8').read()
if 'v1.7 扁平横气泡与主页极简' not in css:
    css+=r"""

/* ===== v1.7 扁平横气泡与主页极简 ===== */
.stage .bubble{left:4%;right:4%;bottom:7px;max-width:none;width:auto;
  min-height:30px;max-height:40px;padding:4px 9px;border-radius:9px;
  display:flex;align-items:center;gap:6px;flex-wrap:nowrap;
  background:linear-gradient(90deg,rgba(255,250,238,.60),rgba(247,238,220,.52));
  backdrop-filter:blur(9px);-webkit-backdrop-filter:blur(9px);
  border:1px solid rgba(120,98,68,.36);box-shadow:0 1px 4px rgba(80,64,42,.08);
  color:#2e2519;font-size:calc(12px * var(--fs));line-height:1.35}
.stage .bubble:after{display:none}
.stage .bubble .who{display:inline;flex:0 0 auto;margin:0;opacity:.78;
  font-size:calc(9px * var(--fs));letter-spacing:0;color:#8a6a30}
.stage .bubble .say{display:block;flex:1 1 auto;min-width:0;
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
  color:#2b2218;font-weight:600;
  text-shadow:0 1px 2px rgba(255,250,238,.98),0 0 3px rgba(255,250,238,.92),
              0 0 1px rgba(255,250,238,1)}
.stage .bubble .bubble-more,.stage .bubble .bubble-voice{flex:0 0 auto;float:none;
  margin:0;vertical-align:middle}
.stage .bubble.expanded{max-height:none;flex-wrap:wrap;padding:8px 10px}
.stage .bubble.expanded .say{white-space:normal;overflow:visible;text-overflow:clip;flex-basis:100%}
html.bub-veil .stage .bubble{background:linear-gradient(90deg,rgba(255,250,238,.60),rgba(247,238,220,.52))}
html.bub-light .stage .bubble{background:linear-gradient(90deg,rgba(255,250,238,.28),rgba(247,238,220,.24))}
html.bub-normal .stage .bubble{background:linear-gradient(90deg,rgba(255,250,238,.80),rgba(247,238,220,.76))}
html.bub-solid .stage .bubble{background:linear-gradient(90deg,rgba(255,250,238,.97),rgba(247,238,220,.95))}
html.bgfull .stage .bubble{background:linear-gradient(90deg,rgba(255,250,238,.64),rgba(247,238,220,.56))}
html.hc .stage .bubble{background:rgba(255,248,232,.90)}

/* 立绘放大：全身完整 / 半身构图 */
.stage.char-full .stage-char{height:100%;bottom:0;max-width:96%}
.stage.char-half .stage-char{height:176%;bottom:-62%;max-width:100%}
.stage.char-half .bubble{bottom:9px}
.stage.sz-compact .stage-char{height:92%;bottom:0;max-width:96%}
.stage.sz-immersive .stage-char{height:190px;max-width:78vw;bottom:6px}

/* 主页极简：只收指示条，史实正文、选项与数值不动 */
html.minimal .tierbar,
html.minimal .min-hide{display:none!important}
html.minimal .head{margin-top:2px;padding:2px 2px 4px}
html.minimal .head .yr{font-size:calc(17px * var(--fs))}
html.minimal .head .era{font-size:calc(10px * var(--fs))}
html.minimal .volbar,html.minimal .min-slim{
  padding:4px 7px;margin:3px 0;font-size:calc(10px * var(--fs));
  line-height:1.35;border-radius:7px}
html.minimal .min-slim .mini,html.minimal .min-slim .row{font-size:calc(10px * var(--fs))}
html.minimal .stats{gap:3px}
html.minimal .tabs-min button{padding:8px 2px;font-size:calc(10px * var(--fs));letter-spacing:0}
html.minimal .tabs-min{border-top-width:1px}
html.minimal .stage{margin-bottom:6px}
html.minimal .artwrap{margin-bottom:4px}
html:not(.minimal) .min-slim{padding:9px 2px;font-size:calc(13px * var(--fs))}
.vguide{width:auto;padding:0 8px;border-radius:14px;font-size:calc(10px * var(--fs));
  letter-spacing:0;white-space:nowrap}
.vguide.on{color:#9a7434;border-color:#9a7434;background:rgba(255,248,228,.95)}
"""
    open(p,'w',encoding='utf8').write(css);print('style.css 已追加')
