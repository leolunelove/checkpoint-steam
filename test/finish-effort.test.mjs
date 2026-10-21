import test from 'node:test';
import assert from 'node:assert/strict';
import {finishEffort,finishCandidates} from '../docs/finish-next.mjs?v=8';
const game=(id,rates)=>({id,status:'ready',total:rates.length+1,unlocked:1,achievements:[{unlocked:true,rarity:0},...rates.map(rarity=>({unlocked:false,rarity}))]});
test('easiest combines count and prevalence rather than ranking either in isolation',()=>{
 const games=[game(1,[1]),game(2,Array(10).fill(50)),game(3,[50])];
 assert.deepEqual(finishCandidates(games,{demo:true,sort:'easiest'}).map(g=>g.id),[3,2,1]);
 assert.ok(finishEffort(games[2])<finishEffort(games[1]));
});
test('a rarer remaining achievement increases effort and historical unlocks are ignored',()=>{
 assert.ok(finishEffort(game(1,[2,50]))>finishEffort(game(2,[20,50])));
 assert.equal(finishEffort(game(3,[50])),2);
});
test('zero rates are finite and heavily penalized while incomplete rates sort last',()=>{
 const zero=game(1,[0]),unknown=game(2,[null]),partial=game(3,[99,null]);
 assert.equal(finishEffort(zero),1000);assert.equal(finishEffort(unknown),null);
 assert.deepEqual(finishCandidates([unknown,partial,zero],{demo:true,sort:'easiest'}).map(g=>g.id),[1,2,3]);
});
