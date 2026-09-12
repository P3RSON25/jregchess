import assert from "node:assert/strict";
import test from "node:test";
import { COLORS, GameState, RULE_PICKER, imageKey } from "../shared/game.js";

test("initial setup matches the Java board and afterlife boards", () => {
  const game = new GameState({ seed: "setup" });
  assert.equal(game.getCell(4, 7, "Normal").type, "King");
  assert.equal(game.getCell(3, 0, "Normal").type, "Queen");
  assert.equal(game.getCell(0, 3, "Normal").type, "Coin");
  assert.equal(game.getCell(2, 5, "Hell").type, "Portal");
  assert.equal(game.getCell(1, 1, "Heaven").type, "Angel");
  assert.equal(game.getCell(7, 6, "Heaven").type, "Church");
  assert.deepEqual(game.rules, ["KING_DIES_IN_HELL", "SUICIDE_BOMBER_HEAVEN"]);
});

test("online setup omits Angel and Atheism like the Java client", () => {
  const game = new GameState({ online: true, seed: "abcde" });
  assert.equal(game.getCell(1, 1, "Heaven"), null);
  assert.equal(game.getCell(5, 2, "Heaven"), null);
  assert.equal(game.getCell(6, 5, "Heaven").type, "Church");
});

test("pawn moves, turn order, captures, and illegal moves follow the source", () => {
  const game = new GameState({ seed: "moves" });
  assert.deepEqual(game.legalMoves({ x: 0, y: 6 }), [{ x: 0, y: 4 }, { x: 0, y: 5 }]);
  assert.equal(game.move({ x: 0, y: 6 }, { x: 0, y: 3 }), false);
  assert.equal(game.whiteToMove, true);
  assert.equal(game.move({ x: 4, y: 6 }, { x: 4, y: 4 }), true);
  assert.equal(game.whiteToMove, false);
  assert.equal(game.move({ x: 3, y: 1 }, { x: 3, y: 3 }), true);
  assert.equal(game.move({ x: 4, y: 4 }, { x: 3, y: 3 }), true);
  assert.equal(game.getCell(3, 3, "Normal").color, COLORS.WHITE);
  assert.equal(game.getCell(3, 3, "Hell").type, "Pawn");
  assert.equal(game.whiteGP, 6);
});

test("the source deliberately has no king-safety/check restriction", () => {
  const game = new GameState({ seed: "no-check" });
  game.removeAt(4, 6, "Normal");
  assert.equal(game.validMove({ x: 4, y: 7 }, { x: 4, y: 6 }), true);
});

test("special movement and pawn rule parity", () => {
  const game = new GameState({ seed: "special" });
  game.removeAt(4, 4, "Normal");
  const unicorn = game.placeNew("Unicorn", COLORS.WHITE, 4, 4, "Normal");
  assert.equal(game.validMove({ x: 4, y: 4 }, { x: 6, y: 4 }), true);
  assert.equal(imageKey(unicorn), "white/unicorn.png");
  game.addRule("PAWNS_MOVE_FOUR");
  assert.equal(game.validMove({ x: 2, y: 6 }, { x: 2, y: 2 }), true);
});

test("buying consumes the turn while upgrading does not", () => {
  const game = new GameState({ seed: "shop" });
  assert.equal(game.buy("pawn", 3, 4), true);
  assert.equal(game.whiteGP, 3);
  assert.equal(game.whiteToMove, false);
  game.whiteToMove = true;
  game.whiteGP = 10;
  assert.equal(game.upgrade("centaur", 3, 4), true);
  assert.equal(game.getCell(3, 4, "Normal").type, "Centaur");
  assert.equal(game.whiteGP, 5);
  assert.equal(game.whiteToMove, true);
});

test("rule events and rule picker preserve source behavior", () => {
  const game = new GameState({ seed: "rules" });
  game.addRule("MORE_GOLD");
  assert.equal(game.whiteGP, 15);
  assert.equal(game.blackGP, 15);
  assert.equal(game.rules.includes("MORE_GOLD"), false);
  game.addRule("UNICORNS");
  assert.equal(game.getCell(1, 7, "Normal").type, "Unicorn");
  assert.equal(game.rules.includes("UNICORNS"), true);
  assert.equal(game.availableRules.length, RULE_PICKER.length - 2);
});

test("snapshots round-trip board state and automovers", () => {
  const game = new GameState({ seed: "snapshot" });
  game.addRule("WILD_HORSE");
  const copy = GameState.fromSnapshot(game.toSnapshot());
  assert.equal(copy.getCell(4, 3, "Normal").type, "WildHorse");
  assert.equal(copy.automovingPieces.length, 1);
  assert.equal(copy.whiteGP, game.whiteGP);
});

test("captures preserve the special death systems", () => {
  const game = new GameState({ online: true, seed: "special-captures" });
  game.removeAt(0, 3, "Normal");
  game.placeNew("Landmine", COLORS.NPC, 0, 3, "Normal");
  assert.equal(game.takeAt(0, 3, game.getCell(0, 6, "Normal"), "Normal"), false);
  assert.equal(game.getCell(0, 3, "Normal"), null);

  game.removeAt(3, 3, "Normal");
  const bomber = game.placeNew("SuicideBomber", COLORS.WHITE, 3, 3, "Normal");
  game.removeAt(4, 4, "Normal");
  const attacker = game.placeNew("Knight", COLORS.BLACK, 4, 4, "Normal");
  game.takeAt(3, 3, attacker, "Normal");
  assert.equal(game.getCell(3, 3, "Normal"), null);
  assert.equal(game.getCell(3, 3, "Heaven")?.uid, bomber.uid);
  assert.equal(game.getCell(4, 4, "Normal"), null);
});

test("large pieces occupy a translated rectangular footprint", () => {
  const game = new GameState({ seed: "large" });
  const superKing = game.placeNew("SuperKing", COLORS.WHITE, 2, 3, "Normal");
  assert.equal(game.getCell(2, 3, "Normal").uid, superKing.uid);
  assert.equal(game.getCell(3, 3, "Normal").group, superKing.group);
  assert.equal(game.getCell(2, 4, "Normal").group, superKing.group);
  assert.equal(game.getCell(3, 4, "Normal").group, superKing.group);
  for (const [x, y] of [[4, 5], [5, 5], [4, 6], [5, 6]]) game.removeAt(x, y, "Normal");
  assert.equal(game.validMove({ x: 2, y: 3 }, { x: 4, y: 5 }), true);
  game.move({ x: 2, y: 3 }, { x: 4, y: 5 });
  assert.equal(game.getCell(4, 5, "Normal").uid, superKing.uid);
});
