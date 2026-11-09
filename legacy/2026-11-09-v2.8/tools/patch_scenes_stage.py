# -*- coding: utf-8 -*-
"""v1.9：场景背景可选、进度解锁、选项表演映射、点击/拖动所需接口。"""
import os
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
p=os.path.join(ROOT,'src','stage.js');s=open(p,encoding='utf8').read()
def R(old,new,tag,cnt=1):
    global s
    assert old in s,'stage.js 缺 '+tag;s=s.replace(old,new,cnt);print(' ok',tag)

R("""  const D=W.data,C=D.character||{},L=C.layers||{};
  const PLAN=D.asset_plan||{scenes:[],delivered:[],pending:[]};""",
"""  const D=W.data,C=D.character||{},L=C.layers||{};
  const PLAN=D.asset_plan||{scenes:[],delivered:[],pending:[]};
  /* v1.9：九张同画风场景板 + 缩略预览；选中项只改本机显示 */
  const BD=C.backdrops||{paper:C.bg},TH=C.backdropThumbs||{},BDM=C.backdropMeta||[];
  let BACKDROP='paper';""",'数据与状态')

R("""  function hash(s){""",
"""  /* 进度读数：笔数 / 卷数 / 已见条目数，全部只读，不写回存档 */
  function progress(S){
    S=S||LAST||{};
    return {turn:+(S.turn||0),vol:+((S.vol&&S.vol.n)||1),
      seen:Object.keys(S.seenCiv||{}).length};
  }
  function needText(n){
    if(!n)return '开局可用';
    if(n.k==='turn')return '第 '+n.n+' 笔开放';
    if(n.k==='vol')return '第 '+n.n+' 卷开放';
    if(n.k==='seen')return '已见 '+n.n+' 条开放';
    return '随进度开放';
  }
  function unlocked(n,p){
    p=p||progress(LAST);
    if(!n)return true;
    if(n.k==='turn')return p.turn>=n.n;
    if(n.k==='vol')return p.vol>=n.n;
    if(n.k==='seen')return p.seen>=n.n;
    return false;
  }
  function backdropList(S){
    const p=progress(S);
    return BDM.map(x=>({key:x.key,name:x.name,desc:x.desc,
      need:x.need||null,needText:needText(x.need),
      unlocked:unlocked(x.need,p),current:BACKDROP===x.key,
      thumb:TH[x.key]||null}));
  }
  /* 人物表演层同样随进度开放：前四层开局可用，之后每两层约一笔 */
  function layerUnlockAt(k){
    const ks=Object.keys(L),i=ks.indexOf(k);
    if(i<0)return null;
    return i<4?null:{'k':'turn','n':Math.min(80,(i-3)*2)};
  }
  function layerList(S){
    const p=progress(S);
    return Object.keys(L).map(k=>{
      const n=layerUnlockAt(k);
      return {key:k,name:POSE[k]||k,need:n,needText:needText(n),
        unlocked:unlocked(n,p),url:null};
    });
  }
  function poseForOption(o){
    o=o||{};
    const t=[o.t,o.e&&o.e.t,o.basis,o.kind,o.tag,o.cls].filter(Boolean).join(' ');
    const K=[['think','研习|考据|辨|读法|判读|问|未得|存疑'],
      ['loupe','互证|对勘|校|核|辨误'],
      ['coin','交易|市|价|财|权衡|折色'],
      ['sail','外交|航|海|使|通商|往来'],
      ['move','迁徙|移|迁|避|行旅'],
      ['build','营建|筑|渠|堰|城|桥|堤'],
      ['forge','工造|铸|冶|锻|矿'],
      ['seedling','农|耕|禾|苗|播|田'],
      ['brush','书|简|牍|写|录|册'],
      ['shelf','藏|典|编目|库'],
      ['scroll','传承|授|学|卷|谱'],
      ['seal','治理|官|制|令|籍|法'],
      ['chess','弈|谋|策|局|议'],
      ['ride','冒险|骑|驿|征|远'],
      ['cook','炊|食|盐|茶|酒'],
      ['herb','医|药|病|草'],
      ['happy','得|成|丰|喜|顺'],
      ['surprise','失手|险|异|骤|变']];
    for(let i=0;i<K.length;i++)if(new RegExp(K[i][1]).test(t)&&has(K[i][0]))return K[i][0];
    return has('wave')?'wave':'neutral';
  }
  function hash(s){""",'进度与映射函数')

R("""    if(!STAGEON||!C.bg||!L.neutral)return '';""",
"""    if(!STAGEON||!C.bg||!L.neutral)return '';
    /* 选中场景若尚未到进度，自动回退素纸，不显示未解锁内容 */
    const bd=backdropList(S).filter(x=>x.key===BACKDROP&&x.unlocked)[0];
    if(!bd)BACKDROP='paper';""",'场景回退')

R("""      +'" data-scene="'+p.scene+'" data-locked="'+(p.locked?1:0)+'"'
      +' style="--breath-delay:-'+phase.toFixed(1)+'s">'
      +'<img class="stage-bg" src="'+toURL(C.bg)+'" alt="" aria-hidden="true">'""",
"""      +'" data-scene="'+p.scene+'" data-locked="'+(p.locked?1:0)+'"'
      +' data-backdrop="'+BACKDROP+'" data-char-interactive="1"'
      +' style="--breath-delay:-'+phase.toFixed(1)+'s">'
      +'<img class="stage-bg" src="'+bgURL()+'" alt="" aria-hidden="true">'""",'bgURL 与标记')

R("""    else if(k==='charfit'&&FITS[v])CHARFIT=v;
    return true;""",
"""    else if(k==='charfit'&&FITS[v])CHARFIT=v;
    else if(k==='backdrop'){
      const row=backdropList(LAST).filter(x=>x.key===v)[0];
      if(row&&row.unlocked)BACKDROP=v;else return false;
    }
    return true;""",'set backdrop')

R("""      scenes:sc,ready:sc.filter(x=>x.ready).length,locked:sc.filter(x=>!x.ready).length,
      pending:(PLAN.pending||[]).slice(),rule:(PLAN.meta||{}).rule||'',""",
"""      scenes:sc,ready:sc.filter(x=>x.ready).length,locked:sc.filter(x=>!x.ready).length,
      backdrop:BACKDROP,backdrops:backdropList(LAST),
      layersOpen:layerList(LAST).filter(x=>x.unlocked).length,
      layerCount:Object.keys(L).length,
      pending:(PLAN.pending||[]).slice(),rule:(PLAN.meta||{}).rule||'',""",'status 扩展')

R("""    bgURL:()=>toURL(C.bg),WEATHER:WEATHER,POSE:POSE,SIZES:SIZES,FITS:FITS,fitOf:fitOf,""",
"""    bgURL:bgURL,WEATHER:WEATHER,POSE:POSE,SIZES:SIZES,FITS:FITS,fitOf:fitOf,
    progress:progress,needText:needText,unlocked:unlocked,
    backdropList:backdropList,layerList:layerList,layerUnlockAt:layerUnlockAt,
    poseForOption:poseForOption,layerURL:k=>L[k]?toURL(L[k]):'',""",'导出')

# bgURL 函数定义放在 toURL 之后
R("""  /* ── 表演关卡：needs 全部已交付才解锁，否则回退默认层 ── */""",
"""  /* 当前选中场景板；分块数组在运行时转 blob URL */
  function bgURL(){return toURL(BD[BACKDROP]||BD.paper||C.bg);}

  /* ── 表演关卡：needs 全部已交付才解锁，否则回退默认层 ── */""",'bgURL 定义')
open(p,'w',encoding='utf8').write(s);print('stage.js 完成')
