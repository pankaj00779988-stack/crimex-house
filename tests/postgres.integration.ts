import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { neon } from "@neondatabase/serverless";
import { createPostgresStore } from "../lib/crew/postgres-store";
import { prepareCrewDatabase } from "../lib/crew/schema";
import { Conflict, mutate } from "../lib/crew/store";
import { CrewError, crewConfig, type Account } from "../lib/crew/model";
import {
  authenticate,
  challenge,
  claim,
  createAccount,
  deleteAccount,
  login,
  recover,
  redeemReward,
} from "../lib/crew/service";

test("real Neon: conditional writes, concurrency, account continuity and reward rules", async (t) => {
  assert.equal(
    process.env.CREW_DATABASE_TEST,
    "1",
    "Enable database tests explicitly",
  );
  assert.notEqual(
    process.env.VERCEL_ENV,
    "production",
    "Never test against production",
  );
  assert.ok(process.env.DATABASE_URL);
  const url = process.env.DATABASE_URL;
  const namespace = `qa-${randomUUID()}`;
  const sql = neon(url);
  await prepareCrewDatabase(url);
  const store = createPostgresStore(url, namespace);
  const now = new Date();
  const later = new Date(now.getTime() + 20_000);
  const secret = "database-test-only-secret";
  const password = "database integration password";
  try {
    await t.test(
      "only one concurrent create wins; stale writes and deletes are rejected",
      async () => {
        const results = await Promise.allSettled(
          Array.from({ length: 6 }, () => store.write("cas", { count: 0 })),
        );
        assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
        assert.ok(
          results
            .filter((r) => r.status === "rejected")
            .every((r) => r.reason instanceof Conflict),
        );
        const first = (await store.read("cas"))!;
        await store.write("cas", { count: 1 }, first.etag);
        await assert.rejects(
          store.write("cas", { count: 99 }, first.etag),
          Conflict,
        );
        await assert.rejects(
          store.remove("cas", first.etag),
          (e) => e instanceof CrewError && e.status === 409,
        );
        const second = (await store.read("cas"))!;
        await store.remove("cas", second.etag);
        await store.write("cas", { count: 0 });
        await assert.rejects(
          store.write("cas", { count: 99 }, first.etag),
          Conflict,
        );
        await assert.rejects(
          store.remove("cas", first.etag),
          (e) => e instanceof CrewError && e.status === 409,
        );
      },
    );
    await t.test(
      "simultaneous different updates preserve every change",
      async () => {
        await Promise.all(
          Array.from({ length: 5 }, () =>
            mutate<{ count: number }, void>(store, "cas", (value) => ({
              value: { count: (value?.count ?? 0) + 1 },
              result: undefined,
            })),
          ),
        );
        assert.equal(
          (await store.read<{ count: number }>("cas"))!.value.count,
          5,
        );
      },
    );
    const member = await createAccount(
      {
        handle: `@qa.${randomUUID().slice(0, 8)}`,
        password,
        publicRanking: true,
      },
      store,
      now,
    );
    const id = member.cookie.split(".")[0];
    const key = `accounts/${id}`;
    await t.test(
      "JSON roundtrip preserves hashes, recovery and secure-session identity",
      async () => {
        const original = (await store.read<Account>(key))!;
        const independent = createPostgresStore(url, namespace);
        assert.deepEqual(
          (await independent.read<Account>(key))!.value,
          original.value,
        );
        assert.equal(
          (await authenticate(member.cookie, independent, now)).account.id,
          id,
        );
        assert.equal(
          (
            await login(
              { handle: original.value.handle, password },
              independent,
              now,
            )
          ).account.balance,
          0,
        );
      },
    );
    await t.test(
      "concurrent claim replays earn exactly 15 credits and pending members cannot redeem",
      async () => {
        const p = await challenge(member.cookie, "cipher", secret, store, now);
        const [a, b, c] = p.prompt.match(/\d+/g)!.map(Number);
        await Promise.all(
          Array.from({ length: 5 }, () =>
            claim(
              member.cookie,
              {
                ticket: p.ticket,
                answer: String(a * b + c).padStart(4, "0"),
                credits: 999999,
              },
              secret,
              store,
              later,
            ),
          ),
        );
        const saved = (await store.read<Account>(key))!.value;
        assert.equal(saved.balance, 15);
        assert.equal(saved.earned, 15);
        assert.equal(saved.transactions.length, 1);
        await assert.rejects(
          redeemReward(member.cookie, crewConfig.reward.id, store, later),
          (e) => e instanceof CrewError && e.status === 403,
        );
      },
    );
    await t.test(
      "simultaneous approved redemptions spend once; recovery retains the wallet",
      async () => {
        const saved = (await store.read<Account>(key))!;
        saved.value.balance = 50;
        saved.value.earned = 50;
        await store.write(key, saved.value, saved.etag);
        const approvals = crewConfig.verifiedCrew as {
          handle: string;
          code: string;
        }[];
        approvals.push({
          handle: saved.value.handle,
          code: saved.value.verificationCode,
        });
        try {
          await Promise.all(
            Array.from({ length: 4 }, () =>
              redeemReward(member.cookie, crewConfig.reward.id, store, later),
            ),
          );
          const redeemed = (await store.read<Account>(key))!.value;
          assert.equal(redeemed.balance, 10);
          assert.equal(redeemed.spent, 40);
          assert.equal(redeemed.rewards.length, 1);
          assert.equal(redeemed.earned, 50);
          const restored = await recover(
            {
              handle: saved.value.handle,
              password,
              recoveryCode: member.recoveryCode,
            },
            store,
            later,
          );
          assert.equal(restored.account.balance, 10);
          await assert.rejects(
            authenticate(member.cookie, store, later),
            /session expired/,
          );
          await deleteAccount(restored.cookie, password, store, later);
          assert.equal(await store.read(key), null);
        } finally {
          approvals.splice(
            approvals.findIndex((a) => a.handle === saved.value.handle),
            1,
          );
        }
      },
    );
  } finally {
    await sql`DELETE FROM crimex_crew_records WHERE namespace = ${namespace}`;
    assert.equal(
      (
        await sql`SELECT key FROM crimex_crew_records WHERE namespace = ${namespace}`
      ).length,
      0,
    );
  }
});
