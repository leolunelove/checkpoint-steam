import test from 'node:test';
import assert from 'node:assert/strict';
import {matchesProfile, mergeLibrary, GAME_MAX_AGE, REFRESH_COOLDOWN, mergeSnapshots} from '../docs/profile-cache.mjs';
const now=1800000000000;
const oldGame={id:1,name:'Old name',minutes:90,lastPlayed:100,status:'ready',checkedAt:now-1000,total:2,unlocked:1,percent:50,achievements:[{id:'A',unlocked:true}]};
const previous={mode:'live',profile:{id:'76561198012054390'},aliases:['https://steamcommunity.com/id/leolune/'],games:[oldGame]};
const library=games=>({mode:'live',profile:{id:previous.profile.id},fetchedAt:now,games});
const current={id:1,name:'New name',minutes:90,lastPlayed:100,status:'pending'};
test('return links and SteamID restore only their own saved profile',()=>{
 assert.ok(matchesProfile(previous,'LEOLUNE'));
 assert.ok(matchesProfile(previous,'https://steamcommunity.com/profiles/76561198012054390/'));
 assert.equal(matchesProfile(previous,'someone-else'),false);
 assert.equal(matchesProfile({...previous,mode:'demo'},'leolune'),false);
});
test('unchanged game retains all achievements without being queued',()=>{
 const game=mergeLibrary(library([current]),previous,now).games[0];
 assert.equal(game.status,'ready');assert.equal(game.needsRefresh,false);
 assert.equal(game.name,'New name');assert.deepEqual(game.achievements,oldGame.achievements);
});
test('played or stale games refresh while saved progress remains visible',()=>{
 const changed=mergeLibrary(library([{...current,minutes:100}]),previous,now).games[0];
 assert.equal(changed.needsRefresh,true);assert.equal(changed.unlocked,1);assert.equal(changed.status,'ready');
 assert.equal(mergeLibrary(library([current]),previous,now+GAME_MAX_AGE).games[0].needsRefresh,true);
});
test('new games scan, removed games disappear, and other accounts cannot inherit progress',()=>{
 const fresh={id:2,name:'New game',minutes:0,lastPlayed:0,status:'pending'};
 assert.deepEqual(mergeLibrary(library([fresh]),previous,now).games,[fresh]);
 const other={...library([current]),profile:{id:'76561198000000000'}};
 assert.equal(mergeLibrary(other,previous,now),other);
});
test('no-achievement games are cached and unavailable games can be retried',()=>{
 const none={...previous,games:[{...oldGame,status:'none',total:0,achievements:[]}]};
 assert.equal(mergeLibrary(library([current]),none,now).games[0].needsRefresh,false);
 const failed={...previous,games:[{...oldGame,status:'error'}]};
 assert.equal(mergeLibrary(library([current]),failed,now).games[0].status,'pending');
 assert.equal(REFRESH_COOLDOWN,15*60*1000);
});

test('an old partial snapshot cannot overwrite completed game details',()=>{
 const stored={...previous,fetchedAt:100,refreshStartedAt:200,games:[oldGame]};
 const partial={...previous,fetchedAt:100,refreshStartedAt:100,games:[current]};
 const merged=mergeSnapshots(partial,stored);assert.equal(merged.games[0].status,'ready');assert.equal(merged.games[0].unlocked,1);assert.equal(merged.refreshStartedAt,200);
});
test('new library metadata is retained when reusing newer checked game progress',()=>{
 const stored={...previous,fetchedAt:100,games:[oldGame]};
 const incoming={...previous,fetchedAt:200,games:[{...current,name:'Renamed',minutes:99}]};
 const merged=mergeSnapshots(incoming,stored);assert.equal(merged.games[0].name,'Renamed');assert.equal(merged.games[0].minutes,99);assert.equal(merged.games[0].unlocked,1);
});
test('snapshot merges never resurrect games removed from a newer library',()=>{
 const stored={...previous,fetchedAt:200,games:[]};
 assert.equal(mergeSnapshots({...previous,fetchedAt:100},stored).games.length,0);
});
test('new achievement checks replace older progress and accounts stay separate',()=>{
 const incoming={...previous,fetchedAt:100,games:[{...oldGame,checkedAt:now+1,unlocked:2}]};
 assert.equal(mergeSnapshots(incoming,{...previous,fetchedAt:100}).games[0].unlocked,2);
 const other={...previous,profile:{id:'76561198000000001'}};assert.equal(mergeSnapshots(other,previous),other);
});
