import { test } from "node:test";
import assert from "node:assert/strict";
import {
  nextDrop,
  normalizeHandle,
  scoreGuess,
  validHandle,
} from "../lib/game";
import config from "../data/siteConfig.json";
import episodes from "../data/episodes.json";
import { vaultEpisode } from "../lib/data";

test("vault recognizes all four correct positions", () => {
  assert.deepEqual(scoreGuess("1150", "1150"), [
    "exact",
    "exact",
    "exact",
    "exact",
  ]);
});
test("duplicate digits cannot consume a matched digit twice", () => {
  assert.deepEqual(scoreGuess("1111", "1150"), [
    "exact",
    "exact",
    "miss",
    "miss",
  ]);
  assert.deepEqual(scoreGuess("5500", "1150"), [
    "present",
    "miss",
    "miss",
    "exact",
  ]);
  assert.deepEqual(scoreGuess("5011", "1150"), [
    "present",
    "present",
    "present",
    "present",
  ]);
});
test("unrelated digits are all misses", () => {
  assert.deepEqual(scoreGuess("2346", "1150"), [
    "miss",
    "miss",
    "miss",
    "miss",
  ]);
});
test("countdown selects today's UTC drop before 19:00", () => {
  assert.equal(
    nextDrop(new Date("2026-11-16T18:59:59Z"), 19),
    Date.parse("2026-11-16T19:00:00Z"),
  );
});
test("countdown rolls to tomorrow at and after the drop, including year boundary", () => {
  assert.equal(
    nextDrop(new Date("2026-11-16T19:00:00Z"), 19),
    Date.parse("2026-11-17T19:00:00Z"),
  );
  assert.equal(
    nextDrop(new Date("2026-12-31T23:59:59Z"), 19),
    Date.parse("2027-01-01T19:00:00Z"),
  );
});
test("handles accept Instagram characters and reject injection, whitespace and excess length", () => {
  for (const v of ["@crimex.house", "night_runner", " vault.theory "])
    assert.equal(validHandle(v), true);
  for (const v of ["", "@", "name space", "@@name", "<script>", "a".repeat(31)])
    assert.equal(validHandle(v), false);
  assert.equal(normalizeHandle(" @night.runner "), "@night.runner");
});
test("editorial configuration has one active episode, valid counts, and no paid tiers", () => {
  const live = episodes.filter((e) => e.status === "LIVE");
  assert.equal(live.length, 1);
  assert.deepEqual(
    episodes.filter((e) => e.status === "LOCKED").map((e) => e.part),
    [3, 4, 5, 6],
  );
  assert.match(vaultEpisode.safeCode!, /^\d{4}$/);
  assert.equal(live[0].choices!.length, 2);
  assert.ok(
    Object.values(live[0].initialVotes!).every(
      (count) => Number.isSafeInteger(count) && count >= 0,
    ),
  );
  assert.equal(new Set(episodes.map((e) => e.id)).size, episodes.length);
  assert.equal(config.safeMaxAttempts, 5);
  assert.equal(config.suspicionPerMiss, 5);
  assert.equal("tiers" in config, false);
  assert.equal(config.participation.cost, "FREE");
});
