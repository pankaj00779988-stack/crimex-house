"use client";
import { useEffect, useReducer, useRef, useState } from "react";
import {
  Banknote,
  Car,
  Check,
  Fingerprint,
  FolderOpen,
  KeyRound,
  LockKeyhole,
  Radio,
  RotateCcw,
  Signal,
  Trophy,
} from "lucide-react";
import games from "@/data/games.json";
import {
  bestScore,
  createEvidenceDeck,
  initialMemoryState,
  memoryReducer,
} from "@/lib/arcade";
import { isNumber, useStoredState } from "@/lib/storage";
import { ShareButton } from "./share";
const symbols = {
  CASH: Banknote,
  KEY: KeyRound,
  FILE: FolderOpen,
  RADIO: Radio,
  CAR: Car,
  PRINT: Fingerprint,
};

export function MemoryGame() {
  const [game, dispatch] = useReducer(memoryReducer, initialMemoryState);
  const [best, setBest] = useStoredState(
    "crimex:arcade:memory-best:v1",
    0,
    isNumber,
  );
  const [saveError, setSaveError] = useState("");
  useEffect(() => {
    if (game.flipped.length !== 2) return;
    const timer = window.setTimeout(() => dispatch({ type: "hide" }), 850);
    return () => window.clearTimeout(timer);
  }, [game.flipped]);
  function start() {
    setSaveError("");
    dispatch({ type: "start", deck: createEvidenceDeck(games.memory.symbols) });
  }
  function flip(id: number) {
    const action = { type: "flip" as const, id };
    const next = memoryReducer(game, action);
    dispatch(action);
    if (
      next.finished &&
      !game.finished &&
      !setBest(bestScore(best, next.moves))
    )
      setSaveError(
        "Browser storage is unavailable; your record cannot be saved.",
      );
  }
  return (
    <section
      className="arcade-panel"
      id={games.memory.id}
      aria-labelledby="memory-title"
    >
      <div className="arcade-panel-top">
        <span className="eyebrow pink">PRACTICE 01 / MEMORY</span>
        <span className="status-badge live">FREE TO PLAY</span>
      </div>
      <h2 id="memory-title">{games.memory.title}</h2>
      <p>{games.memory.description}</p>
      <div className="arcade-stats">
        <span>
          MOVES <strong>{game.moves}</strong>
        </span>
        <span>
          PAIRS{" "}
          <strong>
            {game.matched.length / 2}/{games.memory.symbols.length}
          </strong>
        </span>
        <span>
          <Trophy size={11} />
          PERSONAL BEST <strong>{best || "—"}</strong>
        </span>
      </div>
      {game.deck.length === 0 ? (
        <div className="arcade-start">
          <FolderOpen size={43} />
          <p>
            The evidence is shuffled.
            <br />
            How much can you remember?
          </p>
          <button className="button primary" onClick={start}>
            START DEAD DROP
          </button>
        </div>
      ) : (
        <>
          <div className="memory-grid">
            {game.deck.map((card, index) => {
              const matched = game.matched.includes(card.id);
              const shown = matched || game.flipped.includes(card.id);
              const Icon =
                symbols[card.symbol as keyof typeof symbols] ?? FolderOpen;
              return (
                <button
                  key={card.id}
                  className={`memory-card ${shown ? "face-up" : ""} ${matched ? "matched" : ""}`}
                  disabled={shown || game.flipped.length === 2}
                  onClick={() => flip(card.id)}
                  aria-label={
                    shown
                      ? `${card.symbol}${matched ? ", matched" : ", revealed"}`
                      : `Evidence card ${index + 1}, face down`
                  }
                >
                  {shown ? (
                    <>
                      <Icon size={26} />
                      <span>{card.symbol}</span>
                      {matched && <Check size={10} className="memory-match" />}
                    </>
                  ) : (
                    <>
                      <Fingerprint size={24} />
                      <span>CH—{String(index + 1).padStart(2, "0")}</span>
                    </>
                  )}
                </button>
              );
            })}
          </div>
          <p className="arcade-status" role="status">
            {game.finished
              ? `Case cleared in ${game.moves} moves. All ${games.memory.symbols.length} pairs recovered.`
              : game.flipped.length === 2
                ? "No match. Remember these two before they disappear."
                : `${game.matched.length / 2} pairs recovered. Choose the next piece of evidence.`}
          </p>
          <button className="text-link arcade-restart" onClick={start}>
            <RotateCcw size={13} />
            {game.finished ? "PLAY AGAIN" : "RESHUFFLE & RESTART"}
          </button>
          {game.finished && (
            <ShareButton
              label="CHALLENGE A FRIEND"
              text={`I cleared CRIMEX HOUSE Dead Drop in ${game.moves} moves. Can you beat it? Play for free.`}
            />
          )}
        </>
      )}
      <p className="arcade-save-note" role="status">
        {saveError || "Your best score stays on this device."}
      </p>
    </section>
  );
}

type SignalPhase = "idle" | "waiting" | "ready" | "result" | "early";
export function ReactionGame() {
  const [phase, setPhase] = useState<SignalPhase>("idle");
  const [result, setResult] = useState(0);
  const [best, setBest] = useStoredState(
    "crimex:arcade:reaction-best:v1",
    0,
    isNumber,
  );
  const [saveError, setSaveError] = useState("");
  const timer = useRef<number | null>(null);
  const readyAt = useRef(0);
  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    [],
  );
  function press() {
    if (phase === "waiting") {
      if (timer.current !== null) window.clearTimeout(timer.current);
      setPhase("early");
      return;
    }
    if (phase === "ready") {
      const elapsed = Math.max(
        1,
        Math.round(performance.now() - readyAt.current),
      );
      setResult(elapsed);
      setPhase("result");
      if (!setBest(bestScore(best, elapsed)))
        setSaveError(
          "Browser storage is unavailable; your record cannot be saved.",
        );
      return;
    }
    setSaveError("");
    setPhase("waiting");
    const delay =
      games.reaction.minimumDelayMs +
      Math.random() *
        (games.reaction.maximumDelayMs - games.reaction.minimumDelayMs);
    timer.current = window.setTimeout(() => {
      readyAt.current = performance.now();
      setPhase("ready");
    }, delay);
  }
  const headline =
    phase === "idle"
      ? "ARM THE RECEIVER"
      : phase === "waiting"
        ? "HOLD YOUR FIRE"
        : phase === "ready"
          ? "INTERCEPT!"
          : phase === "early"
            ? "TOO EARLY"
            : `${result} ms`;
  const instruction =
    phase === "idle"
      ? "Tap to begin. Wait for INTERCEPT, then tap again."
      : phase === "waiting"
        ? "Wait for the green signal. An early tap ends the attempt."
        : phase === "ready"
          ? "Tap now — or press Enter if this button has focus."
          : phase === "early"
            ? "The signal had not arrived. Tap to try again."
            : "Signal captured. Tap to play again.";
  return (
    <section
      className="arcade-panel"
      id={games.reaction.id}
      aria-labelledby="reaction-title"
    >
      <div className="arcade-panel-top">
        <span className="eyebrow pink">PRACTICE 02 / REACTION</span>
        <span className="status-badge live">FREE TO PLAY</span>
      </div>
      <h2 id="reaction-title">{games.reaction.title}</h2>
      <p>{games.reaction.description}</p>
      <div className="arcade-stats">
        <span>
          <Trophy size={11} />
          PERSONAL BEST <strong>{best ? `${best} ms` : "—"}</strong>
        </span>
        <span>
          LAST <strong>{result ? `${result} ms` : "—"}</strong>
        </span>
      </div>
      <button
        className={`reaction-target phase-${phase}`}
        onClick={press}
        aria-describedby="reaction-instructions"
      >
        <Signal size={42} />
        <strong>{headline}</strong>
        <span>
          {phase === "waiting"
            ? "STAND BY…"
            : phase === "ready"
              ? "MAKE YOUR MOVE"
              : "TAP TO PLAY"}
        </span>
      </button>
      <p className="arcade-status" id="reaction-instructions" role="status">
        {instruction}
      </p>
      {phase === "result" && (
        <ShareButton
          label="CHALLENGE A FRIEND"
          text={`My CRIMEX HOUSE Signal Intercept reaction was ${result} ms. Can you beat it? Play for free.`}
        />
      )}
      <p className="arcade-save-note" role="status">
        {saveError ||
          "A practice game. Results depend on your device and browser; records are saved only here."}
      </p>
    </section>
  );
}

export function SealedEpisodeGame() {
  return (
    <div className="episode-game-note">
      <LockKeyhole size={23} />
      <div>
        <h3>The story vault stays sealed.</h3>
        <p>
          These practice games are open now. The episode keypad unlocks only
          when Part 01 is released.
        </p>
      </div>
    </div>
  );
}
