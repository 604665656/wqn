/* 第十套：v2.7 横向画布左右分栏、统一旋转、拖动换算、点按台词与语音包接口 */
'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..');
const OFF=require('../tools/check_offline.js');
const read=p=>fs.readFileSync(path.join(ROOT,p),'utf8');
let fails=0;
function run(name,fn){try{fn();console.log('  ✓ '+name);}catch(e){fails++;console.log('  ✗ '+name+' → '+e.message);}}
console.log('=== 左右布局与向导台词专项 ===');

const css=read('src/style.css'),ui=read('src/ui.js'),stage=read('src/stage.js');
const C=JSON.parse(read('data/character.json'));

run('向导台词 7 组 / 29 条，每条都带语音包 id',()=>{
  const G=C.guideLines||{};
  assert.strictEqual(Object.keys(G).length,7);
  const all=[].concat(...Object.values(G));
  assert.strictEqual(all.length,29);
  all.forEach(x=>{assert.ok(x.t&&x.t.length>=8,'台词过短');
    assert.ok(/^g_[a-z]+_\d+$/.test(x.voice),'语音 id 不规范 '+x.voice);});
});
run('语音包接口预留：enabled / format / entries / note 齐全，当前为空实现',()=>{
  const V=C.voicePack||{};
  ['enabled','format','entries','note'].forEach(k=>assert.ok(k in V,'缺 '+k));
  assert.strictEqual(V.enabled,false);
  assert.strictEqual(Object.keys(V.entries).length,0);
  assert.ok(V.note.indexOf('内嵌')>=0);
});
run('台词不含送审敏感措辞',()=>{
  const txt=JSON.stringify(C.guideLines);
  ['国界','疆界','疆域','领土','主权','版图','人种','蛮夷','血统','被弑','占卜','祭司','野史','演义','外星','狂想']
    .forEach(w=>assert.ok(txt.indexOf(w)<0,'命中 '+w));
});
run('默认 47 分栏、猫左字右；一键互换有完整反向规则',()=>{
  assert.ok(css.indexOf('html.landscape{--split:47}')>=0);
  assert.ok(/html\.landscape #app > \.panel\.on[\s\S]{0,160}right:2%!important/.test(css));
  assert.ok(/html\.landscape \.stage-char[\s\S]{0,260}left:2%!important/.test(css));
  assert.ok(css.indexOf('html.landscape.stage-flip #app > .panel.on')>=0);
  assert.ok(css.indexOf('html.landscape.stage-flip .stage-char')>=0);
});
run('猫热区 / 分割条 / 台词气泡三个节点都在舞台模板里',()=>{
  ['id="charHit"','id="splitGrip"','id="guideBubble"'].forEach(x=>
    assert.ok(stage.indexOf(x)>=0,'缺 '+x));
  assert.ok(css.indexOf('touch-action:none')>=0);
  assert.ok(css.indexOf('html.dragging-char .stage-char{animation:none!important')>=0);
});
run('台词气泡沿用全局 --veil，且文字有描边与浅色光晕',()=>{
  assert.ok(css.indexOf('background:rgba(255,250,238,var(--veil))')>=0);
  assert.ok(css.indexOf('-webkit-text-stroke:.16px #241a10')>=0);
});
run('页签与退出条在 rot90 下移入旋转容器并改用 absolute',()=>{
  assert.ok(ui.indexOf('function rotChrome()')>=0&&ui.indexOf('function unrotChrome()')>=0);
  assert.ok(ui.indexOf('if(ROT90)rotChrome();else unrotChrome();')>=0);
  assert.strictEqual((ui.match(/app\.innerHTML=h;if\(ROT90\)rotChrome\(\);/g)||[]).length,2);
  assert.ok(/html\.landscape\.rot90 \.tabs[\s\S]{0,220}position:absolute!important/.test(css));
  assert.ok(/html\.landscape\.rot90 #landHint[\s\S]{0,420}position:absolute!important/.test(css));
  assert.ok(css.indexOf(':not(.tabs):not(#splitGrip):not(#charHit):not(#guideBubble)')>=0);
});
run('拖动做旋转坐标换算，不再直接用屏幕 dx/dy',()=>{
  assert.ok(ui.indexOf('function rotDelta(dx,dy){return ROT90?{u:dy,v:-dx}:{u:dx,v:dy};}')>=0);
  assert.ok(ui.indexOf('const rd=rotDelta(dx,dy);')>=0);
  assert.ok(ui.indexOf('CHAROFF.x=Math.max(-limX,Math.min(limX,DRAG.dx+rd.u))')>=0);
  assert.ok(ui.indexOf('fromHit:1')>=0);
  assert.ok(ui.indexOf('setPointerCapture(e.pointerId)')>=0);
  assert.ok(ui.indexOf('document.documentElement.classList.add(\'dragging-char\')')>=0);
});
run('分栏滑杆、互换、复位、拖动把手四条入口都在',()=>{
  ['input[data-split]','[data-flip]','[data-split-reset]','#splitGrip',
   'function applySplit()','function saveSplit()','applySplit();applyHint();'].forEach(x=>
    assert.ok(ui.indexOf(x)>=0,'缺 '+x));
});
run('点猫出台词、语音包钩子与朗读回退都在，且不碰主随机数',()=>{
  assert.ok(ui.indexOf('vibe(18);showGuideLine();')>=0);
  assert.ok(ui.indexOf('W.guideVoice.play(item.voice,src,item.t)')>=0);
  assert.ok(ui.indexOf('TAP_N++')>=0);
  assert.ok(ui.indexOf('E.rng')<0||true);  // 占位：台词只用模块内计数
  assert.ok(!/showGuideLine[\s\S]{0,900}E\.rng|rng\(\)/.test(ui),'台词调用主随机数');
});
run('两个构建产物均含新结构且离线自检通过',()=>{
  ['../../wqn.html','../../wqn-review.html'].forEach(f=>{
    const p=path.join(__dirname,f),h=fs.readFileSync(p,'utf8');
    assert.ok(h.indexOf('guideLines')>=0&&h.indexOf('splitGrip')>=0);
    const r=OFF.check(h,path.basename(p));
    assert.ok(r.ok,r.issues.join('；'));
  });
});
run('设置页写清默认猫左字右、语音包接口与统一旋转',()=>{
  assert.ok(ui.indexOf('默认猫在左、字在右')>=0);
  assert.ok(ui.indexOf('语音包接口已留好')>=0);
  assert.ok(ui.indexOf('不再一半正一半倒')>=0);
});
console.log(fails?'\n❌ '+fails+' 项失败':'\n✅ 左右布局与向导台词专项全部通过');
if(fails)process.exit(1);
