import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, isAbsolute } from "node:path";
import { neon } from "@neondatabase/serverless";
import { list } from "@vercel/blob";
import { createBlobStore } from "../lib/crew/blob-store";
import { prepareCrewDatabase } from "../lib/crew/schema";

class OperationError extends Error {}

type RecordValue = { key: string; value: unknown; etag?: string };
type Backup = { createdAt: string; namespace: string; records: RecordValue[] };
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value !== null && typeof value === "object")
    return `{${Object.entries(value)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, val]) => `${JSON.stringify(key)}:${canonical(val)}`)
      .join(",")}}`;
  return JSON.stringify(value);
}
function checksum(records: RecordValue[]) {
  return createHash("sha256")
    .update(
      canonical(
        records
          .map(({ key, value }) => ({ key, value }))
          .sort((a, b) => a.key.localeCompare(b.key)),
      ),
    )
    .digest("hex");
}
function report(records: RecordValue[]) {
  return {
    records: records.length,
    accounts: records.filter((r) => r.key.startsWith("accounts/")).length,
    checksum: checksum(records),
  };
}
async function snapshot(namespace: string) {
  const store = createBlobStore(namespace);
  const records: RecordValue[] = [];
  let cursor: string | undefined;
  do {
    const page = await list({ prefix: `${namespace}/`, cursor, limit: 1000 });
    for (const blob of page.blobs) {
      if (!blob.pathname.endsWith(".json"))
        throw new OperationError("Unexpected legacy record type");
      const key = blob.pathname.slice(namespace.length + 1, -5);
      const saved = await store.read(key);
      if (!saved)
        throw new OperationError(
          "Legacy records changed during snapshot; retry while paused",
        );
      records.push({ key, ...saved });
    }
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  return records;
}
async function main() {
  const [command, namespace, file] = process.argv.slice(2);
  if (!/^(crew-(?:preview-|development-)?v1)$/.test(namespace ?? ""))
    throw new OperationError(
      "Pass an explicit crew-v1, crew-preview-v1 or crew-development-v1 namespace",
    );
  if (command === "snapshot") {
    if (!file || !isAbsolute(file) || file.startsWith(`${process.cwd()}/`))
      throw new OperationError(
        "Save private backups to an absolute path outside the repository",
      );
    const first = await snapshot(namespace);
    const records = await snapshot(namespace);
    if (checksum(first) !== checksum(records))
      throw new OperationError(
        "Source changed. Pause account writes and take a fresh snapshot",
      );
    await mkdir(dirname(file), { recursive: true, mode: 0o700 });
    const backup: Backup = {
      createdAt: new Date().toISOString(),
      namespace,
      records,
    };
    await writeFile(file, JSON.stringify(backup), { mode: 0o600, flag: "wx" });
    console.log(JSON.stringify({ action: "snapshot", ...report(records) }));
    return;
  }
  const url = process.env.DATABASE_URL;
  if (!url) throw new OperationError("DATABASE_URL must be set server-side");
  if (command === "prepare") {
    await prepareCrewDatabase(url);
    console.log("Crew database schema ready");
    return;
  }
  const sql = neon(url);
  const load = async () =>
    (await sql`
    SELECT key, value FROM crimex_crew_records WHERE namespace = ${namespace}
  `) as RecordValue[];
  if (command === "audit") {
    console.log(JSON.stringify({ action: command, ...report(await load()) }));
    return;
  }
  if (!["import", "verify"].includes(command) || !file)
    throw new OperationError(
      "Use prepare, snapshot, import, verify or audit with an explicit namespace",
    );
  const backup: Backup = JSON.parse(await readFile(file, "utf8"));
  if (
    backup.namespace !== namespace ||
    !Array.isArray(backup.records) ||
    new Set(backup.records.map((r) => r.key)).size !== backup.records.length
  )
    throw new OperationError("Invalid backup or namespace mismatch");
  const current = await load();
  const source = new Map(
    backup.records.map((r) => [r.key, canonical(r.value)]),
  );
  if (current.some((r) => source.get(r.key) !== canonical(r.value)))
    throw new OperationError(
      "Target contains different or additional records. Import refused; nothing overwritten",
    );
  if (command === "import") {
    // Never overwrite a newer wallet. Retrying a partial import is safe.
    for (let i = 0; i < backup.records.length; i += 100) {
      await sql.transaction(
        backup.records.slice(i, i + 100).map(
          ({ key, value }) => sql`
        INSERT INTO crimex_crew_records (namespace, key, value)
        VALUES (${namespace}, ${key}, ${JSON.stringify(value)}::jsonb)
        ON CONFLICT (namespace, key) DO NOTHING
      `,
        ),
      );
    }
  }
  const saved = await load();
  if (checksum(saved) !== checksum(backup.records))
    throw new OperationError(
      "Verification failed. Keep the legacy backend active and investigate",
    );
  console.log(
    JSON.stringify({ action: command, verified: true, ...report(saved) }),
  );
}
main().catch((error) => {
  // Driver errors may contain connection details. Do not log their body or URL.
  console.error(
    error instanceof OperationError
      ? error.message
      : "Crew storage operation failed; inspect privately",
  );
  process.exitCode = 1;
});
