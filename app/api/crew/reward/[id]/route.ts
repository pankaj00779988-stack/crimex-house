import type { NextRequest } from "next/server";
import { renderCrewWallpaper } from "@/lib/crew/wallpaper";
import { guarded, session } from "@/lib/crew/http";
import { authenticate, signingSecret } from "@/lib/crew/service";
import { crewConfig, CrewError } from "@/lib/crew/model";
export const runtime = "nodejs";
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  return guarded(async () => {
    signingSecret();
    const { id } = await context.params;
    const { account } = await authenticate(session(request));
    if (id !== crewConfig.reward.id || !account.rewards.includes(id))
      throw new CrewError("Unlock this wallpaper in your rewards first.", 403);
    const serial = account.id.slice(0, 8).toUpperCase();
    const png = await renderCrewWallpaper(account.handle, serial);
    return new Response(new Uint8Array(png), {
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `attachment; filename="crimex-crew-${serial}.png"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  });
}
