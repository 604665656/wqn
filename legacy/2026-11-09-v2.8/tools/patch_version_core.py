# -*- coding: utf-8 -*-
"""版本号机制：build.js 自动消费 pending 递增、注入页面与存档、四处显示。"""
import os
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def rw(rel,fn):
    p=os.path.join(ROOT,rel);s=open(p,encoding='utf8').read();s2=fn(s)
    assert s2!=s,rel+' 未改动';open(p,'w',encoding='utf8').write(s2);print('  patched',rel)

# ───────── build.js ─────────
def build(s):
    old="""const read=p=>fs.readFileSync(path.join(ROOT,p),'utf8');"""
    new="""const read=p=>fs.readFileSync(path.join(ROOT,p),'utf8');
/* ---------- 版本号：由 data/version.json 的 pending 驱动自动递增 ----------
   每轮内容更新前写一次 pending；首次 build 消费它：minor +0.1、build +1、
   写 changelog、清空 pending；同一轮重复 build 不再递增，避免刷号。 */
const VP=path.join(ROOT,'data','version.json');
const V=JSON.parse(fs.readFileSync(VP,'utf8'));
if(V.pending&&V.pending.title){
  const parts=String(V.version).split('.');
  const major=parseInt(parts[0],10)||1,minor=parseInt(parts[1],10)||0;
  V.version=major+'.'+(minor+1);
  V.build=(V.build||0)+1;
  V.date=new Date().toISOString().slice(0,10);
  V.changelog=V.changelog||[];
  V.changelog.unshift({version:'v'+V.version,build:V.build,date:V.date,
    title:V.pending.title,items:V.pending.items||[]});
  V.pending=null;
  fs.writeFileSync(VP,JSON.stringify(V,null,1),'utf8');
  console.log('版本递增 → v'+V.version+' (build '+V.build+')');
}else{
  console.log('版本保持 → v'+V.version+' (build '+(V.build||1)+')');
}"""
    assert old in s;s=s.replace(old,new,1)
    old2="""  kinship:JSON.parse(read('data/kinship.json')),"""
    new2="""  version:V,
  kinship:JSON.parse(read('data/kinship.json')),"""
    assert old2 in s;s=s.replace(old2,new2,1)
    old3="""const DATA='window.WQN=window.WQN||{};\\n'"""
    new3="""const DATA='window.WQN=window.WQN||{};\\n'
  +'window.WQN_VERSION='+JSON.stringify({version:V.version,build:V.build,
      date:V.date,codename:V.codename})+';\\n'"""
    assert old3 in s;s=s.replace(old3,new3,1)
    old4="""let html=read('src/shell.html')
  .replace('/*__STYLE__*/',read('src/style.css'))"""
    new4="""let html=read('src/shell.html')
  .split('/*__VERSION__*/').join('v'+V.version+' · build '+V.build+' · '+V.date)
  .replace('/*__STYLE__*/',read('src/style.css'))"""
    assert old4 in s;s=s.replace(old4,new4,1)
    old5="""console.log('构建完成：'+out);"""
    new5="""console.log('构建完成：'+out+'　v'+V.version+' (build '+V.build+')');"""
    assert old5 in s;s=s.replace(old5,new5,1)
    return s
rw('build.js',build)

# ───────── shell.html：title 与注释带版本 ─────────
def shell(s):
    s=s.replace("""<title>上下五千年 · 无尽编年</title>""",
                """<title>上下五千年 · 无尽编年 · /*__VERSION__*/</title>""",1)
    s=s.replace("""============================================================
-->
<div id="app">""",
                """============================================================
 版本：/*__VERSION__*/（版本号只标识这一份文件，不改史实、不影响旧存档）
-->
<div id="app">""",1)
    return s
rw('src/shell.html',shell)

# ───────── engine.js：存档版本字段 ─────────
def eng(s):
    old="""      seenRuler:{},seenHouse:{},houseId:null,"""
    new="""      seenRuler:{},seenHouse:{},houseId:null,
      ver:(D.version?D.version.version:'0'),"""
    assert old in s;s=s.replace(old,new,1)
    old2="""    if(typeof o.houseId==='undefined')o.houseId=null;"""
    new2="""    if(typeof o.houseId==='undefined')o.houseId=null;
    if(!o.ver)o.ver=(D.version?D.version.version:'0');"""
    assert old2 in s;s=s.replace(old2,new2,1)
    return s
rw('src/engine.js',eng)

# ───────── ui.js：四处显示 ─────────
def ui(s):
    # 工具函数：版本角标
    old="""  const $=id=>document.getElementById(id);"""
    new="""  const $=id=>document.getElementById(id);
  /* 版本号：只标识这一份可玩文件；旧存档载入后自动补当前版本字段 */
  const VER=()=>{const v=D.version||{};return 'v'+(v.version||'0')
    +' · build '+(v.build||1)+(v.date?' · '+v.date:'')};"""
    assert old in s;s=s.replace(old,new,1)
    # 1 开局页底部
    old2="""    h+='<div class="mini center" style="margin-top:14px">单文件 · 无联网 · 自动存档于本机<br>'"""
    new2="""    h+='<div class="mini center" style="margin-top:14px;color:var(--gold)">'
      +VER()+'　·　'+esc((D.version||{}).codename||'')+'</div>';
    h+='<div class="mini center" style="margin-top:6px">版本只标识这一份文件；'
      +'每次内容更新自动 +0.1，旧存档刷新后自动补版本字段，不影响续玩。</div>';
    h+='<div class="mini center" style="margin-top:14px">单文件 · 无联网 · 自动存档于本机<br>'"""
    assert old2 in s;s=s.replace(old2,new2,1)
    # 2 设置页「这一局」
    old3="""      +Object.keys(S.seenRuler||{}).length+' 位、同期名族 '+Object.keys(S.seenHouse||{}).length+' 家。'
      +'</div><button class="big alt" data-act="restart">另 起 一 局</button></div></div>';"""
    new3="""      +Object.keys(S.seenRuler||{}).length+' 位、同期名族 '+Object.keys(S.seenHouse||{}).length+' 家。<br>'
      +'文件版本 '+esc(VER())+'　·　本档起于 '+(S.ver?'v'+esc(S.ver):'旧档（已补当前版本）')
      +'　·　'+esc((D.version||{}).scheme||'')+'</div>'
      +'<button class="big alt" data-act="restart">另 起 一 局</button></div></div>';"""
    assert old3 in s;s=s.replace(old3,new3,1)
    # 3 收卷报告页脚（合上卷按钮之后）
    old4="""      +'<button class="big alt" data-act="restart">另 起 一 局</button></div>';"""
    new4="""      +'<button class="big alt" data-act="restart">另 起 一 局</button>'
      +'<div class="mini center" style="margin-top:10px;color:var(--dim)">此卷记于 '
      +esc(VER())+'　·　版本只标识文件，不是史实纪年</div></div>';"""
    assert old4 in s;s=s.replace(old4,new4,1)
    return s
rw('src/ui.js',ui)
print('版本机制补丁完成')
