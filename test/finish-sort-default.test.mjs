import test from 'node:test';import assert from 'node:assert/strict';
import {resolveFinishSort} from '../docs/finish-next.mjs?v=10';
test('Finish next defaults to easiest for missing or invalid preferences',()=>{for(const saved of [undefined,null,'',false,'unknown'])assert.equal(resolveFinishSort(saved),'easiest');});
test('explicit saved sort choices are preserved',()=>{for(const saved of ['completion','remaining','rarity','easiest','time'])assert.equal(resolveFinishSort(saved),saved);});
