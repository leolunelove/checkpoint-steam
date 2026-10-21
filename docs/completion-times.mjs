import {timeSeed} from './completion-times-data.mjs?v=1';
export const TIME_TTL=7*24*60*60*1000;
export function validTime(value){return value&&Number.isSafeInteger(value.appId)&&Number.isFinite(value.fetchedAt)&&(value.achievementCount===null||Number.isSafeInteger(value.achievementCount)&&value.achievementCount>=0)&&(value.medianMinutes===null||Number.isSafeInteger(value.medianMinutes)&&value.medianMinutes>0)&&Number.isSafeInteger(value.completions)&&value.completions>=0;}
const memory=new Map(timeSeed.filter(validTime).map(v=>[v.appId,v])),hydrated=new Set();
export function cachedTime(id){
 let value=memory.get(id)||null;if(hydrated.has(id))return value;hydrated.add(id);
 try{const saved=JSON.parse(localStorage.getItem(`checkpoint:times:v1:${id}`));if(validTime(saved)&&saved.appId===id&&(!value||saved.fetchedAt>value.fetchedAt)){value=saved;memory.set(id,value);}}catch{}
 return value;
}
export function timeReference(game){const value=cachedTime(game.id);return value&&value.achievementCount===game.total&&value.medianMinutes!==null?{...value,reliable:value.completions>=5}:null;}
export function formatCompletionTime(minutes){if(!Number.isFinite(minutes)||minutes<=0)return '—';if(minutes<60)return `~${Math.round(minutes)}m`;const hours=minutes/60;return `~${hours<10?Number(hours.toFixed(1)):Math.round(hours)}h`;}
export const freshTime=value=>Boolean(value&&value.fetchedAt+TIME_TTL>Date.now());
let pending=null;
export function loadTimes(ids,request){
 if(pending)return pending;
 const missing=[...new Set(ids)].filter(id=>!freshTime(cachedTime(id)));
 const job=(async()=>{
  for(let i=0;i<missing.length;i+=50){
   const batch=missing.slice(i,i+50),values=await request('times',{appids:batch.join(',')});
   if(!Array.isArray(values)||values.length!==batch.length||!values.every(v=>validTime(v)&&batch.includes(v.appId))||new Set(values.map(v=>v.appId)).size!==batch.length)throw new Error('Time references are unavailable.');
   for(const value of values){memory.set(value.appId,value);try{localStorage.setItem(`checkpoint:times:v1:${value.appId}`,JSON.stringify(value));}catch{}}
   if(i+50<missing.length)await new Promise(resolve=>setTimeout(resolve,750));
  }
 })();pending=job;return job.finally(()=>{pending=null;});
}
