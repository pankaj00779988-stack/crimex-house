"use client";
import {
  Check,
  ArrowUpRight,
  Truck,
  Route,
  Fingerprint,
  Users,
  Radio,
  LockKeyhole,
} from "lucide-react";
import { activeEpisode, siteConfig, type Episode } from "@/lib/data";
import { isEpisodeReleased } from "@/lib/release";
import { useStoredState } from "@/lib/storage";
import { useState } from "react";
type Choice = "optionA" | "optionB" | "";
const isChoice = (v: unknown): v is Choice =>
  v === "optionA" || v === "optionB" || v === "";
export function Vote({ episode = activeEpisode }: { episode?: Episode }) {
  return isEpisodeReleased(episode) ? (
    <LiveVote episode={episode} />
  ) : (
    <LockedVote episode={episode} />
  );
}
function LockedVote({ episode }: { episode: Episode }) {
  return (
    <section className="vote-widget vote-standby" aria-labelledby="vote-title">
      <div className="vote-top">
        <span className="eyebrow">
          <Radio size={12} />
          CREW DECISION
        </span>
        <span className="status-badge">
          <LockKeyhole size={11} />
          STANDBY
        </span>
      </div>
      <div className="standby-emblem">
        <LockKeyhole size={36} />
      </div>
      <h2 id="vote-title">CREW VOTE LOCKED</h2>
      <p className="standby-unlock">
        UNLOCKS WHEN PART {String(episode.part).padStart(2, "0")} DROPS AT{" "}
        {siteConfig.dropLabel}
      </p>
      <p>
        No spoilers. No early moves.
        <br />
        Watch the premiere. Then call the next shot.
      </p>
      <div className="vote-bottom">
        <Fingerprint size={15} />
        <span>YOUR FIRST DECISION IS ALMOST HERE.</span>
      </div>
      <a
        className="text-link"
        href={siteConfig.instagramUrl}
        target="_blank"
        rel="noreferrer"
      >
        FOLLOW THE PREMIERE
        <ArrowUpRight size={14} />
      </a>
    </section>
  );
}
function LiveVote({ episode }: { episode: Episode }) {
  const [vote, setVote] = useStoredState<Choice>(
    `crimex:vote:${episode.id}`,
    "",
    isChoice,
  );
  const [error, setError] = useState("");
  const seed = episode.initialVotes ?? { optionA: 0, optionB: 0 };
  const a = seed.optionA + (vote === "optionA" ? 1 : 0);
  const b = seed.optionB + (vote === "optionB" ? 1 : 0);
  const total = a + b;
  const options = [
    { id: "optionA" as const, count: a, icon: Truck },
    { id: "optionB" as const, count: b, icon: Route },
  ];
  return (
    <section className="vote-widget" aria-labelledby="vote-title">
      <div className="vote-top">
        <span className="eyebrow">
          <Radio size={12} />
          CREW DECISION
        </span>
        <span className="status-badge live">
          <span className="live-dot" />
          VOTING OPEN
        </span>
      </div>
      <h2 id="vote-title">{episode.voteHeading ?? "Your move. Your call."}</h2>
      <p>{episode.voteContext ?? episode.subtitle}</p>
      <div className="vote-options">
        {options.map(({ id, count, icon: Icon }, index) => {
          const raw = episode.choices?.[index] ?? "";
          const [label, detail] = raw.split(" (");
          const percent = total ? Math.round((count / total) * 100) : 0;
          return (
            <button
              key={id}
              className={`vote-option ${vote === id ? "selected" : ""}`}
              aria-pressed={vote === id}
              disabled={!!vote}
              onClick={() => {
                if (!setVote(id))
                  setError(
                    "Storage is unavailable. Enable browser storage to save your vote.",
                  );
              }}
            >
              <span className="vote-option-title">
                <span className="vote-option-icon">
                  <Icon size={19} />
                </span>
                <span>
                  <strong>{label}</strong>
                  <small>{detail?.replace(")", "")}</small>
                </span>
                <span className="vote-percent">
                  {percent}%{vote === id && <Check size={12} />}
                </span>
              </span>
              <span className="vote-bar">
                <span style={{ width: `${percent}%` }} />
              </span>
              <span className="vote-option-foot">
                <span>
                  {episode.choiceStrategies?.[index] ?? "Choose the next move."}
                </span>
                <span>
                  {vote === id
                    ? "YOUR VOTE"
                    : `OPTION ${index === 0 ? "A" : "B"}`}
                </span>
              </span>
            </button>
          );
        })}
      </div>
      <div className="vote-total">
        <span>
          <Users size={13} />
          {total.toLocaleString("en-US")} VOTES
        </span>
        <span>
          <span className="live-dot" />
          CREW IS DECIDING
        </span>
      </div>
      <div className="vote-bottom" aria-live="polite">
        <Fingerprint size={15} />
        <span>
          {error ||
            (vote
              ? "Vote locked. Your move is on the record."
              : "One crew. One choice. You write the next part.")}
        </span>
        {!vote && <ArrowUpRight size={13} />}
      </div>
      <small className="local-note">
        Episode tally + your vote · saved on this device
      </small>
    </section>
  );
}
