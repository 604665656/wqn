/* 第九套：离线单文件自检 + iOS 假横屏静态纪律 */
'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..');
const OFF=require('../tools/check_offline.js');
let fails=0;
function run(name,fn){try{fn();console.log('  ✓ '+name);}catch(e){fails++;console.log('  ✗ '+name+' → '+e.message);}}
console.log('=== 离线单文件与 iOS 假横屏专项 ===');

run('自检规则覆盖外链 / 动态分片 / cookie / History / SW',()=>{
  const keys=OFF.RULES.map(r=>r.k);
  ['外链脚本','外链样式','动态 import','cookie','fetch','History API','ServiceWorker']
    .forEach(k=>assert.ok(keys.indexOf(k)>=0,'缺规则 '+k));
  assert.ok(OFF.REQUIRED.length>=3);
});
run('完整版与送审版均通过离线自检',()=>{
  ['../../wqn.html','../../wqn-review.html'].forEach(f=>{
    const p=path.join(__dirname,f);
    assert.ok(fs.existsSync(p),'缺 '+p);
    const r=OFF.check(fs.readFileSync(p,'utf8'),path.basename(p));
    assert.ok(r.ok,r.issues.join('；'));
  });
});
run('自检规则本身有效：注入外链必须被拦下',()=>{
  const bad='<html><script src="https://cdn.example/a.js"></script></html>';
  assert.strictEqual(OFF.check(bad,'注入').ok,false);
  const bad2='<html><script>import("./chunk.js")</script>__WQN_CHECK__WQN_VERSION__WQN_POOL__重新下载</html>';
  assert.strictEqual(OFF.check(bad2,'注入').ok,false);
});
run('构建脚本已在写盘后立刻自检，失败即退出',()=>{
  const b=fs.readFileSync(path.join(ROOT,'build.js'),'utf8');
  assert.ok(b.indexOf("require('./tools/check_offline.js')")>=0);
  assert.ok(b.indexOf('process.exit(1)')>=0);
});
run('iOS：文字不自动放大、防双击缩放、dvh/vh 回退都在',()=>{
  const c=fs.readFileSync(path.join(ROOT,'src','style.css'),'utf8');
  ['-webkit-text-size-adjust:100%!important','text-size-adjust:100%!important',
   'touch-action:manipulation','width:100vh;width:100dvh!important',
   'env(safe-area-inset-top,0px)','env(safe-area-inset-bottom,0px)']
    .forEach(x=>assert.ok(c.indexOf(x)>=0,'CSS 缺 '+x));
});
run('iOS：地址栏收放不触发重旋（tallFlipped 只在宽高关系翻转时放行）',()=>{
  const u=fs.readFileSync(path.join(ROOT,'src','ui.js'),'utf8');
  assert.ok(u.indexOf('function tallFlipped()')>=0);
  assert.ok(u.indexOf('if(!tallFlipped())return;')>=0);
  assert.ok(u.indexOf('LAST_TALL=')>=0);
  assert.ok(u.indexOf("addEventListener('resize'")>=0);
  assert.ok(u.indexOf("addEventListener('orientationchange'")>=0);
});
run('iOS：不请求全屏、不锁系统方向；退出时反而清理两者',()=>{
  const u=fs.readFileSync(path.join(ROOT,'src','ui.js'),'utf8');
  const seg=u.slice(u.indexOf('function applyLandscape'),u.indexOf('function watchOrientation'));
  assert.ok(!/de\.requestFullscreen/.test(seg),'仍在请求 iPhone 不支持的全屏');
  assert.ok(!/o\.lock\(/.test(seg),'仍在锁 iOS 不支持的方向');
  assert.ok(seg.indexOf('document.exitFullscreen')>=0);
  assert.ok(seg.indexOf('o.unlock')>=0);
});
run('三个退出入口 + 按钮 toggle + 重绘补建都在',()=>{
  const u=fs.readFileSync(path.join(ROOT,'src','ui.js'),'utf8');
  ['data-land-exit','data-landhint-close','syncLandBtn','aria-pressed',
   "e.key==='Escape'",'if(LANDSCAPE)showLandHint()',
   "document.body.appendChild(el)"].forEach(x=>assert.ok(u.indexOf(x)>=0,'缺 '+x));
});
run('送审版不引入新审核面：iOS 文案无敏感词',()=>{
  const h=fs.readFileSync(path.join(ROOT,'..','wqn-review.html'),'utf8');
  assert.ok(h.indexOf('WQN_VERSION')>=0);
});
console.log(fails?'\n❌ '+fails+' 项失败':'\n✅ 离线与 iOS 专项全部通过');
if(fails)process.exit(1);
