import assert from "node:assert/strict";
import test from "node:test";
import { COLORS, GameState, RULE_ICONS, RULE_PICKER, imageKey } from "../shared/game.js";

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

test("online setup includes Angel and Atheism for browser multiplayer", () => {
  const game = new GameState({ online: true, seed: "abcde" });
  assert.equal(game.getCell(1, 1, "Heaven").type, "Angel");
  assert.equal(game.getCell(5, 2, "Heaven").type, "Atheism");
  assert.equal(game.getCell(3, 3, "Heaven").type, "Angel");
  assert.equal(game.getCell(6, 3, "Heaven").type, "Atheism");
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

test("the explosive rule uses a dedicated two-color affected-piece sprite", () => {
  assert.equal(RULE_ICONS.NEXT_PIECE_EXPLODES, "rule-next-piece-explodes.svg");
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

test("online turns open the rule picker and spawn selected rules", () => {
  const game = new GameState({ online: true, seed: "online-rules" });
  for (let i = 0; i < 4; i++) game.nextTurn();
  assert.equal(game.rulePicker, true);
  assert.equal(game.rulePickerColor, COLORS.WHITE);
  assert.equal(game.addRule("WILD_HORSE"), true);
  assert.equal(game.rulePicker, false);
  assert.equal(game.rules.includes("WILD_HORSE"), true);
  assert.equal(game.getCell(4, 3, "Normal")?.type, "WildHorse");
  for (let i = 0; i < 6; i++) game.nextTurn();
  assert.equal(game.rulePicker, true);
  assert.equal(game.rulePickerColor, COLORS.BLACK);
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

  game.removeAt(4, 4, "Normal");
  const bomber = game.placeNew("SuicideBomber", COLORS.WHITE, 4, 4, "Normal");
  game.removeAt(5, 5, "Normal");
  const attacker = game.placeNew("Knight", COLORS.BLACK, 5, 5, "Normal");
  game.takeAt(4, 4, attacker, "Normal");
  assert.equal(game.getCell(4, 4, "Normal"), null);
  assert.equal(game.getCell(4, 4, "Heaven")?.uid, bomber.uid);
  assert.equal(game.getCell(5, 5, "Normal"), null);
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

test("pawns can capture portals diagonally and purchased NPCs use root assets", () => {
  const game = new GameState({ online: true, seed: "portal-pawn" });
  game.removeAt(0, 3, "Normal");
  game.removeAt(1, 5, "Normal");
  const portal = game.placeNew("Portal", COLORS.NPC, 1, 5, "Normal");
  const pawn = game.getCell(0, 6, "Normal");
  assert.equal(imageKey(portal), "portal.png");
  assert.equal(game.validMove({ x: 0, y: 6 }, { x: 1, y: 5 }, "Normal"), true);
  game.move({ x: 0, y: 6 }, { x: 1, y: 5 });
  assert.equal(game.getCell(0, 6, "Normal"), null);
  assert.equal(game.getCell(1, 5, "Heaven")?.uid, pawn.uid);

  const shop = new GameState({ online: true, seed: "npc-assets" });
  const mine = shop.buy("landmine", 4, 4);
  assert.equal(mine, true);
  assert.equal(imageKey(shop.getCell(4, 4, "Normal")), "landmine.png");
  assert.equal(shop.whiteToMove, false);
  shop.whiteToMove = true;
  shop.whiteGP = 10;
  assert.equal(shop.buy("portal", 5, 4), true);
  assert.equal(imageKey(shop.getCell(5, 4, "Normal")), "portal.png");
});

test("landmine and pittrap rules spawn usable traps on empty squares", () => {
  const game = new GameState({ online: true, seed: "traps" });
  const normal = game.boards.Normal;
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) game.removeAt(x, y, "Normal");
  game.addRule("LANDMINES");
  assert.equal(normal.flat().filter(piece => piece?.type === "Landmine").length, 3);
  const mine = normal.flat().find(piece => piece?.type === "Landmine");
  const mineX = mine.x;
  const mineY = mine.y;
  assert.equal(game.takeAt(mineX, mineY, null, "Normal"), false);
  assert.equal(game.getCell(mineX, mineY, "Normal"), null);

  game.addRule("PITTRAPS");
  assert.equal(normal.flat().filter(piece => piece?.type === "Pittrap").length, 3);
  const trap = normal.flat().find(piece => piece?.type === "Pittrap");
  assert.equal(game.takeAt(trap.x, trap.y, null, "Normal"), false);
  assert.equal(game.getCell(trap.x, trap.y, "Normal"), null);
});

test("resignation and agreed draws end multiplayer games", () => {
  const resigned = new GameState({ online: true, seed: "resign" });
  assert.equal(resigned.resign(COLORS.WHITE), true);
  assert.equal(resigned.gameOver, true);
  assert.equal(resigned.winner, COLORS.BLACK);

  const drawn = new GameState({ online: true, seed: "draw" });
  assert.equal(drawn.offerDraw(COLORS.WHITE), true);
  assert.equal(drawn.respondDraw(COLORS.BLACK, true), true);
  assert.equal(drawn.draw, true);
  assert.equal(drawn.gameOver, true);
});

test("destroying Hell resolves kings and purchased Super Kings correctly", () => {
  const clearHell = game => {
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) game.removeAt(x, y, "Hell");
  };

  const bothKings = new GameState({ online: true, seed: "hell-both" });
  clearHell(bothKings);
  bothKings.placeNew("King", COLORS.WHITE, 0, 0, "Hell");
  bothKings.placeNew("King", COLORS.BLACK, 4, 0, "Hell");
  assert.equal(bothKings.destroyHell(), true);
  assert.equal(bothKings.draw, true);
  assert.equal(bothKings.gameOver, true);
  assert.equal(bothKings.winner, null);

  const oneKing = new GameState({ online: true, seed: "hell-one" });
  clearHell(oneKing);
  oneKing.placeNew("King", COLORS.WHITE, 0, 0, "Hell");
  assert.equal(oneKing.destroyHell(), true);
  assert.equal(oneKing.gameOver, true);
  assert.equal(oneKing.winner, COLORS.BLACK);

  const purchasedKing = new GameState({ online: true, seed: "hell-super" });
  clearHell(purchasedKing);
  purchasedKing.placeNew("SuperKing", COLORS.BLACK, 0, 0, "Hell");
  assert.equal(purchasedKing.destroyHell(), true);
  assert.equal(purchasedKing.gameOver, true);
  assert.equal(purchasedKing.winner, COLORS.WHITE);
});

test("moves and upgrades can target an explicit board independent of currentBoard", () => {
  const game = new GameState({ online: true, seed: "board-view" });
  game.currentBoard = "Normal";
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) game.removeAt(x, y, "Hell");
  game.placeNew("Rook", COLORS.WHITE, 0, 0, "Hell");
  assert.equal(game.move({ x: 0, y: 0 }, { x: 0, y: 4 }, "Hell"), true);
  assert.equal(game.getCell(0, 4, "Hell")?.type, "Rook");
  assert.equal(game.currentBoard, "Normal");

  game.whiteToMove = true;
  game.whiteGP = 5;
  game.placeNew("Knight", COLORS.WHITE, 2, 2, "Hell");
  assert.equal(game.upgrade("unicorn", 2, 2, "Hell"), true);
  assert.equal(game.getCell(2, 2, "Hell")?.type, "Unicorn");
  assert.equal(game.currentBoard, "Normal");
});
