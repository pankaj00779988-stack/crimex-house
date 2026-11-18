"use client";
import { Analytics } from "@vercel/analytics/next";
import type { BeforeSendEvent } from "@vercel/analytics";
import { usePathname } from "next/navigation";
export function SiteAnalytics() {
  const path = usePathname();
  return path.startsWith("/owner") ? null : (
    <Analytics beforeSend={publicPageViews} />
  );
}
function publicPageViews(event: BeforeSendEvent) {
  try {
    return new URL(event.url).pathname.startsWith("/owner") ? null : event;
  } catch {
    return null;
  }
}
