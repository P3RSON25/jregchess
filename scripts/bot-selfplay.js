// Selfplay data generator for RTX 4070S training (value net v1).
// Plays bot-vs-bot, logs every Kth ply as compact JSONL with game outcome.
// Usage: node scripts/bot-selfplay.js --games 20 --white normal --black easy --out data/selfplay.jsonl --every 2 --maxPlies 250
import { mkdirSync, appendFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { GameState } from "../shared/game.js";
import { planBotTurn } from "../shared/bot.js";
import { encodePosition } from "../shared/features.js";

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, cur, i, arr) => {
    if (cur.startsWith("--")) {
      const k = cur.slice(2);
      const v = arr[i + 1] && !arr[i + 1].startsWith("--") ? arr[i + 1] : "true";
      acc.push([k, v]);
    }
    return acc;
  }, [])
);
const GAMES = Number(args.games || 20);
const WHITE_DIFF = args.white || "normal";
const BLACK_DIFF = args.black || "normal";
const OUT = args.out || "data/selfplay.jsonl";
const EVERY = Number(args.every || 2);
const MAX_PLIES = Number(args.maxPlies || 250);
const OFFSET = Number(args.offset || 0);
const APPEND = args.append === "true" || args.append === "1";

mkdirSync(dirname(OUT), { recursive: true });
if (!APPEND) writeFileSync(OUT, "");
let positions = 0;

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

for (let g = OFFSET; g < OFFSET + GAMES; g++) {
  const game = new GameState({ seed: `selfplay-${WHITE_DIFF}-vs-${BLACK_DIFF}-${g}` });
  const buf = [];
  let plies = 0;
  while (!game.gameOver && plies < MAX_PLIES) {
    const diff = game.pendingDecision
      ? (game.pendingDecision.color === "White" ? WHITE_DIFF : BLACK_DIFF)
      : game.rulePicker
        ? (game.rulePickerColor === "White" ? WHITE_DIFF : BLACK_DIFF)
        : (game.whiteToMove ? WHITE_DIFF : BLACK_DIFF);
    const plan = planBotTurn(game, diff);
    if (!plan) break;
    if (plies % EVERY === 0) buf.push(encodePosition(game, plan.action));
    if (!applyPlan(game, plan)) break;
    plies++;
  }
  const result_w = !game.gameOver ? 0 : game.draw ? 0 : game.winner === "White" ? 1 : -1;
  const lines = buf.map(p => JSON.stringify({ ...p, result_w, seed: g, timeout: !game.gameOver })).join("\n") + "\n";
  appendFileSync(OUT, lines);
  positions += buf.length;
  if ((g - OFFSET + 1) % 10 === 0) console.log(`... ${g - OFFSET + 1}/${GAMES} games, ${positions} positions -> ${OUT}`);
}
console.log(`SELFPLAY DONE: ${GAMES} games, ${positions} positions -> ${OUT}`);
