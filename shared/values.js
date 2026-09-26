// Shared piece economics: single source of truth for bot.js and invasion.js.
// (Split out to avoid a bot<->invasion import cycle.)
export function pieceTypeOf(id) {
  return id.split("-").map(w => w[0].toUpperCase() + w.slice(1)).join("");
}

// Centipawn-ish values. Kings dominate because victory = capture ALL enemy
// King/SuperKing on ALL surviving boards. GP weight ~= 50 (pawn costs 2GP=100).
export const PIECE_VALUES = {
  Pawn: 100, Knight: 320, Bishop: 340, Rook: 500, Queen: 950,
  King: 6000, SuperKing: 7500,
  Centaur: 360, Unicorn: 380, TrojanHorse: 260,
  RookKnight: 620, BishopKnight: 620, Necromancer: 720,
  SuperBishop: 520, BallQueen: 1150, KnightQueen: 1350,
  AngryRook: 680, RookTower: 350, SuicideBomber: 240, Jester: 320,
  Zebra: 460, Giraffe: 360,
  // Controlled wild pieces fight as King-step pieces + deny automovers.
  Zombie: 120, WildHorse: 150, Wildlife: 110,
  Meteor: 60,
  Coin: 170, Treasure: 550,
  Portal: 90, Landmine: 120, Bomb: 300, Pittrap: 40, Whirlpool: 0, Void: 0,
  Church: 0, Angel: 500, Atheism: 200, Devil: 300, AggroAngel: 450, AggroDevil: 900,
  Placeholder: 0,
};

export const GP_VALUE = 50;
export const KING_COUNT_BONUS = 6000; // per net king, on top of piece values
