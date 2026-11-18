import type { NextRequest } from "next/server";
import {
  guarded,
  readBody,
  response,
  session,
  setSession,
} from "@/lib/crew/http";
import { CrewError } from "@/lib/crew/model";
import {
  ownerSetupAvailable,
  requireOwner,
  setUpOwner,
  validateOwnerSetupToken,
} from "@/lib/crew/owner";
import { crewDirectory } from "@/lib/crew/directory";
import { reviewCrew } from "@/lib/crew/verification";
import { rateLimit, signingSecret } from "@/lib/crew/service";
import { privateStore } from "@/lib/crew/store";
import {
  connectInstagram,
  instagramStatus,
  toggleInstagram,
} from "@/lib/crew/instagram";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return guarded(async () => {
    try {
      await requireOwner(session(request));
    } catch (e) {
      if (!(e instanceof CrewError && [401, 403].includes(e.status))) throw e;
      return response({
        authenticated: false,
        setupAvailable: await ownerSetupAvailable(),
      });
    }
    const params = request.nextUrl.searchParams;
    return response({
      authenticated: true,
      ...(await crewDirectory({
        search: params.get("search") ?? "",
        status: params.get("status") ?? "pending",
        cursor: params.get("cursor") ?? "",
      })),
      bot: await instagramStatus(),
    });
  });
}
export async function POST(request: NextRequest) {
  return guarded(async () => {
    const input = await readBody(request);
    if (input.mode === "setup") {
      validateOwnerSetupToken(input.token);
      const identity =
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        "unknown";
      await rateLimit(
        privateStore,
        identity,
        "owner-setup",
        10,
        new Date(),
        signingSecret(),
      );
      const { cookie, ...data } = await setUpOwner(input);
      return setSession(response(data), cookie);
    }
    await requireOwner(session(request));
    if (input.mode === "connect-instagram")
      return response(await connectInstagram(input));
    if (input.mode === "bot")
      return response(await toggleInstagram(input.enabled));
    return response(await reviewCrew(input, "owner"));
  });
}
