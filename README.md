# Deployment status

App: https://steam.leolune.fun

GitHub Pages serves `docs/`. It connects to the separately deployed `checkpoint-steam-api` Supabase Edge Function for real profiles. The backend reads CHECKPOINT_STEAM_API_KEY only from encrypted server-side secrets. The secret is configured in encrypted backend storage. Live loading was verified with the user-provided leolune profile, including library data and achievement unlocks. The labelled demo remains an optional fallback, never a substitute for unavailable Steam data. Never put a Steam API key in `docs/`, chat, GitHub, or a browser build variable.

Backend: shared-memo project, function `checkpoint-steam-api`, JWT verification enabled. The public browser gateway credential in `docs/connection.js` is a Supabase anon credential, not a Steam key or service-role key. The function never uses the database. Browser CORS is restricted to the app origin and local development origin; upstream Steam URLs are fixed and profile/app IDs are validated. Function rate/concurrency limits and cache are isolate-local, not a distributed quota guarantee.

# SteamAchieve

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

Finish next recommendations use saved availability data without making network requests. Games with locked unobtainable/reported-broken or conditional flags, missing coverage, mismatched source data, or unavailable progress are excluded. Historic unlocks are allowed; locked broken-but-obtainable achievements are excluded too. Explicitly saved pins remain on the user's shortlist.

Finish next shows the full eligible in-progress library in a responsive grid, sorted by exact achievement completion ratio descending; manual pins have a separate labelled section. Library focus stays compact.

Finish next cards show achievements left. Its local sort preference switches between closest completion and fewest remaining (ties use completion percentage), without refreshing Steam.

Remaining-achievement rarity uses cached Steam global percentages, excluding already unlocked achievements. Cards show the average and rarest outstanding rate and partial-data coverage. Most common remaining sorting uses the rarest outstanding rate first, with incomplete data last. Unlock rates are a heuristic, not a difficulty or time estimate.

Easiest to finish is a relative heuristic: sum `100 / max(global unlock percentage, 0.1)` across locked achievements, lower first. It combines count and inverse prevalence, penalizes rare bottlenecks and keeps genuine zero percentages finite. Fully known rate data ranks before partial/unknown data. Ties use remaining count, exact completion, then app ID. This is not expected attempts, playtime, or a guarantee of difficulty. Eligibility rules are unchanged.

### Community 100% completion-time references

SteamHunters' `medianCompletionTime` (minutes) is a full-completion reference, not a personal remaining-time forecast. Original completion playtime can depend on profile synchronization, idling and content; subtracting current playtime or multiplying by achievement percentage would invent precision, so the app does neither. See the source creator's explanation: https://www.patreon.com/steamhunters/posts/completion-time-45979569.

Cards and game details show approximate full-completion time and source attribution. Shortest 100% time sorts positive medians ascending, with missing/mismatched data and games with fewer than five recorded completions last. Low-data values are labelled. Zero or missing medians never mean zero hours.

`completion-times-data.mjs` holds public, app-only metadata (505 source lookups; 351 positive medians at publication), without profile/ownership/unlock information. Browser references last seven days. Manual Update time references uses a fixed-host Edge Function `times` endpoint with validated batches of at most 50 app IDs, no Steam key/profile upstream, paced browser requests, and warm-instance caching. Opening/sorting makes no API requests. New profiles with uncatalogued games see explicit unavailable references until manually updated. Warm Edge caches are not durable/shared storage.

Easiest to finish now multiplies its count/rarity effort sum by `sqrt(community median minutes / 60)`. The square root gives shorter full-completion times a moderate influence without replacing rare-achievement penalties. A combined score requires complete remaining rarity data plus matching time metadata with at least five recorded completions. Uncertain games sort after fully scored games, falling back to count/rarity ordering within that group. No personal remaining hours are inferred.

Finish next defaults to Easiest to finish when no valid local preference exists. Explicit user choices remain saved. Recommendation/source details are in About recommendations. Interface uses system fonts with no remote font dependency; narrow Finish next layouts use grouped rows.


### Not now (23 October 2026)
Finish next cards include Not now. Hidden games stay in the library and keep their progress and pins. Open Not now (N) to restore individually or all together. Choices persist per Steam profile in this browser only. No Steam scan is needed. All five recommendation sorts respect hidden games. 72 automated tests pass; browser hide/reload/restore and mobile layouts checked.


SteamAchieve rebrand and Undo: updated wordmark, mobile SA mark, favicon and page titles. Not now offers an 8-second Undo toast, paused while hovered or keyboard focused. Undo restores only the last hidden game for the same active profile; existing pins, hidden list, progress and cache keys are preserved. Desktop/mobile hide -> Undo -> reload verified; 72 tests pass.

SteamAchieve trophy/check icon: SVG mark and logo, opaque 180/192/512/1024 PNGs, Apple touch icon and web manifest. Desktop and 320/390px layouts checked; physical Home Screen installation not tested.

Cloud search: type Boosteroid, GeForce NOW, GFN or NVIDIA in Library search; combine with a title. Multiple services match either. Boosteroid matches Steam app IDs and excludes maintenance; GFN requires one exact normalized title in its Steam variants, preserves editions, uses US catalogue, and shows tier/install labels. Provider snapshots checked 23 October 2026; they are not live guarantees. Lazy-loaded only for service searches, no profile or Steam requests. Refresh with python3 scripts/refresh-cloud-catalog.py from project root. 76 tests pass. Physical Home Screen installation not tested.

24 October 2026: Finish next Play on selector filters Saved and Recommended by All games, Boosteroid or GeForce NOW, preserving ranking and Not now exclusions. Cloud service choice persists in this browser; invalid saved values use All games. Uses existing lazy-loaded 23 October catalogue without Steam or provider requests. Distinct loading/error/empty states; empty results offer Show all games. 77 automated tests pass, desktop and mobile 320px verified with no overflow.

24 October: Persisted Finish next service in checkpoint:finish-service; saved choices lazy-load the cloud catalogue on opening Finish next. Show all games persists the reset. Play on/Sort by share aligned controls; Saved and Recommended share desktop grids and mobile rows. Browser reload and reset tested, 320px no overflow, 78 tests pass.

24 October: Library Play on dropdown shares the existing saved cloud-service preference with Finish next. Selection syncs between screens and open tabs in the same browser. Existing title searches narrow the selected service; typed service names update the choice, and dropdown changes remove service tokens while retaining title terms. Continue playing also follows the service choice. Cached catalogues only, no Steam rescan. 79 tests pass; local two-way, cross-tab and 320px layout verified.

24 October: Cloud badges appear in Library and Finish next regardless of selected service. Both confirmed services are shown, with Install labels where applicable, and catalogue detail tooltips. Uses existing saved snapshot, loaded once on opening either screen; does not call Steam/provider APIs. Shared Play on filters remain available. 78 tests pass; HTTP test and local preview blocked by listen EPERM in this session.

28 October: Minimal Resources section for exact saved-game IDs 1817070 (Spider-Man Remastered), 550 (Left 4 Dead 2), 924970 (Back 4 Blood). Five curated HTTPS links: Wand Manhattan map, Steam achievement guides and FortHope deck builder. Two/one/two links respectively; cap three, no empty section or guessed edition links. Generic Community guides button retained only for uncurated games. External links use noopener/noreferrer, no embeds or profile sharing. Source URLs verified via browser/search; FortHope and Wand loaded successfully. Local 320px section no overflow. 81 tests pass.


28 October: Expanded Resources to 31 more owned game editions (34 total). Interactive maps for Fallout 3 GOTY, New Vegas, Fallout 4 and Fallout 76; Fallout 4/76 build planners; maps for Skyrim, Witcher 3, RDR2, Hogwarts Legacy, Subnautica, Hollow Knight, Dying Light, Far Cry, Assassin’s Creed and classic GTA. Stardew planning/checkup, TerraMap and No Man’s Sky reference tools. Usually one link, at most two new links per game. Exact Steam IDs; no guessed remake/PTS mappings. Save/world-file requirements labelled. Generic Community guides retained unless a curated guide exists. All 34 new URLs returned HTTP 200 with matching titles; Fallout 4 interactive map controls checked in browser. Fallout Shelter candidate omitted after access/rate-limit issues. No Steam scan or backend change. 82 tests pass.

28 October: Small neutral Map badge with folded-map icon on Library and Finish next cards when exact app ID has a curated Map resource. Shares wrapping badge row with cloud services and works before cloud catalogue loads. Guide/companion-only games do not get a map badge. No new requests or Steam scan.
