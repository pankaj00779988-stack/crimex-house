import type { NextRequest } from "next/server";
import { guarded, readBody, response, session } from "@/lib/crew/http";
import { redeemReward, signingSecret } from "@/lib/crew/service";
export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  return guarded(async () => {
    signingSecret();
    const input = await readBody(request);
    return response(
      await redeemReward(session(request), String(input.rewardId ?? "")),
    );
  });
}
