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

| URL      | Experience                                                                                                               |
| -------- | ------------------------------------------------------------------------------------------------------------------------ |
| `/`      | HQ, premiere countdown, episode choices, free games, like/comment/share actions, FAQ, separate YouTube channel promotion |
| `/games` | Dead Drop memory game and Signal Intercept reaction game; open before the episode premiere                               |
| `/safe`  | Episode vault with four digits, five attempts, feedback, sound, and completion log; sealed before release                |
| `/files` | Season archive with teaser/full dossiers controlled by release state                                                     |
| `/board` | Evidence board, free personal crew pin, private theory draft, and invitation/share actions                               |

## JSON content

- `data/siteConfig.json`: brand, social/channel URLs, canonical site URL, premiere schedule, HUD, free participation settings, FAQ.
- `data/episodes.json`: episode IDs, titles, artwork, runtime, release flags, Reel URLs, choices, optional genuine comment snapshots, dossiers, and safe puzzles.
- `data/corkboard.json`: evidence and creator-curated public handles. The public list starts empty; no sample followers are presented as real members.
- `data/games.json`: practice game copy, memory symbols, and reaction delay range.

Keep exactly one episode in the editorial `LIVE` slot. Its public release is separately controlled by `isReleased` and `reelUrl`. Other episodes can be `LOCKED` or `ARCHIVED`. IDs must be unique and stable. Redeploy after editing JSON; Next.js imports content at build time.

## Release Part 01

Change these two fields together and redeploy:

```json
{
  "isReleased": true,
  "reelUrl": "https://www.instagram.com/reel/YOUR_REAL_REEL_ID/"
}
```

A released episode needs a valid HTTPS Instagram Reel URL or the build fails. Every episode Watch, Like, and Comment action opens that exact Reel URL. Choosing a website option prepares a comment and saves the choice locally; the visitor must post it on Instagram to cast the vote. Nothing is submitted automatically.

`initialVotes` starts at zero. Update it only with genuine creator-reported Instagram comment totals. With no entered results, no percentages or vote totals are shown. A local choice never inflates reported totals.

Before release, the follow CTA, locked vote, teaser dossier, and sealed vault remain active. Sharing HQ and both practice games are open. The countdown uses 19:00 in `America/New_York`, displays 7:00 PM ET, and adjusts for DST. The clock never releases an episode automatically. YouTube remains an independent channel link.

## Free participation and privacy

No site account, database, or API keys are needed. Crew pins, theory drafts, personal game records, sound settings, safe attempts, and saved choices use localStorage and survive reloads. They synchronize between tabs. Storage failures are reported.

Pins, drafts, and scores stay on the visitor's device. They do not create a public membership, upload a theory, enter a contest, or publish a leaderboard entry. Only real handles deliberately added by the creator to `corkboard.json` appear publicly. Instagram handles likes/comments and its own sign-in requirements.

Sharing opens the native share sheet where available, falls back to copying the canonical site link, and offers a selectable link if clipboard permission is unavailable. Canceling native sharing does not copy anything or display a success message. No like/share counts are fabricated.

Dead Drop reshuffles six pairs each round. Signal Intercept rejects early taps and measures reaction time after a random signal. Both store personal bests on the device. There are no entry fees or real-money prizes.

The episode safe is a narrative puzzle, not authentication. Source data and puzzle answers are in the public repository/client bundle. Standby removes unreleased clues from the interface and server-rendered episode props, not from public source code.

## Artwork

- `public/art/scene_01.png`: intended Part 01 artwork; add the downloadable original here. Missing art uses a gradient.
- `public/art/scene_01.jpg`: original starter photo from [Unsplash](https://images.unsplash.com/photo-1519608487953-e999c86e7455).
- `public/art/pfp.jpg`: brand avatar; missing files show a CH monogram.

Evidence art is CSS/SVG. Next Image optimizes supplied artwork.

## Deployment

Vercel project: `crimex-house`, workspace: `crimexhouse`. Production domains are https://crimexhouse.vercel.app and https://crimex-house.vercel.app. The custom domain `crimex.house` has not been purchased or attached.

Source is public on GitHub; deployments have been uploaded directly to Vercel. Automatic deployment requires connecting GitHub under [Vercel account authentication](https://vercel.com/account/settings/authentication), then selecting this repository and `main` under project Settings → Git. Until linked, a GitHub push needs a separate Vercel deployment.

For a new import, use the detected Next.js preset, repository root, and default build/output settings. No environment variables are required. Use Vercel or a Node host rather than unmodified GitHub Pages.

See [COMPETITOR_REVIEW.md](COMPETITOR_REVIEW.md) for research and [VERIFICATION.md](VERIFICATION.md) for checks and remaining browser QA.
