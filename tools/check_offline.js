/* 离线单文件自检（借鉴 vite-plugin-singlefile 的 file:// 能力清单）
   在每次构建产出 HTML 后立即跑：确保双击 file:// 打开时不会向外部要资源、
   不会踩 file:// 不可用的 API。纯静态串检查，不启动浏览器。 */
'use strict';
const fs=require('fs'),path=require('path');

const RULES=[
  {k:'外链脚本',   re:/<script[^>]+src\s*=\s*["'](?!data:)[^"']+/i,
   why:'file:// 下会白屏或触发跨域拦截'},
  {k:'外链样式',   re:/<link[^>]+href\s*=\s*["'](?!data:)[^"']+/i,
   why:'离线不可用'},
  {k:'外链 CSS 图',re:/url\(\s*["']?https?:/i,
   why:'离线不可用'},
  {k:'CSS @import',re:/@import\s+(?:url\()?["']?https?:/i,
   why:'离线不可用'},
  {k:'动态 import',re:/\bimport\s*\(/,
   why:'file:// 下分片加载会失败'},
  {k:'cookie',     re:/document\.cookie/,
   why:'file:// 没有 cookie'},
  {k:'fetch',      re:/\bfetch\s*\(/,
   why:'离线不应发网络请求'},
  {k:'XHR',        re:/XMLHttpRequest/,
   why:'离线不应发网络请求'},
  {k:'iframe',     re:/<iframe[^>]+src\s*=/i,
   why:'file:// 下同源限制'},
  {k:'History API',re:/history\.pushState\s*\(/,
   why:'file:// 下请用 hash 路由'},
  {k:'ServiceWorker',re:/serviceWorker\.register\s*\(/,
   why:'file:// 不是安全上下文，注册失败'}
];
const REQUIRED=[
  {k:'数据校验和', re:/__WQN_CHECK__/},
  {k:'版本号',     re:/WQN_VERSION/},
  {k:'字符串池',   re:/__WQN_POOL__/},
  {k:'离线提示',   re:/重新下载|verify=1/}
];

function check(html,label){
  const issues=[];
  RULES.forEach(r=>{const m=html.match(r.re);if(m)issues.push(r.k+' → '+r.why+'（命中：'+m[0].slice(0,60)+'）');});
  REQUIRED.forEach(r=>{if(!r.re.test(html))issues.push('缺少 '+r.k);});
  return {ok:issues.length===0,issues:issues,label:label||'HTML'};
}
function report(r){
  if(r.ok){console.log('  离线自检 ✅ '+r.label+'：无外链 / 无动态分片 / 无 cookie / 校验和与版本在位');return 0;}
  console.error('  离线自检 ❌ '+r.label);
  r.issues.forEach(x=>console.error('    - '+x));return 1;
}
module.exports={check,report,RULES,REQUIRED};

if(require.main===module){
  const files=process.argv.slice(2);
  const list=files.length?files:[path.join(__dirname,'..','..','wqn.html')];
  let bad=0;
  list.forEach(f=>{
    if(!fs.existsSync(f)){console.error('  找不到 '+f);bad++;return;}
    bad+=report(check(fs.readFileSync(f,'utf8'),path.basename(f)));
  });
  process.exit(bad?1:0);
}
