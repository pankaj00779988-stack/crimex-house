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
export function nextDrop(now: Date, hour: number, timeZone = "UTC"): number {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const partsAt = (date: Date) => {
    const parts = Object.fromEntries(
      formatter.formatToParts(date).map((p) => [p.type, p.value]),
    );
    return {
      year: +parts.year,
      month: +parts.month,
      day: +parts.day,
      hour: +parts.hour,
      minute: +parts.minute,
      second: +parts.second,
    };
  };
  const localNow = partsAt(now);
  const targetOn = (calendarDate: Date) => {
    const desired = Date.UTC(
      calendarDate.getUTCFullYear(),
      calendarDate.getUTCMonth(),
      calendarDate.getUTCDate(),
      hour,
    );
    let timestamp = desired;
    // Resolve the zone's offset on the target date, including a DST change overnight.
    for (let i = 0; i < 4; i++) {
      const p = partsAt(new Date(timestamp));
      const adjustment =
        desired -
        Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
      timestamp += adjustment;
      if (adjustment === 0) break;
    }
    return timestamp;
  };
  const calendarDate = new Date(
    Date.UTC(localNow.year, localNow.month - 1, localNow.day),
  );
  let target = targetOn(calendarDate);
  if (target <= now.getTime()) {
    calendarDate.setUTCDate(calendarDate.getUTCDate() + 1);
    target = targetOn(calendarDate);
  }
  return target;
}
export function validHandle(value: string): boolean {
  return /^@?[a-zA-Z0-9._]{1,30}$/.test(value.trim());
}
export function normalizeHandle(value: string): string {
  return `@${value.trim().replace(/^@/, "")}`;
}
