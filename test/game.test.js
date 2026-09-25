import assert from "node:assert/strict";
import test from "node:test";
import { BOARD_NAMES, COLORS, GameState, LARGE_SIZES, RULE_ICONS, RULE_PICKER, imageKey } from "../shared/game.js";

function emptyFixture(seed) {
  const game = new GameState({ online: true, seed });
  game.initializing = true;
  for (const boardName of ["Normal", "Heaven", "Hell"]) {
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
      const piece = game.getCell(x, y, boardName);
      if (piece) game.removeGroup(piece, boardName);
    }
  }
  game.automovingPieces = [];
  game.gameOver = false;
  game.draw = false;
  game.winner = null;
  game.pendingDecision = null;
  return game;
}

function startFixture(game) {
  game.initializing = false;
  game.checkVictory();
  return game;
}

function assertIntegrity(game) {
  const uids = new Set();
  for (const boardName of game.activeBoardNames()) {
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
      const piece = game.getCell(x, y, boardName);
      if (!piece) continue;
      assert.equal(uids.has(piece.uid), false, `Duplicate uid ${piece.uid}`);
      uids.add(piece.uid);
      assert.deepEqual([piece.x, piece.y, piece.board], [x, y, boardName]);
      if (piece.group) {
        const root = game.leader(piece);
        const [width, height] = LARGE_SIZES[piece.type];
        assert.equal(root.part, 0);
        assert.equal(game.groupCells(root.group, boardName).length, width * height);
        assert.strictEqual(root.related[piece.part], piece);
        assert.equal(piece.health, root.health);
        assert.equal(piece.color, root.color);
        assert.equal(piece.controlledBy, root.controlledBy);
      }
    }
  }
  for (const piece of game.automovingPieces) {
    assert.strictEqual(game.findByUid(piece.uid), piece);
    assert.equal(Boolean(piece.controlledBy), false);
  }
  assert.equal(game._resolutionDepth, 0);
}

function protectedFixture(seed) {
  const game = emptyFixture(seed);
  game.placeNew("King", COLORS.WHITE, 0, 0, "Heaven");
  game.placeNew("King", COLORS.BLACK, 7, 7, "Hell");
  return game;
}

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
  const game = protectedFixture("large");
  const superKing = game.placeNew("SuperKing", COLORS.WHITE, 2, 3, "Normal");
  const parts = [...superKing.related];
  startFixture(game);
  assert.equal(game.getCell(2, 3, "Normal").uid, superKing.uid);
  assert.equal(game.getCell(3, 3, "Normal").group, superKing.group);
  assert.equal(game.getCell(2, 4, "Normal").group, superKing.group);
  assert.equal(game.getCell(3, 4, "Normal").group, superKing.group);
  assert.equal(game.validMove({ x: 2, y: 3 }, { x: 4, y: 5 }), false);
  assert.equal(game.move({ x: 2, y: 3 }, { x: 3, y: 4 }), true);
  assert.strictEqual(game.getCell(3, 4, "Normal"), superKing);
  for (let i = 0; i < parts.length; i++) assert.strictEqual(superKing.related[i], parts[i]);
  assert.equal(superKing.health, 2);
  game.whiteToMove = true;
  assert.equal(game.move({ x: 4, y: 5 }, { x: 3, y: 4 }), true);
  assert.strictEqual(game.getCell(2, 3, "Normal"), superKing);
  assertIntegrity(game);
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
  const game = startFixture(protectedFixture("traps"));
  const normal = game.boards.Normal;
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
  const bothKings = emptyFixture("hell-both");
  bothKings.placeNew("King", COLORS.WHITE, 0, 0, "Hell");
  bothKings.placeNew("King", COLORS.BLACK, 4, 0, "Hell");
  startFixture(bothKings);
  assert.equal(bothKings.destroyHell(), true);
  assert.equal(bothKings.draw, true);
  assert.equal(bothKings.gameOver, true);
  assert.equal(bothKings.winner, null);

  const oneKing = emptyFixture("hell-one");
  oneKing.placeNew("King", COLORS.WHITE, 0, 0, "Hell");
  oneKing.placeNew("King", COLORS.BLACK, 7, 7, "Normal");
  startFixture(oneKing);
  assert.equal(oneKing.destroyHell(), true);
  assert.equal(oneKing.gameOver, true);
  assert.equal(oneKing.winner, COLORS.BLACK);

  const purchasedKing = emptyFixture("hell-super");
  purchasedKing.placeNew("SuperKing", COLORS.BLACK, 0, 0, "Hell");
  purchasedKing.placeNew("King", COLORS.WHITE, 7, 7, "Normal");
  startFixture(purchasedKing);
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

test("portal chains preserve the incoming object and resolve occupied destinations", () => {
  const game = emptyFixture("portal-chain");
  game.placeNew("King", COLORS.WHITE, 0, 0, "Normal");
  game.placeNew("King", COLORS.BLACK, 7, 7, "Normal");
  const normalPortal = game.placeNew("Portal", COLORS.NPC, 3, 3, "Normal");
  const heavenPortal = game.placeNew("Portal", COLORS.NPC, 3, 3, "Heaven");
  normalPortal.portalTo = "Heaven";
  heavenPortal.portalTo = "Hell";
  const victim = game.placeNew("Rook", COLORS.BLACK, 3, 3, "Hell");
  const traveler = game.placeNew("Zombie", COLORS.WHITE, 2, 3, "Normal");
  traveler.controlledBy = COLORS.WHITE;
  startFixture(game);

  assert.equal(game.takeAt(3, 3, traveler, "Normal"), false);
  assert.equal(game.getCell(2, 3, "Normal"), null);
  assert.strictEqual(game.getCell(3, 3, "Hell"), traveler);
  assert.equal(game.findByUid(victim.uid), null);
  assert.strictEqual(game.getCell(3, 3, "Normal"), normalPortal);
  assert.strictEqual(game.getCell(3, 3, "Heaven"), heavenPortal);
  assert.equal(traveler.controlledBy, COLORS.WHITE);
});

test("same-coordinate portals across every active board collapse consistently", () => {
  const game = emptyFixture("portal-collapse");
  game.placeNew("King", COLORS.WHITE, 0, 0, "Normal");
  game.placeNew("King", COLORS.BLACK, 7, 7, "Normal");
  game.placeNew("Portal", COLORS.NPC, 4, 4, "Normal");
  game.placeNew("Portal", COLORS.NPC, 4, 4, "Heaven");
  const finalPortal = game.placeNew("Portal", COLORS.NPC, 4, 4, "Hell");
  startFixture(game);

  assert.equal(finalPortal, null);
  assert.equal(game.getCell(4, 4, "Normal"), null);
  assert.equal(game.getCell(4, 4, "Heaven"), null);
  assert.equal(game.getCell(4, 4, "Hell"), null);
  assert.match(game.lastEvent.message, /collapses/i);
});

test("global victory counts every King and Super King on active boards", () => {
  const game = emptyFixture("global-victory");
  game.placeNew("King", COLORS.WHITE, 0, 0, "Normal");
  const blackNormal = game.placeNew("King", COLORS.BLACK, 7, 7, "Normal");
  const blackSuper = game.placeNew("SuperKing", COLORS.BLACK, 0, 0, "Hell");
  startFixture(game);

  game.removeGroup(blackNormal, "Normal");
  game.checkVictory();
  assert.equal(game.gameOver, false);
  game.removeGroup(blackSuper, "Hell");
  game.checkVictory();
  assert.equal(game.winner, COLORS.WHITE);

  const draw = emptyFixture("global-draw");
  draw.placeNew("King", COLORS.WHITE, 0, 0, "Heaven");
  draw.placeNew("King", COLORS.BLACK, 7, 7, "Hell");
  startFixture(draw);
  draw.destroyDimension("Heaven");
  assert.equal(draw.winner, COLORS.BLACK);
});

test("Super King and Angel absorb one attacker and die on the second hit", () => {
  const game = emptyFixture("two-lives");
  game.placeNew("King", COLORS.WHITE, 0, 0, "Normal");
  game.placeNew("King", COLORS.BLACK, 7, 7, "Normal");
  const superKing = game.placeNew("SuperKing", COLORS.WHITE, 2, 2, "Hell");
  const first = game.placeNew("Rook", COLORS.BLACK, 2, 6, "Hell");
  startFixture(game);

  assert.equal(game.takeAt(2, 2, first, "Hell"), false);
  assert.equal(game.findByUid(first.uid), null);
  assert.deepEqual(superKing.related.map(part => part.health), [1, 1, 1, 1]);
  const second = game.placeNew("Rook", COLORS.BLACK, 2, 6, "Hell");
  assert.equal(game.transportPiece(second, 2, 2, "Hell"), true);
  assert.strictEqual(game.getCell(2, 2, "Hell"), second);
  assert.equal(game.findByUid(superKing.uid), null);

  const angelGame = emptyFixture("angel-lives");
  angelGame.placeNew("King", COLORS.WHITE, 0, 0, "Normal");
  angelGame.placeNew("King", COLORS.BLACK, 7, 7, "Normal");
  const angel = angelGame.placeNew("Angel", COLORS.NPC, 2, 2, "Heaven");
  const angelAttacker = angelGame.placeNew("Rook", COLORS.WHITE, 0, 2, "Heaven");
  startFixture(angelGame);
  assert.equal(angelGame.transportPiece(angelAttacker, 2, 2, "Heaven"), "decision");
  assert.equal(angel.health, 1);
  assert.equal(angelGame.findByUid(angelAttacker.uid), null);
  assert.equal(angelGame.decision("no"), true);
  const secondAngelAttacker = angelGame.placeNew("Rook", COLORS.BLACK, 0, 2, "Heaven");
  // Heaven NPC interactions consume the incoming piece even when the NPC dies.
  assert.equal(angelGame.transportPiece(secondAngelAttacker, 2, 2, "Heaven"), false);
  assert.equal(angelGame.findByUid(secondAngelAttacker.uid), null);
  assert.equal(angelGame.findByUid(angel.uid), null);
});

test("freeing the Angel removes it and spawns one active Aggro Angel", () => {
  const game = emptyFixture("free-angel");
  game.placeNew("King", COLORS.WHITE, 0, 0, "Normal");
  game.placeNew("King", COLORS.BLACK, 7, 7, "Normal");
  const angel = game.placeNew("Angel", COLORS.NPC, 1, 1, "Heaven");
  const attacker = game.placeNew("Rook", COLORS.WHITE, 0, 1, "Heaven");
  startFixture(game);
  game.transportPiece(attacker, 1, 1, "Heaven");

  assert.equal(game.decision("yes"), true);
  assert.equal(game.findByUid(angel.uid), null);
  const aggroAngels = game.boards.Normal.flat().filter(piece => piece?.type === "AggroAngel" && piece.part === 0);
  assert.equal(aggroAngels.length, 1);
  assert.equal(game.automovingPieces.filter(piece => piece.type === "AggroAngel").length, 1);
});

test("Necromancer control gives a Zombie King movement and survives portals and snapshots", () => {
  const game = emptyFixture("controlled-zombie");
  game.placeNew("King", COLORS.WHITE, 0, 0, "Normal");
  game.placeNew("King", COLORS.BLACK, 7, 7, "Normal");
  game.placeNew("Necromancer", COLORS.WHITE, 4, 4, "Normal");
  const zombie = game.placeNew("Zombie", COLORS.NPC, 3, 3, "Normal");
  zombie.movingRight = true;
  game.automovingPieces.push(zombie);
  startFixture(game);

  assert.equal(game.move({ x: 4, y: 4 }, { x: 3, y: 3 }, "Normal"), true);
  const controlled = game.getCell(4, 4, "Normal");
  assert.strictEqual(controlled, zombie);
  assert.equal(controlled.controlledBy, COLORS.WHITE);
  assert.equal(controlled.color, COLORS.WHITE);
  assert.equal(game.automovingPieces.includes(controlled), false);
  assert.equal(game.validMove({ x: 4, y: 4 }, { x: 5, y: 5 }, "Normal"), true);
  assert.equal(game.validMove({ x: 4, y: 4 }, { x: 6, y: 4 }, "Normal"), false);

  const portal = game.placeNew("Portal", COLORS.NPC, 5, 5, "Normal");
  portal.portalTo = "Hell";
  game.whiteToMove = true;
  assert.equal(game.move({ x: 4, y: 4 }, { x: 5, y: 5 }, "Normal"), true);
  assert.strictEqual(game.getCell(5, 5, "Hell"), zombie);
  assert.equal(zombie.controlledBy, COLORS.WHITE);

  const copy = GameState.fromSnapshot(game.toSnapshot());
  assert.equal(copy.getCell(5, 5, "Hell").controlledBy, COLORS.WHITE);
  assert.equal(copy.getCell(5, 5, "Hell").color, COLORS.WHITE);
  game.placeNew("Portal", COLORS.NPC, 4, 5, "Hell", { portalTo: "Heaven" });
  game.placeNew("Portal", COLORS.NPC, 4, 4, "Heaven", { portalTo: "Normal" });
  game.whiteToMove = true;
  assert.equal(game.move({ x: 5, y: 5 }, { x: 4, y: 5 }, "Hell"), true);
  assert.strictEqual(game.getCell(4, 5, "Heaven"), zombie);
  game.whiteToMove = true;
  assert.equal(game.move({ x: 4, y: 5 }, { x: 4, y: 4 }, "Heaven"), true);
  assert.strictEqual(game.getCell(4, 4, "Normal"), zombie);
  assert.equal(zombie.controlledBy, COLORS.WHITE);
  assert.equal(zombie.wildCounterpart, "Zombie");
  assertIntegrity(game);
});

test("Gold Rush, Treasure, and their captures update the shared GP balance exactly", () => {
  const game = emptyFixture("rule-money");
  game.placeNew("King", COLORS.WHITE, 0, 0, "Normal");
  game.placeNew("King", COLORS.BLACK, 7, 7, "Normal");
  startFixture(game);
  const initial = game.whiteGP;

  game.addRule("GOLD_RUSH");
  const coins = game.boards.Normal.flat().filter(piece => piece?.type === "Coin");
  assert.equal(coins.length, 5);
  assert.equal(new Set(coins.map(piece => `${piece.x},${piece.y}`)).size, 5);
  assert.equal(game.takeAt(coins[0].x, coins[0].y, game.getCell(0, 0, "Normal"), "Normal"), true);
  assert.equal(game.whiteGP, initial + 4);

  game.addRule("TREASURE");
  const treasure = game.boards.Normal.flat().find(piece => piece?.type === "Treasure");
  assert.ok(treasure);
  assert.ok([3, 4].includes(treasure.y));
  assert.equal(game.takeAt(treasure.x, treasure.y, game.getCell(0, 0, "Normal"), "Normal"), true);
  assert.equal(game.whiteGP, initial + 19);
});

test("Rooks upgrade on explicit boards and Angry Rooks capture an occupied path", () => {
  const game = emptyFixture("angry-rook");
  game.placeNew("King", COLORS.WHITE, 7, 7, "Normal");
  game.placeNew("King", COLORS.BLACK, 7, 0, "Normal");
  const rook = game.placeNew("Rook", COLORS.WHITE, 0, 0, "Hell");
  rook.moved = true;
  game.whiteGP = 10;
  startFixture(game);

  assert.equal(game.upgrade("angry-rook", 0, 0, "Hell"), true);
  const angry = game.getCell(0, 0, "Hell");
  assert.equal(angry.type, "AngryRook");
  assert.equal(angry.color, COLORS.WHITE);
  assert.equal(angry.moved, true);
  assert.equal(game.whiteGP, 5);

  const middle = game.placeNew("Bishop", COLORS.BLACK, 0, 2, "Hell");
  const destination = game.placeNew("Knight", COLORS.BLACK, 0, 4, "Hell");
  assert.equal(game.validMove({ x: 0, y: 0 }, { x: 0, y: 4 }, "Hell"), true);
  assert.equal(game.move({ x: 0, y: 0 }, { x: 0, y: 4 }, "Hell"), true);
  assert.strictEqual(game.getCell(0, 4, "Hell"), angry);
  assert.equal(game.findByUid(middle.uid), null);
  assert.equal(game.findByUid(destination.uid), null);
});

test("chained explosions hit diagonals, destroy portals, and reward every victim once", () => {
  const game = protectedFixture("blast-chain");
  game.placeNew("Landmine", COLORS.NPC, 3, 3, "Normal");
  game.placeNew("Landmine", COLORS.NPC, 4, 3, "Normal");
  const rook = game.placeNew("Rook", COLORS.WHITE, 2, 2, "Normal");
  const knight = game.placeNew("Knight", COLORS.BLACK, 5, 4, "Normal");
  const whiteKing = game.placeNew("King", COLORS.WHITE, 2, 4, "Normal");
  const blackKing = game.placeNew("King", COLORS.BLACK, 4, 4, "Normal");
  const portal = game.placeNew("Portal", COLORS.NPC, 2, 3, "Normal");
  const heavenPortal = game.placeNew("Portal", COLORS.NPC, 2, 3, "Heaven");
  const coin = game.placeNew("Coin", COLORS.NPC, 3, 2, "Normal");
  const treasure = game.placeNew("Treasure", COLORS.NPC, 5, 2, "Normal");
  const zombie = game.placeNew("Zombie", COLORS.NPC, 4, 2, "Normal");
  game.registerAutomover(zombie);
  startFixture(game);

  assert.equal(game.takeAt(3, 3, null, "Normal"), false);
  for (const piece of [rook, knight, whiteKing, blackKing]) {
    assert.strictEqual(game.getCell(piece.x, piece.y, "Hell"), piece);
    assert.equal(game.getCell(piece.x, piece.y, "Normal"), null);
  }
  for (const piece of [portal, coin, treasure, zombie]) assert.equal(game.findByUid(piece.uid), null);
  assert.strictEqual(game.getCell(2, 3, "Heaven"), heavenPortal);
  assert.equal(game.whiteGP, 5 + 4 + 4 + 15);
  assert.equal(game.gameOver, false);
  assertIntegrity(game);
});

test("an explosion resolves its center and both last kings before deciding a draw", () => {
  const game = emptyFixture("simultaneous-kings");
  game.placeNew("King", COLORS.WHITE, 3, 3, "Normal");
  game.placeNew("King", COLORS.BLACK, 4, 4, "Normal");
  game.destroyHell();
  startFixture(game);
  game.explode(3, 3, null, "Normal");
  assert.equal(game.gameOver, true);
  assert.equal(game.draw, true);
  assert.equal(game.winner, null);
  assert.equal(game.whiteGP, 7);
  assert.equal(game.getCell(3, 3, "Normal"), null);
  assert.equal(game.getCell(4, 4, "Normal"), null);
  assertIntegrity(game);
});

test("overlapping blasts hit a large unit once and preserve its final-life afterlife group", () => {
  const game = protectedFixture("blast-health");
  const king = game.placeNew("SuperKing", COLORS.BLACK, 3, 3, "Normal");
  const parts = [...king.related];
  game.placeNew("Landmine", COLORS.NPC, 2, 3, "Normal");
  game.placeNew("Landmine", COLORS.NPC, 2, 4, "Normal");
  startFixture(game);
  game.explode(2, 3, null, "Normal");
  assert.deepEqual(king.related.map(piece => piece.health), [1, 1, 1, 1]);
  assert.strictEqual(game.getCell(3, 3, "Normal"), king);
  game.explode(3, 3, null, "Normal");
  assert.equal(game.getCell(3, 3, "Normal"), null);
  assert.strictEqual(game.getCell(3, 3, "Hell"), king);
  for (let i = 0; i < parts.length; i++) assert.strictEqual(king.related[i], parts[i]);
  assert.equal(game.whiteGP, 6);
  game.explode(3, 3, null, "Hell");
  assert.equal(game.findByUid(king.uid), null);
  assert.equal(game.whiteGP, 6);
  assertIntegrity(game);
});

test("Bomb placement detonates immediately, charges once, and transfers adjacent deaths", () => {
  const game = protectedFixture("buy-bomb");
  const rook = game.placeNew("Rook", COLORS.WHITE, 2, 2, "Normal");
  const knight = game.placeNew("Knight", COLORS.BLACK, 3, 4, "Normal");
  game.whiteGP = 50;
  startFixture(game);
  assert.equal(game.buy("bomb", 3, 3), true);
  assert.equal(game.whiteGP, 37);
  assert.equal(game.whiteToMove, false);
  assert.equal(game.getCell(3, 3, "Normal"), null);
  assert.strictEqual(game.getCell(2, 2, "Hell"), rook);
  assert.strictEqual(game.getCell(3, 4, "Hell"), knight);
  assertIntegrity(game);
});

test("a bomber's occupied Heaven arrival does not skip its explosion or strand the capturing move", () => {
  const game = protectedFixture("bomber-decision");
  const angel = game.placeNew("Angel", COLORS.NPC, 2, 2, "Heaven");
  const bomber = game.placeNew("SuicideBomber", COLORS.BLACK, 3, 3, "Normal");
  const rook = game.placeNew("Rook", COLORS.WHITE, 3, 6, "Normal");
  const neighbor = game.placeNew("Knight", COLORS.BLACK, 4, 4, "Normal");
  startFixture(game);
  assert.equal(game.move({ x: 3, y: 6 }, { x: 3, y: 3 }, "Normal"), true);
  assert.equal(game.pendingDecision.type, "angel");
  assert.equal(game.whiteToMove, true);
  assert.equal(game.findByUid(bomber.uid), null);
  assert.strictEqual(game.getCell(3, 6, "Hell"), rook);
  assert.strictEqual(game.getCell(4, 4, "Hell"), neighbor);
  assert.equal(game.getCell(3, 3, "Normal"), null);
  assert.equal(angel.health, 1);
  assert.equal(game.whiteGP, 8);
  assert.equal(game.decision("no"), true);
  assert.equal(game.whiteToMove, false);
  assert.equal(game.turnsSinceNewRule, 1);
  assertIntegrity(game);
});

for (const board of ["Heaven", "Hell"]) for (const type of ["SuicideBomber", "Jester"]) {
  test(`${type} death in ${board} is permanent and never removes a same-coordinate Normal bystander`, () => {
    const game = protectedFixture(`${type}-${board}`);
    const explosive = game.placeNew(type, COLORS.BLACK, 3, 3, board);
    const attacker = game.placeNew("Rook", COLORS.WHITE, 3, 6, board);
    const bystander = game.placeNew("Queen", COLORS.WHITE, 3, 6, "Normal");
    startFixture(game);
    game.takeAt(3, 3, attacker, board);
    assert.equal(game.findByUid(explosive.uid), null);
    assert.equal(game.findByUid(attacker.uid), null);
    assert.strictEqual(game.getCell(3, 6, "Normal"), bystander);
    assert.equal(game.whiteGP, 5);
    assertIntegrity(game);
  });
}

test("portal cycles lose only the traveler and dimension destruction cleans remaining full chains", () => {
  const game = protectedFixture("portal-cycle");
  const normal = game.placeNew("Portal", COLORS.NPC, 3, 3, "Normal", { portalTo: "Heaven" });
  const heaven = game.placeNew("Portal", COLORS.NPC, 3, 3, "Heaven", { portalTo: "Normal" });
  const traveler = game.placeNew("Rook", COLORS.WHITE, 3, 6, "Normal");
  // Keep the Black king alive outside the dimension being removed.
  game.placeNew("King", COLORS.BLACK, 7, 0, "Heaven");
  startFixture(game);
  game.takeAt(3, 3, traveler, "Normal");
  assert.equal(game.findByUid(traveler.uid), null);
  assert.strictEqual(game.getCell(3, 3, "Normal"), normal);
  assert.strictEqual(game.getCell(3, 3, "Heaven"), heaven);
  game.destroyHell();
  assert.equal(game.getCell(3, 3, "Normal"), null);
  assert.equal(game.getCell(3, 3, "Heaven"), null);
  assert.equal(game.gameOver, false);
  assertIntegrity(game);
});

test("portals fall back to a surviving dimension without changing the arrival coordinates", () => {
  const game = protectedFixture("portal-fallback");
  game.placeNew("King", COLORS.BLACK, 7, 0, "Normal");
  game.destroyHell();
  const portal = game.placeNew("Portal", COLORS.NPC, 4, 5, "Heaven", { portalTo: "Hell" });
  const traveler = game.placeNew("Rook", COLORS.WHITE, 4, 2, "Heaven");
  startFixture(game);
  game.takeAt(4, 5, traveler, "Heaven");
  assert.strictEqual(game.getCell(4, 5, "Normal"), traveler);
  assert.strictEqual(game.getCell(4, 5, "Heaven"), portal);
  assert.equal(game.getCell(4, 2, "Heaven"), null);
  assertIntegrity(game);
});

test("a last king replaced during a death arrival ends the game after the capturing piece is placed", () => {
  const game = emptyFixture("death-replacement");
  game.placeNew("King", COLORS.WHITE, 0, 0, "Heaven");
  const king = game.placeNew("King", COLORS.BLACK, 4, 4, "Hell");
  const victim = game.placeNew("Rook", COLORS.BLACK, 4, 4, "Normal");
  const bishop = game.placeNew("Bishop", COLORS.WHITE, 3, 3, "Normal");
  startFixture(game);
  assert.equal(game.move({ x: 3, y: 3 }, { x: 4, y: 4 }, "Normal"), true);
  assert.strictEqual(game.getCell(4, 4, "Normal"), bishop);
  assert.strictEqual(game.getCell(4, 4, "Hell"), victim);
  assert.equal(game.findByUid(king.uid), null);
  assert.equal(game.winner, COLORS.WHITE);
  assert.equal(game.whiteGP, 6);
  assertIntegrity(game);
});

test("portal creation replaces a king through normal death rules instead of overwriting it", () => {
  for (const board of BOARD_NAMES) {
    const game = emptyFixture(`portal-replaces-${board}`);
    game.placeNew("King", COLORS.WHITE, 0, 0, "Heaven");
    const king = game.placeNew("King", COLORS.BLACK, 4, 4, board);
    startFixture(game);
    const portal = game.placeNew("Portal", COLORS.NPC, 4, 4, board);
    assert.strictEqual(game.getCell(4, 4, board), portal);
    if (board === "Normal") {
      assert.strictEqual(game.getCell(4, 4, "Hell"), king);
      assert.equal(game.gameOver, false);
    } else {
      assert.equal(game.findByUid(king.uid), null);
      assert.equal(game.winner, COLORS.WHITE);
    }
    assertIntegrity(game);
  }
});

test("Necromancer converts a last king only after its complete resurrection and wins globally", () => {
  for (const board of BOARD_NAMES) {
    const game = emptyFixture(`necromancer-king-${board}`);
    game.placeNew("King", COLORS.WHITE, 0, 0, "Heaven");
    const king = game.placeNew("King", COLORS.BLACK, 3, 3, board);
    const necromancer = game.placeNew("Necromancer", COLORS.WHITE, 5, 5, board);
    startFixture(game);
    assert.equal(game.move({ x: 5, y: 5 }, { x: 3, y: 3 }, board), true);
    assert.strictEqual(game.getCell(3, 3, board), necromancer);
    assert.strictEqual(game.getCell(4, 4, board), king);
    assert.equal(king.color, COLORS.WHITE);
    assert.equal(game.winner, COLORS.WHITE);
    assertIntegrity(game);
  }
});

test("indirect Heaven decisions are queued, serialized and complete one turn in order", () => {
  const game = protectedFixture("queued-choices");
  game.placeNew("Atheism", COLORS.NPC, 3, 3, "Heaven");
  game.placeNew("Angel", COLORS.NPC, 0, 2, "Heaven");
  game.placeNew("SuicideBomber", COLORS.BLACK, 3, 3, "Normal");
  game.placeNew("SuicideBomber", COLORS.BLACK, 2, 3, "Normal");
  const attacker = game.placeNew("Rook", COLORS.WHITE, 3, 6, "Normal");
  startFixture(game);
  game.move({ x: 3, y: 6 }, { x: 3, y: 3 }, "Normal");
  assert.equal(game.pendingDecision.type, "atheism");
  assert.equal(game.toSnapshot().decisionQueue[0].type, "angel");
  const copy = GameState.fromSnapshot(JSON.parse(JSON.stringify(game.toSnapshot())));
  for (const state of [game, copy]) {
    assert.equal(state.decision("metaphysical"), true);
    assert.equal(state.pendingDecision.type, "angel");
    assert.equal(state.whiteToMove, true);
    assert.equal(state.decision("no"), true);
    assert.equal(state.whiteToMove, false);
    assert.equal(state.turnsSinceNewRule, 1);
    assert.equal(state.getCell(3, 6, "Hell").uid, attacker.uid);
    assertIntegrity(state);
  }
  assert.deepEqual(JSON.parse(JSON.stringify(copy.toSnapshot())), JSON.parse(JSON.stringify(game.toSnapshot())));
});

test("an NPC's Heaven interaction skips player choices and continues the remaining automovers", () => {
  const game = protectedFixture("automove-choice");
  game.placeNew("Portal", COLORS.NPC, 3, 4, "Normal");
  game.placeNew("Angel", COLORS.NPC, 3, 4, "Heaven");
  const horse = game.placeNew("WildHorse", COLORS.NPC, 1, 3, "Normal");
  const zombie = game.placeNew("Zombie", COLORS.NPC, 0, 5, "Normal", { movingRight: true });
  game.registerAutomover(horse);
  game.registerAutomover(zombie);
  game.random.inclusive = () => 1;
  startFixture(game);
  game.nextTurn();
  assert.equal(game.pendingDecision, null);
  assert.deepEqual(game.toSnapshot().decisionQueue, []);
  assert.equal(game.getCell(3, 4, "Heaven").health, 1);
  assert.deepEqual([game.whiteGP, game.blackGP], [5, 5]);
  assert.equal(game.whiteToMove, false);
  assert.equal(game.turnsSinceNewRule, 1);
  assert.strictEqual(game.getCell(1, 5, "Normal"), zombie);
  assert.equal(game.findByUid(horse.uid), null);
  assertIntegrity(game);
});

test("Gold Rush handles zero, one, four, and sixty-four available squares with exact counts", () => {
  for (const emptyCount of [0, 1, 4, 64]) {
    const game = protectedFixture(`gold-capacity-${emptyCount}`);
    for (let i = emptyCount; i < 64; i++) game.placeNew("Placeholder", COLORS.NPC, i % 8, Math.floor(i / 8), "Normal");
    const existing = game.boards.Normal.flat().filter(Boolean);
    startFixture(game);
    assert.equal(game.addRule("GOLD_RUSH"), true);
    const expected = Math.min(5, emptyCount);
    assert.equal(game.boards.Normal.flat().filter(piece => piece?.type === "Coin").length, expected);
    assert.match(game.lastEvent.message, new RegExp(`${expected} coins? spawned`));
    for (const piece of existing) assert.strictEqual(game.findByUid(piece.uid), piece);
    assertIntegrity(game);
  }
});

test("Treasure never collides or escapes its middle ranks after other spawn rules", () => {
  const game = protectedFixture("treasure-capacity");
  for (const y of [3, 4]) for (let x = 0; x < 8; x++) game.placeNew("Placeholder", COLORS.NPC, x, y, "Normal");
  startFixture(game);
  assert.equal(game.addRule("TREASURE"), true);
  assert.equal(game.boards.Normal.flat().some(piece => piece?.type === "Treasure"), false);
  assert.match(game.lastEvent.message, /No empty square/);
  game.removeAt(4, 4, "Normal");
  game.addRule("LANDMINES");
  if (game.getCell(4, 4, "Normal")) game.removeAt(4, 4, "Normal");
  game.addRule("TREASURE");
  assert.equal(game.getCell(4, 4, "Normal").type, "Treasure");
  assertIntegrity(game);
});

test("actions cannot bypass decisions or rule picking, and invalid upgrades are atomic", () => {
  const game = protectedFixture("action-validation");
  const king = game.placeNew("King", COLORS.WHITE, 4, 7, "Normal");
  const rook = game.placeNew("Rook", COLORS.WHITE, 4, 4, "Normal");
  game.whiteGP = 40;
  startFixture(game);
  assert.equal(game.canUpgrade("super-king", 4, 7, "Normal"), false);
  assert.equal(game.upgrade("super-king", 4, 7, "Normal"), false);
  assert.strictEqual(game.getCell(4, 7, "Normal"), king);
  assert.equal(game.whiteGP, 40);
  assert.equal(game.buy("pawn", -1, 2), false);
  assert.equal(game.buy("pawn", 2, 2, "Heaven"), false);
  game.rulePicker = true;
  assert.equal(game.buy("pawn", 2, 2), false);
  assert.equal(game.upgrade("angry-rook", 4, 4), false);
  assert.strictEqual(game.getCell(4, 4, "Normal"), rook);
  game.rulePicker = false;
  game.queueDecision("atheism", game.getCell(0, 0, "Heaven"));
  const decision = game.pendingDecision;
  assert.equal(game.decision("invalid"), false);
  assert.strictEqual(game.pendingDecision, decision);
  assert.equal(game.buy("pawn", 2, 2), false);
  assert.equal(game.upgrade("angry-rook", 4, 4), false);
  assert.equal(game.addRule("MORE_GOLD"), false);
  assert.equal(game.whiteGP, 40);
  assertIntegrity(game);
});

test("Super King movement and ranged targeting agree with highlights even from a component", () => {
  const game = protectedFixture("ranged-input");
  const king = game.placeNew("SuperKing", COLORS.WHITE, 3, 3, "Normal");
  const distant = game.placeNew("Rook", COLORS.BLACK, 1, 3, "Normal");
  startFixture(game);
  const from = { x: 4, y: 4 }, to = { x: 1, y: 3 };
  assert.equal(game.validMove(from, to, "Normal"), false);
  assert.equal(game.validAttack(from, to, "Normal"), true);
  assert.ok(game.legalMoves(from, "Normal").some(position => position.x === to.x && position.y === to.y));
  assert.equal(game.move(from, to, "Normal"), true);
  assert.strictEqual(game.getCell(3, 3, "Normal"), king);
  assert.strictEqual(game.getCell(1, 3, "Hell"), distant);

  game.whiteToMove = true;
  const adjacent = game.placeNew("Bishop", COLORS.BLACK, 2, 3, "Normal");
  assert.equal(game.move({ x: 3, y: 3 }, { x: 2, y: 3 }, "Normal"), true);
  assert.strictEqual(game.getCell(2, 3, "Normal"), king);
  assert.strictEqual(game.getCell(2, 3, "Hell"), adjacent);
  assert.equal(king.health, 2);
  assertIntegrity(game);
});

test("a ranged Super King attacker is absorbed and the next hit transfers the defender normally", () => {
  const game = protectedFixture("ranged-health");
  const attacker = game.placeNew("SuperKing", COLORS.WHITE, 0, 0, "Normal");
  const defender = game.placeNew("SuperKing", COLORS.BLACK, 2, 2, "Normal");
  startFixture(game);
  assert.equal(game.move({ x: 0, y: 0 }, { x: 2, y: 2 }, "Normal"), true);
  assert.equal(game.findByUid(attacker.uid), null);
  assert.equal(defender.health, 1);
  game.whiteToMove = true;
  const rook = game.placeNew("Rook", COLORS.WHITE, 2, 6, "Normal");
  assert.equal(game.move({ x: 2, y: 6 }, { x: 2, y: 3 }, "Normal"), true);
  assert.strictEqual(game.getCell(2, 3, "Normal"), rook);
  assert.strictEqual(game.getCell(2, 2, "Hell"), defender);
  assert.equal(defender.health, 1);
  assertIntegrity(game);
});

for (const board of ["Normal", "Hell"]) {
  test(`the Angel has two lives in ${board}, and its second attacker can occupy the cleared square`, () => {
    const game = protectedFixture(`angel-${board}`);
    const angel = game.placeNew("Angel", COLORS.NPC, 3, 3, board);
    const first = game.placeNew("Rook", COLORS.WHITE, 1, 3, board);
    startFixture(game);
    assert.equal(game.move({ x: 1, y: 3 }, { x: 3, y: 3 }, board), true);
    assert.equal(game.findByUid(first.uid), null);
    assert.equal(game.pendingDecision.type, "angel");
    assert.equal(game.decision("no"), true);
    const second = game.placeNew("Rook", COLORS.BLACK, 1, 3, board);
    assert.equal(game.move({ x: 1, y: 3 }, { x: 3, y: 3 }, board), true);
    assert.equal(game.findByUid(angel.uid), null);
    assert.strictEqual(game.getCell(3, 3, board), second);
    assertIntegrity(game);
  });
}

test("Angel explosion health is group-wide, with no attacker to absorb or decision to strand", () => {
  const game = protectedFixture("angel-blasts");
  const angel = game.placeNew("Angel", COLORS.NPC, 3, 3, "Heaven");
  startFixture(game);
  game.explode(4, 4, null, "Heaven");
  assert.deepEqual(angel.related.map(part => part.health), Array(9).fill(1));
  assert.equal(game.pendingDecision, null);
  game.explode(4, 4, null, "Heaven");
  assert.equal(game.findByUid(angel.uid), null);
  assertIntegrity(game);
});

test("absorbing the last king resolves victory and clears the now-obsolete Angel choice", () => {
  const game = emptyFixture("absorbed-king");
  game.placeNew("King", COLORS.WHITE, 2, 2, "Heaven");
  game.placeNew("King", COLORS.BLACK, 7, 7, "Hell");
  game.placeNew("Angel", COLORS.NPC, 3, 3, "Heaven");
  startFixture(game);
  assert.equal(game.move({ x: 2, y: 2 }, { x: 3, y: 3 }, "Heaven"), true);
  assert.equal(game.winner, COLORS.BLACK);
  assert.equal(game.pendingDecision, null);
  assert.deepEqual(game.toSnapshot().decisionQueue, []);
  assert.equal(game.toSnapshot().turnPending, false);
});

test("large groups keep every component's identity and health through portal chains and snapshots", () => {
  const game = protectedFixture("group-portals");
  const king = game.placeNew("SuperKing", COLORS.BLACK, 1, 1, "Normal", { health: 1, moved: true });
  const parts = [...king.related];
  game.placeNew("Portal", COLORS.NPC, 3, 3, "Normal", { portalTo: "Heaven" });
  game.placeNew("Portal", COLORS.NPC, 3, 3, "Heaven", { portalTo: "Hell" });
  const victim = game.placeNew("Rook", COLORS.WHITE, 4, 4, "Hell");
  startFixture(game);
  assert.equal(game.transportPiece(king, 3, 3, "Normal"), true);
  assert.equal(game.findByUid(victim.uid), null);
  assert.strictEqual(game.getCell(3, 3, "Hell"), king);
  for (let i = 0; i < parts.length; i++) assert.strictEqual(king.related[i], parts[i]);
  const copy = GameState.fromSnapshot(JSON.parse(JSON.stringify(game.toSnapshot())));
  assert.deepEqual(copy.getCell(3, 3, "Hell").related.map(part => [part.uid, part.health, part.moved]), parts.map(part => [part.uid, 1, true]));
  assertIntegrity(game);
  assertIntegrity(copy);
});

for (const type of ["Zombie", "WildHorse", "Wildlife"]) {
  test(`Necromancer-controlled ${type} keeps its counterpart and King captures without hostile automoving`, () => {
    const game = protectedFixture(`control-${type}`);
    const wild = game.placeNew(type, COLORS.NPC, 3, 3, "Normal", { movingRight: true });
    game.placeNew("Necromancer", COLORS.WHITE, 5, 5, "Normal");
    game.registerAutomover(wild);
    startFixture(game);
    game.move({ x: 5, y: 5 }, { x: 3, y: 3 }, "Normal");
    assert.strictEqual(game.getCell(4, 4, "Normal"), wild);
    assert.equal(wild.controlledBy, COLORS.WHITE);
    assert.equal(wild.wildCounterpart, type);
    assert.equal(game.automovingPieces.includes(wild), false);
    game.automove(wild);
    assert.strictEqual(game.getCell(4, 4, "Normal"), wild);
    game.whiteToMove = true;
    const victim = game.placeNew("Pawn", COLORS.BLACK, 5, 4, "Normal");
    assert.equal(game.move({ x: 4, y: 4 }, { x: 5, y: 4 }, "Normal"), true);
    assert.equal(game.getCell(4, 4, "Normal"), null);
    assert.strictEqual(game.getCell(5, 4, "Hell"), victim);
    const copy = GameState.fromSnapshot(game.toSnapshot());
    assert.equal(copy.getCell(5, 4, "Normal").wildCounterpart, type);
    assert.equal(copy.getCell(5, 4, "Normal").controlledBy, COLORS.WHITE);
    assertIntegrity(game);
    assertIntegrity(copy);
  });
}

test("a resurrected Giraffe retains the Java leaper behavior without inventing a Wild Giraffe", () => {
  const game = protectedFixture("giraffe");
  const giraffe = game.placeNew("Giraffe", COLORS.BLACK, 3, 3, "Normal");
  game.placeNew("Necromancer", COLORS.WHITE, 5, 5, "Normal");
  startFixture(game);
  game.move({ x: 5, y: 5 }, { x: 3, y: 3 }, "Normal");
  assert.strictEqual(game.getCell(4, 4, "Normal"), giraffe);
  assert.equal(giraffe.controlledBy, undefined);
  assert.equal(game.validMove({ x: 4, y: 4 }, { x: 5, y: 7 }), true);
  assert.equal(game.validMove({ x: 4, y: 4 }, { x: 4, y: 5 }), false);
  assert.equal(imageKey(giraffe), "white/giraffe.png");
});

test("Rook Tower flips a neighboring large group exactly once and synchronizes every component", () => {
  const game = protectedFixture("tower-group");
  game.placeNew("RookTower", COLORS.WHITE, 3, 3, "Normal");
  const king = game.placeNew("SuperKing", COLORS.BLACK, 4, 3, "Normal");
  startFixture(game);
  game.takeAt(3, 3, null, "Normal");
  assert.equal(king.color, COLORS.WHITE);
  assert.deepEqual(king.related.map(part => part.color), Array(4).fill(COLORS.WHITE));
  assertIntegrity(game);
});

for (const color of [COLORS.WHITE, COLORS.BLACK]) {
  test(`${color} can upgrade purchased Rooks and preserve state on every explicit board`, () => {
    for (const board of BOARD_NAMES) {
      const game = protectedFixture(`upgrade-${color}-${board}`);
      const rook = game.placeNew("Rook", color, 2, 3, board, { health: 1, moved: true });
      game.whiteToMove = color === COLORS.WHITE;
      game.whiteGP = game.blackGP = 20;
      game.currentBoard = board === "Normal" ? "Hell" : "Normal";
      startFixture(game);
      assert.equal(game.upgrade("angry-rook", 2, 3, board), true);
      const upgraded = game.getCell(2, 3, board);
      assert.equal(upgraded.type, "AngryRook");
      assert.equal(upgraded.color, color);
      assert.equal(upgraded.moved, true);
      assert.equal(upgraded.health, 1);
      assert.equal(game.funds(), 15);
      assert.equal(game.findByUid(rook.uid), null);
      assertIntegrity(game);
    }
    const shop = startFixture(protectedFixture(`purchased-rook-${color}`));
    shop.whiteToMove = color === COLORS.WHITE;
    shop.whiteGP = shop.blackGP = 20;
    assert.equal(shop.buy("rook", 2, 3, "Normal"), true);
    shop.whiteToMove = color === COLORS.WHITE;
    assert.equal(shop.upgrade("angry-rook", 2, 3, "Normal"), true);
    assert.equal(shop.funds(), 8);
  });
}

test("ordinary friendly captures remain illegal, including ungrouped pieces", () => {
  const game = startFixture(protectedFixture("friendly"));
  game.placeNew("Rook", COLORS.WHITE, 2, 2, "Normal");
  const pawn = game.placeNew("Pawn", COLORS.WHITE, 2, 4, "Normal");
  assert.equal(game.validMove({ x: 2, y: 2 }, { x: 2, y: 4 }), false);
  assert.equal(game.move({ x: 2, y: 2 }, { x: 2, y: 4 }), false);
  assert.strictEqual(game.getCell(2, 4, "Normal"), pawn);
});

test("snapshot-restored games continue deterministically through mixed real actions", () => {
  let accepted = 0;
  for (const seed of ["continuation-a", "continuation-b", "continuation-c"]) {
    const game = new GameState({ online: true, seed });
    game.whiteGP = game.blackGP = 40;
    for (let step = 0; step < 80 && !game.gameOver; step++) {
      let action;
      if (game.pendingDecision) {
        const choice = { angel: "no", atheism: "metaphysical", devil: "gold" }[game.pendingDecision.type];
        action = state => state.decision(choice);
      } else if (game.rulePicker) {
        const rule = game.availableRules[step % game.availableRules.length];
        action = state => state.addRule(rule);
      } else {
        if (step % 9 === 0) {
          const id = ["landmine", "portal", "bomb", "king"][Math.floor(step / 9) % 4];
          const targets = [];
          for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) if (game.canBuy(id, x, y, "Normal")) targets.push({ x, y });
          if (targets.length) {
            const target = targets[(step * 7) % targets.length];
            action = state => state.buy(id, target.x, target.y, "Normal");
          }
        }
        if (!action) {
          const moves = [];
          for (const board of game.activeBoardNames()) {
            for (const piece of game.board(board).flat()) {
              if (!piece || piece.part !== 0 || piece.color !== game.currentColor()) continue;
              const from = { x: piece.x, y: piece.y };
              for (const to of game.legalMoves(from, board)) moves.push({ from, to, board });
            }
          }
          if (!moves.length) break;
          const move = moves[(step * 13 + seed.length) % moves.length];
          action = state => state.move(move.from, move.to, move.board);
        }
      }
      const copy = GameState.fromSnapshot(JSON.parse(JSON.stringify(game.toSnapshot())));
      assert.equal(action(game), true);
      assert.equal(action(copy), true);
      assertIntegrity(game);
      assertIntegrity(copy);
      assert.deepEqual(JSON.parse(JSON.stringify(copy.toSnapshot())), JSON.parse(JSON.stringify(game.toSnapshot())));
      accepted++;
    }
  }
  assert.ok(accepted > 100, `Only ${accepted} actions were exercised`);
});

test("NEXT_PIECE_EXPLODES is consumed before nested arrival rewards and explosive chains", () => {
  const game = protectedFixture("next-explosion");
  const victim = game.placeNew("Pawn", COLORS.BLACK, 3, 3, "Normal");
  const neighbor = game.placeNew("Pawn", COLORS.BLACK, 4, 4, "Normal");
  game.placeNew("Coin", COLORS.NPC, 3, 3, "Hell");
  game.placeNew("Landmine", COLORS.NPC, 2, 3, "Normal");
  const attacker = game.placeNew("Rook", COLORS.WHITE, 3, 6, "Normal");
  startFixture(game);
  game.addRule("NEXT_PIECE_EXPLODES");
  assert.equal(game.move({ x: 3, y: 6 }, { x: 3, y: 3 }, "Normal"), true);
  assert.equal(game.rules.includes("NEXT_PIECE_EXPLODES"), false);
  assert.strictEqual(game.getCell(3, 3, "Hell"), victim);
  assert.strictEqual(game.getCell(4, 4, "Hell"), neighbor);
  assert.strictEqual(game.getCell(3, 6, "Normal"), attacker);
  assert.equal(game.getCell(3, 3, "Normal"), null);
  assert.equal(game.whiteGP, 11);
  assertIntegrity(game);
});

for (const [type, reward, remains] of [["Coin", 4, false], ["Treasure", 15, false], ["Church", 0, true], ["Atheism", 0, true], ["Devil", 0, false]]) {
  test(`a Heaven ${type} resolves its interaction without being overwritten by a portal traveler`, () => {
    const game = protectedFixture(`heaven-${type}`);
    const npc = game.placeNew(type, COLORS.NPC, 3, 3, "Heaven");
    const portal = game.placeNew("Portal", COLORS.NPC, 3, 3, "Normal");
    const traveler = game.placeNew("Rook", COLORS.WHITE, 3, 6, "Normal");
    startFixture(game);
    assert.equal(game.move({ x: 3, y: 6 }, { x: 3, y: 3 }, "Normal"), true);
    assert.equal(game.findByUid(traveler.uid), null);
    assert.strictEqual(game.getCell(3, 3, "Normal"), portal);
    assert.equal(Boolean(game.findByUid(npc.uid)), remains);
    assert.equal(game.whiteGP, 5 + reward);
    if (game.pendingDecision) {
      assert.equal(game.whiteToMove, true);
      game.decision(type === "Atheism" ? "metaphysical" : "gold");
    }
    assert.equal(game.whiteToMove, false);
    assert.equal(game.turnsSinceNewRule, 1);
    assertIntegrity(game);
  });
}

test("a queued Angel offer expires when another hit destroys that Angel in the same resolution", () => {
  const game = protectedFixture("expired-angel-offer");
  const angel = game.placeNew("Angel", COLORS.NPC, 2, 2, "Heaven");
  const first = game.placeNew("Rook", COLORS.WHITE, 0, 2, "Heaven");
  const second = game.placeNew("Rook", COLORS.BLACK, 0, 3, "Heaven");
  startFixture(game);
  game.resolve(() => {
    game.takeAt(2, 2, first, "Heaven");
    game.takeAt(2, 3, second, "Heaven");
  });
  assert.equal(game.findByUid(angel.uid), null);
  assert.equal(game.pendingDecision, null);
  assert.deepEqual(game.toSnapshot().decisionQueue, []);
  assertIntegrity(game);
});

test("freeing the Angel during a move runs its Java wind effect once without moving large groups", () => {
  const game = emptyFixture("angel-wind");
  const whiteKing = game.placeNew("King", COLORS.WHITE, 0, 0, "Normal");
  const blackKing = game.placeNew("King", COLORS.BLACK, 7, 7, "Normal");
  const large = game.placeNew("SuperKing", COLORS.BLACK, 0, 2, "Normal");
  const rook = game.placeNew("Rook", COLORS.WHITE, 5, 4, "Normal");
  const angel = game.placeNew("Angel", COLORS.NPC, 2, 2, "Heaven");
  game.placeNew("Rook", COLORS.WHITE, 0, 2, "Heaven");
  game.random.inclusive = () => 1;
  startFixture(game);
  game.move({ x: 0, y: 2 }, { x: 2, y: 2 }, "Heaven");
  assert.equal(game.decision("yes"), true);
  assert.equal(game.findByUid(angel.uid), null);
  assert.equal(game.getCell(3, 3, "Normal").type, "AggroAngel");
  assert.strictEqual(game.getCell(0, 2, "Normal"), large);
  assert.strictEqual(game.getCell(1, 0, "Normal"), whiteKing);
  assert.strictEqual(game.getCell(7, 7, "Normal"), blackKing);
  assert.strictEqual(game.getCell(6, 4, "Normal"), rook);
  assert.equal(game.gameOver, false);
  assert.equal(game.whiteToMove, false);
  assert.equal(game.turnsSinceNewRule, 1);
  assertIntegrity(game);
});

for (const type of ["Zombie", "WildHorse", "Wildlife"]) {
  test(`${type} replacements consume collectibles and transfer victims without awarding anyone GP`, () => {
    for (const victimType of ["Coin", "Treasure", "Rook"]) {
      const game = protectedFixture(`neutral-replacement-${type}-${victimType}`);
      const victim = game.placeNew(victimType, victimType === "Rook" ? COLORS.BLACK : COLORS.NPC, 3, 3, "Normal");
      game.whiteToMove = victimType !== "Treasure";
      startFixture(game);
      const wild = game.placeNew(type, COLORS.NPC, 3, 3, "Normal");
      assert.strictEqual(game.getCell(3, 3, "Normal"), wild);
      if (victimType === "Rook") assert.strictEqual(game.getCell(3, 3, "Hell"), victim);
      else assert.equal(game.findByUid(victim.uid), null);
      assert.deepEqual([game.whiteGP, game.blackGP], [5, 5]);
      assert.equal(game.pendingDecision, null);
      assertIntegrity(game);
    }
  });
}

test("autonomous captures and afterlife coin replacements award neither side GP on either turn", () => {
  for (const type of ["Zombie", "WildHorse", "Meteor"]) for (const whiteToMove of [true, false]) {
    const game = protectedFixture(`neutral-automove-${type}-${whiteToMove}`);
    const [x, y] = type === "Zombie" ? [2, 3] : type === "WildHorse" ? [1, 2] : [2, 2];
    const mover = game.placeNew(type, COLORS.NPC, x, y, "Normal", { movingRight: true });
    const victim = game.placeNew("Rook", COLORS.BLACK, 3, 3, "Normal");
    const coin = game.placeNew("Coin", COLORS.NPC, 3, 3, "Hell");
    game.registerAutomover(mover);
    game.random.inclusive = () => 1;
    game.whiteToMove = whiteToMove;
    startFixture(game);
    game.nextTurn();
    assert.equal(game.findByUid(coin.uid), null);
    assert.strictEqual(game.getCell(3, 3, "Hell"), victim);
    assert.deepEqual([game.whiteGP, game.blackGP], [5, 5]);
    assert.equal(game.whiteToMove, !whiteToMove);
    assert.equal(game.turnsSinceNewRule, 1);
    assertIntegrity(game);
  }
});

test("uncontrolled portal travelers grant no GP or Heaven choices through any entry point", () => {
  for (const entry of ["transport", "capture", "portal"]) for (const targetType of ["Coin", "Treasure", "Angel", "Atheism", "Devil", "Church"]) {
    const game = protectedFixture(`neutral-heaven-${entry}-${targetType}`);
    const target = game.placeNew(targetType, COLORS.NPC, 3, 3, "Heaven");
    const portal = game.placeNew("Portal", COLORS.NPC, 3, 3, "Normal", { portalTo: "Hell" });
    game.placeNew("Portal", COLORS.NPC, 3, 3, "Hell", { portalTo: "Heaven" });
    const traveler = game.placeNew("WildHorse", COLORS.NPC, 1, 2, "Normal");
    startFixture(game);
    if (entry === "transport") game.transportPiece(traveler, 3, 3, "Normal");
    else if (entry === "capture") game.takeAt(3, 3, traveler, "Normal");
    else game.portalKill(portal, traveler, "Normal");
    assert.equal(game.findByUid(traveler.uid), null);
    if (targetType === "Angel") assert.equal(target.health, 1);
    assert.deepEqual([game.whiteGP, game.blackGP], [5, 5]);
    assert.equal(game.pendingDecision, null);
    assert.deepEqual(game.toSnapshot().decisionQueue, []);
    assert.ok(game.board("Heaven") && game.board("Hell"));
    assertIntegrity(game);
  }
});

test("NPC-caused player death transfers inherit no recipient and later player actions recover ownership", () => {
  const game = protectedFixture("neutral-indirect-arrival");
  const victim = game.placeNew("Rook", COLORS.WHITE, 3, 3, "Normal");
  game.placeNew("Portal", COLORS.NPC, 3, 3, "Hell", { portalTo: "Heaven" });
  const atheism = game.placeNew("Atheism", COLORS.NPC, 3, 3, "Heaven");
  const horse = game.placeNew("WildHorse", COLORS.NPC, 1, 2, "Normal");
  game.random.inclusive = () => 1;
  startFixture(game);
  game.automove(horse);
  assert.strictEqual(game.getCell(3, 3, "Normal"), horse);
  assert.equal(game.findByUid(victim.uid), null);
  assert.strictEqual(game.getCell(3, 3, "Heaven"), atheism);
  assert.equal(game.pendingDecision, null);
  assert.deepEqual([game.whiteGP, game.blackGP], [5, 5]);

  game.placeNew("Pawn", COLORS.WHITE, 6, 6, "Normal");
  game.placeNew("Coin", COLORS.NPC, 5, 5, "Normal");
  assert.equal(game.move({ x: 6, y: 6 }, { x: 5, y: 5 }, "Normal"), true);
  assert.deepEqual([game.whiteGP, game.blackGP], [9, 5]);
  assertIntegrity(game);
});

test("an explosion triggered by a zombie awards no GP for collateral pieces or collectibles", () => {
  const game = protectedFixture("neutral-blast");
  const zombie = game.placeNew("Zombie", COLORS.NPC, 2, 3, "Normal", { movingRight: true });
  game.placeNew("SuicideBomber", COLORS.BLACK, 3, 3, "Normal");
  const rook = game.placeNew("Rook", COLORS.BLACK, 4, 4, "Normal");
  const coin = game.placeNew("Coin", COLORS.NPC, 3, 2, "Normal");
  const treasure = game.placeNew("Treasure", COLORS.NPC, 4, 2, "Normal");
  startFixture(game);
  game.automove(zombie);
  assert.equal(game.findByUid(zombie.uid), null);
  assert.equal(game.findByUid(coin.uid), null);
  assert.equal(game.findByUid(treasure.uid), null);
  assert.strictEqual(game.getCell(4, 4, "Hell"), rook);
  assert.deepEqual([game.whiteGP, game.blackGP], [5, 5]);
  assertIntegrity(game);
});

test("controlled wild pieces still receive their player's GP and Heaven decisions", () => {
  for (const type of ["Zombie", "WildHorse", "Wildlife"]) for (const color of [COLORS.WHITE, COLORS.BLACK]) {
    const game = protectedFixture(`owned-interaction-${type}-${color}`);
    game.placeNew(type, color, 2, 3, "Normal", { controlledBy: color });
    game.placeNew("Coin", COLORS.NPC, 3, 3, "Normal");
    game.placeNew("Portal", COLORS.NPC, 4, 3, "Normal");
    game.placeNew("Atheism", COLORS.NPC, 4, 3, "Heaven");
    game.whiteToMove = color === COLORS.WHITE;
    startFixture(game);
    assert.equal(game.move({ x: 2, y: 3 }, { x: 3, y: 3 }, "Normal"), true);
    assert.deepEqual([game.whiteGP, game.blackGP], color === COLORS.WHITE ? [9, 5] : [5, 9]);
    game.whiteToMove = color === COLORS.WHITE;
    assert.equal(game.move({ x: 3, y: 3 }, { x: 4, y: 3 }, "Normal"), true);
    assert.equal(game.pendingDecision.type, "atheism");
    assert.equal(game.pendingDecision.color, color);
    assert.equal(game.decision("metaphysical"), true);
    assertIntegrity(game);
  }
});

test("wildlife rule spawns do not pay either player for replacements or nested afterlife coins", () => {
  const game = protectedFixture("neutral-rule-spawn");
  const coin = game.placeNew("Coin", COLORS.NPC, 0, 3, "Normal");
  const rook = game.placeNew("Rook", COLORS.BLACK, 7, 4, "Normal");
  const afterlifeCoin = game.placeNew("Coin", COLORS.NPC, 7, 4, "Hell");
  startFixture(game);
  assert.equal(game.addRule("WILD_LIFE"), true);
  assert.equal(game.getCell(0, 3, "Normal").type, "Wildlife");
  assert.equal(game.getCell(7, 4, "Normal").type, "Wildlife");
  assert.strictEqual(game.getCell(7, 4, "Hell"), rook);
  assert.equal(game.findByUid(coin.uid), null);
  assert.equal(game.findByUid(afterlifeCoin.uid), null);
  assert.deepEqual([game.whiteGP, game.blackGP], [5, 5]);
  assert.equal(game.addRule("MORE_GOLD"), true);
  assert.deepEqual([game.whiteGP, game.blackGP], [15, 15]);
  assertIntegrity(game);
});
