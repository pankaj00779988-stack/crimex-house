import { test } from "node:test";
import assert from "node:assert/strict";
import {
  heistReducer,
  initialHeistState,
  isHeistRecord,
  isHeistState,
  recordScore,
  type HeistAction,
  type HeistState,
} from "../lib/heist";

const play = (...actions: HeistAction[]) =>
  actions.reduce(
    heistReducer,
    heistReducer(initialHeistState, { type: "start" }),
  );
const inspect = (
  id: "key" | "clock" | "map" | "phone" | "cord",
): HeistAction => ({ type: "inspect", id });
const unlock: HeistAction = { type: "unlock", code: "0940" };

test("Room 17 rewards a quiet evidence-led exit with GHOST", () => {
  const result = play(
    inspect("key"),
    inspect("clock"),
    inspect("map"),
    unlock,
    { type: "exit", id: "service" },
  );
  assert.equal(result.phase, "complete");
  assert.equal(result.outcome, "ghost");
  assert.equal(result.moves, 5);
  assert.equal(result.alert, 20);
  assert.equal(result.ledger, true);
});
test("the phone call leaves a noise trail even when the service route is used", () => {
  const result = play(
    inspect("key"),
    inspect("clock"),
    inspect("map"),
    inspect("phone"),
    unlock,
    { type: "exit", id: "service" },
  );
  assert.equal(result.outcome, "shadow");
  assert.equal(result.alert, 44);
});
test("lobby and window decisions produce different consequences", () => {
  const lobby = play(inspect("key"), inspect("clock"), unlock, {
    type: "exit",
    id: "lobby",
  });
  const window = play(
    inspect("key"),
    inspect("clock"),
    inspect("cord"),
    unlock,
    { type: "exit", id: "window" },
  );
  assert.equal(lobby.outcome, "exposed");
  assert.equal(lobby.moves, 4);
  assert.equal(window.outcome, "shadow");
  assert.equal(window.moves, 6);
});
test("re-reading notes is free, and missing items do not consume attempts", () => {
  let state = play(inspect("clock"));
  state = heistReducer(state, inspect("clock"));
  assert.equal(state.moves, 1);
  assert.equal(state.found.length, 1);
  state = heistReducer(state, unlock);
  assert.equal(state.moves, 1);
  assert.equal(state.attempts, 0);
  assert.equal(state.ledger, false);
  state = heistReducer(state, inspect("key"));
  const moves = state.moves;
  state = heistReducer(state, { type: "unlock", code: "0" });
  assert.equal(state.moves, moves);
  assert.equal(state.attempts, 0);
});
test("three wrong codes lock the case and further actions cannot recover it", () => {
  const wrong: HeistAction = { type: "unlock", code: "0000" };
  const result = play(inspect("key"), wrong, wrong, wrong);
  assert.equal(result.outcome, "lockdown");
  assert.equal(result.attempts, 3);
  assert.equal(heistReducer(result, unlock), result);
});
test("using all eight moves before leaving ends the mission, even with the ledger", () => {
  const result = play(
    inspect("key"),
    inspect("clock"),
    inspect("map"),
    inspect("phone"),
    inspect("cord"),
    { type: "unlock", code: "0000" },
    unlock,
  );
  assert.equal(result.moves, 8);
  assert.equal(result.ledger, true);
  assert.equal(result.outcome, "lockdown");
});
test("exit prerequisites are enforced by the engine", () => {
  let state = play(inspect("key"), inspect("clock"));
  state = heistReducer(state, { type: "exit", id: "lobby" });
  assert.equal(state.phase, "playing");
  assert.equal(state.moves, 2);
  state = heistReducer(state, unlock);
  state = heistReducer(state, { type: "exit", id: "window" });
  assert.equal(state.phase, "playing");
  assert.equal(state.moves, 3);
});
test("persisted state validation rejects broken saves and completed states without an outcome", () => {
  assert.equal(isHeistState(initialHeistState), true);
  assert.equal(isHeistState(play(inspect("key"), inspect("clock"))), true);
  for (const bad of [
    null,
    {},
    { ...initialHeistState, found: ["unknown"] },
    { ...initialHeistState, moves: 99 },
    { ...initialHeistState, phase: "complete" },
    { ...initialHeistState, journal: [null] },
  ])
    assert.equal(isHeistState(bad), false);
  const record = { outcome: "ghost" as const, moves: 5, alert: 20 };
  assert.equal(isHeistRecord(record), true);
  assert.equal(isHeistRecord({ ...record, moves: -1 }), false);
  assert.ok(
    recordScore(record) >
      recordScore({ outcome: "exposed", moves: 3, alert: 5 }),
  );
});
test("every reachable run remains valid for persistence", () => {
  let frontier: HeistState[] = [
    heistReducer(initialHeistState, { type: "start" }),
  ];
  const actions: HeistAction[] = [
    inspect("key"),
    inspect("clock"),
    inspect("map"),
    inspect("phone"),
    inspect("cord"),
    unlock,
    { type: "unlock", code: "9999" },
    { type: "exit", id: "service" },
    { type: "exit", id: "lobby" },
    { type: "exit", id: "window" },
  ];
  for (let depth = 0; depth < 4; depth++) {
    const next: HeistState[] = [];
    for (const state of frontier)
      for (const action of actions) {
        const result = heistReducer(state, action);
        assert.equal(isHeistState(result), true);
        if (result.phase === "playing") next.push(result);
      }
    frontier = next;
  }
});
