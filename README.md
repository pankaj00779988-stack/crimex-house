# CRIMEX HOUSE

**Live website:** https://crimexhouse.vercel.app

**Public source:** https://github.com/pankaj00779988-stack/crimex-house

A mobile-first interactive heist series website built with **Next.js 16 App Router, React 19, TypeScript, and Tailwind CSS 4**. All story, voting, evidence, and checkout content lives in `/data`. Inter and JetBrains Mono are self-hosted through Fontsource; no Google Fonts request is needed at build time.

## Run locally

Requires Node.js 20.9 or newer (Node.js 22 or 24 recommended).

```bash
npm ci
npm run dev
```

Open `http://localhost:3000`.

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm start
```

## Pages

| URL      | Experience                                                                                                         |
| -------- | ------------------------------------------------------------------------------------------------------------------ |
| `/`      | Cinematic HQ, heist HUD, one-vote-per-device decision, episode previews                                            |
| `/safe`  | Four-digit vault, five persisted attempts per episode, duplicate-aware feedback, synthesized sound, completion log |
| `/files` | Six episode cards, native accessible dossier dialog for live episodes                                              |
| `/board` | Evidence strings and pinned cards, live handle preview, tier selection and checkout                                |

## Daily updates: JSON only

### `data/episodes.json`

Give each episode a unique, permanent `id`. Keep exactly one episode `LIVE`: the first live episode supplies the HQ vote and the vault. Set other released episodes to `ARCHIVED` to keep their case files available, and upcoming episodes to `LOCKED`. Each released episode needs:

```json
{
  "id": "s1-p2",
  "part": 2,
  "title": "THE NEXT MOVE",
  "status": "LIVE",
  "subtitle": "Your vote writes what happens next.",
  "runtime": "00:59",
  "choices": ["OPTION A (Description)", "OPTION B (Description)"],
  "initialVotes": { "optionA": 0, "optionB": 0 },
  "voteHeading": "What happens next?",
  "voteContext": "The new decision facing the crew.",
  "choiceStrategies": ["Strategy A.", "Strategy B."],
  "image": "/art/scene_02.jpg",
  "summary": "The new episode summary.",
  "realLawRule": "Verified law reference",
  "lawExplanation": "Plain-language story context.",
  "safeCode": "1234",
  "safeClue": "The clue viewers can use."
}
```

Changing the active episode's ID creates a fresh vote, five fresh vault attempts, and a fresh completion log. Suspicion carries across the season and caps at 100%. To revise an existing episode, keep its ID stable. Redeploy after editing JSON: Next.js imports these files at build time.

### `data/siteConfig.json`

- Brand title, handle, Instagram link, HUD amounts, and vault rules.
- `countdownTargetHour`: UTC hour, 0–23. Default is **19 (7:00 PM UTC)**. `countdownTimeZone` documents the supported UTC schedule; the drop time is deliberately consistent across visitors. Update `dropLabel` together with the hour.
- `tiers`: three prices, descriptions, and external payment links. **The supplied Gumroad/Razorpay URLs are placeholders.** Replace each `checkoutUrl` with a real HTTPS checkout, and set its `checkoutReady` to `true`. Until then, Reserve displays a clear setup message and does not open a broken checkout or take payment.
- Valid reservations open the configured payment link in a new tab and add an `instagram` query parameter. Configure your payment provider's own custom field/webhook if the handle must be captured in paid orders; a query string alone is not a verified order record.

### `data/corkboard.json`

Update the three evidence cards and the pinned persons list. The next preview pin number is computed from that list.

## Artwork

- `public/art/scene_01.jpg`: a starter neon night-street photograph from [Unsplash](https://images.unsplash.com/photo-1519608487953-e999c86e7455). Replace with your episode artwork; recommended 2200 × 1400 or larger. It is used in the hero and episode art, optimized by Next Image.
- `public/art/pfp.jpg`: add your profile image here. Until uploaded, a styled CH monogram appears automatically.
- Both image components handle missing files with fallback backgrounds; no broken-image icon is shown.
- The evidence illustrations are local CSS/SVG with no external image dependency.

## Persistence and production scope

This is a complete **browser-local interactive frontend**, requiring no environment variables, database, or API keys. Voting, attempts, sound settings, suspicion, and crew handles use versioned localStorage keys, synchronize between tabs, and survive reloads. The vote display adds the visitor's vote to the JSON seed tally; it is **not a live global voting backend**. Crew completions are recorded on the device, not published to a server or Instagram. The UI discloses this. If storage is blocked, saving interactions reports an error.

The safe is a narrative puzzle, not an authentication system: its answer ships in the public client bundle, and local data can be cleared or edited by visitors. For cross-device records, global votes, fraud prevention, or automatic payment fulfillment, add a database and server-verified endpoints/webhooks before claiming those capabilities.

Accessibility includes keyboard navigation, skip link, visible focus states, native dialog focus trapping/Escape handling, screen-reader digit feedback and status updates, labels, reduced-motion support, and touch-friendly controls. Layouts cover 320px through desktop with no fixed page widths.

## Deploy to Vercel

1. Upload this project to a GitHub repository, excluding `node_modules`, `.next`, and any `.env` files (covered by `.gitignore`).
2. In Vercel, choose **Add New → Project** and import that repository.
3. If the project is at the repository root, keep Root Directory as `./`. If you upload the containing folder, select `crimex-house` as Root Directory.
4. Keep the automatically detected **Next.js** preset, default build command, and default output settings. No environment variables are required.
5. Deploy. Add a custom domain under the project's Domains settings if desired.

GitHub stores the source; Vercel serves the website. This standard Next.js application uses image optimization and response headers and is intended for Vercel or a Node host, rather than an unmodified GitHub Pages static deployment.

Publishing does not enable payments automatically. Configure and verify the checkout URLs before accepting reservations.

## Current hosting setup

The initial production release was deployed directly to the Vercel project **crimex-house** in the **crimexhouse** workspace from source commit `1581602`. Both https://crimexhouse.vercel.app and https://crimex-house.vercel.app point to this release.

Automatic deployments from GitHub are not connected yet: Vercel requires a GitHub Login Connection for this account. To enable future JSON edits to deploy automatically, connect GitHub under [Vercel account authentication](https://vercel.com/account/settings/authentication), then connect `pankaj00779988-stack/crimex-house` under the project’s **Settings → Git**, with `main` as the production branch. Until linked, changes pushed to GitHub need a separate Vercel deployment.

The custom domain `crimex.house` has not been purchased or attached. Registration is separate from the free Vercel address.
