import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import {
  crewConfig,
  CrewError,
  mission,
  period,
  type MissionId,
} from "./model";
interface Ticket {
  account: string;
  mission: MissionId;
  day: string;
  issued: number;
  expires: number;
  nonce: string;
}
const signature = (text: string, secret: string) =>
  createHmac("sha256", secret)
    .update(`crew-challenge-v1:${text}`)
    .digest("base64url");
const symbols = ["KEY", "CASH", "MAP", "CASE", "CLOCK", "SIGNAL"];
function puzzle(ticket: Ticket, secret: string) {
  const seed = createHmac("sha256", secret)
    .update(`${ticket.account}:${ticket.day}:${ticket.mission}`)
    .digest();
  const a = 20 + (seed[0] % 60),
    b = 11 + (seed[1] % 30),
    c = 100 + seed[2];
  const question = crewConfig.briefings[seed[0] % crewConfig.briefings.length];
  const deck = [...symbols, ...symbols];
  for (let i = deck.length - 1; i > 0; i--) {
    const j = seed[i] % (i + 1);
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return { a, b, c, question, deck };
}
export function issueChallenge(
  account: string,
  id: string,
  secret: string,
  now = new Date(),
) {
  mission(id);
  const p = period(now);
  const ticket: Ticket = {
    account,
    mission: id as MissionId,
    day: p.day,
    issued: now.getTime(),
    expires: Math.min(now.getTime() + 15 * 60_000, Date.parse(p.resetAt)),
    nonce: randomBytes(16).toString("hex"),
  };
  const body = Buffer.from(JSON.stringify(ticket)).toString("base64url");
  const data = puzzle(ticket, secret);
  const visible =
    id === "cipher"
      ? {
          kind: "cipher",
          prompt: `Intercepted memo: ${data.a} crates, ${data.b} packets per crate, offset ${data.c}. Multiply crates × packets, then add the offset. Enter the result as four digits, with a leading zero if needed.`,
        }
      : id === "briefing"
        ? {
            kind: "briefing",
            prompt: data.question.scene,
            choices: data.question.choices,
          }
        : {
            kind: "memory",
            prompt:
              "Match all six evidence pairs in 18 moves or fewer. This fresh run counts toward today's mission.",
            deck: data.deck,
          };
  return {
    ticket: `${body}.${signature(body, secret)}`,
    expiresAt: new Date(ticket.expires).toISOString(),
    ...visible,
  };
}
export function checkChallenge(
  encoded: string,
  account: string,
  answer: unknown,
  secret: string,
  now = new Date(),
): { id: MissionId; correct: boolean } {
  if (typeof encoded !== "string" || encoded.length > 1500)
    throw new CrewError("Invalid mission ticket.");
  const [body, mac, extra] = encoded.split(".");
  const expected = signature(body ?? "", secret);
  if (
    extra ||
    !mac ||
    !/^[A-Za-z0-9_-]{43}$/.test(mac) ||
    mac.length !== expected.length ||
    !timingSafeEqual(Buffer.from(mac), Buffer.from(expected))
  )
    throw new CrewError("Invalid mission ticket.");
  let ticket: Ticket;
  try {
    ticket = JSON.parse(Buffer.from(body, "base64url").toString());
  } catch {
    throw new CrewError("Invalid mission ticket.");
  }
  if (ticket.account !== account)
    throw new CrewError("This mission belongs to another account.", 403);
  if (
    ticket.day !== period(now).day ||
    !Number.isFinite(ticket.expires) ||
    ticket.expires <= now.getTime()
  )
    throw new CrewError("This mission expired. Open a fresh mission.", 409);
  if (
    !Number.isFinite(ticket.issued) ||
    now.getTime() - ticket.issued <
      (ticket.mission === "memory" ? 10_000 : 1500)
  )
    throw new CrewError(
      "Take a moment to complete the mission, then submit.",
      409,
    );
  mission(ticket.mission);
  const data = puzzle(ticket, secret);
  let correct = false;
  if (ticket.mission === "cipher")
    correct =
      typeof answer === "string" &&
      answer === String(data.a * data.b + data.c).padStart(4, "0");
  if (ticket.mission === "briefing") correct = answer === data.question.answer;
  if (
    ticket.mission === "memory" &&
    Array.isArray(answer) &&
    answer.length >= 12 &&
    answer.length <= 36 &&
    answer.length % 2 === 0
  ) {
    const found = new Set<number>();
    let valid = true;
    for (let i = 0; i < answer.length; i += 2) {
      const a = answer[i],
        b = answer[i + 1];
      if (
        !Number.isInteger(a) ||
        !Number.isInteger(b) ||
        a < 0 ||
        a >= 12 ||
        b < 0 ||
        b >= 12 ||
        a === b ||
        found.has(a) ||
        found.has(b)
      ) {
        valid = false;
        break;
      }
      if (data.deck[a] === data.deck[b]) {
        found.add(a);
        found.add(b);
      }
    }
    correct = valid && found.size === 12;
  }
  return { id: ticket.mission, correct };
}
