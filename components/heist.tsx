"use client";
import { useState, type CSSProperties } from "react";
import {
  ArrowRight,
  Check,
  ChevronRight,
  Clock3,
  DoorOpen,
  FileText,
  Fingerprint,
  KeyRound,
  LockKeyhole,
  Map,
  Phone,
  RotateCcw,
  ShieldAlert,
  Trophy,
  Wind,
} from "lucide-react";
import gameData from "@/data/heist.json";
import {
  heistReducer,
  initialHeistState,
  isHeistRecord,
  isHeistState,
  recordScore,
  type ClueId,
  type ExitId,
  type HeistAction,
  type HeistRecord,
  type HeistState,
} from "@/lib/heist";
import { useStoredState } from "@/lib/storage";
import { SceneArt } from "./art";
import { ShareButton } from "./share";
const clueIcons = {
  key: KeyRound,
  clock: Clock3,
  map: Map,
  phone: Phone,
  cord: Wind,
};
const isOptionalRecord = (v: unknown): v is HeistRecord | null =>
  v === null || isHeistRecord(v);

export function Room17() {
  const [saved, save] = useStoredState(
    "crimex:room-17:run:v1",
    initialHeistState,
    isHeistState,
  );
  const [volatile, setVolatile] = useState<HeistState | null>(null);
  const [best, saveBest] = useStoredState<HeistRecord | null>(
    "crimex:room-17:best:v1",
    null,
    isOptionalRecord,
  );
  const [storageMessage, setStorageMessage] = useState("");
  const [code, setCode] = useState("");
  const state = volatile ?? saved;
  const note = gameData.clues.find((c) => c.id === state.activeClue);
  function send(action: HeistAction) {
    const next = heistReducer(state, action);
    if (!save(next)) {
      setVolatile(next);
      setStorageMessage(
        "You can keep playing. Browser storage is unavailable, so this run will not survive a refresh.",
      );
    } else {
      setVolatile(null);
      setStorageMessage("");
    }
    if (
      next.phase === "complete" &&
      next.outcome &&
      state.phase !== "complete" &&
      gameData.outcomes[next.outcome].rank > 0
    ) {
      const record: HeistRecord = {
        outcome: next.outcome,
        moves: next.moves,
        alert: next.alert,
      };
      if (!best || recordScore(record) > recordScore(best)) saveBest(record);
    }
    if (action.type === "start") setCode("");
  }
  return (
    <section
      className="heist-machine"
      id="room-17"
      aria-labelledby="room17-title"
    >
      <div className="heist-topline">
        <span className="eyebrow">
          <Fingerprint size={14} />
          CASE ZERO / ROOM 17
        </span>
        <span className="heist-free">FREE · NO ACCOUNT</span>
      </div>
      {state.phase === "brief" ? (
        <div className="heist-brief">
          <SceneArt src={gameData.artwork} />
          <div className="heist-scene-shade" />
          <div className="heist-brief-copy">
            <span className="eyebrow pink">AN ORIGINAL INTERACTIVE CASE</span>
            <h2 id="room17-title">
              ROOM <span>17.</span>
            </h2>
            <p>{gameData.briefing}</p>
            <div className="heist-rules">
              <span>
                <strong>8</strong> MOVES
              </span>
              <span>
                <strong>3</strong> EXITS
              </span>
              <span>
                <strong>1</strong> LEDGER
              </span>
            </div>
            <button
              className="button primary"
              onClick={() => send({ type: "start" })}
            >
              ENTER ROOM 17
              <ArrowRight size={16} />
            </button>
            <span className="heist-brief-note">
              Untimed. Read every clue at your own pace. This case is separate
              from Part 01.
            </span>
          </div>
        </div>
      ) : state.phase === "complete" && state.outcome ? (
        <div className={`heist-outcome outcome-${state.outcome}`}>
          <span className="stamp">
            {gameData.outcomes[state.outcome].stamp}
          </span>
          <span className="eyebrow">ROOM 17 / CASE REPORT</span>
          <h2 id="room17-title">{gameData.outcomes[state.outcome].title}</h2>
          <p>{gameData.outcomes[state.outcome].description}</p>
          <div className="heist-result-stats">
            <span>
              <FileText size={17} />
              {state.ledger ? "LEDGER RECOVERED" : "LEDGER NOT RECOVERED"}
            </span>
            <span>{state.moves}/8 MOVES</span>
            <span>{state.alert}% ROOM ALERT</span>
          </div>
          <details className="heist-debrief">
            <summary>
              REVIEW YOUR MOVES
              <ChevronRight size={15} />
            </summary>
            <ol>
              {state.journal.map((entry, i) => (
                <li key={i}>{entry}</li>
              ))}
            </ol>
          </details>
          <div className="heist-result-actions">
            <button
              className="button dark-button"
              onClick={() => send({ type: "start" })}
            >
              <RotateCcw size={15} />
              RUN IT AGAIN
            </button>
            <ShareButton
              label="SHARE YOUR OUTCOME"
              text={`I finished CRIMEX HOUSE Room 17 as ${gameData.outcomes[state.outcome].stamp} in ${state.moves} moves. Read the room. Can you find a cleaner exit? Play for free.`}
            />
          </div>
          <p className="heist-record">
            <Trophy size={14} />
            {best
              ? `PERSONAL BEST: ${gameData.outcomes[best.outcome].stamp} · ${best.moves} MOVES`
              : "A clean run is still waiting."}
          </p>
        </div>
      ) : (
        <>
          <h2 id="room17-title" className="sr-only">
            Room 17: recover the ledger and choose an exit
          </h2>
          <div className="heist-status">
            <div>
              <span>MOVES LEFT</span>
              <strong>
                {gameData.maxMoves - state.moves}
                <small> / {gameData.maxMoves}</small>
              </strong>
            </div>
            <div>
              <span>ROOM ALERT</span>
              <strong className={state.alert > 50 ? "risk-high" : ""}>
                {state.alert}%
              </strong>
            </div>
            <div>
              <span>OBJECTIVE</span>
              <strong className="heist-objective">
                {state.ledger ? (
                  <>
                    <Check size={15} />
                    FIND AN EXIT
                  </>
                ) : (
                  <>
                    <LockKeyhole size={15} />
                    GET THE LEDGER
                  </>
                )}
              </strong>
            </div>
          </div>
          <div className="heist-stage">
            <div className="heist-room">
              <SceneArt src={gameData.artwork} />
              <div className="heist-room-caption">
                <span className="eyebrow">POINTS OF INTEREST</span>
                <span>CHOOSE AN OBJECT TO INSPECT</span>
              </div>
              {gameData.clues.map((clue) => (
                <button
                  key={clue.id}
                  className={`heist-hotspot ${state.found.includes(clue.id as ClueId) ? "found" : ""}`}
                  style={
                    {
                      "--hotspot-x": `${clue.x}%`,
                      "--hotspot-y": `${clue.y}%`,
                    } as CSSProperties
                  }
                  onClick={() =>
                    send({ type: "inspect", id: clue.id as ClueId })
                  }
                  aria-label={`Inspect ${clue.label}`}
                >
                  <span>
                    {state.found.includes(clue.id as ClueId) ? (
                      <Check size={12} />
                    ) : (
                      clue.number
                    )}
                  </span>
                  <b>{clue.label}</b>
                </button>
              ))}
            </div>
            <aside className="heist-note" aria-live="polite">
              <span className="eyebrow">RECOVERED INTELLIGENCE</span>
              {note ? (
                <>
                  <span className="heist-note-number">{note.number}</span>
                  <h3>{note.label}</h3>
                  <p>{note.note}</p>
                  <span className="heist-note-foot">
                    <Check size={12} />
                    ADDED TO FIELD NOTES
                  </span>
                </>
              ) : (
                <>
                  <span className="heist-note-number">?</span>
                  <h3>Read the room.</h3>
                  <p>
                    Every object is a decision. Find the key, decode the case,
                    and learn which exit leaves the least evidence.
                  </p>
                  <span className="heist-note-foot">
                    Inspecting a new object costs moves. Re-reading a found clue
                    is free.
                  </span>
                </>
              )}
            </aside>
          </div>
          <div className="heist-clues" aria-label="Objects to investigate">
            {gameData.clues.map((clue) => {
              const Icon = clueIcons[clue.id as ClueId];
              const found = state.found.includes(clue.id as ClueId);
              return (
                <button
                  key={clue.id}
                  className={found ? "collected" : ""}
                  onClick={() =>
                    send({ type: "inspect", id: clue.id as ClueId })
                  }
                  aria-pressed={state.activeClue === clue.id}
                >
                  <Icon size={18} />
                  <strong>{clue.label}</strong>
                  <span>
                    {found
                      ? "READ AGAIN · FREE"
                      : `${clue.cost} MOVE${clue.cost > 1 ? "S" : ""}${clue.alert >= 10 ? ` · +${clue.alert} ALERT` : ""}`}
                  </span>
                  {found && <Check className="clue-check" size={12} />}
                </button>
              );
            })}
          </div>
          <p className="heist-message" role="status">
            <ShieldAlert size={16} />
            {state.message}
          </p>
          <div className="heist-equipment">
            <section className="heist-cache">
              <div>
                <span className="eyebrow">THE LOCKED CASE</span>
                <h3>
                  {state.ledger
                    ? "The ledger is yours."
                    : "A key. Four digits."}
                </h3>
              </div>
              {state.ledger ? (
                <p className="heist-cache-open">
                  <Check size={22} />
                  BLACK LEDGER RECOVERED
                </p>
              ) : (
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    send({ type: "unlock", code });
                    if (code.length === 4) setCode("");
                  }}
                >
                  <label htmlFor="case-combination">CASE COMBINATION</label>
                  <div>
                    <input
                      id="case-combination"
                      inputMode="numeric"
                      autoComplete="off"
                      value={code}
                      onChange={(e) =>
                        setCode(e.target.value.replace(/\D/g, "").slice(0, 4))
                      }
                      maxLength={4}
                      placeholder="— — — —"
                      disabled={!state.found.includes("key")}
                      aria-describedby="case-attempts"
                    />
                    <button
                      className="button primary"
                      type="submit"
                      disabled={!state.found.includes("key")}
                    >
                      <KeyRound size={14} />
                      UNLOCK
                    </button>
                  </div>
                  <small id="case-attempts">
                    {state.found.includes("key")
                      ? `${gameData.maxAttempts - state.attempts} combination attempts left. Wrong codes raise room alert.`
                      : "Find the brass key to use the lock."}
                  </small>
                </form>
              )}
            </section>
            <section className="heist-inventory">
              <span className="eyebrow">FIELD NOTES & INVENTORY</span>
              <h3>
                {state.found.length
                  ? `${state.found.length} leads recovered.`
                  : "Travel light. Look closely."}
              </h3>
              <div>
                {state.found.map((id) => (
                  <span key={id}>
                    <Check size={12} />
                    {gameData.clues.find((c) => c.id === id)!.item}
                  </span>
                ))}
                {state.ledger && (
                  <span className="ledger-item">
                    <FileText size={13} />
                    Black ledger
                  </span>
                )}
              </div>
              {state.found.length === 0 && (
                <p>Your recovered items and notes appear here.</p>
              )}
            </section>
          </div>
          <section className="heist-exits" aria-labelledby="exit-title">
            <div>
              <span className="eyebrow pink">THE LAST DECISION</span>
              <h3 id="exit-title">Choose how this ends.</h3>
              <p>
                {state.ledger
                  ? "The ledger is yours. Your route decides what follows you out."
                  : "Recover the ledger to open your exit options."}
              </p>
            </div>
            <div className="heist-exit-grid">
              {gameData.exits.map((route) => {
                const missing =
                  route.requirement &&
                  !state.found.includes(route.requirement as ClueId);
                return (
                  <button
                    key={route.id}
                    disabled={!state.ledger || !!missing}
                    onClick={() =>
                      send({ type: "exit", id: route.id as ExitId })
                    }
                  >
                    <DoorOpen size={22} />
                    <strong>{route.label}</strong>
                    <span>{route.description}</span>
                    <small>
                      {!state.ledger
                        ? "LEDGER REQUIRED"
                        : missing
                          ? "MISSING REQUIRED ITEM"
                          : `TAKE THIS EXIT · +${route.alert} ALERT`}
                      <ArrowRight size={13} />
                    </small>
                  </button>
                );
              })}
            </div>
          </section>
          <div className="heist-bottomline">
            <span>CASE ZERO · ORIGINAL FICTION · PROGRESS ON THIS DEVICE</span>
            <button
              className="text-link"
              onClick={() => send({ type: "start" })}
            >
              <RotateCcw size={12} />
              RESTART CASE
            </button>
          </div>
        </>
      )}
      {storageMessage && (
        <p className="heist-storage-warning" role="status">
          {storageMessage}
        </p>
      )}
    </section>
  );
}
