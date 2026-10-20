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
export async function readProfile() {
 try {
  const db = await openDatabase();
  return await new Promise((resolve, reject) => {
   const request = db.transaction('profiles').objectStore('profiles').get('last');
   request.onsuccess = () => resolve(request.result?.version === 1 ? request.result.data : null);
   request.onerror = () => reject(request.error);
  });
 } catch { return null; }
}
export async function saveProfile(data) {
 try {
  const db = await openDatabase();
  await new Promise((resolve, reject) => {
   const transaction = db.transaction('profiles', 'readwrite');
   transaction.objectStore('profiles').put({version:1, data}, 'last');
   transaction.oncomplete = resolve;
   transaction.onerror = () => reject(transaction.error);
   transaction.onabort = () => reject(transaction.error);
  });
  return true;
 } catch { return false; }
}
export async function forgetProfile() {
 try {
  const db = await openDatabase();
  await new Promise((resolve, reject) => {
   const transaction = db.transaction('profiles','readwrite');
   transaction.objectStore('profiles').delete('last');
   transaction.oncomplete = resolve;
   transaction.onerror = () => reject(transaction.error);
  });
 } catch {}
}
