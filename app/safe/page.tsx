import type { Metadata } from "next";
import { LockKeyhole } from "lucide-react";
import { Hud } from "@/components/shell";
import { Vault } from "@/components/vault";
export const metadata: Metadata = {
  title: "Crack the Safe",
  description:
    "Four digits. Five attempts. Follow the evidence and crack the Crimex House vault.",
};
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
