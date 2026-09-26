// Compact, versioned position encoding for GPU training data.
// Browser + Node shareable (no DOM). Python expands SQUARE_CODES to tensors.
//
// v1 layout per position:
//   boards: { Normal: 64 codes, Heaven: 64 codes|null, Hell: 64 codes|null }
//     code per square: "." empty | color(0=w,1=b,2=n) + typeId. e.g. "0:5".
//     typeIds are stable (see TYPE_IDS). Large-piece components repeat the
//     leader's code on every footprint cell (reconstructable grouping not needed
//     for value/policy training v1).
//   globals: [whiteToMove, whiteGP/20, blackGP/20, rulesActive/25,
//             turnsSinceRule/8, kingsW, kingsB, automovers/8, pendingDecision?1:0, rulePicker?1:0]
//   action: engine action taken from this position (for future BC policy).
//   result_w: +1 white win | -1 black win | 0 draw/timeout (filled at game end).
export const FEATURES_V = 1;

export const TYPE_IDS = {
  Pawn: 1, Knight: 2, Bishop: 3, Rook: 4, Queen: 5, King: 6,
  Centaur: 7, Unicorn: 8, TrojanHorse: 9, RookKnight: 10, BishopKnight: 11,
  Necromancer: 12, SuperBishop: 13, SuperKing: 14, BallQueen: 15, KnightQueen: 16,
  AngryRook: 17, RookTower: 18, SuicideBomber: 19, Jester: 20,
  Zebra: 21, Giraffe: 22,
  Coin: 30, Treasure: 31, Portal: 32, Landmine: 33, Bomb: 34, Pittrap: 35,
  Whirlpool: 36, Void: 37, Church: 38, Angel: 39, Atheism: 40, Devil: 41,
  AggroAngel: 42, AggroDevil: 43, Wildlife: 44, WildHorse: 45, Zombie: 46,
  Meteor: 47, Placeholder: 48,
};

const COLOR_ID = { White: 0, Black: 1, NPC: 2 };

export function encodeBoards(game) {
  const out = {};
  for (const name of ["Normal", "Heaven", "Hell"]) {
    const board = game.board(name);
    if (!board) { out[name] = null; continue; }
    const codes = new Array(64);
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
      const p = board[y][x];
      if (!p) codes[y * 8 + x] = ".";
      else codes[y * 8 + x] = `${COLOR_ID[p.color] ?? 2}:${TYPE_IDS[p.type] ?? 0}`;
    }
    out[name] = codes;
  }
  return out;
}

export function encodeGlobals(game) {
  let kingsW = 0, kingsB = 0;
  const seen = new Set();
  for (const name of game.activeBoardNames()) {
    for (const row of game.board(name)) for (const p of row) {
      if (!p || (p.type !== "King" && p.type !== "SuperKing")) continue;
      const root = game.leader(p);
      const id = root.group || root.uid;
      if (seen.has(id)) continue;
      seen.add(id);
      if (root.color === "White") kingsW++;
      else if (root.color === "Black") kingsB++;
    }
  }
  return [
    game.whiteToMove ? 1 : 0,
    game.whiteGP / 20, game.blackGP / 20,
    game.rules.length / 25, (game.turnsSinceNewRule || 0) / 8,
    kingsW / 4, kingsB / 4,
    (game.automovingPieces?.length || 0) / 8,
    game.pendingDecision ? 1 : 0, game.rulePicker ? 1 : 0,
  ];
}

export function encodePosition(game, action = null) {
  return {
    v: FEATURES_V,
    turn: game.whiteToMove ? "White" : "Black",
    boards: encodeBoards(game),
    globals: encodeGlobals(game),
    rules: [...game.rules],
    action,
  };
}
