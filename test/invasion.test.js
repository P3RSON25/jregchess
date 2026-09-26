import assert from "node:assert/strict";
import test from "node:test";
import { GameState, COLORS } from "../shared/game.js";
import { planBotTurn, chooseDecision } from "../shared/bot.js";
import {
  kingLedger, armedTargets, routeLength, portalBuyValue, forcedAtheismChoice,
} from "../shared/invasion.js";

function clearBoards(game) {
  game.initializing = true;
  for (const b of ["Normal", "Heaven", "Hell"]) {
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
      const p = game.getCell(x, y, b);
      if (p) game.removeGroup(p, b);
    }
  }
  game.automovingPieces = [];
  game.gameOver = false;
  game.draw = false;
  game.winner = null;
  game.pendingDecision = null;
  game.rulePicker = false;
  game.whiteToMove = true;
  game.turnsSinceNewRule = 0;
  return game;
}

function finishSetup(game) {
  game.initializing = false;
  game.checkVictory();
  assert.equal(game.gameOver, false);
  return game;
}

test("armed verifier fires only on genuine dimension wins", () => {
  const game = clearBoards(new GameState({ seed: "inv-ledger" }));
  game.placeNew("King", COLORS.WHITE, 0, 0, "Normal");
  game.placeNew("King", COLORS.BLACK, 4, 6, "Heaven");
  game.placeNew("Atheism", COLORS.NPC, 5, 2, "Heaven");
  finishSetup(game);
  const ledger = kingLedger(game);
  assert.equal(ledger.White.Normal, 1);
  assert.equal(ledger.Black.Heaven, 1);
  const armed = armedTargets(game, COLORS.WHITE);
  assert.equal(armed.length, 1);
  assert.equal(armed[0].dim, "Heaven");
  // Black is not armed: white's king is off-Heaven.
  assert.equal(armedTargets(game, COLORS.BLACK).length, 0);
});

test("verifier disarms when our only king shares the dimension", () => {
  const game = clearBoards(new GameState({ seed: "inv-disarm" }));
  game.placeNew("King", COLORS.WHITE, 4, 6, "Heaven");
  game.placeNew("King", COLORS.BLACK, 0, 5, "Heaven");
  game.placeNew("Atheism", COLORS.NPC, 5, 2, "Heaven");
  finishSetup(game);
  assert.equal(armedTargets(game, COLORS.WHITE).length, 0);
  assert.equal(armedTargets(game, COLORS.BLACK).length, 0);
});

test("P1: adjacent atheism capture executes the forced win", () => {
  const game = clearBoards(new GameState({ seed: "inv-p1" }));
  game.placeNew("King", COLORS.WHITE, 0, 0, "Normal");
  game.placeNew("King", COLORS.BLACK, 4, 6, "Heaven");
  game.placeNew("Atheism", COLORS.NPC, 5, 2, "Heaven");
  game.placeNew("Rook", COLORS.WHITE, 5, 5, "Heaven");
  game.whiteGP = 0;
  finishSetup(game);
  const plan = planBotTurn(game, "hard", { timeMs: 1000 });
  assert.ok(plan && plan.action, "bot must have a plan");
  assert.equal(plan.action.action, "move");
  // Any Atheism footprint cell (5-6, 2-3) triggers the decision.
  assert.ok(plan.action.to.x >= 5 && plan.action.to.x <= 6 && plan.action.to.y >= 2 && plan.action.to.y <= 3);
  assert.equal(plan.action.board, "Heaven");
  // Execute: capture queues atheism, forced choice destroys Heaven, White wins.
  assert.equal(game.move(plan.action.from, plan.action.to, plan.action.board), true);
  assert.equal(game.pendingDecision?.type, "atheism");
  assert.equal(chooseDecision(game), "heaven");
  assert.equal(game.decision("heaven"), true);
  assert.equal(game.gameOver, true);
  assert.equal(game.winner, COLORS.WHITE);
});

test("P2: sim-verified portal buy starts the invasion route", () => {
  const game = clearBoards(new GameState({ seed: "inv-p2" }));
  game.placeNew("King", COLORS.WHITE, 0, 0, "Normal");
  game.placeNew("King", COLORS.BLACK, 4, 6, "Heaven");
  game.placeNew("Atheism", COLORS.NPC, 5, 2, "Heaven");
  game.placeNew("Knight", COLORS.WHITE, 4, 3, "Normal");
  game.whiteGP = 10;
  finishSetup(game);
  assert.equal(armedTargets(game, COLORS.WHITE).length, 1);
  assert.equal(routeLength(game, COLORS.WHITE, 6), null); // no Normal portals yet
  const plan = planBotTurn(game, "hard", { timeMs: 1000 });
  assert.ok(plan && plan.action, "bot must have a plan");
  assert.equal(plan.action.action, "buy");
  assert.equal(plan.action.id, "portal");
  assert.equal(plan.action.board, "Normal");
});

test("P3 anti-hack: disarmed bot prefers treasure over portal spam", () => {
  // NB: ordinary captures banish to Hell (victim survives), so a hanging
  // rook is genuinely worth little here — Treasure (+15GP, permanent) is the
  // unambiguous material test.
  const game = clearBoards(new GameState({ seed: "inv-p3" }));
  game.placeNew("King", COLORS.WHITE, 4, 7, "Normal");
  game.placeNew("King", COLORS.BLACK, 4, 0, "Normal");
  game.placeNew("Queen", COLORS.WHITE, 3, 4, "Normal");
  game.placeNew("Treasure", COLORS.NPC, 3, 5, "Normal");
  game.whiteGP = 10;
  game.blackGP = 0; // broke: no free king->SuperKing reply to muddy the comparison
  finishSetup(game);
  assert.equal(armedTargets(game, COLORS.WHITE).length, 0);
  // Decorative portals score exactly zero without an armed win.
  assert.equal(portalBuyValue(game, 4, 4, COLORS.WHITE), 0);
  const plan = planBotTurn(game, "hard", { timeMs: 1000 });
  assert.ok(plan && plan.action);
  // Widened quiescence correctly sees buy-knight-then-take-later outscores
  // take-now (kings survive to Hell, so the take isn't terminal). The
  // anti-hack property is narrower: NEVER a portal buy, NEVER an invasion
  // project when disarmed.
  assert.ok(!(plan.action.action === "buy" && plan.action.id === "portal"));
  assert.ok(!plan.kind.startsWith("invasion"));
});

test("H1: hunt walks the nearest hunter onto the portal", () => {
  const game = clearBoards(new GameState({ seed: "inv-h1" }));
  game.placeNew("King", COLORS.WHITE, 0, 0, "Normal");
  game.placeNew("King", COLORS.BLACK, 4, 4, "Hell");
  game.placeNew("Rook", COLORS.WHITE, 3, 3, "Normal");
  game.placeNew("Portal", COLORS.NPC, 3, 4, "Normal", { portalTo: "Hell" });
  game.whiteGP = 0;
  finishSetup(game);
  const plan = planBotTurn(game, "hard", { timeMs: 1000 });
  assert.ok(plan && plan.action, "bot must have a plan");
  assert.equal(plan.kind, "hunt:move");
  assert.deepEqual(plan.action.to, { x: 3, y: 4 });
});

test("H2: live tactics pre-empt the hunt", () => {
  const game = clearBoards(new GameState({ seed: "inv-h2" }));
  game.placeNew("King", COLORS.WHITE, 0, 0, "Normal");
  game.placeNew("King", COLORS.BLACK, 4, 4, "Hell");
  game.placeNew("Rook", COLORS.WHITE, 3, 3, "Normal");
  game.placeNew("Portal", COLORS.NPC, 3, 4, "Normal", { portalTo: "Hell" });
  game.placeNew("Queen", COLORS.WHITE, 2, 2, "Normal");
  game.placeNew("Rook", COLORS.BLACK, 2, 3, "Normal");
  game.whiteGP = 0;
  finishSetup(game);
  const plan = planBotTurn(game, "hard", { timeMs: 1000 });
  assert.ok(plan && plan.action);
  assert.ok(!plan.kind.startsWith("hunt"), "tactics must pre-empt steering");
});

test("H3: diffuse king counts stay with search", () => {
  const game = clearBoards(new GameState({ seed: "inv-h3" }));
  game.placeNew("King", COLORS.WHITE, 0, 0, "Normal");
  game.placeNew("King", COLORS.BLACK, 1, 1, "Normal");
  game.placeNew("King", COLORS.BLACK, 2, 2, "Normal");
  game.placeNew("King", COLORS.BLACK, 3, 3, "Normal");
  game.placeNew("Rook", COLORS.WHITE, 5, 5, "Normal");
  game.whiteGP = 0;
  finishSetup(game);
  const plan = planBotTurn(game, "hard", { timeMs: 1000 });
  assert.ok(plan && plan.action);
  assert.ok(!plan.kind.startsWith("hunt") && !plan.kind.startsWith("invasion"));
});

test("P4: disarmed atheism choice never suicides our bunker", () => {
  const game = clearBoards(new GameState({ seed: "inv-p4" }));
  game.placeNew("King", COLORS.WHITE, 4, 6, "Heaven");
  game.placeNew("King", COLORS.BLACK, 0, 5, "Heaven");
  const atheism = game.placeNew("Atheism", COLORS.NPC, 5, 2, "Heaven");
  finishSetup(game);
  game.queueDecision("atheism", atheism);
  assert.equal(game.pendingDecision?.type, "atheism");
  assert.equal(forcedAtheismChoice(game), null);
  assert.equal(chooseDecision(game), "metaphysical");
});
