import { NextRequest, NextResponse } from "next/server";
import { CrewError } from "./model";
export const COOKIE =
  process.env.NODE_ENV === "production" ? "__Host-crimex_crew" : "crimex_crew";
export function response(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "private, no-store", Vary: "Cookie" },
  });
}
export async function readBody(request: NextRequest) {
  if (process.env.CREW_MIGRATING === "1")
    throw new CrewError(
      "Crew accounts are briefly paused for a storage upgrade. Please retry shortly; your saved credits are safe.",
      503,
    );
  if (request.headers.get("origin") !== request.nextUrl.origin)
    throw new CrewError("Please submit from this website.", 403);
  if (!request.headers.get("content-type")?.includes("application/json"))
    throw new CrewError("Expected a JSON request.", 415);
  if (+(request.headers.get("content-length") ?? 0) > 8192)
    throw new CrewError("Request is too large.", 413);
  const text = await request.text();
  if (text.length > 8192) throw new CrewError("Request is too large.", 413);
  try {
    const body: unknown = JSON.parse(text);
    if (!body || typeof body !== "object" || Array.isArray(body))
      throw new Error();
    return body as Record<string, unknown>;
  } catch {
    throw new CrewError("Invalid request.");
  }
}
export function session(request: NextRequest) {
  return request.cookies.get(COOKIE)?.value;
}
export function setSession(res: NextResponse, value: string) {
  res.cookies.set(COOKIE, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 86400,
  });
  return res;
}
export async function guarded(action: () => Promise<Response>) {
  try {
    return await action();
  } catch (error) {
    if (error instanceof CrewError)
      return response({ error: error.message }, error.status);
    console.error(
      "Crew storage request failed",
      error instanceof Error ? error.name : "UnknownError",
    );
    return response(
      {
        error:
          "Crew service is temporarily unavailable. Please try again; your saved balance will not be replaced.",
      },
      503,
    );
  }
}
