"use client";
import { useEffect, useId, useRef, useState } from "react";
import {
  ArrowUpRight,
  X,
  Play,
  FileText,
  LockKeyhole,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { Episode, siteConfig } from "@/lib/data";
import { getWatchUrl, isEpisodeReleased } from "@/lib/release";
import { SceneArt } from "./art";
export function DossierModal({
  episode,
  open,
  onClose,
}: {
  episode: Episode;
  open: boolean;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const released = isEpisodeReleased(episode);
  useEffect(() => {
    const dialog = ref.current;
    if (open && !dialog?.open) dialog?.showModal();
    else if (!open && dialog?.open) dialog.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      className="dossier-modal"
      onCancel={onClose}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === ref.current) {
          const r = ref.current.getBoundingClientRect();
          if (
            event.clientX < r.left ||
            event.clientX > r.right ||
            event.clientY < r.top ||
            event.clientY > r.bottom
          )
            onClose();
        }
      }}
      aria-labelledby={titleId}
    >
      <div className="dossier-paper">
        <button
          className="icon-button close-modal"
          onClick={onClose}
          aria-label="Close case file"
        >
          <X size={20} />
        </button>
        <span className="eyebrow">
          CRIMEX HOUSE / SEASON 01 / FILE{" "}
          {String(episode.part).padStart(2, "0")}
        </span>
        <h2 id={titleId}>{episode.title}</h2>
        <div className="dossier-divider" />
        {released ? (
          <>
            <span className="eyebrow">INCIDENT REPORT</span>
            <p>{episode.summary}</p>
            <div className="law-card">
              <span className="stamp">FEDERAL FELONY</span>
              <FileText size={24} />
              <h3>{episode.realLawRule}</h3>
              <p>{episode.lawExplanation}</p>
            </div>
            <div className="clue-card">
              <span className="eyebrow">RECOVERED INTELLIGENCE</span>
              <p>{episode.recoveredIntelligence ?? episode.safeClue}</p>
            </div>
            <div className="dossier-actions">
              <a
                href={getWatchUrl(episode, siteConfig.instagramUrl)}
                target="_blank"
                rel="noreferrer"
                className="button dark-button"
              >
                <Play size={15} /> Watch on Instagram
                <ArrowUpRight size={15} />
              </a>
              <Link href="/safe" onClick={onClose} className="text-link">
                Crack the safe
                <ArrowRight size={16} />
              </Link>
            </div>
            <small>
              Fictional case file. Law references are for story context, not
              legal advice.
            </small>
          </>
        ) : (
          <div className="teaser-dossier">
            <LockKeyhole size={32} />
            <span className="stamp">DROPS {siteConfig.dropLabel}</span>
            <p>
              File {String(episode.part).padStart(2, "0")} declassifies when the
              Reel goes live on {siteConfig.handle}
            </p>
            <p className="teaser-note">
              Until then, the evidence stays sealed. Follow the account and be
              there for the premiere.
            </p>
            <a
              href={siteConfig.instagramUrl}
              target="_blank"
              rel="noreferrer"
              className="button dark-button"
            >
              FOLLOW {siteConfig.handle.toUpperCase()}
              <ArrowUpRight size={15} />
            </a>
          </div>
        )}
      </div>
    </dialog>
  );
}
export function EpisodeCard({
  episode,
  compact = false,
}: {
  episode: Episode;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const released = isEpisodeReleased(episode);
  const live = episode.status === "LIVE" && released;
  const available = episode.status !== "LOCKED";
  return (
    <>
      <button
        className={`episode-card ${available ? "is-live" : "is-locked"} ${compact ? "compact" : ""}`}
        disabled={!available}
        onClick={() => setOpen(true)}
        aria-label={
          available
            ? `Open Part ${episode.part}: ${episode.title}`
            : `Part ${episode.part} locked`
        }
      >
        <div className="episode-visual">
          {available && <SceneArt src={episode.image} />}
          <span className="episode-number">
            {String(episode.part).padStart(2, "0")}
          </span>
          <span className={`status-badge ${live ? "live" : ""}`}>
            {live ? (
              <>
                <span className="live-dot" />
                LIVE NOW
              </>
            ) : available ? (
              released ? (
                <>FILE OPEN</>
              ) : (
                <>DROPS {siteConfig.dropLabel}</>
              )
            ) : (
              <>
                <LockKeyhole size={10} />
                LOCKED
              </>
            )}
          </span>
          {released ? (
            <span className="play-circle">
              <Play size={22} fill="currentColor" />
            </span>
          ) : (
            <LockKeyhole className="locked-icon" size={26} />
          )}
          <span className="episode-runtime">
            {available ? episode.runtime : "AWAITING CLEARANCE"}
          </span>
        </div>
        <div className="episode-info">
          <span className="eyebrow">
            SEASON 01 · PART {String(episode.part).padStart(2, "0")}
          </span>
          <h3>
            {episode.title}
            {available && <ArrowUpRight size={18} />}
          </h3>
          <p>{available && !released ? episode.teaser : episode.subtitle}</p>
        </div>
      </button>
      <DossierModal
        episode={episode}
        open={open}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
export function WatchButton({ episode }: { episode: Episode }) {
  const released = isEpisodeReleased(episode);
  return (
    <a
      className={`button primary ${released ? "" : "follow-button"}`}
      href={getWatchUrl(episode, siteConfig.instagramUrl)}
      target="_blank"
      rel="noreferrer"
    >
      {released && <Play size={16} fill="currentColor" />}
      <span>
        {released
          ? `WATCH PART ${String(episode.part).padStart(2, "0")}`
          : `FOLLOW ${siteConfig.handle.toUpperCase()} FOR PART ${String(episode.part).padStart(2, "0")}`}
      </span>
      <ArrowUpRight size={16} />
    </a>
  );
}
