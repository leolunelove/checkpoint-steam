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
 ],
 22370:[{"kind":"Map","title":"Capital Wasteland map","description":"MapGenie · Locations and collectibles","url":"https://mapgenie.io/fallout-3/maps/capital-wasteland"}],
 22380:[{"kind":"Map","title":"Mojave and DLC maps","description":"MapGenie · Locations and collectibles","url":"https://mapgenie.io/fallout-new-vegas"}],
 377160:[{"kind":"Map","title":"Commonwealth map","description":"MapGenie · Locations and collectibles","url":"https://fallout4map.com"},{"kind":"Companion","title":"Character build planner","description":"Nukes & Dragons · SPECIAL and perks","url":"https://nukesdragons.com/fallout-4/character"}],
 1151340:[{"kind":"Map","title":"Appalachia map","description":"FalloutBuilds · Locations, resources and enemies","url":"https://www.falloutbuilds.com/fo76/map/"},{"kind":"Companion","title":"Character build planner","description":"Nukes & Dragons · SPECIAL and perks","url":"https://nukesdragons.com/fallout-76/character"}],
 72850:[{"kind":"Map","title":"Interactive maps","description":"MapGenie · Skyrim and Solstheim","url":"https://mapgenie.io/skyrim"}],
 292030:[{"kind":"Map","title":"Interactive maps","description":"MapGenie · Locations and collectibles","url":"https://mapgenie.io/witcher-3"}],
 1174180:[{"kind":"Map","title":"Interactive maps","description":"MapGenie · Locations and collectibles","url":"https://rdr2map.com"}],
 271590:[{"kind":"Map","title":"Interactive maps","description":"MapGenie · Locations and collectibles","url":"https://gta-5-map.com"}],
 990080:[{"kind":"Map","title":"Interactive maps","description":"MapGenie · Locations and collectibles","url":"https://mapgenie.io/hogwarts-legacy"}],
 264710:[{"kind":"Map","title":"Interactive map","description":"MapGenie · Locations and collectibles","url":"https://mapgenie.io/subnautica/maps/world"}],
 367520:[{"kind":"Map","title":"Interactive map","description":"MapGenie · Locations and collectibles","url":"https://mapgenie.io/hollow-knight/maps/hallownest"}],
 239140:[{"kind":"Map","title":"Interactive maps","description":"MapGenie · Locations and collectibles","url":"https://mapgenie.io/dying-light"}],
 298110:[{"kind":"Map","title":"Interactive maps","description":"MapGenie · Locations and collectibles","url":"https://mapgenie.io/far-cry-4"}],
 220240:[{"kind":"Map","title":"Rook Islands map","description":"MapGenie · Locations and collectibles","url":"https://mapgenie.io/far-cry-3/maps/rook-islands"}],
 582160:[{"kind":"Map","title":"Interactive maps","description":"MapGenie · Locations and collectibles","url":"https://mapgenie.io/assassins-creed-origins"}],
 242050:[{"kind":"Map","title":"Interactive maps","description":"MapGenie · Locations and collectibles","url":"https://mapgenie.io/assassins-creed-4-black-flag"}],
 201870:[{"kind":"Map","title":"Interactive map","description":"MapGenie · Locations and collectibles","url":"https://mapgenie.io/assassins-creed-revelations/maps/constantinople"}],
 48190:[{"kind":"Map","title":"Interactive map","description":"MapGenie · Locations and collectibles","url":"https://mapgenie.io/assassins-creed-brotherhood/maps/italy"}],
 33230:[{"kind":"Map","title":"Interactive map","description":"MapGenie · Locations and collectibles","url":"https://mapgenie.io/assassins-creed-2/maps/italy"}],
 208480:[{"kind":"Map","title":"Interactive map","description":"MapGenie · Locations and collectibles","url":"https://mapgenie.io/assassins-creed-3/maps/america"}],
 12210:[{"kind":"Map","title":"Interactive map","description":"MapGenie · Locations and collectibles","url":"https://mapgenie.io/grand-theft-auto-4/maps/liberty-city"}],
 12100:[{"kind":"Map","title":"Interactive map","description":"MapGenie · Locations and collectibles","url":"https://mapgenie.io/grand-theft-auto-3/maps/liberty-city"}],
 12110:[{"kind":"Map","title":"Interactive map","description":"MapGenie · Locations and collectibles","url":"https://mapgenie.io/grand-theft-auto-vice-city/maps/vice-city"}],
 12120:[{"kind":"Map","title":"Interactive map","description":"MapGenie · Locations and collectibles","url":"https://mapgenie.io/grand-theft-auto-san-andreas/maps/san-andreas"}],
 489830:[{"kind":"Map","title":"Interactive maps","description":"MapGenie · Skyrim and Solstheim","url":"https://mapgenie.io/skyrim"}],
 12230:[{"kind":"Map","title":"Interactive map","description":"MapGenie · Locations and collectibles","url":"https://mapgenie.io/grand-theft-auto-3/maps/liberty-city"}],
 12240:[{"kind":"Map","title":"Interactive map","description":"MapGenie · Locations and collectibles","url":"https://mapgenie.io/grand-theft-auto-vice-city/maps/vice-city"}],
 12250:[{"kind":"Map","title":"Interactive map","description":"MapGenie · Locations and collectibles","url":"https://mapgenie.io/grand-theft-auto-san-andreas/maps/san-andreas"}],
 413150:[{"kind":"Companion","title":"Farm planner","description":"Stardew Planner · Plan your farm layout","url":"https://stardew.info/planner/"},{"kind":"Companion","title":"Completion checkup","description":"Stardew Checkup · Uses a save file","url":"https://mouseypounds.github.io/stardew-checkup/"}],
 105600:[{"kind":"Companion","title":"TerraMap world viewer","description":"Explore your own world · Uses a world file","url":"https://terramap.github.io/"}],
 275850:[{"kind":"Companion","title":"Assistant for No Man’s Sky","description":"Crafting recipes and item reference","url":"https://nmsassistant.com/"}]
};
export function resourcesFor(appId){return (resources[appId]||[]).slice(0,3).map(row=>({...row}));}
