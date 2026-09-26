// Farm worker: plays an assigned slice of selfplay games, posts JSONL back.
// Runs inside node:worker_threads, spawned by scripts/bot-farm.js.
import { parentPort, workerData } from "node:worker_threads";
import { GameState } from "../shared/game.js";
import { planBotTurn } from "../shared/bot.js";
import { encodePosition } from "../shared/features.js";

const { start, count, white, black, every, maxPlies, seedTag } = workerData;

function applyPlan(game, plan) {
  for (const u of plan.upgrades || []) {
    if (!game.upgrade(u.id, u.x, u.y, u.board)) return false;
  }
  const a = plan.action;
  if (!a) return true;
  if (a.action === "move") return game.move(a.from, a.to, a.board);
  if (a.action === "buy") return game.buy(a.id, a.x, a.y, a.board);
  if (a.action === "upgrade") return game.upgrade(a.id, a.x, a.y, a.board);
  if (a.action === "decision") return game.decision(a.choice);
  if (a.action === "rule") return game.addRule(a.rule);
  return false;
}

const lines = [];
let positions = 0;
for (let i = 0; i < count; i++) {
  const g = start + i;
  const game = new GameState({ seed: `farm-${seedTag}-${white}-vs-${black}-${g}` });
  const buf = [];
  let plies = 0;
  while (!game.gameOver && plies < maxPlies) {
    const diff = game.pendingDecision
      ? (game.pendingDecision.color === "White" ? white : black)
      : game.rulePicker
        ? (game.rulePickerColor === "White" ? white : black)
        : (game.whiteToMove ? white : black);
    const plan = planBotTurn(game, diff);
    if (!plan) break;
    if (plies % every === 0) buf.push(encodePosition(game, plan.action));
    if (!applyPlan(game, plan)) break;
    plies++;
  }
  const result_w = !game.gameOver ? 0 : game.draw ? 0 : game.winner === "White" ? 1 : -1;
  for (const p of buf) lines.push(JSON.stringify({ ...p, result_w, seed: g, timeout: !game.gameOver }));
  positions += buf.length;
  parentPort.postMessage({ type: "progress", done: i + 1, positions });
}
parentPort.postMessage({ type: "done", lines, positions });
