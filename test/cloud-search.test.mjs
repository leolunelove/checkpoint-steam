import test from 'node:test';
import assert from 'node:assert/strict';
import {parseCloudQuery,indexCloudCatalog,cloudMatches,matchesCloudSearch} from '../docs/cloud-search.mjs';
const index=indexCloudCatalog({checkedAt:'2026-10-23',boosteroid:{games:{620:{collection:'Library',maintenance:false},99:{collection:'Install',maintenance:true},12:{collection:'Install',maintenance:false}}},gfn:{games:[{title:'Portal™ 2',playType:'READY_TO_PLAY',tier:'Free'},{title:'Game Remastered',playType:'INSTALL_TO_PLAY',tier:'Premium'},{title:'Duplicate',playType:'READY_TO_PLAY'},{title:'Duplicate',playType:'INSTALL_TO_PLAY'}]}});
test('service names become case-insensitive tokens while preserving title search',()=>{
 assert.deepEqual(parseCloudQuery('BOOSTEROID Portal').providers,['boosteroid']);assert.equal(parseCloudQuery('GeForce NOW portal').text,'portal');
 for(const alias of ['gfn','nvidia','geforce now','GeForceNow'])assert.deepEqual(parseCloudQuery(alias).providers,['gfn']);
 assert.deepEqual(parseCloudQuery('notboosteroid').providers,[]);assert.equal(parseCloudQuery('boosteroid gfn portal').text,'portal');
});
test('Boosteroid matches Steam IDs only and excludes maintenance entries',()=>{
 assert.equal(matchesCloudSearch({id:620,name:'Portal 2'},'boosteroid',index),true);
 assert.equal(matchesCloudSearch({id:621,name:'Portal 2'},'boosteroid',index),false);
 assert.equal(matchesCloudSearch({id:99,name:'Game'},'boosteroid',index),false);
 assert.equal(cloudMatches({id:12,name:'Game'},['boosteroid'],index)[0].detail,'Install to play');
});
test('GFN requires an exact edition title, ignores trademarks and rejects ambiguity',()=>{
 assert.equal(matchesCloudSearch({id:0,name:'Portal 2'},'gfn',index),true);
 assert.equal(matchesCloudSearch({id:0,name:'Game'},'gfn',index),false);
 assert.equal(matchesCloudSearch({id:0,name:'Game Remastered'},'gfn',index),true);
 assert.equal(matchesCloudSearch({id:0,name:'Duplicate'},'gfn',index),false);
});
test('combined title and service filtering works, multiple services use OR, missing catalog never fabricates matches',()=>{
 const game={id:620,name:'Portal 2'};
 assert.equal(matchesCloudSearch(game,'boosteroid portal',index),true);assert.equal(matchesCloudSearch(game,'boosteroid other',index),false);
 assert.equal(matchesCloudSearch(game,'gfn boosteroid',index),true);assert.equal(matchesCloudSearch(game,'gfn',null),false);
 assert.equal(matchesCloudSearch(game,'portal',null),true);
});

test('service filtering preserves finish ranking, exclusions and game progress',async()=>{
 const {finishCandidates}=await import('../docs/finish-next.mjs?v=10');
 const games=[{id:620,name:'Portal 2',status:'ready',total:5,unlocked:4,percent:80,achievements:[]},{id:12,name:'Other game',status:'ready',total:10,unlocked:7,percent:70,achievements:[]},{id:99,name:'Maintenance game',status:'ready',total:5,unlocked:4,percent:80,achievements:[]}];
 const before=JSON.stringify(games);
 for(const sort of ['easiest','completion','remaining','rarity','time']){
  const candidates=finishCandidates(games,{demo:true,sort,excluded:[12]});
  assert.deepEqual(candidates.filter(g=>cloudMatches(g,['boosteroid'],index).length).map(g=>g.id),[620]);
  assert.deepEqual(candidates.filter(g=>cloudMatches(g,['gfn'],index).length).map(g=>g.id),[620]);
 }
 assert.equal(JSON.stringify(games),before);
 assert.equal(cloudMatches(games[0],['gfn'],null).length,0);
});
