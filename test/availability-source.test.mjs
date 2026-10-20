import test from 'node:test';
import assert from 'node:assert/strict';
import {createAvailability} from '../supabase/functions/checkpoint-steam-api/availability.mjs';
import {createHandler} from '../supabase/functions/checkpoint-steam-api/handler.mjs';
import {loadAvailability,cachedAvailability,freshAvailability} from '../docs/availability-cache.mjs?v=1';
import {achievementIssues,sourceCoverage,libraryAvailability} from '../docs/availability.mjs';
const body=[0,1,2,3].map((obtainability,i)=>({apiName:`API_${i}`,name:`Achievement ${i}`,obtainability}));
const fetcher=async url=>{assert.equal(String(url),'https://steamhunters.com/api/apps/987654321/achievements');return Response.json(body);};
test('source proxy returns every flagged category, drops normal entries, and caches/coalesces without Steam',async()=>{
 let calls=0,time=1000;const load=createAvailability({fetcher:async url=>{calls++;return fetcher(url);},now:()=>time});
 const [a,b]=await Promise.all([load('987654321'),load('987654321')]);assert.equal(a,b);assert.equal(calls,1);assert.deepEqual(a.flags.map(a=>a.obtainability),[1,2,3]);
 await load(987654321);assert.equal(calls,1);time+=86400001;await load(987654321);assert.equal(calls,2);
});
test('invalid IDs never reach the source; unknown enums and source errors never become all clear',async()=>{
 let calls=0;const load=createAvailability({fetcher:async()=>{calls++;return Response.json([{...body[0],obtainability:99}]);}});
 for(const id of ['0','-1','1/x','4294967296'])await assert.rejects(load(id));assert.equal(calls,0);
 await assert.rejects(load(123),/no readable/);assert.equal(calls,1);
 const missing=createAvailability({fetcher:async()=>new Response('missing',{status:404})});await assert.rejects(missing(123));
});
test('browser cached flags match Steam API IDs, not translated display names, and preserve historical unlocks',async()=>{
 let calls=0;const request=async()=>{calls++;return {appId:987654321,fetchedAt:Date.now(),achievementCount:4,flags:body.slice(1)};};
 await Promise.all([loadAvailability(987654321,request),loadAvailability(987654321,request)]);await loadAvailability(987654321,request);assert.equal(calls,1);
 const game={id:987654321,status:'ready',total:4,achievements:body.map((a,i)=>({id:a.apiName,name:'Translated name',unlocked:i===3}))};
 assert.equal(achievementIssues(game,game.achievements[0]).length,0);
 assert.deepEqual(game.achievements.slice(1).map(a=>achievementIssues(game,a)[0].kind),['broken','conditional','unobtainable']);
 assert.equal(libraryAvailability([game]).remaining.length,2);
 assert.equal(sourceCoverage([game]).checked,1);assert.equal(sourceCoverage([{...game,total:5}]).unknown,1);assert.equal(sourceCoverage([{id:987654320,status:'error'}]).unknown,1);
 assert.equal(freshAvailability(cachedAvailability(game.id)),true);
});
test('availability edge route accepts only app ID and never passes Steam key or profile upstream',async()=>{
 const handle=createHandler({getKey:()=>'a'.repeat(32),fetcher});
 const response=await handle(new Request('https://example.test/?endpoint=availability&appid=987654321'));
 assert.equal(response.status,200);const value=await response.json();assert.equal(value.source,'SteamHunters');assert.equal(JSON.stringify(value).includes('a'.repeat(32)),false);
});
test('a missing achievement ID is unknown even when source and Steam totals agree',async()=>{
 await loadAvailability(987654319,async()=>({appId:987654319,achievementCount:1,fetchedAt:Date.now(),flags:[{apiName:'REMOVED_ID',name:'Same display name',obtainability:3}]}));
 const game={id:987654319,total:1,status:'ready',achievements:[{id:'NEW_ID',name:'Same display name',unlocked:false}]};
 assert.equal(sourceCoverage([game]).unknown,1);assert.equal(libraryAvailability([game]).remaining.length,0);
});
test('normal and empty source results remain separate from a coverage guarantee',async()=>{
 const load=createAvailability({fetcher:async()=>Response.json([])});const value=await load(987654318);assert.equal(value.achievementCount,0);assert.deepEqual(value.flags,[]);
 await loadAvailability(987654318,async()=>value);assert.equal(sourceCoverage([{id:987654318,status:'none',total:0}]).checked,1);assert.equal(sourceCoverage([{id:987654318,status:'error'}]).unknown,1);
});
