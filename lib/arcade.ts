export interface EvidenceCard {
  id: number;
  symbol: string;
}
export function createEvidenceDeck(
  symbols: string[],
  random: () => number = Math.random,
): EvidenceCard[] {
  const deck = [...symbols, ...symbols].map((symbol, id) => ({ id, symbol }));
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}
export function isEvidenceMatch(
  first: EvidenceCard,
  second: EvidenceCard,
): boolean {
  return first.id !== second.id && first.symbol === second.symbol;
}
export function bestScore(previous: number, current: number): number {
  return previous === 0 || current < previous ? current : previous;
}
export interface MemoryState {
  deck: EvidenceCard[];
  flipped: number[];
  matched: number[];
  moves: number;
  finished: boolean;
}
export const initialMemoryState: MemoryState = {
  deck: [],
  flipped: [],
  matched: [],
  moves: 0,
  finished: false,
};
export type MemoryAction =
  | { type: "start"; deck: EvidenceCard[] }
  | { type: "flip"; id: number }
  | { type: "hide" };
export function memoryReducer(
  state: MemoryState,
  action: MemoryAction,
): MemoryState {
  if (action.type === "start")
    return { ...initialMemoryState, deck: action.deck };
  if (action.type === "hide") return { ...state, flipped: [] };
  if (
    state.finished ||
    state.flipped.length === 2 ||
    state.flipped.includes(action.id) ||
    state.matched.includes(action.id)
  )
    return state;
  const card = state.deck.find((item) => item.id === action.id);
  if (!card) return state;
  if (state.flipped.length === 0) return { ...state, flipped: [action.id] };
  const first = state.deck.find((item) => item.id === state.flipped[0])!;
  if (!isEvidenceMatch(first, card))
    return { ...state, flipped: [first.id, card.id], moves: state.moves + 1 };
  const matched = [...state.matched, first.id, card.id];
  return {
    ...state,
    flipped: [],
    matched,
    moves: state.moves + 1,
    finished: matched.length === state.deck.length,
  };
}
