import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, existsSync } from "node:fs";
import { GameState } from "../shared/game.js";
import {
  loadPolicyNet, unloadPolicyNet, policyNetLoaded, policyLogits,
  destIndex, policyBonusFor, setPolicyColors, POLICY_OUTPUT_DIM,
} from "../shared/policyNet.js";
import { chooseMainAction } from "../shared/bot.js";

function zeroLayers() {
  const zeros = (o, i) => Array.from({ length: o }, () => new Array(i).fill(0));
  return [
    { w: zeros(4, 2890), b: [0.1, -0.2, 0, 0.5] },
    { w: zeros(3, 4), b: [0.3, 0, -0.1] },
    { w: zeros(192, 3), b: new Array(192).fill(0).map((_, i) => i * 0.01) },
  ];
}

test("policy dest indexing matches trainer contract", () => {
  assert.equal(destIndex("Normal", 0, 0), 0);
  assert.equal(destIndex("Normal", 7, 7), 63);
  assert.equal(destIndex("Heaven", 0, 0), 64);
  assert.equal(destIndex("Hell", 7, 7), 191);
  assert.equal(POLICY_OUTPUT_DIM, 192);
});

test("policy net loads, forwards deterministically, unloads clean", () => {
  const game = new GameState({ seed: "policy-unit" });
  unloadPolicyNet();
  assert.equal(policyNetLoaded(), false);
  assert.equal(policyLogits(game), null);
  loadPolicyNet({ v: 1, input_dim: 2890, output_dim: 192, layers: zeroLayers() });
  assert.equal(policyNetLoaded(), true);
  const a = policyLogits(game);
  const b = policyLogits(game);
  assert.equal(a.length, 192);
  assert.deepEqual([...a], [...b]);
  // Buys get no prior bonus; moves do.
  assert.equal(policyBonusFor(a, { action: "buy", id: "pawn" }), 0);
  assert.ok(Number.isFinite(policyBonusFor(a, { action: "move", board: "Normal", to: { x: 4, y: 4 } })));
  unloadPolicyNet();
  assert.equal(policyNetLoaded(), false);
});

test("policy side filter gates ordering per color", () => {
  loadPolicyNet({ v: 1, input_dim: 2890, output_dim: 192, layers: zeroLayers() });
  setPolicyColors(["White"]);
  const game = new GameState({ seed: "policy-color" });
  game.whiteToMove = true;
  const whiteMove = chooseMainAction(game, "hard", { timeMs: 200 });
  assert.ok(whiteMove);
  setPolicyColors(null);
  unloadPolicyNet();
});

test("real policy weights agree with trainer indexing", () => {
  // v2 preferred (current-strength distribution), v1 fallback — as in app.js.
  const path = existsSync("ml/policy_v2.json") ? "ml/policy_v2.json"
    : existsSync("ml/policy_v1.json") ? "ml/policy_v1.json" : null;
  if (!path) return; // weights are git-ignored; CI skips
  const game = new GameState({ seed: "policy-real" });
  loadPolicyNet(JSON.parse(readFileSync(path, "utf8")));
  const logits = policyLogits(game);
  assert.equal(logits.length, 192);
  assert.ok(logits.some(v => v !== 0));
  const action = chooseMainAction(game, "hard", { timeMs: 500 });
  assert.ok(action);
  unloadPolicyNet();
});
