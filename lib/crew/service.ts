import {
  createHash,
  createHmac,
  randomBytes,
  scrypt,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";
import { normalizeHandle, validHandle } from "../game";
import {
  award,
  crewConfig,
  CrewError,
  isVerified,
  period,
  publicAccount,
  redeem,
  type Account,
} from "./model";
import { checkChallenge, issueChallenge } from "./challenges";
import {
  Conflict,
  mutate,
  privateStore,
  updateAccount,
  type CrewStore,
} from "./store";
const scryptAsync = promisify(scrypt);
const digest = (s: string) => createHash("sha256").update(s).digest("hex");
export const accountId = (handle: string) => digest(handle.toLowerCase());
function equal(a: string, b: string) {
  return (
    a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b))
  );
}
async function passwordHash(password: string, salt: string) {
  return ((await scryptAsync(password, salt, 32)) as Buffer).toString("hex");
}
export function signingSecret() {
  if (process.env.CREW_SIGNING_SECRET) return process.env.CREW_SIGNING_SECRET;
  if (!process.env.BLOB_READ_WRITE_TOKEN)
    throw new CrewError(
      "Crew accounts are temporarily unavailable. Please try again later.",
      503,
    );
  return createHmac("sha256", process.env.BLOB_READ_WRITE_TOKEN)
    .update("crimex-crew-signing-v1")
    .digest("hex");
}
function cleanHandle(value: unknown) {
  if (typeof value !== "string" || !validHandle(value))
    throw new CrewError(
      "Enter a valid Instagram handle (1–30 letters, numbers, dots or underscores).",
    );
  return normalizeHandle(value).toLowerCase();
}
function cleanPassword(value: unknown) {
  if (typeof value !== "string" || value.length < 12 || value.length > 128)
    throw new CrewError("Use a website password with 12–128 characters.");
  return value;
}
function newSession(now: Date) {
  const token = randomBytes(32).toString("base64url");
  return {
    token,
    stored: { hash: digest(token), expires: now.getTime() + 30 * 86400_000 },
  };
}
export async function crewIdentity(
  cookie: string | undefined,
  store: CrewStore = privateStore,
  now = new Date(),
) {
  if (!cookie) return null;
  try {
    const { account } = await authenticate(cookie, store, now);
    return { handle: account.handle, verified: isVerified(account) };
  } catch (error) {
    if (error instanceof CrewError && error.status === 401) return null;
    throw error;
  }
}

export async function rateLimit(
  store: CrewStore,
  identity: string,
  scope: string,
  limit: number,
  now: Date,
  secret: string,
) {
  const bucket = `${scope}-${now.toISOString().slice(0, scope === "join" ? 10 : 13)}`;
  const key = createHmac("sha256", secret)
    .update(`${bucket}:${identity}`)
    .digest("hex");
  await mutate<{ count: number }, void>(store, `limits/${key}`, (current) => {
    if ((current?.count ?? 0) >= limit)
      throw new CrewError("Too many attempts. Please try again later.", 429);
    return { value: { count: (current?.count ?? 0) + 1 }, result: undefined };
  });
}
export async function authenticate(
  cookie: string | undefined,
  store: CrewStore = privateStore,
  now = new Date(),
) {
  const [id, token, extra] = (cookie ?? "").split(".");
  if (
    extra ||
    !/^[a-f0-9]{64}$/.test(id ?? "") ||
    !/^[A-Za-z0-9_-]{43}$/.test(token ?? "")
  )
    throw new CrewError("Sign in to your crew account.", 401);
  const data = await store.read<Account>(`accounts/${id}`);
  const account = data?.value;
  if (
    !account ||
    account.version !== 1 ||
    account.id !== id ||
    !account.sessions.some(
      (s) => s.expires > now.getTime() && equal(s.hash, digest(token)),
    )
  )
    throw new CrewError("Your session expired. Please sign in again.", 401);
  return { account, sessionHash: digest(token) };
}
export async function createAccount(
  input: Record<string, unknown>,
  store: CrewStore = privateStore,
  now = new Date(),
) {
  const handle = cleanHandle(input.handle),
    password = cleanPassword(input.password);
  if (typeof input.publicRanking !== "boolean")
    throw new CrewError(
      "Choose whether to show your handle in the public leaderboard.",
    );
  const id = accountId(handle),
    salt = randomBytes(16).toString("hex"),
    recoveryCode = randomBytes(20).toString("hex"),
    session = newSession(now);
  const account: Account = {
    version: 1,
    id,
    handle,
    salt,
    passwordHash: await passwordHash(password, salt),
    recoveryHash: digest(recoveryCode),
    verificationCode: `CREW-${randomBytes(5).toString("hex").toUpperCase()}`,
    publicRanking: input.publicRanking,
    createdAt: now.toISOString(),
    sessions: [session.stored],
    balance: 0,
    earned: 0,
    spent: 0,
    transactions: [],
    claims: [],
    attempts: {},
    rewards: [],
    loginFailures: 0,
    blockedUntil: 0,
  };
  try {
    await store.write(`accounts/${id}`, account);
  } catch (e) {
    if (e instanceof Conflict)
      throw new CrewError(
        "That handle already has a crew account. Sign in or use your recovery code.",
        409,
      );
    throw e;
  }
  return {
    account: publicAccount(account, now),
    cookie: `${id}.${session.token}`,
    recoveryCode,
  };
}
export async function login(
  input: Record<string, unknown>,
  store: CrewStore = privateStore,
  now = new Date(),
) {
  const handle = cleanHandle(input.handle),
    id = accountId(handle);
  const password =
    typeof input.password === "string" && input.password.length <= 128
      ? input.password
      : "";
  const data = await store.read<Account>(`accounts/${id}`);
  const account = data?.value;
  const hash = await passwordHash(
    password,
    account?.salt ?? "crimex-missing-account",
  );
  if (!account)
    throw new CrewError("The handle or website password is incorrect.", 401);
  if (account.blockedUntil > now.getTime())
    throw new CrewError(
      "Sign-in is temporarily paused. Please wait 15 minutes.",
      429,
    );
  if (!equal(hash, account.passwordHash)) {
    await updateAccount(store, id, (a) => {
      a.loginFailures += 1;
      if (a.loginFailures >= 5) {
        a.blockedUntil = now.getTime() + 15 * 60_000;
        a.loginFailures = 0;
      }
    });
    throw new CrewError("The handle or website password is incorrect.", 401);
  }
  const session = newSession(now);
  const view = await updateAccount(store, id, (a) => {
    if (a.passwordHash !== hash)
      throw new CrewError("Please sign in again.", 401);
    a.sessions = [
      ...a.sessions.filter((s) => s.expires > now.getTime()).slice(-2),
      session.stored,
    ];
    a.loginFailures = 0;
    a.blockedUntil = 0;
    return publicAccount(a, now);
  });
  return { account: view, cookie: `${id}.${session.token}` };
}
export async function recover(
  input: Record<string, unknown>,
  store: CrewStore = privateStore,
  now = new Date(),
) {
  const handle = cleanHandle(input.handle),
    password = cleanPassword(input.password);
  if (
    typeof input.recoveryCode !== "string" ||
    !/^[a-f0-9]{40}$/.test(input.recoveryCode)
  )
    throw new CrewError("Enter your saved recovery code.");
  const proof = digest(input.recoveryCode),
    salt = randomBytes(16).toString("hex"),
    hash = await passwordHash(password, salt),
    nextCode = randomBytes(20).toString("hex"),
    session = newSession(now);
  const view = await updateAccount(store, accountId(handle), (a) => {
    if (!equal(a.recoveryHash, proof))
      throw new CrewError("The recovery code is incorrect.", 401);
    a.salt = salt;
    a.passwordHash = hash;
    a.recoveryHash = digest(nextCode);
    a.sessions = [session.stored];
    a.blockedUntil = 0;
    a.loginFailures = 0;
    return publicAccount(a, now);
  });
  return {
    account: view,
    cookie: `${accountId(handle)}.${session.token}`,
    recoveryCode: nextCode,
  };
}
export async function logout(
  cookie: string | undefined,
  store: CrewStore = privateStore,
  now = new Date(),
) {
  const { account, sessionHash } = await authenticate(cookie, store, now);
  await updateAccount(store, account.id, (a) => {
    a.sessions = a.sessions.filter((s) => s.hash !== sessionHash);
  });
}
export async function preferences(
  cookie: string | undefined,
  value: unknown,
  store: CrewStore = privateStore,
  now = new Date(),
) {
  if (typeof value !== "boolean")
    throw new CrewError("Choose a leaderboard preference.");
  const { account, sessionHash } = await authenticate(cookie, store, now);
  return updateAccount(store, account.id, (a) => {
    if (
      !a.sessions.some(
        (s) => s.hash === sessionHash && s.expires > now.getTime(),
      )
    )
      throw new CrewError("Please sign in again.", 401);
    a.publicRanking = value;
    return { account: publicAccount(a, now) };
  });
}
export async function deleteAccount(
  cookie: string | undefined,
  password: unknown,
  store: CrewStore = privateStore,
  now = new Date(),
) {
  const { account, sessionHash } = await authenticate(cookie, store, now);
  const { isOwnerAccount } = await import("./owner");
  if (await isOwnerAccount(account, store))
    throw new CrewError(
      "This account holds owner access. Contact the project administrator before deleting it; use your recovery code if you need a new password.",
      409,
    );
  if (
    typeof password !== "string" ||
    password.length > 128 ||
    !equal(await passwordHash(password, account.salt), account.passwordHash)
  )
    throw new CrewError(
      "Enter your website password to delete this account.",
      401,
    );
  const latest = await store.read<Account>(`accounts/${account.id}`);
  if (
    !latest ||
    latest.value.passwordHash !== account.passwordHash ||
    !latest.value.sessions.some(
      (s) => s.hash === sessionHash && s.expires > now.getTime(),
    )
  )
    throw new CrewError("Please sign in again.", 401);
  await store.remove(`accounts/${account.id}`, latest.etag);
}
export async function challenge(
  cookie: string | undefined,
  id: string,
  secret: string,
  store: CrewStore = privateStore,
  now = new Date(),
) {
  const { account } = await authenticate(cookie, store, now);
  const key = `${period(now).day}:${id}`;
  if (account.claims.includes(key))
    throw new CrewError(
      "You already earned today's credits for this mission.",
      409,
    );
  if ((account.attempts[key] ?? 0) >= crewConfig.maxAttempts)
    throw new CrewError(
      "Today's attempts are used. Come back after the reset.",
      409,
    );
  return issueChallenge(account.id, id, secret, now);
}
export async function claim(
  cookie: string | undefined,
  input: Record<string, unknown>,
  secret: string,
  store: CrewStore = privateStore,
  now = new Date(),
) {
  const { account, sessionHash } = await authenticate(cookie, store, now);
  if (typeof input.ticket !== "string")
    throw new CrewError("Open a mission first.");
  const result = checkChallenge(
    input.ticket,
    account.id,
    input.answer,
    secret,
    now,
  );
  const outcome = await updateAccount(store, account.id, (a) => {
    if (
      !a.sessions.some(
        (s) => s.hash === sessionHash && s.expires > now.getTime(),
      )
    )
      throw new CrewError("Please sign in again.", 401);
    const key = `${period(now).day}:${result.id}`;
    if (a.claims.includes(key))
      return {
        account: publicAccount(a, now),
        message: "Already credited. Your balance is unchanged.",
      };
    if ((a.attempts[key] ?? 0) >= crewConfig.maxAttempts)
      throw new CrewError(
        "Today's attempts are used. Come back after the reset.",
        409,
      );
    if (!result.correct) {
      a.attempts[key] = (a.attempts[key] ?? 0) + 1;
      return {
        account: publicAccount(a, now),
        message: "Evidence mismatch. Review the mission and try again.",
        incorrect: true,
      };
    }
    award(a, result.id, now);
    return {
      account: publicAccount(a, now),
      message: `${crewConfig.missions.find((m) => m.id === result.id)!.credits} Crew Credits added to your wallet.`,
    };
  });
  return outcome;
}
export async function redeemReward(
  cookie: string | undefined,
  id: string,
  store: CrewStore = privateStore,
  now = new Date(),
) {
  const { account, sessionHash } = await authenticate(cookie, store, now);
  return updateAccount(store, account.id, (a) => {
    if (
      !a.sessions.some(
        (s) => s.hash === sessionHash && s.expires > now.getTime(),
      )
    )
      throw new CrewError("Please sign in again.", 401);
    const changed = redeem(a, id, now);
    return {
      account: publicAccount(a, now),
      message: changed
        ? "Reward unlocked. You can download it again without spending more credits."
        : "You already own this reward. No extra credits spent.",
    };
  });
}
export async function leaderboard(
  store: CrewStore = privateStore,
  now = new Date(),
) {
  const { week } = period(now);
  const approved = crewConfig.verifiedCrew as {
    handle: string;
    code: string;
  }[];
  const entries: { handle: string; points: number; reachedAt: string }[] = [];
  const ranked = store.rankedAccounts
    ? await store.rankedAccounts(week, approved)
    : null;
  for (let i = 0; i < (ranked ? 1 : approved.length); i += 8) {
    const batch = ranked
      ? ranked.map((value) => ({ value }))
      : await Promise.all(
          approved
            .slice(i, i + 8)
            .map((p) => store.read<Account>(`accounts/${accountId(p.handle)}`)),
        );
    for (const item of batch) {
      const a = item?.value;
      if (!a || !isVerified(a) || !a.publicRanking) continue;
      const earned = a.transactions.filter(
        (t) => t.week === week && t.amount > 0,
      );
      const points = earned.reduce((s, t) => s + t.amount, 0);
      if (points)
        entries.push({
          handle: a.handle,
          points,
          reachedAt: earned.at(-1)!.at,
        });
    }
  }
  entries.sort(
    (a, b) =>
      b.points - a.points ||
      a.reachedAt.localeCompare(b.reachedAt) ||
      a.handle.localeCompare(b.handle),
  );
  const monday = new Date(`${week}T12:00:00Z`);
  monday.setUTCDate(monday.getUTCDate() + 7);
  return {
    week,
    nextWeek: monday.toISOString().slice(0, 10),
    entries: entries
      .slice(0, 10)
      .map((e, i) => ({ rank: i + 1, handle: e.handle, points: e.points })),
  };
}
