import type { Metadata } from "next";
import { Network } from "lucide-react";
import { Hud } from "@/components/shell";
import { InvestigationBoard } from "@/components/board";
export const metadata: Metadata = {
  title: "Persons of Interest",
  description:
    "Join the free crew board, save a personal handle pin, and draft your theory for Instagram.",
};
export default function BoardPage() {
  return (
    <main id="main" className="page-container subpage">
      <div className="page-kicker">
        <span>
          <Network size={13} />
          THE INVESTIGATION BOARD
        </span>
        <span>EVERY CONNECTION MATTERS.</span>
      </div>
      <Hud />
      <header className="page-title board-page-title">
        <span className="eyebrow pink">FOLLOW THE THREADS</span>
        <h1>
          IT’S ALL <span>CONNECTED.</span>
        </h1>
        <p>
          Your first theory belongs here. Add a free personal pin, then join the
          conversation on Instagram.
        </p>
      </header>
      <InvestigationBoard />
    </main>
  );
}
