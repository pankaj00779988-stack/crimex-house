import type { Metadata } from "next";
import { OwnerDashboard } from "@/components/owner-dashboard";
export const metadata: Metadata = {
  title: "Owner · Crew Verification",
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
};
export const dynamic = "force-dynamic";
export default function OwnerPage() {
  return (
    <main id="main" className="page-container subpage owner-page">
      <OwnerDashboard />
    </main>
  );
}
