/* stage.js —— AVG 式舞台（v1.5）
   单背景板 + 可换角色层 + 天气动画 + 气泡框 + 表演关卡锁 + 呼吸微表演。
   纪律：不联网；角色层按品红底实心源图抠出，holes=0，完整 contain 不裁切；
        天气与呼吸相位由固定散列决定，不调用主随机数，同种子仍逐笔可复盘；
        角色是向导，不是历史人物，不攀附任何史实身份。 */
(function(W){
  'use strict';
  const D=W.data,C=D.character||{},L=C.layers||{};
  const PLAN=D.asset_plan||{scenes:[],delivered:[],pending:[]};
  /* v1.9：九张同画风场景板 + 缩略预览；选中项只改本机显示 */
  const BD=C.backdrops||{paper:C.bg},TH=C.backdropThumbs||{},BDM=C.backdropMeta||[];
  let BACKDROP='paper';
  const DELIVERED=PLAN.delivered||Object.keys(L);
  const POSE=C.poseLabels||{};
  const WEATHER={
    sun:{name:'晴',bird:true},rain:{name:'雨',bird:false},
    cloud:{name:'阴',bird:false},night:{name:'夜',bird:false},
    snow:{name:'雪',bird:false},dust:{name:'风沙',bird:false}
  };
  /* 显示设置：都只改本机界面，不进存档、不进分享串 */
  let STAGEON=1,BUBBLEON=1,SIZE='normal',LAST=null;  /* compact | normal | immersive */
  const SIZES={compact:'紧凑',normal:'标准',immersive:'沉浸（背景全屏）'};
  /* v1.7 立绘构图：全身完整露出；半身是构图性放大，下半身落在半透气泡后面 */
  let CHARFIT='half';
  const FITS={full:'全身',half:'半身',auto:'自动'};
  function fitOf(S){
    if(CHARFIT!=='auto')return CHARFIT;
    if(!S)return 'full';
    if(['volume','ending','scroll','turnover','realend'].indexOf(S.phase)>=0)return 'full';
    return 'half';
  }

  /* 进度读数：笔数 / 卷数 / 已见条目数，全部只读，不写回存档 */
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
    /* v2.8：新补的 8 层最先匹配，关键词更具体；再落 v2.5 / v2.3 旧层 */
    const K=[['plow6','扶犁|耦耕|耒耜深耕|犁具|耦'],
      ['sieve6','簸扬|扬糠|簸取|筛实|簸谷'],
      ['quill6','削简|削牍|刀笔|简牍修治'],
      ['lamp6','挑灯|夜分守读|灯烛|守灯'],
      ['drum6','播鼗|鼗鼓|摇鼗|报更聚听'],
      ['net6','结网|理罟|网罟|织网|罟'],
      ['cart6','舆载|推车|车载|任重致远'],
      ['oven6','炊釜|守灶|陶釜|炊爨'],
      ['loom5','理纴|引绪|线纱|梭|络纬再作'],
      ['kiln5','抟陶|圆坯|陶坯入窑'],
      ['bridge5','横木济川|梁木|抱梁'],
      ['well5','提桶|汲泉|木桶'],
      ['ink5','磨砚|松烟|石砚|落墨'],
      ['sail5','张帆|布帆|乘风以往'],
      ['herd5','羔羊|乳羔|抱羔儿'],
      ['bell5','摇铃|铜铃|报更聚听'],
      ['plow4','扶犁|耦耕|深耕|犁|耒耜'],
      ['sieve4','簸扬|扬糠|筛|簸|取实'],
      ['quill4','削简|书契|执笔|简牍|刀笔'],
      ['lamp4','挑灯|夜分|灯|烛|守读'],
      ['drum4','播鼗|鼗|摇鼓|鼓词'],
      ['net4','结网|罟|网|渔|罾'],
      ['cart4','舆载|车|载|辇|任重'],
      ['oven4','炊釜|灶|釜|炊|烹|粒食'],
      ['loom3','络纬|理线|纴|线球|缫丝'],
      ['kiln3','烧窑|窑|陶坯|抟土|焙'],
      ['bridge3','架梁|津梁|横木|梁|桥'],
      ['well3','汲水|井|甃|泉|桶'],
      ['ink3','研墨|砚|墨|松烟|笔'],
      ['sail3','扬帆|帆|乘风|张帆'],
      ['herd3','牧|畜|羔|羊|草野'],
      ['bell3','悬铃|钟|报更|更点|铃'],
      ['weave2','织|纺|染|布|匹|缫|机杼|经纬'],
      ['plaster','版筑|夯|墙|墉|抹|土功'],
      ['ferry','津|渡|篙|摆渡|济川|舟楫'],
      ['granary','仓|廪|储|赈|积|量入|备荒'],
      ['astro','观星|星|历|候气|授时|天象|晷'],
      ['mint','铸币|钱币|圜法|泉|币|成色'],
      ['mask2','傩|面|礼容|扮演|假面|仪容'],
      ['drum2','鼓|更点|聚众|桴|鼍'],
      ['think','研习|考据|辨|读法|判读|问|未得|存疑'],
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
  /* v2.2：按台词文字挑语气，供「人声表演」用；只读，不产生随机数 */
  function talkMood(text){
    const t=String(text||''),rows=((W.data.music||{}).talkMoods)||[];
    for(let i=0;i<rows.length;i++){
      try{if(new RegExp(rows[i].re).test(t))return rows[i].cue;}catch(e){}
    }
    return 'calm';
  }
  /* v2.1：新层能否用于选项表演，随该层自己的解锁条件开放 */
  function optionPoseReady(k,p){return has(k)&&unlocked(layerUnlockAt(k),p);}
  /* v2.0：场景内 emoji 状态条。只读状态，不写回存档、不调用主随机数。 */
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
  function hash(s){
    let h=0x811c9dc5;const t=String(s);
    for(let i=0;i<t.length;i++){h^=t.charCodeAt(i);h=(h*0x01000193)>>>0;}
    return h>>>0;
  }
  function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
  function clean(s){return String(s||'').replace(/\s+/g,' ').trim();}
  function cut(s,n){s=clean(s);return s.length>n?s.slice(0,n-1)+'…':s;}
  /* 图片以分块数组内嵌，运行时拼回并转 blob URL */
  function uri(v){return Array.isArray(v)?v.join(''):String(v||'');}
  const BLOBCACHE={};
  function toURL(v){
    const u=uri(v);
    if(!u||u.indexOf('data:')!==0)return u;
    if(typeof Blob==='undefined'||typeof URL==='undefined'||!URL.createObjectURL
       ||typeof atob==='undefined')return u;
    if(BLOBCACHE[u])return BLOBCACHE[u];
    try{
      const head=u.slice(0,u.indexOf(',')),b64=u.slice(u.indexOf(',')+1);
      const mime=(head.match(/data:([^;]+)/)||[])[1]||'image/png';
      const bin=atob(b64),arr=new Uint8Array(bin.length);
      for(let i=0;i<bin.length;i++)arr[i]=bin.charCodeAt(i);
      const url=URL.createObjectURL(new Blob([arr],{type:mime}));
      BLOBCACHE[u]=url;return url;
    }catch(e){return u;}
  }

  /* 当前选中场景板；分块数组在运行时转 blob URL */
  function bgURL(){return toURL(BD[BACKDROP]||BD.paper||C.bg);}

  /* ── 表演关卡：needs 全部已交付才解锁，否则回退默认层 ── */
  function sceneList(){
    return (PLAN.scenes||[]).map(x=>{
      const miss=(x.needs||[]).filter(k=>DELIVERED.indexOf(k)<0);
      return {key:x.key,name:x.name,when:x.when,needs:x.needs||[],
        missing:miss,ready:miss.length===0};
    });
  }
  function sceneByKey(k){return sceneList().filter(x=>x.key===k)[0]||null;}
  function has(k){return DELIVERED.indexOf(k)>=0&&!!L[k];}

  /* 天气：每 3 笔一换，气候条目优先；纯确定性 */
  function weatherOf(S){
    if(!S)return 'sun';
    const ev=S.cur||{},t=ev.t||'';
    if(ev.isClim){
      if(/雨|洪|涝|水患|湿|台风|风暴/.test(t))return 'rain';
      if(/雪|寒|冷|冰|降温|小冰期/.test(t))return 'snow';
      if(/沙|尘|霾|干旱|荒漠/.test(t))return 'dust';
      if(/旱|晴|暖|热|阳|升温/.test(t))return 'sun';
      if(/火山|云|阴/.test(t))return 'cloud';
    }
    const key='w|'+(S.vol?S.vol.n:1)+'|'+Math.floor((S.turn||0)/3)+'|'+(S.reg||'huaxia');
    const r=hash(key)%12;
    return r<4?'sun':r<6?'cloud':r<8?'rain':r<10?'night':r<11?'snow':'dust';
  }
  /* 当前这一帧该演哪一关 */
  function sceneOf(S,w,o){
    o=o||{};const ev=(S&&S.cur)||{},opts=ev.opts||[];
    if(!S)return 'start';
    if(S.phase==='volume')return 'volume';
    if(S.phase==='ending'||S.phase==='scroll')return 'scroll';
    if(S.phase==='turnover'||S.phase==='realend')return 'turnover';
    if(S.phase==='result'){
      const txt=(S.result&&S.result.msgs||[]).join('')+' '+clean((S.result&&S.result.o||{}).t||'');
      if(/失手|损|凋|减|−/.test(txt))return 'ending';
      if(o.combo)return 'combo';
      if(w==='sun')return 'sunny';
      return 'volume';
    }
    if(w==='rain')return 'rainy';
    if(w==='snow')return 'cold';
    if(w==='dust')return 'dust';
    if(w==='night')return 'night';
    if(opts.some(x=>x.debate))return 'debate';
    if(opts.some(x=>x.seeking))return 'study';
    if(o.ruler)return 'ruler';
    if(o.atlas)return 'atlas';
    if(o.ledger)return 'ledger';
    if(o.migrate)return 'migrate';
    if(o.harvest)return 'harvest';
    const txt=((ev.t||'')+' '+(ev.x||'')+' '+opts.map(x=>(x&&x.t)||'').join(' '));
    const K=[['brush','书写|简牍|书契|文书|执笔|抄录'],['pottery','陶|抟土|窑|器坯'],
      ['measure','度量|尺|权衡|标准'],['build','营建|筑|梁|宫室|城垣'],
      ['cook','炊|釜|茶|盐|酒|食'],['chess','弈|棋|博|局戏'],
      ['fish','渔|猎|网|罟'],['ride','骑|驿|邮|辔|传舍'],
      ['shelf','藏书|典藏|架|目次|编目'],['farewell','送别|折柳|离|别|祖道']];
    for(let i=0;i<K.length;i++)if(new RegExp(K[i][1]).test(txt))return K[i][0];
    return 'choice';
  }
  /* 关卡 → 层；锁住的关卡用默认层顶上，绝不假装有表演 */
  function poseOf(S,w,o){
    const sc=sceneOf(S,w,o),row=sceneByKey(sc);
    if(!row||!row.ready)return {pose:'neutral',scene:sc,locked:true,
      missing:row?row.missing:[]};
    const p=row.needs[0];
    return {pose:has(p)?p:'neutral',scene:sc,locked:false,missing:[]};
  }
  /* 气泡台词：只取当前一帧最该说的一句，完整信息仍在下方卡片 */
  function lineOf(S,w,info){
    info=info||{};
    if(!S)return '从第一堆篝火点起吧。这一路，我陪你把年月慢慢翻过去。';
    const ph=S.phase,ev=S.cur||{};
    if(ph==='volume')return '这一卷的岔路都汇进史海里了。歇一歇，我们再续。';
    if(ph==='ending'||ph==='scroll')return '卷已收，路还在。你走过的每一笔都留着。';
    if(ph==='turnover'||ph==='realend')return '换朝了。并立的政权不必排成一条线，各走各的年月。';
    if(ph==='result'){
      const t=clean((S.result&&S.result.o&&S.result.o.t)||'')||'这一笔已落。';
      return t+'　岁月不等人，再往前吧。';
    }
    if(ph==='choice'){
      const head=cut(ev.t||'这一年',22),body=cut(ev.x||'',42);
      return (head?(head+'。'):'')+(body||'该拿个主意了。');
    }
    return '天色正好，接着走吧。';
  }
  /* 天气动画层：纯 CSS + 内联 SVG，不引外部资源 */
  function weatherHTML(w){
    if(w==='rain')return '<div class="wx wx-rain" aria-hidden="true"><i></i><i></i><i></i>'
      +'<svg viewBox="0 0 200 60" preserveAspectRatio="none"><path d="M20 10 q18 -16 38 0 q16 -12 30 2" '
      +'fill="none" stroke="rgba(120,130,140,.55)" stroke-width="3"/></svg></div>';
    if(w==='snow')return '<div class="wx wx-snow" aria-hidden="true">'
      +'<i></i><i></i><i></i><i></i><i></i><i></i></div>';
    if(w==='dust')return '<div class="wx wx-dust" aria-hidden="true">'
      +'<span></span><span></span><span></span></div>';
    if(w==='cloud')return '<div class="wx wx-cloud" aria-hidden="true">'
      +'<svg viewBox="0 0 300 90" preserveAspectRatio="none">'
      +'<g fill="rgba(255,255,255,.42)"><ellipse cx="70" cy="48" rx="54" ry="18"/>'
      +'<ellipse cx="120" cy="38" rx="42" ry="22"/><ellipse cx="220" cy="56" rx="62" ry="16"/>'
      +'<ellipse cx="262" cy="46" rx="38" ry="20"/></g></svg></div>';
    if(w==='night')return '<div class="wx wx-night" aria-hidden="true"><span class="moon"></span>'
      +'<i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>';
    return '<div class="wx wx-sun" aria-hidden="true"><span class="halo"></span>'
      +'<svg class="birds" viewBox="0 0 120 40" preserveAspectRatio="none">'
      +'<g fill="none" stroke="rgba(90,84,72,.62)" stroke-width="2.2" stroke-linecap="round">'
      +'<path d="M12 22 q6 -7 12 0 q6 -7 12 0"/>'
      +'<path d="M58 12 q5 -6 10 0 q5 -6 10 0"/>'
      +'<path d="M92 28 q4 -5 8 0 q4 -5 8 0"/></g></svg></div>';
  }
  function stageHTML(S,opt){
    opt=opt||{};
    if(!STAGEON||!C.bg||!L.neutral)return '';
    /* 选中场景若尚未到进度，自动回退素纸，不显示未解锁内容 */
    const bd=backdropList(S).filter(x=>x.key===BACKDROP&&x.unlocked)[0];
    if(!bd)BACKDROP='paper';
    LAST=S||null;
    const w=weatherOf(S),p=poseOf(S,w,opt),
          blinking=!!(S&&has('blink')&&hash('blink|'+S.turn+'|'+(S.vol?S.vol.n:1))%9===0),
          breath=(S&&p.pose==='neutral'&&!blinking)
            ?(hash('breath|'+S.turn+'|'+(S.vol?S.vol.n:1))%2?'breath_in':'breath_out'):null,
          shown=blinking?'blink':(breath&&has(breath)?breath:p.pose),
          fit=fitOf(S),
          src=L[shown]||L.neutral,who='哈士喵 · 向导',
          full=cut(lineOf(S,w,p),110),line=cut(full,30),
          tag=(WEATHER[w]||WEATHER.sun).name+' · '+(POSE[shown]||'平静')
             +(p.locked?' · 待补':'');
    /* 呼吸相位由层名与年份固定散列决定：不同帧节奏不同，但同种子一致 */
    const phase=(hash('b|'+p.pose+'|'+(S?S.turn:0))%17)/10;
    const HUD=hudHTML(S);
    let h='<div class="stage sz-'+SIZE+' char-'+fit+'" data-fit="'+fit
      +'" data-weather="'+w+'" data-pose="'+p.pose
      +'" data-scene="'+p.scene+'" data-locked="'+(p.locked?1:0)+'"'
      +' data-backdrop="'+BACKDROP+'" data-char-interactive="1"'
      +' style="--breath-delay:-'+phase.toFixed(1)+'s">'
      +'<img class="stage-bg" src="'+bgURL()+'" alt="" aria-hidden="true">'
      +weatherHTML(w)
      +'<img class="stage-char" src="'+toURL(src)+'" alt="'+who+'，'+esc(POSE[p.pose]||'')+'表情" aria-hidden="true">'
      /* v2.7：横向画布下的可拖分割条、猫专用拖拽热区、点按台词气泡。
         三者都是纯显示层，不写存档、不调用主随机数。默认隐藏由 CSS 在 landscape 下打开。 */
      +'<div id="charHit" aria-hidden="true"></div>'
      +'<div id="splitGrip" role="separator" aria-label="拖动调整左右分栏" '
      +'aria-orientation="vertical" title="按住拖动调整左右分栏"></div>'
      +'<div id="guideBubble" role="status" aria-live="polite"></div>';
    if(BUBBLEON){
      h+='<div class="bubble" role="note" aria-label="向导对话" '
        +'data-short="'+esc(line)+'" data-full="'+esc(full)+'">'
        +'<span class="who">'+esc(who)+'</span>'
        +'<span class="bubble-grip" data-bubble-drag aria-label="拖动气泡调整位置" title="按住拖动气泡">⠿</span>'
        +'<span class="say">'+esc(line)+'</span>'
        +'<button class="bubble-more" data-bubble-expand aria-label="展开或收起完整台词" title="展开完整台词">…</button>'
        +'<button class="bubble-voice" data-guide="say" aria-label="用角色音色念这句，再点一次停止" title="念这句 / 再点一次停止">念</button>'
        +'<span class="bubble-resize" data-bubble-resize aria-label="拖动调整气泡宽高" title="拖动调宽高"></span>'
        +'</div>';
    }
    h+=HUD+'<div class="stage-tag">'+esc(tag)+'</div>'
      +(opt.tools?'<div class="stage-tools'+(opt.vmenu?' vmopen':'')+'">'+opt.tools+'</div>':'')
      +'</div>';
    return h;
  }
  /* 天气 → 环境音（只在背景音设为「自动」时生效） */
  function audioWeather(S){
    if(W.audio&&W.audio.setWeather)W.audio.setWeather(weatherOf(S));
  }
  /* 角色音色念气泡台词：不自动触发，必须点「念」或语音命令 */
  /* v2.0：再点一次「念」就停，不再从头重念 */
  function speakLine(S){
    S=S||LAST;
    const t=lineOf(S,weatherOf(S),poseOf(S,weatherOf(S),{}));
    if(W.a11y&&W.a11y.toggleSpeak)return W.a11y.toggleSpeak(t,{role:'guide',force:true});
    if(W.a11y&&W.a11y.speakAs)return W.a11y.speakAs(t,'guide');
    return false;
  }
  /* 非语言语气音：好奇／欢喜／迟疑，合成短音，不含字词，不假装配音 */
  function guideCue(kind){
    if(W.audio&&W.audio.guideCue)return W.audio.guideCue(kind);
    return false;
  }
  function set(k,v,st){
    if(k==='stage')STAGEON=v?1:0;
    else if(k==='bubble')BUBBLEON=v?1:0;
    else if(k==='size'&&SIZES[v])SIZE=v;
    else if(k==='charfit'&&FITS[v])CHARFIT=v;
    else if(k==='backdrop'){
      const row=backdropList(st||LAST).filter(x=>x.key===v)[0];
      if(row&&row.unlocked)BACKDROP=v;else return false;
    }
    return true;
  }
  function status(){
    const sc=sceneList();
    return {stage:!!STAGEON,bubble:!!BUBBLEON,size:SIZE,sizes:SIZES,
      charfit:CHARFIT,fits:FITS,
      layers:Object.keys(L).length,bg:!!C.bg,weather:WEATHER,poses:POSE,
      scenes:sc,ready:sc.filter(x=>x.ready).length,locked:sc.filter(x=>!x.ready).length,
      backdrop:BACKDROP,backdrops:backdropList(LAST),
      layersOpen:layerList(LAST).filter(x=>x.unlocked).length,
      layerCount:Object.keys(L).length,backdropCount:BDM.length,
      pending:(PLAN.pending||[]).slice(),rule:(PLAN.meta||{}).rule||'',
      voicePack:(PLAN.voicePack||{})};
  }
  W.stage={stageHTML:stageHTML,weatherOf:weatherOf,poseOf:poseOf,sceneOf:sceneOf,
    sceneList:sceneList,sceneByKey:sceneByKey,lineOf:lineOf,status:status,
    audioWeather:audioWeather,speakLine:speakLine,guideCue:guideCue,set:set,
    bgURL:bgURL,WEATHER:WEATHER,POSE:POSE,SIZES:SIZES,FITS:FITS,fitOf:fitOf,
    progress:progress,needText:needText,unlocked:unlocked,
    hudOf:hudOf,hudHTML:hudHTML,previewInfo:previewInfo,
    backdropList:backdropList,layerList:layerList,layerUnlockAt:layerUnlockAt,
    poseForOption:poseForOption,optionPoseReady:optionPoseReady,talkMood:talkMood,
    layerURL:k=>L[k]?toURL(L[k]):'',
    note:(C.meta||{}).discipline||'',method:(C.meta||{}).method||'',
    verify:(C.meta||{}).verify||''};
  if(typeof module!=='undefined'&&module.exports)module.exports=W.stage;
})((typeof window!=='undefined'?window:globalThis).WQN=((typeof window!=='undefined'?window:globalThis).WQN||{}));
