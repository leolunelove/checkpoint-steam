import test from 'node:test';
import assert from 'node:assert/strict';
import {resourcesFor} from '../docs/game-resources.mjs';
test('curated resources use exact app IDs, never similarly named editions or unreviewed games',()=>{
 for(const id of [1817070,550,924970,22370,22380,377160,1151340,72850,489830,292030,1174180,990080,264710,367520,239140,298110,220240,582160,242050,201870,48190,33230,208480,12210,12100,12110,12120,12230,12240,12250,271590,413150,105600,275850])assert.ok(resourcesFor(id).length>0&&resourcesFor(id).length<=3);
 for(const id of [1817190,500,1836200,365720,1547000,0])assert.deepEqual(resourcesFor(id),[]);
 assert.ok(resourcesFor(1817070).some(r=>r.kind==='Map'));
 assert.ok(resourcesFor(924970).some(r=>r.kind==='Companion'));
});
test('resource URLs are direct HTTPS links and callers cannot change the curated data',()=>{
 for(const id of [1817070,550,924970,22370,22380,377160,1151340,72850,489830,292030,1174180,990080,264710,367520,239140,298110,220240,582160,242050,201870,48190,33230,208480,12210,12100,12110,12120,12230,12240,12250,271590,413150,105600,275850])for(const row of resourcesFor(id)){
  const u=new URL(row.url);assert.equal(u.protocol,'https:');assert.equal(u.username,'');assert.equal(u.password,'');assert.ok(row.title&&row.description);
 }
 const first=resourcesFor(550);first[0].url='https://example.com';assert.notEqual(resourcesFor(550)[0].url,first[0].url);
});

test('Fallout world maps stay separate from Shelter and the public test server',()=>{for(const id of [22370,22380,377160,1151340])assert.ok(resourcesFor(id).some(r=>r.kind==='Map'));assert.equal(resourcesFor(588430).some(r=>r.kind==='Map'),false);assert.deepEqual(resourcesFor(1836200),[]);});
