import { gameFindings, sourceCoverage } from './availability.mjs?v=3';

// Recommendations need matching source coverage. A historical unlock is never a blocker.
export function finishCandidates(games,{demo=false}={}) {
 return games.filter(game=>game.status==='ready'&&game.unlocked>0&&game.total>game.unlocked&&(demo||(
  sourceCoverage([game]).checked===1&&!gameFindings(game).some(({achievement,rule})=>!achievement.unlocked&&['unobtainable','reported','conditional','broken'].includes(rule.kind))
 ))).sort((a,b)=>b.percent-a.percent);
}
