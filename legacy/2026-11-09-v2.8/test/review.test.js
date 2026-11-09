/* test/review.test.js —— 送审版真实浏览器回归（node test/review.test.js）
   验证：送审产物能启动、能开局玩到收卷、扩展档与政权范围已物理移除、版本正确。 */
const { chromium } = require('playwright');
const path = require('path');
const FILE = 'file://' + encodeURI(path.resolve(__dirname, '..', '..', 'wqn-review.html'));
const errs = [];
let bad = 0;
const ck = (ok, msg) => { console.log((ok ? '  ✓ ' : '  ✗ ') + msg); if (!ok) bad++; };

(async () => {
  const b = await chromium.launch({ headless: true,
    executablePath: '/usr/local/bin/chromium',
    args: ['--no-sandbox', '--allow-file-access-from-files'] });
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  p.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE: ' + m.text()); });
  await p.goto(FILE, { waitUntil: 'load' });
  await p.waitForSelector('[data-act="newgame"]', { timeout: 20000 });

  console.log('=== 送审版启动 ===');
  const boot = await p.evaluate(() => ({
    review: !!window.WQN_REVIEW,
    ver: window.WQN_VERSION && window.WQN_VERSION.version,
    codename: window.WQN_VERSION && window.WQN_VERSION.codename,
    title: document.title,
    tiers: (window.WQN.reality && window.WQN.reality.TIERS || []).map(t => t.key),
    hypothesis: window.WQN.data.fringe.hypotheses.length,
    polities: window.WQN.data.atlas.polities.length,
    routes: window.WQN.data.atlas.routes.length,
    lands: window.WQN.data.atlas.lands.length,
    units: window.WQN.data.atlas.units.length,
    civ: window.WQN.data.civilization.items.length,
    quiz: window.WQN.data.reading_quiz.items.length,
    houses: window.WQN.data.houses.houses.length,
    verify: window.__WQN_VERIFY__ && window.__WQN_VERIFY__.ok,
    art: !!window.WQN.art,
    audio: !!window.WQN.audio,
    motifs: window.WQN.data.art.motifs.length,
    scenes: Object.keys(window.WQN.data.art.scenes).length,
    scales: window.WQN.data.music.scales.length,
    cues: Object.keys(window.WQN.data.music.cues).length,
    svg: document.querySelectorAll('.artwrap svg').length,
    sndBtn: !!document.querySelector('[data-snd="toggle"]'),
    sfxBtn: !!document.querySelector('[data-snd="sfx"]'),
    bgmBtn: !!document.querySelector('[data-snd="bgm"]'),
    readBtn: !!document.querySelector('[data-read]'),
    a11y: !!window.WQN.a11y,
    live: document.getElementById('a11yLive')?.getAttribute('aria-live'),
    skip: !!document.querySelector('.skip'),
    artHidden: document.querySelector('.artsvg')?.getAttribute('aria-hidden'),
    charHidden: document.querySelector('.stage-char')?.getAttribute('aria-hidden'),
    stage: !!document.querySelector('.stage'),
    stageBg: /^(blob:|data:image\/jpeg)/.test(document.querySelector('.stage-bg')?.src||''),
    stageChar: /^(blob:|data:image\/webp)/.test(document.querySelector('.stage-char')?.src||''),
    stageLayers: Object.keys(window.WQN.data.character.layers).length,
    bubble: (document.querySelector('.bubble .say')?.textContent||'').length>4,
    viewBtns: document.querySelectorAll('.viewtools .vbtn').length,
    landBtn: !!document.querySelector('[data-view="landscape"]') &&
      !document.querySelector('[data-view="landscape"]').closest('.viewtools'),
    stageScenes: window.WQN.stage.status().scenes.length,
    assetPlanScenes: window.WQN.data.asset_plan.scenes.length,
    drawerclose: !!document.querySelector('[data-close-set]'),
    bubbleMore: !!document.querySelector('[data-bubble-expand]'),
    locked: window.WQN.stage.status().locked,
    breath: getComputedStyle(document.querySelector('.stage-char')).animationName.indexOf('breathe')>=0,

    readDefault: window.WQN.a11y.status().read === false,
    autoDefault: window.WQN.a11y.status().autoRead === false
  }));
  ck(boot.review === true, '带送审标记');
  ck(/^\d+\.\d+$/.test(boot.ver || ''), '版本号 v' + boot.ver);
  ck(boot.title.indexOf('送审版') < 0 && boot.title.indexOf('上下五千年') >= 0,
    '标题干净、与提交表单一致');
  ck((boot.codename || '').indexOf('送审合规层') >= 0, '版本代号标注送审合规层');
  ck(boot.verify === true, '数据自检通过（字符串池与校验和一致）');
  ck(boot.tiers.indexOf('wild') < 0, '扩展档已物理移除（档位：' + boot.tiers.join('/') + '）');
  ck(boot.hypothesis === 0, '扩展推演层 0 条');
  ck(boot.polities === 0 && boot.routes === 0, '政权范围与航线 0 块');
  ck(boot.lands > 0 && boot.units === 29, '自然地理与点状地名仍在');
  ck(boot.civ === 2199 && boot.quiz === 312 && boot.houses === 153, '考据内容未删减');
  ck(boot.art && boot.audio && (boot.svg >= 2 || boot.stage) && boot.sndBtn,
    '送审版保留美术与音乐界面');
  ck(boot.motifs === 12 && boot.scenes === 8 && boot.scales === 8 && boot.cues === 11,
    '送审版美术音乐数据未删减');
  ck(boot.sfxBtn && boot.bgmBtn && boot.readBtn && boot.a11y,
    '送审版保留分路声音与朗读入口');
  ck(boot.live === 'polite' && boot.skip
    && (boot.artHidden === 'true' || boot.charHidden === 'true'),
    '送审版保留读屏结构');
  ck(boot.stage && boot.stageBg && boot.stageChar && boot.stageLayers === 99 && boot.bubble,
    '送审版保留 AVG 舞台与角色层');
  ck(boot.viewBtns === 2 && boot.landBtn && boot.stageScenes === 98 && boot.locked === 0 && boot.breath,
    '送审版保留横屏全屏按键、表演关卡与呼吸微表演');
  const rvHtml=require('fs').readFileSync(__dirname+'/../../wqn-review.html','utf8');
  ck(boot.assetPlanScenes === 98, '送审版关卡表已登记，设置页按需展开不堆节点');
  ck(rvHtml.indexOf('.bdgrid')>=0 && rvHtml.indexOf('skin-auto')>=0
    && rvHtml.indexOf('data-backdrop')>=0, '送审版保留场景可选、皮肤与互动样式');
  ck(rvHtml.indexOf('html.avg .stage')>=0 && rvHtml.indexOf('--veil')>=0
    && rvHtml.indexOf('data-veil')>=0, '送审版保留 AVG 舞台与统一透明度滑杆');
  ck(rvHtml.indexOf('.bdgrid')>=0 && rvHtml.indexOf('skin-auto')>=0
    && rvHtml.indexOf('data-backdrop')>=0, '送审版保留场景可选、皮肤与互动样式');
  ck(rvHtml.indexOf('html.avg .stage')>=0 && rvHtml.indexOf('--veil')>=0
    && rvHtml.indexOf('data-veil')>=0, '送审版保留 AVG 舞台与统一透明度滑杆');
  ck(rvHtml.indexOf('.bdgrid')>=0 && rvHtml.indexOf('skin-auto')>=0
    && rvHtml.indexOf('data-backdrop')>=0, '送审版保留场景可选、皮肤与互动样式');
  ck(rvHtml.indexOf('html.avg .stage')>=0 && rvHtml.indexOf('--veil')>=0
    && rvHtml.indexOf('data-veil')>=0, '送审版保留 AVG 舞台与统一透明度滑杆');
  ck(rvHtml.indexOf('char-half')>=0 && rvHtml.indexOf('html.minimal .tierbar')>=0,
    '送审版保留半身构图与主页极简样式');
  ck(boot.bubbleMore && rvHtml.indexOf('data-close-set')>=0
    && rvHtml.indexOf('.panel.setdrawer')>=0,
    '送审版保留设置抽屉关闭键与气泡展开键');
  ck(boot.readDefault && boot.autoDefault, '送审版朗读与自动朗读仍默认关闭');

  console.log('=== 送审版可玩性 ===');
  await p.click('[data-snd="toggle"]');
  const aaOn = await p.evaluate(() => window.WQN.audio.status().on);
  ck(aaOn === true, '送审版声音开关可用');
  await p.click('[data-snd="sfx"]');
  const sp = await p.evaluate(() => ({sfx:window.WQN.audio.status().sfx,
    bgm:window.WQN.audio.status().bgm}));
  ck(sp.sfx === false && sp.bgm === true, '送审版两路开关独立生效（关音效不影响背景音）');
  await p.click('[data-snd="bgm"]');
  await p.click('[data-reg="huaxia"]');
  await p.click('[data-v="family"]');
  await p.click('[data-act="newgame"]');
  await p.waitForSelector('.panel.on .opt', { timeout: 10000 });
  const has = s => p.$('.panel.on ' + s);
  let steps = 0, scrolled = false;
  for (let i = 0; i < 70; i++) {
    if (await has('[data-act="restart"]')) { scrolled = true; break; }
    /* 结果态同时有「随时收卷」与「继续推演」；先玩够 12 笔再收卷 */
    if (steps >= 12 && await has('[data-act="scroll"]')) {
      await p.click('.panel.on [data-act="scroll"]'); scrolled = true; break;
    }
    if (await has('[data-act="epilogue"]')) { await p.click('.panel.on [data-act="epilogue"]'); continue; }
    if (await has('[data-act="nextdyn"]')) { await p.click('.panel.on [data-act="nextdyn"]'); continue; }
    if (await has('[data-act="realend-cont"]')) { await p.click('.panel.on [data-act="realend-cont"]'); continue; }
    if (await has('[data-act="contvol"]')) { await p.click('.panel.on [data-act="contvol"]'); continue; }
    if (await has('.opt')) {
      await p.click('.panel.on .opt');
      await p.waitForTimeout(30);
      steps++;
      continue;
    }
    if (await has('[data-act="next"]')) { await p.click('.panel.on [data-act="next"]'); continue; }
    break;
  }
  ck(steps >= 5, '能连续推进 ' + steps + ' 笔');
  ck(scrolled, '能走到收卷报告');
  const body = await p.evaluate(() => document.body.innerText);
  ck(body.indexOf('v' + boot.ver) >= 0 || body.indexOf('送审') >= 0, '界面显示当前版本');
  ck(errs.length === 0, '零脚本报错' + (errs.length ? '：' + errs[0] : ''));

  console.log('=== 送审版文案 ===');
  const text = await p.evaluate(() => document.documentElement.outerHTML);
  /* 内嵌图片是二进制数据不是文案：先剔除长 base64 片段再扫词表，
     避免图片字节里偶然出现的字母组合被当成措辞（静态文件本就零命中）。 */
  const prose = text.replace(/[A-Za-z0-9+/]{80,}={0,2}/g, '');
  const forbid = ['外星人', '史前超文明', '亚特兰蒂斯', '古代宇航员', 'UFO',
    '国界', '疆界', '疆域', '领土', '主权', '版图', '政权核心区',
    '人种', '蛮夷戎狄', '含米特', '血统纯正', '被弑', '篡立', '废立',
    '占卜', '神谕', '数术', '祭祀', '神庙', '祭司', '野史', '演义', '伪书', '狂想'];
  const left = forbid.filter(w => prose.indexOf(w) >= 0);
  ck(left.length === 0, '敏感措辞零残留' + (left.length ? '：' + left.join('、') : ''));

  await b.close();
  console.log(bad ? '\n❌ ' + bad + ' 项失败' : '\n✅ 送审版全流程通过');
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
