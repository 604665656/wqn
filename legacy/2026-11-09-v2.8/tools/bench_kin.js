const fs=require('fs'),path=require('path');const ROOT=path.join(__dirname,'..');
const J=f=>JSON.parse(fs.readFileSync(path.join(ROOT,'data',f),'utf8'));const cfg=J('config.json');
globalThis.WQN={data:{keys:cfg.keys,keyOrder:cfg.keyOrder,traits:cfg.traits,eras:cfg.eras,
 regions:cfg.regions,views:cfg.views,vol:cfg.vol,endings:cfg.endings,
 events:J('events.json'),templates:J('templates.json'),chains:J('chains.json'),
 history:J('history.json'),entities:J('entities.json'),sources:J('sources.json'),
 civilization:J('civilization.json'),civSources:J('civ_sources.json'),
 succession:J('succession.json'),geoclimate:J('geoclimate.json'),fringe:J('fringe.json'),
 atlas:J('atlas.json'),options:J('options.json'),layers:J('layers.json'),
 consequences:J('consequences.json'),localities:J('localities.json'),peoples:J('peoples.json'),
 deepdives:J('deepdives.json'),difficulty:J('difficulty.json'),tutorial:J('tutorial.json'),
 reading_quiz:J('reading_quiz.json'),kinship:J('kinship.json')}};
const store={};globalThis.localStorage={getItem:k=>store[k]||null,setItem:(k,v)=>store[k]=v,removeItem:k=>delete store[k]};
['rng','kinship','family','people','weave','real','civilization','succession','reality','difficulty','tutorial','geoclimate','fringe','atlas','consequences','options','engine'].forEach(m=>require(path.join(ROOT,'src',m+'.js')));
const E=globalThis.WQN.engine;
const S=E.fresh('huaxia','family','bench');E.setState(S);
const t0=Date.now();let maxFam=0;
for(let i=0;i<200;i++){
 E.step();let st=E.state();
 if(st.phase==='volume')E.continueVolume();
 if(st.phase==='ending')E.epilogue();
 st=E.state();if(st.phase==='choice')E.choose(i%3);
 maxFam=Math.max(maxFam,S.fam.length);
 if(i===49||i===99||i===149||i===199)
  console.log('第'+(i+1)+'笔 fam='+S.fam.length,'最大',maxFam,
   '代',Math.max(...S.fam.map(p=>p.gen||1)),'耗时',Date.now()-t0+'ms');
}
console.log('200 笔总耗时',Date.now()-t0+'ms','最大 fam',maxFam);
