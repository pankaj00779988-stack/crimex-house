import type { Metadata } from "next";
import { LockKeyhole } from "lucide-react";
import { Hud } from "@/components/shell";
import { Vault } from "@/components/vault";
import { pageMetadata } from "@/lib/metadata";
export const metadata: Metadata = pageMetadata(
  "Crack the Safe",
  "Four digits. Five attempts. Follow the evidence and crack the Crimex House vault.",
  "/safe",
);
export default function SafePage() {
  return (
    <main id="main" className="page-container subpage">
      <div className="page-kicker">
        <span>
          <LockKeyhole size={13} />
          THE VAULT
        </span>
        <span>BRUTE FORCE HAS CONSEQUENCES.</span>
      </div>
      <Hud />
      <Vault />
    </main>
  );
}
