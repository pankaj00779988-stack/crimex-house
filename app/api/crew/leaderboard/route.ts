import { guarded, response } from "@/lib/crew/http";
import { leaderboard, signingSecret } from "@/lib/crew/service";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
let cached: {
  expires: number;
  value: Awaited<ReturnType<typeof leaderboard>>;
} | null = null;
export async function GET() {
  return guarded(async () => {
    signingSecret();
    if (!cached || cached.expires <= Date.now())
      cached = { value: await leaderboard(), expires: Date.now() + 60_000 };
    return response(cached.value);
  });
}
