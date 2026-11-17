# Verification

Run lint, tests, production build, and TypeScript checks before publishing. Tests cover the vault, premiere time zones/DST, release gates, exact Instagram Reel links, free participation, memory game rules, game controls, local crew draft persistence, and share fallback/cancellation.

Interaction tests use jsdom and Testing Library. They exercise React controls but do not replace mobile Safari/Chrome testing. Playwright adds real Chromium browser checks at phone (375px), tablet (768px), and desktop (1440px) sizes. Screenshots are saved for review. Physical-device Safari testing remains separate.

## Automated browser suite

Run `BASE_URL=https://your-preview.vercel.app npm run test:browser`. This checks responsive overflow, loaded artwork, all five routes, native dialog Escape/focus return, Room 17 completion and saved progress, and quick-drill access. Episode checks adapt to the configured release state. Once released, they verify exact Reel links, saved choice persistence, the vault's wrong-attempt suspicion increase, correct-code unlock, and local completion persistence. Browser checks use isolated storage and never post Instagram comments or likes. The suite captures HQ, the active case, and the final report at every configured width.

## Release review

1. Inspect all five pages at 375px, 768px, and 1440px, at 200% zoom, and with reduced motion. Verify no horizontal overflow.
2. In standby, check that choices, dossier clues, and the episode keypad stay sealed. Verify Instagram follow and separate YouTube links.
3. In a released test build, every Watch/Like/Comment action must open the exact Reel. Selecting an option saves a draft choice, not a submitted vote. The visitor posts the comment on Instagram.
4. Play Room 17: a quiet service exit should yield GHOST; the phone raises alert, the lobby yields EXPOSED, and move/attempt limits cause LOCKDOWN. Confirm the run/report survives reload and does not change episode suspicion. Dead Drop must count one move per pair, reject duplicate/third-card flips, hide misses, finish after all pairs, and restore personal records after reload.
5. Signal Intercept must reject early taps, measure after the signal, support keyboard activation, and save only better results.
6. Save a handle/theory and reload. Check the local pin/draft survives, with no product prices or paid controls and no claim of public submission.
7. Check native sharing, cancel, clipboard success/denial, and selectable-link fallback.
8. Check keyboard navigation, labels, status announcements, dialog Escape/focus return, and missing-image fallbacks.

Public HTTP checks verify accessible pages and expected free/standby content. Local records are not a public community database.
