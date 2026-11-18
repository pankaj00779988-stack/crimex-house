import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Fingerprint,
  LockKeyhole,
  MessageCircle,
  Play,
  ScanLine,
  Youtube,
} from "lucide-react";
import { Hud } from "@/components/shell";
import { SceneArt } from "@/components/art";
import { getPublicEpisode } from "@/lib/release";
import { Engagement } from "@/components/share";
import { Vote } from "@/components/vote";
import { EpisodeCard, WatchButton } from "@/components/dossier";
import {
  activeEpisode,
  activeEpisodeReleased,
  latestEpisode,
  latestEpisodeReleased,
  siteConfig,
} from "@/lib/data";
import heist from "@/data/heist.json";

export default function Home() {
  return (
    <main id="main" className="page-container hq-v2">
      <div className="hq-status">
        <span>
          <span className="live-dot" />
          {activeEpisodeReleased
            ? "THE OPERATION IS LIVE"
            : "THE HOUSE IS OPEN. THE FIRST FILE IS SEALED."}
        </span>
        <span>AN INTERACTIVE HEIST SERIES</span>
      </div>
      <section className="cinema-hero" aria-labelledby="hq-title">
        <SceneArt priority src={siteConfig.artwork} className="cinema-art" />
        <div className="cinema-shade" />
        <div className="cinema-copy">
          <div className="cinema-label">
            <span className="season-label">SEASON 01</span>
            <span className="eyebrow">FICTION. FINANCE. FELONIES.</span>
          </div>
          <h1 id="hq-title">
            FIVE MILLION.
            <br />
            ZERO <span>ALIBIS.</span>
          </h1>
          <p>
            A fictional heist. A real choice.
            <br />
            Watch the story. <strong>Tell us the next move.</strong>
          </p>
          <div className="cinema-actions">
            <WatchButton episode={getPublicEpisode(latestEpisode)} />
            <Link className="cinema-game-link" href="/games#room-17">
              PLAY THE FREE CASE
              <ArrowRight size={17} />
            </Link>
          </div>
          <span className="cinema-fineprint">
            The crew calls the shots in the Instagram comments.
          </span>
        </div>
        <div className="cinema-stamp">
          <span className="stamp">
            {latestEpisodeReleased ? "LIVE NOW" : "COMING SOON"}
          </span>
          <span>
            PART {String(latestEpisode.part).padStart(2, "0")}
            {latestEpisode.runtime
              ? ` / ${latestEpisode.runtime}`
              : " / ON INSTAGRAM"}
          </span>
        </div>
        <div className="cinema-caption">
          <ScanLine size={14} />
          <span>CRIMEX HOUSE / A NIGHT WITH NO CLEAN GETAWAY</span>
          <span className="cinema-frame">FRAME 001</span>
        </div>
      </section>
      <Hud />
      <section className="hq-case-section" aria-labelledby="case-title">
        <div className="hq-section-heading">
          <div>
            <span className="eyebrow pink">
              PART {String(activeEpisode.part).padStart(2, "0")} / YOUR NEXT MOVE
            </span>
            <h2 id="case-title">The next move has a price.</h2>
          </div>
          <Link href="/files" className="text-link">
            OPEN THE ARCHIVE
            <ArrowUpRight size={16} />
          </Link>
        </div>
        <div className="hq-case-split">
          <EpisodeCard episode={getPublicEpisode(activeEpisode)} />
          <Vote />
        </div>
      </section>
      <section
        className="hq-missions-callout"
        aria-labelledby="hq-missions-title"
      >
        <div>
          <span className="eyebrow pink">THE DAILY BRIEFING IS OPEN</span>
          <h2 id="hq-missions-title">Make your next move count.</h2>
          <p>
            Complete daily missions. Earn Crew Credits. Unlock your personal
            Crew ID wallpaper.
          </p>
        </div>
        <Link href="/missions" className="button primary">
          DAILY MISSIONS <ArrowRight size={16} />
        </Link>
      </section>

      <section className="hq-path" aria-label="How the crew changes the story">
        {[
          {
            number: "01",
            title: "Watch the Reel.",
            text: "The first bad decision starts on Instagram.",
            icon: Play,
          },
          {
            number: "02",
            title: "Comment your move.",
            text: "Your comment is your vote. The story follows.",
            icon: MessageCircle,
          },
          {
            number: "03",
            title: "Read the evidence.",
            text: "Open the files. Find the clue. Crack the vault.",
            icon: Fingerprint,
          },
        ].map((step) => (
          <div key={step.number}>
            <span className="hq-path-number">{step.number}</span>
            <div>
              <h2>
                <step.icon size={16} />
                {step.title}
              </h2>
              <p>{step.text}</p>
            </div>
          </div>
        ))}
      </section>

      <section className="hq-feature-case" aria-labelledby="free-case-title">
        <div className="feature-room-visual">
          <SceneArt src={siteConfig.artwork} />
          <span className="feature-case-tab">CASE ZERO / FREE TO PLAY</span>
          <span className="feature-room-number">17</span>
          <span className="feature-room-caption">THE ROOM HAS ANSWERS.</span>
        </div>
        <div className="feature-room-copy">
          <span className="eyebrow pink">YOUR FIRST JOB IS WAITING</span>
          <h2 id="free-case-title">
            ROOM <span>17.</span>
          </h2>
          <p>{heist.tagline}</p>
          <p className="feature-room-description">
            Inspect the room. Decode the locked case. Recover the ledger. Then
            choose what follows you out.
          </p>
          <div className="feature-room-stakes">
            <span>
              <strong>8</strong>MOVES
            </span>
            <span>
              <strong>3</strong>EXITS
            </span>
            <span>
              <strong>1</strong>LEDGER
            </span>
          </div>
          <Link href="/games#room-17" className="button primary">
            ENTER ROOM 17
            <ArrowRight size={17} />
          </Link>
          <span className="feature-room-note">
            A complete practice case. No account. No Part 01 spoilers.
          </span>
        </div>
      </section>

      <Engagement />
      <div className="hq-crew-invite">
        <Fingerprint size={26} />
        <div>
          <h2>Your first theory belongs on the board.</h2>
          <p>
            Save a free personal pin and keep your theory ready for the Reel.
          </p>
        </div>
        <Link href="/board" className="text-link">
          MAKE YOUR CREW PIN
          <ArrowRight size={16} />
        </Link>
      </div>

      <section className="youtube-callout" aria-labelledby="youtube-title">
        <div className="youtube-mark" aria-hidden="true">
          <Youtube size={30} />
        </div>
        <div className="youtube-copy">
          <span className="eyebrow pink">THE OFFICIAL YOUTUBE VAULT</span>
          <h2 id="youtube-title">Stay for the longer story.</h2>
          <p>
            Full-length episodes are coming soon. Join the crew and tap the
            bell.
          </p>
        </div>
        <a
          className="button button-outline"
          href={siteConfig.youtubeUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          SUBSCRIBE ON YOUTUBE
          <ArrowUpRight size={16} />
        </a>
      </section>

      <section className="crew-faq hq-faq" aria-labelledby="faq-title">
        <div className="hq-section-heading">
          <div>
            <span className="eyebrow pink">THE QUICK BRIEFING</span>
            <h2 id="faq-title">Before you get involved.</h2>
          </div>
          <LockKeyhole size={25} />
        </div>
        {siteConfig.faq.map((item) => (
          <details key={item.question}>
            <summary>
              {item.question}
              <span>+</span>
            </summary>
            <p>{item.answer}</p>
          </details>
        ))}
      </section>
    </main>
  );
}
