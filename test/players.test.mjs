import test from 'node:test';
import assert from 'node:assert/strict';
import {createPlayerCounts,PLAYER_TTL} from '../supabase/functions/checkpoint-steam-api/players.mjs';
import {createHandler} from '../supabase/functions/checkpoint-steam-api/handler.mjs';
import {loadPlayers,cachedPlayers} from '../docs/players.mjs';
test('player count uses only the fixed Steam endpoint and caches a genuine zero',async()=>{
 let calls=0,time=1000;
 const players=createPlayerCounts({now:()=>time,fetcher:async url=>{calls++;assert.equal(url.origin,'https://api.steampowered.com');assert.equal(url.pathname,'/ISteamUserStats/GetNumberOfCurrentPlayers/v1/');assert.deepEqual([...url.searchParams.keys()],['appid']);return Response.json({response:{result:1,player_count:0}});}});
 assert.equal((await players(620)).count,0);await players(620);assert.equal(calls,1);
 time+=PLAYER_TTL+1;await players(620);assert.equal(calls,2);
});
test('simultaneous player requests are coalesced',async()=>{
 let calls=0;const players=createPlayerCounts({fetcher:async()=>{calls++;return Response.json({response:{result:1,player_count:100}});}});
 const results=await Promise.all([players(440),players(440)]);assert.equal(calls,1);assert.deepEqual(results[0],results[1]);
});
test('bad player-count game IDs are rejected before Steam is contacted',async()=>{
 const players=createPlayerCounts({fetcher:()=>{throw Error('must not run');}});
 for(const id of ['https://evil.example',0,-1,'1&key=bad',4294967296])await assert.rejects(players(id),/Invalid game/);
});
test('invalid player counts are errors rather than fabricated zeroes',async()=>{
 for(const body of [{response:{result:2,player_count:0}},{response:{result:1}},{response:{result:1,player_count:-1}},{response:{result:1,player_count:'123'}}]){
  const players=createPlayerCounts({fetcher:async()=>Response.json(body)});await assert.rejects(players(620),/unavailable/);
 }
});
test('edge player endpoint does not fetch a profile or achievement library',async()=>{
 let calls=0;const handler=createHandler({getKey:()=>'a'.repeat(32),fetcher:async url=>{calls++;assert.match(url.pathname,/GetNumberOfCurrentPlayers/);return Response.json({response:{result:1,player_count:123}});}});
 const response=await handler(new Request('https://example.test/?endpoint=players&appid=620',{headers:{origin:'https://steam.leolune.fun'}}));
 assert.equal(response.status,200);assert.equal((await response.json()).count,123);assert.equal(calls,1);
});
test('browser player cache reuses one response for repeated game opens',async()=>{
 let calls=0;const request=async()=>{calls++;return {appId:123456,count:0,fetchedAt:Date.now(),source:'Steam'};};
 await Promise.all([loadPlayers(123456,request),loadPlayers(123456,request)]);await loadPlayers(123456,request);
 assert.equal(calls,1);assert.equal(cachedPlayers(123456).count,0);
});
