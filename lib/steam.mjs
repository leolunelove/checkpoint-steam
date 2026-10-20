export class AppError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}
export function parseProfile(input) {
  const value = String(input || '').trim();
  if (/^7656119\d{10}$/.test(value)) return { id: value };
  if (/^https?:\/\//i.test(value)) {
    let url; try { url = new URL(value); } catch { throw new AppError('Enter a valid Steam profile URL.'); }
    if (url.hostname !== 'steamcommunity.com' || url.username || url.password || url.port) throw new AppError('Use a steamcommunity.com profile URL.');
    const match = url.pathname.match(/^\/(id|profiles)\/([a-zA-Z0-9_-]{1,64})\/?$/);
    if (!match) throw new AppError('Use a /id/name or /profiles/SteamID64 profile URL.');
    if (match[1] === 'profiles') {
      if (!/^7656119\d{10}$/.test(match[2])) throw new AppError('That SteamID64 is not valid.');
      return { id: match[2] };
    }
    return { vanity: match[2] };
  }
  if (/^[a-zA-Z0-9_-]{1,64}$/.test(value) && !/^\d+$/.test(value)) return { vanity: value };
  throw new AppError('Enter your Steam profile URL, custom name, or 17-digit SteamID64.');
}
export function summarize(achievements) {
  const total = achievements.length, unlocked = achievements.filter(a => a.unlocked).length;
  return { total, unlocked, percent: total ? Math.round(unlocked / total * 100) : 0 };
}
export function createSteam({ key, allowedId = '', fetcher = fetch, now = Date.now } = {}) {
  const cache = new Map(), pending = new Map();
  async function api(path, params, ttl = 300000) {
    const cacheKey = path + JSON.stringify(params);
    const hit = cache.get(cacheKey);
    if (hit && hit.until > now()) return hit.data;
    if (pending.has(cacheKey)) return pending.get(cacheKey);
    const job = (async () => {
      const url = new URL(`https://api.steampowered.com/${path}/`);
      url.search = new URLSearchParams({ key, ...params });
      let response;
      try { response = await fetcher(url, { signal: AbortSignal.timeout(15000), redirect: 'error' }); }
      catch { throw new AppError('Steam could not be reached. Please try again shortly.', 502); }
      if (!response.ok) throw new AppError(response.status === 403 ? 'Steam rejected the request. Check the server API key and profile privacy.' : 'Steam is temporarily unavailable. Please try again shortly.', 502);
      let data; try { data = await response.json(); } catch { throw new AppError('Steam returned an unreadable response.', 502); }
      if (cache.size >= 1000) cache.delete(cache.keys().next().value);
      cache.set(cacheKey, { data, until: now() + ttl });
      return data;
    })();
    pending.set(cacheKey, job);
    try { return await job; } finally { pending.delete(cacheKey); }
  }
  async function resolve(input) {
    if (!key) throw new AppError('Steam is not configured yet. Add STEAM_API_KEY to the server .env file, then restart. You can explore the demo in the meantime.', 503);
    const parsed = parseProfile(input);
    const id = parsed.id || (await api('ISteamUser/ResolveVanityURL/v1', { vanityurl: parsed.vanity })).response?.steamid;
    if (!id || !/^7656119\d{10}$/.test(id)) throw new AppError('We could not find that Steam profile. Check the URL and try again.', 404);
    if (allowedId && id !== allowedId) throw new AppError('This instance is restricted to its configured Steam profile.', 403);
    return id;
  }
  async function library(input) {
    const id = await resolve(input);
    const [summary, owned] = await Promise.all([
      api('ISteamUser/GetPlayerSummaries/v2', { steamids: id }),
      api('IPlayerService/GetOwnedGames/v1', { input_json: JSON.stringify({ steamid: id, include_appinfo: true, include_played_free_games: true }) })
    ]);
    const player = summary.response?.players?.[0];
    if (!player) throw new AppError('Steam profile not found.', 404);
    if (player.communityvisibilitystate !== 3) throw new AppError('This Steam profile is private. Set your profile and Game details to Public, then try again.', 403);
    if (!Array.isArray(owned.response?.games) && owned.response?.game_count !== 0) throw new AppError('Your game library is hidden. In Steam Privacy Settings, set Game details to Public.', 403);
    return { mode: 'live', profile: { id, name: player.personaname, avatar: player.avatarfull }, fetchedAt: now(), games: (owned.response.games || []).map(g => ({ id: g.appid, name: g.name || `App ${g.appid}`, minutes: g.playtime_forever || 0, lastPlayed: g.rtime_last_played || 0, status: 'pending' })).sort((a,b) => b.lastPlayed - a.lastPlayed || b.minutes - a.minutes) };
  }
  async function achievements(input, appid) {
    if (!/^\d{1,10}$/.test(String(appid)) || Number(appid) < 1) throw new AppError('Invalid game ID.');
    const id = await resolve(input);
    // Ownership validation also prevents this endpoint becoming an arbitrary Steam proxy.
    const owned = await library(id);
    if (!owned.games.some(g => g.id === Number(appid))) throw new AppError('This game is not in the visible library.', 404);
    const schema = await api('ISteamUserStats/GetSchemaForGame/v2', { appid, l: 'english' }, 3600000);
    if (!schema.game) throw new AppError('Steam did not return an achievement schema for this game. Try again later.', 502);
    const definitions = schema.game.availableGameStats?.achievements || [];
    // Games without achievements may reject GetPlayerAchievements. Check their schema first.
    if (!definitions.length) return { status: 'none', achievements: [], ...summarize([]) };
    const [progress, global] = await Promise.all([
      api('ISteamUserStats/GetPlayerAchievements/v1', { steamid: id, appid, l: 'english' }),
      api('ISteamUserStats/GetGlobalAchievementPercentagesForApp/v2', { gameid: appid }, 3600000).catch(() => null)
    ]);
    if (!progress.playerstats?.success || !Array.isArray(progress.playerstats.achievements)) throw new AppError('Achievement progress is unavailable for this game. Check Game details privacy or try again later.', 502);
    const states = new Map(progress.playerstats.achievements.map(a => [a.apiname, a]));
    const rates = new Map((global?.achievementpercentages?.achievements || []).map(a => [a.name, Number(a.percent)]));
    const list = definitions.map(a => ({ id: a.name, name: a.displayName || a.name, description: a.description || '', hidden: Boolean(a.hidden), icon: a.icon, iconGray: a.icongray, unlocked: states.get(a.name)?.achieved === 1, unlockedAt: states.get(a.name)?.unlocktime || 0, rarity: rates.has(a.name) ? rates.get(a.name) : null }));
    return { status: 'ready', achievements: list, ...summarize(list) };
  }
  return { library, achievements };
}
