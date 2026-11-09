/* art.js —— 程序化美术（离线 SVG 几何装饰，零外部图片、零网络）
   纪律：只画色块、山脊、水波、器物剪影与重复纹样；不描摹旗徽与任何范围表达，也不宣称是任何考古纹饰的复原。
   确定性：由 年份／文明圈／时代／卷数／固定散列 决定，不调用主随机数，
        同种子同选择序列必得同一张图；不同卷与不同时代自然换色换纹。 */
(function(W){
  'use strict';
  const D=W.data,A=D.art||{},MUS=D.music||{};
  const ER=A.eras||[],REG=A.regions||{},SCN=A.scenes||{},GLY=A.glyphs||[];

  function hash(s){
    let h=0x811c9dc5;const t=String(s);
    for(let i=0;i<t.length;i++){h^=t.charCodeAt(i);h=(h*0x01000193)>>>0;}
    return h>>>0;
  }
  function seq(seed,n){
    let x=hash(seed)||1;const out=[];
    for(let i=0;i<n;i++){x=(x*1664525+1013904223)>>>0;out.push(x/4294967296);}
    return out;
  }
  const n=(v,d)=>Number(v).toFixed(d===undefined?1:d);
  function pal(era,reg){
    const e=ER[Math.max(0,Math.min(ER.length-1,era|0))]||ER[0]||{},
          r=REG[reg]||{};
    return {bg:e.bg||'#1b1a12',ink:e.ink||'#e8dcc2',accent:e.accent||'#c9a227',
      accent2:e.accent2||'#8f8067',sky:e.sky||'#242018',ground:e.ground||'#3a3421',
      light:e.light||'#e8c878',motif:e.motif||'cord',glyph:e.glyph||'hut',
      regionAccent:r.accent||e.accent||'#c9a227',regionMotif:r.motif||e.motif||'cord',
      regionGlyph:r.glyph||e.glyph||'hut',name:e.name||'',regionName:r.name||''};
  }
  function opt(o){
    o=o||{};
    return {year:o.year===undefined?-5000:o.year,reg:o.reg||'huaxia',era:o.era|0,
      vol:o.vol||1,seed:o.seed||((o.year||0)+'|'+(o.reg||'')+'|'+(o.era|0)+'|'+(o.vol||1)),
      hc:!!o.hc,kind:o.kind||'choice',w:o.w||360,h:o.h||132,label:o.label||''};
  }

  /* ---------- 纹样带：12 种几何重复 ---------- */
  function band(o,p,y,h,id){
    const r=seq(o.seed+'|band',64),k=p.regionMotif||p.motif;
    const c=p.regionAccent||p.accent,c2=p.accent2;
    let s='<g opacity="'+(o.hc?'0.95':'0.78')+'">';
    const W=o.w,step=18,count=Math.ceil(W/step)+1;
    for(let i=0;i<count;i++){
      const x=i*step,rr=r[i%r.length];
      if(k==='cord'||k==='zigzag'){
        s+='<path d="M'+n(x)+' '+n(y+h)+' l6 -'+n(h*0.7)+' l6 '+n(h*0.7)+'" '
          +'fill="none" stroke="'+c+'" stroke-width="1.4" opacity="'+n(0.4+rr*0.4,2)+'"/>';
      }else if(k==='lei'||k==='step'){
        s+='<path d="M'+n(x+1)+' '+n(y+h-1)+' h12 v-'+n(h*0.6)+' h-8 v'+n(h*0.3)+' h4" '
          +'fill="none" stroke="'+c+'" stroke-width="1.3"/>';
      }else if(k==='meander'){
        s+='<path d="M'+n(x)+' '+n(y+h*0.5)+' h5 v-'+n(h*0.32)+' h6 v'+n(h*0.64)+' h5" '
          +'fill="none" stroke="'+c+'" stroke-width="1.25"/>';
      }else if(k==='pearl'){
        s+='<circle cx="'+n(x+9)+'" cy="'+n(y+h*0.5)+'" r="'+n(1.8+rr*1.6,2)
          +'" fill="'+c+'"/>';
      }else if(k==='arabesque'){
        s+='<path d="M'+n(x)+' '+n(y+h)+' q9 -'+n(h*1.1)+' 18 0" fill="none" stroke="'+c+'" stroke-width="1.2"/>'
          +'<circle cx="'+n(x+9)+'" cy="'+n(y+h*0.28)+'" r="1.5" fill="'+c2+'"/>';
      }else if(k==='wave'){
        s+='<path d="M'+n(x)+' '+n(y+h*0.62)+' q4.5 -'+n(h*0.5)+' 9 0 t9 0" '
          +'fill="none" stroke="'+c+'" stroke-width="1.3"/>';
      }else if(k==='gear'){
        s+='<circle cx="'+n(x+9)+'" cy="'+n(y+h*0.5)+'" r="5" fill="none" stroke="'+c+'" stroke-width="1.2"/>'
          +'<path d="M'+n(x+9)+' '+n(y+h*0.5-8)+' v3 M'+n(x+9)+' '+n(y+h*0.5+5)+' v3" stroke="'+c+'" stroke-width="1.2"/>';
      }else if(k==='grid'){
        s+='<path d="M'+n(x)+' '+n(y)+' v'+n(h)+' M'+n(x+9)+' '+n(y)+' v'+n(h)+'" '
          +'stroke="'+c+'" stroke-width="0.7" opacity="0.65"/>';
      }else if(k==='reed'){
        s+='<path d="M'+n(x+9)+' '+n(y+h)+' q-5 -'+n(h*0.6)+' 2 -'+n(h*0.95)
          +'" fill="none" stroke="'+c+'" stroke-width="1.2"/>';
      }else if(k==='star'){
        s+='<circle cx="'+n(x+2+rr*14)+'" cy="'+n(y+2+rr*(h-4))+'" r="'+n(0.6+rr*1.1,2)
          +'" fill="'+c+'"/>';
      }else{
        s+='<rect x="'+n(x+3)+'" y="'+n(y+h*0.4)+'" width="11" height="'+n(h*0.3)
          +'" fill="none" stroke="'+c+'" stroke-width="1"/>';
      }
    }
    s+='</g>';
    return s;
  }

  function ridges(o,p,baseY,id){
    const r=seq(o.seed+'|ridge',22);
    let s='';
    for(let layer=0;layer<3;layer++){
      const y=baseY-layer*17,amp=10+layer*7;
      let d='M0 '+n(o.h)+' L0 '+n(y)+' ';
      for(let i=0;i<=10;i++){
        const x=i*o.w/10, yy=y-Math.abs(Math.sin(i*1.7+layer*2+r[i]*2))*amp-r[i]*4;
        d+='L'+n(x)+' '+n(yy)+' ';
      }
      d+='L'+n(o.w)+' '+n(o.h)+' Z';
      s+='<path d="'+d+'" fill="'+(layer===0?p.ground:(layer===1?p.sky:p.bg))
        +'" opacity="'+n(0.55+layer*0.2,2)+'"/>';
    }
    return s;
  }
  function sky(o,p,id){
    let s='<rect width="'+o.w+'" height="'+o.h+'" fill="url(#sky'+id+')"/>';
    const r=seq(o.seed+'|stars',26);
    s+='<g opacity="'+(o.hc?'0.5':'0.72')+'">';
    for(let i=0;i<18;i++){
      const x=r[i]*o.w,y=r[(i+7)%r.length]*o.h*0.55,rr=0.5+r[(i+13)%r.length]*1.1;
      s+='<circle cx="'+n(x)+'" cy="'+n(y)+'" r="'+n(rr,2)+'" fill="'+p.light+'"/>';
    }
    s+='</g>';
    return s;
  }
  /* 器物剪影：只作氛围索引，不对应具体文物形制 */
  function glyph(o,p,key,cx,cy,scale){
    const k=key||p.regionGlyph||p.glyph,c=p.regionAccent,z=scale||1;
    const t=(sh)=>'translate('+n(cx)+' '+n(cy)+') scale('+n(z,2)+')';
    let s='<g transform="'+t()+'" fill="none" stroke="'+c+'" stroke-width="2" '
      +'stroke-linecap="round" stroke-linejoin="round" opacity="0.92">';
    if(k==='hut')s+='<path d="M-22 8 L0 -18 L22 8 Z"/><path d="M-7 8 v-10 h14 v10"/>';
    else if(k==='vessel')s+='<path d="M-11 -16 h22 l-3 6 q7 8 5 18 q-2 8 -13 8 q-11 0 -13 -8 q-2 -10 5 -18 Z"/>'
      +'<path d="M-14 -16 h28"/><path d="M-9 6 q9 5 18 0"/>';
    else if(k==='column')s+='<path d="M-16 16 h32 M-12 -16 h24 M-10 12 v-26 M-3 12 v-26 M4 12 v-26 M11 12 v-26"/>'
      +'<path d="M-13 -16 l13 -9 l13 9"/>';
    else if(k==='camel')s+='<path d="M-20 12 q6 -18 14 -14 q4 -10 9 -3 q6 -6 10 4 q3 10 -2 13"/>'
      +'<path d="M-14 12 v8 M12 12 v8 M-3 12 v8"/>';
    else if(k==='arch')s+='<path d="M-16 16 v-18 a16 16 0 0 1 32 0 v18"/><path d="M-9 16 v-16 a9 9 0 0 1 18 0 v16"/>';
    else if(k==='ship')s+='<path d="M-22 10 h44 l-7 10 h-30 Z"/><path d="M0 10 v-28 M0 -18 l16 24 H0"/>';
    else if(k==='wheel')s+='<circle cx="0" cy="0" r="17"/><circle cx="0" cy="0" r="4"/>'
      +'<path d="M0 -17 v34 M-17 0 h34 M-12 -12 l24 24 M12 -12 l-24 24"/>';
    else if(k==='tower')s+='<path d="M-12 18 h24 M-9 18 v-34 h18 v34 M-9 -10 h18 M-9 2 h18"/>'
      +'<path d="M0 -16 v-8"/>';
    else if(k==='orbit')s+='<circle cx="0" cy="0" r="7"/><ellipse cx="0" cy="0" rx="22" ry="9" '
      +'transform="rotate(-24)"/><circle cx="19" cy="-8" r="2.4" fill="'+c+'"/>';
    else if(k==='tablet')s+='<rect x="-13" y="-18" width="26" height="36" rx="3"/>'
      +'<path d="M-8 -10 h16 M-8 -3 h16 M-8 4 h11 M-8 11 h14"/>';
    else if(k==='reed')s+='<path d="M0 18 q-10 -16 -3 -34 M0 18 q10 -16 3 -34 M-2 2 q-12 -8 -13 -18 M2 2 q12 -8 13 -18"/>';
    else if(k==='seal')s+='<rect x="-15" y="-15" width="30" height="30" rx="4"/>'
      +'<path d="M-8 -6 h16 M-8 0 h16 M-8 6 h10"/><circle cx="8" cy="7" r="3"/>';
    else if(k==='step')s+='<path d="M-20 18 h40 v-9 h-10 v-9 h-10 v-9 h-10 v-9 h-10 Z"/>';
    else if(k==='horse')s+='<path d="M-20 12 q8 -14 18 -12 q5 -10 10 -3 q6 2 8 10"/>'
      +'<path d="M-14 12 v8 M10 12 v8 M-3 12 v8 M12 -2 l6 -8"/>';
    else s+='<circle cx="0" cy="0" r="14"/><path d="M-20 0 h40 M0 -20 v40"/>';
    s+='</g>';
    return s;
  }
  function defs(o,p,id){
    return '<defs>'
      +'<linearGradient id="sky'+id+'" x1="0" y1="0" x2="0" y2="1">'
      +'<stop offset="0%" stop-color="'+p.sky+'"/><stop offset="100%" stop-color="'+p.bg+'"/></linearGradient>'
      +'<linearGradient id="fade'+id+'" x1="0" y1="0" x2="0" y2="1">'
      +'<stop offset="0%" stop-color="'+p.accent+'" stop-opacity="0.28"/>'
      +'<stop offset="100%" stop-color="'+p.accent+'" stop-opacity="0"/></linearGradient>'
      +'</defs>';
  }
  function frame(o,p,id){
    const t=o.hc?'#fff4dc':p.accent;
    return '<rect x="1.5" y="1.5" width="'+(o.w-3)+'" height="'+(o.h-3)
      +'" rx="9" fill="none" stroke="'+t+'" stroke-width="1" opacity="'+(o.hc?'0.85':'0.42')+'"/>';
  }
  function label(o,p,txt){
    if(!txt)return '';
    const w=Math.min(o.w-24,txt.length*11+18),x=o.w-w-9;
    return '<g><rect x="'+n(x)+'" y="9" width="'+n(w)+'" height="19" rx="9" '
      +'fill="'+p.bg+'" opacity="0.78" stroke="'+p.accent+'" stroke-opacity="0.45"/>'
      +'<text x="'+n(x+w/2)+'" y="22.5" text-anchor="middle" font-size="10" '
      +'font-family="sans-serif" fill="'+(o.hc?'#fff4dc':p.ink)+'">'+txt+'</text></g>';
  }

  /* ---------- 场景 ---------- */
  function scene(kind,o0){
    const o=opt(Object.assign({},o0,{kind:kind})),p=pal(o.era,o.reg),
          id=hash(o.seed+'|'+kind).toString(36).slice(0,6),
          cfg=SCN[kind]||SCN.choice||{},els=cfg.elements||[];
    const H=o.h,W=o.w;
    let s='<svg class="artsvg artscene" viewBox="0 0 '+W+' '+H+'" '
      +'preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" '
      +'aria-hidden="true" focusable="false">'+defs(o,p,id);
    s+=sky(o,p,id);
    /* 天光 */
    s+='<rect x="0" y="'+n(H*0.28)+'" width="'+W+'" height="'+n(H*0.34)
      +'" fill="url(#fade'+id+')" opacity="0.7"/>';
    const horizon=H*0.68;
    if(els.indexOf('ridges')>=0)s+=ridges(o,p,horizon,id);
    s+='<rect x="0" y="'+n(horizon)+'" width="'+W+'" height="'+n(H-horizon)
      +'" fill="'+p.ground+'" opacity="0.82"/>';
    if(els.indexOf('river')>=0){
      s+='<path d="M-10 '+n(H*0.82)+' C'+n(W*0.28)+' '+n(H*0.64)+' '+n(W*0.62)
        +' '+n(H*0.96)+' '+n(W+10)+' '+n(H*0.74)+' L'+n(W+10)+' '+H+' L-10 '+H+' Z" '
        +'fill="'+p.accent2+'" opacity="0.55"/>'
        +'<path d="M-10 '+n(H*0.84)+' C'+n(W*0.3)+' '+n(H*0.68)+' '+n(W*0.64)
        +' '+n(H*0.98)+' '+n(W+10)+' '+n(H*0.77)+'" fill="none" stroke="'+p.light
        +'" stroke-width="1.4" opacity="0.55"/>';
    }
    if(els.indexOf('moon')>=0||els.indexOf('sun')>=0){
      s+='<circle cx="'+n(W*0.78)+'" cy="'+n(H*0.24)+'" r="15" fill="'+p.light+'" opacity="0.82"/>'
        +'<circle cx="'+n(W*0.78)+'" cy="'+n(H*0.24)+'" r="24" fill="none" stroke="'+p.light
        +'" stroke-width="1" opacity="0.3"/>';
    }
    if(els.indexOf('stars')>=0){
      const r=seq(o.seed+'|firestars',20);
      for(let i=0;i<7;i++)s+='<circle cx="'+n(r[i]*W)+'" cy="'+n(r[(i+3)%r.length]*H*0.4)
        +'" r="'+n(0.8+r[(i+6)%r.length]*1.2,2)+'" fill="'+p.light+'" opacity="0.8"/>';
    }
    if(els.indexOf('fire')>=0){
      const cx=W*0.5,cy=horizon+8;
      s+='<ellipse cx="'+n(cx)+'" cy="'+n(cy+16)+'" rx="30" ry="7" fill="'+p.accent+'" opacity="0.2"/>'
        +'<path d="M'+n(cx)+' '+n(cy-26)+' q12 16 8 26 q-4 9 -16 0 q-6 -12 8 -26 Z" '
        +'fill="'+p.light+'" opacity="0.9"/>'
        +'<path d="M'+n(cx)+' '+n(cy-13)+' q6 9 3 15 q-3 4 -7 0 q-3 -7 4 -15 Z" '
        +'fill="#fff3c8" opacity="0.85"/>'
        +'<path d="M'+n(cx-19)+' '+n(cy+14)+' l19 -8 l19 8" fill="none" stroke="'+p.accent2
        +'" stroke-width="3" stroke-linecap="round"/>';
    }
    if(els.indexOf('figures')>=0){
      [W*0.28,W*0.72].forEach((x,i)=>{
        s+='<g fill="'+p.ink+'" opacity="0.62" transform="translate('+n(x)+' '+n(horizon+2)+')">'
          +'<circle cx="0" cy="-13" r="3.5"/><path d="M-3.5 -9 h7 l2 15 h-11 Z"/></g>';
      });
    }
    if(els.indexOf('tree')>=0){
      const cx=W*0.24,cy=horizon;
      s+='<path d="M'+n(cx)+' '+n(cy+12)+' v-34 M'+n(cx)+' '+n(cy-14)+' q-16 -10 -22 -22 '
        +'M'+n(cx)+' '+n(cy-20)+' q16 -12 24 -20" fill="none" stroke="'+p.ink
        +'" stroke-width="2.4" opacity="0.75"/>'
        +'<circle cx="'+n(cx-21)+'" cy="'+n(cy-36)+'" r="9" fill="'+p.accent2+'" opacity="0.35"/>'
        +'<circle cx="'+n(cx+23)+'" cy="'+n(cy-38)+'" r="10" fill="'+p.accent2+'" opacity="0.3"/>';
    }
    if(els.indexOf('path')>=0){
      s+='<path d="M'+n(W*0.52)+' '+H+' Q'+n(W*0.44)+' '+n(horizon+18)+' '+n(W*0.55)
        +' '+n(horizon)+'" fill="none" stroke="'+p.light+'" stroke-width="2" '
        +'stroke-dasharray="4 7" opacity="0.5"/>';
    }
    if(els.indexOf('gate')>=0){
      s+='<g fill="none" stroke="'+p.ink+'" stroke-width="3" opacity="0.72">'
        +'<path d="M'+n(W*0.28)+' '+n(horizon+12)+' v-42 h'+n(W*0.44)+' v42"/>'
        +'<path d="M'+n(W*0.28)+' '+n(horizon-36)+' h'+n(W*0.44)+'"/></g>'
        +'<rect x="'+n(W*0.28)+'" y="'+n(horizon-30)+'" width="'+n(W*0.44)+'" height="5" '
        +'fill="'+p.accent+'" opacity="0.6"/>';
    }
    if(els.indexOf('bands')>=0){
      s+='<rect x="0" y="'+n(horizon-2)+'" width="'+W+'" height="6" fill="'+p.accent+'" opacity="0.55"/>'
        +'<rect x="0" y="'+n(horizon+7)+'" width="'+W+'" height="4" fill="'+p.accent2+'" opacity="0.55"/>';
    }
    if(els.indexOf('scroll')>=0||els.indexOf('book')>=0){
      const bw=W*0.34,bx=W*0.33,by=horizon-24;
      s+='<g><rect x="'+n(bx)+'" y="'+n(by)+'" width="'+n(bw)+'" height="34" rx="3" '
        +'fill="'+p.ink+'" opacity="0.82"/>'
        +'<rect x="'+n(bx-5)+'" y="'+n(by-3)+'" width="8" height="40" rx="4" fill="'+p.accent+'"/>'
        +'<rect x="'+n(bx+bw-3)+'" y="'+n(by-3)+'" width="8" height="40" rx="4" fill="'+p.accent+'"/>'
        +'<path d="M'+n(bx+10)+' '+n(by+11)+' h'+n(bw-20)+' M'+n(bx+10)+' '+n(by+19)
        +' h'+n(bw-26)+' M'+n(bx+10)+' '+n(by+27)+' h'+n(bw-32)+'" stroke="'+p.bg
        +'" stroke-width="1.4" opacity="0.65"/></g>';
    }
    if(els.indexOf('compass')>=0){
      s+='<g transform="translate('+n(W*0.76)+' '+n(horizon-16)+')" fill="none" stroke="'+p.light+'" '
        +'opacity="0.7"><circle r="17" stroke-width="1.4"/><path d="M0 -22 v44 M-22 0 h44" '
        +'stroke-width="1"/><path d="M0 -13 l5 13 l-5 -3 l-5 3 Z" fill="'+p.accent+'" stroke="none"/></g>';
    }
    if(els.indexOf('roots')>=0||els.indexOf('dots')>=0){
      const r=seq(o.seed+'|dots',20);
      for(let i=0;i<9;i++)s+='<circle cx="'+n(12+r[i]*(W-24))+'" cy="'+n(horizon+4+r[i+9]*22)
        +'" r="'+n(1+r[i+4]*2,2)+'" fill="'+p.regionAccent+'" opacity="0.55"/>';
    }
    const gk=els.indexOf('glyph')>=0?(p.regionGlyph||p.glyph):null;
    if(gk)s+=glyph(o,p,gk,W*0.5,horizon-24,0.9);
    /* 底部纹样带 */
    s+=band(o,p,H-16,14,id);
    s+=frame(o,p,id)+label(o,p,o.label)+'</svg>';
    return s;
  }
  function escAttr(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');}

  /* ---------- 横幅：压得矮，不抢文字 ---------- */
  function banner(o0){
    const o=opt(Object.assign({},o0,{h:o0&&o0.h||88,kind:'banner'})),
          p=pal(o.era,o.reg),id=hash(o.seed+'|banner').toString(36).slice(0,6);
    let s='<svg class="artsvg artbanner" viewBox="0 0 '+o.w+' '+o.h+'" '
      +'preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" '
      +'aria-hidden="true" focusable="false">'+defs(o,p,id);
    s+=sky(o,p,id).replace(/<g opacity="[^"]*">/, '<g opacity="0.45">');
    s+='<rect x="0" y="'+n(o.h*0.42)+'" width="'+o.w+'" height="'+n(o.h*0.3)
      +'" fill="url(#fade'+id+')"/>';
    s+=ridges(o,p,o.h*0.82,id);
    s+='<rect x="0" y="'+n(o.h*0.82)+'" width="'+o.w+'" height="'+n(o.h*0.18)
      +'" fill="'+p.ground+'" opacity="0.8"/>';
    s+=glyph(o,p,p.regionGlyph,o.w*0.82,o.h*0.62,0.52);
    s+=band(o,p,o.h-11,10,id);
    s+=frame(o,p,id)+label(o,p,o.label||p.name)+'</svg>';
    return s;
  }
  /* ---------- 分隔纹样：一行细带 ---------- */
  function ornament(kind,o0){
    const o=opt(Object.assign({},o0,{h:o0&&o0.h||22,kind:'ornament'})),
          p=pal(o.era,o.reg),id=hash(o.seed+'|orn').toString(36).slice(0,6);
    return '<svg class="artsvg artorn" viewBox="0 0 '+o.w+' '+o.h+'" '
      +'preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">'
      +'<rect width="'+o.w+'" height="'+o.h+'" fill="'+p.bg+'" opacity="0.5"/>'
      +band(o,p,1,o.h-2,id)+'</svg>';
  }
  /* ---------- 小图标：页签与按钮 ---------- */
  const ICONS={
    brush:'M3 17 q6 -12 14 -12 q3 0 3 3 q0 3 -3 3 q-5 0 -6 6 Z',
    note:'M7 14 V4 l9 -2 v10 M7 7 h9 M5 16 a2 2 0 1 0 4 0 a2 2 0 1 0 -4 0 M14 14 a2 2 0 1 0 4 0 a2 2 0 1 0 -4 0',
    scroll:'M5 3 h12 v14 H5 Z M5 3 a3 3 0 0 0 0 6 M17 17 a3 3 0 0 0 0 -6 M8 8 h6 M8 11 h6',
    tree:'M10 18 v-6 M10 12 l-5 -4 M10 12 l5 -4 M10 8 l-4 -4 M10 8 l4 -4',
    globe:'M10 2 a8 8 0 1 0 0 16 a8 8 0 1 0 0 -16 M2 10 h16 M10 2 q5 8 0 16 M10 2 q-5 8 0 16',
    book:'M3 4 h7 v13 H3 Z M11 4 h7 v13 h-7 Z M3 4 q3 -2 7 0 M11 4 q3 -2 7 0',
    gear:'M10 6 a4 4 0 1 0 0 8 a4 4 0 1 0 0 -8 M10 1 v3 M10 16 v3 M1 10 h3 M16 10 h3 M4 4 l2 2 M14 14 l2 2 M16 4 l-2 2 M6 14 l-2 2',
    sound:'M3 8 h4 l5 -4 v12 l-5 -4 H3 Z M14 7 q3 3 0 6 M16 5 q5 5 0 10',
    mute:'M3 8 h4 l5 -4 v12 l-5 -4 H3 Z M14 7 l5 6 M19 7 l-5 6',
    palette:'M10 2 a8 8 0 0 0 0 16 q2 0 2 -2 q0 -2 2 -2 h2 a2 2 0 0 0 2 -2 a8 8 0 0 0 -8 -10 Z M6 8 h1 M9 6 h1 M13 7 h1 M6 12 h1'
  };
  function icon(name,size,color){
    const d=ICONS[name]||ICONS.scroll,z=size||16,c=color||'currentColor';
    return '<svg class="articon" width="'+z+'" height="'+z+'" viewBox="0 0 20 20" '
      +'fill="none" stroke="'+c+'" stroke-width="1.5" stroke-linecap="round" '
      +'stroke-linejoin="round" aria-hidden="true"><path d="'+d+'"/></svg>';
  }

  W.art={pal:pal,banner:banner,scene:scene,ornament:ornament,icon:icon,
    glyphs:GLY,motifs:A.motifs||[],scenes:SCN,eras:ER,regions:REG,hash:hash,seq:seq,
    note:(A.meta||{}).discipline||'',paletteNote:(A.meta||{}).paletteNote||''};
  if(typeof module!=='undefined'&&module.exports)module.exports=W.art;
})((typeof window!=='undefined'?window:globalThis).WQN=((typeof window!=='undefined'?window:globalThis).WQN||{}));
