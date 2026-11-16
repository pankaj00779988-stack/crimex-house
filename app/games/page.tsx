import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Gamepad2 } from "lucide-react";
import { Hud } from "@/components/shell";
import {
  MemoryGame,
  ReactionGame,
  SealedEpisodeGame,
} from "@/components/arcade";
import { activeEpisodeReleased } from "@/lib/data";
export const metadata: Metadata = {
  title: "Free Crew Games",
  description:
    "Play Dead Drop and Signal Intercept. Free heist practice games, no account required.",
};
export default function GamesPage() {
  return (
    <main id="main" className="page-container subpage">
      <div className="page-kicker">
        <span>
          <Gamepad2 size={13} />
          CREW TRAINING GROUND
        </span>
        <span>FREE TO PLAY / NO ACCOUNT NEEDED</span>
      </div>
      <Hud />
      <header className="page-title">
        <span className="eyebrow pink">GET YOUR HEAD IN THE GAME</span>
        <h1>
          SHARP EYES.
          <br />
          <span>FASTER MOVES.</span>
        </h1>
        <p>
          While the case is under seal, sharpen your memory and timing. Two
          original practice games. No story spoilers.
        </p>
      </header>
      <div className="arcade-grid">
        <MemoryGame />
        <ReactionGame />
      </div>
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
