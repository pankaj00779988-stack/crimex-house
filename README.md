# CRIMEX HOUSE

**Live:** https://crimexhouse.vercel.app

**Source:** https://github.com/pankaj00779988-stack/crimex-house

An interactive fictional heist series built with Next.js 16 App Router, React 19, TypeScript, and Tailwind CSS 4. Inter and JetBrains Mono are self-hosted. The current experience is free: no paid tiers, product prices, checkout URLs, or payment integrations.

## Run and check

Requires Node.js 20.9 or newer; Node.js 24 is recommended.

```bash
npm ci
npm run dev
```

Open http://localhost:3000. Before publishing, run:

```bash
npm run lint
npm test
npm run build
npm run typecheck
```

Use `npm start` to serve the production build.

## Pages

| URL         | Experience                                                                                                               |
| ----------- | ------------------------------------------------------------------------------------------------------------------------ |
| `/`         | HQ, current episode and Instagram choices first, release updates, free games, missions, FAQ, separate YouTube promotion |
| `/games`    | Room 17 interactive heist case, with Dead Drop and Signal Intercept in the optional quick-drills section                 |
| `/safe`     | Episode vault with four digits, five attempts, feedback, sound, and completion log; sealed before release                |
| `/files`    | Season archive with teaser/full dossiers controlled by release state                                                     |
| `/board`    | Evidence board, free personal crew pin, private theory draft, and invitation/share actions                               |
| `/missions` | Daily cipher, case briefing, evidence memory challenge, shared Crew Credits wallet, personal reward and weekly Top 10    |

## JSON content

- `data/siteConfig.json`: brand, social/channel URLs, canonical site URL, premiere schedule, HUD, free participation settings, FAQ.
- `data/episodes.json`: episode IDs, titles, artwork, runtime, release flags, Reel URLs, choices, optional genuine comment snapshots, dossiers, and safe puzzles.
- `data/corkboard.json`: evidence and creator-curated public handles. The public list starts empty; no sample followers are presented as real members.
- `data/heist.json`: Room 17 briefing, clue text, move/alert costs, case combination, exits, and outcomes.
- `data/games.json`: quick-drill copy, memory symbols, and reaction delay range.

Keep exactly one episode in the editorial `LIVE` slot. Its public release is separately controlled by `isReleased` and `reelUrl`. Other episodes can be `LOCKED` or `ARCHIVED`. IDs must be unique and stable. The latest released Reel drives the Watch action, announcement and sharing badge. A Reel may use `vaultReady: false` until its real vault clue/code is supplied; the newest earlier playable vault remains available with its existing local progress. Redeploy after editing JSON; Next.js imports content at build time.

## Released episodes

Part 02, **THE $200K TRAP**, is the current episode and points to the creator-supplied [Instagram Reel](https://www.instagram.com/reel/Df5gbH3y-xP/?knvt=Y3M3NWczcHl6dGZl). Its official caption confirms **DEAL** (pay Vance $200,000) and **BOLT** (ram the door and run). Its Reel/cover confirm the title, poster, $4,900,000 remaining, $0 banked and the ending 52% suspicion baseline. Runtime is rounded from the Reel's 77.5 seconds. No comment counts were supplied, so website vote totals remain zero.

Part 01 remains accessible in the archive with its [original Reel](https://www.instagram.com/reel/Df0s0ByqzGz/?obrf=eDJ0NTcweGdlZDAy), case notes and 1150 vault. The Board labels its retained Part 01 evidence separately from the latest Reel’s theory link. Part 02 has a confirmed synopsis and real choices, but no creator-confirmed vault clue/code or legal citation; these are not invented. Parts 03–06 remain locked. Member verification, mission credits and reward costs are independent of episode release.

Change these two fields together and redeploy:

```json
{
  "isReleased": true,
  "reelUrl": "https://www.instagram.com/reel/YOUR_REAL_REEL_ID/"
}
```

A released episode needs a valid HTTPS Instagram Reel URL or the build fails. Every episode Watch, Like, and Comment action opens that exact Reel URL. Choosing a website option prepares a comment and saves the choice locally; the visitor must post it on Instagram to cast the vote. Nothing is submitted automatically.

`initialVotes` starts at zero. Update it only with genuine creator-reported Instagram comment totals. With no entered results, no percentages or vote totals are shown. A local choice never inflates reported totals.

Before release, the follow CTA, locked vote, teaser dossier, and sealed vault remain active. Sharing HQ and practice games are open. `nextReleaseAt` in `siteConfig.json` is `null` until a release date is confirmed. Set it to an ISO timestamp with an explicit timezone (for example, `2026-11-20T19:00:00-05:00`) and redeploy to show a dated countdown in `America/New_York`. An absent or elapsed date shows production updates rather than rolling over to tomorrow. The clock never releases an episode automatically. YouTube remains an independent channel link.

On mobile, new visitors see the Crew ID reward preview and daily missions before the account form. Signed-in members retain quick access to their wallet. Mission awards, manual follower confirmation, opt-in rankings and reward costs are unchanged.

## Free participation and privacy

Daily Missions use a separate website account: Instagram handle, website password, and an optional public-ranking consent. Passwords are scrypt-hashed; sessions use secure HttpOnly cookies. A recovery code is shown once at registration and rotated on recovery. No Instagram password, email address, crypto wallet, or payment is needed. Account settings support public-ranking opt-out and password-confirmed deletion.

The signed-in website handle is reused on the Board and episode vault through a private, uncached identity endpoint. Sign-in, recovery and sign-out refresh it across open tabs; the handle stays read-only while signed in. Board drafts and vault completion logs are still saved only on that device, with separate keys for each account and for guests. Existing guest drafts remain available after sign-out. An unavailable account lookup falls back to free guest play; local completion never verifies membership or awards credits.

Wallets are private JSONB records in the connected Neon Postgres database. Each account's balance, claims, recent ledger and entitlements change together in one conditional SQL update, protected by a fresh UUID revision and retries. Duplicate claims and redemptions do not award or spend twice. Production and preview/development use separate Neon Free resources; namespaces also isolate production (`crew-v1`), previews (`crew-preview-v1`) and local development (`crew-development-v1`). Storage failure returns an error; it never substitutes browser or legacy balances. Cookie credentials and private ledger data never appear in leaderboard responses. The original Blob records remain a migration backup and are no longer the active wallet store. See [CREW_STORAGE.md](CREW_STORAGE.md) for setup and recovery precautions.

`data/crew.json` defines three daily missions (15-credit cipher, 10-credit briefing, 25-credit memory drill), five attempts per mission, a 50-credit daily maximum, and the 40-credit personalized Crew ID wallpaper. Daily reset is midnight America/New_York; weekly scoring starts Monday midnight Eastern. Wallet balances carry forward. Weekly standings count credits earned, unaffected by redemption. Ties use the earliest time the weekly score was reached, then handle. The PNG reward is generated server-side at 1080×1920 and is available only after the account owns the entitlement. Future merchandise and paid checkout are not enabled.

### Confirming follower eligibility

New accounts can earn credits while pending. Use the private [owner dashboard](https://crimexhouse.vercel.app/owner) to approve members after checking their actual Instagram DM sender, CREW code, and follow. Search the pending list, paste the DM code and confirm both checks. Approval and revocation take effect in Neon without a Git edit or deployment. A separate one-time setup link establishes owner access for the website account @crimex.house; its handle alone never grants access. Save the recovery code privately.

Pending members see numbered manual steps, **Copy crew code** and **Open Instagram DM**. Copy success is shown only after the clipboard accepts the code; otherwise the code is selected for manual copying. Opening Instagram does not send a message. Members return and refresh after creator review.

Verified members need enough credits to redeem and must opt into public rankings. Revocation removes eligibility while keeping wallet credits and already-owned rewards. Database reviews override historical JSON approvals. The optional Meta connection remains saved, but automatic checks are paused and the professional account's notification subscription was removed. Live coded DM delivery did not complete; manual review is the current workflow. The integration code supports Unified Login and legacy Instagram Login for a future tested reconnection. Continuous follow monitoring and automatic Instagram replies are not enabled.

See [OWNER_GUIDE.md](OWNER_GUIDE.md) for owner access, member reviews, recovery, Meta setup and the operator CLI fallback. The private directory never returns passwords, account hashes, recovery codes or member sessions.

Hosting remains Vercel Hobby and both database resources use Neon Free. No paid plan or checkout is enabled. The Free database plan selected during setup includes 1 GB per project and 100 compute-unit hours per project; provider allowances can change. Database activity, hosting bandwidth, function usage and generated-reward downloads determine capacity, so these allowances are not a guaranteed concurrent-visitor count. Monitor both dashboards before promoting a large release. Idle database wake-up can add latency. Private QA accounts are deleted after browser tests. No sample handles are shown as real ranked participants.

Vercel Web Analytics is installed in the root layout for automatic page views and client-side navigation. Activate it in the project's [Analytics dashboard](https://vercel.com/crimexhouse/crimex-house/analytics) and redeploy if Vercel requests it. The Hobby setup uses page-view analytics only: no paid custom events or submission tracking. Visits are anonymous; local crew pins, drafts, vault completions, and game scores are not uploaded. Data starts after activation and does not reconstruct earlier visits.

Practice games and story pages do not require an account. Personal Corkboard pins, theory drafts, practice-game records, sound settings, episode safe attempts, and saved vote choices use localStorage and survive reloads. They synchronize between tabs. Storage failures are reported. Daily-mission wallets are separate and saved privately on the server.

Pins, drafts, and scores stay on the visitor's device. They do not create a public membership, upload a theory, enter a contest, or publish a leaderboard entry. Only real handles deliberately added by the creator to `corkboard.json` appear publicly. Instagram handles likes/comments and its own sign-in requirements.

Sharing opens the native share sheet where available, falls back to copying the canonical site link, and offers a selectable link if clipboard permission is unavailable. Canceling native sharing does not copy anything or display a success message. No like/share counts are fabricated.

Public links include a branded 1200×630 Open Graph/Twitter cover generated from existing artwork. Board, Files, Games, Missions and Safe retain their own sharing titles and descriptions. The cover uses only released story information; member data and locked episode details are excluded.

Room 17 is an original practice case, separate from Part 01. It has an eight-move budget, collectible notes/items, a locked ledger case, three exit choices, and four outcome grades. The run and best report persist on the device; when storage is unavailable, the current run still works in memory. Room alert is independent of the episode HUD. There is no countdown timer inside the game, so reading pace does not cost moves.

Dead Drop reshuffles six pairs each round. Signal Intercept rejects early taps and measures reaction time after a random signal. Both store personal bests on the device. There are no entry fees or real-money prizes.

The episode safe is a narrative puzzle, not authentication. Source data and puzzle answers are in the public repository/client bundle. Standby removes unreleased clues from the interface and server-rendered episode props, not from public source code.

## Artwork

- `public/art/motel-room.webp`: generated text-free motel artwork in the established character style. Used by HQ, Room 17, and the Part 01 teaser. The original PNG is retained outside the repository; WebP keeps the site asset small.
- `public/art/part-02.webp`: the creator's actual Part 02 cover, retrieved from the connected Instagram account and optimized as WebP. Its title is **THE $200K TRAP**.
- To use a supplied original episode image later, upload it under `/public/art/` and change the episode’s `image` field.
- `public/art/scene_01.jpg`: original starter photo from [Unsplash](https://images.unsplash.com/photo-1519608487953-e999c86e7455).
- `avatarUrl` in site configuration is empty for the CH monogram. Set it to `/art/pfp.jpg` after uploading a profile image. Missing configured images also fall back cleanly.

Evidence art is CSS/SVG. Next Image optimizes supplied artwork.

## Deployment

Vercel project: `crimex-house`, workspace: `crimexhouse`. Production domains are https://crimexhouse.vercel.app and https://crimex-house.vercel.app. The custom domain `crimex.house` has not been purchased or attached.

Source is public on GitHub; deployments have been uploaded directly to Vercel. Automatic deployment requires connecting GitHub under [Vercel account authentication](https://vercel.com/account/settings/authentication), then selecting this repository and `main` under project Settings → Git. Until linked, a GitHub push needs a separate Vercel deployment.

Continue the linked project with its Next.js preset and default build/output settings. Crew Credits require server-side `DATABASE_URL`, `CREW_STORAGE_BACKEND=postgres` and `CREW_SIGNING_SECRET`; provision and initialize each environment before deploying. Keep the existing signing secret to preserve challenge tickets and rate-limit identities. Never expose database URLs or signing/storage secrets through `NEXT_PUBLIC_` variables. The story and practice pages work independently of account storage. Use Vercel or a Node host rather than unmodified GitHub Pages.

See [COMPETITOR_REVIEW.md](COMPETITOR_REVIEW.md) for research and [VERIFICATION.md](VERIFICATION.md) for automated browser checks and device-testing limits.

## Browser verification

The browser suite uses Playwright with Chromium at 375px, 768px, and 1440px. It checks all routes for overflow and failed resources, validates artwork and teaser modal focus, plays Room 17 through a clean exit, reloads the saved report, and checks the optional quick drills. It saves screenshots in `test-results/` (ignored by Git).

```bash
BASE_URL=https://your-preview.vercel.app npm run test:browser
```

The managed environment uses `/usr/bin/chromium`. Elsewhere, set `CHROMIUM_PATH` or install Playwright's Chromium with `npx playwright install chromium`. These checks use a clean browser profile; they do not access a user's signed-in browser or send messages to Instagram. Viewport emulation is not a physical iPhone/Safari test.
