"use client";
import { useState } from "react";
import {
  ArrowUpRight,
  Copy,
  Heart,
  LockKeyhole,
  MessageCircle,
  Share2,
} from "lucide-react";
import { activeEpisode, siteConfig, type Episode } from "@/lib/data";
import { isEpisodeReleased } from "@/lib/release";

export function ShareButton({
  label = "SHARE WITH THE CREW",
  text = siteConfig.participation.shareText,
}: {
  label?: string;
  text?: string;
}) {
  const [message, setMessage] = useState("");
  const [manual, setManual] = useState(false);
  async function share() {
    const payload = {
      title: siteConfig.seriesTitle,
      text,
      url: siteConfig.siteUrl,
    };
    setMessage("");
    setManual(false);
    if (
      navigator.share &&
      (!navigator.canShare || navigator.canShare(payload))
    ) {
      try {
        await navigator.share(payload);
        setMessage("Thanks for sharing the case.");
        return;
      } catch (error) {
        if (
          typeof error === "object" &&
          error !== null &&
          "name" in error &&
          error.name === "AbortError"
        )
          return;
      }
    }
    try {
      await navigator.clipboard.writeText(siteConfig.siteUrl);
      setMessage("Website link copied. Send it to your crew.");
    } catch {
      setManual(true);
      setMessage("Copy this link to share the website.");
    }
  }
  return (
    <div className="share-control">
      <button className="button button-outline" onClick={() => void share()}>
        <Share2 size={15} />
        {label}
      </button>
      {message && (
        <p className="action-message" role="status">
          {message}
        </p>
      )}
      {manual && (
        <input
          className="manual-share-link"
          value={siteConfig.siteUrl}
          readOnly
          aria-label="Website link to copy"
          onFocus={(e) => e.target.select()}
        />
      )}
    </div>
  );
}

export function CommentLink({
  text,
  reelUrl,
  label = "COMMENT ON INSTAGRAM",
}: {
  text: string;
  reelUrl: string;
  label?: string;
}) {
  const [message, setMessage] = useState("");
  function copy() {
    if (!text) return;
    if (!navigator.clipboard) {
      setMessage(`Copy your comment: ${text}`);
      return;
    }
    void navigator.clipboard
      .writeText(text)
      .then(() =>
        setMessage("Comment copied. Paste it into the Reel’s comments."),
      )
      .catch(() => setMessage(`Copy your comment: ${text}`));
  }
  return (
    <div className="comment-control">
      <a
        className="button primary"
        href={reelUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={copy}
      >
        <MessageCircle size={15} />
        {label}
        <ArrowUpRight size={14} />
      </a>
      <p className="action-message" role="status">
        {message}
      </p>
    </div>
  );
}

export function Engagement({ episode = activeEpisode }: { episode?: Episode }) {
  const released = isEpisodeReleased(episode);
  return (
    <section
      id="join-crew"
      className="engagement-section"
      aria-labelledby="engagement-title"
    >
      <div>
        <span className="eyebrow pink">YOUR NEXT MOVE COSTS NOTHING</span>
        <h2 id="engagement-title">A comment can change the case.</h2>
        <p>
          {released
            ? "Watch the Reel, like it, and tell the crew what you would do. Your Instagram comment casts the vote."
            : "The first Reel is on its way. Follow the premiere, share HQ with a friend, and get ready to leave your first theory."}
        </p>
      </div>
      <div className="engagement-actions">
        {released ? (
          <>
            <a
              className="button button-outline"
              href={episode.reelUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Heart size={15} />
              LIKE ON INSTAGRAM
              <ArrowUpRight size={13} />
            </a>
            <a
              className="button primary"
              href={episode.reelUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <MessageCircle size={15} />
              COMMENT YOUR THEORY
              <ArrowUpRight size={13} />
            </a>
          </>
        ) : (
          <>
            <button className="button button-outline" disabled>
              <Heart size={15} />
              LIKE THE REEL
              <LockKeyhole size={12} />
            </button>
            <button className="button button-outline" disabled>
              <MessageCircle size={15} />
              COMMENTS OPEN AT PREMIERE
              <LockKeyhole size={12} />
            </button>
          </>
        )}
        <ShareButton label="SHARE HQ" />
      </div>
      <span className="engagement-note">
        <Copy size={12} />
        {released
          ? "Likes and comments happen on Instagram. Sharing opens your device’s share options or copies the website link."
          : "Like and comment actions unlock with the Instagram Reel. Sharing HQ is open now."}
      </span>
    </section>
  );
}
