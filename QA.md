# Validation — 20 October 2026

## Passed

- 12 Node tests (`npm test`), including normalization of Steam fixtures and the HTTP/static-file boundary.
- Real browser visual review of desktop library, mobile library, overall stats, and achievement detail.
- Responsive checks at 320, 390, 768, 1024, and 1440 CSS pixels: no horizontal document overflow.
- Game search returns Portal 2 for “portal”. Completed filter returns the two completed demo games. Name sorting orders Firewatch before Portal 2.
- Pinning adds a game to Finish next; the extra pin survives a browser reload. Removing it restores the original shortlist.
- Achievement Remaining and Unlocked views match the sample counts.
- Connection dialog gives setup instructions when the server key is missing. Submitting a profile then returns a clear setup error and does not replace the demo with invented Steam data.
- Isolated browser test with a simulated Steam upstream: profile import, background achievement checking, 50% progress over one available game, explicit no-achievement and unavailable states, hidden achievement protection, spoiler reveal, and achievement search.
- No browser console warnings or errors were observed in the checked demo and isolated fixture flows.
- Desktop and mobile preview images saved alongside the project archive.

## Boundaries

A server-side Steam API key is configured. Live verification with the user-provided leolune profile returned @leo and 505 owned games. Super Meat Boy returned 3 unlocked achievements out of 48. The browser loaded the real profile and rendered the matching game detail.

Responsive browser viewports were checked; physical iPhone/iPad/Safari, assistive technology, large real libraries, and production load were not tested. Reduced-motion styles, semantic controls, keyboard focus outlines, native modal focus handling, and spoiler protection are implemented. They do not constitute a complete accessibility audit.

The original mockup image was not exposed by the referenced chat. The delivered design follows the requested dark iOS-inspired direction, with its own desktop layout, rather than claiming a pixel match.

This is a local Node project. GitHub Pages hosts the public frontend. The separate Supabase Edge Function has JWT verification enabled and a validated browser CORS boundary. Real-profile verification passed against the deployed backend. Production frontend assets were verified to match the source. External game artwork and optional fonts require an internet connection.


## Backend update

19 scoped Node tests pass, including CORS, missing or invalid server key handling, no secret disclosure, method/endpoint validation, and fixture library data through the edge handler. The deployed backend health and missing-key response have also been verified over HTTPS.

Complete live library scan: 505 games checked; 374 games with achievements; 2,387 unlocked out of 28,740; 7 perfect games. No failed achievement checks remained in the tested import. Unlocked Super Meat Boy achievements displayed matching Steam dates.

## Persistent cache update — 20 October 2026

24 scoped tests passed, covering cache identity isolation, unchanged game reuse, changed/stale game updates, removed/new games and no-achievement results.

Browser QA used a separate local fixture origin. Initial connect made exactly four API calls (config, library, two game details). Reload restored stats and full game details from IndexedDB; repeated Refresh clicks and opening saved details added zero API calls. The 15-minute cooldown message was verified.

Production source commit: bd5aae17a9c14dfff8880546611a2103475a8b27. Cache is per browser/device. New installs require one initial scan. There is no automatic refresh or polling on cached visits.

Production verification completed: all 505 games saved, 2,387 of 28,740 achievements, 7 perfect games, zero unavailable. After a full reload, these exact totals returned with the saved-data/no-automatic-refresh notice and no new scan. Screenshot: ../checkpoint-cached-stats.png.

## Availability checker — 20 October 2026

29 scoped tests passed. Five availability tests cover game-scoped matches, conditional versus reported status, unlocked achievements excluded from remaining counts, missing progress and unknown/rare/error results. A local browser fixture confirmed report counts, source links, details navigation, achievement-level warnings and the availability filter. Its API counter stayed at the original four calls after checking the report and opening details. Catalog coverage is explicitly limited to Mad Max and Team Fortress 2; no universal availability verdict is claimed. No cache invalidation or Steam rescan is required for this update.

Final real-profile verification matched the exact English Steam Replay names, including Local Cinema Star and Indie Film Sensation. A regression test covers all four names and separates two historical unlocks from remaining issues. All 30 scoped tests passed. Final source commit: 5db2cde83a906ac23001b50a6432a9b8f9312e53.

## Current players

36 scoped tests passed. Player tests cover the fixed, keyless Valve endpoint, real zero counts, response validation, invalid IDs, coalesced concurrent calls, 15-minute expiry, browser reuse, and the absence of profile/library calls on the players endpoint. JWT validation, CORS and the existing rate limit are retained.

Production verification: the final report shows 3 locked achievements to review across two games and two historical unlocks, with 503 games explicitly unreviewed. TF2 detail displayed a real Steam player count and SteamCharts trends link. Closing/reopening reused the same count and checked time immediately. No achievement/library scan restarted. Screenshots: ../checkpoint-availability.png and ../checkpoint-player-count.png.

## iOS-style polish — 20 October 2026

Desktop browser review covered grouped game rows, player count typography, warning disclosure/links, Escape dismissal, close-button dismissal, and preserving expanded warnings during pin/unpin updates. Responsive browser frames at 390px and 320px confirmed no horizontal page overflow, full-width bottom sheets, visible Refresh, and minimum 44px heights for the measured primary mobile controls. Inputs use 16px text; reduced-motion styles and dismissal bypass are included. These are responsive browser checks, not physical iPhone/Safari validation. Saved profile data and 15-minute refresh/player caches are preserved.

A live visual check exposed an older tab overwriting the legacy cache with an incomplete snapshot. The cache now migrates to a separate last-v2 record and atomically merges the newest per-game checks. Four regression tests cover partial writes, newer metadata, removed games and account separation. A browser fixture explicitly simulated both modern and legacy stale saves; all 2/2 completed game records remained intact.
