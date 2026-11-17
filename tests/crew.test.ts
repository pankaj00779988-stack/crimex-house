import { test } from "node:test";
import assert from "node:assert/strict";
import { checkChallenge, issueChallenge } from "../lib/crew/challenges";
import {
  award,
  crewConfig,
  isVerified,
  period,
  publicAccount,
  redeem,
  weeklyScore,
  type Account,
} from "../lib/crew/model";
import {
  accountId,
  authenticate,
  challenge,
  claim,
  createAccount,
  deleteAccount,
  leaderboard,
  login,
  logout,
  preferences,
  rateLimit,
  recover,
  redeemReward,
} from "../lib/crew/service";
import {
  Conflict,
  consistentSnapshot,
  type CrewStore,
  type Stored,
} from "../lib/crew/store";
import sharp from "sharp";
import { renderCrewWallpaper } from "../lib/crew/wallpaper";
class MemoryStore implements CrewStore {
  data = new Map<string, Stored<unknown>>();
  writes = 0;
  revision = 0;
  async read<T>(key: string) {
    await Promise.resolve();
    return structuredClone(this.data.get(key) ?? null) as Stored<T> | null;
  }
  async write<T>(key: string, value: T, etag?: string) {
    await Promise.resolve();
    const old = this.data.get(key);
    if (old ? old.etag !== etag : !!etag) throw new Conflict();
    this.data.set(key, {
      value: structuredClone(value),
      etag: String(++this.revision),
    });
    this.writes++;
  }
  async remove(key: string, etag: string) {
    if (this.data.get(key)?.etag !== etag) throw new Conflict();
    this.data.delete(key);
  }
}
const now = new Date("2026-11-17T15:00:00Z");
const later = new Date(now.getTime() + 20_000);
const secret = "test-only-secret-that-is-never-used-in-production";
async function joined(store = new MemoryStore(), name = "@crew.test") {
  const password = "a separate website password";
  const member = await createAccount(
    { handle: name, password, publicRanking: true },
    store,
    now,
  );
  return { store, ...member, password, id: accountId(name) };
}
function solution(p: ReturnType<typeof issueChallenge>): unknown {
  if (p.kind === "cipher") {
    const [a, b, c] = p.prompt.match(/\d+/g)!.map(Number);
    return String(a * b + c).padStart(4, "0");
  }
  if (p.kind === "briefing")
    return crewConfig.briefings.find((q) => q.scene === p.prompt)!.answer;
  const d = "deck" in p ? p.deck! : [];
  return [...new Set(d)].flatMap((s) =>
    d.flatMap((x, i) => (x === s ? [i] : [])),
  );
}
function approve(a: Account) {
  (crewConfig.verifiedCrew as { handle: string; code: string }[]).push({
    handle: a.handle,
    code: a.verificationCode,
  });
}
function clearApprovals() {
  crewConfig.verifiedCrew.splice(0);
}

test("daily and weekly boundaries use Eastern Time, including DST", () => {
  assert.equal(period(new Date("2026-11-16T04:59:59Z")).day, "2026-11-15");
  assert.equal(period(new Date("2026-11-16T04:59:59Z")).week, "2026-11-09");
  assert.equal(period(new Date("2026-11-16T05:00:00Z")).week, "2026-11-16");
  assert.equal(
    period(new Date("2026-03-08T06:00:00Z")).resetAt,
    "2026-03-09T04:00:00.000Z",
  );
  assert.equal(
    period(new Date("2026-11-01T04:30:00Z")).resetAt,
    "2026-11-02T05:00:00.000Z",
  );
});
test("website accounts store password hashes and expose only the private wallet view", async () => {
  const a = await joined();
  const stored = (await a.store.read<Account>(`accounts/${a.id}`))!.value;
  assert.notEqual(stored.passwordHash, a.password);
  assert.equal(stored.passwordHash.length, 64);
  assert.notEqual(stored.recoveryHash, a.recoveryCode);
  assert.equal(
    (await authenticate(a.cookie, a.store, now)).account.handle,
    "@crew.test",
  );
  for (const key of ["sessions", "passwordHash", "recoveryHash", "salt"])
    assert.equal(key in a.account, false);
  await assert.rejects(
    createAccount(
      { handle: "@CREW.TEST", password: a.password, publicRanking: true },
      a.store,
      now,
    ),
    /already has/,
  );
  await assert.rejects(
    authenticate(a.cookie.slice(0, -2) + "xx", a.store, now),
    /session expired/,
  );
  await assert.rejects(
    createAccount(
      { handle: "@short", password: "123", publicRanking: false },
      a.store,
      now,
    ),
    /12–128/,
  );
});
test("concurrent replayed claims award a daily mission exactly once", async () => {
  const a = await joined();
  const p = await challenge(a.cookie, "cipher", secret, a.store, now);
  const before = a.store.writes;
  await Promise.all(
    Array.from({ length: 4 }, () =>
      claim(
        a.cookie,
        { ticket: p.ticket, answer: solution(p), credits: 999999 },
        secret,
        a.store,
        later,
      ),
    ),
  );
  const saved = (await authenticate(a.cookie, a.store, later)).account;
  assert.equal(saved.balance, 15);
  assert.equal(saved.earned, 15);
  assert.equal(saved.transactions.length, 1);
  assert.equal(a.store.writes - before, 1);
});
test("expired, tampered, premature and cross-account challenge tickets are rejected", async () => {
  const a = await joined();
  const b = await joined(a.store, "@second.crew");
  const p = await challenge(a.cookie, "cipher", secret, a.store, now);
  assert.throws(
    () => checkChallenge(p.ticket, a.id, solution(p), secret, now),
    /moment/,
  );
  assert.throws(
    () => checkChallenge(p.ticket + "x", a.id, solution(p), secret, later),
    /Invalid/,
  );
  assert.throws(
    () => checkChallenge(p.ticket, b.id, solution(p), secret, later),
    /another account/,
  );
  assert.throws(
    () =>
      checkChallenge(
        p.ticket,
        a.id,
        solution(p),
        secret,
        new Date(now.getTime() + 16 * 60_000),
      ),
    /expired/,
  );
  const midnight = issueChallenge(
    a.id,
    "cipher",
    secret,
    new Date("2026-11-18T04:59:50Z"),
  );
  assert.throws(
    () =>
      checkChallenge(
        midnight.ticket,
        a.id,
        solution(midnight),
        secret,
        new Date("2026-11-18T05:00:01Z"),
      ),
    /expired/,
  );
});
test("five wrong answers block daily claims and a new day opens fresh attempts", async () => {
  const a = await joined();
  const p = await challenge(a.cookie, "cipher", secret, a.store, now);
  for (let i = 0; i < 5; i++)
    assert.equal(
      (
        await claim(
          a.cookie,
          { ticket: p.ticket, answer: "wrong" },
          secret,
          a.store,
          later,
        )
      ).incorrect,
      true,
    );
  await assert.rejects(
    claim(
      a.cookie,
      { ticket: p.ticket, answer: solution(p) },
      secret,
      a.store,
      later,
    ),
    /attempts are used/,
  );
  const tomorrow = new Date(now.getTime() + 86400_000),
    next = await challenge(a.cookie, "cipher", secret, a.store, tomorrow);
  await claim(
    a.cookie,
    { ticket: next.ticket, answer: solution(next) },
    secret,
    a.store,
    new Date(tomorrow.getTime() + 20_000),
  );
  assert.equal(
    (await authenticate(a.cookie, a.store, tomorrow)).account.balance,
    15,
  );
});
test("three daily missions award exactly 50 credits; malformed memory proofs fail", async () => {
  const a = await joined();
  for (const id of ["cipher", "briefing", "memory"]) {
    const p = await challenge(a.cookie, id, secret, a.store, now);
    await claim(
      a.cookie,
      { ticket: p.ticket, answer: solution(p) },
      secret,
      a.store,
      later,
    );
  }
  const saved = (await authenticate(a.cookie, a.store, later)).account;
  assert.equal(saved.balance, 50);
  assert.equal(
    publicAccount(saved, later).missions.filter((m) => m.completed).length,
    3,
  );
  const p = issueChallenge(a.id, "memory", secret, now);
  for (const answer of [
    [0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5],
    Array(12).fill(99),
    [0, 1],
  ])
    assert.equal(
      checkChallenge(p.ticket, a.id, answer, secret, later).correct,
      false,
    );
  assert.equal(award(saved, "memory", later), false);
});
test("follower confirmation matches both handle and proof code", async () => {
  const a = await joined();
  const raw = (await authenticate(a.cookie, a.store, now)).account;
  try {
    assert.equal(isVerified(raw), false);
    approve({ ...raw, verificationCode: "WRONG" });
    assert.equal(isVerified(raw), false);
    clearApprovals();
    approve(raw);
    assert.equal(isVerified(raw), true);
  } finally {
    clearApprovals();
  }
});
test("pending accounts cannot redeem and repeated concurrent redemption charges once", async () => {
  const a = await joined();
  for (const id of ["cipher", "briefing", "memory"]) {
    const p = await challenge(a.cookie, id, secret, a.store, now);
    await claim(
      a.cookie,
      { ticket: p.ticket, answer: solution(p) },
      secret,
      a.store,
      later,
    );
  }
  await assert.rejects(
    redeemReward(a.cookie, crewConfig.reward.id, a.store, later),
    /Confirm your Instagram/,
  );
  const raw = (await authenticate(a.cookie, a.store, later)).account;
  try {
    approve(raw);
    await Promise.all(
      Array.from({ length: 3 }, () =>
        redeemReward(a.cookie, crewConfig.reward.id, a.store, later),
      ),
    );
    const saved = (await authenticate(a.cookie, a.store, later)).account;
    assert.equal(saved.balance, 10);
    assert.equal(saved.spent, 40);
    assert.equal(saved.rewards.length, 1);
    assert.equal(weeklyScore(saved, period(later).week).points, 50);
    assert.equal(saved.transactions.filter((t) => t.amount < 0).length, 1);
  } finally {
    clearApprovals();
  }
});
test("insufficient credit cannot create a negative balance or reward entitlement", async () => {
  const a = await joined();
  const raw = (await authenticate(a.cookie, a.store, now)).account;
  assert.throws(
    () => redeem(raw, crewConfig.reward.id, now, true),
    /more credits/,
  );
  assert.equal(raw.balance, 0);
  assert.deepEqual(raw.rewards, []);
});
test("leaderboard shows only opted-in confirmed earners, with deterministic ties", async () => {
  const store = new MemoryStore();
  try {
    for (let i = 0; i < 12; i++) {
      const a = await joined(store, `@crew.${String(i).padStart(2, "0")}`);
      const raw = (await authenticate(a.cookie, store, now)).account;
      award(raw, "cipher", new Date(now.getTime() + i * 1000));
      approve(raw);
      await store.write(
        `accounts/${raw.id}`,
        raw,
        (await store.read(`accounts/${raw.id}`))!.etag,
      );
    }
    const hidden = await joined(store, "@private.crew");
    await preferences(hidden.cookie, false, store, now);
    const privateRaw = (await authenticate(hidden.cookie, store, now)).account;
    award(privateRaw, "memory", now);
    approve(privateRaw);
    await store.write(
      `accounts/${privateRaw.id}`,
      privateRaw,
      (await store.read(`accounts/${privateRaw.id}`))!.etag,
    );
    const result = await leaderboard(store, later);
    assert.equal(result.entries.length, 10);
    assert.equal(result.entries[0].handle, "@crew.00");
    assert.equal(
      result.entries.some((e) => e.handle === "@private.crew"),
      false,
    );
    assert.deepEqual(Object.keys(result.entries[0]).sort(), [
      "handle",
      "points",
      "rank",
    ]);
    assert.deepEqual(
      (await leaderboard(store, new Date("2026-11-23T05:00:00Z"))).entries,
      [],
    );
  } finally {
    clearApprovals();
  }
});
test("recovery rotates credentials and sessions, and sign-out revokes the session", async () => {
  const a = await joined();
  await logout(a.cookie, a.store, now);
  await assert.rejects(authenticate(a.cookie, a.store, now), /session expired/);
  const signed = await login(
    { handle: a.account.handle, password: a.password },
    a.store,
    now,
  );
  const recovered = await recover(
    {
      handle: a.account.handle,
      password: "a replacement website password",
      recoveryCode: a.recoveryCode,
    },
    a.store,
    later,
  );
  await assert.rejects(
    authenticate(signed.cookie, a.store, later),
    /session expired/,
  );
  await assert.rejects(
    recover(
      {
        handle: a.account.handle,
        password: a.password,
        recoveryCode: a.recoveryCode,
      },
      a.store,
      later,
    ),
    /incorrect/,
  );
  assert.equal(
    (await authenticate(recovered.cookie, a.store, later)).account.handle,
    a.account.handle,
  );
});
test("failed sign-ins are limited and deletion requires the current password", async () => {
  const a = await joined();
  for (let i = 0; i < 5; i++)
    await assert.rejects(
      login(
        { handle: a.account.handle, password: "incorrect password" },
        a.store,
        now,
      ),
      /incorrect/,
    );
  await assert.rejects(
    login({ handle: a.account.handle, password: a.password }, a.store, now),
    /temporarily paused/,
  );
  await assert.rejects(
    deleteAccount(a.cookie, "wrong", a.store, now),
    /Enter your website password/,
  );
  await deleteAccount(a.cookie, a.password, a.store, now);
  await assert.rejects(authenticate(a.cookie, a.store, now), /session expired/);
});
test("concurrent rate-limit checks cannot exceed their allocation", async () => {
  const store = new MemoryStore();
  const r = await Promise.allSettled(
    Array.from({ length: 6 }, () =>
      rateLimit(store, "test-ip", "join", 3, now, secret),
    ),
  );
  assert.equal(r.filter((x) => x.status === "fulfilled").length, 3);
});
test("personal Crew ID renders a downloadable portrait PNG", async () => {
  const image = await renderCrewWallpaper(
    "@a.very.long_crew_handle",
    "AB12CD34",
  );
  const metadata = await sharp(image).metadata();
  assert.equal(metadata.format, "png");
  assert.equal(metadata.width, 1080);
  assert.equal(metadata.height, 1920);
  assert.ok(image.byteLength > 10000);
});
test("missing delivery ETags never pair a stale body with a newer write revision", async () => {
  const bodies = ["stale", "changed-between-heads", "latest"];
  const versions = ["v1", "v2", "v2", "v2"];
  const result = await consistentSnapshot(
    async () => ({ value: bodies.shift(), etag: "" }),
    async () => versions.shift()!,
  );
  assert.deepEqual(result, { value: "latest", etag: "v2" });
});
test("missing revisions fail closed instead of overwriting an existing wallet", async () => {
  await assert.rejects(
    consistentSnapshot(
      async () => ({ value: { balance: 50 }, etag: "" }),
      async () => "",
    ),
    /changed while it was loading/,
  );
});
