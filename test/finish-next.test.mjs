import test from 'node:test';
import assert from 'node:assert/strict';
import {finishCandidates} from '../docs/finish-next.mjs?v=2';
import {loadAvailability} from '../docs/availability-cache.mjs?v=1';
const make=(id,overrides={})=>({id,status:'ready',total:2,unlocked:1,percent:50,achievements:[{id:'done',name:'Done',unlocked:true},{id:'left',name:'Left',unlocked:false}],...overrides});
const check=async(id,code,apiName='left',count=2)=>loadAvailability(id,async()=>({appId:id,fetchedAt:Date.now(),achievementCount:count,flags:code?[{apiName,name:'Source name',obtainability:code}]:[]}));
test('locked unobtainables, conditional blockers and workaround achievements are excluded',async()=>{
 const games=[make(9876501),make(9876502),make(9876503),make(9876504)];
 await check(9876501,3);await check(9876502,2);await check(9876503,1);await check(9876504,0);
 assert.deepEqual(finishCandidates(games).map(g=>g.id),[9876504]);
});
test('already unlocked source flags do not block a game and suggestions retain completion ordering',async()=>{
 await check(9876505,3,'done');await check(9876506,0);
 const games=[make(9876505),make(9876506,{percent:75})];assert.deepEqual(finishCandidates(games).map(g=>g.id),[9876506,9876505]);
 assert.equal(games[0].achievements[0].unlocked,true);
});
test('unknown/mismatched data, unavailable progress, completed and unstarted games are not recommended',async()=>{
 await check(9876507,0,'left',3);await check(9876508,0);await check(9876509,0);await check(9876510,0);
 assert.deepEqual(finishCandidates([make(9876511),make(9876507),make(9876508,{status:'error'}),make(9876509,{unlocked:2}),make(9876510,{unlocked:0})]),[]);
});
test('curated demo suggestions remain explicitly separate from real coverage requirements',()=>{
 const game=make(9876512);assert.equal(finishCandidates([game]).length,0);assert.equal(finishCandidates([game],{demo:true}).length,1);
});

test('an already unlocked workaround achievement does not block normal remaining play',async()=>{
 await check(9876513,1,'done');assert.deepEqual(finishCandidates([make(9876513)]).map(g=>g.id),[9876513]);
});
