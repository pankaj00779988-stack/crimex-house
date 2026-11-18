import { createHash, timingSafeEqual } from "node:crypto";
import { CrewError, type Account } from "./model";
import { authenticate, createAccount, login } from "./service";
import { Conflict, privateStore, type CrewStore } from "./store";

export const OWNER_KEY = "owner/access-v1";
interface OwnerGrant {
  version: 1;
  accountId: string;
  createdAt: string;
  accountCreatedAt: string;
  code: string;
}
const hash = (s: string) => createHash("sha256").update(s).digest("hex");
export async function ownerSetupAvailable(store: CrewStore = privateStore) {
  return (
    !!process.env.CREW_OWNER_SETUP_TOKEN_HASH && !(await store.read(OWNER_KEY))
  );
}
export async function requireOwner(
  cookie: string | undefined,
  store: CrewStore = privateStore,
  now = new Date(),
) {
  const { account } = await authenticate(cookie, store, now);
  const grant = (await store.read<OwnerGrant>(OWNER_KEY))?.value;
  if (
    !grant ||
    grant.version !== 1 ||
    grant.accountId !== account.id ||
    grant.accountCreatedAt !== account.createdAt ||
    grant.code !== account.verificationCode
  )
    throw new CrewError("Owner access is required.", 403);
  return account;
}
export async function isOwnerAccount(account: Account, store: CrewStore) {
  const grant = (await store.read<OwnerGrant>(OWNER_KEY))?.value;
  return (
    !!grant &&
    grant.accountId === account.id &&
    grant.accountCreatedAt === account.createdAt &&
    grant.code === account.verificationCode
  );
}
export async function setUpOwner(
  input: Record<string, unknown>,
  store: CrewStore = privateStore,
  now = new Date(),
) {
  validateOwnerSetupToken(input.token);
  if (await store.read(OWNER_KEY))
    throw new CrewError(
      "Owner access is already set up. Sign in with your website password.",
      409,
    );
  return createOwnerGrant(input, store, now);
}
export function validateOwnerSetupToken(token: unknown) {
  const expected = process.env.CREW_OWNER_SETUP_TOKEN_HASH ?? "";
  const actual = hash(typeof token === "string" ? token : "");
  if (
    !/^[a-f0-9]{64}$/.test(expected) ||
    !timingSafeEqual(Buffer.from(actual), Buffer.from(expected))
  )
    throw new CrewError("This owner setup link is invalid.", 403);
}
async function createOwnerGrant(
  input: Record<string, unknown>,
  store: CrewStore,
  now: Date,
) {
  // Reuse the existing, rate-limited website authentication and secure cookie.
  // Possessing an Instagram handle never grants owner access by itself.
  const handle = "@crimex.house";
  const { accountId } = await import("./service");
  const existing = await store.read<Account>(`accounts/${accountId(handle)}`);
  const result = existing
    ? await login({ handle, password: input.password }, store, now)
    : await createAccount(
        { handle, password: input.password, publicRanking: false },
        store,
        now,
      );
  const account = (await authenticate(result.cookie, store, now)).account;
  try {
    await store.write(OWNER_KEY, {
      version: 1,
      accountId: account.id,
      createdAt: now.toISOString(),
      accountCreatedAt: account.createdAt,
      code: account.verificationCode,
    } satisfies OwnerGrant);
  } catch (e) {
    if (e instanceof Conflict)
      throw new CrewError(
        "Owner setup was already completed. Sign in again.",
        409,
      );
    throw e;
  }
  return result;
}
