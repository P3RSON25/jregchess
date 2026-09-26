// Policy-net inference: destination prior P(hard moves to square).
// 192 logits over Normal 0-63, Heaven 64-127, Hell 128-191 (MUST match
// ml/train_policy.py BOARD_OFF). One forward per turn; results cached by the
// caller for ordering every node in that search. Unloaded -> zero effect.
import { TYPE_IDS } from "./features.js";
import { expandFeatures } from "./valueNet.js";

export const POLICY_OUTPUT_DIM = 192;
const BOARD_OFF = { Normal: 0, Heaven: 64, Hell: 128 };
let weights = null;
let policyColors = null; // null = applies to both colors (browser default)
export function setPolicyColors(colors) { policyColors = colors ? [...colors] : null; }
export function policyAppliesTo(color) { return !policyColors || policyColors.includes(color); }

export function loadPolicyNet(json) {
  if (!json || json.v !== 1 || json.input_dim !== 2890 || json.output_dim !== POLICY_OUTPUT_DIM ||
      !Array.isArray(json.layers) || json.layers.length !== 3) {
    throw new Error("bad policy-net weights (want v:1, 2890 inputs, 192 outputs, 3 layers)");
  }
  weights = json;
  return true;
}
export function policyNetLoaded() { return Boolean(weights); }
export function unloadPolicyNet() { weights = null; }

export function destIndex(board, x, y) {
  return (BOARD_OFF[board] ?? 0) + y * 8 + x;
}

// Raw logits (Float32Array 192) for a live game position.
export function policyLogits(game) {
  if (!weights) return null;
  const boards = {};
  for (const name of ["Normal", "Heaven", "Hell"]) {
    const b = game.board(name);
    if (!b) { boards[name] = null; continue; }
    const codes = new Array(64);
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
      const p = b[y][x];
      codes[y * 8 + x] = !p ? "." : `${p.color === "White" ? 0 : p.color === "Black" ? 1 : 2}:${TYPE_IDS[p.type] ?? 0}`;
    }
    boards[name] = codes;
  }
  const seen = new Set();
  let kingsW = 0, kingsB = 0;
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
  const globals = [
    game.whiteToMove ? 1 : 0, game.whiteGP / 20, game.blackGP / 20,
    game.rules.length / 25, (game.turnsSinceNewRule || 0) / 8,
    kingsW / 4, kingsB / 4, (game.automovingPieces?.length || 0) / 8,
    game.pendingDecision ? 1 : 0, game.rulePicker ? 1 : 0,
  ];
  const x = expandFeatures(boards, globals);
  let a = x;
  for (const { w, b } of weights.layers) {
    const out = new Float32Array(b.length);
    const last = b.length === POLICY_OUTPUT_DIM;
    for (let o = 0; o < b.length; o++) {
      const row = w[o];
      let s = b[o];
      for (let i = 0; i < row.length; i++) s += row[i] * a[i];
      out[o] = last ? s : (s > 0 ? s : 0);
    }
    a = out;
  }
  return a;
}

// Bonus (centipawn-ish) added to a move's static ordering score.
// Logit gap vs uniform, scaled so favorite destinations clearly outrank
// quiet moves but king-capture MVV-LVA (+20000) still dominates.
export function policyBonusFor(logits, action, scale = 120) {
  if (!logits || action.action !== "move") return 0;
  const uniform = -Math.log(POLICY_OUTPUT_DIM);
  return (logits[destIndex(action.board, action.to.x, action.to.y)] - uniform) * scale;
}
void TYPE_IDS;
