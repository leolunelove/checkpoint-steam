import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeNotNow,changeNotNow,readNotNow,writeNotNow} from '../docs/not-now.mjs';
import {finishCandidates} from '../docs/finish-next.mjs?v=10';
test('hidden games persist per profile and can be restored',()=>{
 const values=new Map(),store={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)};
 assert.equal(writeNotNow(store,'leo',changeNotNow([],620,true)),true);
 assert.deepEqual(readNotNow(store,'leo'),[620]);assert.deepEqual(readNotNow(store,'other'),[]);
 writeNotNow(store,'leo',changeNotNow(readNotNow(store,'leo'),620,false));assert.deepEqual(readNotNow(store,'leo'),[]);
});
test('invalid storage is safe and write failure is reported',()=>{
 assert.deepEqual(normalizeNotNow([620,620,-1,'2',null,Infinity,2**40]),[620]);
 assert.deepEqual(readNotNow({getItem:()=>'{bad'},'leo'),[]);
 assert.equal(writeNotNow({setItem:()=>{throw Error('blocked');}},'leo',[620]),false);
});
test('hiding applies to every ranking without changing library progress; restoring respects eligibility',()=>{
 const games=[1,2].map(id=>({id,name:String(id),status:'ready',total:2,unlocked:1,percent:50,achievements:[{id:'a',unlocked:true},{id:'b',unlocked:false,rate:20}]}));
 const before=JSON.stringify(games);
 for(const sort of ['easiest','completion','remaining','rarity','time'])assert.deepEqual(finishCandidates(games,{demo:true,sort,excluded:[1]}).map(g=>g.id),[2]);
 assert.equal(JSON.stringify(games),before);
 assert.equal(finishCandidates(games,{demo:true,excluded:changeNotNow([1],1,false)}).length,2);
 assert.equal(finishCandidates(games,{excluded:[]}).length,0);
});
