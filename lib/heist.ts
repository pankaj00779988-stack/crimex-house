import data from "../data/heist.json";
export type ClueId = "key" | "clock" | "map" | "phone" | "cord";
export type ExitId = "service" | "lobby" | "window";
export type OutcomeId = keyof typeof data.outcomes;
export interface HeistState {
  phase: "brief" | "playing" | "complete";
  moves: number;
  alert: number;
  found: ClueId[];
  activeClue: ClueId | null;
  ledger: boolean;
  attempts: number;
  outcome: OutcomeId | null;
  exit: ExitId | null;
  message: string;
  journal: string[];
}
export const initialHeistState: HeistState = {
  phase: "brief",
  moves: 0,
  alert: data.startingAlert,
  found: [],
  activeClue: null,
  ledger: false,
  attempts: 0,
  outcome: null,
  exit: null,
  message: "Read the room. Recover the ledger. Choose your exit.",
  journal: [],
};
export type HeistAction =
  | { type: "start" }
  | { type: "inspect"; id: ClueId }
  | { type: "unlock"; code: string }
  | { type: "exit"; id: ExitId };
const clueIds = data.clues.map((c) => c.id);
const exitIds = data.exits.map((e) => e.id);
export function isHeistState(value: unknown): value is HeistState {
  if (!value || typeof value !== "object") return false;
  const v = value as HeistState;
  return (
    ["brief", "playing", "complete"].includes(v.phase) &&
    Number.isInteger(v.moves) &&
    v.moves >= 0 &&
    v.moves <= data.maxMoves &&
    Number.isInteger(v.alert) &&
    v.alert >= 0 &&
    v.alert <= 100 &&
    Array.isArray(v.found) &&
    v.found.every((id) => clueIds.includes(id)) &&
    new Set(v.found).size === v.found.length &&
    (v.activeClue === null || clueIds.includes(v.activeClue)) &&
    typeof v.ledger === "boolean" &&
    Number.isInteger(v.attempts) &&
    v.attempts >= 0 &&
    v.attempts <= data.maxAttempts &&
    (v.outcome === null || Object.hasOwn(data.outcomes, v.outcome)) &&
    (v.phase !== "complete" || v.outcome !== null) &&
    (v.exit === null || exitIds.includes(v.exit)) &&
    typeof v.message === "string" &&
    v.message.length < 2000 &&
    Array.isArray(v.journal) &&
    v.journal.length <= 16 &&
    v.journal.every((line) => typeof line === "string" && line.length < 2000)
  );
}
function advance(
  state: HeistState,
  cost: number,
  alert: number,
  line: string,
): HeistState {
  const next = {
    ...state,
    moves: Math.min(data.maxMoves, state.moves + cost),
    alert: Math.min(100, state.alert + alert),
    message: line,
    journal: [...state.journal, line].slice(-16),
  };
  if (state.moves + cost >= data.maxMoves || next.alert >= 100)
    return {
      ...next,
      phase: "complete",
      outcome: "lockdown",
      message:
        "Your time in the room is gone. Footsteps stop outside the door.",
    };
  return next;
}
export function heistReducer(
  state: HeistState,
  action: HeistAction,
): HeistState {
  if (action.type === "start")
    return {
      ...initialHeistState,
      phase: "playing",
      journal: ["Entered Room 17. The ledger is still in the case."],
    };
  if (state.phase !== "playing") return state;
  if (action.type === "inspect") {
    const clue = data.clues.find((c) => c.id === action.id)!;
    if (state.found.includes(action.id))
      return {
        ...state,
        activeClue: action.id,
        message: `Re-reading ${clue.label.toLowerCase()}. No move used.`,
      };
    const next = advance(state, clue.cost, clue.alert, clue.note);
    return {
      ...next,
      activeClue: action.id,
      found: [...state.found, action.id],
      message:
        next.phase === "complete"
          ? next.message
          : `${clue.label} added to your field notes. ${clue.cost} move${clue.cost > 1 ? "s" : ""} used.${clue.alert > 0 ? ` Room alert +${clue.alert}.` : ""}`,
    };
  }
  if (action.type === "unlock") {
    if (state.ledger) return state;
    if (!state.found.includes("key"))
      return {
        ...state,
        message:
          "The lock needs a brass key as well as four digits. Search the desk first.",
      };
    if (!/^\d{4}$/.test(action.code))
      return {
        ...state,
        message:
          "Enter four digits. An incomplete combination does not use an attempt.",
      };
    if (action.code === data.cacheCode)
      return advance(
        { ...state, ledger: true },
        1,
        2,
        "The case opens. The black ledger is in your hands. Choose an exit.",
      );
    const next = advance(
      state,
      1,
      12,
      "Wrong combination. The case beeps. Room alert rises by 12.",
    );
    const attempts = state.attempts + 1;
    return {
      ...next,
      attempts,
      ...(attempts >= data.maxAttempts
        ? { phase: "complete" as const, outcome: "lockdown" as const }
        : {}),
    };
  }
  if (!state.ledger)
    return {
      ...state,
      message: "Recover the black ledger before choosing an exit.",
    };
  const route = data.exits.find((e) => e.id === action.id)!;
  if (route.requirement && !state.found.includes(route.requirement as ClueId))
    return {
      ...state,
      message: `You need the ${route.requirement === "map" ? "evacuation map" : "curtain cord"} for that exit.`,
    };
  const moves = state.moves + 1;
  const alert = Math.min(100, state.alert + route.alert);
  let outcome: OutcomeId = "lockdown";
  if (moves <= data.maxMoves && alert < 100) {
    if (action.id === "service")
      outcome = alert <= 25 ? "ghost" : alert <= 65 ? "shadow" : "lockdown";
    if (action.id === "lobby") outcome = alert <= 65 ? "exposed" : "lockdown";
    if (action.id === "window") outcome = alert <= 50 ? "shadow" : "lockdown";
  }
  return {
    ...state,
    moves: Math.min(data.maxMoves, moves),
    alert,
    phase: "complete",
    outcome,
    exit: action.id,
    message: data.outcomes[outcome].description,
    journal: [
      ...state.journal,
      `Exit chosen: ${route.label}. ${data.outcomes[outcome].stamp}.`,
    ].slice(-16),
  };
}
export interface HeistRecord {
  outcome: OutcomeId;
  moves: number;
  alert: number;
}
export function isHeistRecord(value: unknown): value is HeistRecord {
  if (!value || typeof value !== "object") return false;
  const v = value as HeistRecord;
  return (
    Object.hasOwn(data.outcomes, v.outcome) &&
    Number.isInteger(v.moves) &&
    v.moves >= 0 &&
    v.moves <= data.maxMoves &&
    Number.isInteger(v.alert) &&
    v.alert >= 0 &&
    v.alert <= 100
  );
}
export function recordScore(record: HeistRecord): number {
  return (
    data.outcomes[record.outcome].rank * 1000 +
    (data.maxMoves - record.moves) * 10 -
    record.alert
  );
}
