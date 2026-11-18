import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  activeEpisode,
  latestEpisode,
  vaultEpisode,
  siteConfig,
  type Episode,
} from "../lib/data";
import {
  getPublicEpisode,
  getWatchUrl,
  isEpisodeReleased,
  isInstagramReelUrl,
} from "../lib/release";
import { nextDrop } from "../lib/game";
import { Vote } from "../components/vote";
import { Vault } from "../components/vault";
import { DossierModal, EpisodeCard, WatchButton } from "../components/dossier";

const reelUrl =
  "https://www.instagram.com/reel/ReleaseFixture_01/?igsh=test123";
const standby: Episode = { ...vaultEpisode, isReleased: false, reelUrl: "" };
const released: Episode = { ...standby, isReleased: true, reelUrl };

test("Part 2 release opens its real choices while keeping Part 1's vault and avoiding an invented clue", () => {
  assert.equal(latestEpisode.part, 2);
  assert.equal(
    latestEpisode.reelUrl,
    "https://www.instagram.com/reel/Df5gbH3y-xP/?knvt=Y3M3NWczcHl6dGZl",
  );
  assert.equal(isEpisodeReleased(latestEpisode), true);
  assert.equal(activeEpisode.part, 2);
  assert.equal(activeEpisode.title, "THE $200K TRAP");
  assert.equal(siteConfig.cash, 4900000);
  assert.equal(siteConfig.initialSuspicion, 52);
  assert.equal(vaultEpisode.part, 1);
  assert.equal(vaultEpisode.safeCode, "1150");
  const html = renderToStaticMarkup(
    createElement(DossierModal, {
      episode: latestEpisode,
      open: false,
      onClose() {},
    }),
  );
  assert.ok(html.includes(`href="${latestEpisode.reelUrl}"`));
  assert.match(html, /vault is not available yet/);
  assert.doesNotMatch(html, /Structuring|Bundle #50|RECOVERED INTELLIGENCE/);
  const vote = renderToStaticMarkup(
    createElement(Vote, { episode: latestEpisode }),
  );
  assert.match(vote, /DEAL/);
  assert.match(vote, /BOLT/);
  assert.doesNotMatch(vote, /DECOY/);
  const vault = renderToStaticMarkup(
    createElement(Vault, { episode: latestEpisode }),
  );
  assert.match(vault, /vault is not available yet/);
  assert.doesNotMatch(vault, /aria-label="Digit/);
});

test("standby remains sealed regardless of the clock or a prefilled Reel URL", () => {
  assert.equal(isEpisodeReleased(standby), false);
  assert.equal(isEpisodeReleased({ ...standby, reelUrl }), false);
  assert.equal(isEpisodeReleased({ ...standby, isReleased: true }), false);
  assert.equal(isEpisodeReleased({ ...released, status: "LOCKED" }), false);
  assert.equal(isEpisodeReleased(released), true);
});
test("only HTTPS Instagram Reel URLs can release an episode", () => {
  assert.equal(isInstagramReelUrl(reelUrl), true);
  assert.equal(isInstagramReelUrl("https://instagram.com/reel/abc-123/"), true);
  for (const value of [
    "",
    "javascript:alert(1)",
    "http://instagram.com/reel/abc/",
    "https://instagram.com.evil.test/reel/abc/",
    "https://instagram.com/crimex.house/",
    "https://user:pass@instagram.com/reel/abc/",
  ])
    assert.equal(isInstagramReelUrl(value), false);
  assert.equal(getWatchUrl(released, siteConfig.instagramUrl), reelUrl);
  assert.equal(
    getWatchUrl(standby, siteConfig.instagramUrl),
    siteConfig.instagramUrl,
  );
});
test("New York premiere is 7 PM Eastern in winter and summer", () => {
  assert.equal(
    nextDrop(new Date("2026-11-16T23:59:59Z"), 19, "America/New_York"),
    Date.parse("2026-11-17T00:00:00Z"),
  );
  assert.equal(
    nextDrop(new Date("2026-07-15T22:59:59Z"), 19, "America/New_York"),
    Date.parse("2026-07-15T23:00:00Z"),
  );
  assert.equal(
    nextDrop(new Date("2026-11-17T00:00:00Z"), 19, "America/New_York"),
    Date.parse("2026-11-18T00:00:00Z"),
  );
});
test("next premiere handles the spring and autumn daylight-saving transitions", () => {
  assert.equal(
    nextDrop(new Date("2026-03-08T01:00:00Z"), 19, "America/New_York"),
    Date.parse("2026-03-08T23:00:00Z"),
  );
  assert.equal(
    nextDrop(new Date("2026-11-01T00:00:00Z"), 19, "America/New_York"),
    Date.parse("2026-11-02T00:00:00Z"),
  );
});
test("standby vote does not render choices or seeded totals; release restores voting", () => {
  const lockedHtml = renderToStaticMarkup(
    createElement(Vote, { episode: standby }),
  );
  assert.match(lockedHtml, /CREW VOTE LOCKED/);
  assert.doesNotMatch(
    lockedHtml,
    /DECOY|Garbage Truck|Hit Highway|1,428|vote-option/,
  );
  const liveHtml = renderToStaticMarkup(
    createElement(Vote, { episode: released }),
  );
  assert.match(liveHtml, /DECOY/);
  assert.match(liveHtml, /RUN/);
  assert.match(liveHtml, /VOTING OPEN/);
});
test("standby vault renders no playable keypad, clue, or completion form", () => {
  const lockedHtml = renderToStaticMarkup(
    createElement(Vault, { episode: standby }),
  );
  assert.match(lockedHtml, /VAULT SEALED UNTIL PART/);
  assert.doesNotMatch(
    lockedHtml,
    /aria-label="Digit|safeClue|1150|Bundle #50|crew-handle/,
  );
  const liveHtml = renderToStaticMarkup(
    createElement(Vault, { episode: released }),
  );
  assert.match(liveHtml, /aria-label="Digit 1"/);
  assert.match(liveHtml, /Submit combination/);
});
test("teaser modal contains no unreleased incident report or safe clue", () => {
  const html = renderToStaticMarkup(
    createElement(DossierModal, {
      episode: standby,
      open: false,
      onClose() {},
    }),
  );
  assert.match(html, /declassifies when the Reel goes live on/);
  assert.doesNotMatch(
    html,
    /Bundle #50|GPS|1150|Structuring|INCIDENT REPORT|RECOVERED INTELLIGENCE/,
  );
  const card = renderToStaticMarkup(
    createElement(EpisodeCard, { episode: standby }),
  );
  assert.match(card, /01:17/);
  assert.match(card, /COMING SOON/);
  assert.ok(card.includes(encodeURIComponent(standby.image!)));
  assert.doesNotMatch(card, /LIVE NOW|Bundle #50|GPS|safeClue/);
});
test("all watch actions open the exact Reel URL after the two-field release", () => {
  const follow = renderToStaticMarkup(
    createElement(WatchButton, { episode: standby }),
  );
  assert.match(follow, /FOLLOW @CRIMEX.HOUSE FOR PART 01/);
  assert.ok(follow.includes(`href="${siteConfig.instagramUrl}"`));
  const watch = renderToStaticMarkup(
    createElement(WatchButton, { episode: released }),
  );
  assert.match(watch, /WATCH PART 01/);
  assert.ok(watch.includes(`href="${reelUrl}"`));
  const dossier = renderToStaticMarkup(
    createElement(DossierModal, {
      episode: released,
      open: false,
      onClose() {},
    }),
  );
  assert.ok(dossier.includes(`href="${reelUrl}"`));
  assert.match(dossier, /Bundle #50/);
});

test("unreleased server-to-client props contain only teaser data", () => {
  const preview = getPublicEpisode(standby);
  assert.equal(preview.title, "110 POUNDS");
  assert.equal(preview.runtime, "01:17");
  for (const key of [
    "summary",
    "safeCode",
    "safeClue",
    "recoveredIntelligence",
    "choices",
    "initialVotes",
  ])
    assert.equal(key in preview, false);
  assert.equal(getPublicEpisode(released), released);
});
