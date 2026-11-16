# Verification

The following checks have passed on Node.js 24:

- `npm run lint`: no ESLint errors or warnings.
- `npm test`: seven tests covering duplicate-aware digit feedback, countdown rollover at 19:00 UTC and year boundaries, Instagram handle validation, and initial JSON consistency.
- `npm run build`: optimized Next.js production build and its TypeScript checks; all four application pages prerender successfully.
- `npm audit --omit=dev`: no known production dependency vulnerabilities at build time.

Browser preview tools are unavailable in the provided environment. The following browser checks remain for release review:

1. Inspect `/`, `/safe`, `/files`, `/board` at 375px, 768px, and 1440px. Verify no horizontal overflow and no obscured controls, including at 200% zoom.
2. Vote once. Confirm tally increases by one, bars animate, further voting is disabled, and reloading/another tab preserves the vote.
3. Guess `1111` in the vault: first two digits green, last two dark, suspicion rises from 34% to 39%. Guess `5011`: all pink, suspicion rises to 44%. Guess `1150`: unlock chime and cream dossier. Refresh and confirm the vault remains open.
4. In a fresh browser profile, use five wrong guesses. Confirm lockout remains after reload. Toggle SFX and check the keyboard, buzz, and chime after a user gesture.
5. Save `@your.handle` after unlocking. Check completion persists and appears in the board's preview. Verify that invalid handles receive useful messages.
6. Open Part 1's case file. Check focus stays in the dialog, Escape closes it, and focus returns to the opener. Locked cards cannot open.
7. Type a handle on the board and switch tiers. Confirm live preview and price update. Placeholder checkout shows a setup message. After real HTTPS URLs are configured and `checkoutReady` is true, verify the correct provider opens in a new tab.
8. Rename/remove artwork to confirm clean image fallbacks. Check reduced-motion settings and keyboard-only navigation.

Checkout placeholders are intentionally inactive. Device-local votes and completions do not represent a shared database.
