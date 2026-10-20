import { AppError } from './steam.mjs';
export const AVAILABILITY_TTL=24*60*60*1000;
export function createAvailability({fetcher=fetch,now=Date.now}={}) {
 const cache=new Map(),pending=new Map();
 return async appid=>{
  if(!/^[1-9]\d{0,9}$/.test(String(appid))||Number(appid)>4294967295)throw new AppError('Invalid game ID.');
  const id=Number(appid),saved=cache.get(id);
  if(saved&&saved.fetchedAt+AVAILABILITY_TTL>now())return saved;
  if(pending.has(id))return pending.get(id);
  const job=(async()=>{
   let response,body;
   try{response=await fetcher(`https://steamhunters.com/api/apps/${id}/achievements`,{signal:AbortSignal.timeout(12000),redirect:'error'});body=await response.json();}
   catch{throw new AppError('SteamHunters availability is temporarily unavailable.',502);}
   if(!response.ok||!Array.isArray(body)||body.length>20000||!body.every(a=>typeof a.apiName==='string'&&typeof a.name==='string'&&[0,1,2,3].includes(a.obtainability)))throw new AppError('SteamHunters has no readable availability data for this game.',502);
   const value={appId:id,achievementCount:body.length,flags:body.filter(a=>a.obtainability!==0).map(a=>({apiName:a.apiName.slice(0,256),name:a.name.slice(0,512),obtainability:a.obtainability})),fetchedAt:now(),source:'SteamHunters'};
   if(cache.size>=1000)cache.delete(cache.keys().next().value);
   cache.set(id,value);return value;
  })();
  pending.set(id,job);try{return await job;}finally{pending.delete(id);}
 };
}
