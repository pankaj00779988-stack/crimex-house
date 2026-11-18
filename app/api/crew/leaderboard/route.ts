import { guarded, response } from "@/lib/crew/http";
import { leaderboard, signingSecret } from "@/lib/crew/service";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  return guarded(async () => {
    signingSecret();
    return response(await leaderboard());
  });
}
