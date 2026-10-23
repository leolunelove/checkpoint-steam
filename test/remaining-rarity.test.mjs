import test from 'node:test';
import assert from 'node:assert/strict';
import {remainingRarity,finishCandidates} from '../docs/finish-next.mjs?v=9';
const game=(id,rates)=>({id,status:'ready',total:rates.length+1,unlocked:1,percent:50,achievements:[{unlocked:true,rarity:99},...rates.map(rarity=>({unlocked:false,rarity}))]});
test('rarity summarizes only locked achievements and preserves a genuine zero',()=>{
 assert.deepEqual(remainingRarity(game(1,[0,10,20])),{total:3,known:3,complete:true,average:10,rarest:0});
});
test('missing, nonnumeric and out-of-range rates remain unknown instead of becoming zero',()=>{
 const result=remainingRarity(game(1,[null,undefined,'20',NaN,-1,101,20]));assert.equal(result.known,1);assert.equal(result.total,7);assert.equal(result.complete,false);assert.equal(result.average,20);
 assert.equal(remainingRarity(game(2,[null])).average,null);assert.equal(remainingRarity(game(3,[])).complete,false);
});
test('common-remaining sort prioritizes the rarest outstanding rate, with partial data last',()=>{
 const games=[game(1,[99,1]),game(2,[20,20]),game(3,[90,null]),game(4,[0,10])];
 assert.deepEqual(finishCandidates(games,{demo:true,sort:'rarity'}).map(g=>g.id),[2,1,4,3]);assert.deepEqual(games.map(g=>g.id),[1,2,3,4]);
});
