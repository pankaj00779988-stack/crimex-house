import config from "../../data/crew.json";
import { nextDrop } from "../game";
export { config as crewConfig };
export type MissionId = "cipher" | "briefing" | "memory";
export interface Transaction {
  id: string;
  label: string;
  amount: number;
  at: string;
  week: string;
}
export interface Account {
  version: 1;
  id: string;
  handle: string;
  salt: string;
  passwordHash: string;
  recoveryHash: string;
  verificationCode: string;
  publicRanking: boolean;
  createdAt: string;
  sessions: { hash: string; expires: number }[];
  balance: number;
  earned: number;
  spent: number;
  transactions: Transaction[];
  claims: string[];
  attempts: Record<string, number>;
  rewards: string[];
  loginFailures: number;
  blockedUntil: number;
}
export class CrewError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export function period(now = new Date()) {
  const day = new Intl.DateTimeFormat("en-CA", {
    timeZone: config.timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const monday = new Date(`${day}T12:00:00Z`);
  monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
  return {
    day,
    week: monday.toISOString().slice(0, 10),
    resetAt: new Date(nextDrop(now, 0, config.timeZone)).toISOString(),
  };
}
export function mission(id: string) {
  const value = config.missions.find((m) => m.id === id);
  if (!value) throw new CrewError("Unknown mission.");
  return value;
}
export function isVerified(account: Account) {
  const approved = config.verifiedCrew as { handle: string; code: string }[];
  return approved.some(
    (p) =>
      p.handle.toLowerCase() === account.handle &&
      p.code === account.verificationCode,
  );
}
export function award(account: Account, id: MissionId, now: Date): boolean {
  const p = period(now);
  const key = `${p.day}:${id}`;
  if (account.claims.includes(key)) return false;
  if ((account.attempts[key] ?? 0) >= config.maxAttempts)
    throw new CrewError(
      "Today's attempts are used. Try again after the daily reset.",
      409,
    );
  const credits = mission(id).credits;
  const dailyTotal = account.transactions
    .filter((t) => t.amount > 0 && t.id.startsWith(p.day + ":"))
    .reduce((n, t) => n + t.amount, 0);
  if (dailyTotal + credits > config.dailyLimit)
    throw new CrewError("Today's credit limit is reached.", 409);
  account.balance += credits;
  account.earned += credits;
  account.claims.push(key);
  account.transactions.push({
    id: key,
    label: mission(id).title,
    amount: credits,
    at: now.toISOString(),
    week: p.week,
  });
  prune(account, p.day);
  return true;
}
function prune(account: Account, day: string) {
  const oldest = new Date(`${day}T12:00:00Z`);
  oldest.setUTCDate(oldest.getUTCDate() - 14);
  const cutoff = oldest.toISOString().slice(0, 10);
  account.claims = account.claims.filter((k) => k.slice(0, 10) >= cutoff);
  account.attempts = Object.fromEntries(
    Object.entries(account.attempts).filter(([k]) => k.slice(0, 10) >= cutoff),
  );
  account.transactions = account.transactions.slice(-200);
}
export function redeem(
  account: Account,
  rewardId: string,
  now: Date,
  verified = isVerified(account),
) {
  if (rewardId !== config.reward.id) throw new CrewError("Unknown reward.");
  if (!verified)
    throw new CrewError(
      "Confirm your Instagram account and follow before redeeming. Your credits stay in your wallet.",
      403,
    );
  if (account.rewards.includes(rewardId)) return false;
  if (account.balance < config.reward.credits)
    throw new CrewError("You need more credits for this reward.", 409);
  account.balance -= config.reward.credits;
  account.spent += config.reward.credits;
  account.rewards.push(rewardId);
  account.transactions.push({
    id: `reward:${rewardId}`,
    label: config.reward.title,
    amount: -config.reward.credits,
    at: now.toISOString(),
    week: period(now).week,
  });
  return true;
}
export function weeklyScore(account: Account, week: string) {
  const earned = account.transactions.filter(
    (t) => t.week === week && t.amount > 0,
  );
  return {
    points: earned.reduce((n, t) => n + t.amount, 0),
    reachedAt: earned.at(-1)?.at ?? account.createdAt,
  };
}
export function publicAccount(account: Account, now = new Date()) {
  const p = period(now);
  return {
    handle: account.handle,
    balance: account.balance,
    earned: account.earned,
    spent: account.spent,
    verificationCode: account.verificationCode,
    verified: isVerified(account),
    publicRanking: account.publicRanking,
    weeklyPoints: weeklyScore(account, p.week).points,
    rewards: account.rewards,
    transactions: account.transactions.slice(-20).reverse(),
    missions: config.missions.map((m) => ({
      ...m,
      completed: account.claims.includes(`${p.day}:${m.id}`),
      attemptsLeft: Math.max(
        0,
        config.maxAttempts - (account.attempts[`${p.day}:${m.id}`] ?? 0),
      ),
    })),
  };
}
