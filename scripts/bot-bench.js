// Beast-mode bot vs bot bench: plays N full games, asserts zero illegal moves.
// Usage: node scripts/bot-bench.js --games 200 --white normal --black easy --maxPlies 300
import { GameState } from "../shared/game.js";
import { planBotTurn } from "../shared/bot.js";

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
const GAMES = Number(args.games || 200);
const WHITE_DIFF = args.white || "normal";
const BLACK_DIFF = args.black || "normal";
const MAX_PLIES = Number(args.maxPlies || 300);
const OFFSET = Number(args.offset || 0);

function applyPlan(game, plan) {
  // Returns { illegal: string|null } — applies upgrades then main action.
  for (const u of plan.upgrades || []) {
    const ok = game.upgrade(u.id, u.x, u.y, u.board);
    if (!ok) return { illegal: `upgrade rejected ${JSON.stringify(u)} :: ${game.lastEvent?.message}` };
  }
  const a = plan.action;
  if (!a) return {};
  let ok = false;
  if (a.action === "move") ok = game.move(a.from, a.to, a.board);
  else if (a.action === "buy") ok = game.buy(a.id, a.x, a.y, a.board);
  else if (a.action === "upgrade") ok = game.upgrade(a.id, a.x, a.y, a.board);
  else if (a.action === "decision") ok = game.decision(a.choice);
  else if (a.action === "rule") ok = game.addRule(a.rule);
  else return { illegal: `unknown action kind ${a.action}` };
  if (!ok) return { illegal: `${a.action} rejected ${JSON.stringify(a)} :: ${game.lastEvent?.message}` };
  return {};
}

let whiteWins = 0, blackWins = 0, draws = 0, timeouts = 0;
let illegal = 0;
let crashes = 0;
let totalPlies = 0;
const buyTally = {};
let portalBuys = 0;
const illegalLog = [];
const t0 = Date.now();

for (let g = OFFSET; g < OFFSET + GAMES; g++) {
  const game = new GameState({ seed: `bench-${WHITE_DIFF}-vs-${BLACK_DIFF}-${g}` });
  let plies = 0;
  try {
    while (!game.gameOver && plies < MAX_PLIES) {
      const diff = game.pendingDecision
        ? (game.pendingDecision.color === "White" ? WHITE_DIFF : BLACK_DIFF)
        : game.rulePicker
          ? (game.rulePickerColor === "White" ? WHITE_DIFF : BLACK_DIFF)
          : (game.whiteToMove ? WHITE_DIFF : BLACK_DIFF);
      const plan = planBotTurn(game, diff);
      if (!plan) { illegal++; illegalLog.push(`game ${g} ply ${plies}: planBotTurn returned null`); break; }
      if (plan.action?.action === "buy") {
        buyTally[plan.action.id] = (buyTally[plan.action.id] || 0) + 1;
        if (plan.action.id === "portal") portalBuys++;
      }
      const res = applyPlan(game, plan);
      if (res.illegal) {
        illegal++;
        if (illegalLog.length < 10) illegalLog.push(`game ${g} ply ${plies}: ${res.illegal}`);
        break;
      }
      plies++;
    }
  } catch (e) {
    crashes++;
    if (illegalLog.length < 10) illegalLog.push(`game ${g} CRASH: ${e.stack?.split("\n").slice(0, 3).join(" | ")}`);
  }
  totalPlies += plies;
  if (illegalLog.length && illegalLog[illegalLog.length - 1].startsWith(`game ${g} `)) {
    // illegal already counted, count as timeout-ish, don't count result
    timeouts++;
    continue;
  }
  if (game.gameOver) {
    if (game.draw) draws++;
    else if (game.winner === "White") whiteWins++;
    else if (game.winner === "Black") blackWins++;
  } else {
    timeouts++;
  }
  const done = g - OFFSET + 1;
  if (done % 20 === 0) {
    console.log(`... ${done}/${GAMES} done (${Math.round((Date.now() - t0) / 1000)}s) W:${whiteWins} B:${blackWins} D:${draws} T:${timeouts} illegal:${illegal}`);
  }
}

console.log(`\n=== BOT BENCH ${GAMES} games ${WHITE_DIFF}(W) vs ${BLACK_DIFF}(B), maxPlies ${MAX_PLIES} ===`);
console.log(`White wins: ${whiteWins} | Black wins: ${blackWins} | Draws: ${draws} | Timeouts(unfinished): ${timeouts}`);
console.log(`Illegal-move games: ${illegal} | Crashes: ${crashes} | Avg plies: ${(totalPlies / GAMES).toFixed(1)} | Total time: ${((Date.now() - t0) / 1000).toFixed(1)}s`);
console.log(`Shop tally: ${JSON.stringify(buyTally)} | portal buys/1000 games: ${(portalBuys / GAMES * 1000).toFixed(1)}`);
if (illegalLog.length) {
  console.log(`\nFirst illegal/crash samples:`);
  for (const line of illegalLog.slice(0, 10)) console.log(` - ${line}`);
}
if (illegal === 0 && crashes === 0) console.log(`\nBEAST MODE PASS: zero illegal moves across ${GAMES} games.`);
else { console.log(`\nBEAST MODE FAIL`); process.exitCode = 1; }
