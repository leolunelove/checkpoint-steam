// A deliberately limited, sourced catalog. Absence is unknown, never a clean bill of health.
export const reviewedAt = '2026-10-20';
export const catalog = [
 {appId:234140, key:'madmax-scrap-crew', label:'Conditional blocker', kind:'conditional',
  achievementNames:['Up to the Task'],
  reason:'WB retired Scrap Crew services on 31 October 2020. This achievement is blocked on a fresh, unmodified save unless its Scrap Crew challenges were already completed before the shutdown.',
  caveat:'Older qualifying saves and community fixes may change what is possible. Steam cannot tell us whether your save meets the condition.',
  sources:[{title:'WB Games: affected challenges and achievement',url:'https://wbgamessupport.wbgames.com/hc/en-us/articles/360058007413-Mad-Max-Status-Update'},{title:'Community fix author: MadMaxFix',url:'https://www.nexusmods.com/madmax/mods/215?tab=description'}]},
 {appId:440, key:'tf2-youtube-replays', label:'Reported broken', kind:'reported',
  achievementNames:['Home Movie','Local Cinema Star','Indie Film Sensation','Blockbuster'],
  reason:'Players report that the retired YouTube integration prevents the normal Replay upload/view requirements from working. The report remains open in Valve’s public issue tracker.',
  caveat:'This is a community bug report, not a Valve certification that every workaround is impossible. Check the linked discussion for changes.',
  sources:[{title:'Valve issue tracker: YouTube Replay support #2277',url:'https://github.com/ValveSoftware/Source-1-Games/issues/2277'}]}
];
const normalize = text => String(text || '').normalize('NFKC').toLowerCase().replace(/[^a-z0-9]/g,'');
export function rulesFor(game) { return catalog.filter(rule=>rule.appId===game.id); }
export function achievementIssues(game, achievement) {
 return rulesFor(game).filter(rule=>rule.achievementNames.some(name=>normalize(name)===normalize(achievement.name)));
}
export function gameFindings(game) {
 return (game.achievements || []).flatMap(achievement=>achievementIssues(game,achievement).map(rule=>({rule,achievement})));
}
export function libraryAvailability(games) {
 const listed=games.filter(game=>rulesFor(game).length);
 const findings=listed.flatMap(game=>gameFindings(game).map(finding=>({...finding,game})));
 return {listed,findings,remaining:findings.filter(item=>!item.achievement.unlocked),unreviewed:games.length-listed.length,
  missingProgress:listed.filter(game=>!['ready','none'].includes(game.status)).length};
}
