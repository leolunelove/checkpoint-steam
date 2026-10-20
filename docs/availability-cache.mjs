import { seed } from './availability-data.mjs?v=1';
export const AVAILABILITY_TTL=24*60*60*1000;
const memory=new Map(seed.filter(value=>validAvailability(value,value.appId)).map(value=>[value.appId,value])),pending=new Map(),hydrated=new Set();
export function validAvailability(value,id){return value?.appId===id&&Number.isFinite(value.fetchedAt)&&Number.isSafeInteger(value.achievementCount)&&value.achievementCount>=0&&Array.isArray(value.flags)&&value.flags.every(a=>typeof a.apiName==='string'&&typeof a.name==='string'&&[1,2,3].includes(a.obtainability));}
export function cachedAvailability(id){
 let value=memory.get(id)||null;
 if(hydrated.has(id))return value;
 hydrated.add(id);
 try{const saved=JSON.parse(localStorage.getItem(`checkpoint:availability:v1:${id}`));if(validAvailability(saved,id)&&(!value||saved.fetchedAt>value.fetchedAt)){value=saved;memory.set(id,value);}}catch{}
 return value;
}
export const freshAvailability=(value,now=Date.now())=>Boolean(value&&value.fetchedAt+AVAILABILITY_TTL>now);
export function loadAvailability(id,request){
 const saved=cachedAvailability(id);
 if(freshAvailability(saved))return Promise.resolve(saved);
 if(pending.has(id))return pending.get(id);
 const job=request('availability',{appid:id}).then(value=>{
  if(!validAvailability(value,id))throw new Error('Availability data is unreadable.');
  memory.set(id,value);try{localStorage.setItem(`checkpoint:availability:v1:${id}`,JSON.stringify(value));}catch{}
  return value;
 }).finally(()=>pending.delete(id));pending.set(id,job);return job;
}
