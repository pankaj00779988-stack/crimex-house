"use client";
import { useState } from "react";
import {
  ArrowUpRight,
  Check,
  Crosshair,
  Fingerprint,
  MapPin,
  Radio,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { activeEpisode, corkboard, siteConfig } from "@/lib/data";
import { normalizeHandle, validHandle } from "@/lib/game";
import { isString, useStoredState } from "@/lib/storage";
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
export function InvestigationBoard() {
  const [tier, setTier] = useState(siteConfig.tiers[0].id);
  const [handle, setHandle] = useState("");
  const [message, setMessage] = useState("");
  const [completion] = useStoredState(
    `crimex:crew:${activeEpisode.id}`,
    "",
    isString,
  );
  const selected =
    siteConfig.tiers.find((t) => t.id === tier) ?? siteConfig.tiers[0];
  const preview = handle.trim()
    ? normalizeHandle(handle).slice(0, 31)
    : completion || "@your.handle";
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
            OPERATION: {activeEpisode.title}
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
                {completion && !handle ? "CREW" : "YOU?"}
              </span>
            </div>
          </div>
          <span className="board-preview-note">YOUR HANDLE APPEARS HERE</span>
        </article>
        <span className="board-bottom-note">NOTHING IS COINCIDENCE.</span>
      </section>
      <aside className="reservation-panel">
        <span className="eyebrow pink">FROM VIEWER TO PERSON OF INTEREST</span>
        <h2>
          GET YOUR NAME
          <br />
          IN THE <span>CASE.</span>
        </h2>
        <p>
          Don’t just watch the story.
          <br />
          Leave your fingerprints on it.
        </p>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            setMessage("");
            if (!validHandle(handle)) {
              setMessage(
                "Enter a valid Instagram handle: 1–30 letters, numbers, dots, or underscores.",
              );
              return;
            }
            if (
              !selected.checkoutReady ||
              selected.checkoutUrl.includes("YOUR-")
            ) {
              setMessage(
                "Reservations aren’t open yet. Checkout for this tier is being set up. Your card has not been charged.",
              );
              return;
            }
            try {
              const url = new URL(selected.checkoutUrl);
              if (url.protocol !== "https:")
                throw new Error("Invalid checkout");
              url.searchParams.set("instagram", normalizeHandle(handle));
              window.open(url.toString(), "_blank", "noopener,noreferrer");
              setMessage(
                "Checkout opened in a new tab. Your reservation is confirmed by the payment provider after payment.",
              );
            } catch {
              setMessage(
                "Checkout is temporarily unavailable. Please try again later.",
              );
            }
          }}
        >
          <fieldset className="tier-selector">
            <legend>CHOOSE YOUR INVOLVEMENT</legend>
            {siteConfig.tiers.map((item) => (
              <label
                key={item.id}
                className={`tier-option ${tier === item.id ? "selected" : ""}`}
              >
                <input
                  type="radio"
                  name="tier"
                  value={item.id}
                  checked={tier === item.id}
                  onChange={() => {
                    setTier(item.id);
                    setMessage("");
                  }}
                />
                <span className="radio-display" />
                <span className="tier-copy">
                  <strong>
                    {item.name}
                    {item.id === "pass" && (
                      <span className="tier-tag">THE INSIDE JOB</span>
                    )}
                  </strong>
                  <small>{item.description}</small>
                </span>
                <span className="tier-price">${item.price}</span>
              </label>
            ))}
          </fieldset>
          <label className="form-label" htmlFor="board-handle">
            YOUR INSTAGRAM HANDLE
          </label>
          <div className="board-handle-wrap">
            <span>@</span>
            <input
              id="board-handle"
              value={handle}
              onChange={(e) => {
                setHandle(e.target.value.replace(/^@/, ""));
                setMessage("");
              }}
              placeholder="your.handle"
              autoComplete="off"
              maxLength={31}
              aria-describedby="handle-description reservation-status"
            />
          </div>
          <small id="handle-description">
            Watch your name appear on the board. No sign-in needed.
          </small>
          <button className="button primary reserve-button" type="submit">
            RESERVE MY SPOT
            <span>
              ${selected.price}
              <ArrowUpRight size={16} />
            </span>
          </button>
          <p
            id="reservation-status"
            className="reservation-message"
            role="status"
          >
            {message}
          </p>
          <span className="checkout-note">
            <ShieldCheck size={13} />
            SECURE EXTERNAL CHECKOUT · ONE-TIME PAYMENT
          </span>
        </form>
        <div className="reservation-fineprint">
          <Fingerprint size={23} />
          <p>
            Part of a fictional universe.
            <br />
            <span>A real way to support independent storytelling.</span>
          </p>
        </div>
      </aside>
    </div>
  );
}
