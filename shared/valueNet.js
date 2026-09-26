// Learned value-net inference (pure JS, no deps).
// Mirrors ml/train_value.py expansion exactly:
//   192 squares x (12 group one-hot + 3 white-centric side) + 10 globals = 2890.
// Weights JSON: { v:1, input_dim:2890, layers:[{w:[[out][in]],b:[out]} x3 ] }.
// Output tanh in [-1,1] white-centric; nnBonus() scales to centipawns.
// Unloaded by default -> zero effect (handcrafted eval only).
import { TYPE_IDS } from "./features.js";

const GROUP_OF = {};
for (const t of [6]) GROUP_OF[t] = 0;
for (const t of [14]) GROUP_OF[t] = 1;
for (const t of [5, 15, 16]) GROUP_OF[t] = 2;
for (const t of [4, 17, 18, 10]) GROUP_OF[t] = 3;
for (const t of [3, 13, 11, 12, 20]) GROUP_OF[t] = 4;
for (const t of [2, 8, 7, 21, 22, 9]) GROUP_OF[t] = 5;
for (const t of [1, 19]) GROUP_OF[t] = 6;
for (const t of [46, 45, 44, 47]) GROUP_OF[t] = 7;
for (const t of [33, 34, 35, 36, 37]) GROUP_OF[t] = 8;
for (const t of [30, 31]) GROUP_OF[t] = 9;
for (const t of [32]) GROUP_OF[t] = 10;
for (const t of [38, 39, 40, 41, 42, 43, 48]) GROUP_OF[t] = 11;

export const VALUE_INPUT_DIM = 2890;
let weights = null;

export function loadValueNet(json) {
  if (!json || json.v !== 1 || json.input_dim !== VALUE_INPUT_DIM || !Array.isArray(json.layers) || json.layers.length !== 3) {
    throw new Error("bad value-net weights (want v:1, 2890 inputs, 3 layers)");
  }
  weights = json;
  return true;
}
export function valueNetLoaded() { return Boolean(weights); }
export function unloadValueNet() { weights = null; }

export function expandFeatures(boards, globals) {
  const x = new Float32Array(VALUE_INPUT_DIM);
  let off = 0;
  for (const name of ["Normal", "Heaven", "Hell"]) {
    const codes = boards[name];
    if (!codes) { off += 64 * 15; continue; }
    for (let i = 0; i < 64; i++) {
      const code = codes[i];
      if (code !== ".") {
        const sep = code.indexOf(":");
        const c = Number(code.slice(0, sep));
        const t = Number(code.slice(sep + 1));
        const g = GROUP_OF[t] ?? 11;
        x[off + g] = 1;
        x[off + 12 + c] = 1;
      }
      off += 15;
    }
  }
  for (let i = 0; i < 10; i++) x[off + i] = globals[i] ?? 0;
  return x;
}

function forward(x) {
  let a = x;
  for (let l = 0; l < weights.layers.length; l++) {
    const { w, b } = weights.layers[l];
    const out = new Float32Array(b.length);
    for (let o = 0; o < b.length; o++) {
      const row = w[o];
      let s = b[o];
      for (let i = 0; i < row.length; i++) s += row[i] * a[i];
      out[o] = l === weights.layers.length - 1 ? Math.tanh(s) : (s > 0 ? s : 0);
    }
    a = out;
  }
  return a[0];
}

// White-centric tanh -> perspective centipawns blended with handcrafted eval.
export function nnBonus(game, perspective, scale = 1500) {
  if (!weights) return 0;
  // Lazy import avoided: caller passes encoded boards/globals via game.
  // We encode here from live game to keep call sites one-liners.
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
  const v = forward(expandFeatures(boards, globals)); // white-centric
  return (perspective === "White" ? v : -v) * scale;
}
void TYPE_IDS;
