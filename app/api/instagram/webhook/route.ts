import type { NextRequest } from "next/server";
import { guarded, response } from "@/lib/crew/http";
import { CrewError } from "@/lib/crew/model";
import {
  processInstagramWebhook,
  verifyInstagramCallback,
} from "@/lib/crew/instagram";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;
export async function GET(request: NextRequest) {
  return guarded(async () => {
    const p = request.nextUrl.searchParams;
    const challenge = await verifyInstagramCallback(
      p.get("hub.mode"),
      p.get("hub.verify_token"),
      p.get("hub.challenge"),
    );
    return new Response(challenge, {
      headers: { "Content-Type": "text/plain", "Cache-Control": "no-store" },
    });
  });
}
export async function POST(request: NextRequest) {
  return guarded(async () => {
    if (process.env.CREW_MIGRATING === "1")
      throw new CrewError("Crew storage maintenance. Retry delivery.", 503);
    if (+(request.headers.get("content-length") ?? 0) > 65536)
      throw new CrewError("Request is too large.", 413);
    const reader = request.body?.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    if (reader) {
      try {
        for (;;) {
          const part = await reader.read();
          if (part.done) break;
          size += part.value.byteLength;
          if (size > 65536) {
            await reader.cancel();
            throw new CrewError("Request is too large.", 413);
          }
          chunks.push(part.value);
        }
      } finally {
        reader.releaseLock();
      }
    }
    const bytes = Buffer.concat(chunks);
    await processInstagramWebhook(
      new TextDecoder().decode(bytes),
      request.headers.get("x-hub-signature-256"),
    );
    return response({ received: true });
  });
}
