/** A confirmed release needs an explicit timezone; never infer a daily drop. */
export function releaseTime(value: unknown): number | null {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/.test(value)
  ) return null;
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : null;
}

export function upcomingRelease(
  value: unknown,
  timeZone: string,
  now = new Date(),
) {
  const time = releaseTime(value);
  if (time === null || time <= now.getTime()) return null;
  const seconds = Math.ceil((time - now.getTime()) / 1000);
  return {
    label: new Intl.DateTimeFormat("en-US", {
      timeZone,
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    }).format(time).toUpperCase(),
    countdown: [
      Math.floor(seconds / 3600),
      Math.floor(seconds / 60) % 60,
      seconds % 60,
    ].map((part) => String(part).padStart(2, "0")).join(" : "),
  };
}
