// Curated for exact Steam app IDs. Links checked 28 October 2026.
const resources={
 1817070:[
  {kind:'Map',title:'Manhattan map',description:'Wand · Collectibles and activities',url:'https://wand.com/maps/marvels-spider-man-remastered/manhattan'},
  {kind:'Guide',title:'Achievement guide',description:'Steam Community · Remastered, NG+ and DLC',url:'https://steamcommunity.com/sharedfiles/filedetails/?id=2847999737'}
 ],
 550:[
  {kind:'Guide',title:'Achievement guide',description:'Steam Community · All 101, including event notes',url:'https://steamcommunity.com/sharedfiles/filedetails/?id=2419666451'}
 ],
 924970:[
  {kind:'Guide',title:'Achievement guide',description:'Steam Community · Campaign secrets and DLC',url:'https://steamcommunity.com/sharedfiles/filedetails/?id=2634664014'},
  {kind:'Companion',title:'FortHope deck builder',description:'Community decks · Check the build’s patch date',url:'https://forthope.gg/'}
 ]
};
export function resourcesFor(appId){return (resources[appId]||[]).slice(0,3).map(row=>({...row}));}
