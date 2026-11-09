/* atlas.js —— 可缩放历史舆图（Canvas 自绘，离线无瓦片）
   四层共用同一画布：政权核心区 / 气候影响区 / 人口热力 / 本局家族分布。
   纪律：政权是核心区示意不是国界；气候区不是实测边界；人口热力不是人口统计；
        家族点是本局推演数据不是史实人口。所有声明取自 WQN.data.atlas / layers 的 meta。
   交互：滚轮／双指缩放、按钮缩放、拖动平移、年份滑杆、图层开关、点位点击。 */
(function(W){
  'use strict';
  const D=W.data, A=D.atlas, L=D.layers;
  const REG_COLOR={
    huaxia:'#c9a227',meso:'#6fa8dc',nile:'#7fc7a0',aegean:'#d08bb5',
    indus:'#e0a06a',maya:'#9b8ad9',steppe:'#9fb86a','*':'#8fa3ad'
  };
  let cv=null,ctx=null,cssW=0,cssH=0,dpr=1,baseW=0,baseH=0;
  let view={scale:1,tx:0,ty:0};
  let year=-5000,gameYear=-5000,userYear=null,picked=null,hover=null;
  let onPick=function(){},onList=function(){},listKey='';
  let pointers=new Map(),lastPinch=0,dragMoved=0,winBound=false;
  let layers={polity:true,climate:true,pop:true,family:true,local:false};
  let family={dist:[],migrations:[]};

  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const X=lon=>(lon+180)/360*baseW*view.scale+view.tx;
  const Y=lat=>(90-lat)/180*baseH*view.scale+view.ty;

  function resize(){
    if(!cv)return;
    const r=cv.getBoundingClientRect();
    cssW=Math.max(260,r.width||cv.parentNode.clientWidth||360);
    cssH=Math.max(220,r.height||Math.round(cssW*.52));
    dpr=Math.min(2,window.devicePixelRatio||1);
    cv.width=Math.round(cssW*dpr);cv.height=Math.round(cssH*dpr);
    baseW=cssW;baseH=cssW/2;
    if(view.scale===1&&view.tx===0&&view.ty===0)resetView();
    clampView();draw();
  }
  function resetView(){view.scale=1;view.tx=0;view.ty=(cssH-baseH)/2;}
  function clampView(){
    const mw=baseW*view.scale,mh=baseH*view.scale;
    view.tx=mw<=cssW?(cssW-mw)/2:clamp(view.tx,cssW-mw,0);
    view.ty=mh<=cssH?(cssH-mh)/2:clamp(view.ty,cssH-mh,0);
  }
  function zoomAt(factor,mx,my){
    const old=view.scale,next=clamp(old*factor,1,16),k=next/old;
    if(next===old)return;
    view.scale=next;
    view.tx=mx-(mx-view.tx)*k;
    view.ty=my-(my-view.ty)*k;
    clampView();draw();
  }
  function zoom(f){zoomAt(f,cssW/2,cssH/2);}
  function reset(){resetView();draw();}
  function getView(){return {scale:view.scale,tx:view.tx,ty:view.ty};}
  function getYear(){return year;}
  function getLayers(){return Object.assign({},layers);}
  function setLayers(o){
    Object.keys(layers).forEach(k=>{if(typeof o[k]==='boolean')layers[k]=o[k];});
    draw();emitList(true);
  }
  function setFamily(f){family=f||{dist:[],migrations:[]};draw();}
  function setYear(y,fromGame){
    if(fromGame){
      gameYear=Math.round(y);
      if(userYear!==null)return;
    }else userYear=Math.round(y);
    year=Math.round(y);draw();emitList();
  }
  function followGame(){userYear=null;setYear(gameYear,true);}
  function isManual(){return userYear!==null;}

  /* ---------- 数据筛选 ---------- */
  function activePolities(){return A.polities.filter(p=>year>=p.from&&year<=p.to);}
  function activeRoutes(){return A.routes.filter(r=>year>=r.from&&year<=r.to);}
  function activeClimate(){
    return L.climate.filter(c=>year>=c.y0&&year<=c.y1)
      .sort((a,b)=>(b.rank==='机构／学术'?1:0)-(a.rank==='机构／学术'?1:0)||b.y1-a.y1);
  }
  function eraAt(y){
    const es=L.population.eras;let hit=es[0];
    es.forEach(e=>{if(y>=e.from)hit=e;});
    return hit;
  }
  function popWeight(k,y){
    const es=L.population.eras,e=eraAt(y),i=es.indexOf(e),next=es[Math.min(i+1,es.length-1)];
    let w=e.weights[k.region]||.4;
    if(next!==e&&next.from>e.from){
      const t=clamp((y-e.from)/(next.from-e.from),0,1);
      w=w+((next.weights[k.region]||.4)-w)*t;
    }
    return clamp(w*k.adj,0,1);
  }
  function popTop(n){
    return L.population.kernels.map(k=>({name:k.name,region:k.region,w:popWeight(k,year)}))
      .sort((a,b)=>b.w-a.w).slice(0,n||5);
  }
  function kernelById(id){return L.population.kernels.find(k=>k.id===id);}

  /* ---------- 绘制基础 ---------- */
  function pathOf(ring,close){
    ctx.beginPath();
    ring.forEach((p,i)=>{const x=X(p[0]),y=Y(p[1]);i?ctx.lineTo(x,y):ctx.moveTo(x,y);});
    if(close)ctx.closePath();
  }
  function label(t,x,y,color,size,align){
    if(x<-60||x>cssW+60||y<-20||y>cssH+20)return;
    ctx.fillStyle=color||'#e8dcc2';
    ctx.font=(size||11)+'px "WenQuanYi Micro Hei",sans-serif';
    ctx.textAlign=align||'center';ctx.textBaseline='middle';
    ctx.fillText(t,x,y);
  }
  function hexA(hex,a){
    const h=hex.replace('#','');
    const n=parseInt(h.length===3?h.split('').map(c=>c+c).join(''):h,16);
    return 'rgba('+((n>>16)&255)+','+((n>>8)&255)+','+(n&255)+','+a+')';
  }
  function shortName(s){
    return s.replace(/（.*?）/g,'').replace(/→.*$/,'').length>11
      ? s.replace(/（.*?）/g,'').slice(0,10)+'…' : s.replace(/（.*?）/g,'');
  }
  function clipLand(){
    ctx.beginPath();
    A.lands.forEach(L2=>L2.ring.forEach((p,i)=>{
      const x=X(p[0]),y=Y(p[1]);i?ctx.lineTo(x,y):ctx.moveTo(x,y);
    }));
    ctx.clip();
  }

  /* ---------- 人口热力：相对聚集重心，不是人口统计 ---------- */
  function drawPopulation(){
    const R=Math.max(26,baseW*.085)*Math.min(3.2,Math.sqrt(view.scale));
    /* 按文明圈聚合：否则单元多的圈（华夏 6 个、爱琴 5 个）会因光斑叠加显得人口更多。
       这里先画「圈级重心」，单元只作低亮细节，亮度才真正对应时代相对权重。 */
    const groups={};
    L.population.kernels.forEach(k=>{
      if(k.region==='*')return;
      (groups[k.region]=groups[k.region]||[]).push(k);
    });
    ctx.save();clipLand();
    ctx.globalCompositeOperation='lighter';
    Object.keys(groups).forEach(reg=>{
      const ks=groups[reg];
      const cx=ks.reduce((s,k)=>s+k.lon,0)/ks.length;
      const cy=ks.reduce((s,k)=>s+k.lat,0)/ks.length;
      const w=popWeight(ks[0],year);
      if(w<.12)return;
      /* 半径按该圈单元跨度，避免所有圈画成一样大的圆 */
      const spanLon=Math.max(...ks.map(k=>k.lon))-Math.min(...ks.map(k=>k.lon));
      const rx=Math.max(R*.9,(spanLon/360*baseW*view.scale)/2+R*.5);
      const x=X(cx),y=Y(cy),r=Math.min(rx,R*2.1);
      const g=ctx.createRadialGradient(x,y,0,x,y,r);
      if(w<.5)g.addColorStop(0,'rgba(80,140,190,'+(.20+w*.42).toFixed(3)+')');
      else if(w<.78)g.addColorStop(0,'rgba(205,135,60,'+(.22+w*.40).toFixed(3)+')');
      else g.addColorStop(0,'rgba(240,205,95,'+(.24+w*.42).toFixed(3)+')');
      g.addColorStop(.6,'rgba(120,110,70,.08)');
      g.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
    });
    /* 单元级细节：固定低亮，只标「哪些地理单元参与了示意」 */
    L.population.kernels.forEach(k=>{
      const w=popWeight(k,year);if(w<.2)return;
      const x=X(k.lon),y=Y(k.lat),r=R*.32;
      const g=ctx.createRadialGradient(x,y,0,x,y,r);
      g.addColorStop(0,'rgba(245,215,140,'+(.06+w*.10).toFixed(3)+')');
      g.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
    });
    ctx.restore();
    /* 高热核标注 */
    if(view.scale>=2.2){
      popTop(4).forEach(p=>{
        const k=L.population.kernels.find(q=>q.name===p.name);if(!k)return;
        label(p.name,X(k.lon),Y(k.lat)-9,'rgba(245,220,150,.8)',9);
      });
    }
  }

  /* ---------- 气候影响区：示意椭圆，不是实测边界 ---------- */
  function drawClimate(){
    const cs=activeClimate(),regional=cs.filter(c=>c.box).slice(0,8);
    ctx.save();clipLand();
    regional.forEach(c=>{
      const b=c.box,x=X(b.cx),y=Y(b.cy);
      const rx=Math.max(8,b.rx/360*baseW*view.scale),ry=Math.max(6,b.ry/180*baseH*view.scale);
      ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);
      ctx.fillStyle=hexA(c.color,.14);ctx.fill();
      ctx.setLineDash([3,4]);ctx.lineWidth=1.1;ctx.strokeStyle=hexA(c.color,.78);ctx.stroke();
      ctx.setLineDash([]);
      if(view.scale>=3.6)label(shortName(c.title),x,y,hexA(c.color,.95),9);
    });
    ctx.restore();
    /* 全球性事件：不画假边界，只在图边加一条提示 */
    const glob=cs.filter(c=>c.global).length;
    if(glob){
      ctx.fillStyle='rgba(120,175,205,.75)';
      ctx.fillRect(0,0,cssW,3);
      label('全球性气候现象 '+glob+' 条（不画边界）',cssW-12,cssH-30,'rgba(150,195,220,.85)',9,'right');
    }
  }

  /* ---------- 家族分布：本局推演数据 ---------- */
  function drawFamily(){
    const dist=family.dist||[],mig=family.migrations||[];
    /* 迁徙路线 */
    mig.slice(-6).forEach(m=>{
      const a=kernelById(m.from),b=kernelById(m.to);
      if(!a||!b)return;
      const x1=X(a.lon),y1=Y(a.lat),x2=X(b.lon),y2=Y(b.lat);
      ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);
      ctx.setLineDash([4,4]);ctx.lineWidth=1.2;
      ctx.strokeStyle='rgba(240,190,110,.55)';ctx.stroke();ctx.setLineDash([]);
      const mx=(x1+x2)/2,my=(y1+y2)/2;
      ctx.beginPath();ctx.arc(mx,my,2.4,0,Math.PI*2);ctx.fillStyle='#f0be6e';ctx.fill();
    });
    /* 据点 */
    dist.forEach(d=>{
      const k=kernelById(d.unit);if(!k)return;
      const x=X(k.lon),y=Y(k.lat),r=4+Math.min(9,Math.sqrt(d.count)*2.6);
      ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);
      ctx.fillStyle='rgba(255,205,110,.30)';ctx.fill();
      ctx.lineWidth=d.ruler?2:1.3;
      ctx.strokeStyle=d.ruler?'#ffe08a':'#e6b45c';ctx.stroke();
      ctx.beginPath();ctx.arc(x,y,2,0,Math.PI*2);ctx.fillStyle='#fff0c4';ctx.fill();
      /* 只给当家所在据点标名，避免东亚一带政权／城址／家族标签叠成一团 */
      if(d.ruler&&view.scale>=1.5)
        label(k.name+' '+d.count+' 人',x,y-r-8,'#ffe0a0',10);
    });
  }

  /* ---------- 主绘制 ---------- */
  function draw(){
    if(!ctx)return;
    ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.clearRect(0,0,cssW,cssH);
    const g=ctx.createLinearGradient(0,0,0,cssH);
    g.addColorStop(0,'#18242c');g.addColorStop(1,'#10171d');
    ctx.fillStyle=g;ctx.fillRect(0,0,cssW,cssH);
    /* 经纬网 */
    ctx.lineWidth=1;ctx.strokeStyle='rgba(120,155,175,.13)';
    ctx.beginPath();
    for(let lo=-180;lo<=180;lo+=30){const x=X(lo);ctx.moveTo(x,Y(90));ctx.lineTo(x,Y(-90));}
    for(let la=-90;la<=90;la+=30){const y=Y(la);ctx.moveTo(X(-180),y);ctx.lineTo(X(180),y);}
    ctx.stroke();
    ctx.strokeStyle='rgba(160,190,205,.22)';
    ctx.beginPath();ctx.moveTo(X(0),Y(90));ctx.lineTo(X(0),Y(-90));
    ctx.moveTo(X(-180),Y(0));ctx.lineTo(X(180),Y(0));ctx.stroke();
    /* 陆地 */
    A.lands.forEach(Ld=>{
      pathOf(Ld.ring,true);
      ctx.fillStyle='#2c3329';ctx.fill();
      ctx.lineWidth=1;ctx.strokeStyle='rgba(150,170,130,.38)';ctx.stroke();
    });
    /* 三层叠加：人口 → 气候 → 政权 */
    if(layers.pop)drawPopulation();
    if(layers.climate)drawClimate();
    /* 内海覆回海色（热力不该盖住内海） */
    A.inlandSeas.forEach(s=>{
      pathOf(s.ring,true);ctx.fillStyle='#17242c';ctx.fill();
      ctx.strokeStyle='rgba(120,160,180,.25)';ctx.lineWidth=.8;ctx.stroke();
    });
    /* 河流 */
    A.rivers.forEach(r=>{
      pathOf(r.line,false);
      ctx.strokeStyle='rgba(105,165,205,.62)';ctx.lineWidth=Math.max(1,Math.min(2.4,view.scale*.75));ctx.stroke();
      if(view.scale>=3.4)label(r.name,X(r.line[r.line.length-1][0]),Y(r.line[r.line.length-1][1]),'#8ec5ea',10,'left');
    });
    /* 政权核心区 */
    const ps=activePolities();
    if(layers.polity)ps.forEach(p=>{
      const col=REG_COLOR[p.region]||REG_COLOR['*'];
      pathOf(p.ring,true);
      ctx.fillStyle=hexA(col,.18);ctx.fill();
      ctx.setLineDash([5,4]);ctx.lineWidth=1.3;ctx.strokeStyle=hexA(col,.9);ctx.stroke();
      ctx.setLineDash([]);
      if(view.scale>=2.6||(ps.length<=3&&view.scale>=1.6)){
        let sx=0,sy=0;p.ring.forEach(q=>{sx+=q[0];sy+=q[1];});
        label(shortName(p.name),X(sx/p.ring.length),Y(sy/p.ring.length),hexA(col,.95),Math.min(13,10+view.scale*.6));
      }
    });
    /* 航线 */
    activeRoutes().forEach(r=>{
      pathOf(r.line,false);
      ctx.setLineDash([3,5]);ctx.strokeStyle='rgba(230,205,140,.55)';ctx.lineWidth=1.2;ctx.stroke();ctx.setLineDash([]);
      if(view.scale>=2.2)label(r.name.split('（')[0],X(r.line[Math.floor(r.line.length/2)][0]),
        Y(r.line[Math.floor(r.line.length/2)][1]),'#e2c98a',10);
    });
    /* 城址 */
    A.cities.forEach(c=>{
      if(year<c.from||year>c.to)return;
      const x=X(c.lon),y=Y(c.lat);
      if(x<0||x>cssW||y<0||y>cssH)return;
      ctx.fillStyle='#f2e7cd';ctx.fillRect(x-2,y-2,4,4);
      if(view.scale>=3)label(c.name,x+5,y,'#f2e7cd',10,'left');
    });
    /* 地理单元 */
    A.units.forEach(u=>{
      const x=X(u.lon),y=Y(u.lat);
      if(x<0||x>cssW||y<0||y>cssH)return;
      ctx.beginPath();ctx.arc(x,y,hover&&hover.id===u.id?5:2.6,0,Math.PI*2);
      ctx.fillStyle=layers.local?'#77d6c0':(u.region==='*'?'#7fb8d8':'#c9a227');ctx.fill();
      ctx.strokeStyle='rgba(0,0,0,.55)';ctx.lineWidth=.8;ctx.stroke();
      if(view.scale>=4)label(u.name,x+6,y,'#d9cba8',9,'left');
    });
    /* 家族分布最上层，最清晰 */
    if(layers.family)drawFamily();
    /* 选中点 */
    if(picked){
      const x=X(picked.lon),y=Y(picked.lat);
      ctx.beginPath();ctx.arc(x,y,9,0,Math.PI*2);
      ctx.strokeStyle='#ffdf8a';ctx.lineWidth=1.6;ctx.stroke();
      label(picked.name,x,y-14,'#ffdf8a',11);
    }
    /* 比例尺 / 年份 / 免责 */
    const deg=30/view.scale;
    ctx.strokeStyle='rgba(230,220,195,.7)';ctx.lineWidth=1.5;
    ctx.beginPath();ctx.moveTo(14,cssH-18);ctx.lineTo(14+baseW/12*view.scale,cssH-18);ctx.stroke();
    label('约 '+Math.round(deg)+'°',14+baseW/24*view.scale,cssH-30,'#cdbf9f',10);
    label((year<0?'公元前 '+Math.abs(year)+' 年':year+' 年')+(isManual()?' · 手动查阅':' · 本局年份'),
      cssW-12,16,'#ffdf8a',11,'right');
    label('虚线＝政权核心区示意，非国界；热力＝相对重心，非人口统计',
      cssW-12,cssH-16,'rgba(230,220,195,.72)',9,'right');
    drawLegend(ps);
  }
  function drawLegend(ps){
    const rows=[],x=12,y=34;
    if(layers.polity&&ps.length)rows.push({c:'#c9a227',t:'并立政权 '+ps.length+' 个'});
    if(layers.climate)rows.push({c:'#7fa8d0',t:'气候影响区 '+activeClimate().length+' 条'});
    if(layers.pop)rows.push({c:'#e8d06a',t:'人口重心（示意）'});
    if(layers.family)rows.push({c:'#ffe08a',t:'本局家族 '+(family.dist||[]).reduce((s,d)=>s+d.count,0)+' 人'});
    if(layers.local)rows.push({c:'#77d6c0',t:'地方志图层 · 绿点关联本地史锚点'});
    if(!rows.length)return;
    ctx.fillStyle='rgba(16,20,24,.78)';ctx.fillRect(x-6,y-12,172,rows.length*17+14);
    rows.forEach((r,i)=>{
      ctx.fillStyle=r.c;ctx.fillRect(x,y+i*17-5,8,8);
      label(r.t,x+14,y+i*17,r.c,10,'left');
    });
  }

  /* ---------- 交互 ---------- */
  function emitList(force){
    const ps=activePolities(),cs=activeClimate();
    const key=year+'|'+Object.keys(layers).filter(k=>layers[k]).join(',')
      +'|'+ps.map(p=>p.id).join(',')+'|'+cs.map(c=>c.id).join(',')
      +'|'+(family.dist||[]).map(d=>d.unit+d.count).join(',');
    if(!force&&key===listKey)return;listKey=key;
    onList({year:year,polities:ps,routes:activeRoutes(),
      climate:cs,climateGlobal:cs.filter(c=>c.global).length,
      popTop:popTop(5),popEra:eraAt(year).name,
      family:family.dist||[],migrations:family.migrations||[],
      layers:Object.assign({},layers)});
  }
  function hit(sx,sy){
    let best=null,bd=14;
    /* 家族据点优先 */
    if(layers.family)(family.dist||[]).forEach(d=>{
      const k=kernelById(d.unit);if(!k)return;
      const dist=Math.hypot(X(k.lon)-sx,Y(k.lat)-sy);
      if(dist<bd){bd=dist;best={type:'family',id:d.unit,name:k.name,lat:k.lat,lon:k.lon,
        detail:'本局家族据点 · '+d.count+' 人'+(d.ruler?' · 当家在此':'')
          +'　（推演数据，不是史实人口）'};}
    });
    const scan=(arr,type)=>arr.forEach(o=>{
      if(type==='city'&&(year<o.from||year>o.to))return;
      const d=Math.hypot(X(o.lon)-sx,Y(o.lat)-sy);
      if(d<bd){bd=d;best={type:type,id:o.id,name:o.name,lat:o.lat,lon:o.lon,
        detail:type==='city'?'城址锚点 · 现代经纬度近似值':(o.fact||o.type||'')};}
    });
    scan(A.cities,'city');scan(A.units,'unit');
    /* 气候椭圆内部 */
    if(layers.climate&&!best)activeClimate().filter(c=>c.box).slice(0,8).forEach(c=>{
      const b=c.box,x=X(b.cx),y=Y(b.cy);
      const rx=Math.max(8,b.rx/360*baseW*view.scale),ry=Math.max(6,b.ry/180*baseH*view.scale);
      if(Math.pow((sx-x)/rx,2)+Math.pow((sy-y)/ry,2)<=1){
        best={type:'climate',id:c.id,name:c.title,lat:b.cy,lon:b.cx,
          detail:c.category+' · '+c.rawYear+'　'+c.caveat};}
    });
    return best;
  }
  function pickAt(sx,sy){
    const h=hit(sx,sy);picked=h;draw();
    onPick(h?{name:h.name,detail:h.detail,lat:h.lat,lon:h.lon,type:h.type,id:h.id,
      localOn:!!layers.local}:null);
  }
  function local(e){const r=cv.getBoundingClientRect();return {x:e.clientX-r.left,y:e.clientY-r.top};}
  function bind(){
    cv.addEventListener('wheel',e=>{
      e.preventDefault();const p=local(e);
      zoomAt(e.deltaY<0?1.18:1/1.18,p.x,p.y);
    },{passive:false});
    cv.addEventListener('pointerdown',e=>{
      cv.setPointerCapture(e.pointerId);
      const p=local(e);pointers.set(e.pointerId,{x:p.x,y:p.y});
      dragMoved=0;
    });
    cv.addEventListener('pointermove',e=>{
      const p=local(e),prev=pointers.get(e.pointerId);
      if(!prev){
        const h=hit(p.x,p.y);
        if((h&&h.id)!==(hover&&hover.id)){hover=h;draw();}
        return;
      }
      const dx=p.x-prev.x,dy=p.y-prev.y;
      if(pointers.size>=2){
        const arr=[...pointers.values()];
        const dist=Math.hypot(arr[0].x-arr[1].x,arr[0].y-arr[1].y);
        if(lastPinch>0&&dist>0){
          const cx=(arr[0].x+arr[1].x)/2,cy=(arr[0].y+arr[1].y)/2;
          zoomAt(dist/lastPinch,cx,cy);
        }
        lastPinch=dist;
      }else{
        view.tx+=dx;view.ty+=dy;dragMoved+=Math.abs(dx)+Math.abs(dy);
        clampView();draw();
      }
      pointers.set(e.pointerId,{x:p.x,y:p.y});
    });
    const up=e=>{
      const p=local(e),wasDrag=dragMoved>6;
      pointers.delete(e.pointerId);
      if(pointers.size<2)lastPinch=0;
      if(!wasDrag&&pointers.size===0)pickAt(p.x,p.y);
    };
    cv.addEventListener('pointerup',up);
    cv.addEventListener('pointercancel',up);
    cv.addEventListener('pointerleave',()=>{if(!pointers.size&&hover){hover=null;draw();}});
    if(!winBound){
      winBound=true;
      window.addEventListener('resize',()=>{if(cv&&cv.isConnected)resize();});
    }
  }
  function mount(canvas,opts){
    opts=opts||{};
    cv=canvas;ctx=cv.getContext('2d');
    onPick=opts.onPick||function(){};onList=opts.onList||function(){};
    year=gameYear=Math.round(opts.year||-5000);userYear=null;picked=null;hover=null;
    layers=Object.assign({polity:true,climate:true,pop:true,family:true,local:false},opts.layers||{});
    family=opts.family||{dist:[],migrations:[]};
    pointers=new Map();lastPinch=0;listKey='';
    resetView();bind();resize();emitList(true);
    return {zoom:zoom,reset:reset,setYear:setYear,followGame:followGame,
      getView:getView,getYear:getYear,setLayers:setLayers,getLayers:getLayers,setFamily:setFamily};
  }
  function refresh(){if(cv&&cv.isConnected){resize();emitList(true);}}
  W.atlas={mount:mount,zoom:zoom,reset:reset,setYear:setYear,followGame:followGame,refresh:refresh,
    setLayers:setLayers,getLayers:getLayers,setFamily:setFamily,
    getView:getView,getYear:getYear,activePolities:activePolities,activeClimate:activeClimate,
    popTop:popTop,popWeight:popWeight,
    meta:A.meta,layersMeta:L.meta,regColor:REG_COLOR};
  if(typeof module!=='undefined'&&module.exports)module.exports=W.atlas;
})((typeof window!=='undefined'?window:globalThis).WQN=((typeof window!=='undefined'?window:globalThis).WQN||{}));
