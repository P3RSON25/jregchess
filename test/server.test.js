import assert from "node:assert/strict";
import { once } from "node:events";
import { spawn } from "node:child_process";
import test from "node:test";

const PORT = 32179;
let child;

test.before(async () => {
  child = spawn(process.execPath, ["server.js"], { cwd: new URL("..", import.meta.url), env: { ...process.env, PORT: String(PORT) }, stdio: ["ignore", "pipe", "pipe"] });
  await Promise.race([
    once(child.stdout, "data"),
    new Promise((_, reject) => setTimeout(() => reject(new Error("Server did not start")), 5000))
  ]);
});

test.after(() => child?.kill());

test("serves the game, shared engine, assets, and health endpoint", async () => {
  const [index, engine, asset, health] = await Promise.all([
    fetch(`http://localhost:${PORT}/`), fetch(`http://localhost:${PORT}/shared/game.js`),
    fetch(`http://localhost:${PORT}/assets/white/king.png`), fetch(`http://localhost:${PORT}/api/health`)
  ]);
  assert.equal(index.status, 200); assert.match(await index.text(), /Offline game/);
  assert.equal(engine.status, 200); assert.match(await engine.text(), /class GameState/);
  assert.equal(asset.status, 200); assert.equal(asset.headers.get("content-type"), "image/png");
  assert.deepEqual(await health.json(), { ok: true, rooms: 0 });
});

test("two WebSocket sessions receive authoritative moves and reject out-of-turn input", async t => {
  if (typeof WebSocket === "undefined") return t.skip("This Node runtime has no built-in WebSocket client");
  const white = await openClient(); const whiteMessages = queueMessages(white);
  white.send(JSON.stringify({ type: "create" }));
  const created = await whiteMessages.next(message => message.type === "joined");
  const initialWhite = await whiteMessages.next(message => message.type === "state");
  assert.equal(initialWhite.role, "white");

  const black = await openClient(); const blackMessages = queueMessages(black);
  black.send(JSON.stringify({ type: "join", room: created.room }));
  const joined = await blackMessages.next(message => message.type === "joined");
  assert.equal(joined.role, "black");
  await blackMessages.next(message => message.type === "state");
  await whiteMessages.next(message => message.type === "state" && message.connected.black);

  black.send(JSON.stringify({ type: "action", action: "move", from: { x: 0, y: 1 }, to: { x: 0, y: 3 } }));
  const rejected = await blackMessages.next(message => message.type === "error");
  assert.match(rejected.message, /turn/i);

  white.send(JSON.stringify({ type: "action", action: "move", from: { x: 4, y: 6 }, to: { x: 4, y: 4 } }));
  const blackState = await blackMessages.next(message => message.type === "state" && message.state.boards.Normal[4][4]?.type === "Pawn");
  assert.equal(blackState.state.whiteToMove, false);
  assert.equal(blackState.state.boards.Normal[6][4], null);

  black.send(JSON.stringify({ type: "action", action: "move", from: { x: 4, y: 1 }, to: { x: 4, y: 3 } }));
  const whiteState = await whiteMessages.next(message => message.type === "state" && message.state.boards.Normal[3][4]?.type === "Pawn");
  assert.equal(whiteState.state.whiteToMove, true);
  white.close(); black.close();
});

function openClient() {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(`ws://localhost:${PORT}/ws`);
    socket.addEventListener("open", () => resolve(socket), { once: true });
    socket.addEventListener("error", reject, { once: true });
  });
}

function queueMessages(socket) {
  const messages = []; const waiters = [];
  socket.addEventListener("message", event => {
    const message = JSON.parse(event.data);
    const index = waiters.findIndex(waiter => waiter.predicate(message));
    if (index >= 0) waiters.splice(index, 1)[0].resolve(message); else messages.push(message);
  });
  return {
    next(predicate) {
      const index = messages.findIndex(predicate);
      if (index >= 0) return Promise.resolve(messages.splice(index, 1)[0]);
      return new Promise((resolve, reject) => {
        const waiter = { predicate, resolve }; waiters.push(waiter);
        setTimeout(() => { const found = waiters.indexOf(waiter); if (found >= 0) waiters.splice(found, 1); reject(new Error("Timed out waiting for WebSocket message")); }, 4000);
      });
    }
  };
}
