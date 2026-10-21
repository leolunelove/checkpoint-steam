import {AppError} from './steam.mjs';
export const TIME_TTL=7*24*60*60*1000;
export function createCompletionTimes({fetcher=fetch,now=Date.now}={}){
 const cache=new Map(),pending=new Map();
 return async input=>{
  const parts=String(input||'').split(',');
  if(parts.length>50||parts.some(id=>! /^[1-9]\d{0,9}$/.test(id)||Number(id)>4294967295))throw new AppError('Enter 1–50 valid game IDs.');
  const ids=[...new Set(parts.map(Number))],missing=ids.filter(id=>!cache.has(id)||cache.get(id).fetchedAt+TIME_TTL<=now());
  if(missing.length){
   const key=[...missing].sort((a,b)=>a-b).join(',');
   if(!pending.has(key)){
    const job=(async()=>{
     const url=new URL('https://steamhunters.com/api/apps');for(const id of missing)url.searchParams.append('appIds',id);
     let response,body;try{response=await fetcher(url,{signal:AbortSignal.timeout(12000),redirect:'error'});body=await response.json();}catch{throw new AppError('Community completion times are temporarily unavailable.',502);}
     if(!response.ok||!Array.isArray(body)||body.length>50||body.some(a=>!missing.includes(a.appId)))throw new AppError('Community completion times are temporarily unavailable.',502);
     for(const id of missing){
      const a=body.find(a=>a.appId===id),integer=v=>Number.isSafeInteger(v)&&v>=0;
      const value={appId:id,achievementCount:integer(a?.achievementCount)?a.achievementCount:null,medianMinutes:integer(a?.medianCompletionTime)&&a.medianCompletionTime>0?a.medianCompletionTime:null,completions:integer(a?.playersCompletedCount)?a.playersCompletedCount:0,fetchedAt:now()};
      if(cache.size>=2000)cache.delete(cache.keys().next().value);cache.set(id,value);
     }
    })();pending.set(key,job);job.finally(()=>pending.delete(key)).catch(()=>{});
   }
   await pending.get(key);
  }
  return ids.map(id=>cache.get(id));
 };
}
