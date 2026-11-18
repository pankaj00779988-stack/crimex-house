import { neon } from "@neondatabase/serverless";
import { crewConfig, CrewError, type Account } from "./model";
import { crewNamespace } from "./store";
import { verificationStatus } from "./verification";

export interface CrewMember {
  handle: string;
  createdAt: string;
  balance: number;
  weeklyPoints: number;
  publicRanking: boolean;
  status: "pending" | "approved" | "revoked";
  reviewedAt?: string;
  method?: "owner" | "instagram";
}
export async function crewDirectory(
  input: { search: string; status: string; cursor: string },
  options = { url: process.env.DATABASE_URL, namespace: crewNamespace() },
) {
  if (!options.url)
    throw new CrewError("Crew directory is temporarily unavailable.", 503);
  const search = input.search.trim().toLowerCase().replace(/^@/, "");
  if (
    !/^[a-z0-9._]{0,30}$/.test(search) ||
    !["pending", "approved", "revoked", "all"].includes(input.status) ||
    (input.cursor && !/^@[a-z0-9._]{1,30}$/.test(input.cursor))
  )
    throw new CrewError("Invalid directory filters.");
  const sql = neon(options.url);
  const rows = await sql`
    WITH members AS (
      SELECT value, CASE WHEN value ? 'verification' THEN
        value#>>'{verification,status}' = 'approved' AND value#>>'{verification,code}' = value->>'verificationCode'
      ELSE EXISTS (
        SELECT 1 FROM jsonb_to_recordset(${JSON.stringify(crewConfig.verifiedCrew)}::jsonb) AS p(handle text, code text)
        WHERE lower(p.handle) = value->>'handle' AND p.code = value->>'verificationCode'
      ) END AS approved
      FROM crimex_crew_records WHERE namespace = ${options.namespace} AND starts_with(key, 'accounts/')
        AND key <> 'accounts/' || coalesce((SELECT value->>'accountId' FROM crimex_crew_records
          WHERE namespace = ${options.namespace} AND key = 'owner/access-v1'), '')
    ) SELECT value FROM members
    WHERE (${search} = '' OR starts_with(value->>'handle', ${"@" + search}))
      AND (${input.cursor} = '' OR value->>'handle' > ${input.cursor})
      AND (${input.status} = 'all' OR
        (${input.status} = 'approved' AND approved) OR
        (${input.status} = 'revoked' AND NOT approved AND value#>>'{verification,status}' = 'revoked') OR
        (${input.status} = 'pending' AND NOT approved AND coalesce(value#>>'{verification,status}', '') <> 'revoked'))
    ORDER BY value->>'handle' ASC LIMIT 26
  `;
  const { period, weeklyScore } = await import("./model");
  const week = period().week;
  const members: CrewMember[] = rows.slice(0, 25).map(({ value }) => {
    const a = value as Account;
    return {
      handle: a.handle,
      createdAt: a.createdAt,
      balance: a.balance,
      weeklyPoints: weeklyScore(a, week).points,
      publicRanking: a.publicRanking,
      status: verificationStatus(a),
      reviewedAt: a.verification?.at,
      method: a.verification?.method,
    };
  });
  return {
    members,
    nextCursor: rows.length > 25 ? members.at(-1)!.handle : null,
  };
}
