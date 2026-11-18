import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { neon } from "@neondatabase/serverless";
import { createPostgresStore } from "../lib/crew/postgres-store";
import { prepareCrewDatabase } from "../lib/crew/schema";
import { award, crewConfig, type Account } from "../lib/crew/model";
import {
  accountId,
  createAccount,
  leaderboard,
  redeemReward,
} from "../lib/crew/service";
import { reviewCrew } from "../lib/crew/verification";
import { crewDirectory } from "../lib/crew/directory";
import { requireOwner, setUpOwner } from "../lib/crew/owner";

test("real Neon: owner grants, private directory pagination and immediate ranking eligibility", async () => {
  assert.equal(process.env.CREW_DATABASE_TEST, "1");
  assert.notEqual(process.env.VERCEL_ENV, "production");
  assert.ok(process.env.DATABASE_URL);
  const url = process.env.DATABASE_URL;
  const namespace = `qa-owner-${randomUUID()}`;
  const sql = neon(url);
  await prepareCrewDatabase(url);
  const store = createPostgresStore(url, namespace);
  const token = randomUUID();
  process.env.CREW_OWNER_SETUP_TOKEN_HASH = createHash("sha256")
    .update(token)
    .digest("hex");
  const password = "private QA owner database password";
  const now = new Date();
  const approvals = crewConfig.verifiedCrew as {
    handle: string;
    code: string;
  }[];
  const original = [...approvals];
  try {
    const owner = await setUpOwner({ token, password }, store, now);
    assert.equal(
      (await requireOwner(owner.cookie, store, now)).handle,
      "@crimex.house",
    );
    const members: Awaited<ReturnType<typeof createAccount>>[] = [];
    for (let start = 0; start < 28; start += 7) {
      members.push(
        ...(await Promise.all(
          Array.from({ length: Math.min(7, 28 - start) }, (_, j) =>
            createAccount(
              {
                handle: `@directory.${String(start + j).padStart(2, "0")}`,
                password,
                publicRanking: start + j !== 2,
              },
              store,
              now,
            ),
          ),
        )),
      );
    }
    const account = async (i: number) =>
      (await store.read<Account>(
        `accounts/${accountId(members[i].account.handle)}`,
      ))!;
    for (let i = 0; i < 6; i++) {
      const saved = await account(i);
      const at = new Date(now.getTime() + i * 1000);
      if (i === 5) award(saved.value, "briefing", at);
      else
        for (const id of ["cipher", "briefing", "memory"] as const)
          award(saved.value, id, at);
      await store.write(`accounts/${saved.value.id}`, saved.value, saved.etag);
      if ([0, 1, 2, 4].includes(i))
        await reviewCrew(
          {
            action: "approve",
            handle: saved.value.handle,
            createdAt: saved.value.createdAt,
            code: saved.value.verificationCode,
            handleChecked: true,
            followerChecked: true,
          },
          "owner",
          store,
          at,
        );
      if (i === 4)
        await reviewCrew(
          {
            action: "revoke",
            handle: saved.value.handle,
            createdAt: saved.value.createdAt,
          },
          "owner",
          store,
          at,
        );
      if (i === 5)
        approvals.push({
          handle: saved.value.handle,
          code: saved.value.verificationCode,
        });
    }
    const first = await crewDirectory(
      { search: "directory.", status: "all", cursor: "" },
      { url, namespace },
    );
    assert.equal(first.members.length, 25);
    assert.equal(first.nextCursor, "@directory.24");
    const second = await crewDirectory(
      { search: "directory.", status: "all", cursor: first.nextCursor! },
      { url, namespace },
    );
    assert.equal(second.members.length, 3);
    assert.equal(second.nextCursor, null);
    assert.equal(first.members[0].status, "approved");
    assert.equal(first.members[3].status, "pending");
    assert.equal(first.members[4].status, "revoked");
    for (const key of [
      "passwordHash",
      "salt",
      "sessions",
      "verificationCode",
      "recoveryHash",
    ])
      assert.equal(JSON.stringify(first).includes(key), false);
    const approved = await crewDirectory(
      { search: "", status: "approved", cursor: "" },
      { url, namespace },
    );
    assert.equal(approved.members.length, 4);
    const all = await crewDirectory(
      { search: "", status: "all", cursor: "" },
      { url, namespace },
    );
    assert.equal(
      all.members.some((m) => m.handle === "@crimex.house"),
      false,
    );
    const ranked = await leaderboard(store, now);
    assert.deepEqual(
      ranked.entries.map((m) => [m.handle, m.points]),
      [
        ["@directory.00", 50],
        ["@directory.01", 50],
        ["@directory.05", 10],
      ],
    );
    await redeemReward(members[0].cookie, crewConfig.reward.id, store, now);
    assert.equal((await account(0)).value.balance, 10);
    assert.equal((await leaderboard(store, now)).entries[0].points, 50);
    const saved = (await account(0)).value;
    await reviewCrew(
      { action: "revoke", handle: saved.handle, createdAt: saved.createdAt },
      "owner",
      store,
      now,
    );
    assert.equal(
      (await leaderboard(store, now)).entries.some(
        (m) => m.handle === saved.handle,
      ),
      false,
    );
  } finally {
    approvals.splice(0, approvals.length, ...original);
    await sql`DELETE FROM crimex_crew_records WHERE namespace = ${namespace}`;
    assert.equal(
      (
        await sql`SELECT key FROM crimex_crew_records WHERE namespace = ${namespace}`
      ).length,
      0,
    );
  }
});
