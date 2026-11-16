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
  Youtube,
  Gamepad2,
  Radio,
  FolderOpen,
} from "lucide-react";
import { Hud } from "@/components/shell";
import { SceneArt } from "@/components/art";
import { getPublicEpisode } from "@/lib/release";
import { Engagement } from "@/components/share";
import games from "@/data/games.json";
import { Vote } from "@/components/vote";
import { EpisodeCard, WatchButton } from "@/components/dossier";
import {
  activeEpisode,
  activeEpisodeReleased,
  episodes,
  siteConfig,
} from "@/lib/data";
export default function Home() {
  return (
    <main id="main" className="page-container">
      <div className="page-kicker">
        <span>
          <span className="live-dot" />
          {activeEpisodeReleased
            ? "THE OPERATION IS LIVE"
            : "PRE-LAUNCH STANDBY"}
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
            <span className="premiere-badge">
              {activeEpisodeReleased
                ? "LIVE NOW"
                : `PREMIERING ${siteConfig.dropLabel}`}
            </span>
          </div>
          <h1>
            FIVE MILLION.
            <br />
            ZERO <span>ALIBIS.</span>
          </h1>
          <p className="hero-description">
            {activeEpisodeReleased ? (
              <>
                The cash is stolen. The tracker is live.
                <br />
                And the next bad decision? <strong>That’s yours.</strong>
              </>
            ) : (
              <>
                {activeEpisode.teaser}
                <br />
                Follow the series. Be there for the first move.
              </>
            )}
          </p>
          <div className="hero-actions">
            <WatchButton episode={getPublicEpisode(activeEpisode)} />
            <Link
              href={activeEpisodeReleased ? "/safe" : "/games"}
              className="hero-safe-link"
            >
              {activeEpisodeReleased ? (
                <LockKeyhole size={16} />
              ) : (
                <Gamepad2 size={16} />
              )}
              {activeEpisodeReleased ? "CRACK THE SAFE" : "PLAY FREE GAMES"}
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
          {activeEpisodeReleased
            ? "TRANSMISSION ACTIVE"
            : "TRANSMISSION ON STANDBY"}
        </span>
      </div>
      <section className="how-section" aria-labelledby="how-title">
        <div className="section-heading">
          <div>
            <span className="eyebrow pink">THE RULES OF ENGAGEMENT</span>
            <h2 id="how-title">Watch. Comment. Change the case.</h2>
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
              text: "Short episodes. Real financial laws. Fictional people making very expensive mistakes.",
              icon: Play,
              href: "/files",
              action: "OPEN THE CASE FILES",
            },
            {
              number: "02",
              title: "Call the next move.",
              text: "Watch the Reel and comment your choice on Instagram. The crew’s comments shape what happens next.",
              icon: MousePointer2,
              href: "/#join-crew",
              action: "JOIN THE CONVERSATION",
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
      <section className="games-preview" aria-labelledby="games-title">
        <div className="section-heading">
          <div>
            <span className="eyebrow pink">
              OPEN BEFORE THE PREMIERE · ALWAYS FREE
            </span>
            <h2 id="games-title">Get a head start on the heist.</h2>
          </div>
          <Link href="/games" className="text-link mono">
            THE TRAINING GROUND
            <ArrowRight size={16} />
          </Link>
        </div>
        <div className="game-preview-grid">
          {[
            { game: games.memory, icon: FolderOpen, skill: "MEMORY" },
            { game: games.reaction, icon: Radio, skill: "REACTION" },
          ].map(({ game, icon: Icon, skill }) => (
            <Link
              href={`/games#${game.id}`}
              className="game-preview-card"
              key={game.id}
            >
              <span className="status-badge live">FREE TO PLAY</span>
              <Icon size={30} />
              <span className="eyebrow">{skill} / PRACTICE MODE</span>
              <h3>{game.title}</h3>
              <p>{game.subtitle}</p>
              <span className="text-link">
                PLAY NOW
                <ArrowUpRight size={15} />
              </span>
            </Link>
          ))}
        </div>
      </section>
      <Engagement />
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
            <EpisodeCard key={e.id} episode={getPublicEpisode(e)} compact />
          ))}
        </div>
      </section>
      <section className="youtube-callout" aria-labelledby="youtube-title">
        <div className="youtube-mark" aria-hidden="true">
          <Youtube size={31} />
        </div>
        <div className="youtube-copy">
          <span className="eyebrow pink">THE OFFICIAL YOUTUBE VAULT</span>
          <h2 id="youtube-title">Join the crew on YouTube.</h2>
          <p>Full-length episodes coming soon. Subscribe and tap the bell.</p>
        </div>
        <a
          href={siteConfig.youtubeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="button primary"
          aria-label="Subscribe to CRIMEX HOUSE on YouTube (opens in a new tab)"
        >
          SUBSCRIBE ON YOUTUBE
          <ArrowUpRight size={16} />
        </a>
      </section>
      <section className="crew-banner">
        <div className="crew-banner-icon">
          <Crosshair size={36} />
        </div>
        <div>
          <span className="eyebrow pink">YOU’RE ALREADY INVOLVED.</span>
          <h2>Might as well leave your name.</h2>
          <p>Save a free personal crew pin. Bring your theory to Instagram.</p>
        </div>
        <Link href="/board" className="button outline">
          ADD MY FREE CREW PIN
          <ArrowUpRight size={16} />
        </Link>
        <span className="crew-banner-decor" aria-hidden="true">
          CLASSIFIED
        </span>
      </section>
      <section className="crew-faq" aria-labelledby="faq-title">
        <div className="section-heading">
          <div>
            <span className="eyebrow pink">THE QUICK BRIEFING</span>
            <h2 id="faq-title">Before your first move.</h2>
          </div>
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
