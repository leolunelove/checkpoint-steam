import { gameFindings, sourceCoverage } from './availability.mjs?v=3';

// Recommendations need matching source coverage. A historical unlock is never a blocker.
export function finishCandidates(games,{demo=false,sort='completion'}={}) {
 return games.filter(game=>game.status==='ready'&&game.unlocked>0&&game.total>game.unlocked&&(demo||(
  sourceCoverage([game]).checked===1&&!gameFindings(game).some(({achievement,rule})=>!achievement.unlocked&&['unobtainable','reported','conditional','broken'].includes(rule.kind))
 ))).sort((a,b)=>{const completion=(b.unlocked/b.total)-(a.unlocked/a.total),remaining=(a.total-a.unlocked)-(b.total-b.unlocked);if(sort==='rarity'){const ar=remainingRarity(a),br=remainingRarity(b);return Number(br.complete)-Number(ar.complete)||(ar.complete&&br.complete?(br.rarest-ar.rarest)||(br.average-ar.average):0)||remaining||completion||a.id-b.id;}return (sort==='remaining'?remaining||completion:completion||remaining)||a.id-b.id;});
}

export function remainingRarity(game) {
 const remaining=(game.achievements||[]).filter(a=>!a.unlocked);
 const rates=remaining.map(a=>a.rarity).filter(value=>typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=100);
 const total=Math.max(0,(game.total||0)-(game.unlocked||0));
 return {total,known:rates.length,complete:total>0&&remaining.length===total&&rates.length===total,
  average:rates.length?rates.reduce((sum,value)=>sum+value,0)/rates.length:null,
  rarest:rates.length?Math.min(...rates):null};
}
