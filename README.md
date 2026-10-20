# Deployment status

App: https://steam.leolune.fun

GitHub Pages serves `docs/`. It connects to the separately deployed `checkpoint-steam-api` Supabase Edge Function for real profiles. The backend reads CHECKPOINT_STEAM_API_KEY only from encrypted server-side secrets. The secret is configured in encrypted backend storage. Live loading was verified with the user-provided leolune profile, including library data and achievement unlocks. The labelled demo remains an optional fallback, never a substitute for unavailable Steam data. Never put a Steam API key in `docs/`, chat, GitHub, or a browser build variable.

Backend: shared-memo project, function `checkpoint-steam-api`, JWT verification enabled. The public browser gateway credential in `docs/connection.js` is a Supabase anon credential, not a Steam key or service-role key. The function never uses the database. Browser CORS is restricted to the app origin and local development origin; upstream Steam URLs are fixed and profile/app IDs are validated. Function rate/concurrency limits and cache are isolate-local, not a distributed quota guarantee.

# Checkpoint

A focused Steam achievement companion with a dark, iOS-inspired interface and a desktop layout of its own. Search your games, see your overall progress, inspect achievements, and save a small **Finish next** list.

## Run it

Requires **Node.js 22 or later**. There are no packages to install and no build step.

```sh
cd checkpoint
npm start
```

Open **http://127.0.0.1:8787**. `node --env-file-if-exists=.env server.mjs` does the same thing if npm is unavailable. `npm run dev` restarts the server when server files change; refresh the browser after frontend edits.

On this Mac, the included `Launch Checkpoint.command` also starts the app, using an installed Node or the bundled Codex runtime. Keep its terminal window open while using Checkpoint.

The app opens in **Demo profile** mode. This is a working demonstration with fictional playtime, progress, dates, rarity, and curated sample achievement lists. Those lists are not the complete achievement lists for the games. The demo is never presented as a connected Steam account.

## Connect real Steam data

1. Obtain a personal **Steam Web API key** at [Steam’s API key page](https://steamcommunity.com/dev/apikey). Steam controls eligibility and may ask you to sign in and register a domain. Use your actual domain if hosting the app. Do not use a Steamworks publisher key.
2. Copy `.env.example` to `.env` in this project folder.
3. Set `STEAM_API_KEY=your_key_here` in `.env`. This file is ignored by Git. Never put a key inside `public/`, paste it into the app, or use a browser-exposed build variable.
4. Restart the server.
5. In Steam → Edit Profile → Privacy Settings, set **My profile** and **Game details** to **Public**. Steam can still restrict some game data.
6. Choose **Connect Steam** in Checkpoint and enter a Steam profile URL, vanity name, or 17-digit SteamID64.

This is a public-profile lookup, not Steam sign-in. It does not verify that you own the profile. It reads data and never unlocks achievements or changes your Steam account. No Steam password is requested.

### What gets fetched

All upstream requests originate on the server at `api.steampowered.com`:

- [GetPlayerSummaries and ResolveVanityURL](https://partner.steamgames.com/doc/webapi/ISteamUser): public identity and profile resolution.
- [GetOwnedGames](https://partner.steamgames.com/doc/webapi/IPlayerService): visible owned games and playtime.
- [GetSchemaForGame, GetPlayerAchievements, and GetGlobalAchievementPercentagesForApp](https://partner.steamgames.com/doc/webapi/ISteamUserStats): achievement definitions, unlocks, timestamps, and global rarity.

The complete visible library loads first. Two background workers check achievements so a large library does not block the UI. Stats show how many games have been checked. Failed checks are labelled **unavailable** and can be retried. Games with no achievement definitions are labelled separately. Neither category is counted as zero completion. Hidden locked achievements stay hidden until you choose **Reveal spoiler**.

Overall completion is total unlocked achievements divided by total achievements in games with available progress, not an average of per-game percentages. Counts include only checked games with achievement data. Refresh can reuse server-cached data for up to five minutes; schemas and global rarity are cached for one hour. Restarting the server clears the in-memory cache.

## Local data and privacy

Only your last connected public SteamID64 and shortlist IDs are stored in browser localStorage. Shortlists are separate for each profile and the demo. They survive reloads on the same browser and origin; they do not sync across devices. **Disconnect & explore the demo** removes the last connected profile reference, while preserving its shortlist for a later reconnection. Clearing site data removes all local preferences.

Fetched Steam data stays in a bounded, temporary server memory cache. The server never writes the API key or Steam responses to application logs. The app serves only `public/`; source, tests and `.env` are not web-accessible. Browser scripts and API requests are restricted to the same origin. Profile URLs are parsed as identifiers, never fetched as arbitrary URLs. Requests have timeouts, concurrency limits, and a per-IP rate limit. The profile ID is sent as a query parameter to this app; configure any hosting proxy to avoid logging query strings if desired.

Steam artwork is loaded from Valve’s CDN. Google Fonts is optional; system fonts are the fallback. Internet access is needed for those external assets and real Steam syncing. This is not an offline PWA.

## Hosting

This project is a small Node server, so it needs a host that runs Node; a static-only host cannot provide the Steam integration. Run `npm start` with the environment variables configured as server secrets. Set `HOST=0.0.0.0` only when intentionally exposing it through your hosting environment, use HTTPS, and respect Steam’s API terms and rate limits.

For a personal hosted instance, set `STEAM_ALLOWED_ID` to your 17-digit SteamID64. This restricts profile lookup and reduces use of your key’s quota by other visitors. This minimal app does not include authentication, shared cloud storage, OpenID login, or a multi-user account system. Before a broad public launch, add authentication and infrastructure-level throttling; the included rate limiter is per process and sees the reverse proxy’s IP unless deployed directly.

The hosted Edge Function is configured separately, as described at the top of this guide. The local Node edition continues to use its own .env configuration.

## Tests and validation

```sh
npm test
```

The dependency-free Node tests cover profile parsing, rejected URLs, key handling, Steam response normalization, caching, private and empty libraries, unavailable achievement data, games with no achievements, ownership restrictions, and the HTTP/static-file boundary. Upstream responses in these tests are fixtures, not live Steam calls.

Browser QA is documented in `QA.md`. Live Steam integration still requires your API key and a public profile, and is not claimed as verified against a real account.

## Project layout

- `server.mjs` — static serving and API boundary.
- `lib/steam.mjs` — Steam API adapter, validation, and caching.
- `public/` — client interface, styles, and explicitly labelled sample data.
- `test/` — server and integration boundary tests using Steam fixtures.
- `.env.example` — server configuration template.

Game names and artwork belong to their respective owners. Checkpoint is an independent prototype and is not affiliated with Valve or Steam.

## Saved Steam data

The published frontend saves the last connected public profile, full game library, stats and achievement details in IndexedDB on this browser. Returning visits restore that snapshot without any Steam API requests or automatic scans. The saved timestamp is shown. One initial scan is needed after this update because older versions did not retain achievement data. Partial scans are saved as they arrive.

Refresh Steam is manual, with a persisted 15-minute cooldown. It fetches library metadata, reuses unchanged game details, and checks new games, changed playtime/last-played entries, failed/incomplete checks, or game data older than seven days. Saved stats remain visible during updates and on temporary Steam errors. Requests use two paced workers; no periodic refresh loop runs. Changes Steam makes without updating playtime/last-played metadata can take up to the seven-day recheck on a manual refresh to appear. Disconnect clears the cached profile; clearing browser data also removes it. Data is per browser/device, not synced to a database.

## Achievement availability

Check availability compares the cached library with a small sourced catalog. The first release covers two games: Mad Max’s conditional Scrap Crew blocker and Team Fortress 2’s reported YouTube Replay issue. Each entry includes its evidence, caveat and review date. Coverage is shown explicitly; other games are unreviewed, never certified obtainable. The check makes no Steam API requests, does not alter completion totals, and does not infer impossibility from rarity or errors. Existing unlocked achievements are distinguished from locked issues. Each game detail also links to SteamHunters for further manual research. This is a limited known-issues checker, not a comprehensive automatically maintained global database.

## Current players

Opening a real game detail requests the concurrent online player count from Valve’s GetNumberOfCurrentPlayers endpoint through the secure edge function. Counts are cached for 15 minutes in this browser; there is no polling or library-wide player scan. The edge function also uses a best-effort per-instance cache and request coalescing; separate edge instances or cold starts can fetch a newer count. The checked time is displayed. Unavailable counts are not converted to zero. The detail view links to the game’s SteamCharts page for historical trends. These are Steam player counts, not scraped SteamCharts data, and they exclude users disconnected from Steam.

## Interface polish

The published frontend uses system typography, grouped game information, readable player counts, quieter cache status, accessible disclosures for detailed availability evidence, and bottom-aligned mobile sheets. Sheets support animated button/backdrop/Escape dismissal and respect reduced motion. Mobile search fields use 16px text to avoid focus zoom, key actions have 44px targets, and Refresh remains visible at narrow widths. This visual pass does not invalidate saved Steam data or change request/cooldown behavior.

Cache snapshots now use a versioned record isolated from legacy tabs and merge game results atomically by their checked time. Older partial snapshots cannot discard completed checks, and newer library metadata still controls additions/removals. Existing cached data migrates locally without a Steam request.

### Library-wide availability

Availability checks use the public SteamHunters achievement classifications (0 obtainable, 1 broken but obtainable, 2 conditional, 3 unobtainable). `docs/availability-data.mjs` is a dated, public app-only snapshot; it contains no profile, ownership, progress, or credentials. These are community classifications, not Valve guarantees. Detailed conditions and discussions are linked per game. Existing Mad Max and TF2 sourced notes remain as additional context.

The browser matches source flags by Steam achievement API name against the saved profile, retains historical unlocks, and never changes Steam totals. Missing data, unknown classifications, count mismatches, and unavailable progress remain unknown. A source with no flags does not prove attainability.

The separate `availability` Edge Function endpoint accepts one validated app ID and calls only the fixed SteamHunters endpoint, with no Steam key or profile sent upstream. Results are cached 24 hours in the browser and in each warm Edge Function instance (the latter is not durable or shared). Opening the report makes no API calls. A manual check fetches only missing/stale source entries, one paced worker, stops after three consecutive failures, and can be paused. There is no polling, automatic Steam scan, or forced source refresh within the TTL.

Finish next recommendations use saved availability data without making network requests. Games with locked unobtainable/reported-broken or conditional flags, missing coverage, mismatched source data, or unavailable progress are excluded. Historic unlocks are allowed; broken-but-obtainable achievements are allowed with a workaround note. Explicitly saved pins remain on the user's shortlist.
