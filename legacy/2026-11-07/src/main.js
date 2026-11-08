/* main.js —— 组装与启动 */
(function(W){
  'use strict';
  const E=W.engine,U=W.ui;
  function boot(){
    if(typeof document==='undefined')return;
    if(window.__WQN_BAD__)return;   /* 数据自检未通过，页面已给出人话提示 */
    let fresh=false;
    try{fresh=new URLSearchParams(location.search).get('new')==='1';}catch(e){}
    const c=E.load();
    if(c&&!fresh){E.setState(c);U.render();}
    else U.renderStart(document.getElementById('app'));
  }
  W.main={boot:boot};
  boot();
})((typeof window!=='undefined'?window:globalThis).WQN=((typeof window!=='undefined'?window:globalThis).WQN||{}));
