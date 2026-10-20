import { AppError } from './steam.mjs';
export const PLAYER_TTL = 15 * 60 * 1000;
export function createPlayerCounts({fetcher=fetch,now=Date.now}={}) {
 const cache=new Map(),pending=new Map();
 return async appid=>{
  if(!/^[1-9]\d{0,9}$/.test(String(appid))||Number(appid)>4294967295)throw new AppError('Invalid game ID.');
  const id=Number(appid),saved=cache.get(id);
  if(saved&&saved.fetchedAt+PLAYER_TTL>now())return saved;
  if(pending.has(id))return pending.get(id);
  const job=(async()=>{
   const url=new URL('https://api.steampowered.com/ISteamUserStats/GetNumberOfCurrentPlayers/v1/');
   url.searchParams.set('appid',id);
   let response,body;
   try{response=await fetcher(url,{signal:AbortSignal.timeout(8000),redirect:'error'});body=await response.json();}
   catch{throw new AppError('Player count is temporarily unavailable.',502);}
   const count=body?.response?.player_count;
   if(!response.ok||body?.response?.result!==1||!Number.isSafeInteger(count)||count<0)throw new AppError('Player count is temporarily unavailable.',502);
   const value={appId:id,count,fetchedAt:now(),source:'Steam',cacheSeconds:PLAYER_TTL/1000};
   if(cache.size>=500)cache.delete(cache.keys().next().value);
   cache.set(id,value);return value;
  })();
  pending.set(id,job);
  try{return await job;}finally{pending.delete(id);}
 };
}
