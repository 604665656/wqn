# -*- coding: utf-8 -*-
"""v2.0：朗读可关、场景内 emoji 状态条、气泡拖拽/缩放手柄、全屏预览数据接口。"""
import os
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def patch(p,pairs):
    s=open(p,encoding='utf8').read()
    for old,new,tag in pairs:
        assert old in s,p+' 缺 '+tag
        s=s.replace(old,new,1);print(' ok',tag)
    open(p,'w',encoding='utf8').write(s)

# ---------- a11y.js：朗读可在同一次点击里关掉 ----------
AP=os.path.join(ROOT,'src','a11y.js')
if 'function toggleSpeak' not in open(AP,encoding='utf8').read():
    patch(AP,[
    ("""  /* 向导台词用角色音色念；不是配音包，是系统语音的音色档 */
      function speakAs(text,role){return speak(text,{role:role||'guide',force:true});}""".replace('\n      function','\n  function'),
    """  /* 向导台词用角色音色念；不是配音包，是系统语音的音色档 */
  function speakAs(text,role){return speak(text,{role:role||'guide',force:true});}
  /* v2.0：同一个「念」按钮再点一次必须能关掉，而不是从头再念一遍。
     返回 false 表示「这次是关掉」，true 表示「这次开始念」。 */
  function toggleSpeak(text,opt){
    if(ttsBusy){stopSpeak();return false;}
    return speak(text,opt||{});
  }""",'a11y toggleSpeak'),
    ("""    speak:speak,speakAs:speakAs,guideVoices:guideVoices,""",
    """    speak:speak,speakAs:speakAs,guideVoices:guideVoices,toggleSpeak:toggleSpeak,""",
     'a11y 导出 toggleSpeak'),
    ])
else:
    print(' ok a11y 已含 toggleSpeak，跳过')

# ---------- stage.js ----------
p=os.path.join(ROOT,'src','stage.js')
s=open(p,encoding='utf8').read()
def R(old,new,tag):
    global s
    assert old in s,'stage.js 缺 '+tag
    s=s.replace(old,new,1);print(' ok',tag)

R("""  function hash(s){""",
"""  /* v2.0：场景内 emoji 状态条。只读状态，不写回存档、不调用主随机数。 */
  function hudOf(S){
    S=S||LAST||{};
    const fam=(S.fam||[]).filter(f=>f&&f.dead!==true&&f.alive!==false);
    const jobs=Object.keys(S.jobs||{}),st=S.st||{};
    return {people:fam.length,job:jobs.length?jobs[0]:'—',
      food:st.food,cohesion:st.cohesion,lore:st.lore,craft:st.craft,
      wealth:st.wealth,might:st.might,faith:st.faith};
  }
  function hudHTML(S){
    const d=hudOf(S);
    const n=v=>(v===undefined||v===null||isNaN(v))?'—':Math.round(v);
    return '<div class="stage-hud" role="status" aria-label="本族速览">'
      +'<span title="在籍人数">👥'+d.people+'</span>'
      +'<span title="族中业">⚒'+esc(d.job)+'</span>'
      +'<span title="粮">🌾'+n(d.food)+'</span>'
      +'<span title="聚">🏠'+n(d.cohesion)+'</span>'
      +'<span title="文">📜'+n(d.lore)+'</span>'
      +'<span title="财">💰'+n(d.wealth)+'</span>'
      +'</div>';
  }
  /* 全屏预览：返回当前选中场景的大图与名字，供预览层直接叠立绘 */
  function previewInfo(){
    const row=BDM.filter(x=>x.key===BACKDROP)[0]||BDM[0]||{key:'paper',name:'素纸'};
    return {key:row.key,name:row.name,desc:row.desc||'',
      bg:bgURL(),char:toURL(L.neutral),
      list:backdropList(LAST).filter(x=>x.unlocked)};
  }
  function hash(s){""",'HUD 与预览接口')

R("""    let h='<div class="stage sz-'+SIZE+' char-'+fit+'" data-fit="'+fit""",
"""    const HUD=hudHTML(S);
    let h='<div class="stage sz-'+SIZE+' char-'+fit+'" data-fit="'+fit""",'HUD 变量')

R("""        +'<span class="who">'+esc(who)+'</span>'
        +'<span class="say">'+esc(line)+'</span>'""",
"""        +'<span class="who">'+esc(who)+'</span>'
        +'<span class="bubble-grip" data-bubble-drag aria-label="拖动气泡调整位置" title="按住拖动气泡">⠿</span>'
        +'<span class="say">'+esc(line)+'</span>'""",'气泡拖拽手柄')

R("""        +'<button class="bubble-voice" data-guide="say" aria-label="用角色音色念这句" title="用角色音色念这句">念</button>'
        +'</div>';
    }
    h+='<div class="stage-tag">'+esc(tag)+'</div>'""",
"""        +'<button class="bubble-voice" data-guide="say" aria-label="用角色音色念这句，再点一次停止" title="念这句 / 再点一次停止">念</button>'
        +'<span class="bubble-resize" data-bubble-resize aria-label="拖动调整气泡宽高" title="拖动调宽高"></span>'
        +'</div>';
    }
    h+=HUD+'<div class="stage-tag">'+esc(tag)+'</div>'""",'缩放手柄与 HUD')

R("""  function speakLine(S){
    S=S||LAST;
    const t=lineOf(S,weatherOf(S),poseOf(S,weatherOf(S),{}));
    if(W.a11y&&W.a11y.speakAs)return W.a11y.speakAs(t,'guide');
    if(W.a11y&&W.a11y.speak)return W.a11y.speak(t);
    return false;
  }""",
"""  /* v2.0：再点一次「念」就停，不再从头重念 */
  function speakLine(S){
    S=S||LAST;
    const t=lineOf(S,weatherOf(S),poseOf(S,weatherOf(S),{}));
    if(W.a11y&&W.a11y.toggleSpeak)return W.a11y.toggleSpeak(t,{role:'guide',force:true});
    if(W.a11y&&W.a11y.speakAs)return W.a11y.speakAs(t,'guide');
    return false;
  }""",'speakLine 改 toggle')

R("""    progress:progress,needText:needText,unlocked:unlocked,""",
"""    progress:progress,needText:needText,unlocked:unlocked,
    hudOf:hudOf,hudHTML:hudHTML,previewInfo:previewInfo,""",'导出 HUD 与预览')

R("""      layerCount:Object.keys(L).length,""",
"""      layerCount:Object.keys(L).length,backdropCount:BDM.length,""",'status 场景数')
open(p,'w',encoding='utf8').write(s);print('stage.js 完成')
