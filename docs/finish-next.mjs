import {timeReference} from './completion-times.mjs?v=1';
import { gameFindings, sourceCoverage } from './availability.mjs?v=3';

// Recommendations need matching source coverage. A historical unlock is never a blocker.
export function finishCandidates(games,{demo=false,sort='completion'}={}) {
 return games.filter(game=>game.status==='ready'&&game.unlocked>0&&game.total>game.unlocked&&(demo||(
  sourceCoverage([game]).checked===1&&!gameFindings(game).some(({achievement,rule})=>!achievement.unlocked&&['unobtainable','reported','conditional','broken'].includes(rule.kind))
 ))).sort((a,b)=>{const completion=(b.unlocked/b.total)-(a.unlocked/a.total),remaining=(a.total-a.unlocked)-(b.total-b.unlocked);if(sort==='time'){const at=timeReference(a),bt=timeReference(b),am=at?.reliable?at.medianMinutes:null,bm=bt?.reliable?bt.medianMinutes:null;return Number(am===null)-Number(bm===null)||(am!==null&&bm!==null?am-bm:0)||remaining||completion||a.id-b.id;}if(sort==='easiest'){const ae=timedFinishEffort(a),be=timedFinishEffort(b),af=finishEffort(a),bf=finishEffort(b);return Number(ae===null)-Number(be===null)||(ae!==null&&be!==null?ae-be:0)||Number(af===null)-Number(bf===null)||(af!==null&&bf!==null?af-bf:0)||remaining||completion||a.id-b.id;}if(sort==='rarity'){const ar=remainingRarity(a),br=remainingRarity(b);return Number(br.complete)-Number(ar.complete)||(ar.complete&&br.complete?(br.rarest-ar.rarest)||(br.average-ar.average):0)||remaining||completion||a.id-b.id;}return (sort==='remaining'?remaining||completion:completion||remaining)||a.id-b.id;});
}

export function remainingRarity(game) {
 const remaining=(game.achievements||[]).filter(a=>!a.unlocked);
 const rates=remaining.map(a=>a.rarity).filter(value=>typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=100);
 const total=Math.max(0,(game.total||0)-(game.unlocked||0));
 return {total,known:rates.length,complete:total>0&&remaining.length===total&&rates.length===total,
  average:rates.length?rates.reduce((sum,value)=>sum+value,0)/rates.length:null,
  rarest:rates.length?Math.min(...rates):null};
}

// Relative ranking only, not expected attempts, playtime or a difficulty guarantee.
// Summing per-achievement inverse prevalence accounts for both count and rare bottlenecks.
export function finishEffort(game) {
 if(!remainingRarity(game).complete)return null;
 return game.achievements.filter(a=>!a.unlocked).reduce((sum,a)=>sum+100/Math.max(a.rarity,0.1),0);
}

// Time is a full-game reference; the square root moderates its influence.
// No time is inferred from achievement progress or subtracted personal playtime.
export function timedFinishEffort(game) {
 const effort=finishEffort(game),time=timeReference(game);
 return effort!==null&&time?.reliable?effort*Math.sqrt(time.medianMinutes/60):null;
}
