import test from 'node:test';
import assert from 'node:assert/strict';
import {finishCandidates,timedFinishEffort} from '../docs/finish-next.mjs?v=9';
import {loadTimes} from '../docs/completion-times.mjs?v=1';
const game=(id,rates)=>({id,status:'ready',total:rates.length+1,unlocked:1,minutes:99999,achievements:[{unlocked:true,rarity:0},...rates.map(rarity=>({unlocked:false,rarity}))]});
const seed=async(game,minutes,completions=50,count=game.total)=>loadTimes([game.id],async()=>[{appId:game.id,achievementCount:count,medianMinutes:minutes,completions,fetchedAt:Date.now()}]);
test('equal remaining work favours the shorter community completion time, with moderate weighting',async()=>{
 const a=game(9876301,[50]),b=game(9876302,[50]);await seed(a,60);await seed(b,240);
 assert.equal(timedFinishEffort(a),2);assert.equal(timedFinishEffort(b),4);
 assert.deepEqual(finishCandidates([b,a],{demo:true,sort:'easiest'}).map(g=>g.id),[a.id,b.id]);
});
test('count and rarity still affect time-weighted ranking',async()=>{
 const a=game(9876303,[50]),b=game(9876304,[1]),c=game(9876305,[50,50]);for(const g of [a,b,c])await seed(g,60);
 assert.deepEqual(finishCandidates([b,c,a],{demo:true,sort:'easiest'}).map(g=>g.id),[a.id,c.id,b.id]);
});
test('unknown, limited, mismatched time and missing rates never receive a fabricated fast score',async()=>{
 const valid=game(9876306,[10]),missing=game(9876307,[99]),limited=game(9876308,[99]),mismatch=game(9876309,[99]),badRates=game(9876310,[null]);
 await seed(valid,600);await seed(limited,1,1);await seed(mismatch,1,50,3);await seed(badRates,1);
 for(const g of [missing,limited,mismatch,badRates])assert.equal(timedFinishEffort(g),null);
 assert.equal(finishCandidates([missing,limited,mismatch,badRates,valid],{demo:true,sort:'easiest'})[0].id,valid.id);
});
