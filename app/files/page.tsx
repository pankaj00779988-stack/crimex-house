import type { Metadata } from "next";
import { FolderOpen } from "lucide-react";
import { isEpisodeReleased, getPublicEpisode } from "@/lib/release";
import { Hud } from "@/components/shell";
import { EpisodeCard } from "@/components/dossier";
import { episodes, siteConfig } from "@/lib/data";
export const metadata: Metadata = { title: "Case Files" };
export default function FilesPage() {
  return (
    <main id="main" className="page-container subpage">
      <div className="page-kicker">
        <span>
          <FolderOpen size={13} />
          THE ARCHIVE
        </span>
        <span>ACCESS LEVEL: CREW</span>
      </div>
      <Hud />
      <header className="page-title">
        <span className="eyebrow pink">SEASON 01 / THE PAPER TRAIL</span>
        <h1>
          NOTHING STAYS
          <br />
          <span>BURIED FOREVER.</span>
        </h1>
        <p>
          Six parts. Five million dollars. Follow the evidence from the first
          bad decision to the last.
        </p>
      </header>
      <div className="archive-heading">
        <span className="mono">SEASON 01 — CASE FILES</span>
        <span className="mono muted">
          {episodes.filter(isEpisodeReleased).length} DECLASSIFIED /{" "}
          {episodes.length} FILES
        </span>
      </div>
      <section className="files-grid" aria-label="Season one episodes">
        {episodes.map((episode) => (
          <EpisodeCard key={episode.id} episode={getPublicEpisode(episode)} />
        ))}
      </section>
      <p className="archive-note">
        <span className="live-dot" />
        The next part is in production. Follow{" "}
        <a href={siteConfig.instagramUrl} target="_blank" rel="noopener noreferrer">
          {siteConfig.handle}
        </a>{" "}
        for confirmed release updates. Locked files open as the story unfolds.
      </p>
    </main>
  );
}
