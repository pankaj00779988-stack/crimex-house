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

## Public privacy and deletion pages — 18 November 2026

Added `/privacy` and `/data-deletion` with links in the existing site footer.
The pages describe current crew storage, Instagram verification, ranking
consent, retention limits and existing password-confirmed account deletion.
Future paid-store plans are explicitly separate. No account, wallet, bot logic
or episode-release configuration was changed.

Validation: ESLint, TypeScript and the production build passed. Browser checks
passed at 375px and 1440px, including footer navigation, numbered deletion
instructions, no horizontal overflow or client errors, and public access with
JavaScript disabled. The existing phone episode-first release-gate check passed:
Part 2 stays locked and cash remains $5,000,000.

Meta connection progress: the owner privately saved credentials, Meta verified
the callback, and both the app and professional account subscribed to `messages`.
Automatic checks are enabled. A real coded test DM has not produced a completed
receipt or approval; request logs showed the callback-verification GET but no DM
POST during the test window. The Meta app was still in Development/Unpublished
mode. Inspect and complete Meta's publishing requirements, then repeat the real
DM test before claiming public crew verification works end to end.

## Manual verification, shared identity and link previews — 18 November 2026

Automatic Instagram checks were subsequently paused at the owner's request.
The professional account's app notification subscription was removed; Meta
confirmed success and a read-back returned no subscription. Saved credentials
and callback settings were retained. No successful real DM delivery or automatic
approval is claimed. Manual owner review remains available.

Pending members now get numbered manual steps, a copy-code control with a
selectable-code fallback, and an Instagram DM link that sends nothing itself.
The authenticated handle is reused by the Board and vault via a minimal private,
uncached identity endpoint. Account drafts/completions and existing guest records
stay separate in localStorage; theories are never uploaded. Vault completion is
explicitly separate from membership verification and credit awards. Public links
have a branded 1200×630 PNG cover and page-specific sharing metadata.

Final local validation passed 69 unit/service tests, lint, TypeScript and the
production build. Chromium passed the existing public route/game suite on phone
and desktop, plus the shared-identity journey on both sizes. The journey checks
manual instructions, clipboard success and denial, read-only handles, separate
guest/account drafts, vault completion, focus refresh, and cross-tab sign-out.
A phone check confirmed free guest Board/vault use during both an identity-service
failure and a stalled request. Metadata and PNG dimensions passed; the cover and
mobile verification panel were visually reviewed. A real account lifecycle passed against the
isolated development namespace on the preview database, including the new
authenticated identity response, all 50 daily credits, recovery and QA deletion.
No production QA account was created. A fresh production status check confirmed
automatic checks disabled, callback verification retained and zero Meta account
notification subscriptions. Story, mission and reward JSON are unchanged.

Production build `ea27370` was staged as
`dpl_3QNAfnA4BJenWGvLavNkG55DCBTi`. Six staged Chromium checks passed across
phone and desktop, covering the shared-identity journey, guest failure/timeout
fallback, preview metadata/image and existing episode-first release gate.
The image check uses the browser network path because direct Node HTTP requests
are blocked in this workspace. Public crawler HTML and anonymous private API
projections also passed; a forged session returned no identity.

The same tested deployment was promoted without rebuilding. Both
`crimexhouse.vercel.app` and `crimex-house.vercel.app` resolved to it and passed
public page, 1200×630 PNG, private/no-store API and unauthenticated-owner checks.
The live phone shared-identity and release-gate journeys both passed. No runtime
error/fatal logs were found for the deployment during the checked ten-minute
window. A post-release database read confirmed automatic checks remain paused.
Part 2 stays locked, cash stays $5,000,000, and hosting/database plans are unchanged.

## Part 02 release — 18 November 2026

The creator supplied the Part 02 Reel (`Df5gbH3y-xP`). Instagram's public page
lookup was throttled, so the existing saved Meta connection was used read-only
to retrieve the matching caption, Reel and official cover. The cover confirms
**THE $200K TRAP**; the caption confirms DEAL/BOLT, the $200,000 demand and
$4,900,000 remaining. The Reel's ending shows $0 banked, 52% suspicion and
2:47 AM at the lift bay. Runtime is 77.5 seconds, displayed as 01:18. Automatic
DM checks were not enabled and no Instagram message or comment was sent.

Part 02 is now the active story, with its real cover, synopsis, choices and exact
creator-supplied URL. Watch, Like, Comment and Board theory actions point to that
Reel. Votes are still local drafts until posted on Instagram; no totals were
invented. Part 01 remains archived and playable. Reel release and vault readiness
are separate: Part 02 has no confirmed vault clue/code, so `/safe` retains the
Part 01 puzzle and its existing storage keys. The Board identifies the retained
Part 01 evidence separately. Parts 03–06 remain locked. Mission credit rules,
member data and hosting/database plans are unchanged.

Local checks passed all 70 unit/service tests, ESLint, TypeScript and the final
production build. Twelve Chromium checks passed across phone and desktop, with
two viewport-independent duplicate cases skipped. They cover the current Reel's
exact links, both released archive files, Part 3's lock, the $4.9M HUD, separate
Part 1/2 vote history, the retained Part 1 vault, Room 17, shared account identity,
local drafts and metadata. Mobile HQ and the Part 02 modal were visually reviewed;
the new released badge was moved into normal flow to prevent text overlap.

Commit `5a6ac5b` was staged as `dpl_D1QmTFzc291ifJvCGXmfAfmYRmRG`.
All six staged story checks passed on phone and desktop. Server HTML contained
the Part 02 title, exact Reel, real choices and $4.9M; the official cover and
1200×630 sharing image returned successfully. The released badge cleared the
incident report on mobile and the modal had no horizontal overflow. The same
tested deployment was promoted without rebuilding. Both public aliases passed
page/image/private-API checks, and both live phone story checks passed. No
error/fatal runtime logs were found in the checked ten-minute window. A private
post-release read confirmed automatic Instagram checks remain disabled.

## Part 03 release — 20 November 2026

The creator supplied Reel `Df8T-EwK8Im`. The existing Meta connection was used
read-only to retrieve its matching caption, official cover and video. These
confirm **THE CLEAN VAN**, BLUFF (play sound tech), BOLT (floor it in the fog),
$4,700,000 remaining, $0 banked, 61% suspicion and the 3:38 AM Route 6 stop.
The trooper spots a $100 bill in the latch, with 45 seconds before the plate
check. The 80.6-second video is displayed as 01:21. Automatic DM checks remained
paused. No Instagram comment or message was sent.

Part 03 is the active episode; Parts 01 and 02 remain in the archive with their
original links and details. Watch, Like, Comment, Board theory links and the
sharing badge follow Part 03 automatically. Prior local vote records remain
separate. Current comment totals stay zero rather than deriving invented counts
from the Reel's recap of the previous vote. No new vault clue/code was supplied:
Part 01's playable vault and saved completions remain available. Parts 04–06
stay locked. No member, credit, reward, hosting-plan or database changes were made.

Local validation passed all 70 unit/service tests, ESLint, TypeScript and the
production build. Eight Chromium checks passed across phone and desktop,
including the current Reel links, both earlier archive files, the Part 4 lock,
$4.7M HUD, saved BLUFF choice, earlier vote history, retained Part 1 vault and
Room 17. Browser checks found no horizontal overflow or client errors.

Commit `e7fd565` was staged as `dpl_AT3EfmzVMx7zsNaHQ2FcWyxsRSFh`.
Six hosted story checks passed across phone and desktop, including preservation
of both earlier votes while saving a different Part 3 choice. Server HTML,
the official cover, the 1200×630 sharing image and private/uncached anonymous
API projections passed. The mobile Part 3 modal and sharing cover were visually
reviewed. The same tested deployment was promoted without rebuilding. Both
public aliases passed page/image/API checks, and both live phone story checks
passed. No error/fatal logs were found in the checked ten-minute window. A
post-release read confirmed automatic Instagram checks are still disabled.
