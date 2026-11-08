# -*- coding: utf-8 -*-
"""v1.3：音效/背景音独立开关 + 朗读/语音控制/读屏友好"""
import os
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# ───────── build.js ─────────
p=os.path.join(ROOT,'build.js');s=open(p,encoding='utf8').read()
old="""'src/options.js','src/art.js','src/audio.js','src/engine.js','src/ui.js','src/main.js'];"""
new="""'src/options.js','src/art.js','src/audio.js','src/a11y.js','src/engine.js','src/ui.js','src/main.js'];"""
if old in s:s=s.replace(old,new,1);open(p,'w',encoding='utf8').write(s);print('build.js 已接入 a11y.js')
else:print('build.js 已接入（跳过）')

# ───────── shell.html ─────────
p=os.path.join(ROOT,'src','shell.html');s=open(p,encoding='utf8').read()
if 'a11yLive' not in s:
  s=s.replace('<body>\n<!--','<body>\n<a class="skip" href="#app">跳到主要内容</a>\n<div id="a11yLive" class="sr-only" role="status" aria-live="polite" aria-atomic="true"></div>\n<!--',1)
  s=s.replace('<div id="app">','<div id="app" role="main" tabindex="-1">',1)
  open(p,'w',encoding='utf8').write(s);print('shell.html 已加 skip link / live region / role=main')
else:print('shell.html 已处理（跳过）')
print('shell.html 已加 skip link / live region / role=main')

# ───────── art.js 装饰图对读屏隐藏 ─────────
p=os.path.join(ROOT,'src','art.js');s=open(p,encoding='utf8').read()
if 'focusable="false"' not in s:
  s=s.replace('      +\'role="img" aria-label="\'+escAttr(cfg.name||\'时代插画\')+\'">\'+defs(o,p,id);',
              '      +\'aria-hidden="true" focusable="false">\'+defs(o,p,id);',1)
  s=s.replace('      +\'role="img" aria-label="时代氛围横幅">\'+defs(o,p,id);',
              '      +\'aria-hidden="true" focusable="false">\'+defs(o,p,id);',1)
  open(p,'w',encoding='utf8').write(s);print('art.js 插画设为纯装饰')
else:print('art.js 已处理（跳过）')

# ───────── ui.js ─────────
p=os.path.join(ROOT,'src','ui.js');s=open(p,encoding='utf8').read()
def rep(old,new,tag,cnt=1):
    global s
    assert old in s,'未找到：'+tag;s=s.replace(old,new,cnt);print('  ok',tag)

# 1 右上角按钮组：音效 / 背景 / 全静音 / 朗读
rep("""  function sndBtn(){
    if(!W.art)return '';
    const on=sndOn(),nm=on?'声音已开 · 点此静音':'声音已关 · 点此开启';
    return '<button class="sndbtn'+(on?' on':'')+'" data-snd="toggle" title="'+nm+'">'
      +W.art.icon(on?'sound':'mute',15,'currentColor')
      +'<span>'+(on?'声开':'声关')+'</span></button>';
  }""",
"""  function sndBtn(){
    if(!W.art)return '';
    const A=AU(),st=A?A.status():{sfx:false,bgm:false,on:false},
          R=W.a11y?W.a11y.status():{read:false,tts:false};
    const one=(attr,val,ic,txt,on,title)=>'<button class="sndbtn mini'+(on?' on':'')+'" '
      +attr+'="'+val+'" aria-pressed="'+(on?'true':'false')+'" title="'+title+'" '
      +'aria-label="'+title+'">'+W.art.icon(ic,14,'currentColor')+'<span>'+txt+'</span></button>';
    return '<div class="sndgroup" role="group" aria-label="声音与朗读快捷开关">'
      +one('data-snd','sfx','note','音效',st.sfx,'音效：'+(st.sfx?'已开，点此关':'已关，点此开'))
      +one('data-snd','bgm','sound','背景',st.bgm,'背景音：'+(st.bgm?'已开，点此关':'已关，点此开'))
      +one('data-snd','toggle','mute','静音',!st.on,'全部静音／恢复全部声音')
      +one('data-read','1','brush','朗读',R.read,'朗读当前页面'+(R.tts?'':'（此浏览器不支持）'))
      +'</div>';
  }""",'sndBtn group')

# 2 音乐设置卡片：两路独立
rep("""      +'<div class="hr"></div><div class="tagline">音 乐</div>'
      +'<div class="viewsel"><button data-snd="on" class="'+(st.on?'on':'')+'">开启</button>'
      +'<button data-snd="off" class="'+(!st.on?'on':'')+'">静音</button>'
      +'<button data-snd="try">试听一段</button>'
      +'<button data-snd="auto">按本局配乐</button></div>'
      +'<div class="mini" style="margin-top:6px">当前：'+(st.on?'已开':'已关')
      +' · '+(st.available?'浏览器支持合成':'此浏览器无合成接口，自动静音')
      +' · '+esc(st.scaleName||'自动调式')+' / '+esc(st.scoreName||'自动曲目')
      +' / '+esc(st.bedName||'无底噪')+'</div>'""",
"""      +'<div class="hr"></div><div class="tagline">音 乐 · 两 路 独 立</div>'
      +'<div class="mini">音效是落笔、判读、汇流等短音；背景音是底噪与缓慢曲目。'
      +'两者可分别开关，互不影响；「全部静音」一次关掉两路。</div>'
      +'<div class="switchrow"><span>音效</span><div class="viewsel">'
        +'<button data-snd="sfx-on" class="'+(st.sfx?'on':'')+'">开</button>'
        +'<button data-snd="sfx-off" class="'+(!st.sfx?'on':'')+'">关</button>'
        +'<button data-snd="try">试听</button></div></div>'
      +'<div class="switchrow"><span>背景音</span><div class="viewsel">'
        +'<button data-snd="bgm-on" class="'+(st.bgm?'on':'')+'">开</button>'
        +'<button data-snd="bgm-off" class="'+(!st.bgm?'on':'')+'">关</button>'
        +'<button data-snd="auto">按本局配乐</button></div></div>'
      +'<div class="viewsel" style="margin-top:8px">'
        +'<button data-snd="off">全部静音</button>'
        +'<button data-snd="on">全部开启</button></div>'
      +'<div class="mini" style="margin-top:6px">当前：音效 '+(st.sfx?'开':'关')
      +' / 背景音 '+(st.bgm?'开':'关')+' · '
      +(st.available?'浏览器支持合成':'此浏览器无合成接口，自动静音')
      +' · '+esc(st.scaleName||'自动调式')+' / '+esc(st.scoreName||'自动曲目')
      +' / '+esc(st.bedName||'无底噪')+'</div>'""",'music settings')

# 3 朗读与语音卡片，插在美术说明之后、卡片结束前
rep("""      +'<div class="mini" style="margin-top:6px;color:var(--gold)">'
      +esc((D.art.meta||{}).method||'')+'</div></div>';

    h+='<div class="card"><div class="tagline">这 一 局</div><div class="mini">'""",
"""      +'<div class="mini" style="color:var(--gold)">'
      +esc((D.art.meta||{}).method||'')+'</div></div>';

    /* ===== v1.3 朗读 · 语音控制 · 读屏友好 ===== */
    const AX=W.a11y,ax=AX?AX.status():{read:false,autoRead:false,voice:false,rate:1,
      verbosity:'normal',tts:false,voiceApi:false,listening:false};
    const axOn=(k,v)=>'<button data-a11y="'+k+'" class="'+(v?'on':'')+'">'+(v?'开':'关')+'</button>';
    h+='<div class="card"><div class="tagline">朗 读 · 语 音 · 读 屏 友 好</div>'
      +'<div class="mini">用浏览器原生接口实现，不联网、不上传语音、不写存档。'
      +'朗读把当前页与全部选项念出来；语音控制只在你主动开启后才使用麦克风。</div>'
      +'<div class="switchrow"><span>朗读功能</span><div class="viewsel">'
        +axOn('read-on',ax.read)+axOn('read-off',!ax.read)
        +'<button data-a11y="try">试读本页</button>'
        +'<button data-a11y="stop">停读</button></div></div>'
      +'<div class="switchrow"><span>自动朗读新一笔</span><div class="viewsel">'
        +axOn('auto-on',ax.autoRead)+axOn('auto-off',!ax.autoRead)+'</div></div>'
      +'<div class="switchrow"><span>语速</span><div class="viewsel">'
        +[['慢',0.85],['中',1],['快',1.25]].map(x=>'<button data-rate="'+x[1]
          +'" class="'+(Math.abs(ax.rate-x[1])<0.01?'on':'')+'">'+x[0]+'</button>').join('')
        +'</div></div>'
      +'<div class="switchrow"><span>详略</span><div class="viewsel">'
        +'<button data-verb="brief" class="'+(ax.verbosity==='brief'?'on':'')+'">简</button>'
        +'<button data-verb="normal" class="'+(ax.verbosity==='normal'?'on':'')+'">全</button>'
        +'</div></div>'
      +'<div class="hr"></div><div class="tagline">语 音 控 制</div>'
      +'<div class="switchrow"><span>麦克风听令</span><div class="viewsel">'
        +axOn('voice-on',ax.voice)+axOn('voice-off',!ax.voice)+'</div></div>'
      +'<div class="mini" style="margin-top:6px">可用性：朗读接口 '
        +(ax.tts?'可用':'不可用')+' · 语音识别接口 '+(ax.voiceApi?'可用':'不可用')
      +(ax.voiceApi?'':'（本地文件或此浏览器不提供，键盘操作始终可用）')
      +' · 当前'+(ax.listening?'正在听':'未开启')+'</div>'
      +'<div class="mini" style="margin-top:6px;color:var(--gold)">可以说：'
      +esc(AX?AX.commands:'')+'</div>'
      +'<div class="mini" style="margin-top:4px">键盘：'+esc(AX?AX.keys:'')+'</div>'
      +'<div class="mini" style="margin-top:6px">读屏说明：插画已标为纯装饰自动跳过；'
      +'页签、选项与按钮都有文字标签；操作结果会写入实时播报区。</div>'
      +'<div class="mini" style="color:var(--dim)">'+esc(AX?AX.privacy:'')+'</div>'
      +'<div class="mini" style="color:var(--dim)">'+esc(AX?AX.disclaimer:'')+'</div></div>';

    h+='<div class="card"><div class="tagline">这 一 局</div><div class="mini">'""",'a11y card')

# 4 选项 aria-label
rep("""        h+='<button class="opt rich'+(i===recIdx?' suggested':'')+'" data-i="'+i+'"><span class="k">'+(i+1)+'</span>'""",
"""        const ariaTxt='选项 '+(i+1)+'：'+cleanText(o.t)
          +(gain?'，收益 '+cleanText(gain):'')+(cost?'，代价 '+cleanText(cost):'')
          +(o.risk?'，有失手可能':'')+(recIdx===i?'，新手建议':'');
        h+='<button class="opt rich'+(i===recIdx?' suggested':'')+'" data-i="'+i
          +'" aria-label="'+esc(ariaTxt)+'"><span class="k">'+(i+1)+'</span>'""",'opt aria')

# 5 cleanText helper
rep("""  const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;');""",
"""  const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const cleanText=s=>String(s||'').replace(/\\s+/g,' ').trim();""",'cleanText')

# 6 tabs aria
rep("""    tabs.innerHTML=TS.map(t=>'<button data-t="'+t[0]+'" class="'+(TAB===t[0]?'on':'')+'">'+t[1]+'</button>').join('');""",
"""    tabs.innerHTML=TS.map(t=>'<button role="tab" aria-selected="'+(TAB===t[0]?'true':'false')
      +'" data-t="'+t[0]+'" class="'+(TAB===t[0]?'on':'')+'">'+t[1]+'</button>').join('');""",'tabs aria')

# 7 声音事件绑定扩展
rep("""    app.querySelectorAll('[data-snd]').forEach(b=>b.addEventListener('click',()=>{
      const a=b.dataset.snd,au=AU();if(!au)return;
      if(a==='toggle'){au.toggle();cue('tap');}
      else if(a==='on'){au.set('on',true);cue('tap');}
      else if(a==='off'){au.set('on',false);}
      else if(a==='try'){au.set('on',true);cue('gather');}
      else if(a==='auto'){
        const z=au.autoFor(S.reg,E.eraIdx(S.year));
        au.set('score',z.score);au.set('scale',z.scale);au.set('bed',z.bed);
        au.set('on',true);cue('study');
      }
      render();
    }));""",
"""    app.querySelectorAll('[data-snd]').forEach(b=>b.addEventListener('click',()=>{
      const a=b.dataset.snd,au=AU();if(!au)return;
      if(a==='toggle'){au.toggle();cue('tap');}
      else if(a==='on'){au.set('on',true);cue('tap');}
      else if(a==='off'){au.set('on',false);}
      else if(a==='sfx'){au.set('sfx',!au.status().sfx);cue('tap');}
      else if(a==='bgm'){au.set('bgm',!au.status().bgm);cue('tap');}
      else if(a==='sfx-on'){au.set('sfx',true);cue('tap');}
      else if(a==='sfx-off'){au.set('sfx',false);}
      else if(a==='bgm-on'){au.set('bgm',true);cue('tap');}
      else if(a==='bgm-off'){au.set('bgm',false);}
      else if(a==='try'){au.set('sfx',true);cue('gather');}
      else if(a==='auto'){
        const z=au.autoFor(S.reg,E.eraIdx(S.year));
        au.set('score',z.score);au.set('scale',z.scale);au.set('bed',z.bed);
        au.set('bgm',true);cue('study');
      }
      render();
    }));
    /* v1.3 朗读与语音：只改本机辅助设置，不碰游戏状态 */
    app.querySelectorAll('[data-read]').forEach(b=>b.addEventListener('click',()=>{
      const ax=W.a11y;if(!ax)return;
      if(!ax.status().read){ax.set('read',true);}
      ax.readScreen();render();
    }));
    app.querySelectorAll('[data-a11y]').forEach(b=>b.addEventListener('click',()=>{
      const ax=W.a11y,k=b.dataset.a11y;if(!ax)return;
      if(k==='read-on')ax.set('read',true);
      else if(k==='read-off')ax.set('read',false);
      else if(k==='auto-on')ax.set('autoRead',true);
      else if(k==='auto-off')ax.set('autoRead',false);
      else if(k==='voice-on')ax.set('voice',true);
      else if(k==='voice-off')ax.set('voice',false);
      else if(k==='try'){if(!ax.status().read)ax.set('read',true);ax.readScreen();}
      else if(k==='stop')ax.stopSpeak();
      render();
    }));
    app.querySelectorAll('[data-rate]').forEach(b=>b.addEventListener('click',()=>{
      if(W.a11y)W.a11y.set('rate',+b.dataset.rate);render();
    }));
    app.querySelectorAll('[data-verb]').forEach(b=>b.addEventListener('click',()=>{
      if(W.a11y)W.a11y.set('verbosity',b.dataset.verb);render();
    }));""",'snd + a11y bindings')

# 8 render 末尾 mount + onRender（在 applyDisplay() 前）
rep("""    }));
    applyDisplay();
  }
  function applyDisplay(){""",
"""    }));
    if(W.a11y){W.a11y.mount();W.a11y.onRender(S);}
    applyDisplay();
  }
  function applyDisplay(){""",'render mount')

# 9 renderStart 声音按钮组绑定 + mount
rep("""    app.querySelectorAll('[data-snd]').forEach(b=>b.addEventListener('click',()=>{
      if(b.dataset.snd==='toggle'&&AU()){AU().toggle();cue('tap');rerender();}
    }));""",
"""    app.querySelectorAll('[data-snd]').forEach(b=>b.addEventListener('click',()=>{
      const a=b.dataset.snd,au=AU();if(!au)return;
      if(a==='toggle'){au.toggle();cue('tap');}
      else if(a==='sfx'){au.set('sfx',!au.status().sfx);cue('tap');}
      else if(a==='bgm'){au.set('bgm',!au.status().bgm);cue('tap');}
      rerender();
    }));
    app.querySelectorAll('[data-read]').forEach(b=>b.addEventListener('click',()=>{
      const ax=W.a11y;if(!ax)return;
      if(!ax.status().read)ax.set('read',true);
      ax.readScreen();rerender();
    }));
    if(W.a11y){W.a11y.mount();W.a11y.onRender(null);}""",'start bind')

# 10 开局说明补一句
rep("""      +'全部不联网、不读写存档，关闭后不产生任何音频节点。</div>';""",
"""      +'全部不联网、不读写存档，关闭后不产生任何音频节点。'
      +'v1.3 起音效与背景音可分别开关，另加朗读、语音控制与键盘操作（设置页可开）。</div>';""",'start intro')

open(p,'w',encoding='utf8').write(s)
print('ui.js v1.3 补丁完成')

# ───────── style.css ─────────
p=os.path.join(ROOT,'src','style.css');_raw=open(p,encoding='utf8').read()
css=_raw
css+="""

/* ===== v1.3 读屏友好与分路声音开关 ===== */
.skip{position:absolute;left:-9999px;top:0;z-index:99;padding:10px 14px;
  background:var(--gold);color:#15110c;font-family:inherit;font-size:14px;border-radius:0 0 8px 0}
.skip:focus{left:0}
.sr-only{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;
  overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
*:focus-visible{outline:2px solid var(--gold);outline-offset:2px}
html.hc *:focus-visible{outline:3px solid #ffd75e;outline-offset:3px}
.sndgroup{position:absolute;right:8px;top:8px;z-index:2;display:flex;gap:4px;flex-wrap:wrap;
  justify-content:flex-end;max-width:calc(100% - 16px)}
.sndgroup .sndbtn{position:static;padding:5px 7px;font-size:calc(10px * var(--fs))}
.sndbtn.mini span{font-size:calc(10px * var(--fs))}
.switchrow{display:flex;align-items:flex-start;gap:8px;flex-wrap:wrap;margin-top:8px}
.switchrow>span{min-width:88px;padding-top:7px;font-size:calc(12px * var(--fs));color:var(--dim)}
.switchrow .viewsel{flex:1;margin-top:0;min-width:150px}
[aria-pressed="true"]{box-shadow:inset 0 0 0 1px var(--gold)}
.tabs button[role="tab"]{cursor:pointer}
@media (prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important}}
"""
if 'v1.3 读屏友好与分路声音开关' not in _raw:
  open(p,'w',encoding='utf8').write(css);print('style.css 已追加')
else:print('style.css 已追加（跳过）')
