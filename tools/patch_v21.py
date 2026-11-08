# -*- coding: utf-8 -*-
"""v2.1：8 个新层接入选项表演、全屏预览也能点/长按立绘、重绘后朗读开关不丢。"""
import os
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def ed(p,pairs):
    s=open(p,encoding='utf8').read()
    for a,b,tag in pairs:
        assert a in s,p+' 缺 '+tag
        s=s.replace(a,b,1);print(' ok',tag)
    open(p,'w',encoding='utf8').write(s)

# ---- stage.js：选项表演映射接入新层 ----
ed(os.path.join(ROOT,'src','stage.js'),[
("""    const K=[['think','研习|考据|辨|读法|判读|问|未得|存疑'],""",
"""    /* v2.1：新补的 8 层按更具体的词优先匹配，放在通用映射之前 */
    const K=[['weave2','织|纺|染|布|匹|缫|机杼|经纬'],
      ['plaster','版筑|夯|墙|墉|抹|土功'],
      ['ferry','津|渡|篙|摆渡|济川|舟楫'],
      ['granary','仓|廪|储|赈|积|量入|备荒'],
      ['astro','观星|星|历|候气|授时|天象|晷'],
      ['mint','铸币|钱币|圜法|泉|币|成色'],
      ['mask2','傩|面|礼容|扮演|假面|仪容'],
      ['drum2','鼓|更点|聚众|桴|鼍'],
      ['think','研习|考据|辨|读法|判读|问|未得|存疑'],""",
 'poseForOption 新层映射'),
("""  /* v2.0：场景内 emoji 状态条。只读状态，不写回存档、不调用主随机数。 */""",
"""  /* v2.1：新层能否用于选项表演，随该层自己的解锁条件开放 */
  function optionPoseReady(k,p){return has(k)&&unlocked(layerUnlockAt(k),p);}
  /* v2.0：场景内 emoji 状态条。只读状态，不写回存档、不调用主随机数。 */""",
 'optionPoseReady'),
("""    poseForOption:poseForOption,layerURL:k=>L[k]?toURL(L[k]):'',""",
"""    poseForOption:poseForOption,optionPoseReady:optionPoseReady,
    layerURL:k=>L[k]?toURL(L[k]):'',""",
 '导出 optionPoseReady'),
])

# ---- ui.js ----
p=os.path.join(ROOT,'src','ui.js');s=open(p,encoding='utf8').read()
def R(a,b,tag,cnt=1):
    global s
    assert a in s,'ui.js 缺 '+tag
    s=s.replace(a,b,cnt);print(' ok',tag)

R("""      LONGT=0,LONGFIRED=0,POSEPANEL=null,PREVIEW=null,SPDRAG=null,SPOFF={x:0,y:0},SAYING=0;""",
"""      LONGT=0,LONGFIRED=0,POSEPANEL=null,PREVIEW=null,SPDRAG=null,SPOFF={x:0,y:0},SAYING=0;
  /* v2.1：全屏预览里立绘也能短按震动 / 长按选表情 */
  let SPLONGT=0,SPMOVED=0,IS_PREVIEW=0;""",'预览长按状态')

# 预览里选表情时同步预览立绘
R("""    if(ppp){performLayer(ppp.dataset.posePick,1200);closePosePanel();vibe(12);return;}""",
"""    if(ppp){
      const k=ppp.dataset.posePick;
      performLayer(k,1200);
      /* 全屏原稿预览里选的表情，预览立绘同步换上，不是只改主舞台 */
      if(PREVIEW&&W.stage&&W.stage.layerURL){
        const sp=document.querySelector('#scenePreview .sp-char');
        const u=W.stage.layerURL(k);
        if(sp&&u)sp.src=u;
      }
      closePosePanel();vibe(12);return;
    }""",'预览表情同步')

# pointerdown 预览立绘分支
R("""      if(spc){
        const r0=spc.getBoundingClientRect();
        SPDRAG={el:spc,x:e.clientX,y:e.clientY,
          left0:r0.left,top0:r0.top,w:r0.width,h:r0.height};
        spc.classList.add('sp-grab');return;
      }""",
"""      if(spc){
        const r0=spc.getBoundingClientRect();
        SPDRAG={el:spc,x:e.clientX,y:e.clientY,
          left0:r0.left,top0:r0.top,w:r0.width,h:r0.height};
        SPMOVED=0;IS_PREVIEW=1;
        spc.classList.add('sp-grab');
        clearTimeout(SPLONGT);
        SPLONGT=setTimeout(()=>{
          if(!SPDRAG||SPMOVED)return;
          SPMOVED=1;IS_PREVIEW=1;
          spc.classList.remove('sp-grab');
          openPosePanel(e.clientX,e.clientY);
        },560);
        return;
      }""",'预览长按定时')

# pointermove 预览分支：记录位移
R("""      if(SPDRAG){
        const c=SPDRAG.el,box=c.parentElement&&c.parentElement.getBoundingClientRect();""",
"""      if(SPDRAG){
        const dd=Math.abs(e.clientX-SPDRAG.x)+Math.abs(e.clientY-SPDRAG.y);
        if(dd>4){SPMOVED=1;clearTimeout(SPLONGT);}
        const c=SPDRAG.el,box=c.parentElement&&c.parentElement.getBoundingClientRect();""",
 '预览位移判断')

# endDrag 预览分支
R("""      clearTimeout(LONGT);
      if(SPDRAG){SPDRAG.el.classList.remove('sp-grab');SPDRAG=null;return;}""",
"""      clearTimeout(LONGT);clearTimeout(SPLONGT);
      if(SPDRAG){
        const c=SPDRAG.el,moved=SPMOVED;
        c.classList.remove('sp-grab');
        if(!moved){
          /* 短按：轻震 + 弹一下，不弹表情面板 */
          vibe(18);
          c.classList.remove('sp-bounce');void c.offsetWidth;c.classList.add('sp-bounce');
          setTimeout(()=>c.classList.remove('sp-bounce'),420);
        }
        SPDRAG=null;IS_PREVIEW=0;return;
      }""",'预览短按反馈')

# 重绘后保持朗读开关
R("""    app.innerHTML=h;
    const tabs=$('tabs');""",
"""    app.innerHTML=h;
    /* v2.1：重绘后「念／停」不能跳回「念」却仍在朗读；
       浏览器若已把这段念完，也顺势把开关复位 */
    if(SAYING){
      const ax=W.a11y;
      if(ax&&ax.status&&!ax.status().speaking)SAYING=0;
      const sv=app.querySelector('.bubble-voice[data-guide="say"]');
      if(sv&&SAYING){sv.textContent='停';
        sv.setAttribute('aria-label','停止朗读');sv.classList.add('speaking');}
    }
    const tabs=$('tabs');""",'重绘保持朗读开关')

open(p,'w',encoding='utf8').write(s);print('ui.js 完成')
