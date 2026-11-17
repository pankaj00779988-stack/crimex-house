import type { NextRequest } from "next/server";
import { guarded, response, session } from "@/lib/crew/http";
import { challenge, signingSecret } from "@/lib/crew/service";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  return guarded(async () =>
    response(
      await challenge(
        session(request),
        request.nextUrl.searchParams.get("mission") ?? "",
        signingSecret(),
      ),
    ),
  );
}
