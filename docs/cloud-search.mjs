const services=[{id:'boosteroid',name:'Boosteroid',pattern:/\bboosteroid\b/gi},{id:'gfn',name:'GeForce NOW',pattern:/\b(?:geforce\s*now|geforce|gfn|nvidia)\b/gi}];
export const cloudTitle=name=>String(name).replace(/[™®]/g,'').normalize('NFKC').replace(/[‘’]/g,"'").replace(/\s+/g,' ').trim().toLowerCase();
export function parseCloudQuery(query){
 let text=String(query),providers=[];
 for(const service of services){service.pattern.lastIndex=0;if(service.pattern.test(text)){providers.push(service.id);service.pattern.lastIndex=0;text=text.replace(service.pattern,' ');}}
 return {providers,text:text.replace(/\s+/g,' ').trim(),names:providers.map(id=>services.find(s=>s.id===id).name)};
}
export function indexCloudCatalog(snapshot){
 const titles=new Map();for(const item of snapshot.gfn.games){const key=cloudTitle(item.title);if(!titles.has(key))titles.set(key,[]);titles.get(key).push(item);}
 return {checkedAt:snapshot.checkedAt,boosteroid:snapshot.boosteroid.games,gfn:titles};
}
export function cloudMatches(game,providers,catalog){
 if(!catalog)return [];
 const found=[];
 if(providers.includes('boosteroid')){const row=catalog.boosteroid[game.id];if(row&&!row.maintenance)found.push({id:'boosteroid',name:'Boosteroid',detail:row.collection==='Install'?'Install to play':'Library'});}
 if(providers.includes('gfn')){const rows=catalog.gfn.get(cloudTitle(game.name));if(rows?.length===1){const row=rows[0];found.push({id:'gfn',name:'GeForce NOW',detail:row.playType==='INSTALL_TO_PLAY'?'Install to play':row.playType==='READY_TO_PLAY'?'Ready to play':'Listed',tier:row.tier});}}
 return found;
}
export function matchesCloudSearch(game,query,catalog,service='all'){const parsed=parseCloudQuery(query);if(!parsed.providers.length&&resolveCloudService(service)!=='all')parsed.providers=[service];return game.name.toLowerCase().includes(parsed.text.toLowerCase())&&(!parsed.providers.length||cloudMatches(game,parsed.providers,catalog).length>0);}

export const resolveCloudService=value=>['boosteroid','gfn'].includes(value)?value:'all';
