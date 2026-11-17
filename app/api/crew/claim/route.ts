import type { NextRequest } from "next/server";
import { guarded, readBody, response, session } from "@/lib/crew/http";
import { claim, signingSecret } from "@/lib/crew/service";
export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  return guarded(async () =>
    response(
      await claim(session(request), await readBody(request), signingSecret()),
    ),
  );
}
