// Bot search worker: runs planBotTurn off the main thread so the tab never
// freezes, even for depth-3+ thinks. Main thread posts { id, snapshot,
// difficulty, opts }; worker replies { id, ok, plan?, error? }.
// Nets are fetched once (same policy/value files the UI auto-loads).
import { GameState } from "/shared/game.js";
import { planBotTurn } from "/shared/bot.js";
import { loadPolicyNet, policyNetLoaded } from "/shared/policyNet.js";
import { loadValueNet } from "/shared/valueNet.js";

let netsReady = false;
async function ensureNets() {
  if (netsReady) return;
  try {
    const r2 = await fetch("/ml/policy_v2.json", { cache: "no-store" });
    if (r2.ok) loadPolicyNet(await r2.json());
  } catch { /* offline-safe */ }
  if (!policyNetLoaded()) {
    try {
      const r1 = await fetch("/ml/policy_v1.json", { cache: "no-store" });
      if (r1.ok) loadPolicyNet(await r1.json());
    } catch { /* offline-safe */ }
  }
  try {
    const rv = await fetch("/ml/value_v1.json", { cache: "no-store" });
    if (rv.ok) loadValueNet(await rv.json());
  } catch { /* optional */ }
  netsReady = true;
}

self.onmessage = async event => {
  const { id, snapshot, difficulty, opts } = event.data || {};
  try {
    await ensureNets();
    const game = GameState.fromSnapshot(snapshot);
    const plan = planBotTurn(game, difficulty || "normal", opts || {});
    self.postMessage({ id, ok: true, plan });
  } catch (error) {
    self.postMessage({ id, ok: false, error: String((error && error.message) || error) });
  }
};
