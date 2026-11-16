import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Play,
  Fingerprint,
  LockKeyhole,
  Crosshair,
  MousePointer2,
  MapPin,
  ScanLine,
} from "lucide-react";
import { Hud } from "@/components/shell";
import { SceneArt } from "@/components/art";
import { Vote } from "@/components/vote";
import { EpisodeCard, WatchButton } from "@/components/dossier";
import { activeEpisode, episodes, siteConfig } from "@/lib/data";
export default function Home() {
  return (
    <main id="main" className="page-container">
      <div className="page-kicker">
        <span>
          <span className="live-dot" />
          THE OPERATION IS LIVE
        </span>
        <span>
          INTERACTIVE HEIST SERIES / S
          {String(siteConfig.season).padStart(2, "0")}
        </span>
      </div>
      <Hud />
      <section className="hero">
        <SceneArt priority src={activeEpisode.image} />
        <div className="hero-shade" />
        <div className="hero-content">
          <div className="hero-label">
            <span className="season-label">SEASON 01</span>
            <span>FICTION. FINANCE. FELONIES.</span>
          </div>
          <h1>
            FIVE MILLION.
            <br />
            ZERO <span>ALIBIS.</span>
          </h1>
          <p className="hero-description">
            The cash is stolen. The tracker is live.
            <br />
            And the next bad decision? <strong>That’s yours.</strong>
          </p>
          <div className="hero-actions">
            <WatchButton episode={activeEpisode} />
            <Link href="/safe" className="hero-safe-link">
              <LockKeyhole size={16} />
              CRACK THE SAFE
              <ArrowUpRight size={15} />
            </Link>
          </div>
          <div className="hero-evidence">
            <span className="evidence-line" />
            <span className="eyebrow">
              EXHIBIT {String(activeEpisode.part).padStart(3, "0")}
            </span>
            <strong>{activeEpisode.title}</strong>
            <span className="hero-evidence-sub">
              {activeEpisode.exhibitNote}
            </span>
          </div>
          <span className="hero-coordinate">
            <MapPin size={11} />
            {activeEpisode.location ?? "LOCATION REDACTED"} ·{" "}
            {activeEpisode.timestamp}
          </span>
        </div>
        <div className="hero-vote">
          <Vote />
        </div>
        <span className="hero-stamp stamp">NO CLEAN GETAWAY</span>
      </section>
      <div className="transmission">
        <span>
          <ScanLine size={14} />
          <strong>THIS ISN’T JUST A SERIES.</strong> YOU’RE PART OF THE CREW.
        </span>
        <span className="transmission-right">
          <span className="live-dot" />
          TRANSMISSION ACTIVE
        </span>
      </div>
      <section className="how-section" aria-labelledby="how-title">
        <div className="section-heading">
          <div>
            <span className="eyebrow pink">THE RULES OF ENGAGEMENT</span>
            <h2 id="how-title">Watch. Decide. Get your hands dirty.</h2>
          </div>
          <span className="mono muted hide-mobile">
            THREE STEPS. NO GOING BACK.
          </span>
        </div>
        <div className="steps">
          {[
            {
              number: "01",
              title: "Watch the heist.",
              text: "60-second episodes. Real financial laws. Fictional people making very expensive mistakes.",
              icon: Play,
              href: "/files",
              action: "OPEN THE CASE FILES",
            },
            {
              number: "02",
              title: "Call the next move.",
              text: "Decoy or run? Trust or betray? The crew votes. The next episode lives with the consequences.",
              icon: MousePointer2,
              href: "/#vote-title",
              action: "CAST YOUR VOTE",
            },
            {
              number: "03",
              title: "Crack what’s hidden.",
              text: "Every detail is a clue. Find the code, open the safe, and leave your name at the scene.",
              icon: Fingerprint,
              href: "/safe",
              action: "ENTER THE SAFE",
            },
          ].map((step) => (
            <Link className="step" key={step.number} href={step.href}>
              <div className="step-top">
                <step.icon size={22} />
                <span>{step.number}</span>
              </div>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
              <span className="step-link">
                {step.action}
                <ArrowUpRight size={14} />
              </span>
            </Link>
          ))}
        </div>
      </section>
      <section className="files-preview" aria-labelledby="files-title">
        <div className="section-heading">
          <div>
            <span className="eyebrow pink">THE PAPER TRAIL</span>
            <h2 id="files-title">Every part. Every piece of evidence.</h2>
          </div>
          <Link href="/files" className="text-link mono">
            ALL CASE FILES
            <ArrowRight size={17} />
          </Link>
        </div>
        <div className="preview-grid">
          {episodes.slice(0, 3).map((e) => (
            <EpisodeCard key={e.id} episode={e} compact />
          ))}
        </div>
      </section>
      <section className="crew-banner">
        <div className="crew-banner-icon">
          <Crosshair size={36} />
        </div>
        <div>
          <span className="eyebrow pink">YOU’RE ALREADY INVOLVED.</span>
          <h2>Might as well leave your name.</h2>
          <p>Get pinned to the board. Become part of the story.</p>
        </div>
        <Link href="/board" className="button outline">
          JOIN THE CORKBOARD
          <ArrowUpRight size={16} />
        </Link>
        <span className="crew-banner-decor" aria-hidden="true">
          CLASSIFIED
        </span>
      </section>
    </main>
  );
}
