/* test/a11y.test.js —— 朗读／语音命令／读屏友好专项（node test/a11y.test.js） */
const fs=require('fs'),path=require('path'),assert=require('assert');
const ROOT=path.join(__dirname,'..');
const store={};
globalThis.localStorage={getItem:k=>store[k]||null,setItem:(k,v)=>store[k]=v,removeItem:k=>delete store[k]};
globalThis.WQN={data:{music:JSON.parse(fs.readFileSync(path.join(ROOT,'data','music.json'),'utf8')),
  art:JSON.parse(fs.readFileSync(path.join(ROOT,'data','art.json'),'utf8'))}};
require(path.join(ROOT,'src','a11y.js'));
const A=globalThis.WQN.a11y;
let fails=0;
const run=(n,f)=>{try{f();console.log('  ✓ '+n);}catch(e){fails++;console.log('  ✗ '+n+' → '+e.message);}};
const BAD=['外星人','史前超文明','亚特兰蒂斯','古代宇航员','UFO','国界','疆界',
  '疆域','领土','主权','版图','政权核心区','人种','蛮夷戎狄','含米特','血统纯正',
  '被弑','篡立','废立','占卜','神谕','数术','祭祀','神庙','祭司','野史','演义','伪书','狂想'];

console.log('=== 降级与配置 ===');
run('无 speechSynthesis / SpeechRecognition / document 时静默降级',()=>{
  const s=A.status();
  assert.strictEqual(s.tts,false);assert.strictEqual(s.voiceApi,false);
  assert.strictEqual(s.mounted,false);assert.strictEqual(s.listening,false);
  A.speak('测试');A.stopSpeak();A.readScreen();A.startRec();A.stopRec();
  assert.strictEqual(A.screenText(),'','无 DOM 时应返回空串');
  assert.strictEqual(A.speak('测试'),false,'无 TTS 应返回 false');
});
run('配置只写本机、字段固定、不写游戏存档',()=>{
  A.set('read',true);A.set('autoRead',true);A.set('rate',1.25);
  A.set('verbosity','brief');A.set('voice',false);
  const c=A.config();
  assert.deepStrictEqual(Object.keys(c).sort(),['autoRead','rate','read','verbosity','voice']);
  assert.ok(store['wqn.a11y.v1'],'未持久化');
  assert.strictEqual(c.rate,1.25);
  assert.ok(!store['wqn.save'],'不应写游戏存档');
});
run('旧配置只有部分字段时按默认值补齐',()=>{
  store['wqn.a11y.v1']=JSON.stringify({read:true});
  // 重新加载模块
  delete require.cache[require.resolve(path.join(ROOT,'src','a11y.js'))];
  globalThis.WQN.a11y=undefined;require(path.join(ROOT,'src','a11y.js'));
  const B=globalThis.WQN.a11y;
  assert.strictEqual(B.status().read,true);
  assert.strictEqual(B.status().voice,false);
  assert.strictEqual(B.status().rate,1);
  console.log('    样本：旧配置 {read:true} → 补齐 5 字段');
});

console.log('=== 语音命令解析（纯函数） ===');
const CASES=[
  ['选一',{act:'choose',i:1}],['选二',{act:'choose',i:2}],['第三个',{act:'choose',i:3}],
  ['选项 4',{act:'choose',i:4}],['按五',{act:'choose',i:5}],['9',{act:'choose',i:9}],
  ['继续',{act:'next'}],['下一笔',{act:'next'}],['往前',{act:'next'}],
  ['收卷',{act:'scroll'}],['看报告',{act:'scroll'}],['续卷',{act:'contvol'}],
  ['终章',{act:'epilogue'}],['更迭',{act:'nextdyn'}],
  ['设置',{act:'tab',t:'set'}],['去族谱',{act:'tab',t:'fam'}],
  ['打开文明',{act:'tab',t:'civ'}],['看舆地',{act:'tab',t:'geo'}],
  ['朗读',{act:'read'}],['读一遍',{act:'read'}],['停',{act:'stop'}],['别念了',{act:'stop'}],
  ['开音效',{act:'sfx',v:true}],['音效关',{act:'sfx',v:false}],
  ['开背景',{act:'bgm',v:true}],['关配乐',{act:'bgm',v:false}],
  ['静音',{act:'mute'}],['开声音',{act:'unmute'}],
  ['停止语音',{act:'voice',v:false}],['帮助',{act:'help'}],
  ['今天天气不错',null]
];
run(CASES.length+' 条说法逐条解析',()=>{
  CASES.forEach(([txt,exp])=>{
    const got=A.parseCommand(txt);
    assert.deepStrictEqual(got,exp,'「'+txt+'」→ '+JSON.stringify(got));
  });
  console.log('    样本：选一 / 去族谱 / 关配乐 / 帮助 均命中');
});
run('中文数字与阿拉伯数字 1-9 全覆盖，0 与十几不误判',()=>{
  ['一','二','两','三','四','五','六','七','八','九','1','5','9'].forEach((n,i)=>{
    const c=A.parseCommand('选'+n);assert.ok(c&&c.act==='choose','选'+n+' 未解析');
  });
  assert.strictEqual(A.parseCommand('选十'),null,'「十」不应命中');
  assert.strictEqual(A.parseCommand('选0'),null,'「0」不应命中');
});

console.log('=== 键盘与文案 ===');
run('键位表、命令表、隐私与免责齐全',()=>{
  assert.ok(A.keys.indexOf('1-9')>=0&&A.keys.indexOf('R 朗读')>=0);
  assert.ok(A.commands.indexOf('收卷')>=0&&A.commands.indexOf('关背景')>=0);
  assert.ok(A.privacy.indexOf('不上传')>=0&&A.privacy.indexOf('不保存')>=0);
  assert.ok(A.disclaimer.indexOf('降级')>=0);
  assert.ok(A.help.indexOf('键盘')>=0);
});
run('新增文案不含送审词表里的敏感措辞',()=>{
  const s=fs.readFileSync(path.join(ROOT,'src','a11y.js'),'utf8')+A.help+A.commands+A.privacy+A.disclaimer;
  const hit=BAD.filter(w=>s.indexOf(w)>=0);
  assert.deepStrictEqual(hit,[],'命中：'+hit.join('、'));
});
run('v1.5 角色音色档与语气音命令',()=>{
  const A=globalThis.WQN.a11y;
  assert.ok(typeof A.speakAs==='function','缺 speakAs');
  assert.ok(typeof A.guideVoices==='function','缺 guideVoices');
  assert.ok(A.status().ttsVoices,'status 缺可用音色统计');
  const c1=A.parseCommand('念这句'),c2=A.parseCommand('好奇');
  assert.ok(c1&&c1.act==='guideSay','念这句未解析');
  assert.ok(c2&&c2.act==='guideCue'&&c2.k==='curious','语气音命令未解析');
  assert.ok(/DEF=\{read:false,autoRead:false/.test(
    require('fs').readFileSync(require('path').join(ROOT,'src','a11y.js'),'utf8')),'朗读未默认关闭');
});

console.log(fails?'\n❌ '+fails+' 项失败':'\n✅ 无障碍专项全部通过');
process.exit(fails?1:0);
