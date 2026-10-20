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
