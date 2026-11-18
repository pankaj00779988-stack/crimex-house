import { neon } from "@neondatabase/serverless";
import { CrewError, type Account } from "./model";
import { Conflict, type CrewStore, type Stored } from "./store-types";

export function createPostgresStore(
  databaseUrl: string,
  namespace: string,
): CrewStore {
  const sql = neon(databaseUrl);
  return {
    async rankedAccounts(week, legacy) {
      const rows = await sql`
        WITH eligible AS (
          SELECT value FROM crimex_crew_records
          WHERE namespace = ${namespace} AND starts_with(key, 'accounts/')
            AND value->>'publicRanking' = 'true'
            AND CASE WHEN value ? 'verification' THEN
              value#>>'{verification,status}' = 'approved'
              AND value#>>'{verification,code}' = value->>'verificationCode'
            ELSE EXISTS (
              SELECT 1 FROM jsonb_to_recordset(${JSON.stringify(legacy)}::jsonb) AS p(handle text, code text)
              WHERE lower(p.handle) = value->>'handle' AND p.code = value->>'verificationCode'
            ) END
        ), scores AS (
          SELECT value,
            (SELECT coalesce(sum((t->>'amount')::int), 0)
             FROM jsonb_array_elements(value->'transactions') AS t
             WHERE t->>'week' = ${week} AND (t->>'amount')::int > 0) AS points,
            (SELECT t->>'at' FROM jsonb_array_elements(value->'transactions') WITH ORDINALITY AS x(t, n)
             WHERE t->>'week' = ${week} AND (t->>'amount')::int > 0
             ORDER BY n DESC LIMIT 1) AS reached_at
          FROM eligible
        )
        SELECT value FROM scores WHERE points > 0
        ORDER BY points DESC, reached_at ASC, value->>'handle' ASC LIMIT 10
      `;
      return rows.map((row) => row.value as Account);
    },
    async read<T>(key: string) {
      const rows = await sql`
        SELECT value, revision::text AS etag FROM crimex_crew_records
        WHERE namespace = ${namespace} AND key = ${key}
      `;
      return (rows[0] as Stored<T> | undefined) ?? null;
    },
    async write<T>(key: string, value: T, etag?: string) {
      const json = JSON.stringify(value);
      const rows = etag
        ? await sql`
            UPDATE crimex_crew_records
            SET value = ${json}::jsonb, revision = gen_random_uuid(), updated_at = now()
            WHERE namespace = ${namespace} AND key = ${key} AND revision::text = ${etag}
            RETURNING revision
          `
        : await sql`
            INSERT INTO crimex_crew_records (namespace, key, value)
            VALUES (${namespace}, ${key}, ${json}::jsonb)
            ON CONFLICT (namespace, key) DO NOTHING
            RETURNING revision
          `;
      if (rows.length !== 1) throw new Conflict();
    },
    async remove(key, etag) {
      const rows = await sql`
        DELETE FROM crimex_crew_records
        WHERE namespace = ${namespace} AND key = ${key} AND revision::text = ${etag}
        RETURNING revision
      `;
      if (rows.length !== 1)
        throw new CrewError(
          "Your account changed. Please retry deletion.",
          409,
        );
    },
  };
}
