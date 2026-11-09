
window.addEventListener('error',function(e){
  var a=document.getElementById('app');
  if(a&&!a.querySelector('.card'))a.innerHTML='<div style="padding:24px;color:#e8dcc2;font-family:sans-serif;line-height:1.9">页面没能启动。请用浏览器打开本文件（不要用文件管理器或聊天软件直接预览），或换 Chrome / Safari 再试。<br><span style="color:#a9977c;font-size:12px">'+(e.message||'')+'</span></div>';
});
