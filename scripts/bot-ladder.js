// Adjudicated A/B ladder: pits two bot configs against each other on identical
// seeds and adjudicates unfinished games by eval margin instead of timeouts.
// Usage:
//   node scripts/bot-ladder.js --games 20 --white hard --black hard \
//     --whiteDepth3 1 --whitePolicy 1 --policy ml/policy_v1.json \
//     --maxPlies 120 --adjudicate 1500 --timeMs 3000 --seedTag d3
// Side config: --{white|black} diff, --{white|black}Policy 0/1,
//   --{white|black}Depth3 0/1, --{white|black}Time ms, --{white|black}Widths JSON.
// Adjudication: at maxPlies, evaluate() from White's view decides:
//   > +cp white wins, < -cp black wins, else draw. Reported separately.
import { GameState } from "../shared/game.js";
import { planBotTurn, evaluate, setExposureEnabled } from "../shared/bot.js";
import { loadPolicyNet, setPolicyColors } from "../shared/policyNet.js";
import { loadValueNet } from "../shared/valueNet.js";
import { readFileSync, existsSync } from "node:fs";

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
const num = (k, d) => Number(args[k] ?? d);
const flag = (k, d = false) => ["1", "true"].includes(String(args[k] ?? (d ? "1" : "0")));
const GAMES = num("games", 20);
const OFFSET = num("offset", 0);
const MAX_PLIES = num("maxPlies", 120);
const ADJUDICATE_CP = num("adjudicate", 1500);
const SEED_TAG = args.seedTag || "ladder";
const TIME_MS = num("timeMs", 3000);

if (args.policy) {
  loadPolicyNet(JSON.parse(readFileSync(args.policy, "utf8")));
  const sides = [];
  if (flag("whitePolicy")) sides.push("White");
  if (flag("blackPolicy")) sides.push("Black");
  setPolicyColors(sides.length ? sides : []);
}
if (flag("noExposure")) setExposureEnabled(false);
if (args.value && existsSync(args.value)) loadValueNet(JSON.parse(readFileSync(args.value, "utf8")));

function sideCfg(prefix, fallbackDiff) {
  return {
    diff: args[prefix] || fallbackDiff,
    policy: flag(prefix + "Policy"),
    depth3: flag(prefix + "Depth3"),
    timeMs: num(prefix + "Time", TIME_MS),
    widths: args[prefix + "Widths"] ? JSON.parse(args[prefix + "Widths"]) : undefined,
  };
}
const whiteCfg = sideCfg("white", "hard");
const blackCfg = sideCfg("black", "hard");

function cfgFor(game, cfg) {
  const opts = { timeMs: cfg.timeMs };
  if (cfg.depth3) { opts.depth3 = true; opts.widths = cfg.widths || { 1: 14, 2: 10, 3: 12 }; }
  return opts;
}

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

let W = 0, B = 0, D = 0, ADJW = 0, ADJB = 0, ADJD = 0, ill = 0;
const t0 = Date.now();
for (let g = OFFSET; g < OFFSET + GAMES; g++) {
  const game = new GameState({ seed: `${SEED_TAG}-w${whiteCfg.diff}-b${blackCfg.diff}-${g}` });
  let plies = 0, bad = false;
  while (!game.gameOver && plies < MAX_PLIES) {
    const isWhite = game.pendingDecision
      ? game.pendingDecision.color === "White"
      : game.rulePicker
        ? game.rulePickerColor === "White"
        : game.whiteToMove;
    const cfg = isWhite ? whiteCfg : blackCfg;
    const plan = planBotTurn(game, cfg.diff, cfgFor(game, cfg));
    if (!plan || !applyPlan(game, plan)) { bad = true; break; }
    plies++;
  }
  if (bad) { ill++; continue; }
  if (game.gameOver) {
    if (game.draw) D++;
    else if (game.winner === "White") W++;
    else B++;
  } else {
    const ev = evaluate(game, "White");
    if (ev > ADJUDICATE_CP) { W++; ADJW++; }
    else if (ev < -ADJUDICATE_CP) { B++; ADJB++; }
    else { D++; ADJD++; }
  }
  if ((g - OFFSET + 1) % 5 === 0) console.log(`... ${g - OFFSET + 1}/${GAMES} W:${W} B:${B} D:${D} ill:${ill} (${Math.round((Date.now() - t0) / 1000)}s)`);
}
console.log(`\nLADDER ${GAMES} games W:${whiteCfg.diff}${whiteCfg.depth3 ? "+d3" : ""}${whiteCfg.policy ? "+P" : ""} vs B:${blackCfg.diff}${blackCfg.depth3 ? "+d3" : ""}${blackCfg.policy ? "+P" : ""} seedTag=${SEED_TAG}`);
console.log(`White ${W} | Black ${B} | Draw ${D} (adjudicated W:${ADJW} B:${ADJB} D:${ADJD}) | illegal ${ill} | ${(Date.now() - t0) / 1000}s`);
if (ill) process.exitCode = 1;
