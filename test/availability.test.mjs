import test from 'node:test';
import assert from 'node:assert/strict';
import {catalog,achievementIssues,gameFindings,libraryAvailability} from '../docs/availability.mjs';
const achievement={id:'source-api-id',name:'Up to the Task',unlocked:false};
const game={id:234140,status:'ready',achievements:[achievement]};
test('known conditional blockers match only the correct game and achievement',()=>{
 const issues=achievementIssues(game,achievement);
 assert.equal(issues.length,1);assert.equal(issues[0].kind,'conditional');
 assert.equal(achievementIssues({id:1},achievement).length,0);
 assert.equal(achievementIssues(game,{name:'Different achievement',rarity:0}).length,0);
});
test('unlocked historical achievements remain unlocked and are excluded from locked issue counts',()=>{
 const report=libraryAvailability([{...game,achievements:[{...achievement,unlocked:true}]}]);
 assert.equal(report.findings.length,1);assert.equal(report.remaining.length,0);
 assert.equal(game.achievements[0].unlocked,false);
});
test('unlisted games, rare achievements and errors are not labeled unobtainable',()=>{
 const unknown={id:99,status:'error',achievements:[{name:'Impossible achievement',rarity:0,unlocked:false}]};
 assert.equal(gameFindings(unknown).length,0);
 const report=libraryAvailability([game,unknown]);
 assert.equal(report.unreviewed,1);assert.equal(report.listed.length,1);assert.equal(report.remaining.length,1);
});
test('missing progress is explicit and does not fabricate a locked achievement',()=>{
 const report=libraryAvailability([{id:234140,status:'pending'}]);
 assert.equal(report.missingProgress,1);assert.equal(report.remaining.length,0);
});
test('bug reports are distinguished from official conditional service shutdowns',()=>{
 const issues=achievementIssues({id:440},{name:'Blockbuster'});
 assert.equal(issues[0].kind,'reported');
 assert.equal(achievementIssues({id:440},{name:"That's a Wrap"}).length,0);
 for(const rule of catalog){assert.ok(rule.sources.length);for(const source of rule.sources)assert.equal(new URL(source.url).protocol,'https:');}
});
