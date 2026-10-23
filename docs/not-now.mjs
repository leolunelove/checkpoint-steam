export const notNowKey=profile=>`checkpoint:not-now:v1:${encodeURIComponent(String(profile))}`;
export function normalizeNotNow(value){return Array.isArray(value)?[...new Set(value.filter(id=>Number.isSafeInteger(id)&&id>0&&id<=4294967295))].slice(0,5000):[];}
export function changeNotNow(value,id,hide){const ids=normalizeNotNow(value);if(!Number.isSafeInteger(id)||id<=0||id>4294967295)return ids;return hide?normalizeNotNow([...ids,id]):ids.filter(item=>item!==id);}
export function readNotNow(store,profile){try{return normalizeNotNow(JSON.parse(store.getItem(notNowKey(profile))));}catch{return [];}}
export function writeNotNow(store,profile,value){try{store.setItem(notNowKey(profile),JSON.stringify(normalizeNotNow(value)));return true;}catch{return false;}}
