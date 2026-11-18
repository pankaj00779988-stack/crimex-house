import { NextRequest } from "next/server";
import {
  COOKIE,
  guarded,
  readBody,
  response,
  session,
  setSession,
} from "@/lib/crew/http";
import {
  createAccount,
  deleteAccount,
  login,
  logout,
  preferences,
  rateLimit,
  recover,
  signingSecret,
} from "@/lib/crew/service";
import { CrewError } from "@/lib/crew/model";
import { privateStore } from "@/lib/crew/store";
export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  return guarded(async () => {
    const input = await readBody(request);
    if (
      input.mode === "register" &&
      typeof input.handle === "string" &&
      input.handle.trim().replace(/^@/, "").toLowerCase() === "crimex.house"
    )
      throw new CrewError(
        "This handle is reserved for owner access. Use the private owner setup link or sign in.",
        403,
      );
    const secret = signingSecret();
    if (input.mode === "preferences")
      return response(await preferences(session(request), input.publicRanking));
    if (input.mode === "delete") {
      await deleteAccount(session(request), input.password);
      const res = response({ ok: true });
      res.cookies.set(COOKIE, "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 0,
      });
      return res;
    }
    if (input.mode === "logout") {
      try {
        await logout(session(request));
      } catch (e) {
        if (!(e instanceof CrewError && e.status === 401)) throw e;
      }
      const res = response({ ok: true });
      res.cookies.set(COOKIE, "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 0,
      });
      return res;
    }
    if (!["register", "login", "recover"].includes(String(input.mode)))
      throw new CrewError("Choose join, sign in, or recovery.");
    const identity =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown";
    await rateLimit(
      privateStore,
      identity,
      input.mode === "register" ? "join" : "auth",
      input.mode === "register" ? 5 : 30,
      new Date(),
      secret,
    );
    const result =
      input.mode === "register"
        ? await createAccount(input)
        : input.mode === "recover"
          ? await recover(input)
          : await login(input);
    const { cookie, ...data } = result;
    return setSession(response(data), cookie);
  });
}
