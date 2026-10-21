import test from 'node:test';
import assert from 'node:assert/strict';
import {createCompletionTimes,TIME_TTL} from '../supabase/functions/checkpoint-steam-api/completion-times.mjs';
import {createHandler} from '../supabase/functions/checkpoint-steam-api/handler.mjs';
import {formatCompletionTime,loadTimes,timeReference} from '../docs/completion-times.mjs?v=1';
import {finishCandidates} from '../docs/finish-next.mjs?v=7';
test('bounded fixed-host source batches normalize minutes and cache/coalesce without profile or Steam key',async()=>{
 let calls=0,time=100;const load=createCompletionTimes({now:()=>time,fetcher:async url=>{calls++;assert.equal(url.origin,'https://steamhunters.com');assert.equal(url.pathname,'/api/apps');assert.deepEqual(url.searchParams.getAll('appIds'),['123','124']);assert.equal(url.searchParams.has('key'),false);return Response.json([{appId:123,achievementCount:2,medianCompletionTime:120,playersCompletedCount:50}]);}});
 const [a,b]=await Promise.all([load('123,124'),load('123,124')]);assert.deepEqual(a,b);assert.equal(calls,1);assert.equal(a[0].medianMinutes,120);assert.equal(a[1].medianMinutes,null);await load('123');assert.equal(calls,1);time+=TIME_TTL+1;
});
test('invalid inputs and source errors remain explicit; zero times never become instant completions',async()=>{
 let calls=0;const load=createCompletionTimes({fetcher:async()=>{calls++;return Response.json([{appId:123,achievementCount:2,medianCompletionTime:0,playersCompletedCount:0}]);}});
 for(const input of ['', '0','123/','4294967296',Array(51).fill('123').join(',')])await assert.rejects(load(input));assert.equal(calls,0);assert.equal((await load('123'))[0].medianMinutes,null);
 await assert.rejects(createCompletionTimes({fetcher:async()=>Response.json({error:'bad'})})('123'),/temporarily unavailable/);
});
test('time references sort full medians, leave mismatched/missing/limited data last and never subtract personal playtime',async()=>{
 const make=(id,minutes,total=2,completions=10)=>({appId:id,achievementCount:total,medianMinutes:minutes,completions,fetchedAt:Date.now()});
 await loadTimes([9876401,9876402,9876403,9876404],async()=>[make(9876401,120),make(9876402,30),make(9876403,1,2,1),make(9876404,10,3)]);
 const game=id=>({id,status:'ready',total:2,unlocked:1,minutes:9000,achievements:[{unlocked:true},{unlocked:false}]});
 assert.equal(timeReference(game(9876401)).medianMinutes,120);assert.equal(timeReference(game(9876404)),null);
 const sorted=finishCandidates([game(9876401),game(9876403),game(9876404),game(9876402)],{demo:true,sort:'time'});assert.deepEqual(sorted.slice(0,2).map(g=>g.id),[9876402,9876401]);
 assert.equal(formatCompletionTime(30),'~30m');assert.equal(formatCompletionTime(90),'~1.5h');assert.equal(formatCompletionTime(null),'—');assert.equal(formatCompletionTime(0),'—');
});
test('edge time endpoint needs no profile and only sends public app IDs upstream',async()=>{
 const handler=createHandler({getKey:()=>'a'.repeat(32),fetcher:async url=>{assert.equal(url.origin,'https://steamhunters.com');assert.equal(url.searchParams.has('profile'),false);return Response.json([{appId:123,achievementCount:2,medianCompletionTime:60,playersCompletedCount:20}]);}});
 const response=await handler(new Request('https://example.test/?endpoint=times&appids=123'));assert.equal(response.status,200);assert.equal((await response.json())[0].medianMinutes,60);
});
