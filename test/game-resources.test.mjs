import test from 'node:test';
import assert from 'node:assert/strict';
import {resourcesFor} from '../docs/game-resources.mjs';
test('curated resources use exact app IDs, never similarly named editions or unreviewed games',()=>{
 for(const id of [1817070,550,924970])assert.ok(resourcesFor(id).length>0&&resourcesFor(id).length<=3);
 for(const id of [1817190,500,377160,0])assert.deepEqual(resourcesFor(id),[]);
 assert.ok(resourcesFor(1817070).some(r=>r.kind==='Map'));
 assert.ok(resourcesFor(924970).some(r=>r.kind==='Companion'));
});
test('resource URLs are direct HTTPS links and callers cannot change the curated data',()=>{
 for(const id of [1817070,550,924970])for(const row of resourcesFor(id)){
  const u=new URL(row.url);assert.equal(u.protocol,'https:');assert.equal(u.username,'');assert.equal(u.password,'');assert.ok(row.title&&row.description);
 }
 const first=resourcesFor(550);first[0].url='https://example.com';assert.notEqual(resourcesFor(550)[0].url,first[0].url);
});
