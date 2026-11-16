import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Engagement } from "../components/share";
import { InvestigationBoard } from "../components/board";
import { activeEpisode, siteConfig, corkboard } from "../lib/data";
import { getWatchUrl } from "../lib/release";

test("prelaunch engagement allows sharing while like/comment controls remain sealed", () => {
  const html = renderToStaticMarkup(
    createElement(Engagement, {
      episode: { ...activeEpisode, isReleased: false, reelUrl: "" },
    }),
  );
  assert.match(html, /SHARE HQ/);
  assert.match(html, /COMMENTS OPEN AT PREMIERE/);
  assert.equal((html.match(/disabled=""/g) ?? []).length, 2);
  assert.doesNotMatch(html, /href="https:\/\/(?:www\.)?instagram\.com\/reel\//);
});
test("released like/comment actions and every watch link use the same exact Instagram Reel", () => {
  const reelUrl = "https://www.instagram.com/reel/TestCase123/?igsh=crew";
  const episode = { ...activeEpisode, isReleased: true, reelUrl };
  const html = renderToStaticMarkup(createElement(Engagement, { episode }));
  assert.equal(
    (
      html.match(
        /href="https:\/\/www.instagram.com\/reel\/TestCase123\/\?igsh=crew"/g,
      ) ?? []
    ).length,
    2,
  );
  assert.equal(getWatchUrl(episode, siteConfig.instagramUrl), reelUrl);
  assert.doesNotMatch(html, /disabled=""/);
});
test("crew board is free with a personal draft, no commerce links or fabricated public members", () => {
  const html = renderToStaticMarkup(createElement(InvestigationBoard));
  assert.match(html, /SAVE MY FREE CREW PIN/);
  assert.match(html, /board-theory/);
  assert.match(html, /INVITE A FRIEND/);
  assert.doesNotMatch(
    html,
    /checkout|Gumroad|Razorpay|RESERVE MY SPOT|Corkboard Pin|Business Cameo/,
  );
  assert.ok(corkboard.persons.every((person) => /^@/.test(person.handle)));
  assert.equal("tiers" in siteConfig, false);
});
