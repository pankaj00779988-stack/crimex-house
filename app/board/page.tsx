import type { Metadata } from "next";
import { Network } from "lucide-react";
import { Hud } from "@/components/shell";
import { InvestigationBoard } from "@/components/board";
export const metadata: Metadata = {
  title: "Persons of Interest",
  description:
    "Follow the investigation. Get your handle pinned to the Crimex House evidence board.",
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
        <p>The evidence. The crew. You. Some names belong on the board.</p>
      </header>
      <InvestigationBoard />
    </main>
  );
}
