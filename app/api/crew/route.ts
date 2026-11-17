import type { NextRequest } from "next/server";
import { guarded, response, session } from "@/lib/crew/http";
import { authenticate } from "@/lib/crew/service";
import { crewConfig, CrewError, period, publicAccount } from "@/lib/crew/model";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  return guarded(async () => {
    const configured = !!process.env.BLOB_READ_WRITE_TOKEN;
    let account = null;
    if (configured && session(request)) {
      try {
        account = publicAccount((await authenticate(session(request))).account);
      } catch (e) {
        if (!(e instanceof CrewError && e.status === 401)) throw e;
      }
    }
    return response({
      configured,
      account,
      ...period(),
      reward: crewConfig.reward,
    });
  });
}
