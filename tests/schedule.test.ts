import { test } from "node:test";
import assert from "node:assert/strict";
import { releaseTime, upcomingRelease } from "../lib/schedule";

test("unconfirmed dates and ambiguous local times never create a countdown", () => {
  for (const value of [null, undefined, "", "tomorrow", "2026-11-20T19:00:00", "7 PM"])
    assert.equal(releaseTime(value), null);
  assert.equal(upcomingRelease(null, "America/New_York"), null);
});

test("a confirmed release is one instant, including Eastern daylight saving", () => {
  const winter = upcomingRelease(
    "2026-11-20T19:00:00-05:00", "America/New_York", new Date("2026-11-20T23:00:00Z"),
  );
  assert.equal(winter?.countdown, "01 : 00 : 00");
  assert.match(winter!.label, /NOV 20/);
  assert.match(winter!.label, /7:00\s*PM EST/);
  const summer = upcomingRelease(
    "2027-07-15T23:00:00Z", "America/New_York", new Date("2027-07-15T22:00:00Z"),
  );
  assert.equal(summer?.countdown, "01 : 00 : 00");
  assert.match(summer!.label, /7:00\s*PM EDT/);
});

test("an elapsed date stops instead of promising tomorrow's drop", () => {
  const release = "2026-11-20T19:00:00-05:00";
  assert.equal(upcomingRelease(release, "America/New_York", new Date("2026-11-21T00:00:00Z")), null);
  assert.equal(upcomingRelease(release, "America/New_York", new Date("2026-11-22T00:00:00Z")), null);
  assert.equal(upcomingRelease(release, "America/New_York", new Date("2026-11-20T23:59:59.500Z"))?.countdown, "00 : 00 : 01");
});
