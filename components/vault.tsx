"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowRight,
  Check,
  Delete,
  Fingerprint,
  KeyRound,
  LockKeyhole,
  ShieldAlert,
  Volume2,
  VolumeX,
  UnlockKeyhole,
} from "lucide-react";
import { activeEpisode, siteConfig, type Episode } from "@/lib/data";
import { isEpisodeReleased } from "@/lib/release";
import { normalizeHandle, scoreGuess, validHandle } from "@/lib/game";
import { isBoolean, isNumber, isString, useStoredState } from "@/lib/storage";
import { useSound } from "@/lib/sound";
const emptyAttempts: string[] = [];
const isAttempts = (v: unknown): v is string[] =>
  Array.isArray(v) &&
  v.length <= siteConfig.safeMaxAttempts &&
  v.every((g) => typeof g === "string" && /^\d{4}$/.test(g));
export function Vault({ episode = activeEpisode }: { episode?: Episode }) {
  return isEpisodeReleased(episode) ? (
    <ActiveVault episode={episode} />
  ) : (
    <VaultStandby episode={episode} />
  );
}
function VaultStandby({ episode }: { episode: Episode }) {
  return (
    <section className="vault-standby" aria-labelledby="vault-standby-title">
      <span className="eyebrow pink">
        RESTRICTED ACCESS / PRE-LAUNCH STANDBY
      </span>
      <div className="standby-emblem">
        <LockKeyhole size={44} />
      </div>
      <h1 id="vault-standby-title">
        VAULT SEALED UNTIL PART {String(episode.part).padStart(2, "0")}{" "}
        IS RELEASED
      </h1>
      <p>
        The keypad and evidence are under seal. Watch the premiere to find your
        first lead.
      </p>
      <div className="sealed-keypad" aria-hidden="true">
        {Array.from({ length: 12 }, (_, i) => (
          <span key={i}>
            <LockKeyhole size={12} />
          </span>
        ))}
      </div>
      <a
        className="button primary"
        href={siteConfig.instagramUrl}
        target="_blank"
        rel="noreferrer"
      >
        FOLLOW {siteConfig.handle.toUpperCase()}
        <ArrowRight size={16} />
      </a>
      <Link className="text-link" href="/board">
        THE CORKBOARD IS OPEN
        <ArrowRight size={15} />
      </Link>
    </section>
  );
}
function ActiveVault({ episode }: { episode: Episode }) {
  const [attempts, setAttempts] = useStoredState(
    `crimex:safe:${episode.id}`,
    emptyAttempts,
    isAttempts,
  );
  const [misses, setMisses] = useStoredState("crimex:misses", 0, isNumber);
  const [sfx, setSfx] = useStoredState("crimex:sfx", true, isBoolean);
  const [completion, setCompletion] = useStoredState(
    `crimex:crew:${episode.id}`,
    "",
    isString,
  );
  const [input, setInput] = useState("");
  const [message, setMessage] = useState("");
  const [handle, setHandle] = useState("");
  const [handleError, setHandleError] = useState("");
  const play = useSound(sfx);
  const code = episode.safeCode ?? "";
  const unlocked = attempts.includes(code);
  const locked = !unlocked && attempts.length >= siteConfig.safeMaxAttempts;
  const press = useCallback(
    (key: string) => {
      if (unlocked || locked) return;
      if (key === "delete") {
        setInput((v) => v.slice(0, -1));
        play("click");
        return;
      }
      if (key === "enter") {
        if (input.length !== 4) {
          setMessage("Enter all four digits before submitting.");
          play("error");
          return;
        }
        if (!setAttempts([...attempts, input])) {
          setMessage(
            "Browser storage is unavailable. Enable it to save your attempts.",
          );
          return;
        }
        if (input === code) {
          play("unlock");
          setMessage("Vault unlocked. The evidence is yours.");
        } else {
          setMisses(misses + 1);
          play("error");
          setMessage(
            attempts.length + 1 >= siteConfig.safeMaxAttempts
              ? "Five attempts used. The vault is sealed for this episode."
              : `Wrong combination. Suspicion +${siteConfig.suspicionPerMiss}%. ${siteConfig.safeMaxAttempts - attempts.length - 1} attempts left.`,
          );
        }
        setInput("");
        return;
      }
      if (/^\d$/.test(key)) {
        setInput((v) => (v.length < 4 ? v + key : v));
        setMessage("");
        play("click");
      }
    },
    [
      unlocked,
      locked,
      input,
      attempts,
      code,
      setAttempts,
      setMisses,
      misses,
      play,
    ],
  );
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      )
        return;
      if (
        event.key === "Enter" &&
        event.target instanceof HTMLElement &&
        event.target.closest("a, button, summary") &&
        !event.target.closest(".keypad")
      )
        return;
      if (
        /^\d$/.test(event.key) ||
        ["Backspace", "Delete", "Enter"].includes(event.key)
      ) {
        event.preventDefault();
        press(
          event.key === "Enter"
            ? "enter"
            : ["Backspace", "Delete"].includes(event.key)
              ? "delete"
              : event.key,
        );
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [press]);
  return (
    <div className="vault-layout">
      <div className="vault-brief">
        <span className="eyebrow pink">RESTRICTED ACCESS / EXHIBIT 001</span>
        <h1>
          EVERY SAFE
          <br />
          HAS A <span>WEAKNESS.</span>
        </h1>
        <p>
          Four digits stand between you and the truth.
          <br />
          The combination was in the story all along.
        </p>
        <div className="vault-rules">
          <span>
            <KeyRound size={18} />
            <strong>4 DIGITS.</strong> ONE COMBINATION.
          </span>
          <span>
            <ShieldAlert size={18} />
            <strong>{siteConfig.safeMaxAttempts} ATTEMPTS.</strong> MAKE THEM
            COUNT.
          </span>
          <span>
            <Fingerprint size={18} />
            <strong>+{siteConfig.suspicionPerMiss}% SUSPICION.</strong> EVERY
            WRONG MOVE.
          </span>
        </div>
        <details className="clue-details">
          <summary>
            NEED A LEAD?<span>+</span>
          </summary>
          <p>{episode.safeClue}</p>
          <Link href="/files">
            Review the case file
            <ArrowRight size={14} />
          </Link>
        </details>
        <div className="feedback-legend">
          <span>
            <i className="exact" />
            RIGHT DIGIT, RIGHT PLACE
          </span>
          <span>
            <i className="present" />
            RIGHT DIGIT, WRONG PLACE
          </span>
          <span>
            <i className="miss" />
            NOT IN THE CODE
          </span>
        </div>
      </div>
      <section
        className={`vault-panel ${unlocked ? "vault-open" : ""}`}
        aria-label="Four digit vault keypad"
      >
        <div className="vault-panel-top">
          <span className="eyebrow">
            <LockKeyhole size={13} />
            CRIMEX SECURE SYSTEMS
          </span>
          <button
            className="sfx-button"
            onClick={() => {
              setSfx(!sfx);
            }}
            aria-pressed={sfx}
          >
            {sfx ? <Volume2 size={14} /> : <VolumeX size={14} />}SFX{" "}
            {sfx ? "ON" : "OFF"}
          </button>
        </div>
        <div className="vault-display">
          <span className={`vault-indicator ${locked ? "pink" : ""}`}>
            {unlocked ? <UnlockKeyhole size={25} /> : <LockKeyhole size={25} />}
          </span>
          <span className="eyebrow">
            {unlocked
              ? "ACCESS GRANTED"
              : locked
                ? "SYSTEM LOCKED"
                : "AWAITING COMBINATION"}
          </span>
          <div className="guess-grid">
            {Array.from({ length: siteConfig.safeMaxAttempts }, (_, row) => {
              const guess = attempts[row];
              const feedback = guess ? scoreGuess(guess, code) : null;
              const current = row === attempts.length && !unlocked && !locked;
              return (
                <div
                  className={`guess-row ${current ? "current" : ""}`}
                  key={row}
                  aria-label={
                    guess
                      ? `Attempt ${row + 1}: ${guess}`
                      : current
                        ? "Current guess"
                        : `Unused attempt ${row + 1}`
                  }
                >
                  {Array.from({ length: 4 }, (_, col) => (
                    <span
                      key={col}
                      className={`digit ${feedback?.[col] ?? ""} ${current && input[col] ? "filled" : ""}`}
                      aria-label={
                        feedback
                          ? `Digit ${guess[col]}: ${feedback[col] === "exact" ? "correct position" : feedback[col] === "present" ? "wrong position" : "not in code"}`
                          : undefined
                      }
                    >
                      {guess?.[col] ?? (current ? input[col] : "")}
                      {current && col === input.length && <i />}
                    </span>
                  ))}
                </div>
              );
            })}
          </div>
          <span className="attempt-count">
            {unlocked
              ? "COMBINATION VERIFIED"
              : `${Math.max(0, siteConfig.safeMaxAttempts - attempts.length)} / ${siteConfig.safeMaxAttempts} ATTEMPTS REMAINING`}
          </span>
        </div>
        <div className="keypad">
          {[
            "1",
            "2",
            "3",
            "4",
            "5",
            "6",
            "7",
            "8",
            "9",
            "delete",
            "0",
            "enter",
          ].map((key) => (
            <button
              key={key}
              onClick={() => press(key)}
              disabled={unlocked || locked}
              className={key === "enter" ? "enter-key" : ""}
              aria-label={
                key === "delete"
                  ? "Delete last digit"
                  : key === "enter"
                    ? "Submit combination"
                    : `Digit ${key}`
              }
            >
              {key === "delete" ? (
                <Delete size={18} />
              ) : key === "enter" ? (
                <ArrowRight size={21} />
              ) : (
                key
              )}
            </button>
          ))}
        </div>
        <p className="vault-status" role="status">
          {message ||
            (unlocked
              ? "Vault unlocked. The evidence is yours."
              : locked
                ? "The vault is sealed. Return for the next episode."
                : "Use the keypad or your keyboard. Enter to submit.")}
        </p>
        {locked && (
          <Link className="text-link vault-return" href="/files">
            REVIEW THE EVIDENCE
            <ArrowRight size={14} />
          </Link>
        )}
        <span className="vault-serial">
          CH–S01–{String(episode.part).padStart(3, "0")} {"//"} AES–FICTION
        </span>
      </section>
      {unlocked && (
        <section className="unlock-dossier">
          <span className="stamp">VERIFIED</span>
          <span className="eyebrow">
            <UnlockKeyhole size={14} />
            VAULT CONTENTS / DECLASSIFIED
          </span>
          <h2>
            YOU CRACKED IT.
            <br />
            NOW LEAVE A TRACE.
          </h2>
          <p>{episode.unlockMessage}</p>
          <div className="dossier-divider" />
          <span className="eyebrow">CREW COMPLETION LOG</span>
          {completion ? (
            <div className="completion-confirmation">
              <Check size={21} />
              <div>
                <strong>{completion}</strong>
                <p>Completion recorded on this device. You’re in the crew.</p>
              </div>
              <Link href="/board" className="text-link">
                See the board
                <ArrowRight size={15} />
              </Link>
            </div>
          ) : (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                if (!validHandle(handle)) {
                  setHandleError(
                    "Use 1–30 letters, numbers, dots, or underscores.",
                  );
                  return;
                }
                if (!setCompletion(normalizeHandle(handle)))
                  setHandleError(
                    "Storage is unavailable. Enable it to log your completion.",
                  );
              }}
            >
              <label htmlFor="crew-handle">YOUR INSTAGRAM HANDLE</label>
              <div className="handle-form-row">
                <input
                  id="crew-handle"
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                  placeholder="@your.handle"
                  autoComplete="off"
                  maxLength={31}
                  aria-describedby={handleError ? "crew-error" : undefined}
                />
                <button className="button dark-button" type="submit">
                  LOG COMPLETION
                  <ArrowRight size={16} />
                </button>
              </div>
              {handleError && (
                <p className="form-error" id="crew-error" role="alert">
                  {handleError}
                </p>
              )}
              <small>
                Saved on this device. No Instagram sign-in required.
              </small>
            </form>
          )}
        </section>
      )}
    </div>
  );
}
