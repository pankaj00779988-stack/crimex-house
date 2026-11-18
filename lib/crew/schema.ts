import { neon } from "@neondatabase/serverless";

// Run explicitly during setup, never from a visitor request.
export async function prepareCrewDatabase(databaseUrl: string) {
  const sql = neon(databaseUrl);
  await sql`
    CREATE TABLE IF NOT EXISTS crimex_crew_records (
      namespace text NOT NULL,
      key text NOT NULL,
      value jsonb NOT NULL,
      revision uuid NOT NULL DEFAULT gen_random_uuid(),
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (namespace, key)
    )
  `;
}
