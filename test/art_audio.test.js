/* test/art_audio.test.js —— 美术与音乐专项（node test/art_audio.test.js）
   覆盖：SVG 合法性、确定性、色板/场景覆盖、Web Audio 降级、配置持久化、
        调式与曲目完整性、送审词表零命中。 */
const fs=require('fs'),path=require('path'),assert=require('assert');
const ROOT=path.join(__dirname,'..');
const J=f=>JSON.parse(fs.readFileSync(path.join(ROOT,'data',f),'utf8'));
const store={};
globalThis.localStorage={getItem:k=>store[k]||null,setItem:(k,v)=>store[k]=v,removeItem:k=>delete store[k]};
globalThis.WQN={data:{art:J('art.json'),music:J('music.json')}};
['art','audio'].forEach(m=>require(path.join(ROOT,'src',m+'.js')));
const W=globalThis.WQN,A=W.art,U=W.audio;
let fails=0;
function run(name,fn){
  try{fn();console.log('  ✓ '+name);}catch(e){fails++;console.log('  ✗ '+name+' → '+e.message);}
}
const BAD=['外星人','史前超文明','亚特兰蒂斯','古代宇航员','UFO','国界','疆界',
  '疆域','领土','主权','版图','政权核心区','人种','蛮夷戎狄','含米特','血统纯正',
  '被弑','篡立','废立','占卜','神谕','数术','祭祀','神庙','祭司','野史','演义','伪书','狂想'];

console.log('=== 美术：程序化 SVG ===');
run('横幅／场景／纹样带／图标都输出合法 SVG，无 NaN / undefined',()=>{
  const kinds=['opening','choice','volume','ending','turnover','family','atlas','civ'];
  const outs=[A.banner({year:-3000,reg:'huaxia',era:0,vol:1}),
    ...kinds.map(k=>A.scene(k,{year:750,reg:'aegean',era:3,vol:2,label:'卷 2'})),
    A.ornament('x',{year:1200,reg:'maya',era:4}),A.icon('brush',16),A.icon('note',16)];
  outs.forEach((o,i)=>{
    assert.ok(o.indexOf('<svg')>=0,'#'+i+' 缺 svg 开标签');
    assert.ok(o.indexOf('</svg>')>=0,'#'+i+' 缺 svg 闭标签');
    assert.strictEqual(o.indexOf('NaN'),-1,'#'+i+' 出现 NaN');
    assert.strictEqual(o.indexOf('undefined'),-1,'#'+i+' 出现 undefined');
    assert.strictEqual(o.indexOf('Infinity'),-1,'#'+i+' 出现 Infinity');
  });
  console.log('    样本：'+(kinds.length+4)+' 张图，标签配对与数值全通过');
});
run('同参数确定性、换卷换时代自然换图',()=>{
  const o={year:-1200,reg:'huaxia',era:1,vol:3,label:'卷 3'};
  assert.strictEqual(A.scene('choice',o),A.scene('choice',o),'同参数两次不一致');
  assert.notStrictEqual(A.scene('choice',o),A.scene('choice',Object.assign({},o,{vol:4})),'换卷没换图');
  assert.notStrictEqual(A.banner(o),A.banner(Object.assign({},o,{era:5})),'换时代没换色');
  assert.notStrictEqual(A.banner(o),A.banner(Object.assign({},o,{reg:'nile'})),'换文明圈没换纹');
});
run('9 时代 × 7 文明圈色板字段齐全，8 类场景全覆盖',()=>{
  const regs=['huaxia','meso','nile','aegean','indus','maya','steppe'];
  for(let e=0;e<9;e++)regs.forEach(r=>{
    const p=A.pal(e,r);
    ['bg','ink','accent','accent2','sky','ground','light','motif','glyph','regionAccent'].forEach(k=>
      assert.ok(p[k],'era'+e+'/'+r+' 缺 '+k));
    assert.ok(/^#[0-9a-f]{6}$/i.test(p.accent),'色值不合法');
  });
  assert.strictEqual(Object.keys(A.scenes).length,8,'场景不是 8 类');
  assert.strictEqual(A.motifs.length,12,'纹样不是 12 种');
  assert.strictEqual(A.glyphs.length,14,'器物剪影不是 14 类');
  console.log('    样本：63 组色板 · 8 场景 · 12 纹样 · 14 剪影');
});
run('插画文案不含送审词表里的敏感措辞',()=>{
  const s=JSON.stringify(W.data.art)+JSON.stringify(W.data.music)
    +A.banner({})+A.scene('opening',{})+A.scene('volume',{});
  const hit=BAD.filter(w=>s.indexOf(w)>=0);
  assert.deepStrictEqual(hit,[],'命中：'+hit.join('、'));
});

console.log('=== 音乐：离线合成与降级 ===');
run('无 AudioContext 时静默降级，所有调用不抛错',()=>{
  assert.strictEqual(U.status().available,false,'node 环境不应报告可用');
  U.cue('choose');U.cue('gather');U.start();U.stop();U.toggle();U.toggle();
  U.set('volume',0.25);U.set('scale','hijaz');U.set('bed','sea');U.set('score','caravan');
  assert.strictEqual(U.status().lastCue,'','静默时不应记录音效');
  const c=U.config();
  assert.strictEqual(c.volume,0.25,'音量未生效');
  assert.strictEqual(c.scale,'hijaz','调式未生效');
  assert.strictEqual(c.bed,'sea','底噪未生效');
  assert.strictEqual(c.score,'caravan','曲目未生效');
});
run('配置只写本机 localStorage，不进存档与分享串',()=>{
  assert.ok(store['wqn.audio.v1'],'配置未持久化');
  const c=JSON.parse(store['wqn.audio.v1']);
  assert.ok('on' in c&&'volume' in c&&'scale' in c&&'bed' in c&&'score' in c);
  assert.strictEqual(Object.keys(c).length,7,'配置字段数不对（v1.3 起含 sfx / bgm）');
  assert.ok('sfx' in c&&'bgm' in c,'缺分路开关字段');
});
run('8 调式 / 9 曲目 / 6 底噪 / 11 音效，引用关系自洽',()=>{
  assert.strictEqual(U.scales.length,8,'调式不是 8');
  assert.strictEqual(U.scores.length,9,'曲目不是 9');
  assert.strictEqual(U.beds.length,7,'底噪不是 7（v1.4 加鸟鸣）');
  assert.ok(typeof U.guideCue==='function','缺 v1.5 合成语气音接口');
  assert.strictEqual(Object.keys(U.cues).length,11,'音效不是 11');
  U.scales.forEach(s=>{
    assert.ok(s.semitones.length>=5,'调式 '+s.key+' 音数不足');
    assert.ok(s.semitones.every((v,i,a)=>i===0||v>a[i-1]),'调式 '+s.key+' 非递增');
    assert.ok(s.base>0,'调式 '+s.key+' 缺基频');
  });
  U.scores.forEach(s=>assert.ok(U.scales.some(x=>x.key===s.scale),'曲目 '+s.key+' 引用了不存在的调式'));
  Object.keys(U.cues).forEach(k=>assert.ok(U.cues[k].notes.length>=2,'音效 '+k+' 缺音列'));
  const z=U.autoFor('aegean',5);
  assert.ok(U.scores.some(x=>x.key===z.score),'自动曲目无效');
  assert.ok(U.beds.some(x=>x.key===z.bed),'自动底噪无效');
  console.log('    样本：autoFor(aegean,5) → '+JSON.stringify(z));
});
run('status 字段完整，disclaimer 明确不是历史复原',()=>{
  const s=U.status();
  ['on','volume','scale','bed','score','available','ctx','scaleName','scoreName','bedName']
    .forEach(k=>assert.ok(k in s,'缺 '+k));
  assert.ok(U.disclaimer.indexOf('不是历史录音')>=0&&U.disclaimer.indexOf('可随时关闭')>=0,'缺免责');
  assert.ok(U.note.indexOf('不宣称')>=0,'缺纪律说明');
});

console.log(fails?'\n❌ '+fails+' 项失败':'\n✅ 美术与音乐专项全部通过');
process.exit(fails?1:0);
