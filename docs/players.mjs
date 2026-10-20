export const PLAYER_TTL=15*60*1000;
const memory=new Map(),inflight=new Map();
function valid(value){return value&&Number.isSafeInteger(value.count)&&value.count>=0&&Number.isFinite(value.fetchedAt);}
export function cachedPlayers(id){
 if(memory.has(id))return memory.get(id);
 try{const value=JSON.parse(localStorage.getItem(`checkpoint:players:${id}`));if(valid(value)&&value.appId===id){memory.set(id,value);return value;}}catch{}
 return null;
}
export function loadPlayers(id,request){
 const saved=cachedPlayers(id);
 if(saved&&saved.fetchedAt+PLAYER_TTL>Date.now())return Promise.resolve(saved);
 if(inflight.has(id))return inflight.get(id);
 const job=request('players',{appid:id}).then(value=>{
  if(!valid(value)||value.appId!==id)throw new Error('Player count unavailable.');
  memory.set(id,value);try{localStorage.setItem(`checkpoint:players:${id}`,JSON.stringify(value));}catch{}
  return value;
 }).finally(()=>inflight.delete(id));
 inflight.set(id,job);return job;
}
