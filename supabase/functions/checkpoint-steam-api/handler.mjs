import { createPlayerCounts } from './players.mjs';
import { createSteam, AppError } from './steam.mjs';
export function createHandler({ getKey, fetcher = fetch, now = Date.now } = {}) {
  let currentKey = '', adapter;
  const limits = new Map();
  const players = createPlayerCounts({fetcher,now});
  let active = 0;
  const origins = new Set(['https://steam.leolune.fun','http://127.0.0.1:8787']);
  return async request => {
    const origin = request.headers.get('origin');
    const allowed = !origin || origins.has(origin);
    const headers = {
      'Content-Type':'application/json; charset=utf-8',
      'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff',
      'Referrer-Policy':'no-referrer', 'Vary':'Origin',
      ...(origin && allowed ? {'Access-Control-Allow-Origin':origin} : {}),
      'Access-Control-Allow-Headers':'authorization, apikey, content-type',
      'Access-Control-Allow-Methods':'GET, OPTIONS',
      'Access-Control-Max-Age':'600'
    };
    const json = (status, body) => new Response(JSON.stringify(body),{status,headers});
    if (!allowed) return json(403,{error:'This origin is not allowed.'});
    if (request.method === 'OPTIONS') return new Response(null,{status:204,headers});
    if (request.method !== 'GET') return json(405,{error:'Method not allowed.'});
    const url = new URL(request.url);
    const endpoint = url.searchParams.get('endpoint') || 'config';
    if (!['config','library','achievements','players'].includes(endpoint)) return json(404,{error:'Endpoint not found.'});
    const key = getKey() || '';
    if (endpoint === 'config') return json(200,{configured:Boolean(key),restricted:false,service:'checkpoint-steam-api'});
    if (!key) return json(503,{error:'Steam connection is awaiting its server API key. The owner needs to add CHECKPOINT_STEAM_API_KEY to the backend’s secrets. Demo data has not been substituted.'});
    if (!/^[a-f0-9]{32}$/i.test(key)) return json(503,{error:'The server’s Steam API key is not valid. Please check the CHECKPOINT_STEAM_API_KEY secret.'});
    const ip = (request.headers.get('x-forwarded-for') || 'unknown').split(',')[0].trim().slice(0,128);
    const time = now();
    for (const [id,value] of limits) if (value.reset < time) limits.delete(id);
    let limit = limits.get(ip);
    if (!limit) {
      if (limits.size >= 2000) return json(429,{error:'The service is busy. Please try again shortly.'});
      limit = {count:0,reset:time+60000};limits.set(ip,limit);
    }
    if (++limit.count > 240 || active >= 6) return json(429,{error:'A little breather. Please retry in a minute.'});
    const profile = url.searchParams.get('profile');
    if (endpoint !== 'players' && (!profile || profile.length > 180)) return json(400,{error:'Enter a Steam profile URL, custom name, or SteamID64.'});
    if (!adapter || currentKey !== key) {adapter=createSteam({key,fetcher,now});currentKey=key;}
    active++;
    try {
      const data = endpoint === 'players' ? await players(url.searchParams.get('appid')) : endpoint === 'library' ? await adapter.library(profile) : await adapter.achievements(profile,url.searchParams.get('appid'));
      return json(200,data);
    } catch(error) {
      return json(error instanceof AppError ? error.status : 500,{error:error instanceof AppError ? error.message : 'Something went wrong. Please try again.'});
    } finally {active--;}
  };
}
