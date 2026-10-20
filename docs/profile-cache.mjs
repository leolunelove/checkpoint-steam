// Full achievement lists belong in IndexedDB, not the small localStorage quota.
export const REFRESH_COOLDOWN = 15 * 60 * 1000;
export const GAME_MAX_AGE = 7 * 24 * 60 * 60 * 1000;
export function profileIdentity(input) {
 const text = String(input || '').trim();
 const match = text.match(/^https?:\/\/steamcommunity\.com\/(?:id|profiles)\/([\w-]+)\/?$/i);
 return (match ? match[1] : text).toLowerCase();
}
export function matchesProfile(snapshot, input) {
 const identity = profileIdentity(input);
 return snapshot?.mode === 'live' && Array.isArray(snapshot.games) &&
  [snapshot.profile?.id, ...(snapshot.aliases || [])].some(value => profileIdentity(value) === identity);
}
export function mergeLibrary(next, previous, now = Date.now()) {
 if (previous?.profile?.id !== next.profile.id) return next;
 const old = new Map(previous.games.map(game => [game.id, game]));
 return {...next, games: next.games.map(game => {
  const saved = old.get(game.id);
  if (!saved || !['ready','none'].includes(saved.status)) return game;
  const changed = saved.minutes !== game.minutes || saved.lastPlayed !== game.lastPlayed;
  const expired = !saved.checkedAt || now - saved.checkedAt > GAME_MAX_AGE;
  return {...saved, ...game, status: saved.status, needsRefresh: changed || expired, refreshError: undefined};
 })};
}
let database;
function openDatabase() {
 if (!database) database = new Promise((resolve, reject) => {
  const request = indexedDB.open('checkpoint-steam-cache', 1);
  request.onupgradeneeded = () => request.result.createObjectStore('profiles');
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
 });
 return database;
}
// A separate key isolates modern snapshots from older, still-open app versions.
const CURRENT_KEY='last-v2';
export function mergeSnapshots(incoming,stored){
 if(!stored||incoming?.mode!=='live'||stored.profile?.id!==incoming.profile?.id)return incoming;
 const base=(incoming.fetchedAt||0)>=(stored.fetchedAt||0)?incoming:stored;
 const other=base===incoming?stored:incoming;
 const alternate=new Map(other.games.map(game=>[game.id,game]));
 return {...base,refreshStartedAt:Math.max(incoming.refreshStartedAt||0,stored.refreshStartedAt||0),
  aliases:[...new Set([...(incoming.aliases||[]),...(stored.aliases||[])])],
  games:base.games.map(game=>{
   const saved=alternate.get(game.id);
   if(!saved)return game;
   const savedTime=saved.checkedAt||0,currentTime=game.checkedAt||0;
   const savedReady=['ready','none'].includes(saved.status),currentReady=['ready','none'].includes(game.status);
   if(savedTime<currentTime||(savedTime===currentTime&&(!savedReady||currentReady)))return game;
   return {...saved,id:game.id,name:game.name,minutes:game.minutes,lastPlayed:game.lastPlayed};
  })};
}
export async function readProfile(){
 try{
  const db=await openDatabase();
  const record=await new Promise((resolve,reject)=>{
   const store=db.transaction('profiles').objectStore('profiles');
   const current=store.get(CURRENT_KEY);
   current.onsuccess=()=>{
    if(current.result?.version===2){resolve({data:current.result.data});return;}
    const legacy=store.get('last');
    legacy.onsuccess=()=>resolve({data:legacy.result?.version===1?legacy.result.data:null,legacy:true});
    legacy.onerror=()=>reject(legacy.error);
   };
   current.onerror=()=>reject(current.error);
  });
  if(record.legacy&&record.data)await saveProfile(record.data);
  return record.data||null;
 }catch{return null;}
}
export async function saveProfile(data){
 try{
  const snapshot=structuredClone(data),db=await openDatabase();
  await new Promise((resolve,reject)=>{
   const transaction=db.transaction('profiles','readwrite'),store=transaction.objectStore('profiles');
   const read=store.get(CURRENT_KEY);
   read.onsuccess=()=>store.put({version:2,data:mergeSnapshots(snapshot,read.result?.version===2?read.result.data:null)},CURRENT_KEY);
   transaction.oncomplete=resolve;
   transaction.onerror=()=>reject(transaction.error);
   transaction.onabort=()=>reject(transaction.error);
  });return true;
 }catch{return false;}
}
export async function forgetProfile(){
 try{
  const db=await openDatabase();
  await new Promise((resolve,reject)=>{
   const transaction=db.transaction('profiles','readwrite'),store=transaction.objectStore('profiles');
   store.delete('last');store.put({version:2,data:null},CURRENT_KEY);
   transaction.oncomplete=resolve;transaction.onerror=()=>reject(transaction.error);
  });
 }catch{}
}
