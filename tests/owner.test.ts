import { test } from "node:test";
import { NextRequest } from "next/server";
import { POST as ownerPost } from "../app/api/owner/route";
import { POST as crewAuthPost } from "../app/api/crew/auth/route";
import { POST as webhookPost } from "../app/api/instagram/webhook/route";
import assert from "node:assert/strict";
import { createHash, createHmac } from "node:crypto";
import { Conflict, type CrewStore, type Stored } from "../lib/crew/store";
import { award, CrewError, isVerified, type Account } from "../lib/crew/model";
import {
  accountId,
  authenticate,
  createAccount,
  deleteAccount,
  recover,
} from "../lib/crew/service";
import {
  OWNER_KEY,
  ownerSetupAvailable,
  requireOwner,
  setUpOwner,
} from "../lib/crew/owner";
import { reviewCrew } from "../lib/crew/verification";
import {
  connectInstagram,
  decryptConnection,
  instagramStatus,
  processInstagramWebhook,
  toggleInstagram,
  verifyInstagramCallback,
} from "../lib/crew/instagram";

class MemoryStore implements CrewStore {
  data = new Map<string, Stored<unknown>>();
  revision = 0;
  async read<T>(key: string) {
    return structuredClone(this.data.get(key) ?? null) as Stored<T> | null;
  }
  async write<T>(key: string, value: T, etag?: string) {
    const old = this.data.get(key);
    if (old ? old.etag !== etag : !!etag) throw new Conflict();
    this.data.set(key, {
      value: structuredClone(value),
      etag: String(++this.revision),
    });
  }
  async remove(key: string, etag: string) {
    if (this.data.get(key)?.etag !== etag) throw new Conflict();
    this.data.delete(key);
  }
}
const now = new Date("2026-11-18T15:00:00Z");
const password = "owner test website password";
const setupToken = "unit-test-setup-token-never-used-on-a-deployment";
process.env.CREW_OWNER_SETUP_TOKEN_HASH = createHash("sha256")
  .update(setupToken)
  .digest("hex");
process.env.CREW_SIGNING_SECRET = "unit-only-stable-encryption-key";
test("owner routes reject outsiders and cross-origin changes; oversized webhook bodies are bounded", async () => {
  const url = "https://crimexhouse.vercel.app/api/owner";
  const request = (origin: string, mode = "approve") =>
    new NextRequest(url, {
      method: "POST",
      headers: { origin, "Content-Type": "application/json" },
      body: JSON.stringify({ action: mode }),
    });
  assert.equal((await ownerPost(request("https://other.example"))).status, 403);
  assert.equal(
    (await ownerPost(request("https://crimexhouse.vercel.app"))).status,
    401,
  );
  const invalid = new NextRequest(url, {
    method: "POST",
    headers: {
      origin: "https://crimexhouse.vercel.app",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ mode: "setup", token: "invalid", password }),
  });
  assert.equal((await ownerPost(invalid)).status, 403);
  const squat = new NextRequest(
    "https://crimexhouse.vercel.app/api/crew/auth",
    {
      method: "POST",
      headers: {
        origin: "https://crimexhouse.vercel.app",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        mode: "register",
        handle: "@CRIMEX.HOUSE",
        password,
        publicRanking: true,
        owner: true,
      }),
    },
  );
  assert.equal((await crewAuthPost(squat)).status, 403);
  const oversized = new NextRequest(
    "https://crimexhouse.vercel.app/api/instagram/webhook",
    {
      method: "POST",
      body: "x".repeat(65537),
      headers: { "Content-Type": "application/json" },
    },
  );
  assert.equal((await webhookPost(oversized)).status, 413);
});
async function member(store: CrewStore, handle = "@test.member") {
  const joined = await createAccount(
    { handle, password, publicRanking: true },
    store,
    now,
  );
  const key = `accounts/${accountId(handle)}`;
  return { ...joined, key, saved: (await store.read<Account>(key))!.value };
}
const status = (expected: number) => (e: unknown) =>
  e instanceof CrewError && e.status === expected;

test("owner setup requires a private one-time token and does not trust a claimed handle", async () => {
  const store = new MemoryStore();
  assert.equal(await ownerSetupAvailable(store), true);
  await assert.rejects(
    setUpOwner({ token: "wrong", password }, store, now),
    status(403),
  );
  assert.equal(store.data.size, 0);
  const impersonator = await member(store, "@crimex.house");
  await assert.rejects(
    requireOwner(impersonator.cookie, store, now),
    status(403),
  );
  await assert.rejects(
    setUpOwner({ token: setupToken, password: "wrong" }, store, now),
    status(401),
  );
  const owner = await setUpOwner({ token: setupToken, password }, store, now);
  assert.equal(
    (await requireOwner(owner.cookie, store, now)).handle,
    "@crimex.house",
  );
  assert.equal(await ownerSetupAvailable(store), false);
  await assert.rejects(
    setUpOwner({ token: setupToken, password }, store, now),
    status(409),
  );
  const outsider = await member(store);
  await assert.rejects(requireOwner(outsider.cookie, store, now), status(403));
  await assert.rejects(requireOwner(undefined, store, now), status(401));
});
test("owner recovery preserves access; deletion and account recreation cannot bypass the role binding", async () => {
  const store = new MemoryStore();
  const owner = await setUpOwner({ token: setupToken, password }, store, now);
  assert.ok("recoveryCode" in owner);
  const recovered = await recover(
    { handle: "@crimex.house", password, recoveryCode: owner.recoveryCode },
    store,
    now,
  );
  assert.equal(
    (await requireOwner(recovered.cookie, store, now)).handle,
    "@crimex.house",
  );
  await assert.rejects(requireOwner(owner.cookie, store, now), status(401));
  await assert.rejects(
    deleteAccount(recovered.cookie, password, store, now),
    status(409),
  );
  const key = `accounts/${accountId("@crimex.house")}`;
  const stored = (await store.read<Account>(key))!;
  await store.remove(key, stored.etag); // Simulate an operator deletion outside the application.
  const replacement = await member(store, "@crimex.house");
  await assert.rejects(
    requireOwner(replacement.cookie, store, now),
    status(403),
  );
});
test("approval checks the actual DM code, both confirmations and account instance without changing wallet data", async () => {
  const store = new MemoryStore();
  const m = await member(store);
  award(m.saved, "cipher", now);
  const initial = (await store.read<Account>(m.key))!;
  await store.write(m.key, m.saved, initial.etag);
  const input = {
    action: "approve",
    handle: m.saved.handle,
    createdAt: m.saved.createdAt,
    code: m.saved.verificationCode,
    handleChecked: true,
    followerChecked: true,
  };
  await assert.rejects(
    reviewCrew({ ...input, code: "CREW-0000000000" }, "owner", store, now),
    status(409),
  );
  await assert.rejects(
    reviewCrew({ ...input, followerChecked: false }, "owner", store, now),
    status(400),
  );
  await assert.rejects(
    reviewCrew({ ...input, handleChecked: false }, "owner", store, now),
    status(400),
  );
  await assert.rejects(
    reviewCrew({ ...input, createdAt: "old-account" }, "owner", store, now),
    status(409),
  );
  await Promise.all(
    Array.from({ length: 4 }, () => reviewCrew(input, "owner", store, now)),
  );
  const approved = (await store.read<Account>(m.key))!.value;
  assert.equal(isVerified(approved), true);
  assert.equal(approved.verification?.history.length, 1);
  const { verification, ...unchanged } = approved;
  assert.equal(verification?.method, "owner");
  assert.deepEqual(unchanged, m.saved);
  await reviewCrew(
    { action: "revoke", handle: m.saved.handle, createdAt: m.saved.createdAt },
    "owner",
    store,
    now,
  );
  const revoked = (await store.read<Account>(m.key))!.value;
  assert.equal(isVerified(revoked), false);
  assert.equal(revoked.balance, 15);
  await assert.rejects(
    reviewCrew({ ...input, instagramId: "123456" }, "instagram", store, now),
    status(409),
  );
  await reviewCrew(input, "owner", store, now);
  assert.equal(isVerified((await store.read<Account>(m.key))!.value), true);
});

const instagramId = "123456789012345";
const senderId = "987654321012345";
const appSecret = "0123456789abcdef0123456789abcdef";
const accessToken = "unit-only-instagram-access-token-not-real";
async function botFixture() {
  const store = new MemoryStore();
  const m = await member(store);
  let profileCalls = 0;
  let follows: boolean | undefined = true;
  let username = m.saved.handle.slice(1);
  let providerFails = false;
  const fetcher: typeof fetch = async (url) => {
    if (new URL(String(url)).pathname.endsWith("/subscribed_apps"))
      return Response.json({ success: true });
    const basic =
      new URL(String(url)).searchParams.get("fields") === "user_id,username";
    if (!basic) profileCalls++;
    if (providerFails) return Response.json({ error: {} }, { status: 503 });
    return Response.json(
      basic
        ? {
            id: "111111111111111",
            user_id: instagramId,
            username: "crimex.house",
          }
        : {
            username,
            ...(follows === undefined
              ? {}
              : { is_user_follow_business: follows }),
          },
    );
  };
  await connectInstagram(
    { accountId: instagramId, appSecret, accessToken },
    store,
    fetcher,
  );
  const ready = await instagramStatus(store);
  await verifyInstagramCallback(
    "subscribe",
    ready.verifyToken!,
    "12345",
    store,
  );
  await toggleInstagram(true, store, fetcher);
  const body = (
    mid: string,
    code = m.saved.verificationCode,
    account = instagramId,
  ) =>
    JSON.stringify({
      object: "instagram",
      entry: [
        {
          id: account,
          messaging: [
            {
              sender: { id: senderId },
              recipient: { id: account },
              timestamp: now.getTime(),
              message: { mid, text: code },
            },
          ],
        },
      ],
    });
  const sign = (s: string) =>
    `sha256=${createHmac("sha256", appSecret).update(s).digest("hex")}`;
  return {
    store,
    m,
    fetcher,
    body,
    sign,
    calls: () => profileCalls,
    set: (options: {
      follows?: boolean;
      omitFollows?: boolean;
      username?: string;
      providerFails?: boolean;
    }) => {
      follows = options.omitFollows ? undefined : (options.follows ?? true);
      username = options.username ?? m.saved.handle.slice(1);
      providerFails = options.providerFails ?? false;
    },
  };
}
test("Meta credentials are encrypted, the connection is account-bound, and a callback is required before activation", async () => {
  const store = new MemoryStore();
  const bad: typeof fetch = async () =>
    Response.json({
      id: "111111111111111",
      user_id: instagramId,
      username: "someone.else",
    });
  await assert.rejects(
    connectInstagram(
      { accountId: instagramId, appSecret, accessToken },
      store,
      bad,
    ),
    status(403),
  );
  assert.equal((await instagramStatus(store)).configured, false);
  const good: typeof fetch = async (url) =>
    new URL(String(url)).pathname.endsWith("/subscribed_apps")
      ? Response.json({ success: true })
      : Response.json({
          id: "111111111111111",
          user_id: instagramId,
          username: "crimex.house",
        });
  const connected = await connectInstagram(
    { accountId: instagramId, appSecret, accessToken },
    store,
    good,
  );
  assert.equal(connected.enabled, false);
  const raw = (await store.read<Parameters<typeof decryptConnection>[0]>(
    "owner/instagram-v1",
  ))!.value;
  assert.equal(JSON.stringify(raw).includes(accessToken), false);
  assert.equal(JSON.stringify(raw).includes(appSecret), false);
  assert.equal(decryptConnection(raw).accessToken, accessToken);
  assert.equal("accessToken" in connected, false);
  assert.equal("appSecret" in connected, false);
  assert.throws(() => decryptConnection({ ...raw, tag: "00".repeat(16) }));
  await assert.rejects(toggleInstagram(true, store), status(409));
  await assert.rejects(
    verifyInstagramCallback("subscribe", "wrong", "123", store),
    status(403),
  );
  assert.equal(
    await verifyInstagramCallback(
      "subscribe",
      connected.verifyToken!,
      "123",
      store,
    ),
    "123",
  );
  await toggleInstagram(true, store, good);
  assert.equal((await instagramStatus(store)).enabled, true);
});
test("enabling the bot requires a successful Meta account subscription and pause makes no provider call", async () => {
  const f = await botFixture();
  await toggleInstagram(false, f.store);
  const failed: typeof fetch = async () =>
    Response.json({ error: {} }, { status: 403 });
  await assert.rejects(toggleInstagram(true, f.store, failed), status(503));
  assert.equal((await instagramStatus(f.store)).enabled, false);
  const accepted: typeof fetch = async (url, init) => {
    const request = new URL(String(url));
    assert.equal(request.pathname, `/v27.0/${instagramId}/subscribed_apps`);
    assert.equal(request.searchParams.get("subscribed_fields"), "messages");
    assert.equal(init?.method, "POST");
    return Response.json({ success: true });
  };
  await toggleInstagram(true, f.store, accepted);
  assert.equal((await instagramStatus(f.store)).enabled, true);
  const noRequest: typeof fetch = async () => {
    throw new Error("Pause must not call Meta");
  };
  await toggleInstagram(false, f.store, noRequest);
  assert.equal((await instagramStatus(f.store)).enabled, false);
});
test("Meta connection discovers the professional user_id and rejects app-scoped or missing IDs", async () => {
  const store = new MemoryStore();
  const fetcher: typeof fetch = async (url) => {
    const request = new URL(String(url));
    assert.equal(request.pathname, "/v27.0/me");
    assert.equal(request.searchParams.get("fields"), "user_id,username");
    return Response.json({
      data: [
        {
          id: "111111111111111",
          user_id: instagramId,
          username: "crimex.house",
        },
      ],
    });
  };
  const connected = await connectInstagram(
    { appSecret, accessToken },
    store,
    fetcher,
  );
  assert.equal(connected.accountId, instagramId);
  await assert.rejects(
    connectInstagram(
      { accountId: "111111111111111", appSecret, accessToken },
      store,
      fetcher,
    ),
    status(403),
  );
  const missingId: typeof fetch = async () =>
    Response.json({ id: instagramId, username: "crimex.house" });
  await assert.rejects(
    connectInstagram({ appSecret, accessToken }, new MemoryStore(), missingId),
    status(403),
  );
});
test("webhooks reject forged signatures, ignore other accounts and enforce the paused state", async () => {
  const f = await botFixture();
  const body = f.body("signed-message");
  await assert.rejects(
    processInstagramWebhook(body, null, f.store, f.fetcher, now),
    status(403),
  );
  await assert.rejects(
    processInstagramWebhook(body + " ", f.sign(body), f.store, f.fetcher, now),
    status(403),
  );
  const other = f.body("other-account", undefined, "111111111111111");
  await processInstagramWebhook(other, f.sign(other), f.store, f.fetcher, now);
  await toggleInstagram(false, f.store);
  await processInstagramWebhook(body, f.sign(body), f.store, f.fetcher, now);
  assert.equal(f.calls(), 0);
  assert.equal(
    isVerified((await f.store.read<Account>(f.m.key))!.value),
    false,
  );
});
test("DM verification requires a real follower, matching sender handle and CREW code, and deduplicates successful delivery", async () => {
  const f = await botFixture();
  for (const [mid, options] of [
    ["not-following", { follows: false }],
    ["missing-follow", { omitFollows: true }],
    ["other-handle", { username: "wrong.person" }],
  ] as const) {
    f.set(options);
    const body = f.body(mid);
    await processInstagramWebhook(body, f.sign(body), f.store, f.fetcher, now);
    assert.equal(
      isVerified((await f.store.read<Account>(f.m.key))!.value),
      false,
    );
  }
  f.set({});
  const wrong = f.body("wrong-code", "CREW-0000000000");
  await processInstagramWebhook(wrong, f.sign(wrong), f.store, f.fetcher, now);
  assert.equal(
    isVerified((await f.store.read<Account>(f.m.key))!.value),
    false,
  );
  const valid = f.body("valid");
  await processInstagramWebhook(valid, f.sign(valid), f.store, f.fetcher, now);
  const calls = f.calls();
  await processInstagramWebhook(valid, f.sign(valid), f.store, f.fetcher, now);
  assert.equal(f.calls(), calls);
  const approved = (await f.store.read<Account>(f.m.key))!.value;
  assert.equal(isVerified(approved), true);
  assert.equal(approved.verification?.method, "instagram");
  assert.equal(approved.balance, 0);
  assert.equal(approved.verification?.history.length, 1);
});
test("temporary Meta failures are retryable and a bot cannot override an owner revocation", async () => {
  const f = await botFixture();
  const body = f.body("retry-message");
  f.set({ providerFails: true });
  await assert.rejects(
    processInstagramWebhook(body, f.sign(body), f.store, f.fetcher, now),
    status(503),
  );
  f.set({});
  await processInstagramWebhook(body, f.sign(body), f.store, f.fetcher, now);
  assert.equal(isVerified((await f.store.read<Account>(f.m.key))!.value), true);
  await reviewCrew(
    {
      action: "revoke",
      handle: f.m.saved.handle,
      createdAt: f.m.saved.createdAt,
    },
    "owner",
    f.store,
    now,
  );
  const retry = f.body("new-message-after-revocation");
  await processInstagramWebhook(retry, f.sign(retry), f.store, f.fetcher, now);
  assert.equal(
    isVerified((await f.store.read<Account>(f.m.key))!.value),
    false,
  );
  assert.ok(await authenticate(f.m.cookie, f.store, now));
  assert.equal(await f.store.read(OWNER_KEY), null);
});
