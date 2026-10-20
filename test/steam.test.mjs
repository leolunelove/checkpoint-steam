import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseProfile, summarize, createSteam } from '../lib/steam.mjs';
import { makeServer } from '../server.mjs';
const id='76561198000000000';
const sample={
 ResolveVanityURL:{response:{steamid:id}},
 GetPlayerSummaries:{response:{players:[{steamid:id,communityvisibilitystate:3,personaname:'Test player'}]}},
 GetOwnedGames:{response:{game_count:2,games:[{appid:10,name:'One',playtime_forever:120},{appid:20,name:'Two',playtime_forever:60}]}},
 GetSchemaForGame:{game:{availableGameStats:{achievements:[{name:'A',displayName:'A nice start',hidden:0},{name:'B',displayName:'A secret',hidden:1}]}}},
 GetPlayerAchievements:{playerstats:{success:true,achievements:[{apiname:'A',achieved:1,unlocktime:100},{apiname:'B',achieved:0,unlocktime:0}]}},
 GetGlobalAchievementPercentagesForApp:{achievementpercentages:{achievements:[{name:'A',percent:50.25},{name:'B',percent:2}]}}
};
function fixture(overrides={}) {const calls=[];return {calls,fetcher:async url=>{calls.push(url);const name=url.pathname.split('/')[2];const value=overrides[name]??sample[name];if(value instanceof Error)throw value;return new Response(JSON.stringify(value),{status:200});}};}
test('accepts Steam IDs and vanity URLs without losing integer precision',()=>{
 assert.deepEqual(parseProfile(id),{id});assert.deepEqual(parseProfile(`https://steamcommunity.com/profiles/${id}/`),{id});assert.deepEqual(parseProfile('https://steamcommunity.com/id/player-one/'),{vanity:'player-one'});
});
test('rejects external hosts, credentials, invalid IDs and injected paths',()=>{
 for(const input of ['https://evil.example/id/me','https://steamcommunity.com.evil.example/id/me','https://x@steamcommunity.com/id/me','https://steamcommunity.com:444/id/me','../.env','123','https://steamcommunity.com/profiles/foo'])assert.throws(()=>parseProfile(input));
});
test('empty achievements have a finite completion percentage',()=>assert.deepEqual(summarize([]),{total:0,unlocked:0,percent:0}));
test('missing server key returns setup guidance without an upstream call',async()=>{const f=fixture();const steam=createSteam({fetcher:f.fetcher});await assert.rejects(steam.library(id),/not configured/);assert.equal(f.calls.length,0);});
test('library and achievement responses are merged and cached',async()=>{
 const f=fixture();const steam=createSteam({key:'server-secret',fetcher:f.fetcher});const data=await steam.library('test-player');assert.equal(data.mode,'live');assert.equal(data.profile.id,id);assert.equal(data.games[0].status,'pending');
 const detail=await steam.achievements(id,10);assert.equal(detail.unlocked,1);assert.equal(detail.total,2);assert.equal(detail.percent,50);assert.equal(detail.achievements[1].hidden,true);assert.equal(detail.achievements[0].rarity,50.25);const count=f.calls.length;await steam.achievements(id,10);assert.equal(f.calls.length,count);assert.ok(f.calls.every(url=>url.hostname==='api.steampowered.com'));assert.ok(!JSON.stringify(data).includes('server-secret'));
});
test('private game details are a failure, never an empty library',async()=>{const f=fixture({GetOwnedGames:{response:{}}});await assert.rejects(createSteam({key:'x',fetcher:f.fetcher}).library(id),/hidden/);});
test('public zero-game profiles remain valid',async()=>{const f=fixture({GetOwnedGames:{response:{game_count:0}}});assert.deepEqual((await createSteam({key:'x',fetcher:f.fetcher}).library(id)).games,[]);});
test('missing player progress is unknown, never zero',async()=>{const f=fixture({GetPlayerAchievements:{playerstats:{success:false}}});await assert.rejects(createSteam({key:'x',fetcher:f.fetcher}).achievements(id,10),/unavailable/);});
test('no achievement schema is excluded from totals',async()=>{const f=fixture({GetSchemaForGame:{game:{gameName:'No achievements'}},GetPlayerAchievements:new Error('Should not request progress for a game without achievements')});const result=await createSteam({key:'x',fetcher:f.fetcher}).achievements(id,10);assert.equal(result.status,'none');assert.equal(result.total,0);});
test('profile restriction and ownership are enforced',async()=>{const f=fixture();await assert.rejects(createSteam({key:'x',allowedId:'76561198000000001',fetcher:f.fetcher}).library(id),/restricted/);await assert.rejects(createSteam({key:'x',fetcher:f.fetcher}).achievements(id,999),/not in/);});
test('upstream network errors never leak a key or URL',async()=>{const f=fixture({GetOwnedGames:new Error('secret-url?key=server-secret')});await assert.rejects(createSteam({key:'server-secret',fetcher:f.fetcher}).library(id),error=>!error.message.includes('secret')&&error.status===502);});
test('HTTP serves only public assets and safe API responses',async()=>{
 const server=makeServer({key:undefined});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base=`http://127.0.0.1:${server.address().port}`;
 try{
  assert.equal((await fetch(base)).status,200);
  assert.deepEqual(await(await fetch(base+'/api/config')).json(),{configured:false,restricted:false});
  assert.equal((await fetch(base+'/.env')).status,404);
  assert.equal((await fetch(base+'/server.mjs')).status,404);
  assert.equal((await fetch(base+'/api/library?profile='+id,{headers:{Origin:'https://evil.example'}})).status,403);
  const response=await fetch(base+'/api/library?profile='+id);assert.equal(response.status,503);assert.match(response.headers.get('cache-control'),/no-store/);assert.match(response.headers.get('content-security-policy'),/script-src 'self'/);
  assert.equal((await fetch(base+'/api/library',{method:'POST'})).status,405);
 } finally {await new Promise(resolve=>server.close(resolve));}
});
