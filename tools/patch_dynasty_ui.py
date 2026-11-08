# -*- coding: utf-8 -*-
"""UI：帝王全册、世家全册、开局代入、更迭卡、族谱分栏、收卷统计。"""
import os
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
p=os.path.join(ROOT,'src','ui.js');s=open(p,encoding='utf8').read()
def rep(old,new,tag,cnt=1):
    global s
    assert old in s,tag+' 未找到'
    s=s.replace(old,new,cnt);print('  ok',tag)

# A. START
rep("""      START={reg:'huaxia',view:'family',entity:'C01',chainRegion:'huaxia',""",
    """      START={reg:'huaxia',view:'family',entity:'C01',chainRegion:'huaxia',house:'H01',""",'START')

# B. 主卡进度：世家文案
rep("""    const realTag=(S.mode==='real'&&S.entity)
      ?'<div class="mini" style="color:var(--gold);margin-top:5px">真实血脉 · '+esc(W.real.progress(S))+'</div>'
      :(S.mode==='succession'&&S.chainState)""",
    """    const realTag=(S.mode==='real'&&S.entity)
      ?'<div class="mini" style="color:var(--gold);margin-top:5px">'
        +(S.houseId?'世家浮沉 · ':'真实血脉 · ')+esc(W.real.progress(S))
        +(S.houseId?'（门第政治位置，不作家族人口兴灭）':'')+'</div>'
      :(S.mode==='succession'&&S.chainState)""",'realTag')

# C. 更迭卡：本朝首尾君主
rep("""    if(r.people&&r.people.length)h+='<div class="hr"></div><div class="mini">同期人物：'+r.people.map(p=>esc(p)).join('、')+'。</div>';""",
    """    if(r.people&&r.people.length)h+='<div class="hr"></div><div class="mini">同期人物：'+r.people.map(p=>esc(p)).join('、')+'。</div>';
    const DY=W.dynasty,PR=DY?DY.polityRulers(r.name||''):[];
    if(PR.length)h+='<div class="hr"></div><div class="mini"><b>本朝纪年锚点：</b>'
      +PR.map(x=>esc(x.name)+'（'+esc(x.title)+' · '+esc(x.rawYear)+'）').join('　→　')
      +'<br><span style="color:var(--dim)">仅取首尾可考在位者，非完整帝表；'
      +'同年并立、追尊与摄政另标，不排成单线相续。</span></div>';""",'turnover rulers')

# D. 收卷报告：世家六阶段标题 + 统计格
rep("""    if(d.entity){
      h+='<div class="card"><div class="tagline">真 实 血 脉 · 六 阶 段</div><div class="mini">'+esc(d.entity.name)
        +'　建立 → 扩张 → 鼎盛 → 转折 → 衰落 → 终结。节点按考据年表，阶段态势与抉择为游戏推演。</div>';""",
    """    if(d.entity){
      h+='<div class="card"><div class="tagline">'
        +(d.entity.isHouse?'世 家 浮 沉 · 六 阶 段':'真 实 血 脉 · 六 阶 段')
        +'</div><div class="mini">'+esc(d.entity.name)
        +(d.entity.isHouse
          ?'　兴起 → 扩张 → 鼎盛 → 转折 → 衰落 → 散脉。六阶段为通识级框架锚点，'
           +'「散脉」指门第政治位置消退，不是家族人口消失；本局族人不与其攀附血缘。'
          :'　建立 → 扩张 → 鼎盛 → 转折 → 衰落 → 终结。节点按考据年表，阶段态势与抉择为游戏推演。')
        +'</div>';""",'scroll entity')
rep("""        +'<div>鉴宝卡<b>'+Object.keys(S.treasureSeen||{}).length+' / '+D.civilization.treasures.length+'</b></div>'""",
    """        +'<div>鉴宝卡<b>'+Object.keys(S.treasureSeen||{}).length+' / '+D.civilization.treasures.length+'</b></div>'
        +(d.dynasty?'<div>同期在位<b>'+d.dynasty.rulers+' / '+d.dynasty.rulerTotal+'</b></div>'
          +'<div>同期名族<b>'+d.dynasty.houses+' / '+d.dynasty.houseTotal+'</b></div>':'')""",'scroll stats')

# E. 族谱页：名族对照分栏（史册对照之后）
rep("""      h+='<div class="mini" style="color:var(--dim)">史实人物；与本局推演族人无血缘关系。</div></details>';
    });
    h+='</div>';
    if(S.famLog&&S.famLog.length){""",
    """      h+='<div class="mini" style="color:var(--dim)">史实人物；与本局推演族人无血缘关系。</div></details>';
    });
    h+='</div>';
    /* 名族对照：真实世家另栏，明确「不攀附」——与史册对照同一条边界 */
    const DYH=W.dynasty?W.dynasty.summary(S):null;
    if(DYH){
      h+='<div class="card"><div class="tagline">名 族 对 照 · 本 局 所 遇 世 家 · '
        +DYH.houses+' / '+DYH.houseTotal+'</div>'
        +'<div class="note"><b>这一栏是真实世家，上面族谱是推演生成的人物。</b>'
        +'两下分栏：不攀附谱牒、不推断血统、不把郡望当血缘凭证；'
        +'同一时期并立的名族不排成前后相续。</div>';
      if(!DYH.seenHouses.length)h+='<div class="mini">尚未遇见同期名族。继续推演，按年代窗口会陆续抵达。</div>';
      else DYH.seenHouses.slice().reverse().slice(0,18).forEach(x=>{
        h+='<details class="fold"><summary><b>'+esc(x.name)+'</b> <span class="s">'
          +esc(x.alias||x.category)+' · '+esc(x.rawYear)+'</span></summary>'
          +'<div class="mini"><b>势力中心：</b>'+esc(x.seat)+'　<b>类目：</b>'+esc(x.category)+'</div>'
          +'<div class="mini"><b>兴起：</b>'+esc(x.rise)+'</div>'
          +'<div class="mini"><b>鼎盛：</b>'+esc(x.peakEvent)+'</div>'
          +'<div class="mini"><b>散脉：</b>'+esc(x.fall)+'</div>'
          +(x.figures&&x.figures.length?'<div class="mini"><b>相关人物：</b>'+esc(x.figures.join('、'))+'</div>':'')
          +'<div class="mini" style="color:var(--gold)">'+esc(x.boundary)+'</div>'
          +'<div class="mini" style="color:var(--dim)">真实世家条目；与本局推演族人无谱牒关系。</div></details>';
      });
      if(DYH.seenHouses.length>18)h+='<div class="mini">…另有 '
        +(DYH.seenHouses.length-18)+' 家，见文明册全册。</div>';
      h+='<div class="mini" style="color:var(--gold)">本局同期在位君主 '
        +DYH.rulers+' / '+DYH.rulerTotal+' 位，见文明册「帝王全册」。</div></div>';
    }
    if(S.famLog&&S.famLog.length){""",'fam house roster')

# F. 文明册：帝王全册 + 世家全册（人物全册卡之后、panel 收口之前）
rep("""    h+='</template></details></div>';
    h+='</div>';   /* 关闭文明册 panel（人物全册之后才收口） */""",
    """    h+='</template></details></div>';
    /* 帝王全册与世家全册：按组折叠懒加载，已见标金，检索并入 ppSearch */
    const DY=W.dynasty,DR=D.rulers,DH=D.houses;
    if(DY){
      const seenR=S.seenRuler||{},seenH=S.seenHouse||{};
      const dyRow=(x,kind)=>{
        const seen=kind==='r'?(seenR[x.id]):(seenH[x.id]);
        const layer=x.layer==='legend'?'传说／后世追述':x.layer==='disputed'?'存疑层':'可考锚点';
        let out='<div class="row dy-row pp-row"><span class="y">'+esc(x.rawYear)+'</span><b>'
          +esc(kind==='r'?x.name:x.name)+'</b>'
          +(seen?' <span style="color:var(--gold)">✓ 本局已见</span>':'')
          +'<span class="s">'
          +(kind==='r'?esc(x.title)+' · '+esc(x.polity):esc(x.category)+(x.alias?' · '+esc(x.alias):''))
          +' · '+layer+(x.consensus==='date_contested'?' · 断代有争议':'')+'</span>';
        if(kind==='r'){
          out+='<div class="mini">'+(x.succession?'继立：'+esc(x.succession)+'　':'')
            +esc(x.note||'')+'</div>';
        }else{
          out+='<div class="mini"><b>兴起：</b>'+esc(x.rise)+'　<b>鼎盛：</b>'+esc(x.peakEvent)+'</div>'
            +'<div class="mini"><b>散脉：</b>'+esc(x.fall)+'</div>'
            +'<div class="mini" style="color:var(--gold)">'+esc(x.boundary)+'</div>';
        }
        return out+'</div>';
      };
      const dyFold=(title,arr,key,kind)=>{
        if(!arr.length)return '';
        const body=cacheHTML('DY:'+key,'seen'+Object.keys(seenR).length
          +'_'+Object.keys(seenH).length,()=>arr.map(x=>dyRow(x,kind)).join(''));
        return '<details class="fold dy-group" data-lz="'+key+'"><summary>'+esc(title)
          +' · '+arr.length+' 条</summary><div class="lazy-body">点开时载入 '
          +arr.length+' 条……</div><template data-lz-tpl="'+key+'">'+body+'</template></details>';
      };
      const RG=DY.rulerGroups(),HG=DY.houseGroups();
      h+='<div id="dyList">';
      h+='<div class="card"><div class="tagline">帝 王 全 册 · '+DR.rulers.length
        +' 位 · '+Object.keys(RG).length+' 个政权</div>'
        +'<div class="note" style="border-left-color:var(--red2)"><b>帝王不是「统治整个文明圈」：</b>'
        +'每条只记「某政权某时段在位」；并立政权、摄政称制、追尊、被废与复辟都单独标注。'
        +'传说层不进同期依据池。</div>'
        +'<div class="mini">'+esc(DR.meta.note)+'</div>'
        +'<div class="mini" style="color:var(--gold)">本局已见 '
        +Object.keys(seenR).length+' / '+DR.rulers.length+' 位。</div>';
      h+='<details class="fold"><summary>称 谓 与 制 度 读 法 · '+DR.titles.length
        +' 条</summary>'+DR.titles.map(t=>'<div class="row"><b>'+esc(t.name)
        +'</b><div class="mini">'+esc(t.note)+'</div></div>').join('')+'</details>';
      h+='<details class="fold"><summary>边 界 读 法 · '+DR.notes.length
        +' 条</summary>'+DR.notes.map(t=>'<div class="row"><b>'+esc(t.title)
        +'</b><div class="mini">'+esc(t.text)+'</div></div>').join('')+'</details>';
      Object.keys(RG).forEach((k,i)=>h+=dyFold('帝 王 · '+k,RG[k],'R:'+i,'r'));
      h+='<div class="mini" style="color:var(--dim)">'+esc(DR.meta.sources)
        +'　'+esc(DR.meta.boundary)+'</div></div>';
      h+='<div class="card"><div class="tagline">世 家 全 册 · '+DH.houses.length
        +' 家 · '+Object.keys(HG).length+' 类</div>'
        +'<div class="note" style="border-left-color:var(--red2)"><b>郡望不等于血统凭证：</b>'
        +esc(DH.meta.boundary)+'</div>'
        +'<div class="mini">'+esc(DH.meta.note)+'</div>'
        +'<div class="mini" style="color:var(--gold)">本局已见 '
        +Object.keys(seenH).length+' / '+DH.houses.length+' 家；'
        +'另有 '+D.house_entities.entities.length+' 家可在开局代入浮沉。</div>';
      h+='<details class="fold"><summary>世 家 边 界 读 法 · '+DH.notes.length
        +' 条</summary>'+DH.notes.map(t=>'<div class="row"><b>'+esc(t.title)
        +'</b><div class="mini">'+esc(t.text)+'</div></div>').join('')+'</details>';
      Object.keys(HG).forEach((k,i)=>h+=dyFold('世 家 · '+k,HG[k],'H:'+i,'h'));
      h+='<div class="mini" style="color:var(--dim)">'+esc(DH.meta.sources)
        +'　'+esc(DH.meta.excluded)+'</div></div>';
      h+='</div>';
    }
    h+='</div>';   /* 关闭文明册 panel（人物全册之后才收口） */""",'civ dynasty books')

# G. ppSearch 文案 + 选择器（把帝王/世家也纳入筛选）
rep("""    h+='<input id="ppSearch" class="ppsearch" placeholder="筛一筛：姓氏 / 人群 / 关键词">'""",
    """    h+='<input id="ppSearch" class="ppsearch" placeholder="筛一筛：姓氏 / 人群 / 帝王 / 世家 / 关键词">'""",'ppSearch label')
rep("""      document.querySelectorAll('#ppList .pp-row').forEach(r=>{""",
    """      document.querySelectorAll('#ppList .pp-row, #dyList .dy-row').forEach(r=>{""",'ppSearch selector')

# H. 设置页「这一局」统计
rep("""      +'史实、约略年代、断代争议、传说追述分层标注；推演抉择不改写史实。'
      +'</div><button class="big alt" data-act="restart">另 起 一 局</button></div></div>';""",
    """      +'史实、约略年代、断代争议、传说追述分层标注；推演抉择不改写史实。<br>'
      +'帝王全册 '+D.rulers.rulers.length+' 位 / 世家全册 '+D.houses.houses.length
      +' 家（可代入 '+D.house_entities.entities.length+' 家），本局已见在位君主 '
      +Object.keys(S.seenRuler||{}).length+' 位、同期名族 '+Object.keys(S.seenHouse||{}).length+' 家。'
      +'</div><button class="big alt" data-act="restart">另 起 一 局</button></div></div>';""",'settings stats')

# I. 开局世家卡（朝代长河卡之后、底部 mini 之前）
rep("""    h+='<div class="mini center" style="margin-top:14px">单文件 · 无联网 · 自动存档于本机<br>'""",
    """    /* 世家代入：六阶段走门第政治位置的浮沉，复用真实血脉的年表机制 */
    const HE=D.house_entities.entities;
    const hEnt=HE.find(x=>x.id===START.house)||HE[0];
    h+='<div class="card"><div class="tagline">或 · 代 入 世 家 浮 沉</div>'
      +'<div class="mini">从「兴起」之期入局，走兴起 → 扩张 → 鼎盛 → 转折 → 衰落 → 散脉六阶段。'
      +'这是<b>门第政治位置</b>的浮沉，不是家族人口兴灭；六阶段为通识级框架锚点，'
      +'不作精确纪年。抉择仍属推演，本局族人不与真实世家攀附谱牒。</div>'
      +'<div class="sel" style="margin-top:10px">';
    HE.forEach(e=>{
      h+='<button data-hse="'+e.id+'" class="'+(hEnt.id===e.id?'on':'')+'">'+esc(e.name)
        +'<div class="mini" style="color:var(--dim);margin-top:4px">'+E.fmtShort(e.startYear)
        +' — '+E.fmtShort(e.endYear)+' · '+D.regions[e.region].n+'</div></button>';
    });
    h+='</div><div class="mini" style="color:var(--gold);margin-top:6px">'
      +esc(D.house_entities.meta.boundary)+'</div>'
      +'<button class="big" data-act="newhouse">代 入 '+esc(hEnt.name)+' ▸</button></div>';
    h+='<div class="mini center" style="margin-top:14px">单文件 · 无联网 · 自动存档于本机<br>'""",'start house card')

# J. 开局绑定与 action
rep("""    app.querySelectorAll('[data-chain]').forEach(b=>b.addEventListener('click',()=>{START.chainRegion=b.dataset.chain;rerender();}));""",
    """    app.querySelectorAll('[data-chain]').forEach(b=>b.addEventListener('click',()=>{START.chainRegion=b.dataset.chain;rerender();}));
    app.querySelectorAll('[data-hse]').forEach(b=>b.addEventListener('click',()=>{START.house=b.dataset.hse;rerender();}));""",'start bind')
rep("""      else if(a==='newchain'){startCfg();E.freshSuccession(START.chainRegion,START.view);applyTut();E.step();TAB='main';render();}""",
    """      else if(a==='newchain'){startCfg();E.freshSuccession(START.chainRegion,START.view);applyTut();E.step();TAB='main';render();}
      else if(a==='newhouse'){startCfg();E.freshEntity(START.house,START.view);applyTut();E.step();TAB='main';render();}""",'start action')

open(p,'w',encoding='utf8').write(s)
print('UI 补丁完成')
