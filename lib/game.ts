export type DigitResult = "exact" | "present" | "miss";
/** Two passes are essential: duplicate digits can only consume each code digit once. */
export function scoreGuess(guess: string, code: string): DigitResult[] {
  const result: DigitResult[] = Array(guess.length).fill("miss");
  const remaining = code.split("");
  for (let i = 0; i < guess.length; i++) {
    if (guess[i] === code[i]) {
      result[i] = "exact";
      remaining[i] = "";
    }
  }
  for (let i = 0; i < guess.length; i++) {
    if (result[i] === "exact") continue;
    const at = remaining.indexOf(guess[i]);
    if (at !== -1) {
      result[i] = "present";
      remaining[at] = "";
    }
  }
  return result;
}
export function nextDrop(now: Date, hour: number): number {
  const target = new Date(now);
  target.setUTCHours(hour, 0, 0, 0);
  if (target.getTime() <= now.getTime())
    target.setUTCDate(target.getUTCDate() + 1);
  return target.getTime();
}
export function validHandle(value: string): boolean {
  return /^@?[a-zA-Z0-9._]{1,30}$/.test(value.trim());
}
export function normalizeHandle(value: string): string {
  return `@${value.trim().replace(/^@/, "")}`;
}
