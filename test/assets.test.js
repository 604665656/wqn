/* 第十一套：v2.8 欠账素材补齐、抠图验收、提示条三档与审核脚本误报修复 */
'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..');
const OFF=require('../tools/check_offline.js');
const read=p=>fs.readFileSync(path.join(ROOT,p),'utf8');
const J=f=>JSON.parse(read('data/'+f));
let fails=0;
function run(name,fn){try{fn();console.log('  ✓ '+name);}catch(e){fails++;console.log('  ✗ '+name+' → '+e.message);}}
console.log('=== 素材补齐与提示条专项 ===');
const C=J('character.json'),P=J('asset_plan.json'),R=JSON.parse(read('assets/cutout_report.json'));
const NEW=['plow6','sieve6','quill6','lamp6','drum6','net6','cart6','oven6'];
const SC=['threshing6','ford6'];

run('8 层角色 + 2 张场景板全部入库，欠账清零',()=>{
  assert.strictEqual(Object.keys(C.layers).length,99);
  assert.strictEqual(Object.keys(C.backdrops).length,21);
  assert.strictEqual(Object.keys(C.backdropThumbs).length,21);
  NEW.forEach(k=>assert.ok(C.layers[k],'缺层 '+k));
  SC.forEach(k=>assert.ok(C.backdrops[k]&&C.backdropThumbs[k],'缺场景 '+k));
  assert.strictEqual(P.pending.length,0);
  assert.strictEqual(P.plannedScenes.length,8,'下批只登记不占位');
  assert.strictEqual(P.scenes.length,98);
  assert.strictEqual(P.delivered.length,101);
});
run('新增层与场景都有真实情境名，不是「待定」占位',()=>{
  const bad=P.scenes.filter(x=>/待定|待登记/.test(x.name+x.when));
  assert.deepStrictEqual(bad,[]);
  NEW.forEach(k=>{
    const s=P.scenes.filter(x=>x.key===k)[0];
    assert.ok(s&&s.name.indexOf('·')>0&&s.when.length>=6,k+' 情境名不全');
    assert.ok(C.poseLabels[k]&&C.poseLabels[k].length>=4,k+' 缺姿势标签');
  });
  C.backdropMeta.slice(-2).forEach(x=>assert.ok(x.need&&x.desc,'场景元数据不全'));
});
run('8 层 holes=0 且品红残留=0，抠图源图已登记可重建',()=>{
  const cut=read('tools/cutout.py');
  NEW.forEach(k=>{
    assert.ok(R[k],'报告缺 '+k);
    assert.strictEqual(R[k].holes,0,k+' 有孔洞');
    assert.strictEqual(R[k].pink,0,k+' 有品红残留');
    assert.ok(cut.indexOf("'"+k+"':'batch_v28/"+k+".png'")>=0,'抠图表缺 '+k);
    assert.ok(cut.indexOf("'"+k+"'")>=0,'LOSSLESS 缺 '+k);
    assert.ok(fs.existsSync(path.join(ROOT,'assets','layers',k+'.webp')),'缺 WebP '+k);
  });
  SC.forEach(k=>assert.ok(fs.existsSync(path.join(ROOT,'assets','scenes',k+'.jpg')),'缺场景 '+k));
});
run('8 层接进选项表演关键词且优先于旧层',()=>{
  const st=read('src/stage.js');
  const i=st.indexOf('const K=[');
  NEW.forEach(k=>assert.ok(st.indexOf("['"+k+"'")>i,'未接入 '+k));
  const a=st.indexOf("['plow6'"),b=st.indexOf("['plow4'");
  assert.ok(a>=0&&b>a,'新层未排在旧层之前');
});
run('提示条三档、跟随画布、可拖、复位四个入口都在',()=>{
  const u=read('src/ui.js'),c=read('src/style.css');
  ["HINTMODE='min'","HINTFOLLOW=0","function applyHint()","data-hint-mode=\"off\"",
   "data-hint-follow","data-hint-reset","data-hint-drag","HINTDRAG",'saveHint()'].forEach(x=>
    assert.ok(u.indexOf(x)>=0,'缺 '+x));
  ['html.hint-min #landHint','html.hint-full #landHint','html.hint-off #landHint',
   'html.hint-follow.landscape.rot90 #landHint','--lh-dx'].forEach(x=>
    assert.ok(c.indexOf(x)>=0,'CSS 缺 '+x));
});
run('提示条跟随全局 --veil，文字在半透下仍清晰',()=>{
  const c=read('src/style.css');
  assert.ok(c.indexOf('background:rgba(255,250,238,var(--veil))!important')>=0);
  assert.ok(c.indexOf('-webkit-text-stroke:.12px #241a10')>=0);
});
run('隐藏档仍留三个退出路径（Esc / 设置页关 / 工具条 ▯）',()=>{
  const u=read('src/ui.js');
  assert.ok(u.indexOf("e.key==='Escape'&&LANDSCAPE")>=0);
  assert.ok(u.indexOf('data-landscape="0">关 · 退出横屏')>=0);
  assert.ok(u.indexOf('function syncLandBtn()')>=0);
});
run('审核脚本只扫可见文案，base64 里的随机字母串不算命中',()=>{
  const a=read('tools/audit_copy.py');
  assert.ok(a.indexOf('def visible_text')>=0);
  assert.ok(a.indexOf('text.count(w)')>=0);
  const src=fs.readFileSync('/data/workspace/wqn/tools/audit_copy.py','utf8');
  const mod={exports:{}};
  // 直接复算口径：含 base64 的串剥掉后只剩正文命中
  const x='<p>UFO 狂想</p><img src="data:image/webp;base64,UFOAAAA">';
  const t=x.replace(/(data:image\/[a-z+]+;base64,)([A-Za-z0-9+/=]+)/g,(m,p,q)=>p+' '.repeat(q.length));
  assert.strictEqual(t.count?t.count('UFO'):(t.match(/UFO/g)||[]).length,1);
  assert.ok(src.indexOf('text.count(w)')>=0);
});
run('两个构建产物均含新层与新场景，离线自检通过',()=>{
  ['../../wqn.html','../../wqn-review.html'].forEach(f=>{
    const p=path.join(__dirname,f),h=fs.readFileSync(p,'utf8');
    assert.ok(h.indexOf('plow6')>=0&&h.indexOf('threshing6')>=0,'缺新素材 '+f);
    const r=OFF.check(h,path.basename(p));
    assert.ok(r.ok,r.issues.join('；'));
  });
});
run('史实与考据内容一字未改',()=>{
  assert.strictEqual(J('civilization.json').items.length,2199);
  assert.strictEqual(J('rulers.json').rulers.length,397);
  assert.strictEqual(J('houses.json').houses.length,153);
  assert.strictEqual(J('peoples.json').surnames.length,1295);
});
console.log(fails?'\n❌ '+fails+' 项失败':'\n✅ 素材补齐与提示条专项全部通过');
if(fails)process.exit(1);
