/* tools/pool.js —— 构建期字符串池压缩（离线单文件瘦身）
   第五轮扩容后 data 里出现大量逐条重复的长字符串：
     · 1174 条新增姓氏共用同一段 boundary
     · 2590 个 sources[].note 共用同一句「域名级检索入口…」
     · url / rank / 各类免责声明同理
   这些在 JSON.stringify 后被原样写进 HTML，占了相当一部分字节。

   做法：构建时把「长度 ≥16 且出现 ≥2 次」的字符串抽进池，
   原位置换成占位串 "\u0001<索引>\u0001"；运行时在所有模块读取 data 之前
   递归还原。只池化字符串（原始类型），不做对象引用共享，
   因此不会引入「多处共享同一对象、某处改名串改全局」的隐患。

   占位串里的 \u0001 经 JSON.stringify 会写成 ASCII 转义序列 \u0001，
   <script> 内不会出现真实控制字符，也不会被 HTML 解析器截断。
   运行时用 /^\u0001(\d+)\u0001$/ 精确匹配整串，普通文案不会误伤。
*/
'use strict';

const MIN_LEN = 16;
const MIN_COUNT = 2;
const MARK = i => '\u0001' + i + '\u0001';

function collect(root) {
  const counts = new Map();
  function walk(v) {
    if (typeof v === 'string') {
      if (v.length >= MIN_LEN) {
        const e = counts.get(v) || { n: 0 };
        e.n++; counts.set(v, e);
      }
      return;
    }
    if (v && typeof v === 'object') {
      if (Array.isArray(v)) v.forEach(walk);
      else Object.keys(v).forEach(k => walk(v[k]));
    }
  }
  walk(root);
  return counts;
}

function pack(root) {
  const counts = collect(root);
  const pool = [], index = new Map();
  // 长串优先：省得最多，也避免短串被嵌进长串后白占池位
  const cand = [...counts.entries()]
    .filter(([s, e]) => e.n >= MIN_COUNT)
    .sort((a, b) => (b[0].length * (b[1].n - 1)) - (a[0].length * (a[1].n - 1)));
  cand.forEach(([s]) => { index.set(s, pool.length); pool.push(s); });

  let rawBytes = 0, packedBytes = 0, refs = 0;
  cand.forEach(([s, e]) => {
    rawBytes += s.length * e.n;
    packedBytes += s.length + MARK(index.get(s)).length * e.n;
    refs += e.n;
  });

  function walk(v) {
    if (typeof v === 'string') {
      const i = index.get(v);
      return i === undefined ? v : MARK(i);
    }
    if (v && typeof v === 'object') {
      if (Array.isArray(v)) return v.map(walk);
      const o = {};
      Object.keys(v).forEach(k => { o[k] = walk(v[k]); });
      return o;
    }
    return v;
  }
  return {
    packed: walk(root), pool,
    stats: { entries: pool.length, refs, rawBytes, packedBytes,
      savedBytes: rawBytes - packedBytes }
  };
}

/* 运行时还原：必须在任何模块读 WQN.data 之前执行 */
const UNPACK = `
/* 构建期字符串池还原（tools/pool.js）；只读一次，之后各模块拿到的都是普通字符串 */
(function(){
  var P=window.__WQN_POOL__||[],D=window.WQN&&window.WQN.data,
      re=/^\\u0001(\\d+)\\u0001$/;
  function un(v){
    if(typeof v==='string'){var m=re.exec(v);if(m)return P[+m[1]];}
    else if(v&&typeof v==='object'){
      if(Array.isArray(v)){for(var i=0;i<v.length;i++)v[i]=un(v[i]);}
      else{Object.keys(v).forEach(function(k){v[k]=un(v[k]);});}
    }
    return v;
  }
  if(D)un(D);
  delete window.__WQN_POOL__;
})();
`;

/* 运行时数据自检：字符串池没还原、或文件被下载器改坏时，给人话提示而不是白屏。
   默认只做轻量抽样；?verify=1 时做完整逐字符校验和（默认不跑，省首屏时间）。 */
const VERIFY = [
"/* 数据自检 */",
"(function(){",
"  var D=window.WQN&&window.WQN.data,C=window.__WQN_CHECK__,bad=null;",
"  function say(m){var a=document.getElementById('app');",
"    if(a)a.innerHTML='<div style=\"padding:24px;color:#e8dcc2;font-family:sans-serif;line-height:1.9\">数据没能完整展开：'+m+'<br>请重新下载本文件，并确认用「浏览器」打开（不要用文件管理器或聊天软件预览）。</div>';",
"    window.__WQN_BAD__=true;}",
"  try{",
"    if(!D||!D.civilization||!D.peoples)throw '主体数据缺失';",
"    if(D.civilization.items.length<1500)throw '文明册条目不足';",
"    if(D.peoples.surnames.length<1200)throw '姓氏册条目不足';",
"    var b=D.peoples.surnames[D.peoples.surnames.length-1].boundary||'';",
"    if(b.indexOf('不指认得姓始祖')<0)throw '字符串池未正确还原';",
"    if(JSON.stringify(D).length!==C.n)throw '数据长度与构建时不一致';",
"    window.__WQN_VERIFY__={ok:true,n:C.n};",
"    if(/[?&]verify=1/.test(location.search)){",
"      var s=JSON.stringify(D),h=0x811c9dc5;",
"      for(var i=0;i<s.length;i++){h^=s.charCodeAt(i);h=(h*0x01000193)>>>0;}",
"      if((h>>>0)!==C.h){window.__WQN_VERIFY__={ok:false,why:'完整校验和不符'};say('完整校验和不符');}",
"      else window.__WQN_VERIFY__.full=true;",
"    }",
"  }catch(e){say(String(e));}",
"})();"
].join('\n');

module.exports = { pack, UNPACK, VERIFY, MARK };
