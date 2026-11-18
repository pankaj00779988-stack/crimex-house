"use client";
import { useState } from "react";
import Link from "next/link";
import { CommentLink, ShareButton } from "./share";
import { isEpisodeReleased } from "@/lib/release";
import {
  ArrowUpRight,
  Check,
  Crosshair,
  Fingerprint,
  MapPin,
  Radio,
  ArrowRight,
  Gamepad2,
  MessageCircle,
  UserRound,
} from "lucide-react";
import {
  activeEpisode,
  vaultEpisode,
  episodes,
  corkboard,
  siteConfig,
} from "@/lib/data";
import { normalizeHandle, validHandle } from "@/lib/game";
import { isString, useStoredState } from "@/lib/storage";
import { crewCompletionKey, crewDraftKey } from "@/lib/crew-browser";
import { useCrewIdentity, type CrewIdentity } from "./crew-identity";
const evidenceEpisode =
  episodes.find((episode) => episode.id === corkboard.episodeId) ??
  activeEpisode;
function EvidenceVisual({ kind }: { kind: string }) {
  if (kind === "silhouette")
    return (
      <div className="suspect-visual">
        <UserRound size={72} strokeWidth={1} />
        <span>IDENTITY REDACTED</span>
        <i />
        <i />
      </div>
    );
  if (kind === "beacon")
    return (
      <div className="beacon-visual">
        <div className="cash-bundle">
          <span>50</span>
          <strong>$100</strong>
          <span>FEDERAL RESERVE NOTE</span>
        </div>
        <span className="tracker">
          <Radio size={15} />
          <i />
        </span>
      </div>
    );
  return (
    <div className="map-visual">
      <svg viewBox="0 0 220 110" aria-hidden="true">
        <path d="m-10 30 250 30M30-10l30 140M135-10l-20 140M-10 100l220-90M180-10l-5 140M0 5l230 84" />
        <path className="map-route" d="M55 76 108 46l67 28" />
        <circle cx="108" cy="46" r="23" />
        <circle cx="108" cy="46" r="5" />
      </svg>
      <MapPin size={17} />
      <span>SIGNAL ACQUIRED</span>
    </div>
  );
}
interface CrewDraft {
  handle: string;
  theory: string;
}
const emptyDraft: CrewDraft = { handle: "", theory: "" };
const isDraft = (value: unknown): value is CrewDraft => {
  if (!value || typeof value !== "object") return false;
  const v = value as CrewDraft;
  return (
    typeof v.handle === "string" &&
    validHandle(v.handle) &&
    typeof v.theory === "string" &&
    v.theory.length <= siteConfig.participation.maxTheoryLength
  );
};
export function InvestigationBoard() {
  const { account, loading } = useCrewIdentity();
  return (
    <PersonalBoard
      key={account?.handle ?? "guest"}
      account={account}
      loading={loading}
    />
  );
}
function PersonalBoard({
  account,
  loading,
}: {
  account: CrewIdentity | null;
  loading: boolean;
}) {
  const [saved, setSaved] = useStoredState(
    crewDraftKey(account?.handle),
    emptyDraft,
    isDraft,
  );
  const [draftTheory, setDraftTheory] = useState<string | null>(null);
  const [handle, setHandle] = useState("");
  const [message, setMessage] = useState("");
  const [completion] = useStoredState(
    crewCompletionKey(vaultEpisode.id, account?.handle),
    "",
    isString,
  );
  const theory = draftTheory ?? saved.theory;
  const released = isEpisodeReleased(activeEpisode);
  const preview = loading
    ? "CHECKING ACCOUNT…"
    : (account?.handle ??
      (handle.trim()
        ? normalizeHandle(handle).slice(0, 31)
        : saved.handle || completion || "@your.handle"));
  return (
    <div className="board-layout">
      <section
        className="investigation-board"
        aria-label="Investigation corkboard"
      >
        <div className="board-corner top-left" />
        <div className="board-corner top-right" />
        <div className="board-corner bottom-left" />
        <div className="board-corner bottom-right" />
        <div className="board-top">
          <span className="eyebrow">
            <Crosshair size={13} />
            PART {String(evidenceEpisode.part).padStart(2, "0")} EVIDENCE /{" "}
            {evidenceEpisode.title}
          </span>
          <span className="mono">CASE #CH–001</span>
        </div>
        <div className="board-strings" aria-hidden="true">
          <svg viewBox="0 0 650 630" preserveAspectRatio="none">
            <path d="M150 100 450 170 190 350 440 485 150 100M450 170 440 485M190 350 150 100" />
            <circle cx="150" cy="100" r="4" />
            <circle cx="450" cy="170" r="4" />
            <circle cx="190" cy="350" r="4" />
            <circle cx="440" cy="485" r="4" />
          </svg>
        </div>
        {corkboard.evidence.map((item, i) => (
          <article className={`evidence-card evidence-${i}`} key={item.id}>
            <span className="pushpin" />
            <span className="eyebrow">
              EVIDENCE {String(i + 1).padStart(3, "0")} / {item.label}
            </span>
            <EvidenceVisual kind={item.kind} />
            <h3>{item.title}</h3>
            <p>{item.note}</p>
            <span className="evidence-card-bottom">
              CH–S01 / {item.id.toUpperCase()}
              <Fingerprint size={13} />
            </span>
          </article>
        ))}
        <article className="persons-card">
          <span className="pushpin" />
          <span className="eyebrow pink">PERSONS OF INTEREST</span>
          <h3>
            EVERY NAME.
            <br />
            PART OF THE CASE.
          </h3>
          {corkboard.persons.length === 0 && (
            <p className="board-empty">
              The crew starts here. Preview your personal pin below.
            </p>
          )}
          <div className="persons-list">
            {corkboard.persons.map((person) => (
              <div key={person.number}>
                <span>#{person.number}</span>
                <strong>{person.handle}</strong>
                <Check size={12} />
              </div>
            ))}
            <div className="preview-person">
              <span>
                #{String(corkboard.persons.length + 1).padStart(3, "0")}
              </span>
              <strong>{preview}</strong>
              <span className="preview-label">
                {saved.handle && !handle ? "YOU" : "PREVIEW"}
              </span>
            </div>
          </div>
          <span className="board-preview-note">
            PERSONAL PREVIEW · SAVED ON YOUR DEVICE
          </span>
        </article>
        <span className="board-bottom-note">NOTHING IS COINCIDENCE.</span>
      </section>
      <aside className="crew-panel">
        <span className="eyebrow pink">THE FIRST CREW STARTS WITH YOU</span>
        <h2>
          YOUR HANDLE.
          <br />
          YOUR <span>THEORY.</span>
        </h2>
        <p>
          Join for free. Put your name on your board and get your first theory
          ready for the Reel.
        </p>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const chosenHandle =
              account?.handle || handle || saved.handle || completion;
            if (!validHandle(chosenHandle)) {
              setMessage(
                "Enter 1–30 letters, numbers, dots, or underscores for your Instagram handle.",
              );
              return;
            }
            if (
              setSaved({
                handle: normalizeHandle(chosenHandle),
                theory: theory.trim(),
              })
            )
              setMessage(
                "Your free crew pin and theory are saved on this device.",
              );
            else
              setMessage(
                "Browser storage is unavailable. You can still copy your theory and join the Instagram conversation.",
              );
          }}
        >
          <label className="form-label" htmlFor="board-handle">
            YOUR INSTAGRAM HANDLE
          </label>
          <div className="board-handle-wrap">
            <span>@</span>
            <input
              id="board-handle"
              value={account ? account.handle.replace(/^@/, "") : handle}
              readOnly={!!account}
              disabled={loading}
              onChange={(e) => {
                setHandle(e.target.value.replace(/^@/, ""));
                setMessage("");
              }}
              placeholder={saved.handle.replace(/^@/, "") || "your.handle"}
              autoComplete="off"
              maxLength={31}
              aria-describedby="crew-pin-note"
            />
          </div>
          {account && (
            <p className="crew-identity-note">
              Using your saved crew account.{" "}
              <Link href="/missions#crew-account">Manage account</Link>
            </p>
          )}
          <label className="form-label theory-label" htmlFor="board-theory">
            YOUR CASE THEORY <span>OPTIONAL</span>
          </label>
          <textarea
            id="board-theory"
            value={loading ? "" : theory}
            disabled={loading}
            onChange={(e) => setDraftTheory(e.target.value)}
            maxLength={siteConfig.participation.maxTheoryLength}
            placeholder="What would you do if you found the money?"
            rows={4}
          />
          <span className="theory-limit">
            {theory.length}/{siteConfig.participation.maxTheoryLength}
          </span>
          <button
            className="button primary crew-save"
            type="submit"
            disabled={loading}
          >
            SAVE MY FREE CREW PIN
            <ArrowUpRight size={16} />
          </button>
          <p className="action-message" role="status">
            {message}
          </p>
          <p id="crew-pin-note" className="crew-privacy">
            Your pin and theory stay on this device. Saving here does not
            publish to Instagram or the public board.
          </p>
        </form>
        {released && !loading && theory.trim() ? (
          <CommentLink
            text={theory.trim()}
            reelUrl={activeEpisode.reelUrl!}
            label={`COPY THEORY + OPEN PART ${String(activeEpisode.part).padStart(2, "0")}`}
          />
        ) : (
          <div className="crew-next">
            <MessageCircle size={18} />
            <p>
              {released
                ? `Part ${String(activeEpisode.part).padStart(2, "0")} is live. Draft your theory here, then post it in the Reel’s Instagram comments.`
                : "Save your theory here. Join the Instagram conversation when the next Reel is released."}
            </p>
          </div>
        )}
        <ShareButton label="INVITE A FRIEND" />
        <Link className="text-link crew-games-link" href="/games">
          <Gamepad2 size={16} />
          PLAY THE FREE PRACTICE GAMES
          <ArrowRight size={14} />
        </Link>
      </aside>
    </div>
  );
}
