import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Fingerprint, Gamepad2 } from "lucide-react";
import { Room17 } from "@/components/heist";
import {
  MemoryGame,
  ReactionGame,
  SealedEpisodeGame,
} from "@/components/arcade";
import { activeEpisodeReleased } from "@/lib/data";
export const metadata: Metadata = {
  title: "Room 17 — The Free Heist Case",
  description:
    "Read the room. Recover the ledger. Choose your exit. Play the original Room 17 interactive heist case for free.",
};
export default function GamesPage() {
  return (
    <main id="main" className="page-container subpage heist-page">
      <div className="page-kicker">
        <span>
          <Fingerprint size={13} />
          AN ORIGINAL CRIMEX HOUSE CASE
        </span>
        <span>FREE TO PLAY / NO ACCOUNT NEEDED</span>
      </div>
      <header className="heist-page-header">
        <span className="eyebrow pink">READ THE ROOM. LEAVE NO TRACE.</span>
        <h1>
          Every move
          <br />
          has a <span>consequence.</span>
        </h1>
        <p>The right answer opens the case. The right decisions get you out.</p>
      </header>
      <Room17 />
      <details className="quick-drills">
        <summary>
          <span>
            <Gamepad2 size={20} />
            <span>
              <strong>WARM UP WITH A QUICK DRILL</strong>
              <small>Dead Drop · Memory / Signal Intercept · Reaction</small>
            </span>
          </span>
          <span className="quick-drills-plus">+</span>
        </summary>
        <div className="arcade-grid">
          <MemoryGame />
          <ReactionGame />
        </div>
      </details>
      {!activeEpisodeReleased && <SealedEpisodeGame />}
      <div className="arcade-bottom">
        <Link className="button outline" href="/safe">
          {activeEpisodeReleased
            ? "CRACK THE EPISODE VAULT"
            : "CHECK THE EPISODE VAULT"}
          <ArrowRight size={15} />
        </Link>
        <Link className="text-link" href="/board">
          ADD YOUR FREE CREW PIN
          <ArrowRight size={15} />
        </Link>
      </div>
    </main>
  );
}
