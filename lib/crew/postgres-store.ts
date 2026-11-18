import { neon } from "@neondatabase/serverless";
import { CrewError } from "./model";
import { Conflict, type CrewStore, type Stored } from "./store-types";

export function createPostgresStore(
  databaseUrl: string,
  namespace: string,
): CrewStore {
  const sql = neon(databaseUrl);
  return {
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
