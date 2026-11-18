import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import { CrewError } from "./model";
import { signingSecret } from "./service";
import {
  crewNamespace,
  mutate,
  privateStore,
  Conflict,
  type CrewStore,
} from "./store";
import { reviewCrew } from "./verification";

const KEY = "owner/instagram-v1";
const GRAPH = "https://graph.instagram.com/v27.0";
interface Connection {
  accountId: string;
  appSecret: string;
  accessToken: string;
  verifyToken: string;
  enabled: boolean;
  connectedAt: string;
  webhookVerifiedAt?: string;
}
interface Envelope {
  version: 1;
  iv: string;
  tag: string;
  ciphertext: string;
}
const encryptionKey = () =>
  createHmac("sha256", signingSecret())
    .update(`crimex-instagram-v1:${crewNamespace()}`)
    .digest();
export function encryptConnection(config: Connection): Envelope {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  cipher.setAAD(Buffer.from(crewNamespace()));
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(config), "utf8"),
    cipher.final(),
  ]);
  return {
    version: 1,
    iv: iv.toString("hex"),
    tag: cipher.getAuthTag().toString("hex"),
    ciphertext: ciphertext.toString("base64"),
  };
}
export function decryptConnection(envelope: Envelope): Connection {
  if (envelope.version !== 1) throw new Error("Unsupported connection record");
  const cipher = createDecipheriv(
    "aes-256-gcm",
    encryptionKey(),
    Buffer.from(envelope.iv, "hex"),
  );
  cipher.setAAD(Buffer.from(crewNamespace()));
  cipher.setAuthTag(Buffer.from(envelope.tag, "hex"));
  return JSON.parse(
    Buffer.concat([
      cipher.update(Buffer.from(envelope.ciphertext, "base64")),
      cipher.final(),
    ]).toString("utf8"),
  );
}
async function connection(store: CrewStore) {
  const data = await store.read<Envelope>(KEY);
  return data ? decryptConnection(data.value) : null;
}
export async function instagramStatus(store: CrewStore = privateStore) {
  const config = await connection(store);
  return {
    configured: !!config,
    enabled: !!config?.enabled,
    ...(config
      ? {
          verifyToken: config.verifyToken,
          accountId: config.accountId,
          connectedAt: config.connectedAt,
          webhookVerified: !!config.webhookVerifiedAt,
        }
      : {}),
  };
}
async function profile(
  id: string,
  accessToken: string,
  fetcher = fetch,
  basic = false,
) {
  const params = new URLSearchParams({
    fields: basic ? "id,username" : "username,is_user_follow_business",
  });
  const res = await fetcher(`${GRAPH}/${id}?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(3000),
    cache: "no-store",
  });
  if (!res.ok)
    throw new CrewError(
      "Instagram could not complete the check. Confirm the token and messaging permissions in Meta, then retry.",
      503,
    );
  return (await res.json()) as {
    id?: string;
    username?: string;
    is_user_follow_business?: boolean;
  };
}
export async function connectInstagram(
  input: Record<string, unknown>,
  store: CrewStore = privateStore,
  fetcher = fetch,
) {
  const accountId =
    typeof input.accountId === "string" ? input.accountId.trim() : "";
  const appSecret =
    typeof input.appSecret === "string" ? input.appSecret.trim() : "";
  const accessToken =
    typeof input.accessToken === "string" ? input.accessToken.trim() : "";
  if (
    !/^\d{5,32}$/.test(accountId) ||
    !/^[a-f0-9]{32}$/i.test(appSecret) ||
    accessToken.length < 20 ||
    accessToken.length > 4096
  )
    throw new CrewError(
      "Enter the Instagram account ID, Meta app secret, and Instagram User access token from your Meta app.",
    );
  const owner = await profile(accountId, accessToken, fetcher, true);
  if (
    owner.username?.toLowerCase() !== "crimex.house" ||
    String(owner.id) !== accountId
  )
    throw new CrewError(
      "This connection must belong to @crimex.house. Check the Instagram account ID and token.",
      403,
    );
  await mutate<Envelope, void>(store, KEY, (existing) => {
    const old = existing ? decryptConnection(existing) : null;
    return {
      value: encryptConnection({
        accountId,
        appSecret,
        accessToken,
        enabled: false,
        verifyToken: old?.verifyToken ?? randomBytes(32).toString("base64url"),
        connectedAt: new Date().toISOString(),
        ...(old?.appSecret === appSecret &&
        old.accountId === accountId &&
        old.webhookVerifiedAt
          ? { webhookVerifiedAt: old.webhookVerifiedAt }
          : {}),
      }),
      result: undefined,
    };
  });
  return instagramStatus(store);
}
export async function toggleInstagram(
  enabled: unknown,
  store: CrewStore = privateStore,
) {
  if (typeof enabled !== "boolean")
    throw new CrewError("Choose whether automatic verification is enabled.");
  await mutate<Envelope, void>(store, KEY, (value) => {
    if (!value) throw new CrewError("Connect your Meta app first.", 409);
    const config = decryptConnection(value);
    if (enabled && !config.webhookVerifiedAt)
      throw new CrewError(
        "Verify the callback URL in your Meta app before enabling automatic checks.",
        409,
      );
    config.enabled = enabled;
    return { value: encryptConnection(config), result: undefined };
  });
  return instagramStatus(store);
}
export async function verifyInstagramCallback(
  mode: string | null,
  token: string | null,
  challenge: string | null,
  store: CrewStore = privateStore,
) {
  const config = await connection(store);
  if (!config) throw new CrewError("Instagram is not connected.", 503);
  const supplied = createHash("sha256")
    .update(token ?? "")
    .digest();
  const expected = createHash("sha256").update(config.verifyToken).digest();
  if (
    mode !== "subscribe" ||
    !timingSafeEqual(supplied, expected) ||
    !challenge ||
    !/^[a-zA-Z0-9_-]{1,256}$/.test(challenge)
  )
    throw new CrewError("Invalid callback verification.", 403);
  await mutate<Envelope, void>(store, KEY, (value) => {
    if (!value) throw new CrewError("Instagram is not connected.", 503);
    const current = decryptConnection(value);
    if (current.verifyToken !== config.verifyToken)
      throw new CrewError(
        "Connection changed. Retry callback verification.",
        409,
      );
    current.webhookVerifiedAt = new Date().toISOString();
    return { value: encryptConnection(current), result: undefined };
  });
  return challenge;
}
interface MessagingEvent {
  sender?: { id?: string };
  recipient?: { id?: string };
  timestamp?: number;
  message?: { mid?: string; text?: string; is_echo?: boolean };
}
export async function processInstagramWebhook(
  body: string,
  signature: string | null,
  store: CrewStore = privateStore,
  fetcher = fetch,
  now = new Date(),
) {
  const config = await connection(store);
  if (!config) throw new CrewError("Instagram is not connected.", 503);
  const expected = createHmac("sha256", config.appSecret)
    .update(body)
    .digest("hex");
  const supplied = signature?.match(/^sha256=([a-f0-9]{64})$/)?.[1];
  if (
    !supplied ||
    !timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))
  )
    throw new CrewError("Invalid webhook signature.", 403);
  if (!config.enabled) return;
  let payload: {
    object?: string;
    entry?: { id?: string; messaging?: MessagingEvent[] }[];
  };
  try {
    payload = JSON.parse(body);
  } catch {
    throw new CrewError("Invalid webhook payload.");
  }
  if (payload.object !== "instagram" || !Array.isArray(payload.entry)) return;
  const events = payload.entry
    .filter((e) => e.id === config.accountId)
    .flatMap((e) => (Array.isArray(e.messaging) ? e.messaging : []));
  if (events.length > 100)
    throw new CrewError("Webhook batch is too large.", 413);
  for (let i = 0; i < events.length; i += 4) {
    const results = await Promise.allSettled(
      events.slice(i, i + 4).map(async (event) => {
        const text = event.message?.text;
        if (
          event.message?.is_echo ||
          typeof text !== "string" ||
          event.recipient?.id !== config.accountId ||
          !/^\d{5,32}$/.test(event.sender?.id ?? "") ||
          typeof event.message?.mid !== "string" ||
          !Number.isFinite(event.timestamp) ||
          now.getTime() - event.timestamp! > 24 * 3600_000 ||
          event.timestamp! > now.getTime() + 300_000
        )
          return;
        const codes = [
          ...new Set(text.toUpperCase().match(/\bCREW-[A-F0-9]{10}\b/g) ?? []),
        ];
        if (codes.length !== 1) return;
        const receiptKey = `instagram/receipts/${createHash("sha256").update(event.message.mid).digest("hex")}`;
        if (await store.read(receiptKey)) return;
        const user = await profile(
          event.sender!.id!,
          config.accessToken,
          fetcher,
        );
        // Missing/false follower information never becomes an approval.
        if (
          user.is_user_follow_business === true &&
          typeof user.username === "string"
        ) {
          try {
            await reviewCrew(
              {
                action: "approve",
                handle: user.username,
                code: codes[0],
                instagramId: event.sender!.id,
              },
              "instagram",
              store,
              now,
            );
          } catch (e) {
            if (!(e instanceof CrewError && [400, 401, 409].includes(e.status)))
              throw e;
          }
        }
        try {
          await store.write(receiptKey, { processedAt: now.toISOString() });
        } catch (e) {
          if (!(e instanceof Conflict)) throw e;
        }
      }),
    );
    // Meta can retry transient failures; completed receipts and approvals are idempotent.
    if (results.some((r) => r.status === "rejected"))
      throw new CrewError(
        "Verification is temporarily unavailable. Retry delivery.",
        503,
      );
  }
}
