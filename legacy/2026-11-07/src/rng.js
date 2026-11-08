/* rng.js —— 确定性随机（借鉴 The Inheritance Game / Minerva 的 seeded RNG 思路）
   状态只是一个 uint32，随存档一起序列化，因此「同一 seed + 同一选择序列」必得同一局。 */
(function(W){
  'use strict';
  function hashSeed(s){
    let h=2166136261>>>0;
    s=String(s);
    for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)>>>0;}
    return h>>>0;
  }
  // mulberry32 的无闭包版：返回 [0,1) 与新状态
  function next(state){
    let t=(state+0x6D2B79F5)|0;
    let r=Math.imul(t^(t>>>15),1|t);
    r^=r+Math.imul(r^(r>>>7),61|r);
    return [((r^(r>>>14))>>>0)/4294967296,t>>>0];
  }
  W.rng={hashSeed:hashSeed,next:next};
  if(typeof module!=='undefined'&&module.exports)module.exports=W.rng;
})((typeof window!=='undefined'?window:globalThis).WQN=((typeof window!=='undefined'?window:globalThis).WQN||{}));
