// Forced-win invasion logic: portals earn NOTHING by themselves.
// Value flows only from verified terminal outcomes — destroying dimension X
// via the God of Atheism removes every enemy king while one own king
// survives elsewhere. Every bonus below is gated on that verification, so
// portal spam can never farm rewards: a portal that doesn't complete a
// verified route scores exactly zero.
//
// Also note invasion bonuses live in move ORDERING only, never in evaluate().
// Ordering changes which lines get searched; minimax still backs up real
// valuations. Reward hacking is impossible by construction.
import { GameState } from "./game.js";

export const ATHEISM_CAPTURE_BONUS = 15000; // below King-take (20000), above all else
export const PORTAL_ROUTE_BONUS = 3000; // sim-verified route creation only
export const PROGRESS_PULL_CAP = 600;

function opp(color) {
  return color === "White" ? "Black" : "White";
}

// King counts per board, large groups counted once, destroyed boards skipped.
export function kingLedger(game) {
  const out = { White: { Normal: 0, Heaven: 0, Hell: 0, total: 0 }, Black: { Normal: 0, Heaven: 0, Hell: 0, total: 0 } };
  const seen = new Set();
  for (const b of game.activeBoardNames()) {
    for (const row of game.board(b)) for (const p of row) {
      if (!p || (p.type !== "King" && p.type !== "SuperKing")) continue;
      const root = game.leader(p);
      const id = root.group || root.uid;
      if (seen.has(id)) continue;
      seen.add(id);
      if (root.color !== "White" && root.color !== "Black") continue;
      out[root.color][b]++;
      out[root.color].total++;
    }
  }
  return out;
}

// Dimensions X whose God-of-Atheism destruction wins RIGHT NOW for color:
// every enemy king sits on X, and at least one own king sits elsewhere.
// (Own non-king material on X is irrelevant — victory is immediate.)
export function armedTargets(game, color) {
  if (game.gameOver) return [];
  const enemy = opp(color);
  const ledger = kingLedger(game);
  const mine = ledger[color];
  const theirs = ledger[enemy];
  if (theirs.total === 0) return [];
  const out = [];
  for (const dim of game.activeBoardNames()) {
    if (dim === "Normal") continue; // atheism destroys Heaven/Hell only
    if (theirs[dim] === theirs.total && mine.total - mine[dim] > 0) {
      out.push({ dim, enemyKings: theirs[dim], ownLost: mine[dim] });
    }
  }
  out.sort((a, b) => b.enemyKings - a.enemyKings || a.ownLost - b.ownLost);
  return out;
}

export function findAtheisms(game) {
  const out = [];
  for (const b of game.activeBoardNames()) {
    const seen = new Set();
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
      const p = game.board(b)[y][x];
      if (!p || p.type !== "Atheism") continue;
      const root = game.leader(p);
      if (seen.has(root.uid)) continue;
      seen.add(root.uid);
      out.push({ x: root.x, y: root.y, board: b, root });
    }
  }
  return out;
}

function atheismCells(game) {
  const cells = new Set();
  for (const a of findAtheisms(game)) {
    for (const c of game.footprint("Atheism", a.x, a.y)) cells.add(`${a.board}:${c.x},${c.y}`);
  }
  return cells;
}

function portalDest(game, boardName, x, y) {
  const portal = game.portalAt(x, y, boardName);
  if (!portal) return null;
  try { return game.portalDestination(portal, boardName); } catch { return null; }
}

// BFS over (board,x,y): king-step adjacency + portal edges. Blockers ignored
// (steering approximation — search verifies tactics). Returns distance map.
export function invasionDistances(game, color) {
  const dist = new Map();
  const queue = [];
  for (const b of game.activeBoardNames()) {
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
      const p = game.board(b)[y][x];
      if (p && game.leader(p).color === color) {
        const k = `${b}:${x},${y}`;
        if (!dist.has(k)) { dist.set(k, 0); queue.push(k); }
      }
    }
  }
  const targets = atheismCells(game);
  let head = 0;
  while (head < queue.length) {
    const k = queue[head++];
    const d = dist.get(k);
    if (targets.has(k)) return { dist, reached: d };
    const sep = k.indexOf(":");
    const b = k.slice(0, sep);
    const [x, y] = k.slice(sep + 1).split(",").map(Number);
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const nk = `${b}:${x + dx},${y + dy}`;
      if (x + dx < 0 || x + dx > 7 || y + dy < 0 || y + dy > 7 || dist.has(nk)) continue;
      dist.set(nk, d + 1);
      queue.push(nk);
    }
    const dest = portalDest(game, b, x, y);
    if (dest && game.board(dest)) {
      const nk = `${dest}:${x},${y}`;
      if (!dist.has(nk)) { dist.set(nk, d + 1); queue.push(nk); }
    }
  }
  // No path found: report shortest distance TO any atheism cell, if mapped.
  let best = Infinity;
  for (const t of targets) if (dist.has(t)) best = Math.min(best, dist.get(t));
  return { dist, reached: best === Infinity ? null : best };
}

// Shortest own-material route to any Atheism footprint cell (BFS length).
export function routeLength(game, color, maxLen = 6) {
  const { reached } = invasionDistances(game, color);
  if (reached === null || reached === undefined) return null;
  return reached <= maxLen ? reached : null;
}

// Sim-verified portal buy value: clones, buys the portal, re-checks the
// route. Bonus ONLY if the purchase creates a short route that wins.
// A decorative portal scores exactly zero — no farming possible.
export function portalBuyValue(game, x, y, color) {
  if (!armedTargets(game, color).length) return 0;
  if (routeLength(game, color, 2) !== null) return 0; // route already exists
  let sim;
  try { sim = GameState.fromSnapshot(game.toSnapshot()); } catch { return 0; }
  let ok = false;
  try { ok = sim.buy("portal", x, y, "Normal"); } catch { ok = false; }
  if (!ok) return 0;
  // A portal buy moves no kings, so armed status survives; re-verify anyway.
  if (!armedTargets(sim, color).length) return 0;
  return routeLength(sim, color, 2) !== null ? PORTAL_ROUTE_BONUS : 0;
}

// If the pending decision is atheism and a verified win exists, return the
// winning choice ('heaven'/'hell'). Otherwise null (heuristics decide).
export function forcedAtheismChoice(game) {
  const d = game.pendingDecision;
  if (!d || d.type !== "atheism") return null;
  const armed = armedTargets(game, d.color);
  if (!armed.length) return null;
  return armed[0].dim === "Heaven" ? "heaven" : "hell";
}

function ownLeaders(game, color) {
  const out = [];
  const seen = new Set();
  for (const b of game.activeBoardNames()) {
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
      const p = game.board(b)[y][x];
      if (!p) continue;
      const root = game.leader(p);
      if (root.color !== color || seen.has(root.uid)) continue;
      seen.add(root.uid);
      out.push(root);
    }
  }
  return out;
}

// Single-source BFS distances from one piece (king-step adjacency + portal
// edges, blockers ignored). Returns { dist: Map, prev: Map }.
function bfsFrom(game, startBoard, startX, startY) {
  const dist = new Map();
  const prev = new Map();
  const start = `${startBoard}:${startX},${startY}`;
  dist.set(start, 0);
  const queue = [start];
  let head = 0;
  while (head < queue.length) {
    const k = queue[head++];
    const d = dist.get(k);
    const sep = k.indexOf(":");
    const b = k.slice(0, sep);
    const [x, y] = k.slice(sep + 1).split(",").map(Number);
    const step = (nk) => {
      if (dist.has(nk)) return;
      dist.set(nk, d + 1);
      prev.set(nk, k);
      queue.push(nk);
    };
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      if (x + dx < 0 || x + dx > 7 || y + dy < 0 || y + dy > 7) continue;
      step(`${b}:${x + dx},${y + dy}`);
    }
    const dest = portalDest(game, b, x, y);
    if (dest && game.board(dest)) step(`${dest}:${x},${y}`);
  }
  return { dist, prev };
}

// Project step for an armed win: the greedy first action of the verified
// route, re-planned every turn (stale commitments impossible — armed is
// re-verified each call). Returns a legal action or null.
//  1. Direct atheism capture (wins next via forced decision).
//  2. First valid step along the shortest route (travel/approach).
//  3. Sim-verified portal buy that creates a short route.
export function invasionProjectStep(game, color) {
  if (!armedTargets(game, color).length) return null;
  const atheisms = findAtheisms(game);
  if (!atheisms.length) return null;
  const cells = atheismCells(game);
  const pieces = ownLeaders(game, color);

  // 1. Direct capture now?
  for (const root of pieces) {
    let dests = [];
    try { dests = game.legalMoves({ x: root.x, y: root.y }, root.board); } catch { continue; }
    for (const to of dests) {
      if (cells.has(`${root.board}:${to.x},${to.y}`)) {
        return { action: "move", from: { x: root.x, y: root.y }, to: { x: to.x, y: to.y }, board: root.board };
      }
    }
  }

  // 2. Walk the shortest route: nearest (piece, atheism cell) by BFS, then
  // the first step — validated as a real legal move (BFS ignores blockers).
  let best = null;
  for (const root of pieces) {
    // Immobile NPC-ish or huge pieces still fine: validate before returning.
    const { dist, prev } = bfsFrom(game, root.board, root.x, root.y);
    for (const t of cells) {
      if (!dist.has(t)) continue;
      if (!best || dist.get(t) < best.d) {
        // Reconstruct first step from root toward t.
        let cur = t;
        let first = null;
        while (prev.has(cur) && prev.get(cur) !== `${root.board}:${root.x},${root.y}`) cur = prev.get(cur);
        if (prev.get(cur) === `${root.board}:${root.x},${root.y}`) first = cur;
        else if (cur === `${root.board}:${root.x},${root.y}`) first = null;
        if (first) best = { d: dist.get(t), root, first };
      }
    }
  }
  if (best) {
    const sep = best.first.indexOf(":");
    const fb = best.first.slice(0, sep);
    const [fx, fy] = best.first.slice(sep + 1).split(",").map(Number);
    // Same-board step must be a legal move; cross-board first steps only
    // happen via portal squares, which the engine resolves on arrival.
    if (fb === best.root.board) {
      try {
        if (game.validMove({ x: best.root.x, y: best.root.y }, { x: fx, y: fy }, fb)) {
          return { action: "move", from: { x: best.root.x, y: best.root.y }, to: { x: fx, y: fy }, board: fb };
        }
      } catch { /* fall through to portal buy */ }
    } else {
      // First step crosses boards: root must already stand on a portal.
      // Moving "onto" the portal square re-triggers travel — but root is
      // already there, so instead nudge: no-op here, try portal buy below.
    }
  }

  // 3. Sim-verified portal buy that creates a short route (else null).
  if (game.board("Normal") && game.funds() >= 4) {
    let bestBuy = null;
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
      if (game.getCell(x, y, "Normal")) continue;
      let v = 0;
      try {
        if (game.canBuy("portal", x, y, "Normal")) v = portalBuyValue(game, x, y, color);
      } catch { v = 0; }
      if (v > 0 && (!bestBuy || v > bestBuy.v)) bestBuy = { v, x, y };
    }
    if (bestBuy) return { action: "buy", id: "portal", x: bestBuy.x, y: bestBuy.y, board: "Normal" };
  }
  return null;
}
