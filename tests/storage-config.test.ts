import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import {
  crewNamespace,
  privateStore,
  storageConfigured,
} from "../lib/crew/store";
import { signingSecret } from "../lib/crew/service";
import { CrewError } from "../lib/crew/model";

test("database configuration never falls back to legacy balances, and environments are isolated", async () => {
  const previous = { ...process.env };
  try {
    process.env.BLOB_READ_WRITE_TOKEN = "test-only-legacy-token";
    delete process.env.DATABASE_URL;
    delete process.env.CREW_STORAGE_BACKEND;
    assert.equal(storageConfigured(), false);
    await assert.rejects(
      privateStore.read("accounts/test"),
      (e) => e instanceof CrewError && e.status === 503,
    );
    process.env.CREW_STORAGE_BACKEND = "postgres";
    assert.equal(storageConfigured(), false);
    await assert.rejects(
      privateStore.read("accounts/test"),
      (e) => e instanceof CrewError && e.status === 503,
    );
    process.env.CREW_STORAGE_BACKEND = "unknown";
    assert.equal(storageConfigured(), false);
    await assert.rejects(
      privateStore.read("accounts/test"),
      (e) => e instanceof CrewError && e.status === 503,
    );
    process.env.VERCEL_ENV = "production";
    assert.equal(crewNamespace(), "crew-v1");
    process.env.VERCEL_ENV = "preview";
    assert.equal(crewNamespace(), "crew-preview-v1");
    delete process.env.VERCEL_ENV;
    assert.equal(crewNamespace(), "crew-development-v1");
  } finally {
    process.env = previous;
  }
});

test("explicit signing secret preserves tickets from the legacy storage secret", () => {
  const previous = { ...process.env };
  try {
    delete process.env.CREW_SIGNING_SECRET;
    process.env.BLOB_READ_WRITE_TOKEN = "test-only-legacy-token";
    const original = signingSecret();
    assert.equal(
      original,
      createHmac("sha256", process.env.BLOB_READ_WRITE_TOKEN)
        .update("crimex-crew-signing-v1")
        .digest("hex"),
    );
    process.env.CREW_SIGNING_SECRET = original;
    delete process.env.BLOB_READ_WRITE_TOKEN;
    assert.equal(signingSecret(), original);
  } finally {
    process.env = previous;
  }
});
