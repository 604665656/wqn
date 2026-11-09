# -*- coding: utf-8 -*-
"""v1.0：帝王在位时间条 UI、题库第 9 类、世家数量动态化。"""
import os
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
p=os.path.join(ROOT,'src','ui.js');s=open(p,encoding='utf8').read()
def rep(old,new,tag,cnt=1):
    global s
    assert old in s,tag+' 未找到';s=s.replace(old,new,cnt);print('  ok',tag)

# A 工具函数：时间条 SVG
rep("""  const VER=()=>{const v=D.version||{};return 'v'+(v.version||'0')
    +' · build '+(v.build||1)+(v.date?' · '+v.date:'')};""",
"""  const VER=()=>{const v=D.version||{};return 'v'+(v.version||'0')
    +' · build '+(v.build||1)+(v.date?' · '+v.date:'')};
  /* v1.0 帝王在位时间条：横轴为该政权自身的年份区间，一行一位，
     行色按「可考／旁支推举／摄政共治／废立复辟／存疑／传说」分。
     只画区间与继立口径，不宣称精确边界、不把并立政权排成一条线。 */
  let TLZ=1;
  const TLCOLOR={normal:'#c9a227',collateral:'#7fb3d5',regency:'#8e7cc3',
    broken:'#c96a6a',disputed:'#8f8067',legend:'#5d574c'};
  function dyTimelineSVG(polity){
    const DY=W.dynasty,d=DY?DY.timelineData(polity):null;
    if(!d)return '<div class="mini">此政权暂无可画纪年锚点。</div>';
    const W0=760,L=152,R=18,TOP=18,ROW=17;
    const H=TOP+d.rows.length*ROW+30;
    const span=Math.max(1,d.to-d.from);
    const X=y=>L+(y-d.from)/span*(W0-L-R);
    let o='<svg id="dyTlSvg" viewBox="0 0 '+W0+' '+H+'" '
      +'style="width:760px;min-width:100%;height:'+H+'px;background:#15110c;border-radius:8px" '
      +'xmlns="http://www.w3.org/2000/svg">';
    /* 年份刻度 */
    for(let i=0;i<=4;i++){
      const y=d.from+span*i/4,x=X(y);
      o+='<line x1="'+x.toFixed(1)+'" y1="'+TOP+'" x2="'+x.toFixed(1)+'" y2="'
        +(TOP+d.rows.length*ROW)+'" stroke="#3a3122" stroke-width="1"/>'
        +'<text x="'+x.toFixed(1)+'" y="'+(H-8)+'" fill="#8f8067" font-size="10" '
        +'text-anchor="middle" font-family="sans-serif">'
        +(y<0?'前'+Math.round(-y):'公'+Math.round(y))+'</text>';
    }
    d.rows.forEach((r,i)=>{
      const yy=TOP+i*ROW+2,x0=X(r.y0),x1=Math.max(x0+3,X(r.y1));
      const col=TLCOLOR[r.cat]||TLCOLOR.normal;
      const dash=(r.cat==='legend'||r.cat==='disputed')?' stroke-dasharray="3,2"':'';
      o+='<text x="4" y="'+(yy+9)+'" fill="#d8c9a8" font-size="10" '
        +'font-family="sans-serif">'+esc(r.name.length>11?r.name.slice(0,11)+'…':r.name)+'</text>'
        +'<line x1="'+L+'" y1="'+(yy+6)+'" x2="'+(W0-R)+'" y2="'+(yy+6)
        +'" stroke="#241d13" stroke-width="1"/>'
        +'<rect x="'+x0.toFixed(1)+'" y="'+yy+'" width="'+(x1-x0).toFixed(1)
        +'" height="11" rx="2" fill="'+col+'"'+dash+' opacity="0.88">'
        +'<title>'+esc(r.name+' · '+r.raw+' · '+(r.succ||'继立未详')
          +(r.note?' · '+r.note:''))+'</title></rect>';
    });
    o+='</svg>';
    return o;
  }
  function dyTimelineLegend(){
    const DY=W.dynasty;if(!DY)return '';
    return '<div class="mini" style="margin-top:6px">图例：'
      +Object.keys(DY.TL_LABEL).map(k=>'<span style="color:'+TLCOLOR[k]+'">■ '
        +esc(DY.TL_LABEL[k])+'</span>').join('　')
      +'<br>虚线为传说／存疑层。条长只表示年代窗口，不表示权力强弱；'
      +'共治、废立、追尊、并立已在色别里分开，不排成前后相续的帝系。</div>';
  }""",'tl svg helpers')

# B 帝王全册卡：插时间条
rep("""      h+='<details class="fold"><summary>边 界 读 法 · '+DR.notes.length
        +' 条</summary>'+DR.notes.map(t=>'<div class="row"><b>'+esc(t.title)
        +'</b><div class="mini">'+esc(t.text)+'</div></div>').join('')+'</details>';
      Object.keys(RG).forEach((k,i)=>h+=dyFold('帝 王 · '+k,RG[k],'R:'+i,'r'));""",
"""      h+='<details class="fold"><summary>边 界 读 法 · '+DR.notes.length
        +' 条</summary>'+DR.notes.map(t=>'<div class="row"><b>'+esc(t.title)
        +'</b><div class="mini">'+esc(t.text)+'</div></div>').join('')+'</details>';
      /* v1.0 在位时间条：默认选本局文明圈第一个有锚点的政权 */
      const PN=DY.polityNames();
      const defP=PN.find(k=>{const z=DY.timelineData(k);
        return z&&RG[k]&&RG[k].some(x=>x.region===S.reg);})||PN.find(k=>DY.timelineData(k))||PN[0];
      h+='<div class="card" style="margin-top:8px"><div class="tagline">帝 王 在 位 时 间 条 · '
        +'按政权画区间</div>'
        +'<div class="viewsel" style="flex-wrap:wrap;margin-bottom:6px">'
        +'<select id="dyTlPolity" style="background:#1d1811;color:var(--ink);border:1px solid var(--line);'
        +'border-radius:8px;padding:6px;font-family:inherit;font-size:12px">'
        +PN.map(k=>'<option value="'+esc(k)+'"'+(k===defP?' selected':'')+'>'
          +esc(k)+' · '+(RG[k]||[]).length+' 位</option>').join('')+'</select>'
        +'<button class="pill" data-dytl="out">－</button>'
        +'<button class="pill" data-dytl="reset">复位</button>'
        +'<button class="pill" data-dytl="in">＋</button></div>'
        +'<div id="dyTlWrap" style="overflow-x:auto">'+dyTimelineSVG(defP)+'</div>'
        +dyTimelineLegend()+'</div>';
      Object.keys(RG).forEach((k,i)=>h+=dyFold('帝 王 · '+k,RG[k],'R:'+i,'r'));""",'tl card')

# C 题库分类 +1
rep("""                  ['ruler','辨帝王称谓 · 帝王全册'],
                  ['house','辨世家读法 · 世家全册']];""",
"""                  ['ruler','辨帝王称谓 · 帝王全册'],
                  ['house','辨世家读法 · 世家全册'],
                  ['succession','辨继立方式 · 帝王与制度']];""",'qKinds +1')

# D 世家全册副标题动态化 + 版本行
rep("""      h+='<div class="card"><div class="tagline">世 家 全 册 · '+DH.houses.length
        +' 家 · '+Object.keys(HG).length+' 类</div>'""",
"""      h+='<div class="card"><div class="tagline">世 家 全 册 · '+DH.houses.length
        +' 家 · '+Object.keys(HG).length+' 类　<span style="color:var(--dim);font-size:10px">'
        +esc(VER())+'</span></div>'""",'house title ver')

# E render 末尾：绑定时间条事件（放在 ppIn 附近）
rep("""    const ppIn=document.getElementById('ppSearch');""",
"""    /* v1.0 帝王在位时间条：切换政权重画，＋／－ 只改 SVG 显示宽度，横向可滚动 */
    const tlSel=document.getElementById('dyTlPolity'),tlWrap=document.getElementById('dyTlWrap');
    const tlResize=z=>{const g=document.getElementById('dyTlSvg');
      if(g)g.style.width=(760*z)+'px';};
    if(tlSel&&tlWrap){
      tlSel.addEventListener('change',()=>{
        TLZ=1;tlWrap.innerHTML=dyTimelineSVG(tlSel.value);tlResize(1);
      });
      app.querySelectorAll('[data-dytl]').forEach(b=>b.addEventListener('click',()=>{
        const a=b.dataset.dytl;
        TLZ=a==='reset'?1:Math.max(0.6,Math.min(4,TLZ+(a==='in'?0.25:-0.25)));
        tlResize(TLZ);
      }));
    }
    const ppIn=document.getElementById('ppSearch');""",'tl bind')

open(p,'w',encoding='utf8').write(s)
print('UI v1.0 补丁完成')
