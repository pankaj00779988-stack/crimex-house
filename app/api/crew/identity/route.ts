import type { NextRequest } from "next/server";
import { guarded, response, session } from "@/lib/crew/http";
import { crewIdentity } from "@/lib/crew/service";
import { storageConfigured } from "@/lib/crew/store";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  return guarded(async () =>
    response({
      account: storageConfigured()
        ? await crewIdentity(session(request))
        : null,
    }),
  );
}
