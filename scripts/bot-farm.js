// Parallel selfplay farm: spreads games over all CPU cores via worker_threads.
// Usage: node scripts/bot-farm.js --games 1000 --white hard --black normal --out data/v2.jsonl --jobs 28
// Defaults to 100% power (every core). Each worker plays a deterministic slice
// (seeds embed the global game index, so reruns reproduce bit-identically for
// normal/hard; easy still uses Math.random).
import { cpus } from "node:os";
import { mkdirSync, writeFileSync, appendFileSync } from "node:fs";
import { dirname } from "node:path";
import { Worker } from "node:worker_threads";
import { fileURLToPath } from "node:url";

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
const GAMES = Number(args.games || 280);
const WHITE = args.white || "normal";
const BLACK = args.black || "normal";
const OUT = args.out || "data/farm.jsonl";
const EVERY = Number(args.every || 2);
const MAX_PLIES = Number(args.maxPlies || 250);
const OFFSET = Number(args.offset || 0);
const APPEND = args.append === "true" || args.append === "1";
const SEED_TAG = args.seedTag || "a";
const POLICY = args.policy || null;
const EXTRA = {
  adjudicate: args.adjudicate || 0,
  jitterTemp: args.jitterTemp || 0,
  jitterPlies: args.jitterPlies || 0,
  teacherEvery: args.teacherEvery || 0,
  teacherTimeMs: args.teacherTimeMs || 4000,
};
const JOBS = Math.max(1, Math.min(Number(args.jobs || cpus().length), GAMES));

mkdirSync(dirname(OUT), { recursive: true });
if (!APPEND) writeFileSync(OUT, "");

const workerPath = fileURLToPath(new URL("./bot-farm-worker.js", import.meta.url));
const t0 = Date.now();
let finishedGames = 0;
let finishedPositions = 0;

// Even split: worker j plays games [OFFSET + j*base + min(j, rem), ...).
const base = Math.floor(GAMES / JOBS);
const rem = GAMES % JOBS;
const workers = [];
for (let j = 0; j < JOBS; j++) {
  const start = OFFSET + j * base + Math.min(j, rem);
  const count = base + (j < rem ? 1 : 0);
  workers.push(new Promise((resolve, reject) => {
    const w = new Worker(workerPath, {
      workerData: { start, count, white: WHITE, black: BLACK, every: EVERY, maxPlies: MAX_PLIES, seedTag: SEED_TAG, policy: POLICY, ...EXTRA },
    });
    w.on("message", msg => {
      if (msg.type === "progress") {
        finishedGames++;
        finishedPositions += msg.positions - (w._lastPos || 0);
        w._lastPos = msg.positions;
        if (finishedGames % 50 === 0) {
          console.log(`... ${finishedGames}/${GAMES} games, ${finishedPositions} positions (${Math.round((Date.now() - t0) / 1000)}s)`);
        }
      } else if (msg.type === "done") {
        appendFileSync(OUT, msg.lines.join("\n") + (msg.lines.length ? "\n" : ""));
        w.terminate();
        resolve({ games: count, positions: msg.positions });
      }
    });
    w.on("error", reject);
    w.on("exit", code => { if (code !== 0) reject(new Error(`worker exited ${code}`)); });
  }));
}

const results = await Promise.all(workers);
const totalPos = results.reduce((a, r) => a + r.positions, 0);
const secs = (Date.now() - t0) / 1000;
console.log(`FARM DONE: ${GAMES} games, ${totalPos} positions -> ${OUT} in ${secs.toFixed(1)}s (${(GAMES / secs).toFixed(1)} games/s on ${JOBS} workers)`);
