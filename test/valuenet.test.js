import assert from "node:assert/strict";
import test from "node:test";
import { GameState } from "../shared/game.js";
import { encodeBoards, encodeGlobals } from "../shared/features.js";
import { expandFeatures, loadValueNet, unloadValueNet, nnBonus, VALUE_INPUT_DIM } from "../shared/valueNet.js";

test("feature encoding covers 192 squares + 10 globals", () => {
  const game = new GameState({ seed: "features" });
  const boards = encodeBoards(game);
  assert.equal(boards.Normal.length, 64);
  assert.equal(boards.Heaven.length, 64);
  assert.equal(boards.Hell.length, 64);
  assert.equal(encodeGlobals(game).length, 10);
  const x = expandFeatures(boards, encodeGlobals(game));
  assert.equal(x.length, VALUE_INPUT_DIM);
  assert.ok(x.some(v => v === 1));
});

test("nnBonus is zero-effect until weights load, then deterministic", () => {
  const game = new GameState({ seed: "nn-off" });
  unloadValueNet();
  assert.equal(nnBonus(game, "White"), 0);
  // Tiny synthetic net: zero weights, positive output bias -> tanh(b).
  const zeros = (o, i) => Array.from({ length: o }, () => new Array(i).fill(0));
  loadValueNet({
    v: 1, input_dim: VALUE_INPUT_DIM,
    layers: [
      { w: zeros(4, VALUE_INPUT_DIM), b: [0.1, -0.2, 0, 0.5] },
      { w: zeros(3, 4), b: [0.3, 0, -0.1] },
      { w: zeros(1, 3), b: [0.5] },
    ],
  });
  const a = nnBonus(game, "White");
  const b = nnBonus(game, "White");
  assert.equal(a, b);
  assert.ok(a > 0);
  assert.equal(nnBonus(game, "Black"), -a);
  unloadValueNet();
  assert.equal(nnBonus(game, "White"), 0);
});

test("python expansion contract: code format and group coverage", async () => {
  // Cross-checks the ml/train_value.py contract without torch.
  const game = new GameState({ seed: "contract" });
  const boards = encodeBoards(game);
  const seen = new Set();
  for (const name of ["Normal", "Heaven", "Hell"]) {
    for (const code of boards[name] || []) {
      if (code === ".") continue;
      assert.match(code, /^\d+:\d+$/);
      seen.add(Number(code.split(":")[1]));
    }
  }
  // Opening must contain pawns(1), kings(6), coins(30), portals(32), angels(39).
  for (const t of [1, 6, 30, 32, 39]) assert.ok(seen.has(t), `type ${t} present`);
});
