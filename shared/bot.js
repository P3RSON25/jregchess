// Jreg Chess bot engine — shared between browser (/shared/bot.js) and Node.
// Covers: no check/checkmate (king-hunt), 3 dimensions, free upgrades,
// GP economy, Heaven NPC dimension destruction, shop buys, portals,
// zombies/wild automovers, rule picks, explosions, large pieces.
//
// Design: flat legal-action enumerator + handcrafted eval + depth-limited
// alpha-beta with upgrade closure. Deterministic given GameState RNG state
// (automover sampling uses the cloned RNG, same as real game).
import { GameState, SHOP_ITEMS, UPGRADES, RULE_PICKER, COLORS } from "./game.js";
import { nnBonus } from "./valueNet.js";
import { policyLogits, policyBonusFor, policyNetLoaded, policyAppliesTo } from "./policyNet.js";
import {
  armedTargets, findAtheisms, portalBuyValue, forcedAtheismChoice,
  invasionDistances, invasionProjectStep,
  ATHEISM_CAPTURE_BONUS, PROGRESS_PULL_CAP,
} from "./invasion.js";

export const BOT_DIFFICULTIES = ["easy", "normal", "hard"];

const SHOP_COST = new Map(SHOP_ITEMS);
const UPGRADE_FROM = new Map(UPGRADES); // toId -> [fromTypes]
function pieceTypeOf(id) {
  return id.split("-").map(w => w[0].toUpperCase() + w.slice(1)).join("");
}

// Centipawn-ish values. Kings dominate because victory = capture ALL enemy
// King/SuperKing on ALL surviving boards. GP weight ~= 50 (pawn costs 2GP=100).
const PIECE_VALUES = {
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

const GP_VALUE = 50;
const KING_COUNT_BONUS = 6000; // per net king, on top of piece values

function opp(color) {
  return color === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;
}

function allPieces(game, boardName) {
  const board = game.board(boardName);
  if (!board) return [];
  const out = [];
  const seen = new Set();
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
    const p = board[y][x];
    if (!p) continue;
    const root = game.leader(p);
    if (!root || seen.has(root.uid)) continue;
    seen.add(root.uid);
    out.push(root);
  }
  return out;
}

function myPiecesEverywhere(game, color) {
  const out = [];
  for (const b of game.activeBoardNames()) {
    for (const p of allPieces(game, b)) {
      if (p.color === color) out.push(p);
    }
  }
  return out;
}

function countKings(game, color) {
  let n = 0;
  const seen = new Set();
  for (const b of game.activeBoardNames()) {
    const board = game.board(b);
    for (const row of board) for (const p of row) {
      if (!p || (p.type !== "King" && p.type !== "SuperKing")) continue;
      const root = game.leader(p);
      const id = root.group || root.uid;
      if (seen.has(id)) continue;
      seen.add(id);
      if (root.color === color) n++;
    }
  }
  return n;
}

function kingsPerBoard(game, color) {
  const out = {};
  for (const b of game.activeBoardNames()) {
    let n = 0;
    const seen = new Set();
    const board = game.board(b);
    for (const row of board) for (const p of row) {
      if (!p || (p.type !== "King" && p.type !== "SuperKing")) continue;
      const root = game.leader(p);
      const id = root.group || root.uid;
      if (seen.has(id)) continue;
      seen.add(id);
      if (root.color === color) n++;
    }
    out[b] = n;
  }
  return out;
}

// ---- Evaluation -----------------------------------------------------------

export function evaluate(game, perspective) {
  if (game.gameOver) {
    if (game.draw) return 0;
    return game.winner === perspective ? 1000000 : -1000000;
  }
  const me = perspective;
  const enemy = opp(me);
  let score = 0;

  // King count is terminal-adjacent. Weight far above material.
  const myKings = countKings(game, me);
  const opKings = countKings(game, enemy);
  score += (myKings - opKings) * KING_COUNT_BONUS;
  // If enemy down to last king, hunt bonus; if we are, fear bonus.
  if (opKings === 1) score += 800;
  if (myKings === 1) score -= 800;
  if (opKings === 0) return 1000000;
  if (myKings === 0) return -1000000;

  // Material + GP across all boards.
  for (const b of game.activeBoardNames()) {
    const board = game.board(b);
    const dimWeight = b === "Normal" ? 1 : 0.85; // afterlife kings still count fully above; material slightly less
    for (const row of board) for (const p of row) {
      if (!p) continue;
      // Count large groups once (leader only).
      if (p.group && p.part !== 0) continue;
      const v = (PIECE_VALUES[p.type] ?? 100) * dimWeight;
      if (p.color === me) score += v;
      else if (p.color === enemy) score -= v;
      else {
        // NPC collectibles: whoever grabs them gains. Small tempo for proximity ignored; just slight availability.
        if (p.type === "Coin") score += 0;
        else if (p.type === "Treasure") score += 0;
        // Traps threaten both sides; automovers threaten both sides.
      }
      // Two-life bonus: SuperKing/Angel at full health slightly better.
      if ((p.type === "SuperKing" || p.type === "Angel") && (p.health ?? 2) > 1) {
        score += (p.color === me ? 120 : p.color === enemy ? -120 : 0);
      }
      if (p.type === "AggroDevil" && p.health) {
        const hpBonus = (p.health - 1) * 60;
        score += (p.color === me ? hpBonus : p.color === enemy ? -hpBonus : hpBonus * 0.2);
      }
    }
  }

  // GP = material in bank.
  const myGP = me === COLORS.WHITE ? game.whiteGP : game.blackGP;
  const opGP = enemy === COLORS.WHITE ? game.whiteGP : game.blackGP;
  score += (myGP - opGP) * GP_VALUE;

  // Mobility across dimensions (cheap proxy for activity + portal access).
  // Counted on clones only in search at depth 0 to save time; here full count
  // but capped: iterate own + enemy pieces and sample legalMoves length.
  // To keep eval fast (<0.2ms), use piece-count + pawn advancement instead of
  // full movegen when called deep in search (caller passes fast=true).
  if (!evaluate._fast) {
    score += mobilityBonus(game, me) - mobilityBonus(game, enemy);
  }

  // King exposure: no check, so kings should stay screened. Penalize enemy
  // piece proximity to our kings, reward proximity to enemy kings (hunt).
  score += kingHuntBonus(game, me) - kingHuntBonus(game, enemy);
  // Hard exposure: enemy pieces that can CAPTURE our king now (no-check
  // emergencies), minus the same for theirs. Symmetric by construction.
  if (EXPOSURE_ON) score += kingExposure(game, enemy) - kingExposure(game, me);

  // Automover danger: pieces standing where hostile zombies/wildlife/meteors
  // will drift next turn are discounted. Small static penalty.
  score -= automoverThreat(game, me) * 12;
  score += automoverThreat(game, enemy) * 12;

  // Dimension destruction risk: a side whose ONLY kings live on Heaven/Hell
  // can be wiped by one atheism decision. Symmetric: our bunker hurts us,
  // theirs helps us. (Was one-sided -250 for `me` only — a real antisymmetry
  // bug: same-position eW+eB came out -500 instead of 0.)
  for (const [side, sign] of [[me, -1], [enemy, 1]]) {
    const counts = kingsPerBoard(game, side);
    // Destroyed boards are absent keys, not zeros.
    const n = dim => counts[dim] || 0;
    const total = n("Normal") + n("Heaven") + n("Hell");
    if (total > 0) {
      for (const b of ["Heaven", "Hell"]) {
        if (n(b) === total) score += sign * 250;
      }
    }
  }
  // Learned value head (zero-effect until ml/value_v1.json is loaded).
  try { score += nnBonus(game, me); } catch { /* NN optional */ }
  return score;
}
evaluate._fast = false;

function mobilityBonus(game, color) {
  let bonus = 0;
  for (const b of game.activeBoardNames()) {
    for (const p of allPieces(game, b)) {
      if (p.color !== color) continue;
      // Cheap mobility proxy by type instead of full legalMoves (fast).
      const base = { Pawn: 2, Knight: 6, Bishop: 8, Rook: 8, Queen: 14, King: 4, SuperKing: 5, Necromancer: 8, Unicorn: 7, Centaur: 4, BallQueen: 16, KnightQueen: 18, AngryRook: 9, RookKnight: 12, BishopKnight: 12, Zebra: 6, Giraffe: 5, TrojanHorse: 1, Jester: 8, SuicideBomber: 2, SuperBishop: 9, RookTower: 0 }[p.type] ?? 3;
      bonus += base * 3;
      // Advanced pawns are closer to promotion (PAWN_TYPES -> Queen).
      if ((p.type === "Pawn" || p.type === "Centaur" || p.type === "SuicideBomber")) {
        const adv = p.color === COLORS.WHITE ? (6 - p.y) : (p.y - 1);
        bonus += Math.max(0, adv) * 8;
      }
    }
  }
  return bonus;
}

function kingPositions(game, color) {
  const out = [];
  const seen = new Set();
  for (const b of game.activeBoardNames()) {
    const board = game.board(b);
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
      const p = board[y][x];
      if (!p || (p.type !== "King" && p.type !== "SuperKing")) continue;
      const root = game.leader(p);
      const id = root.group || root.uid;
      if (seen.has(id)) continue;
      seen.add(id);
      if (root.color === color) out.push({ x: root.x, y: root.y, board: root.board, type: root.type });
    }
  }
  return out;
}

let EXPOSURE_ON = true;
export function setExposureEnabled(v) { EXPOSURE_ON = Boolean(v); }
export function exposureEnabled() { return EXPOSURE_ON; }

// Exposure: enemy pieces that can CAPTURE our king right now. There is no
// check in Jreg — kings walk into attack constantly — so the eval must price
// it explicitly. Symmetric helper: +exposure(us) - exposure(them).
// Cost model: a forced king flight costs a tempo plus residual risk; full-HP
// two-life kings (SuperKing) absorb the first hit, so they discount 60%.
// Alignment prefilter keeps this cheap: validMove (pathClear) runs only for
// plausibly-aligned attackers.
function kingExposure(game, color) {
  const enemy = opp(color);
  const mine = kingPositions(game, color);
  if (!mine.length) return 0;
  const foes = myPiecesEverywhere(game, enemy);
  let penalty = 0;
  for (const k of mine) {
    const twoLife = k.type === "SuperKing";
    for (const f of foes) {
      if (f.board !== k.board) continue;
      if (["Coin", "Treasure", "Portal", "Landmine", "Pittrap", "Whirlpool", "Void", "Church", "Atheism", "Angel", "Devil", "AggroAngel", "AggroDevil", "RookTower"].includes(f.type)) continue;
      // Uncontrolled automovers drift by their own rules (validMove lies for
      // them, returning true for any leap); their lane threat is already
      // priced in automoverThreat. Controlled ones move king-step: real.
      if (!f.controlledBy && ["Zombie", "WildHorse", "Wildlife", "Meteor"].includes(f.type)) continue;
      const dx = Math.abs(f.x - k.x);
      const dy = Math.abs(f.y - k.y);
      if (dx === 0 && dy === 0) continue;
      // Cheap alignment reject by mover geometry (pawns capture forward-diag).
      const t = f.type;
      const fwd = f.color === "Black" ? 1 : -1;
      let plausible = false;
      if (t === "Knight" || t === "Zebra") plausible = (dx === 2 && dy === 1) || (dx === 1 && dy === 2);
      else if (t === "Giraffe") plausible = (dx === 3 && dy === 1) || (dx === 1 && dy === 3);
      else if (t === "Unicorn") plausible = ((dx === 2 && dy === 1) || (dx === 1 && dy === 2) || (dx === 2 && dy === 0) || (dx === 0 && dy === 2));
      else if (t === "Rook" || t === "AngryRook") plausible = (dx === 0 || dy === 0);
      else plausible = true; // sliders, kings, pawns, wild: verify via validMove
      if (!plausible) continue;
      let takes = false;
      try { takes = game.validMove({ x: f.x, y: f.y }, { x: k.x, y: k.y }, k.board); } catch { takes = false; }
      if (!takes) continue;
      // Cheap attackers are the nightmare (lose a king to a pawn); pricey
      // attackers at least cost the enemy material... which Hell recycles.
      // Flat emergency price dominates either way.
      penalty += twoLife ? 160 : 400;
    }
  }
  return penalty;
}

// Reward our attackers near enemy kings, penalize enemy attackers near ours.
// Symmetric helper: call as +hunt(us vs them) - hunt(them vs us) where hunt
// measures "color's pieces close to opp kings".
function kingHuntBonus(game, color) {
  const enemy = opp(color);
  const targets = kingPositions(game, enemy);
  if (!targets.length) return 0;
  let bonus = 0;
  const attackers = myPiecesEverywhere(game, color).filter(p => !["Coin", "Treasure", "Portal", "Landmine", "Pittrap", "Whirlpool", "Void", "Church", "Atheism"].includes(p.type));
  for (const t of targets) {
    for (const a of attackers) {
      if (a.board !== t.board) continue; // cross-board hunts need portals; handled via portal bonus below
      const d = Math.max(Math.abs(a.x - t.x), Math.abs(a.y - t.y));
      if (d <= 2) bonus += (3 - d) * 40;
      else if (d <= 4) bonus += 15;
    }
    // Screen bonus: own kings with friendly neighbors are safer.
    if (targets === kingPositions(game, color)) {
      // unreachable; kept simple — screening handled by threat side instead.
    }
  }
  // Portal access bonus: if enemy king sits on another board, reward owning a
  // portal path on Normal (cheap static check).
  const myBoards = new Set(attackers.map(a => a.board));
  for (const t of targets) {
    if (!myBoards.has(t.board)) {
      // Need a portal to get there. Reward each own portal slightly.
      let portals = 0;
      for (const b of game.activeBoardNames()) {
        for (const p of allPieces(game, b)) if (p.type === "Portal") portals++;
      }
      bonus -= 60; // penalty for no presence on that dimension
      bonus += Math.min(portals, 3) * 25;
    }
  }
  return bonus;
}

function automoverThreat(game, color) {
  // Count own valuable pieces standing in hostile automover lanes on Normal.
  const normal = game.board("Normal");
  if (!normal) return 0;
  let threat = 0;
  const movers = [];
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
    const p = normal[y][x];
    if (!p || p.controlledBy) continue;
    if (p.color !== "NPC") continue;
    if (["Zombie", "Wildlife", "Meteor", "WildHorse"].includes(p.type)) movers.push(p);
  }
  if (!movers.length) return 0;
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
    const p = normal[y] && normal[y][x];
    if (!p || p.color !== color) continue;
    const v = PIECE_VALUES[p.type] ?? 100;
    if (v < 200) continue;
    for (const m of movers) {
      if (m.board !== "Normal") continue;
      const dx = Math.abs(m.x - x), dy = Math.abs(m.y - y);
      if ((m.type === "Zombie" || m.type === "Wildlife") && dy === 0 && dx === 1) threat += v / 200;
      else if (m.type === "Meteor" && dx <= 1 && dy <= 1) threat += v / 300;
      else if (m.type === "WildHorse" && ((dx === 2 && dy === 1) || (dx === 1 && dy === 2))) threat += v / 400;
    }
  }
  return threat;
}

// ---- Action enumeration ---------------------------------------------------

export function enumerateUpgrades(game) {
  const color = game.currentColor();
  const out = [];
  for (const b of game.activeBoardNames()) {
    const board = game.board(b);
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
      const p = board[y][x];
      if (!p || p.color !== color) continue;
      if (p.group && p.part !== 0) continue;
      for (const [toId, from] of UPGRADES) {
        if (!from.includes(p.type)) continue;
        if (game.canUpgrade(toId, p.x, p.y, b)) {
          out.push({ action: "upgrade", id: toId, x: p.x, y: p.y, board: b });
        }
      }
    }
  }
  return out;
}

export function enumerateMoves(game, maxMoves = 400) {
  const color = game.currentColor();
  const out = [];
  for (const b of game.activeBoardNames()) {
    const pieces = allPieces(game, b).filter(p => p.color === color);
    for (const root of pieces) {
      const from = { x: root.x, y: root.y };
      let dests = [];
      try { dests = game.legalMoves(from, b); } catch { continue; }
      for (const to of dests) {
        out.push({ action: "move", from: { ...from }, to: { ...to }, board: b });
        if (out.length >= maxMoves) return out;
      }
    }
  }
  return out;
}

// Shop buys pruned to sensible candidates. Full cross product (17 items x
// ~40 squares) is 500+ actions; we cap to limit*items strategic spots.
export function enumerateBuys(game, limit = 36, opts = {}) {
  const out = [];
  if (!game.board("Normal")) return out;
  const funds = game.funds();
  const affordable = SHOP_ITEMS.filter(([, cost]) => cost <= funds);
  if (!affordable.length) return out;
  const normal = game.board("Normal");
  const empties = [];
  const centerScore = (x, y) => -(Math.abs(x - 3.5) + Math.abs(y - 3.5));
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
    if (!normal[y][x]) empties.push({ x, y, s: centerScore(x, y) });
  }
  empties.sort((a, b) => b.s - a.s);
  // Prefer squares near enemy kings on Normal + center + back-rank safety.
  const enemy = opp(game.currentColor());
  const targets = kingPositions(game, enemy).filter(k => k.board === "Normal");
  const ranked = empties.map(e => {
    let s = e.s;
    for (const t of targets) s -= Math.max(Math.abs(e.x - t.x), Math.abs(e.y - t.y)) * 0.4;
    return { ...e, s };
  }).sort((a, b) => b.s - a.s);
  const spots = ranked.slice(0, 10);

  // Strategic item filter: never buy obviously bad items when broke.
  // forceItems (e.g. portal during an armed invasion) bypass the top-6 cut.
  const priority = ["king", "queen", "knight-queen", "rook", "knight", "bishop", "pawn", "unicorn", "angry-rook", "rook-knight", "bishop-knight", "portal", "zebra", "giraffe", "jester", "landmine", "bomb"];
  const items = affordable.sort((a, b) => priority.indexOf(a[0]) - priority.indexOf(b[0])).slice(0, 6);
  if (opts.forceItems) {
    for (const id of opts.forceItems) {
      if (!items.some(([itemId]) => itemId === id) && affordable.some(([itemId]) => itemId === id)) {
        items.push(affordable.find(([itemId]) => itemId === id));
      }
    }
  }
  for (const [id] of items) {
    const type = pieceTypeOf(id);
    for (const s of spots) {
      if (out.length >= limit) return out;
      try {
        if (game.canBuy(id, s.x, s.y, "Normal")) out.push({ action: "buy", id, x: s.x, y: s.y, board: "Normal", _buyType: type });
      } catch { /* ignore */ }
    }
  }
  return out;
}

export function enumerateMainActions(game) {
  // Turn-consuming actions: moves + buys. Upgrades handled separately
  // because they are free (no turn flip).
  return [...enumerateMoves(game), ...enumerateBuys(game)];
}

// ---- Decisions & rules ----------------------------------------------------

export function chooseDecision(game) {
  const d = game.pendingDecision;
  if (!d) return null;
  const color = d.color;
  if (d.type === "angel") {
    // AggroAngel wind shoves every non-large piece randomly — good when
    // behind/chaotic or when we hold large-immune pieces; else keep 2nd life.
    // "yes" needs an empty 2x2 on Normal; without room the engine rejects it,
    // so check first (non-RNG scan — findEmpty would consume game RNG).
    if (!hasRoomFor(game, "AggroAngel")) return "no";
    const diff = evaluate(game, color);
    // Behind => gamble on wind. Ahead => keep Angel body.
    return diff < -200 ? "yes" : "no";
  }
  if (d.type === "atheism") {
    // Verified forced win first: if destroying X ends the game now, all other
    // considerations (material, bunkers) are moot — victory is immediate.
    const forced = forcedAtheismChoice(game);
    if (forced) return forced;
    const mine = kingsPerBoard(game, color);
    const theirs = kingsPerBoard(game, opp(color));
    const myTotal = Object.values(mine).reduce((a, b) => a + b, 0);
    const opTotal = Object.values(theirs).reduce((a, b) => a + b, 0);
    // Destroy a dimension where enemy has kings and we have none => instant win pressure.
    const candidates = ["Heaven", "Hell"];
    let best = null, bestScore = -Infinity;
    for (const dim of candidates) {
      if (!game.board(dim)) continue;
      const score = (theirs[dim] || 0) * 1000 - (mine[dim] || 0) * 1200;
      if (score > bestScore) { bestScore = score; best = dim; }
    }
    if (best && bestScore >= 1000 && (mine[best] || 0) === 0) {
      return best === "Heaven" ? "heaven" : "hell";
    }
    // Don't suicide: never destroy our only king bunker.
    for (const dim of candidates) {
      if ((mine[dim] || 0) === myTotal && myTotal > 0) {
        // Our kings only here — avoid destroying it.
        if (best === dim) best = null;
      }
    }
    if (best && (mine[best] || 0) < (theirs[best] || 0)) return best === "Heaven" ? "heaven" : "hell";
    // Default: purge metaphysicals on Normal (safe, removes blockers).
    // But if we own an Angel on Normal we might keep it... still safe default.
    void opTotal;
    return "metaphysical";
  }
  // devil: gold is safe net +5 (+10 us, +5 them). release = 6HP turret if space.
  const spotFree = game.board("Normal") && (game.footprintClear("AggroDevil", 3, 3, "Normal") || (() => {
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) if (game.footprintClear("AggroDevil", x, y, "Normal")) return true;
    return false;
  })());
  if (spotFree && evaluate(game, color) > 400) return "release";
  return "gold"; // never pick no-op remove/smite
}

const RULE_RANK = {
  MORE_GOLD: 95, GOLD_RUSH: 90, TREASURE: 88,
  PORTALS_OPEN: 70, UNICORNS: 55, PAWN_UPGRADE: 55, BISHOPS_GAIN_NECROMANCY: 60,
  PAWNS_MOVE_FOUR: 50, EVERYONE_UPGRADES: 45,
  LANDMINES: 40, PITTRAPS: 38, VOID: 30, WHIRLPOOL: 28,
  METEOR_SHOWER: 20, ZOMBIE_APOCALYPSE: 18, WILD_HORSE: 16, WILD_LIFE: 15,
  NEXT_PIECE_EXPLODES: 35,
};

export function chooseRule(game) {
  const avail = game.availableRules?.length ? game.availableRules : RULE_PICKER;
  const color = game.rulePickerColor || game.currentColor();
  const myPieces = myPiecesEverywhere(game, color);
  const hasKnight = myPieces.some(p => p.type === "Knight");
  const hasBishop = myPieces.some(p => ["Bishop", "BishopKnight", "SuperBishop", "Jester"].includes(p.type));
  const hasPawn = myPieces.some(p => ["Pawn", "SuicideBomber", "Centaur"].includes(p.type));
  // Do we need portals? Enemy kings off-Normal with no presence there.
  const theirs = kingsPerBoard(game, opp(color));
  const mine = kingsPerBoard(game, color);
  let needPortal = false;
  for (const dim of ["Heaven", "Hell"]) {
    if ((theirs[dim] || 0) > 0 && (mine[dim] || 0) === 0) needPortal = true;
  }
  let best = avail[0], bestScore = -Infinity;
  for (const r of avail) {
    let s = RULE_RANK[r] ?? 25;
    if (r === "UNICORNS" && !hasKnight) s -= 30;
    if (r === "BISHOPS_GAIN_NECROMANCY" && !hasBishop) s -= 25;
    if (r === "PAWN_UPGRADE" && !hasPawn) s -= 25;
    if (r === "PORTALS_OPEN" && needPortal) s += 30;
    if ((r === "ZOMBIE_APOCALYPSE" || r === "WILD_HORSE" || r === "WILD_LIFE" || r === "METEOR_SHOWER") && evaluate(game, color) > 300) s -= 20; // avoid chaos when ahead
    if ((r === "LANDMINES" || r === "PITTRAPS" || r === "VOID") && evaluate(game, color) > 500) s -= 15;
    if (r === "NEXT_PIECE_EXPLODES" && countKings(game, color) === 1) s -= 25; // risky with last king
    // Small deterministic jitter by rule name to avoid ties (seeded by game state).
    s += (r.charCodeAt(0) % 5) * 0.1;
    if (s > bestScore) { bestScore = s; best = r; }
  }
  return best;
}

// ---- Upgrade closure ------------------------------------------------------
// Free actions: apply all +EV upgrades on a clone, return resulting snapshot
// actions list. Greedy by static value gain.
const UPGRADE_VALUE_HINT = {
  "suicide-bomber": 140, centaur: 260, unicorn: 60, "trojan-horse": -40,
  "rook-knight": 140, "bishop-knight": 280, necromancer: 380, "super-bishop": 180,
  "super-king": 1600, "ball-queen": 220, "knight-queen": 420, "angry-rook": 190, "rook-tower": -120,
};

export function planUpgrades(game, maxUpgrades = 6, opts = {}) {
  // Returns list of upgrade actions that are +EV on successive clones.
  // Does not mutate the input game. reserveGP keeps funds for a verified
  // invasion portal buy: a forced dimension win outranks any local upgrade,
  // so upgrades that would spend below the reserve are skipped when armed.
  const reserveGP = opts.reserveGP || 0;
  const planned = [];
  let sim = GameState.fromSnapshot(game.toSnapshot());
  for (let i = 0; i < maxUpgrades; i++) {
    const cands = enumerateUpgrades(sim);
    if (!cands.length) break;
    if (reserveGP > 0) {
      const funds = sim.whiteToMove ? sim.whiteGP : sim.blackGP;
      if (funds - 5 < reserveGP) break;
    }
    let best = null, bestGain = 60; // must beat 5GP cost (5*50=250)? No: value hints already net. Threshold avoids junk.
    for (const u of cands) {
      const piece = sim.getCell(u.x, u.y, u.board);
      if (!piece) continue;
      const fromV = PIECE_VALUES[piece.type] ?? 100;
      const toV = PIECE_VALUES[pieceTypeOf(u.id)] ?? 100;
      const hint = UPGRADE_VALUE_HINT[u.id] ?? (toV - fromV - 150);
      const gain = (toV - fromV) + (hint * 0.2);
      // Require footprint + king-safety: upgrading lone king to SuperKing needs 2x2 room (canUpgrade already checks).
      if (gain > bestGain) { bestGain = gain; best = u; }
    }
    if (!best) break;
    const ok = sim.upgrade(best.id, best.x, best.y, best.board);
    if (!ok) break;
    planned.push(best);
    if (sim.gameOver || sim.pendingDecision || sim.rulePicker) break;
  }
  return planned;
}

// ---- Search ---------------------------------------------------------------

function cloneApply(snapshot, action) {
  const sim = GameState.fromSnapshot(snapshot);
  let ok = false;
  if (action.action === "move") ok = sim.move(action.from, action.to, action.board);
  else if (action.action === "buy") ok = sim.buy(action.id, action.x, action.y, action.board);
  else if (action.action === "upgrade") ok = sim.upgrade(action.id, action.x, action.y, action.board);
  else if (action.action === "decision") ok = sim.decision(action.choice);
  else if (action.action === "rule") ok = sim.addRule(action.rule);
  return { sim, ok };
}

function staticScoreForOrdering(game, action, perspective, invCtx = null) {
  // MVV-LVA-ish + buy/upgrade priors for move ordering.
  let s = 0;
  // Verified game-winning lines outrank even direct king takes: a king
  // capture only sometimes ends the game, an armed atheism capture always
  // does (verified by armedTargets). invCtx is built (rarely — only when an
  // atheism win is armed) by the hard root; deeper nodes use plain scores.
  // Never touches evaluate().
  if (invCtx?.armed?.length && action.action === "move") {
    const key = `${action.board}:${action.to.x},${action.to.y}`;
    if (invCtx.atheismCells.has(key)) return 20000 + ATHEISM_CAPTURE_BONUS;
    const from = action.from;
    const d0 = invCtx.dist.get(`${action.board}:${from.x},${from.y}`);
    const d1 = invCtx.dist.get(key);
    if (d0 !== undefined && d1 !== undefined && d1 < d0) {
      s += Math.min(PROGRESS_PULL_CAP, (d0 - d1) * 150);
    }
  }
  if (invCtx?.armed?.length && action.action === "buy" && action.id === "portal") {
    s += portalBuyValue(game, action.x, action.y, perspective);
  }
  if (action.action === "move") {
    const target = game.getCell(action.to.x, action.to.y, action.board);
    if (target) {
      const victim = game.leader(target);
      s += (PIECE_VALUES[victim.type] ?? 100) * 2;
      const mover = game.getCell(action.from.x, action.from.y, action.board);
      if (mover) s -= (PIECE_VALUES[game.leader(mover).type] ?? 100) * 0.1;
      if (victim.type === "King" || victim.type === "SuperKing") s += 20000;
      if (victim.type === "Coin") s += 300;
      if (victim.type === "Treasure") s += 800;
      if (victim.type === "Portal") s += 60; // travel, not capture
    } else {
      // Quiet: pawn pushes + center.
      const mover = game.getCell(action.from.x, action.from.y, action.board);
      if (mover && game.leader(mover).type === "Pawn") s += 20;
    }
  } else if (action.action === "buy") {
    const cost = SHOP_COST.get(action.id) ?? 5;
    const v = PIECE_VALUES[pieceTypeOf(action.id)] ?? 100;
    s += (v - cost * GP_VALUE) * 0.5;
    if (action.id === "king" && countKings(game, perspective) <= 1) s += 5000;
    if (action.id === "portal") s += 150;
  }
  return s;
}

// Per-root transposition table: snapshotKey -> { depth, value, flag }.
// Key is cheap (turn + GP + king counts + piece census), not full RNG state.
const TT = new Map();
let TT_HITS = 0;
export function ttStats() { return { size: TT.size, hits: TT_HITS }; }
export function clearTT() { TT.clear(); TT_HITS = 0; }
function snapshotKey(game) {
  let h = game.whiteToMove ? "W" : "B";
  h += `|${game.whiteGP},${game.blackGP}|${game.rules.length}|`;
  for (const b of game.activeBoardNames()) {
    const board = game.board(b);
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
      const p = board[y][x];
      if (!p) continue;
      if (p.group && p.part !== 0) continue; // leader only
      h += `${b[0]}${p.type[0]}${p.type.length}${p.color[0]}${p.x},${p.y};`;
    }
  }
  return h;
}
function isKingCapture(game, action) {
  if (action.action !== "move") return false;
  try {
    const t = game.getCell(action.to.x, action.to.y, action.board);
    if (!t) return false;
    const v = game.leader(t);
    return v.type === "King" || v.type === "SuperKing";
  } catch { return false; }
}

// Time-capped search: iterative deepening aborts cleanly and keeps best-so-far,
// so chaotic midgames can never freeze the browser tab.
let SEARCH_DEADLINE = 0;
let SEARCH_NODES = 0;
let SEARCH_TIMEOUT = false;
let SEARCH_WIDTHS = null; // null = default {depth>=2: 22, else: all}
function widthFor(depth, full) {
  if (!SEARCH_WIDTHS) return depth >= 2 ? 22 : full;
  if (Object.prototype.hasOwnProperty.call(SEARCH_WIDTHS, depth)) return Math.min(SEARCH_WIDTHS[depth], full);
  return depth >= 2 ? 22 : full;
}
export function searchStats() { return { nodes: SEARCH_NODES, timeout: SEARCH_TIMEOUT }; }
function tickNode() {
  SEARCH_NODES++;
  if ((SEARCH_NODES & 31) === 0 && Date.now() > SEARCH_DEADLINE) SEARCH_TIMEOUT = true;
  return SEARCH_TIMEOUT;
}

function search(game, depth, alpha, beta, perspective, isRoot = false, qdepth = 2) {
  if (SEARCH_TIMEOUT) return evaluate(game, perspective);
  if (game.gameOver) return evaluate(game, perspective);
  if (game.pendingDecision) {
    // Forced chance-ish node: heuristic choice first, then every legal
    // fallback. A rejected choice (e.g. Aggro release with no 2x2 room on a
    // crowded Normal) must NEVER retry the same state — that was an infinite
    // recursion that crashed hard search via stack overflow.
    const type = game.pendingDecision.type;
    const all = type === "angel" ? ["yes", "no"]
      : type === "atheism" ? ["heaven", "hell", "metaphysical"]
      : ["release", "gold", "remove", "smite"];
    const prefs = [chooseDecision(game)];
    for (const c of all) if (!prefs.includes(c)) prefs.push(c);
    const snap = game.toSnapshot();
    for (const choice of prefs) {
      if (!choice) continue;
      const sim = GameState.fromSnapshot(snap);
      if (sim.decision(choice)) return search(sim, depth, alpha, beta, perspective, false, qdepth);
    }
    return evaluate(game, perspective);
  }
  if (game.rulePicker) {
    const snap = game.toSnapshot();
    const sim = GameState.fromSnapshot(snap);
    sim.addRule(chooseRule(sim));
    return search(sim, depth, alpha, beta, perspective, false, qdepth);
  }
  const turnColor = game.currentColor();
  const maximizing = turnColor === perspective;
  if (depth <= 0) {
    const stand = evaluate(game, perspective);
    // Quiescence: extend ONLY king captures at frontier (max qdepth), so
    // horizon blunders on last kings don't slip through. Everything else
    // returns stand-pat with beta cutoff.
    if (qdepth <= 0) return stand;
    if (maximizing && stand >= beta) return stand;
    if (!maximizing && stand <= alpha) return stand;
    const testNode = game;
    const kingTakes = enumerateMoves(testNode, 220).filter(a => isKingCapture(testNode, a)).slice(0, 8);
    if (!kingTakes.length) return stand;
    const snapQ = testNode.toSnapshot();
    if (maximizing) {
      let best = stand;
      for (const a of kingTakes) {
        const { sim, ok } = cloneApply(snapQ, a);
        if (!ok) continue;
        const v = search(sim, 0, Math.max(alpha, best), beta, perspective, false, qdepth - 1);
        if (v > best) best = v;
        if (best >= beta) break;
      }
      return best;
    } else {
      let best = stand;
      for (const a of kingTakes) {
        const { sim, ok } = cloneApply(snapQ, a);
        if (!ok) continue;
        const v = search(sim, 0, alpha, Math.min(beta, best), perspective, false, qdepth - 1);
        if (v < best) best = v;
        if (best <= alpha) break;
      }
      return best;
    }
  }
  // TT probe (root search only shares table; cleared per chooseMainAction).
  const key = snapshotKey(game);
  const tt = TT.get(key);
  if (tt && tt.depth >= depth) {
    if (tt.flag === "exact") { TT_HITS++; return tt.value; }
    if (tt.flag === "lower" && tt.value > alpha) alpha = tt.value;
    if (tt.flag === "upper" && tt.value < beta) beta = tt.value;
    if (alpha >= beta) { TT_HITS++; return tt.value; }
  }
  // Apply upgrade closure for side to move (free, always good).
  const upgrades = planUpgrades(game, 3);
  let node = game;
  if (upgrades.length) {
    node = GameState.fromSnapshot(game.toSnapshot());
    for (const u of upgrades) {
      if (!node.upgrade(u.id, u.x, u.y, u.board)) break;
    }
    if (node.gameOver) return evaluate(node, perspective);
  }
  let actions = [...enumerateMoves(node, 220), ...enumerateBuys(node, 24)];
  if (!actions.length) return evaluate(node, perspective);
  // Order + prune to keep branching sane. Depth-3+ callers pass narrow
  // widths via opts; default preserves shipped depth-2 behavior exactly.
  const width = widthFor(depth, actions.length);
  actions = actions
    .map(a => ({ a, s: staticScoreForOrdering(node, a, perspective) }))
    .sort((x, y) => y.s - x.s)
    .slice(0, width)
    .map(e => e.a);

  const snap = node.toSnapshot();
  const alphaOrig = alpha, betaOrig = beta;
  let best;
  if (maximizing) {
    best = -Infinity;
    for (const a of actions) {
      if (tickNode()) break;
      const { sim, ok } = cloneApply(snap, a);
      if (!ok) continue;
      const v = search(sim, depth - 1, alpha, beta, perspective, false, qdepth);
      if (v > best) best = v;
      if (v > alpha) alpha = v;
      if (beta <= alpha) break;
      if (SEARCH_TIMEOUT) break;
    }
    if (best === -Infinity) return evaluate(node, perspective);
  } else {
    best = Infinity;
    for (const a of actions) {
      if (tickNode()) break;
      const { sim, ok } = cloneApply(snap, a);
      if (!ok) continue;
      const v = search(sim, depth - 1, alpha, beta, perspective, false, qdepth);
      if (v < best) best = v;
      if (v < beta) beta = v;
      if (beta <= alpha) break;
      if (SEARCH_TIMEOUT) break;
    }
    if (best === Infinity) return evaluate(node, perspective);
  }
  const flag = best <= alphaOrig ? "upper" : best >= betaOrig ? "lower" : "exact";
  if (TT.size < 20000) TT.set(key, { depth, value: best, flag });
  return best;
}

export const BOT_TIME_BUDGET_MS = { easy: 50, normal: 150, hard: 450 };
export function chooseMainAction(game, difficulty = "normal", opts = {}) {
  const color = game.currentColor();
  const moves = enumerateMoves(game, 300);
  const buys = enumerateBuys(game, difficulty === "hard" ? 36 : 24);
  const all = [...moves, ...buys];
  if (!all.length) return null;
  const timeBudget = opts.timeMs ?? BOT_TIME_BUDGET_MS[difficulty] ?? 150;
  if (difficulty === "easy") {
    // Mostly greedy with frequent blunders so beginners can win.
    if (Math.random() < 0.3) return all[Math.floor(Math.random() * all.length)];
    // else fall through to greedy below
  }
  if (difficulty === "normal") {
    // 1-ply + upgrade-aware eval.
    const snap = game.toSnapshot();
    // Apply upgrade closure first in eval baseline.
    let best = null, bestScore = -Infinity;
    const ordered = all
      .map(a => ({ a, s: staticScoreForOrdering(game, a, color) }))
      .sort((x, y) => y.s - x.s)
      .slice(0, 60)
      .map(e => e.a);
    for (const a of ordered) {
      const { sim, ok } = cloneApply(snap, a);
      if (!ok) continue;
      // Opponent upgrade closure happens inside their turn; here just eval.
      let v = evaluate(sim, color);
      if (difficulty === "easy") v += (Math.random() - 0.5) * 300; // jitter
      if (v > bestScore) { bestScore = v; best = a; }
    }
    return best || all[0];
  }
  // hard: iterative-deepening alpha-beta, time-capped. One policy forward per
  // turn (when weights loaded) orders the root; deeper levels reuse static
  // ordering. Depth 3 runs whenever there is budget left and ordering is
  // trustworthy (policy loaded) or explicitly forced (bench opts.depth3) —
  // the deadline still guarantees the browser never freezes.
  clearTT();
  SEARCH_NODES = 0; SEARCH_TIMEOUT = false;
  SEARCH_DEADLINE = Date.now() + timeBudget;
  SEARCH_WIDTHS = opts.widths || null;
  let logits = null;
  if (policyNetLoaded() && policyAppliesTo(color)) {
    try { logits = policyLogits(game); } catch { logits = null; }
  }
  // Invasion context: built only when an atheism win is armed (rare). Ensures
  // portal buys are even enumerated, then verified, then prioritized.
  const armed = armedTargets(game, color);
  let invCtx = null;
  let rootActions = all;
  if (armed.length) {
    const cells = new Set();
    for (const a of findAtheisms(game)) {
      for (const c of game.footprint("Atheism", a.x, a.y)) cells.add(`${a.board}:${c.x},${c.y}`);
    }
    const { dist } = invasionDistances(game, color);
    invCtx = { armed, atheismCells: cells, dist };
    const extra = enumerateBuys(game, 36, { forceItems: ["portal"] });
    const seen = new Set(rootActions.map(a => JSON.stringify(a)));
    for (const b of extra) {
      const k = JSON.stringify(b);
      if (!seen.has(k)) { seen.add(k); rootActions = [...rootActions, b]; }
    }
  }
  const snap = game.toSnapshot();
  const ordered = rootActions
    .map(a => ({ a, s: staticScoreForOrdering(game, a, color, invCtx) + policyBonusFor(logits, a) }))
    .sort((x, y) => y.s - x.s)
    .slice(0, 26)
    .map(e => e.a);
  const searchDepth = (depth, width) => {
    let best = ordered[0] || null, bestScore = -Infinity, alpha = -Infinity;
    const narrow = ordered.slice(0, width);
    for (const a of narrow) {
      if (SEARCH_TIMEOUT || Date.now() > SEARCH_DEADLINE) { SEARCH_TIMEOUT = true; break; }
      const { sim, ok } = cloneApply(snap, a);
      if (!ok) continue;
      const v = search(sim, depth, alpha, Infinity, color);
      if (SEARCH_TIMEOUT) break;
      if (v > bestScore) { bestScore = v; best = a; }
      if (v > alpha) alpha = v;
    }
    return { best, bestScore };
  };
  const d1 = searchDepth(0, 26);
  let best = d1.best;
  if (!SEARCH_TIMEOUT && Date.now() < SEARCH_DEADLINE) {
    const d2 = searchDepth(1, 22);
    if (!SEARCH_TIMEOUT && d2.best) best = d2.best;
  }
  const wantD3 = opts.depth3 || (logits && !opts.widths);
  if (wantD3 && !SEARCH_TIMEOUT && Date.now() < SEARCH_DEADLINE) {
    if (!opts.widths) SEARCH_WIDTHS = { 1: 14, 2: 10 };
    const d3 = searchDepth(2, 12);
    if (!SEARCH_TIMEOUT && d3.best) best = d3.best;
  }
  SEARCH_WIDTHS = null;
  return best;
}

// Full turn plan: free upgrades + (decision | rule | main action).
// Returns { upgrades: [], action: mainAction|null, kind } for the UI layer to
// apply sequentially (upgrades first since they don't flip the turn).
export function planBotTurn(game, difficulty = "normal", opts = {}) {
  if (game.gameOver) return null;
  if (game.pendingDecision) {
    const choice = chooseDecision(game);
    if (!choice) return null;
    return { upgrades: [], action: { action: "decision", choice }, kind: "decision" };
  }
  if (game.rulePicker) {
    return { upgrades: [], action: { action: "rule", rule: chooseRule(game) }, kind: "rule" };
  }
  // Reserve portal money when an atheism win is armed (kings don't move on
  // upgrade, so the pre-upgrade ledger is valid for the post-upgrade node).
  const turnColor = game.whiteToMove ? "White" : "Black";
  const reserveGP = (difficulty !== "easy" && armedTargets(game, turnColor).length) ? 4 : 0;
  const upgrades = planUpgrades(game, difficulty === "easy" ? 2 : 6, { reserveGP });
  // Simulate upgrades to choose main action from post-upgrade position.
  let node = game;
  if (upgrades.length) {
    node = GameState.fromSnapshot(game.toSnapshot());
    for (const u of upgrades) {
      const ok = node.upgrade(u.id, u.x, u.y, u.board);
      if (!ok) break;
    }
    if (node.gameOver || node.pendingDecision || node.rulePicker) {
      return { upgrades, action: null, kind: "upgrade-only" };
    }
  }
  // Invasion project (normal/hard only — easy stays dumb): when an atheism
  // win is armed, commit to the verified route's next step instead of asking
  // search to value what it can't see. Re-planned every turn from the
  // post-upgrade position; disarms automatically when conditions change.
  if (difficulty !== "easy" && !node.pendingDecision && !node.rulePicker) {
    const nodeColor = node.whiteToMove ? "White" : "Black";
    let step = null;
    try { step = invasionProjectStep(node, nodeColor); } catch { step = null; }
    if (step) return { upgrades, action: step, kind: `invasion:${step.action}` };
  }
  const main = chooseMainAction(node, difficulty, opts);
  if (!main && !upgrades.length) return null;
  return { upgrades, action: main, kind: main ? main.action : "upgrade-only" };
}

function hasRoomFor(game, type) {
  if (!game.board("Normal")) return false;
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
    if (game.footprintClear(type, x, y, "Normal")) return true;
  }
  return false;
}

export const __internal = { countKings, kingsPerBoard, kingPositions, evaluateRaw: evaluate, search, hasRoomFor, kingExposure };
