import { test } from "node:test";
import assert from "node:assert/strict";
import {
  bestScore,
  createEvidenceDeck,
  initialMemoryState,
  isEvidenceMatch,
  memoryReducer,
} from "../lib/arcade";
import games from "../data/games.json";

test("a shuffled round contains exactly two copies of every symbol and unique cards", () => {
  const deck = createEvidenceDeck(games.memory.symbols, () => 0.31);
  assert.equal(deck.length, 12);
  assert.equal(new Set(deck.map((c) => c.id)).size, 12);
  for (const symbol of games.memory.symbols)
    assert.equal(deck.filter((c) => c.symbol === symbol).length, 2);
  assert.notDeepEqual(
    deck.map((c) => c.id),
    Array.from({ length: 12 }, (_, i) => i),
  );
});
test("one card cannot match itself or be used twice in a turn", () => {
  const deck = createEvidenceDeck(["KEY", "CASH"], () => 0);
  const card = deck[0];
  assert.equal(isEvidenceMatch(card, card), false);
  let state = memoryReducer(initialMemoryState, { type: "start", deck });
  state = memoryReducer(state, { type: "flip", id: card.id });
  assert.equal(memoryReducer(state, { type: "flip", id: card.id }), state);
  assert.equal(state.moves, 0);
});
test("a missed pair blocks a third card until the previous pair is hidden", () => {
  const deck = createEvidenceDeck(["KEY", "CASH"], () => 0);
  let state = memoryReducer(initialMemoryState, { type: "start", deck });
  const first = deck[0],
    second = deck.find((c) => c.symbol !== first.symbol)!;
  state = memoryReducer(state, { type: "flip", id: first.id });
  state = memoryReducer(state, { type: "flip", id: second.id });
  assert.equal(state.moves, 1);
  assert.equal(state.flipped.length, 2);
  assert.equal(
    memoryReducer(state, {
      type: "flip",
      id: deck.find((c) => !state.flipped.includes(c.id))!.id,
    }),
    state,
  );
  state = memoryReducer(state, { type: "hide" });
  assert.equal(state.flipped.length, 0);
  assert.equal(state.moves, 1);
});
test("all pairs complete the round in six moves; matched cards cannot be replayed", () => {
  const deck = createEvidenceDeck(games.memory.symbols, () => 0.7);
  let state = memoryReducer(initialMemoryState, { type: "start", deck });
  for (const symbol of games.memory.symbols) {
    const pair = deck.filter((c) => c.symbol === symbol);
    state = memoryReducer(state, { type: "flip", id: pair[0].id });
    state = memoryReducer(state, { type: "flip", id: pair[1].id });
    assert.equal(memoryReducer(state, { type: "flip", id: pair[0].id }), state);
  }
  assert.equal(state.finished, true);
  assert.equal(state.moves, 6);
  assert.equal(state.matched.length, 12);
  const reset = memoryReducer(state, { type: "start", deck });
  assert.equal(reset.finished, false);
  assert.equal(reset.moves, 0);
  assert.deepEqual(reset.matched, []);
});
test("personal records accept the first result and only improve with a lower result", () => {
  assert.equal(bestScore(0, 312), 312);
  assert.equal(bestScore(312, 420), 312);
  assert.equal(bestScore(312, 210), 210);
});
