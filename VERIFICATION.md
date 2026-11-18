# Verification

Run lint, tests, production build, and TypeScript checks before publishing. Tests cover the vault, premiere time zones/DST, release gates, exact Instagram Reel links, free participation, memory game rules, game controls, local crew draft persistence, and share fallback/cancellation.

Interaction tests use jsdom and Testing Library. They exercise React controls but do not replace mobile Safari/Chrome testing. Playwright adds real Chromium browser checks at phone (375px), tablet (768px), and desktop (1440px) sizes. Screenshots are saved for review. Physical-device Safari testing remains separate.

## Automated browser suite

Run `BASE_URL=https://your-preview.vercel.app npm run test:browser`. This checks responsive overflow, loaded artwork, all six routes, native dialog Escape/focus return, Room 17 completion and saved progress, and quick-drill access. Episode checks adapt to the configured release state. Once released, they verify exact Reel links, saved choice persistence, the vault's wrong-attempt suspicion increase, correct-code unlock, and local completion persistence. Browser checks use isolated storage and never post Instagram comments or likes. The suite captures HQ, the active case, and the final report at every configured width.

## Release review

1. Inspect all six pages at 375px, 768px, and 1440px, at 200% zoom, and with reduced motion. Verify no horizontal overflow.
2. In standby, check that choices, dossier clues, and the episode keypad stay sealed. Verify Instagram follow and separate YouTube links. A release countdown requires a confirmed, future `nextReleaseAt`; absent or elapsed dates must not roll forward or release content.
3. In a released test build, every Watch/Like/Comment action must open the exact Reel. Selecting an option saves a draft choice, not a submitted vote. The visitor posts the comment on Instagram.
4. Play Room 17: a quiet service exit should yield GHOST; the phone raises alert, the lobby yields EXPOSED, and move/attempt limits cause LOCKDOWN. Confirm the run/report survives reload and does not change episode suspicion. Dead Drop must count one move per pair, reject duplicate/third-card flips, hide misses, finish after all pairs, and restore personal records after reload.
5. Signal Intercept must reject early taps, measure after the signal, support keyboard activation, and save only better results.
6. Save a handle/theory and reload. Check the local pin/draft survives, with no product prices or paid controls and no claim of public submission.
7. Check native sharing, cancel, clipboard success/denial, and selectable-link fallback.
8. Check keyboard navigation, labels, status announcements, dialog Escape/focus return, and missing-image fallbacks.

Public HTTP checks verify accessible pages and expected release content. Practice-game records and personal Corkboard drafts stay on the device. Daily-mission accounts and wallets use private shared storage.

## Crew Credits

Unit and service tests cover concurrent claim/redeem idempotency, server-issued challenge signatures and expiry, cross-account rejection, daily caps, memory proofs, five-attempt limits, Eastern daily/weekly boundaries and DST, password hashing, session revocation, credential recovery, follower approval matching, opt-in standings, account deletion and the 1080×1920 personalized PNG.

The account browser test runs once on the phone project to avoid filling the public service with QA accounts. It creates a private, unverified account; solves all three missions through the UI; replays a claim; confirms 50 saved credits after reload; checks pending-account redemption/ranking restrictions; recovers the account; and deletes the QA record. Responsive route checks visit all six pages at 375, 768 and 1440px. No Instagram likes, comments, follows, DMs or paid purchases are submitted by tests.

## Neon migration checks — 18 November 2026

The Postgres adapter passed 55 unit/service checks, lint, TypeScript and the
production build. Six real-Neon integration checks (including the parent test)
passed against the isolated preview resource: concurrent create/update races,
stale writes and deletes, delete/recreate revision safety, session/hash JSON
roundtrips, simultaneous replayed claims, pending-member restrictions,
idempotent approved redemption, recovery and deletion. QA namespaces were
removed after testing.

The first Neon preview passed 13 Chromium checks across phone, tablet and
desktop; two duplicate account-lifecycle cases were intentionally skipped.
The account test earned 50 credits, preserved them after reload, rejected a
replayed award and unverified redemption, recovered the account, and deleted
it. Preview Postgres had zero remaining QA accounts afterward. Legacy preview
Blob snapshots taken before and after the browser test had identical counts
and canonical checksums, confirming normal wallet traffic had moved to Neon.
Production dependencies report zero known vulnerabilities after a compatible
Zod 4 patch override within the retained Blob SDK's configuration dependency.
These are functional checks, not a concurrency-capacity guarantee or a
physical Safari test.

The final preview repeated the account and release-gate checks successfully.
The production cutover paused all three account POST endpoints on both public
aliases while story pages continued returning HTTP 200. Four source records,
including a private continuity-test account, were copied with identical
canonical SHA-256 checksums. A fresh source snapshot still matched the target
before the explicit backend switch. The legacy records remain private and
unchanged as a backup.

After cutover, the pre-migration account's existing cookie still authenticated
and its 15-credit balance survived. Password sign-in worked, then the QA
account was deleted. A new live account completed all daily missions, retained
50 credits after reload, rejected invalid redemption, recovered credentials
and was deleted. Both live phone checks passed, including Part 2 remaining
locked and the $5,000,000 HUD. Postgres had no remaining test accounts, while
the legacy Blob checksum was unchanged, confirming active traffic and deletion
used the new database. Both public aliases returned healthy Crew APIs and no
maintenance flag remains. The post-cutover default is also Postgres: missing
backend configuration cannot silently revive a legacy wallet.

## Private owner dashboard — 18 November 2026

The owner dashboard uses the existing website credentials and secure session
cookie, with a separate server-checked owner grant created through a private,
one-time setup token. Tests reject claimed handles without the grant, invalid
setup tokens, repeated setup, ordinary members, cross-origin changes and
oversized webhook requests. Recovery retains the role and revokes previous
sessions; deleting/recreating the website account cannot inherit its grant.

All 63 unit/service checks passed, including code/checkbox matching, stale
account review, concurrent approval, preserved wallet data and owner revocation.
Seven real-Neon integration checks (including parent tests) passed. They cover
owner grants, 25-row directory pagination, private response projections, dynamic
and legacy approval eligibility, ranking consent, weekly score ties, redemption
and immediate removal after revocation. QA namespaces were deleted.

The public Chromium route/game suite passed 12 checks at 375px, 768px and
1440px. The final isolated phone run passed both the complete 50-credit mission
lifecycle and the owner dashboard lifecycle: setup/recovery-code display,
ordinary-member denial, wrong-code rejection, approval, immediate standings,
revocation without balance changes, sign-out and owner recovery. Private owner
analytics were absent and the page had no horizontal overflow. Two UI issues
found during testing (status-filter naming and sign-out mode) were corrected.
Concurrent initial browser runs conflicted in their output directory; the final
combined run used a separate directory and passed. Preview owner/member QA
records were then removed. No production owner credentials were selected or
claimed on the user's behalf.

The Instagram adapter was tested with simulated Meta responses. It verifies
HMAC signatures, account/recipient binding, the real sender handle, follower
status, code matching, pause state, deduplication and retryable provider failure.
Missing follower information and owner revocations cannot become approvals.
Credentials are encrypted at rest; secrets are omitted from owner responses.
Meta authorization, callback delivery and a real external-user DM test remain
pending until the owner connects their app. The bot starts disconnected and
paused; these tests do not claim successful live Instagram delivery.

Lint, TypeScript, production build and the production dependency audit passed.
Episode JSON, story configuration, reward prices and mission award rules were
unchanged. Part 2 remains locked and the HUD remains $5,000,000.

## Instagram connection preflight — 18 November 2026

Current Meta documentation distinguishes the app-scoped `id` from the
professional `user_id` used by webhook entries. Connection now calls
`/me?fields=user_id,username`, checks the token belongs to `@crimex.house`, and
detects the professional ID automatically. An optional entered ID must match;
app-scoped and missing professional IDs are rejected. Tests cover both flat
and `data`-wrapped Meta response shapes. All 64 unit/service checks, lint,
TypeScript and the production build passed. Live Meta credentials and DM delivery
remain untested until the owner finishes their developer-app setup.

The Enable action now registers the professional account's `messages`
subscription with Meta after callback verification. It saves enabled status only
after Meta returns success, rejects a connection changed during the request, and
keeps pause independent of provider availability. All 65 unit/service checks
passed, including rejected subscriptions, successful registration and pause.

## Unified Login compatibility — 18 November 2026

The owner's newly created Meta app offers Unified Login. The connector now has
an explicit Unified Login mode using `graph.facebook.com` and the System-user
access token from Meta's dashboard. It discovers the client business ID and
assigned Instagram accounts instead of mistaking `/me` for the Instagram
profile. It accepts only the assigned `@crimex.house` account, stores the
portfolio/configuration metadata encrypted with the token, and uses the selected
host for message subscriptions and sender profile checks. Legacy Instagram Login
and encrypted records without a mode field remain supported.

All 68 unit/service checks passed. New checks cover shared-asset discovery,
cursor pagination on a fixed host, missing business grants, wrong brands and
IDs, provider-specific subscriptions and follower lookup, deduplication and
legacy records. Lint, TypeScript, production build and production dependency
audit passed. Preview browser checks passed the full private owner lifecycle,
both login-mode form options, and the Part 2/$5,000,000 release gate. Private
preview QA data was removed after testing. Story, credit and reward JSON stayed
unchanged. A real Meta token/callback/DM test is still required; the bot has not
been declared connected or enabled. This setup uses Meta's dashboard-generated
token for the owner's account, not a public OAuth onboarding implementation.
